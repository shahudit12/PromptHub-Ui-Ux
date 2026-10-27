import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Play, 
  Plus, 
  Trash2, 
  Clock, 
  AlertTriangle,
  FileCheck2
} from 'lucide-react';
import { aiGateway } from '../../services/ai/aiGateway';
import { renderPromptTemplate } from '../../services/ai/variableEngine';
import { 
  regressionRepository, 
  type RegressionTestCaseRecord 
} from '../../services/regressionRepository';

export interface RegressionTestPanelProps {
  promptId?: string;
  promptTemplate: string;
  variables?: string[];
}

export const RegressionTestPanel: React.FC<RegressionTestPanelProps> = ({
  promptId,
  promptTemplate,
  variables = [],
}) => {
  const [testCases, setTestCases] = useState<RegressionTestCaseRecord[]>([
    {
      id: 'tc-1',
      suiteId: '',
      name: 'TC-01: Valid Technical Response',
      inputVariables: variables.reduce((acc, v) => ({ ...acc, [v]: `Sample test input for ${v}` }), {}),
      expectedContains: '',
      expectedNotContains: 'undefined',
      status: 'untested',
      lastLatencyMs: 0,
      createdAt: new Date().toISOString(),
    },
  ]);

  const [isRunningAll, setIsRunningAll] = useState(false);

  // Load existing persistent suites if promptId is provided
  useEffect(() => {
    if (promptId) {
      regressionRepository.listSuites(promptId).then((res) => {
        if (res.length > 0 && res[0].testCases.length > 0) {
          setTestCases(res[0].testCases);
        }
      });
    }
  }, [promptId]);

  const handleAddTestCase = () => {
    const num = testCases.length + 1;
    setTestCases((prev) => [
      ...prev,
      {
        id: `tc-${num}`,
        suiteId: '',
        name: `TC-0${num}: Test Case Scenario`,
        inputVariables: variables.reduce((acc, v) => ({ ...acc, [v]: '' }), {}),
        expectedContains: '',
        expectedNotContains: '',
        status: 'untested',
        lastLatencyMs: 0,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleRemoveTestCase = (id: string) => {
    if (testCases.length <= 1) return;
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
  };

  const handleRunTestCase = async (id: string) => {
    const tc = testCases.find((t) => t.id === id);
    if (!tc) return;

    const start = Date.now();
    try {
      const rendered = renderPromptTemplate(promptTemplate, tc.inputVariables);
      const res = await aiGateway.executePrompt(rendered, { modelId: 'openai/gpt-4o' });
      const output = res.output || '';
      const elapsed = Date.now() - start;

      let status: RegressionTestCaseRecord['status'] = 'passed';

      if (tc.expectedContains && !output.toLowerCase().includes(tc.expectedContains.toLowerCase())) {
        status = 'failed';
      }
      if (tc.expectedNotContains && output.toLowerCase().includes(tc.expectedNotContains.toLowerCase())) {
        status = 'regression';
      }

      setTestCases((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                lastOutput: output,
                lastLatencyMs: elapsed,
                lastRunAt: new Date().toISOString(),
              }
            : t
        )
      );
    } catch (err: any) {
      setTestCases((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status: 'failed',
                lastOutput: `Execution error: ${err.message || 'Unknown error'}`,
                lastLatencyMs: Date.now() - start,
                lastRunAt: new Date().toISOString(),
              }
            : t
        )
      );
    }
  };

  const handleRunAll = async () => {
    setIsRunningAll(true);
    for (const tc of testCases) {
      await handleRunTestCase(tc.id);
    }
    setIsRunningAll(false);

    if (promptId) {
      await regressionRepository.saveSuite({
        promptId,
        userId: 'current_user',
        name: `Regression Suite (${new Date().toLocaleDateString()})`,
        description: 'Automated assertion regression suite',
        baselineVersionNumber: 1,
        testCases,
      });
    }
  };

  const passedCount = testCases.filter((tc) => tc.status === 'passed').length;
  const failedCount = testCases.filter((tc) => tc.status === 'failed' || tc.status === 'regression').length;

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-bg-primary overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-bg-secondary border border-border-default shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-brand-primary-light text-brand-primary">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Prompt Regression & Assertion Test Lab</h3>
            <p className="text-xs text-text-muted">
              Define input variables and assertions (contains / not contains) to detect prompt regressions across versions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {testCases.some((t) => t.status !== 'untested') && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <CheckCircle className="w-3.5 h-3.5" /> {passedCount} Pass
              </span>
              <span className="flex items-center gap-1 text-red-700 font-bold">
                <XCircle className="w-3.5 h-3.5" /> {failedCount} Fail
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleAddTestCase}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Test Case</span>
          </button>
          <button
            type="button"
            onClick={handleRunAll}
            disabled={isRunningAll || testCases.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isRunningAll ? 'Running Tests...' : 'Run All Test Cases'}</span>
          </button>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="space-y-4">
        {testCases.map((tc) => {
          return (
            <div
              key={tc.id}
              className={`p-4 rounded-xl border bg-bg-secondary space-y-3 shadow-sm transition-all ${
                tc.status === 'passed'
                  ? 'border-emerald-500/40'
                  : tc.status === 'failed' || tc.status === 'regression'
                  ? 'border-red-500/40'
                  : 'border-border-default'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {tc.status === 'passed' && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {tc.status === 'failed' && <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
                  {tc.status === 'regression' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                  {tc.status === 'untested' && <div className="w-2 h-2 rounded-full bg-border-default" />}
                  <input
                    type="text"
                    value={tc.name}
                    onChange={(e) =>
                      setTestCases((prev) =>
                        prev.map((t) => (t.id === tc.id ? { ...t, name: e.target.value } : t))
                      )
                    }
                    className="text-xs font-mono font-bold text-text-primary bg-transparent focus:outline-none focus:border-b focus:border-brand-primary px-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {tc.lastLatencyMs > 0 && (
                    <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {(tc.lastLatencyMs / 1000).toFixed(2)}s
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRunTestCase(tc.id)}
                    className="px-2.5 py-1 rounded bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary text-[11px] font-mono font-medium transition-colors cursor-pointer"
                  >
                    Run Test
                  </button>
                  {testCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTestCase(tc.id)}
                      className="p-1 text-text-muted hover:text-danger rounded transition-colors"
                      title="Remove test case"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Assertions & Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-mono text-text-muted block mb-1">
                    Assertion: Output MUST Contain (Substring)
                  </label>
                  <input
                    type="text"
                    value={tc.expectedContains || ''}
                    onChange={(e) =>
                      setTestCases((prev) =>
                        prev.map((t) => (t.id === tc.id ? { ...t, expectedContains: e.target.value } : t))
                      )
                    }
                    placeholder="e.g. ```typescript, 200 OK, SUCCESS"
                    className="w-full text-xs font-mono px-3 py-1.5 rounded-lg bg-bg-primary border border-border-default text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-text-muted block mb-1">
                    Assertion: Output MUST NOT Contain (Anti-Regression)
                  </label>
                  <input
                    type="text"
                    value={tc.expectedNotContains || ''}
                    onChange={(e) =>
                      setTestCases((prev) =>
                        prev.map((t) => (t.id === tc.id ? { ...t, expectedNotContains: e.target.value } : t))
                      )
                    }
                    placeholder="e.g. error, undefined, [object Object]"
                    className="w-full text-xs font-mono px-3 py-1.5 rounded-lg bg-bg-primary border border-border-default text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Output Preview */}
              {tc.lastOutput && (
                <div className="pt-2 border-t border-border-default">
                  <span className="text-[10px] font-mono text-text-muted block mb-1">Last Run Output:</span>
                  <div className="p-3 rounded-lg bg-bg-primary border border-border-default text-xs font-mono text-text-secondary max-h-32 overflow-y-auto">
                    {tc.lastOutput}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
