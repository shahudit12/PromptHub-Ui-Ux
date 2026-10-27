/**
 * NavigationLoadingService — Real pending route & chunk loading coordinator.
 * Connects top loading indicator strictly to in-flight dynamic imports and transitions.
 */

type Listener = (isPending: boolean) => void;

class NavigationLoadingService {
  private pendingCount = 0;
  private listeners: Set<Listener> = new Set();

  start() {
    this.pendingCount++;
    this.notify();
  }

  stop() {
    this.pendingCount = Math.max(0, this.pendingCount - 1);
    this.notify();
  }

  clear() {
    this.pendingCount = 0;
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.pendingCount > 0);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const isPending = this.pendingCount > 0;
    this.listeners.forEach((listener) => {
      try {
        listener(isPending);
      } catch (err) {
        console.warn('[NavigationLoadingService] Listener error:', err);
      }
    });
  }
}

export const navigationLoadingService = new NavigationLoadingService();
export default navigationLoadingService;
