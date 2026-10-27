import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { cloudinaryService } from '../services/cloudinaryService';

import { 
  Save, 
  Globe, 
  Lock, 
  Plus,
  Upload,
  Mic,
  Video,
  Camera,
  Loader2,
  Crown,
  Maximize2,
  Minimize2,
  Sparkles,
  Settings,
  FileText,
  AlertCircle
} from 'lucide-react';
import type { CategoryType, ModelType, AssetType } from '../db/schema';
import { securityUtils } from '../utils/security';
import { modelCatalogService, type CatalogModel } from '../services/modelCatalogService';
import { smartModelResolver } from '../services/ai/smartModelResolver';
import { ImportPromptModal } from '../components/studio/ImportPromptModal';
import type { ImportedPrompt } from '../services/import/promptImporter';
import { DeviceImageUploader } from '../components/common/DeviceImageUploader';
import { VoicePromptModal } from '../components/voice/VoicePromptModal';
import { TranslatePromptModal } from '../components/voice/TranslatePromptModal';
import { PromptVideoDemoModal } from '../components/media/PromptVideoDemoModal';
import { uploadPromptImage } from '../utils/promptMediaAttachment';
import { MediaPickerModal, type MediaPickerResult } from '../components/common/MediaPickerModal';

export const CreatePromptView: React.FC = () => {
  const { createPrompt, setActiveTab, user, showToast } = useApp();

  // Basic Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [category, setCategory] = useState<CategoryType>('Development');
  const [assetType, setAssetType] = useState<AssetType>('prompt');
  
  // Extended Fields
  const [tagsText, setTagsText] = useState('');
  const [hasExplicitModel, setHasExplicitModel] = useState(() => {
    return Boolean(smartModelResolver.getLastSelectedModel(user?.id));
  });
  const [model, setModel] = useState<ModelType | string>(() => {
    const lastSelected = smartModelResolver.getLastSelectedModel(user?.id);
    if (lastSelected) {
      return lastSelected;
    }
    const smart = smartModelResolver.resolveSmartDefaultModel('ide', { category: 'Development', selectionMode: 'automatic' });
    return smart.status === 'resolved' ? smart.model.modelId : 'openrouter/free';
  });

  // Dynamic OpenRouter Catalog state
  const [liveModels, setLiveModels] = useState<CatalogModel[]>(() => modelCatalogService.getCachedCatalog());

  // Context-aware automatic model adaptation based on prompt intent (coding vs reasoning vs general)
  useEffect(() => {
    if (!hasExplicitModel) {
      const smart = smartModelResolver.resolveSmartDefaultModel('ide', {
        promptText: rawContent,
        title,
        category,
        selectionMode: 'automatic',
      });
      if (smart.status === 'resolved') {
        setModel(smart.model.modelId);
      }
    }
  }, [rawContent, title, category, hasExplicitModel]);

  useEffect(() => {
    modelCatalogService.fetchCatalog().then((models) => {
      if (models && models.length > 0) setLiveModels(models);
    }).catch(() => {});

    if (typeof window !== 'undefined') {
      const search = window.location.search;
      const sessionForSale = sessionStorage.getItem('ph_create_for_sale') === 'true';
      const sessionPrice = sessionStorage.getItem('ph_create_for_sale_price');
      if (search.includes('for_sale=true') || search.includes('monetize=true') || search.includes('sell=true') || sessionForSale) {
        setIsPaidMarketplace(true);
        setVisibility('public');
        setPrice(sessionPrice ? parseFloat(sessionPrice).toFixed(2) : '49.00');
        sessionStorage.removeItem('ph_create_for_sale');
        if (sessionPrice) sessionStorage.removeItem('ph_create_for_sale_price');
      }
    }
  }, []);

  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [license, setLicense] = useState<'MIT' | 'Apache-2.0' | 'CC-BY-4.0' | 'Commercial'>('MIT');
  const [isPaidMarketplace, setIsPaidMarketplace] = useState(false);
  const [isOfficialPremium, setIsOfficialPremium] = useState(false);
  const [price, setPrice] = useState('49.00');
  const [inputImageUrl, setInputImageUrl] = useState('');
  const [outputImageUrl, setOutputImageUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isTranslateModalOpen, setIsTranslateModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // ─── Responsive Splitter & Slide Bar Controls ─────────────────────────────
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ph_create_prompt_split_ratio');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 35 && parsed <= 75) return parsed;
      }
    } catch {}
    return 60; // 60% Left / 40% Right default
  });
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'settings'>('editor');
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    rawContent?: string;
  }>({});
  const splitContainerRef = useRef<HTMLFormElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const rawContentRef = useRef<HTMLTextAreaElement>(null);

  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  };

  const handleSplitTouchStart = () => {
    setIsDraggingSplit(true);
  };

  useEffect(() => {
    if (!isDraggingSplit) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!splitContainerRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const rect = splitContainerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(75, Math.max(35, Math.round(pct * 10) / 10));
      setSplitRatio(clamped);
    };

    const handlePointerUp = () => {
      setIsDraggingSplit(false);
      try {
        localStorage.setItem('ph_create_prompt_split_ratio', splitRatio.toString());
      } catch {}
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDraggingSplit, splitRatio]);

  const handleImportPrompt = (imported: ImportedPrompt) => {
    setTitle(imported.title);
    setDescription(imported.description || '');
    setRawContent(imported.template);
    setCategory(imported.category);
    if (imported.tags && imported.tags.length > 0) {
      setTagsText(imported.tags.join(', '));
    }
    if (imported.model) {
      setModel(imported.model);
    }
    showToast(`🎉 Imported "${imported.title}" from ${imported.sourceFormat}!`, 'success');
  };

  // ─── Autosave Draft Management (localStorage) ─────────────────────────────
  const DRAFT_KEY = 'ph_create_prompt_draft';
  const [pendingDraft, setPendingDraft] = useState<{
    title: string;
    description: string;
    rawContent: string;
    category?: CategoryType;
    model?: string;
    tagsText?: string;
    coverUrl?: string;
    inputImageUrl?: string;
    outputImageUrl?: string;
    timestamp: number;
  } | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const draftDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for unsaved draft on load
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const isFresh = parsed.timestamp && (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000);
        const hasContent = Boolean((parsed.rawContent && parsed.rawContent.trim()) || (parsed.title && parsed.title.trim()));
        if (isFresh && hasContent) {
          setPendingDraft(parsed);
          setShowDraftBanner(true);
        }
      }
    } catch {
      // Ignore corrupt storage gracefully
    }
  }, []);

  // Debounced draft autosave
  useEffect(() => {
    if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);

    if (!title.trim() && !rawContent.trim() && !description.trim()) {
      return;
    }

    draftDebounceRef.current = setTimeout(() => {
      try {
        const payload = {
          title,
          description,
          rawContent,
          category,
          model,
          tagsText,
          coverUrl,
          inputImageUrl,
          outputImageUrl,
          timestamp: Date.now()
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      } catch {
        // Handle storage error gracefully
      }
    }, 800);

    return () => {
      if (draftDebounceRef.current) clearTimeout(draftDebounceRef.current);
    };
  }, [title, description, rawContent, category, model, tagsText, coverUrl, inputImageUrl, outputImageUrl]);

  const saveDraftToStorage = () => {
    try {
      const payload = {
        title,
        description,
        rawContent,
        category,
        model,
        tagsText,
        coverUrl,
        inputImageUrl,
        outputImageUrl,
        timestamp: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {}
  };

  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    if (pendingDraft.title !== undefined) setTitle(pendingDraft.title);
    if (pendingDraft.description !== undefined) setDescription(pendingDraft.description);
    if (pendingDraft.rawContent !== undefined) setRawContent(pendingDraft.rawContent);
    if (pendingDraft.category) setCategory(pendingDraft.category);
    if (pendingDraft.model) setModel(pendingDraft.model);
    if (pendingDraft.tagsText !== undefined) setTagsText(pendingDraft.tagsText);
    if (pendingDraft.coverUrl !== undefined) setCoverUrl(pendingDraft.coverUrl);
    if (pendingDraft.inputImageUrl !== undefined) setInputImageUrl(pendingDraft.inputImageUrl);
    if (pendingDraft.outputImageUrl !== undefined) setOutputImageUrl(pendingDraft.outputImageUrl);
    setShowDraftBanner(false);
    setPendingDraft(null);
    showToast('Restored draft content!', 'success');
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setShowDraftBanner(false);
    setPendingDraft(null);
    showToast('Discarded draft.', 'info');
  };

  // Cover and Payload Media Picker states
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
  const [isPayloadPickerOpen, setIsPayloadPickerOpen] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  const handleCoverMediaSelect = (result: MediaPickerResult) => {
    setCoverUrl(result.url);
    setIsCoverPickerOpen(false);
    showToast('Cover image selected.', 'info');
  };

  const handlePayloadMediaSelect = (result: MediaPickerResult) => {
    setIsPayloadPickerOpen(false);
    const markdownTag = `\n\n![Image](${result.url})\n`;
    if (!inputImageUrl) {
      setInputImageUrl(result.url);
    }
    setRawContent(prev => prev.trim() ? `${prev.trim()}${markdownTag}` : markdownTag.trimStart());
    showToast('Image attached to prompt payload.', 'info');
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const rateLimit = securityUtils.rateLimit('ocr_upload', 5000);
    if (!rateLimit.allowed) {
      showToast(rateLimit.error || 'Rate limit active. Try again later.', 'error');
      return;
    }

    setIsOcrProcessing(true);
    showToast('Uploading screenshot...', 'info');

    try {
      const validation = await cloudinaryService.validateFile(file, 8);
      if (!validation.isValid) {
        showToast(validation.error || 'Invalid file format.', 'error');
        setIsOcrProcessing(false);
        return;
      }

      const response = await cloudinaryService.uploadImage(file, 'covers');
      setCoverUrl(response.secure_url);
      showToast('Image uploaded successfully.', 'info');
    } catch (err: any) {
      console.error('[OCR] Upload failed:', err);
      showToast(err.message || 'Image upload failed.', 'error');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const [isPromptImageUploading, setIsPromptImageUploading] = useState(false);
  const [isDraggingPayload, setIsDraggingPayload] = useState(false);
  const promptCameraInputRef = useRef<HTMLInputElement>(null);
  const isProcessingPayloadRef = useRef(false);

  const processPayloadImage = async (file: File) => {
    if (isPromptImageUploading || isProcessingPayloadRef.current) return;
    isProcessingPayloadRef.current = true;
    setIsPromptImageUploading(true);
    try {
      const { url, markdownTag } = await uploadPromptImage(file, { showToast });
      if (!inputImageUrl) {
        setInputImageUrl(url);
      }
      setRawContent(prev => prev.trim() ? `${prev.trim()}${markdownTag}` : markdownTag.trimStart());
    } catch {
      // toast handled in uploadPromptImage
    } finally {
      isProcessingPayloadRef.current = false;
      setIsPromptImageUploading(false);
      if (promptCameraInputRef.current) {
        promptCameraInputRef.current.value = '';
      }
    }
  };

  const handlePromptCameraSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processPayloadImage(file);
    }
  };

  const handlePayloadDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      setIsDraggingPayload(true);
    }
  };

  const handlePayloadDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPayload(false);
  };

  const handlePayloadDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPayload(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && ((file.type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(file.name || ''))) {
      await processPayloadImage(file);
    }
  };

  const handlePayloadPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if ((items[i]?.type || '').startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await processPayloadImage(file);
          break;
        }
      }
    }
  };

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleGenerateCover = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setValidationErrors(prev => ({ ...prev, title: 'Please enter a prompt title first.' }));
      setMobileTab('editor');
      titleInputRef.current?.focus();
      titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('Please enter a prompt title first.', 'error');
      return;
    }

    const rateLimit = securityUtils.rateLimit('image_generate', 2000);
    if (!rateLimit.allowed) {
      showToast(rateLimit.error || 'Rate limit active. Try again later.', 'error');
      return;
    }

    setIsGeneratingImage(true);
    try {
      const hash = cleanTitle.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const palettes = [
        ['#315C4A', '#274B3C', '#F7F5EF'],
        ['#1F2421', '#315C4A', '#E3ECE7'],
        ['#315C4A', '#529E7C', '#151916'],
        ['#274B3C', '#529E7C', '#0E110F'],
      ];
      const selectedPalette = palettes[hash % palettes.length];
      const safeTitle = cleanTitle.replace(/[<>&"]/g, '').slice(0, 42);
      const safeCategory = category.replace(/[<>&"]/g, '');

      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas rendering context unavailable');

      const grad = ctx.createLinearGradient(0, 0, 1200, 630);
      grad.addColorStop(0, selectedPalette[0]);
      grad.addColorStop(1, selectedPalette[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 630);

      // Subtle decorative grid accent
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 1200; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 630);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '600 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(safeCategory.toUpperCase(), 80, 240);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 50px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(safeTitle, 80, 320);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('PromptHub Verified AI Asset', 80, 520);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to encode banner PNG');

      const file = new File([blob], 'generated_cover.png', { type: 'image/png' });
      const uploadRes = await cloudinaryService.uploadImage(file, 'covers');
      setCoverUrl(uploadRes.secure_url);
      showToast('AI Cover Banner generated successfully!', 'success');
    } catch (err: any) {
      console.error('[GenerateCover] Failed:', err);
      showToast('Failed to generate cover: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, forcedStatus?: 'active' | 'draft') => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const rateLimit = securityUtils.rateLimit('create_prompt', 1500);
    if (!rateLimit.allowed) {
      showToast(rateLimit.error || 'Please wait a moment before creating another prompt.', 'error');
      return;
    }

    const sanitizedTitle = securityUtils.sanitizeText(title);
    const sanitizedDesc = securityUtils.sanitizeText(description);
    const sanitizedContent = securityUtils.sanitizePromptInput(rawContent);

    const errors: { title?: string; rawContent?: string } = {};

    if (!sanitizedTitle.trim()) {
      errors.title = 'Please enter a prompt title.';
    } else if (sanitizedTitle.trim().length < 3) {
      errors.title = 'Prompt title must be at least 3 characters.';
    } else if (sanitizedTitle.trim().length > 100) {
      errors.title = 'Prompt title cannot exceed 100 characters.';
    }

    if (!sanitizedContent.trim()) {
      errors.rawContent = 'Please enter instructions or system prompt content.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setMobileTab('editor');

      if (errors.title) {
        titleInputRef.current?.focus();
        titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('Prompt title is required.', 'error');
      } else if (errors.rawContent) {
        rawContentRef.current?.focus();
        rawContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('Prompt instructions content is required.', 'error');
      }
      return;
    }

    setValidationErrors({});

    if (!user) {
      saveDraftToStorage();
      showToast('Please sign in or create an account to publish. Your work has been saved as a draft!', 'info');
      setActiveTab('auth');
      return;
    }

    const tagsArray = tagsText
      .split(',')
      .map(t => securityUtils.sanitizeText(t.trim()))
      .filter(Boolean);

    const isDraft = forcedStatus === 'draft';
    const selectedStatus: 'active' | 'draft' = isDraft ? 'draft' : 'active';
    const effectiveVisibility = isDraft ? 'private' : visibility;

    const isAdmin = user?.role === 'Admin';
    const effectiveIsOfficialPremium = !isDraft && Boolean(isAdmin && isOfficialPremium);
    const effectiveIsPaid = !isDraft && !effectiveIsOfficialPremium && Boolean(isPaidMarketplace);
    const numericPrice = effectiveIsPaid ? Math.max(1, parseFloat(price) || 49) : 0;

    setIsSubmitting(true);
    try {
      await createPrompt({
        title: sanitizedTitle,
        description: sanitizedDesc,
        rawContent: sanitizedContent,
        category,
        tags: tagsArray,
        model,
        visibility: effectiveVisibility,
        authorId: user?.id || securityUtils.generateUUID(),
        authorName: user?.name || 'Community Member',
        authorAvatar: user?.avatarUrl || '',
        isPremium: effectiveIsOfficialPremium,
        price: numericPrice,
        priceInr: numericPrice,
        assetType,
        difficulty,
        license,
        status: selectedStatus,
        thumbnail: 'editorial-forest',
        coverUrl: coverUrl || undefined,
        inputImageUrl: inputImageUrl.trim() || undefined,
        outputImageUrl: outputImageUrl.trim() || undefined,
      });

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      setShowDraftBanner(false);
      setPendingDraft(null);

      if (isDraft) {
        showToast('Draft saved successfully to your private workspace!', 'success');
        setActiveTab('profile');
      } else if (effectiveVisibility === 'public') {
        showToast('Prompt published to community showcase!', 'success');
        setActiveTab('community');
      } else {
        showToast('Prompt saved to your private library!', 'success');
        setActiveTab('profile');
      }

      setTitle('');
      setDescription('');
      setRawContent('');
      setTagsText('');
      setCoverUrl('');
    } catch (err: any) {
      const actionDesc = isDraft ? 'save draft' : 'publish prompt';
      showToast(`Failed to ${actionDesc}: ${err?.message || 'Database error'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-bg-primary select-text text-left">
      {/* ── Top Header Toolbar ────────────────────────────────────────── */}
      <div className="border-b border-border-default bg-bg-secondary/90 backdrop-blur-md px-4 sm:px-6 py-3 shrink-0 z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title and Subtitle */}
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-primary shrink-0" />
              <span className="truncate">Create AI Prompt Asset</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-brand-primary-light text-brand-primary border border-brand-primary/20">
                Studio Wizard
              </span>
            </h2>
            <p className="text-text-secondary text-xs mt-0.5 truncate max-w-xl">
              Build a structured system instruction, dynamic workflow chain, or MCP schema model.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between lg:justify-end">
            {/* Template Import Button */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-default hover:border-brand-primary/50 text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-3xs min-h-[44px] sm:min-h-[34px] transition-colors"
              title="Import prompt from Markdown, JSON, Cursor, Agent Skills, or TOML"
            >
              <Upload className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span className="hidden sm:inline">Import</span>
              <span className="sm:hidden">Import</span>
            </button>

            {/* Top Quick Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSubmit(undefined, 'draft')}
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle text-text-primary border border-border-default text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors min-h-[44px] sm:min-h-[34px]"
                title="Save work as an unlisted private draft"
              >
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors min-h-[44px] sm:min-h-[34px]"
                title="Publish prompt to library or marketplace"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Publish</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile & Tablet Tab Switcher (<lg) */}
        <div className="lg:hidden flex items-center bg-bg-tertiary p-1 border border-border-default rounded-xl mt-2.5 max-w-md mx-auto w-full select-none">
          <button
            type="button"
            onClick={() => setMobileTab('editor')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'editor'
                ? 'bg-bg-secondary text-text-primary shadow-xs font-bold border border-border-default'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <FileText className="w-4 h-4 text-brand-primary" />
            <span>1. Content & Payload</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('settings')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'settings'
                ? 'bg-bg-secondary text-text-primary shadow-xs font-bold border border-border-default'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Settings className="w-4 h-4 text-brand-primary" />
            <span>2. Config & Previews</span>
          </button>
        </div>
      </div>

      {/* ── Main Scrollable Area ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 lg:p-6 w-full">
        <div className="max-w-[1600px] mx-auto space-y-4">
          {/* Draft Recovery Banner */}
          {showDraftBanner && pendingDraft && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-3xs font-sans">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>
                  <strong>Unsaved Draft Detected:</strong> You have an unsaved prompt draft from {new Date(pendingDraft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer transition-colors min-h-[44px] sm:min-h-[28px]"
                >
                  Restore Draft
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="px-3 py-1 rounded-md bg-bg-secondary hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-500/40 font-semibold cursor-pointer transition-colors min-h-[44px] sm:min-h-[28px]"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Form with Resizable Split Pane */}
          <form 
            noValidate
            onSubmit={(e) => handleSubmit(e)}
            ref={splitContainerRef}
            className={`w-full flex flex-col lg:flex-row items-stretch gap-0 relative ${
              isDraggingSplit ? 'select-none' : ''
            }`}
          >
            {/* ── LEFT COLUMN: Core Metadata & Instruction Payload ─────── */}
            <div 
              style={{
                width: isEditorExpanded 
                  ? '100%' 
                  : typeof window !== 'undefined' && window.innerWidth >= 1024 
                    ? `${splitRatio}%` 
                    : undefined,
              }}
              className={`flex-col space-y-4 min-w-0 ${
                isEditorExpanded ? 'w-full' : 'lg:block'
              } ${
                mobileTab === 'editor' ? 'flex' : 'hidden lg:flex'
              }`}
            >
              {/* Core Metadata Card */}
              <div className="bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xs transition-shadow">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Core Metadata</span>
                  </h4>
                  <span className="text-[10px] font-mono text-text-muted">Step 1 of 2</span>
                </div>

                {/* Asset Title */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="prompt-asset-title" className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1">
                      <span>Asset Title</span>
                      <span className="text-brand-rose">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono tabular-nums ${title.length >= 95 ? 'text-brand-amber font-semibold' : 'text-text-muted'}`}>
                        {title.length} / 100
                      </span>
                      {validationErrors.title && (
                        <span className="text-[10px] font-mono text-brand-rose font-medium animate-fadeIn">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <input 
                      id="prompt-asset-title"
                      ref={titleInputRef}
                      type="text" 
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value.slice(0, 100));
                        if (validationErrors.title) {
                          setValidationErrors(prev => ({ ...prev, title: undefined }));
                        }
                      }}
                      maxLength={100}
                      aria-required="true"
                      aria-invalid={Boolean(validationErrors.title)}
                      aria-describedby={validationErrors.title ? "title-error-msg" : undefined}
                      placeholder="e.g. Type-Safe React Component Scaffolder"
                      className={`w-full bg-bg-tertiary border rounded-lg px-3 py-2 text-xs sm:text-sm text-text-primary focus:outline-none min-h-[44px] sm:min-h-[38px] transition-all duration-150 ${
                        validationErrors.title 
                          ? 'border-brand-rose/80 focus:border-brand-rose ring-2 ring-brand-rose/20 bg-brand-rose/[0.03]' 
                          : 'border-border-default focus:border-brand-primary'
                      }`}
                    />
                  </div>
                  {validationErrors.title && (
                    <div 
                      id="title-error-msg" 
                      role="alert"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-rose/10 border border-brand-rose/25 text-brand-rose text-xs font-medium animate-fadeIn shadow-2xs"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-brand-rose" />
                      <span>{validationErrors.title}</span>
                    </div>
                  )}
                </div>

                {/* Short Description */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Short Description</label>
                    <span className={`text-[10px] font-mono tabular-nums ${description.length > 1000 ? 'text-brand-rose font-bold' : description.length > 900 ? 'text-brand-amber' : 'text-text-muted'}`}>
                      {description.length} / 1000
                    </span>
                  </div>
                  <input 
                    type="text" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                    placeholder="Brief summary of what this template achieves..."
                    maxLength={1000}
                    className={`w-full bg-bg-tertiary border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none transition-colors min-h-[44px] sm:min-h-[38px] ${description.length >= 1000 ? 'border-brand-rose focus:border-brand-rose' : 'border-border-default focus:border-brand-primary'}`}
                  />
                  {description.length >= 1000 && (
                    <p className="text-[10px] text-brand-rose font-medium">Maximum description length reached (1000 characters).</p>
                  )}
                </div>

                {/* Asset Type & Category Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Asset Type</label>
                    <select 
                      value={assetType}
                      onChange={(e) => setAssetType(e.target.value as any)}
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-2.5 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer font-mono min-h-[44px] sm:min-h-[38px]"
                    >
                      <option value="prompt">Prompt Instruction</option>
                      <option value="workflow">AI Workflow / Chain</option>
                      <option value="mcp">MCP Server Config</option>
                      <option value="agent">Autonomous Agent</option>
                      <option value="rag">RAG Chunking Template</option>
                      <option value="dataset">Eval Dataset</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Category Group</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-2.5 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer font-mono min-h-[44px] sm:min-h-[38px]"
                    >
                      <option value="Development">Development</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Design">Design</option>
                      <option value="Writing">Writing</option>
                      <option value="Business">Business</option>
                      <option value="Education">Education</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Instruction Payload Code Editor Card */}
              <div className="bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xs">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Instruction Payload</span>
                      <span className="text-brand-rose">*</span>
                    </h4>
                    <span className="text-[10px] font-mono text-text-muted">
                      ({rawContent.length} chars)
                    </span>
                    {validationErrors.rawContent && (
                      <span className="text-[10px] font-mono text-brand-rose font-medium animate-fadeIn">
                        Required
                      </span>
                    )}
                  </div>

                  {/* Payload Multi-Modal Toolbar */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Hidden camera file input */}
                    <input
                      ref={promptCameraInputRef}
                      type="file"
                      accept="image/*"
                      disabled={isPromptImageUploading}
                      onChange={handlePromptCameraSelect}
                      className="hidden"
                      aria-hidden="true"
                    />

                    <button
                      type="button"
                      onClick={() => setIsPayloadPickerOpen(true)}
                      disabled={isPromptImageUploading}
                      className="flex items-center gap-1 px-2.5 py-1 bg-bg-tertiary border border-border-default rounded-md text-[11px] font-medium text-text-primary hover:bg-border-subtle transition-colors cursor-pointer min-h-[44px] sm:min-h-[30px]"
                      title="Attach photo from Gallery, Link, or Storage Vault"
                      aria-label="Attach photo"
                    >
                      {isPromptImageUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
                      ) : (
                        <Camera className="w-3.5 h-3.5 text-brand-primary" />
                      )}
                      <span>{isPromptImageUploading ? 'Uploading...' : 'Photo'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsVoiceModalOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-bg-tertiary border border-border-default rounded-md text-[11px] font-medium text-text-primary hover:bg-border-subtle transition-colors cursor-pointer min-h-[44px] sm:min-h-[30px]"
                      title="Dictate with voice (Sarvam AI / Deepgram)"
                    >
                      <Mic className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Voice</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsTranslateModalOpen(true)}
                      disabled={!rawContent.trim()}
                      className="flex items-center gap-1 px-2.5 py-1 bg-bg-tertiary border border-border-default rounded-md text-[11px] font-medium text-text-primary hover:bg-border-subtle transition-colors cursor-pointer min-h-[44px] sm:min-h-[30px] disabled:opacity-50"
                      title="Translate prompt (Sarvam AI Mayura)"
                    >
                      <Globe className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Translate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsVideoModalOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-bg-tertiary border border-border-default rounded-md text-[11px] font-medium text-text-primary hover:bg-border-subtle transition-colors cursor-pointer min-h-[44px] sm:min-h-[30px]"
                      title="Attach or watch video walkthrough (Mux)"
                    >
                      <Video className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Walkthrough</span>
                    </button>

                    <label className={`flex items-center gap-1 px-2.5 py-1 bg-bg-tertiary border border-border-default rounded-md text-[11px] font-medium text-text-primary hover:bg-border-subtle transition-colors cursor-pointer min-h-[44px] sm:min-h-[30px] ${isOcrProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isOcrProcessing ? 'Extracting...' : 'OCR Import'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleOcrUpload}
                        disabled={isOcrProcessing}
                      />
                    </label>

                    {/* Expand/Collapse Focus Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsEditorExpanded(prev => !prev)}
                      className="hidden lg:flex items-center gap-1 px-2 py-1 bg-bg-tertiary border border-border-default rounded-md text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[30px]"
                      title={isEditorExpanded ? 'Exit Focus Mode' : 'Expand Editor Focus Mode'}
                    >
                      {isEditorExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea 
                    id="prompt-instruction-payload"
                    ref={rawContentRef}
                    value={rawContent}
                    onChange={(e) => {
                      setRawContent(e.target.value);
                      if (validationErrors.rawContent) {
                        setValidationErrors(prev => ({ ...prev, rawContent: undefined }));
                      }
                    }}
                    aria-required="true"
                    aria-invalid={Boolean(validationErrors.rawContent)}
                    aria-describedby={validationErrors.rawContent ? "content-error-msg" : undefined}
                    onKeyDown={(e) => {
                      if (
                        (e.ctrlKey || e.metaKey) &&
                        (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13)
                      ) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    onDragOver={handlePayloadDragOver}
                    onDragLeave={handlePayloadDragLeave}
                    onDrop={handlePayloadDrop}
                    onPaste={handlePayloadPaste}
                    placeholder="Act as a professional... Define system context, formatting layout, few-shot examples, and rules. Use {{variable}} for parameters."
                    className={`w-full bg-bg-tertiary border rounded-lg p-3 text-xs sm:text-sm font-mono text-text-primary focus:outline-none resize-y transition-all duration-150 ${
                      validationErrors.rawContent
                        ? 'border-brand-rose/80 focus:border-brand-rose ring-2 ring-brand-rose/20 bg-brand-rose/[0.03]'
                        : 'border-border-default focus:border-brand-primary'
                    } ${
                      isEditorExpanded ? 'h-96 sm:h-[32rem]' : 'h-72 sm:h-80'
                    }`}
                  />

                  {isDraggingPayload && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand-primary/10 border-2 border-dashed border-brand-primary rounded-lg backdrop-blur-[1px] pointer-events-none text-xs font-semibold text-brand-primary gap-1">
                      <Camera className="w-6 h-6 animate-pulse text-brand-primary" />
                      <span>Drop photo here to attach to payload</span>
                    </div>
                  )}
                </div>

                {validationErrors.rawContent && (
                  <div 
                    id="content-error-msg" 
                    role="alert"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-rose/10 border border-brand-rose/25 text-brand-rose text-xs font-medium animate-fadeIn shadow-2xs"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-brand-rose" />
                    <span>{validationErrors.rawContent}</span>
                  </div>
                )}

                {/* Helper Tips */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-muted font-mono pt-1">
                  <span>Tip: Press <kbd className="px-1 py-0.5 bg-bg-tertiary border border-border-subtle rounded text-[10px]">Ctrl+Enter</kbd> to publish quickly.</span>
                  <span>Supports parameters via <code className="text-brand-primary">{'{{variable}}'}</code></span>
                </div>
              </div>
            </div>

            {/* ── DRAGGABLE DIVIDER (Slide Bar for Desktop) ─────────────── */}
            {!isEditorExpanded && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-valuenow={Math.round(splitRatio)}
                aria-valuemin={35}
                aria-valuemax={75}
                tabIndex={0}
                onMouseDown={handleSplitMouseDown}
                onTouchStart={handleSplitTouchStart}
                onDoubleClick={() => {
                  setSplitRatio(60);
                  try {
                    localStorage.setItem('ph_create_prompt_split_ratio', '60');
                  } catch {}
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    setSplitRatio((prev) => Math.max(35, prev - 2));
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    setSplitRatio((prev) => Math.min(75, prev + 2));
                  } else if (e.key === 'Home' || e.key === 'Enter') {
                    setSplitRatio(60);
                  }
                }}
                className={`hidden lg:flex items-center justify-center relative w-3.5 hover:w-4 -mx-1.5 cursor-col-resize select-none shrink-0 transition-all z-20 group ${
                  isDraggingSplit
                    ? 'bg-brand-primary/20'
                    : 'bg-transparent hover:bg-brand-primary/10'
                }`}
                title="Drag this slide bar to adjust panel widths • Double-click to reset 60:40 • Use arrow keys"
                aria-label="Drag slide bar to resize editor and settings panels"
              >
                {/* Visual Slide Bar Grip Handle */}
                <div className={`h-12 w-1.5 rounded-full transition-all flex flex-col items-center justify-center gap-0.5 ${
                  isDraggingSplit 
                    ? 'bg-brand-primary shadow-xs' 
                    : 'bg-border-default group-hover:bg-brand-primary group-hover:h-16'
                }`}>
                  <span className="w-0.5 h-0.5 rounded-full bg-white opacity-80" />
                  <span className="w-0.5 h-0.5 rounded-full bg-white opacity-80" />
                  <span className="w-0.5 h-0.5 rounded-full bg-white opacity-80" />
                </div>
              </div>
            )}

            {/* ── RIGHT COLUMN: Configuration, Monetization & Previews ─── */}
            <div 
              style={{
                width: isEditorExpanded 
                  ? '0%' 
                  : typeof window !== 'undefined' && window.innerWidth >= 1024 
                    ? `${100 - splitRatio}%` 
                    : undefined,
                display: isEditorExpanded ? 'none' : undefined
              }}
              className={`flex-col space-y-4 min-w-0 ${
                mobileTab === 'settings' ? 'flex' : 'hidden lg:flex'
              }`}
            >
              {/* Primary Configuration Card */}
              <div className="bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Configuration</span>
                  </h4>
                  <span className="text-[10px] font-mono text-text-muted">Targeting &amp; Tags</span>
                </div>

                {/* Model Target */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Primary AI Model</label>
                  <select 
                    value={model}
                    onChange={(e) => {
                      const val = e.target.value;
                      setModel(val as any);
                      setHasExplicitModel(true);
                      smartModelResolver.setLastSelectedModel(val, user?.id);
                    }}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-2.5 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer font-mono min-h-[44px] sm:min-h-[38px]"
                  >
                    {Array.from(new Set(liveModels.map((m) => m.provider))).map((provider) => (
                      <optgroup key={provider} label={provider}>
                        {liveModels
                          .filter((m) => m.provider === provider)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} {m.isFree ? '⚡ FREE' : ''}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Difficulty & License */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Difficulty</label>
                    <select 
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-2.5 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer font-mono min-h-[44px] sm:min-h-[38px]"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">License</label>
                    <select 
                      value={license}
                      onChange={(e) => setLicense(e.target.value as any)}
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-2.5 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer font-mono min-h-[44px] sm:min-h-[38px]"
                    >
                      <option value="MIT">MIT</option>
                      <option value="Apache-2.0">Apache-2.0</option>
                      <option value="CC-BY-4.0">CC-BY-4.0</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Tags (Comma separated)</label>
                  <input 
                    type="text" 
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder="react, tailwind, ui-design"
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none min-h-[44px] sm:min-h-[38px]"
                  />
                </div>

                {/* Visibility Toggle */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Visibility</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibility('private')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer min-h-[44px] ${
                        visibility === 'private'
                          ? 'bg-brand-primary-light border-brand-primary text-brand-primary font-semibold shadow-3xs'
                          : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Private</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility('public')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer min-h-[44px] ${
                        visibility === 'public'
                          ? 'bg-brand-primary-light border-brand-primary text-brand-primary font-semibold shadow-3xs'
                          : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Public</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Cover Image Card */}
              <div className="bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted block font-mono">Cover Banner</h4>
                  <span className="text-[9px] font-mono text-text-muted">Display Artwork</span>
                </div>
                
                {coverUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-border-default aspect-video">
                    <img 
                      src={coverUrl} 
                      alt="Cover Preview" 
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setCoverUrl('')}
                      className="absolute top-1.5 right-1.5 px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-semibold cursor-pointer shadow-xs min-h-[28px]"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setIsCoverPickerOpen(true)}
                      className="flex-1 px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-text-primary cursor-pointer text-[11px] font-medium inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px]"
                    >
                      <Upload className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Choose Cover (Gallery/Vault)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateCover}
                      disabled={isGeneratingImage || !title.trim()}
                      className="px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-brand-primary cursor-pointer text-[11px] font-medium disabled:opacity-40 min-h-[44px] sm:min-h-[36px] flex items-center justify-center gap-1.5"
                    >
                      {isGeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Generate Banner</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Listing Type & Monetization */}
              <div className="bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted block font-mono">
                    Marketplace &amp; Monetization
                  </h4>
                  <span className="text-[9px] font-mono text-brand-primary font-semibold">Earn 70%</span>
                </div>

                {/* Paid Marketplace Option for all users */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-text-primary cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isPaidMarketplace}
                      onChange={(e) => {
                        setIsPaidMarketplace(e.target.checked);
                        if (e.target.checked) {
                          setIsOfficialPremium(false);
                          setVisibility('public');
                        }
                      }}
                      className="accent-brand-primary w-4 h-4 cursor-pointer rounded" 
                    />
                    <span>List on Paid Marketplace</span>
                  </label>

                  {isPaidMarketplace && (
                    <div className="space-y-2 pl-6 pt-1">
                      <label className="text-[10px] font-mono text-text-muted block">Listing Price (INR ₹):</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-text-muted font-mono font-bold">₹</span>
                        <input 
                          type="number" 
                          step="1" 
                          min="10"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="49"
                          className="w-full max-w-[160px] bg-bg-tertiary border border-border-default rounded-md px-2.5 py-1.5 text-xs text-text-primary font-mono focus:outline-none min-h-[44px] sm:min-h-[34px]"
                        />
                      </div>
                      <p className="text-[11px] text-text-secondary leading-normal">
                        <span className="font-semibold text-brand-primary">70% creator payout</span>: You keep 70% of each sale. PromptHub retains 30% platform fee.
                      </p>
                    </div>
                  )}
                </div>

                {/* Admin-only: Official Premium Prompt */}
                {user?.role === 'Admin' && (
                  <div className="pt-2 border-t border-border-default/60 space-y-1.5">
                    <label className="flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={isOfficialPremium}
                        onChange={(e) => {
                          setIsOfficialPremium(e.target.checked);
                          if (e.target.checked) {
                            setIsPaidMarketplace(false);
                            setVisibility('public');
                          }
                        }}
                        className="accent-purple-600 w-4 h-4 cursor-pointer rounded" 
                      />
                      <Crown className="w-3.5 h-3.5" />
                      <span>Official Premium Prompt (Included in Plans &amp; ₹200+ Topup)</span>
                    </label>
                    <p className="text-[10px] text-text-muted pl-6">
                      Admin-only: Unlocks for all users with an active paid plan or lifetime ₹200+ credit topup at no extra charge.
                    </p>
                  </div>
                )}
              </div>

              {/* Before / After Preview Image Uploads */}
              <div className="bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted block font-mono">
                    Before / After Previews
                  </h4>
                  <span className="text-[9px] font-mono text-text-muted">Optional</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <DeviceImageUploader
                    label="Input (Before)"
                    value={inputImageUrl}
                    onChange={setInputImageUrl}
                    folder="prompts"
                    compact
                    aspectRatio="video"
                  />

                  <DeviceImageUploader
                    label="Output (After)"
                    value={outputImageUrl}
                    onChange={setOutputImageUrl}
                    folder="prompts"
                    compact
                    aspectRatio="video"
                  />
                </div>
              </div>

              {/* Form Footer Action Bar for Instant Publishing */}
              <div className="p-4 rounded-xl bg-bg-secondary border border-border-default flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="text-xs text-text-muted">
                  <span>Verify prompt instructions and parameters before publishing.</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handleSubmit(undefined, 'draft')}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-bg-tertiary hover:bg-border-subtle text-text-primary border border-border-default text-xs font-medium cursor-pointer transition-colors min-h-[44px]"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors min-h-[44px]"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Publish Prompt</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <ImportPromptModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportPrompt}
      />

      <VoicePromptModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onTranscriptReady={(transcript) => {
          setRawContent(prev => prev ? `${prev}\n${transcript}` : transcript);
        }}
      />

      <TranslatePromptModal
        isOpen={isTranslateModalOpen}
        onClose={() => setIsTranslateModalOpen(false)}
        originalPrompt={rawContent}
        onApplyTranslation={(translated) => {
          setRawContent(translated);
        }}
      />

      <PromptVideoDemoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        promptTitle={title || 'New Prompt Asset'}
      />

      <MediaPickerModal
        isOpen={isCoverPickerOpen}
        onClose={() => setIsCoverPickerOpen(false)}
        onSelect={handleCoverMediaSelect}
        title="Select Cover Banner"
        description="Choose a cover from your gallery, paste a direct web image link, or select from your Storage Vault."
        mediaType="image"
      />

      <MediaPickerModal
        isOpen={isPayloadPickerOpen}
        onClose={() => setIsPayloadPickerOpen(false)}
        onSelect={handlePayloadMediaSelect}
        title="Attach Photo to Prompt"
        description="Select an image from device gallery, web link, or your Storage Vault to embed in this prompt."
        mediaType="image"
      />
    </div>
  );
};

export default CreatePromptView;
