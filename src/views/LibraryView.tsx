import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  Search,
  Plus,
  GitFork,
  Lock,
  Globe,
  Trash2,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  PromptLibraryIcon,
  PromptMarketplaceIcon,
  PromptStudioIcon,
} from '../components/icons/PromptHubIcons';
import { useApp } from '../context/AppContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useConfirm } from '../hooks/useConfirm';
import { type Prompt } from '../db/schema';
import { PromptCameraMicControls } from '../components/common/PromptCameraMicControls';
import { PromptImagePreview } from '../components/common/PromptImagePreview';
import { CollectionsView } from './CollectionsView';
import { ModelProviderLogo } from '../components/common/ModelProviderLogo';

export interface LibraryViewProps {
  initialSection?: 'prompts' | 'collections';
}

export const LibraryView: React.FC<LibraryViewProps> = ({ initialSection = 'prompts' }) => {
  const {
    prompts,
    collections,
    user,
    userPurchases,
    setActivePromptId,
    setActiveTab,
    deletePrompt,
    updatePrompt,
    showToast,
  } = useApp();
  const { sendToWork } = useWorkspace();
  const confirm = useConfirm();

  const [mainSection, setMainSection] = useState<'prompts' | 'collections'>(() => {
    if (initialSection) return initialSection;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'collections' || params.get('id') || params.get('collection')) {
        return 'collections';
      }
    }
    return 'prompts';
  });

  // Sync section if parent changes initialSection
  React.useEffect(() => {
    if (initialSection) {
      setMainSection(initialSection);
    }
  }, [initialSection]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'mine' | 'public' | 'private' | 'forks' | 'purchased'>('all');
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'alpha'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // User's owned prompts: written by user, forked by user, or purchased by user
  const userPrompts = useMemo(() => {
    if (!user) return [];
    const purchasedIds = new Set(
      (userPurchases || [])
        .filter((p) => p.status === 'completed')
        .map((p) => p.promptId)
    );

    return prompts.filter((p) => {
      const isAuthor = p.authorId === user.id;
      const isPurchased = purchasedIds.has(p.id);
      return isAuthor || isPurchased;
    });
  }, [prompts, user, userPurchases]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    userPrompts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => tags.add(t));
      }
    });
    return Array.from(tags);
  }, [userPrompts]);

  // Filtered & Sorted prompts
  const filteredPrompts = useMemo(() => {
    return userPrompts
      .filter((p) => {
        const isFork = Boolean(p.originalPromptId || p.originalAuthorId);
        const isPurchased = (userPurchases || []).some(
          (purch) => purch.promptId === p.id && purch.status === 'completed'
        );

        // Tab filtering
        if (selectedTab === 'mine') {
          if (p.authorId !== user?.id || isFork) return false;
        } else if (selectedTab === 'public') {
          if (p.visibility !== 'public') return false;
        } else if (selectedTab === 'private') {
          if (p.visibility === 'public') return false;
        } else if (selectedTab === 'forks') {
          if (!isFork || p.authorId !== user?.id) return false;
        } else if (selectedTab === 'purchased') {
          if (!isPurchased || p.authorId === user?.id) return false;
        }

        // Tag filter
        if (selectedTag !== 'all') {
          if (!p.tags || !p.tags.includes(selectedTag)) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchDesc = (p.description || '').toLowerCase().includes(q);
          const matchContent = (p.rawContent || '').toLowerCase().includes(q);
          const matchTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchContent && !matchTags) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        }
        if (sortBy === 'popular') {
          return (b.likesCount || 0) + (b.forksCount || 0) - ((a.likesCount || 0) + (a.forksCount || 0));
        }
        if (sortBy === 'alpha') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [userPrompts, selectedTab, selectedTag, searchQuery, sortBy, user]);

  const handleUseInWorkspace = (prompt: Prompt, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
    setActivePromptId(prompt.id);
    sendToWork({
      title: prompt.title,
      prompt: prompt.rawContent,
    });
    setActiveTab('workspace');
  };

  const handleOpenInIDE = handleUseInWorkspace;

  const handleCopyContent = (prompt: Prompt, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = prompt.rawContent || '';
    navigator.clipboard.writeText(text);
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (promptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = userPrompts.find((p) => p.id === promptId);
    const title = target?.title ? `"${target.title}"` : 'this prompt';
    const ok = await confirm({
      title: 'Delete Prompt from Library',
      message: `Are you sure you want to delete ${title} from your library? This action cannot be undone.`,
      confirmText: 'Delete Prompt',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await deletePrompt(promptId);
      showToast('Prompt removed from library.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete prompt.', 'error');
    }
  };

  const handleToggleVisibility = async (prompt: Prompt, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      showToast('Please sign in to change prompt visibility.', 'info');
      return;
    }
    const isAuthor = prompt.authorId === user.id;
    if (!isAuthor) {
      showToast('You can only change visibility for prompts you authored.', 'error');
      return;
    }

    const nextVisibility: 'public' | 'private' = prompt.visibility === 'public' ? 'private' : 'public';
    setTogglingVisibilityId(prompt.id);

    try {
      await updatePrompt(prompt.id, { visibility: nextVisibility });
      showToast(
        nextVisibility === 'public'
          ? `🌐 "${prompt.title}" is now Public (visible in Community & Marketplace).`
          : `🔒 "${prompt.title}" is now Private (hidden from public feeds).`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to update prompt visibility.', 'error');
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  // Metrics
  const totalCount = userPrompts.length;
  const myCount = userPrompts.filter((p) => p.authorId === user?.id && !p.originalPromptId && !p.originalAuthorId).length;
  const publicCount = userPrompts.filter((p) => p.visibility === 'public').length;
  const privateCount = userPrompts.filter((p) => p.visibility === 'private' || !p.visibility).length;
  const forkCount = userPrompts.filter((p) => p.authorId === user?.id && Boolean(p.originalPromptId || p.originalAuthorId)).length;
  const purchasedCount = userPrompts.filter(
    (p) => (userPurchases || []).some((purch) => purch.promptId === p.id && purch.status === 'completed') && p.authorId !== user?.id
  ).length;

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary text-text-primary px-4 sm:px-6 md:px-10 pt-6 pb-12 space-y-6 max-w-7xl mx-auto w-full text-left select-text">
      {/* ── Top Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-default">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary dark:text-brand-accent flex items-center justify-center shrink-0 border border-brand-primary/20 dark:border-brand-accent/30">
              <PromptLibraryIcon size={20} variant="solid" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-display text-text-primary tracking-tight">
              Library
            </h1>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary border border-border-default">
              {totalCount} Prompts &bull; {collections?.length || 0} Collections
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Manage your personal prompt workspace, templates, customized forks, and organized collections.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('create-prompt')}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Prompt</span>
          </button>
        </div>
      </div>

      {/* ── Section Switcher: Combined Prompts & Collections ── */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-bg-tertiary border border-border-default w-fit select-none">
        <button
          type="button"
          onClick={() => setMainSection('prompts')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 min-h-[36px] ${
            mainSection === 'prompts'
              ? 'bg-bg-secondary text-text-primary shadow-xs font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <PromptLibraryIcon size={16} variant={mainSection === 'prompts' ? 'solid' : 'outline'} className="text-brand-primary dark:text-brand-accent" />
          <span>Prompts ({totalCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setMainSection('collections')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 min-h-[36px] ${
            mainSection === 'collections'
              ? 'bg-bg-secondary text-text-primary shadow-xs font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <PromptLibraryIcon size={16} variant={mainSection === 'collections' ? 'solid' : 'outline'} className="text-brand-primary dark:text-brand-accent" />
          <span>Collections &amp; Folders ({collections?.length || 0})</span>
        </button>
      </div>

      {mainSection === 'collections' ? (
        <div className="pt-1">
          <CollectionsView />
        </div>
      ) : (
        <>
          {/* ── Quick Stats Bar ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'All Library Prompts', value: totalCount, icon: PromptLibraryIcon, color: 'text-brand-primary dark:text-brand-accent' },
          { label: 'Original Creations', value: myCount, icon: PromptStudioIcon, color: 'text-emerald-700 dark:text-emerald-400' },
          { label: 'Customized Forks', value: forkCount, icon: GitFork, color: 'text-blue-700 dark:text-sky-400' },
          { label: 'Purchased Licenses', value: purchasedCount, icon: PromptMarketplaceIcon, color: 'text-purple-700 dark:text-purple-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-3.5 rounded-xl bg-bg-secondary border border-border-default space-y-1 shadow-xs min-w-0"
          >
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[10px] font-mono uppercase font-bold truncate">{stat.label}</span>
              <stat.icon className={`w-3.5 h-3.5 ${stat.color} shrink-0`} />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-text-primary">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Sub-tabs, Search & Filter Toolbar ───────────────────────────────── */}
      <div className="space-y-3">
        {/* Tab switcher */}
        <div className="w-full overflow-x-auto select-none no-scrollbar pb-0.5">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-tertiary border border-border-default w-fit min-h-[40px]">
            {[
              { id: 'all', label: 'All Prompts', count: totalCount },
              { id: 'mine', label: 'My Creations', count: myCount },
              { id: 'public', label: 'Public', count: publicCount, icon: Globe },
              { id: 'private', label: 'Private', count: privateCount, icon: Lock },
              { id: 'forks', label: 'Forks', count: forkCount },
              { id: 'purchased', label: 'Purchased', count: purchasedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 min-h-[34px] ${
                  selectedTab === tab.id
                    ? 'bg-bg-secondary text-text-primary shadow-xs font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {(() => {
                  const Icon = (tab as any).icon;
                  return Icon ? <Icon className={`w-3 h-3 ${tab.id === 'public' ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-muted'}`} /> : null;
                })()}
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono font-normal opacity-70 px-1.5 py-0.2 rounded bg-bg-primary/50">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search input & View / Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              name="librarySearch"
              aria-label="Search prompts in library"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts by title, keywords, system instructions, or tags..."
              className="w-full pl-10 pr-28 py-2 rounded-xl bg-bg-secondary border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary min-h-[44px]"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="min-h-[32px] min-w-[32px] flex items-center justify-center text-xs text-text-muted hover:text-text-primary cursor-pointer rounded-lg hover:bg-bg-tertiary"
                  title="Clear search query"
                  aria-label="Clear search query"
                >
                  ✕
                </button>
              )}
              <PromptCameraMicControls
                variant="inline"
                onImageAttached={(_url) => setSearchQuery('Vision & Image Prompts')}
                onTranscriptReady={(text) => setSearchQuery(text)}
                cameraTooltip="Search library prompts by image"
                micTooltip="Dictate prompt search"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-bg-tertiary border border-border-default min-h-[44px]">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-xs cursor-pointer transition-colors ${
                  viewMode === 'grid' ? 'bg-bg-secondary text-text-primary shadow-xs font-semibold' : 'text-text-muted hover:text-text-primary'
                }`}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-xs cursor-pointer transition-colors ${
                  viewMode === 'list' ? 'bg-bg-secondary text-text-primary shadow-xs font-semibold' : 'text-text-muted hover:text-text-primary'
                }`}
                title="List View"
                aria-label="List View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Sort Selector */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-bg-tertiary border border-border-default text-xs font-medium text-text-primary focus:outline-none focus:border-brand-primary hover:border-border-hover cursor-pointer min-h-[44px] transition-colors"
                aria-label="Sort prompts"
              >
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
                <option value="alpha">Alphabetical</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setSelectedTag('all')}
              className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer shrink-0 ${
                selectedTag === 'all'
                  ? 'bg-brand-primary text-white font-bold'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
              }`}
            >
              #all
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
                className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer shrink-0 ${
                  selectedTag === tag
                    ? 'bg-brand-primary text-white font-bold'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Prompt List / Grid ─────────────────────────────────────────────── */}
      <div data-tour="tour-library-list" className="w-full">
      {filteredPrompts.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-bg-secondary border border-border-default p-6 space-y-3 shadow-xs">
          <PromptLibraryIcon size={40} variant="outline" className="mx-auto text-text-muted/50" />
          <h3 className="text-sm font-bold text-text-primary">
            {searchQuery ? 'No matching prompts found' : 'Your prompt library is empty'}
          </h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? `No prompts matched "${searchQuery}". Try a different search term or clear the tag filters.`
              : 'Create your first prompt or fork community templates to build your personal library.'}
          </p>
          <div className="flex items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('create-prompt')}
              className="btn-primary text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer min-h-[44px] inline-flex items-center justify-center"
            >
              Create New Prompt
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('community')}
              className="px-4 py-2 rounded-xl bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer min-h-[44px] inline-flex items-center justify-center"
            >
              Explore Community
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {filteredPrompts.map((prompt) => {
            const isFork = Boolean(prompt.originalPromptId || prompt.originalAuthorId);
            const isAuthor = Boolean(user && prompt.authorId === user.id);
            const isToggling = togglingVisibilityId === prompt.id;
            const content = prompt.rawContent || '';

            return (
              <motion.div
                key={prompt.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleOpenInIDE(prompt)}
                className="p-4 rounded-2xl bg-bg-secondary border border-border-default hover:border-brand-primary hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-full group min-w-0 space-y-3"
              >
                {/* Header */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors line-clamp-1 truncate flex-1 h-6 flex items-center">
                      {prompt.title}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      {isAuthor ? (
                        <button
                          type="button"
                          onClick={(e) => handleToggleVisibility(prompt, e)}
                          disabled={isToggling}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold transition-all cursor-pointer border min-h-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${
                            prompt.visibility === 'public'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-700/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 shadow-2xs'
                              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border-border-default hover:bg-bg-primary hover:border-border-hover'
                          }`}
                          title={
                            prompt.visibility === 'public'
                              ? 'Status: Public (Live in Community & Marketplace). Click to make Private.'
                              : 'Status: Private (Only visible to you). Click to make Public.'
                          }
                          aria-label={`Visibility: ${prompt.visibility || 'private'}. Click to toggle.`}
                        >
                          {isToggling ? (
                            <Loader2 className="w-3 h-3 text-current animate-spin shrink-0" />
                          ) : prompt.visibility === 'public' ? (
                            <Globe className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Lock className="w-3 h-3 text-text-muted shrink-0" />
                          )}
                          <span className="capitalize">{prompt.visibility === 'public' ? 'Public' : 'Private'}</span>
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold font-mono bg-bg-tertiary text-text-muted border border-border-default min-h-[28px]"
                          title="Purchased prompt (read-only privacy)"
                        >
                          <Lock className="w-3 h-3 text-text-muted shrink-0" />
                          <span>Private</span>
                        </span>
                      )}

                    </div>
                  </div>

                  <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed h-9 overflow-hidden">
                    {prompt.description || 'No description provided.'}
                  </p>
                </div>

                {/* Visual Media Preview (Uniform aspect ratio slot for both image and text prompts) */}
                <PromptImagePreview
                  prompt={prompt}
                  size="compact"
                  aspectRatio="video"
                  showPlaceholderWhenEmpty={true}
                  className="my-0.5 shrink-0"
                />

                {/* Prompt Preview Snippet */}
                <div className="p-2 rounded-lg bg-bg-tertiary border border-border-default text-[11px] font-mono text-text-muted line-clamp-2 break-words leading-snug h-10 overflow-hidden">
                  {content || prompt.description || 'System prompt template'}
                </div>

                {/* Tags & Meta */}
                <div className="space-y-2 pt-2 border-t border-border-subtle mt-auto">
                  <div className="flex flex-wrap items-center gap-1 min-w-0">
                    {isFork && (
                      <span className="text-[9.5px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-sky-300 border border-blue-200 dark:border-blue-800/40 flex items-center gap-0.5">
                        <GitFork className="w-2.5 h-2.5" /> Fork
                      </span>
                    )}
                    {prompt.model && (
                      <span className="inline-flex items-center gap-1 text-[9.5px] text-text-muted font-mono bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-default">
                        <ModelProviderLogo modelId={prompt.model} provider={prompt.model} className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate max-w-[90px]">{prompt.model}</span>
                      </span>
                    )}
                    {(prompt.tags || []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border-default truncate max-w-[100px]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleCopyContent(prompt, e)}
                        className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                        title="Copy Prompt Content"
                        aria-label="Copy Prompt Content"
                      >
                        {copiedId === prompt.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(prompt.id, e)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-text-muted hover:text-rose-600 transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Delete Prompt from Library"
                        aria-label="Delete Prompt"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {isAuthor && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleVisibility(prompt, e)}
                          disabled={isToggling}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center ${
                            prompt.visibility === 'public'
                              ? 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                          }`}
                          title={prompt.visibility === 'public' ? 'Make Private (hidden from public)' : 'Make Public (publish to community)'}
                          aria-label={prompt.visibility === 'public' ? 'Make prompt private' : 'Make prompt public'}
                        >
                          {isToggling ? (
                            <Loader2 className="w-3.5 h-3.5 text-current animate-spin" />
                          ) : prompt.visibility === 'public' ? (
                            <Globe className="w-3.5 h-3.5" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleUseInWorkspace(prompt, e)}
                        className="px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 min-h-[36px]"
                        title="Open and run in Creation Workspace"
                      >
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span>Open in Workspace</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2.5">
          {filteredPrompts.map((prompt) => {
            const isFork = Boolean(prompt.originalPromptId || prompt.originalAuthorId);
            const isAuthor = Boolean(user && prompt.authorId === user.id);
            const isToggling = togglingVisibilityId === prompt.id;

            return (
              <div
                key={prompt.id}
                onClick={() => handleOpenInIDE(prompt)}
                className="p-4 rounded-xl bg-bg-secondary border border-border-default hover:border-brand-primary hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors truncate">
                      {prompt.title}
                    </h3>
                    {isFork && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-sky-300 border border-blue-200 dark:border-blue-800/40 shrink-0">
                        Fork
                      </span>
                    )}
                    {prompt.model && (
                      <span className="inline-flex items-center gap-1 text-[9px] text-text-muted font-mono bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-default shrink-0">
                        <ModelProviderLogo modelId={prompt.model} provider={prompt.model} className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate max-w-[80px]">{prompt.model}</span>
                      </span>
                    )}
                    {isAuthor ? (
                      <button
                        type="button"
                        onClick={(e) => handleToggleVisibility(prompt, e)}
                        disabled={isToggling}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer border shrink-0 ${
                          prompt.visibility === 'public'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-700/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 shadow-2xs'
                            : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border-border-default hover:bg-bg-primary hover:border-border-hover'
                        }`}
                        title={
                          prompt.visibility === 'public'
                            ? 'Status: Public. Click to make Private.'
                            : 'Status: Private. Click to make Public.'
                        }
                        aria-label={`Visibility: ${prompt.visibility || 'private'}. Click to toggle.`}
                      >
                        {isToggling ? (
                          <Loader2 className="w-2.5 h-2.5 text-current animate-spin shrink-0" />
                        ) : prompt.visibility === 'public' ? (
                          <Globe className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Lock className="w-2.5 h-2.5 text-text-muted shrink-0" />
                        )}
                        <span className="capitalize">{prompt.visibility === 'public' ? 'Public' : 'Private'}</span>
                      </button>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-bg-tertiary text-text-muted border border-border-default shrink-0"
                        title="Purchased prompt (read-only privacy)"
                      >
                        <Lock className="w-2.5 h-2.5 text-text-muted shrink-0" />
                        <span>Private</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-1">
                    {prompt.description || prompt.rawContent}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {isAuthor && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleVisibility(prompt, e)}
                      disabled={isToggling}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] flex items-center gap-1.5 border ${
                        prompt.visibility === 'public'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100'
                          : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border-border-default hover:bg-bg-secondary'
                      }`}
                      title={prompt.visibility === 'public' ? 'Click to make Private (hidden from public feeds)' : 'Click to make Public (showcase to community)'}
                      aria-label={prompt.visibility === 'public' ? 'Make prompt private' : 'Make prompt public'}
                    >
                      {isToggling ? (
                        <Loader2 className="w-3.5 h-3.5 text-current animate-spin shrink-0" />
                      ) : prompt.visibility === 'public' ? (
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="hidden md:inline">{prompt.visibility === 'public' ? 'Make Private' : 'Make Public'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleCopyContent(prompt, e)}
                    className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Copy Content"
                    aria-label="Copy Content"
                  >
                    {copiedId === prompt.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(prompt.id, e)}
                    className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-text-muted hover:text-rose-600 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Delete Prompt from Library"
                    aria-label="Delete Prompt"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleUseInWorkspace(prompt, e)}
                    className="px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 min-h-[36px]"
                    title="Open and run in Creation Workspace"
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Open in Workspace</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
        </>
      )}
    </div>
  );
};
export default LibraryView;
