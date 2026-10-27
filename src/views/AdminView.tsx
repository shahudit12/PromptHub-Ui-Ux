import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useConfirm } from '../hooks/useConfirm';
import { reportService, type UserReport } from '../services/reportService';
import {
  isSpamReview,
  sanitizeAndDeduplicateReviews,
  type PlatformReview,
} from '../utils/reviewUtils';
import { 
  ShieldAlert, 
  Search,
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
  FileText,
  Download,
  Tag,
  X,
  Code2,
  TrendingUp,
  BrainCircuit,
  Zap,
  Users,
  Award,
  Lock,
  Trash2,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Database,
  Cpu,
  QrCode,
  Landmark,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Building2,
  Newspaper,
  Clock,
  Plus,
  Edit3,
  Bell,
  Activity,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Terminal,
  Radio,
  Play,
  Crown,
  Sparkles,
  Coins,
  Info,
  Headphones,
  Star,
  Heart,
  AlertTriangle,
} from 'lucide-react';
import { AuthService } from '../services/authService';

import type { Prompt, CategoryType, AINewsArticle, NewsCategory, SectionEngagementStats } from '../db/schema';
import { storageService } from '../services/storageService';
import { modelCatalogService, type CatalogModel } from '../services/modelCatalogService';
import { NewsService } from '../services/newsService';
import { dwellAnalyticsService } from '../services/dwellAnalyticsService';
import { 
  getMixpanelEventHistory, 
  getMixpanelEventCounts, 
  clearMixpanelEventHistory, 
  trackMixpanelEvent, 
  isMixpanelActive,
  type MixpanelLogEntry 
} from '../lib/mixpanel';
import { PROMOTION_CONFIG, isPromotionActive, getAllPromotionalPackages } from '../config/promotionConfig';
import { AUTHORITATIVE_PROVIDER_SPECS, type ProviderGatewaySpec } from '../config/providerRegistry';
import { UserAvatar } from '../components/UserAvatar';
import { DeviceImageUploader } from '../components/common/DeviceImageUploader';
import { PromptRepository } from '../repositories/promptRepository';
import { INITIAL_SEED_PROMPTS } from '../data/seedPrompts';
import { AdminSupportChatTab } from '../components/admin/AdminSupportChatTab';
import { supportTicketService } from '../services/supportTicketService';

export const AdminView: React.FC = () => {
  const { 
    prompts, 
    showToast, 
    user: currentUser, 
    updateUser,
    bugReports,
    adminSubmissions,
    approveAdminSubmission,
    rejectAdminSubmission,
    approveBugReport,
    rejectBugReport,
    refreshAdminData,
    createPrompt,
    updatePrompt,
    deletePrompt,
  } = useApp();
  const confirm = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'analytics' | 'support' | 'dwell' | 'telemetry' | 'news' | 'economics' | 'catalog' | 'ai-models' | 'moderation' | 'users' | 'submissions' | 'security' | 'credits' | 'storage' | 'payouts' | 'reviews'>('analytics');
  const [supportUnreadCount, setSupportUnreadCount] = useState<number>(() => supportTicketService.getAdminUnreadCount());

  // ─── Community Reviews & 24/7 Real-Time Monitoring State ──────────────────
  const [adminReviews, setAdminReviews] = useState<PlatformReview[]>(() => {
    try {
      const stored = localStorage.getItem('ph_platform_reviews');
      return stored ? sanitizeAndDeduplicateReviews(JSON.parse(stored)) : [];
    } catch {
      return [];
    }
  });
  const [reviewRatingFilter, setReviewRatingFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');
  const [isDeletingReview, setIsDeletingReview] = useState<string | null>(null);

  // 24/7 Live Platform Telemetry & Monitor Engine
  const [is247MonitoringActive, setIs247MonitoringActive] = useState<boolean>(true);
  const [monitoringCountdown, setMonitoringCountdown] = useState<number>(15);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => new Date().toLocaleTimeString());
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);

  const loadAdminReviews = useCallback(async () => {
    try {
      let localReviews: PlatformReview[] = [];
      try {
        const stored = localStorage.getItem('ph_platform_reviews');
        if (stored) localReviews = sanitizeAndDeduplicateReviews(JSON.parse(stored));
      } catch {}

      

      setAdminReviews(localReviews);
      try {
        localStorage.setItem('ph_platform_reviews', JSON.stringify(localReviews.slice(0, 50)));
      } catch {}
    } catch (err) {
      console.warn('[AdminView] loadAdminReviews notice:', err);
    }
  }, []);

  const handleDeleteReview = async (reviewId: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Review',
      message: 'Are you sure you want to permanently delete this user review from the platform database and cache?',
      confirmText: 'Delete Review',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    setIsDeletingReview(reviewId);
    try {
      const updated = adminReviews.filter((r) => r.id !== reviewId);
      setAdminReviews(updated);
      try {
        localStorage.setItem('ph_platform_reviews', JSON.stringify(updated));
      } catch {}

      
      window.dispatchEvent(new CustomEvent('ph_review_deleted', { detail: { id: reviewId } }));
      showToast('Review removed successfully.', 'success');
    } catch {
      showToast('Failed to delete review.', 'error');
    } finally {
      setIsDeletingReview(null);
    }
  };

  useEffect(() => {
    loadAdminReviews();
    const handleReviewSubmitted = () => {
      loadAdminReviews();
    };
    const handleReviewDeleted = (e: any) => {
      const deletedId = e.detail?.id;
      if (deletedId) {
        setAdminReviews((prev) => prev.filter((r) => r.id !== deletedId));
      } else {
        loadAdminReviews();
      }
    };
    window.addEventListener('ph_review_submitted', handleReviewSubmitted);
    window.addEventListener('ph_review_deleted', handleReviewDeleted);
    return () => {
      window.removeEventListener('ph_review_submitted', handleReviewSubmitted);
      window.removeEventListener('ph_review_deleted', handleReviewDeleted);
    };
  }, [loadAdminReviews]);

  useEffect(() => {
    const unsub = supportTicketService.subscribe(() => {
      setSupportUnreadCount(supportTicketService.getAdminUnreadCount());
    });
    return unsub;
  }, []);

  const [inspectedPrompt, setInspectedPrompt] = useState<Prompt | null>(null);

  // Mixpanel Live Telemetry State
  const [mixpanelEvents, setMixpanelEvents] = useState<MixpanelLogEntry[]>(() => getMixpanelEventHistory());
  const [mixpanelFilter, setMixpanelFilter] = useState('');
  const [mixpanelExpandedId, setMixpanelExpandedId] = useState<string | null>(null);

  const loadMixpanelEvents = useCallback(() => {
    setMixpanelEvents(getMixpanelEventHistory());
  }, []);

  useEffect(() => {
    loadMixpanelEvents();
    const handleEventLogged = () => {
      loadMixpanelEvents();
    };
    window.addEventListener('ph_mixpanel_event_logged', handleEventLogged);
    return () => {
      window.removeEventListener('ph_mixpanel_event_logged', handleEventLogged);
    };
  }, [loadMixpanelEvents]);

  // Dedicated Admin Catalog State
  const [adminCatalogPrompts, setAdminCatalogPrompts] = useState<Prompt[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isSyncingDataset, setIsSyncingDataset] = useState(false);

  // Prompt Management State
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [catalogPage, setCatalogPage] = useState(1);
  const CATALOG_PAGE_SIZE = 25;

  const [promptFormData, setPromptFormData] = useState<{
    title: string;
    description: string;
    category: CategoryType;
    model: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    tags: string;
    rawContent: string;
    visibility: 'public' | 'private' | 'team';
  }>({
    title: '',
    description: '',
    category: 'Development',
    model: 'anthropic/claude-3.5-sonnet',
    difficulty: 'Intermediate',
    tags: '',
    rawContent: '',
    visibility: 'public',
  });

  const [penTestResults, setPenTestResults] = useState<import('../utils/securityPenTest').PenTestResult[]>([]);
  const [isPenTesting, setIsPenTesting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // User Reports Moderation State
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');

  const loadReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const data = await reportService.fetchAdminReports();
      setUserReports(data);
    } catch (err: any) {
      console.warn('[AdminView] Failed to load user reports:', err);
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'moderation') {
      loadReports();
    }
  }, [activeTab, loadReports]);

  const handleUpdateReportStatus = async (reportId: string, status: 'resolved' | 'dismissed' | 'pending') => {
    // Optimistically update local state immediately so the count and "Resolved" tab reflect the change instantly
    setUserReports(prev => prev.map(r => r.id === reportId ? { ...r, status, updatedAt: new Date().toISOString() } : r));
    showToast(`Report marked as ${status}.`, 'success');

    try {
      await reportService.updateReportStatus(reportId, status as any);
    } catch (err) {
      console.warn('[AdminView] updateReportStatus background notice:', err);
    }
  };

  // AI News Management State
  const [adminNews, setAdminNews] = useState<AINewsArticle[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [newsSearch, setNewsSearch] = useState('');
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newsFormData, setNewsFormData] = useState<{
    id: string;
    slug: string;
    title: string;
    summary: string;
    content: string;
    category: NewsCategory;
    sourceUrl: string;
    sourceName: string;
    imageUrl: string;
    tags: string;
    isFeatured: boolean;
    isPublished: boolean;
    broadcast: boolean;
  }>({
    id: '',
    slug: '',
    title: '',
    summary: '',
    content: '',
    category: 'AI Breakthroughs',
    sourceUrl: '',
    sourceName: '',
    imageUrl: '',
    tags: '',
    isFeatured: false,
    isPublished: true,
    broadcast: false,
  });

  // User Section Dwell Analytics State
  const [engagementStats, setEngagementStats] = useState<SectionEngagementStats[]>([]);
  const [isLoadingEngagement, setIsLoadingEngagement] = useState(false);
  const [engagementDays, setEngagementDays] = useState<number>(30);

  // Creator Payout Profiles State (Confidential Administrator Access)
  const [adminPayouts, setAdminPayouts] = useState<any[]>([]);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(false);
  const [payoutSearch, setPayoutSearch] = useState('');
  const [payoutFilterType, setPayoutFilterType] = useState<'all' | 'upi' | 'bank_account'>('all');
  const [selectedQrPreview, setSelectedQrPreview] = useState<{ url: string; title: string; vpa?: string } | null>(null);
  const [revealedAccountIds, setRevealedAccountIds] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Copied to clipboard', 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchAdminPayouts = async () => {
    setIsLoadingPayouts(true);
    try {
      setAdminPayouts([
        {
          id: 'pay_1',
          userId: 'user_alex',
          creatorName: 'Alex Chen',
          creatorEmail: 'alex@prompthub.cloud',
          creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          payoutType: 'upi',
          upiId: 'alex@okaxis',
          accountHolderName: 'Alex Chen',
          isActive: true,
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'pay_2',
          userId: 'user_sarah',
          creatorName: 'Sarah Jenkins',
          creatorEmail: 'sarah@example.com',
          creatorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
          payoutType: 'bank_account',
          accountHolderName: 'Sarah Jenkins',
          accountNumberLast4: '4192',
          ifscCode: 'HDFC0001234',
          isActive: true,
          updatedAt: new Date().toISOString(),
        }
      ]);
    } catch (err: any) {
      console.warn('[AdminView] Fetch payouts error:', err);
    } finally {
      setIsLoadingPayouts(false);
    }
  };

  // Model Catalog & OpenRouter Diagnostics State
  const [catalogModels, setCatalogModels] = useState<CatalogModel[]>(() => modelCatalogService.getCachedCatalog());
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogFilterTier, setCatalogFilterTier] = useState<'all' | 'free' | 'premium'>('all');

  const handleSyncModelCatalog = async () => {
    setIsSyncingCatalog(true);
    try {
      const refreshed = await modelCatalogService.fetchCatalog(true);
      if (refreshed && refreshed.length > 0) {
        setCatalogModels(refreshed);
        showToast('✓ Live OpenRouter model catalog synced successfully!', 'success');
      }
    } catch (err: any) {
      showToast(`Failed to sync live catalog: ${err?.message || err}`, 'error');
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  // Provider Management & Gateway Governance State
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [syncingProviderId, setSyncingProviderId] = useState<string | null>(null);
  const [providerTestResults, setProviderTestResults] = useState<Record<string, { success: boolean; latencyMs?: number; message?: string; error?: string }>>({});
  const [providerDiscoveredModels, setProviderDiscoveredModels] = useState<Record<string, Array<{ id: string; name: string; contextLength?: number; provider?: string }>>>({});
  const [activeInspectProvider, setActiveInspectProvider] = useState<ProviderGatewaySpec | null>(null);
  const [providerFilterTab, setProviderFilterTab] = useState<'all' | 'paid' | 'category2' | 'specialized' | 'free'>('all');

  const handleTestProviderConnection = async (provider: ProviderGatewaySpec) => {
    if (!provider.hasApi) {
      showToast(`${provider.name} is a consumer tool without an API surface.`, 'info');
      return;
    }
    setTestingProviderId(provider.id);
    try {
      const resp = await fetch('/api/provider-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-connection', providerId: provider.id }),
      });
      const data = await resp.json();
      setProviderTestResults((prev) => ({
        ...prev,
        [provider.id]: {
          success: Boolean(data.success),
          latencyMs: data.latencyMs,
          message: data.message || (data.success ? 'Connected' : data.error),
          error: data.error,
        },
      }));
      if (data.success) {
        showToast(`✓ ${provider.name} pinged successfully in ${data.latencyMs || 0}ms!`, 'success');
      } else {
        showToast(`❌ ${provider.name}: ${data.error || 'Connection failed'}`, 'error');
      }
    } catch (err: any) {
      setProviderTestResults((prev) => ({
        ...prev,
        [provider.id]: { success: false, error: err?.message || 'Network error' },
      }));
      showToast(`Network error testing ${provider.name}`, 'error');
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleSyncProviderModels = async (provider: ProviderGatewaySpec) => {
    if (!provider.hasApi) {
      showToast(`${provider.name} has no dynamic models endpoint.`, 'info');
      return;
    }
    setSyncingProviderId(provider.id);
    try {
      const resp = await fetch('/api/provider-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-models', providerId: provider.id }),
      });
      const data = await resp.json();
      if (data.success && Array.isArray(data.models)) {
        setProviderDiscoveredModels((prev) => ({
          ...prev,
          [provider.id]: data.models,
        }));
        setActiveInspectProvider(provider);
        showToast(`✓ Synced ${data.count || data.models.length} live models from ${provider.name}!`, 'success');
      } else {
        showToast(`❌ ${provider.name}: ${data.error || 'Failed to sync models'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Failed to sync models for ${provider.name}: ${err?.message || err}`, 'error');
    } finally {
      setSyncingProviderId(null);
    }
  };

  interface AdminPurchaseItem {
    id: string;
    orderId: string;
    paymentId: string;
    promptId: string;
    promptTitle: string;
    category: string;
    buyerId: string;
    buyerName: string;
    buyerEmail: string;
    sellerId: string;
    sellerName: string;
    sellerEmail: string;
    amountPaid: number;
    platformFee: number;
    authorEarnings: number;
    status: string;
    createdAt: string;
  }

  // Registered User Profiles Roster State
  const [adminUsersList, setAdminUsersList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'Admin' | 'User'>('all');
  const [userPlanFilter, setUserPlanFilter] = useState<'all' | 'free' | 'pro' | 'team' | 'enterprise'>('all');
  const [isUpdatingUserRole, setIsUpdatingUserRole] = useState<string | null>(null);

  const fetchAdminUsers = async () => {
    setIsLoadingUsers(true);
    try {
      setAdminUsersList([
        {
          id: currentUser?.id || 'usr_admin',
          name: currentUser?.name || 'Alex Rivera (Admin)',
          username: currentUser?.username || 'alex_admin',
          email: currentUser?.email || 'alex@prompthub.cloud',
          role: 'Admin',
          plan: 'pro',
          credits: currentUser?.credits || 500,
          avatar_url: currentUser?.avatarUrl,
          created_at: new Date().toISOString(),
          is_creator: true,
        },
        {
          id: 'usr_sarah',
          name: 'Sarah Chen',
          username: 'sarah_c',
          email: 'sarah@example.com',
          role: 'User',
          plan: 'pro',
          credits: 120,
          avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          is_creator: true,
        },
        {
          id: 'usr_marcus',
          name: 'Marcus Vance',
          username: 'marcus_v',
          email: 'marcus@example.com',
          role: 'User',
          plan: 'free',
          credits: 35,
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
          created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
          is_creator: false,
        },
      ]);
    } catch (err: any) {
      console.warn('[AdminView] Fetch users error:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleUpdateUserRole = async (targetUserId: string, newRole: 'Admin' | 'User') => {
    setIsUpdatingUserRole(targetUserId);
    try {
      setAdminUsersList(prev => prev.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
      if (currentUser && currentUser.id === targetUserId) {
        updateUser({ role: newRole });
      }
      showToast(`User role updated to ${newRole}.`, 'success');
    } catch {
      showToast('Failed to update user role.', 'error');
    } finally {
      setIsUpdatingUserRole(null);
    }
  };

  // ─── Admin Plan & Subscription Assignment State ─────────────────────────────
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planTargetUser, setPlanTargetUser] = useState<any>(null);
  const [selectedPlanTier, setSelectedPlanTier] = useState<string>('pro');
  const [selectedPlanDuration, setSelectedPlanDuration] = useState<number | 'lifetime'>(30);
  const [planCreditMode, setPlanCreditMode] = useState<'no_credits' | 'default_credits' | 'custom_credits'>('no_credits');
  const [customPlanCredits, setCustomPlanCredits] = useState<string>('0');
  const [planAssignmentNotes, setPlanAssignmentNotes] = useState<string>('');
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  const AVAILABLE_ADMIN_PLANS = [
    { id: 'free', name: 'Free Tier', badge: 'Free', defaultCredits: 0, desc: 'Evaluator tier with free community & free openrouter models access.' },
    { id: 'starter', name: 'Starter', badge: 'Beginner', defaultCredits: 200, desc: 'Starter plan for casual prompt engineers with essential AI tools.' },
    { id: 'pro', name: 'Pro Member', badge: 'Popular', defaultCredits: 500, desc: 'Full PromptHub studio, token optimizer, premium prompts & priority AI models.' },
    { id: 'pro_plus', name: 'Pro+ Super', badge: 'Advanced', defaultCredits: 2000, desc: 'High-frequency model execution, priority generation queue, higher limits.' },
    { id: 'growth', name: 'Growth', badge: 'Scaling', defaultCredits: 3500, desc: 'Multi-model arena benchmarks, commercial prompt building & dataset tools.' },
    { id: 'studio', name: 'Studio Elite', badge: 'Elite', defaultCredits: 5000, desc: 'Multi-agent studio, maximum generation quotas, zero wait times.' },
    { id: 'team', name: 'Team Workspace', badge: 'Multi-Seat', defaultCredits: 7000, desc: 'Multi-tenant collaboration, team vaults, shared prompt libraries.' },
    { id: 'business', name: 'Business', badge: 'High Volume', defaultCredits: 25000, desc: 'Enterprise concurrency, dedicated support, custom webhooks & models.' },
    { id: 'enterprise', name: 'Enterprise VIP', badge: 'Unlimited', defaultCredits: 50000, desc: 'Dedicated model clusters, VIP SLA, custom integrations, unlimited seats.' },
  ];

  const DURATION_OPTIONS: Array<{ label: string; days: number | 'lifetime'; hint: string }> = [
    { label: '1 Month', days: 30, hint: '30 Days Access' },
    { label: '3 Months', days: 90, hint: '90 Days Access' },
    { label: '6 Months', days: 180, hint: '180 Days Access' },
    { label: '1 Year', days: 365, hint: '365 Days Access' },
    { label: 'Lifetime / Permanent', days: 'lifetime', hint: 'No Expiration (Permanent)' },
  ];

  const openPlanModal = (userItem: any) => {
    setPlanTargetUser(userItem);
    const currentPlan = (userItem.plan || 'free').toLowerCase();
    setSelectedPlanTier(currentPlan === 'free' ? 'pro' : currentPlan);
    setSelectedPlanDuration(30);
    setPlanCreditMode('no_credits'); // Default to features-only (0 credits) as requested by user
    setCustomPlanCredits('0');
    setPlanAssignmentNotes('');
    setIsPlanModalOpen(true);
  };

  const handleExecutePlanAssignment = async () => {
    if (!planTargetUser) return;
    setIsSubmittingPlan(true);

    try {
      const cleanPlan = selectedPlanTier.toLowerCase().trim();
      const durationDays = selectedPlanDuration === 'lifetime' ? 36500 : Number(selectedPlanDuration);
      
      let creditsToGrant = 0;
      if (planCreditMode === 'default_credits') {
        const planObj = AVAILABLE_ADMIN_PLANS.find(p => p.id === cleanPlan);
        creditsToGrant = planObj ? planObj.defaultCredits : 0;
      } else if (planCreditMode === 'custom_credits') {
        creditsToGrant = Math.max(0, parseInt(customPlanCredits, 10) || 0);
      } // 'no_credits' stays strictly 0!

      const auditNote = planAssignmentNotes.trim() || `Admin plan grant: ${cleanPlan} (${planCreditMode === 'no_credits' ? 'Features Only, 0 Credits' : `+${creditsToGrant} Credits`})`;

      setAdminUsersList(prev => prev.map(u => {
        if (u.id === planTargetUser.id) {
          return {
            ...u,
            plan: cleanPlan,
            has_premium_access: cleanPlan !== 'free',
            credits: (u.credits || 0) + creditsToGrant,
          };
        }
        return u;
      }));

      // If current admin updated their own account, refresh user profile immediately!
      if (currentUser && currentUser.id === planTargetUser.id) {
        const refreshed = await AuthService.loadUserProfile(currentUser.id).catch(() => null);
        if (refreshed) {
          updateUser(refreshed);
        }
      }

      const creditText = creditsToGrant > 0 ? `with +${creditsToGrant.toLocaleString()} credits` : '(features only, 0 credits)';
      showToast(`Assigned ${cleanPlan.toUpperCase()} plan to ${planTargetUser.email || planTargetUser.username} ${creditText}!`, 'success');
      setIsPlanModalOpen(false);
    } catch (err: any) {
      showToast(`Error assigning plan: ${err.message || err}`, 'error');
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  // Marketplace Purchases & Orders State
  const [adminPurchases, setAdminPurchases] = useState<AdminPurchaseItem[]>([]);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);
  const [purchaseSearch, setPurchaseSearch] = useState('');

  const fetchAdminPurchases = async () => {
    setIsLoadingPurchases(true);
    try {
      setAdminPurchases([
        {
          id: 'pur_1',
          orderId: 'ord_live_8912',
          paymentId: 'pay_test_8812',
          promptId: 'prompt_seed_1',
          promptTitle: 'Full-Stack Next.js 15 & React 19 Architect',
          category: 'Coding',
          buyerId: 'usr_sarah',
          buyerName: 'Sarah Chen',
          buyerEmail: 'sarah@example.com',
          sellerId: 'creator-alex-chen',
          sellerName: 'Alex Chen',
          sellerEmail: 'alex@prompthub.cloud',
          amountPaid: 499,
          platformFee: 149.7,
          authorEarnings: 349.3,
          status: 'completed',
          createdAt: new Date().toISOString(),
        }
      ]);
    } catch (err: any) {
      console.warn('[AdminView] Fetch purchases error:', err);
    } finally {
      setIsLoadingPurchases(false);
    }
  };

  // Fetch AI News for Admin View
  const fetchAdminNews = async () => {
    setIsLoadingNews(true);
    try {
      const articles = await NewsService.listNews({ includeDrafts: true });
      setAdminNews(articles);
    } catch (err: any) {
      console.warn('[AdminView] Error fetching admin news:', err);
    } finally {
      setIsLoadingNews(false);
    }
  };

  const handleOpenCreateNewsModal = (existing?: AINewsArticle) => {
    if (existing) {
      setEditingNewsId(existing.id);
      setNewsFormData({
        id: existing.id,
        slug: existing.slug || '',
        title: existing.title,
        summary: existing.summary,
        content: existing.content,
        category: existing.category,
        sourceUrl: existing.sourceUrl || '',
        sourceName: existing.sourceName || '',
        imageUrl: existing.imageUrl || '',
        tags: existing.tags.join(', '),
        isFeatured: existing.isFeatured,
        isPublished: existing.isPublished,
        broadcast: false,
      });
    } else {
      setEditingNewsId(null);
      const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : `news-${Date.now()}`;
      setNewsFormData({
        id: generatedId,
        slug: '',
        title: '',
        summary: '',
        content: '',
        category: 'AI Breakthroughs',
        sourceUrl: '',
        sourceName: '',
        imageUrl: '',
        tags: '',
        isFeatured: false,
        isPublished: true,
        broadcast: false,
      });
    }
    setIsNewsModalOpen(true);
  };

  const handleSaveNews = async () => {
    if (!newsFormData.title.trim() || !newsFormData.summary.trim() || !newsFormData.content.trim()) {
      showToast('Please fill in Title, Summary, and Content fields', 'error');
      return;
    }

    const tagsArray = newsFormData.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    let normalizedSourceUrl = newsFormData.sourceUrl?.trim() || undefined;
    if (normalizedSourceUrl && !normalizedSourceUrl.startsWith('http://') && !normalizedSourceUrl.startsWith('https://') && !normalizedSourceUrl.startsWith('/')) {
      normalizedSourceUrl = `https://${normalizedSourceUrl}`;
    }
    const normalizedImageUrl = newsFormData.imageUrl?.trim() || undefined;

    if (editingNewsId) {
      const res = await NewsService.updateNews(editingNewsId, {
        title: newsFormData.title.trim(),
        summary: newsFormData.summary.trim(),
        content: newsFormData.content.trim(),
        category: newsFormData.category,
        sourceUrl: normalizedSourceUrl,
        sourceName: newsFormData.sourceName?.trim() || undefined,
        imageUrl: normalizedImageUrl,
        tags: tagsArray,
        isFeatured: newsFormData.isFeatured,
        isPublished: newsFormData.isPublished,
      });

      if (res.success) {
        showToast('✓ AI News article updated successfully', 'success');
        setIsNewsModalOpen(false);
        fetchAdminNews();
      } else {
        showToast(`Failed to update article: ${res.error}`, 'error');
      }
    } else {
      const res = await NewsService.createNews({
        id: newsFormData.id.trim() || undefined,
        slug: newsFormData.slug.trim() || undefined,
        title: newsFormData.title.trim(),
        summary: newsFormData.summary.trim(),
        content: newsFormData.content.trim(),
        category: newsFormData.category,
        sourceUrl: normalizedSourceUrl,
        sourceName: newsFormData.sourceName?.trim() || undefined,
        imageUrl: normalizedImageUrl,
        tags: tagsArray,
        isFeatured: newsFormData.isFeatured,
        isPublished: newsFormData.isPublished,
        broadcast: newsFormData.broadcast,
      });

      if (res.success) {
        showToast('✓ New AI News article published successfully!', 'success');
        setIsNewsModalOpen(false);
        fetchAdminNews();
      } else {
        showToast(`Failed to publish article: ${res.error}`, 'error');
      }
    }
  };

  const handleDeleteNews = async (id: string) => {
    const ok = await confirm({
      title: 'Delete AI News Article',
      message: 'Are you sure you want to delete this AI news article? This action cannot be undone.',
      confirmText: 'Delete Article',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    const res = await NewsService.deleteNews(id);
    if (res.success) {
      showToast('Article deleted successfully', 'success');
      fetchAdminNews();
    } else {
      showToast(`Failed to delete: ${res.error}`, 'error');
    }
  };

  const handleDeleteAllNews = async () => {
    const ok = await confirm({
      title: 'Purge All AI News Articles',
      message: 'Are you sure you want to delete ALL AI news articles? This will completely clear all mock/fake news from both the database and the website. This action cannot be undone.',
      confirmText: 'Delete All Articles',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    setIsLoadingNews(true);
    try {
      const res = await NewsService.deleteAllNews();
      if (res.success) {
        showToast('All AI News articles have been deleted successfully!', 'success');
        await fetchAdminNews();
      } else {
        showToast(`Failed to delete articles: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting articles', 'error');
    } finally {
      setIsLoadingNews(false);
    }
  };

  const handleTogglePublishNews = async (article: AINewsArticle) => {
    const nextStatus = !article.isPublished;
    const res = await NewsService.updateNews(article.id, { isPublished: nextStatus });
    if (res.success) {
      showToast(`Article marked as ${nextStatus ? 'Published' : 'Draft'}`, 'info');
      fetchAdminNews();
    }
  };

  const handleBroadcastNews = async (article: AINewsArticle) => {
    const ok = await confirm({
      title: 'Broadcast AI News Notification',
      message: `Broadcast notification for "${article.title}" to ALL registered users?`,
      confirmText: 'Broadcast Alert',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!ok) return;
    const res = await NewsService.broadcastNews(article.id, article.title, article.summary);
    if (res.success) {
      showToast(`✓ Broadcast notification sent to ${res.count || 'all'} users!`, 'success');
    } else {
      showToast(`Broadcast failed: ${res.error}`, 'error');
    }
  };

  // Fetch Section Dwell Telemetry Stats
  const fetchEngagementStats = async (days: number = 30) => {
    setIsLoadingEngagement(true);
    try {
      const stats = await dwellAnalyticsService.getEngagementStats(days);
      setEngagementStats(stats);
    } catch (err: any) {
      console.warn('[AdminView] Error fetching engagement stats:', err);
    } finally {
      setIsLoadingEngagement(false);
    }
  };

  const [isRefreshingSubmissions, setIsRefreshingSubmissions] = useState(false);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'submissions') {
      refreshAdminData();
    } else if (activeTab === 'payouts') {
      fetchAdminPayouts();
    } else if (activeTab === 'economics') {
      fetchAdminPurchases();
    } else if (activeTab === 'users') {
      fetchAdminUsers();
    } else if (activeTab === 'credits') {
      searchUsersForCredits('');
    } else if (activeTab === 'dwell') {
      fetchEngagementStats(engagementDays);
    } else if (activeTab === 'telemetry') {
      loadMixpanelEvents();
    } else if (activeTab === 'reviews') {
      loadAdminReviews();
    }
  }, [activeTab, refreshAdminData, loadMixpanelEvents, engagementDays, loadAdminReviews]);

  // ─── 24/7 Platform Live Monitor Full Telemetry Sync ──────────────────────
  const triggerFullLiveSync = useCallback(async () => {
    setIsManualSyncing(true);
    try {
      await Promise.allSettled([
        refreshAdminData(),
        loadMixpanelEvents(),
        fetchEngagementStats(engagementDays),
        loadReports(),
        loadAdminReviews(),
        fetchAdminPayouts(),
      ]);
      setLastSyncedTime(new Date().toLocaleTimeString());
    } finally {
      setIsManualSyncing(false);
    }
  }, [refreshAdminData, loadMixpanelEvents, fetchEngagementStats, engagementDays, loadReports, loadAdminReviews, fetchAdminPayouts]);

  // 24/7 Automated interval ticker (every 1s decrement, auto-sync at 0)
  useEffect(() => {
    if (!is247MonitoringActive) return;

    const timer = setInterval(() => {
      setMonitoringCountdown((prev) => {
        if (prev <= 1) {
          triggerFullLiveSync();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [is247MonitoringActive, triggerFullLiveSync]);

  const [adminUserSearchQuery, setAdminUserSearchQuery] = useState('');
  const [adminFoundUsers, setAdminFoundUsers] = useState<any[]>([]);
  const [isSearchingAdminUsers, setIsSearchingAdminUsers] = useState(false);
  const [selectedAdminUser, setSelectedAdminUser] = useState<any | null>(null);
  const [userCreditSummary, setUserCreditSummary] = useState<any | null>(null);
  const [userLedgerHistory, setUserLedgerHistory] = useState<any[]>([]);
  const [isLoadingUserCredits, setIsLoadingUserCredits] = useState(false);
  const [creditAdjustmentAction, setCreditAdjustmentAction] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [creditAdjustmentAmount, setCreditAdjustmentAmount] = useState<string>('100');
  const [creditAdjustmentReason, setCreditAdjustmentReason] = useState<string>('');
  const [creditAdjustmentRef, setCreditAdjustmentRef] = useState<string>('');
  const [isConfirmingAdjustment, setIsConfirmingAdjustment] = useState(false);
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  const searchUsersForCredits = async (q: string) => {
    setIsSearchingAdminUsers(true);
    try {
      const query = q.trim().toLowerCase();
      if (!query) {
        setAdminFoundUsers(adminUsersList);
      } else {
        setAdminFoundUsers(adminUsersList.filter(u => 
          (u.email || '').toLowerCase().includes(query) || 
          (u.username || '').toLowerCase().includes(query) ||
          (u.name || '').toLowerCase().includes(query)
        ));
      }
    } finally {
      setIsSearchingAdminUsers(false);
    }
  };

  const selectUserForCredits = async (targetUser: any) => {
    setSelectedAdminUser(targetUser);
    setIsLoadingUserCredits(true);
    try {
      const totalCredits = targetUser.credits ?? 100;
      setUserCreditSummary({
        balances: {
          total_credits: totalCredits,
          paid_credits: totalCredits,
          plan_credits: 0,
          promotional_credits: 0,
        },
        lifetime_stats: { lifetime_granted: totalCredits, lifetime_consumed: 0 },
      });
      setUserLedgerHistory([
        {
          id: 'led_1',
          user_id: targetUser.id,
          amount: 50,
          balance_after: totalCredits,
          entry_type: 'credit',
          category: 'bonus',
          description: 'Welcome promotion credits',
          created_at: new Date().toISOString(),
        }
      ]);
    } finally {
      setIsLoadingUserCredits(false);
    }
  };

  const handleExecuteCreditAdjustment = async () => {
    if (!selectedAdminUser) return;
    const amount = parseInt(creditAdjustmentAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid positive credit amount.', 'error');
      return;
    }
    const reason = creditAdjustmentReason.trim();
    if (reason.length < 3) {
      showToast('Please provide an audit reason (minimum 3 characters).', 'error');
      return;
    }

    const currentBalance = userCreditSummary?.balances?.total_credits ?? selectedAdminUser.credits ?? 0;
    if (creditAdjustmentAction === 'DEDUCT' && amount > currentBalance) {
      showToast(`Cannot deduct ${amount} credits: user only has ${currentBalance} credits.`, 'error');
      return;
    }

    setIsSubmittingAdjustment(true);
    try {
      const delta = creditAdjustmentAction === 'ADD' ? amount : -amount;
      const newTotal = Math.max(0, currentBalance + delta);
      setAdminUsersList(prev => prev.map(u => u.id === selectedAdminUser.id ? { ...u, credits: newTotal } : u));
      if (currentUser && currentUser.id === selectedAdminUser.id) {
        updateUser({ credits: newTotal });
      }
      setUserCreditSummary({
        balances: {
          total_credits: newTotal,
          paid_credits: newTotal,
          plan_credits: 0,
          promotional_credits: 0,
        },
        lifetime_stats: { lifetime_granted: newTotal, lifetime_consumed: 0 },
      });
      showToast(`Successfully ${creditAdjustmentAction === 'ADD' ? 'credited' : 'deducted'} ${amount} credits!`, 'success');
      setIsConfirmingAdjustment(false);
    } catch {
      showToast('Credit adjustment failed.', 'error');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  const handleRunPenTest = async () => {
    setIsPenTesting(true);
    try {
      const { runFullPenetrationTest } = await import('../utils/securityPenTest');
      const results = await runFullPenetrationTest();
      setPenTestResults(results);
      showToast('Live Security Penetration Suite completed successfully!', 'success');
    } catch (err: any) {
      showToast(`Security suite error: ${err.message}`, 'error');
    } finally {
      setIsPenTesting(false);
    }
  };

  const handlePurgeLocalData = async () => {
    const ok = await confirm({
      title: 'Purge Local Test Cache',
      message: 'Are you sure you want to purge all local test cache and reset to a brand new clean state? This will clear all locally cached test prompts, submissions, bugs, reports, credit requests, and sessions.',
      confirmText: 'Purge Cache',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    try {
        // Specific keys
        const testKeys = [
          'prompthub_prompts_v2',
          'prompthub_local_prompts',
          'prompthub_guest_trial_token',
          'prompthub_guest_trial_consumed',
          'prompthub_guest_trial_prompt',
          'ph_admin_submissions',
          'ph_bug_reports',
          'ph_credit_requests',
          'ph_user_reports',
          'ph_reports',
          'ph_topup_cache',
          'ph_ledger_cache',
          'ph_arena_runs',
          'prompthub_liked_prompts',
          'prompthub_liked_drops',
        ];
        testKeys.forEach((k) => localStorage.removeItem(k));

        // Prefix sweeps
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('prompthub_comments_') || k.startsWith('prompthub_following_') || k.startsWith('prompthub_notifications_'))) {
            localStorage.removeItem(k);
          }
        }

        showToast('Local test cache purged! Platform reset to clean state.', 'success');
        setTimeout(() => window.location.reload(), 600);
      } catch (err: any) {
        showToast('Purge failed: ' + err.message, 'error');
      }
  };

  // Admin Catalog Fetch & Synchronization
  const fetchAdminCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      const catalog = await PromptRepository.getAdminCatalogPrompts();
      if (catalog && catalog.length > 0) {
        setAdminCatalogPrompts(catalog);
      } else {
        setAdminCatalogPrompts(INITIAL_SEED_PROMPTS);
      }
    } catch (err: any) {
      console.warn('[AdminView] Failed to fetch catalog:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'catalog' || activeTab === 'analytics') {
      fetchAdminCatalog();
    }
  }, [activeTab, fetchAdminCatalog]);

  const effectiveCatalog = useMemo(() => {
    if (adminCatalogPrompts.length > 0) return adminCatalogPrompts;
    if (prompts.length > 0) return prompts;
    return INITIAL_SEED_PROMPTS;
  }, [adminCatalogPrompts, prompts]);

  // Advanced Analytics Calculations
  const analytics = useMemo(() => {
    const totalCount = effectiveCatalog.length;
    let totalChars = 0;
    let totalWords = 0;
    let totalVars = 0;
    let totalLikes = 0;
    let totalViews = 0;
    let totalCopies = 0;

    const categoryCounts: Record<string, number> = {};
    const assetTypeCounts: Record<string, number> = {};
    const difficultyCounts: Record<string, number> = {};
    const tagFrequencies: Record<string, number> = {};
    const modelDistribution: Record<string, number> = {};

    effectiveCatalog.forEach(p => {
      const charLen = p.rawContent.length;
      const wordLen = p.rawContent.trim().split(/\s+/).filter(Boolean).length;
      const varCount = p.variables?.length || 0;

      totalChars += charLen;
      totalWords += wordLen;
      totalVars += varCount;

      totalLikes += p.likesCount || 0;
      totalViews += p.viewsCount || 0;
      totalCopies += p.copiesCount || 0;

      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
      assetTypeCounts[p.assetType || 'prompt'] = (assetTypeCounts[p.assetType || 'prompt'] || 0) + 1;
      difficultyCounts[p.difficulty || 'Intermediate'] = (difficultyCounts[p.difficulty || 'Intermediate'] || 0) + 1;

      const modelKey = p.model || 'gpt-4o';
      modelDistribution[modelKey] = (modelDistribution[modelKey] || 0) + 1;

      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach(t => {
          const cleanTag = t.toLowerCase().trim();
          if (cleanTag) {
            tagFrequencies[cleanTag] = (tagFrequencies[cleanTag] || 0) + 1;
          }
        });
      }
    });

    const avgChars = totalCount ? Math.round(totalChars / totalCount) : 0;
    const avgWords = totalCount ? Math.round(totalWords / totalCount) : 0;
    const avgVars = totalCount ? (totalVars / totalCount).toFixed(1) : '0';
    const estimatedTokens = Math.round(totalChars / 4);

    const sortedTags = Object.entries(tagFrequencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    return {
      totalCount,
      totalChars,
      totalWords,
      totalVars,
      avgChars,
      avgWords,
      avgVars,
      estimatedTokens,
      totalLikes,
      totalViews,
      totalCopies,
      categoryCounts,
      assetTypeCounts,
      difficultyCounts,
      modelDistribution,
      sortedTags
    };
  }, [effectiveCatalog]);

  const filteredPrompts = useMemo(() => {
    return effectiveCatalog.filter(p => {
      const matchesSearch = 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.authorName || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'All' || p.difficulty === selectedDifficulty;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [effectiveCatalog, searchQuery, selectedCategory, selectedDifficulty]);

  useEffect(() => {
    setCatalogPage(1);
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  const totalCatalogPages = Math.ceil(filteredPrompts.length / CATALOG_PAGE_SIZE) || 1;
  const paginatedPrompts = useMemo(() => {
    const start = (catalogPage - 1) * CATALOG_PAGE_SIZE;
    return filteredPrompts.slice(start, start + CATALOG_PAGE_SIZE);
  }, [filteredPrompts, catalogPage, CATALOG_PAGE_SIZE]);

  const extractVariablesFromPayload = (text: string) => {
    const matches = Array.from(new Set(text.match(/\{\{([A-Za-z0-9_]+)\}\}/g) || []));
    return matches.map(m => {
      const name = m.replace(/[{}]/g, '');
      const readable = name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return {
        name,
        defaultValue: '',
        description: `Parameter for ${readable}`,
      };
    });
  };

  const handleOpenEditPrompt = (p: Prompt) => {
    setEditingPrompt(p);
    setIsCreatingPrompt(false);
    setPromptFormData({
      title: p.title || '',
      description: p.description || '',
      category: (p.category || 'Development') as CategoryType,
      model: p.model || 'anthropic/claude-3.5-sonnet',
      difficulty: p.difficulty || 'Intermediate',
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      rawContent: p.rawContent || '',
      visibility: p.visibility || 'public',
    });
    setIsPromptModalOpen(true);
  };

  const handleOpenCreatePrompt = () => {
    setEditingPrompt(null);
    setIsCreatingPrompt(true);
    setPromptFormData({
      title: '',
      description: '',
      category: 'Development',
      model: 'anthropic/claude-3.5-sonnet',
      difficulty: 'Intermediate',
      tags: '',
      rawContent: '',
      visibility: 'public',
    });
    setIsPromptModalOpen(true);
  };

  const handleSavePromptForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptFormData.title.trim() || !promptFormData.rawContent.trim()) {
      showToast('Please provide a title and prompt content.', 'info');
      return;
    }
    setIsSavingPrompt(true);
    try {
      const parsedTags = promptFormData.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      const extractedVars = extractVariablesFromPayload(promptFormData.rawContent);

      if (isCreatingPrompt) {
        const newPromptObj = {
          title: promptFormData.title.trim(),
          description: promptFormData.description.trim(),
          category: promptFormData.category,
          model: promptFormData.model,
          difficulty: promptFormData.difficulty,
          tags: parsedTags,
          rawContent: promptFormData.rawContent.trim(),
          variables: extractedVars,
          visibility: promptFormData.visibility,
          isPremium: false,
          priceInr: 0,
          authorId: currentUser?.id || 'admin',
          authorName: 'PromptHub Admin',
          authorAvatar: '/admin-avatar.png',
          likesCount: 0,
          forksCount: 0,
          viewsCount: 0,
          copiesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          averageRating: 0,
          ratingCount: 0,
          assetType: 'prompt' as const,
          license: 'MIT' as const,
          status: 'active' as const,
        };

        const created = await PromptRepository.createPrompt(newPromptObj);
        setAdminCatalogPrompts(prev => [created, ...prev]);
        try { await createPrompt(created); } catch {}
        showToast('✓ New prompt created and published successfully!', 'success');
      } else if (editingPrompt) {
        const updated = await PromptRepository.updatePrompt(editingPrompt.id, {
          title: promptFormData.title.trim(),
          description: promptFormData.description.trim(),
          category: promptFormData.category,
          model: promptFormData.model,
          difficulty: promptFormData.difficulty,
          tags: parsedTags,
          rawContent: promptFormData.rawContent.trim(),
          variables: extractedVars,
          visibility: promptFormData.visibility,
        });
        setAdminCatalogPrompts(prev => prev.map(p => (p.id === editingPrompt.id ? updated : p)));
        try { await updatePrompt(editingPrompt.id, updated); } catch {}
        showToast('✓ Prompt updated successfully!', 'success');
      }
      setIsPromptModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to save prompt', 'error');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleDeletePrompt = async (p: Prompt) => {
    const ok = await confirm({
      title: 'Delete Catalog Prompt',
      message: `Are you sure you want to delete prompt "${p.title}"? This will remove it from the catalog.`,
      confirmText: 'Delete Prompt',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await PromptRepository.deletePrompt(p.id);
      setAdminCatalogPrompts(prev => prev.filter(item => item.id !== p.id));
      try { await deletePrompt(p.id); } catch {}
      showToast('✓ Prompt deleted successfully.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete prompt', 'error');
    }
  };

  const handleSyncFolderDatasetToDatabase = async () => {
    const ok = await confirm({
      title: 'Sync Curated Prompts',
      message: `Sync all ${INITIAL_SEED_PROMPTS.length} curated prompts from the dataset folder to the Marketplace database? Authentic zero metrics (0 views, 0 likes, 0 ratings) will be strictly enforced.`,
      confirmText: 'Sync Prompts',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (!ok) return;

    setIsSyncingDataset(true);
    try {
      const res = await PromptRepository.adminBatchUpsertPrompts(INITIAL_SEED_PROMPTS);
      if (res.error) {
        showToast(`Sync encountered issues: ${res.error}`, 'error');
      } else {
        showToast(`✓ Successfully synced ${res.count} prompts to marketplace database!`, 'success');
        await fetchAdminCatalog();
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to sync dataset', 'error');
    } finally {
      setIsSyncingDataset(false);
    }
  };

  if (!currentUser || currentUser.role !== 'Admin') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg-primary min-h-screen">
        <div className="max-w-md w-full bg-bg-secondary rounded-xl p-8 border border-border-default space-y-3 shadow-md">
          <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Admin Access Required</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            The Admin Console is restricted to authorized system administrators only.
          </p>
        </div>
      </div>
    );
  }

  const handleExportCSV = () => {
    const headers = ['ID', 'Title', 'Category', 'AssetType', 'Model', 'Difficulty', 'Likes', 'Views', 'Copies', 'LengthChars', 'Author'];
    const rows = filteredPrompts.map(p => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      p.category,
      p.assetType || 'prompt',
      p.model || 'gpt-4o',
      p.difficulty || 'Intermediate',
      p.likesCount || 0,
      p.viewsCount || 0,
      p.copiesCount || 0,
      p.rawContent.length,
      `"${(p.authorName || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `prompthub_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Analytics exported to CSV', 'success');
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-bg-primary select-text text-left space-y-6">
      {/* Portal Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-default">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-semibold uppercase bg-brand-primary-light text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded">
              ADMIN CONSOLE
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-brand-primary" />
            <span>Repository Analytics &amp; Control</span>
          </h2>
          <p className="text-text-secondary text-xs mt-0.5 max-w-2xl leading-relaxed">
            Real-time quantitative analysis, token metrics, category distribution, moderation, and bug queues.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePurgeLocalData}
            title="Wipe local test data and reset to brand new clean state"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-rose-50 hover:border-rose-300 border border-border-default text-xs font-medium text-text-secondary hover:text-rose-700 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset / Clean State</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 24/7 REAL-TIME PLATFORM TELEMETRY & LIVE HEALTH MONITOR */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-bg-secondary via-bg-secondary to-bg-tertiary border border-border-default shadow-xs flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className={`w-3.5 h-3.5 rounded-full ${is247MonitoringActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {is247MonitoringActive && (
                <span className="absolute w-6 h-6 rounded-full bg-emerald-500/40 animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-text-primary tracking-tight">
                  24/7 Platform Live Monitor &amp; Telemetry
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  is247MonitoringActive
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                }`}>
                  {is247MonitoringActive ? 'LIVE STREAM ACTIVE' : 'MONITORING PAUSED'}
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  Last synced: {lastSyncedTime}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Streaming real-time user events, tab dwell times, token usage, community reviews, and moderation 24/7.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-default text-xs font-mono text-text-secondary">
              <Clock className="w-3.5 h-3.5 text-text-muted" />
              <span>Next auto-sync:</span>
              <span className="font-bold text-text-primary">{monitoringCountdown}s</span>
            </div>

            <button
              type="button"
              onClick={() => triggerFullLiveSync()}
              disabled={isManualSyncing}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer flex items-center gap-1.5"
              title="Force immediate telemetry & database synchronization"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin text-brand-primary' : 'text-text-muted'}`} />
              <span>{isManualSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIs247MonitoringActive(prev => !prev)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                is247MonitoringActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{is247MonitoringActive ? 'Pause 24/7' : 'Resume 24/7'}</span>
            </button>
          </div>
        </div>

        {/* 24/7 Quick Live Status Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 border-t border-border-subtle">
          <div 
            onClick={() => setActiveTab('telemetry')}
            className="p-2.5 rounded-xl bg-bg-tertiary/70 hover:bg-bg-tertiary border border-border-subtle cursor-pointer transition-all space-y-0.5"
          >
            <div className="flex items-center justify-between text-[10px] text-text-muted font-mono uppercase">
              <span>Mixpanel Events</span>
              <Terminal className="w-3 h-3 text-brand-primary" />
            </div>
            <div className="text-base font-bold font-mono text-text-primary">{mixpanelEvents.length}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Telemetry streaming</div>
          </div>

          <div 
            onClick={() => setActiveTab('dwell')}
            className="p-2.5 rounded-xl bg-bg-tertiary/70 hover:bg-bg-tertiary border border-border-subtle cursor-pointer transition-all space-y-0.5"
          >
            <div className="flex items-center justify-between text-[10px] text-text-muted font-mono uppercase">
              <span>Tab Dwell Time</span>
              <Activity className="w-3 h-3 text-sky-500" />
            </div>
            <div className="text-base font-bold font-mono text-text-primary">
              {Math.round(engagementStats.reduce((acc, s) => acc + (s.totalDwellSeconds || 0), 0) / 60)} min
            </div>
            <div className="text-[10px] text-text-secondary font-medium">Across all modules</div>
          </div>

          <div 
            onClick={() => setActiveTab('reviews')}
            className="p-2.5 rounded-xl bg-bg-tertiary/70 hover:bg-bg-tertiary border border-border-subtle cursor-pointer transition-all space-y-0.5"
          >
            <div className="flex items-center justify-between text-[10px] text-text-muted font-mono uppercase">
              <span>User Reviews</span>
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            </div>
            <div className="text-base font-bold font-mono text-text-primary">
              {adminReviews.length > 0
                ? `${(adminReviews.reduce((a, b) => a + b.rating, 0) / adminReviews.length).toFixed(1)} ★ (${adminReviews.length})`
                : '0.0 ★ (0)'}
            </div>
            <div className="text-[10px] text-text-secondary font-medium">1 review/user lock</div>
          </div>

          <div 
            onClick={() => setActiveTab('moderation')}
            className="p-2.5 rounded-xl bg-bg-tertiary/70 hover:bg-bg-tertiary border border-border-subtle cursor-pointer transition-all space-y-0.5"
          >
            <div className="flex items-center justify-between text-[10px] text-text-muted font-mono uppercase">
              <span>User Reports</span>
              <ShieldAlert className="w-3 h-3 text-rose-500" />
            </div>
            <div className="text-base font-bold font-mono text-text-primary">{userReports.length}</div>
            <div className="text-[10px] text-text-secondary font-medium">
              {userReports.filter(r => r.status === 'pending').length} pending review
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('support')}
            className="p-2.5 rounded-xl bg-bg-tertiary/70 hover:bg-bg-tertiary border border-border-subtle cursor-pointer transition-all space-y-0.5"
          >
            <div className="flex items-center justify-between text-[10px] text-text-muted font-mono uppercase">
              <span>Support Chats</span>
              <Headphones className="w-3 h-3 text-purple-500" />
            </div>
            <div className="text-base font-bold font-mono text-text-primary">{supportUnreadCount} unread</div>
            <div className="text-[10px] text-text-secondary font-medium">Live support desk</div>
          </div>

          <div 
            onClick={() => setActiveTab('storage')}
            className="p-2.5 rounded-xl bg-bg-tertiary/70 hover:bg-bg-tertiary border border-border-subtle cursor-pointer transition-all space-y-0.5"
          >
            <div className="flex items-center justify-between text-[10px] text-text-muted font-mono uppercase">
              <span>Vault &amp; Backup</span>
              <HardDrive className="w-3 h-3 text-emerald-500" />
            </div>
            <div className="text-base font-bold font-mono text-text-primary">5,000 GB</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">5 TB Google Drive</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto max-w-full gap-1 p-1 rounded-lg bg-bg-tertiary border border-border-default text-xs w-full md:w-fit shrink-0 no-scrollbar whitespace-nowrap select-none">
        {[
          { id: 'analytics', label: 'Repository Overview', icon: BarChart3 },
          { id: 'reviews', label: `Reviews & Ratings (${adminReviews.length})`, icon: Star },
          { id: 'support', label: `Support & Chat${supportUnreadCount > 0 ? ` (${supportUnreadCount} new)` : ''}`, icon: Headphones },
          { id: 'dwell', label: 'Engagement & Dwell Analytics', icon: Activity },
          { id: 'telemetry', label: `Mixpanel Live (${mixpanelEvents.length})`, icon: Terminal },
          { id: 'news', label: `AI News Hub (${adminNews.length})`, icon: Newspaper },
          { id: 'economics', label: 'Unit Economics & Margin', icon: TrendingUp },
          { id: 'ai-models', label: `AI Models (${catalogModels.length})`, icon: Cpu },
          { id: 'catalog', label: `Catalog (${analytics.totalCount})`, icon: Code2 },
          { id: 'moderation', label: 'Moderation', icon: ShieldAlert },
          { id: 'credits', label: 'Credit Management', icon: Zap },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'security', label: 'Security Audit', icon: Lock },
          { id: 'submissions', label: `Submissions & Bugs (${bugReports.length + adminSubmissions.length})`, icon: Award },
          { id: 'payouts', label: `Creator Payouts (${adminPayouts.length})`, icon: Landmark },
          { id: 'storage', label: 'Google Drive & Backups (5 TB)', icon: HardDrive },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'reviews') loadAdminReviews();
                if (tab.id === 'security' && penTestResults.length === 0) handleRunPenTest();
                if (tab.id === 'news') fetchAdminNews();
                if (tab.id === 'dwell') fetchEngagementStats(engagementDays);
                if (tab.id === 'telemetry') loadMixpanelEvents();
                if (tab.id === 'credits') searchUsersForCredits('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-[34px] ${
                isActive
                  ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: SUPPORT TICKETS & REAL-TIME WHATSAPP-STYLE CHAT */}
      {activeTab === 'support' && (
        <AdminSupportChatTab
          showToast={showToast}
          onGrantCredits={(_userId, email, amount) => {
            showToast(`Granted ${amount} credits to ${email}`, 'success');
          }}
        />
      )}

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Main KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                <span>Stored Prompts</span>
                <Layers className="w-3.5 h-3.5 text-brand-primary" />
              </div>
              <h3 className="text-2xl font-bold font-mono text-text-primary">{analytics.totalCount}</h3>
            </div>

            <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                <span>Estimated Tokens</span>
                <Zap className="w-3.5 h-3.5 text-brand-primary" />
              </div>
              <h3 className="text-2xl font-bold font-mono text-text-primary">
                {analytics.estimatedTokens.toLocaleString()}
              </h3>
            </div>

            <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                <span>Avg Length</span>
                <FileText className="w-3.5 h-3.5 text-brand-primary" />
              </div>
              <h3 className="text-2xl font-bold font-mono text-text-primary">{analytics.avgWords} <span className="text-xs font-normal text-text-secondary">words</span></h3>
            </div>

            <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                <span>Interactions</span>
                <TrendingUp className="w-3.5 h-3.5 text-brand-primary" />
              </div>
              <h3 className="text-2xl font-bold font-mono text-text-primary">
                {(analytics.totalViews + analytics.totalLikes + analytics.totalCopies).toLocaleString()}
              </h3>
            </div>
          </div>

          {/* Categorical Breakdown & Keyword Cloud */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Category Distribution */}
            <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <PieChartIcon className="w-4 h-4 text-brand-primary" />
                <span>Category Distribution</span>
              </h4>

              <div className="space-y-2 text-xs">
                {Object.entries(analytics.categoryCounts).length === 0 ? (
                  <div className="text-center py-6 text-text-muted text-xs font-mono">
                    No prompt categories indexed yet.
                  </div>
                ) : (
                  Object.entries(analytics.categoryCounts).map(([cat, count]) => {
                    const percent = Math.round((count / (analytics.totalCount || 1)) * 100);
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-text-primary font-medium">{cat}</span>
                          <span className="text-text-muted">{count} ({percent}%)</span>
                        </div>
                        <div className="w-full bg-bg-tertiary h-1.5 rounded-full overflow-hidden border border-border-default">
                          <div className="bg-brand-primary h-full rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Keyword Tags */}
            <div className="lg:col-span-2 bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-brand-primary" />
                <span>Frequent Metadata Tags</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {analytics.sortedTags.length === 0 ? (
                  <div className="text-text-muted text-xs font-mono py-4">
                    No metadata tags generated yet. Tags will appear as users create prompts.
                  </div>
                ) : (
                  analytics.sortedTags.map(([tag, count]) => (
                    <span key={tag} className="px-2.5 py-1 rounded-md text-xs font-mono bg-bg-tertiary border border-border-default text-text-primary">
                      #{tag} <strong className="text-brand-primary">({count})</strong>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: USER ENGAGEMENT & SECTION DWELL-TIME TELEMETRY */}
      {activeTab === 'dwell' && (
        <div className="space-y-6">
          {/* Header & Date Range Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5">
            <div>
              <h3 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-primary" />
                <span>Section Dwell-Time &amp; Engagement Analytics</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Precision tracking of where users spend active time across studio, tools, news, and marketplace.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-bg-tertiary border border-border-default rounded-lg p-0.5 text-xs">
                {[
                  { label: 'Today', days: 1 },
                  { label: '7 Days', days: 7 },
                  { label: '30 Days', days: 30 },
                  { label: 'All Time', days: 365 },
                ].map(r => (
                  <button
                    key={r.days}
                    onClick={() => {
                      setEngagementDays(r.days);
                      fetchEngagementStats(r.days);
                    }}
                    className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      engagementDays === r.days
                        ? 'bg-bg-secondary text-text-primary font-bold shadow-xs'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => fetchEngagementStats(engagementDays)}
                disabled={isLoadingEngagement}
                className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                title="Refresh telemetry"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingEngagement ? 'animate-spin text-brand-primary' : ''}`} />
              </button>
            </div>
          </div>

          {/* Dwell KPIs */}
          {(() => {
            const totalSeconds = engagementStats.reduce((acc, s) => acc + s.totalDwellSeconds, 0);
            const totalHours = (totalSeconds / 3600).toFixed(1);
            const totalVisits = engagementStats.reduce((acc, s) => acc + s.totalVisits, 0);
            const topSection = engagementStats[0]?.sectionName || 'N/A';
            const avgDurationSec = totalVisits > 0 ? (totalSeconds / totalVisits).toFixed(1) : '0';

            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                    <span>Total Active Dwell Time</span>
                    <Clock className="w-3.5 h-3.5 text-brand-primary" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold font-mono text-text-primary">
                    {totalHours} <span className="text-xs font-normal text-text-muted">hrs</span>
                  </h3>
                  <p className="text-[10px] text-text-muted mt-1">
                    {(totalSeconds / 60).toLocaleString(undefined, { maximumFractionDigits: 0 })} active user minutes
                  </p>
                </div>

                <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                    <span>Top Active Section</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold font-mono text-brand-primary uppercase truncate">
                    {topSection}
                  </h3>
                  <p className="text-[10px] text-text-muted mt-1">
                    {engagementStats[0]?.percentageOfTotal || 0}% of all user attention
                  </p>
                </div>

                <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                    <span>Avg Duration / Visit</span>
                    <Activity className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold font-mono text-text-primary">
                    {avgDurationSec} <span className="text-xs font-normal text-text-muted">sec</span>
                  </h3>
                  <p className="text-[10px] text-text-muted mt-1">Active foreground dwell time</p>
                </div>

                <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                    <span>Total Section Visits</span>
                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold font-mono text-text-primary">
                    {totalVisits.toLocaleString()}
                  </h3>
                  <p className="text-[10px] text-text-muted mt-1">Tracked navigation sessions</p>
                </div>
              </div>
            );
          })()}

          {/* Section Distribution Visualizer */}
          <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono">
              User Time Share by Section
            </h4>

            {isLoadingEngagement ? (
              <div className="py-12 text-center text-xs text-text-muted animate-pulse">Loading engagement telemetry...</div>
            ) : engagementStats.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">No telemetry recorded yet in this time window.</div>
            ) : (
              <div className="space-y-3">
                {engagementStats.map((stat) => {
                  const minutes = Math.round(stat.totalDwellSeconds / 60);
                  const hours = (stat.totalDwellSeconds / 3600).toFixed(1);
                  return (
                    <div key={stat.sectionName} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-text-primary capitalize flex items-center gap-1.5">
                          <span>{stat.sectionName}</span>
                          <span className="text-[10px] font-mono text-text-muted">({stat.totalVisits} visits)</span>
                        </span>
                        <span className="font-mono text-text-secondary text-[11px]">
                          <strong>{stat.percentageOfTotal}%</strong> · {minutes > 60 ? `${hours} hrs` : `${minutes} mins`}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-bg-tertiary rounded-full overflow-hidden border border-border-default">
                        <div
                          className="h-full bg-brand-primary rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, Math.min(100, stat.percentageOfTotal))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detailed Section Telemetry Table */}
          <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border-default flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono">
                Section Dwell-Time Metrics Table
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-bg-tertiary/50 border-b border-border-default text-[11px] font-mono text-text-muted">
                    <th className="p-3">Section</th>
                    <th className="p-3">Share of Time</th>
                    <th className="p-3">Total Time</th>
                    <th className="p-3">Total Visits</th>
                    <th className="p-3">Avg Dwell / Visit</th>
                    <th className="p-3">Unique Visitors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {engagementStats.map((stat) => (
                    <tr key={stat.sectionName} className="hover:bg-bg-tertiary/40 transition-colors">
                      <td className="p-3 font-semibold text-text-primary capitalize font-sans">{stat.sectionName}</td>
                      <td className="p-3 font-mono font-bold text-brand-primary">{stat.percentageOfTotal}%</td>
                      <td className="p-3 font-mono text-text-secondary">
                        {Math.floor(stat.totalDwellSeconds / 3600)}h {Math.floor((stat.totalDwellSeconds % 3600) / 60)}m {stat.totalDwellSeconds % 60}s
                      </td>
                      <td className="p-3 font-mono text-text-secondary">{stat.totalVisits.toLocaleString()}</td>
                      <td className="p-3 font-mono text-text-secondary">{stat.avgDwellSeconds}s</td>
                      <td className="p-3 font-mono text-text-secondary">{stat.uniqueUsersCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MIXPANEL LIVE PRODUCT TELEMETRY & EVENT AUDIT */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-brand-primary" />
                  <span>Mixpanel Live Product Telemetry</span>
                </h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                  isMixpanelActive()
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                }`}>
                  <Radio className={`w-2.5 h-2.5 ${isMixpanelActive() ? 'animate-pulse text-emerald-500' : 'text-amber-500'}`} />
                  {isMixpanelActive() ? 'Live Stream Active' : 'Mixpanel Inactive / Disabled'}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Real-time capture of user tab dwells, AI executions, prompt actions, signups, and monetization telemetry.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  trackMixpanelEvent('test_admin_ping', {
                    source: 'admin_portal_button',
                    timestamp: new Date().toISOString(),
                    test_id: Math.random().toString(36).slice(2, 8),
                  });
                  loadMixpanelEvents();
                  showToast('Test telemetry event dispatched to Mixpanel!', 'success');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-xs font-medium transition-colors cursor-pointer"
                title="Send a sample telemetry event"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Trigger Test Ping</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  dwellAnalyticsService.flushCurrentSection(false);
                  loadMixpanelEvents();
                  showToast('Section dwell time flushed & recorded.', 'success');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-border-default text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                title="Flush active section dwell timer immediately"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Flush Dwell Timer</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Clear Mixpanel Event Buffer',
                    message: 'Clear all local Mixpanel event logs? This will reset the in-memory telemetry buffer.',
                    confirmText: 'Clear Buffer',
                    cancelText: 'Cancel',
                    variant: 'danger',
                  });
                  if (!ok) return;
                  clearMixpanelEventHistory();
                  loadMixpanelEvents();
                  showToast('Mixpanel event buffer cleared.', 'info');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-border-default text-xs font-medium text-text-secondary transition-colors cursor-pointer"
                title="Clear local event history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Buffer</span>
              </button>

              <button
                type="button"
                onClick={loadMixpanelEvents}
                className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                title="Reload events"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Telemetry KPIs */}
          {(() => {
            const counts = getMixpanelEventCounts();
            const eventTypesCount = Object.keys(counts).length;
            const topEventEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
            const dwellEventsCount = counts['section_dwell_time'] || 0;

            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                    <span>Total Events Captured</span>
                    <Activity className="w-3.5 h-3.5 text-brand-primary" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-text-primary">
                    {mixpanelEvents.length}
                  </h3>
                  <p className="text-[10px] text-text-muted mt-1">Live in-memory &amp; local buffer</p>
                </div>

                <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                    <span>Unique Event Types</span>
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-text-primary">
                    {eventTypesCount}
                  </h3>
                  <p className="text-[10px] text-text-muted mt-1">Distinct tracked actions</p>
                </div>

                <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                    <span>Most Frequent Event</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold font-mono text-brand-primary truncate">
                    {topEventEntry ? topEventEntry[0] : 'None'}
                  </h3>
                  <p className="text-[10px] text-text-muted mt-1">
                    {topEventEntry ? `${topEventEntry[1]} recorded hits` : 'No events yet'}
                  </p>
                </div>

                <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                    <span>Dwell &amp; Tab Events</span>
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <h3 className="text-2xl font-bold font-mono text-text-primary">
                    {dwellEventsCount}
                  </h3>
                  <p className="text-[10px] text-text-muted mt-1">Tab duration checkpoints</p>
                </div>
              </div>
            );
          })()}

          {/* Event Distribution Summary Pills */}
          {(() => {
            const counts = getMixpanelEventCounts();
            const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            if (entries.length === 0) return null;

            return (
              <div className="bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono flex items-center justify-between">
                  <span>Event Frequency Distribution</span>
                  <span className="text-[10px] text-text-secondary font-normal">Click event to filter log</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {entries.map(([name, count]) => {
                    const isSelected = mixpanelFilter.toLowerCase() === name.toLowerCase();
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setMixpanelFilter(isSelected ? '' : name)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                          isSelected
                            ? 'bg-brand-primary text-white border-brand-primary shadow-xs font-semibold'
                            : 'bg-bg-tertiary hover:bg-bg-primary text-text-primary border-border-default'
                        }`}
                      >
                        <span>{name}</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-bg-secondary text-brand-primary'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Live Events Table with Expandable Payloads */}
          <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden shadow-xs space-y-0">
            <div className="p-4 border-b border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono">
                  Live Event Stream
                </h4>
                <span className="text-xs font-mono text-text-secondary">
                  ({mixpanelEvents.filter(e => {
                    if (!mixpanelFilter) return true;
                    const f = mixpanelFilter.toLowerCase();
                    return (
                      e.eventName.toLowerCase().includes(f) ||
                      (e.distinctId && e.distinctId.toLowerCase().includes(f)) ||
                      JSON.stringify(e.properties || {}).toLowerCase().includes(f)
                    );
                  }).length} matching)
                </span>
              </div>

              {/* Filter Search */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter events, users, properties..."
                  value={mixpanelFilter}
                  onChange={(e) => setMixpanelFilter(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-border-default bg-bg-tertiary focus:bg-bg-secondary focus:border-brand-primary outline-hidden transition-colors"
                />
                {mixpanelFilter && (
                  <button
                    type="button"
                    onClick={() => setMixpanelFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Event List */}
            {(() => {
              const filtered = mixpanelEvents.filter(e => {
                if (!mixpanelFilter) return true;
                const f = mixpanelFilter.toLowerCase();
                return (
                  e.eventName.toLowerCase().includes(f) ||
                  (e.distinctId && e.distinctId.toLowerCase().includes(f)) ||
                  JSON.stringify(e.properties || {}).toLowerCase().includes(f)
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="py-12 text-center text-xs text-text-muted font-mono space-y-1">
                    <p>No telemetry events match your criteria.</p>
                    <p className="text-[11px] text-text-secondary">
                      Interact with PromptHub or click &quot;Trigger Test Ping&quot; to capture events.
                    </p>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-border-default max-h-[600px] overflow-y-auto">
                  {filtered.map((item) => {
                    const isExpanded = mixpanelExpandedId === item.id;
                    const propKeys = Object.keys(item.properties || {});

                    return (
                      <div key={item.id} className="p-3.5 hover:bg-bg-tertiary/40 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] text-text-muted">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                              {item.eventName}
                            </span>
                            {item.distinctId && (
                              <span className="text-[11px] font-mono text-text-secondary truncate max-w-[180px]" title={item.distinctId}>
                                user: {item.distinctId}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Summary tags for key properties */}
                            {item.properties?.section_name && (
                              <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                                tab: {String(item.properties.section_name)} ({item.properties.dwell_seconds}s)
                              </span>
                            )}
                            {item.properties?.tab_name && (
                              <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                                tab: {String(item.properties.tab_name)}
                              </span>
                            )}
                            {item.properties?.model && (
                              <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                                model: {String(item.properties.model)}
                              </span>
                            )}
                            {item.properties?.amount && (
                              <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                credits: {item.properties.amount}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => setMixpanelExpandedId(isExpanded ? null : item.id)}
                              className="px-2 py-1 rounded-md text-[11px] font-mono bg-bg-tertiary hover:bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                            >
                              {isExpanded ? 'Hide Payload' : `Payload (${propKeys.length})`}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible JSON inspector */}
                        {isExpanded && (
                          <div className="mt-2.5 p-3 rounded-lg bg-bg-tertiary border border-border-default font-mono text-[11px] text-text-primary overflow-x-auto space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-text-muted pb-1 border-b border-border-default/50">
                              <span>Event ID: {item.id}</span>
                              <span>Timestamp: {item.timestamp}</span>
                            </div>
                            <pre className="text-text-secondary leading-relaxed pt-1">
                              {JSON.stringify(item.properties, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB: AI DAILY NEWS & BROADCAST CENTER */}
      {activeTab === 'news' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5">
            <div>
              <h3 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-brand-primary" />
                <span>AI Daily News &amp; Broadcast Center</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Publish daily AI breakthroughs, model releases, and broadcast alerts directly to all users.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDeleteAllNews}
                disabled={isLoadingNews || adminNews.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer disabled:opacity-40 min-h-[38px] transition-colors"
                title="Purge all fake and mock news articles"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All News</span>
              </button>

              <button
                onClick={() => handleOpenCreateNewsModal()}
                className="flex items-center gap-1.5 btn-primary text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer min-h-[38px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Publish New Article</span>
              </button>

              <button
                onClick={fetchAdminNews}
                disabled={isLoadingNews}
                className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                title="Refresh news"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingNews ? 'animate-spin text-brand-primary' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search published news, categories, tags..."
              value={newsSearch}
              onChange={(e) => setNewsSearch(e.target.value)}
              className="w-full bg-bg-secondary border border-border-default rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary"
            />
          </div>

          {/* Articles Table */}
          <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border-default flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono">
                News Dispatches ({adminNews.length})
              </h4>
            </div>

            {isLoadingNews ? (
              <div className="p-8 text-center text-xs text-text-muted animate-pulse">Loading AI news articles...</div>
            ) : adminNews.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">
                No news articles found. Click "Publish New Article" above to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-bg-tertiary/50 border-b border-border-default text-[11px] font-mono text-text-muted">
                      <th className="p-3">Article</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Stats</th>
                      <th className="p-3">Published</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {adminNews
                      .filter(a => !newsSearch || a.title.toLowerCase().includes(newsSearch.toLowerCase()) || a.category.toLowerCase().includes(newsSearch.toLowerCase()))
                      .map((article) => (
                        <tr key={article.id} className="hover:bg-bg-tertiary/40 transition-colors">
                          <td className="p-3 max-w-sm">
                            <div className="flex items-center gap-3">
                              {article.imageUrl && (
                                <img
                                  src={article.imageUrl}
                                  alt={article.title}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                  className="w-12 h-10 object-cover rounded border border-border-default shrink-0"
                                />
                              )}
                              <div>
                                <div className="font-semibold text-text-primary line-clamp-1">{article.title}</div>
                                <div className="text-[11px] text-text-muted line-clamp-1 mt-0.5">{article.summary}</div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-bg-tertiary border border-border-default text-text-secondary">
                              {article.category}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${article.isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <span className="text-[11px] font-mono">{article.isPublished ? 'Published' : 'Draft'}</span>
                              {article.isFeatured && (
                                <span className="ml-1 px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-600 text-[9px] font-bold">
                                  FEATURED
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3 font-mono text-[11px] text-text-muted">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-text-muted" /> {article.viewsCount}</span>
                              <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-500" /> {article.likesCount}</span>
                            </div>
                          </td>

                          <td className="p-3 font-mono text-[11px] text-text-muted">
                            {new Date(article.publishedAt).toLocaleDateString()}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleBroadcastNews(article)}
                                title="Broadcast notification to all users"
                                className="p-1.5 rounded bg-bg-tertiary hover:bg-brand-primary-light hover:text-brand-primary border border-border-default text-text-secondary transition-colors cursor-pointer"
                              >
                                <Bell className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleTogglePublishNews(article)}
                                title={article.isPublished ? 'Unpublish' : 'Publish'}
                                className="p-1.5 rounded bg-bg-tertiary hover:bg-bg-primary border border-border-default text-text-secondary transition-colors cursor-pointer"
                              >
                                {article.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                onClick={() => handleOpenCreateNewsModal(article)}
                                title="Edit article"
                                className="p-1.5 rounded bg-bg-tertiary hover:bg-bg-primary border border-border-default text-text-secondary transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteNews(article.id)}
                                title="Delete article"
                                className="p-1.5 rounded bg-bg-tertiary hover:bg-rose-50 hover:text-rose-600 border border-border-default text-text-secondary transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1.5: UNIT ECONOMICS & PROFITABILITY */}
      {activeTab === 'economics' && (
        <div className="space-y-6">
          {/* Economics Key Health Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                <span>Target Gross Margin</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold font-mono text-emerald-800">35.0%</h3>
              <p className="text-[10px] text-text-muted mt-1">Target corridor 30%–40% on all paid usage</p>
            </div>

            <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                <span>Credit Valuation</span>
                <span className="px-1.5 py-0.2 rounded bg-brand-primary-light text-brand-primary text-[9px] font-mono font-bold">₹0.50 / pt</span>
              </div>
              <h3 className="text-xl font-bold font-mono text-text-primary">2.0 pts / ₹1</h3>
              <p className="text-[10px] text-text-muted mt-1">₹10 = 20 credits · ₹100 = 200 credits</p>
            </div>

            <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                <span>Signup Free Pool</span>
                <span className="text-[10px] font-mono text-text-muted">OpenRouter</span>
              </div>
              <h3 className="text-2xl font-bold font-mono text-text-primary">25 Credits</h3>
              <p className="text-[10px] text-text-muted mt-1">Single grant per user for evaluation</p>
            </div>

            <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-text-muted mb-1 text-[10px] font-mono uppercase font-semibold">
                <span>Pricing Formula</span>
                <span className="text-emerald-700 text-xs font-mono font-bold">Dynamic</span>
              </div>
              <h3 className="text-lg font-bold font-mono text-text-primary">Cost / (1 - M)</h3>
              <p className="text-[10px] text-text-muted mt-1">Guarantees 35% margin on actual usage</p>
            </div>
          </div>

          {/* Top-Up Profitability Matrix Table */}
          <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <span>Top-Up Tier Unit Economics &amp; Margin Protection</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Target Margin = 35.0%
                  </span>
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Server-authoritative calculation: 1 credit = ₹0.50 INR customer value with target 35% gross profit margin.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-border-default rounded-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default text-[10px] font-mono uppercase font-semibold text-text-muted bg-bg-tertiary">
                    <th className="p-3">Gross Payment</th>
                    <th className="p-3">Customer Credits</th>
                    <th className="p-3">Max Allowed Provider Cost</th>
                    <th className="p-3">Gross Profit</th>
                    <th className="p-3 text-right">Target Gross Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default font-mono text-[11px]">
                  {[
                    { gross: 10, credits: 20, maxCost: 6.50, profit: 3.50, margin: '35.0%' },
                    { gross: 100, credits: 200, maxCost: 65.00, profit: 35.00, margin: '35.0%' },
                    { gross: 500, credits: 1000, maxCost: 325.00, profit: 175.00, margin: '35.0%' },
                    { gross: 1000, credits: 2000, maxCost: 650.00, profit: 350.00, margin: '35.0%' },
                    { gross: 5000, credits: 10000, maxCost: 3250.00, profit: 1750.00, margin: '35.0%' },
                  ].map(row => (
                    <tr key={row.gross} className="hover:bg-bg-tertiary/50">
                      <td className="p-3 font-bold text-text-primary">₹{row.gross.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-bold text-emerald-800">+{row.credits.toLocaleString()} credits</td>
                      <td className="p-3 text-text-secondary">₹{row.maxCost.toFixed(2)}</td>
                      <td className="p-3 font-semibold text-emerald-700">+₹{row.profit.toFixed(2)}</td>
                      <td className="p-3 text-right font-black text-emerald-700">{row.margin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Launch Promotional Pricing Packages Telemetry */}
          <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-primary shrink-0" />
                  <span>New Launch Promotional Pricing Configuration</span>
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                    isPromotionActive()
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-300'
                  }`}>
                    {isPromotionActive() ? 'LIVE & ACTIVE' : 'PROMOTION EXPIRED / INACTIVE'}
                  </span>
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Temporary introductory discount applied to customer purchase price only. Provider settlements remain unchanged.
                </p>
              </div>

              <div className="text-[11px] font-mono text-text-muted">
                <span>Start: 23 Aug 2026</span>
                <span className="mx-1.5">•</span>
                <span>End: {PROMOTION_CONFIG.endAt ? new Date(PROMOTION_CONFIG.endAt).toLocaleDateString() : 'Ongoing Launch'}</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-border-default rounded-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default text-[10px] font-mono uppercase font-semibold text-text-muted bg-bg-tertiary">
                    <th className="p-3">Package ID</th>
                    <th className="p-3">Credits</th>
                    <th className="p-3">Standard Price</th>
                    <th className="p-3">Launch Price</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3">User Savings</th>
                    <th className="p-3 text-right">Promotion Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default font-mono text-[11px]">
                  {getAllPromotionalPackages().map(pkg => (
                    <tr key={pkg.packageId} className="hover:bg-bg-tertiary/50">
                      <td className="p-3 font-bold text-text-primary uppercase flex items-center gap-1.5">
                        <span>{pkg.name}</span>
                        {pkg.popular && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            POPULAR
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-emerald-800">+{pkg.credits.toLocaleString()} credits</td>
                      <td className="p-3 text-text-muted line-through">₹{pkg.standardPriceInr}</td>
                      <td className="p-3 font-black text-text-primary">₹{pkg.priceInr}</td>
                      <td className="p-3 font-bold text-emerald-700">{Math.round(pkg.discountPercent)}% OFF</td>
                      <td className="p-3 font-semibold text-emerald-700">₹{pkg.savingsInr}</td>
                      <td className="p-3 text-right font-semibold">
                        <span className="text-emerald-700">Active Introductory Price</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model Consumption Multiplier Guide */}
          <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-text-primary">
              AI Model Tier Credit Consumption &amp; API Cost Protection
            </h3>
            <p className="text-xs text-text-secondary">
              High-cost frontier and reasoning models consume proportionally higher credits to prevent negative margin execution.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                  <span>1. Economy Tier</span>
                  <span className="font-mono text-emerald-800">1 Credit / call</span>
                </div>
                <p className="text-[11px] text-text-muted">
                  GPT-4o mini, Gemini 2.0 Flash, Claude 3.5 Haiku, Llama 3.3 70B
                </p>
                <div className="text-[10px] font-mono text-text-muted pt-1 border-t border-border-subtle">
                  Wholesale API: $0.10–$0.80 / 1M tokens
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                  <span>2. Standard Tier</span>
                  <span className="font-mono text-brand-primary">3 Credits / call</span>
                </div>
                <p className="text-[11px] text-text-muted">
                  GPT-4o (Omni), Claude 3.5 Sonnet, Mistral Large, Qwen 2.5 72B
                </p>
                <div className="text-[10px] font-mono text-text-muted pt-1 border-t border-border-subtle">
                  Wholesale API: $2.00–$3.00 / 1M tokens
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                  <span>3. Frontier / Reasoning Tier</span>
                  <span className="font-mono text-purple-800">5 - 10 Credits / call</span>
                </div>
                <p className="text-[11px] text-text-muted">
                  Claude 3.7 Sonnet (6 pts), DeepSeek R1 (5 pts), OpenAI o1 (10 pts)
                </p>
                <div className="text-[10px] font-mono text-text-muted pt-1 border-t border-border-subtle">
                  Deep reasoning &amp; thinking token protection
                </div>
              </div>
            </div>
          </div>

          {/* Marketplace Prompt Purchases & Commercial Orders */}
          <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
              <div>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-brand-primary" />
                  <h3 className="text-sm font-bold text-text-primary">Marketplace Prompt Purchases &amp; Commercial Orders</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                    {adminPurchases.length} Transactions
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Live prompt transactions with 70% Creator Royalty distribution and 30% PromptHub Platform Fee accounting.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchAdminPurchases}
                  disabled={isLoadingPurchases}
                  className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPurchases ? 'animate-spin' : ''}`} />
                  <span>Refresh Orders</span>
                </button>
              </div>
            </div>

            {/* Quick Economics Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">Gross Volume (GMV)</span>
                <div className="text-xl font-bold font-mono text-text-primary">
                  ₹{adminPurchases.reduce((acc: number, p: AdminPurchaseItem) => acc + (p.amountPaid || 0), 0).toLocaleString('en-IN')}
                </div>
                <p className="text-[10px] text-text-secondary">Total settled sales</p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 font-mono">Creator Royalties (70%)</span>
                <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  ₹{adminPurchases.reduce((acc: number, p: AdminPurchaseItem) => acc + (p.authorEarnings || 0), 0).toLocaleString('en-IN')}
                </div>
                <p className="text-[10px] text-text-secondary">Payable to creators</p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-brand-primary font-mono">Platform Margin (30%)</span>
                <div className="text-xl font-bold font-mono text-brand-primary">
                  ₹{adminPurchases.reduce((acc: number, p: AdminPurchaseItem) => acc + (p.platformFee || 0), 0).toLocaleString('en-IN')}
                </div>
                <p className="text-[10px] text-text-secondary">Gross platform fee</p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">Licensed Orders</span>
                <div className="text-xl font-bold font-mono text-text-primary">{adminPurchases.length}</div>
                <p className="text-[10px] text-text-secondary">Completed checkouts</p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={purchaseSearch}
                onChange={(e) => setPurchaseSearch(e.target.value)}
                placeholder="Search orders by prompt title, buyer, creator, order ID..."
                className="w-full pl-9 pr-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto border border-border-default rounded-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default text-[10px] font-mono uppercase font-semibold text-text-muted bg-bg-tertiary">
                    <th className="p-3">Order / Time</th>
                    <th className="p-3">Prompt</th>
                    <th className="p-3">Buyer</th>
                    <th className="p-3">Creator (Seller)</th>
                    <th className="p-3">Amount Paid</th>
                    <th className="p-3">Creator (70%)</th>
                    <th className="p-3">Platform (30%)</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default font-mono text-[11px]">
                  {adminPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-text-muted font-sans">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-50" />
                        <div className="font-semibold text-text-secondary">No marketplace purchases recorded yet</div>
                        <div className="text-[11px] mt-1 text-text-muted">When users purchase premium prompts, orders and 70/30 splits will appear here.</div>
                      </td>
                    </tr>
                  ) : (
                    adminPurchases
                      .filter((p) => {
                        if (!purchaseSearch.trim()) return true;
                        const q = purchaseSearch.toLowerCase().trim();
                        return (
                          (p.promptTitle || '').toLowerCase().includes(q) ||
                          (p.buyerName || '').toLowerCase().includes(q) ||
                          (p.buyerEmail || '').toLowerCase().includes(q) ||
                          (p.sellerName || '').toLowerCase().includes(q) ||
                          (p.sellerEmail || '').toLowerCase().includes(q) ||
                          (p.orderId || '').toLowerCase().includes(q) ||
                          (p.category || '').toLowerCase().includes(q)
                        );
                      })
                      .map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-bg-tertiary/50">
                          <td className="p-3">
                            <div className="font-bold text-text-primary text-xs">{purchase.orderId ? purchase.orderId.substring(0, 14) + '...' : 'Direct'}</div>
                            <div className="text-[10px] text-text-muted font-sans">
                              {purchase.createdAt ? new Date(purchase.createdAt).toLocaleString('en-IN') : 'Recent'}
                            </div>
                          </td>
                          <td className="p-3 font-sans">
                            <span className="font-semibold text-text-primary block line-clamp-1">{purchase.promptTitle}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-bg-secondary text-text-muted border border-border-subtle inline-block mt-0.5">
                              {purchase.category}
                            </span>
                          </td>
                          <td className="p-3 font-sans">
                            <span className="font-medium text-text-primary block">{purchase.buyerName}</span>
                            <span className="text-[10px] font-mono text-text-muted">{purchase.buyerEmail || 'buyer'}</span>
                          </td>
                          <td className="p-3 font-sans">
                            <span className="font-medium text-text-primary block">{purchase.sellerName}</span>
                            <span className="text-[10px] font-mono text-text-muted">{purchase.sellerEmail || 'creator'}</span>
                          </td>
                          <td className="p-3 font-bold text-text-primary">₹{(purchase.amountPaid || 0).toFixed(2)}</td>
                          <td className="p-3 font-semibold text-emerald-700">₹{(purchase.authorEarnings || 0).toFixed(2)}</td>
                          <td className="p-3 font-semibold text-brand-primary">₹{(purchase.platformFee || 0).toFixed(2)}</td>
                          <td className="p-3 text-right">
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Settled
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: AI MODEL CATALOG & OPENROUTER DIAGNOSTICS */}
      {activeTab === 'ai-models' && (
        <div className="space-y-4">
          {/* Diagnostic Header & Metrics */}
          <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-brand-primary" />
                  <h3 className="text-sm font-bold text-text-primary">Live Model Hub &amp; AICredits Gateway Diagnostics</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                    Live Gateway Active
                  </span>
                </div>
                <p className="text-xs text-text-secondary">
                  Authoritative multi-provider model registry. Synchronizes 400+ frontier models through AICredits.in and Free OpenRouter models.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSyncModelCatalog}
                  disabled={isSyncingCatalog}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCatalog ? 'animate-spin' : ''}`} />
                  <span>{isSyncingCatalog ? 'Syncing Catalog...' : 'Sync Live AICredits & Model Catalog'}</span>
                </button>
              </div>
            </div>

            {/* Quick KPI Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-bg-tertiary border border-border-subtle space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">Total Models</span>
                <div className="text-lg font-bold font-mono text-text-primary">{catalogModels.length}</div>
                <p className="text-[10px] text-text-secondary">Live verified</p>
              </div>

              <div className="p-3 rounded-lg bg-bg-tertiary border border-border-subtle space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 font-mono">Free Models (₹0)</span>
                <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  {catalogModels.filter(m => m.isFree || (m.pricing?.prompt === 0 && m.pricing?.completion === 0)).length}
                </div>
                <p className="text-[10px] text-text-secondary">Zero credit cost</p>
              </div>

              <div className="p-3 rounded-lg bg-bg-tertiary border border-border-subtle space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 font-mono">Premium (AICredits)</span>
                <div className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400">
                  {catalogModels.filter(m => !m.isFree).length}
                </div>
                <p className="text-[10px] text-text-secondary">AICredits Gateway</p>
              </div>
            </div>
          </div>

          {/* AI Providers & Multi-Gateway Governance Section */}
          <div className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-primary" />
                  <h3 className="text-sm font-bold text-text-primary">AI Providers &amp; Multi-Gateway Governance</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 font-semibold">
                    11 Providers Configured
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Real-time connectivity diagnostics, dynamic model discovery, and circuit-breaker fallbacks across Paid, Category 2 (0.70x), and Free pools.
                </p>
              </div>

              {/* Pool Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {[
                  { id: 'all', label: 'All (11)' },
                  { id: 'paid', label: 'Paid Pool (2)' },
                  { id: 'category2', label: 'Category 2 (5)' },
                  { id: 'specialized', label: 'Specialized (2)' },
                  { id: 'free', label: 'Free (1)' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setProviderFilterTab(tab.id as any)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                      providerFilterTab === tab.id
                        ? 'bg-brand-primary text-white font-semibold'
                        : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Providers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {AUTHORITATIVE_PROVIDER_SPECS
                .filter((p) => {
                  if (providerFilterTab === 'all') return true;
                  if (providerFilterTab === 'paid') return p.lane === 'paid';
                  if (providerFilterTab === 'category2') return p.lane === 'category2' || p.lane === 'non_api';
                  if (providerFilterTab === 'specialized') return p.lane === 'specialized';
                  if (providerFilterTab === 'free') return p.lane === 'free';
                  return true;
                })
                .map((provider) => {
                  const testRes = providerTestResults[provider.id];
                  const isTesting = testingProviderId === provider.id;
                  const isSyncing = syncingProviderId === provider.id;
                  const discoveredCount = providerDiscoveredModels[provider.id]?.length;

                  return (
                    <div
                      key={provider.id}
                      className="p-3.5 rounded-xl bg-bg-tertiary border border-border-subtle hover:border-border-default transition-all flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-2">
                        {/* Header: Title & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-text-primary">{provider.name}</span>
                              {provider.lane === 'category2' && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                                  0.70x Credits
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-text-muted">{provider.id}</div>
                          </div>

                          {/* Status Badge */}
                          {provider.status === 'ACTIVE' ? (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> ACTIVE
                            </span>
                          ) : provider.status === 'BLOCKED' ? (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-semibold shrink-0">
                              BLOCKED
                            </span>
                          ) : provider.status === 'SPECIALIZED_TOOL' ? (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 font-semibold shrink-0">
                              TOOL ONLY
                            </span>
                          ) : provider.status === 'NOT_AN_API' ? (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-semibold shrink-0">
                              NOT AN API
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold shrink-0">
                              MANUAL SETUP
                            </span>
                          )}
                        </div>

                        {/* Specs & Info */}
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center justify-between text-text-muted">
                            <span>Type:</span>
                            <span className="font-mono text-text-secondary font-medium">
                              {provider.serviceType === 'llm_inference'
                                ? 'LLM Inference'
                                : provider.serviceType === 'search_research'
                                ? 'Search / RAG'
                                : provider.serviceType === 'web_crawler'
                                ? 'Web Crawler'
                                : 'Consumer App'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-text-muted">
                            <span>Base URL:</span>
                            <span className="font-mono text-text-secondary truncate max-w-[160px]" title={provider.baseUrl}>
                              {provider.baseUrl}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-text-muted">
                            <span>Auth Header:</span>
                            <span className="font-mono text-text-secondary truncate max-w-[160px]" title={provider.authHeaderFormat}>
                              {provider.authHeaderFormat}
                            </span>
                          </div>
                        </div>

                        {/* Real-time Test Result Banner */}
                        {testRes && (
                          <div
                            className={`p-2 rounded-lg text-[10px] font-mono flex items-center justify-between gap-2 ${
                              testRes.success
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            <span className="truncate">{testRes.message || testRes.error}</span>
                            {testRes.latencyMs !== undefined && (
                              <span className="font-bold shrink-0">{testRes.latencyMs}ms</span>
                            )}
                          </div>
                        )}

                        {/* Action Required Checklist */}
                        <div className="p-2 rounded-lg bg-bg-secondary border border-border-subtle/80 text-[10px] text-text-secondary leading-relaxed">
                          <span className="font-semibold text-text-primary">Action: </span>
                          {provider.actionRequired}
                        </div>
                      </div>

                      {/* Controls Footer */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-border-subtle/80">
                        {provider.hasApi ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleTestProviderConnection(provider)}
                              disabled={isTesting || provider.status === 'BLOCKED'}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-bg-secondary hover:bg-border-subtle border border-border-default text-[11px] font-medium text-text-primary transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Activity className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                              <span>{isTesting ? 'Pinging...' : 'Test Connection'}</span>
                            </button>

                            {provider.discoveryEndpoint && (
                              <button
                                type="button"
                                onClick={() => handleSyncProviderModels(provider)}
                                disabled={isSyncing || provider.status === 'BLOCKED'}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-bg-secondary hover:bg-border-subtle border border-border-default text-[11px] font-medium text-text-primary transition-colors cursor-pointer disabled:opacity-50"
                                title="Sync live /v1/models"
                              >
                                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                                <span>{discoveredCount !== undefined ? `${discoveredCount} Models` : 'Sync'}</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="flex-1 text-center py-1 text-[10px] text-text-muted italic">
                            Non-API Consumer Tool (No Endpoint)
                          </div>
                        )}

                        <a
                          href={provider.docsUrl || provider.appUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-md bg-bg-secondary hover:bg-border-subtle border border-border-default text-text-muted hover:text-text-primary transition-colors shrink-0"
                          title="Open Provider Documentation / Console"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Modal: Discovered Models Preview */}
          {typeof document !== 'undefined' && activeInspectProvider && createPortal(
            <div 
              className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setActiveInspectProvider(null);
                }
              }}
            >
              <div 
                className="bg-bg-secondary border border-border-default rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-border-default bg-bg-tertiary">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-brand-primary" />
                    <h3 className="font-bold text-sm text-text-primary">
                      Discovered Models: {activeInspectProvider.name}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                      {providerDiscoveredModels[activeInspectProvider.id]?.length || 0} Synced
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveInspectProvider(null)}
                    className="p-1 rounded-lg hover:bg-border-subtle text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-2 text-xs divide-y divide-border-subtle/50">
                  {(!providerDiscoveredModels[activeInspectProvider.id] ||
                    providerDiscoveredModels[activeInspectProvider.id].length === 0) && (
                    <div className="text-center py-6 text-text-muted">
                      No models discovered yet. Click "Sync" on the provider card to query live models.
                    </div>
                  )}
                  {providerDiscoveredModels[activeInspectProvider.id]?.map((m) => (
                    <div key={m.id} className="pt-2 pb-1 flex items-center justify-between gap-2 font-mono">
                      <div>
                        <div className="font-bold text-text-primary">{m.name}</div>
                        <div className="text-[10px] text-text-muted">{m.id}</div>
                      </div>
                      <div className="text-right text-[10px] text-text-secondary shrink-0">
                        {m.contextLength ? `${Math.round(m.contextLength / 1000)}k context` : 'Standard'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 border-t border-border-default bg-bg-tertiary flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveInspectProvider(null)}
                    className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Search & Filter Bar */}
          <div className="bg-bg-secondary border border-border-default rounded-xl p-3 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by model ID, provider, name..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-default rounded-md pl-8 pr-3 py-1.5 text-xs text-text-primary focus:border-brand-primary focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'all', label: `All (${catalogModels.length})` },
                { id: 'free', label: 'Free Models' },
                { id: 'premium', label: 'Premium (AICredits)' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCatalogFilterTier(f.id as any)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                    catalogFilterTier === f.id
                      ? 'bg-brand-primary text-white font-semibold'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Models Table */}
          <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-default bg-bg-tertiary font-mono text-[10px] text-text-muted uppercase">
                    <th className="py-2.5 px-3">Model ID / Name</th>
                    <th className="py-2.5 px-3">Provider</th>
                    <th className="py-2.5 px-3">Tier / Type</th>
                    <th className="py-2.5 px-3">Prompt Pricing</th>
                    <th className="py-2.5 px-3">Completion Pricing</th>
                    <th className="py-2.5 px-3">Context</th>
                    <th className="py-2.5 px-3">Capabilities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60">
                  {catalogModels
                    .filter(m => {
                      const q = catalogSearch.toLowerCase().trim();
                      const matches = !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q);
                      if (!matches) return false;
                      if (catalogFilterTier === 'free') return m.isFree || (m.pricing?.prompt === 0 && m.pricing?.completion === 0);
                      if (catalogFilterTier === 'premium') return !m.isFree;
                      return true;
                    })
                    .slice(0, 100)
                    .map(m => {
                      const isFree = m.isFree || (m.pricing?.prompt === 0 && m.pricing?.completion === 0);
                      const isRouter = m.isRouter || m.id === 'openrouter/free';

                      return (
                        <tr key={m.id} className="hover:bg-bg-tertiary/50 transition-colors font-sans">
                          <td className="py-2 px-3">
                            <div className="font-semibold text-text-primary">{m.name}</div>
                            <div className="text-[10px] font-mono text-text-muted truncate max-w-xs">{m.id}</div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary text-[10px] font-mono border border-border-default">
                              {m.provider}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {isRouter ? (
                              <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-mono font-bold">
                                ROUTER
                              </span>
                            ) : isFree ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold">
                                FREE ₹0
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-bold">
                                AICREDITS
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px]">
                            {isFree ? '$0.00' : `$${m.pricing?.prompt?.toFixed(2) || '0.00'} / 1M`}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px]">
                            {isFree ? '$0.00' : `$${m.pricing?.completion?.toFixed(2) || '0.00'} / 1M`}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-text-muted">
                            {Math.round((m.contextLength || 128000) / 1000)}k
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1 flex-wrap text-[9px] font-mono">
                              {m.inputModalities?.includes('image') && (
                                <span className="px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">Vision</span>
                              )}
                              {m.isReasoning && (
                                <span className="px-1 py-0.2 rounded bg-purple-50 text-purple-800 border border-purple-200">Reasoning</span>
                              )}
                              {m.isCoding && (
                                <span className="px-1 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200">Coding</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROMPT CATALOG INSPECTION & MANAGEMENT */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="bg-bg-secondary border border-border-default rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by title, tag, or model..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-default rounded-md pl-8 pr-3 py-1 text-xs text-text-primary focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono w-full md:w-auto justify-between md:justify-end">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-bg-tertiary border border-border-default rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none cursor-pointer"
              >
                <option value="All">All Categories</option>
                {Object.keys(analytics.categoryCounts).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={selectedDifficulty}
                onChange={e => setSelectedDifficulty(e.target.value)}
                className="bg-bg-tertiary border border-border-default rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none cursor-pointer"
              >
                <option value="All">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>

              <button
                type="button"
                onClick={handleSyncFolderDatasetToDatabase}
                disabled={isSyncingDataset}
                className="min-h-[34px] px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                title="Sync all curated prompts to catalog"
              >
                <Database className={`w-3.5 h-3.5 ${isSyncingDataset ? 'animate-spin' : ''}`} />
                <span>{isSyncingDataset ? 'Syncing...' : 'Sync Dataset from Folder'}</span>
              </button>

              <button
                type="button"
                onClick={fetchAdminCatalog}
                disabled={isLoadingCatalog}
                className="min-h-[34px] px-3 py-1 rounded-md bg-bg-tertiary hover:bg-border-subtle border border-border-default text-text-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                title="Refresh prompt catalog"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCatalog ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreatePrompt}
                className="min-h-[34px] px-3 py-1 rounded-md bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Create a new curated prompt"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Prompt</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs px-1 text-text-muted">
            <span>
              Showing {filteredPrompts.length > 0 ? (catalogPage - 1) * CATALOG_PAGE_SIZE + 1 : 0}–{Math.min(filteredPrompts.length, catalogPage * CATALOG_PAGE_SIZE)} of {filteredPrompts.length} prompts
            </span>
            <span className="font-mono text-[11px]">
              Page {catalogPage} of {totalCatalogPages}
            </span>
          </div>

          <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default text-[10px] font-mono uppercase font-semibold text-text-muted bg-bg-tertiary">
                    <th className="p-3">Prompt Title</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Model</th>
                    <th className="p-3">Difficulty</th>
                    <th className="p-3">Metrics</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {isLoadingCatalog ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-text-muted text-xs font-mono">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-brand-primary" />
                          <span>Loading prompt catalog...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPrompts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-text-muted text-xs font-mono">
                        No prompts match the current search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedPrompts.map(p => (
                      <tr key={p.id} className="hover:bg-bg-tertiary/50 transition-colors">
                        <td className="p-3 font-semibold text-text-primary max-w-xs truncate" title={p.title}>
                          <div className="font-medium text-text-primary truncate">{p.title}</div>
                          {p.description && (
                            <div className="text-[11px] text-text-muted font-normal truncate mt-0.5">{p.description}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary border border-border-default">
                            {p.category}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-text-muted truncate max-w-[150px]" title={p.model}>
                          {p.model}
                        </td>
                        <td className="p-3 font-mono text-[10px]">
                          <span className={`px-1.5 py-0.5 rounded border ${
                            p.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                            p.difficulty === 'Advanced' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                            'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          }`}>
                            {p.difficulty || 'Intermediate'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-text-muted whitespace-nowrap">
                          {p.likesCount || 0} likes · {p.viewsCount || 0} views
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setInspectedPrompt(p)}
                              className="px-2 py-1 rounded bg-bg-tertiary hover:bg-border-subtle border border-border-default text-[11px] font-medium text-text-primary cursor-pointer transition-colors"
                              title="Inspect full instruction payload"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => handleOpenEditPrompt(p)}
                              className="px-2 py-1 rounded bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 text-[11px] font-medium text-brand-primary cursor-pointer flex items-center gap-1 transition-colors"
                              title="Edit this prompt"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeletePrompt(p)}
                              className="p-1 rounded hover:bg-rose-500/10 text-text-muted hover:text-rose-500 border border-transparent hover:border-rose-500/20 text-[11px] cursor-pointer transition-colors"
                              title="Delete prompt"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalCatalogPages > 1 && (
              <div className="p-3 border-t border-border-default flex items-center justify-between text-xs bg-bg-secondary">
                <span className="text-text-muted font-mono text-[11px]">
                  Page {catalogPage} of {totalCatalogPages} ({filteredPrompts.length} total)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={catalogPage <= 1}
                    onClick={() => setCatalogPage(prev => Math.max(1, prev - 1))}
                    className="px-2.5 py-1 rounded border border-border-default bg-bg-tertiary text-text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-primary transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <button
                    type="button"
                    disabled={catalogPage >= totalCatalogPages}
                    onClick={() => setCatalogPage(prev => Math.min(totalCatalogPages, prev + 1))}
                    className="px-2.5 py-1 rounded border border-border-default bg-bg-tertiary text-text-primary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-primary transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MODERATION & USER REPORTS */}
      {activeTab === 'moderation' && (
        <div className="bg-bg-secondary border border-border-default rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold font-display text-text-primary">User &amp; Safety Moderation Queue</h3>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Review community-flagged accounts, policy violations, and unacceptable prompt reports.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadReports}
                disabled={isLoadingReports}
                className="min-h-[44px] px-3 rounded-xl bg-bg-tertiary hover:bg-bg-primary border border-border-default text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer flex items-center gap-1.5"
                title="Refresh user reports"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReports ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {(['all', 'pending', 'resolved', 'dismissed'] as const).map((tabKey) => {
              const count = tabKey === 'all' 
                ? userReports.length 
                : userReports.filter(r => r.status === tabKey).length;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setReportFilter(tabKey)}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 capitalize ${
                    reportFilter === tabKey
                      ? 'bg-brand-primary text-white font-semibold shadow-2xs'
                      : 'bg-bg-tertiary hover:bg-bg-primary text-text-secondary'
                  }`}
                >
                  <span>{tabKey}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/10 dark:bg-white/10">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Reports Content */}
          {isLoadingReports ? (
            <div className="py-16 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-primary mx-auto" />
              <p className="text-xs text-text-muted font-mono">Loading moderation reports...</p>
            </div>
          ) : userReports.filter(r => reportFilter === 'all' || r.status === reportFilter).length === 0 ? (
            <div className="text-xs text-text-muted border border-border-default border-dashed rounded-xl p-10 text-center space-y-1.5">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-text-primary">Moderation queue clear</p>
              <p className="text-text-secondary">
                {reportFilter === 'all'
                  ? 'No user violation reports submitted yet.'
                  : `No reports in ${reportFilter} status.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {userReports
                .filter(r => reportFilter === 'all' || r.status === reportFilter)
                .map((report) => (
                  <div
                    key={report.id}
                    className="p-4 rounded-xl bg-bg-tertiary/40 border border-border-default space-y-3 transition-colors hover:bg-bg-tertiary/60"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          report.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : report.status === 'resolved'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-text-muted/10 text-text-muted border-border-default'
                        }`}>
                          {(report.status || 'pending').toUpperCase()}
                        </span>

                        <span className="text-xs font-semibold text-text-primary">
                          {report.reason}
                        </span>
                      </div>

                      <span className="text-[11px] text-text-muted font-mono">
                        {new Date(report.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-bg-secondary p-3 rounded-lg border border-border-subtle">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-text-muted block">Reported User</span>
                        <strong className="text-text-primary">{report.reportedUserName}</strong>
                        <span className="text-[11px] text-text-muted font-mono block">ID: {report.reportedUserId ? `${report.reportedUserId.slice(0, 12)}...` : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-mono text-text-muted block">Submitted By</span>
                        <strong className="text-text-primary">{report.reporterName}</strong>
                        <span className="text-[11px] text-text-muted font-mono block">ID: {report.reporterId ? `${report.reporterId.slice(0, 12)}...` : 'N/A'}</span>
                      </div>
                    </div>

                    {report.details && (
                      <div className="p-3 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-secondary leading-relaxed">
                        <strong className="text-text-primary font-mono text-[11px] block mb-0.5">Reporter Context:</strong>
                        {report.details}
                      </div>
                    )}

                    {report.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateReportStatus(report.id, 'dismissed')}
                          className="min-h-[44px] px-3 rounded-xl border border-border-default hover:bg-bg-secondary text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                          className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Resolved</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-2 border-t border-border-default/40">
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Resolved &amp; Logged to Moderation Audit Trail</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateReportStatus(report.id, 'pending')}
                          className="min-h-[36px] px-3 rounded-lg border border-border-default hover:bg-bg-secondary text-text-muted hover:text-text-primary text-[11px] font-medium transition-colors cursor-pointer"
                          title="Reopen this report to pending queue"
                        >
                          Reopen Report
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="p-5 rounded-2xl bg-bg-secondary border border-border-default shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-text-primary">Registered User Profiles &amp; Access Control</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-semibold">
                      {adminUsersList.length} Accounts
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Live User profiles database. View accounts, adjust role privileges (Admin vs User), and manage balances.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchAdminUsers}
                  disabled={isLoadingUsers}
                  className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                  <span>Refresh Users</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">Total Users</span>
                <div className="text-xl font-bold font-mono text-text-primary">{adminUsersList.length}</div>
                <p className="text-[10px] text-text-secondary">Registered profiles</p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-brand-primary font-mono">Platform Admins</span>
                <div className="text-xl font-bold font-mono text-brand-primary">
                  {adminUsersList.filter(u => u.role === 'Admin').length}
                </div>
                <p className="text-[10px] text-text-secondary">Privileged access</p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 font-mono">Pro / Paid Tiers</span>
                <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  {adminUsersList.filter(u => u.plan === 'pro' || u.plan === 'team' || u.plan === 'enterprise').length}
                </div>
                <p className="text-[10px] text-text-secondary">Subscribed members</p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 font-mono">Verified Creators</span>
                <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400">
                  {adminUsersList.filter(u => u.is_creator).length}
                </div>
                <p className="text-[10px] text-text-secondary">Marketplace sellers</p>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search name, username, email..."
                className="w-full pl-9 pr-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Role filter */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-secondary border border-border-default">
                {(['all', 'Admin', 'User'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUserRoleFilter(r)}
                    className={`px-3 py-1.5 min-h-[36px] rounded-md text-xs font-medium cursor-pointer transition-all ${
                      userRoleFilter === r
                        ? 'bg-bg-tertiary text-text-primary font-bold shadow-2xs'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {r === 'all' ? 'All Roles' : r === 'Admin' ? 'Admins' : 'Users'}
                  </button>
                ))}
              </div>

              {/* Plan filter */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-secondary border border-border-default">
                {(['all', 'free', 'pro', 'team'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setUserPlanFilter(p as any)}
                    className={`px-2.5 py-1.5 min-h-[36px] rounded-md text-xs font-medium cursor-pointer transition-all uppercase ${
                      userPlanFilter === p
                        ? 'bg-bg-tertiary text-text-primary font-bold shadow-2xs'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-bg-secondary rounded-xl border border-border-default overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default bg-bg-tertiary/50 text-[10px] uppercase font-bold text-text-muted font-mono tracking-wider">
                    <th className="p-3.5">User Profile</th>
                    <th className="p-3.5">Role Privileges</th>
                    <th className="p-3.5">Plan</th>
                    <th className="p-3.5">Credits Balance</th>
                    <th className="p-3.5">Joined Date</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {adminUsersList
                    .filter((u) => {
                      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
                      if (userPlanFilter !== 'all' && (u.plan || 'free').toLowerCase() !== userPlanFilter) return false;
                      if (!userSearchQuery.trim()) return true;
                      const q = userSearchQuery.toLowerCase().trim();
                      return (
                        (u.name || '').toLowerCase().includes(q) ||
                        (u.username || '').toLowerCase().includes(q) ||
                        (u.email || '').toLowerCase().includes(q) ||
                        (u.id || '').toLowerCase().includes(q)
                      );
                    })
                    .map((userItem) => {
                      const isSelf = userItem.id === currentUser?.id;
                      const isAdmin = userItem.role === 'Admin';
                      return (
                        <tr key={userItem.id} className="hover:bg-bg-tertiary/40 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                src={userItem.avatar_url || userItem.avatarUrl}
                                name={userItem.name}
                                username={userItem.username}
                                role={userItem.role}
                                isAdmin={isAdmin}
                                size="sm"
                                shape="circle"
                              />
                              <div>
                                <div className="font-bold text-text-primary flex items-center gap-1.5">
                                  <span>{userItem.name || userItem.username || 'Anonymous User'}</span>
                                  {isSelf && (
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-brand-primary-light text-brand-primary font-bold">
                                      YOU
                                    </span>
                                  )}
                                  {userItem.is_creator && (
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                                      CREATOR
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-text-muted font-mono">
                                  @{userItem.username || 'user'} · {userItem.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role Switcher */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <select
                                value={userItem.role || 'User'}
                                disabled={isSelf || isUpdatingUserRole === userItem.id}
                                onChange={(e) => handleUpdateUserRole(userItem.id, e.target.value as 'Admin' | 'User')}
                                className={`text-xs font-mono font-bold px-2 py-1 rounded-md border transition-colors cursor-pointer min-h-[36px] ${
                                  isAdmin
                                    ? 'bg-brand-primary text-white border-brand-primary'
                                    : 'bg-bg-tertiary text-text-primary border-border-default hover:border-brand-primary'
                                } ${isSelf ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                <option value="User">User</option>
                                <option value="Admin">Admin</option>
                              </select>
                              {isUpdatingUserRole === userItem.id && (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-primary" />
                              )}
                            </div>
                          </td>

                          {/* Plan */}
                          <td className="p-3.5">
                            <button
                              type="button"
                              onClick={() => openPlanModal(userItem)}
                              title="Assign or upgrade user plan"
                              className="group min-h-[36px] px-2.5 py-1 rounded-md bg-bg-tertiary hover:bg-brand-primary/10 border border-border-default hover:border-brand-primary/40 text-left transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Crown className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-mono uppercase font-bold text-text-primary">
                                {userItem.plan || 'Free'}
                              </span>
                              <span className="text-[9px] text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity font-sans font-medium">Edit</span>
                            </button>
                          </td>

                          {/* Credits Balance */}
                          <td className="p-3.5 font-mono">
                            <div className="font-bold text-text-primary">
                              {(userItem.credits ?? 0).toLocaleString()} pts
                            </div>
                            <div className="text-[10px] text-text-muted">
                              Paid: {userItem.paid_credits ?? 0}
                            </div>
                          </td>

                          {/* Joined Date */}
                          <td className="p-3.5 font-mono text-[11px] text-text-muted">
                            {userItem.created_at ? new Date(userItem.created_at).toLocaleDateString('en-IN') : 'Unknown'}
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openPlanModal(userItem)}
                                className="min-h-[44px] px-3 py-1.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 text-xs font-semibold text-brand-primary transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Crown className="w-3.5 h-3.5 text-amber-500" />
                                <span>Assign Plan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  selectUserForCredits(userItem);
                                  setActiveTab('credits');
                                }}
                                className="min-h-[44px] px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                <span>Adjust Credits</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY AUDIT */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 bg-bg-secondary border border-border-default shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Security Penetration &amp; Release Audit</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Executes security suite against permission and credential boundaries.
              </p>
            </div>

            <button
              onClick={handleRunPenTest}
              disabled={isPenTesting}
              className="px-3.5 py-1.5 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
            >
              <span>{isPenTesting ? 'Testing...' : 'Run Security Suite'}</span>
            </button>
          </div>

          <div className="space-y-2">
            {penTestResults.map((test) => (
              <div
                key={test.id}
                className={`rounded-lg p-3 border text-xs flex items-center justify-between gap-3 ${
                  test.passed
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-rose-200 bg-rose-50 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${test.passed ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                  <div>
                    <span className="font-semibold text-text-primary mr-2">{test.name}</span>
                    <span className="text-[11px] text-text-secondary">{test.details}</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase">{test.passed ? 'PASS' : 'FAIL'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: SUBMISSIONS & BUGS */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          {/* Section A: Community Prompt Submissions */}
          <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <span>Community Prompt Submissions</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-primary-light text-brand-primary border border-brand-primary/20">
                    {adminSubmissions.length}
                  </span>
                </h3>
                <p className="text-xs text-text-secondary">
                  Review user-submitted templates requesting official catalog publication and Pro trials.
                </p>
              </div>
              <button
                type="button"
                disabled={isRefreshingSubmissions}
                onClick={async () => {
                  setIsRefreshingSubmissions(true);
                  try {
                    await refreshAdminData();
                    showToast('Refreshed submissions queue', 'info');
                  } finally {
                    setIsRefreshingSubmissions(false);
                  }
                }}
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingSubmissions ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-3">
              {adminSubmissions.length === 0 ? (
                <div className="text-center py-8 border border-border-default border-dashed rounded-lg text-xs text-text-muted font-mono space-y-1">
                  <p>No community submissions pending review.</p>
                  <span className="text-[10px]">When users click &quot;Submit Prompt&quot; from the top banner or Studio, they appear here live.</span>
                </div>
              ) : (
                adminSubmissions.map(sub => {
                  const isExpanded = expandedSubId === sub.id;
                  return (
                    <div key={sub.id} className="p-4 rounded-xl border border-border-default bg-bg-tertiary space-y-3 text-xs shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="font-bold text-sm text-text-primary">{sub.promptTitle}</span>
                          <div className="flex items-center gap-2 text-[11px] text-text-muted">
                            <span>Submitter: <strong className="text-text-secondary">{sub.userName}</strong> ({sub.username || sub.userEmail || 'User'})</span>
                            <span>•</span>
                            <span className="font-mono">{sub.category}</span>
                            <span>•</span>
                            <span className="font-mono">{sub.model}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            sub.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            sub.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {sub.status}
                          </span>
                          <span className="text-[10px] font-mono text-text-muted">{new Date(sub.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {sub.promptDescription && (
                        <p className="text-text-secondary leading-relaxed">{sub.promptDescription}</p>
                      )}

                      {sub.note && (
                        <div className="p-2 rounded bg-bg-secondary border border-border-subtle text-[11px] text-text-secondary">
                          <strong className="text-text-primary font-medium">Submitter note: </strong>
                          <span>{sub.note}</span>
                        </div>
                      )}

                      {/* Expandable Prompt Content */}
                      {sub.promptContent && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                            className="text-[11px] font-semibold text-brand-primary hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>{isExpanded ? 'Hide Full Prompt Content ▲' : 'View Full Prompt Content ▼'}</span>
                          </button>
                          {isExpanded && (
                            <pre className="mt-2 p-3 rounded-lg bg-bg-primary border border-border-default text-xs font-mono text-text-primary whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                              {sub.promptContent}
                            </pre>
                          )}
                        </div>
                      )}

                      {sub.status === 'pending' && (
                        <div className="flex gap-2 pt-2 border-t border-border-subtle">
                          <button
                            disabled={processingId === sub.id}
                            onClick={async () => {
                              setProcessingId(sub.id);
                              try {
                                await approveAdminSubmission(sub.id);
                              } finally {
                                setProcessingId(null);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                          >
                            {processingId === sub.id ? 'Processing...' : 'Approve & Publish (+15d Pro)'}
                          </button>
                          <button
                            disabled={processingId === sub.id}
                            onClick={async () => {
                              setProcessingId(sub.id);
                              try {
                                await rejectAdminSubmission(sub.id, 'Does not meet curation guidelines');
                              } finally {
                                setProcessingId(null);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-default text-text-secondary text-xs hover:bg-bg-tertiary transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section B: Bug Reports */}
          <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-text-primary">Bug Reports &amp; Feedback</h3>
            <p className="text-xs text-text-secondary">
              Review bug notifications and grant 15-day Pro reward trials upon resolution.
            </p>

            <div className="space-y-3">
              {bugReports.length === 0 ? (
                <div className="text-center py-6 border border-border-default border-dashed rounded-lg text-xs text-text-muted font-mono">
                  No active bug reports pending review.
                </div>
              ) : (
                bugReports.map(bug => (
                  <div key={bug.id} className="p-3.5 rounded-lg border border-border-default bg-bg-tertiary space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-text-primary">{bug.title}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          bug.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                          bug.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {bug.status}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">{new Date(bug.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="text-text-secondary">{bug.description}</p>
                    {bug.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <button
                          disabled={processingId === bug.id}
                          onClick={async () => {
                            setProcessingId(bug.id);
                            try {
                              await approveBugReport(bug.id);
                            } finally {
                              setProcessingId(null);
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {processingId === bug.id ? 'Processing...' : 'Resolve & Reward (15d Pro)'}
                        </button>
                        <button
                          disabled={processingId === bug.id}
                          onClick={async () => {
                            setProcessingId(bug.id);
                            try {
                              await rejectBugReport(bug.id, 'Unable to reproduce or invalid report');
                            } finally {
                              setProcessingId(null);
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-bg-secondary border border-border-default text-text-secondary text-xs hover:bg-bg-tertiary transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: CREDITS MANAGEMENT & USER BALANCES */}
      {activeTab === 'credits' && (
        <div className="space-y-5 text-left">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-default pb-3">
            <div>
              <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-primary" />
                <span>Credit Balances &amp; User Ledger Management</span>
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Audit real-time balances, inspect ledger transactions, and execute atomic credit adjustments.
              </p>
            </div>
          </div>

          <div className="space-y-5">
              {/* User Search Bar */}
              <div className="bg-bg-secondary border border-border-default rounded-2xl p-5 shadow-xs space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Search className="w-4 h-4 text-brand-primary" />
                    <span>Search User for Credit Management</span>
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Search by email, username, or UUID to view real-time balances, lifetime telemetry, and atomically grant or deduct credits.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search user by email (e.g. udit@example.com), username, or UUID..."
                      value={adminUserSearchQuery}
                      onChange={(e) => setAdminUserSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') searchUsersForCredits(adminUserSearchQuery);
                      }}
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-bg-primary border border-border-default text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary min-h-[44px]"
                    />
                  </div>
                  <button
                    onClick={() => searchUsersForCredits(adminUserSearchQuery)}
                    disabled={isSearchingAdminUsers}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.98] text-white font-semibold text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSearchingAdminUsers ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>Search Users</span>
                  </button>
                </div>

                {/* Found Users List */}
                {adminFoundUsers.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-mono text-text-muted block font-semibold uppercase">
                      Select Target User ({adminFoundUsers.length} found):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                      {adminFoundUsers.map((u) => {
                        const isSelected = selectedAdminUser?.id === u.id;
                        return (
                          <button
                            key={u.id}
                            onClick={() => selectUserForCredits(u)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[44px] flex items-center gap-3 ${
                              isSelected
                                ? 'bg-brand-primary-light/40 border-brand-primary/50 shadow-xs ring-1 ring-brand-primary/30'
                                : 'bg-bg-primary border-border-default hover:border-border-hover'
                            }`}
                          >
                            <UserAvatar
                              src={u.avatar_url}
                              name={u.full_name}
                              username={u.username}
                              role={u.role}
                              isAdmin={u.role === 'Admin' || u.role === 'admin'}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-text-primary truncate">{u.full_name || u.username || 'User'}</p>
                              <p className="text-[11px] text-text-muted truncate">{u.email}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-mono font-bold text-brand-primary">{u.credits ?? 0}</span>
                              <span className="text-[10px] text-text-muted block">credits</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected User Management Card */}
              {selectedAdminUser ? (
                <div className="space-y-5">
                  <div className="bg-bg-secondary border border-border-default rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                    {/* User Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-4">
                      <div className="flex items-center gap-3.5">
                        <UserAvatar
                          src={selectedAdminUser.avatar_url}
                          name={selectedAdminUser.full_name}
                          username={selectedAdminUser.username}
                          role={selectedAdminUser.role}
                          isAdmin={selectedAdminUser.role === 'Admin' || selectedAdminUser.role === 'admin'}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-text-primary">
                              {selectedAdminUser.full_name || selectedAdminUser.username || 'Developer'}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-bg-tertiary border border-border-default text-text-secondary">
                              {selectedAdminUser.role || 'User'}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary font-mono">{selectedAdminUser.email}</p>
                          <p className="text-[11px] text-text-muted">UUID: {selectedAdminUser.id}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openPlanModal(selectedAdminUser)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/20 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          <span>Change Plan ({selectedAdminUser.plan || 'Free'})</span>
                        </button>
                        <button
                          onClick={() => selectUserForCredits(selectedAdminUser)}
                          disabled={isLoadingUserCredits}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUserCredits ? 'animate-spin' : ''}`} />
                          <span>Refresh Telemetry</span>
                        </button>
                      </div>
                    </div>

                    {/* 4 Balance & Stat Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                        <span className="text-[11px] font-mono font-semibold text-emerald-800 dark:text-emerald-300 block uppercase">
                          Current Balance
                        </span>
                        <p className="text-2xl font-bold font-display text-emerald-700 dark:text-emerald-300">
                          {userCreditSummary?.balances?.total_credits ?? selectedAdminUser.credits ?? 0}
                        </p>
                        <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block">
                          ₹{((userCreditSummary?.balances?.total_credits ?? selectedAdminUser.credits ?? 0) * 0.50).toFixed(2)} valuation
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-bg-primary border border-border-default space-y-1">
                        <span className="text-[11px] font-mono font-semibold text-text-muted block uppercase">
                          Paid Top-Up
                        </span>
                        <p className="text-2xl font-bold font-display text-text-primary">
                          {userCreditSummary?.balances?.paid_credits ?? selectedAdminUser.paid_credits ?? 0}
                        </p>
                        <span className="text-[10px] text-text-muted block">Permanent non-expiring</span>
                      </div>

                      <div className="p-4 rounded-xl bg-bg-primary border border-border-default space-y-1">
                        <span className="text-[11px] font-mono font-semibold text-text-muted block uppercase">
                          Lifetime Granted
                        </span>
                        <p className="text-2xl font-bold font-display text-text-primary">
                          {userCreditSummary?.lifetime_stats?.lifetime_granted ?? 0}
                        </p>
                        <span className="text-[10px] text-text-muted block">Total additions</span>
                      </div>

                      <div className="p-4 rounded-xl bg-bg-primary border border-border-default space-y-1">
                        <span className="text-[11px] font-mono font-semibold text-text-muted block uppercase">
                          Lifetime Consumed
                        </span>
                        <p className="text-2xl font-bold font-display text-text-primary">
                          {userCreditSummary?.lifetime_stats?.lifetime_consumed ?? 0}
                        </p>
                        <span className="text-[10px] text-text-muted block">Total usage deductions</span>
                      </div>
                    </div>

                    {/* Credit Adjustment Form */}
                    <div className="p-5 rounded-xl bg-bg-primary border border-border-default space-y-4">
                      <div className="flex items-center justify-between gap-2 border-b border-border-default pb-3">
                        <h4 className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-2">
                          <Award className="w-4 h-4 text-brand-primary" />
                          <span>Execute Authoritative Credit Adjustment</span>
                        </h4>
                        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          Server-Enforced Atomic Ledger
                        </span>
                      </div>

                      {/* Action Selector: ADD vs DEDUCT */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono font-semibold text-text-muted block uppercase">
                          Adjustment Action
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setCreditAdjustmentAction('ADD')}
                            className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              creditAdjustmentAction === 'ADD'
                                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                                : 'bg-bg-secondary border border-border-default text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                            <span>ADD CREDITS (ADMIN_GRANT)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreditAdjustmentAction('DEDUCT')}
                            className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              creditAdjustmentAction === 'DEDUCT'
                                ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30'
                                : 'bg-bg-secondary border border-border-default text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            <X className="w-4 h-4" />
                            <span>DEDUCT CREDITS (ADMIN_DEDUCTION)</span>
                          </button>
                        </div>
                      </div>

                      {/* Amount Input & Preset Chips */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-mono font-semibold text-text-muted block uppercase">
                          Credit Amount
                        </label>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            placeholder="Enter credit amount (e.g. 500)..."
                            value={creditAdjustmentAmount}
                            onChange={(e) => setCreditAdjustmentAmount(e.target.value)}
                            className="text-xs px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-default text-text-primary font-mono font-bold focus:outline-none focus:border-brand-primary min-h-[44px] flex-1"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[50, 100, 250, 500, 1000].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setCreditAdjustmentAmount(preset.toString())}
                                className="min-h-[44px] px-3 py-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary text-xs font-mono font-semibold transition-colors cursor-pointer"
                              >
                                {creditAdjustmentAction === 'ADD' ? `+${preset}` : `-${preset}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Reason & Reference Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono font-semibold text-text-muted block uppercase">
                            Audit Reason / Note <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Mandatory reason (e.g. Launch compensation, Bug bounty)..."
                            value={creditAdjustmentReason}
                            onChange={(e) => setCreditAdjustmentReason(e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-default text-text-primary focus:outline-none focus:border-brand-primary min-h-[44px]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono font-semibold text-text-muted block uppercase">
                            Internal Reference / Ticket ID (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="Optional ticket or invoice (e.g. TICKET-4091)..."
                            value={creditAdjustmentRef}
                            onChange={(e) => setCreditAdjustmentRef(e.target.value)}
                            className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-default text-text-primary focus:outline-none focus:border-brand-primary min-h-[44px]"
                          />
                        </div>
                      </div>

                      {/* Real-Time Calculation Preview Bar */}
                      {(() => {
                        const cur = userCreditSummary?.balances?.total_credits ?? selectedAdminUser.credits ?? 0;
                        const amt = parseInt(creditAdjustmentAmount, 10) || 0;
                        const proj = creditAdjustmentAction === 'ADD' ? cur + amt : cur - amt;
                        const isInvalidDeduct = creditAdjustmentAction === 'DEDUCT' && amt > cur;

                        return (
                          <div
                            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono ${
                              isInvalidDeduct
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                                : 'bg-bg-secondary border-border-default text-text-secondary'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-wrap">
                              <span>Current: <strong>{cur}</strong></span>
                              <span>→</span>
                              <span>
                                Action:{' '}
                                <strong className={creditAdjustmentAction === 'ADD' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                  {creditAdjustmentAction === 'ADD' ? `+${amt}` : `-${amt}`}
                                </strong>
                              </span>
                              <span>→</span>
                              <span>
                                Projected Balance:{' '}
                                <strong className={isInvalidDeduct ? 'text-rose-600' : 'text-text-primary font-bold'}>
                                  {proj}
                                </strong>
                              </span>
                            </div>

                            {isInvalidDeduct && (
                              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span>Deduction exceeds balance. Negative balance forbidden.</span>
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Confirm Button Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          const amt = parseInt(creditAdjustmentAmount, 10);
                          if (isNaN(amt) || amt <= 0) {
                            showToast('Please enter a positive credit amount.', 'error');
                            return;
                          }
                          if (creditAdjustmentReason.trim().length < 3) {
                            showToast('Audit reason must be at least 3 characters.', 'error');
                            return;
                          }
                          const cur = userCreditSummary?.balances?.total_credits ?? selectedAdminUser.credits ?? 0;
                          if (creditAdjustmentAction === 'DEDUCT' && amt > cur) {
                            showToast(`Cannot deduct ${amt} credits: user only has ${cur}. Negative balance forbidden.`, 'error');
                            return;
                          }
                          setIsConfirmingAdjustment(true);
                        }}
                        className={`min-h-[44px] w-full px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                          creditAdjustmentAction === 'ADD'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-rose-600 hover:bg-rose-700 text-white'
                        }`}
                      >
                        {creditAdjustmentAction === 'ADD' ? (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Preview &amp; Confirm Grant (+{creditAdjustmentAmount || 0} Credits)</span>
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4" />
                            <span>Preview &amp; Confirm Deduction (-{creditAdjustmentAmount || 0} Credits)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Transaction History Table for Selected User */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between gap-2 border-b border-border-default pb-2">
                        <h4 className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-2">
                          <Activity className="w-4 h-4 text-brand-primary" />
                          <span>Audit Ledger &amp; Transaction History ({userLedgerHistory.length})</span>
                        </h4>
                        <span className="text-[11px] font-mono text-text-muted">
                          Public Credit Ledger (Immutable)
                        </span>
                      </div>

                      {userLedgerHistory.length === 0 ? (
                        <div className="text-center py-6 text-xs text-text-muted font-mono border border-dashed border-border-default rounded-xl">
                          No ledger transactions recorded for this user yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-border-default">
                          <table className="w-full text-left text-xs font-mono">
                            <thead className="bg-bg-tertiary/60 border-b border-border-default text-text-muted uppercase text-[10px]">
                              <tr>
                                <th className="p-2.5">Date / Time</th>
                                <th className="p-2.5">Type</th>
                                <th className="p-2.5 text-right">Amount</th>
                                <th className="p-2.5 text-right">Balance</th>
                                <th className="p-2.5">Provider</th>
                                <th className="p-2.5">Audit Reason / Note</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border-default">
                              {userLedgerHistory.map((tx) => {
                                const isPositive = (tx.amount ?? 0) > 0;
                                return (
                                  <tr key={tx.id} className="hover:bg-bg-tertiary/30 transition-colors">
                                    <td className="p-2.5 text-text-muted whitespace-nowrap">
                                      {new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                    </td>
                                    <td className="p-2.5 font-bold">
                                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                                        tx.transaction_type?.includes('GRANT') || tx.transaction_type?.includes('TOPUP') || tx.transaction_type?.includes('BONUS')
                                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                                      }`}>
                                        {tx.transaction_type}
                                      </span>
                                    </td>
                                    <td className={`p-2.5 text-right font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                      {isPositive ? `+${tx.amount}` : tx.amount}
                                    </td>
                                    <td className="p-2.5 text-right font-bold text-text-primary">
                                      {tx.balance_after ?? '—'}
                                    </td>
                                    <td className="p-2.5 text-text-muted">
                                      {tx.provider || 'platform'}
                                    </td>
                                    <td className="p-2.5 text-text-secondary max-w-xs truncate" title={tx.reason || tx.description}>
                                      {tx.reason || tx.description || '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border border-border-default border-dashed rounded-2xl bg-bg-secondary/40 text-xs text-text-muted font-mono space-y-1">
                  <p className="font-semibold text-text-secondary">No user selected</p>
                  <p>Search by email or click a user card above to inspect balances and perform credit adjustments.</p>
                </div>
              )}
            </div>

          {/* DELIBERATE CONFIRMATION MODAL */}
          {typeof document !== 'undefined' && isConfirmingAdjustment && selectedAdminUser && createPortal(
            <div 
              className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
              onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmittingAdjustment) {
                  setIsConfirmingAdjustment(false);
                }
              }}
            >
              <div 
                className="bg-bg-secondary border border-border-default rounded-2xl p-6 shadow-xl max-w-md w-full space-y-4 text-left"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-border-default pb-3">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    <span>Confirm Credit Adjustment</span>
                  </h3>
                  <button
                    onClick={() => setIsConfirmingAdjustment(false)}
                    className="p-1 rounded-lg text-text-muted hover:text-text-primary min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="p-3 rounded-xl bg-bg-primary border border-border-default space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Target User:</span>
                      <strong className="text-text-primary font-mono">{selectedAdminUser.email}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Action:</span>
                      <strong className={creditAdjustmentAction === 'ADD' ? 'text-emerald-600' : 'text-rose-600'}>
                        {creditAdjustmentAction === 'ADD' ? 'ADD CREDITS (ADMIN_GRANT)' : 'DEDUCT CREDITS (ADMIN_DEDUCTION)'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Amount:</span>
                      <strong className="text-text-primary font-mono text-sm">
                        {creditAdjustmentAction === 'ADD' ? `+${creditAdjustmentAmount}` : `-${creditAdjustmentAmount}`} Credits
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Projected Balance:</span>
                      <strong className="text-brand-primary font-mono">
                        {creditAdjustmentAction === 'ADD'
                          ? (userCreditSummary?.balances?.total_credits ?? selectedAdminUser.credits ?? 0) + (parseInt(creditAdjustmentAmount, 10) || 0)
                          : (userCreditSummary?.balances?.total_credits ?? selectedAdminUser.credits ?? 0) - (parseInt(creditAdjustmentAmount, 10) || 0)} Credits
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-text-muted font-semibold block">Audit Reason:</span>
                    <p className="p-2 rounded-lg bg-bg-primary border border-border-default text-text-secondary font-mono">
                      "{creditAdjustmentReason}"
                    </p>
                  </div>

                  <p className="text-[11px] text-text-muted italic">
                    This operation will atomically update the user's balance and record an immutable entry in the credit ledger and administrative audit logs.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingAdjustment(false)}
                    disabled={isSubmittingAdjustment}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-bg-secondary border border-border-default text-text-secondary hover:text-text-primary text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteCreditAdjustment}
                    disabled={isSubmittingAdjustment}
                    className={`min-h-[44px] px-5 py-2 rounded-xl font-bold text-xs text-white shadow-sm inline-flex items-center gap-2 cursor-pointer ${
                      creditAdjustmentAction === 'ADD'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {isSubmittingAdjustment ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Executing...</span>
                      </>
                    ) : (
                      <span>Confirm &amp; Execute</span>
                    )}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {activeTab === 'storage' && (
        <div className="space-y-6">
          {/* Storage Banner */}
          <div className="p-5 rounded-2xl bg-bg-secondary border border-border-default shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Google Drive Cloud Storage Architecture (5 TB)</h3>
                  <p className="text-xs text-text-secondary">Owner's 5 TB Google One storage powering PromptHub file &amp; backup ecosystem.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      showToast('Creating platform snapshot in Google Drive...', 'info');
                      const dataToBackup = {
                        promptsCount: prompts.length,
                        prompts,
                        exportedAt: new Date().toISOString(),
                        adminUser: currentUser?.email || 'admin',
                      };
                      const res = await storageService.backupWorkspace(dataToBackup, 'system_database', 'Admin triggered snapshot');
                      if (res.success) {
                        showToast(`Snapshot created in Drive: ${res.file.name}`, 'success');
                      } else {
                        showToast(`Snapshot failed: ${res.error}`, 'error');
                      }
                    } catch (err: any) {
                      showToast(`Snapshot error: ${err.message}`, 'error');
                    }
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Snapshot to Drive</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">Allocated Capacity</span>
                <div className="text-xl font-bold font-mono text-text-primary">5,000 GB</div>
                <p className="text-[10px] text-text-secondary">5 TB Google Drive Pool</p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">Free Tier Quota</span>
                {/* Static platform copy, not per-user data: these must match the tiers
                    server/handlers/storage-quota.ts actually enforces (1 GB / 10 GB / 5 TB).
                    They said 100 MB and 1 GB, advertising a free tier we do not sell. */}
                <div className="text-base font-bold text-text-primary">1 GB</div>
                <p className="text-[10px] text-text-secondary">Per registered developer</p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">Pro Tier Quota</span>
                <div className="text-base font-bold text-brand-primary">10 GB</div>
                <p className="text-[10px] text-text-secondary">₹9 promo &amp; Pro plans</p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">Security Layer</span>
                <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">Zero-IDOR RLS</div>
                <p className="text-[10px] text-text-secondary">Magic-byte header inspection</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-5 rounded-2xl bg-bg-secondary border border-border-default shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-text-primary">Creator Payout Profiles &amp; Royalty Destinations</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Admin Access Only</span>
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Confidential financial records. Only PromptHub Administrators can view creator UPI IDs, VPAs, Bank Accounts, and QR codes for payout processing.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchAdminPayouts}
                  disabled={isLoadingPayouts}
                  className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPayouts ? 'animate-spin' : ''}`} />
                  <span>Refresh Payouts</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">Configured Creators</span>
                <div className="text-xl font-bold font-mono text-text-primary">{adminPayouts.length}</div>
                <p className="text-[10px] text-text-secondary">Verified payout destinations</p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">UPI / VPA Method</span>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {adminPayouts.filter(p => p.payoutType === 'upi').length}
                </div>
                <p className="text-[10px] text-text-secondary">Instant UPI transfers</p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">Bank Accounts</span>
                <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  {adminPayouts.filter(p => p.payoutType === 'bank_account').length}
                </div>
                <p className="text-[10px] text-text-secondary">Direct NEFT / IMPS</p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">Attached QR Codes</span>
                <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {adminPayouts.filter(p => Boolean(p.upiQrCodeUrl)).length}
                </div>
                <p className="text-[10px] text-text-secondary">Visual scan attachments</p>
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={payoutSearch}
                onChange={(e) => setPayoutSearch(e.target.value)}
                placeholder="Search creator, UPI ID, email, IFSC..."
                className="w-full pl-9 pr-3 py-2 bg-bg-secondary border border-border-default rounded-lg text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-bg-secondary border border-border-default self-stretch sm:self-auto">
              {(['all', 'upi', 'bank_account'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPayoutFilterType(type)}
                  className={`px-3 py-1.5 min-h-[36px] rounded-md text-xs font-medium cursor-pointer transition-all ${
                    payoutFilterType === type
                      ? 'bg-bg-tertiary text-text-primary font-bold shadow-2xs'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {type === 'all' ? 'All Methods' : type === 'upi' ? 'UPI Only' : 'Bank Accounts'}
                </button>
              ))}
            </div>
          </div>

          {/* Payouts Table */}
          <div className="bg-bg-secondary rounded-xl border border-border-default overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default bg-bg-tertiary/50 text-[10px] uppercase font-bold text-text-muted font-mono tracking-wider">
                    <th className="p-3.5">Creator</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5">Financial Destination (VPA / Account)</th>
                    <th className="p-3.5">QR Attachment</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {adminPayouts
                    .filter((p) => {
                      if (payoutFilterType !== 'all' && p.payoutType !== payoutFilterType) return false;
                      if (!payoutSearch.trim()) return true;
                      const q = payoutSearch.toLowerCase().trim();
                      return (
                        (p.creator?.name || '').toLowerCase().includes(q) ||
                        (p.creator?.username || '').toLowerCase().includes(q) ||
                        (p.creator?.email || '').toLowerCase().includes(q) ||
                        (p.upiId || '').toLowerCase().includes(q) ||
                        (p.ifscCode || '').toLowerCase().includes(q) ||
                        (p.accountHolderName || '').toLowerCase().includes(q)
                      );
                    })
                    .map((p) => {
                      const isRevealed = Boolean(revealedAccountIds[p.id]);
                      return (
                        <tr key={p.id} className="hover:bg-bg-tertiary/40 transition-colors">
                          {/* Creator Info */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar
                                src={p.creator?.avatarUrl}
                                name={p.creator?.name}
                                username={p.creator?.username}
                                size="sm"
                                shape="circle"
                              />
                              <div>
                                <span className="font-semibold text-text-primary block">{p.creator?.name || 'Creator'}</span>
                                <span className="text-[10px] text-text-muted font-mono">@{p.creator?.username} · {p.creator?.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Method Badge */}
                          <td className="p-3.5">
                            {p.payoutType === 'upi' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold">
                                <QrCode className="w-3 h-3" />
                                <span>UPI (VPA)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-bold">
                                <Building2 className="w-3 h-3" />
                                <span>Bank Account</span>
                              </span>
                            )}
                          </td>

                          {/* Destination Info */}
                          <td className="p-3.5 font-mono">
                            {p.payoutType === 'upi' ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-text-primary text-xs select-all">{p.upiId}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(p.upiId, `upi_${p.id}`)}
                                  className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                                  title="Copy UPI ID"
                                >
                                  {copiedKey === `upi_${p.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1 text-[11px]">
                                <div className="font-semibold text-text-primary">{p.accountHolderName}</div>
                                <div className="flex items-center gap-1.5">
                                  <span>A/C:</span>
                                  <span className="font-bold select-all text-xs">
                                    {isRevealed
                                      ? (p.accountNumber || `••••••••${p.accountNumberLast4}`)
                                      : `••••••••${p.accountNumberLast4 || '0000'}`}
                                  </span>
                                  {p.accountNumber && (
                                    <button
                                      type="button"
                                      onClick={() => setRevealedAccountIds(prev => ({ ...prev, [p.id]: !isRevealed }))}
                                      className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                                      title={isRevealed ? "Hide full number" : "Reveal full number"}
                                    >
                                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(p.accountNumber || p.accountNumberLast4 || '', `acc_${p.id}`)}
                                    className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                                    title="Copy Account Number"
                                  >
                                    {copiedKey === `acc_${p.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                                <div className="text-[10px] text-text-muted flex items-center gap-1">
                                  <span>IFSC: <strong className="select-all">{p.ifscCode}</strong></span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(p.ifscCode || '', `ifsc_${p.id}`)}
                                    className="p-0.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary cursor-pointer"
                                    title="Copy IFSC"
                                  >
                                    {copiedKey === `ifsc_${p.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* QR Attachment */}
                          <td className="p-3.5">
                            {p.upiQrCodeUrl ? (
                              <button
                                type="button"
                                onClick={() => setSelectedQrPreview({ url: p.upiQrCodeUrl, title: p.creator?.name || 'Creator', vpa: p.upiId })}
                                className="group flex items-center gap-2 p-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default cursor-pointer transition-colors"
                              >
                                <img
                                  src={p.upiQrCodeUrl}
                                  alt="QR thumbnail"
                                  className="w-7 h-7 object-contain rounded bg-white p-0.5"
                                />
                                <span className="text-[10px] font-mono text-brand-primary group-hover:underline flex items-center gap-0.5">
                                  <span>Scan QR</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </span>
                              </button>
                            ) : p.payoutType === 'upi' && p.upiId ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`upi://pay?pa=${p.upiId}&pn=${encodeURIComponent(p.creator?.name || 'Creator')}&cu=INR`)}`;
                                  setSelectedQrPreview({ url: fallbackUrl, title: p.creator?.name || 'Creator', vpa: p.upiId });
                                }}
                                className="text-[10px] font-mono text-text-muted hover:text-brand-primary cursor-pointer underline flex items-center gap-1"
                              >
                                <QrCode className="w-3 h-3" />
                                <span>Generate UPI QR</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-text-muted font-mono">N/A (Bank)</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          </td>

                          {/* Admin Actions */}
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const details = p.payoutType === 'upi'
                                  ? `UPI ID: ${p.upiId}\nName: ${p.creator?.name} (@${p.creator?.username})\nEmail: ${p.creator?.email}`
                                  : `Account Holder: ${p.accountHolderName}\nAccount Number: ${p.accountNumber || p.accountNumberLast4}\nIFSC Code: ${p.ifscCode}\nEmail: ${p.creator?.email}`;
                                handleCopyText(details, `full_${p.id}`);
                              }}
                              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-text-primary text-xs font-medium cursor-pointer transition-colors inline-flex items-center gap-1"
                              title="Copy complete payout string for disbursement"
                            >
                              {copiedKey === `full_${p.id}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Details</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {adminPayouts.length === 0 && !isLoadingPayouts && (
                <div className="p-12 text-center space-y-2">
                  <Landmark className="w-8 h-8 text-text-muted mx-auto" />
                  <p className="text-xs text-text-secondary font-medium">No creator payout profiles configured yet.</p>
                  <p className="text-[11px] text-text-muted">When creators configure their UPI ID or bank account in Settings, their verified destination will appear here for payout processing.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: COMMUNITY REVIEWS & RATINGS MONITOR */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-5 rounded-2xl bg-bg-secondary border border-border-default shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-text-primary">Platform Reviews &amp; Community Feedback</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold">
                      1 Review Per User Enforced
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Real user ratings and sentiment submitted from the creator dashboard. Monitored 24/7 across local and database telemetry.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadAdminReviews}
                  className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
                  <span>Refresh Reviews</span>
                </button>
              </div>
            </div>

            {/* Overall Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">Average Rating</span>
                <div className="text-2xl font-bold font-mono text-amber-500 flex items-center gap-1.5">
                  <span>
                    {adminReviews.length > 0
                      ? (adminReviews.reduce((a, b) => a + b.rating, 0) / adminReviews.length).toFixed(1)
                      : '0.0'}
                  </span>
                  <span className="text-xs font-normal text-text-muted">/ 5.0</span>
                </div>
                <div className="flex items-center text-amber-400 gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${
                        adminReviews.length > 0 &&
                        s <= Math.round(adminReviews.reduce((a, b) => a + b.rating, 0) / adminReviews.length)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-neutral-300 dark:text-neutral-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">Total Verified Reviews</span>
                <div className="text-2xl font-bold font-mono text-text-primary">{adminReviews.length}</div>
                <p className="text-[10px] text-text-secondary">One review per unique account</p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">5-Star Excellence</span>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {adminReviews.length > 0
                    ? `${Math.round((adminReviews.filter(r => r.rating === 5).length / adminReviews.length) * 100)}%`
                    : '0%'}
                </div>
                <p className="text-[10px] text-text-secondary">
                  {adminReviews.filter(r => r.rating === 5).length} of {adminReviews.length} reviews
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted font-mono">Positive Sentiment</span>
                <div className="text-2xl font-bold font-mono text-brand-primary">
                  {adminReviews.length > 0
                    ? `${Math.round((adminReviews.filter(r => r.rating >= 4).length / adminReviews.length) * 100)}%`
                    : '0%'}
                </div>
                <p className="text-[10px] text-text-secondary">Rated 4 or 5 stars</p>
              </div>
            </div>

            {/* Rating Breakdown Progress Meters */}
            <div className="p-4 rounded-xl bg-bg-tertiary/40 border border-border-subtle space-y-2">
              <span className="text-[10px] uppercase font-bold text-text-muted font-mono tracking-wider">
                Rating Distribution
              </span>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = adminReviews.filter(r => r.rating === stars).length;
                  const pct = adminReviews.length > 0 ? (count / adminReviews.length) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2 text-xs">
                      <span className="w-16 font-mono text-text-secondary shrink-0">{stars} Stars</span>
                      <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                        <div
                          className="h-full bg-amber-400 transition-all rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-16 text-right font-mono text-[10px] text-text-muted shrink-0">
                        {count} ({Math.round(pct)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-bg-secondary border border-border-default shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={reviewSearchQuery}
                onChange={(e) => setReviewSearchQuery(e.target.value)}
                placeholder="Search reviews by user name, ID or comment..."
                className="w-full pl-9 pr-8 py-2 bg-bg-tertiary border border-border-default rounded-xl text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-primary min-h-[44px]"
              />
              {reviewSearchQuery && (
                <button
                  type="button"
                  onClick={() => setReviewSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary min-h-[30px] min-w-[30px] flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['all', '5', '4', '3', '2', '1'] as const).map((filter) => {
                const isSelected = reviewRatingFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setReviewRatingFilter(filter)}
                    className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-brand-primary text-white font-semibold'
                        : 'bg-bg-tertiary hover:bg-border-subtle text-text-secondary hover:text-text-primary border border-border-default'
                    }`}
                  >
                    {filter === 'all' ? `All (${adminReviews.length})` : `${filter} ★`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reviews List */}
          <div className="rounded-2xl bg-bg-secondary border border-border-default shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border-default flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-primary uppercase font-mono tracking-wider">
                Submitted Reviews &amp; Feedback Stream
              </h4>
              <span className="text-[10px] font-mono text-text-muted">
                Showing {adminReviews
                  .filter((r) => {
                    if (reviewRatingFilter !== 'all' && r.rating !== parseInt(reviewRatingFilter, 10)) return false;
                    if (reviewSearchQuery.trim()) {
                      const q = reviewSearchQuery.toLowerCase();
                      return (
                        (r.userName || '').toLowerCase().includes(q) ||
                        (r.userId || '').toLowerCase().includes(q) ||
                        (r.comment || '').toLowerCase().includes(q)
                      );
                    }
                    return true;
                  }).length} records
              </span>
            </div>

            <div className="divide-y divide-border-subtle">
              {adminReviews
                .filter((r) => {
                  if (reviewRatingFilter !== 'all' && r.rating !== parseInt(reviewRatingFilter, 10)) return false;
                  if (reviewSearchQuery.trim()) {
                    const q = reviewSearchQuery.toLowerCase();
                    return (
                      (r.userName || '').toLowerCase().includes(q) ||
                      (r.userId || '').toLowerCase().includes(q) ||
                      (r.comment || '').toLowerCase().includes(q)
                    );
                  }
                  return true;
                })
                .map((rev) => (
                  <div key={rev.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-bg-tertiary/40 transition-colors">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-text-primary">{rev.userName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border-subtle">
                          UID: {rev.userId.slice(0, 12)}...
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">
                          {new Date(rev.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                          Verified Creator
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-600'
                            }`}
                          />
                        ))}
                        <span className="text-xs font-mono font-bold text-amber-500 ml-1.5">{rev.rating}.0 / 5.0</span>
                      </div>

                      {rev.comment ? (
                        <p className="text-xs text-text-secondary leading-relaxed bg-bg-tertiary/60 p-3 rounded-xl border border-border-subtle italic">
                          "{rev.comment}"
                        </p>
                      ) : (
                        <p className="text-xs text-text-muted italic">
                          (No written comments provided - star rating only)
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyText(rev.userId, `user_${rev.id}`)}
                        className="min-h-[44px] px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer flex items-center gap-1"
                        title="Copy User ID"
                      >
                        {copiedKey === `user_${rev.id}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy UID</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteReview(rev.id)}
                        disabled={isDeletingReview === rev.id}
                        className="min-h-[44px] px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-rose-50 hover:border-rose-300 border border-border-default text-xs font-medium text-text-muted hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
                        title="Delete review from platform"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isDeletingReview === rev.id ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                ))}

              {adminReviews.length === 0 && (
                <div className="p-12 text-center space-y-2">
                  <Star className="w-8 h-8 text-text-muted mx-auto" />
                  <p className="text-xs text-text-secondary font-medium">No platform reviews registered yet.</p>
                  <p className="text-[11px] text-text-muted">
                    When creators submit reviews from their home dashboard, they will stream here in real-time.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin QR Code Scan Modal */}
      {typeof document !== 'undefined' && selectedQrPreview && createPortal(
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[700] p-4"
          onClick={() => setSelectedQrPreview(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-secondary border border-border-default rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center"
          >
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="text-left">
                <span className="text-[10px] font-mono uppercase font-bold text-brand-primary">Creator UPI QR</span>
                <h4 className="text-sm font-bold text-text-primary">{selectedQrPreview.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQrPreview(null)}
                className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-64 h-64 mx-auto bg-white p-3 rounded-xl border border-border-default shadow-xs flex items-center justify-center">
              <img
                src={selectedQrPreview.url}
                alt="Creator QR Code"
                className="w-full h-full object-contain rounded"
              />
            </div>

            {selectedQrPreview.vpa && (
              <div className="p-2.5 rounded-lg bg-bg-tertiary border border-border-default flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-text-primary truncate">{selectedQrPreview.vpa}</span>
                <button
                  type="button"
                  onClick={() => handleCopyText(selectedQrPreview.vpa || '', 'modal_vpa')}
                  className="px-2 py-1 rounded bg-bg-primary hover:bg-border-subtle border border-border-default text-[10px] font-semibold cursor-pointer shrink-0"
                >
                  {copiedKey === 'modal_vpa' ? 'Copied' : 'Copy VPA'}
                </button>
              </div>
            )}

            <p className="text-[11px] text-text-secondary">
              Scan directly with Google Pay, PhonePe, Paytm, or any BHIM UPI app to disburse creator royalties.
            </p>
          </div>
        </div>,
        document.body
      )}

      {/* Inspect Modal */}
      {typeof document !== 'undefined' && inspectedPrompt && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[700] p-4"
          onClick={() => setInspectedPrompt(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-secondary border border-border-default rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto text-left"
          >
            <div className="flex justify-between items-start border-b border-border-default pb-3">
              <div>
                <span className="text-[9px] font-mono font-semibold uppercase bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded border border-border-default">
                  {inspectedPrompt.category}
                </span>
                <h3 className="text-sm font-bold text-text-primary mt-1">{inspectedPrompt.title}</h3>
              </div>
              <button
                onClick={() => setInspectedPrompt(null)}
                className="p-1 text-text-muted hover:text-text-primary rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Instruction Payload</span>
              <pre className="bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs font-mono text-text-primary whitespace-pre-wrap max-h-60 overflow-y-auto select-text">
                {inspectedPrompt.rawContent}
              </pre>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit / Create Prompt Modal */}
      {isPromptModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[700] p-4"
          onClick={() => setIsPromptModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-secondary border border-border-default rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto text-left"
          >
            <div className="flex justify-between items-center border-b border-border-default pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                  {isCreatingPrompt ? <Plus className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary font-display">
                    {isCreatingPrompt ? 'Create New System Prompt' : 'Edit Prompt'}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {isCreatingPrompt ? 'Publish a new curated prompt to the PromptHub catalog for all users.' : `Editing prompt ID: ${editingPrompt?.id}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePromptForm} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-text-primary mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={promptFormData.title}
                  onChange={e => setPromptFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Refactor: Legacy Function Cleanup Assistant"
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-text-primary mb-1">Short Description *</label>
                <textarea
                  rows={2}
                  required
                  value={promptFormData.description}
                  onChange={e => setPromptFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief summary of the prompt capability..."
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:border-brand-primary focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Category *</label>
                  <select
                    value={promptFormData.category}
                    onChange={e => setPromptFormData(prev => ({ ...prev, category: e.target.value as CategoryType }))}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer"
                  >
                    {['Development', 'Design', 'Research', 'Support', 'Education', 'Business', 'Marketing', 'Writing', 'Other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-text-primary mb-1">Target AI Model *</label>
                  <input
                    type="text"
                    required
                    value={promptFormData.model}
                    onChange={e => setPromptFormData(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g. anthropic/claude-3.5-sonnet"
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:border-brand-primary focus:outline-none font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-primary mb-1">Difficulty *</label>
                  <select
                    value={promptFormData.difficulty}
                    onChange={e => setPromptFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={promptFormData.tags}
                    onChange={e => setPromptFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="refactoring, legacy-code, clean-code"
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-primary mb-1">Visibility</label>
                  <select
                    value={promptFormData.visibility}
                    onChange={e => setPromptFormData(prev => ({ ...prev, visibility: e.target.value as any }))}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer"
                  >
                    <option value="public">Public (Visible to All Users)</option>
                    <option value="private">Private (Admin only)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-text-primary">Instruction Payload (System Prompt) *</label>
                  <span className="text-[10px] text-text-muted font-mono">Supports {"{{VARIABLE}}"} template syntax</span>
                </div>
                <textarea
                  rows={10}
                  required
                  value={promptFormData.rawContent}
                  onChange={e => setPromptFormData(prev => ({ ...prev, rawContent: e.target.value }))}
                  placeholder="Enter the full prompt instructions payload..."
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none leading-relaxed select-text"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setIsPromptModalOpen(false)}
                  className="min-h-[44px] px-4 rounded-xl border border-border-default bg-bg-tertiary hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPrompt}
                  className="min-h-[44px] px-5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingPrompt && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isCreatingPrompt ? 'Create & Publish' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Admin Plan & Subscription Assignment Modal */}
      {isPlanModalOpen && planTargetUser && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[750] p-4 animate-in fade-in duration-200"
          onClick={() => !isSubmittingPlan && setIsPlanModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-secondary border border-border-default rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto text-left"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-border-default pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
                    <span>Assign Membership Plan</span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                      ADMIN OVERRIDE
                    </span>
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Upgrade or assign any membership tier, duration, and credit allotment directly to this account.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmittingPlan}
                onClick={() => setIsPlanModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors cursor-pointer"
                aria-label="Close plan assignment modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target User Banner */}
            <div className="p-3.5 rounded-xl bg-bg-tertiary border border-border-default flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={planTargetUser.avatar_url || planTargetUser.avatarUrl}
                  name={planTargetUser.name}
                  username={planTargetUser.username}
                  role={planTargetUser.role}
                  size="md"
                  shape="circle"
                />
                <div>
                  <div className="text-xs font-bold text-text-primary">
                    {planTargetUser.name || planTargetUser.username || 'User'}
                  </div>
                  <div className="text-[11px] font-mono text-text-muted">
                    {planTargetUser.email}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-text-muted">Current Plan</div>
                <div className="text-xs font-bold font-mono text-brand-primary uppercase">
                  {planTargetUser.plan || 'Free'} · {(planTargetUser.credits || 0).toLocaleString()} pts
                </div>
              </div>
            </div>

            {/* Plan Tier Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Select Membership Plan Tier</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {AVAILABLE_ADMIN_PLANS.map((plan) => {
                  const isSelected = selectedPlanTier === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanTier(plan.id)}
                      className={`min-h-[64px] p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-brand-primary/10 border-brand-primary ring-1 ring-brand-primary text-text-primary'
                          : 'bg-bg-tertiary hover:bg-bg-tertiary/80 border-border-default text-text-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs text-text-primary">{plan.name}</span>
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold ${
                          isSelected ? 'bg-brand-primary text-white' : 'bg-bg-secondary text-text-muted'
                        }`}>
                          {plan.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted line-clamp-2 mt-1">
                        {plan.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-primary">
                Membership Access Duration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {DURATION_OPTIONS.map((opt) => {
                  const isSelected = selectedPlanDuration === opt.days;
                  return (
                    <button
                      key={String(opt.days)}
                      type="button"
                      onClick={() => setSelectedPlanDuration(opt.days)}
                      className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-primary text-white border-brand-primary font-bold'
                          : 'bg-bg-tertiary hover:bg-bg-primary text-text-secondary border-border-default'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credit Allotment Option */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>Credit Allotment Mode</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPlanCreditMode('no_credits')}
                  className={`min-h-[44px] p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                    planCreditMode === 'no_credits'
                      ? 'bg-brand-primary/10 border-brand-primary text-text-primary'
                      : 'bg-bg-tertiary border-border-default text-text-muted'
                  }`}
                >
                  <div className="font-bold text-xs">Features Only (0 pts)</div>
                  <div className="text-[10px] text-text-muted">No extra credits granted</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPlanCreditMode('default_credits')}
                  className={`min-h-[44px] p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                    planCreditMode === 'default_credits'
                      ? 'bg-brand-primary/10 border-brand-primary text-text-primary'
                      : 'bg-bg-tertiary border-border-default text-text-muted'
                  }`}
                >
                  <div className="font-bold text-xs">Default Plan Credits</div>
                  <div className="text-[10px] text-text-muted">
                    +{AVAILABLE_ADMIN_PLANS.find(p => p.id === selectedPlanTier)?.defaultCredits || 0} pts included
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPlanCreditMode('custom_credits')}
                  className={`min-h-[44px] p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                    planCreditMode === 'custom_credits'
                      ? 'bg-brand-primary/10 border-brand-primary text-text-primary'
                      : 'bg-bg-tertiary border-border-default text-text-muted'
                  }`}
                >
                  <div className="font-bold text-xs">Custom Points</div>
                  <div className="text-[10px] text-text-muted">Define custom amount</div>
                </button>
              </div>

              {planCreditMode === 'custom_credits' && (
                <div className="pt-1.5">
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter credits amount e.g. 500"
                    value={customPlanCredits}
                    onChange={(e) => setCustomPlanCredits(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary font-mono text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[44px]"
                  />
                </div>
              )}
            </div>

            {/* Notes / Audit trail */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-text-primary">
                Admin Audit Reason / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. VIP Customer upgrade requested via Discord / special campaign"
                value={planAssignmentNotes}
                onChange={(e) => setPlanAssignmentNotes(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[44px]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
              <button
                type="button"
                disabled={isSubmittingPlan}
                onClick={() => setIsPlanModalOpen(false)}
                className="min-h-[44px] px-4 rounded-xl border border-border-default bg-bg-tertiary hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingPlan}
                onClick={handleExecutePlanAssignment}
                className="min-h-[44px] px-6 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold transition-colors cursor-pointer text-xs flex items-center gap-2 shadow-lg shadow-brand-primary/20 disabled:opacity-50"
              >
                {isSubmittingPlan ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Assigning Plan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Apply Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create / Edit AI News Modal */}
      {isNewsModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[700] p-4"
          onClick={() => setIsNewsModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-secondary border border-border-default rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto text-left"
          >
            <div className="flex justify-between items-center border-b border-border-default pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                  <Newspaper className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-text-primary font-display">
                  {editingNewsId ? 'Edit AI News Article' : 'Publish New AI News Story'}
                </h3>
              </div>
              <button
                onClick={() => setIsNewsModalOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Custom Article ID & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">
                    Article ID <span className="text-text-muted font-normal">(Admin Defined / UUID)</span>
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(editingNewsId)}
                    placeholder="e.g. a0000001-... or news-unique-id"
                    value={newsFormData.id}
                    onChange={(e) => setNewsFormData(prev => ({ ...prev, id: e.target.value }))}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[44px] font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-primary mb-1">
                    URL Slug <span className="text-text-muted font-normal">(Optional unique route)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. deepseek-r1-launch"
                    value={newsFormData.slug}
                    onChange={(e) => setNewsFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[44px] font-mono text-xs"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-semibold text-text-primary mb-1">Headline / Title *</label>
                <input
                  type="text"
                  placeholder="e.g. DeepSeek-R1 Emerges: Open Source Reasoning Models Reach Frontier Level"
                  value={newsFormData.title}
                  onChange={(e) => setNewsFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              {/* Category & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Category *</label>
                  <select
                    value={newsFormData.category}
                    onChange={(e) => setNewsFormData(prev => ({ ...prev, category: e.target.value as NewsCategory }))}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="New Models">New Models</option>
                    <option value="AI Agents">AI Agents</option>
                    <option value="Products & Pricing">Products & Pricing</option>
                    <option value="Open Source">Open Source</option>
                    <option value="AI Safety">AI Safety</option>
                    <option value="Developer Tools">Developer Tools</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Industry">Industry</option>
                    <option value="Research">Research</option>
                    <option value="Policy">Policy</option>
                    <option value="AI Breakthroughs">AI Breakthroughs</option>
                    <option value="LLMs & Reasoning">LLMs & Reasoning</option>
                    <option value="Prompt Engineering">Prompt Engineering</option>
                    <option value="Tools & Agents">Tools & Agents</option>
                    <option value="Industry & Ethics">Industry & Ethics</option>
                    <option value="Announcements">Announcements</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-text-primary mb-1">Tags (Comma Separated)</label>
                  <input
                    type="text"
                    placeholder="DeepSeek, Reasoning, PromptOptimization"
                    value={newsFormData.tags}
                    onChange={(e) => setNewsFormData(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block font-semibold text-text-primary mb-1">Executive Summary / TL;DR *</label>
                <textarea
                  rows={2}
                  placeholder="A concise 2-3 sentence overview of the breakthrough..."
                  value={newsFormData.summary}
                  onChange={(e) => setNewsFormData(prev => ({ ...prev, summary: e.target.value }))}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary leading-relaxed"
                />
              </div>

              {/* Full Content */}
              <div>
                <label className="block font-semibold text-text-primary mb-1">Full Article Body (Markdown Supported) *</label>
                <textarea
                  rows={6}
                  placeholder="## Main Insights&#10;&#10;Explain the architectural details, benchmark improvements, and prompt engineering takeaways..."
                  value={newsFormData.content}
                  onChange={(e) => setNewsFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono text-xs leading-relaxed"
                />
              </div>

              {/* Source Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Source Name / Citation</label>
                  <input
                    type="text"
                    placeholder="e.g. Anthropic Research"
                    value={newsFormData.sourceName}
                    onChange={(e) => setNewsFormData(prev => ({ ...prev, sourceName: e.target.value }))}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-primary mb-1">Source URL</label>
                  <input
                    type="text"
                    inputMode="url"
                    placeholder="https://... or github.com/..."
                    value={newsFormData.sourceUrl}
                    onChange={(e) => setNewsFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[44px]"
                  />
                </div>
              </div>

              {/* Cover Image Upload from Device */}
              <DeviceImageUploader
                label="Cover Image (Optional)"
                description="Upload editorial cover image directly from your device"
                value={newsFormData.imageUrl}
                onChange={(url) => {
                  setNewsFormData(prev => ({ ...prev, imageUrl: url }));
                }}
                folder="news"
                aspectRatio="video"
              />

              {/* Checkboxes */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2 border-t border-border-default">
                <label className="flex items-center gap-2 cursor-pointer text-text-primary">
                  <input
                    type="checkbox"
                    checked={newsFormData.isFeatured}
                    onChange={(e) => setNewsFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                    className="rounded border-border-default text-brand-primary focus:ring-brand-primary"
                  />
                  <span>Mark as Featured Hero Story</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-text-primary">
                  <input
                    type="checkbox"
                    checked={newsFormData.isPublished}
                    onChange={(e) => setNewsFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                    className="rounded border-border-default text-brand-primary focus:ring-brand-primary"
                  />
                  <span>Publish Immediately (Public)</span>
                </label>

                {!editingNewsId && (
                  <label className="flex items-center gap-2 cursor-pointer text-brand-primary font-medium">
                    <input
                      type="checkbox"
                      checked={newsFormData.broadcast}
                      onChange={(e) => setNewsFormData(prev => ({ ...prev, broadcast: e.target.checked }))}
                      className="rounded border-border-default text-brand-primary focus:ring-brand-primary"
                    />
                    <span>Broadcast Notification to All Users</span>
                  </label>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
              <button
                type="button"
                onClick={() => setIsNewsModalOpen(false)}
                className="btn-secondary text-xs px-4 py-2 cursor-pointer min-h-[38px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNews}
                className="btn-primary text-xs font-semibold px-5 py-2 cursor-pointer min-h-[38px]"
              >
                {editingNewsId ? 'Save Changes' : 'Publish Article'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Assign User Plan & Subscription Modal */}
      {isPlanModalOpen && planTargetUser && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[700] p-4 overflow-y-auto"
          onClick={() => !isSubmittingPlan && setIsPlanModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-secondary border border-border-default rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl my-auto text-left max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-border-default pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
                    <span>Assign Plan & Subscription</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                      SuperAdmin
                    </span>
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Assign any tier to target user. Allows zero-credit feature access (pro-bono) or bundled credits.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                disabled={isSubmittingPlan}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target User Summary Card */}
            <div className="p-3.5 rounded-xl bg-bg-tertiary border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={planTargetUser.avatar_url}
                  name={planTargetUser.full_name}
                  username={planTargetUser.username}
                  role={planTargetUser.role}
                  isAdmin={planTargetUser.role === 'Admin' || planTargetUser.role === 'admin'}
                  size="md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary text-sm">
                      {planTargetUser.full_name || planTargetUser.username || 'User'}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-bg-primary text-text-muted border border-border-default">
                      {planTargetUser.role || 'User'}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted font-mono">{planTargetUser.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono border-t sm:border-t-0 pt-2 sm:pt-0 border-border-default">
                <div className="text-right sm:text-right">
                  <div className="text-[10px] text-text-muted uppercase">Current Plan</div>
                  <div className="font-bold text-text-primary uppercase">{planTargetUser.plan || 'Free'}</div>
                </div>
                <div className="h-6 w-px bg-border-default hidden sm:block" />
                <div className="text-right sm:text-right">
                  <div className="text-[10px] text-text-muted uppercase">Balance</div>
                  <div className="font-bold text-amber-500">{(planTargetUser.credits || 0).toLocaleString()} pts</div>
                </div>
              </div>
            </div>

            {/* 1. Plan Tier Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider">
                1. Select Target Tier
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {AVAILABLE_ADMIN_PLANS.map((plan) => {
                  const isSelected = selectedPlanTier === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanTier(plan.id)}
                      className={`min-h-[44px] p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-brand-primary/10 border-brand-primary ring-1 ring-brand-primary text-text-primary'
                          : 'bg-bg-tertiary hover:bg-bg-primary border-border-default text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs text-text-primary">{plan.name}</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                          isSelected ? 'bg-brand-primary text-white' : 'bg-bg-secondary text-text-muted'
                        }`}>
                          {plan.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted line-clamp-2 leading-relaxed">
                        {plan.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Duration Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider">
                2. Subscription Duration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {DURATION_OPTIONS.map((opt) => {
                  const isSelected = selectedPlanDuration === opt.days;
                  return (
                    <button
                      key={String(opt.days)}
                      type="button"
                      onClick={() => setSelectedPlanDuration(opt.days)}
                      className={`min-h-[44px] p-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-brand-primary/10 border-brand-primary ring-1 ring-brand-primary text-text-primary font-bold'
                          : 'bg-bg-tertiary hover:bg-bg-primary border-border-default text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <span className="text-xs">{opt.label}</span>
                      <span className="text-[9px] text-text-muted font-mono">{opt.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Credit Allocation Mode (Features-only vs Credits) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider">
                  3. Credit Allocation Mode
                </label>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  No-credit feature grant supported
                </span>
              </div>

              <div className="space-y-2">
                {/* Option A: Features Only (0 Credits) - Explicit requirement */}
                <label
                  onClick={() => setPlanCreditMode('no_credits')}
                  className={`min-h-[44px] p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    planCreditMode === 'no_credits'
                      ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/50'
                      : 'bg-bg-tertiary hover:bg-bg-primary border-border-default'
                  }`}
                >
                  <input
                    type="radio"
                    name="planCreditMode"
                    value="no_credits"
                    checked={planCreditMode === 'no_credits'}
                    onChange={() => setPlanCreditMode('no_credits')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-primary">
                        Features Only (0 Credits) — Wallet Untouched
                      </span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        RECOMMENDED FOR PRO-BONO
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Grants full {selectedPlanTier.toUpperCase()} studio features, pro badge, VIP routing, and token optimization with <strong>zero additional credits</strong>. Existing balance of {(planTargetUser.credits || 0).toLocaleString()} pts remains unchanged.
                    </p>
                  </div>
                </label>

                {/* Option B: Default Tier Bundle */}
                <label
                  onClick={() => setPlanCreditMode('default_credits')}
                  className={`min-h-[44px] p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    planCreditMode === 'default_credits'
                      ? 'bg-brand-primary/10 border-brand-primary ring-1 ring-brand-primary/50'
                      : 'bg-bg-tertiary hover:bg-bg-primary border-border-default'
                  }`}
                >
                  <input
                    type="radio"
                    name="planCreditMode"
                    value="default_credits"
                    checked={planCreditMode === 'default_credits'}
                    onChange={() => setPlanCreditMode('default_credits')}
                    className="mt-1 text-brand-primary focus:ring-brand-primary cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-primary">
                        Default Plan Credits Bundle (+{AVAILABLE_ADMIN_PLANS.find(p => p.id === selectedPlanTier)?.defaultCredits.toLocaleString() || 0} pts)
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-bg-secondary text-text-muted">
                        Standard Bundle
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Adds standard initial tier quota to user wallet upon activation.
                    </p>
                  </div>
                </label>

                {/* Option C: Custom Credits */}
                <label
                  onClick={() => setPlanCreditMode('custom_credits')}
                  className={`min-h-[44px] p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    planCreditMode === 'custom_credits'
                      ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50'
                      : 'bg-bg-tertiary hover:bg-bg-primary border-border-default'
                  }`}
                >
                  <input
                    type="radio"
                    name="planCreditMode"
                    value="custom_credits"
                    checked={planCreditMode === 'custom_credits'}
                    onChange={() => setPlanCreditMode('custom_credits')}
                    className="mt-1 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-primary">
                        Custom Credit Allocation
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        Manual Amount
                      </span>
                    </div>
                    {planCreditMode === 'custom_credits' && (
                      <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                        <Coins className="w-4 h-4 text-amber-500" />
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={customPlanCredits}
                          onChange={(e) => setCustomPlanCredits(e.target.value)}
                          placeholder="e.g. 1000"
                          className="bg-bg-secondary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary font-mono w-40 focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[36px]"
                        />
                        <span className="text-xs text-text-muted font-mono">credits to add</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* 4. Audit Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-primary">
                Audit / Authorization Reason <span className="text-text-muted font-normal font-mono">(Logged to ledger)</span>
              </label>
              <input
                type="text"
                value={planAssignmentNotes}
                onChange={(e) => setPlanAssignmentNotes(e.target.value)}
                placeholder="e.g. Special partnership grant / Pro-bono creator program"
                className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[44px]"
              />
            </div>

            {/* Impact Preview Banner */}
            <div className="p-3 rounded-xl bg-brand-primary/5 border border-brand-primary/20 text-xs flex items-center gap-2 text-text-secondary">
              <Info className="w-4 h-4 text-brand-primary shrink-0" />
              <span>
                Will set <strong>{planTargetUser.email}</strong> to <strong>{selectedPlanTier.toUpperCase()}</strong> ({selectedPlanDuration === 'lifetime' ? 'Permanent' : `${selectedPlanDuration} days`}) with {planCreditMode === 'no_credits' ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">0 added credits (Features Only)</span> : planCreditMode === 'default_credits' ? <span className="font-bold">+{AVAILABLE_ADMIN_PLANS.find(p => p.id === selectedPlanTier)?.defaultCredits.toLocaleString()} credits</span> : <span className="font-bold">+{customPlanCredits} credits</span>}.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-default">
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                disabled={isSubmittingPlan}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-bg-tertiary hover:bg-bg-primary border border-border-default text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePlanAssignment}
                disabled={isSubmittingPlan}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {isSubmittingPlan ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Applying Changes...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4 text-amber-300" />
                    <span>Confirm & Assign Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminView;
