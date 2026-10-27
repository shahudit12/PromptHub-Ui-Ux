/**
 * PromptHub Guide Context
 * 
 * Global state management for Pip, the 3D product assistant:
 * - Floating launcher controls & minimization
 * - Panel visibility & tab navigation
 * - Step-by-step tour execution & spotlight tracking
 * - First-visit invitation state persistence
 * - Contextual page guidance
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TOURS, tourService, type TourDefinition, type TourStep } from '../services/guide/tourService';
import type { KnowledgeBaseArticle } from '../data/guideKnowledgeBase';
import type { PipMood } from '../components/guide/PipCharacterFallback';
import { useApp } from './AppContext';

const STORAGE_FIRST_VISIT = 'ph_pip_first_visit_dismissed';
const STORAGE_LAUNCHER_MINIMIZED = 'ph_pip_launcher_minimized';

export type GuidePanelTab = 'tutorials' | 'ask' | 'support' | 'tour' | 'page-guide';

interface GuideContextType {
  // Panel & Launcher state
  isGuideOpen: boolean;
  isLauncherMinimized: boolean;
  activePanelTab: GuidePanelTab;
  activeMood: PipMood;

  // Tour execution state
  activeTour: TourDefinition | null;
  currentStepIndex: number;
  currentStep: TourStep | null;
  isFirstVisitBannerVisible: boolean;

  // Knowledge base & Search state
  selectedArticle: KnowledgeBaseArticle | null;
  searchQuery: string;

  // Actions
  openGuide: (tab?: GuidePanelTab) => void;
  closeGuide: () => void;
  toggleGuide: () => void;
  minimizeLauncher: () => void;
  restoreLauncher: () => void;
  setActivePanelTab: (tab: GuidePanelTab) => void;
  setActiveMood: (mood: PipMood) => void;

  // Tour actions
  startTour: (tourId: string) => void;
  startPageTutorial: () => void;
  getTutorialForActivePage: () => TourDefinition | null;
  nextTourStep: () => void;
  prevTourStep: () => void;
  exitTour: () => void;
  dismissFirstVisit: () => void;

  // Search & Article actions
  selectArticle: (article: KnowledgeBaseArticle | null) => void;
  setSearchQuery: (query: string) => void;
}

const GuideContext = createContext<GuideContextType | undefined>(undefined);

export const GuideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeTab: currentAppTab, setActiveTab: setAppTab } = useApp();

  const [isGuideOpen, setIsGuideOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('guide') === 'open') return true;
    }
    return false;
  });
  const [isLauncherMinimized, setIsLauncherMinimized] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_LAUNCHER_MINIMIZED) === 'true';
    } catch {
      return false;
    }
  });

  const [activePanelTab, setActivePanelTab] = useState<GuidePanelTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('guideTab');
      if (tab === 'tutorials' || tab === 'ask' || tab === 'support') return tab as GuidePanelTab;
    }
    return 'tutorials';
  });
  const [activeMood, setActiveMood] = useState<PipMood>('idle');

  // Tour state
  const [activeTour, setActiveTour] = useState<TourDefinition | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // First-visit invitation state
  const [isFirstVisitBannerVisible, setIsFirstVisitBannerVisible] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_FIRST_VISIT) !== 'true';
    } catch {
      return true;
    }
  });

  // Selected article & search state
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Save launcher minimized state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LAUNCHER_MINIMIZED, String(isLauncherMinimized));
    } catch {}
  }, [isLauncherMinimized]);

  const openGuide = useCallback((tab?: GuidePanelTab) => {
    if (tab) setActivePanelTab(tab);
    setIsGuideOpen(true);
  }, []);

  const closeGuide = useCallback(() => {
    setIsGuideOpen(false);
  }, []);

  const toggleGuide = useCallback(() => {
    setIsGuideOpen(prev => !prev);
  }, []);

  // Synchronize assistant mood cleanly on guide open/close
  useEffect(() => {
    if (isGuideOpen) {
      setActiveMood('wave');
      const timer = setTimeout(() => setActiveMood('idle'), 1500);
      return () => clearTimeout(timer);
    } else {
      setActiveMood('idle');
    }
  }, [isGuideOpen]);

  // Global keyboard shortcut: Shift + ? to toggle Pip Guide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );
      if (isInput) return;

      if ((e.key === '?' && e.shiftKey) || (e.key === '?' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        toggleGuide();
      } else if (e.key === 'Escape' && isGuideOpen) {
        closeGuide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleGuide, closeGuide, isGuideOpen]);

  const minimizeLauncher = useCallback(() => {
    setIsLauncherMinimized(true);
    setIsGuideOpen(false);
  }, []);

  const restoreLauncher = useCallback(() => {
    setIsLauncherMinimized(false);
  }, []);

  // Tour controls
  const startTour = useCallback((tourId: string) => {
    const tour = TOURS[tourId];
    if (!tour) return;
    
    // Close panel so tour spotlight is visible
    setIsGuideOpen(false);
    setActiveTour(tour);
    setCurrentStepIndex(0);
    setActiveMood('idle');

    // Route to required page if needed
    const firstStep = tour.steps[0];
    if (firstStep && firstStep.requiredRoute !== currentAppTab) {
      setAppTab(firstStep.requiredRoute);
    }
  }, [currentAppTab, setAppTab]);

  const getTutorialForActivePage = useCallback((): TourDefinition | null => {
    return tourService.getTutorialForRoute(currentAppTab as any) || null;
  }, [currentAppTab]);

  const startPageTutorial = useCallback(() => {
    const tut = getTutorialForActivePage();
    if (tut) {
      startTour(tut.id);
    }
  }, [getTutorialForActivePage, startTour]);

  const nextTourStep = useCallback(() => {
    if (!activeTour) return;
    if (currentStepIndex < activeTour.steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      setActiveMood('celebrate');
      setTimeout(() => setActiveMood('idle'), 1200);

      const nextStep = activeTour.steps[nextIdx];
      if (nextStep && nextStep.requiredRoute !== currentAppTab) {
        setAppTab(nextStep.requiredRoute);
      }
    } else {
      // Completed all steps
      setActiveMood('celebrate');
      setTimeout(() => {
        setActiveTour(null);
        setCurrentStepIndex(0);
        setActiveMood('idle');
      }, 1500);
    }
  }, [activeTour, currentStepIndex, currentAppTab, setAppTab]);

  const prevTourStep = useCallback(() => {
    if (!activeTour || currentStepIndex === 0) return;
    const prevIdx = currentStepIndex - 1;
    setCurrentStepIndex(prevIdx);
    const prevStep = activeTour.steps[prevIdx];
    if (prevStep && prevStep.requiredRoute !== currentAppTab) {
      setAppTab(prevStep.requiredRoute);
    }
  }, [activeTour, currentStepIndex, currentAppTab, setAppTab]);

  const exitTour = useCallback(() => {
    setActiveTour(null);
    setCurrentStepIndex(0);
    setActiveMood('idle');
  }, []);

  const dismissFirstVisit = useCallback(() => {
    setIsFirstVisitBannerVisible(false);
    try {
      localStorage.setItem(STORAGE_FIRST_VISIT, 'true');
    } catch {}
  }, []);

  const currentStep = activeTour ? activeTour.steps[currentStepIndex] || null : null;

  return (
    <GuideContext.Provider
      value={{
        isGuideOpen,
        isLauncherMinimized,
        activePanelTab,
        activeMood,
        activeTour,
        currentStepIndex,
        currentStep,
        isFirstVisitBannerVisible,
        selectedArticle,
        searchQuery,
        openGuide,
        closeGuide,
        toggleGuide,
        minimizeLauncher,
        restoreLauncher,
        setActivePanelTab,
        setActiveMood,
        startTour,
        startPageTutorial,
        getTutorialForActivePage,
        nextTourStep,
        prevTourStep,
        exitTour,
        dismissFirstVisit,
        selectArticle: setSelectedArticle,
        setSearchQuery
      }}
    >
      {children}
    </GuideContext.Provider>
  );
};

export const useGuide = (): GuideContextType => {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error('useGuide must be used within a GuideProvider');
  }
  return context;
};
