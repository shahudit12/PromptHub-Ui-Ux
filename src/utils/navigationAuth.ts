import type { TabType } from '../context/AppContext';

/**
 * Authoritative Route Authorization Configuration
 * Defines public vs authenticated vs role-protected views across PromptHub.
 */
export const PUBLIC_TABS: ReadonlySet<TabType> = new Set<TabType>([
  'home',
  'community',
  'explore',
  'models-guide',
  'models',
  'marketplace',
  'leaderboard',
  'pricing',
  'recharge',
  'wallet',
  'legal',
  'terms',
  'privacy',
  'cookies',
  'search',
  'team-accept',
  'auth',
  '404',
  'payment-failed',
  'access-denied',
  'maintenance',
  'support',
  'news',
  'pitch',
  'presentation',
]);

/**
 * Tabs requiring an authenticated user account
 */
export const PROTECTED_TABS: ReadonlySet<TabType> = new Set<TabType>([
  'work',          // PromptHub Work — Agentic Dev Platform
  'dashboard',     // Developer Dashboard
  'workspace',     // Prompt IDE & Multi-Model Arena
  // AI Prompt Analyzer. This sat in PUBLIC_TABS annotated "(Includes 5-Minute
  // Free Guest Trial)", which the product does not do: App.tsx wraps
  // AnalyzerView in <AuthGuard>, and AnalyzerView executes through
  // src/lib/openrouter.ts, which refuses callers without a session. The guest
  // trial that DOES exist is a separate, server-enforced path on the home page
  // (ai-analyze-trial + claim_anonymous_trial_lock) and is not this tab.
  // Listing it here is what makes the sidebar show the lock and remember the
  // destination so sign-in returns the visitor to the Analyzer.
  'analyzer',
  'agents',        // Autonomous AI Agents
  'library',       // Prompt Library
  'storage',       // Storage Vault
  'vault',         // Storage Vault
  'create-prompt', // Prompt Creator
  'collections',   // Collections
  'teams',         // Teams Workspace
  'credentials',   // API Keys & BYOK
  'settings',      // Account Settings
  'profile',       // User Profile
  'notifications', // Notification Center
]);

/**
 * Tabs requiring system administrator privileges
 */
export const ADMIN_TABS: ReadonlySet<TabType> = new Set<TabType>([
  'admin',         // Admin Console
]);

/**
 * Check if a tab is completely public (accessible without login)
 */
export const isTabPublic = (tab: string | TabType): boolean => {
  return PUBLIC_TABS.has(tab as TabType);
};

/**
 * Check if a tab strictly requires an authenticated session
 */
export const requiresAuthentication = (tab: string | TabType): boolean => {
  return PROTECTED_TABS.has(tab as TabType) || ADMIN_TABS.has(tab as TabType);
};

/**
 * Check if a tab should visually show a lock icon for the current user state
 */
export const isTabLockedForUser = (tab: string | TabType, isLoggedIn: boolean): boolean => {
  if (isLoggedIn) return false;
  return requiresAuthentication(tab);
};
