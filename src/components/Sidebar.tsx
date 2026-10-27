import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { TabType } from '../context/AppContext';
import { PromptHubLogo } from './PromptHubLogo';
import { 
  X, 
  Lock, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  Settings,
  HelpCircle,
  LayoutDashboard,
  SquareTerminal,
  BookmarkCheck,
  Store,
  Menu,
} from 'lucide-react';
import {
  PromptStudioIcon,
  PromptMarketplaceIcon,
  PromptLibraryIcon,
  PromptCommunityIcon,
  PromptTeamIcon,
  PromptStorageIcon,
  PromptNewsIcon,
  PromptDashboardIcon,
  PromptTerminalIcon,
} from './icons/PromptHubIcons';

import { useGuide } from '../context/GuideContext';
import { trackSidebarNavigation } from '../lib/posthogEvents';
import { isTabLockedForUser, isTabPublic } from '../utils/navigationAuth';
import { scrollToTop } from '../utils/scrollUtils';

const prefetchMap: Record<string, () => Promise<any>> = {
  home: () => import('../views/LandingView'),
  workspace: () => import('./workspace/UnifiedCreationWorkspace'),
  'create-and-improve': () => import('./workspace/UnifiedCreationWorkspace'),
  profile: () => import('../views/ProfileView'),
  work: () => import('./workspace/UnifiedCreationWorkspace'),
  news: () => import('../views/NewsView'),
  'models-guide': () => import('../views/ModelsGuideView'),
  'classic-studio': () => import('../views/DeveloperModeView'),
  agents: () => import('../views/AgentsView'),
  library: () => import('../views/LibraryView'),
  analyzer: () => import('../views/DeveloperModeView'),
  arena: () => import('../views/DeveloperModeView'),
  storage: () => import('../views/StorageView'),
  dashboard: () => import('../views/DashboardHomeView'),
  developer: () => import('../views/DeveloperModeView'),
  community: () => import('../views/CommunityView'),
  marketplace: () => import('../views/MarketplaceView'),
  pricing: () => import('../views/PricingView'),
  recharge: () => import('../views/RechargeView'),
  'create-prompt': () => import('../views/CreatePromptView'),
  collections: () => import('../views/CollectionsView'),
  credentials: () => import('../views/CredentialsView'),
  leaderboard: () => import('../views/LeaderboardView'),
  teams: () => import('../views/TeamsView'),
  settings: () => import('../views/SettingsView'),
  admin: () => import('../views/AdminView'),
  notifications: () => import('../views/NotificationsView'),
  support: () => import('../views/SupportView'),
};

const prefetchView = (tab: string) => {
  try {
    prefetchMap[tab]?.();
  } catch {
    // Non-blocking prefetch
  }
};

interface SidebarNavItemProps {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  isActive: boolean;
  isLocked: boolean;
  isCollapsed?: boolean;
  badge?: number | string;
  shortcut?: string;
  onClick: () => void;
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = React.memo((
  { id, label, icon: Icon, isActive, isLocked, isCollapsed, badge, shortcut, onClick }
) => {
  const tooltipText = isLocked 
    ? `${label} (Sign in to access)`
    : shortcut ? `${label} (${shortcut})` : label;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => prefetchView(id)}
      onFocus={() => prefetchView(id)}
      aria-label={isLocked ? `${label} (Locked - sign in required)` : label}
      title={isCollapsed ? tooltipText : (isLocked ? 'Sign in to access' : undefined)}
      aria-current={isActive ? 'page' : undefined}
      className={`w-full min-h-[44px] md:min-h-[38px] flex items-center ${
        isCollapsed ? 'justify-center px-0 py-1.5' : 'gap-2.5 px-2.5 py-1.5'
      } rounded-lg text-xs font-medium transition-all duration-150 group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary cursor-pointer ${
        isActive
          ? 'bg-brand-primary/10 border border-brand-primary/25 text-brand-primary dark:text-brand-accent dark:bg-brand-primary/20 dark:border-brand-primary/40 font-semibold shadow-2xs'
          : isLocked
            ? 'text-text-secondary/70 dark:text-neutral-400 hover:bg-bg-tertiary dark:hover:bg-white/[0.05] hover:text-text-primary dark:hover:text-white border border-transparent'
            : 'text-text-secondary dark:text-neutral-300 hover:bg-bg-tertiary dark:hover:bg-white/[0.05] hover:text-text-primary dark:hover:text-white border border-transparent'
      }`}
    >
      <div className={`relative shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border transition-all duration-150 ${
        isActive
          ? 'bg-brand-primary/15 border-brand-primary/40 dark:border-brand-primary/50 text-brand-primary dark:text-brand-accent shadow-xs'
          : 'bg-bg-tertiary/70 dark:bg-white/[0.04] border-border-default dark:border-[#1C2B3A] text-text-muted group-hover:border-border-hover group-hover:text-text-primary dark:group-hover:text-white'
      }`}>
        <Icon 
          size={17}
          variant={isActive ? 'solid' : 'outline'}
          className="transition-colors shrink-0" 
        />

        {isCollapsed && isLocked && (
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-bg-secondary rounded-full flex items-center justify-center border border-border-default dark:border-neutral-700 shadow-3xs">
            <Lock className="w-1.5 h-1.5 text-text-muted dark:text-neutral-400" />
          </div>
        )}

        {isCollapsed && !isLocked && badge && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-primary dark:bg-brand-accent rounded-full" />
        )}
      </div>

      {!isCollapsed && (
        <>
          <span className={`flex-1 text-left font-sans tracking-tight truncate ${
            isActive ? 'text-brand-primary dark:text-brand-accent font-semibold' : isLocked ? 'text-text-secondary/70 dark:text-neutral-400 group-hover:text-text-primary dark:group-hover:text-white' : 'text-text-secondary dark:text-neutral-300 group-hover:text-text-primary dark:group-hover:text-white'
          }`}>
            {label}
          </span>

          {shortcut && !isLocked && (
            <span className={`text-[10px] font-mono px-1 py-0.5 rounded shrink-0 transition-colors ${
              isActive 
                ? 'bg-brand-primary-light text-brand-primary dark:text-brand-accent font-semibold' 
                : 'text-text-muted group-hover:text-text-secondary'
            }`}>
              {shortcut}
            </span>
          )}

          {badge && !isLocked && !shortcut && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium shrink-0 ${
              isActive
                ? 'bg-brand-primary/15 text-brand-primary dark:bg-brand-primary/30 dark:text-brand-accent'
                : 'bg-bg-tertiary border border-border-default text-text-muted'
            }`}>
              {badge}
            </span>
          )}

          {isLocked ? (
            <div 
              className="flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-text-muted/70 dark:text-neutral-400"
              title="Sign in to access"
            >
              <Lock className="w-3 h-3" />
            </div>
          ) : isActive ? (
            <div className="w-1.5 h-1.5 bg-brand-primary dark:bg-brand-accent rounded-full shrink-0 shadow-2xs shadow-brand-accent/50" />
          ) : null}
        </>
      )}
    </button>
  );
});

export interface SidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  mobileOpen: controlledMobileOpen,
  onMobileOpenChange,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
}) => {
  const { 
    user, 
    isLoggedIn, 
    activeTab, 
    setActiveTab, 
    developerMode,
  } = useApp();

  const { openGuide } = useGuide();
  
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = controlledMobileOpen !== undefined ? controlledMobileOpen : internalMobileOpen;
  const setMobileOpen = (open: boolean) => {
    setInternalMobileOpen(open);
    onMobileOpenChange?.(open);
  };

  const [internalIsCollapsed, setInternalIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('prompthub_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalIsCollapsed;

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalIsCollapsed(prev => {
        const next = !prev;
        try {
          localStorage.setItem('prompthub_sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    }
  };

  // Close mobile sidebar on tab navigation
  const handleTabChange = (tab: string) => {
    trackSidebarNavigation({ destination: tab });
    if (!isLoggedIn && !isTabPublic(tab)) {
      try {
        sessionStorage.setItem('prompthub_pre_auth_tab', tab);
      } catch {}
    }
    setActiveTab(tab as TabType);
    if (tab === 'home') {
      scrollToTop();
    }
    setMobileOpen(false);
  };

  // Close on Escape key & Keyboard shortcuts for ⌘1..⌘5
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') {
        setMobileOpen(false);
        return;
      }

      // Check for Meta/Cmd (Mac) or Ctrl (Windows/Linux) shortcuts
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          handleTabChange('workspace');
        } else if (e.key === '2') {
          e.preventDefault();
          handleTabChange('library');
        } else if (e.key === '3') {
          e.preventDefault();
          handleTabChange('marketplace');
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Prevent body scroll when mobile sidebar is open (iOS Safari fix)
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  shortcut?: string;
  badge?: string | number;
  public: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

  // Hierarchical navigation sections with all core features and admin portal
  const navSections: NavSection[] = useMemo(() => {
    const workspaceItems: NavItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: PromptDashboardIcon, public: false },
      { id: 'workspace', label: 'Workspace', icon: PromptStudioIcon, public: false },
    ];

    if (developerMode) {
      workspaceItems.push({ id: 'developer', label: 'Developer Suite', icon: PromptTerminalIcon, public: false });
    }

    workspaceItems.push(
      { id: 'library', label: 'Library', icon: PromptLibraryIcon, public: false },
      { id: 'storage', label: 'Drive Storage', icon: PromptStorageIcon, public: false },
      { id: 'teams', label: 'Teams', icon: PromptTeamIcon, public: false },
    );

    const sections: NavSection[] = [
      {
        title: 'Workspace',
        items: workspaceItems
      },
    ];

    sections.push({
      title: 'Discover',
      items: [
        { id: 'marketplace', label: 'Marketplace', icon: PromptMarketplaceIcon, public: true },
        { id: 'community', label: 'Community', icon: PromptCommunityIcon, public: true },
        { id: 'news', label: 'AI News', icon: PromptNewsIcon, public: true },
      ]
    });

    if (user?.role === 'Admin') {
      sections.push({
        title: 'Administration',
        items: [
          { id: 'admin', label: 'Admin Console', icon: ShieldCheck, public: false },
        ]
      });
    }

    return sections;
  }, [user?.role, developerMode]);

  const renderNavContent = (collapsed: boolean, isMobile: boolean) => (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative bg-bg-secondary text-text-primary">
      {/* Mobile Drawer Header: ONLY rendered on mobile off-canvas drawer */}
      {isMobile ? (
        <div className="px-4 py-3 flex items-center justify-between border-b border-border-default bg-bg-secondary shrink-0">
          <div 
            onClick={() => handleTabChange('home')}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTabChange('home'); }}
            aria-label="PromptHub Home"
          >
            <PromptHubLogo variant="full" size="sm" showTile={false} />
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-border-default bg-bg-tertiary text-text-muted">
              BETA
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        /* Desktop Header: Brand Logo + Collapse Button */
        !collapsed ? (
          <div className="hidden md:flex items-center h-14 justify-between px-3.5 shrink-0 select-none border-b border-border-default transition-all duration-200">
            <div 
              onClick={() => handleTabChange('home')}
              className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTabChange('home'); }}
              aria-label="PromptHub Home"
            >
              <PromptHubLogo variant="full" size="sm" showTile={false} />
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-border-default bg-bg-tertiary text-text-muted">
                BETA
              </span>
            </div>
            <button
              type="button"
              onClick={toggleCollapse}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer group shrink-0"
            >
              <span className="w-6 h-6 rounded-md border border-border-default hover:border-border-hover bg-bg-tertiary hover:bg-bg-secondary flex items-center justify-center transition-all">
                <PanelLeftClose className="w-3.5 h-3.5 group-hover:text-text-primary transition-colors" />
              </span>
            </button>
          </div>
        ) : (
          <div className="hidden md:flex flex-col items-center shrink-0 select-none border-b border-border-default transition-all duration-200">
            <div className="h-14 flex items-center justify-center w-full">
              <div 
                onClick={() => handleTabChange('home')}
                className="flex items-center cursor-pointer hover:opacity-90 transition-opacity"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTabChange('home'); }}
                aria-label="PromptHub Home"
              >
                <PromptHubLogo variant="icon" size="sm" showTile={false} />
              </div>
            </div>
            <div className="py-2 flex justify-center w-full">
              <button
                type="button"
                onClick={toggleCollapse}
                title="Expand sidebar"
                aria-label="Expand sidebar"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary transition-all cursor-pointer group"
              >
                <span className="w-6 h-6 rounded-md border border-border-default hover:border-border-hover bg-bg-tertiary hover:bg-bg-secondary flex items-center justify-center transition-all">
                  <PanelLeftOpen className="w-3.5 h-3.5 group-hover:text-text-primary transition-colors" />
                </span>
              </button>
            </div>
          </div>
        )
      )}



      {/* Categorized Navigation */}
      <nav className={`flex-1 min-h-0 ${collapsed ? 'px-1.5' : isMobile ? 'px-3' : 'px-2.5'} pt-2 pb-4 space-y-3 overflow-y-auto custom-scrollbar overscroll-contain transition-all duration-200`}>
        {navSections.map((sec: NavSection) => (
          <div key={sec.title} className="space-y-0.5 pt-1">
            {!collapsed && (
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-muted font-semibold font-mono px-2 pt-2 pb-1">
                {sec.title}
              </div>
            )}
            {sec.items.map((item: NavItem) => (
              <SidebarNavItem
                key={item.id}
                id={item.id}
                label={item.label}
                icon={item.icon}
                isActive={activeTab === item.id || (item.id === 'workspace' && activeTab === 'create-and-improve')}
                isLocked={isTabLockedForUser(item.id, isLoggedIn)}
                isCollapsed={collapsed}
                shortcut={item.shortcut}
                badge={item.badge}
                onClick={() => handleTabChange(item.id)}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Credits & Usage Card */}
      {!collapsed ? (
        <div className="p-3 shrink-0 border-t border-border-default bg-bg-secondary transition-all duration-200">
          <div 
            onClick={() => handleTabChange('pricing')}
            className="p-2.5 rounded-xl border border-border-default bg-bg-tertiary text-left hover:border-brand-primary/40 transition-colors cursor-pointer group"
            role="button"
            tabIndex={0}
            title="View Plans & Recharge Credits"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-text-primary">
              <span className="flex items-center gap-1.5 group-hover:text-brand-primary transition-colors">
                <Wallet className="w-3.5 h-3.5 text-brand-primary" />
                <span>Credits</span>
              </span>
              <span className="text-[10px] font-mono text-text-muted group-hover:text-text-primary transition-colors">
                {(user?.credits ?? 0).toLocaleString('en-IN')} cr
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-text-secondary group-hover:text-brand-primary transition-colors">
              <span>Usage &amp; Billing</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-brand-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>

          {/* User Row at bottom: Split Profile and Settings */}
          <div className="mt-2.5 pt-2 border-t border-border-default flex items-center justify-between gap-1.5">
            <div 
              onClick={() => handleTabChange('profile')}
              className="flex items-center gap-2 min-w-0 cursor-pointer group flex-1 p-1 rounded-lg hover:bg-bg-tertiary transition-colors"
              role="button"
              tabIndex={0}
              title="Open My Profile"
            >
              <div className="w-7 h-7 rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-accent flex items-center justify-center font-bold text-xs shrink-0">
                {(user?.name || 'Developer').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-text-primary truncate group-hover:text-brand-primary transition-colors">
                  {user?.name || 'Local User'}
                </div>
                <div className="text-[10px] text-text-muted font-mono truncate">
                  My Profile
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openGuide('ask')}
              title="Help & Guide (Pip Assistant)"
              aria-label="Help & Guide"
              className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] rounded-lg bg-bg-tertiary hover:bg-bg-primary text-brand-primary flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-border-default/60"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('settings')}
              title="Account Settings"
              aria-label="Account Settings"
              className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] rounded-lg bg-bg-tertiary hover:bg-bg-primary text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-border-default/60"
            >
              <Settings className="w-4 h-4 text-text-muted hover:text-text-primary" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2 shrink-0 border-t border-border-default flex flex-col items-center gap-2 transition-all duration-200">
          <button
            type="button"
            onClick={() => handleTabChange('pricing')}
            title="Credits & Plans"
            aria-label="Credits & Plans"
            className="min-h-[44px] min-w-[44px] sm:w-8 sm:h-8 rounded-lg bg-bg-tertiary hover:bg-bg-primary text-brand-primary flex items-center justify-center transition-colors cursor-pointer"
          >
            <Wallet className="w-4 h-4 text-brand-primary" />
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('profile')}
            title="My Profile"
            aria-label="My Profile"
            className="min-h-[44px] min-w-[44px] sm:w-8 sm:h-8 rounded-lg bg-bg-tertiary hover:bg-bg-primary text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-accent flex items-center justify-center font-bold text-xs">
              {(user?.name || 'Developer').charAt(0).toUpperCase()}
            </div>
          </button>
          <button
            type="button"
            onClick={() => openGuide('ask')}
            title="Help & Guide (Pip Assistant)"
            aria-label="Help & Guide"
            className="min-h-[44px] min-w-[44px] sm:w-8 sm:h-8 rounded-lg bg-bg-tertiary hover:bg-bg-primary text-brand-primary flex items-center justify-center transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('settings')}
            title="Settings"
            aria-label="Settings"
            className="min-h-[44px] min-w-[44px] sm:w-8 sm:h-8 rounded-lg bg-bg-tertiary hover:bg-bg-primary text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-text-muted hover:text-text-primary" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-all duration-200"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Off-Canvas Drawer: ALWAYS expanded with icons + labels */}
      {mobileOpen && (
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation drawer"
          className="md:hidden fixed top-0 bottom-0 left-0 z-50 w-[280px] max-w-[85vw] sm:w-[320px] flex flex-col bg-bg-secondary border-r border-border-default h-[100dvh] shadow-2xl overflow-hidden select-none"
        >
          {renderNavContent(false, true)}
        </aside>
      )}

      {/* Desktop Sidebar: always visible on desktop */}
      <aside
        aria-label="Primary navigation"
        className={`hidden md:flex flex-col relative top-auto bottom-auto left-auto z-auto ${
          isCollapsed ? 'md:w-[60px]' : 'md:w-[224px]'
        } border-r border-border-default bg-bg-secondary h-full min-h-0 overflow-hidden select-none shrink-0 transition-all duration-200`}
      >
        {renderNavContent(isCollapsed, false)}
      </aside>

      {/* Mobile Bottom Navigation Bar (Thumb Friendly) */}
      <nav 
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg-secondary/95 backdrop-blur-md border-t border-border-default flex items-center justify-around px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] select-none shadow-lg transition-all duration-200"
      >
        <button
          type="button"
          onClick={() => handleTabChange('dashboard')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[52px] px-1.5 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-brand-primary font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
          aria-label="Dashboard"
          aria-current={activeTab === 'dashboard' ? 'page' : undefined}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-sans">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('workspace')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[52px] px-1.5 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'workspace' || activeTab === 'create-and-improve'
              ? 'text-brand-primary font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
          aria-label="Workspace"
          aria-current={activeTab === 'workspace' || activeTab === 'create-and-improve' ? 'page' : undefined}
        >
          <SquareTerminal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-sans">Workspace</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('library')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[52px] px-1.5 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'library'
              ? 'text-brand-primary font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
          aria-label="Library"
          aria-current={activeTab === 'library' ? 'page' : undefined}
        >
          <BookmarkCheck className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-sans">Library</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('marketplace')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[52px] px-1.5 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'marketplace'
              ? 'text-brand-primary font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
          aria-label="Marketplace"
          aria-current={activeTab === 'marketplace' ? 'page' : undefined}
        >
          <Store className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-sans">Marketplace</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[52px] px-1.5 py-1 rounded-xl transition-all cursor-pointer ${
            mobileOpen
              ? 'text-brand-primary font-bold'
              : 'text-text-muted hover:text-text-primary'
          }`}
          aria-label="Open full navigation menu"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-sans">More</span>
        </button>
      </nav>
    </>
  );
});

export default Sidebar;
