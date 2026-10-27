import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  Trophy,
  Heart, 
  GitBranch, 
  Search, 
  X, 
  Copy,
  Play,
  MessageSquare,
  Share2,
  Flag,
  Lock,
  Crown,
  ShoppingCart,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Eye
} from 'lucide-react';
import type { Prompt, AssetType } from '../db/schema';
import { PromptRepository } from '../repositories/promptRepository';
import { modelCatalogService, type CatalogModel } from '../services/modelCatalogService';
import { PromptOfTheDaySection } from '../components/PromptOfTheDaySection';
import { normalizeError } from '../utils/errorMessages';
import { FollowButton } from '../components/FollowButton';
import { CreatorProfileModal } from '../components/CreatorProfileModal';
import { QuickTestModal } from '../components/community/QuickTestModal';
import { CURATED_ADMIN_PROMPTS } from '../data/curatedAdminPrompts';
import { socialService } from '../services/socialService';
import { CommentsModal } from '../components/CommentsModal';
import { LeaderboardView } from './LeaderboardView';
import { isPaidPrompt, isAdminPremiumPrompt, isPromptLockedForUser } from '../utils/isPaidUser';
import { StarRating } from '../components/StarRating';
import { ratingService } from '../services/ratingService';
import { ReportPromptModal } from '../components/ReportPromptModal';
import { UserAvatar } from '../components/UserAvatar';
import { PromptImagePreview } from '../components/common/PromptImagePreview';
import { ModelProviderLogo } from '../components/common/ModelProviderLogo';
import { CommunityLogo } from '../components/CommunityLogo';
import { PromptCommunityIcon } from '../components/icons/PromptHubIcons';

export const CommunityView: React.FC = () => {
  const {
    user,
    userPurchases,
    forkPrompt,
    showToast,
    copyPrompt,
    setShowAuthModal,
    setActiveTab,
    activePromptId,
    setActivePromptId,
    likedPromptIds,
    toggleLikePrompt,
    updatePromptCommentsCount,
    sharePrompt,
  } = useApp();
  const { sendToWork } = useWorkspace();

  const [searchVal, setSearchVal] = useState('');
  const [sortOption, setSortOption] = useState<'likes' | 'trending' | 'newest' | 'rating' | 'copies' | 'views'>('likes');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [modelFilter, setModelFilter] = useState<string>('All');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeAssetType, setActiveAssetType] = useState<AssetType | 'All'>('All');
  const [communityTab, setCommunityTab] = useState<'community' | 'leaderboard'>('community');

  // Dynamic OpenRouter Live Model Catalog state
  const [liveModels, setLiveModels] = useState<CatalogModel[]>(() => modelCatalogService.getCachedCatalog());

  useEffect(() => {
    modelCatalogService.fetchCatalog().then((models) => {
      if (models && models.length > 0) setLiveModels(models);
    }).catch(() => {});
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Track prompt details modal
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  // Track inspected creator profile modal
  const [inspectedCreatorId, setInspectedCreatorId] = useState<string | null>(null);
  // Track prompt for instant quick-test modal
  const [quickTestPrompt, setQuickTestPrompt] = useState<Prompt | null>(null);
  // Track prompt for comments modal
  const [commentTargetPrompt, setCommentTargetPrompt] = useState<Prompt | null>(null);
  // Safety report modal
  const [reportingPrompt, setReportingPrompt] = useState<Prompt | null>(null);
  // Dynamic user ratings cache
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  // Truncation toggle state
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  // Synchronize deep-linked prompt ID from activePromptId state (fetching on-demand)
  useEffect(() => {
    if (!activePromptId) {
      setSelectedPrompt(null);
      return;
    }

    let isCancelled = false;
    PromptRepository.getPromptById(activePromptId).then((fetched) => {
      if (!isCancelled && fetched) {
        setSelectedPrompt(fetched);
      }
    }).catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [activePromptId]);

  // Initial mount check: if URL contains prompt parameter and activePromptId is not yet initialized
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlPromptId = new URLSearchParams(window.location.search).get('prompt');
    if (urlPromptId && !activePromptId) {
      setActivePromptId(urlPromptId);
    }
  }, []);

  const handleShare = async (e: React.MouseEvent, prompt: Prompt) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to share prompts.', 'info');
      return;
    }
    if (sharePrompt) {
      await sharePrompt(prompt);
    } else {
      const res = await socialService.shareItem({
        targetId: prompt.id,
        targetType: 'prompt',
        title: prompt.title,
        text: prompt.description,
        userId: user.id,
      });
      showToast(res.method === 'native' ? 'Shared successfully!' : '🔗 Link copied to clipboard!', 'success');
    }
  };

  // Open prompt inspect modal (fetching full details on demand if needed)
  const handleOpenPrompt = async (p: Prompt) => {
    setSelectedPrompt(p);
    setActivePromptId(p.id);
    if (!p.rawContent || p.rawContent.trim().length === 0) {
      try {
        const full = await PromptRepository.getPromptById(p.id);
        if (full) setSelectedPrompt(full);
      } catch {}
    }
  };

  // Open quick test modal with immediate curated prompt resolution
  const handleOpenQuickTest = (targetPrompt: Prompt) => {
    const local = CURATED_ADMIN_PROMPTS.find(p => p.id === targetPrompt.id);
    if (local && local.rawContent) {
      setQuickTestPrompt({ ...targetPrompt, ...local });
      return;
    }
    setQuickTestPrompt(targetPrompt);
  };

  // Close modal
  const handleCloseModal = useCallback(() => {
    setSelectedPrompt(null);
    setActivePromptId(null);
    if (typeof window !== 'undefined' && window.location.search.includes('prompt=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('prompt');
      const cleanUrl = url.pathname + (url.search ? url.search : '') + url.hash;
      window.history.replaceState({ tab: 'community', promptId: null }, '', cleanUrl);
    }
  }, [setActivePromptId]);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseModal();
    };
    if (selectedPrompt) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedPrompt, handleCloseModal]);

  const handleLike = (e: React.MouseEvent, promptId: string) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to like prompts.', 'info');
      return;
    }
    const target = communityPrompts.find(p => p.id === promptId);
    if (target && target.authorId === user.id) {
      showToast('This is your prompt. Authors cannot like their own prompts.', 'info');
      return;
    }
    toggleLikePrompt(promptId).catch(() => {});
  };

  const handleFork = async (e: React.MouseEvent, promptId: string) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to fork prompts.', 'info');
      return;
    }
    try {
      const forked = await forkPrompt(promptId);
      if (forked && forked.id) {
        try {
          sessionStorage.setItem('ph_active_prompt_id', forked.id);
          sessionStorage.setItem('ph_active_prompt_data', JSON.stringify(forked));
          sessionStorage.setItem('ph_creation_workspace_prompt', forked.rawContent || '');
          sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
            title: forked.title,
            prompt: forked.rawContent || '',
            category: forked.category,
          }));
        } catch {}
        setActivePromptId(forked.id);
        sendToWork({ title: forked.title, prompt: forked.rawContent || '' });
        setActiveTab('workspace');
      }
      setSelectedPrompt(null);
    } catch (err: any) {
      const { userMessage } = normalizeError(err);
      showToast(userMessage, 'error');
    }
  };

  const handleCopy = (e: React.MouseEvent, prompt: Prompt) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to copy prompts.', 'info');
      return;
    }
    navigator.clipboard.writeText(prompt.rawContent);
    copyPrompt(prompt.id);
    showToast('Prompt copied to clipboard!', 'success');
  };

  // Global '/' keyboard shortcut to focus search input
  useEffect(() => {
    const handleSlashKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleSlashKey);
    return () => window.removeEventListener('keydown', handleSlashKey);
  }, []);

  // Server-Side Paginated Community Feed State
  const [communityPrompts, setCommunityPrompts] = useState<Prompt[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [offset, setOffset] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const queryReqIdRef = useRef<number>(0);
  const debounceRef = useRef<any>(null);

  // Synchronize real-time like updates across all prompts in the community feed
  useEffect(() => {
    const handleLikeChange = (e: Event) => {
      const { promptId, likesCount, delta } = (e as CustomEvent).detail || {};
      if (!promptId) return;

      setCommunityPrompts(prev => prev.map(p => {
        if (p.id === promptId) {
          const updated = typeof likesCount === 'number'
            ? likesCount
            : Math.max(0, (p.likesCount || 0) + (delta ?? 0));
          return { ...p, likesCount: updated };
        }
        return p;
      }));

      setSelectedPrompt(prev => {
        if (prev && prev.id === promptId) {
          const updated = typeof likesCount === 'number'
            ? likesCount
            : Math.max(0, (prev.likesCount || 0) + (delta ?? 0));
          return { ...prev, likesCount: updated };
        }
        return prev;
      });
    };

    const handleCommentChange = (e: Event) => {
      const { promptId, commentsCount, delta } = (e as CustomEvent).detail || {};
      if (!promptId) return;

      setCommunityPrompts(prev => prev.map(p => {
        if (p.id === promptId) {
          const updated = typeof commentsCount === 'number'
            ? commentsCount
            : Math.max(0, (p.commentsCount || 0) + (delta ?? 1));
          return { ...p, commentsCount: updated };
        }
        return p;
      }));

      setSelectedPrompt(prev => {
        if (prev && prev.id === promptId) {
          const updated = typeof commentsCount === 'number'
            ? commentsCount
            : Math.max(0, (prev.commentsCount || 0) + (delta ?? 1));
          return { ...prev, commentsCount: updated };
        }
        return prev;
      });
    };

    const handleForkChange = (e: Event) => {
      const { promptId, forksCount, delta } = (e as CustomEvent).detail || {};
      if (!promptId) return;

      setCommunityPrompts(prev => prev.map(p => {
        if (p.id === promptId) {
          const updated = typeof forksCount === 'number'
            ? forksCount
            : Math.max(0, (p.forksCount || 0) + (delta ?? 1));
          return { ...p, forksCount: updated };
        }
        return p;
      }));

      setSelectedPrompt(prev => {
        if (prev && prev.id === promptId) {
          const updated = typeof forksCount === 'number'
            ? forksCount
            : Math.max(0, (prev.forksCount || 0) + (delta ?? 1));
          return { ...prev, forksCount: updated };
        }
        return prev;
      });
    };

    const handleViewChange = (e: Event) => {
      const { promptId, viewsCount, delta } = (e as CustomEvent).detail || {};
      if (!promptId) return;

      setCommunityPrompts(prev => prev.map(p => {
        if (p.id === promptId) {
          const updated = typeof viewsCount === 'number'
            ? viewsCount
            : Math.max(0, (p.viewsCount || 0) + (delta ?? 1));
          return { ...p, viewsCount: updated };
        }
        return p;
      }));

      setSelectedPrompt(prev => {
        if (prev && prev.id === promptId) {
          const updated = typeof viewsCount === 'number'
            ? viewsCount
            : Math.max(0, (prev.viewsCount || 0) + (delta ?? 1));
          return { ...prev, viewsCount: updated };
        }
        return prev;
      });
    };

    const handlePromptCreated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const newPrompt = detail?.prompt;
      if (!newPrompt || newPrompt.visibility !== 'public') return;
      setCommunityPrompts(prev => prev.some(p => p.id === newPrompt.id) ? prev : [newPrompt, ...prev]);
    };

    const handlePromptUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const updatedPrompt = detail?.prompt;
      if (!updatedPrompt) return;
      setCommunityPrompts(prev => prev.map(p => (p.id === updatedPrompt.id ? { ...p, ...updatedPrompt } : p)));
      setSelectedPrompt(prev => (prev && prev.id === updatedPrompt.id ? { ...prev, ...updatedPrompt } : prev));
    };

    const handlePromptDeleted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const promptId = detail?.promptId;
      if (!promptId) return;
      setCommunityPrompts(prev => prev.filter(p => p.id !== promptId));
      setSelectedPrompt(prev => (prev && prev.id === promptId ? null : prev));
    };

    window.addEventListener('ph_prompt_like_changed', handleLikeChange);
    window.addEventListener('ph_prompt_comment_changed', handleCommentChange);
    window.addEventListener('ph_prompt_fork_changed', handleForkChange);
    window.addEventListener('ph_prompt_view_changed', handleViewChange);
    window.addEventListener('ph_prompt_created', handlePromptCreated);
    window.addEventListener('ph_prompt_updated', handlePromptUpdated);
    window.addEventListener('ph_prompt_deleted', handlePromptDeleted);
    return () => {
      window.removeEventListener('ph_prompt_like_changed', handleLikeChange);
      window.removeEventListener('ph_prompt_comment_changed', handleCommentChange);
      window.removeEventListener('ph_prompt_fork_changed', handleForkChange);
      window.removeEventListener('ph_prompt_view_changed', handleViewChange);
      window.removeEventListener('ph_prompt_created', handlePromptCreated);
      window.removeEventListener('ph_prompt_updated', handlePromptUpdated);
      window.removeEventListener('ph_prompt_deleted', handlePromptDeleted);
    };
  }, []);

  const fetchCommunityPrompts = useCallback(async (
    category: string,
    queryText: string,
    sort: 'likes' | 'trending' | 'newest' | 'rating' | 'copies' | 'views',
    offsetToFetch: number,
    isAppend: boolean
  ) => {
    // Strict bounding: exactly 10 prompts initially, user loads 10 by 10 on demand
    const pageLimit = 10;
    const reqId = ++queryReqIdRef.current;

    if (isAppend) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await PromptRepository.getMarketplacePrompts({
        category: category !== 'All' ? category : undefined,
        searchQuery: queryText.trim() || undefined,
        sortBy: sort,
        limit: pageLimit,
        offset: offsetToFetch,
      });

      if (reqId !== queryReqIdRef.current) return;

      if (isAppend) {
        setCommunityPrompts(prev => {
          const ids = new Set(prev.map(p => p.id));
          return [...prev, ...result.items.filter(p => !ids.has(p.id))];
        });
        setOffset(prev => prev + result.items.length);
      } else {
        setCommunityPrompts(result.items);
        setOffset(result.items.length);
      }
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('[CommunityView] Failed to fetch prompts:', err);
    } finally {
      if (reqId === queryReqIdRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = searchVal.trim() ? 300 : 0;
    debounceRef.current = setTimeout(() => {
      fetchCommunityPrompts(activeCategory, searchVal, sortOption, 0, false);
    }, delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeCategory, searchVal, sortOption, fetchCommunityPrompts]);

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    fetchCommunityPrompts(activeCategory, searchVal, sortOption, offset, true);
  };

  // Client-side deterministic sorting assurance
  const sortedCommunityPrompts = useMemo(() => {
    const list = [...communityPrompts];
    if (sortOption === 'likes') {
      return list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0) || (b.viewsCount || 0) - (a.viewsCount || 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (sortOption === 'trending') {
      return list.sort((a, b) => ((b.likesCount || 0) * 10 + (b.viewsCount || 0)) - ((a.likesCount || 0) * 10 + (a.viewsCount || 0)) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (sortOption === 'views') {
      return list.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0) || (b.likesCount || 0) - (a.likesCount || 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (sortOption === 'copies') {
      return list.sort((a, b) => (b.copiesCount || b.forksCount || 0) - (a.copiesCount || a.forksCount || 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (sortOption === 'rating') {
      return list.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0) || (b.ratingCount || 0) - (a.ratingCount || 0));
    }
    if (sortOption === 'newest') {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [communityPrompts, sortOption]);

  const categories = ['All', 'Development', 'Marketing', 'Writing', 'Design', 'Business'];

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-bg-primary text-text-primary select-text space-y-6">

      {communityTab === 'leaderboard' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-border-default">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" aria-hidden="true" />
                <span>Community Leaderboard</span>
              </h1>
              <p className="text-text-secondary text-xs mt-0.5">
                Recognizing top-performing prompt architectures, deterministic evaluation benchmarks, and leading AI prompt engineers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCommunityTab('community')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-semibold shadow-xs transition-colors cursor-pointer group shrink-0"
            >
              <PromptCommunityIcon size={16} variant="solid" className="text-brand-primary group-hover:scale-110 transition-transform" />
              <span>Community Feed</span>
            </button>
          </div>
          <LeaderboardView />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-default">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-text-primary tracking-tight flex items-center gap-3.5">
                <CommunityLogo size={32} showTile={true} className="shrink-0" />
                <span>Community Feed</span>
              </h1>
              <p className="text-text-secondary text-xs mt-0.5">
                Discover, fork, and interact with production-grade AI prompt templates from the global developer community.
              </p>
            </div>

            {/* Leaderboard Button on header matching uploaded reference */}
            <button
              type="button"
              onClick={() => setCommunityTab('leaderboard')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-semibold shadow-xs transition-colors cursor-pointer group shrink-0 self-start md:self-auto"
            >
              <Trophy className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <span>Leaderboard</span>
            </button>
          </div>

          {/* Prompt of the Day Spotlight */}
          <PromptOfTheDaySection />

          {/* Search + Filters Container */}
          <div className="bg-bg-secondary border border-border-default p-4 sm:p-5 rounded-xl shadow-xs space-y-3.5 text-left">
            <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap gap-3 items-center justify-between">
              {/* Input search */}
              <div className="relative w-full md:w-96">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input 
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search prompts (press '/' to focus)..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  aria-label="Search community assets"
                  className="w-full bg-bg-tertiary border border-border-default rounded-md pl-8 pr-3 py-1.5 text-xs text-text-primary focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Sort:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="bg-bg-tertiary border border-border-default rounded-md px-2.5 py-1 text-xs text-text-primary focus:outline-none font-mono cursor-pointer"
                >
                  <option value="likes">Most Liked</option>
                  <option value="trending">Trending (Popular)</option>
                  <option value="newest">Newest</option>
                  <option value="rating">Highest Rated</option>
                  <option value="views">Most Viewed</option>
                  <option value="copies">Most Copied</option>
                </select>
              </div>
            </div>

            {/* Categories row */}
            <div className="flex items-center gap-2 border-t border-border-default pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono shrink-0">Category:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1" role="group" aria-label="Filter by category">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    aria-pressed={activeCategory === cat}
                    className={`px-3 py-1.5 rounded-md text-xs sm:text-[11px] font-medium border transition-colors cursor-pointer whitespace-nowrap min-h-[38px] sm:min-h-[30px] shrink-0 ${
                      activeCategory === cat
                        ? 'bg-brand-primary-light border-brand-primary text-brand-primary font-semibold'
                        : 'border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-tertiary bg-bg-secondary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Filters: Difficulty & Model & Asset Types */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border-default pt-3">
              {/* Difficulty */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono shrink-0">Level:</span>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none cursor-pointer font-mono"
                >
                  <option value="All">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              {/* Model Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono shrink-0">Model:</span>
                <select
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none font-mono cursor-pointer"
                >
                  <option value="All">All Models ({liveModels.length})</option>
                  {Array.from(new Set(liveModels.map((m) => m.provider))).map((provider) => {
                    const seenModelIds = new Set<string>();
                    const providerModels = liveModels.filter((m) => {
                      if (m.provider !== provider) return false;
                      if (seenModelIds.has(m.id)) return false;
                      seenModelIds.add(m.id);
                      return true;
                    });
                    return (
                      <optgroup key={provider} label={provider}>
                        {providerModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.isFree ? '(Free)' : ''}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              {/* Asset Type filter */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono shrink-0">Type:</span>
                <select
                  value={activeAssetType}
                  onChange={(e) => setActiveAssetType(e.target.value as any)}
                  className="w-full bg-bg-tertiary border border-border-default rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none cursor-pointer font-mono"
                >
                  <option value="All">All Asset Types</option>
                  <option value="prompt">Prompt Instruction</option>
                  <option value="workflow">AI Workflow</option>
                  <option value="mcp">MCP Server</option>
                  <option value="agent">Autonomous Agent</option>
                  <option value="rag">RAG Pipeline</option>
                </select>
              </div>
            </div>
          </div>

          {/* Feed Grid */}
          {isLoading ? (
            <div className="text-center py-20 border border-border-default rounded-xl bg-bg-secondary space-y-3">
              <Loader2 className="w-7 h-7 text-brand-primary animate-spin mx-auto" />
              <p className="text-xs text-text-secondary">Loading community prompt templates...</p>
            </div>
          ) : communityPrompts.length === 0 ? (
            <div className="text-center py-16 border border-border-default border-dashed rounded-xl bg-bg-secondary space-y-3">
              <CommunityLogo size={44} showTile={true} className="mx-auto" />
              {totalCount === 0 && !searchVal ? (
                <>
                  <h4 className="text-base font-bold text-text-primary">No community prompts yet.</h4>
                  <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                    The community is ready for its first prompt. Be the first to publish a prompt architecture, agent instruction, or workflow.
                  </p>
                </>
              ) : (
                <>
                  <Search className="w-8 h-8 text-text-muted mx-auto" />
                  <h3 className="text-sm font-semibold text-text-primary">No matching community prompts</h3>
                  <p className="text-xs text-text-secondary max-w-sm mx-auto">
                    Try refining your search keyword, category, or model filters to discover more assets.
                  </p>
                  <button
                    onClick={() => {
                      setSearchVal('');
                      setActiveCategory('All');
                      setDifficultyFilter('All');
                      setModelFilter('All');
                      setActiveAssetType('All');
                    }}
                    className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary-hi text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 text-left items-stretch">
                {sortedCommunityPrompts.map((prompt, idx) => {
                const isLiked = likedPromptIds.includes(prompt.id);
                const isPaid = isPaidPrompt(prompt);
                const isAdminPremium = isAdminPremiumPrompt(prompt);
                const isLocked = isPromptLockedForUser(prompt, user, userPurchases);
                const canRateCheck = ratingService.canUserRate(prompt, user, [], userRatings[prompt.id]);
                return (
                  <div
                    key={`community-${prompt.id}-${idx}`}
                    onClick={() => handleOpenPrompt(prompt)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenPrompt(prompt);
                      }
                    }}
                    tabIndex={0}
                    className="bg-bg-secondary border border-border-default rounded-xl p-4 flex flex-col justify-between cursor-pointer hover:border-border-hover hover:shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary h-full"
                    role="button"
                    aria-label={`AI prompt: ${prompt.title}`}
                  >
                    <div className="space-y-2">
                      {/* Visual Media Deck (Input / Output Images / Cover) */}
                      <PromptImagePreview
                        prompt={prompt}
                        size="compact"
                        aspectRatio="video"
                        showPlaceholderWhenEmpty={true}
                        className="mb-2"
                      />

                      <div className="flex items-center gap-2 h-6 min-w-0 overflow-hidden">
                        <span className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary border border-border-default">
                          {prompt.assetType || 'PROMPT'}
                        </span>
                        {isPaid ? (
                          <span className={`text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                            isLocked 
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' 
                              : 'bg-brand-primary-light text-brand-primary border-brand-primary/20'
                          }`}>
                            {isLocked ? <Lock className="w-2.5 h-2.5 text-amber-600" /> : <CheckCircle className="w-2.5 h-2.5 text-brand-primary" />}
                            PAID (₹{(prompt.priceInr || prompt.price || 0).toFixed(0)})
                          </span>
                        ) : isAdminPremium ? (
                          <span className={`text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                            isLocked 
                              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' 
                              : 'bg-brand-primary-light text-brand-primary border-brand-primary/20'
                          }`}>
                            {isLocked ? <Crown className="w-2.5 h-2.5 text-purple-600" /> : <CheckCircle className="w-2.5 h-2.5 text-brand-primary" />}
                            PREMIUM
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border border-brand-primary/20">
                            FREE
                          </span>
                        )}
                        {prompt.model && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-text-muted font-mono bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-default">
                            <ModelProviderLogo modelId={prompt.model} provider={prompt.model} className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[120px]">{prompt.model}</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-text-primary line-clamp-2 leading-snug group-hover:text-brand-primary transition-colors h-9 flex items-start">
                          {prompt.title}
                        </h4>
                        <div className="mt-0.5 min-w-0 w-full h-11 overflow-hidden">
                          <p className="text-[11px] text-text-secondary leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word]">
                            {prompt.description && prompt.description.length > 300 && !expandedDescriptions[prompt.id]
                              ? `${prompt.description.slice(0, 300)}...`
                              : prompt.description || 'Production prompt template.'}
                          </p>
                          {prompt.description && prompt.description.length > 300 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedDescriptions(prev => ({ ...prev, [prompt.id]: !prev[prompt.id] }));
                              }}
                              className="text-[10px] font-medium text-brand-primary hover:underline mt-0.5 inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>{expandedDescriptions[prompt.id] ? 'Show less' : 'Show more'}</span>
                              {expandedDescriptions[prompt.id] ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Ratings & Report on Card */}
                      <div className="pt-1.5 flex items-center justify-between border-t border-border-subtle" onClick={(e) => e.stopPropagation()}>
                        <StarRating
                          promptId={prompt.id}
                          currentRating={prompt.averageRating || 0}
                          ratingCount={prompt.ratingCount || 0}
                          userRating={userRatings[prompt.id] || ratingService.getLocalRating(prompt.id)}
                          canRate={canRateCheck.allowed && !userRatings[prompt.id]}
                          lockReason={userRatings[prompt.id] ? 'You have already reviewed this prompt. You cannot review twice.' : canRateCheck.reason}
                          onRate={async (stars) => {
                            if (!user) {
                              setShowAuthModal(true);
                              showToast('Please sign in to rate prompts.', 'info');
                              return;
                            }
                            try {
                              const res = await ratingService.submitRating(prompt.id, user.id, stars);
                              setUserRatings(prev => ({ ...prev, [prompt.id]: stars }));
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

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              setShowAuthModal(true);
                              showToast('Please sign in to report this prompt.', 'info');
                              return;
                            }
                            setReportingPrompt(prompt);
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-text-muted hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                          title="Report this prompt for safety / violations"
                          aria-label={`Report prompt ${prompt.title}`}
                        >
                          <Flag className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Report</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {prompt.tags.slice(0, 3).map((tag, tagIdx) => (
                          <span key={`${prompt.id}-tag-${tagIdx}-${tag}`} className="text-[9px] font-mono text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-default">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border-default pt-2.5 text-[11px] text-text-muted font-mono mt-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetId = prompt.authorId || prompt.authorName;
                          if (targetId) setInspectedCreatorId(targetId);
                        }}
                        className="text-text-muted hover:text-brand-primary transition-colors cursor-pointer hover:underline text-left truncate max-w-[150px] min-h-[30px] flex items-center gap-1.5"
                        title={`View @${prompt.authorName || 'creator'}'s profile`}
                      >
                        <UserAvatar
                          src={prompt.authorAvatar}
                          name={prompt.authorName}
                          username={prompt.authorName}
                          isAdmin={prompt.authorId === 'admin' || prompt.authorName?.toLowerCase().includes('admin')}
                          size="xs"
                          shape="circle"
                          className="!w-4 !h-4 !text-[8px] shrink-0"
                        />
                        <span className="truncate">@{user && prompt.authorId === user.id ? `${(prompt.authorName && prompt.authorName !== 'Anonymous' ? prompt.authorName : user.name || user.username || 'You')} (You)` : (prompt.authorName && prompt.authorName !== 'Anonymous' ? prompt.authorName : 'creator')}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPrompt(prompt);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg-tertiary hover:bg-border-subtle text-text-secondary hover:text-text-primary border border-border-default text-xs font-semibold transition-colors cursor-pointer min-h-[44px] sm:min-h-[30px]"
                          title="Preview full prompt structure & details"
                        >
                          <Eye className="w-3 h-3 text-text-muted" />
                          <span>Preview</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenQuickTest(prompt);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary dark:text-[#41A2D9] border border-brand-primary/20 text-xs font-semibold transition-colors cursor-pointer min-h-[44px] sm:min-h-[30px]"
                          title="Quick test this prompt"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Test</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleLike(e, prompt.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-bg-tertiary transition-colors cursor-pointer min-h-[44px] sm:min-h-[30px] ${
                            isLiked ? 'text-rose-600' : 'text-text-muted hover:text-text-primary'
                          }`}
                          aria-label="Like prompt"
                          title={!user ? "Sign in to like prompt" : prompt.authorId === user.id ? "This is your prompt. Authors cannot like their own prompts." : isLiked ? "Unlike prompt" : "Like prompt"}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                          <span>{prompt.likesCount || 0}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCommentTargetPrompt(prompt);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[44px] sm:min-h-[30px]"
                          title="View comments & discussion"
                          aria-label="Comments"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{prompt.commentsCount || 0}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleShare(e, prompt)}
                          className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[30px] sm:min-w-[30px] flex items-center justify-center"
                          title={user ? "Share prompt link" : "Sign in to share prompt"}
                          aria-label="Share prompt"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleFork(e, prompt.id)}
                          className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[30px] sm:min-w-[30px] flex items-center justify-center"
                          title={user ? "Fork into your workspace" : "Sign in to fork prompt"}
                          aria-label="Fork prompt"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explicit Load More Button (Never auto-prefetch) */}
            {hasMore && (
              <div className="flex flex-col items-center justify-center pt-4 pb-2 gap-2">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary text-text-primary text-xs font-semibold cursor-pointer shadow-xs transition-all min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                      <span>Loading {searchVal.trim() ? '10' : '20'} more...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform" />
                      <span>Load More Prompts ({communityPrompts.length} of {totalCount})</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] text-text-muted font-mono">
                  Showing {communityPrompts.length} of {totalCount} community templates
                </span>
              </div>
            )}

            {!hasMore && communityPrompts.length > 0 && (
              <div className="text-center pt-4 pb-2">
                <span className="text-xs text-text-muted font-mono">
                  ✓ Showing all {communityPrompts.length} {searchVal.trim() ? 'matching' : 'community'} prompts
                </span>
              </div>
            )}
          </div>
        )}

          {/* Prompt Detail Modal */}
          {typeof document !== 'undefined' && selectedPrompt && createPortal(
            <AnimatePresence>
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center z-[700] p-0 sm:p-4"
                onClick={handleCloseModal}
                role="dialog"
                aria-modal="true"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-bg-secondary border border-border-default rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative custom-scrollbar text-left"
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-4 border-b border-border-default">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary border border-border-default">
                          {selectedPrompt.assetType}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetId = selectedPrompt.authorId || selectedPrompt.authorName;
                            if (targetId) setInspectedCreatorId(targetId);
                          }}
                          className="text-[11px] text-text-muted hover:text-brand-primary font-mono cursor-pointer hover:underline flex items-center gap-1.5"
                        >
                          <UserAvatar
                            src={selectedPrompt.authorAvatar}
                            name={selectedPrompt.authorName}
                            username={selectedPrompt.authorName}
                            isAdmin={selectedPrompt.authorId === 'admin' || selectedPrompt.authorName?.toLowerCase().includes('admin')}
                            size="xs"
                            shape="circle"
                            className="!w-4 !h-4 !text-[8px] shrink-0"
                          />
                          <span>By @{user && selectedPrompt.authorId === user.id ? `${(selectedPrompt.authorName && selectedPrompt.authorName !== 'Anonymous' ? selectedPrompt.authorName : user.name || user.username || 'You')} (You)` : (selectedPrompt.authorName && selectedPrompt.authorName !== 'Anonymous' ? selectedPrompt.authorName : 'creator')}</span>
                        </button>
                        {selectedPrompt.authorId && (
                          <FollowButton
                            targetUserId={selectedPrompt.authorId}
                            targetUserName={selectedPrompt.authorName}
                            size="xs"
                          />
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-text-primary">{selectedPrompt.title}</h3>
                    </div>
                    <button 
                      onClick={handleCloseModal}
                      className="p-1.5 rounded-md hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                    {/* Visual Media Deck (Input / Output Images / Cover) */}
                    <PromptImagePreview
                      prompt={selectedPrompt}
                      size="medium"
                      interactive
                      className="mb-2"
                    />

                    <p className="text-xs text-text-secondary leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word]">{selectedPrompt.description}</p>

                    {/* Prompt Instructions with Auth & Entitlement Lock */}
                    {(() => {
                      const isSelectedPaid = isPaidPrompt(selectedPrompt);
                      const isSelectedAdminPremium = isAdminPremiumPrompt(selectedPrompt);
                      const isSelectedLocked = isPromptLockedForUser(selectedPrompt, user, userPurchases);

                      return (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Prompt Instructions</span>
                            {isSelectedPaid ? (
                              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold border flex items-center gap-1 ${
                                isSelectedLocked
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' 
                                  : 'bg-brand-primary-light text-brand-primary border-brand-primary/20'
                              }`}>
                                {isSelectedLocked ? <Lock className="w-2.5 h-2.5 text-amber-600" /> : <CheckCircle className="w-2.5 h-2.5 text-brand-primary" />}
                                PAID (₹{(selectedPrompt.priceInr || selectedPrompt.price || 0).toFixed(0)})
                              </span>
                            ) : isSelectedAdminPremium ? (
                              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold border flex items-center gap-1 ${
                                isSelectedLocked
                                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' 
                                  : 'bg-brand-primary-light text-brand-primary border-brand-primary/20'
                              }`}>
                                {isSelectedLocked ? <Crown className="w-2.5 h-2.5 text-purple-600" /> : <CheckCircle className="w-2.5 h-2.5 text-brand-primary" />}
                                OFFICIAL PREMIUM
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold border bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border-brand-primary/20">
                                FREE
                              </span>
                            )}
                          </div>

                          {!user ? (
                            <div className="p-6 rounded-xl bg-bg-primary border border-brand-primary/20 text-center space-y-3">
                              <div className="w-10 h-10 rounded-full bg-brand-primary-light text-brand-primary flex items-center justify-center mx-auto">
                                <Lock className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-text-primary">Sign in to Access Prompt Instructions</h4>
                                <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                                  Join the PromptHub community to view full prompt instructions, run live AI tests, comment, fork, and customize.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  handleCloseModal();
                                  setShowAuthModal(true);
                                }}
                                className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                              >
                                Sign In to View
                              </button>
                            </div>
                          ) : isSelectedLocked ? (
                            isSelectedPaid ? (
                              <div className="p-6 rounded-xl bg-bg-primary border border-amber-500/20 text-center space-y-3">
                                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                                  <Lock className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-text-primary">Paid Creator Prompt (₹{(selectedPrompt.priceInr || selectedPrompt.price || 0).toFixed(0)})</h4>
                                  <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                                    This prompt is listed on the marketplace. 70% goes directly to the creator. Buy a lifetime commercial license to unlock raw prompt instructions.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleCloseModal();
                                    setActiveTab('marketplace');
                                  }}
                                  className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  <span>Buy License in Marketplace (₹{(selectedPrompt.priceInr || selectedPrompt.price || 0).toFixed(0)})</span>
                                </button>
                              </div>
                            ) : (
                              <div className="p-6 rounded-xl bg-bg-primary border border-purple-500/20 text-center space-y-3">
                                <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto">
                                  <Crown className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-text-primary">Official Premium Prompt Locked</h4>
                                  <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                                    Official premium prompts are included for subscribers on any paid plan or users who have topped up ₹200+ in credits.
                                  </p>
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleCloseModal();
                                      setActiveTab('pricing');
                                    }}
                                    className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                                  >
                                    Upgrade Plan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleCloseModal();
                                      setActiveTab('recharge');
                                    }}
                                    className="px-4 py-2 border border-border-default hover:bg-bg-tertiary text-text-primary text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                  >
                                    Top Up ₹200+
                                  </button>
                                </div>
                              </div>
                            )
                          ) : (
                            <pre className="bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs font-mono text-text-primary whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto select-text">
                              {selectedPrompt.rawContent}
                            </pre>
                          )}
                        </div>
                      );
                    })()}

                    {/* Star Rating & Report inside Modal */}
                    <div className="p-2.5 rounded-xl bg-bg-tertiary/60 border border-border-default flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 h-6 min-w-0 overflow-hidden">
                        <span className="text-[10px] font-mono font-bold uppercase text-text-muted">Rating:</span>
                        <StarRating
                          promptId={selectedPrompt.id}
                          currentRating={selectedPrompt.averageRating || 0}
                          ratingCount={selectedPrompt.ratingCount || 0}
                          userRating={userRatings[selectedPrompt.id] || ratingService.getLocalRating(selectedPrompt.id)}
                          canRate={ratingService.canUserRate(selectedPrompt, user, [], userRatings[selectedPrompt.id]).allowed && !userRatings[selectedPrompt.id]}
                          lockReason={userRatings[selectedPrompt.id] ? 'You have already reviewed this prompt. You cannot review twice.' : ratingService.canUserRate(selectedPrompt, user).reason}
                          onRate={async (stars) => {
                            if (!user) {
                              setShowAuthModal(true);
                              showToast('Please sign in to rate prompts.', 'info');
                              return;
                            }
                            try {
                              const res = await ratingService.submitRating(selectedPrompt.id, user.id, stars);
                              setUserRatings(prev => ({ ...prev, [selectedPrompt.id]: stars }));
                              if (res?.averageRating !== undefined) {
                                (selectedPrompt as any).averageRating = res.averageRating;
                                (selectedPrompt as any).ratingCount = res.ratingCount;
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
                          setReportingPrompt(selectedPrompt);
                        }}
                        className="min-h-[44px] sm:min-h-[28px] inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-text-muted hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Report this prompt"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span>Report</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {selectedPrompt.tags.map((tag, tagIdx) => (
                        <span key={`${selectedPrompt.id}-tag-${tagIdx}-${tag}`} className="text-[9px] font-mono bg-bg-tertiary text-text-muted px-2 py-0.5 rounded border border-border-default">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-default">
                      <button
                        type="button"
                        onClick={(e) => handleLike(e, selectedPrompt.id)}
                        className={`px-3 py-2 rounded-lg border border-border-default hover:bg-bg-tertiary text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 min-h-[38px] ${
                          likedPromptIds.includes(selectedPrompt.id) ? 'text-rose-600 border-rose-500/30 bg-rose-500/10' : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${likedPromptIds.includes(selectedPrompt.id) ? 'fill-current text-rose-600' : ''}`} />
                        <span>{selectedPrompt.likesCount || 0}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCommentTargetPrompt(selectedPrompt);
                        }}
                        className="px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-border-subtle text-text-primary text-xs font-medium border border-border-default transition-colors cursor-pointer flex items-center gap-1.5 min-h-[38px]"
                        title="View comments & discussion"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Comments</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleShare(e, selectedPrompt)}
                        className="px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-border-subtle text-text-primary text-xs font-medium border border-border-default transition-colors cursor-pointer flex items-center gap-1.5 min-h-[38px]"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </button>

                      {!user ? (
                        <button
                          type="button"
                          onClick={() => {
                            handleCloseModal();
                            setShowAuthModal(true);
                          }}
                          className="flex-1 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px]"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Sign In to Fork &amp; Run</span>
                        </button>
                      ) : isPromptLockedForUser(selectedPrompt, user, userPurchases) ? (
                        isPaidPrompt(selectedPrompt) ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleCloseModal();
                              setActiveTab('marketplace');
                            }}
                            className="flex-1 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px]"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Buy License in Marketplace (₹{(selectedPrompt.priceInr || selectedPrompt.price || 0).toFixed(0)})</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              handleCloseModal();
                              setActiveTab('pricing');
                            }}
                            className="flex-1 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px]"
                          >
                            <Crown className="w-3.5 h-3.5" />
                            <span>Upgrade or Top-up ₹200+ to Unlock</span>
                          </button>
                        )
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleFork(e, selectedPrompt.id)}
                            className="flex-1 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px]"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                            <span>Fork to IDE</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(e, selectedPrompt)}
                            className="px-4 py-2 rounded-lg bg-bg-tertiary hover:bg-border-subtle text-text-primary text-xs font-medium border border-border-default transition-colors cursor-pointer flex items-center gap-1.5 min-h-[38px]"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </AnimatePresence>,
            document.body
          )}

          {/* Public Creator Profile Modal */}
          {inspectedCreatorId && (
            <CreatorProfileModal
              isOpen={Boolean(inspectedCreatorId)}
              onClose={() => setInspectedCreatorId(null)}
              creatorId={inspectedCreatorId}
            />
          )}

          {/* Instant Quick Test Modal */}
          {quickTestPrompt && (
            <QuickTestModal
              isOpen={Boolean(quickTestPrompt)}
              prompt={quickTestPrompt}
              onClose={() => setQuickTestPrompt(null)}
              onOpenInWorkspace={(p) => {
                setQuickTestPrompt(null);
                try {
                  sessionStorage.setItem('ph_active_prompt_id', p.id);
                  sessionStorage.setItem('ph_active_prompt_data', JSON.stringify(p));
                  sessionStorage.setItem('ph_creation_workspace_prompt', p.rawContent || '');
                  sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
                    title: p.title,
                    prompt: p.rawContent || '',
                    category: p.category,
                  }));
                } catch {}
                setActivePromptId(p.id);
                sendToWork({ title: p.title, prompt: p.rawContent || '' });
                setActiveTab('workspace');
              }}
            />
          )}

          {/* Universal Comments Modal for Community Prompts */}
          <CommentsModal
            isOpen={Boolean(commentTargetPrompt)}
            onClose={() => setCommentTargetPrompt(null)}
            targetId={commentTargetPrompt?.id || null}
            targetType="prompt"
            targetTitle={commentTargetPrompt?.title || 'Community Prompt'}
            onCommentAdded={(newCount) => {
              if (commentTargetPrompt) {
                updatePromptCommentsCount(commentTargetPrompt.id, newCount);
                setCommunityPrompts(prev => prev.map(p => p.id === commentTargetPrompt.id ? { ...p, commentsCount: newCount } : p));
                setCommentTargetPrompt(prev => prev ? { ...prev, commentsCount: newCount } : null);
                if (selectedPrompt && selectedPrompt.id === commentTargetPrompt.id) {
                  setSelectedPrompt(prev => prev ? { ...prev, commentsCount: newCount } : null);
                }
              }
            }}
          />

          {/* Safety & Moderation Report Modal */}
          <ReportPromptModal
            isOpen={Boolean(reportingPrompt)}
            onClose={() => setReportingPrompt(null)}
            promptId={reportingPrompt?.id || ''}
            promptTitle={reportingPrompt?.title}
            authorId={reportingPrompt?.authorId}
            authorName={reportingPrompt?.authorName}
          />
        </>
      )}

    </div>
  );
};

export default CommunityView;
