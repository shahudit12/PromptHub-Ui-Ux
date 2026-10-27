/**
 * src/utils/apkDownload.ts
 * Reliable client-side APK download trigger with fallback mirrors,
 * service-worker bypass, and Mixpanel telemetry.
 */

import { trackMixpanelEvent } from '../lib/mixpanel';

export interface ApkDownloadOptions {
  source?: string;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

export const APK_METADATA = {
  filename: 'PromptHub.apk',
  version: '1.3.0',
  versionCode: 103,
  sizeBytes: 63676,
  sizeFormatted: '62 KB',
  packageId: 'cloud.prompthub.app',
  minAndroid: 'Android 8.0+ (API 26)',
  targetAndroid: 'Android 14 / 15 (API 34/35)',
  buildDate: '2026-09-06',
  sha256: '2eab8628a3e35eff10b29211e0968ae41219c94cbab7badec0081e41384643b3',
  downloadUrl: '/prompthub.apk',
  apiFallbackUrl: '/api/download-apk',
  downloadsFolderUrl: '/downloads/prompthub.apk',
};

export function triggerApkDownload(options?: ApkDownloadOptions): void {
  const source = options?.source || 'unknown';

  try {
    trackMixpanelEvent('mobile_apk_download_started', {
      source,
      version: APK_METADATA.version,
      filename: APK_METADATA.filename,
      platform: typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('android') ? 'android' : 'desktop_or_other',
    });
  } catch {
    // Non-blocking telemetry
  }

  // Primary: Anchor download with explicit download attribute and target
  try {
    const link = document.createElement('a');
    link.href = APK_METADATA.downloadUrl;
    link.download = APK_METADATA.filename;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    }, 150);

    options?.onSuccess?.();
  } catch (err: any) {
    // Fallback: direct window location change to API streaming endpoint
    try {
      window.location.assign(APK_METADATA.apiFallbackUrl);
      options?.onSuccess?.();
    } catch (fallbackErr: any) {
      options?.onError?.(fallbackErr || err);
    }
  }
}

/**
 * Check whether PromptHub is running as an installed standalone app
 */
export function isPwaInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    Boolean((window as any).__pwaIsInstalled) ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Check whether the browser has supplied an install prompt event
 */
export function hasPwaPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).__pwaInstallPrompt);
}

/**
 * Trigger the native browser install dialog for the dedicated WebAPK/PWA app
 */
export async function triggerPwaInstall(): Promise<'accepted' | 'dismissed' | 'manual_required'> {
  if (typeof window === 'undefined') return 'manual_required';
  const prompt = (window as any).__pwaInstallPrompt;
  if (prompt && typeof prompt.prompt === 'function') {
    try {
      prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === 'accepted') {
        (window as any).__pwaInstallPrompt = null;
        (window as any).__pwaIsInstalled = true;
        try {
          trackMixpanelEvent('mobile_pwa_installed', {
            platform: navigator.userAgent.toLowerCase().includes('android') ? 'android' : 'other',
          });
        } catch {}
        return 'accepted';
      }
      return 'dismissed';
    } catch {
      return 'manual_required';
    }
  }
  return 'manual_required';
}
