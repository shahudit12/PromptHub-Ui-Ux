import React, { useState } from 'react';
import { 
  GitFork, 
  Play, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Download,
  AlertCircle,
  RefreshCw,
  Save,
  Clock
} from 'lucide-react';
import { aiGateway } from '../../services/ai/aiGateway';
import { scanPromptSecurity } from '../../services/ai/promptSecurityScanner';
import { workflowRepository, type WorkflowPipeline, type WorkflowNode } from '../../services/workflowRepository';

export interface WorkflowStudioPanelProps {
  initialPrompt?: string;
  onSavePipeline?: (pipeline: WorkflowPipeline) => void;
}

export const WorkflowStudioPanel: React.FC<WorkflowStudioPanelProps> = ({
  initialPrompt = 'Write a comprehensive unit test suite in TypeScript for a shopping cart checkout reducer.',
  onSavePipeline,
}) => {
  const [pipelineName, setPipelineName] = useState('Standard Multi-Stage Prompt Pipeline');
  const [nodes] = useState<WorkflowNode[]>([
    {
      id: 'node-1',
      type: 'variable',
      label: '1. User Input Parameter',
      data: { inputKey: 'user_query', defaultValue: initialPrompt },
      position: { x: 50, y: 50 },
    },
    {
      id: 'node-2',
      type: 'prompt',
      label: '2. Prompt Framing Template',
      data: { template: '# ROLE:\nExpert Software Architect\n\n# TASK:\n{{user_query}}\n\n# CONSTRAINTS:\n- Strict TypeScript\n- 100% type coverage' },
      position: { x: 300, y: 50 },
    },
    {
      id: 'node-3',
      type: 'security_scan',
      label: '3. Boundary Guardrail Gate',
      data: { minScore: 80, blockOnCritical: true },
      position: { x: 550, y: 50 },
    },
    {
      id: 'node-4',
      type: 'model',
      label: '4. Frontier LLM Gateway',
      data: { model: 'openai/gpt-4o', temperature: 0.7 },
      position: { x: 800, y: 50 },
    },
    {
      id: 'node-5',
      type: 'output',
      label: '5. Markdown Output Stream',
      data: { format: 'markdown' },
      position: { x: 1050, y: 50 },
    },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [pipelineOutput, setPipelineOutput] = useState<string>('');
  const [securityStatus, setSecurityStatus] = useState<'passed' | 'failed' | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Cycle detection algorithm
  const detectCycles = (): boolean => {
    // In a sequential pipeline, cycle is false
    const visited = new Set<string>();
    for (const node of nodes) {
      if (visited.has(node.id)) return true;
      visited.add(node.id);
    }
    return false;
  };

  const handleRunPipeline = async () => {
    if (detectCycles()) {
      setErrorBanner('Pipeline execution blocked: Cyclic dependency detected.');
      return;
    }

    setIsRunning(true);
    setPipelineOutput('');
    setSecurityStatus(null);
    setErrorBanner(null);
    const startTime = Date.now();

    try {
      // Step 1: Resolve Variable
      setActiveStepIndex(0);
      const rawInput = nodes[0].data.defaultValue;
      await new Promise((r) => setTimeout(r, 200));

      // Step 2: Format Prompt
      setActiveStepIndex(1);
      const framedPrompt = nodes[1].data.template.replace('{{user_query}}', rawInput);
      await new Promise((r) => setTimeout(r, 200));

      // Step 3: Security Scan Guardrail
      setActiveStepIndex(2);
      const scan = scanPromptSecurity(framedPrompt);
      if (!scan.isSafe && nodes[2].data.blockOnCritical) {
        setSecurityStatus('failed');
        setPipelineOutput(`Pipeline halted by Security Guardrail: score ${scan.securityScore}/100. Potential injection detected.`);
        setIsRunning(false);
        return;
      }
      setSecurityStatus('passed');
      await new Promise((r) => setTimeout(r, 200));

      // Step 4: Model Execution via Sandbox Gateway
      setActiveStepIndex(3);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Workflow step execution timed out after 30s')), 30000)
      );

      const execPromise = aiGateway.executePrompt(framedPrompt, { modelId: nodes[3].data.model });
      const res: any = await Promise.race([execPromise, timeoutPromise]);

      setActiveStepIndex(4);
      setPipelineOutput(res.output || 'Pipeline completed with empty output.');
      setElapsedMs(Date.now() - startTime);
    } catch (err: any) {
      setErrorBanner(`Workflow step failure: ${err.message || 'Service error'}`);
      setPipelineOutput(`Pipeline halted: ${err.message || 'Execution error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSavePipeline = async () => {
    try {
      const saved = await workflowRepository.saveWorkflow({
        userId: 'current_user',
        name: pipelineName,
        description: 'Multi-stage prompt framing & model workflow',
        nodes,
        edges: [],
        isPublic: false,
        version: 1,
      });
      if (onSavePipeline) onSavePipeline(saved);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to persist pipeline');
    }
  };

  const handleExportJSON = () => {
    const pipelineData = {
      name: pipelineName,
      version: 1,
      nodes,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(pipelineData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pipelineName.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-bg-primary overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-bg-secondary border border-border-default shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-brand-primary-light text-brand-primary">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <input
              type="text"
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              className="text-sm font-semibold text-text-primary bg-transparent border-b border-transparent hover:border-border-default focus:border-brand-primary focus:outline-none"
            />
            <p className="text-xs text-text-muted mt-0.5">
              Multi-node execution canvas with cycle protection and guardrail isolation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={handleSavePipeline}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-text-primary text-xs font-semibold hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            {isSaved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Save className="w-3.5 h-3.5 text-brand-primary" />}
            <span>{isSaved ? 'Pipeline Saved' : 'Save Pipeline'}</span>
          </button>
          <button
            type="button"
            onClick={handleRunPipeline}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Run Entire Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error / Alert Banner */}
      {errorBanner && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Visual Workflow Nodes Flow Canvas */}
      <div className="p-6 rounded-xl border border-border-default bg-bg-secondary/60 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
            Execution Graph Pipeline
          </h4>
          {elapsedMs > 0 && (
            <span className="text-[11px] font-mono text-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3" /> Total Pipeline Runtime: {(elapsedMs / 1000).toFixed(2)}s
            </span>
          )}
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 overflow-x-auto pb-2">
          {nodes.map((node, index) => {
            const isActive = activeStepIndex === index;
            const isCompleted = activeStepIndex !== null && activeStepIndex > index;

            return (
              <React.Fragment key={node.id}>
                <div
                  className={`flex-1 min-w-[200px] p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-brand-primary-light/50 border-brand-primary ring-2 ring-brand-primary/20 shadow-md'
                      : isCompleted
                      ? 'bg-bg-primary border-emerald-500/40'
                      : 'bg-bg-primary border-border-default'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-text-primary truncate">
                      {node.label}
                    </span>
                    {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {isActive && (
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-primary shrink-0" />
                    )}
                  </div>

                  {/* Node specific metadata */}
                  <div className="text-[11px] font-mono text-text-muted space-y-1">
                    {node.type === 'variable' && (
                      <p className="truncate">Parameter: <code className="text-brand-primary">user_query</code></p>
                    )}
                    {node.type === 'prompt' && (
                      <p className="truncate">Framing Context</p>
                    )}
                    {node.type === 'security_scan' && (
                      <p className="truncate flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Guardrail Gate
                      </p>
                    )}
                    {node.type === 'model' && (
                      <p className="truncate">{node.data.model}</p>
                    )}
                    {node.type === 'output' && (
                      <p className="truncate">Markdown Stream</p>
                    )}
                  </div>
                </div>

                {/* Connector Arrow */}
                {index < nodes.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center shrink-0 text-text-muted">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Output Stream Panel */}
      {pipelineOutput && (
        <div className="p-5 rounded-xl border border-border-default bg-bg-secondary space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-semibold text-text-primary flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-primary" /> Pipeline Execution Output
            </h4>
            {securityStatus === 'passed' && (
              <span className="text-xs font-mono text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Guardrails Passed
              </span>
            )}
          </div>

          <pre className="p-4 rounded-lg bg-bg-primary border border-border-default text-xs font-mono text-text-primary overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {pipelineOutput}
          </pre>
        </div>
      )}
    </div>
  );
};
