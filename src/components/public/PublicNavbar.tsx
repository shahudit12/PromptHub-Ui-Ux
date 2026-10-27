import React, { useState, useEffect } from 'react';
import { PromptHubLogo } from '../PromptHubLogo';
import { useApp } from '../../context/AppContext';
import { ThemeToggle } from '../ThemeToggle';
import { 
  Menu, 
  X, 
  ArrowRight, 
  FileText, 
  ChevronDown,
  HelpCircle,
} from 'lucide-react';
import { PromptNewsIcon, PromptCommunityIcon } from '../icons/PromptHubIcons';
import { useGuide } from '../../context/GuideContext';
import { scrollToTop, scrollToElementWithRetry } from '../../utils/scrollUtils';

export interface PublicNavbarProps {
  onOpenAuth?: () => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ onOpenAuth }) => {
  const { activeTab, setActiveTab, isLoggedIn, user, setShowAuthModal, developerMode } = useApp();
  const { openGuide } = useGuide();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  // Close mobile drawer on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setResourcesOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNav = (tab: string, anchorId?: string) => {
    setMobileMenuOpen(false);
    setResourcesOpen(false);
    if (anchorId) {
      if (activeTab === 'home') {
        scrollToElementWithRetry(anchorId, true);
      } else {
        setActiveTab('home');
        scrollToElementWithRetry(anchorId, true);
      }
      return;
    }
    setActiveTab(tab as any);
    if (tab === 'home' && !anchorId) {
      scrollToTop();
    }
  };

  const handleSignInClick = () => {
    setMobileMenuOpen(false);
    if (onOpenAuth) {
      onOpenAuth();
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-default/80 bg-bg-primary/90 backdrop-blur-md transition-colors select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <div 
          onClick={() => {
            handleNav('home');
            scrollToTop();
          }}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { 
            if (e.key === 'Enter' || e.key === ' ') { 
              handleNav('home'); 
              scrollToTop(); 
            } 
          }}
          aria-label="PromptHub Home"
        >
          <PromptHubLogo variant="full" size="md" />
        </div>

        {/* Center: Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-medium text-text-secondary">
          <button
            type="button"
            onClick={() => handleNav('home', 'how-it-works')}
            className={`min-h-[44px] px-3 py-2 rounded-lg hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer ${
              activeTab === 'home' ? 'text-text-primary' : ''
            }`}
            title="How It Works — Creation Workspace & Portfolio Lifecycle"
            aria-label="Product (How It Works)"
          >
            Product
          </button>
          <button
            type="button"
            onClick={() => handleNav('marketplace')}
            className={`min-h-[44px] px-3 py-2 rounded-lg hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer ${
              activeTab === 'marketplace' ? 'text-brand-primary font-semibold' : ''
            }`}
          >
            Templates
          </button>
          <button
            type="button"
            onClick={() => handleNav('pricing')}
            className={`min-h-[44px] px-3 py-2 rounded-lg hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer ${
              activeTab === 'pricing' ? 'text-brand-primary font-semibold' : ''
            }`}
          >
            Pricing
          </button>
          {developerMode && (
            <button
              type="button"
              onClick={() => handleNav('developer')}
              className={`min-h-[44px] px-3 py-2 rounded-lg hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer ${
                activeTab === 'developer' || activeTab === 'developer-mode' ? 'text-brand-primary font-semibold' : ''
              }`}
            >
              Developer Mode
            </button>
          )}

          <button
            type="button"
            onClick={() => openGuide('page-guide')}
            className="min-h-[44px] px-3 py-2 rounded-lg hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer flex items-center gap-1.5"
            title="Open Guide"
          >
            <HelpCircle className="w-4 h-4 text-brand-primary" />
            <span>Guide</span>
          </button>

          {/* Resources Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setResourcesOpen(prev => !prev)}
              aria-expanded={resourcesOpen}
              className="min-h-[44px] px-3 py-2 rounded-lg hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Resources</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 shrink-0 ${resourcesOpen ? 'rotate-180' : ''}`} />
            </button>

            {resourcesOpen && (
              <div 
                className="absolute top-full left-0 mt-1 w-56 p-1.5 rounded-xl bg-bg-elevated border border-border-default shadow-lg text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
                onMouseLeave={() => setResourcesOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => handleNav('news')}
                  className="w-full min-h-[38px] px-3 py-2 rounded-lg text-left text-text-secondary hover:text-text-primary hover:bg-bg-secondary flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="font-medium">AI Industry News</span>
                  <PromptNewsIcon size={14} className="text-brand-primary" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('community')}
                  className="w-full min-h-[38px] px-3 py-2 rounded-lg text-left text-text-secondary hover:text-text-primary hover:bg-bg-secondary flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="font-medium">Community Prompts</span>
                  <PromptCommunityIcon size={14} className="text-text-muted" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('legal')}
                  className="w-full min-h-[38px] px-3 py-2 rounded-lg text-left text-text-secondary hover:text-text-primary hover:bg-bg-secondary flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="font-medium">Security &amp; Legal Policies</span>
                  <FileText className="w-3.5 h-3.5 text-text-muted" />
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Right: Actions (Theme Toggle, Sign In, Open Studio) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Appearance Mode Switcher (Dark Glass / Dark Solid / Light) */}
          <ThemeToggle 
            variant="compact" 
            className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] sm:w-[38px] sm:h-[38px] rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
          />

          {/* Sign In (if unauthenticated) or User Avatar (if logged in) */}
          {isLoggedIn && user ? (
            <button
              type="button"
              onClick={() => handleNav('workspace')}
              className="hidden sm:inline-flex items-center gap-2 min-h-[44px] sm:min-h-[38px] sm:h-[38px] px-3 rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary transition-colors cursor-pointer text-xs font-semibold shrink-0 shadow-2xs"
              title="Open Workspace"
            >
              <div className="w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                {(user.name || 'D').charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[120px] truncate">{user.name || 'Developer'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignInClick}
              className="hidden sm:inline-flex items-center justify-center min-h-[44px] sm:min-h-[38px] sm:h-[38px] px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer shrink-0"
            >
              Sign in
            </button>
          )}

          {/* Primary Action: Open Workspace */}
          <button
            type="button"
            onClick={() => handleNav('workspace')}
            className="hidden sm:inline-flex items-center gap-2 min-h-[44px] sm:min-h-[38px] sm:h-[38px] px-4 sm:px-4.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white dark:text-[#1B262C] text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.98] shrink-0"
          >
            <span>Open Workspace</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="md:hidden min-h-[44px] min-w-[44px] rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-secondary border border-border-default flex items-center justify-center transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border-default bg-bg-primary px-4 py-4 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-150">
          <button
            type="button"
            onClick={() => handleNav('home', 'how-it-works')}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg text-left text-sm font-medium text-text-primary hover:bg-bg-secondary transition-colors flex items-center justify-between cursor-pointer"
            aria-label="Product (How It Works)"
          >
            <span>Product</span>
            <span className="text-[11px] font-mono text-text-muted">How It Works</span>
          </button>
          <button
            type="button"
            onClick={() => handleNav('marketplace')}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg text-left text-sm font-medium text-text-primary hover:bg-bg-secondary transition-colors flex items-center justify-between"
          >
            <span>Templates</span>
          </button>
          <button
            type="button"
            onClick={() => handleNav('pricing')}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg text-left text-sm font-medium text-text-primary hover:bg-bg-secondary transition-colors flex items-center justify-between"
          >
            <span>Pricing</span>
          </button>
          {developerMode && (
            <button
              type="button"
              onClick={() => handleNav('developer')}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg text-left text-sm font-medium text-text-primary hover:bg-bg-secondary transition-colors flex items-center justify-between"
            >
              <span>Developer Mode</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              openGuide('page-guide');
            }}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg text-left text-sm font-medium text-text-primary hover:bg-bg-secondary transition-colors flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-brand-primary" />
              <span>PromptHub Guide (Pip)</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleNav('news')}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg text-left text-sm font-medium text-text-primary hover:bg-bg-secondary transition-colors flex items-center justify-between"
          >
            <span>AI News</span>
          </button>
          <button
            type="button"
            onClick={() => handleNav('community')}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg text-left text-sm font-medium text-text-primary hover:bg-bg-secondary transition-colors flex items-center justify-between"
          >
            <span>Community Prompts</span>
          </button>
          <button
            type="button"
            onClick={() => handleNav('legal')}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg text-left text-sm font-medium text-text-primary hover:bg-bg-secondary transition-colors flex items-center justify-between"
          >
            <span>Security &amp; Legal</span>
          </button>

          <div className="pt-3 border-t border-border-default flex flex-col gap-2">
            {!isLoggedIn ? (
              <button
                type="button"
                onClick={handleSignInClick}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-border-default text-text-primary text-sm font-semibold hover:bg-bg-secondary transition-colors text-center"
              >
                Sign In
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => handleNav('workspace')}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary-hi transition-colors text-center flex items-center justify-center gap-2"
            >
              <span>Open Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicNavbar;
