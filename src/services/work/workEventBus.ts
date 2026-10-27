/**
 * src/services/work/workEventBus.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Normalized Real-time Event Bus for PromptHub Work.
 * Coordinates task, agent, tool, terminal, and approval events across the application.
 * Connects to Supabase Realtime channels when connected and provides local zero-lag dispatch.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { WorkEvent, WorkEventType } from '../../types/work';
import { logger } from '../../utils/logger';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (val?: string | null): boolean => Boolean(val && UUID_REGEX.test(val));

export type WorkEventListener = (event: WorkEvent) => void;

class WorkEventBus {
  private listeners: Map<string, Set<WorkEventListener>> = new Map();
  private globalListeners: Set<WorkEventListener> = new Set();
  private realtimeChannel: any = null;
  private isSubscribedToRealtime = false;

  constructor() {}

  getRealtimeStatus() {
    return {
      isSubscribed: false,
      hasChannel: false,
    };
  }

  /**
   * Dispatches an event locally to all subscribed task listeners and global listeners.
   */
  private dispatchLocal(event: WorkEvent) {
    // Notify task-specific listeners
    const taskSet = this.listeners.get(event.taskId);
    if (taskSet) {
      taskSet.forEach((listener) => {
        try {
          listener(event);
        } catch (e) {
          logger.error('[WorkEventBus] Task listener error:', e);
        }
      });
    }

    // Notify project-specific listeners
    const projectSet = this.listeners.get(`project:${event.projectId}`);
    if (projectSet) {
      projectSet.forEach((listener) => {
        try {
          listener(event);
        } catch (e) {
          logger.error('[WorkEventBus] Project listener error:', e);
        }
      });
    }

    // Notify global listeners
    this.globalListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        logger.error('[WorkEventBus] Global listener error:', e);
      }
    });
  }

  /**
   * Publish a new normalized Work event.
   * Dispatches locally immediately and persists to Supabase in the background.
   */
  async emit(
    taskId: string,
    projectId: string,
    eventType: WorkEventType,
    payload: Record<string, any> = {},
    agentId?: string
  ): Promise<WorkEvent> {
    const event: WorkEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      taskId,
      projectId,
      agentId,
      eventType,
      payload,
      timestamp: new Date().toISOString(),
    };

    // Immediate local dispatch for zero UI latency
    this.dispatchLocal(event);
    return event;
  }

  /**
   * Subscribe to events for a specific task.
   */
  subscribeTask(taskId: string, listener: WorkEventListener): () => void {
    if (!this.listeners.has(taskId)) {
      this.listeners.set(taskId, new Set());
    }
    this.listeners.get(taskId)!.add(listener);

    return () => {
      const set = this.listeners.get(taskId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(taskId);
        }
      }
    };
  }

  /**
   * Subscribe to events for a specific project.
   */
  subscribeProject(projectId: string, listener: WorkEventListener): () => void {
    const key = `project:${projectId}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    return () => {
      const set = this.listeners.get(key);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  /**
   * Subscribe to all global Work events (activity feed).
   */
  subscribeAll(listener: WorkEventListener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }
}

export const workEventBus = new WorkEventBus();
