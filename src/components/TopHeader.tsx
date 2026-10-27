import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  Wallet, 
  ChevronDown, 
  User, 
  LogOut, 
  Menu,
  ShieldCheck,
  Smartphone,
  HelpCircle,
} from 'lucide-react';
import { 
  PromptSearchIcon, 
  PromptStudioIcon, 
  PromptKeyIcon 
} from './icons/PromptHubIcons';
import { useGuide } from '../context/GuideContext';
import { useApp } from '../context/AppContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { multiProviderService } from '../services/ai/multiProviderService';
import { PromptHubLogo } from './PromptHubLogo';
import { ThemeToggle } from './ThemeToggle';
import { UserAvatar } from './UserAvatar';
import { MobileAppShowcaseModal } from './MobileAppShowcaseModal';
import { scrollToTop } from '../utils/scrollUtils';
import { motion, AnimatePresence } from 'framer-motion';

export interface TopHeaderProps {
  onToggleMobileSidebar?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = React.memo(({ 
  onToggleMobileSidebar
}) => {
  const { 
    user, 
    isLoggedIn, 
    logout, 
    activeTab,
    setActiveTab, 
    setShowAuthModal, 
  } = useApp();

  const { openGuide } = useGuide();

  const { 
    getBreadcrumbInfo,
    workingPrompt,
    sendToStudio,
    sendToAnalyzer,
    sendToArena,
    sendToWork,
  } = useWorkspace();
  const breadcrumb = getBreadcrumbInfo();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [connectedKeyCount, setConnectedKeyCount] = useState<number>(() => {
    try {
      return multiProviderService.getConnectedProviders().length;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const refreshKeyCount = () => {
      try {
        setConnectedKeyCount(multiProviderService.getConnectedProviders().length);
      } catch {}
    };
    window.addEventListener('focus', refreshKeyCount);
    window.addEventListener('storage', refreshKeyCount);
    return () => {
      window.removeEventListener('focus', refreshKeyCount);
      window.removeEventListener('storage', refreshKeyCount);
    };
  }, []);

  // Close dropdown on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleOpenSettings = () => {
    setActiveTab('settings');
  };

  const handleOpenBilling = () => {
    setActiveTab('pricing');
  };

  const handleTopUp = () => {
    setActiveTab('pricing');
  };

  return (
    <>
    <header className="h-14 border-b border-border-default bg-bg-secondary/98 backdrop-blur-sm px-2 sm:px-4 lg:px-5 flex items-center justify-between z-40 shrink-0 select-none w-full max-w-full relative">
      {/* Left: Mobile Menu Toggle & Mobile Branding (hidden on desktop where Sidebar contains branding) */}
      <div className="flex md:hidden items-center gap-1.5 sm:gap-2 min-w-0 mr-1 sm:mr-2 shrink-0">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation menu"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div 
          onClick={() => {
            setActiveTab('home');
            scrollToTop();
          }}
          className="flex items-center cursor-pointer hover:opacity-90 transition-opacity shrink-0"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { 
            if (e.key === 'Enter' || e.key === ' ') { 
              setActiveTab('home'); 
              scrollToTop(); 
            } 
          }}
          aria-label="PromptHub Home"
        >
          <PromptHubLogo variant="full" size="sm" />
        </div>
      </div>

      {/* Center: Contextual Breadcrumb */}
      <div className="hidden sm:flex items-center gap-2 min-w-0 mr-3">
        <div className="flex items-center gap-1.5 text-xs font-sans min-w-0">
          <span className="font-semibold text-text-primary tracking-tight truncate max-w-[180px]">
            {breadcrumb.tool || 'Dashboard'}
          </span>
          {breadcrumb.subtask && (
            <>
              <span className="text-text-muted/60 select-none">/</span>
              <span className="text-text-secondary truncate max-w-[160px] font-mono text-[11.5px]">
                {breadcrumb.subtask}
              </span>
            </>
          )}
        </div>

        {/* Workflow Rapid Switcher Pills */}
        {isLoggedIn && (
          <div className="hidden 2xl:flex items-center gap-0.5 bg-bg-tertiary/70 border border-border-default/60 rounded-lg p-0.5 ml-2">
            <button
              type="button"
              onClick={() => sendToStudio(workingPrompt?.rawContent || '', undefined, workingPrompt?.title)}
              title="Open in Studio"
              className="px-2 py-0.5 rounded text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Studio
            </button>
            <button
              type="button"
              onClick={() => sendToAnalyzer(workingPrompt?.rawContent || '')}
              title="Audit in Analyzer"
              className="px-2 py-0.5 rounded text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Analyze
            </button>
            <button
              type="button"
              onClick={() => sendToArena(workingPrompt?.rawContent || '')}
              title="Compare in Arena"
              className="px-2 py-0.5 rounded text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Compare
            </button>
            <button
              type="button"
              onClick={() => sendToWork({ title: workingPrompt?.title, prompt: workingPrompt?.rawContent || '' })}
              title="Develop in Work IDE"
              className="px-2 py-0.5 rounded text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Work
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="hidden lg:flex items-center flex-1 min-w-0 max-w-xs mx-auto">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
          aria-label="Search prompts, models, creators"
          title="Search (Ctrl + K)"
          className="w-full min-h-[34px] h-[34px] px-3 rounded-md border border-border-default bg-bg-primary/70 hover:bg-bg-primary dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-text-muted text-xs flex items-center justify-between transition-colors cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <PromptSearchIcon size={14} className="text-text-muted group-hover:text-brand-primary transition-colors shrink-0" />
            <span className="font-sans text-xs truncate">Search prompts, models...</span>
          </div>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-bg-tertiary border border-border-subtle rounded text-text-muted shrink-0 ml-1.5">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Center Spacer for small screens */}
      <div className="flex-1 lg:hidden" />

      {/* Right: Actions Toolbar matching uploaded reference (Image 1-5) */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Help & Guide Button on Top Header */}
        <button
          type="button"
          onClick={() => openGuide()}
          title="PromptHub Help & Guides"
          aria-label="Open Help & Guide"
          className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-0 sm:h-9 px-2 sm:px-2.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-xs font-medium text-text-secondary hover:text-text-primary flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-3xs"
        >
          <HelpCircle className="w-3.5 h-3.5 text-brand-primary shrink-0" />
          <span className="hidden sm:inline">Help</span>
        </button>

        {/* Appearance Mode Switcher (Dark Glass / Dark Solid / Light) */}
        <div className="shrink-0">
          <ThemeToggle 
            variant="compact" 
            className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] sm:w-9 sm:h-9 rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0" 
          />
        </div>

        {/* API Keys / BYOK Button on Top Bar */}
        {isLoggedIn && (
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            title={connectedKeyCount > 0 ? `BYOK Active (${connectedKeyCount} keys connected)` : "Connect API Keys (BYOK)"}
            aria-label="API Keys and Custom Providers"
            className={`min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-0 sm:h-9 px-2 sm:px-2.5 rounded-lg border text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'credentials'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 font-semibold'
                : 'bg-bg-secondary hover:bg-bg-tertiary border-border-default text-text-secondary hover:text-amber-500'
            }`}
          >
            <PromptKeyIcon size={14} className="text-amber-500 shrink-0" />
            <span className="hidden sm:inline">BYOK</span>
            {connectedKeyCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0" />
            )}
          </button>
        )}


        {/* 6. User Profile Menu or Sign In */}
        {isLoggedIn && user ? (
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              onDoubleClick={() => {
                setIsDropdownOpen(false);
                setActiveTab('profile');
              }}
              aria-label="User profile menu"
              aria-expanded={isDropdownOpen}
              title="Click to open profile menu, double click to view profile"
              className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-1.5 sm:px-2 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
            >
              {/* User Avatar */}
              <UserAvatar
                src={user.avatarUrl}
                name={user.name}
                username={user.username}
                role={user.role}
                isAdmin={user.role === 'Admin'}
                size="sm"
                shape="rounded"
              />

              {/* Name and Username Info (visible on xl+ displays to guarantee zero clipping on laptops) */}
              <div className="hidden xl:flex flex-col text-left min-w-0 pr-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-text-primary leading-tight truncate max-w-[95px]">
                    {user.name || 'Developer'}
                  </span>
                  {user.role === 'Admin' && (
                    <span className="px-1 py-0.2 text-[8px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded">
                      ADM
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-text-muted font-mono leading-tight truncate max-w-[95px]">
                  @{user.username || 'user'}
                </span>
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 6 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 w-64 bg-bg-secondary border border-border-default rounded-xl shadow-2xl py-1.5 z-[100] overflow-hidden text-left"
                >
                  {/* User identity + live credit balance with Top Up */}
                  <div className="px-3.5 py-2.5 border-b border-border-subtle bg-bg-tertiary/40">
                    <div 
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setActiveTab('profile');
                      }}
                      className="flex items-center gap-2.5 mb-1.5 cursor-pointer hover:opacity-90 transition-opacity group"
                      role="button"
                      tabIndex={0}
                      title="Click to view full profile"
                    >
                      <UserAvatar
                        src={user.avatarUrl}
                        name={user.name}
                        username={user.username}
                        role={user.role}
                        isAdmin={user.role === 'Admin'}
                        size="md"
                        shape="rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-text-primary group-hover:text-brand-primary transition-colors truncate">{user.name}</p>
                          {user.role === 'Admin' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-muted font-mono truncate">@{user.username}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between pt-2 border-t border-border-default/60">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-brand-primary dark:text-brand-accent shrink-0" />
                        <span className="text-xs font-semibold text-text-primary tabular-nums">
                          {(user.credits ?? 0).toLocaleString('en-IN')}
                          <span className="font-normal text-text-muted ml-0.5 text-[10px]">cr</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleTopUp();
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-primary text-white hover:bg-brand-primary-hi transition-colors cursor-pointer"
                      >
                        Top Up
                      </button>
                    </div>
                  </div>

                  <div className="py-1">
                    {/* Admin Console — only visible to Admin role */}
                    {user.role === 'Admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setActiveTab('admin' as any);
                        }}
                        className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-semibold">Admin Console</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setActiveTab('profile');
                      }}
                      className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-xs text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer group"
                    >
                      <User className="w-4 h-4 text-brand-primary group-hover:scale-105 transition-transform" />
                      <span className="font-semibold text-text-primary">My Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setActiveTab('workspace');
                      }}
                      className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                    >
                      <PromptStudioIcon size={16} className="text-brand-primary" />
                      <span>Prompt Studio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleOpenBilling();
                      }}
                      className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                    >
                      <Wallet className="w-4 h-4 text-brand-primary" />
                      <span>Usage &amp; Billing</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setActiveTab('credentials');
                      }}
                      className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                    >
                      <PromptKeyIcon size={16} className="text-amber-500" />
                      <span>API Keys &amp; Providers</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleOpenSettings();
                      }}
                      className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-brand-primary" />
                      <span>Account Settings</span>
                    </button>

                    {/* Help Guide is only displayed in the header dropdown on the home page as Intercom handles in-app support */}
                    {activeTab === 'home' && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          openGuide('ask');
                        }}
                        className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-xs text-brand-primary dark:text-brand-accent hover:bg-bg-tertiary transition-colors cursor-pointer"
                      >
                        <HelpCircle className="w-4 h-4 text-brand-primary shrink-0" />
                        <span className="font-semibold">Ask Pip (Guide &amp; Help)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsApkModalOpen(true);
                      }}
                      className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4 text-brand-primary" />
                      <span>Mobile App (APK / PWA)</span>
                    </button>

                    <div className="sm:hidden px-3.5 py-2 flex items-center justify-between border-t border-border-subtle bg-bg-tertiary/20">
                      <span className="text-xs text-text-secondary font-medium">Appearance</span>
                      <ThemeToggle 
                        variant="compact" 
                        className="min-h-[36px] min-w-[36px] h-8 w-8 rounded-lg bg-bg-secondary border border-border-default flex items-center justify-center text-text-secondary hover:text-text-primary" 
                      />
                    </div>
                  </div>

                  <div className="border-t border-border-subtle pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        logout();
                      }}
                      className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="hidden sm:inline-flex items-center justify-center min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 sm:px-3.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Sign in</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 sm:px-4 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <span>Get Started</span>
            </button>
          </div>
        )}
      </div>
    </header>

    {/* Standalone Mobile App & APK Showcase Modal */}
    <MobileAppShowcaseModal
      isOpen={isApkModalOpen}
      onClose={() => setIsApkModalOpen(false)}
    />
    </>
  );
});
