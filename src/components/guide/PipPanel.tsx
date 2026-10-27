/**
 * PromptHub Product Help & Assistant Panel (Pip)
 * 
 * 3-Choice Unified Support Center:
 * 1. Guided Tutorial ('tutorials'):
 *    - Contextual "Guide me through this page" 1-click walkthrough matching active route
 *    - Catalog of all real application walkthroughs
 * 2. Ask AI ('ask'):
 *    - Grounded Q&A conversation powered by verified documentation (GUIDE_KNOWLEDGE_BASE)
 *    - Instant local semantic matching (<15ms) with citation chips across all 30 features
 * 3. Contact Support & Live Tickets ('support'):
 *    - WhatsApp / Intercom-style real-time chat with PromptHub administrators
 *    - Direct ticket creation with diagnostic metadata
 *    - Two-way messaging with live synchronization
 */

import React, { useState, useEffect, useRef } from 'react';
import { useGuide } from '../../context/GuideContext';
import { useApp } from '../../context/AppContext';
import { PipCharacter } from './PipCharacter';
import { guideAnsweringService, type GuideAnswer } from '../../services/guide/guideAnsweringService';
import { TOURS } from '../../services/guide/tourService';
import { showIntercomNewMessage } from '../../lib/intercom';
import {
  X,
  Minus,
  Search,
  Sparkles,
  HelpCircle,
  Headphones,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Play,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { motion } from 'framer-motion';

export const PipPanel: React.FC = () => {
  const {
    isGuideOpen,
    activePanelTab,
    activeMood,
    closeGuide,
    minimizeLauncher,
    setActivePanelTab,
    setActiveMood,
    startTour,
    startPageTutorial,
    getTutorialForActivePage,
    selectedArticle,
    selectArticle,
  } = useGuide();

  const { activeTab: currentAppTab, setActiveTab: setAppTab, user, showToast } = useApp();

  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize panel tab to the 3 main modes: 'tutorials' | 'ask' | 'support'
  const currentTabMode = ((): 'tutorials' | 'ask' | 'support' => {
    if (activePanelTab === 'support') return 'support';
    if (activePanelTab === 'ask') return 'ask';
    return 'tutorials';
  })();

  // ─── Mode B: Ask AI State ────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState<GuideAnswer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'yes' | 'no' | null>(null);

  const [copiedEmail, setCopiedEmail] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isGuideOpen) {
        closeGuide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGuideOpen, closeGuide]);

  // Click outside listener: close guide when clicking outside panel and launcher
  useEffect(() => {
    if (!isGuideOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore clicks inside the panel itself
      if (panelRef.current && panelRef.current.contains(target)) {
        return;
      }

      // Ignore clicks on the launcher toggle button (it handles its own toggle)
      if (target.closest && target.closest('[data-guide-launcher]')) {
        return;
      }

      closeGuide();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isGuideOpen, closeGuide]);

  // Focus search input when Ask AI tab is opened
  useEffect(() => {
    if (isGuideOpen && currentTabMode === 'ask') {
      setTimeout(() => searchInputRef.current?.focus(), 120);
    }
  }, [isGuideOpen, currentTabMode]);

  // Handle Q&A submit
  const handleAskQuestion = async (textToAsk: string) => {
    if (!textToAsk.trim()) return;
    setIsSearching(true);
    setActiveMood('thinking');
    setFeedbackGiven(null);

    const answer = await guideAnsweringService.answerQuestion(textToAsk, {
      currentRoute: currentAppTab,
    });

    setCurrentAnswer(answer);
    setIsSearching(false);
    setActiveMood(answer.isGrounded ? 'idle' : 'attentive');
  };

  // Copy email helper
  const handleCopySupportEmail = () => {
    navigator.clipboard.writeText('prompthub.cloud@gmail.com');
    setCopiedEmail(true);
    showToast('Support email copied to clipboard!', 'success');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const activePageTutorial = getTutorialForActivePage();
  const hasBottomStudioBar = currentAppTab === 'workspace' || currentAppTab === 'developer' || currentAppTab === 'classic-studio' || currentAppTab === 'work';
  const panelMaxHeightClass = hasBottomStudioBar
    ? 'max-h-[min(480px,calc(100dvh-10.5rem))]'
    : 'max-h-[min(480px,calc(100dvh-7rem))]';

  if (!isGuideOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="PromptHub Product Guide & Support Center"
      className={`fixed z-50 pointer-events-auto flex flex-col justify-end transition-all duration-200 bottom-3 left-3 right-3 sm:left-auto sm:right-6 ${
        hasBottomStudioBar
          ? 'sm:bottom-[10rem] md:bottom-[9rem]'
          : 'sm:bottom-[9rem] md:bottom-[5.5rem]'
      }`}
    >
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs sm:hidden z-0"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          closeGuide();
        }}
        aria-hidden="true"
      />

      {/* Main Panel Surface */}
      <motion.div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className={`relative z-10 w-full sm:w-[380px] max-w-full sm:max-w-[390px] h-[72vh] sm:h-[480px] ${panelMaxHeightClass} rounded-2xl bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#1C2B3A] shadow-2xl flex flex-col overflow-hidden text-left font-sans select-text`}
      >
        {/* ─── Header: Assistant Mark & Dismiss ─── */}
        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-100 dark:border-[#1C2B3A] bg-slate-50/80 dark:bg-[#000000] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#1C2B3A] flex items-center justify-center shadow-xs shrink-0">
              <PipCharacter size={26} mood={activeMood} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  PromptHub Help
                </h2>
                <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-[#131D27] text-brand-primary dark:text-[#41A2D9] text-[9.5px] font-mono font-semibold border border-blue-200/80 dark:border-[#1C2B3A]">
                  Assistant
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-[#7E97AD] truncate">
                Interactive guides, tutorials &amp; instant answers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={minimizeLauncher}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#131D27] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Minimize to edge tab"
              aria-label="Minimize to edge tab"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={closeGuide}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#131D27] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Close help center"
              aria-label="Close help center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── 3 Clear Top Choices: Guided Tutorials | Ask AI | Contact Support ─── */}
        <div className="flex items-center border-b border-slate-100 dark:border-[#1C2B3A] bg-slate-50/50 dark:bg-[#0B1118] p-1 sm:p-1.5 gap-1 shrink-0">
          {[
            { id: 'tutorials' as const, label: 'Guided Tutorials', icon: Sparkles },
            { id: 'ask' as const, label: 'Ask AI', icon: HelpCircle },
            { id: 'support' as const, label: 'Contact Support', icon: Headphones },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = currentTabMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActivePanelTab(tab.id);
                  selectArticle(null);
                }}
                className={`flex-1 min-h-[44px] px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap relative ${
                  isSelected
                    ? 'bg-brand-primary text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-[#7E97AD] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#131D27]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── Panel Content Body ─── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-3.5 space-y-3">
          {/* ARTICLE DETAIL VIEW (If user clicked an article from AI answer) */}
          {selectedArticle ? (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => selectArticle(null)}
                className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1 min-h-[44px] cursor-pointer"
              >
                ← Back to results
              </button>

              <div className="rounded-xl p-3 sm:p-3.5 bg-slate-50 dark:bg-[#1A242E] border border-slate-200/80 dark:border-[#1C2B3A] space-y-2.5">
                <span className="inline-block px-2 py-0.5 rounded-full text-[9.5px] font-mono font-semibold uppercase bg-blue-100 dark:bg-[#131D27] text-brand-primary dark:text-[#41A2D9]">
                  {selectedArticle.category}
                </span>

                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {selectedArticle.title}
                </h3>

                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-[#C5D7E8] leading-relaxed">
                  {selectedArticle.summary}
                </p>

                {selectedArticle.steps.length > 0 && (
                  <div className="space-y-1 pt-1.5">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-[#C5D7E8] uppercase tracking-wider font-mono">
                      Steps to execute:
                    </span>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600 dark:text-[#C5D7E8]">
                      {selectedArticle.steps.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {selectedArticle.costNote && (
                  <div className="p-2 rounded-lg bg-blue-50/50 dark:bg-[#0B1118] border border-blue-200/60 dark:border-[#1C2B3A] text-[11px] text-brand-primary dark:text-[#41A2D9]">
                    <strong>Cost Note:</strong> {selectedArticle.costNote}
                  </div>
                )}

                {/* Direct Action Link */}
                <button
                  type="button"
                  onClick={() => {
                    setAppTab(selectedArticle.route);
                    if (selectedArticle.tourId) {
                      startTour(selectedArticle.tourId);
                    }
                    closeGuide();
                  }}
                  className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>Open {selectedArticle.route}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ───────────────────────────────────────────────────────────── */}
              {/* ─── CHOICE A: GUIDED TUTORIAL ─────────────────────────────── */}
              {/* ───────────────────────────────────────────────────────────── */}
              {currentTabMode === 'tutorials' && (
                <div className="space-y-3">
                  {/* Contextual Active Page Walkthrough */}
                  {activePageTutorial && (
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 via-brand-primary/5 to-transparent border border-brand-primary/30 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-brand-primary dark:text-[#41A2D9]">
                        <span className="font-semibold">&gt;_ ACTIVE: {currentAppTab.toUpperCase()}</span>
                        <span>{activePageTutorial.steps.length} Steps</span>
                      </div>

                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {activePageTutorial.title}
                        </h3>
                        <p className="text-[11px] text-slate-600 dark:text-[#C5D7E8] mt-0.5 leading-snug">
                          {activePageTutorial.subtitle}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          startPageTutorial();
                          closeGuide();
                        }}
                        className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-brand-primary hover:bg-blue-700 dark:bg-[#41A2D9] dark:hover:bg-[#64B6E3] text-white dark:text-[#000000] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Guide me through this page</span>
                      </button>
                    </div>
                  )}

                  {/* Catalog of Walkthroughs */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-slate-400 dark:text-[#7E97AD] uppercase tracking-wider px-1">
                      <span>All Walkthroughs ({Object.keys(TOURS).length})</span>
                      <span>0 Credits</span>
                    </div>

                    <div className="space-y-1.5">
                      {Object.values(TOURS).map(tour => {
                        const isCurrentPage = tour.route === currentAppTab;
                        return (
                          <div
                            key={tour.id}
                            className={`p-2.5 rounded-lg border transition-all text-left flex items-center justify-between gap-2.5 ${
                              isCurrentPage
                                ? 'bg-blue-50/50 dark:bg-[#1A242E] border-brand-primary/40 shadow-xs'
                                : 'bg-slate-50 dark:bg-[#0B1118] border-slate-200/80 dark:border-[#1C2B3A] hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {tour.title}
                                </h4>
                                {isCurrentPage && (
                                  <span className="px-1.5 py-0.2 rounded text-[8.5px] font-mono uppercase font-bold bg-brand-primary text-white">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-[10.5px] text-slate-500 dark:text-[#7E97AD] line-clamp-1 mt-0.5">
                                {tour.subtitle}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setAppTab(tour.route);
                                startTour(tour.id);
                                closeGuide();
                              }}
                              className="min-h-[44px] px-2.5 py-1 rounded-lg bg-white dark:bg-[#1A242E] hover:bg-slate-100 dark:hover:bg-[#131D27] border border-slate-200 dark:border-[#1C2B3A] text-xs font-semibold text-slate-800 dark:text-white hover:text-brand-primary transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                            >
                              <span>Start</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* ─── CHOICE B: ASK AI (Instant Grounded Q&A) ───────────────── */}
              {/* ───────────────────────────────────────────────────────────── */}
              {currentTabMode === 'ask' && (
                <div className="space-y-3.5">
                  {/* Search / Question Composer */}
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleAskQuestion(query);
                    }}
                    className="relative"
                  >
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Ask anything: variables, arena, BYOK keys, storage..."
                      className="w-full min-h-[44px] pl-9 pr-9 py-2 rounded-xl bg-bg-secondary border border-border-default focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-xs text-text-primary placeholder-text-muted outline-hidden transition-all font-sans"
                    />
                    <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {query && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('');
                          setCurrentAnswer(null);
                        }}
                        className="p-1.5 rounded-md text-text-muted hover:text-text-primary absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Clear inquiry"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </form>

                  {/* Common Question Quick Chips */}
                  {!currentAnswer && !query && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider font-mono">
                        Common Topics
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'How do dynamic variables work?',
                          'Where are BYOK keys stored?',
                          'How does Model Arena compare LLMs?',
                          'How do I backup to Google Drive?',
                          'Do subscription credits expire?',
                          'What is the team member limit?',
                          'How is prompt quality score calculated?',
                        ].map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setQuery(q);
                              handleAskQuestion(q);
                            }}
                            className="min-h-[44px] px-3 py-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-[11px] text-text-primary hover:text-brand-primary transition-colors cursor-pointer text-left"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loading State */}
                  {isSearching && (
                    <div className="p-5 rounded-xl bg-bg-secondary border border-border-default text-center space-y-2">
                      <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-text-muted font-mono">
                        Consulting verified documentation...
                      </p>
                    </div>
                  )}

                  {/* Answer Presentation */}
                  {currentAnswer && !isSearching && (
                    <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default space-y-3 shadow-3xs">
                      {/* Header with verified status */}
                      <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
                        <div className="flex items-center gap-1.5">
                          {currentAnswer.isGrounded ? (
                            <>
                              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span className="text-xs font-bold text-text-primary font-sans">
                                Verified Documentation
                              </span>
                            </>
                          ) : (
                            <>
                              <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
                              <span className="text-xs font-bold text-text-primary font-sans">
                                Guide Advisory
                              </span>
                            </>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium border ${
                            currentAnswer.isGrounded
                              ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                              : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                          }`}
                        >
                          {currentAnswer.isGrounded ? 'Grounded' : 'Advisory'}
                        </span>
                      </div>

                      {/* Answer Body */}
                      <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap font-sans">
                        {currentAnswer.text}
                      </div>

                      {/* Source Citations */}
                      {currentAnswer.sourceArticles.length > 0 && (
                        <div className="pt-2.5 border-t border-border-subtle space-y-1.5">
                          <span className="text-[10px] font-mono uppercase text-text-muted font-semibold block">
                            Documented Sources:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {currentAnswer.sourceArticles.map(art => (
                              <button
                                key={art.id}
                                type="button"
                                onClick={() => selectArticle(art)}
                                className="text-[11px] px-2.5 py-1.5 min-h-[36px] rounded-lg bg-bg-tertiary border border-border-default text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span className="truncate max-w-[220px]">{art.title}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fallback support CTA when ungrounded */}
                      {!currentAnswer.isGrounded && (
                        <div className="pt-2.5 border-t border-border-subtle flex items-center justify-between gap-2">
                          <span className="text-[11px] text-text-muted">Need personal assistance?</span>
                          <button
                            type="button"
                            onClick={() => {
                              closeGuide();
                              showIntercomNewMessage();
                            }}
                            className="min-h-[44px] px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-3xs transition-colors"
                          >
                            <Headphones className="w-3.5 h-3.5" />
                            <span>Ask Fin Support</span>
                          </button>
                        </div>
                      )}

                      {/* Footer Actions: Ask Another & Feedback */}
                      <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
                        <button
                          type="button"
                          onClick={() => {
                            setQuery('');
                            setCurrentAnswer(null);
                            setTimeout(() => searchInputRef.current?.focus(), 80);
                          }}
                          className="min-h-[44px] inline-flex items-center gap-1 text-[11px] text-brand-primary hover:underline cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Ask another question</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <span className="text-[10px] mr-1">Helpful?</span>
                          <button
                            type="button"
                            onClick={() => setFeedbackGiven('yes')}
                            className={`p-1.5 rounded-lg border min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors ${
                              feedbackGiven === 'yes'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                : 'border-border-default text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                            }`}
                            aria-label="Helpful"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFeedbackGiven('no')}
                            className={`p-1.5 rounded-lg border min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors ${
                              feedbackGiven === 'no'
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                : 'border-border-default text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                            }`}
                            aria-label="Not helpful"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* ─── CHOICE C: FIN 24/7 CUSTOMER SUPPORT AGENT ─────────────── */}
              {/* ───────────────────────────────────────────────────────────── */}
              {currentTabMode === 'support' && (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#131D27] border border-slate-200 dark:border-[#1C2B3A] text-center space-y-3.5 shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center mx-auto shadow-xs">
                      <Headphones className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                        Fin 24/7 AI Customer Support
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-[#7E97AD] leading-relaxed">
                        PromptHub customer support is officially powered by Fin (Intercom). Start a live conversation for immediate assistance with credit recharges, billing, Pro plans, or technical questions.
                      </p>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          closeGuide();
                          showIntercomNewMessage('Hi Fin, I need assistance with PromptHub: ');
                        }}
                        className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Chat with Fin Support</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 dark:text-[#7E97AD] font-mono pt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live 24/7 &bull; Instant Response &bull; Intercom Verified</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-secondary space-y-1.5">
                    <span className="font-semibold text-brand-primary dark:text-[#41A2D9] block text-[11px] font-mono uppercase">
                      Direct Email &amp; Compliance Inquiries
                    </span>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      For enterprise billing contracts, data privacy, or creator payout verification:
                    </p>
                    <div className="flex flex-col gap-1 pt-0.5">
                      <a
                        href="mailto:support@prompthub.cloud"
                        className="text-xs font-mono font-semibold text-brand-primary hover:underline inline-block"
                      >
                        support@prompthub.cloud
                      </a>
                      <div className="flex items-center justify-between">
                        <a
                          href="mailto:prompthub.cloud@gmail.com"
                          className="text-[11px] font-mono text-text-muted hover:underline inline-block"
                        >
                          prompthub.cloud@gmail.com
                        </a>
                        <button
                          type="button"
                          onClick={handleCopySupportEmail}
                          className="text-[10px] font-mono text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedEmail ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* System Diagnostics Snapshot */}
                  <details className="p-3 rounded-xl bg-bg-secondary border border-border-default text-xs text-text-secondary group">
                    <summary className="font-semibold text-text-primary text-[11px] font-mono uppercase cursor-pointer flex items-center justify-between list-none">
                      <span>System Diagnostics Snapshot</span>
                      <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="mt-2 pt-2 border-t border-border-default/60 space-y-1 font-mono text-[10.5px] text-text-muted">
                      <div>Active View: <span className="text-text-primary">{currentAppTab}</span></div>
                      <div>User Session: <span className="text-text-primary">{user?.id ? 'Authenticated' : 'Guest'}</span></div>
                      <div>Support Engine: <span className="text-brand-primary">Fin AI Agent (Intercom v2.4)</span></div>
                    </div>
                  </details>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── Footer: Status & Response Guarantee ─── */}
        <div className="px-3 py-2 border-t border-slate-100 dark:border-[#1C2B3A] bg-slate-50/60 dark:bg-[#000000] flex items-center justify-between text-[10px] text-slate-500 dark:text-[#7E97AD] shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Assistant Ready · 0 Credits</span>
          </div>
          <span className="font-mono text-[9.5px]">Shift + ? to toggle</span>
        </div>
      </motion.div>
    </div>
  );
};

export default PipPanel;
