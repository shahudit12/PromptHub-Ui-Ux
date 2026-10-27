import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X } from 'lucide-react';
import { cookieConsentService } from '../services/cookieConsentService';
import { useApp } from '../context/AppContext';

export const CookieConsentBanner: React.FC = () => {
  const { setActiveTab } = useApp();
  const [hasResponded, setHasResponded] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    // Check if user has already set cookie preferences
    const answered = cookieConsentService.hasUserResponded();
    setHasResponded(answered);
  }, []);

  const handleAcceptAll = () => {
    cookieConsentService.acceptAll();
    setHasResponded(true);
    setIsExpanded(false);
  };

  const handleRejectNonEssential = () => {
    cookieConsentService.rejectNonEssential();
    setHasResponded(true);
    setIsExpanded(false);
  };

  const handleCustomize = () => {
    setActiveTab('cookies' as any);
    setHasResponded(true);
    setIsExpanded(false);
  };

  // If already answered and not manually opened, render nothing to keep the screen completely clean
  if (hasResponded && !isExpanded) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-2 sm:left-4 z-[180] select-none text-left font-sans max-w-[calc(100vw-1rem)]">
      <AnimatePresence>
        {!isExpanded ? (
          /* Small compact pill button instead of large popup */
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-1.5 sm:gap-2 p-1.5 pl-2.5 sm:pl-3 bg-bg-secondary/95 backdrop-blur-md border border-border-default rounded-full shadow-lg text-xs"
          >
            <Cookie className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span className="text-[11px] font-medium text-text-primary hidden sm:inline">
              Cookie Preferences
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 px-3 py-1.5 rounded-full bg-surface-inverse hover:bg-surface-inverse-hi text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center"
                title="Accept Essential & Analytics Cookies"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 px-3 py-1.5 rounded-full bg-bg-tertiary hover:bg-border-subtle text-text-secondary text-[11px] font-medium transition-colors cursor-pointer border border-border-default flex items-center justify-center"
                title="Customize Details"
              >
                Options
              </button>
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-2 text-text-muted hover:text-text-primary transition-colors cursor-pointer rounded-full flex items-center justify-center"
                title="Dismiss"
                aria-label="Dismiss cookie notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          /* Expanded Options Sheet */
          <motion.aside
            aria-label="Cookie Preferences"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-80 sm:w-96 p-4 rounded-2xl bg-bg-secondary/95 backdrop-blur-md border border-border-default shadow-2xl space-y-3 text-text-primary"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cookie className="w-4 h-4 text-brand-primary" />
                <h4 className="text-xs font-bold text-text-primary">Cookie &amp; Privacy Choices</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-text-secondary leading-relaxed">
              PromptHub uses local storage to authenticate developer sessions and save prompt drafts. Zero cross-site tracking.
            </p>

            <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border-default">
              <button
                type="button"
                onClick={handleCustomize}
                className="px-2.5 py-1.5 rounded-lg border border-border-default bg-bg-tertiary text-text-secondary hover:text-text-primary text-[11px] font-medium transition-colors cursor-pointer"
              >
                Full Controls
              </button>
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="px-2.5 py-1.5 rounded-lg border border-border-default bg-bg-tertiary text-text-secondary hover:text-text-primary text-[11px] font-medium transition-colors cursor-pointer"
              >
                Essential Only
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-3 py-1.5 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
              >
                Accept All
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};
