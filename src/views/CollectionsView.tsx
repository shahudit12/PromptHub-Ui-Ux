import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { motion } from 'framer-motion';
import { 
  FolderPlus, 
  Trash2, 
  Lock, 
  ExternalLink, 
  FolderOpen,
  Image as ImageIcon,
  Upload,
  Plus,
  Download,
  FileText,
  Globe,
  Share2,
  Check,
  Users,
  Sparkles,
  Copy,
  GitFork,
  LogIn,
} from 'lucide-react';
import { PromptLibraryIcon } from '../components/icons/PromptHubIcons';
import { securityUtils } from '../utils/security';
import { trackCollectionViewed } from '../lib/posthogEvents';
import { exportCollectionBundle } from '../services/export/promptExporter';
import { ImportPromptModal } from '../components/studio/ImportPromptModal';
import { MediaPickerModal } from '../components/common/MediaPickerModal';
import { CollectionRepository } from '../repositories/collectionRepository';
import { PromptRepository } from '../repositories/promptRepository';
import type { ImportedPrompt } from '../services/import/promptImporter';
import type { Collection, Prompt } from '../db/schema';
import { getUserPlanTier } from '../config/billingConfig';

export const CollectionsView: React.FC = () => {
  const {
    collections,
    prompts,
    createPrompt,
    createCollection,
    updateCollection,
    addPromptToCollection,
    deleteCollection,
    removePromptFromCollection,
    setActivePromptId,
    setActiveTab,
    showToast,
    setShowAuthModal,
    forkPrompt,
    user
  } = useApp();
  const { sendToWork } = useWorkspace();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [colName, setColName] = useState('');
  const [colDesc, setColDesc] = useState('');
  const [colPrivate, setColPrivate] = useState(false); // Default to public for easy sharing
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isTogglingPrivacy, setIsTogglingPrivacy] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // Filter tab: 'all' | 'public' | 'private' | 'community'
  // Default to 'public' for unauthenticated visitors so they immediately see public collections
  const [filterTab, setFilterTab] = useState<'all' | 'public' | 'private' | 'community'>(() => {
    return user ? 'all' : 'public';
  });

  const [communityCollections, setCommunityCollections] = useState<Collection[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);

  // Loaded prompts cache for prompts not in user's private library
  const [loadedPrompts, setLoadedPrompts] = useState<Record<string, Prompt>>({});
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  // Banner image states
  const [colBannerUrl, setColBannerUrl] = useState('');
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  // Selected active collection
  const [selectedColId, setSelectedColId] = useState<string | null>(null);

  // Load public collections from database on mount and whenever user changes
  const loadPublicCollections = useCallback(async () => {
    setIsLoadingCommunity(true);
    try {
      const cols = await CollectionRepository.getPublicCollections();
      setCommunityCollections(cols);
    } catch (err) {
      console.warn('[CollectionsView] Failed to fetch public collections:', err);
    } finally {
      setIsLoadingCommunity(false);
    }
  }, []);

  useEffect(() => {
    loadPublicCollections();
  }, [loadPublicCollections]);

  // Deep-linking: Support ?id=<uuid> or ?collection=<uuid> in URL query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('id') || params.get('collection');
    if (targetId) {
      setSelectedColId(targetId);
      CollectionRepository.getCollectionById(targetId).then((fetched) => {
        if (fetched) {
          setCommunityCollections(prev => {
            if (prev.some(c => c.id === fetched.id)) return prev;
            return [fetched, ...prev];
          });
          if (!fetched.isPrivate) {
            setFilterTab('public');
          }
        }
      });
    }
  }, []);

  // Compute all public collections across the platform (current user + community)
  const allPublicCollections = useMemo(() => {
    const map = new Map<string, Collection>();
    // User's own public collections
    collections.filter(c => !c.isPrivate).forEach(c => map.set(c.id, c));
    // Community public collections
    communityCollections.filter(c => !c.isPrivate).forEach(c => map.set(c.id, c));
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [collections, communityCollections]);

  // Displayed collections list depending on active filter tab
  const displayedCollections = useMemo(() => {
    if (filterTab === 'public') {
      return allPublicCollections;
    }
    if (filterTab === 'private') {
      return collections.filter(c => c.isPrivate);
    }
    if (filterTab === 'community') {
      return communityCollections.filter(c => c.authorId !== user?.id && !c.isPrivate);
    }
    // 'all' tab: if logged in, show user's collections; if visitor, show all public collections
    return user ? collections : allPublicCollections;
  }, [filterTab, allPublicCollections, collections, communityCollections, user]);

  // Auto-select first collection if none selected or if selected is not in displayed list
  useEffect(() => {
    if (!selectedColId && displayedCollections.length > 0) {
      setSelectedColId(displayedCollections[0].id);
    }
  }, [selectedColId, displayedCollections]);

  // Active collection object
  const activeCollection = useMemo(() => {
    if (!selectedColId) return displayedCollections[0] || null;
    return displayedCollections.find(c => c.id === selectedColId) ||
           allPublicCollections.find(c => c.id === selectedColId) ||
           communityCollections.find(c => c.id === selectedColId) ||
           collections.find(c => c.id === selectedColId) ||
           null;
  }, [selectedColId, displayedCollections, allPublicCollections, communityCollections, collections]);

  const isOwner = Boolean(user && activeCollection && (activeCollection.authorId === user.id || activeCollection.authorId === ''));

  // Fetch prompts for active collection if any prompt IDs are not present in local memory
  useEffect(() => {
    if (!activeCollection || activeCollection.promptIds.length === 0) return;

    const missingIds = activeCollection.promptIds.filter(
      id => !prompts.some(p => p.id === id) && !loadedPrompts[id]
    );

    if (missingIds.length > 0) {
      setIsLoadingPrompts(true);
      PromptRepository.getPromptsByIds(missingIds)
        .then((fetchedList) => {
          if (fetchedList.length > 0) {
            setLoadedPrompts(prev => {
              const updated = { ...prev };
              fetchedList.forEach(p => { updated[p.id] = p; });
              return updated;
            });
          }
        })
        .catch((err) => {
          console.warn('[CollectionsView] Failed to fetch collection prompts:', err);
        })
        .finally(() => {
          setIsLoadingPrompts(false);
        });
    }
  }, [activeCollection, prompts, loadedPrompts]);

  const handleSelectCollection = (id: string) => {
    setSelectedColId(id);
    // Sync URL query without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'collections');
    url.searchParams.set('id', id);
    window.history.replaceState({}, '', url.toString());

    const col = [...collections, ...communityCollections].find(c => c.id === id);
    const isSelf = col?.authorId === user?.id;
    trackCollectionViewed({ owner_type: isSelf ? 'self' : 'other' });
  };

  const handleTogglePrivacy = async (col: Collection) => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Sign in to manage collection privacy.', 'info');
      return;
    }

    if (col.authorId !== user.id && col.authorId !== '') {
      showToast('You can only change visibility for your own collections.', 'error');
      return;
    }

    const nextIsPrivate = !col.isPrivate;
    setIsTogglingPrivacy(true);

    try {
      await updateCollection(col.id, { isPrivate: nextIsPrivate });
      // Update in community state as well
      setCommunityCollections(prev => prev.map(c => c.id === col.id ? { ...c, isPrivate: nextIsPrivate } : c));
      showToast(
        nextIsPrivate
          ? '🔒 Collection is now Private (only visible to you).'
          : '🌐 Collection is now Public (discoverable and shareable by all).',
        'success'
      );
    } catch (err: any) {
      showToast(`Failed to update visibility: ${err?.message || 'Database error'}`, 'error');
    } finally {
      setIsTogglingPrivacy(false);
    }
  };

  const handleShareCollection = async (col: Collection) => {
    const shareUrl = `${window.location.origin}/?tab=collections&id=${col.id}`;

    let copied = false;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch {
        // Fallback below
      }
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {}
    }

    if (copied) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      showToast('📋 Public collection link copied to clipboard!', 'success');
    } else {
      showToast(`Collection link: ${shareUrl}`, 'info');
    }
  };

  const handleCopyPromptText = async (prompt: Prompt) => {
    const textToCopy = prompt.rawContent || prompt.description || prompt.title;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedPromptId(prompt.id);
      setTimeout(() => setCopiedPromptId(null), 2000);
      showToast('📋 Prompt template copied to clipboard!', 'success');
    } catch {
      showToast('Failed to copy to clipboard.', 'error');
    }
  };

  const handleForkPrompt = async (promptId: string) => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Sign in to fork prompts into your personal library.', 'info');
      return;
    }
    try {
      const forked = await forkPrompt(promptId);
      if (forked && (forked as any).id) {
        const forkedPrompt = forked as any;
        try {
          sessionStorage.setItem('ph_active_prompt_id', forkedPrompt.id);
          sessionStorage.setItem('ph_active_prompt_data', JSON.stringify(forkedPrompt));
          sessionStorage.setItem('ph_creation_workspace_prompt', forkedPrompt.rawContent || '');
          sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
            title: forkedPrompt.title,
            prompt: forkedPrompt.rawContent || '',
            category: forkedPrompt.category,
          }));
        } catch {}
        setActivePromptId(forkedPrompt.id);
        sendToWork({ title: forkedPrompt.title, prompt: forkedPrompt.rawContent || '' });
        setActiveTab('workspace');
      }
      showToast('⚡ Prompt successfully forked to your library!', 'success');
    } catch (err: any) {
      showToast(`Failed to fork: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await deleteCollection(id);
      if (selectedColId === id) setSelectedColId(null);
      setConfirmDeleteId(null);
      setCommunityCollections(prev => prev.filter(c => c.id !== id));
      showToast('Collection deleted.', 'info');
    } catch (err: any) {
      showToast(`Failed to delete collection: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleImportBatch = async (importedPrompts: ImportedPrompt[], colTitle?: string) => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Sign in to import prompt packs.', 'info');
      return;
    }

    try {
      const allowedPrompts = importedPrompts.slice(0, 25);
      if (importedPrompts.length > 25) {
        showToast('Pack limited to first 25 prompts (maximum collection capacity).', 'info');
      }
      const name = colTitle || 'Imported Prompt Pack';
      const newCol = await createCollection(
        name, 
        `Pack of ${allowedPrompts.length} imported prompt architectures.`, 
        colPrivate // Uses current visibility setting (public/private)
      );
      if (newCol) {
        for (const imp of allowedPrompts) {
          const newPrompt = await createPrompt({
            title: imp.title,
            description: imp.description,
            rawContent: imp.template,
            category: imp.category,
            model: imp.model,
            tags: imp.tags,
            visibility: colPrivate ? 'private' : 'public',
            authorId: user.id,
            authorName: user.name || 'Community Member',
            status: 'active',
          });
          if (newPrompt) {
            await addPromptToCollection(newCol.id, newPrompt.id);
          }
        }
        setSelectedColId(newCol.id);
        if (!colPrivate) {
          setCommunityCollections(prev => [newCol, ...prev]);
        }
        showToast(`🎉 Imported ${colPrivate ? 'private' : 'public'} collection "${name}" with ${importedPrompts.length} prompts!`, 'success');
      }
    } catch (err: any) {
      showToast(`Failed to import pack: ${err.message || 'Error'}`, 'error');
    }
  };

  const handleExportCollection = (format: 'json' | 'markdown' | 'csv') => {
    if (!activeCollection) return;
    const colPrompts = activeCollection.promptIds
      .map((id) => prompts.find((p) => p.id === id) || loadedPrompts[id])
      .filter(Boolean)
      .map((p) => ({
        title: p!.title,
        slug: p!.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: p!.description || '',
        template: p!.rawContent || '',
        category: p!.category,
        model: p!.model,
        tags: p!.tags,
        author: p!.authorName,
      }));

    if (colPrompts.length === 0) {
      showToast('No prompts in collection to export.', 'info');
      return;
    }

    const res = exportCollectionBundle(activeCollection.name, colPrompts, format);
    const blob = new Blob([res.content], { type: res.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported "${activeCollection.name}" as ${res.filename}`, 'success');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colName.trim()) return;

    if (!user) {
      setShowAuthModal(true);
      showToast('Sign in to create your own collections.', 'info');
      return;
    }

    const limit = securityUtils.rateLimit('create_collection', 5000);
    if (!limit.allowed) {
      showToast(limit.error || 'Spam prevention active. Try again later.', 'error');
      return;
    }

    const sanitizedName = securityUtils.sanitizeText(colName);
    const sanitizedDesc = securityUtils.sanitizeText(colDesc);

    if (!sanitizedName || sanitizedName.length < 2 || sanitizedName.length > 60) {
      showToast('Collection title must be between 2 and 60 characters.', 'error');
      return;
    }

    if (sanitizedDesc && sanitizedDesc.length > 500) {
      showToast('Collection description cannot exceed 500 characters.', 'error');
      return;
    }

    if (colBannerUrl && !securityUtils.validateImageUrl(colBannerUrl)) {
      showToast('Invalid banner image URL protocol. Use HTTP, HTTPS, or a valid image data URI.', 'error');
      return;
    }

    try {
      const created = await createCollection(sanitizedName, sanitizedDesc, colPrivate, colBannerUrl || undefined);
      setSelectedColId(created.id);
      if (!colPrivate) {
        setCommunityCollections(prev => [created, ...prev.filter(c => c.id !== created.id)]);
      }
      setColName('');
      setColDesc('');
      setColPrivate(false);
      setColBannerUrl('');
      setShowCreateForm(false);
      showToast(
        colPrivate 
          ? '🔒 Private collection created successfully!' 
          : '🌐 Public collection created and shared successfully!', 
        'success'
      );
    } catch (err: any) {
      showToast(`Failed to create collection: ${err?.message || 'Database error'}`, 'error');
    }
  };

  const handleCloseModal = useCallback(() => {
    setShowCreateForm(false);
    setColName('');
    setColDesc('');
    setColPrivate(false);
    setColBannerUrl('');
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseModal();
    };
    if (showCreateForm) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showCreateForm, handleCloseModal]);

  const handleOpenPrompt = (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId) || loadedPrompts[promptId];
    if (prompt) {
      try {
        sessionStorage.setItem('ph_active_prompt_id', prompt.id);
        sessionStorage.setItem('ph_active_prompt_data', JSON.stringify(prompt));
        sessionStorage.setItem('ph_creation_workspace_prompt', prompt.rawContent);
        sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
          title: prompt.title,
          prompt: prompt.rawContent,
          category: prompt.category,
        }));
      } catch {}
      sendToWork({ title: prompt.title, prompt: prompt.rawContent });
    }
    setActivePromptId(promptId);
    setActiveTab('workspace');
  };

  const userTier = getUserPlanTier(user);
  const myCollectionsCount = collections.filter(c => c.authorId === user?.id).length;
  const isLimitReached = Boolean(user && user.role !== 'Admin' && myCollectionsCount >= userTier.collectionsPerUser);

  const allCount = user ? collections.length : allPublicCollections.length;
  const publicCount = allPublicCollections.length;
  const privateCount = user ? collections.filter(c => c.isPrivate).length : 0;

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-bg-primary text-text-primary text-left select-text space-y-5">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-default">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
            <PromptLibraryIcon size={24} variant="solid" className="text-brand-primary" />
            <span>Collections &amp; Folders</span>
          </h2>
          <p className="text-text-secondary text-xs mt-0.5">
            Organize prompts into modular suites, test packs, and publicly discoverable collections.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {user ? (
            <span className="text-[11px] font-mono text-text-muted px-2.5 py-1.5 bg-bg-secondary rounded-lg border border-border-default">
              {user.role === 'Admin' ? 'Unlimited' : `${myCollectionsCount} / ${userTier.collectionsPerUser} Collections (${userTier.name})`}
            </span>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-[11px] font-mono text-brand-primary px-2.5 py-1.5 bg-brand-primary/10 rounded-lg border border-brand-primary/20 flex items-center gap-1.5 cursor-pointer hover:bg-brand-primary/20 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In to Create</span>
            </button>
          )}

          <button
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
                showToast('Sign in to import prompt packs.', 'info');
                return;
              }
              setIsImportModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-bg-secondary border border-border-default hover:border-brand-primary/50 text-text-secondary hover:text-text-primary text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
            title="Import collection bundle or multi-prompt pack"
          >
            <Upload className="w-3.5 h-3.5 text-brand-primary" />
            <span>Import Pack</span>
          </button>

          <button
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
                showToast('Sign in to create your own collections.', 'info');
                return;
              }
              if (isLimitReached) {
                showToast(`You have reached the ${userTier.collectionsPerUser} collection limit on your ${userTier.name} plan. Upgrade to Starter (7), Pro (15), or Growth (30) to create more.`, 'info');
                setActiveTab('pricing');
                return;
              }
              setShowCreateForm(true);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px] ${
              isLimitReached
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-brand-primary hover:bg-brand-primary-hi'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isLimitReached ? 'Upgrade for More' : 'New Collection'}</span>
          </button>
        </div>
      </div>

      {/* Create Form Drawer */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-secondary border border-border-default rounded-2xl p-5 sm:p-6 shadow-md space-y-5"
        >
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-brand-primary" />
              <h3 className="text-sm font-bold text-text-primary font-display">Create New Collection</h3>
            </div>
            <span className="text-[11px] font-mono text-text-muted">Choose Public or Private Visibility</span>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                      Collection Title <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-text-muted font-mono tabular-nums">{colName.length}/60</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={colName}
                    onChange={(e) => setColName(e.target.value.slice(0, 60))}
                    placeholder="e.g. Marketing Copy Workflows, Reasoning Benchmarks"
                    className="w-full bg-bg-tertiary border border-border-default rounded-xl px-3 py-2.5 text-xs text-text-primary focus:border-brand-primary focus:outline-none min-h-[44px]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Description</label>
                    <span className={`text-[10px] font-mono tabular-nums ${colDesc.length >= 480 ? 'text-brand-amber font-semibold' : 'text-text-muted'}`}>{colDesc.length}/500</span>
                  </div>
                  <textarea
                    maxLength={500}
                    value={colDesc}
                    onChange={(e) => setColDesc(e.target.value.slice(0, 500))}
                    placeholder="Brief summary of collection purposes, included prompts, and recommended models..."
                    className="w-full h-24 bg-bg-tertiary border border-border-default rounded-xl p-3 text-xs text-text-primary focus:border-brand-primary focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {/* Visibility Selector: Public vs Private */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                    Visibility &amp; Sharing Permissions
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Public Option */}
                    <button
                      type="button"
                      onClick={() => setColPrivate(false)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer min-h-[44px] ${
                        !colPrivate
                          ? 'border-brand-primary bg-brand-primary-light ring-1 ring-brand-primary/20 text-brand-primary'
                          : 'border-border-default bg-bg-tertiary text-text-secondary hover:border-border-hover'
                      }`}
                    >
                      <Globe className="w-4 h-4 shrink-0 text-brand-primary mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-text-primary flex items-center gap-1">
                          <span>Public Collection</span>
                          <span className="text-[9px] font-mono px-1 rounded bg-brand-primary/15 text-brand-primary dark:text-[#41A2D9] font-semibold">
                            Shareable
                          </span>
                        </div>
                        <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">
                          Visible to community, discoverable in Public tab, and shareable via URL.
                        </p>
                      </div>
                    </button>

                    {/* Private Option */}
                    <button
                      type="button"
                      onClick={() => setColPrivate(true)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer min-h-[44px] ${
                        colPrivate
                          ? 'border-brand-primary bg-brand-primary-light ring-1 ring-brand-primary/20 text-brand-primary'
                          : 'border-border-default bg-bg-tertiary text-text-secondary hover:border-border-hover'
                      }`}
                    >
                      <Lock className="w-4 h-4 shrink-0 text-text-muted mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-text-primary flex items-center gap-1">
                          <span>Private Collection</span>
                          <span className="text-[9px] font-mono px-1 rounded bg-bg-secondary text-text-muted font-semibold">
                            Locked
                          </span>
                        </div>
                        <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">
                          Confidential. Only you can view or execute prompts inside.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Banner Upload */}
                <div className="bg-bg-tertiary border border-border-default rounded-xl p-3 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono block">Collection Banner (Optional)</label>
                  
                  {colBannerUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-border-default aspect-video">
                      <img 
                        src={colBannerUrl} 
                        alt="Banner Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setColBannerUrl('')}
                        className="absolute top-2 right-2 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-semibold cursor-pointer shadow-xs transition-colors min-h-[30px]"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center border border-dashed border-border-default rounded-xl p-4 bg-bg-secondary text-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary-light text-brand-primary flex items-center justify-center">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => setIsMediaPickerOpen(true)}
                          className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hi cursor-pointer inline-flex items-center gap-1.5 min-h-[44px]"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Choose Banner (Gallery, Link, or Storage Vault)</span>
                        </button>
                        <p className="text-[10px] text-text-muted">
                          Upload from device, paste web link, or pick from Storage Vault
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-default">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl border border-border-default text-xs font-medium text-text-secondary hover:bg-bg-tertiary cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold cursor-pointer shadow-sm min-h-[44px]"
              >
                Create {colPrivate ? 'Private' : 'Public'} Collection
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Collections List & Filter Tabs */}
        <div className="space-y-3">
          {/* Sub-Tabs: All | Public | Private | Explore */}
          <div className="flex items-center gap-1 p-1 bg-bg-secondary border border-border-default rounded-xl">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[44px] ${
                filterTab === 'all'
                  ? 'bg-bg-tertiary text-text-primary shadow-xs font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {user ? `All (${allCount})` : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('public')}
              className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1 ${
                filterTab === 'public'
                  ? 'bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-[#41A2D9] shadow-xs font-bold border border-brand-primary/20'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="All public collections shared on PromptHub"
            >
              <Globe className="w-3.5 h-3.5 text-brand-primary dark:text-[#41A2D9]" />
              <span>Public ({publicCount})</span>
            </button>
            {user && (
              <button
                type="button"
                onClick={() => setFilterTab('private')}
                className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1 ${
                  filterTab === 'private'
                    ? 'bg-bg-tertiary text-text-primary shadow-xs font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-text-muted" />
                <span>Private ({privateCount})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setFilterTab('community')}
              className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-1 ${
                filterTab === 'community'
                  ? 'bg-brand-primary text-white shadow-xs font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Explore public collections shared by other prompt engineers"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Explore</span>
            </button>
          </div>

          <div className="space-y-2">
            {isLoadingCommunity && filterTab === 'community' ? (
              <div className="p-8 text-center bg-bg-secondary border border-border-default rounded-xl space-y-2">
                <Sparkles className="w-6 h-6 text-brand-primary mx-auto animate-pulse" />
                <p className="text-xs text-text-secondary">Loading community public collections...</p>
              </div>
            ) : displayedCollections.length === 0 ? (
              <div className="p-8 text-center bg-bg-secondary border border-border-default rounded-xl space-y-3">
                <PromptLibraryIcon size={32} variant="outline" className="text-text-muted mx-auto mb-1" />
                <p className="text-xs font-semibold text-text-primary">
                  {filterTab === 'public'
                    ? 'No public collections found yet.'
                    : filterTab === 'private'
                    ? 'No private collections yet.'
                    : filterTab === 'community'
                    ? 'No community collections found.'
                    : user 
                    ? "You haven't created a collection yet." 
                    : "No public collections found."}
                </p>
                <p className="text-[11px] text-text-secondary max-w-xs mx-auto">
                  {filterTab === 'public'
                    ? 'Create a collection and set visibility to Public to share your prompts with the community.'
                    : filterTab === 'private'
                    ? 'Private collections are confidential and only visible to your account.'
                    : filterTab === 'community'
                    ? 'Publish a collection publicly to share it with prompt engineers worldwide.'
                    : 'Group prompts into modular test packs, execution pipelines, and shareable suites.'}
                </p>
                {!user && (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-colors cursor-pointer min-h-[44px] inline-flex items-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In to Create</span>
                  </button>
                )}
              </div>
            ) : (
              displayedCollections.map(col => {
                const isActive = col.id === (activeCollection?.id || selectedColId);
                const isUserCol = Boolean(user && col.authorId === user.id);

                return (
                  <div
                    key={col.id}
                    onClick={() => handleSelectCollection(col.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 min-h-[44px] ${
                      isActive 
                        ? 'bg-brand-primary-light border-brand-primary ring-1 ring-brand-primary/20' 
                        : 'bg-bg-secondary border-border-default hover:border-border-hover shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <PromptLibraryIcon size={16} variant={isActive ? 'solid' : 'outline'} className={`shrink-0 ${isActive ? 'text-brand-primary' : 'text-text-muted'}`} />
                        <h5 className="text-xs font-bold text-text-primary truncate">
                          {col.name}
                        </h5>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Visibility Pill Badge / Toggle */}
                        {isUserCol ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePrivacy(col);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer min-h-[28px] ${
                              col.isPrivate
                                ? 'bg-bg-tertiary border border-border-default text-text-muted hover:text-text-primary hover:border-brand-primary/40'
                                : 'bg-brand-primary/10 border border-brand-primary/20 text-brand-primary dark:text-[#41A2D9] hover:bg-brand-primary/20'
                            }`}
                            title={col.isPrivate ? 'Private collection (Click to make Public)' : 'Public collection (Click to make Private)'}
                          >
                            {col.isPrivate ? (
                              <>
                                <Lock className="w-2.5 h-2.5" />
                                <span>Private</span>
                              </>
                            ) : (
                              <>
                                <Globe className="w-2.5 h-2.5 text-brand-primary dark:text-[#41A2D9]" />
                                <span>Public</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-brand-primary/10 border border-brand-primary/20 text-brand-primary dark:text-[#41A2D9]">
                            <Globe className="w-2.5 h-2.5 text-brand-primary dark:text-[#41A2D9]" />
                            <span>Public</span>
                          </span>
                        )}

                        {/* Delete Action (Owners only) */}
                        {isUserCol && (
                          confirmDeleteId === col.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-rose-600 font-semibold">Delete?</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteCollection(col.id); }}
                                className="px-2 py-1 rounded bg-rose-600 text-white text-[9px] font-bold cursor-pointer min-h-[28px]"
                              >
                                Yes
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                className="px-2 py-1 rounded bg-bg-tertiary text-text-secondary text-[9px] font-bold cursor-pointer min-h-[28px]"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(col.id); }}
                              className="p-1.5 text-text-muted hover:text-rose-600 transition-colors cursor-pointer min-h-[28px]"
                              aria-label="Delete collection"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                      {col.description || 'No description provided.'}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-text-muted border-t border-border-subtle">
                      <span className="flex items-center gap-1">
                        <span>{col.promptIds.length} / 25 Prompts</span>
                        {col.promptIds.length >= 25 && (
                          <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-bold">FULL</span>
                        )}
                      </span>
                      {isUserCol ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Yours</span>
                      ) : (
                        <span className="text-brand-primary dark:text-[#41A2D9]">Community</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Prompts inside Selected Collection */}
        <div className="lg:col-span-2 space-y-4">
          {activeCollection ? (
            <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs space-y-4">
              {activeCollection.bannerUrl && (
                <div className="w-full h-36 rounded-lg overflow-hidden border border-border-default mb-2">
                  <img 
                    src={activeCollection.bannerUrl} 
                    alt={`${activeCollection.name} Banner`} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Active Collection Header with Privacy Toggle & Share Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <FolderOpen className="w-4 h-4 text-brand-primary" />
                    <h4 className="text-sm sm:text-base font-bold text-text-primary font-display">
                      {activeCollection.name}
                    </h4>

                    {/* Visibility Pill */}
                    {activeCollection.isPrivate ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-bg-tertiary border border-border-default text-text-muted">
                        <Lock className="w-3 h-3" />
                        <span>Private Collection</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-primary/10 border border-brand-primary/20 text-brand-primary dark:text-[#41A2D9]">
                        <Globe className="w-3 h-3 text-brand-primary dark:text-[#41A2D9]" />
                        <span>Public Collection</span>
                      </span>
                    )}

                    {/* Capacity Badge */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-bg-tertiary border border-border-default text-text-secondary">
                      <span>{activeCollection.promptIds.length}/25 Prompts</span>
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">{activeCollection.description || 'No description provided.'}</p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                  {/* Public/Private Toggle Button (Only for Author) */}
                  {isOwner && (
                    <button
                      type="button"
                      disabled={isTogglingPrivacy}
                      onClick={() => handleTogglePrivacy(activeCollection)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px] disabled:opacity-50 ${
                        activeCollection.isPrivate
                          ? 'border-brand-primary/40 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary dark:text-[#41A2D9]'
                          : 'border-border-default bg-bg-tertiary hover:bg-border-subtle text-text-primary'
                      }`}
                      title={activeCollection.isPrivate ? 'Make this collection public and shareable' : 'Make this collection private'}
                    >
                      {activeCollection.isPrivate ? (
                        <>
                          <Globe className="w-3.5 h-3.5 text-brand-primary dark:text-[#41A2D9]" />
                          <span>Make Public</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-text-muted" />
                          <span>Make Private</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Share Link Button (For Public Collections) */}
                  {!activeCollection.isPrivate && (
                    <button
                      type="button"
                      onClick={() => handleShareCollection(activeCollection)}
                      className="px-3 py-1.5 rounded-lg bg-brand-primary-light border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                      title="Copy shareable link to this public collection"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share Link</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Export Options */}
                  {activeCollection.promptIds.length > 0 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleExportCollection('json')}
                        className="px-2.5 py-1.5 rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-tertiary text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer min-h-[44px]"
                        title="Export collection as Open Prompt JSON bundle"
                        aria-label="Export Bundle (.json)"
                      >
                        <Download className="w-3.5 h-3.5 text-brand-primary" />
                        <span>JSON</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportCollection('markdown')}
                        className="px-2.5 py-1.5 rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-tertiary text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer min-h-[44px]"
                        title="Export collection as Markdown Book"
                        aria-label="Export Markdown (.md)"
                      >
                        <FileText className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Markdown</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isLoadingPrompts && (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-text-secondary">
                  <Sparkles className="w-4 h-4 text-brand-primary animate-pulse" />
                  <span>Loading collection prompts...</span>
                </div>
              )}

              {activeCollection.promptIds.length === 0 ? (
                <div className="flex flex-col items-center text-center py-16 border border-border-default border-dashed rounded-lg gap-2 bg-bg-tertiary">
                  <FolderOpen className="w-8 h-8 text-text-muted" />
                  <p className="text-xs font-semibold text-text-primary">This collection is empty</p>
                  <p className="text-[11px] text-text-secondary">Open a prompt in Creation Workspace and save it to this collection.</p>
                  <button
                    onClick={() => setActiveTab('workspace')}
                    className="px-3.5 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-colors cursor-pointer mt-1 min-h-[44px]"
                  >
                    Open Creation Workspace
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeCollection.promptIds.map(pId => {
                    const prompt = prompts.find(p => p.id === pId) || loadedPrompts[pId];
                    if (!prompt) {
                      return (
                        <div
                          key={pId}
                          className="bg-bg-tertiary border border-border-default rounded-lg p-3.5 flex flex-col justify-between gap-2.5 animate-pulse"
                        >
                          <div className="h-4 bg-border-default rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-border-default rounded w-full"></div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={prompt.id}
                        className="bg-bg-tertiary border border-border-default rounded-lg p-3.5 flex flex-col justify-between gap-2.5 hover:border-border-hover transition-colors"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="text-xs font-semibold text-text-primary truncate">{prompt.title}</h5>
                            <span className="text-[9px] font-mono text-text-muted px-1.5 py-0.5 bg-bg-secondary rounded border border-border-default">
                              {prompt.model}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed mt-1">
                            {prompt.description || 'No description provided.'}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between border-t border-border-default pt-2 text-[10px] font-mono gap-1">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyPromptText(prompt)}
                              className="px-2 py-1 rounded bg-bg-secondary hover:bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary cursor-pointer flex items-center gap-1 transition-colors min-h-[36px]"
                              title="Copy prompt template to clipboard"
                            >
                              {copiedPromptId === prompt.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-text-muted" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleForkPrompt(prompt.id)}
                              className="px-2 py-1 rounded bg-bg-secondary hover:bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary cursor-pointer flex items-center gap-1 transition-colors min-h-[36px]"
                              title="Fork prompt to your private library"
                            >
                              <GitFork className="w-3 h-3 text-text-muted" />
                              <span>Fork</span>
                            </button>

                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => removePromptFromCollection(activeCollection.id, prompt.id)}
                                className="px-2 py-1 rounded text-text-muted hover:text-rose-600 cursor-pointer flex items-center gap-1 min-h-[36px]"
                                title="Remove prompt from this collection"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleOpenPrompt(prompt.id)}
                            className="font-bold text-brand-primary hover:underline cursor-pointer flex items-center gap-1 min-h-[36px] px-1"
                          >
                            <span>Open in Workspace</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 border border-border-default border-dashed rounded-xl bg-bg-secondary space-y-2">
              <PromptLibraryIcon size={40} variant="outline" className="text-text-muted" />
              <h4 className="text-xs font-bold text-text-primary">No Collection Selected</h4>
              <p className="text-xs text-text-secondary max-w-xs text-center leading-relaxed">
                Click a collection from the list to view its prompts and manage items.
              </p>
            </div>
          )}
        </div>
      </div>

      <ImportPromptModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(imported) => handleImportBatch([imported])}
        onImportBatch={handleImportBatch}
        title="Import Collection Pack"
        subtitle="Import multi-prompt bundles (.json), Markdown documents, or CSV datasets to create a collection."
      />

      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(res) => {
          setColBannerUrl(res.url);
          setIsMediaPickerOpen(false);
        }}
        title="Select Collection Banner"
        description="Choose a banner from your gallery, paste a direct web image link, or select from your Storage Vault."
        mediaType="image"
      />
    </div>
  );
};

export default CollectionsView;
