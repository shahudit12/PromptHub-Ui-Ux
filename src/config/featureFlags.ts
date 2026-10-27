/**
 * src/config/featureFlags.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized, Type-Safe Feature Flag System for PromptHub.
 *
 * Controls rollout and graceful degradation of optional integrations:
 * - Sentry Observability
 * - Mixpanel Product Analytics
 * - Sarvam AI (Indian Language Speech & Translation)
 * - Deepgram (Global Speech & Audio Intelligence)
 * - Mux (Video Walkthroughs & Playback)
 *
 * Supports environment variable controls, query-string overrides (qa testing),
 * and localStorage overrides for developer sandboxes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface PromptHubFeatureFlags {
  sentry: boolean;
  mixpanel: boolean;
  sarvam: boolean;
  deepgram: boolean;
  mux: boolean;
}

const getFlagFromEnv = (key: string, defaultValue: boolean): boolean => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const val = import.meta.env[key];
    if (val === 'false' || val === '0') return false;
    if (val === 'true' || val === '1') return true;
  }
  return defaultValue;
};

const getLocalOverride = (flagName: string): boolean | null => {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const paramKey = `flag_${flagName}`;
    if (params.has(paramKey)) {
      return params.get(paramKey) !== 'false' && params.get(paramKey) !== '0';
    }
    const stored = localStorage.getItem(`ph_flag_${flagName}`);
    if (stored === 'false') return false;
    if (stored === 'true') return true;
  } catch {}
  return null;
};

export const featureFlags = {
  isSentryEnabled(): boolean {
    const override = getLocalOverride('sentry');
    if (override !== null) return override;
    return getFlagFromEnv('VITE_FEATURE_SENTRY', true);
  },

  isMixpanelEnabled(): boolean {
    const override = getLocalOverride('mixpanel');
    if (override !== null) return override;
    return getFlagFromEnv('VITE_FEATURE_MIXPANEL', true);
  },

  isSarvamEnabled(): boolean {
    const override = getLocalOverride('sarvam');
    if (override !== null) return override;
    return getFlagFromEnv('VITE_FEATURE_SARVAM', true);
  },

  isDeepgramEnabled(): boolean {
    const override = getLocalOverride('deepgram');
    if (override !== null) return override;
    return getFlagFromEnv('VITE_FEATURE_DEEPGRAM', true);
  },

  isMuxEnabled(): boolean {
    const override = getLocalOverride('mux');
    if (override !== null) return override;
    return getFlagFromEnv('VITE_FEATURE_MUX', true);
  },

  getAllFlags(): PromptHubFeatureFlags {
    return {
      sentry: this.isSentryEnabled(),
      mixpanel: this.isMixpanelEnabled(),
      sarvam: this.isSarvamEnabled(),
      deepgram: this.isDeepgramEnabled(),
      mux: this.isMuxEnabled(),
    };
  },
};
