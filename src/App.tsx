import React, { Suspense, lazy, useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToneProvider, useTone } from './context/ToneContext';
import { AppProvider, useApp, getPostAuthDestination } from './context/AppContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { PublicNavbar } from './components/public/PublicNavbar';
import { TopNavigationProgress } from './components/common/TopNavigationProgress';
import { navigationLoadingService } from './services/navigationLoadingService';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, Globe, Monitor, Tablet, Smartphone, Share2, Check, Download } from 'lucide-react';
import { captureException } from './lib/sentry';
import { AuthGuard } from './components/AuthGuard';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { ToneSwitchModal } from './components/ToneSwitchModal';
import { useSectionTracker } from './hooks/useSectionTracker';
import { ContextualViewSkeleton } from './components/skeletons/ContextualViewSkeleton';
import { scrollRestorationService } from './services/scrollRestorationService';
import { trackTabNavigated } from './lib/mixpanelEvents';
import { GuideProvider } from './context/GuideContext';
import { PipLauncher } from './components/guide/PipLauncher';
import { PipPanel } from './components/guide/PipPanel';
import { PipTourOverlay } from './components/guide/PipTourOverlay';
import { IntercomMessenger } from './components/common/IntercomMessenger';
import { decodeBundleFromHash, createShareablePreviewUrl, ensureRunnableHtmlPayload } from './utils/previewBundleUtils';

// Explicit named export lazy loader for React code-splitting
function lazyView<P = any>(importFn: () => Promise<any>, exportName: string) {
  return lazy(async () => {
    navigationLoadingService.start();
    try {
      const m = await importFn();
      const Component = m[exportName] || m.default;
      if (!Component) {
        throw new Error(`Export "${exportName}" not found in view module.`);
      }
      return { default: Component as React.ComponentType<P> };
    } catch (error: any) {
      console.warn(`[LazyLoad] Retrying dynamic import for ${exportName}...`, error);
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        const retryM = await importFn();
        const Component = retryM[exportName] || retryM.default;
        if (Component) {
          return { default: Component as React.ComponentType<P> };
        }
      } catch (retryError: any) {
        console.error(`[LazyLoad Error] Failed to import ${exportName}:`, retryError);
        // If module fetch failed due to stale chunk hashes after hard reload, force a clean refresh
        const isChunkError = /failed to fetch dynamically imported module|loading chunk failed|chunk.*failed/i.test(
          String(error?.message || '') + String(retryError?.message || '')
        );
        if (typeof window !== 'undefined' && isChunkError) {
          const lastReload = sessionStorage.getItem(`ph_chunk_reload_${exportName}`);
          const now = Date.now();
          if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
            sessionStorage.setItem(`ph_chunk_reload_${exportName}`, String(now));
            window.location.reload();
          }
        }
      }
      throw error;
    } finally {
      navigationLoadingService.stop();
    }
  });
}

// Lazy load modals on demand
const GlobalSearchModal = lazyView<{ isOpen: boolean; onClose: () => void }>(() => import('./components/GlobalSearchModal'), 'GlobalSearchModal');
const UsernameSetupModal = lazyView<{ isOpen: boolean; onClose: () => void }>(() => import('./components/UsernameSetupModal'), 'UsernameSetupModal');
const BugReportModal = lazyView<{ isOpen: boolean; onClose: () => void }>(() => import('./components/BugReportModal'), 'BugReportModal');
const SubmitToAdminModal = lazyView<{ isOpen: boolean; prompt: any; onClose: () => void }>(() => import('./components/SubmitToAdminModal'), 'SubmitToAdminModal');
const ModelExplanationModal = lazyView<{ isOpen: boolean; onClose: () => void }>(() => import('./components/ModelExplanationModal'), 'ModelExplanationModal');
const RechargeModal = lazyView<{ isOpen: boolean; onClose: () => void; initialAmount?: number }>(() => import('./components/payment/RechargeModal'), 'RechargeModal');
const CreatorProfileModal = lazyView<{ isOpen: boolean; creatorId: string; onClose: () => void }>(() => import('./components/CreatorProfileModal'), 'CreatorProfileModal');

// Lazy load views with explicit component export mapping
const LandingView = lazyView(() => import('./views/LandingView'), 'LandingView');
const DashboardHomeView = lazyView(() => import('./views/DashboardHomeView'), 'DashboardHomeView');
const LibraryView = lazyView(() => import('./views/LibraryView'), 'LibraryView');
const CommunityView = lazyView(() => import('./views/CommunityView'), 'CommunityView');
const MarketplaceView = lazyView(() => import('./views/MarketplaceView'), 'MarketplaceView');
const TeamsView = lazyView(() => import('./views/TeamsView'), 'TeamsView');
const AdminView = lazyView(() => import('./views/AdminView'), 'AdminView');
const LeaderboardView = lazyView(() => import('./views/LeaderboardView'), 'LeaderboardView');
const ProfileView = lazyView(() => import('./views/ProfileView'), 'ProfileView');
const CreatePromptView = lazyView(() => import('./views/CreatePromptView'), 'CreatePromptView');
const AuthView = lazyView<{ onSuccess: (userData: any) => void; initialMode?: string; onPasswordResetComplete?: () => void }>(() => import('./views/AuthView'), 'AuthView');
const SearchView = lazyView(() => import('./views/SearchView'), 'SearchView');
const PricingView = lazyView(() => import('./views/PricingView'), 'PricingView');
const TeamAcceptInviteView = lazyView(() => import('./views/TeamAcceptInviteView'), 'TeamAcceptInviteView');
const LegalView = lazyView<{ initialDoc?: any }>(() => import('./views/LegalView'), 'LegalView');
const ModelsGuideView = lazyView(() => import('./views/ModelsGuideView'), 'ModelsGuideView');
const StorageView = lazyView(() => import('./views/StorageView'), 'StorageView');
const AgentsView = lazyView(() => import('./views/AgentsView'), 'AgentsView');
const NotificationsView = lazyView(() => import('./views/NotificationsView'), 'NotificationsView');
const NewsView = lazyView(() => import('./views/NewsView'), 'NewsView');
const NotFoundView = lazyView(() => import('./views/NotFoundView'), 'NotFoundView');
const PaymentFailedView = lazyView(() => import('./views/PaymentFailedView'), 'PaymentFailedView');
const AccessDeniedView = lazyView(() => import('./views/AccessDeniedView'), 'AccessDeniedView');
const MaintenanceView = lazyView(() => import('./views/MaintenanceView'), 'MaintenanceView');
const SupportView = lazyView(() => import('./views/SupportView'), 'SupportView');
const PitchDeckView = lazyView(() => import('./views/PitchDeckView'), 'PitchDeckView');
const UnifiedCreationWorkspace = lazyView(() => import('./components/workspace/UnifiedCreationWorkspace'), 'UnifiedCreationWorkspace');
const DeveloperModeView = lazyView(() => import('./views/DeveloperModeView'), 'DeveloperModeView');
const CredentialsView = lazyView(() => import('./views/CredentialsView'), 'CredentialsView');
const SettingsView = lazyView(() => import('./views/SettingsView'), 'SettingsView');

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('[Global App Error Boundary Captured]:', error, errorInfo);
    captureException(error, { extra: { componentStack: errorInfo?.componentStack } });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-bg-primary text-text-primary p-6 flex-col select-none">
          <div className="max-w-md w-full bg-bg-secondary border border-border-default rounded-xl p-6 text-center shadow-lg">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-700">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-text-primary mb-2 font-display">Something went wrong</h2>
            <p className="text-text-secondary text-xs mb-6 leading-relaxed">
              {this.state.error?.message || 'An unexpected rendering error occurred. The runtime was captured.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                try {
                  window.history.replaceState(null, '', '/home');
                } catch {}
                window.location.reload();
              }}
              className="w-full btn-primary text-xs font-semibold cursor-pointer min-h-[40px]"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const {
    activeTab, setActiveTab, isLoggedIn, authStatus, authError, retryAuth, login, toasts, dismissToast, setShowAuthModal, user,
    isBugReportModalOpen, setIsBugReportModalOpen, isSubmitToAdminModalOpen, setIsSubmitToAdminModalOpen,
    submitToAdminPromptTarget, passwordRecoveryMode, clearPasswordRecoveryMode,
    isModelExplanationOpen, setIsModelExplanationOpen,
    isRechargeModalOpen, setIsRechargeModalOpen, rechargeInitialAmount,
  } = useApp();
  const { pendingToneSwitch, confirmToneSwitch, cancelToneSwitch } = useTone();
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 1024) return true;
        const stored = localStorage.getItem('prompthub_sidebar_collapsed');
        if (stored !== null) return stored === 'true';
        if (window.innerWidth < 1280) return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  // Responsive sidebar auto-collapse on tablet viewports
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      } else {
        const stored = localStorage.getItem('prompthub_sidebar_collapsed');
        if (stored !== null) {
          setIsSidebarCollapsed(stored === 'true');
        } else {
          setIsSidebarCollapsed(window.innerWidth < 1280);
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('prompthub_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };
  const [sharedCreatorId, setSharedCreatorId] = useState<string | null>(null);
  const [liveCapsuleSlug, setLiveCapsuleSlug] = useState<string | null>(null);
  const [liveCapsuleHtml, setLiveCapsuleHtml] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewCopied, setPreviewCopied] = useState(false);
  const viewScrollRef = React.useRef<HTMLDivElement>(null);

  // Workspace Process Continuity (Keeps running generations alive across tab switches, Req #1 & #2)
  const isWorkspaceActive = activeTab === 'workspace' || activeTab === 'work' || activeTab === 'create-and-improve';
  const [hasVisitedWorkspace, setHasVisitedWorkspace] = useState(() => isWorkspaceActive);

  useEffect(() => {
    if (isWorkspaceActive && !hasVisitedWorkspace) {
      setHasVisitedWorkspace(true);
    }
  }, [isWorkspaceActive, hasVisitedWorkspace]);

  // Active Section Dwell Time & Engagement Telemetry Tracker
  useSectionTracker(activeTab);

  // Save scroll position when the active view container is scrolled
  const handleViewScroll = (e: React.UIEvent<HTMLDivElement>) => {
    scrollRestorationService.saveScrollPosition(activeTab, e.currentTarget.scrollTop);
  };

  // Restore scroll position when activeTab switches or browser history pops
  useEffect(() => {
    const restore = () => {
      if (viewScrollRef.current) {
        scrollRestorationService.restoreScroll(viewScrollRef.current, activeTab);
      }
    };
    restore();
    const timer = setTimeout(restore, 200);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Listen for scroll-to-top custom events (e.g. logo clicks)
  useEffect(() => {
    const handleScrollToTop = (e: Event) => {
      const customEvent = e as CustomEvent<{ behavior?: ScrollBehavior }>;
      const behavior = customEvent?.detail?.behavior || 'smooth';
      if (viewScrollRef.current) {
        try {
          viewScrollRef.current.scrollTo({ top: 0, left: 0, behavior });
        } catch {
          viewScrollRef.current.scrollTop = 0;
        }
      }
    };
    window.addEventListener('scroll-to-top', handleScrollToTop);
    return () => window.removeEventListener('scroll-to-top', handleScrollToTop);
  }, []);

  // Mixpanel Universal Tab Navigation Telemetry: tracks every tab change from session start
  const previousTabRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (activeTab && activeTab !== previousTabRef.current) {
      trackTabNavigated({
        tabName: activeTab,
        previousTab: previousTabRef.current,
        isAuthenticated: Boolean(isLoggedIn && user),
      });
      previousTabRef.current = activeTab;
    }
  }, [activeTab, isLoggedIn, user]);

  // Parse deep-linked shared creator profile URLs (e.g. /u/username, /@username, /profile/username, ?creator=123 or ?user=abc)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check pathname (e.g. /u/username, /@username, /profile/username)
    const pathname = window.location.pathname || '';
    const uMatch = pathname.match(/^\/(?:u|@|profile)\/([a-zA-Z0-9_.-]+)/i);
    if (uMatch && uMatch[1]) {
      setSharedCreatorId(decodeURIComponent(uMatch[1]));
      return;
    }

    // 2. Check query params (e.g. ?creator=123, ?user=abc, ?u=abc)
    const params = new URLSearchParams(window.location.search);
    const targetCreator = params.get('creator') || params.get('user') || params.get('u');
    if (targetCreator) {
      setSharedCreatorId(targetCreator);
    }

    const targetLive = params.get('live') || params.get('capsule') || params.get('preview') || params.get('id');
    const isPreviewPath = pathname.startsWith('/preview') || pathname.startsWith('/live');
    if (targetLive || isPreviewPath) {
      const cleanSlug = targetLive || pathname.replace(/^\/(?:preview|live)\/?/, '') || 'preview';
      setLiveCapsuleSlug(cleanSlug);
      try {
        // 1. Check window.location.hash for self-contained #bundle= or #b64= (universal Figma-like shareable links)
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashStr = window.location.hash.replace(/^#/, '');
          const hashParams = new URLSearchParams(hashStr);
          const encodedBundle = hashParams.get('bundle') || hashParams.get('b64') || hashParams.get('code');
          if (encodedBundle) {
            const decoded = decodeBundleFromHash(encodedBundle);
            if (decoded && decoded.trim().length > 0) {
              const runnable = ensureRunnableHtmlPayload(decoded, cleanSlug);
              setLiveCapsuleHtml(runnable);
              try {
                localStorage.setItem(`ph_live_site_${cleanSlug}`, runnable);
                localStorage.setItem('ph_workspace_latest_html', runnable);
              } catch {}
              return;
            }
          }
        }

        // 2. Fall back to local browser cache
        const cached = localStorage.getItem(`ph_live_site_${cleanSlug}`) || localStorage.getItem('ph_workspace_latest_html');
        if (cached) {
          setLiveCapsuleHtml(ensureRunnableHtmlPayload(cached, cleanSlug));
        }
      } catch {}
    }
  }, []);

  // Safe redirect when already authenticated on /auth view
  useEffect(() => {
    if (activeTab === 'auth' && isLoggedIn && user && !passwordRecoveryMode) {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const redirectParam = params?.get('redirect');
      const destination = getPostAuthDestination(redirectParam);
      setActiveTab(user.role === 'Admin' && destination === 'dashboard' ? 'admin' : destination);
    }
  }, [activeTab, isLoggedIn, user, passwordRecoveryMode, setActiveTab]);

  // Global Shortcuts: Cmd+K / Ctrl+K for search modal, and Ctrl+Enter / Cmd+Enter unified dispatcher
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Cmd+K / Ctrl+K: Global Search Modal
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
        return;
      }

      // 2. Ctrl+Enter / Cmd+Enter: Global Primary Action Trigger
      const isEnter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13;
      if ((e.metaKey || e.ctrlKey) && isEnter) {
        // Dispatch custom event to active surface (Studio execute, Work task send, Analyzer audit)
        window.dispatchEvent(new CustomEvent('ph_global_ctrl_enter', {
          detail: { activeTab }
        }));
      }
    };
    const handleOpenSearchEvent = () => {
      setIsSearchModalOpen(true);
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    window.addEventListener('open-global-search', handleOpenSearchEvent);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      window.removeEventListener('open-global-search', handleOpenSearchEvent);
    };
  }, [activeTab]);

  // Preload high-traffic views during browser idle time so tab navigation feels instant
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const preloadCommonViews = () => {
      import('./views/MarketplaceView');
      import('./views/StorageView');
      import('./views/NewsView');
      import('./views/DashboardHomeView');
      import('./views/PricingView');
      import('./views/CommunityView');
    };

    if ('requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(preloadCommonViews, { timeout: 2000 });
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(preloadCommonViews, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Recoverable Auth Error Screen
  if (authStatus === 'AUTH_ERROR') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-primary text-text-primary p-6 flex-col select-none font-sans">
        <div className="max-w-md w-full bg-bg-secondary border border-border-default rounded-xl p-6 sm:p-8 text-center shadow-lg">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-700">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-2 font-display">Authentication Session Timeout</h2>
          <p className="text-text-secondary text-xs mb-6 leading-relaxed">
            {authError || 'Could not verify your authentication session. Please check your network connection and retry.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={retryAuth}
              className="flex-1 btn-primary text-xs font-semibold cursor-pointer min-h-[40px]"
            >
              Retry Connection
            </button>
            <button
              onClick={() => setActiveTab('home')}
              className="btn-secondary text-xs font-semibold cursor-pointer min-h-[40px]"
            >
              Continue to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        // Public marketing landing page is always consistent.
        return <LandingView />;
      case 'news':
        return <NewsView />;
      case 'pricing':
      case 'recharge':
      case 'wallet':
        return <PricingView />;
      case 'dashboard':
        return (
          <AuthGuard featureName="Developer Dashboard" description="Sign in to your PromptHub account to view prompt analytics, token consumption, and workspace telemetry.">
            <DashboardHomeView />
          </AuthGuard>
        );
      case 'workspace':
      case 'create-and-improve':
      case 'work':
        // Rendered persistently in main container to preserve running processes across tab switches (Req #1)
        return null;
      case 'developer':
      case 'developer-mode':
      case 'classic-studio':
      case 'arena':
      case 'analyzer':
        return (
          <AuthGuard featureName="Developer Mode" description="Developer Mode tools are currently under active development.">
            <DeveloperModeView />
          </AuthGuard>
        );
      case 'library':
        return (
          <AuthGuard featureName="Prompt Library" description="Browse, search, and manage your private prompt assets and organized collections.">
            <LibraryView initialSection="prompts" />
          </AuthGuard>
        );
      case 'storage':
      case 'vault':
        return (
          <AuthGuard featureName="Asset & Knowledge Vault" description="Sign in to your PromptHub account to access your Google Drive storage, upload documents, and manage AI knowledge assets.">
            <StorageView />
          </AuthGuard>
        );
      case 'models-guide':
      case 'models':
        return <ModelsGuideView />;
      case 'agents':
        return (
          <AuthGuard featureName="Autonomous AI Agents" description="Sign in to your PromptHub account to deploy, configure, and orchestrate specialized autonomous AI agents.">
            <AgentsView />
          </AuthGuard>
        );
      case 'collections':
        return (
          <AuthGuard featureName="Prompt Collections" description="Organize prompts into modular suites, test packs, and discoverable collections.">
            <LibraryView initialSection="collections" />
          </AuthGuard>
        );
      case 'community':
      case 'explore':
        return <CommunityView />;
      case 'marketplace':
        return <MarketplaceView />;
      case 'teams':
        return (
          <AuthGuard featureName="Teams Workspace" description="Sign in to collaborate with your team, share internal prompt libraries, and manage member roles.">
            <TeamsView />
          </AuthGuard>
        );
      case 'team-accept':
        return <TeamAcceptInviteView />;
      case 'prompt-drops':
      case 'drops':
        return <MarketplaceView />;
      case 'leaderboard':
        return <LeaderboardView />;
      case 'settings':
        return (
          <AuthGuard featureName="Account Settings" description="Configure your preferences, theme, developer mode, and security settings.">
            <SettingsView />
          </AuthGuard>
        );
      case 'admin':
        return (
          <AuthGuard adminOnly featureName="Admin Console" description="Sign in with an administrator account to access platform analytics and review queues.">
            <AdminView />
          </AuthGuard>
        );
      case 'notifications':
        return (
          <AuthGuard featureName="Notification Center" description="Sign in to access your activity stream, prompt notifications, and studio events.">
            <NotificationsView />
          </AuthGuard>
        );
      case 'create-prompt':
        return (
          <AuthGuard featureName="Prompt Creator" description="Sign in to create, publish, and monetize prompts in the PromptHub marketplace.">
            <CreatePromptView />
          </AuthGuard>
        );
      case 'profile':
        return (
          <AuthGuard featureName="User Profile" description="Sign in to view and customize your prompt engineer profile, avatar, and badges.">
            <ProfileView />
          </AuthGuard>
        );
      case 'search':
        return <SearchView />;
      case 'credentials':
        return (
          <AuthGuard featureName="API Credentials & Providers" description="Connect your BYOK API keys for OpenAI, Anthropic, Gemini, Groq, Mistral, and more.">
            <CredentialsView />
          </AuthGuard>
        );
      case 'legal':
      case 'terms':
      case 'privacy':
      case 'cookies':
        return <LegalView initialDoc={activeTab === 'cookies' ? 'cookies' : activeTab === 'privacy' ? 'privacy' : activeTab === 'terms' ? 'terms' : 'terms'} />;
      case 'pitch':
      case 'presentation':
        return <PitchDeckView />;
      case '404':
        return <NotFoundView />;
      case 'payment-failed':
        return <PaymentFailedView />;
      case 'access-denied':
        return <AccessDeniedView />;
      case 'maintenance':
        return <MaintenanceView />;
      case 'support':
        return <SupportView />;
      case 'auth':
        if (isLoggedIn && user && !passwordRecoveryMode) {
          return null;
        }
        return (
          <AuthView 
            initialMode={passwordRecoveryMode ? 'reset' : undefined}
            onPasswordResetComplete={clearPasswordRecoveryMode}
            onSuccess={(userData) => {
              login(userData);
              setShowAuthModal(false);
              const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
              const redirectParam = params?.get('redirect');
              const destination = getPostAuthDestination(redirectParam);
              setActiveTab(userData?.role === 'Admin' && destination === 'dashboard' ? 'admin' : destination);
            }}
          />
        );
      default:
        return <NotFoundView />;
    }
  };

  const isPublicMarketingView = activeTab === 'home';
  const isSpecialAuthView = activeTab === 'auth' || activeTab === 'pitch' || activeTab === 'presentation';
  const showAppSidebar = !isPublicMarketingView && !isSpecialAuthView;
  const showAppHeader = !isPublicMarketingView && !isSpecialAuthView;

  return (
    <div className="flex h-[100dvh] w-full max-w-full overflow-hidden bg-bg-primary text-text-primary antialiased relative flex-row">
      {/* 2px Indeterminate Top Navigation Indicator (delayed 150ms for real route loads) */}
      <TopNavigationProgress />

      {/* Left Sidebar: strictly in working application views; hidden on standalone public marketing views */}
      {showAppSidebar && (
        <Sidebar 
          mobileOpen={isMobileSidebarOpen} 
          onMobileOpenChange={setIsMobileSidebarOpen} 
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
        />
      )}

      {/* Main Content Column: PublicNavbar or (TopHeader + Studio Workspace) */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 h-full overflow-hidden relative">
        {/* Public Horizontal Top Navbar (for standalone marketing homepage) */}
        {isPublicMarketingView && (
          <PublicNavbar onOpenAuth={() => setShowAuthModal(true)} />
        )}

        {/* Studio Top Navigation Header (for working application views) */}
        {showAppHeader && (
          <TopHeader 
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)} 
          />
        )}

        {/* Main View Container */}
        <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col min-w-0 min-h-0 w-full overflow-hidden relative bg-bg-primary outline-none">

          {/* Persistent Workspace Container (Keeps running generations alive across tab switches & back navigation, Req #1 & #2) */}
          {hasVisitedWorkspace && (
            <div
              className={`w-full flex-1 min-h-0 h-full flex-col overflow-hidden pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-0 ${
                isWorkspaceActive ? 'flex' : 'hidden'
              }`}
              style={{ display: isWorkspaceActive ? 'flex' : 'none' }}
            >
              <AuthGuard featureName="Workspace" description="Sign in to describe your idea, choose design directions, and generate live interactive AI projects.">
                <UnifiedCreationWorkspace />
              </AuthGuard>
            </div>
          )}

          {/* Dynamic Panel View loaded lazily (for non-workspace tabs) */}
          {!isWorkspaceActive && (
            <ErrorBoundary>
              <Suspense fallback={<ContextualViewSkeleton tab={activeTab} />}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeTab}
                    ref={viewScrollRef}
                    data-view-scroll-container="true"
                    onScroll={handleViewScroll}
                    onAnimationComplete={() => {
                      if (viewScrollRef.current) {
                        scrollRestorationService.restoreScroll(viewScrollRef.current, activeTab);
                      }
                    }}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{
                      duration: 0.18,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`w-full flex-1 min-h-0 ${
                      isPublicMarketingView
                        ? 'overflow-y-auto custom-scrollbar overscroll-contain'
                        : 'overflow-y-auto custom-scrollbar overscroll-contain pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0'
                    }`}
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      touchAction: 'pan-y',
                      willChange: 'opacity, transform',
                    }}
                  >
                    {renderActiveView()}
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </ErrorBoundary>
          )}
        </main>
      </div>

      {/* Lazily loaded modals with Suspense fallback */}
      <Suspense fallback={null}>
        {isModelExplanationOpen && (
          <ModelExplanationModal
            isOpen={isModelExplanationOpen}
            onClose={() => setIsModelExplanationOpen(false)}
          />
        )}

        {isSearchModalOpen && (
          <GlobalSearchModal
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
          />
        )}

        {isUsernameModalOpen && (
          <UsernameSetupModal
            isOpen={isUsernameModalOpen}
            onClose={() => setIsUsernameModalOpen(false)}
          />
        )}

        {isBugReportModalOpen && (
          <BugReportModal
            isOpen={isBugReportModalOpen}
            onClose={() => setIsBugReportModalOpen(false)}
          />
        )}

        {isSubmitToAdminModalOpen && (
          <SubmitToAdminModal
            isOpen={isSubmitToAdminModalOpen}
            prompt={submitToAdminPromptTarget}
            onClose={() => setIsSubmitToAdminModalOpen(false)}
          />
        )}

        {isRechargeModalOpen && (
          <RechargeModal
            isOpen={isRechargeModalOpen}
            initialAmount={rechargeInitialAmount}
            onClose={() => setIsRechargeModalOpen(false)}
          />
        )}

        {sharedCreatorId && (
          <CreatorProfileModal
            isOpen={Boolean(sharedCreatorId)}
            creatorId={sharedCreatorId}
            onClose={() => {
              setSharedCreatorId(null);
              if (typeof window !== 'undefined' && window.location.pathname.match(/^\/(?:u|@|profile)\//i)) {
                try {
                  window.history.pushState(null, '', '/');
                } catch {}
              }
            }}
          />
        )}
      </Suspense>

      {/* Floating global toast stack */}
      <div className="fixed top-20 right-4 sm:right-6 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full mx-auto sm:mx-0" role="status" aria-live="polite" aria-atomic="false">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95, transition: { duration: 0.15 } }}
              layout
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-2xl transition-all text-text-primary ${
                toast.type === 'success'
                  ? 'bg-white dark:bg-[#081510] border-emerald-500/80 dark:border-emerald-600/70 shadow-emerald-950/20 dark:shadow-black/70'
                  : toast.type === 'error'
                  ? 'bg-white dark:bg-[#180A0D] border-rose-500/80 dark:border-rose-600/70 shadow-rose-950/20 dark:shadow-black/70'
                  : 'bg-white dark:bg-[#0B1118] border-brand-primary/80 dark:border-[#41A2D9]/70 shadow-blue-950/20 dark:shadow-black/70'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-[#0D241A] text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/80">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
                {toast.type === 'error' && (
                  <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-[#281015] text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800/80">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                )}
                {toast.type === 'info' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-[#132435] text-brand-primary dark:text-[#41A2D9] flex items-center justify-center border border-blue-200 dark:border-[#1C2B3A]">
                    <Info className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs font-semibold text-text-primary leading-snug font-sans break-words">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast(toast.id);
                }}
                className="min-h-[44px] min-w-[44px] -my-1.5 -mr-1.5 flex items-center justify-center shrink-0 text-text-muted hover:text-text-primary transition-colors cursor-pointer rounded-lg hover:bg-bg-tertiary border border-transparent hover:border-border-default"
                aria-label="Dismiss notification"
                title="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Fullscreen Live Capsule Web Preview (When ?live= or ?capsule= or ?preview= is visited) */}
      {liveCapsuleSlug && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary select-none">
          <div className="h-12 border-b border-border-default bg-bg-secondary px-3 sm:px-4 flex items-center justify-between shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs font-bold font-mono text-text-primary truncate max-w-[140px] sm:max-w-[200px]">
                {liveCapsuleSlug}.prompthub.cloud
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold shrink-0">
                LIVE PREVIEW
              </span>
            </div>

            {/* Center: Device Switcher */}
            <div className="flex items-center bg-bg-primary rounded-lg p-0.5 border border-border-default shadow-3xs">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                title="Desktop View (100%)"
                className={`h-7 px-2.5 flex items-center gap-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  previewDevice === 'desktop'
                    ? 'bg-brand-primary text-white font-semibold shadow-3xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('tablet')}
                title="Tablet Screen View (768px)"
                className={`h-7 px-2.5 flex items-center gap-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  previewDevice === 'tablet'
                    ? 'bg-brand-primary text-white font-semibold shadow-3xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                title="Mobile Screen View (390px)"
                className={`h-7 px-2.5 flex items-center gap-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  previewDevice === 'mobile'
                    ? 'bg-brand-primary text-white font-semibold shadow-3xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Mobile</span>
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  const url = createShareablePreviewUrl(liveCapsuleSlug || 'preview', liveCapsuleHtml || undefined);
                  try {
                    await navigator.clipboard.writeText(url);
                    setPreviewCopied(true);
                    setTimeout(() => setPreviewCopied(false), 2000);
                  } catch {}
                }}
                className="h-8 min-h-[32px] px-2.5 rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-primary text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-3xs"
                title="Share universal preview link"
              >
                {previewCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-brand-primary" />
                    <span className="hidden sm:inline text-brand-primary font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-brand-primary" />
                    <span className="hidden sm:inline">Share</span>
                  </>
                )}
              </button>

              {liveCapsuleHtml && (
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([liveCapsuleHtml], { type: 'text/html;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${liveCapsuleSlug}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="h-8 min-h-[32px] px-2.5 rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-primary text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-3xs"
                  title="Download HTML package"
                >
                  <Download className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="hidden md:inline">Download</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setLiveCapsuleSlug(null);
                  setActiveTab('workspace');
                }}
                className="h-8 min-h-[32px] px-3.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors cursor-pointer shadow-xs"
              >
                Studio
              </button>
              <button
                type="button"
                onClick={() => setLiveCapsuleSlug(null)}
                className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg border border-border-default hover:bg-bg-tertiary flex items-center justify-center text-text-muted hover:text-text-primary cursor-pointer transition-colors"
                aria-label="Close Preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Iframe Viewport */}
          <div className="flex-1 w-full bg-stone-100 dark:bg-stone-900/60 p-2 sm:p-4 overflow-hidden flex items-center justify-center">
            {liveCapsuleHtml || (typeof window !== 'undefined' && localStorage.getItem('ph_workspace_latest_html')) ? (
              <div
                className={`${
                  previewDevice === 'mobile'
                    ? 'w-full max-w-[390px] h-full max-h-[85vh] rounded-2xl shadow-xl border border-border-default'
                    : previewDevice === 'tablet'
                    ? 'w-full max-w-[768px] h-full max-h-[90vh] rounded-xl shadow-lg border border-border-default'
                    : 'w-full h-full'
                } bg-white dark:bg-stone-900 overflow-hidden transition-all duration-200 flex flex-col`}
              >
                <iframe
                  title="PromptHub Live Preview"
                  srcDoc={liveCapsuleHtml || localStorage.getItem('ph_workspace_latest_html') || ''}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3 bg-bg-primary">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-text-primary">
                  Capsule Ready in Studio
                </h3>
                <p className="text-xs text-text-muted max-w-sm">
                  Launch PromptHub AI Studio to run, modify, or deploy the complete code bundle for <strong>{liveCapsuleSlug}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLiveCapsuleSlug(null);
                    setActiveTab('workspace');
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-xs"
                >
                  Open in AI Studio
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Cookie Consent Banner */}
      <CookieConsentBanner />

      {/* Global Tone Switch Confirmation Modal */}
      <ToneSwitchModal
        isOpen={Boolean(pendingToneSwitch)}
        targetTone={pendingToneSwitch}
        onConfirm={confirmToneSwitch}
        onCancel={cancelToneSwitch}
      />

      {/* Pip Guide Floating Launcher, Interactive Panel, and Tour Spotlight Overlay */}
      <PipLauncher />
      <PipPanel />
      <PipTourOverlay />

      {/* Global Intercom Customer Support Messenger */}
      <IntercomMessenger />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <ToneProvider>
        <AppProvider>
          <WorkspaceProvider>
            <ConfirmProvider>
              <GuideProvider>
                <AppContent />
              </GuideProvider>
            </ConfirmProvider>
          </WorkspaceProvider>
        </AppProvider>
      </ToneProvider>
    </ThemeProvider>
  );
}

export default App;
