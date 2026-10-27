import React, { useState } from 'react';
import { 
  Sparkles, 
  Play, 
  Users, 
  User, 
  Cpu, 
  Sliders, 
  FileCode, 
  CheckCircle,
  Loader2
} from 'lucide-react';
import type { WorkTaskPriority, WorkExecutionMode } from '../../types/work';
import { workToolRegistry } from '../../services/work/workToolRegistry';
import { AVAILABLE_FREE_MODELS } from '../../views/WorkView';

interface WorkTaskComposerProps {
  projectId: string;
  isSubmitting?: boolean;
  onLaunchTask: (data: {
    title: string;
    description: string;
    model: string;
    provider: string;
    priority: WorkTaskPriority;
    executionMode: WorkExecutionMode;
  }) => Promise<void>;
}

const TEMPLATE_SUGGESTIONS = [
  {
    title: 'Create hello-world page and run build',
    desc: 'Create src/pages/HelloWorld.tsx, execute npm run build to verify zero errors, and output an implementation report.',
  },
  {
    title: 'Implement responsive navbar component',
    desc: 'Build accessible navbar with desktop and mobile drawers, adhering to 44px touch targets.',
  },
  {
    title: 'Run automated security and dependency audit',
    desc: 'Audit virtual workspace for unsafe patterns, vulnerable dependencies, and policy violations.',
  },
];

export const WorkTaskComposer: React.FC<WorkTaskComposerProps> = ({
  isSubmitting = false,
  onLaunchTask,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState(AVAILABLE_FREE_MODELS[0].id);
  const [executionMode, setExecutionMode] = useState<WorkExecutionMode>('single_agent');
  const [priority, setPriority] = useState<WorkTaskPriority>('medium');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedNotice, setOptimizedNotice] = useState<string | null>(null);

  const handleApplyTemplate = (tpl: typeof TEMPLATE_SUGGESTIONS[0]) => {
    setTitle(tpl.title);
    setDescription(tpl.desc);
  };

  const handleOptimizePrompt = async () => {
    if (!title.trim() && !description.trim()) return;
    setIsOptimizing(true);
    setOptimizedNotice(null);
    try {
      const tool = workToolRegistry.getTool('optimize_task_prompt');
      if (tool) {
        const dummyCtx: any = {
          taskId: 't_opt',
          projectId: 'p_opt',
          worktreeId: 'wt_opt',
          agentId: 'ag_opt',
          permissions: 'developer',
          filesStore: new Map(),
        };
        const res = await tool.execute({
          rawTaskPrompt: `${title}\n\n${description}`.trim(),
          domain: 'software_engineering',
        }, dummyCtx);

        if (res?.optimizedPrompt) {
          setDescription(res.optimizedPrompt);
          setOptimizedNotice(`Enhanced task specification with ${res.acceptanceCriteria?.length || 3} automated acceptance criteria.`);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    const selectedModelObj = AVAILABLE_FREE_MODELS.find((m) => m.id === model) || AVAILABLE_FREE_MODELS[0];

    await onLaunchTask({
      title: title.trim(),
      description: description.trim(),
      model: selectedModelObj.id,
      provider: selectedModelObj.provider,
      priority,
      executionMode,
    });

    setTitle('');
    setDescription('');
    setOptimizedNotice(null);
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-primary-light flex items-center justify-center text-brand-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary tracking-tight">New Agent Task</h2>
            <p className="text-xs text-text-muted">Launch autonomous development &amp; work agents</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-bg-tertiary p-1 rounded-lg border border-border-subtle">
          <button
            type="button"
            onClick={() => setExecutionMode('single_agent')}
            className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1.5 ${
              executionMode === 'single_agent'
                ? 'bg-bg-secondary text-text-primary shadow-2xs font-semibold'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Single Agent</span>
          </button>
          <button
            type="button"
            onClick={() => setExecutionMode('orchestrated_team')}
            className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1.5 ${
              executionMode === 'orchestrated_team'
                ? 'bg-bg-secondary text-brand-primary shadow-2xs font-semibold'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Agent Team</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-brand-primary/10 text-brand-primary font-mono">4</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label htmlFor="task-title" className="block text-xs font-medium text-text-secondary mb-1">
            Task Title or Objective
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Build responsive hello-world page with build verification"
            required
            className="w-full min-h-[44px] sm:min-h-[38px] px-3 rounded-lg border border-border-default bg-bg-primary text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all placeholder:text-text-muted"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="task-description" className="block text-xs font-medium text-text-secondary">
              Detailed Instructions &amp; Constraints (Optional)
            </label>
            <button
              type="button"
              onClick={handleOptimizePrompt}
              disabled={isOptimizing || (!title.trim() && !description.trim())}
              className="text-xs font-medium text-brand-primary hover:text-brand-primary-hi flex items-center gap-1 transition-colors disabled:opacity-40 cursor-pointer min-h-[36px] sm:min-h-[28px] px-2 rounded-md hover:bg-brand-primary-light/50"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Optimizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span>Optimize Task Prompt</span>
                </>
              )}
            </button>
          </div>
          <textarea
            id="task-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Specify target files, dependencies, acceptance criteria, or design constraints..."
            className="w-full p-3 rounded-lg border border-border-default bg-bg-primary text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all placeholder:text-text-muted resize-y"
          />
          {optimizedNotice && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-brand-primary">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{optimizedNotice}</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-mono text-text-muted mr-1">Quick Suggestions:</span>
          {TEMPLATE_SUGGESTIONS.map((tpl, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleApplyTemplate(tpl)}
              className="min-h-[36px] sm:min-h-[26px] px-2.5 py-0.5 rounded-md border border-border-subtle bg-bg-primary hover:bg-bg-tertiary hover:border-border-default text-text-secondary text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <FileCode className="w-3 h-3 text-text-muted" />
              <span>{tpl.title}</span>
            </button>
          ))}
        </div>

        {/* Controls Bar: Model & Priority & Submit */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border-subtle">
          <div className="flex flex-wrap items-center gap-2">
            {/* Model Selector */}
            <div className="flex items-center gap-1.5 bg-bg-primary border border-border-default rounded-lg px-2.5 py-1 min-h-[44px] sm:min-h-[36px]">
              <Cpu className="w-3.5 h-3.5 text-text-muted" />
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                aria-label="Select AI Model"
                className="bg-transparent text-xs text-text-primary focus:outline-none cursor-pointer font-medium min-h-[44px] sm:min-h-0"
              >
                {AVAILABLE_FREE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Selector */}
            <div className="flex items-center gap-1.5 bg-bg-primary border border-border-default rounded-lg px-2.5 py-1">
              <Sliders className="w-3.5 h-3.5 text-text-muted" />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkTaskPriority)}
                aria-label="Select Priority"
                className="bg-transparent text-xs text-text-primary focus:outline-none cursor-pointer capitalize font-medium"
              >
                <option value="low">Priority: Low</option>
                <option value="medium">Priority: Medium</option>
                <option value="high">Priority: High</option>
                <option value="urgent">Priority: Urgent</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="min-h-[44px] sm:min-h-[38px] px-5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Launching Agents...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Task</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
