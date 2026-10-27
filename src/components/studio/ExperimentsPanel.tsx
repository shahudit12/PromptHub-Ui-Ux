import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Play, 
  Plus, 
  Trash2, 
  Clock, 
  Coins, 
  Hash, 
  Trophy, 
  ArrowUpRight, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { aiGateway } from '../../services/ai/aiGateway';
import { 
  experimentRepository, 
  type PromptExperiment, 
  type ExperimentVariantRecord 
} from '../../services/experimentRepository';

export interface ExperimentsPanelProps {
  promptId?: string;
  basePrompt: string;
  onApplyVariant: (template: string) => void;
  onPromoteWinner?: (template: string, variantName: string) => void;
}

export const ExperimentsPanel: React.FC<ExperimentsPanelProps> = ({
  promptId,
  basePrompt,
  onApplyVariant,
  onPromoteWinner,
}) => {
  const [variants, setVariants] = useState<ExperimentVariantRecord[]>([
    {
      id: 'var-a',
      experimentId: '',
      name: 'Variant A (Baseline)',
      template: basePrompt,
      model: 'openai/gpt-4o',
      output: '',
      latencyMs: 0,
      tokens: null,
      tokensMeasured: false,
      costUsd: null,
      creditCost: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'var-b',
      experimentId: '',
      name: 'Variant B (Concise Constraints)',
      template: `${basePrompt.trim()}\n\n# CONSTRAINTS:\n- Be extremely concise.\n- Return bullet points only.`,
      model: 'openai/gpt-4o',
      output: '',
      latencyMs: 0,
      tokens: null,
      tokensMeasured: false,
      costUsd: null,
      creditCost: null,
      createdAt: new Date().toISOString(),
    },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [winningVariantId, setWinningVariantId] = useState<string | null>(null);
  const [savedExperiments, setSavedExperiments] = useState<PromptExperiment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeExperimentId, setActiveExperimentId] = useState<string | null>(null);

  // Load existing persistent experiments from Supabase if promptId is provided
  useEffect(() => {
    if (promptId) {
      setErrorMessage(null);
      experimentRepository
        .listExperiments(promptId)
        .then((res) => {
          setSavedExperiments(res);
        })
        .catch((err) => {
          setErrorMessage(err.message || 'Failed to load experiments from database');
        });
    }
  }, [promptId]);

  const handleAddVariant = () => {
    const nextLetter = String.fromCharCode(65 + variants.length);
    setVariants((prev) => [
      ...prev,
      {
        id: `var-${nextLetter.toLowerCase()}`,
        experimentId: '',
        name: `Variant ${nextLetter}`,
        template: basePrompt,
        model: 'openai/gpt-4o',
        output: '',
        latencyMs: 0,
        tokens: null,
        tokensMeasured: false,
        costUsd: null,
        creditCost: null,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleRemoveVariant = (id: string) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleTemplateChange = (id: string, template: string) => {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, template } : v)));
  };

  const handleRunAll = async () => {
    setIsRunning(true);
    setErrorMessage(null);
    const updatedVariants = [...variants];

    for (let i = 0; i < updatedVariants.length; i++) {
      const v = updatedVariants[i];
      const start = Date.now();
      try {
        const res = await aiGateway.executePrompt(v.template, { modelId: v.model });
        const elapsed = Date.now() - start;
        updatedVariants[i] = {
          ...v,
          output: res.output || 'Completed with empty response.',
          latencyMs: elapsed,
          // Only the provider's own usage figure is recorded. The previous
          // `|| Math.ceil(v.template.length / 4) + 120` presented a character count
          // divided by four as a token measurement, and the flat `0.0004` USD below
          // it was invented outright for every run the gateway did not price.
          tokens: res.usageMeasured && typeof res.usage?.totalTokens === 'number' ? res.usage.totalTokens : null,
          tokensMeasured: res.usageMeasured === true && typeof res.usage?.totalTokens === 'number',
          costUsd: null,
          creditCost: res.creditCost,
        };
      } catch (err: any) {
        updatedVariants[i] = {
          ...v,
          output: `Error: ${err.message || 'Execution failed'}`,
          latencyMs: Date.now() - start,
          tokens: null,
          tokensMeasured: false,
          costUsd: null,
          creditCost: null,
        };
      }
    }

    setVariants(updatedVariants);
    setIsRunning(false);

    // Persist experiment run directly to Supabase if promptId is present
    if (promptId) {
      try {
        const saved = await experimentRepository.saveExperiment({
          promptId,
          userId: 'current_user',
          name: `A/B Run (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
          description: 'Multi-variant prompt performance comparison',
          testInput: {},
          status: 'completed',
          winningVariantId: winningVariantId || undefined,
          variants: updatedVariants,
        });
        setActiveExperimentId(saved.id);
        const list = await experimentRepository.listExperiments(promptId);
        setSavedExperiments(list);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to save experiment to database');
      }
    }
  };

  const handleSelectWinner = async (variant: ExperimentVariantRecord) => {
    setWinningVariantId(variant.id);
    onApplyVariant(variant.template);

    if (activeExperimentId) {
      try {
        await experimentRepository.setWinningVariant(activeExperimentId, variant.id);
      } catch {
        /* ignore */
      }
    }
  };

  const handlePromoteWinner = (variant: ExperimentVariantRecord) => {
    if (onPromoteWinner) {
      onPromoteWinner(variant.template, variant.name);
    } else {
      onApplyVariant(variant.template);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-bg-primary overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-bg-secondary border border-border-default shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-brand-primary-light text-brand-primary">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Prompt A/B & Multi-Variant Experiments</h3>
            <p className="text-xs text-text-muted">
              Test multiple prompt formulations against identical inputs to measure quality, tokens, and cost.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleAddVariant}
            disabled={variants.length >= 4}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Variant</span>
          </button>
          <button
            type="button"
            onClick={handleRunAll}
            disabled={isRunning || variants.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Variants...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Run All Variants</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Database Error Banner if any */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Variants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {variants.map((v, index) => {
          const isWinner = winningVariantId === v.id;
          return (
            <div
              key={v.id}
              className={`flex flex-col rounded-xl border bg-bg-secondary p-4 space-y-3 shadow-sm transition-all ${
                isWinner ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-border-default'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-text-primary flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-brand-primary-light text-brand-primary text-[10px] font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  {v.name}
                </span>

                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(v.id)}
                    className="p-1 text-text-muted hover:text-danger rounded transition-colors"
                    title="Remove variant"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Template Textarea */}
              <textarea
                value={v.template}
                onChange={(e) => handleTemplateChange(v.id, e.target.value)}
                placeholder="Enter prompt variant template..."
                rows={4}
                className="w-full text-xs font-mono p-3 rounded-lg bg-bg-primary border border-border-default text-text-primary focus:outline-none focus:border-brand-primary resize-none"
              />

              {/* Output Preview */}
              {v.output && (
                <div className="space-y-2 pt-2 border-t border-border-default">
                  <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {(v.latencyMs / 1000).toFixed(2)}s
                    </span>
                    {v.tokensMeasured && v.tokens !== null ? (
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" /> {v.tokens} tok
                      </span>
                    ) : (
                      <span
                        className="flex items-center gap-1 opacity-60"
                        title="The provider did not report token usage for this run."
                      >
                        <Hash className="w-3 h-3" /> tokens n/a
                      </span>
                    )}
                    {typeof v.creditCost === 'number' ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold">
                        <Coins className="w-3 h-3 text-emerald-600" /> {v.creditCost} credits
                      </span>
                    ) : (
                      <span
                        className="flex items-center gap-1 opacity-60"
                        title="The gateway did not confirm a settled charge for this run. This panel used to display a hardcoded 1 credit here for every variant."
                      >
                        <Coins className="w-3 h-3" /> cost pending
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-bg-primary border border-border-default text-xs font-mono text-text-secondary max-h-36 overflow-y-auto">
                    {v.output}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSelectWinner(v)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isWinner
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary hover:border-emerald-500/40'
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isWinner ? 'Winner Selected' : 'Choose Winner'}</span>
                    </button>

                    {isWinner && (
                      <button
                        type="button"
                        onClick={() => handlePromoteWinner(v)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors cursor-pointer shadow-sm"
                        title="Promote winning variant to a new version in database"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Promote as New Version</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Historical Experiments Persistence Drawer/List */}
      {savedExperiments.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border-default">
          <h4 className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
            Persisted Database Experiments ({savedExperiments.length})
          </h4>

          <div className="space-y-2">
            {savedExperiments.map((exp) => (
              <div
                key={exp.id}
                className="p-3.5 rounded-xl border border-border-default bg-bg-secondary flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-semibold text-text-primary">{exp.name}</p>
                  <p className="text-[11px] text-text-muted">
                    {exp.variants?.length || 0} variants tested • {new Date(exp.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 font-medium">
                  {exp.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
