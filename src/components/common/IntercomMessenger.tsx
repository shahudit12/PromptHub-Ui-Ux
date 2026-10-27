import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  bootIntercomUser,
  bootIntercomVisitor,
  updateIntercomUser,
  shutdownIntercom,
  isTokenValid,
  refreshTokenSilently,
} from '../../lib/intercom';

export const IntercomMessenger: React.FC = () => {
  const { user, isAuthLoading } = useApp();
  const lastUserIdRef = useRef<string | null | undefined>(undefined);
  const lastAttributesRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Do NOT initialize or touch Intercom while auth session is restoring.
    // Firing an anonymous visitor session during the 100ms startup phase
    // triggers an immediate session conflict ("User ID mismatch") once the user is resolved.
    if (isAuthLoading) return;

    const currentUserId = user?.id || null;
    if (lastUserIdRef.current === currentUserId) return;
    lastUserIdRef.current = currentUserId;

    if (user && user.id) {
      bootIntercomUser(user);
    } else {
      shutdownIntercom();
      bootIntercomVisitor();
    }
  }, [user?.id, isAuthLoading]);

  const updateDebounceRef = useRef<any>(null);

  // Synchronize dynamic user telemetry attributes (credits, plan, role) whenever they change
  useEffect(() => {
    if (isAuthLoading || !user?.id) return;

    const attrHash = `${user.plan}_${user.credits}_${user.paidCredits}_${user.role}_${Boolean(user.hasPremiumAccess)}`;
    if (lastAttributesRef.current && lastAttributesRef.current !== attrHash) {
      if (updateDebounceRef.current) {
        clearTimeout(updateDebounceRef.current);
      }
      // Debounce rapid profile/credit changes (e.g. streaming LLM executions or shootout runs)
      updateDebounceRef.current = setTimeout(() => {
        updateIntercomUser(user);
      }, 300);
    }
    lastAttributesRef.current = attrHash;

    return () => {
      if (updateDebounceRef.current) {
        clearTimeout(updateDebounceRef.current);
      }
    };
  }, [user?.plan, user?.credits, user?.paidCredits, user?.role, user?.hasPremiumAccess, isAuthLoading]);

  // Handle multi-tab logout or session change via window storage event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      // Supabase auth stores tokens in localStorage with keys like sb-*-auth-token
      if (e.key && (e.key.includes('auth-token'))) {
        if (!e.newValue) {
          // Another tab cleared the auth token
          shutdownIntercom();
          bootIntercomVisitor();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Handle tab visibility change & window focus (e.g. wake from OS sleep / hibernation)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const handleWakeOrFocus = () => {
      // Only renew token if we have an active authenticated user session and auth has finished loading
      if (isAuthLoading || !user?.id) return;

      // If document is visible and token is expired or close to expiring (< 2 minutes buffer)
      const isVisible = typeof document.visibilityState === 'undefined' || document.visibilityState === 'visible';
      const tokenExpired = !isTokenValid() || !isTokenValid(120_000);
      if (isVisible && tokenExpired) {
        refreshTokenSilently().catch((err) => {
          console.warn('[Intercom] Wake refresh failed:', err);
        });
      }
    };

    document.addEventListener('visibilitychange', handleWakeOrFocus);
    window.addEventListener('focus', handleWakeOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleWakeOrFocus);
      window.removeEventListener('focus', handleWakeOrFocus);
    };
  }, [user?.id, isAuthLoading]);

  return null;
};
