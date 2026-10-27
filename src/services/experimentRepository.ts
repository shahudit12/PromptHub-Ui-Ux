/**
 * Prompt Experiments Repository
 * Standalone Client-Side Persistence for PromptHub Frontend
 */

export interface PromptExperiment {
  id: string;
  promptId: string;
  userId: string;
  name: string;
  description?: string;
  testInput: Record<string, string>;
  status: 'draft' | 'running' | 'completed' | 'archived';
  winningVariantId?: string;
  createdAt: string;
  updatedAt: string;
  variants: ExperimentVariantRecord[];
}

export interface ExperimentVariantRecord {
  id: string;
  experimentId: string;
  name: string;
  template: string;
  model: string;
  output?: string;
  latencyMs: number;
  tokens: number | null;
  tokensMeasured?: boolean;
  costUsd: number | null;
  creditCost?: number | null;
  qualityScore?: number;
  createdAt: string;
}

const STORAGE_KEY = 'ph_prompt_experiments';

function getStoredExperiments(): PromptExperiment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredExperiments(items: PromptExperiment[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export const experimentRepository = {
  async listExperiments(promptId: string): Promise<PromptExperiment[]> {
    const all = getStoredExperiments();
    return all.filter((exp) => exp.promptId === promptId);
  },

  async saveExperiment(exp: Omit<PromptExperiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromptExperiment> {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const fullVariants: ExperimentVariantRecord[] = exp.variants.map((v) => ({
      ...v,
      id: v.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `var_${Date.now()}`),
      experimentId: newId,
      createdAt: timestamp,
    }));

    const fullExperiment: PromptExperiment = {
      ...exp,
      id: newId,
      createdAt: timestamp,
      updatedAt: timestamp,
      variants: fullVariants,
    };

    const current = getStoredExperiments();
    current.unshift(fullExperiment);
    saveStoredExperiments(current);

    return fullExperiment;
  },

  async setWinningVariant(experimentId: string, winningVariantId: string): Promise<void> {
    const current = getStoredExperiments();
    const target = current.find((e) => e.id === experimentId);
    if (target) {
      target.winningVariantId = winningVariantId;
      target.status = 'completed';
      target.updatedAt = new Date().toISOString();
      saveStoredExperiments(current);
    }
  },
};
