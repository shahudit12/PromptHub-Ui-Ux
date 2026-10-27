import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { User, Prompt, Collection, Comment, Team, Transaction, ActivityLog, Notification, PromptVersion, TeamMember, TeamInvitation, AdminPromptSubmission, BugReport, ArenaRun, CreditRequest, MarketplacePurchase } from '../db/schema';
import { logger } from '../utils/logger';



import { PromptRepository } from '../repositories/promptRepository';
import { OrgRepository } from '../repositories/orgRepository';
import { AuditRepository } from '../repositories/auditRepository';
import { CollectionRepository } from '../repositories/collectionRepository';
import { AuthService, isValidPersistentUsername, saveVerifiedUserProfile, clearVerifiedUserProfile } from '../services/authService';
import { credentialVault } from '../services/ai/credentialVault';
import { indexedDbVault } from '../utils/indexedDbVault';
import { smartModelResolver } from '../services/ai/smartModelResolver';
import { resetPostHog } from '../lib/posthog';
import { identifyMixpanelUser, resetMixpanel, setMixpanelTeamGroup } from '../lib/mixpanel';
import { bootIntercomUser, updateIntercomUser, shutdownIntercom, bootIntercomVisitor } from '../lib/intercom';
import {
  trackPromptCreated as trackMixpanelPromptCreated,
  trackPromptForked as trackMixpanelPromptForked,
  trackTeamCreated as trackMixpanelTeamCreated,
  trackTeamMemberJoined as trackMixpanelTeamMemberJoined,
  trackSubscriptionCancelled as trackMixpanelSubscriptionCancelled,
  trackAccountDeleted as trackMixpanelAccountDeleted,
} from '../lib/mixpanelEvents';
import { securityUtils } from '../utils/security';
import { isEarlyPioneerEligible } from '../services/badgeService';
import { reconcileUserWallet } from '../services/payment/walletPersistence';
import { TeamInviteService, type SendInviteResult, type ShareableInviteResult, type AcceptInviteResult } from '../services/teamInviteService';
import { fetchUserTopupHistory } from '../services/payment/topupService';
import { streakService } from '../services/streakService';
import { draftPersistenceService } from '../services/draftPersistenceService';
import { followService } from '../services/followService';
import { socialService } from '../services/socialService';
import { identityChangeLimitService } from '../services/identityChangeLimitService';
import {
  trackLogout,
  trackPromptCreated,
  trackPromptUpdated,
  trackPromptDeleted,
  trackPromptPublished,
  trackPromptUnpublished,
  trackPromptFavorited,
  trackPromptUnfavorited,
  trackPromptLiked,
  trackPromptCopied,
  trackPromptForked,
  trackCollectionCreated,
  trackPromptAddedToCollection,
  trackPromptRemovedFromCollection,
  trackScreenViewed,
  trackRouteChanged,
  trackDashboardViewed,
  trackSettingsViewed,
  trackProfileViewed,
} from '../lib/posthogEvents';
import { normalizeError } from '../utils/errorMessages';
import { isPaidPrompt, isAdminPremiumPrompt, hasPremiumPromptAccess } from '../utils/isPaidUser';
import { getUserPlanTier } from '../config/billingConfig';

export type TabType = 
  | 'home' 
  | 'create-and-improve'
  | 'work'
  | 'workspace'
  | 'developer'
  | 'developer-mode'
  | 'news'
  | 'pricing'
  | 'recharge'
  | 'wallet'
  | 'dashboard' 
  | 'agents'
  | 'library'
  | 'collections' 
  | 'community' 
  | 'marketplace' 
  | 'teams' 
  | 'team-accept'
  | 'leaderboard' 
  | 'settings' 
  | 'admin'
  | 'analyzer'
  | 'arena'
  | 'classic-studio'
  | 'explore'
  | 'create-prompt'
  | 'profile'
  | 'search'
  | 'credentials'
  | 'models'
  | 'models-guide'
  | 'storage'
  | 'vault'
  | 'graph'
  | 'prompt-drops'
  | 'drops'
  | 'notifications'
  | 'legal'
  | 'terms'
  | 'privacy'
  | 'cookies'
  | 'auth'
  | 'pitch'
  | 'presentation'
  | '404'
  | 'payment-failed'
  | 'access-denied'
  | 'maintenance'
  | 'support';

export type AuthStatus = 'INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'AUTH_ERROR';
export type ProfileStatus = 'IDLE' | 'LOADING' | 'LOADED' | 'ERROR';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextProps {
  user: User | null;
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  authStatus: AuthStatus;
  profileStatus: ProfileStatus;
  authError: string | null;
  profileError: string | null;
  retryAuth: () => void;
  isModelExplanationOpen: boolean;
  setIsModelExplanationOpen: (open: boolean) => void;
  passwordRecoveryMode: boolean;
  clearPasswordRecoveryMode: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  prompts: Prompt[];
  collections: Collection[];
  teams: Team[];
  activeTeamId: string | null;
  setActiveTeamId: (teamId: string | null) => void;
  activeTeam: Team | null;
  transactions: Transaction[];
  activities: ActivityLog[];
  notifications: Notification[];
  activeTab: TabType;
  activePromptId: string | null;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  login: (userData: any) => void;
  register: (userData: any) => void;
  logout: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setActiveTab: (tab: TabType) => void;
  setActivePromptId: (id: string | null) => void;
  refreshState: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  createPrompt: (promptData: Partial<Prompt>) => Promise<Prompt>;
  updatePrompt: (id: string, promptData: Partial<Prompt>) => Promise<Prompt>;
  deletePrompt: (id: string) => Promise<void>;
  forkPrompt: (id: string) => Promise<Prompt>;
  createCollection: (name: string, description: string, isPrivate: boolean, bannerUrl?: string) => Promise<Collection>;
  updateCollection: (id: string, data: Partial<Collection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addPromptToCollection: (collectionId: string, promptId: string) => Promise<void>;
  removePromptFromCollection: (collectionId: string, promptId: string) => Promise<void>;
  addComment: (promptId: string, content: string) => Promise<Comment>;
  updatePromptCommentsCount: (promptId: string, count: number) => void;
  updatePromptSharesCount: (promptId: string, countOrIncrement?: number | boolean) => void;
  sharePrompt: (prompt: Prompt) => Promise<{ success: boolean; method: 'native' | 'clipboard'; isFirstShare: boolean }>;
  createTeam: (name: string, description?: string) => Promise<Team>;
  createTeamInviteLink: (teamId: string, role: string, label?: string) => Promise<ShareableInviteResult>;
  joinTeamWithToken: (inviteToken: string) => Promise<AcceptInviteResult>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  addTeamMember: (teamId: string, email: string, role: string) => Promise<SendInviteResult | void>;
  fetchPendingInvitations: (teamId: string) => Promise<any[]>;
  revokeTeamInvite: (inviteId: string, teamId: string) => Promise<void>;
  removeTeamMember: (teamId: string, userId: string) => Promise<void>;
  updateTeamMemberRole: (teamId: string, userId: string, role: 'Admin' | 'Editor' | 'Viewer') => Promise<void>;
  logTeamActivity: (teamId: string, action: string, details?: string) => void;
  importBackup: (jsonData: string) => boolean;
  exportBackup: () => string;
  likedPromptIds: string[];
  toggleLikePrompt: (promptId: string, knownAuthorId?: string) => Promise<boolean>;
  toggleBookmark: (promptId: string) => void;
  toggleFollow: (authorId: string) => void;
  copyPrompt: (promptId: string) => void;
  addNotification: (recipientId: string, type: Notification['type'], senderName: string, senderAvatar: string, promptId?: string, promptTitle?: string, message?: string) => void;
  markNotificationsAsRead: () => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  deleteNotification: (id: string) => void;
  isNotificationCenterOpen: boolean;
  openNotificationCenter: () => void;
  getVersionsForPrompt: (promptId: string) => Promise<PromptVersion[]>;
  getCommentsForPrompt: (promptId: string) => Promise<Comment[]>;
  logActivity: (activity: Omit<ActivityLog, 'id' | 'userId' | 'createdAt'>) => void;
  arenaRuns: ArenaRun[];
  saveArenaRun: (run: ArenaRun) => void;
  deleteArenaRun: (id: string) => void;
  arenaPromptDraft: string;
  setArenaPromptDraft: (prompt: string) => void;
  isBugReportModalOpen: boolean;
  setIsBugReportModalOpen: (open: boolean) => void;
  isSubmitToAdminModalOpen: boolean;
  setIsSubmitToAdminModalOpen: (open: boolean) => void;
  submitToAdminPromptTarget: Prompt | null;
  promptOfTheDay: Prompt | null;
  openSubmitToAdminModal: (prompt: Prompt) => void;
  adminSubmissions: AdminPromptSubmission[];
  submitPromptToAdmin: (targetPrompt: Prompt, noteText?: string) => Promise<void>;
  approveAdminSubmission: (submissionId: string) => Promise<void>;
  rejectAdminSubmission: (submissionId: string, rejectionReason: string) => Promise<void>;
  refreshAdminData: () => Promise<void>;
  bugReports: BugReport[];
  submitBugReport: (data: Omit<BugReport, 'id' | 'userId' | 'userEmail' | 'createdAt' | 'status'>) => Promise<void>;
  approveBugReport: (bugId: string, rewardCredits?: number) => Promise<void>;
  rejectBugReport: (bugId: string, rejectionReason: string) => Promise<void>;
  isFreeCreditModalOpen: boolean;
  setIsFreeCreditModalOpen: (open: boolean) => void;
  creditRequests: CreditRequest[];
  submitCreditRequest: (amount: number, reasonText: string) => Promise<void>;
  loadCreditRequests: () => Promise<void>;
  userPurchases: MarketplacePurchase[];
  registerCompletedPurchase: (promptId: string, purchaseDetails?: {
    purchaseId?: string;
    orderId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    amountPaid?: number;
    currency?: string;
  }) => Promise<void>;

  // Wallet Recharge Modal System
  isRechargeModalOpen: boolean;
  setIsRechargeModalOpen: (open: boolean) => void;
  rechargeInitialAmount: number;
  openRechargeModal: (initialAmount?: number) => void;

  // Studio & Arena Model Navigation Bridge
  selectedStudioModel: string | null;
  setSelectedStudioModel: (modelId: string | null) => void;
  navigateToStudio: (modelId?: string, promptText?: string) => void;
  navigateToArena: (modelId?: string, promptText?: string) => void;

  // Developer Mode (Settings persistent toggle for advanced tools like Classic Studio)
  developerMode: boolean;
  setDeveloperMode: (enabled: boolean) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

const VALID_TABS: TabType[] = [
  'home', 'create-and-improve', 'work', 'pricing', 'recharge', 'wallet', 'dashboard', 'workspace', 'developer', 'developer-mode', 'classic-studio', 'agents', 'library', 'collections', 'community', 
  'marketplace', 'teams', 'team-accept', 'leaderboard', 'settings', 'admin', 
  'analyzer', 'arena', 'explore', 'create-prompt', 'profile', 'search', 'credentials',
  'models-guide', 'models', 'storage', 'vault', 'graph', 'notifications', 'legal', 'terms', 'privacy', 'cookies', 'auth',
  'news', 'pitch', 'presentation', '404', 'payment-failed', 'access-denied', 'maintenance', 'support',
];

export const normalizeTab = (segment: string): TabType => {
  const clean = (segment || '').toLowerCase().trim().replace(/^\/+|\/+$/g, '');
  if (!clean || clean === 'home') return 'home';
  if (clean === 'workspace' || clean === 'create-and-improve' || clean === 'create_and_improve' || clean === 'one-chat' || clean === 'unified') return 'workspace';
  if (clean === 'developer' || clean === 'developer-mode' || clean === 'dev' || clean === 'dev-mode') return 'developer';
  if (clean === 'classic-studio' || clean === 'prompt-studio') return 'classic-studio';
  if (clean === 'work' || clean === 'codex' || clean === 'antigravity') return 'work';
  if (clean === 'pitch' || clean === 'presentation' || clean === 'deck' || clean === 'pitch-deck') return 'pitch';
  if (clean === 'agents' || clean === 'ai-agents' || clean === 'agent-studio') return 'agents';
  if (clean === 'login' || clean === 'signup' || clean === 'auth') return 'auth';
  if (clean === 'reset-password' || clean === 'forgot-password' || clean === 'forgot' || clean === 'reset' || clean === 'verify-email' || clean === 'verify') return 'auth';
  if (clean === 'create' || clean === 'create-prompt') return 'create-prompt';
  if (clean === 'library' || clean === 'prompt-library' || clean === 'prompts') return 'library';
  if (
    clean === 'team-accept' || 
    clean === 'teams/accept-invite' || 
    clean === 'teams/accept' || 
    clean === 'teams/join' || 
    clean === 'join-team' || 
    clean === 'team-invite' || 
    clean.startsWith('teams/accept') || 
    clean.startsWith('team-accept') || 
    clean.startsWith('teams/join')
  ) return 'team-accept';
  if (clean === 'explore') return 'community';
  if (clean === 'models' || clean === 'models-guide') return 'models-guide';
  if (clean === 'storage' || clean === 'vault' || clean === 'assets') return 'storage';
  if (clean === 'cookie-preferences' || clean === 'cookie-settings') return 'cookies';
  if (clean === 'terms' || clean === 'privacy' || clean === 'cookies' || clean === 'legal') return clean as TabType;
  if (clean === '404' || clean === 'not-found' || clean === '404-not-found') return '404';
  if (clean === 'payment-failed' || clean === 'failed-payment' || clean === 'payment/failed') return 'payment-failed';
  if (clean === 'access-denied' || clean === 'forbidden' || clean === '403') return 'access-denied';
  if (clean === 'maintenance' || clean === 'status' || clean === 'system-status' || clean === '503') return 'maintenance';
  if (clean.startsWith('u/') || clean.startsWith('@') || clean.startsWith('user/') || clean.startsWith('creator/') || clean.startsWith('profile/')) {
    return 'community';
  }
  if (clean.startsWith('prompt/') || clean.startsWith('p/')) {
    return 'marketplace';
  }
  if (clean.startsWith('drops') || clean.startsWith('prompt-drops')) {
    return 'marketplace';
  }
  
  if (VALID_TABS.includes(clean as TabType)) {
    return clean as TabType;
  }
  return '404';
};

export const tabToPath = (tab: TabType, promptId?: string | null): string => {
  if (tab === 'home') return '/';
  if (tab === 'developer' || tab === 'developer-mode' || tab === 'classic-studio' || tab === 'arena' || tab === 'analyzer') return '/developer';
  if (tab === 'workspace' && promptId) return `/workspace?prompt=${encodeURIComponent(promptId)}`;
  if (tab === 'workspace') return '/workspace';
  if (tab === 'explore') return '/community';
  if (tab === 'community' && promptId) return `/community?prompt=${encodeURIComponent(promptId)}`;
  if (tab === 'marketplace' && promptId) return `/marketplace?prompt=${encodeURIComponent(promptId)}`;
  if (tab === 'pitch' || tab === 'presentation') return '/pitch';
  if (tab === '404') return '/404';
  if (tab === 'team-accept') {
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      token = search.get('token');
      if (!token && window.location.hash.includes('token=')) {
        const match = window.location.hash.match(/[?&]token=([^&]+)/);
        if (match) token = decodeURIComponent(match[1]);
      }
      if (!token) {
        token = sessionStorage.getItem('prompthub_pending_invite_token') || localStorage.getItem('prompthub_last_invite_token');
      }
    }
    return token ? `/team-accept?token=${encodeURIComponent(token)}` : '/team-accept';
  }
  return `/${tab}`;
};

export const getSafeRedirectPath = (rawPath: string | null | undefined): string | null => {
  if (!rawPath) return null;
  const decoded = decodeURIComponent(rawPath.trim());
  // Disallow protocol-relative URLs (//example.com) or external schemes (https://, javascript:)
  if (decoded.startsWith('//') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) {
    return null;
  }
  return decoded.startsWith('/') ? decoded : `/${decoded}`;
};

export const getPostAuthDestination = (paramsRedirect?: string | null): TabType => {
  const safeParam = getSafeRedirectPath(paramsRedirect);
  if (safeParam) {
    const rawTab = safeParam.replace(/^\/+/, '').split('?')[0];
    if (rawTab && rawTab !== 'auth' && rawTab !== 'login' && rawTab !== 'signup') {
      return normalizeTab(rawTab);
    }
  }

  if (typeof window !== 'undefined') {
    const preAuth = sessionStorage.getItem('prompthub_pre_auth_tab');
    if (preAuth) {
      sessionStorage.removeItem('prompthub_pre_auth_tab');
      const safeTab = getSafeRedirectPath(preAuth);
      if (safeTab) {
        const rawTab = safeTab.replace(/^\/+/, '').split('?')[0];
        if (rawTab && rawTab !== 'auth' && rawTab !== 'login' && rawTab !== 'signup') {
          return normalizeTab(rawTab);
        }
      }
    }
  }

  return 'dashboard';
};

export const parseCurrentLocation = (): { tab: TabType; promptId: string | null } => {
  if (typeof window === 'undefined') return { tab: 'home', promptId: null };

  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

  // If redirect contains OAuth or server error, route directly to auth view
  if (searchParams.has('error') || hashParams.has('error') || searchParams.has('error_description') || hashParams.has('error_description')) {
    return { tab: 'auth', promptId: null };
  }

  // Preserve invite token if present in search or hash
  let inviteToken = searchParams.get('token');
  if (!inviteToken && hash.includes('token=')) {
    const match = hash.match(/[?&]token=([^&]+)/);
    if (match) inviteToken = decodeURIComponent(match[1]);
  }
  if (inviteToken) {
    try {
      sessionStorage.setItem('prompthub_pending_invite_token', inviteToken);
      localStorage.setItem('prompthub_last_invite_token', inviteToken);
    } catch {}
  }

  // 1. Backward-compatible universal hash handler (#community?prompt=..., #/analyzer -> /analyzer)
  if (hash && hash !== '#') {
    const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
    const cleanHash = rawHash.startsWith('/') ? rawHash.slice(1) : rawHash;
    const [hashTab, hashQuery] = cleanHash.split('?');
    const params = new URLSearchParams(hashQuery || '');
    const hashPromptId = params.get('prompt') || params.get('id');

    if (hashTab === 'auth' || hashTab === 'login' || hashTab === 'signup') {
      try {
        window.history.replaceState({ tab: 'auth', promptId: null }, '', '/auth');
      } catch {}
      return { tab: 'auth', promptId: null };
    }

    const normalized = normalizeTab(hashTab);
    const cleanPath = tabToPath(normalized, hashPromptId);
    const fullCleanPath = hashQuery ? `${cleanPath}${cleanPath.includes('?') ? '&' : '?'}${hashQuery}` : cleanPath;
    try {
      window.history.replaceState({ tab: normalized, promptId: hashPromptId }, '', fullCleanPath);
    } catch {}
    return { tab: normalized, promptId: hashPromptId };
  }

  // 2. Modern clean browser URL parsing
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);
  let promptId = params.get('prompt');

  const segment = pathname.startsWith('/') ? pathname.substring(1) : pathname;
  // If pathname is /prompt/<id> or /p/<id>
  if (!promptId && (segment.startsWith('prompt/') || segment.startsWith('p/'))) {
    const parts = segment.split('/');
    if (parts[1]) {
      promptId = decodeURIComponent(parts[1]);
    }
  }

  if (!promptId) {
    promptId = params.get('id');
  }

  const tabParam = params.get('tab') || params.get('view');
  const targetSegment = (!segment || segment === 'home') && tabParam ? tabParam : segment;
  const normalizedTab = normalizeTab(targetSegment);
  return { tab: normalizedTab, promptId };
};

/**
 * Money and entitlement fields are server-authoritative: they may only enter
 * client state by refetching the profile row, never from a caller's argument.
 *
 * `updateUser` used to force-merge whatever the caller passed for these into
 * React state AND localStorage (via saveVerifiedUserProfile), and did it again in
 * its own error handler — so a failed or never-attempted grant still lit up a Pro
 * badge, a balance and an expiry the server had never issued, and the premium UI
 * gated on that. AuthService.updateUserProfile already refuses to persist them,
 * which made the local copy a pure lie.
 *
 * Stripping them is safe for every existing caller: they all pass values the
 * server had just written, and an update with nothing client-writable left makes
 * AuthService.updateUserProfile re-read and return the authoritative row.
 */
const SERVER_AUTHORITATIVE_USER_FIELDS = [
  'credits',
  'freeCredits',
  'paidCredits',
  'promotionalCredits',
  'promotionalCreditsExpiresAt',
  'openrouterCredits',
  'plan',
  'proUntil',
  'hasPremiumAccess',
  'promoActivationClaimed',
  'promoActivationClaimedAt',
  'promoActivationPaymentId',
  'megaLaunchBonusGranted',
  'megaLaunchBonusGrantedAt',
  'launchPromo500Claimed',
  'launchPromo500ClaimedAt',
  'launchPromo500ClaimNumber',
] as const;

const stripServerAuthoritativeFields = (updates: Partial<User>): Partial<User> => {
  const safe: Partial<User> = { ...updates };
  for (const field of SERVER_AUTHORITATIVE_USER_FIELDS) delete safe[field];
  return safe;
};

function getDeviceViewerId(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    let id = localStorage.getItem('ph_device_viewer_id');
    if (!id) {
      id = securityUtils.generateUUID();
      localStorage.setItem('ph_device_viewer_id', id);
    }
    return id;
  } catch {
    return 'guest_device';
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('INITIALIZING');
  const [authError, setAuthError] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('IDLE');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authRetryCounter, setAuthRetryCounter] = useState<number>(0);
  const isAuthLoading = authStatus === 'INITIALIZING';

  // passwordRecoveryMode: true when Supabase fires PASSWORD_RECOVERY (reset link clicked)
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModalState] = useState<boolean>(false);
  // Ref to avoid stale closure in onAuthStateChange for setActiveTabState
  const setActiveTabRef = useRef<((tab: TabType) => void) | null>(null);
  const activeSessionUserIdRef = useRef<string | null>(null);
  const forkingPromptIdsRef = useRef<Set<string>>(new Set());
  const likingPromptIdsRef = useRef<Set<string>>(new Set());
  const followingUsersRef = useRef<Set<string>>(new Set());
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prompthub_active_team_id') || null;
    }
    return null;
  });

  const setActiveTeamId = useCallback((id: string | null) => {
    setActiveTeamIdState(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('prompthub_active_team_id', id);
      else localStorage.removeItem('prompthub_active_team_id');
    }
  }, []);

  const activeTeam = useMemo(() => {
    if (activeTeamId) {
      const match = teams.find(t => t.id === activeTeamId);
      if (match) return match;
    }
    return teams[0] || null;
  }, [teams, activeTeamId]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userPurchases, setUserPurchases] = useState<MarketplacePurchase[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);

  const initialLocation = parseCurrentLocation();
  const [activeTab, setActiveTabState] = useState<TabType>(initialLocation.tab);
  const [activePromptId, setActivePromptIdState] = useState<string | null>(initialLocation.promptId);

  const setShowAuthModal = useCallback((show: boolean) => {
    setShowAuthModalState(show);
    if (show) {
      setActiveTabState('auth');
    }
  }, []);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isBugReportModalOpen, setIsBugReportModalOpen] = useState<boolean>(false);
  const [isSubmitToAdminModalOpen, setIsSubmitToAdminModalOpen] = useState<boolean>(false);
  const [submitToAdminPromptTarget, setSubmitToAdminPromptTarget] = useState<Prompt | null>(null);

  const [isModelExplanationOpen, setIsModelExplanationOpen] = useState<boolean>(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState<boolean>(false);
  const [rechargeInitialAmount, setRechargeInitialAmount] = useState<number>(100);

  const openRechargeModal = useCallback((initialAmount = 100) => {
    setRechargeInitialAmount(initialAmount);
    setIsRechargeModalOpen(true);
  }, []);

  const [likedPromptIds, setLikedPromptIds] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined' && !localStorage.getItem('ph_social_v3_clean_slate')) {
        localStorage.removeItem('prompthub_liked_prompts');
        localStorage.removeItem('prompthub_liked_drops');
        localStorage.removeItem('prompthub_shared_prompts');
        localStorage.removeItem('prompthub_shared_drops');
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('prompthub_comments_') || k.startsWith('ph_user_likes_') || k.startsWith('ph_likes_'))) {
            localStorage.removeItem(k);
          }
        }
        localStorage.setItem('ph_social_v3_clean_slate', 'true');
        return [];
      }
      const stored = localStorage.getItem('prompthub_liked_prompts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // noop
    }
    return [];
  });

  // Synchronize real likes from database when user account changes
  useEffect(() => {
    if (user?.id) {
      PromptRepository.getUserLikes(user.id).then(likes => {
        setLikedPromptIds(likes);
        try {
          localStorage.setItem('prompthub_liked_prompts', JSON.stringify(likes));
        } catch {}
      }).catch(err => {
        logger.warn('[AppContext] Failed to load user likes from database:', err);
      });
    } else {
      setLikedPromptIds([]);
      try {
        localStorage.removeItem('prompthub_liked_prompts');
      } catch {}
    }
  }, [user?.id]);

  // Arena Benchmark Runs (Local workspace session cache)
  const [arenaRuns, setArenaRuns] = useState<ArenaRun[]>(() => {
    try {
      const stored = localStorage.getItem('ph_arena_runs');
      if (stored) return JSON.parse(stored);
    } catch {
      // noop
    }
    return [];
  });

  const [arenaPromptDraft, setArenaPromptDraft] = useState<string>('');

  const saveArenaRun = useCallback((run: ArenaRun) => {
    setArenaRuns(prev => {
      const next = [run, ...prev.filter(r => r.id !== run.id)].slice(0, 50);
      try {
        localStorage.setItem('ph_arena_runs', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const deleteArenaRun = useCallback((runId: string) => {
    setArenaRuns(prev => {
      const next = prev.filter(r => r.id !== runId);
      try {
        localStorage.setItem('ph_arena_runs', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Admin Prompt Submissions Queue (Database Synced)
  const [adminSubmissions, setAdminSubmissions] = useState<AdminPromptSubmission[]>(() => {
    try {
      const stored = localStorage.getItem('ph_admin_submissions');
      if (stored) return JSON.parse(stored);
    } catch {
      // noop
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('ph_admin_submissions', JSON.stringify(adminSubmissions));
    } catch {
      // noop
    }
  }, [adminSubmissions]);

  const submitPromptToAdmin = useCallback(async (targetPrompt: Prompt, noteText?: string) => {
    const submissionId = securityUtils.generateUUID();
    const username = user?.username || user?.name?.toLowerCase().replace(/\s+/g, '_') || 'anonymous_user';
    const newSubmission: AdminPromptSubmission = {
      id: submissionId,
      userId: user?.id || 'guest',
      userName: user?.name || 'Anonymous User',
      username: username.startsWith('@') ? username : `@${username}`,
      userAvatar: user?.avatarUrl || '',
      userEmail: user?.email || '',
      promptId: targetPrompt.id || submissionId,
      promptTitle: targetPrompt.title || 'Untitled Prompt',
      promptDescription: targetPrompt.description || '',
      promptContent: targetPrompt.rawContent || '',
      category: targetPrompt.category || 'Development',
      model: targetPrompt.model || 'openai/gpt-4o',
      note: noteText ? noteText.trim() : 'Submitted via website for admin review',
      status: 'pending',
      rewardGranted: false,
      createdAt: new Date().toISOString(),
    };

    

    setAdminSubmissions(prev => [newSubmission, ...prev]);
    setToasts(prev => [...prev, { id: `toast_${Date.now()}`, message: 'Prompt submitted to admin review successfully!', type: 'success' }]);
  }, [user]);

  // Admin Bug Reports Queue (Database Synced)
  const [bugReports, setBugReports] = useState<BugReport[]>(() => {
    try {
      const stored = localStorage.getItem('ph_bug_reports');
      if (stored) return JSON.parse(stored);
    } catch {
      // noop
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('ph_bug_reports', JSON.stringify(bugReports));
    } catch {
      // noop
    }
  }, [bugReports]);

  const submitBugReport = useCallback(async (data: { title: string; description: string; stepsToReproduce?: string; severity: 'low' | 'medium' | 'high' | 'critical' }) => {
    const reportId = securityUtils.generateUUID();
    const newReport: BugReport = {
      id: reportId,
      userId: user?.id || 'guest',
      userName: user?.name || 'Anonymous User',
      userEmail: user?.email || '',
      title: data.title,
      description: data.description,
      stepsToReproduce: data.stepsToReproduce,
      severity: data.severity,
      status: 'pending',
      rewardGranted: false,
      createdAt: new Date().toISOString(),
    };

    

    setBugReports(prev => [newReport, ...prev]);
    setToasts(prev => [...prev, { id: `toast_${Date.now()}`, message: 'Bug report submitted successfully!', type: 'success' }]);
  }, [user]);

  const approveAdminSubmission = useCallback(async (submissionId: string) => {
    const targetSub = adminSubmissions.find(s => s.id === submissionId);
    if (!targetSub) return;
    setAdminSubmissions(prev =>
      prev.map(s => s.id === submissionId ? { ...s, status: 'approved', rewardGranted: true } : s)
    );
    setToasts(prev => [...prev, { id: `toast_${Date.now()}`, message: 'Submission approved!', type: 'success' }]);
  }, [adminSubmissions]);

  const rejectAdminSubmission = useCallback(async (submissionId: string) => {
    const targetSub = adminSubmissions.find(s => s.id === submissionId);
    if (!targetSub) return;
    setAdminSubmissions(prev =>
      prev.map(s => s.id === submissionId ? { ...s, status: 'rejected' } : s)
    );
    setToasts(prev => [...prev, { id: `toast_${Date.now()}`, message: 'Submission rejected.', type: 'info' }]);
  }, [adminSubmissions]);

  const approveBugReport = useCallback(async (bugId: string) => {
    const targetBug = bugReports.find(b => b.id === bugId);
    if (!targetBug) return;

    setBugReports(prev =>
      prev.map(b => b.id === bugId ? { ...b, status: 'resolved', rewardGranted: true } : b)
    );

    if (user && user.id === targetBug.userId) {
      const refreshed = await AuthService.loadUserProfile(user.id).catch(() => null);
      if (refreshed) setUser(refreshed);
    }

    setToasts(prev => [...prev, { id: `toast_${Date.now()}`, message: 'Bug report approved and marked resolved.', type: 'success' }]);
  }, [bugReports, user]);

  const rejectBugReport = useCallback(async (bugId: string, _reason?: string) => {
    setBugReports(prev =>
      prev.map(b => b.id === bugId ? { ...b, status: 'rejected' } : b)
    );
    setToasts(prev => [...prev, { id: `toast_${Date.now()}`, message: 'Bug report rejected.', type: 'info' }]);
  }, []);

  // Free Credit Request Modal & Queue State
  const [isFreeCreditModalOpen, setIsFreeCreditModalOpen] = useState(false);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>(() => {
    try {
      const stored = localStorage.getItem('ph_credit_requests');
      if (stored) return JSON.parse(stored);
    } catch {
      // noop
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('ph_credit_requests', JSON.stringify(creditRequests));
    } catch {
      // noop
    }
  }, [creditRequests]);

  const loadCreditRequests = useCallback(async () => {}, []);

  const submitCreditRequest = useCallback(async (_amount: number, _reasonText: string) => {
    throw new Error('Free credit grants and credit requests are discontinued. All users start with 0 credits; please top up your wallet or upgrade your plan.');
  }, []);

  const openSubmitToAdminModal = useCallback((prompt: Prompt) => {
    if (!isLoggedIn) {
      setToasts(prev => [...prev, { id: `toast_${Date.now()}`, message: 'Sign in required to submit prompts for showcase & claim 15-day Pro trial!', type: 'info' }]);
      setShowAuthModal(true);
      return;
    }
    setSubmitToAdminPromptTarget(prompt);
    setIsSubmitToAdminModalOpen(true);
  }, [isLoggedIn]);


  // Compute Prompt of the Day (Judged automatically by most copied, liked, & shared data)
  const promptOfTheDay = React.useMemo(() => {
    const publicPrompts = (prompts || []).filter(p => p.visibility === 'public');
    if (publicPrompts.length === 0) return null;

    // Rank strictly by total engagement: (likes * 3 + copies * 3 + forks * 2 + views * 1)
    const sortedByEngagement = [...publicPrompts].sort((a, b) => {
      const scoreA = ((a.likesCount || 0) * 3) + ((a.copiesCount || 0) * 3) + ((a.forksCount || 0) * 2) + (a.viewsCount || 0);
      const scoreB = ((b.likesCount || 0) * 3) + ((b.copiesCount || 0) * 3) + ((b.forksCount || 0) * 2) + (b.viewsCount || 0);
      return scoreB - scoreA;
    });

    return sortedByEngagement[0] || null;
  }, [prompts]);


  const setActivePromptId = useCallback((id: string | null) => {
    setActivePromptIdState(id);
    if (id) {
      const deviceViewerId = getDeviceViewerId();
      PromptRepository.recordPromptView(id, user?.id, deviceViewerId)
        .then(({ viewsCount }) => {
          if (viewsCount > 0) {
            setPrompts(prev => prev.map(p => p.id === id ? { ...p, viewsCount } : p));

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('ph_prompt_view_changed', {
                  detail: { promptId: id, viewsCount, delta: 1 },
                })
              );
            }

            
          }
        })
        .catch((err) => {
          logger.warn('[AppContext] Real view tracking notice:', err);
        });
    }
  }, [user?.id]);

  const setActiveTab = useCallback((newTab: TabType) => {
    let tabDidActuallyChange = false;
    setActiveTabState(prev => {
      if (prev !== newTab) {
        tabDidActuallyChange = true;
        trackRouteChanged({ from: prev, to: newTab });
        if (prev && prev !== '404' && typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('ph_last_valid_tab', prev);
          } catch {}
        }
      }
      return newTab;
    });
    if (tabDidActuallyChange && typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      const mainEl = document.getElementById('main-content');
      if (mainEl) mainEl.scrollTop = 0;
      const scrollable = document.querySelector('#main-content .overflow-y-auto');
      if (scrollable) scrollable.scrollTop = 0;
    }
  }, []);

  // Keep the ref in sync so onAuthStateChange can navigate without a stale closure.
  useEffect(() => {
    setActiveTabRef.current = setActiveTab;
  }, [setActiveTab]);

  // ─── Studio & Arena Model Navigation Bridge ─────────────────────────────────
  const [selectedStudioModel, setSelectedStudioModel] = useState<string | null>(null);

  const navigateToStudio = useCallback((modelId?: string, promptText?: string) => {
    if (modelId) {
      setSelectedStudioModel(modelId);
      smartModelResolver.setLastSelectedModel(modelId, user?.id);
      try {
        sessionStorage.setItem('ph_ide_selected_model', modelId);
      } catch {}
      window.dispatchEvent(new CustomEvent('ph_select_ide_model', { detail: { modelId } }));
    }
    if (promptText) {
      try {
        localStorage.setItem('prompthub_working_prompt_draft', promptText);
        sessionStorage.setItem('ph_creation_workspace_prompt', promptText);
      } catch {}
      window.dispatchEvent(new CustomEvent('ph_set_editor_content', { detail: { content: promptText } }));
    }
    // Store previous tab for back-navigation (Req #2)
    try { sessionStorage.setItem('ph_nav_return_tab', 'studio'); } catch {}
    setActiveTab('workspace');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = '/workspace';
      url.searchParams.delete('mode');
      if (modelId) url.searchParams.set('model', modelId);
      window.history.pushState({ tab: 'workspace', model: modelId }, '', url.toString());
    }
  }, [setActiveTab, user?.id]);

  const navigateToArena = useCallback((modelId?: string, promptText?: string) => {
    if (modelId) {
      setSelectedStudioModel(modelId);
      try {
        sessionStorage.setItem('ph_ide_selected_model', modelId);
      } catch {}
      window.dispatchEvent(new CustomEvent('ph_select_ide_model', { detail: { modelId } }));
    }
    if (promptText) {
      setArenaPromptDraft(promptText);
      try {
        sessionStorage.setItem('ph_creation_workspace_prompt', promptText);
      } catch {}
    }
    // Store previous tab for back-navigation (Req #2)
    try { sessionStorage.setItem('ph_nav_return_tab', 'arena'); } catch {}
    setActiveTab('workspace');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = '/workspace';
      if (modelId) url.searchParams.set('model', modelId);
      window.history.pushState({ tab: 'workspace', model: modelId }, '', url.toString());
    }
  }, [setActiveTab, setArenaPromptDraft]);

  // ─── Developer Mode Toggle State (Locked to false - Under Development) ───────
  const [developerMode] = useState<boolean>(false);

  const setDeveloperMode = useCallback((_enabled: boolean) => {
    // Developer mode features are locked while under active architectural redesign
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('prompthub_developer_mode', 'false');
      }
    } catch {}
  }, []);

  // Sync browser History to state (browser back/forward button support)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initial = parseCurrentLocation();
      try {
        window.history.replaceState({ tab: initial.tab, promptId: initial.promptId }, '', window.location.pathname + window.location.search);
      } catch {}
    }

    const handlePopState = (e: PopStateEvent) => {
      if (e.state && typeof e.state.tab === 'string') {
        setActiveTabState(e.state.tab as TabType);
        setActivePromptIdState(e.state.promptId || null);
      } else {
        const { tab, promptId } = parseCurrentLocation();
        setActiveTabState(tab);
        setActivePromptIdState(promptId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state to Clean Browser URL (history.pushState)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let targetPath = tabToPath(activeTab, activePromptId);

    // If on team-accept, ensure token query parameter is never stripped
    if (activeTab === 'team-accept') {
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('token') || sessionStorage.getItem('prompthub_pending_invite_token') || localStorage.getItem('prompthub_last_invite_token');
      if (token) {
        targetPath = `/team-accept?token=${encodeURIComponent(token)}`;
      }
    }

    const currentPath = window.location.pathname + window.location.search;

    // Treat '/' and '/home' as equivalent for the home tab to avoid redundant history entries
    const isEquivalentHome = (currentPath === '/' || currentPath === '/home') && activeTab === 'home';

    if (!isEquivalentHome && currentPath !== targetPath) {
      try {
        window.history.pushState({ tab: activeTab, promptId: activePromptId }, '', targetPath);
      } catch {}
    }
  }, [activeTab, activePromptId]);

  useEffect(() => {
    trackScreenViewed({ screen_name: activeTab });
    if (activeTab === 'dashboard') {
      trackDashboardViewed({ dashboard_type: 'personal' });
    } else if (activeTab === 'settings') {
      trackSettingsViewed();
    } else if (activeTab === 'profile') {
      trackProfileViewed({ owner_type: 'self' });
    }
  }, [activeTab]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Load user's own prompts from Supabase (authentic data only, zero fake data)
  const loadPromptsFromSupabase = useCallback(async () => {
    try {
      if (user?.id && securityUtils.isValidUUID(user.id)) {
        const userPrompts = await PromptRepository.getPromptsByUser(user.id);
        setPrompts(userPrompts);
      } else {
        setPrompts([]);
      }
    } catch (err) {
      console.warn('[Prompts] Fetch failed:', err);
      setPrompts([]);
    }
  }, [user?.id]);


  const loadCollectionsFromSupabase = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      const cols = await CollectionRepository.getCollectionsByUser(userId);
      setCollections(cols);
    } catch (err) {
      console.warn('[Collections] Fetch failed:', err);
    }
  }, []);

  const loadActivities = useCallback(async (_userId: string) => {
    setActivities([]);
  }, []);

  const NOTIFICATIONS_STORAGE_PREFIX = 'prompthub_notifications_v2_';

  const persistNotificationsToStorage = useCallback((notifs: Notification[], userId?: string) => {
    try {
      const storageKey = `${NOTIFICATIONS_STORAGE_PREFIX}${userId || user?.id || 'guest'}`;
      localStorage.setItem(storageKey, JSON.stringify(notifs.slice(0, 50)));
    } catch (e) {
      console.warn('[Notifications] Local storage persist error:', e);
    }
  }, [user?.id]);

  const loadNotifications = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id;
    

    try {
      const storageKey = `${NOTIFICATIONS_STORAGE_PREFIX}${targetUserId || 'guest'}`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotifications(parsed);
          return;
        }
      }
    } catch (err) {
      console.warn('[Notifications] Failed to load local notifications:', err);
    }
  }, [user?.id, persistNotificationsToStorage]);

  const loadTransactions = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;
    try {
      const topupRecords = await fetchUserTopupHistory(targetUserId);
      const mapped: Transaction[] = topupRecords.map(r => ({
        id: r.id,
        promptId: r.razorpay_order_id || 'wallet_topup',
        promptTitle: `Wallet Recharge: +${r.credit_amount} Credits`,
        buyerId: r.user_id,
        sellerId: 'prompthub_platform',
        amount: r.amount_inr,
        createdAt: r.created_at,
        currency: r.currency || 'INR',
        status: (r.status === 'COMPLETED' ? 'completed' : r.status === 'FAILED' ? 'failed' : 'pending') as any,
      }));
      setTransactions(mapped);
    } catch (err) {
      console.warn('[Transactions] Fetch failed:', err);
    }
  }, [user?.id]);

  const loadTeamsFromSupabase = useCallback(async (userId: string) => {
    try {
      const allTeams = await OrgRepository.getTeams(userId);
      setTeams(allTeams);
      if (allTeams.length > 0) {
        setMixpanelTeamGroup(allTeams[0].id, {
          name: allTeams[0].name,
          visibility: allTeams[0].visibility,
        });
      }
    } catch (err) {
      console.warn('[Teams] Fetch failed:', err);
    }
  }, []);

  const loadAdminSubmissionsFromSupabase = useCallback(async () => {}, []);

  const loadBugReportsFromSupabase = useCallback(async () => {}, []);

  // Deduplication registry: prevents identical (message, type) from stacking
  // within a 2-second window. Key = `${type}:${message}`, auto-cleared after 2s.
  const recentToastKeys = useRef<Set<string>>(new Set());

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const dedupeKey = `${type}:${message}`;
    if (recentToastKeys.current.has(dedupeKey)) return; // already showing — suppress duplicate
    recentToastKeys.current.add(dedupeKey);
    setTimeout(() => recentToastKeys.current.delete(dedupeKey), 2000);

    // Toasts are transient feedback, not notification-center events. Important
    // social, account, payment, and moderation events use addNotification at
    // their source. Persisting every copy/save/selection toast created the spam
    // problem and duplicated information already visible in the current UI.
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  }, [dismissToast]);

  // Global background analysis completion notification when user is on another tab
  useEffect(() => {
    const handleAnalysisCompleted = () => {
      if (activeTab !== 'analyzer') {
        showToast('✨ AI Prompt Analysis completed in the background!', 'success');
      }
    };
    window.addEventListener('ph_background_analysis_completed', handleAnalysisCompleted);
    return () => window.removeEventListener('ph_background_analysis_completed', handleAnalysisCompleted);
  }, [activeTab, showToast]);

  // Sync state with Supabase database
  const refreshState = useCallback(() => {
    loadPromptsFromSupabase();
    if (user) {
      Promise.all([
        loadCollectionsFromSupabase(user.id),
        loadActivities(user.id),
        loadNotifications(user.id),
        loadTransactions(user.id),
        loadTeamsFromSupabase(user.id),
      ]).catch((err) => {
        logger.warn('[AppContext] refreshState error:', err);
      });

      if (user.role === 'Admin') {
        loadAdminSubmissionsFromSupabase();
        loadBugReportsFromSupabase();
      }
    }
  }, [loadPromptsFromSupabase, loadCollectionsFromSupabase, loadActivities, loadNotifications, loadTransactions, loadTeamsFromSupabase, loadAdminSubmissionsFromSupabase, loadBugReportsFromSupabase, user]);

  const refreshAdminData = useCallback(async () => {
    await Promise.all([
      loadAdminSubmissionsFromSupabase(),
      loadBugReportsFromSupabase(),
      loadPromptsFromSupabase(),
    ]);
  }, [loadAdminSubmissionsFromSupabase, loadBugReportsFromSupabase, loadPromptsFromSupabase]);

  useEffect(() => {
    // Automated Pre-Launch Client Clean Slate (purges development test keys and cached social interactions from browser storage)
    if (typeof window !== 'undefined') {
      const cleanSlateVersion = 'ph_clean_slate_launch_20261007_v3';
      if (localStorage.getItem('ph_clean_slate_version') !== cleanSlateVersion) {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && (
            k.startsWith('prompthub_comments_') ||
            k.startsWith('ph_comments_') ||
            k.startsWith('ph_user_likes_') ||
            k.startsWith('ph_user_views_') ||
            k.startsWith('ph_user_forks_') ||
            k.startsWith('ph_prompt_viewed_') ||
            k.startsWith('prompthub_viewed_prompts_') ||
            k.startsWith('prompthub_user_forks_') ||
            k.startsWith('prompthub_notifications_') ||
            k.startsWith('ph_notifications_') ||
            k.startsWith('prompthub_following_') ||
            k.startsWith('prompthub_followers_') ||
            k.startsWith('ph_admin_submissions') ||
            k.startsWith('ph_bug_reports') ||
            k.startsWith('ph_credit_requests') ||
            k.startsWith('ph_user_reports') ||
            k.startsWith('ph_reports') ||
            k.startsWith('ph_topup_cache') ||
            k.startsWith('ph_ledger_cache') ||
            k.startsWith('ph_arena_runs') ||
            k === 'prompthub_liked_prompts' ||
            k === 'prompthub_liked_drops' ||
            k === 'ph_liked_drops' ||
            k === 'ph_prompt_drops' ||
            k === 'prompthub_prompt_drops'
          )) {
            localStorage.removeItem(k);
          }
        }
        localStorage.setItem('ph_clean_slate_version', cleanSlateVersion);
      }
    }

    // Initial prompts load (public + seeded prompts visible to all)
    loadPromptsFromSupabase();

    // ─── OAuth Error & Callback URL Detection ─────────────────────────────────
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
      
      const error = searchParams.get('error') || hashParams.get('error');
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
      const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');

      if (error || errorDesc) {
        logger.warn('[OAuth URL Callback Error Detected]:', { error, errorCode, errorDesc });
        let friendlyMsg = 'Sign-in failed. Please verify your provider settings and try again.';
        if (errorDesc?.includes('exchange external code') || errorDesc?.includes('Unable to exchange')) {
          friendlyMsg = 'Google Sign-In failed: The OAuth Client Secret or Redirect URI in Google Cloud Console / Supabase Dashboard is mismatched.';
        } else if (errorDesc) {
          friendlyMsg = decodeURIComponent(errorDesc.replace(/\+/g, ' '));
        }
        showToast(friendlyMsg, 'error');
        if (setActiveTabRef.current) setActiveTabRef.current('auth');
        
        try {
          window.history.replaceState(null, '', '/auth');
        } catch {}
      }
    }

    // ─── Auth Lifecycle ─────────────────────────────────────────────────────
    // SAFETY: 4-second timeout ensures isAuthLoading never stays true
    // forever if the Supabase onAuthStateChange callback stalls due to network
    // issues, edge function delays, or malformed session tokens on hard reloads.
    let authResolved = false;
    const authTimeoutId = setTimeout(() => {
      if (!authResolved) {
        logger.warn('[AppContext] Auth initialization fallback triggered after 4s.');
        authResolved = true;
        setAuthStatus('UNAUTHENTICATED');
        setAuthError(null);
      }
    }, 4000);

    const unsubscribe = AuthService.onAuthStateChange((authUser, event, status, errorMsg) => {
      authResolved = true;
      clearTimeout(authTimeoutId);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryMode(true);
        setAuthStatus('UNAUTHENTICATED');
        setProfileStatus('IDLE');
        setAuthError(null);
        if (setActiveTabRef.current) setActiveTabRef.current('auth');
        return;
      }

      if (authUser) {
        const reconciledUser = reconcileUserWallet(authUser);
        try {
          const cachedFollowing = localStorage.getItem(`prompthub_following_${authUser.id}`);
          if (cachedFollowing) {
            const parsed = JSON.parse(cachedFollowing);
            if (Array.isArray(parsed)) {
              reconciledUser.following = parsed;
              reconciledUser.followingCount = parsed.length;
            }
          }
        } catch {
          // noop
        }
        setUser(reconciledUser);
        bootIntercomUser(reconciledUser);
        identifyMixpanelUser(reconciledUser.id, {
          $name: reconciledUser.name,
          $email: reconciledUser.email,
          $avatar: reconciledUser.avatarUrl,
          username: reconciledUser.username,
          role: reconciledUser.role,
          plan: reconciledUser.plan,
          credits: reconciledUser.credits,
          paid_credits: reconciledUser.paidCredits,
          promotional_credits: reconciledUser.promotionalCredits,
          is_paid_subscriber: Boolean(reconciledUser.hasPremiumAccess),
          has_byok: Boolean(reconciledUser.hasBYOK),
        });
        setIsLoggedIn(true);
        setAuthStatus('AUTHENTICATED');
        setAuthError(null);
        setPasswordRecoveryMode(false);
        setProfileStatus(status || 'LOADED');
        setProfileError(errorMsg || null);
        activeSessionUserIdRef.current = authUser.id;
        
        if (status === 'LOADED') {
          const currentUid = authUser.id;
          // Parallelize independent post-auth queries
          Promise.all([
            loadCollectionsFromSupabase(authUser.id),
            loadTeamsFromSupabase(authUser.id),
            loadTransactions(authUser.id),
            loadNotifications(authUser.id),
            PromptRepository.getUserLikes(authUser.id).then((remoteLikes) => {
              if (activeSessionUserIdRef.current !== currentUid) return;
              const authoritative = remoteLikes || [];
              setLikedPromptIds(authoritative);
              try {
                localStorage.setItem('prompthub_liked_prompts', JSON.stringify(authoritative));
                localStorage.setItem(`ph_user_likes_${authUser.id}`, JSON.stringify(authoritative));
              } catch {}
            }),
            PromptRepository.getUserPurchases(authUser.id).then((purchases) => {
              if (activeSessionUserIdRef.current !== currentUid) return;
              setUserPurchases(purchases);
            }),
            followService.fetchUserFollowingIds(authUser.id).then((followingIds) => {
              if (activeSessionUserIdRef.current !== currentUid) return;
              setUser((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  following: followingIds,
                  followingCount: followingIds.length,
                };
              });
            }),
          ]).catch((err) => {
            logger.warn('[AppContext] post-auth data fetch error:', err);
          });
        }

        // After OAuth redirect: restore the tab the user was on before clicking
        // "Sign in with Google/GitHub". Fall back to dashboard for new sessions.
        if (event === 'SIGNED_IN') {
          const preOAuthLocation = AuthService.getAndClearPreOAuthTab();
          if (preOAuthLocation) {
            const rawTab = preOAuthLocation.replace(/^#\//, '').replace(/^\//, '').split('?')[0];
            const restoredTab = normalizeTab(rawTab);
            if (setActiveTabRef.current) {
              setActiveTabRef.current(restoredTab);
            }
          }
        }

        // Post-sign-in wallet sync. There is deliberately NO weekly free-credit
        // claim here any more: PromptHub's free lane runs genuinely free
        // OpenRouter models at 0 credits, so the old `claim_weekly_credits` call
        // granted an allowance that nothing could spend, and then announced it
        // with a "🎁 25 Weekly Credits added" toast on every single sign-in — a
        // reward the user never received and could not use.
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          // ── Auto-Resume Pending Team Invitation Token (if user signed in via invite link) ──
          try {
            const pendingInviteToken = sessionStorage.getItem('prompthub_pending_invite_token');
            if (pendingInviteToken && authUser.id) {
              sessionStorage.removeItem('prompthub_pending_invite_token');
              TeamInviteService.acceptTeamInvitation(pendingInviteToken, authUser.id)
                .then((acceptRes) => {
                  if (acceptRes.success) {
                    loadTeamsFromSupabase(authUser.id);
                    showToast(`Joined ${acceptRes.teamName || 'workspace'} successfully!`, 'success');
                    if (setActiveTabRef.current) {
                      setActiveTabRef.current('teams');
                    }
                  }
                })
                .catch(() => {});
            }
          } catch {}
        }

      } else {
        setUser(null);
        setIsLoggedIn(false);
        setAuthStatus('UNAUTHENTICATED');
        shutdownIntercom();
        bootIntercomVisitor();
      setProfileStatus('LOADED');
        setProfileError(null);
        setCollections([]);
        setTeams([]);
        setLikedPromptIds([]);
      }
    });

    return () => {
      clearTimeout(authTimeoutId);
      unsubscribe();
    };
  }, [loadPromptsFromSupabase, loadCollectionsFromSupabase, loadTeamsFromSupabase, showToast, authRetryCounter]);

  // ── Real-time Profile Synchronization (Listen to live database changes for current user) ──
  useEffect(() => {
    }, [user?.id]);

  

  // ── Global Real-time Social Hub (WebSockets: Likes, Comments, Views & Stats) ──
  useEffect(() => {
    }, []);

  const retryAuth = useCallback(() => {
    setAuthStatus('INITIALIZING');
    setProfileStatus('IDLE');
    setAuthError(null);
    setProfileError(null);
    setAuthRetryCounter(prev => prev + 1);
  }, []);

  const login = useCallback((userData: { name: string; email: string; avatarUrl: string; username: string; role?: 'Admin' | 'User'; id?: string; hasCompletedProfileSetup?: boolean }) => {
    setIsLoggedIn(true);
    setUser((prev): User => {
      if (prev && prev.email === userData.email) return prev;
      return {
        id: userData.id || prev?.id || securityUtils.generateUUID(),
        email: userData.email,
        name: userData.name || (userData.email ? userData.email.split('@')[0] : 'User'),
        username: userData.username || (userData.email ? userData.email.split('@')[0] : 'user'),
        avatarUrl: userData.avatarUrl || prev?.avatarUrl || '',
        bio: prev?.bio || '',
        role: (userData.role || 'User') as 'Admin' | 'User',
        credits: prev?.credits ?? 0,
        promotionalCredits: 0,
        paidCredits: prev?.paidCredits || 0,
        totalCreditSpendInr: prev?.totalCreditSpendInr || 0,
        bookmarks: prev?.bookmarks || [],
        following: prev?.following || [],
        followers: prev?.followers || [],
        followersCount: prev?.followersCount || 0,
        followingCount: prev?.followingCount || 0,
        promptCount: prev?.promptCount || 0,
        forkCount: prev?.forkCount || 0,
        totalViews: prev?.totalViews || 0,
        totalLikes: prev?.totalLikes || 0,
        totalCopies: prev?.totalCopies || 0,
        joinDate: prev?.joinDate || new Date().toISOString(),
        achievements: prev?.achievements || [],
        badges: (() => {
          const effectiveDate = prev?.joinDate || new Date().toISOString();
          const list = new Set(prev?.badges || []);
          if (isEarlyPioneerEligible(effectiveDate)) {
            list.add('early_pioneer');
          } else {
            list.delete('early_pioneer');
          }
          return Array.from(list);
        })(),
        plan: prev?.plan || 'free',
        hasBYOK: prev?.hasBYOK || false,
        hasPremiumAccess: prev?.hasPremiumAccess || false,
        proUntil: prev?.proUntil || null,
        socialLinks: prev?.socialLinks || {},
        hasCompletedProfileSetup: userData.hasCompletedProfileSetup ?? prev?.hasCompletedProfileSetup ?? false,
      };
    });
    const greetingName = userData.name || (userData.email ? userData.email.split('@')[0] : 'Creator');
    showToast(`Welcome back, ${greetingName}!`, 'success');
  }, [showToast]);

  const register = useCallback((userData: { name: string; email: string; avatarUrl: string; username: string; role?: 'Admin' | 'User'; id?: string }) => {
    login(userData);
  }, [login]);

  const logout = useCallback(async () => {
    activeSessionUserIdRef.current = null;
    try {
      // Immediately clear all temporary BYOK credentials from browser memory & session storage
      credentialVault.clearTemporaryCredentials();
      draftPersistenceService.clearAllDraftsOnLogout();
      // Clear the anonymous homepage trial token so a new visitor session gets a fresh trial
      try { localStorage.removeItem('prompthub.home.trial.token'); } catch {}
      await AuthService.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
    setIsLoggedIn(false);
    setUser(null);
    setAuthStatus('UNAUTHENTICATED');
    setProfileStatus('IDLE');
    setCollections([]);
    setTeams([]);
    setActivities([]);
    setNotifications([]);
    setTransactions([]);
    setLikedPromptIds([]);
    setUserPurchases([]);
    trackLogout();
    resetPostHog();
    resetMixpanel();
    shutdownIntercom();
    bootIntercomVisitor();
    setActiveTabState('home');
    setActivePromptIdState(null);
    showToast('Signed out successfully.', 'info');
  }, [showToast]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    
    // Clean and validate username if being modified
    let cleanUsername = updates.username !== undefined ? updates.username.trim().toLowerCase() : user.username;
    if (updates.username !== undefined && !isValidPersistentUsername(cleanUsername)) {
      throw new Error('Username must be 3-30 characters (letters, numbers, underscores only).');
    }

    // Enforce identity change limit: at most 2 changes per 7-day rolling window
    const isNameChanged = updates.name !== undefined && updates.name.trim() !== (user.name || '').trim();
    if (isNameChanged && user.id) {
      const quota = identityChangeLimitService.checkNameChangeQuota(user.id);
      if (!quota.allowed) {
        throw new Error(quota.message);
      }
    }

    const isUsernameChanged = updates.username !== undefined && cleanUsername !== (user.username || '').toLowerCase();
    if (isUsernameChanged && user.id) {
      const quota = identityChangeLimitService.checkUsernameChangeQuota(user.id);
      if (!quota.allowed) {
        throw new Error(quota.message);
      }
    }

    if (updates.name !== undefined) {
      const cleanName = updates.name.trim();
      if (cleanName && (cleanName.length < 2 || cleanName.length > 50)) {
        throw new Error('Display name must be between 2 and 50 characters.');
      }
    }

    if (updates.bio !== undefined) {
      const cleanBio = updates.bio.trim();
      if (cleanBio.length > 250) {
        throw new Error('Bio cannot exceed 250 characters.');
      }
    }

    try {
      // Update in-memory React state and save to wallet cache
      const safeUpdates = stripServerAuthoritativeFields(updates);
      setUser(prev => {
        if (!prev) return null;
        const merged: User = { ...prev, ...safeUpdates, username: cleanUsername };
        const reconciled = reconcileUserWallet(merged);
        saveVerifiedUserProfile(reconciled);
        return reconciled;
      });

      updateIntercomUser(updates);
      setProfileStatus('LOADED');
      setProfileError(null);
    } catch (err: any) {
      logger.error('[updateUser] Failed to persist profile:', err);
      setUser(prev => {
        if (!prev) return null;
        const merged = { ...prev, ...stripServerAuthoritativeFields(updates), username: cleanUsername };
        const reconciled = reconcileUserWallet(merged as User);
        saveVerifiedUserProfile(reconciled);
        return reconciled;
      });
      throw err;
    }
  }, [user]);

  const logActivity = useCallback((logData: Omit<ActivityLog, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    const newAct: ActivityLog = {
      ...logData,
      id: securityUtils.generateUUID(),
      userId: user.id.slice(0, 50),
      createdAt: new Date().toISOString()
    };

    setActivities(prev => [newAct, ...prev].slice(0, 50));

    AuditRepository.log({
      action: logData.type,
      resourceType: 'prompt',
      resourceId: logData.promptId,
      userId: user.id,
      details: { title: logData.promptTitle, description: logData.description }
    }).catch(err => {
      console.error('[logActivity] Audit write failed:', err);
    });
  }, [user]);

  const cancelSubscription = useCallback(async () => {
    if (!user) {
      throw new Error('You must be signed in to cancel a subscription.');
    }

    const previousPlan = user.plan || 'pro';

    try {
      setUser(prev => {
        if (!prev) return null;
        const updated: User = {
          ...prev,
          plan: 'free',
          hasPremiumAccess: false,
          proUntil: null,
          badges: (prev.badges || []).filter(b => b !== 'pro_member' && b !== 'growth_member' && b !== 'studio_elite'),
        };
        const reconciled = reconcileUserWallet(updated);
        saveVerifiedUserProfile(reconciled);
        return reconciled;
      });

      trackMixpanelSubscriptionCancelled({ previousPlan });

      logActivity({
        type: 'edit',
        description: `Subscription for ${previousPlan.toUpperCase()} plan was cancelled. Reverted to Free Explorer tier.`,
      });

      showToast('Subscription cancelled successfully. Your account has reverted to the Free tier.', 'success');
    } catch (err: any) {
      logger.error('[cancelSubscription] Failed to cancel subscription:', err);
      showToast('Failed to cancel subscription: ' + (err.message || 'Unknown error'), 'error');
      throw err;
    }
  }, [user, showToast, logActivity]);

  const deleteAccount = useCallback(async () => {
    if (!user) {
      throw new Error('You must be signed in to delete your account.');
    }

    const userId = user.id;

    try {
      try {
        await indexedDbVault.clearAllFiles();
        await indexedDbVault.purgeEntireDatabase();
      } catch (vaultErr) {
        logger.warn('[deleteAccount] Error purging IndexedDB vault:', vaultErr);
      }

      await credentialVault.clearAllCredentials();
      draftPersistenceService.clearAllDraftsOnLogout();
      clearVerifiedUserProfile(userId);
      clearVerifiedUserProfile();

      try {
        localStorage.removeItem('prompthub.home.trial.token');
        localStorage.removeItem(`ph_verified_user_profile_${userId}`);
        sessionStorage.clear();
      } catch {}

      try {
        await AuthService.signOut();
      } catch (authErr) {
        logger.warn('[deleteAccount] AuthService.signOut notice:', authErr);
      }

      trackMixpanelAccountDeleted({ reason: 'user_self_service_erasure' });
      trackLogout();
      resetPostHog();
      resetMixpanel();
      shutdownIntercom();
      bootIntercomVisitor();

      setIsLoggedIn(false);
      setUser(null);
      setCollections([]);
      setTeams([]);
      setActivities([]);
      setNotifications([]);
      setTransactions([]);
      setPrompts(prev => prev.filter(p => p.authorId !== userId));
      setActiveTabState('home');
      setActivePromptIdState(null);

      showToast('Your account and all associated local data have been permanently deleted.', 'info');
    } catch (err: any) {
      logger.error('[deleteAccount] Error during account deletion:', err);
      showToast('An error occurred during account deletion: ' + (err.message || 'Unknown error'), 'error');
      throw err;
    }
  }, [user, showToast]);

  const createPrompt = useCallback(async (data: any): Promise<Prompt> => {
    if (!user) {
      setShowAuthModal(true);
      throw new Error('Please sign in or create an account to use this feature.');
    }

    const validId = data.id && securityUtils.isValidUUID(data.id)
      ? data.id
      : securityUtils.generateUUID();

    const newPrompt: Prompt = {
      ...data,
      id: validId,
      authorId: user.id,
      likesCount: 0,
      forksCount: 0,
      viewsCount: 0,
      copiesCount: 0,
      versionCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const saved = await PromptRepository.createPrompt(newPrompt);
      setPrompts(prev => [saved, ...prev.filter(p => p.id !== saved.id)]);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ph_prompt_created', {
            detail: { prompt: saved },
          })
        );
      }

      logActivity({
        type: 'create',
        promptId: saved.id,
        promptTitle: saved.title,
        description: `Created prompt "${saved.title}"`,
      });

      trackPromptCreated({
        visibility: saved.visibility,
        category: saved.category,
        tags_count: saved.tags?.length || 0,
        prompt_length: saved.rawContent?.length || 0,
        model: saved.model,
        has_image: Boolean(saved.thumbnail || saved.coverUrl || saved.inputImageUrl || saved.outputImageUrl),
      });

      trackMixpanelPromptCreated({
        promptId: saved.id,
        category: saved.category,
        visibility: saved.visibility,
        hasVariables: Array.isArray(saved.variables) && saved.variables.length > 0,
        variableCount: Array.isArray(saved.variables) ? saved.variables.length : 0,
        isPremium: Boolean(saved.isPremium),
        priceInr: saved.priceInr || 0,
        modelType: saved.model,
        titleLength: saved.title?.length || 0,
        promptLength: saved.rawContent?.length || 0,
      });

      return saved;
    } catch (err: any) {
      logger.error('[createPrompt] write failed:', err);
      throw err;
    }
  }, [user, logActivity, setShowAuthModal, showToast]);

  const updatePrompt = useCallback(async (id: string, updates: any): Promise<Prompt> => {
    let existing = prompts.find(p => p.id === id);
    if (!existing) {
      try {
        existing = (await PromptRepository.getPromptById(id)) || undefined;
      } catch {}
    }

    const contentChanged =
      updates.rawContent !== undefined && updates.rawContent !== (existing?.rawContent ?? '');

    try {
      const updated = await PromptRepository.updatePrompt(id, {
        ...updates,
        versionCount: contentChanged ? ((existing?.versionCount ?? 1) + 1) : (existing?.versionCount ?? 1),
      });

      if (contentChanged && user) {
        PromptRepository.saveVersion(
          id,
          updates.rawContent,
          updates.updateNotes || `Version ${updated.versionCount}`,
          user.id
        ).catch(err => console.warn('[updatePrompt] saveVersion failed:', err));
      }

      setPrompts(prev => prev.some(p => p.id === id) ? prev.map(p => (p.id === id ? updated : p)) : [updated, ...prev]);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ph_prompt_updated', {
            detail: { prompt: updated },
          })
        );
      }

      if (existing && updates.visibility && updates.visibility !== existing.visibility) {
        if (updates.visibility === 'public') trackPromptPublished();
        if (updates.visibility === 'private') trackPromptUnpublished();
      }
      trackPromptUpdated({
        visibility: updated.visibility,
        category: updated.category,
        tags_count: updated.tags?.length || 0,
        prompt_length: updated.rawContent?.length || 0,
      });

      logActivity({
        type: 'edit',
        promptId: id,
        promptTitle: updated.title,
        description: `Updated prompt "${updated.title}"`,
      });

      return updated;
    } catch (err: any) {
      logger.error('[updatePrompt] update failed:', err);
      throw err;
    }
  }, [prompts, user, logActivity]);

  const deletePrompt = useCallback(async (id: string): Promise<void> => {
    const target = prompts.find(p => p.id === id);
    try {
      await PromptRepository.deletePrompt(id);
      setPrompts(prev => prev.filter(p => p.id !== id));
      if (activePromptId === id) setActivePromptId(null);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ph_prompt_deleted', {
            detail: { promptId: id },
          })
        );
      }

      if (target) {
        trackPromptDeleted({
          visibility: target.visibility,
          category: target.category,
        });
      }
    } catch (err: any) {
      logger.error('[deletePrompt] delete failed:', err);
      throw err;
    }
  }, [prompts, activePromptId, setActivePromptId]);

  const addNotification = useCallback((
    recipientId: string,
    type: Notification['type'], 
    senderName: string, 
    senderAvatar: string, 
    promptId?: string, 
    promptTitle?: string,
    message?: string
  ) => {
    if (type === 'copy') {
      return;
    }

    const currentUserId = user?.id;

    if (currentUserId && recipientId === currentUserId && ['like', 'fork', 'comment', 'follow'].includes(type)) {
      return;
    }

    if (currentUserId && recipientId && recipientId !== currentUserId) {
      return;
    }

    const newNot: Notification = {
      id: securityUtils.generateUUID(),
      userId: recipientId || currentUserId || 'guest',
      type,
      senderName: senderName || 'PromptHub System',
      senderAvatar: senderAvatar || '',
      promptId,
      promptTitle,
      createdAt: new Date().toISOString(),
      read: false,
      senderId: currentUserId || 'guest',
      message: message || (promptTitle ? `${senderName} interacted with "${promptTitle}"` : undefined),
      category: ['like', 'comment', 'fork', 'follow'].includes(type) ? 'social' : 'system',
    };

    setNotifications(prev => {
      const updated = [newNot, ...prev.slice(0, 49)];
      persistNotificationsToStorage(updated, currentUserId);
      return updated;
    });
  }, [user?.id, persistNotificationsToStorage]);

  const forkPrompt = useCallback(async (promptId: string): Promise<Prompt> => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to fork prompts.', 'info');
      throw new Error('Please sign in or create an account to use this feature.');
    }

    if (forkingPromptIdsRef.current.has(promptId)) {
      throw new Error('Fork is already in progress.');
    }

    const limit = securityUtils.rateLimit(`fork_${user.id}_${promptId}`, 2500);
    if (!limit.allowed) {
      showToast('Please wait a moment before forking again.', 'info');
      throw new Error(limit.error || 'Rate limit in effect. Please wait.');
    }

    let original = prompts.find(p => p.id === promptId);
    if (!original) {
      try {
        original = (await PromptRepository.getPromptById(promptId)) || undefined;
      } catch (err) {
        console.warn('[AppContext] Failed to load prompt during fork:', err);
      }
    }
    if (!original) throw new Error('Prompt to fork not found');

    if (original.authorId === user.id) {
      showToast('You are the author of this prompt. It is already in your library!', 'info');
      return original;
    }

    const isPaid = isPaidPrompt(original);
    const isAdminPremium = isAdminPremiumPrompt(original);

    if (isPaid && original.authorId !== user.id && user.role !== 'Admin') {
      const hasPurchased = userPurchases.some(p => p.promptId === original.id && p.status === 'completed');
      if (!hasPurchased) {
        showToast(`This is a paid marketplace prompt (₹${original.priceInr || original.price}). Please purchase a license to fork it into your studio.`, 'error');
        throw new Error('Entitlement required to fork paid prompt');
      }
    } else if (isAdminPremium && original.authorId !== user.id && user.role !== 'Admin') {
      const isEntitled = hasPremiumPromptAccess(user) || userPurchases.some(p => p.promptId === original.id && p.status === 'completed');
      if (!isEntitled) {
        showToast('This is an official premium prompt. An active subscription plan or a ₹200+ credit top-up is required to fork it.', 'error');
        throw new Error('Entitlement required to fork premium prompt');
      }
    }

    const existingLocalFork = prompts.find(
      p => p.authorId === user.id && (p.originalPromptId === original.id || (original.originalPromptId && p.originalPromptId === original.originalPromptId))
    );
    if (existingLocalFork) {
      showToast('You have already forked this prompt into your library (1 fork per account).', 'info');
      return existingLocalFork;
    }

    forkingPromptIdsRef.current.add(promptId);

    let rawContentToUse = original.rawContent || '';
    if (!rawContentToUse || rawContentToUse.includes('Sign in to view instructions')) {
      try {
        if (isPaid || isAdminPremium || original.isPremium) {
          const authData = await PromptRepository.getAuthorizedPromptContent(original.id);
          if (authData?.content) {
            rawContentToUse = authData.content;
          }
        }
        if (!rawContentToUse) {
          const fullPrompt = await PromptRepository.getPromptById(original.id);
          if (fullPrompt?.rawContent) {
            rawContentToUse = fullPrompt.rawContent;
          }
        }
      } catch {
        // Non-blocking
      }
    }

      const validAuthorId = user.id;
    const validOriginalAuthorId = (original.authorId && securityUtils.isValidUUID(original.authorId)) ? original.authorId : (original.authorId || undefined);
    const validOriginalPromptId = original.id;

    const forked: Prompt = {
      ...original,
      id: securityUtils.generateUUID(),
      title: `Fork of ${original.title}`,
      rawContent: rawContentToUse,
      authorId: validAuthorId,
      authorName: user.name || user.username || 'Community Member',
      authorAvatar: user.avatarUrl || '',
      visibility: 'private', // Forks default to private
      likesCount: 0,
      forksCount: 0,
      viewsCount: 0,
      copiesCount: 0,
      versionCount: 1,
      originalAuthorId: validOriginalAuthorId,
      originalPromptId: validOriginalPromptId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPremium: false,
    };

    try {
      const savedFork = await PromptRepository.createPrompt(forked);

      // Local optimistic update matching DB trigger sync (trg_sync_prompt_forks_count)
      const updatedForksCount = (original.forksCount || 0) + 1;

      setPrompts(prev => [
        savedFork,
        ...prev.map(p =>
          p.id === promptId ? { ...p, forksCount: updatedForksCount } : p
        ),
      ]);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ph_prompt_fork_changed', {
            detail: {
              promptId: original.id,
              forksCount: updatedForksCount,
              delta: 1,
            },
          })
        );
      }

      // Broadcast to WebSocket channel for other connected clients
      

      if (original) {
        trackPromptForked({ source_visibility: original.visibility });
      }

      trackMixpanelPromptForked({
        promptId: savedFork.id,
        originalPromptId: original.id,
        authorId: original.authorId,
      });

      logActivity({
        type: 'fork',
        promptId: savedFork.id,
        promptTitle: savedFork.title,
        description: `Forked "${original.title}" into library`,
      });

      if (validOriginalAuthorId && validOriginalAuthorId !== user.id) {
        addNotification(validOriginalAuthorId, 'fork', user.name, user.avatarUrl, savedFork.id, savedFork.title);
      }

      showToast(`Forked "${original.title}" into your workspace!`, 'success');
      return savedFork;
    } catch (err: any) {
      logger.error('[forkPrompt] Fork creation failed:', err);
      throw err;
    } finally {
      forkingPromptIdsRef.current.delete(promptId);
    }
  }, [prompts, user, logActivity, addNotification, setShowAuthModal, showToast]);

  const createCollection = useCallback(async (name: string, description: string, isPrivate: boolean, bannerUrl?: string): Promise<Collection> => {
    if (!user) {
      setShowAuthModal(true);
      throw new Error('Please sign in or create an account to use this feature.');
    }

    const userTier = getUserPlanTier(user);
    const myCollectionsCount = collections.filter(c => c.authorId === user.id).length;
    if (user.role !== 'Admin' && myCollectionsCount >= userTier.collectionsPerUser) {
      const msg = `Your ${userTier.name} plan includes up to ${userTier.collectionsPerUser} collection${userTier.collectionsPerUser > 1 ? 's' : ''}. Upgrade to Starter (7), Pro (15), or Growth (30) to create more collections.`;
      showToast(msg, 'info');
      throw new Error(msg);
    }

    const newCol: Collection = {
      id: securityUtils.generateUUID(),
      name,
      description,
      promptIds: [],
      authorId: user.id,
      isPrivate,
      createdAt: new Date().toISOString(),
      bannerUrl
    };

    try {
      const saved = await CollectionRepository.createCollection(newCol);
      setCollections(prev => [saved, ...prev.filter(c => c.id !== saved.id)]);

      trackCollectionCreated({
        visibility: isPrivate ? 'private' : 'public',
        prompts_count: 0,
      });

      return saved;
    } catch (err: any) {
      logger.error('[createCollection] Failed:', err);
      throw err;
    }
  }, [user, collections, setShowAuthModal, showToast]);

  const updateCollection = useCallback(async (colId: string, updates: Partial<Omit<Collection, 'id' | 'authorId' | 'createdAt'>>): Promise<void> => {
    try {
      await CollectionRepository.updateCollection(colId, updates);
      setCollections(prev => prev.map(c => (c.id === colId ? { ...c, ...updates } : c)));
    } catch (err: any) {
      logger.error('[updateCollection] Failed:', err);
      throw err;
    }
  }, []);

  const deleteCollection = useCallback(async (colId: string): Promise<void> => {
    try {
      await CollectionRepository.deleteCollection(colId);
      setCollections(prev => prev.filter(c => c.id !== colId));
    } catch (err: any) {
      logger.error('[deleteCollection] Failed:', err);
      throw err;
    }
  }, []);

  const addPromptToCollection = useCallback(async (colId: string, promptId: string): Promise<void> => {
    const col = collections.find(c => c.id === colId);
    try {
      await CollectionRepository.addPromptToCollection(colId, promptId);
      setCollections(prev => prev.map(c => {
        if (c.id === colId && !c.promptIds.includes(promptId)) {
          return { ...c, promptIds: [...c.promptIds, promptId] };
        }
        return c;
      }));

      trackPromptAddedToCollection({
        collection_visibility: col?.isPrivate ? 'private' : 'public',
      });
    } catch (err: any) {
      logger.error('[addPromptToCollection] Failed:', err);
      throw err;
    }
  }, [collections]);

  const removePromptFromCollection = useCallback(async (colId: string, promptId: string): Promise<void> => {
    const col = collections.find(c => c.id === colId);
    try {
      await CollectionRepository.removePromptFromCollection(colId, promptId);
      setCollections(prev => prev.map(c => {
        if (c.id === colId) {
          return { ...c, promptIds: c.promptIds.filter(id => id !== promptId) };
        }
        return c;
      }));

      trackPromptRemovedFromCollection({
        collection_visibility: col?.isPrivate ? 'private' : 'public',
      });
    } catch (err: any) {
      logger.error('[removePromptFromCollection] Failed:', err);
      throw err;
    }
  }, [collections]);

  const addComment = useCallback(async (promptId: string, text: string): Promise<Comment> => {
    if (!user) {
      setShowAuthModal(true);
      throw new Error('Please sign in or create an account to use this feature.');
    }

    const cleanComment = text.trim();
    if (!cleanComment) {
      throw new Error('Comment cannot be empty.');
    }
    if (cleanComment.length > 500) {
      throw new Error('Comment cannot exceed 500 characters.');
    }

    const commentId = securityUtils.generateUUID();
    const newComment: Comment = {
      id: commentId,
      promptId,
      authorId: user.id,
      authorName: user.name || 'Anonymous Developer',
      authorAvatar: user.avatarUrl || '',
      text: cleanComment,
      createdAt: new Date().toISOString()
    };

    

    setPrompts(prev =>
      prev.map(p =>
        p.id === promptId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
      )
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ph_prompt_comment_changed', {
          detail: {
            promptId,
            delta: 1,
            commentId: newComment.id,
          },
        })
      );
    }

    try {
      socialService.broadcastComment({
        id: newComment.id,
        targetId: promptId,
        targetType: 'prompt',
        authorId: user.id,
        authorName: user.name || 'Anonymous Developer',
        authorAvatar: user.avatarUrl || '',
        authorUsername: (user as any).username || '',
        content: text,
        createdAt: newComment.createdAt,
      });
    } catch (broadcastErr) {
      logger.warn('[addComment] broadcastComment non-blocking notice:', broadcastErr);
    }

    logActivity({
      type: 'comment',
      promptId,
      description: `Commented on prompt: "${text.substring(0, 30)}..."`
    });

    const targetPrompt = prompts.find(p => p.id === promptId);
    if (targetPrompt) {
      addNotification(targetPrompt.authorId, 'comment', user.name, user.avatarUrl, promptId, targetPrompt.title);
    }

    return newComment;
  }, [user, prompts, logActivity, addNotification, setShowAuthModal, showToast]);

  const updatePromptCommentsCount = useCallback((promptId: string, count: number) => {
    setPrompts(prev =>
      prev.map(p =>
        p.id === promptId ? { ...p, commentsCount: count } : p
      )
    );
  }, []);

  const updatePromptSharesCount = useCallback((promptId: string, countOrIncrement?: number | boolean) => {
    setPrompts(prev =>
      prev.map(p => {
        if (p.id !== promptId) return p;
        if (typeof countOrIncrement === 'number') {
          return { ...p, sharesCount: countOrIncrement };
        }
        return { ...p, sharesCount: (p.sharesCount || 0) + 1 };
      })
    );
  }, []);

  const sharePrompt = useCallback(async (prompt: Prompt): Promise<{ success: boolean; method: 'native' | 'clipboard'; isFirstShare: boolean }> => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to share prompts.', 'info');
      return { success: false, method: 'clipboard', isFirstShare: false };
    }
    const res = await socialService.shareItem({
      targetId: prompt.id,
      targetType: 'prompt',
      title: prompt.title,
      text: prompt.description,
      userId: user.id,
    });
    if (res.isFirstShare) {
      updatePromptSharesCount(prompt.id, true);
    }
    showToast(res.method === 'native' ? 'Shared successfully!' : '🔗 Link copied to clipboard!', 'success');
    return res;
  }, [user, updatePromptSharesCount, showToast, setShowAuthModal]);

  const registerCompletedPurchase = useCallback(async (promptId: string, purchaseDetails?: {
    purchaseId?: string;
    orderId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    amountPaid?: number;
    currency?: string;
  }): Promise<void> => {
    if (!user) return;
    let original = prompts.find(p => p.id === promptId);
    if (!original) {
      try {
        original = (await PromptRepository.getPromptById(promptId)) || undefined;
      } catch (err) {
        console.warn('[AppContext] Failed to load original prompt during registerCompletedPurchase:', err);
      }
    }
    if (!original) return;

    // Fetch authorized content now that user holds an active entitlement
    let authorizedContent = original.rawContent || '';
    try {
      const authData = await PromptRepository.getAuthorizedPromptContent(promptId);
      if (authData?.content) {
        authorizedContent = authData.content;
      }
    } catch {
      // Non-blocking
    }

    const newPurchase = {
      id: purchaseDetails?.purchaseId || securityUtils.generateUUID(),
      buyerId: user.id,
      sellerId: original.authorId,
      promptId,
      orderId: purchaseDetails?.orderId,
      razorpayOrderId: purchaseDetails?.razorpayOrderId || '',
      razorpayPaymentId: purchaseDetails?.razorpayPaymentId || '',
      amountPaid: purchaseDetails?.amountPaid,
      currency: purchaseDetails?.currency || 'INR',
      status: 'completed',
      createdAt: new Date().toISOString(),
    } as MarketplacePurchase;

    

    // Synchronize purchases from Supabase database
    try {
      const dbPurchases = await PromptRepository.getUserPurchases(user.id);
      if (dbPurchases && dbPurchases.length > 0) {
        setUserPurchases(dbPurchases);
      } else {
        setUserPurchases(prev => [newPurchase, ...prev.filter(p => p.promptId !== promptId)]);
      }
    } catch {
      setUserPurchases(prev => [newPurchase, ...prev.filter(p => p.promptId !== promptId)]);
    }

    // Check if user already has an existing fork of this prompt
    let existingFork = prompts.find(
      p => p.authorId === user.id && (p.originalPromptId === promptId || (original.originalPromptId && p.originalPromptId === original.originalPromptId))
    );
    

    if (existingFork) {
      if (authorizedContent && (!existingFork.rawContent || existingFork.rawContent !== authorizedContent)) {
        try {
          await PromptRepository.updatePrompt(existingFork.id, { rawContent: authorizedContent });
          existingFork = { ...existingFork, rawContent: authorizedContent };
        } catch {
          // Non-blocking
        }
      }
      setPrompts(prev => [
        existingFork!,
        ...prev.filter(p => p.id !== existingFork!.id).map(p => p.id === promptId ? { ...p, copiesCount: (p.copiesCount || 0) + 1 } : p)
      ]);
      return;
    }

    // Construct private fork in library with authorized content
    const forkedId = securityUtils.generateUUID();
    const forked: Prompt = {
      ...original,
      id: forkedId,
      title: `Fork of ${original.title}`,
      rawContent: authorizedContent,
      authorId: user.id,
      authorName: user.name || '',
      authorAvatar: user.avatarUrl || '',
      visibility: 'private',
      likesCount: 0,
      forksCount: 0,
      viewsCount: 0,
      copiesCount: 0,
      versionCount: 1,
      originalAuthorId: original.authorId,
      originalPromptId: original.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPremium: false,
    };

    const savedFork = await PromptRepository.createPrompt(forked);

    setPrompts(prev => [
      savedFork,
      ...prev.map(p => p.id === promptId ? { ...p, copiesCount: (p.copiesCount || 0) + 1 } : p),
    ]);

    logActivity({
      type: 'purchase',
      promptId: savedFork.id,
      promptTitle: savedFork.title,
      description: `Purchased license for "${original.title}"`,
    });

    setUser(prev => prev ? { ...prev, forkCount: (prev.forkCount || 0) + 1 } : null);
    addNotification(original.authorId, 'copy', user.name, user.avatarUrl, promptId, original.title);
  }, [user, prompts, logActivity, addNotification]);

  const createTeam = useCallback(async (name: string, description?: string, visibility?: 'public' | 'private'): Promise<Team> => {
    if (!user) throw new Error('User not authenticated');

    const userTier = getUserPlanTier(user);
    const myOwnedTeamsCount = teams.filter(t => t.ownerId === user.id).length;
    if (user.role !== 'Admin' && myOwnedTeamsCount >= userTier.teamSlots) {
      const msg = `Your ${userTier.name} plan includes up to ${userTier.teamSlots} team workspace${userTier.teamSlots > 1 ? 's' : ''}. Upgrade to Starter (3), Pro (7), or Growth (15) to create more teams.`;
      showToast(msg, 'info');
      throw new Error(msg);
    }

    const newTeam: Team = {
      id: securityUtils.generateUUID(),
      name,
      members: [
        {
          userId: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: 'Admin',
          joinedAt: new Date().toISOString(),
        },
      ],
      collectionIds: [],
      auditLogs: [
        {
          id: securityUtils.generateUUID(),
          action: `Team "${name}" created`,
          performedBy: user.name,
          timestamp: new Date().toISOString(),
        },
      ],
      ownerId: user.id,
      memberIds: [user.id],
      visibility: visibility || 'private',
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const saved = await OrgRepository.createTeam(newTeam);
      setTeams(prev => [saved, ...prev.filter(t => t.id !== saved.id)]);
      trackMixpanelTeamCreated({
        teamId: saved.id,
        teamName: saved.name,
        visibility: saved.visibility,
      });
      return saved;
    } catch (err: any) {
      logger.error('[createTeam] Failed:', err);
      throw err;
    }
  }, [user, teams, showToast]);

  const updateTeam = useCallback(async (teamId: string, updates: Partial<Omit<Team, 'id' | 'createdAt'>>) => {
    try {
      await OrgRepository.updateTeam(teamId, updates);
      setTeams(prev => prev.map(t => (t.id === teamId ? { ...t, ...updates } : t)));
    } catch (err: any) {
      logger.error('[updateTeam] Failed:', err);
      throw err;
    }
  }, []);

  const deleteTeam = useCallback(async (teamId: string) => {
    try {
      await OrgRepository.deleteTeam(teamId);
      setTeams(prev => prev.filter(t => t.id !== teamId));
    } catch (err: any) {
      logger.error('[deleteTeam] Failed:', err);
      throw err;
    }
  }, []);

  const createTeamInviteLink = useCallback(async (teamId: string, role: string, label?: string): Promise<ShareableInviteResult> => {
    if (!user) {
      throw new Error('You must be signed in to create team invite links.');
    }
    const targetTeam = teams.find(t => t.id === teamId);
    const teamName = targetTeam?.name || 'PromptHub Workspace';
    const canonicalRole = (role ? role.toLowerCase() : 'viewer') as any;

    if (canonicalRole === 'owner') {
      const msg = 'Workspace owner invite links are disabled. You can only invite Admins, Editors, or Viewers.';
      showToast(msg, 'error');
      throw new Error(msg);
    }

    if (targetTeam && (targetTeam.members?.length || 0) >= 4) {
      const msg = 'This workspace has reached the maximum capacity of 4 members. You cannot invite more members.';
      showToast(msg, 'error');
      throw new Error(msg);
    }

    const result = await TeamInviteService.createShareableInviteLink({
      teamId,
      teamName,
      role: canonicalRole,
      inviterUserId: user.id,
      inviterName: user.name || user.email,
      label,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to create invitation link.');
    }

    showToast('Shareable invitation link created!', 'success');
    return result;
  }, [user, teams, showToast]);

  const joinTeamWithToken = useCallback(async (token: string): Promise<AcceptInviteResult> => {
    const result = await TeamInviteService.acceptTeamInvitation(token, user?.id);
    if (result.success) {
      if (result.teamId) {
        trackMixpanelTeamMemberJoined({
          teamId: result.teamId,
          role: result.role || 'viewer',
        });
      }
      if (user?.id) {
        await loadTeamsFromSupabase(user.id);
      }
      showToast(`Joined ${result.teamName || 'workspace'} successfully!`, 'success');
    }
    return result;
  }, [user, loadTeamsFromSupabase, showToast]);

  const addTeamMember = useCallback(async (teamId: string, email: string, role: TeamMember['role'] | string): Promise<SendInviteResult | void> => {
    if (!user) return;
    try {
      const canonicalRole = (role ? role.toLowerCase() : 'viewer') as 'owner' | 'editor' | 'admin' | 'viewer';
      const targetTeam = teams.find(t => t.id === teamId);
      const teamName = targetTeam?.name || 'PromptHub Workspace';

      if (canonicalRole === 'owner') {
        const msg = 'Workspace owner invite links are disabled. You can only invite Admins, Editors, or Viewers.';
        showToast(msg, 'error');
        throw new Error(msg);
      }

      if (targetTeam && (targetTeam.members?.length || 0) >= 4) {
        const msg = 'This workspace has reached the maximum capacity of 4 members. You cannot invite more members.';
        showToast(msg, 'error');
        throw new Error(msg);
      }

      // 1. Dispatch authoritative invite via TeamInviteService
      const inviteResult = await TeamInviteService.sendTeamInvite({
        teamId,
        teamName,
        recipientEmail: email,
        role: canonicalRole,
        inviterUserId: user.id,
        inviterName: user.name || user.email,
      });

      if (!inviteResult.success) {
        throw new Error(inviteResult.error || 'Failed to generate invitation link.');
      }

      showToast(`Shareable invite link generated!`, 'success');
      return inviteResult;
    } catch (err: any) {
      showToast(err.message || 'Failed to generate invitation link.', 'error');
      throw err;
    }
  }, [user, teams, showToast]);

  const fetchPendingInvitations = useCallback(async (teamId: string): Promise<TeamInvitation[]> => {
    return await TeamInviteService.fetchTeamInvitations(teamId);
  }, []);

  const revokeTeamInvite = useCallback(async (inviteId: string, teamId: string): Promise<void> => {
    try {
      await TeamInviteService.revokeInvitation(inviteId, teamId);
      showToast('Invitation revoked.', 'info');
    } catch (err: any) {
      showToast('Failed to revoke invitation.', 'error');
      throw err;
    }
  }, [showToast]);

  const removeTeamMember = useCallback(async (teamId: string, userId: string) => {
    if (!user) return;
    const targetTeam = teams.find(t => t.id === teamId);
    const member = targetTeam?.members.find(m => m.userId === userId);
    const userName = member?.name || 'Member';

    try {
      await OrgRepository.removeTeamMember(teamId, userId);
      setTeams(prev => prev.map(t => {
        if (t.id === teamId) {
          return {
            ...t,
            memberIds: (t.memberIds || []).filter(id => id !== userId),
            members: t.members.filter(m => m.userId !== userId),
            auditLogs: [
              {
                id: securityUtils.generateUUID(),
                action: `Removed member ${userName}`,
                performedBy: user.name,
                timestamp: new Date().toISOString(),
                targetUserId: userId,
              },
              ...t.auditLogs,
            ],
          };
        }
        return t;
      }));
    } catch (err: any) {
      logger.error('[removeTeamMember] Failed:', err);
      showToast(`Failed to remove team member: ${err.message}`, 'error');
      throw err;
    }
  }, [user, teams, showToast]);

  const updateTeamMemberRole = useCallback(async (teamId: string, userId: string, newRole: TeamMember['role'] | string) => {
    if (!user) return;
    const canonicalRole = (newRole ? newRole.toLowerCase() : 'viewer') as TeamMember['role'];
    const targetTeam = teams.find(t => t.id === teamId);
    const member = targetTeam?.members.find(m => m.userId === userId);
    const userName = member?.name || 'Member';

    try {
      await OrgRepository.updateTeamMemberRole(teamId, userId, canonicalRole);
      setTeams(prev => prev.map(t => {
        if (t.id === teamId) {
          return {
            ...t,
            members: t.members.map(m => (m.userId === userId ? { ...m, role: canonicalRole } : m)),
            auditLogs: [
              {
                id: securityUtils.generateUUID(),
                action: `Changed ${userName}'s role to ${canonicalRole}`,
                performedBy: user.name,
                timestamp: new Date().toISOString(),
                targetUserId: userId,
              },
              ...t.auditLogs,
            ],
          };
        }
        return t;
      }));
    } catch (err: any) {
      logger.error('[updateTeamMemberRole] Failed:', err);
      showToast(`Failed to update member role: ${err.message}`, 'error');
      throw err;
    }
  }, [user, teams, showToast]);

  const logTeamActivity = useCallback((teamId: string, action: string) => {
    if (!user) return;
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        return {
          ...t,
          auditLogs: [
            {
              id: securityUtils.generateUUID(),
              action,
              performedBy: user.name,
              timestamp: new Date().toISOString(),
            },
            ...t.auditLogs,
          ],
        };
      }
      return t;
    }));
  }, [user]);

  const importBackup = useCallback((json: string): boolean => {
    try {
      if (!user) {
        setShowAuthModal(true);
        return false;
      }

      const parsed = JSON.parse(json);
      let importedPromptsCount = 0;
      let importedColsCount = 0;

      let promptsList: any[] = [];
      if (Array.isArray(parsed)) {
        promptsList = parsed;
      } else if (Array.isArray(parsed.prompts)) {
        promptsList = parsed.prompts;
      } else if (Array.isArray(parsed.data)) {
        promptsList = parsed.data;
      } else if (parsed.title && (parsed.rawContent || parsed.content || parsed.prompt)) {
        promptsList = [parsed];
      }

      if (promptsList.length > 0) {
        // Strictly sanitize and bind every imported prompt to the current authenticated user only
        const validPrompts: Prompt[] = promptsList.map((p: any) => ({
          id: securityUtils.generateUUID(),
          title: securityUtils.sanitizeInput(p.title || 'Untitled Imported Prompt'),
          description: securityUtils.sanitizeInput(p.description || 'Imported prompt'),
          rawContent: p.rawContent || p.prompt || p.content || '',
          category: p.category || 'Development',
          tags: Array.isArray(p.tags) ? p.tags.map((t: string) => securityUtils.sanitizeInput(String(t))) : ['imported'],
          model: p.model || 'gpt-4o',
          visibility: 'private', // Safety first: always private on import
          authorId: user.id,
          authorName: user.name || user.username || 'Me',
          authorAvatar: user.avatarUrl || '',
          likesCount: 0,
          forksCount: 0,
          viewsCount: 0,
          copiesCount: 0,
          versionCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPremium: false,
          variables: Array.isArray(p.variables) ? p.variables : [],
          assetType: p.assetType || 'prompt',
          difficulty: p.difficulty || 'Intermediate',
          license: p.license || 'MIT',
          status: 'active',
        }));

        setPrompts(prev => [...validPrompts, ...prev]);

        importedPromptsCount = validPrompts.length;
        validPrompts.forEach((p: Prompt) => {
          PromptRepository.createPrompt(p).catch(console.error);
        });
      }

      if (parsed.collections && Array.isArray(parsed.collections)) {
        const userCols: Collection[] = parsed.collections.map((c: any) => ({
          id: securityUtils.generateUUID(),
          name: securityUtils.sanitizeInput(c.name || 'Imported Collection'),
          description: securityUtils.sanitizeInput(c.description || ''),
          promptIds: Array.isArray(c.promptIds) ? c.promptIds : [],
          authorId: user.id,
          isPrivate: true,
          createdAt: new Date().toISOString(),
        }));

        setCollections(prev => [...userCols, ...prev]);
        importedColsCount = userCols.length;
      }

      if (importedPromptsCount === 0 && importedColsCount === 0) {
        showToast('No valid prompts or collections found in JSON file.', 'error');
        return false;
      }

      showToast(`Successfully imported ${importedPromptsCount} prompt(s) and ${importedColsCount} collection(s) to your account!`, 'success');
      return true;
    } catch (e: any) {
      console.error('[importBackup] Invalid JSON:', e);
      showToast('Import failed: Invalid JSON file structure.', 'error');
      return false;
    }
  }, [user, setShowAuthModal, showToast]);

  const exportBackup = useCallback((): string => {
    if (!user) {
      return JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        prompts: [],
        collections: [],
      }, null, 2);
    }

    // STRICT PRIVACY ISOLATION: Only export the current user's own prompts and collections.
    // NEVER export any other user's data, teams, or platform catalog.
    const myPrompts = prompts
      .filter((p) => p.authorId === user.id)
      .map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        rawContent: p.rawContent,
        category: p.category,
        tags: p.tags,
        model: p.model,
        variables: p.variables,
        visibility: p.visibility,
        license: p.license,
        assetType: p.assetType,
        difficulty: p.difficulty,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));

    const myCollections = collections
      .filter((c) => c.authorId === user.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        promptIds: c.promptIds,
        isPrivate: c.isPrivate,
        createdAt: c.createdAt,
      }));

    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      prompts: myPrompts,
      collections: myCollections,
    }, null, 2);
  }, [user, prompts, collections]);

  // Social Methods - Instant Optimistic Like / Unlike Toggle with Persistent Storage
  const toggleLikePrompt = useCallback(async (promptId: string, knownAuthorId?: string): Promise<boolean> => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in or create an account to like prompts.', 'info');
      throw new Error('Please sign in or create an account to use this feature.');
    }

    // 1. Prevent concurrent double-clicks
    if (likingPromptIdsRef.current.has(promptId)) {
      return true;
    }

    // 2. Client-side rate limiting per user and prompt
    const limit = securityUtils.rateLimit(`like_${user.id}_${promptId}`, 500);
    if (!limit.allowed) {
      return true;
    }

    const targetPrompt = prompts.find(p => p.id === promptId);

    // 3. Authors cannot like their own prompts
    if ((targetPrompt && targetPrompt.authorId === user.id) || (knownAuthorId && knownAuthorId === user.id)) {
      showToast('This is your prompt. Authors cannot like their own prompts.', 'info');
      return false;
    }

    const isAlreadyLiked = likedPromptIds.includes(promptId);
    const nextIsLiked = !isAlreadyLiked;

    likingPromptIdsRef.current.add(promptId);

    // 4. Optimistic UI update
    setLikedPromptIds(prev => {
      const next = nextIsLiked
        ? [...prev, promptId]
        : prev.filter(id => id !== promptId);
      try {
        localStorage.setItem('prompthub_liked_prompts', JSON.stringify(next));
      } catch {
        // noop
      }
      return next;
    });

    setPrompts(prev => prev.map(p => {
      if (p.id === promptId) {
        return {
          ...p,
          likesCount: Math.max(0, (p.likesCount || 0) + (nextIsLiked ? 1 : -1))
        };
      }
      return p;
    }));

    // Instantly notify all active UI surfaces (MarketplaceView, CommunityView, Modals)
    const optimisticDelta = nextIsLiked ? 1 : -1;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ph_prompt_like_changed', {
          detail: {
            promptId,
            delta: optimisticDelta,
            isLiked: nextIsLiked,
            userId: user.id,
          },
        })
      );
    }

    try {
      const result = await PromptRepository.toggleLike(promptId, user.id);
      const isActuallyLiked = result.isLiked;

      // Authoritative synchronization with repository outcome
      setLikedPromptIds(prev => {
        const nextSet = new Set(prev);
        if (isActuallyLiked) {
          nextSet.add(promptId);
        } else {
          nextSet.delete(promptId);
        }
        const updated = Array.from(nextSet);
        try {
          localStorage.setItem('prompthub_liked_prompts', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (typeof result.likesCount === 'number') {
        setPrompts(prev => prev.map(p => {
          if (p.id === promptId) {
            return {
              ...p,
              likesCount: result.likesCount!
            };
          }
          return p;
        }));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ph_prompt_like_changed', {
              detail: {
                promptId,
                likesCount: result.likesCount,
                isLiked: isActuallyLiked,
                userId: user.id,
              },
            })
          );
        }
      }

      if (isActuallyLiked) {
        trackPromptLiked();
        showToast('❤️ Liked prompt!', 'success');
        if (targetPrompt && targetPrompt.authorId && securityUtils.isValidUUID(targetPrompt.authorId) && targetPrompt.authorId !== user.id) {
          addNotification(targetPrompt.authorId, 'like', user.name, user.avatarUrl, promptId, targetPrompt.title);
        }
      } else {
        showToast('Removed like.', 'info');
      }

      // Broadcast real-time like update to all connected clients over WebSockets
      socialService.broadcastLike({
        promptId,
        likesCount: result.likesCount,
        isLiked: isActuallyLiked,
        userId: user.id,
      });

      return isActuallyLiked;
    } catch (err: any) {
      // Rollback optimistic update
      setLikedPromptIds(prev => {
        const reverted = isAlreadyLiked
          ? [...prev, promptId]
          : prev.filter(id => id !== promptId);
        try {
          localStorage.setItem('prompthub_liked_prompts', JSON.stringify(reverted));
        } catch {
          // noop
        }
        return reverted;
      });

      setPrompts(prev => prev.map(p => {
        if (p.id === promptId) {
          return {
            ...p,
            likesCount: Math.max(0, (p.likesCount || 0) + (isAlreadyLiked ? 1 : -1))
          };
        }
        return p;
      }));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ph_prompt_like_changed', {
            detail: {
              promptId,
              delta: isAlreadyLiked ? 1 : -1,
              isLiked: isAlreadyLiked,
              userId: user.id,
            },
          })
        );
      }
      logger.error('[toggleLikePrompt] Error:', err);
      if (err?.message?.includes('own prompt')) {
        showToast('This is your prompt. Authors cannot like their own prompts.', 'info');
        return false;
      }
      const { userMessage } = normalizeError(err);
      showToast(userMessage, 'error');
      throw err;
    } finally {
      likingPromptIdsRef.current.delete(promptId);
    }
  }, [user, likedPromptIds, prompts, addNotification, setShowAuthModal, showToast]);

  const toggleBookmark = useCallback((promptId: string) => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to bookmark prompts.', 'info');
      return;
    }
    const hasBookmark = user.bookmarks?.includes(promptId);
    const updatedBookmarks = hasBookmark
      ? user.bookmarks.filter(id => id !== promptId)
      : [...(user.bookmarks || []), promptId];
    
    const updatedUser = { ...user, bookmarks: updatedBookmarks };
    setUser(updatedUser);

    
    
    if (!hasBookmark) {
      const targetPrompt = prompts.find(p => p.id === promptId);
      const isSelf = targetPrompt?.authorId === user.id;
      trackPromptFavorited({ owner_type: isSelf ? 'self' : 'other' });
      logActivity({
        type: 'like',
        promptId,
        description: `Bookmarked template asset: "${targetPrompt?.title || ''}"`
      });
      if (targetPrompt) {
        addNotification(targetPrompt.authorId, 'like', user.name, user.avatarUrl, promptId, targetPrompt.title);
      }
      showToast('Bookmarked prompt!', 'success');
    } else {
      trackPromptUnfavorited();
      showToast('Removed bookmark.', 'info');
    }
  }, [user, prompts, logActivity, addNotification, setShowAuthModal, showToast]);

  const toggleFollow = useCallback((userId: string) => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to follow creators.', 'info');
      return;
    }
    if (userId === user.id) {
      showToast('You cannot follow yourself.', 'info');
      return;
    }

    // Debounce / race-condition guard
    if (followingUsersRef.current.has(userId)) {
      return;
    }
    followingUsersRef.current.add(userId);
    setTimeout(() => {
      followingUsersRef.current.delete(userId);
    }, 400);

    const isFollowing = Boolean(user.following?.includes(userId));
    const nextIsFollowing = !isFollowing;
    const updatedFollowing = isFollowing
      ? user.following.filter(id => id !== userId)
      : [...(user.following || []), userId];

    const updatedUser = {
      ...user,
      following: updatedFollowing,
      followingCount: updatedFollowing.length
    };
    setUser(updatedUser);

    try {
      localStorage.setItem(`prompthub_following_${user.id}`, JSON.stringify(updatedFollowing));
    } catch {
      // noop
    }

    // Instant local event dispatch for zero-delay real-time synchronization
    if (typeof window !== 'undefined') {
      const detail = {
        followerId: user.id,
        targetUserId: userId,
        isFollowing: nextIsFollowing,
      };
      window.dispatchEvent(new CustomEvent('prompthub:follow-updated', { detail }));
      window.dispatchEvent(new CustomEvent('ph_follow_changed', { detail }));
    }

    

    if (!isFollowing) {
      addNotification(userId, 'follow', user.name, user.avatarUrl);
      showToast('✨ Following creator!', 'success');
    } else {
      showToast('Unfollowed creator.', 'info');
    }
  }, [user, addNotification, setShowAuthModal, showToast]);

  const copyPrompt = useCallback((promptId: string): void => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to copy prompts.', 'info');
      return;
    }
    const targetPrompt = prompts.find(p => p.id === promptId);
    if (!targetPrompt) return;

    trackPromptCopied();

    logActivity({
      type: 'copy',
      promptId,
      promptTitle: targetPrompt.title,
      description: `Copied prompt template instructions: "${targetPrompt.title}"`,
    });

    setPrompts(prev =>
      prev.map(p =>
        p.id === promptId ? { ...p, copiesCount: (p.copiesCount || 0) + 1 } : p
      )
    );

    // Only persist copy count to Supabase for real logged-in users
    if (isLoggedIn) {
      PromptRepository.updatePrompt(promptId, { copiesCount: (targetPrompt.copiesCount || 0) + 1 }).catch(console.error);
    }

    if (user) {
      addNotification(targetPrompt.authorId, 'copy', user.name, user.avatarUrl, promptId, targetPrompt.title);
    }
  }, [prompts, isLoggedIn, user, logActivity, addNotification, setShowAuthModal, showToast]);

  const getVersionsForPrompt = useCallback(async (promptId: string): Promise<PromptVersion[]> => {
    try {
      return await PromptRepository.getVersionsForPrompt(promptId);
    } catch (err) {
      console.warn('[getVersionsForPrompt] fetch error:', err);
      return [];
    }
  }, []);

  const getCommentsForPrompt = useCallback(async (_promptId: string): Promise<Comment[]> => { return []; }, []);

  const markNotificationsAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      persistNotificationsToStorage(updated, user?.id);
      return updated;
    });
    }, [user?.id, persistNotificationsToStorage]);

  const markNotificationAsRead = useCallback((notifId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => (n.id === notifId ? { ...n, read: true } : n));
      persistNotificationsToStorage(updated, user?.id);
      return updated;
    });
    }, [user?.id, persistNotificationsToStorage]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    persistNotificationsToStorage([], user?.id);
    }, [user?.id, persistNotificationsToStorage]);

  const deleteNotification = useCallback((notifId: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notifId);
      persistNotificationsToStorage(updated, user?.id);
      return updated;
    });
    }, [user?.id, persistNotificationsToStorage]);

  const openNotificationCenter = useCallback(() => {
    setIsNotificationCenterOpen(true);
  }, []);

  const handleSetIsBugReportModalOpen = useCallback((open: boolean) => {
    if (open && !isLoggedIn) {
      setToasts(prev => [...prev, { id: `toast_${Date.now()}`, message: 'Sign in required to submit bug reports & claim 15-day Pro trial!', type: 'info' }]);
      setShowAuthModal(true);
      return;
    }
    setIsBugReportModalOpen(open);
  }, [isLoggedIn, setShowAuthModal]);

  const clearPasswordRecoveryMode = useCallback(() => {
    setPasswordRecoveryMode(false);
  }, []);

  // Memoized AppContext value to prevent cascading re-renders across the app
  const contextValue = React.useMemo<AppContextProps>(() => ({
    user,
    isLoggedIn,
    authStatus,
    profileStatus,
    authError,
    profileError,
    retryAuth,
    isModelExplanationOpen,
    setIsModelExplanationOpen,
    isAuthLoading,
    passwordRecoveryMode,
    clearPasswordRecoveryMode,
    showAuthModal,
    setShowAuthModal,
    prompts,
    collections,
    teams,
    activeTeamId,
    setActiveTeamId,
    activeTeam,
    transactions,
    activities,
    notifications,
    activeTab,
    activePromptId,
    toasts,
    showToast,
    dismissToast,
    login,
    register,
    logout,
    cancelSubscription,
    deleteAccount,
    setActiveTab,
    setActivePromptId,
    refreshState,
    updateUser,
    createPrompt,
    updatePrompt,
    deletePrompt,
    forkPrompt,
    createCollection,
    updateCollection,
    deleteCollection,
    addPromptToCollection,
    removePromptFromCollection,
    addComment,
    updatePromptCommentsCount,
    updatePromptSharesCount,
    sharePrompt,
    userPurchases,
    registerCompletedPurchase,
    createTeam,
    createTeamInviteLink,
    joinTeamWithToken,
    updateTeam,
    deleteTeam,
    addTeamMember,
    fetchPendingInvitations,
    revokeTeamInvite,
    removeTeamMember,
    updateTeamMemberRole,
    logTeamActivity,
    importBackup,
    exportBackup,
    likedPromptIds,
    toggleLikePrompt,
    toggleBookmark,
    toggleFollow,
    copyPrompt,
    addNotification,
    markNotificationsAsRead,
    markNotificationAsRead,
    clearAllNotifications,
    deleteNotification,
    isNotificationCenterOpen,
    setIsNotificationCenterOpen,
    openNotificationCenter,
    getVersionsForPrompt,
    getCommentsForPrompt,
    logActivity,
    isBugReportModalOpen,
    setIsBugReportModalOpen: handleSetIsBugReportModalOpen,
    isSubmitToAdminModalOpen,
    setIsSubmitToAdminModalOpen,
    submitToAdminPromptTarget,
    setSubmitToAdminPromptTarget,
    promptOfTheDay,

    openSubmitToAdminModal,
    adminSubmissions,
    submitPromptToAdmin,
    approveAdminSubmission,
    rejectAdminSubmission,
    refreshAdminData,

    bugReports,
    submitBugReport,
    approveBugReport,
    rejectBugReport,

    arenaRuns,
    saveArenaRun,
    deleteArenaRun,
    arenaPromptDraft,
    setArenaPromptDraft,

    // Free Credit Request System
    isFreeCreditModalOpen,
    setIsFreeCreditModalOpen,
    creditRequests,
    submitCreditRequest,
    loadCreditRequests,

    // Wallet Recharge Modal System
    isRechargeModalOpen,
    setIsRechargeModalOpen,
    rechargeInitialAmount,
    openRechargeModal,

    // Studio & Arena Model Navigation Bridge
    selectedStudioModel,
    setSelectedStudioModel,
    navigateToStudio,
    navigateToArena,

    // Developer Mode
    developerMode,
    setDeveloperMode,
  }), [
    user,
    isLoggedIn,
    authStatus,
    profileStatus,
    authError,
    profileError,
    retryAuth,
    isModelExplanationOpen,
    isAuthLoading,
    passwordRecoveryMode,
    clearPasswordRecoveryMode,
    showAuthModal,
    setShowAuthModal,
    prompts,
    collections,
    teams,
    activeTeamId,
    setActiveTeamId,
    activeTeam,
    transactions,
    activities,
    notifications,
    activeTab,
    activePromptId,
    toasts,
    showToast,
    dismissToast,
    login,
    register,
    logout,
    cancelSubscription,
    deleteAccount,
    setActiveTab,
    setActivePromptId,
    refreshState,
    updateUser,
    createPrompt,
    updatePrompt,
    deletePrompt,
    forkPrompt,
    createCollection,
    updateCollection,
    deleteCollection,
    addPromptToCollection,
    removePromptFromCollection,
    addComment,
    updatePromptCommentsCount,
    updatePromptSharesCount,
    sharePrompt,
    createTeam,
    createTeamInviteLink,
    joinTeamWithToken,
    updateTeam,
    deleteTeam,
    addTeamMember,
    fetchPendingInvitations,
    revokeTeamInvite,
    removeTeamMember,
    updateTeamMemberRole,
    logTeamActivity,
    importBackup,
    exportBackup,
    likedPromptIds,
    toggleLikePrompt,
    toggleBookmark,
    toggleFollow,
    copyPrompt,
    addNotification,
    markNotificationsAsRead,
    markNotificationAsRead,
    clearAllNotifications,
    deleteNotification,
    isNotificationCenterOpen,
    openNotificationCenter,
    getVersionsForPrompt,
    getCommentsForPrompt,
    logActivity,
    arenaRuns,
    saveArenaRun,
    deleteArenaRun,
    arenaPromptDraft,
    setArenaPromptDraft,
    isBugReportModalOpen,
    handleSetIsBugReportModalOpen,
    isSubmitToAdminModalOpen,
    submitToAdminPromptTarget,
    promptOfTheDay,
    openSubmitToAdminModal,
    adminSubmissions,
    submitPromptToAdmin,
    approveAdminSubmission,
    rejectAdminSubmission,
    refreshAdminData,
    bugReports,
    submitBugReport,
    approveBugReport,
    rejectBugReport,
    isFreeCreditModalOpen,
    creditRequests,
    submitCreditRequest,
    loadCreditRequests,
    isRechargeModalOpen,
    rechargeInitialAmount,
    openRechargeModal,
    selectedStudioModel,
    setSelectedStudioModel,
    navigateToStudio,
    navigateToArena,
    developerMode,
    setDeveloperMode,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
