/**
 * src/services/googleAuthService.ts
 * Google Identity Services Client for PromptHub Frontend
 */

import { env } from '../config/env';
import { logger } from '../utils/logger';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (notification?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          cancel: () => void;
        };
        oauth2: {
          initTokenClient: (config: any) => any;
        };
      };
    };
  }
}

export function generateRawNonce(): string {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function sha256Hex(message: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return message;
}

class GoogleAuthService {
  private scriptLoaded = false;
  private scriptLoadingPromise: Promise<boolean> | null = null;
  private currentRawNonce: string | null = null;

  public async loadGoogleScript(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (this.scriptLoaded && window.google?.accounts?.id) return true;

    if (this.scriptLoadingPromise) return this.scriptLoadingPromise;

    this.scriptLoadingPromise = new Promise((resolve) => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        this.scriptLoaded = true;
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve(true);
      };
      script.onerror = () => {
        logger.warn('[GoogleAuthService] Failed to load Google Identity Services SDK');
        resolve(false);
      };
      document.head.appendChild(script);
    });

    return this.scriptLoadingPromise;
  }

  public async createNoncePair(): Promise<{ rawNonce: string; hashedNonce: string }> {
    const rawNonce = generateRawNonce();
    this.currentRawNonce = rawNonce;
    const hashedNonce = await sha256Hex(rawNonce);
    return { rawNonce, hashedNonce };
  }

  public getCurrentRawNonce(): string | null {
    return this.currentRawNonce;
  }

  public async signInWithGoogleIdToken(_idToken: string, _nonce?: string | null): Promise<{ data: { user: any }; error: any }> {
    return { data: { user: null }, error: null };
  }

  public getGoogleClientId(): string | null {
    return env.VITE_GOOGLE_CLIENT_ID || null;
  }

  public isGoogleAuthEnabled(): boolean {
    return Boolean(this.getGoogleClientId());
  }
}

export const googleAuthService = new GoogleAuthService();
