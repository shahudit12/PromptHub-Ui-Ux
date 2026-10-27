import React, { createContext, useContext, useMemo } from 'react';
import type { TonePreference } from '../db/schema';

export interface ToneDictionary {
  // Action Buttons
  runPrompt: string;
  optimizePrompt: string;
  createPrompt: string;
  forkPrompt: string;
  savePrompt: string;
  sharePrompt: string;
  copyPrompt: string;
  copiedSuccess: string;
  testInArena: string;
  recharge: string;
  claimStreak: string;
  exportWorkspace: string;
  importWorkspace: string;
  clearAll: string;
  refresh: string;
  publish: string;

  // Navigation & Sections
  home: string;
  workspace: string;
  library: string;
  analyzer: string;
  marketplace: string;
  dashboard: string;
  news: string;
  promptDrops: string;
  leaderboard: string;
  teams: string;
  storage: string;
  credentials: string;
  community: string;
  settings: string;
  admin: string;

  // Badges & Labels
  securityBadge: string;
  freeBadge: string;
  premiumBadge: string;
  featuredBadge: string;
  trendingBadge: string;
  byokBadge: string;
  streakTitle: string;

  // Quality & Analyzer Verdicts
  scoreExcellent: string;
  scoreGood: string;
  scoreNeedsWork: string;
  scoreCritical: string;

  // Empty States
  emptyPrompts: string;
  emptyMarketplace: string;
  emptyHistory: string;
  emptyTasks: string;
  emptyNotifications: string;
  emptyNews: string;

  // Microcopy & Taglines
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
  welcomeBack: string;
  proTip: string;
  tagline: string;
}

export const TONE_DICTIONARIES: Record<TonePreference, ToneDictionary> = {
  professional: {
    // Actions
    runPrompt: 'Execute Prompt',
    optimizePrompt: 'Optimize Prompt',
    createPrompt: 'New Prompt',
    forkPrompt: 'Fork Prompt',
    savePrompt: 'Save Changes',
    sharePrompt: 'Publish Prompt',
    copyPrompt: 'Copy Prompt',
    copiedSuccess: 'Copied to clipboard',
    testInArena: 'Test in Arena',
    recharge: 'Top Up Wallet',
    claimStreak: 'Claim Reward',
    exportWorkspace: 'Export Workspace',
    importWorkspace: 'Import Backup',
    clearAll: 'Clear All',
    refresh: 'Refresh',
    publish: 'Publish to Marketplace',

    // Navigation
    home: 'Home',
    workspace: 'Prompt IDE',
    library: 'Prompt Library',
    analyzer: 'Prompt Analyzer',
    marketplace: 'Marketplace',
    dashboard: 'Studio Overview',
    news: 'AI News Hub',
    promptDrops: 'Prompt Drops',
    leaderboard: 'Leaderboard',
    teams: 'Teams Workspace',
    storage: 'Storage Vault',
    credentials: 'API Keys & BYOK',
    community: 'Community',
    settings: 'Settings',
    admin: 'Admin Console',

    // Badges
    securityBadge: 'Verified Secure',
    freeBadge: 'Free Tier',
    premiumBadge: 'Premium Model',
    featuredBadge: 'Featured',
    trendingBadge: 'Trending',
    byokBadge: 'BYOK • 0 Credits',
    streakTitle: 'Retention Streak',

    // Verdicts
    scoreExcellent: 'Production Grade (A+)',
    scoreGood: 'High Quality (B+)',
    scoreNeedsWork: 'Needs Refinement (C)',
    scoreCritical: 'Security Vulnerability Detected',

    // Empty States
    emptyPrompts: 'No prompts found in your repository.',
    emptyMarketplace: 'No matching marketplace listings found.',
    emptyHistory: 'No recent prompt execution history.',
    emptyTasks: 'No active team tasks scheduled.',
    emptyNotifications: 'You are all caught up.',
    emptyNews: 'No recent news articles published.',

    // Microcopy
    greetingMorning: 'Good morning, Engineer.',
    greetingAfternoon: 'Good afternoon, Engineer.',
    greetingEvening: 'Good evening, Engineer.',
    welcomeBack: 'Welcome back to PromptHub Studio.',
    proTip: 'Pro Tip:',
    tagline: 'The Professional AI Prompt Engineering Studio.',
  },
};

interface ToneContextType {
  tone: TonePreference;
  isGenZ: boolean;
  pendingToneSwitch: TonePreference | null;
  setTone: (tone: TonePreference) => void;
  requestToneSwitch: (tone: TonePreference) => void;
  confirmToneSwitch: () => void;
  cancelToneSwitch: () => void;
  copy: ToneDictionary;
  getNavLabel: (tabId: string, fallback: string) => string;
  getScoreVerdict: (score: number) => string;
}

const ToneContext = createContext<ToneContextType | undefined>(undefined);

export const ToneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Purge any lingering legacy Gen Z preference from client storage
  try {
    if (localStorage.getItem('prompthub_tone_preference')) {
      localStorage.removeItem('prompthub_tone_preference');
    }
  } catch {}

  const tone: TonePreference = 'professional';
  const isGenZ = false;
  const pendingToneSwitch: TonePreference | null = null;

  const requestToneSwitch = () => {};
  const confirmToneSwitch = () => {};
  const cancelToneSwitch = () => {};
  const setTone = () => {};

  const copy = useMemo(() => TONE_DICTIONARIES.professional, []);

  const getNavLabel = (_tabId: string, fallback: string): string => fallback;

  const getScoreVerdict = (score: number): string => {
    if (score >= 90) return copy.scoreExcellent;
    if (score >= 75) return copy.scoreGood;
    if (score >= 50) return copy.scoreNeedsWork;
    return copy.scoreCritical;
  };

  return (
    <ToneContext.Provider
      value={{
        tone,
        isGenZ,
        pendingToneSwitch,
        setTone,
        requestToneSwitch,
        confirmToneSwitch,
        cancelToneSwitch,
        copy,
        getNavLabel,
        getScoreVerdict,
      }}
    >
      {children}
    </ToneContext.Provider>
  );
};

export const useTone = (): ToneContextType => {
  const context = useContext(ToneContext);
  if (!context) {
    return {
      tone: 'professional',
      isGenZ: false,
      pendingToneSwitch: null,
      setTone: () => {},
      requestToneSwitch: () => {},
      confirmToneSwitch: () => {},
      cancelToneSwitch: () => {},
      copy: TONE_DICTIONARIES.professional,
      getNavLabel: (_tab, fallback) => fallback,
      getScoreVerdict: (score) => score >= 90 ? 'Production Grade (A+)' : score >= 75 ? 'High Quality' : 'Needs Refinement',
    };
  }
  return context;
};