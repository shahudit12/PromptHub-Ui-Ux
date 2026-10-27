import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Terminal, 
  GitBranch, 
  Copy, 
  Check, 
  Variable,
  Download,
  Lock,
  Flag,
  Share2,
  Heart,
  MessageSquare,
  ChevronDown,
  FileText,
  FileCode,
  AlignLeft,
  Code2,
  Sparkles,
} from 'lucide-react';
import type { Prompt } from '../db/schema';
import { extractVariables } from '../services/ai/variableEngine';
import { exportPrompt, type ExportFormat } from '../services/export/promptExporter';
import { useApp } from '../context/AppContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { isPaidPrompt, isAdminPremiumPrompt, isPromptLockedForUser } from '../utils/isPaidUser';
import { StarRating } from './StarRating';
import { ratingService } from '../services/ratingService';
import { ReportPromptModal } from './ReportPromptModal';
import { CommentsModal } from './CommentsModal';
import { UserAvatar } from './UserAvatar';
import { trackPromptShared } from '../lib/mixpanelEvents';
import { PromptRepository } from '../repositories/promptRepository';
import { PromptImagePreview } from './common/PromptImagePreview';
import { ModelProviderLogo } from './common/ModelProviderLogo';

export interface PromptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: Prompt | null;
  onFork: (prompt: Prompt) => Promise<Prompt | void> | void;
  onPurchase?: (prompt: Prompt) => void;
}

export const PromptPreviewModal: React.FC<PromptPreviewModalProps> = ({
  isOpen,
  onClose,
  prompt,
  onFork,
  onPurchase,
}) => {
  const { user, setActiveTab, showToast, setShowAuthModal, userPurchases, sharePrompt, prompts, setActivePromptId, toggleLikePrompt, likedPromptIds } = useApp();
  const { sendToWork } = useWorkspace();
  const [copied, setCopied] = React.useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [authorizedContent, setAuthorizedContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [currentLikesCount, setCurrentLikesCount] = useState<number>(prompt?.likesCount || 0);
  const [currentCommentsCount, setCurrentCommentsCount] = useState<number>(prompt?.commentsCount || 0);
  const [currentForksCount, setCurrentForksCount] = useState<number>(prompt?.forksCount || 0);
  const [currentViewsCount, setCurrentViewsCount] = useState<number>(prompt?.viewsCount || 0);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExportOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportOpen]);

  const isPurchased = userPurchases?.some(p => p.promptId === prompt?.id && p.status === 'completed');
  const isAuthor = Boolean(user && prompt && prompt.authorId === user.id);
  const userFork = prompts?.find(p => prompt && (p.originalPromptId === prompt.id || p.id === prompt.id) && p.authorId === user?.id);
  const ownsPrompt = Boolean(isPurchased || isAuthor || userFork || user?.role === 'Admin');
  const isPaid = prompt ? isPaidPrompt(prompt) : false;
  const isAdminPremium = prompt ? isAdminPremiumPrompt(prompt) : false;
  const isLocked = isPromptLockedForUser(prompt, user, userPurchases);
  const canRateCheck = prompt ? ratingService.canUserRate(prompt, user, (userPurchases || []).map(p => p.promptId), userRating) : { allowed: false, reason: 'Preview only' };

  React.useEffect(() => {
    setCurrentLikesCount(prompt?.likesCount || 0);
    setCurrentCommentsCount(prompt?.commentsCount || 0);
    setCurrentForksCount(prompt?.forksCount || 0);
    setCurrentViewsCount(prompt?.viewsCount || 0);
  }, [prompt?.id, prompt?.likesCount, prompt?.commentsCount, prompt?.forksCount, prompt?.viewsCount]);

  React.useEffect(() => {
    if (!prompt?.id) return;
    const handleLikeChange = (e: Event) => {
      const { promptId, likesCount, delta } = (e as CustomEvent).detail || {};
      if (promptId === prompt.id) {
        setCurrentLikesCount(prev => typeof likesCount === 'number' ? likesCount : Math.max(0, prev + (delta ?? 0)));
      }
    };
    const handleCommentChange = (e: Event) => {
      const { promptId, commentsCount, delta } = (e as CustomEvent).detail || {};
      if (promptId === prompt.id) {
        setCurrentCommentsCount(prev => typeof commentsCount === 'number' ? commentsCount : Math.max(0, prev + (delta ?? 1)));
      }
    };
    const handleForkChange = (e: Event) => {
      const { promptId, forksCount, delta } = (e as CustomEvent).detail || {};
      if (promptId === prompt.id) {
        setCurrentForksCount(prev => typeof forksCount === 'number' ? forksCount : Math.max(0, prev + (delta ?? 1)));
      }
    };
    const handleViewChange = (e: Event) => {
      const { promptId, viewsCount, delta } = (e as CustomEvent).detail || {};
      if (promptId === prompt.id) {
        setCurrentViewsCount(prev => typeof viewsCount === 'number' ? viewsCount : Math.max(0, prev + (delta ?? 1)));
      }
    };
    const handlePromptUpdated = (e: Event) => {
      const updatedPrompt = (e as CustomEvent).detail?.prompt;
      if (updatedPrompt && prompt && updatedPrompt.id === prompt.id) {
        if (typeof updatedPrompt.likesCount === 'number') setCurrentLikesCount(updatedPrompt.likesCount);
        if (typeof updatedPrompt.commentsCount === 'number') setCurrentCommentsCount(updatedPrompt.commentsCount);
        if (typeof updatedPrompt.forksCount === 'number') setCurrentForksCount(updatedPrompt.forksCount);
        if (typeof updatedPrompt.viewsCount === 'number') setCurrentViewsCount(updatedPrompt.viewsCount);
        if (updatedPrompt.rawContent && !isLocked) setAuthorizedContent(updatedPrompt.rawContent);
      }
    };

    window.addEventListener('ph_prompt_like_changed', handleLikeChange);
    window.addEventListener('ph_prompt_comment_changed', handleCommentChange);
    window.addEventListener('ph_prompt_fork_changed', handleForkChange);
    window.addEventListener('ph_prompt_view_changed', handleViewChange);
    window.addEventListener('ph_prompt_updated', handlePromptUpdated);
    return () => {
      window.removeEventListener('ph_prompt_like_changed', handleLikeChange);
      window.removeEventListener('ph_prompt_comment_changed', handleCommentChange);
      window.removeEventListener('ph_prompt_fork_changed', handleForkChange);
      window.removeEventListener('ph_prompt_view_changed', handleViewChange);
      window.removeEventListener('ph_prompt_updated', handlePromptUpdated);
    };
  }, [prompt?.id, isLocked]);

  React.useEffect(() => {
    if (prompt && user) {
      ratingService.getUserRating(prompt.id, user.id).then(setUserRating).catch(() => {});
    }
  }, [prompt, user]);

  React.useEffect(() => {
    let active = true;
    if (!isOpen || !prompt) {
      setAuthorizedContent(null);
      return;
    }

    if (isLocked) {
      setAuthorizedContent(null);
      return;
    }

    const isPlaceholderText = (txt?: string | null) =>
      !txt ||
      txt.trim().length === 0 ||
      txt.includes('This is the protected prompt content') ||
      txt.includes('Sign in to view instructions');

    if (!isPlaceholderText(prompt.rawContent)) {
      setAuthorizedContent(prompt.rawContent);
      return;
    }

    setLoadingContent(true);
    PromptRepository.getAuthorizedPromptContent(prompt.id)
      .then(res => {
        if (active && res?.content && !isPlaceholderText(res.content)) {
          setAuthorizedContent(res.content);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingContent(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, prompt?.id, user?.id, isLocked]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Preserve scroll position when modal is mounted / unmounted
  useEffect(() => {
    if (!isOpen) return;
    const scrollContainers = Array.from(document.querySelectorAll('#main-content, #main-content div, .overflow-y-auto')) as HTMLElement[];
    const activeScrollContainer = scrollContainers.find(el => el.scrollTop > 0) || (document.querySelector('#main-content .overflow-y-auto') as HTMLElement | null);
    const savedScrollTop = activeScrollContainer ? activeScrollContainer.scrollTop : (window.scrollY || 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      if (activeScrollContainer && savedScrollTop > 0) {
        requestAnimationFrame(() => {
          activeScrollContainer.scrollTop = savedScrollTop;
        });
      } else if (savedScrollTop > 0) {
        requestAnimationFrame(() => {
          window.scrollTo(0, savedScrollTop);
        });
      }
    };
  }, [isOpen]);

  if (!isOpen || !prompt) return null;
  if (typeof document === 'undefined') return null;

  const isContentValid = (txt?: string | null) =>
    Boolean(txt && txt.trim().length > 0 && !txt.includes('This is the protected prompt content') && !txt.includes('Sign in to view instructions'));

  const displayContent = (isContentValid(authorizedContent) ? authorizedContent : null)
    || (isContentValid(prompt.rawContent) ? prompt.rawContent : null)
    || prompt.rawContent
    || '';
  const { variables } = extractVariables(displayContent);

  const handleCopy = () => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to copy this prompt.', 'info');
      return;
    }
    const text = displayContent;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (prompt?.id) {
      trackPromptShared({
        promptId: prompt.id,
        shareMethod: 'clipboard',
      });
    }
  };

  const handleExport = (format: ExportFormat) => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to export prompts.', 'info');
      return;
    }
    if (!prompt) return;

    try {
      const res = exportPrompt(
        {
          title: prompt.title,
          slug: prompt.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: prompt.description || '',
          template: displayContent || prompt.rawContent || '',
          category: prompt.category,
          model: prompt.model,
          tags: prompt.tags || [],
          author: prompt.authorName || 'PromptHub Author',
          version: (prompt as any).version || ((prompt as any).versionCount ? `1.${(prompt as any).versionCount}.0` : '1.0.0'),
          license: (prompt as any).license || 'MIT',
          variables: variables.map((v) => ({
            name: v.name,
            defaultValue: v.defaultValue,
            description: v.description,
          })),
        },
        format
      );

      const blob = new Blob([res.content], { type: res.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExportOpen(false);
      showToast(`Exported ${prompt.title} as ${res.filename}`, 'success');
    } catch {
      showToast('Failed to export prompt.', 'error');
    }
  };

  return (
    <>
      {createPortal(
        <AnimatePresence>
          <div
        role="dialog"
        aria-modal="true"
        aria-label={`Prompt preview: ${prompt.title}`}
        data-prompt-preview-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl bg-bg-secondary border border-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col text-left text-text-primary max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-bg-secondary shrink-0 relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-brand-primary-light flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/20">
                <Terminal className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-text-primary font-display truncate">{prompt.title}</h3>
                <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <UserAvatar
                      src={prompt.authorAvatar}
                      name={prompt.authorName}
                      username={prompt.authorName}
                      isAdmin={prompt.authorId === 'admin' || prompt.authorName?.toLowerCase().includes('admin')}
                      size="xs"
                      shape="circle"
                      className="!w-4 !h-4 !text-[8px]"
                    />
                    <span>@{user && prompt.authorId === user.id ? `${(prompt.authorName && prompt.authorName !== 'Anonymous' ? prompt.authorName : user.name || user.username || 'You')} (You)` : (prompt.authorName && prompt.authorName !== 'Anonymous' ? prompt.authorName : 'community')}</span>
                  </div>
                  <span>·</span>
                  <span className="capitalize">{prompt.category || 'Development'}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-brand-primary">
                    <ModelProviderLogo modelId={prompt.model || 'OpenAI'} provider={prompt.model || 'OpenAI'} className="w-3 h-3 shrink-0" />
                    <span>{prompt.model || 'OpenAI'}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer border border-border-default"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
            {/* Visual Media Deck (Input / Output Images / Cover) */}
            <PromptImagePreview
              prompt={prompt}
              size="medium"
              interactive
              className="mb-4"
            />

            {/* Description */}
            {prompt.description && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Description</span>
                <p className="text-xs text-text-secondary leading-relaxed bg-bg-tertiary/40 p-3 rounded-xl border border-border-default break-words [overflow-wrap:anywhere] [word-break:break-word]">
                  {prompt.description}
                </p>
              </div>
            )}

            {/* Variables */}
            {variables.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                  <Variable className="w-3 h-3 text-brand-primary" />
                  <span>Configurable Parameters ({variables.length})</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {variables.map((v, idx) => (
                    <span
                      key={`${v.name}-${idx}`}
                      className="px-2.5 py-1 rounded-lg bg-brand-primary-light border border-brand-primary/20 text-brand-primary text-[11px] font-mono font-medium"
                    >
                      {`{{${v.name}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt Template Directives */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">
                    Prompt Instructions &amp; Template Body
                  </span>
                  {isPaid ? (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold border flex items-center gap-1 shrink-0 ${
                      isLocked 
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' 
                        : 'bg-brand-primary-light text-brand-primary border-brand-primary/20'
                    }`}>
                      {isLocked && <Lock className="w-2.5 h-2.5 text-emerald-600" />}
                      PAID (₹{prompt.priceInr || prompt.price})
                    </span>
                  ) : isAdminPremium ? (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold border flex items-center gap-1 shrink-0 ${
                      isLocked 
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' 
                        : 'bg-brand-primary-light text-brand-primary border-brand-primary/20'
                    }`}>
                      {isLocked && <Lock className="w-2.5 h-2.5 text-amber-600" />}
                      OFFICIAL PREMIUM
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] px-1.5 py-0.5 rounded font-semibold border border-brand-primary/20 shrink-0">
                      FREE
                    </span>
                  )}
                </div>

                {!isLocked && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="min-h-[44px] sm:min-h-[28px] inline-flex items-center gap-1 px-2 py-1 text-[11px] text-text-muted hover:text-text-primary transition-colors cursor-pointer font-mono"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              {isLocked ? (
                !user ? (
                  <div className="p-6 rounded-xl bg-bg-primary border border-brand-primary/20 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-brand-primary-light text-brand-primary flex items-center justify-center mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">Sign in to Access Premium Prompt</h4>
                      <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                        Sign in to preview full prompt instructions, inspect variables, export to Markdown, and fork directly into Studio.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setShowAuthModal(true);
                      }}
                      className="min-h-[44px] sm:min-h-[36px] inline-flex items-center justify-center px-4 py-2 bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      Sign In to Unlock
                    </button>
                  </div>
                ) : isPaid ? (
                  <div className="p-6 rounded-xl bg-bg-primary border border-emerald-500/20 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">Paid Marketplace Prompt (₹{prompt.priceInr || prompt.price})</h4>
                      <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                        Created by {prompt.authorName ? `@${prompt.authorName}` : 'community creator'}. 70% of the proceeds go directly to the creator. Buy a license to unlock full instructions, inspect parameters, and fork to your studio.
                      </p>
                    </div>
                    {onPurchase && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onPurchase(prompt);
                          }}
                          className="min-h-[44px] sm:min-h-[36px] inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          Buy License (₹{prompt.priceInr || prompt.price}) — 70% to Creator
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-bg-primary border border-amber-500/20 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">Official Premium Prompt (Admins)</h4>
                      <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                        Managed by PromptHub Admins. Available free to all active paid subscribers (Starter, Pro, Growth, Studio) or users with a ₹200+ credit top-up.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          setActiveTab('pricing');
                        }}
                        className="min-h-[44px] sm:min-h-[36px] inline-flex items-center justify-center px-4 py-2 bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        View Subscription Plans
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          setActiveTab('recharge');
                        }}
                        className="min-h-[44px] sm:min-h-[36px] inline-flex items-center justify-center px-4 py-2 bg-bg-tertiary border border-border-default hover:border-brand-primary text-text-primary text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        Top Up ₹200+
                      </button>
                    </div>
                  </div>
                )
              ) : loadingContent && !displayContent ? (
                <div className="p-8 rounded-xl bg-bg-primary border border-border-default flex items-center justify-center gap-2 text-text-muted text-xs font-mono">
                  <div className="w-4 h-4 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
                  <span>Loading authorized prompt template...</span>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-bg-primary border border-border-default font-mono text-xs text-text-primary leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto select-text">
                  {displayContent || 'No template content available.'}
                </div>
              )}
            </div>

            {/* Ratings & Report Bar */}
            <div className="p-3 rounded-xl bg-bg-tertiary/60 border border-border-default flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-text-muted">Rating:</span>
                <StarRating
                  promptId={prompt.id}
                  currentRating={prompt.averageRating || 0}
                  ratingCount={prompt.ratingCount || 0}
                  userRating={userRating}
                  canRate={canRateCheck.allowed && (!userRating || userRating === 0)}
                  lockReason={userRating && userRating > 0 ? 'You have already reviewed this prompt. You cannot review twice.' : canRateCheck.reason}
                  onRate={async (stars) => {
                    if (!user) {
                      setShowAuthModal(true);
                      showToast('Please sign in to rate prompts.', 'info');
                      return;
                    }
                    try {
                      const res = await ratingService.submitRating(prompt.id, user.id, stars);
                      setUserRating(stars);
                      if (res?.averageRating !== undefined) {
                        (prompt as any).averageRating = res.averageRating;
                        (prompt as any).ratingCount = res.ratingCount;
                      }
                      showToast(`Rated ${stars} stars!`, 'success');
                    } catch (err: any) {
                      showToast(err.message || 'Failed to submit rating.', 'error');
                    }
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    setShowAuthModal(true);
                    showToast('Please sign in to report this prompt.', 'info');
                    return;
                  }
                  setIsReportOpen(true);
                }}
                className="min-h-[44px] sm:min-h-[28px] inline-flex items-center gap-1 px-1 text-xs text-text-muted hover:text-brand-rose transition-colors cursor-pointer"
                title="Report this prompt"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Report</span>
              </button>
            </div>

            {/* Tags */}
            {prompt.tags && prompt.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {prompt.tags.map((t, idx) => (
                  <span
                    key={`${t}-${idx}`}
                    className="text-[10px] font-mono bg-bg-tertiary border border-border-default text-text-muted px-2 py-0.5 rounded-md"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3.5 sm:p-4 bg-bg-secondary border-t border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 relative z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2.5 text-xs text-text-muted font-mono flex-wrap">
              <span>{currentViewsCount} views</span>
              <span>·</span>
              <button
                type="button"
                onClick={async () => {
                  if (!prompt) return;
                  if (user && prompt.authorId === user.id) {
                    showToast('This is your prompt. Authors cannot like their own prompts.', 'info');
                    return;
                  }
                  try {
                    await toggleLikePrompt(prompt.id);
                  } catch {}
                }}
                className={`inline-flex items-center gap-1 transition-colors cursor-pointer min-h-[44px] sm:min-h-[28px] ${
                  likedPromptIds?.includes(prompt.id) ? 'text-rose-500 font-semibold' : 'text-text-muted hover:text-rose-500'
                }`}
                title={user ? "Like prompt" : "Sign in to like prompt"}
                aria-label="Like prompt"
              >
                <Heart className={`w-3.5 h-3.5 ${likedPromptIds?.includes(prompt.id) ? 'fill-current' : ''}`} />
                <span>{currentLikesCount}</span>
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setIsCommentsOpen(true)}
                className="inline-flex items-center gap-1 text-text-muted hover:text-brand-primary transition-colors cursor-pointer min-h-[44px] sm:min-h-[28px]"
                title="View discussion & comments"
                aria-label="Comments"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{currentCommentsCount} comments</span>
              </button>
              <span>·</span>
              <span>{currentForksCount} forks</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              {!isLocked && (
                <div className="relative" ref={exportRef}>
                  <button
                    type="button"
                    onClick={() => setIsExportOpen(!isExportOpen)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border-default text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors cursor-pointer bg-bg-tertiary min-h-[44px]"
                    title="Export prompt into Word, Markdown, Text, or JSON"
                    aria-expanded={isExportOpen}
                    aria-haspopup="true"
                  >
                    <Download className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Export</span>
                    <ChevronDown className={`w-3 h-3 text-text-muted transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isExportOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 bottom-full mb-2 w-64 bg-bg-secondary border border-border-default rounded-xl shadow-xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-md"
                      >
                        <div className="px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted border-b border-border-default">
                          Select Export Format
                        </div>

                        <button
                          type="button"
                          onClick={() => handleExport('word')}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-medium text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer group min-h-[44px]"
                        >
                          <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-text-primary group-hover:text-brand-primary">Word Document (.doc)</div>
                            <div className="text-[10px] text-text-muted">Formatted for WordCraft &amp; MS Word</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExport('markdown')}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-medium text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer group min-h-[44px]"
                        >
                          <div className="w-7 h-7 rounded-md bg-brand-primary-light text-brand-primary flex items-center justify-center shrink-0">
                            <FileCode className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-text-primary group-hover:text-brand-primary">Standard Markdown (.md)</div>
                            <div className="text-[10px] text-text-muted">Clean tables &amp; spec formatting</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExport('text')}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-medium text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer group min-h-[44px]"
                        >
                          <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <AlignLeft className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-text-primary group-hover:text-brand-primary">Plain Text (.txt)</div>
                            <div className="text-[10px] text-text-muted">Clean text with variables legend</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExport('json')}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-medium text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer group min-h-[44px]"
                        >
                          <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Code2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-text-primary group-hover:text-brand-primary">Open Prompt JSON (.json)</div>
                            <div className="text-[10px] text-text-muted">Interoperable JSON schema</div>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <button
                type="button"
                onClick={async () => {
                  const shareUrl = `${window.location.origin}/marketplace?prompt=${prompt.id}`;
                  if (user && sharePrompt) {
                    await sharePrompt(prompt);
                  } else {
                    if (navigator.clipboard) {
                      await navigator.clipboard.writeText(shareUrl);
                      showToast('🔗 Link copied to clipboard!', 'success');
                    }
                    if (prompt?.id) {
                      trackPromptShared({
                        promptId: prompt.id,
                        shareMethod: 'clipboard',
                      });
                    }
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border-default text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors cursor-pointer bg-bg-tertiary min-h-[44px]"
                title="Share prompt link"
              >
                <Share2 className="w-3.5 h-3.5 text-brand-primary" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer bg-bg-tertiary min-h-[44px]"
              >
                Close
              </button>

              {!user ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setShowAuthModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[44px]"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In to Fork &amp; Edit</span>
                </button>
              ) : isLocked ? (
                <div className="flex items-center gap-2">
                  {isPaid && onPurchase ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onPurchase(prompt);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[44px]"
                    >
                      <span>Buy License (₹{prompt.priceInr || prompt.price})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        setActiveTab('pricing');
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[44px]"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Upgrade Plan / Top Up ₹200+</span>
                    </button>
                  )}
                </div>
              ) : ownsPrompt ? (
                <button
                  type="button"
                  onClick={() => {
                    const targetId = userFork?.id || prompt.id;
                    const targetPrompt = userFork || prompt;
                    const promptText = targetPrompt.rawContent || (targetPrompt as any).content || '';
                    try {
                      sessionStorage.setItem('ph_active_prompt_id', targetId);
                      sessionStorage.setItem('ph_active_prompt_data', JSON.stringify(targetPrompt));
                      sessionStorage.setItem('ph_creation_workspace_prompt', promptText);
                      sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
                        title: targetPrompt.title,
                        prompt: promptText,
                        category: targetPrompt.category,
                      }));
                    } catch {}
                    setActivePromptId(targetId);
                    sendToWork?.({ title: targetPrompt.title, prompt: promptText });
                    setActiveTab('workspace');
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[44px]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open in Workspace</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    let forkedId: string | null = null;
                    let forkedPrompt: any = null;
                    try {
                      const forked = await onFork(prompt);
                      if (forked && typeof forked === 'object' && 'id' in forked && (forked as any).id) {
                        forkedId = (forked as any).id;
                        forkedPrompt = forked;
                        setActivePromptId(forkedId);
                      }
                    } catch {}
                    const targetPrompt = forkedPrompt || prompt;
                    const targetId = forkedId || prompt.id;
                    const promptText = targetPrompt.rawContent || (targetPrompt as any).content || '';
                    try {
                      sessionStorage.setItem('ph_active_prompt_id', targetId);
                      sessionStorage.setItem('ph_active_prompt_data', JSON.stringify(targetPrompt));
                      sessionStorage.setItem('ph_creation_workspace_prompt', promptText);
                      sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
                        title: targetPrompt.title,
                        prompt: promptText,
                        category: targetPrompt.category,
                      }));
                    } catch {}
                    sendToWork?.({ title: targetPrompt.title, prompt: promptText });
                    setActiveTab('workspace');
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[44px]"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Fork &amp; Open in Workspace</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )}

  <ReportPromptModal
    isOpen={isReportOpen}
    onClose={() => setIsReportOpen(false)}
    promptId={prompt.id}
    promptTitle={prompt.title}
    authorId={prompt.authorId}
    authorName={prompt.authorName}
  />

  <CommentsModal
    isOpen={isCommentsOpen}
    onClose={() => setIsCommentsOpen(false)}
    targetId={prompt.id}
    targetType="prompt"
    targetTitle={prompt.title}
    onCommentAdded={(newCount) => {
      setCurrentCommentsCount(newCount);
      if (prompt) {
        prompt.commentsCount = newCount;
      }
    }}
  />
</>
);
};
