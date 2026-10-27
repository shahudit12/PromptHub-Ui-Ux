import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { env } from '../../config/env';
import { logger } from '../../utils/logger';

// ─── Global Type Declarations for Window CAPTCHA SDKs ──────────────────────────
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (error: any) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
          action?: string;
          cData?: string;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
      execute: (widgetId?: string) => void;
    };
    hcaptcha?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (error: any) => void;
          'expired-callback'?: () => void;
          'chalexpired-callback'?: () => void;
          'close-callback'?: () => void;
          theme?: 'light' | 'dark';
          size?: 'normal' | 'compact' | 'invisible';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
      execute: (widgetId?: string) => void;
    };
    __ph_turnstile_loaded?: Promise<void>;
    __ph_hcaptcha_loaded?: Promise<void>;
  }
}

// ─── Crisp Vector hCaptcha Logo ────────────────────────────────────────────────
export const HCaptchaLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 482.3 482.3"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="301.5" y="422" width="60.3" height="60.3" fill="#1074BC" opacity="0.5" />
    <rect x="241.2" y="422" width="60.3" height="60.3" fill="#1074BC" opacity="0.7" />
    <rect x="180.9" y="422" width="60.3" height="60.3" fill="#1074BC" opacity="0.7" />
    <rect x="120.6" y="422" width="60.3" height="60.3" fill="#1074BC" opacity="0.5" />
    <rect x="361.8" y="361.8" width="60.3" height="60.3" fill="#0C82BF" opacity="0.7" />
    <rect x="301.5" y="361.8" width="60.3" height="60.3" fill="#0C82BF" opacity="0.8" />
    <rect x="241.2" y="361.8" width="60.3" height="60.3" fill="#0C82BF" />
    <rect x="180.9" y="361.8" width="60.3" height="60.3" fill="#0C82BF" />
    <rect x="120.6" y="361.8" width="60.3" height="60.3" fill="#0C82BF" opacity="0.8" />
    <rect x="60.3" y="361.8" width="60.3" height="60.3" fill="#0C82BF" opacity="0.7" />
    <rect x="422" y="301.5" width="60.3" height="60.3" fill="#048FBF" opacity="0.5" />
    <rect x="361.8" y="301.5" width="60.3" height="60.3" fill="#048FBF" opacity="0.8" />
    <rect x="301.5" y="301.5" width="60.3" height="60.3" fill="#048FBF" />
    <rect x="241.2" y="301.5" width="60.3" height="60.3" fill="#048FBF" />
    <rect x="180.9" y="301.5" width="60.3" height="60.3" fill="#048FBF" />
    <rect x="120.6" y="301.5" width="60.3" height="60.3" fill="#048FBF" />
    <rect x="60.3" y="301.5" width="60.3" height="60.3" fill="#048FBF" opacity="0.8" />
    <rect y="301.5" width="60.3" height="60.3" fill="#048FBF" opacity="0.5" />
    <rect x="422" y="241.2" width="60.3" height="60.3" fill="#019EC0" opacity="0.7" />
    <rect x="361.8" y="241.2" width="60.3" height="60.3" fill="#019EC0" />
    <rect x="301.5" y="241.2" width="60.3" height="60.3" fill="#019EC0" />
    <rect x="241.2" y="241.2" width="60.3" height="60.3" fill="#019EC0" />
    <rect x="180.9" y="241.2" width="60.3" height="60.3" fill="#019EC0" />
    <rect x="120.6" y="241.2" width="60.3" height="60.3" fill="#019EC0" />
    <rect x="60.3" y="241.2" width="60.3" height="60.3" fill="#019EC0" />
    <rect y="241.2" width="60.3" height="60.3" fill="#019EC0" opacity="0.7" />
    <rect x="422" y="180.9" width="60.3" height="60.3" fill="#00ABBF" opacity="0.7" />
    <rect x="361.8" y="180.9" width="60.3" height="60.3" fill="#00ABBF" />
    <rect x="301.5" y="180.9" width="60.3" height="60.3" fill="#00ABBF" />
    <rect x="241.2" y="180.9" width="60.3" height="60.3" fill="#00ABBF" />
    <rect x="180.9" y="180.9" width="60.3" height="60.3" fill="#00ABBF" />
    <rect x="120.6" y="180.9" width="60.3" height="60.3" fill="#00ABBF" />
    <rect x="60.3" y="180.9" width="60.3" height="60.3" fill="#00ABBF" />
    <rect y="180.9" width="60.3" height="60.3" fill="#00ABBF" opacity="0.7" />
    <rect x="422" y="120.6" width="60.3" height="60.3" fill="#02B8BE" opacity="0.5" />
    <rect x="361.8" y="120.6" width="60.3" height="60.3" fill="#02B8BE" opacity="0.8" />
    <rect x="301.5" y="120.6" width="60.3" height="60.3" fill="#02B8BE" />
    <rect x="241.2" y="120.6" width="60.3" height="60.3" fill="#02B8BE" />
    <rect x="180.9" y="120.6" width="60.3" height="60.3" fill="#02B8BE" />
    <rect x="120.6" y="120.6" width="60.3" height="60.3" fill="#02B8BE" />
    <rect x="60.3" y="120.6" width="60.3" height="60.3" fill="#02B8BE" opacity="0.8" />
    <rect y="120.6" width="60.3" height="60.3" fill="#02B8BE" opacity="0.5" />
    <rect x="361.8" y="60.3" width="60.3" height="60.3" fill="#31BDBA" opacity="0.7" />
    <rect x="301.5" y="60.3" width="60.3" height="60.3" fill="#31BDBA" opacity="0.8" />
    <rect x="241.2" y="60.3" width="60.3" height="60.3" fill="#31BDBA" />
    <rect x="180.9" y="60.3" width="60.3" height="60.3" fill="#31BDBA" />
    <rect x="120.6" y="60.3" width="60.3" height="60.3" fill="#31BDBA" opacity="0.8" />
    <rect x="60.3" y="60.3" width="60.3" height="60.3" fill="#31BDBA" opacity="0.7" />
    <rect x="301.5" width="60.3" height="60.3" fill="#47C0B4" opacity="0.5" />
    <rect x="241.2" width="60.3" height="60.3" fill="#47C0B4" opacity="0.7" />
    <rect x="180.9" width="60.3" height="60.3" fill="#47C0B4" opacity="0.7" />
    <rect x="120.6" width="60.3" height="60.3" fill="#47C0B4" opacity="0.5" />
    <path
      fill="#FFFFFF"
      d="M158.8 222.1l16.8-37.6c6.1-9.6 5.3-21.4-1.4-28.1-.9-.9-1.9-1.7-2.9-2.4-4.7-2.9-10.3-3.5-15.5-1.8-5.8 1.8-10.8 5.7-14 10.8 0 0-23 53.7-31.6 77.8S105 309.2 138 342.3c35 35 85.7 43 118 18.7 1.4-.7 2.6-1.5 3.8-2.5l99.6-83.2c4.8-4 12-12.2 5.6-21.6-6.3-9.2-18.1-2.9-23 .2l-57.3 41.7c-1.1.9-2.7.8-3.6-.3 0 0 0-.1-.1-.1-1.5-1.8-1.7-6.5.6-8.4l87.9-74.6c7.6-6.8 8.6-16.8 2.5-23.6-6-6.7-15.5-6.5-23.2.4l-79.1 61.9c-1.5 1.2-3.7 1-4.9-.5 0-.1-.1-.1-.1-.2-1.6-1.8-2.2-4.7-.4-6.5l89.6-86.9c7.1-6.6 7.5-17.7.9-24.7-3.2-3.3-7.6-5.2-12.2-5.2-4.7-.1-9.2 1.7-12.6 5l-91.6 86c-2.2 2.2-6.5 0-7-2.6-.2-.9.1-1.9.8-2.6l70.1-79.8c7-6.5 7.4-17.4.9-24.4s-17.4-7.4-24.4-.9c-.3.3-.6.5-.8.8L171.5 225.9c-3.8 3.8-9.4 4-12.1 1.8-1.7-1.3-2-3.8-.6-5.6z"
    />
  </svg>
);

// ─── Script Loading Singleton Helpers ─────────────────────────────────────────
function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (window.__ph_turnstile_loaded) return window.__ph_turnstile_loaded;

  window.__ph_turnstile_loaded = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
    if (existingScript) {
      if (window.turnstile) {
        resolve();
      } else {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', (e) => reject(e));
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => resolve();
    script.onerror = (err) => {
      logger.error('[CaptchaChallenge] Failed to load Cloudflare Turnstile script:', err);
      reject(new Error('Failed to load security verification challenge script.'));
    };

    document.head.appendChild(script);
  });

  return window.__ph_turnstile_loaded;
}

function loadHcaptchaScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.hcaptcha) return Promise.resolve();
  if (window.__ph_hcaptcha_loaded) return window.__ph_hcaptcha_loaded;

  window.__ph_hcaptcha_loaded = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="js.hcaptcha.com"]');
    if (existingScript) {
      if (window.hcaptcha) {
        resolve();
      } else {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', (e) => reject(e));
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => resolve();
    script.onerror = (err) => {
      logger.error('[CaptchaChallenge] Failed to load hCaptcha script:', err);
      reject(new Error('Failed to load hCaptcha verification script.'));
    };

    document.head.appendChild(script);
  });

  return window.__ph_hcaptcha_loaded;
}

// ─── Component Props & Handle ────────────────────────────────────────────────
export interface CaptchaChallengeHandle {
  /** Resets the active CAPTCHA widget so a fresh token can be obtained */
  reset: () => void;
  /** Imperatively executes an invisible CAPTCHA challenge */
  execute: () => void;
  /** Returns the current token from the provider widget if available */
  getResponse: () => string | undefined;
}

export interface CaptchaChallengeProps {
  /** Callback fired with the valid CAPTCHA verification token */
  onVerify: (token: string) => void;
  /** Callback fired when the solved token expires */
  onExpire?: () => void;
  /** Callback fired when the provider encounters an error */
  onError?: (error: any) => void;
  /** Override the provider ('turnstile' | 'hcaptcha'). Defaults to 'hcaptcha' when key present */
  provider?: 'turnstile' | 'hcaptcha';
  /** Override the public site key. Defaults to env.VITE_HCAPTCHA_SITE_KEY */
  siteKey?: string;
  /** Action name tag passed to Cloudflare Turnstile telemetry */
  action?: string;
  /** Visual theme ('light' | 'dark' | 'auto'). Defaults to 'light' */
  theme?: 'light' | 'dark' | 'auto';
  /** Size of widget ('normal' | 'compact' | 'invisible'). Defaults to 'normal' */
  size?: 'normal' | 'compact' | 'flexible' | 'invisible';
  /** Whether to show the bottom-right floating disclosure badge in invisible mode */
  showOverlayBadge?: boolean;
  /** Additional container CSS classes */
  className?: string;
}

export const CaptchaChallenge = forwardRef<CaptchaChallengeHandle, CaptchaChallengeProps>(
  (
    {
      onVerify,
      onExpire,
      onError,
      provider = env.VITE_HCAPTCHA_SITE_KEY || !env.VITE_TURNSTILE_SITE_KEY ? 'hcaptcha' : 'turnstile',
      siteKey = provider === 'hcaptcha'
        ? (env.VITE_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001')
        : (env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'),
      action = 'auth',
      theme = 'light',
      size = 'normal',
      showOverlayBadge = true,
      className = '',
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const isMountedRef = useRef<boolean>(true);

    const [status, setStatus] = useState<'loading' | 'ready' | 'verified' | 'expired' | 'error'>(
      'loading'
    );
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep callbacks in refs to avoid re-rendering widgets on parent state changes
    const onVerifyRef = useRef(onVerify);
    const onExpireRef = useRef(onExpire);
    const onErrorRef = useRef(onError);

    useEffect(() => {
      onVerifyRef.current = onVerify;
      onExpireRef.current = onExpire;
      onErrorRef.current = onError;
    }, [onVerify, onExpire, onError]);

    // Imperative handle for parent forms (AuthView)
    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          try {
            if (provider === 'turnstile' && window.turnstile && widgetIdRef.current) {
              window.turnstile.reset(widgetIdRef.current);
            } else if (provider === 'hcaptcha' && window.hcaptcha && widgetIdRef.current) {
              window.hcaptcha.reset(widgetIdRef.current);
            }
            if (isMountedRef.current) {
              setStatus('ready');
              setErrorMessage(null);
            }
          } catch (e) {
            logger.warn('[CaptchaChallenge] Reset error:', e);
          }
        },
        execute: () => {
          try {
            if (provider === 'turnstile' && window.turnstile && widgetIdRef.current) {
              window.turnstile.execute(widgetIdRef.current);
            } else if (provider === 'hcaptcha' && window.hcaptcha && widgetIdRef.current) {
              window.hcaptcha.execute(widgetIdRef.current);
            }
          } catch (e) {
            logger.warn('[CaptchaChallenge] Execute error:', e);
          }
        },
        getResponse: () => {
          try {
            if (provider === 'turnstile' && window.turnstile && widgetIdRef.current) {
              return window.turnstile.getResponse(widgetIdRef.current);
            }
            if (provider === 'hcaptcha' && window.hcaptcha && widgetIdRef.current) {
              return window.hcaptcha.getResponse(widgetIdRef.current);
            }
          } catch {}
          return undefined;
        },
      }),
      [provider]
    );

    useEffect(() => {
      isMountedRef.current = true;
      let isCancelled = false;

      const effectiveSiteKey =
        siteKey ||
        (provider === 'hcaptcha'
          ? '10000000-ffff-ffff-ffff-000000000001'
          : env.IS_DEV
          ? '1x00000000000000000000AA'
          : '');

      if (!effectiveSiteKey) {
        setStatus('error');
        setErrorMessage('Security verification site key is not configured.');
        return () => {
          isMountedRef.current = false;
        };
      }

      const initWidget = async () => {
        try {
          if (provider === 'turnstile') {
            await loadTurnstileScript();
            if (isCancelled || !containerRef.current || !window.turnstile) return;

            containerRef.current.innerHTML = '';

            const widgetId = window.turnstile.render(containerRef.current, {
              sitekey: effectiveSiteKey,
              action,
              theme,
              size: size === 'flexible' ? 'flexible' : size === 'compact' ? 'compact' : 'normal',
              callback: (token: string) => {
                if (!isMountedRef.current) return;
                setStatus('verified');
                setErrorMessage(null);
                onVerifyRef.current(token);
              },
              'expired-callback': () => {
                if (!isMountedRef.current) return;
                setStatus('expired');
                if (onExpireRef.current) onExpireRef.current();
              },
              'error-callback': (err: any) => {
                if (!isMountedRef.current) return;
                logger.warn('[CaptchaChallenge] Turnstile error callback:', err);
                setStatus('error');
                setErrorMessage('Security verification challenge failed. Please retry.');
                if (onErrorRef.current) onErrorRef.current(err);
              },
            });

            widgetIdRef.current = widgetId;
            if (isMountedRef.current) setStatus('ready');
          } else {
            // hCaptcha integration
            await loadHcaptchaScript();
            if (isCancelled || !containerRef.current || !window.hcaptcha) return;

            containerRef.current.innerHTML = '';

            const widgetId = window.hcaptcha.render(containerRef.current, {
              sitekey: effectiveSiteKey,
              theme: theme === 'dark' ? 'dark' : 'light',
              size: size === 'invisible' ? 'invisible' : size === 'compact' ? 'compact' : 'normal',
              callback: (token: string) => {
                if (!isMountedRef.current) return;
                setStatus('verified');
                setErrorMessage(null);
                onVerifyRef.current(token);
              },
              'expired-callback': () => {
                if (!isMountedRef.current) return;
                setStatus('expired');
                if (onExpireRef.current) onExpireRef.current();
              },
              'chalexpired-callback': () => {
                if (!isMountedRef.current) return;
                setStatus('expired');
                if (onExpireRef.current) onExpireRef.current();
              },
              'error-callback': (err: any) => {
                if (!isMountedRef.current) return;
                logger.warn('[CaptchaChallenge] hCaptcha error callback:', err);
                setStatus('error');
                setErrorMessage('Security verification failed. Please retry.');
                if (onErrorRef.current) onErrorRef.current(err);
              },
            });

            widgetIdRef.current = widgetId;
            if (isMountedRef.current) setStatus('ready');
          }
        } catch (err: any) {
          if (!isMountedRef.current) return;
          logger.error('[CaptchaChallenge] Initialization exception:', err);
          setStatus('error');
          setErrorMessage('Could not load security challenge. Please verify your connection.');
          if (onErrorRef.current) onErrorRef.current(err);
        }
      };

      initWidget();

      return () => {
        isCancelled = true;
        isMountedRef.current = false;
        if (widgetIdRef.current) {
          try {
            if (provider === 'turnstile' && window.turnstile) {
              window.turnstile.remove(widgetIdRef.current);
            } else if (provider === 'hcaptcha' && window.hcaptcha) {
              window.hcaptcha.remove(widgetIdRef.current);
            }
          } catch {}
          widgetIdRef.current = null;
        }
      };
    }, [provider, siteKey, action, theme, size]);

    const handleMouseEnterOverlay = () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      setIsOverlayOpen(true);
    };

    const handleMouseLeaveOverlay = () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = setTimeout(() => {
        setIsOverlayOpen(false);
      }, 200);
    };

    return (
      <>
        {/* Main Challenge Box */}
        <div
          className={`w-full flex flex-col items-center justify-center my-2 transition-all duration-200 ${
            size === 'invisible' ? 'h-0 overflow-hidden m-0 p-0' : ''
          } ${className}`}
          data-testid="captcha-challenge-container"
        >
          {size !== 'invisible' && (
            <>
              {/* Sleek Minimalist Security Header */}
              <div className="w-full flex items-center justify-between text-[10px] text-text-muted font-mono font-medium mb-1.5 px-1 select-none">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span className="tracking-wide">Security Verification</span>
                </span>
                <span className="text-[9px] text-text-muted/80 uppercase font-semibold flex items-center gap-1">
                  {provider === 'hcaptcha' && <HCaptchaLogo className="w-3 h-3 inline-block" />}
                  {provider === 'turnstile' ? 'Cloudflare Turnstile' : 'hCaptcha Protected'}
                </span>
              </div>

              {/* Challenge Widget Box with Fixed Height (82px) to Guarantee Zero Layout Shift */}
              <div className="w-full min-h-[82px] flex items-center justify-center rounded-xl bg-bg-tertiary/40 border border-border-default/80 p-1.5 relative overflow-hidden transition-colors shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                {/* Skeleton Loader during script/widget mounting */}
                {status === 'loading' && (
                  <div className="flex items-center gap-2 text-xs text-text-muted py-3">
                    <div className="w-3.5 h-3.5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="text-[11px] font-sans">Loading verification challenge...</span>
                  </div>
                )}

                {/* Error / Fallback State */}
                {status === 'error' && (
                  <div className="flex items-center justify-between w-full px-2.5 py-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="text-[11px] truncate">
                        {errorMessage || 'Verification challenge error'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStatus('loading');
                        setErrorMessage(null);
                        if (widgetIdRef.current) {
                          if (provider === 'turnstile' && window.turnstile) {
                            window.turnstile.reset(widgetIdRef.current);
                          } else if (provider === 'hcaptcha' && window.hcaptcha) {
                            window.hcaptcha.reset(widgetIdRef.current);
                          }
                        }
                      }}
                      className="text-[10px] font-semibold text-rose-800 hover:underline cursor-pointer flex items-center gap-1 shrink-0 ml-2"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                {/* Widget Container Render */}
                <div
                  ref={containerRef}
                  className={`w-full flex justify-center items-center ${
                    status === 'loading' || status === 'error' ? 'hidden' : 'flex'
                  }`}
                  data-testid="captcha-widget-target"
                />
              </div>
            </>
          )}

          {size === 'invisible' && (
            <div ref={containerRef} className="hidden" data-testid="captcha-invisible-target" />
          )}
        </div>

        {/* Floating hCaptcha Disclosure Overlay Badge (for invisible mode or studio compliance) */}
        {provider === 'hcaptcha' && showOverlayBadge && (
          <div
            className="fixed bottom-4 right-4 z-[9999] flex items-end justify-end pointer-events-none"
            onMouseEnter={handleMouseEnterOverlay}
            onMouseLeave={handleMouseLeaveOverlay}
          >
            <div className="relative pointer-events-auto flex items-center">
              {/* Interactive Disclosure Popup */}
              <AnimatePresence>
                {isOverlayOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 8, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 8, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-12 bottom-0 w-64 p-3 bg-bg-secondary/95 backdrop-blur-sm border border-border-default rounded-xl shadow-lg text-[11px] leading-relaxed text-text-muted z-50 text-left font-sans"
                    onMouseEnter={handleMouseEnterOverlay}
                    onMouseLeave={handleMouseLeaveOverlay}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-text-primary mb-1">
                      <HCaptchaLogo className="w-3.5 h-3.5 shrink-0" />
                      <span>hCaptcha Protected</span>
                    </div>
                    <p className="text-[10px] text-text-muted">
                      This site is protected by hCaptcha and its{' '}
                      <a
                        href="https://www.hcaptcha.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-primary font-medium hover:underline inline-flex items-center gap-0.5"
                      >
                        Privacy Policy
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>{' '}
                      and{' '}
                      <a
                        href="https://www.hcaptcha.com/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-primary font-medium hover:underline inline-flex items-center gap-0.5"
                      >
                        Terms of Service
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>{' '}
                      apply.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Floating Trigger Badge */}
              <button
                type="button"
                onClick={() => setIsOverlayOpen((prev) => !prev)}
                aria-label="hCaptcha disclosure"
                className="w-10 h-10 min-h-[40px] rounded-full bg-bg-secondary/90 backdrop-blur-sm border border-border-default/80 shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <HCaptchaLogo className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </>
    );
  }
);

CaptchaChallenge.displayName = 'CaptchaChallenge';
