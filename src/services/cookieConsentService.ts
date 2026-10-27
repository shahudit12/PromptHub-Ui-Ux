/**
 * src/services/cookieConsentService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Cookie & Local Storage Consent Management Service for PromptHub.
 * Adheres to DPDP Act 2023, MeitY DPDP Rules 2025, EU GDPR, and CCPA/CPRA.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface CookiePreferences {
  necessary: boolean;     // Always true (authentication, CSRF, CAPTCHA, theme)
  functional: boolean;    // IDE layout, preferred model, variable presets
  analytics: boolean;     // Error monitoring (Sentry), privacy-scrubbed telemetry (PostHog)
  marketing: boolean;     // Release updates, creator spotlight notifications
  timestamp: string;      // ISO timestamp of consent grant
  version: number;        // Consent version for compliance audits
}

const COOKIE_PREFS_KEY = 'prompthub_cookie_preferences_v1';
const COOKIE_EVENT_NAME = 'prompthub_cookie_consent_updated';

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  necessary: true,
  functional: true,
  analytics: true,
  marketing: false,
  timestamp: '',
  version: 1,
};

export const cookieConsentService = {
  /**
   * Check whether the user has already recorded cookie preferences
   */
  hasUserResponded(): boolean {
    try {
      if (typeof window === 'undefined') return true;
      const stored = localStorage.getItem(COOKIE_PREFS_KEY);
      return Boolean(stored);
    } catch {
      return true;
    }
  },

  /**
   * Get current cookie preferences
   */
  getPreferences(): CookiePreferences {
    try {
      if (typeof window === 'undefined') return DEFAULT_COOKIE_PREFERENCES;
      const stored = localStorage.getItem(COOKIE_PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_COOKIE_PREFERENCES,
          ...parsed,
          necessary: true, // Always locked to true
        };
      }
    } catch (err) {
      console.warn('[cookieConsentService] Failed to load preferences:', err);
    }
    return DEFAULT_COOKIE_PREFERENCES;
  },

  /**
   * Save customized cookie preferences
   */
  savePreferences(prefs: Partial<CookiePreferences>): CookiePreferences {
    const fullPrefs: CookiePreferences = {
      ...this.getPreferences(),
      ...prefs,
      necessary: true, // Strictly necessary cannot be disabled
      timestamp: new Date().toISOString(),
      version: 1,
    };

    try {
      localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(fullPrefs));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(COOKIE_EVENT_NAME, { detail: fullPrefs }));
      }
    } catch (err) {
      console.error('[cookieConsentService] Failed to save cookie preferences:', err);
    }

    return fullPrefs;
  },

  /**
   * Accept all cookie categories
   */
  acceptAll(): CookiePreferences {
    return this.savePreferences({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
  },

  /**
   * Reject non-essential cookies (only necessary remains enabled)
   */
  rejectNonEssential(): CookiePreferences {
    return this.savePreferences({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
  },

  /**
   * Subscribe to cookie consent updates
   */
  subscribe(callback: (prefs: CookiePreferences) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<CookiePreferences>;
      callback(customEvent.detail || this.getPreferences());
    };

    window.addEventListener(COOKIE_EVENT_NAME, handler);
    return () => {
      window.removeEventListener(COOKIE_EVENT_NAME, handler);
    };
  },
};
