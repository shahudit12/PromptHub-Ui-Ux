/**
 * src/services/draftPersistenceService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Resilient Prompt Draft & Workspace Persistence Engine for PromptHub.
 *
 * Guarantees that:
 * 1. Prompt drafts (title, description, template text, variables, model) are
 *    NEVER deleted on page refresh or browser restart.
 * 2. Analyzer findings and input text persist across tab switches and refreshes.
 * 3. All temporary drafts are removed ONLY when the user explicitly logs out or
 *    explicitly discards/resets their draft.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface WorkspaceDraftState {
  title: string;
  description: string;
  rawContent: string;
  category: string;
  tagsText: string;
  model: string;
  selectionMode?: string;
  visibility: 'public' | 'private';
  variableValues?: Record<string, string>;
  activePromptId?: string | null;
  lastUpdatedAt: number;
}

export interface AnalyzerDraftState {
  promptText: string;
  results?: any | null;
  activeResultTab?: string;
  sandboxVals?: Record<string, string>;
  selectionMode?: string;
  selectedModel?: string;
  lastUpdatedAt: number;
}

export interface CreatePromptDraftState {
  title: string;
  description: string;
  rawContent: string;
  category: string;
  tags: string[];
  isPrivate: boolean;
  priceCredits: number;
  lastUpdatedAt: number;
}

const STORAGE_KEYS = {
  WORKSPACE_DRAFT: 'ph_workspace_active_draft_v1',
  ANALYZER_DRAFT: 'ph_analyzer_active_draft_v1',
  CREATE_PROMPT_DRAFT: 'ph_create_prompt_draft_v1',
} as const;

export const draftPersistenceService = {
  // ─── WORKSPACE DRAFTS ───────────────────────────────────────────────────────
  saveWorkspaceDraft(draft: Partial<WorkspaceDraftState>): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const existing: Partial<WorkspaceDraftState> = this.getWorkspaceDraft() || {};
      const updated: WorkspaceDraftState = {
        title: draft.title !== undefined ? draft.title : existing.title || '',
        description: draft.description !== undefined ? draft.description : existing.description || '',
        rawContent: draft.rawContent !== undefined ? draft.rawContent : existing.rawContent || '',
        category: draft.category !== undefined ? draft.category : existing.category || 'Development',
        tagsText: draft.tagsText !== undefined ? draft.tagsText : existing.tagsText || '',
        model: draft.model !== undefined ? draft.model : existing.model || '',
        selectionMode: draft.selectionMode !== undefined ? draft.selectionMode : existing.selectionMode || 'automatic',
        visibility: draft.visibility !== undefined ? draft.visibility : existing.visibility || 'private',
        variableValues: draft.variableValues !== undefined ? draft.variableValues : existing.variableValues || {},
        activePromptId: draft.activePromptId !== undefined ? draft.activePromptId : existing.activePromptId || null,
        lastUpdatedAt: Date.now(),
      };

      if (updated.rawContent.trim() || (updated.title.trim() && updated.title !== 'Untitled Prompt') || updated.description.trim() || updated.activePromptId) {
        localStorage.setItem(STORAGE_KEYS.WORKSPACE_DRAFT, JSON.stringify(updated));
      } else {
        localStorage.removeItem(STORAGE_KEYS.WORKSPACE_DRAFT);
      }
    } catch (err) {
      console.warn('[DraftPersistence] Failed to save workspace draft:', err);
    }
  },

  getWorkspaceDraft(): WorkspaceDraftState | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WORKSPACE_DRAFT);
      if (!raw) return null;
      return JSON.parse(raw) as WorkspaceDraftState;
    } catch {
      return null;
    }
  },

  clearWorkspaceDraft(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.WORKSPACE_DRAFT);
    } catch {}
  },

  // ─── ANALYZER DRAFTS ────────────────────────────────────────────────────────
  saveAnalyzerDraft(draft: Partial<AnalyzerDraftState>): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const existing: Partial<AnalyzerDraftState> = this.getAnalyzerDraft() || {};
      const updated: AnalyzerDraftState = {
        promptText: draft.promptText !== undefined ? draft.promptText : existing.promptText || '',
        results: draft.results !== undefined ? draft.results : existing.results || null,
        activeResultTab: draft.activeResultTab !== undefined ? draft.activeResultTab : existing.activeResultTab || 'report',
        sandboxVals: draft.sandboxVals !== undefined ? draft.sandboxVals : existing.sandboxVals || {},
        selectionMode: draft.selectionMode !== undefined ? draft.selectionMode : existing.selectionMode || 'automatic',
        selectedModel: draft.selectedModel !== undefined ? draft.selectedModel : existing.selectedModel || '',
        lastUpdatedAt: Date.now(),
      };

      localStorage.setItem(STORAGE_KEYS.ANALYZER_DRAFT, JSON.stringify(updated));
    } catch (err) {
      console.warn('[DraftPersistence] Failed to save analyzer draft:', err);
    }
  },

  getAnalyzerDraft(): AnalyzerDraftState | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ANALYZER_DRAFT);
      if (!raw) return null;
      return JSON.parse(raw) as AnalyzerDraftState;
    } catch {
      return null;
    }
  },

  clearAnalyzerDraft(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.ANALYZER_DRAFT);
    } catch {}
  },

  // ─── CREATE PROMPT DRAFTS ───────────────────────────────────────────────────
  saveCreatePromptDraft(draft: Partial<CreatePromptDraftState>): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const existing: Partial<CreatePromptDraftState> = this.getCreatePromptDraft() || {};
      const updated: CreatePromptDraftState = {
        title: draft.title !== undefined ? draft.title : existing.title || '',
        description: draft.description !== undefined ? draft.description : existing.description || '',
        rawContent: draft.rawContent !== undefined ? draft.rawContent : existing.rawContent || '',
        category: draft.category !== undefined ? draft.category : existing.category || 'Development',
        tags: draft.tags !== undefined ? draft.tags : existing.tags || [],
        isPrivate: draft.isPrivate !== undefined ? draft.isPrivate : existing.isPrivate ?? false,
        priceCredits: draft.priceCredits !== undefined ? draft.priceCredits : existing.priceCredits || 0,
        lastUpdatedAt: Date.now(),
      };
      if (updated.title.trim() || updated.rawContent.trim()) {
        localStorage.setItem(STORAGE_KEYS.CREATE_PROMPT_DRAFT, JSON.stringify(updated));
      }
    } catch {}
  },

  getCreatePromptDraft(): CreatePromptDraftState | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CREATE_PROMPT_DRAFT);
      if (!raw) return null;
      return JSON.parse(raw) as CreatePromptDraftState;
    } catch {
      return null;
    }
  },

  clearCreatePromptDraft(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.CREATE_PROMPT_DRAFT);
    } catch {}
  },

  // ─── LOGOUT PURGE ───────────────────────────────────────────────────────────
  clearAllDraftsOnLogout(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.WORKSPACE_DRAFT);
      localStorage.removeItem(STORAGE_KEYS.ANALYZER_DRAFT);
      localStorage.removeItem(STORAGE_KEYS.CREATE_PROMPT_DRAFT);
      localStorage.removeItem('ph_create_prompt_draft');
      localStorage.removeItem('prompthub_analyzer_session_v2');
      sessionStorage.removeItem('prompthub_analyzer_session_v2');
      sessionStorage.removeItem('ph_ide_selected_model');
    } catch {}
  },
};
