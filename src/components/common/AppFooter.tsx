import React from 'react';
import { useApp } from '../../context/AppContext';
import { PromptHubLogo } from '../PromptHubLogo';
import { 
  ShieldCheck, 
  Terminal, 
  Bug, 
  Coins 
} from 'lucide-react';
import { PromptCommunityIcon } from '../icons/PromptHubIcons';
import { scrollToTop } from '../../utils/scrollUtils';

export interface AppFooterProps {
  className?: string;
  showExtendedNavigation?: boolean;
}

export const AppFooter: React.FC<AppFooterProps> = ({
  className = '',
  showExtendedNavigation = true,
}) => {
  const { setActiveTab, setIsBugReportModalOpen } = useApp();

  return (
    <footer className={`w-full bg-bg-tertiary/80 border-t border-border-default text-text-secondary select-none ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {/* Top Grid: Brand & Categorical Columns */}
        {showExtendedNavigation && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-border-default/60">
            {/* Column 1: Brand Info & Live System Status */}
            <div className="lg:col-span-2 space-y-4 pr-0 lg:pr-6">
              <div 
                onClick={() => {
                  setActiveTab('home');
                  scrollToTop();
                }}
                className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity w-fit"
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
                <PromptHubLogo variant="full" size="sm" subtitle="AI WORKSPACE FOR WHAT'S NEXT" />
              </div>
              <p className="text-xs text-text-secondary leading-relaxed max-w-sm">
                Production-grade developer studio for prompt engineering, deterministic quality audits, multi-model arena benchmarking, and enterprise prompt versioning.
              </p>

              {/* Currency Pill */}
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-primary border border-border-default text-text-muted">
                  <Coins className="w-3 h-3 text-text-muted" />
                  <span>INR (₹) Standardized</span>
                </div>
              </div>
            </div>

            {/* Column 2: Workspace & Developer Suite */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-brand-primary" /> Creation & Tools
              </h4>
              <ul className="space-y-1 text-xs font-sans">
                <li>
                  <button
                    onClick={() => setActiveTab('workspace')}
                    className="hover:text-text-primary transition-colors cursor-pointer text-left py-1.5 min-h-[36px] flex items-center"
                  >
                    Creation Workspace
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('library')}
                    className="hover:text-text-primary transition-colors cursor-pointer text-left py-1.5 min-h-[36px] flex items-center"
                  >
                    Prompt Library
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('credentials')}
                    className="hover:text-text-primary transition-colors cursor-pointer text-left py-1.5 min-h-[36px] flex items-center"
                  >
                    API Credentials (BYOK)
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('developer')}
                    className="hover:text-text-primary transition-colors cursor-pointer text-left py-1.5 min-h-[36px] flex items-center"
                  >
                    Developer Mode Suite
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Ecosystem & Community */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-1.5">
                <PromptCommunityIcon size={14} variant="solid" className="text-brand-primary" /> Ecosystem
              </h4>
              <ul className="space-y-1 text-xs font-sans">
                <li>
                  <button
                    onClick={() => setActiveTab('community')}
                    className="hover:text-text-primary transition-colors cursor-pointer text-left py-1.5 min-h-[36px] flex items-center"
                  >
                    Community Showcase
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('marketplace')}
                    className="hover:text-text-primary transition-colors cursor-pointer text-left py-1.5 min-h-[36px] flex items-center"
                  >
                    Prompt Marketplace
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('leaderboard')}
                    className="hover:text-text-primary transition-colors cursor-pointer text-left py-1.5 min-h-[36px] flex items-center"
                  >
                    Creator Leaderboard
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('news')}
                    className="hover:text-text-primary transition-colors cursor-pointer text-left py-1.5 min-h-[36px] flex items-center"
                  >
                    Weekly AI Radar
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Trust & Developers */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" /> Trust & Legal
              </h4>
              <ul className="space-y-1 text-xs font-sans">
                <li>
                  <button
                    onClick={() => setActiveTab('terms')}
                    className="hover:text-text-primary transition-colors cursor-pointer text-left py-1.5 min-h-[36px] flex items-center"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('privacy')}
                    className="hover:text-text-primary transition-colors cursor-pointer text-left py-1.5 min-h-[36px] flex items-center"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('cookies' as any)}
                    className="hover:text-text-primary transition-colors cursor-pointer text-left py-1.5 min-h-[36px] flex items-center"
                  >
                    Cookie Preferences
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('credentials')}
                    className="hover:text-text-primary transition-colors cursor-pointer text-left py-1.5 min-h-[36px] flex items-center"
                  >
                    BYOK API Vault
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setIsBugReportModalOpen(true)}
                    className="hover:text-text-primary transition-colors cursor-pointer text-left py-1.5 min-h-[36px] flex items-center gap-1 text-emerald-800 dark:text-emerald-300 font-medium"
                  >
                    <Bug className="w-3 h-3" /> Report a Bug
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Bottom Bar: Copyright & Strict Disclaimer */}
        <div className="pt-8 space-y-4 text-xs text-text-muted">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span>&copy; {new Date().getFullYear()} PromptHub.</span>
              <span>All rights reserved.</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <button
                onClick={() => setActiveTab('pricing')}
                className="hover:text-text-primary transition-colors cursor-pointer py-1 min-h-[32px]"
              >
                Pricing
              </button>
              <button
                onClick={() => setActiveTab('support')}
                className="hover:text-text-primary transition-colors cursor-pointer py-1 min-h-[32px]"
              >
                Support
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className="hover:text-text-primary transition-colors cursor-pointer py-1 min-h-[32px]"
              >
                System Status
              </button>
              <button
                onClick={() => setActiveTab('legal')}
                className="hover:text-text-primary transition-colors cursor-pointer py-1 min-h-[32px]"
              >
                Legal Center
              </button>
            </div>
          </div>

          <p className="text-[10.5px] leading-relaxed text-text-muted/80 text-left pt-2 border-t border-border-default/40">
            PromptHub is an AI developer workbench provided strictly "AS IS" and "AS AVAILABLE". PromptHub, its creators, and operators bear ZERO LIABILITY under any legal theory. Users retain 100% exclusive responsibility and liability for all prompt inputs, attached assets, third-party API billing, AI model outputs, and statutory compliance.
          </p>
        </div>
      </div>
    </footer>
  );
};
