import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp,
  Search,
  ShoppingCart,
  CheckCircle,
  Loader2,
  ExternalLink,
  GitBranch,
  Heart,
  Landmark,
  Clock,
  Scale,
  Eye,
  Plus,
  ShieldCheck,
  Flag,
  Lock,
  Crown,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Calculator,
  HelpCircle,
  Zap,
  FileText,
  Layers,
  MessageSquare
} from 'lucide-react';
import { PromptMarketplaceIcon } from '../components/icons/PromptHubIcons';
import type { Prompt, MarketplacePurchase } from '../db/schema';
import { FinancialLedgerService, type SellerAnalyticsSummary } from '../services/payment/financialLedgerService';
import { TaxEngine } from '../services/tax/taxEngine';
import { BusinessCalendarService } from '../services/settlement/businessCalendarService';
import { SellerVerificationModal } from '../components/SellerVerificationModal';
import { PromptCameraMicControls } from '../components/common/PromptCameraMicControls';
import { PromptPreviewModal } from '../components/PromptPreviewModal';
import { CommentsModal } from '../components/CommentsModal';
import { PromptRepository } from '../repositories/promptRepository';
import { UserAvatar } from '../components/UserAvatar';
import { isPaidPrompt, isAdminPremiumPrompt, isPromptLockedForUser } from '../utils/isPaidUser';
import { StarRating } from '../components/StarRating';
import {
  getPreferredGateway,
  setPreferredGateway,
  type PaymentGateway,
} from '../services/payment/payuClient';
import { PaymentGatewaySelector } from '../components/payment/PaymentGatewaySelector';
import { ratingService } from '../services/ratingService';
import { ReportPromptModal } from '../components/ReportPromptModal';
import { PromptImagePreview } from '../components/common/PromptImagePreview';
import { ModelProviderLogo } from '../components/common/ModelProviderLogo';

import { normalizeError } from '../utils/errorMessages';
import { initiateMarketplaceCheckout } from '../services/payment/razorpayClient';
import { trackOrderCompleted as trackMixpanelOrderCompleted } from '../lib/mixpanelEvents';
import { useWorkspace } from '../context/WorkspaceContext';

export const MarketplaceView: React.FC = () => {
  const {
    prompts,
    user,
    userPurchases,
    registerCompletedPurchase,
    forkPrompt,
    activePromptId,
    setActivePromptId,
    setActiveTab: setAppTab,
    showToast,
    setShowAuthModal,
    likedPromptIds,
    toggleLikePrompt,
  } = useApp();
  const { sendToWork } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [listingType, setListingType] = useState<'all' | 'paid' | 'premium' | 'free'>('all');
  const [attachedImageSearch, setAttachedImageSearch] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'revenue'>('catalog');
  const [purchaseTargetPrompt, setPurchaseTargetPrompt] = useState<Prompt | null>(null);
  const [previewTargetPrompt, setPreviewTargetPrompt] = useState<Prompt | null>(null);
  const [commentsTarget, setCommentsTarget] = useState<Prompt | null>(null);
  const [reportingPrompt, setReportingPrompt] = useState<Prompt | null>(null);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>(() => getPreferredGateway());

  const handleSelectGateway = (gw: PaymentGateway) => {
    setSelectedGateway(gw);
    setPreferredGateway(gw);
  };
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  // Server-Side Paginated Marketplace State
  const [paginatedPrompts, setPaginatedPrompts] = useState<Prompt[]>([]);
  const [totalCatalogCount, setTotalCatalogCount] = useState<number>(0);
  const [hasMorePrompts, setHasMorePrompts] = useState<boolean>(false);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [listingCounts, setListingCounts] = useState<{ all: number; paid: number; premium: number; free: number }>({
    all: 0,
    paid: 0,
    premium: 0,
    free: 0,
  });
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({ All: 0 });
  const searchRequestIdRef = useRef<number>(0);
  const searchDebounceTimerRef = useRef<any>(null);

  // Synchronize deep-linked prompt ID from activePromptId state (fetching full detail on demand)
  useEffect(() => {
    if (!activePromptId) {
      setPreviewTargetPrompt(null);
      return;
    }

    let isCancelled = false;
    PromptRepository.getPromptById(activePromptId).then((fetched) => {
      if (!isCancelled && fetched) {
        setPreviewTargetPrompt(fetched);
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

  // Real Ledger Seller Analytics
  const [sellerAnalytics, setSellerAnalytics] = useState<SellerAnalyticsSummary>({
    totalSalesCount: 0,
    grossRevenue: 0,
    platformFees: 0,
    paymentProcessingFees: 0,
    taxWithholdings: 0,
    netEarnings: 0,
    pendingPayoutAmount: 0,
    eligiblePayoutAmount: 0,
    paidOutAmount: 0,
    currency: 'USD',
    earningsList: [],
    ordersList: [],
    payoutsList: [],
    refundsList: [],
    disputesList: [],
  });

  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [simPrice, setSimPrice] = useState<number>(149);
  const [simSales, setSimSales] = useState<number>(50);
  const [showPolicyDetails, setShowPolicyDetails] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('Just now');

  const categoriesList = ['All', 'Development', 'Design', 'Research', 'Support', 'Education', 'Business', 'Marketing'];

  const refreshSellerData = async () => {
    if (!user) return;
    setIsLoadingAnalytics(true);
    try {
      const analytics = await FinancialLedgerService.getSellerAnalytics(user.id);
      setSellerAnalytics(analytics);
      setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn('[MarketplaceView] Failed to load seller data:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshSellerData();
    }
  }, [user]);

  // ─── Fast Metadata Counts (HEAD queries — 0 bytes transferred) ───────────
  const refreshCounts = useCallback(async () => {
    try {
      const [counts, catCounts] = await Promise.all([
        PromptRepository.getMarketplaceCounts(),
        PromptRepository.getMarketplaceCategoryCounts(),
      ]);
      setListingCounts(counts);
      setCategoryCounts(prev => ({ ...prev, ...catCounts, All: counts.all }));
    } catch (err) {
      console.warn('[MarketplaceView] Failed to refresh marketplace counts:', err);
    }
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  // ─── Server-Side Paginated Marketplace Query Engine ──────────────────────
  const executeQuery = useCallback(async (
    category: string,
    type: 'all' | 'paid' | 'premium' | 'free',
    queryText: string,
    photoFilter: string | null,
    offsetToFetch: number,
    isAppend: boolean
  ) => {
    const isSearchMode = Boolean(queryText.trim().length > 0 || photoFilter);
    // Strict bounding: exactly 10 prompts initially, user loads 10 by 10 on demand
    const pageLimit = 10;
    const currentRequestId = ++searchRequestIdRef.current;

    if (isAppend) {
      setIsLoadingMore(true);
    } else {
      if (isSearchMode) setIsSearching(true);
      setIsInitialLoading(true);
    }

    try {
      const result = await PromptRepository.getMarketplacePrompts({
        category: category !== 'All' ? category : undefined,
        listingType: type,
        searchQuery: queryText.trim() || (photoFilter ? 'vision' : undefined),
        limit: pageLimit,
        offset: offsetToFetch,
      });

      // Stale response guard (cancellation / race condition defense)
      if (currentRequestId !== searchRequestIdRef.current) {
        return;
      }

      if (isAppend) {
        setPaginatedPrompts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = result.items.filter(p => !existingIds.has(p.id));
          return [...prev, ...newItems];
        });
        setCurrentOffset(prev => prev + result.items.length);
      } else {
        setPaginatedPrompts(result.items);
        setCurrentOffset(result.items.length);
      }

      setTotalCatalogCount(result.totalCount);
      setHasMorePrompts(result.hasMore);
    } catch (err) {
      console.error('[MarketplaceView] Failed to fetch marketplace prompts:', err);
      if (currentRequestId === searchRequestIdRef.current && !isAppend) {
        setPaginatedPrompts([]);
        setHasMorePrompts(false);
      }
    } finally {
      if (currentRequestId === searchRequestIdRef.current) {
        setIsInitialLoading(false);
        setIsLoadingMore(false);
        setIsSearching(false);
      }
    }
  }, []);

  // ─── Debounced Search & Filter Triggers (300ms debounce for text) ────────
  useEffect(() => {
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }

    const isImmediate = !searchQuery.trim();
    const delay = isImmediate ? 0 : 300;

    searchDebounceTimerRef.current = setTimeout(() => {
      executeQuery(selectedCategory, listingType, searchQuery, attachedImageSearch, 0, false);
    }, delay);

    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
  }, [selectedCategory, listingType, searchQuery, attachedImageSearch, executeQuery]);

  // ─── Explicit User Action: Load Next Page (Never auto-prefetch) ──────────
  const handleLoadMore = () => {
    if (isLoadingMore || !hasMorePrompts) return;
    executeQuery(selectedCategory, listingType, searchQuery, attachedImageSearch, currentOffset, true);
  };

  // ─── On-Demand Prompt Detail Fetching ────────────────────────────────────
  const handlePreviewPrompt = async (prompt: Prompt) => {
    setActivePromptId(prompt.id);
    setPreviewTargetPrompt(prompt);
    if (!prompt.rawContent || prompt.rawContent.trim().length === 0) {
      try {
        const full = await PromptRepository.getPromptById(prompt.id);
        if (full) {
          setPreviewTargetPrompt(full);
        }
      } catch {
        // Fallback: PromptPreviewModal will fetch authorized content
      }
    }
  };

  const handleClosePreview = useCallback(() => {
    setPreviewTargetPrompt(null);
    setActivePromptId(null);
    if (typeof window !== 'undefined' && window.location.search.includes('prompt=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('prompt');
      const cleanUrl = url.pathname + (url.search ? url.search : '') + url.hash;
      window.history.replaceState({ tab: 'marketplace', promptId: null }, '', cleanUrl);
    }
  }, [setActivePromptId]);

  const handleFork = async (prompt: Prompt) => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to fork prompts.', 'info');
      return;
    }
    try {
      let existingFork = prompts.find(
        (p: Prompt) => (p.originalPromptId === prompt.id || p.id === prompt.id) && p.authorId === user.id
      );
      if (!existingFork) {
        try {
          existingFork = (await PromptRepository.getUserForkOfPrompt(user.id, prompt.id)) || undefined;
        } catch {
          // Non-blocking
        }
      }
      if (existingFork) {
        try {
          sessionStorage.setItem('ph_active_prompt_id', existingFork.id);
          sessionStorage.setItem('ph_active_prompt_data', JSON.stringify(existingFork));
          sessionStorage.setItem('ph_creation_workspace_prompt', existingFork.rawContent || '');
          sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
            title: existingFork.title,
            prompt: existingFork.rawContent || '',
            category: existingFork.category,
          }));
        } catch {}
        sendToWork?.({ title: existingFork.title, prompt: existingFork.rawContent || '' });
        setActivePromptId(existingFork.id);
        setAppTab('workspace');
        showToast(`Opened "${existingFork.title}" in Workspace`, 'info');
        return existingFork;
      }

      const forked = await forkPrompt(prompt.id);
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
        sendToWork?.({ title: forked.title, prompt: forked.rawContent || '' });
        setActivePromptId(forked.id);
        setAppTab('workspace');
        showToast(`Forked "${forked.title}" to Workspace`, 'success');
        return forked;
      }
    } catch (err: any) {
      const { userMessage } = normalizeError(err);
      showToast(userMessage, 'error');
    }
    return undefined;
  };

  // Synchronize real-time social metrics across all prompts in the active marketplace catalog
  useEffect(() => {
    const handleLikeChange = (e: Event) => {
      const { promptId, likesCount, delta } = (e as CustomEvent).detail || {};
      if (!promptId) return;

      setPaginatedPrompts(prev => prev.map(p => {
        if (p.id === promptId) {
          const updated = typeof likesCount === 'number'
            ? likesCount
            : Math.max(0, (p.likesCount || 0) + (delta ?? 0));
          return { ...p, likesCount: updated };
        }
        return p;
      }));

      setPreviewTargetPrompt(prev => {
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

      setPaginatedPrompts(prev => prev.map(p => {
        if (p.id === promptId) {
          const updated = typeof commentsCount === 'number'
            ? commentsCount
            : Math.max(0, (p.commentsCount || 0) + (delta ?? 1));
          return { ...p, commentsCount: updated };
        }
        return p;
      }));

      setPreviewTargetPrompt(prev => {
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

      setPaginatedPrompts(prev => prev.map(p => {
        if (p.id === promptId) {
          const updated = typeof forksCount === 'number'
            ? forksCount
            : Math.max(0, (p.forksCount || 0) + (delta ?? 1));
          return { ...p, forksCount: updated };
        }
        return p;
      }));

      setPreviewTargetPrompt(prev => {
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

      setPaginatedPrompts(prev => prev.map(p => {
        if (p.id === promptId) {
          const updated = typeof viewsCount === 'number'
            ? viewsCount
            : Math.max(0, (p.viewsCount || 0) + (delta ?? 1));
          return { ...p, viewsCount: updated };
        }
        return p;
      }));

      setPreviewTargetPrompt(prev => {
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
      setPaginatedPrompts(prev => prev.some(p => p.id === newPrompt.id) ? prev : [newPrompt, ...prev]);
    };

    const handlePromptUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const updatedPrompt = detail?.prompt;
      if (!updatedPrompt) return;
      setPaginatedPrompts(prev => prev.map(p => (p.id === updatedPrompt.id ? { ...p, ...updatedPrompt } : p)));
      setPreviewTargetPrompt(prev => (prev && prev.id === updatedPrompt.id ? { ...prev, ...updatedPrompt } : prev));
    };

    const handlePromptDeleted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const promptId = detail?.promptId;
      if (!promptId) return;
      setPaginatedPrompts(prev => prev.filter(p => p.id !== promptId));
      setPreviewTargetPrompt(prev => (prev && prev.id === promptId ? null : prev));
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

  const handleToggleLike = (promptId: string) => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to like prompts.', 'info');
      return;
    }
    toggleLikePrompt(promptId).catch(() => {});
  };

  const handlePurchase = (prompt: Prompt) => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to purchase prompts.', 'info');
      return;
    }
    if (prompt.authorId === user.id) {
      showToast('You cannot purchase your own prompt.', 'error');
      return;
    }
    const ownsPrompt =
      userPurchases.some((p: MarketplacePurchase) => p.promptId === prompt.id && p.status === 'completed') ||
      prompts.some((p: Prompt) => p.originalPromptId === prompt.id && p.authorId === user.id);
    if (ownsPrompt) {
      showToast('You already own this prompt! Check your Prompt Library.', 'error');
      return;
    }
    setPurchaseTargetPrompt(prompt);
  };

  const confirmCheckout = async () => {
    if (!purchaseTargetPrompt || !user) return;
    setCheckingOut(true);

    try {
      await initiateMarketplaceCheckout({
        promptId: purchaseTargetPrompt.id,
        promptTitle: purchaseTargetPrompt.title,
        currency: 'INR',
        prefill: {
          name: user.name || user.username || '',
          email: user.email || '',
        },
        themeColor: '#315C4A',
        onSuccess: async (payment, verifyRes) => {
          try {
            await registerCompletedPurchase(purchaseTargetPrompt.id, {
              purchaseId: verifyRes?.purchaseId,
              orderId: verifyRes?.orderId,
              razorpayOrderId: payment.razorpay_order_id,
              razorpayPaymentId: payment.razorpay_payment_id,
              // Server-verified amount only. This was
              // `verifyRes?.amountPaid || purchaseTargetPrompt.price`, so whenever the
              // server did not return an amount the ledger recorded the client's `price`
              // field — the 2x display/credit number — as if it had been paid. The client
              // never gets to decide what was charged; unset is honest, a guess is not.
              amountPaid: verifyRes?.amountPaid,
            });
            trackMixpanelOrderCompleted({
              orderId: payment.razorpay_order_id || payment.razorpay_payment_id,
              amountInr: verifyRes?.amountPaid ?? purchaseTargetPrompt.priceInr ?? 0,
              creditsAdded: 0,
              packageId: `prompt_${purchaseTargetPrompt.id}`,
              paymentMethod: 'razorpay',
            });
            await refreshSellerData();
            showToast(`🎉 Payment verified [ID: ${payment.razorpay_payment_id}]! "${purchaseTargetPrompt.title}" is now licensed in your library.`, 'success');
            setPurchaseTargetPrompt(null);
          } catch (postErr: any) {
            const { userMessage } = normalizeError(postErr);
            showToast(userMessage, 'error');
          }
        },
        onFailure: (err: any) => {
          const msg = err?.description || err?.message || 'Payment cancelled or failed';
          showToast(msg, 'error');
        },
        onDismiss: () => {
          showToast('Prompt checkout cancelled.', 'info');
        },
      });
    } catch (err: any) {
      const { userMessage } = normalizeError(err);
      showToast(userMessage, 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  // Calculate dynamic breakdown for modal
  // Was hardcoded sellerCountry 'US' / currency 'USD' on an INR-only marketplace, so the
  // modal quoted US processing fees and W-9 rules for a rupee sale settled through
  // Razorpay. Per-seller country is not on the Prompt record (it lives on
  // seller_verifications, which this view does not load for other users), and 'IN' is the
  // only payout country the platform supports today.
  const targetBreakdown = purchaseTargetPrompt
    ? TaxEngine.calculateBreakdown({
        sellerCountry: 'IN',
        sellerEntityType: 'individual',
        isUsPerson: false,
        grossAmount: purchaseTargetPrompt.priceInr || purchaseTargetPrompt.price || 0,
        currency: 'INR',
      })
    : null;

  // ─── Seller Studio Helpers & Interactive Components ──────────────────────
  const renderMonetizationRoadmap = () => (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-text-primary font-display flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-primary" />
            <span>Creator Monetization Pipeline</span>
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            How PromptHub turns your prompt architectures into direct bank settlements.
          </p>
        </div>
        <span className="text-[10px] font-mono bg-bg-tertiary px-2 py-0.5 rounded border border-border-default text-text-secondary">
          Automated Escrow
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-bg-tertiary/70 border border-border-default rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="w-6 h-6 rounded-md bg-brand-primary/10 text-brand-primary font-mono text-xs font-bold flex items-center justify-center">1</span>
            <Sparkles className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <h4 className="text-xs font-bold text-text-primary">Build &amp; Benchmark</h4>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Create variable-driven prompts with <code className="text-[10px] bg-bg-secondary px-1 py-0.5 rounded font-mono">{"{{variables}}"}</code> and test across 10 LLMs in Studio.
          </p>
        </div>

        <div className="bg-bg-tertiary/70 border border-border-default rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="w-6 h-6 rounded-md bg-brand-primary/10 text-brand-primary font-mono text-xs font-bold flex items-center justify-center">2</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <h4 className="text-xs font-bold text-text-primary">Price &amp; Publish</h4>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Set any price from ₹49 to ₹9,999. Keep 70% royalties on every license with zero hidden deductions.
          </p>
        </div>

        <div className="bg-bg-tertiary/70 border border-border-default rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="w-6 h-6 rounded-md bg-brand-primary/10 text-brand-primary font-mono text-xs font-bold flex items-center justify-center">3</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <h4 className="text-xs font-bold text-text-primary">7-Day Escrow Cooling</h4>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Every transaction logs to the immutable ledger and cools for 7 business days to shield against disputes.
          </p>
        </div>

        <div className="bg-bg-tertiary/70 border border-border-default rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="w-6 h-6 rounded-md bg-brand-primary/10 text-brand-primary font-mono text-xs font-bold flex items-center justify-center">4</span>
            <Landmark className="w-3.5 h-3.5 text-brand-primary" />
          </div>
          <h4 className="text-xs font-bold text-text-primary">Direct UPI / Bank Payout</h4>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Automated disbursement transfers earnings directly into your registered Indian Bank account or UPI VPA.
          </p>
        </div>
      </div>
    </div>
  );

  const renderEarningsSimulator = () => (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-text-primary font-display flex items-center gap-2">
            <Calculator className="w-4 h-4 text-brand-primary" />
            <span>Creator Potential Earnings Simulator</span>
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Live calculation based on PromptHub's guaranteed 70% creator payout structure.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono font-semibold self-start sm:self-auto">
          <span>70% Take-Home Royalty</span>
        </div>
      </div>

      <div className="space-y-3 bg-bg-tertiary/50 p-4 rounded-xl border border-border-default">
        {/* Price Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-text-secondary block">
            Choose Prompt Price (INR):
          </span>
          <div className="flex flex-wrap gap-2">
            {[49, 99, 149, 299, 499, 999].map(pVal => (
              <button
                key={`sim-price-${pVal}`}
                type="button"
                onClick={() => setSimPrice(pVal)}
                className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-lg text-xs font-mono font-semibold cursor-pointer transition-colors border ${
                  simPrice === pVal
                    ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                    : 'bg-bg-secondary text-text-secondary border-border-default hover:text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                ₹{pVal}
              </button>
            ))}
          </div>
        </div>

        {/* Sales Volume Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-text-secondary block">
            Projected Monthly Sales:
          </span>
          <div className="flex flex-wrap gap-2">
            {[10, 50, 200, 1000].map(sVal => (
              <button
                key={`sim-sales-${sVal}`}
                type="button"
                onClick={() => setSimSales(sVal)}
                className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-lg text-xs font-mono font-semibold cursor-pointer transition-colors border ${
                  simSales === sVal
                    ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                    : 'bg-bg-secondary text-text-secondary border-border-default hover:text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                {sVal} sales/mo
              </button>
            ))}
          </div>
        </div>

        {/* Simulator Output Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-bg-secondary p-3 rounded-xl border border-border-default">
            <span className="block text-[10px] font-mono text-text-muted uppercase font-semibold">Gross Volume</span>
            <strong className="text-base font-bold font-mono text-text-primary">
              ₹{(simPrice * simSales).toLocaleString('en-IN')}
            </strong>
            <span className="block text-[10px] text-text-muted mt-0.5">Total buyer expenditure</span>
          </div>

          <div className="bg-bg-secondary p-3 rounded-xl border border-border-default">
            <span className="block text-[10px] font-mono text-text-muted uppercase font-semibold">Platform &amp; Gateway (30%)</span>
            <strong className="text-base font-bold font-mono text-text-muted">
              -₹{Math.round(simPrice * simSales * 0.3).toLocaleString('en-IN')}
            </strong>
            <span className="block text-[10px] text-text-muted mt-0.5">Covers hosting, AI scans, Razorpay</span>
          </div>

          <div className="bg-brand-primary/10 border border-brand-primary/30 p-3 rounded-xl">
            <span className="block text-[10px] font-mono text-brand-primary dark:text-[#41A2D9] uppercase font-bold">Your Take-Home (70%)</span>
            <strong className="text-xl font-bold font-mono text-brand-primary dark:text-[#41A2D9]">
              ₹{Math.round(simPrice * simSales * 0.7).toLocaleString('en-IN')} <span className="text-xs font-normal">/ mo</span>
            </strong>
            <span className="block text-[10px] text-text-secondary mt-0.5">Net bank/UPI payout</span>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-text-muted">
            Based on {simSales} licenses/mo at ₹{simPrice} each.
          </span>
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('ph_create_for_sale', 'true');
              sessionStorage.setItem('ph_create_for_sale_price', String(simPrice));
              if (!user) {
                showToast(`Sign in to list your prompt for sale at ₹${simPrice}.`, 'info');
                setShowAuthModal(true);
                return;
              }
              setAppTab('create-prompt');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-bold cursor-pointer shadow-xs transition-colors min-h-[44px] sm:min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>List Prompt at ₹{simPrice} for Sale</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderPromptsToMonetize = () => {
    const authored = prompts.filter(p => user && p.authorId === user.id);
    return (
      <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs space-y-3">
        {authored.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-text-primary font-display flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-primary" />
                  <span>Your Library Prompts Ready to Monetize ({authored.length})</span>
                </h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Prompts you authored that can be activated for paid marketplace licensing.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {authored.slice(0, 3).map(userPrompt => (
                <div key={userPrompt.id} className="bg-bg-tertiary border border-border-default rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                      <span className="capitalize">{userPrompt.category || 'General'}</span>
                      <span className="inline-flex items-center gap-1 text-brand-primary">
                        <ModelProviderLogo modelId={userPrompt.model || 'OpenAI'} provider={userPrompt.model || 'OpenAI'} className="w-3 h-3 shrink-0" />
                        <span>{userPrompt.model || 'OpenAI'}</span>
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-text-primary truncate mt-1">{userPrompt.title}</h4>
                    <p className="text-[11px] text-text-secondary line-clamp-2 mt-0.5">
                      {userPrompt.description || 'Custom prompt template ready for marketplace distribution.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sessionStorage.setItem('ph_create_for_sale', 'true');
                      sessionStorage.setItem('ph_create_for_sale_price', '99');
                      setActivePromptId(userPrompt.id);
                      setAppTab('create-prompt');
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold cursor-pointer transition-colors min-h-[44px] sm:min-h-[32px]"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Monetize for Sale (₹)</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-text-primary font-display flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-primary" />
                  <span>High-Demand Prompt Archetypes Ready to Build</span>
                </h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Verified templates with highest buyer conversion rates across the developer community.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-bg-tertiary border border-border-default rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-brand-primary font-semibold">Development</span>
                    <span className="text-emerald-600 font-bold">Avg ₹299</span>
                  </div>
                  <h4 className="text-xs font-bold text-text-primary mt-1">Autonomous MCP Agents</h4>
                  <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5">
                    Multi-step tool-calling prompts for Claude 3.5 Sonnet &amp; GPT-4o with deterministic JSON schema.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem('ph_create_for_sale', 'true');
                    sessionStorage.setItem('ph_create_for_sale_price', '299');
                    if (!user) {
                      showToast('Please sign in to build prompts.', 'info');
                      setShowAuthModal(true);
                      return;
                    }
                    setAppTab('create-prompt');
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-bg-secondary hover:bg-bg-primary border border-border-default text-text-primary text-xs font-semibold cursor-pointer transition-colors min-h-[44px] sm:min-h-[32px]"
                >
                  <Plus className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Create in Studio (₹299)</span>
                </button>
              </div>

              <div className="bg-bg-tertiary border border-border-default rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-purple-600 font-semibold">Design</span>
                    <span className="text-emerald-600 font-bold">Avg ₹149</span>
                  </div>
                  <h4 className="text-xs font-bold text-text-primary mt-1">Cinematic Midjourney v6</h4>
                  <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5">
                    Hyper-realistic prompt formulas with volumetric lighting, aspect tokens, and camera optics.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem('ph_create_for_sale', 'true');
                    sessionStorage.setItem('ph_create_for_sale_price', '149');
                    if (!user) {
                      showToast('Please sign in to build prompts.', 'info');
                      setShowAuthModal(true);
                      return;
                    }
                    setAppTab('create-prompt');
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-bg-secondary hover:bg-bg-primary border border-border-default text-text-primary text-xs font-semibold cursor-pointer transition-colors min-h-[44px] sm:min-h-[32px]"
                >
                  <Plus className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Create in Studio (₹149)</span>
                </button>
              </div>

              <div className="bg-bg-tertiary border border-border-default rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-amber-600 font-semibold">Business</span>
                    <span className="text-emerald-600 font-bold">Avg ₹499</span>
                  </div>
                  <h4 className="text-xs font-bold text-text-primary mt-1">Financial Due Diligence</h4>
                  <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5">
                    Balance sheet forensic analysis, valuation models, and automated investment memo generation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem('ph_create_for_sale', 'true');
                    sessionStorage.setItem('ph_create_for_sale_price', '499');
                    if (!user) {
                      showToast('Please sign in to build prompts.', 'info');
                      setShowAuthModal(true);
                      return;
                    }
                    setAppTab('create-prompt');
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-bg-secondary hover:bg-bg-primary border border-border-default text-text-primary text-xs font-semibold cursor-pointer transition-colors min-h-[44px] sm:min-h-[32px]"
                >
                  <Plus className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Create in Studio (₹499)</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderFeeAccountingSection = (isLive: boolean) => (
    <div className="bg-bg-tertiary border border-border-default rounded-xl p-4 text-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="font-bold text-text-primary flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5 text-brand-primary" />
          <span>Platform Commission &amp; Statutory Fee Accounting</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-bg-secondary px-2 py-0.5 rounded border border-border-default text-text-secondary">
            Rule Version: v1_7_business_days
          </span>
          {isLive && (
            <button
              type="button"
              onClick={refreshSellerData}
              disabled={isLoadingAnalytics}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-secondary hover:bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary text-[10px] font-mono transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
              <span>Sync ({lastRefreshedAt})</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-text-secondary">
        <div className="bg-bg-secondary p-3 rounded-lg border border-border-default">
          <span className="block text-text-muted text-[10px] font-mono">Platform Fee (30%) — Creator 70%</span>
          <strong className="text-text-primary font-mono text-sm">₹{sellerAnalytics.platformFees.toFixed(0)}</strong>
          <span className="block text-[10px] text-text-muted mt-0.5">30% platform operating share</span>
        </div>
        <div className="bg-bg-secondary p-3 rounded-lg border border-border-default">
          <span className="block text-text-muted text-[10px] font-mono">Payment Processing Gateway</span>
          <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">₹0 Deducted</strong>
          <span className="block text-[10px] text-text-muted mt-0.5">100% absorbed by PromptHub</span>
        </div>
        <div className="bg-bg-secondary p-3 rounded-lg border border-border-default">
          <span className="block text-text-muted text-[10px] font-mono">Tax Withholdings (TDS / Statutory)</span>
          <strong className="text-text-primary font-mono text-sm">₹{sellerAnalytics.taxWithholdings.toFixed(0)}</strong>
          <span className="block text-[10px] text-text-muted mt-0.5">Section 194-O compliant</span>
        </div>
      </div>

      {/* Formula In Action Box */}
      <div className="p-2.5 rounded-lg bg-bg-secondary border border-border-default text-[11px] text-text-secondary flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
        <span>
          <strong>Formula in Action:</strong> On a ₹100 prompt license sale, <strong className="text-brand-primary font-mono">₹70 (70%)</strong> is credited directly to your payout ledger. PromptHub retains ₹30 (30%) to cover Razorpay gateway fees, AI safety audits, continuous hosting, and multi-model sandboxing.
        </span>
      </div>

      {/* Expandable Policy Accordion */}
      <div>
        <button
          type="button"
          onClick={() => setShowPolicyDetails(prev => !prev)}
          className="inline-flex items-center gap-1.5 text-brand-primary dark:text-[#41A2D9] hover:underline text-[11px] font-semibold cursor-pointer"
        >
          {showPolicyDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showPolicyDetails ? 'Hide Accounting & Escrow Policy' : 'Show Full Accounting & Escrow Policy Details'}</span>
        </button>

        {showPolicyDetails && (
          <div className="mt-2 p-3 rounded-lg bg-bg-secondary border border-border-default text-[11px] text-text-secondary space-y-2 animate-in fade-in">
            <div className="space-y-1">
              <strong className="text-text-primary block">1. 70% Creator Take-Home Guarantee:</strong>
              <p>
                Creators retain 70% of gross INR sales. There are no surprise fee tiers, hosting charges, or transaction processing clawbacks.
              </p>
            </div>
            <div className="space-y-1">
              <strong className="text-text-primary block">2. Gateway Charge Absorption:</strong>
              <p>
                Payment gateway fees (typically 2-3% + GST charged by Razorpay) are 100% absorbed by PromptHub out of the platform's 30% share.
              </p>
            </div>
            <div className="space-y-1">
              <strong className="text-text-primary block">3. 7 Business-Day Escrow Cooling Window:</strong>
              <p>
                To defend creators and buyers against credit card fraud and unauthorized licensing, all purchases remain in cooling escrow for 7 business days before automated disbursement.
              </p>
            </div>
            <div className="space-y-1">
              <strong className="text-text-primary block">4. Statutory Tax Compliance (TDS Sec 194-O):</strong>
              <p>
                Where mandated by Indian Income Tax law, TDS deductions are tracked transparently, and quarterly Form 16A certificates are generated for verified creator PANs.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderSampleLedgerPreview = () => (
    <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden shadow-xs space-y-0">
      <div className="p-3.5 border-b border-border-default bg-bg-tertiary flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-text-primary font-display flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sample Verified Double-Entry Ledger Entry</span>
          </h4>
          <p className="text-[10px] text-text-muted mt-0.5">
            Live architecture preview of how incoming community purchases appear in your ledger.
          </p>
        </div>
        <span className="text-[10px] font-mono bg-bg-secondary text-text-secondary px-2 py-0.5 rounded border border-border-default">
          SHA-256 Verified
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[640px]">
          <thead>
            <tr className="border-b border-border-default text-[10px] uppercase font-semibold text-text-muted bg-bg-tertiary/70 font-mono">
              <th className="p-3">Reference / Order ID</th>
              <th className="p-3">Prompt Architecture</th>
              <th className="p-3">Gross</th>
              <th className="p-3">Platform (30%)</th>
              <th className="p-3">Net Earning (70%)</th>
              <th className="p-3">Payout Settlement Date</th>
              <th className="p-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-bg-secondary hover:bg-bg-tertiary/30 transition-colors">
              <td className="p-3 font-mono text-[11px] text-text-muted">
                #ORD-8841
              </td>
              <td className="p-3 font-medium text-text-primary">
                Autonomous Fullstack Architect
              </td>
              <td className="p-3 font-mono font-bold text-text-primary">
                ₹149
              </td>
              <td className="p-3 font-mono text-text-muted">
                -₹44.70
              </td>
              <td className="p-3 font-mono font-bold text-brand-primary">
                +₹104.30
              </td>
              <td className="p-3 text-text-secondary font-mono text-[11px]">
                T+7 Business Days (Cooling)
              </td>
              <td className="p-3 text-right">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                  Escrow Cooling
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-4 md:p-6 bg-bg-primary text-left font-sans select-text max-w-7xl mx-auto w-full">
      {/* ── Editorial Header (Image 5: COMMUNITY / PROMPT LIBRARY) ─────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-3.5 border-b border-border-default">
        <div>
          <div className="text-[11px] font-mono font-semibold tracking-[0.14em] text-[#7A7E75] dark:text-[#9AA0A6] uppercase">
            COMMUNITY / PROMPT LIBRARY
          </div>
          <h1 className="text-xl sm:text-3xl font-bold font-display text-text-primary tracking-tight mt-0.5">
            Borrow a better starting point.
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-0.5 max-w-2xl">
            Curated prompts, system directives, and autonomous agent patterns from the PromptHub community.
          </p>
        </div>

        {/* Tab Switcher & Payout Settings trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('ph_create_for_sale', 'true');
              if (!user) {
                showToast('Please sign in to list prompts for sale in the Marketplace.', 'info');
                setShowAuthModal(true);
                return;
              }
              setAppTab('create-prompt');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-bold cursor-pointer shadow-xs transition-colors min-h-[44px] sm:min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>List Prompt for Sale</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!user) {
                showToast('Please sign in to configure your UPI / Bank payout settings.', 'info');
                setShowAuthModal(true);
                return;
              }
              setIsKycModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-semibold cursor-pointer shadow-xs transition-colors min-h-[44px] sm:min-h-[36px]"
          >
            <Landmark className="w-3.5 h-3.5 text-brand-primary" />
            <span>Payout Settings</span>
          </button>

          <div className="flex bg-bg-tertiary p-0.5 border border-border-default rounded-lg select-none w-fit">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                activeTab === 'catalog'
                  ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <PromptMarketplaceIcon size={14} variant={activeTab === 'catalog' ? 'solid' : 'outline'} className="text-current" />
              <span>Catalog</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('revenue');
                refreshSellerData();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                activeTab === 'revenue'
                  ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Seller Analytics</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'catalog' ? (
          <motion.div
            key="catalog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Filter and Search Bar */}
            <div className="bg-bg-secondary border border-border-default rounded-xl p-3.5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative w-full sm:w-80 md:w-96">
                  {isSearching ? (
                    <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  ) : (
                    <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates, authors, or tags..."
                    className="w-full min-h-[44px] sm:min-h-[36px] bg-bg-tertiary border border-border-default rounded-lg pl-8 pr-20 py-1.5 text-xs text-text-primary focus:border-brand-primary focus:outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-16 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer z-10"
                      title="Clear search query"
                      aria-label="Clear search query"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center z-10 pointer-events-auto">
                    <PromptCameraMicControls
                      variant="inline"
                      onImageAttached={(url) => {
                        setAttachedImageSearch(url);
                        showToast('📸 Photo filter applied: Showing vision & multimodal prompt templates', 'info');
                      }}
                      onTranscriptReady={(text) => {
                        const trimmed = text.trim();
                        setSearchQuery(trimmed);
                        const lower = trimmed.toLowerCase();
                        const matchedCat = categoriesList.find(c => c.toLowerCase() === lower);
                        if (matchedCat) {
                          setSelectedCategory(matchedCat);
                        }
                        showToast(`🎙️ Voice search: "${trimmed}"`, 'info');
                      }}
                      cameraTooltip="Search vision templates by photo"
                      micTooltip="Dictate marketplace search"
                      voiceSuccessMessage="🎙️ Voice search applied!"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-bg-tertiary p-1 border border-border-default rounded-lg text-xs self-start sm:self-auto flex-wrap">
                  <button
                    onClick={() => setListingType('all')}
                    className={`min-h-[44px] sm:min-h-[28px] px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                      listingType === 'all' ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span>All Items</span>
                    <span className="text-[10px] opacity-75 font-mono">({listingCounts.all})</span>
                  </button>
                  <button
                    onClick={() => setListingType('paid')}
                    className={`min-h-[44px] sm:min-h-[28px] px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                      listingType === 'paid' ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span>Paid Prompts</span>
                    <span className="text-[10px] opacity-75 font-mono">({listingCounts.paid})</span>
                  </button>
                  <button
                    onClick={() => setListingType('premium')}
                    className={`min-h-[44px] sm:min-h-[28px] px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                      listingType === 'premium' ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span>Official Premium</span>
                    <span className="text-[10px] opacity-75 font-mono">({listingCounts.premium})</span>
                  </button>
                  <button
                    onClick={() => setListingType('free')}
                    className={`min-h-[44px] sm:min-h-[28px] px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                      listingType === 'free' ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span>Free</span>
                    <span className="text-[10px] opacity-75 font-mono">({listingCounts.free})</span>
                  </button>
                </div>
              </div>

              {/* Photo Filter Banner if active */}
              {attachedImageSearch && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/20 rounded-lg text-xs text-brand-primary dark:text-[#41A2D9] w-fit animate-in fade-in">
                  <img src={attachedImageSearch} alt="Photo query" referrerPolicy="no-referrer" className="w-5 h-5 rounded object-cover border border-brand-primary/30" />
                  <span className="font-medium">Photo filter active: Matching Vision & Multimodal templates</span>
                  <button
                    type="button"
                    onClick={() => setAttachedImageSearch(null)}
                    className="ml-1 p-0.5 text-brand-primary hover:text-rose-500 transition-colors cursor-pointer rounded"
                    title="Remove photo filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Category Pills */}
              <div data-tour="tour-template-filter" className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-none">
                {categoriesList.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                      selectedCategory === cat
                        ? 'bg-brand-primary-light border border-brand-primary/20 text-brand-primary font-semibold'
                        : 'bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      selectedCategory === cat
                        ? 'bg-brand-primary text-white'
                        : 'bg-bg-secondary text-text-muted'
                    }`}>
                      {categoryCounts[cat] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Grid */}
            {isInitialLoading ? (
              <div className="py-20 text-center text-text-muted space-y-3 bg-bg-secondary rounded-xl border border-border-default">
                <Loader2 className="w-7 h-7 animate-spin mx-auto text-brand-primary" />
                <p className="text-xs font-medium">Loading verified prompt templates...</p>
              </div>
            ) : paginatedPrompts.length === 0 ? (
              <div className="text-center py-16 px-4 border border-border-default border-dashed rounded-xl bg-bg-secondary space-y-3">
                <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto text-text-muted">
                  <PromptMarketplaceIcon size={24} variant="outline" className="text-text-muted" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-sm font-bold text-text-primary">
                    {searchQuery || attachedImageSearch || selectedCategory !== 'All' || listingType !== 'all'
                      ? 'No Matching Prompts Found'
                      : 'No Prompts Found in Marketplace'}
                  </h4>
                  <p className="text-xs text-text-secondary">
                    {attachedImageSearch
                      ? 'No templates match your attached photo filter. Try clearing the photo or exploring other categories.'
                      : searchQuery
                      ? `No templates matched "${searchQuery}" in ${selectedCategory === 'All' ? 'the marketplace' : selectedCategory}.`
                      : selectedCategory !== 'All'
                      ? `There are currently no templates listed in the ${selectedCategory} category.`
                      : 'When creators publish public prompt templates, they will appear in this catalog.'}
                  </p>
                </div>

                {/* Recovery Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {(searchQuery || attachedImageSearch || selectedCategory !== 'All' || listingType !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setAttachedImageSearch(null);
                        setSelectedCategory('All');
                        setListingType('all');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors min-h-[36px]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Filters ({listingCounts.all} Available)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        setShowAuthModal(true);
                        return;
                      }
                      setAppTab('create-prompt');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-primary text-xs font-semibold cursor-pointer shadow-xs transition-colors min-h-[36px]"
                  >
                    <Plus className="w-3.5 h-3.5 text-brand-primary" />
                    <span>List a Prompt in {selectedCategory === 'All' ? 'Marketplace' : selectedCategory}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div data-tour="tour-template-card" className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 items-stretch">
                  {paginatedPrompts.map((prompt: Prompt, idx: number) => {
                    const ownsPrompt =
                      userPurchases.some((p: MarketplacePurchase) => p.promptId === prompt.id && p.status === 'completed') ||
                      prompts.some((p: Prompt) => p.originalPromptId === prompt.id && p.authorId === user?.id) ||
                      prompt.authorId === user?.id ||
                      user?.role === 'Admin';
                    const isLiked = likedPromptIds.includes(prompt.id);

                    const isPaid = isPaidPrompt(prompt);
                    const isAdminPremium = isAdminPremiumPrompt(prompt);
                    const isLocked = isPromptLockedForUser(prompt, user, userPurchases);
                    const canUserRatePrompt = ratingService.canUserRate(prompt, user, userPurchases.map(p => p.promptId), userRatings[prompt.id]);
                    return (
                      <div
                        key={`marketplace-${prompt.id}-${idx}`}
                        className="bg-bg-secondary rounded-xl p-4 border border-border-default flex flex-col justify-between shadow-xs hover:border-border-hover transition-colors min-w-0 overflow-hidden h-full"
                      >
                        <div className="space-y-2 min-w-0 w-full">
                          {/* Prompt Image Preview (Before/After, Output, Cover, or embedded media) */}
                          <PromptImagePreview
                            prompt={prompt}
                            size="compact"
                            aspectRatio="video"
                            showPlaceholderWhenEmpty={true}
                            className="mb-2 shrink-0"
                          />

                          <div className="flex justify-between items-center gap-2 min-w-0 h-6">
                            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                              {isPaid ? (
                                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold border flex items-center gap-1 shrink-0 ${
                                  isLocked 
                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' 
                                    : 'bg-brand-primary-light text-brand-primary border-brand-primary/20'
                                }`}>
                                  {isLocked ? <Lock className="w-2.5 h-2.5 text-amber-600" /> : <CheckCircle className="w-2.5 h-2.5 text-brand-primary" />}
                                  PAID
                                </span>
                              ) : isAdminPremium ? (
                                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold border flex items-center gap-1 shrink-0 ${
                                  isLocked 
                                    ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' 
                                    : 'bg-brand-primary-light text-brand-primary border-brand-primary/20'
                                }`}>
                                  {isLocked ? <Crown className="w-2.5 h-2.5 text-purple-600" /> : <CheckCircle className="w-2.5 h-2.5 text-brand-primary" />}
                                  OFFICIAL PREMIUM
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] px-1.5 py-0.2 rounded font-semibold border border-brand-primary/20 shrink-0">
                                  FREE
                                </span>
                              )}
                              <span className="text-[10px] font-mono bg-bg-tertiary text-text-secondary px-1.5 py-0.2 rounded border border-border-default truncate max-w-[100px]">
                                {prompt.category || prompt.assetType}
                              </span>
                              {prompt.model && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-text-muted font-mono bg-bg-tertiary px-1.5 py-0.2 rounded border border-border-default shrink-0">
                                  <ModelProviderLogo modelId={prompt.model} provider={prompt.model} className="w-3 h-3 shrink-0" />
                                  <span className="truncate max-w-[80px]">{prompt.model}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLike(prompt.id);
                                }}
                                className={`min-h-[28px] flex items-center gap-1 px-1.5 py-0.5 text-xs transition-colors cursor-pointer rounded-lg hover:bg-bg-tertiary ${
                                  isLiked ? 'text-rose-600 font-semibold' : 'text-text-muted hover:text-rose-600'
                                }`}
                                title={user ? "Favorite prompt" : "Sign in to favorite prompt"}
                                aria-label="Favorite prompt"
                              >
                                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                                <span className="font-mono text-[11px]">{prompt.likesCount || 0}</span>
                              </button>

                              {isPaid ? (
                                <span className="text-xs font-bold text-text-primary font-mono">₹{(prompt.priceInr || prompt.price || 0).toFixed(0)}</span>
                              ) : isAdminPremium ? (
                                <span className="text-[10px] font-medium text-purple-700 dark:text-purple-300 font-mono">Plan / ₹200+</span>
                              ) : (
                                <span className="text-xs font-bold text-brand-primary dark:text-[#41A2D9] font-mono">Free</span>
                              )}
                            </div>
                          </div>

                          <div className="min-w-0 w-full">
                            <h4 className="text-xs font-bold text-text-primary line-clamp-2 leading-snug break-words [overflow-wrap:anywhere] min-w-0 h-9 flex items-start" title={prompt.title}>
                              {prompt.title}
                            </h4>
                            <div className="mt-1 min-w-0 w-full h-11 overflow-hidden">
                              <p className="text-xs text-text-secondary leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word]">
                                {prompt.description && prompt.description.length > 300 && !expandedDescriptions[prompt.id]
                                  ? `${prompt.description.slice(0, 300)}...`
                                  : prompt.description || 'No description provided.'}
                              </p>
                              {prompt.description && prompt.description.length > 300 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedDescriptions(prev => ({ ...prev, [prompt.id]: !prev[prompt.id] }));
                                  }}
                                  className="text-[11px] font-medium text-brand-primary hover:underline mt-0.5 inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                  <span>{expandedDescriptions[prompt.id] ? 'Show less' : 'Show more'}</span>
                                  {expandedDescriptions[prompt.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Star Rating & Report */}
                          <div className="pt-2 pb-1 flex items-center justify-between border-t border-border-subtle min-w-0">
                            <StarRating
                              promptId={prompt.id}
                              currentRating={prompt.averageRating || 0}
                              ratingCount={prompt.ratingCount || 0}
                              userRating={userRatings[prompt.id] || ratingService.getLocalRating(prompt.id)}
                              canRate={canUserRatePrompt.allowed && !userRatings[prompt.id]}
                              lockReason={userRatings[prompt.id] ? 'You have already reviewed this prompt. You cannot review twice.' : canUserRatePrompt.reason}
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
                                  showToast('Please sign in to report a prompt.', 'info');
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

                          <div className="flex flex-wrap gap-1 min-w-0 h-6 overflow-hidden">
                            {prompt.tags.map((tag: string, tagIdx: number) => (
                              <span key={`${prompt.id}-tag-${tagIdx}-${tag}`} className="text-[10px] font-mono bg-bg-tertiary text-text-muted px-1.5 py-0.2 rounded border border-border-default max-w-full break-all truncate">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-2.5 min-w-0 mt-auto">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                            <UserAvatar
                              src={prompt.authorAvatar}
                              name={prompt.authorName}
                              username={prompt.authorName}
                              size="xs"
                              shape="circle"
                            />
                            <span className="text-[11px] text-text-secondary truncate max-w-[120px] min-w-0">
                              {prompt.authorName ? (prompt.authorName.startsWith('@') ? prompt.authorName : `@${prompt.authorName}`) : '@creator'}
                            </span>
                            {ownsPrompt && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border border-brand-primary/20 shrink-0">
                                <CheckCircle className="w-2.5 h-2.5" />
                                <span>Owned</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCommentsTarget(prompt);
                              }}
                              className="flex items-center gap-1 py-1 px-2 min-h-[44px] sm:min-h-[32px] rounded-md text-xs font-medium bg-bg-tertiary hover:bg-border-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer border border-border-default"
                              title="View comments & discussion"
                              aria-label="Comments"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-text-muted" />
                              <span className="font-mono text-[11px]">{prompt.commentsCount || 0}</span>
                            </button>

                            <button
                              onClick={() => handlePreviewPrompt(prompt)}
                              className="flex items-center gap-1 py-1 px-2.5 min-h-[44px] sm:min-h-[32px] rounded-md text-xs font-medium bg-bg-tertiary hover:bg-border-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer border border-border-default"
                              title="Preview Prompt Structure & Variables"
                            >
                              <Eye className="w-3.5 h-3.5 text-text-muted" />
                              <span>Preview</span>
                            </button>

                            {ownsPrompt || !isLocked ? (
                              <button
                                onClick={() => handleFork(prompt)}
                                data-tour="tour-template-fork"
                                className="flex items-center gap-1.5 py-1 px-2.5 min-h-[44px] sm:min-h-[32px] rounded-md text-xs font-semibold bg-bg-tertiary hover:bg-border-subtle text-text-primary border border-border-default transition-colors cursor-pointer shadow-2xs"
                                title={ownsPrompt ? "Open in Prompt IDE Studio" : "Fork into Prompt IDE Studio"}
                              >
                                <GitBranch className="w-3.5 h-3.5 text-brand-primary" />
                                <span>{ownsPrompt ? 'Open Studio' : 'Fork'}</span>
                              </button>
                            ) : isAdminPremium ? (
                              <button
                                onClick={() => setAppTab('pricing')}
                                className="flex items-center gap-1.5 py-1 px-2.5 min-h-[44px] sm:min-h-[32px] rounded-md text-xs font-semibold bg-brand-primary text-white hover:bg-brand-primary-hi transition-colors cursor-pointer shadow-xs"
                                title="Upgrade or Top-up ₹200+ to Access Official Premium Prompt"
                              >
                                <Crown className="w-3 h-3" />
                                <span>Upgrade Plan</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePurchase(prompt)}
                                className="flex items-center gap-1.5 py-1 px-3 min-h-[44px] sm:min-h-[32px] rounded-md text-xs font-semibold bg-brand-primary hover:bg-brand-primary-hi text-white shadow-xs transition-colors cursor-pointer"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>Buy (₹{(prompt.priceInr || prompt.price || 0).toFixed(0)})</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explicit User-Initiated Pagination Controls (Strictly NO Auto-Prefetch) */}
                {hasMorePrompts && (
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
                          <span>Loading {searchQuery.trim() ? '10' : '20'} more...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform" />
                          <span>Load More Prompts ({paginatedPrompts.length} of {totalCatalogCount})</span>
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-text-muted font-mono">
                      Showing {paginatedPrompts.length} of {totalCatalogCount} available templates
                    </span>
                  </div>
                )}

                {!hasMorePrompts && paginatedPrompts.length > 0 && (
                  <div className="text-center pt-4 pb-2">
                    <span className="text-xs text-text-muted font-mono">
                      ✓ Showing all {paginatedPrompts.length} {searchQuery.trim() ? 'matching' : 'available'} prompts
                    </span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="revenue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {isLoadingAnalytics ? (
              <div className="py-16 text-center text-text-muted space-y-2 bg-bg-secondary rounded-xl border border-border-default">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-primary" />
                <p className="text-xs">Loading immutable financial ledger records...</p>
              </div>
            ) : !user ? (
              /* If unauthenticated, show the inspiring Creator Activation Hub */
              <div className="space-y-5">
                <div className="bg-gradient-to-br from-bg-secondary via-bg-tertiary to-brand-primary/10 border border-border-default rounded-2xl p-6 sm:p-8 shadow-xs text-left relative overflow-hidden">
                  <div className="relative z-10 max-w-2xl space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary dark:text-[#41A2D9] text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>PromptHub Creator Studio</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold font-display text-text-primary tracking-tight">
                      Monetize Your Prompt Engineering Expertise
                    </h2>
                    <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
                      Publish premium prompt architectures, agent instructions, and MCP workflows. Keep a guaranteed <strong className="text-text-primary">70% royalty</strong> on every sale with automated bank and UPI settlements.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          showToast('Please sign in to access your Creator Studio.', 'info');
                          setShowAuthModal(true);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer min-h-[44px]"
                      >
                        <span>Sign In to Activate Creator Studio</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sessionStorage.setItem('ph_create_for_sale', 'true');
                          showToast('Please sign in to list prompts for sale.', 'info');
                          setShowAuthModal(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-primary text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
                      >
                        <Plus className="w-4 h-4 text-brand-primary" />
                        <span>List Your First Prompt</span>
                      </button>
                    </div>
                  </div>
                </div>

                {renderMonetizationRoadmap()}
                {renderEarningsSimulator()}
                {renderFeeAccountingSection(false)}
                {renderSampleLedgerPreview()}
              </div>
            ) : (
              /* Authenticated User Seller Analytics & Immutable Ledger */
              <div className="space-y-4">
                {/* Revenue metrics cards (Derived from Immutable Ledger) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
                    <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                      <span>Gross Sales</span>
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold font-mono text-text-primary">₹{sellerAnalytics.grossRevenue.toFixed(0)}</h3>
                    <span className="text-[10px] text-text-muted">{sellerAnalytics.totalSalesCount} confirmed orders</span>
                  </div>

                  <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
                    <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                      <span>Net Earnings (70%)</span>
                      <TrendingUp className="w-3.5 h-3.5 text-brand-primary" />
                    </div>
                    <h3 className="text-xl font-bold font-mono text-brand-primary">₹{sellerAnalytics.netEarnings.toFixed(0)}</h3>
                    <span className="text-[10px] text-text-muted">70% creator share credited</span>
                  </div>

                  <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
                    <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                      <span>Pending Payout</span>
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold font-mono text-amber-800 dark:text-amber-400">₹{sellerAnalytics.pendingPayoutAmount.toFixed(0)}</h3>
                    <span className="text-[10px] text-text-muted">7 business-day escrow cooling</span>
                  </div>

                  <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
                    <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                      <span>Paid Out</span>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">₹{sellerAnalytics.paidOutAmount.toFixed(0)}</h3>
                    <span className="text-[10px] text-text-muted">Settled to bank / UPI</span>
                  </div>
                </div>

                {/* Platform Commission & Statutory Fee Accounting */}
                {renderFeeAccountingSection(true)}

                {/* Immutable Sales Ledger Container (100% FULL) */}
                <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden shadow-xs">
                  <div className="p-3.5 border-b border-border-default bg-bg-tertiary flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-text-primary font-display">Immutable Sales &amp; Settlement Ledger</h4>
                      <span className="text-[10px] font-mono bg-bg-secondary text-text-secondary px-2 py-0.5 rounded border border-border-default">
                        Double-Entry Verified
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted font-mono">
                      <span>{sellerAnalytics.earningsList.length} total entries</span>
                      <button
                        type="button"
                        onClick={refreshSellerData}
                        disabled={isLoadingAnalytics}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                        title="Sync ledger status"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
                        <span>Sync</span>
                      </button>
                    </div>
                  </div>

                  {sellerAnalytics.earningsList.length > 0 ? (
                    <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[640px]">
                        <thead>
                          <tr className="border-b border-border-default text-[10px] uppercase font-semibold text-text-muted bg-bg-tertiary font-mono">
                            <th className="p-3">Reference / Order ID</th>
                            <th className="p-3">Gross</th>
                            <th className="p-3">Platform (30%)</th>
                            <th className="p-3">Net Earning (70%)</th>
                            <th className="p-3">Payout Settlement Date</th>
                            <th className="p-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default">
                          {sellerAnalytics.earningsList.map(earning => {
                            const eligibility = BusinessCalendarService.calculatePayoutEligibility(earning.payoutEligibleAt || earning.createdAt, 7);
                            return (
                              <tr key={earning.id} className="hover:bg-bg-tertiary/50 transition-colors">
                                <td className="p-3 font-mono text-[11px] text-text-muted">
                                  {earning.orderId.slice(0, 8)}...
                                </td>
                                <td className="p-3 font-mono font-bold text-text-primary">
                                  ₹{earning.grossAmount.toFixed(0)}
                                </td>
                                <td className="p-3 font-mono text-text-muted">
                                  -₹{earning.platformFee.toFixed(0)}
                                </td>
                                <td className="p-3 font-mono font-bold text-brand-primary">
                                  ₹{earning.netAmount.toFixed(0)}
                                </td>
                                <td className="p-3 text-text-secondary font-mono text-[11px]">
                                  {eligibility.formattedEligibilityDate}
                                  {!eligibility.isEligibleNow && (
                                    <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                                      ({eligibility.businessDaysRemaining} biz days left)
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                                    earning.status === 'paid'
                                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                      : earning.status === 'reversed'
                                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                                      : eligibility.isEligibleNow
                                      ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                                  }`}>
                                    {earning.status === 'reversed' ? 'Reversed' : eligibility.isEligibleNow ? 'Eligible' : 'Pending 7d'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* WHEN ZERO TRANSACTIONS: SPACE IS 100% FULL WITH CREATOR COMMAND CENTER! */
                    <div className="p-4 sm:p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-bg-tertiary border border-border-default text-xs">
                        <div className="flex items-center gap-2.5 text-text-secondary">
                          <CheckCircle className="w-4 h-4 text-brand-primary shrink-0" />
                          <span>
                            <strong>Ledger Initialized:</strong> Double-entry escrow ledger is synchronized and awaiting community purchases.
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsKycModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Landmark className="w-3 h-3 text-brand-primary" />
                            <span>Verify Payout UPI / Bank</span>
                          </button>
                        </div>
                      </div>

                      {renderMonetizationRoadmap()}
                      {renderEarningsSimulator()}
                      {renderPromptsToMonetize()}
                      {renderSampleLedgerPreview()}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-default">
                        <span className="text-xs text-text-muted">
                          Ready to monetize? Publish your prompts to the verified marketplace in under 60 seconds.
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              sessionStorage.setItem('ph_create_for_sale', 'true');
                              setAppTab('create-prompt');
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-bold cursor-pointer shadow-xs transition-colors min-h-[44px] sm:min-h-[36px]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ List Prompt for Sale</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsKycModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-semibold cursor-pointer shadow-xs transition-colors min-h-[44px] sm:min-h-[36px]"
                          >
                            <Landmark className="w-3.5 h-3.5 text-brand-primary" />
                            <span>Payout Settings</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* If user has real transactions, also keep the simulator & roadmap below for easy reference */}
                {sellerAnalytics.earningsList.length > 0 && (
                  <div className="space-y-4 pt-2">
                    {renderEarningsSimulator()}
                    {renderMonetizationRoadmap()}
                  </div>
                )}
              </div>
            )}
      </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal with Dynamic Fee & Tax Transparency */}
      {typeof document !== 'undefined' && purchaseTargetPrompt && targetBreakdown && createPortal(
        <AnimatePresence>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[750] p-4 select-none"
            onClick={() => { if (!checkingOut) setPurchaseTargetPrompt(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-bg-secondary border border-border-default rounded-xl p-5 shadow-2xl space-y-4 text-left font-sans"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-text-primary">Complete Prompt Purchase</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  You are licensing <strong className="text-text-primary">"{purchaseTargetPrompt.title}"</strong> for commercial and personal prompt engineering use.
                </p>
              </div>

              {/* Order Summary & Commercial Licensing Details */}
              <div className="bg-bg-tertiary border border-border-default rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-text-secondary">
                  <span>Prompt:</span>
                  <span className="font-semibold text-text-primary truncate max-w-[200px]">{purchaseTargetPrompt.title}</span>
                </div>
                <div className="flex justify-between items-center text-text-secondary">
                  <span>License:</span>
                  <span className="font-mono text-emerald-700 font-semibold text-[11px]">Commercial &amp; Personal (Lifetime)</span>
                </div>
                <div className="flex justify-between items-center text-text-secondary">
                  <span>Creator:</span>
                  <span className="font-mono text-text-primary text-[11px]">
                    {purchaseTargetPrompt.authorName ? (purchaseTargetPrompt.authorName.startsWith('@') ? purchaseTargetPrompt.authorName : `@${purchaseTargetPrompt.authorName}`) : '@creator'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-border-default pt-2 text-sm font-bold text-text-primary">
                  <span>Total Amount:</span>
                  <span className="font-mono text-brand-primary text-base">₹{(purchaseTargetPrompt.priceInr || purchaseTargetPrompt.price || 0).toFixed(0)}</span>
                </div>
              </div>

              {/* Payment Gateway Selector */}
              <div className="pt-1">
                <PaymentGatewaySelector
                  selectedGateway={selectedGateway}
                  onSelectGateway={handleSelectGateway}
                  disabled={checkingOut}
                />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-text-muted">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Instant Unlock: The full raw prompt template &amp; variables will be added to your library immediately.</span>
              </div>

              <div className="flex gap-2 border-t border-border-default pt-3">
                <button
                  onClick={() => setPurchaseTargetPrompt(null)}
                  disabled={checkingOut}
                  className="flex-1 py-2 rounded-lg border border-border-default text-xs font-medium text-text-secondary hover:bg-bg-tertiary cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCheckout}
                  disabled={checkingOut}
                  className="flex-1 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-70 min-h-[44px]"
                >
                  {checkingOut ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing Razorpay...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>License for ₹{(purchaseTargetPrompt.priceInr || purchaseTargetPrompt.price || 0).toFixed(0)} with Razorpay</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* Seller Verification / KYC Modal */}
      <SellerVerificationModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onVerificationSubmitted={() => refreshSellerData()}
      />

      {/* Rich Prompt Preview Modal */}
      <PromptPreviewModal
        isOpen={Boolean(previewTargetPrompt)}
        onClose={handleClosePreview}
        prompt={previewTargetPrompt}
        onFork={(p) => handleFork(p)}
        onPurchase={(p) => handlePurchase(p)}
      />

      {/* Safety & Compliance Report Modal */}
      <ReportPromptModal
        isOpen={Boolean(reportingPrompt)}
        onClose={() => setReportingPrompt(null)}
        promptId={reportingPrompt?.id || ''}
        promptTitle={reportingPrompt?.title}
        authorId={reportingPrompt?.authorId}
        authorName={reportingPrompt?.authorName}
      />

      {/* Real-time Comments & Discussion Modal */}
      {commentsTarget && (
        <CommentsModal
          isOpen={Boolean(commentsTarget)}
          onClose={() => setCommentsTarget(null)}
          targetId={commentsTarget.id}
          targetType="prompt"
          targetTitle={commentsTarget.title}
          onCommentAdded={(newCount) => {
            if (commentsTarget) {
              setPaginatedPrompts(prev => prev.map(p => p.id === commentsTarget.id ? { ...p, commentsCount: newCount } : p));
              setPreviewTargetPrompt(prev => prev && prev.id === commentsTarget.id ? { ...prev, commentsCount: newCount } : prev);
              setCommentsTarget(prev => prev ? { ...prev, commentsCount: newCount } : null);
            }
          }}
        />
      )}
    </div>
  );
};

export default MarketplaceView;
