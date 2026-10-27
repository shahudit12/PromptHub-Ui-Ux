/**
 * src/services/work/workImageCapService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Account-Level Image Generation Cap Enforcement Service for PromptHub.
 * Enforces a strict maximum limit cap of 8 generated images per account.
 * Persistently tracked in local storage, checked before generation, and emits
 * reactive state updates for UI quota meters.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const MAX_IMAGE_GENERATION_CAP = 8;

export interface ImageGenerationRecord {
  id: string;
  prompt: string;
  imageUrl?: string;
  directionId?: string;
  timestamp: number;
  status: 'proposed' | 'accepted' | 'rejected';
}

export interface AccountImageCapState {
  accountId: string;
  totalGenerated: number;
  history: ImageGenerationRecord[];
  updatedAt: number;
}

export interface ImageCapCheckResult {
  allowed: boolean;
  remaining: number;
  current: number;
  max: number;
  requested: number;
  error?: string;
}

const STORAGE_PREFIX = 'ph_account_image_quota_v1:';
const EVENT_NAME = 'ph_image_cap_updated';

class WorkImageCapService {
  private resolveAccountId(accountId?: string): string {
    const trimmed = (accountId || '').trim();
    return trimmed.length > 0 ? trimmed.replace(/[^a-zA-Z0-9_-]/g, '_') : 'default_account';
  }

  private resolveStorageKey(accountId?: string): string {
    return `${STORAGE_PREFIX}${this.resolveAccountId(accountId)}`;
  }

  private getState(accountId?: string): AccountImageCapState {
    const cleanId = this.resolveAccountId(accountId);
    if (typeof window === 'undefined' || !window.localStorage) {
      return {
        accountId: cleanId,
        totalGenerated: 0,
        history: [],
        updatedAt: Date.now(),
      };
    }

    try {
      const key = this.resolveStorageKey(cleanId);
      const raw = localStorage.getItem(key);
      if (!raw) {
        return {
          accountId: cleanId,
          totalGenerated: 0,
          history: [],
          updatedAt: Date.now(),
        };
      }
      const parsed = JSON.parse(raw);
      return {
        accountId: parsed.accountId || cleanId,
        totalGenerated: Math.min(MAX_IMAGE_GENERATION_CAP, Math.max(0, Number(parsed.totalGenerated) || 0)),
        history: Array.isArray(parsed.history) ? parsed.history : [],
        updatedAt: Number(parsed.updatedAt) || Date.now(),
      };
    } catch {
      return {
        accountId: accountId || 'default_account',
        totalGenerated: 0,
        history: [],
        updatedAt: Date.now(),
      };
    }
  }

  private saveState(state: AccountImageCapState): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const key = this.resolveStorageKey(state.accountId);
      localStorage.setItem(key, JSON.stringify(state));
      this.notifyListeners(state.accountId);
    } catch {
      // Storage quota or sandboxed fallback
    }
  }

  private notifyListeners(accountId: string): void {
    if (typeof window === 'undefined') return;
    try {
      const evt = new CustomEvent(EVENT_NAME, {
        detail: {
          accountId,
          remaining: this.getRemainingImagesCount(accountId),
          totalGenerated: this.getImagesGeneratedCount(accountId),
          maxCap: MAX_IMAGE_GENERATION_CAP,
        },
      });
      window.dispatchEvent(evt);
    } catch {}
  }

  /**
   * Returns the maximum account generation cap (8).
   */
  getImageCap(): number {
    return MAX_IMAGE_GENERATION_CAP;
  }

  /**
   * Returns current count of images generated for this account.
   */
  getImagesGeneratedCount(accountId?: string): number {
    return this.getState(accountId).totalGenerated;
  }

  /**
   * Returns remaining image generation allowance for this account.
   */
  getRemainingImagesCount(accountId?: string): number {
    const current = this.getImagesGeneratedCount(accountId);
    return Math.max(0, MAX_IMAGE_GENERATION_CAP - current);
  }

  /**
   * Checks whether the account has reached the maximum 8-image cap.
   */
  isCapReached(accountId?: string): boolean {
    return this.getRemainingImagesCount(accountId) <= 0;
  }

  /**
   * Validates whether requested number of image generations is permitted under the 8-image cap.
   */
  canGenerateImages(count: number = 1, accountId?: string): ImageCapCheckResult {
    const current = this.getImagesGeneratedCount(accountId);
    const remaining = Math.max(0, MAX_IMAGE_GENERATION_CAP - current);
    const requested = Math.max(1, count);

    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        current,
        max: MAX_IMAGE_GENERATION_CAP,
        requested,
        error: `Account generation cap reached (${current}/${MAX_IMAGE_GENERATION_CAP} images used). Maximum limit of 8 generated images per account reached.`,
      };
    }

    if (requested > remaining) {
      return {
        allowed: false,
        remaining,
        current,
        max: MAX_IMAGE_GENERATION_CAP,
        requested,
        error: `Cannot generate ${requested} images. Only ${remaining} image generation${remaining === 1 ? '' : 's'} remaining under the 8-image account limit.`,
      };
    }

    return {
      allowed: true,
      remaining,
      current,
      max: MAX_IMAGE_GENERATION_CAP,
      requested,
    };
  }

  /**
   * Records newly generated images and increments persistent account usage.
   * Enforces hard clamping at MAX_IMAGE_GENERATION_CAP (8).
   */
  recordImagesGenerated(
    records: Array<{
      prompt: string;
      imageUrl?: string;
      directionId?: string;
      status?: 'proposed' | 'accepted' | 'rejected';
    }>,
    accountId?: string
  ): { success: boolean; remaining: number; total: number; recordedCount: number } {
    if (!records || records.length === 0) {
      return {
        success: true,
        remaining: this.getRemainingImagesCount(accountId),
        total: this.getImagesGeneratedCount(accountId),
        recordedCount: 0,
      };
    }

    const state = this.getState(accountId);
    const remainingBefore = Math.max(0, MAX_IMAGE_GENERATION_CAP - state.totalGenerated);
    if (remainingBefore <= 0) {
      return {
        success: false,
        remaining: 0,
        total: state.totalGenerated,
        recordedCount: 0,
      };
    }

    // Only record up to the remaining allowance
    const itemsToRecord = records.slice(0, remainingBefore);
    const now = Date.now();

    const newHistory: ImageGenerationRecord[] = itemsToRecord.map((rec, i) => ({
      id: `img_gen_${now}_${i}_${Math.random().toString(36).substring(2, 7)}`,
      prompt: rec.prompt,
      imageUrl: rec.imageUrl,
      directionId: rec.directionId,
      timestamp: now,
      status: rec.status || 'proposed',
    }));

    state.history = [...state.history, ...newHistory];
    state.totalGenerated = Math.min(MAX_IMAGE_GENERATION_CAP, state.totalGenerated + itemsToRecord.length);
    state.updatedAt = now;

    this.saveState(state);

    return {
      success: true,
      remaining: Math.max(0, MAX_IMAGE_GENERATION_CAP - state.totalGenerated),
      total: state.totalGenerated,
      recordedCount: itemsToRecord.length,
    };
  }

  /**
   * Updates status of an existing generation record (e.g., mark as accepted or rejected).
   */
  updateRecordStatus(
    directionIdOrRecordId: string,
    status: 'accepted' | 'rejected',
    accountId?: string
  ): void {
    const state = this.getState(accountId);
    let changed = false;
    state.history = state.history.map((item) => {
      if (item.id === directionIdOrRecordId || item.directionId === directionIdOrRecordId) {
        changed = true;
        return { ...item, status };
      }
      return item;
    });

    if (changed) {
      state.updatedAt = Date.now();
      this.saveState(state);
    }
  }

  /**
   * Returns complete history of images generated for this account.
   */
  getHistory(accountId?: string): ImageGenerationRecord[] {
    return this.getState(accountId).history;
  }

  /**
   * Resets account image usage (for testing, quota renewal, or developer debugging).
   */
  resetImageCap(accountId?: string): void {
    const state: AccountImageCapState = {
      accountId: accountId || 'default_account',
      totalGenerated: 0,
      history: [],
      updatedAt: Date.now(),
    };
    this.saveState(state);
  }

  /**
   * Subscribes to quota changes across tabs and components.
   */
  subscribe(callback: (detail: { remaining: number; totalGenerated: number; maxCap: number }) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        callback(customEvent.detail);
      }
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
    };
  }
}

export const workImageCapService = new WorkImageCapService();
