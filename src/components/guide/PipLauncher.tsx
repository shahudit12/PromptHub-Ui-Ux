/**
 * Pip — PromptHub Product Guide Launcher
 * 
 * Floating compact 3D robot button positioned at bottom-right.
 * Adheres strictly to touch target sizing (>=44px), safe-area insets,
 * mobile bottom navigation offset, minimize/restore controls, and accessible tooltips.
 */

import React, { useState } from 'react';
import { useGuide } from '../../context/GuideContext';

import { PipCharacter } from './PipCharacter';
import { ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PipLauncher: React.FC = () => {
  const {
    isGuideOpen,
    isLauncherMinimized,
    activeMood,
    toggleGuide,
    restoreLauncher,
    isFirstVisitBannerVisible,
    dismissFirstVisit,
    startTour,
  } = useGuide();


  const [isHovered, setIsHovered] = useState(false);

  // Floating Help launcher is removed from the bottom of ALL tabs because Fin Agent (Intercom Messenger) is exclusively positioned at bottom-right.
  // Help & Guides are accessible from the top navigation bar across all views.
  const isBottomLauncherHiddenOnAllTabs = true;
  if (isBottomLauncherHiddenOnAllTabs) {
    return null;
  }

  // When on workspace or developer studio with fixed bottom status bar, float higher to prevent overlapping controls
  const hasBottomStudioBar = false;

  // If minimized, render a discreet docked tab on the right edge
  if (isLauncherMinimized) {
    return (
      <div className={`fixed right-0 z-40 transition-all duration-200 ${
        hasBottomStudioBar ? 'bottom-24 md:bottom-20' : 'bottom-20 md:bottom-6'
      }`}>
        <button
          type="button"
          onClick={restoreLauncher}
          className="min-h-[44px] px-2.5 py-2 rounded-l-xl bg-white dark:bg-[#0B1118] border-y border-l border-slate-200 dark:border-[#1C2B3A] shadow-md text-xs font-semibold text-brand-primary dark:text-[#41A2D9] hover:text-blue-700 dark:hover:text-[#64B6E3] flex items-center gap-1.5 transition-all cursor-pointer group"
          aria-label="Restore Pip Guide assistant"
          title="Restore Pip Guide assistant"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <PipCharacter size={20} mood="idle" />
          </div>
          <span className="hidden sm:inline font-sans text-xs">Help</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed right-4 sm:right-6 z-[55] flex flex-col items-end pointer-events-none transition-all duration-200 ${
      hasBottomStudioBar ? 'bottom-24 md:bottom-20' : 'bottom-20 md:bottom-6'
    }`}>
      {/* ─── First-Visit Dismissible Invitation Card ─── */}
      <AnimatePresence>
        {isFirstVisitBannerVisible && !isGuideOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-3 max-w-xs sm:max-w-sm rounded-2xl bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#1C2B3A] shadow-xl p-4 text-left pointer-events-auto select-none"
            role="region"
            aria-label="New user guide invitation"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-brand-primary dark:text-[#41A2D9]">
                  Welcome to PromptHub
                </span>
              </div>
              <button
                type="button"
                onClick={dismissFirstVisit}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#131D27] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Dismiss guide invitation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-[#FFFFFF] mt-2 leading-snug">
              New here? I can help you create your first prompt.
            </p>
            <p className="text-xs text-slate-500 dark:text-[#7E97AD] mt-1 leading-relaxed">
              Take a short 5-step tour to master variables, models, and testing.
            </p>

            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-[#1C2B3A]">
              <button
                type="button"
                onClick={() => {
                  dismissFirstVisit();
                  startTour('intro-tour');
                }}
                className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-brand-primary hover:bg-blue-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Take a quick tour
              </button>
              <button
                type="button"
                onClick={dismissFirstVisit}
                className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 dark:text-[#7E97AD] hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Floating Launcher Target ─── */}
      <div data-guide-launcher="true" className="relative pointer-events-auto flex items-center gap-2">
        {/* Tooltip on hover */}
        <AnimatePresence>
          {isHovered && !isGuideOpen && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-[#000000] text-white border border-slate-800 dark:border-[#1C2B3A] shadow-lg text-xs font-medium whitespace-nowrap"
            >
              <span>Pip — PromptHub Guide</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 dark:bg-[#131D27] text-[10px] font-mono text-slate-300 dark:text-[#C5D7E8]">
                Shift + ?
              </kbd>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Launcher Button (52-56px with visible Help label) */}
        <button
          type="button"
          data-guide-launcher="true"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleGuide();
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-expanded={isGuideOpen}
          aria-label={isGuideOpen ? 'Close Help Guide' : 'Open Help Guide (Product Assistant)'}
          title={isGuideOpen ? 'Close Help Guide' : 'Open Help Guide'}
          className={`relative min-h-[52px] min-w-[52px] h-[52px] sm:h-[54px] sm:px-3.5 sm:py-1.5 rounded-full flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg active:scale-95 ${
            isGuideOpen
              ? 'bg-brand-primary text-white ring-4 ring-blue-500/20 shadow-blue-500/20'
              : 'bg-white dark:bg-[#0B1118] border border-slate-200/90 dark:border-[#1C2B3A] hover:border-brand-primary/60 dark:hover:border-[#41A2D9]/60 shadow-slate-900/10'
          }`}
        >
          {/* Compact 3D Robot Head */}
          <div className="w-9 h-9 sm:w-9 sm:h-9 flex items-center justify-center shrink-0 pointer-events-none">
            <PipCharacter
              size={34}
              mood={isGuideOpen ? 'celebrate' : isHovered ? 'hover' : activeMood}
            />
          </div>

          {/* Visible "Help" Label */}
          <span className={`text-xs font-bold tracking-tight pr-1 hidden sm:inline pointer-events-none ${
            isGuideOpen ? 'text-white' : 'text-slate-800 dark:text-[#FFFFFF]'
          }`}>
            Help
          </span>

          {/* Mobile Help Badge Indicator */}
          <span className="sm:hidden absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-brand-primary text-[9px] font-bold text-white shadow-2xs border border-white dark:border-[#0B1118] pointer-events-none">
            Help
          </span>
        </button>
      </div>
    </div>
  );
};

export default PipLauncher;
