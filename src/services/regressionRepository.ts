/**
 * Prompt Regression Test Suites Repository
 * Standalone Client-Side Persistence for PromptHub Frontend
 */

export interface RegressionSuite {
  id: string;
  promptId: string;
  userId: string;
  name: string;
  description?: string;
  baselineVersionNumber?: number;
  createdAt: string;
  updatedAt: string;
  testCases: RegressionTestCaseRecord[];
}

export interface RegressionTestCaseRecord {
  id: string;
  suiteId: string;
  name: string;
  inputVariables: Record<string, string>;
  expectedContains?: string;
  expectedNotContains?: string;
  status: 'passed' | 'failed' | 'regression' | 'untested';
  lastOutput?: string;
  lastLatencyMs: number;
  lastRunAt?: string;
  createdAt: string;
}

const STORAGE_KEY = 'ph_prompt_regression_suites';

function getStoredSuites(): RegressionSuite[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredSuites(items: RegressionSuite[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export const regressionRepository = {
  async listSuites(promptId: string): Promise<RegressionSuite[]> {
    const all = getStoredSuites();
    return all.filter((s) => s.promptId === promptId);
  },

  async saveSuite(suite: Omit<RegressionSuite, 'id' | 'createdAt' | 'updatedAt'>): Promise<RegressionSuite> {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `suite_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const fullTestCases: RegressionTestCaseRecord[] = suite.testCases.map((tc) => ({
      ...tc,
      id: tc.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tc_${Date.now()}`),
      suiteId: newId,
      createdAt: timestamp,
    }));

    const created: RegressionSuite = {
      ...suite,
      id: newId,
      createdAt: timestamp,
      updatedAt: timestamp,
      testCases: fullTestCases,
    };

    const current = getStoredSuites();
    current.unshift(created);
    saveStoredSuites(current);

    return created;
  },

  async updateTestCaseResult(
    testCaseId: string,
    status: RegressionTestCaseRecord['status'],
    output: string,
    latencyMs: number
  ): Promise<void> {
    const current = getStoredSuites();
    for (const suite of current) {
      const tc = suite.testCases.find((c) => c.id === testCaseId);
      if (tc) {
        tc.status = status;
        tc.lastOutput = output;
        tc.lastLatencyMs = latencyMs;
        tc.lastRunAt = new Date().toISOString();
        suite.updatedAt = new Date().toISOString();
        saveStoredSuites(current);
        return;
      }
    }
  },
};
