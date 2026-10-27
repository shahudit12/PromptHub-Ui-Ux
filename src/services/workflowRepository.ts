/**
 * Visual Workflow Pipelines Repository
 * Standalone Client-Side Persistence for PromptHub Frontend
 */

export interface WorkflowNode {
  id: string;
  type: 'prompt' | 'model' | 'variable' | 'condition' | 'evaluator' | 'security_scan' | 'output';
  label: string;
  data: Record<string, any>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowPipeline {
  id: string;
  userId: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isPublic: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'ph_workflow_pipelines';

function getStoredWorkflows(): WorkflowPipeline[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredWorkflows(items: WorkflowPipeline[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export const workflowRepository = {
  async listWorkflows(userId?: string): Promise<WorkflowPipeline[]> {
    const all = getStoredWorkflows();
    if (!userId) {
      return all.filter((w) => w.isPublic);
    }
    return all.filter((w) => w.userId === userId || w.isPublic);
  },

  async saveWorkflow(wf: Omit<WorkflowPipeline, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowPipeline> {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `wf_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const created: WorkflowPipeline = {
      ...wf,
      id: newId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const current = getStoredWorkflows();
    current.unshift(created);
    saveStoredWorkflows(current);

    return created;
  },
};
