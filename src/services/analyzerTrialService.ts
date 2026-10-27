/**
 * src/services/analyzerTrialService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hybrid Analyzer Trial Service — Server-authoritative with client UX smoothing.
 *
 * The server (/api/analyzer-trial) is the authoritative source for trial state.
 * Client-side sessionStorage is used ONLY for countdown display smoothing between server checks.
 * Cannot be bypassed by localStorage clearing, page refresh, or new tabs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const TRIAL_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const CLIENT_CACHE_KEY = 'ph_trial_cache'; // UX-only cache

export interface TrialState {
  isActive: boolean;
  isExpired: boolean;
  remainingMs: number;
  remainingSeconds: number;
  formattedTime: string;
  totalDurationSeconds: number;
  hasStarted: boolean;
  executionCount: number;
  isServerVerified: boolean;
}

interface ServerTrialResponse {
  success: boolean;
  allowed?: boolean;
  trial?: {
    hasStarted: boolean;
    isActive: boolean;
    isExpired: boolean;
    remainingMs: number;
    executionCount: number;
  };
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function readClientCache(): { startedAt: number; expiresAt: number; executionCount: number } | null {
  try {
    const raw = sessionStorage.getItem(CLIENT_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeClientCache(startedAt: number, executionCount: number): void {
  try {
    sessionStorage.setItem(
      CLIENT_CACHE_KEY,
      JSON.stringify({
        startedAt,
        expiresAt: startedAt + TRIAL_DURATION_MS,
        executionCount,
      })
    );
  } catch {}
}

async function fetchServerState(action: 'start' | 'execute' | 'check' = 'check'): Promise<ServerTrialResponse | null> {
  try {
    if (action === 'check') {
      const res = await fetch('/api/analyzer-trial', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return null;
      return await res.json();
    } else {
      const res = await fetch('/api/analyzer-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) return null;
      return await res.json();
    }
  } catch {
    return null; // Network error — caller decides; entitlement checks must fail closed.
  }
}

export const analyzerTrialService = {
  /**
   * Start or resume a trial. Checks server, falls back to client cache for UX.
   */
  async getOrStartTrialAsync(): Promise<TrialState> {
    const serverState = await fetchServerState('start');

    if (serverState?.success && serverState.trial) {
      const { trial } = serverState;
      writeClientCache(Date.now() - (TRIAL_DURATION_MS - trial.remainingMs), trial.executionCount);
      return {
        isActive: trial.isActive,
        isExpired: trial.isExpired,
        remainingMs: trial.remainingMs,
        remainingSeconds: Math.floor(trial.remainingMs / 1000),
        formattedTime: formatTime(trial.remainingMs),
        totalDurationSeconds: TRIAL_DURATION_MS / 1000,
        hasStarted: trial.hasStarted,
        executionCount: trial.executionCount,
        isServerVerified: true,
      };
    }

    // Server unreachable — use client cache for UX continuity
    const cache = readClientCache();
    if (cache) {
      const remaining = Math.max(0, cache.expiresAt - Date.now());
      return {
        isActive: remaining > 0,
        isExpired: remaining <= 0,
        remainingMs: remaining,
        remainingSeconds: Math.floor(remaining / 1000),
        formattedTime: formatTime(remaining),
        totalDurationSeconds: TRIAL_DURATION_MS / 1000,
        hasStarted: true,
        executionCount: cache.executionCount,
        isServerVerified: false,
      };
    }

    return {
      isActive: true,
      isExpired: false,
      remainingMs: TRIAL_DURATION_MS,
      remainingSeconds: TRIAL_DURATION_MS / 1000,
      formattedTime: '05:00',
      totalDurationSeconds: TRIAL_DURATION_MS / 1000,
      hasStarted: false,
      executionCount: 0,
      isServerVerified: false,
    };
  },

  /**
   * Synchronous getter for immediate UI rendering (reads client cache).
   */
  getOrStartTrial(): TrialState {
    const cache = readClientCache();
    if (cache) {
      const remaining = Math.max(0, cache.expiresAt - Date.now());
      return {
        isActive: remaining > 0,
        isExpired: remaining <= 0,
        remainingMs: remaining,
        remainingSeconds: Math.floor(remaining / 1000),
        formattedTime: formatTime(remaining),
        totalDurationSeconds: TRIAL_DURATION_MS / 1000,
        hasStarted: true,
        executionCount: cache.executionCount,
        isServerVerified: false,
      };
    }

    // Auto-init trial cache
    const now = Date.now();
    writeClientCache(now, 0);
    // Background ping to server to register trial
    fetchServerState('start').catch(() => {});

    return {
      isActive: true,
      isExpired: false,
      remainingMs: TRIAL_DURATION_MS,
      remainingSeconds: TRIAL_DURATION_MS / 1000,
      formattedTime: '05:00',
      totalDurationSeconds: TRIAL_DURATION_MS / 1000,
      hasStarted: true,
      executionCount: 0,
      isServerVerified: false,
    };
  },

  /**
   * Check if guest can execute an analysis. SERVER-AUTHORITATIVE, FAIL CLOSED.
   *
   * The previous version returned `true` when the server could not be reached,
   * and otherwise consulted `sessionStorage`. Both are wrong for an entitlement
   * check: sessionStorage is controlled by the visitor (clearing it minted a new
   * allowance) and an unreachable server is an unknown answer, not a yes. Only
   * an explicit server `allowed: true` grants a run.
   */
  async canGuestAnalyze(): Promise<boolean> {
    const serverState = await fetchServerState('execute');
    return serverState?.success === true && serverState.allowed === true;
  },

  /**
   * Reset client cache only (testing/demo — server state persists).
   */
  resetTrial(): void {
    try {
      sessionStorage.removeItem(CLIENT_CACHE_KEY);
      localStorage.removeItem('ph_analyzer_trial_start_time');
      localStorage.removeItem('ph_analyzer_trial_expired');
    } catch {}
  },
};