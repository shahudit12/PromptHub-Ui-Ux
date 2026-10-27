/**
 * src/services/scrollRestorationService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PromptHub Scroll Position Restoration & BFCache Service.
 *
 * Keeps track of scroll offsets across internal tab views and browser
 * back/forward (popstate / bfcache pageshow) navigation so users are
 * restored to the exact position where they left off, rather than resetting.
 * ─────────────────────────────────────────────────────────────────────────────
 */

class ScrollRestorationService {
  private readonly storageKey = 'ph_scroll_positions_v1';
  private inMemoryPositions: Map<string, number> = new Map();
  private persistTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Enforce manual scroll restoration so native browser does not interfere with SPA views
      if ('scrollRestoration' in window.history) {
        try {
          window.history.scrollRestoration = 'manual';
        } catch {}
      }

      this.loadFromSession();

      // BFCache (Back/Forward Cache) handler on pageshow event
      window.addEventListener('pageshow', (event) => {
        try {
          // If restored from bfcache or standard page navigation, restore scroll
          const isBFCache = event.persisted;
          const currentTab = sessionStorage.getItem('ph_last_active_tab') || 'home';
          const targetScroll = this.getScrollPosition(currentTab);
          if (targetScroll > 0 || isBFCache) {
            const container =
              (document.querySelector('[data-view-scroll-container="true"]') as HTMLElement) ||
              document.querySelector('#main-content') ||
              document.documentElement;
            if (container) {
              this.restoreScroll(container as HTMLElement, currentTab, 12);
            }
          }
        } catch {}
      });

      window.addEventListener('beforeunload', () => {
        if (this.persistTimeout) {
          clearTimeout(this.persistTimeout);
          this.persistToSession();
        }
      });
    }
  }

  private loadFromSession() {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.entries(parsed).forEach(([k, v]) => {
            if (typeof v === 'number') {
              this.inMemoryPositions.set(k, v);
            }
          });
        }
      }
    } catch {
      // Ignore session storage errors
    }
  }

  private persistToSession() {
    if (typeof window === 'undefined') return;
    try {
      const obj: Record<string, number> = {};
      this.inMemoryPositions.forEach((v, k) => {
        obj[k] = v;
      });
      sessionStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Save the scroll position for a specific view/tab key.
   * Updates in-memory position synchronously and debounces session storage writes.
   */
  public saveScrollPosition(key: string, scrollTop: number) {
    if (!key) return;
    const clamped = Math.max(0, Math.round(scrollTop));
    this.inMemoryPositions.set(key, clamped);

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('ph_last_active_tab', key);
      } catch {}
    }

    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }
    this.persistTimeout = setTimeout(() => {
      this.persistToSession();
      this.persistTimeout = null;
    }, 150);
  }

  /**
   * Get the saved scroll position for a specific view/tab key.
   */
  public getScrollPosition(key: string): number {
    if (!key) return 0;
    return this.inMemoryPositions.get(key) || 0;
  }

  /**
   * Restore scroll position onto a target container element with retries
   * to accommodate asynchronous React component mount and dynamic layout rendering.
   */
  public restoreScroll(element: HTMLElement | null, key: string, maxRetries = 14) {
    if (!element || !key) return;
    const targetScroll = this.getScrollPosition(key);
    if (targetScroll <= 0) return;

    let retries = 0;
    const attemptScroll = () => {
      if (!element) return;

      element.scrollTop = targetScroll;

      // Also try window scroll if root or body
      if (element === document.documentElement || element === document.body) {
        window.scrollTo({ top: targetScroll, behavior: 'instant' as any });
      }

      // If the element's scrollHeight was not yet expanded by React rendering, retry on next frame
      if (element.scrollTop < targetScroll && retries < maxRetries) {
        retries++;
        requestAnimationFrame(() => {
          setTimeout(attemptScroll, 30 * Math.min(retries, 5));
        });
      }
    };

    requestAnimationFrame(attemptScroll);
  }

  /**
   * Clears saved positions on sign-out or explicit full reset.
   */
  public clearAll() {
    this.inMemoryPositions.clear();
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(this.storageKey);
      } catch {}
    }
  }
}

export const scrollRestorationService = new ScrollRestorationService();
