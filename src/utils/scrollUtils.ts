/**
 * Utility functions for page and container scrolling.
 * Guarantees smooth scroll to top across window, document body, and custom scroll containers.
 */
export const scrollToTop = (smooth: boolean = true): void => {
  const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';

  // 1. Dispatch custom event for React components holding direct refs (e.g., App.tsx viewScrollRef)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('scroll-to-top', { detail: { behavior } }));
    try {
      window.scrollTo({ top: 0, left: 0, behavior });
    } catch {
      window.scrollTo(0, 0);
    }
  }

  // 2. Scroll document root & body
  if (typeof document !== 'undefined') {
    if (document.documentElement) {
      try {
        document.documentElement.scrollTo({ top: 0, left: 0, behavior });
      } catch {
        document.documentElement.scrollTop = 0;
      }
    }
    if (document.body) {
      try {
        document.body.scrollTo({ top: 0, left: 0, behavior });
      } catch {
        document.body.scrollTop = 0;
      }
    }

    // 3. Scroll specific main content container
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      try {
        mainContent.scrollTo({ top: 0, left: 0, behavior });
      } catch {
        mainContent.scrollTop = 0;
      }
    }

    // 4. Scroll any active scrollable view containers
    const scrollContainers = document.querySelectorAll<HTMLElement>(
      '.overflow-y-auto, [data-scroll-container="true"]'
    );
    scrollContainers.forEach((container) => {
      try {
        container.scrollTo({ top: 0, left: 0, behavior });
      } catch {
        container.scrollTop = 0;
      }
    });
  }
};

/**
 * Scroll accurately to a specific element by ID.
 * Coordinates between native scrollIntoView and inner scrollable view containers (.overflow-y-auto / #main-content)
 * to avoid jerky offsets from fixed or sticky headers.
 */
export const scrollToElement = (id: string, smooth: boolean = true, offset: number = 0): boolean => {
  if (typeof document === 'undefined') return false;
  const el = document.getElementById(id);
  if (!el) return false;

  const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';

  // Find the nearest scrollable parent container (.overflow-y-auto, #main-content, or body)
  const scrollContainer = el.closest('.overflow-y-auto') as HTMLElement | null;
  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const currentScrollTop = scrollContainer.scrollTop;
    // Calculate exact target scrollTop so the top of el aligns cleanly with container top, minus any offset
    const targetScrollTop = Math.max(0, currentScrollTop + (elRect.top - containerRect.top) - offset);
    try {
      scrollContainer.scrollTo({ top: targetScrollTop, behavior });
    } catch {
      scrollContainer.scrollTop = targetScrollTop;
    }
  } else {
    try {
      el.scrollIntoView({ behavior, block: 'start' });
    } catch {
      // fallback
    }
  }

  return true;
};

/**
 * Scroll to an element with automatic retries, ensuring navigation transitions
 * (like React Suspense lazy loading or AnimatePresence exit animations) complete first.
 */
export const scrollToElementWithRetry = (
  id: string,
  smooth: boolean = true,
  offset: number = 0,
  maxAttempts: number = 25,
  intervalMs: number = 50
): void => {
  let attempts = 0;
  const tryScroll = () => {
    attempts++;
    const success = scrollToElement(id, smooth, offset);
    if (!success && attempts < maxAttempts) {
      setTimeout(tryScroll, intervalMs);
    }
  };
  tryScroll();
};
