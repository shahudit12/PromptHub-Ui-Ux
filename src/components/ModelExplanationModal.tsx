import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Cpu, 
  Layers, 
  Calculator, 
  Sliders, 
  BookOpen,
  HelpCircle,
  Coins
} from 'lucide-react';
import { FALLBACK_CATALOG } from '../services/modelCatalogService';
import type { CatalogModel } from '../services/modelCatalogService';

export interface ModelExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ScenarioPreset = {
  name: string;
  desc: string;
  input: number;
  output: number;
  icon: string;
};

const SCENARIOS: ScenarioPreset[] = [
  {
    name: 'Short Question / Chat',
    desc: 'Quick everyday question or rewrite',
    input: 250,
    output: 250,
    icon: '💬',
  },
  {
    name: 'Full Blog Post / Essay',
    desc: 'Long-form content generation',
    input: 800,
    output: 1500,
    icon: '📝',
  },
  {
    name: 'Code Function & Unit Tests',
    desc: 'React component or API endpoint with tests',
    input: 2500,
    output: 2000,
    icon: '⚡',
  },
  {
    name: 'Full Document / PDF Audit',
    desc: 'Analyzing entire PDF or multiple files',
    input: 20000,
    output: 2000,
    icon: '📚',
  },
];

export const ModelExplanationModal: React.FC<ModelExplanationModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'catalog' | 'parameters' | 'engineering'>('calculator');
  const [selectedModel, setSelectedModel] = useState<CatalogModel>(FALLBACK_CATALOG[0]);

  const [tempValue, setTempValue] = useState<number>(0.7);
  const [topPValue, setTopPValue] = useState<number>(0.9);

  const [inputTokens, setInputTokens] = useState<number>(1000);
  const [outputTokens, setOutputTokens] = useState<number>(500);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  if (!isOpen) return null;

  const calculateModelCost = (model: CatalogModel, inTokens = inputTokens, outTokens = outputTokens) => {
    const promptCost = (inTokens / 1_000_000) * model.pricing.prompt;
    const completionCost = (outTokens / 1_000_000) * model.pricing.completion;
    const total = promptCost + completionCost;
    if (total < 0.00001) return '< $0.00001';
    if (total < 0.01) return `$${total.toFixed(5)}`;
    return `$${total.toFixed(4)}`;
  };

  const calculateHundredCost = (model: CatalogModel, inTokens = inputTokens, outTokens = outputTokens) => {
    const promptCost = (inTokens / 1_000_000) * model.pricing.prompt;
    const completionCost = (outTokens / 1_000_000) * model.pricing.completion;
    const totalHundred = (promptCost + completionCost) * 100;
    if (totalHundred < 0.01) return `$${totalHundred.toFixed(4)}`;
    return `$${totalHundred.toFixed(2)}`;
  };

  const applyPreset = (preset: ScenarioPreset) => {
    setInputTokens(preset.input);
    setOutputTokens(preset.output);
    setActivePreset(preset.name);
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-4xl bg-bg-secondary border border-border-default rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left text-text-primary"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default bg-bg-tertiary">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-primary-light text-brand-primary border border-brand-primary/20 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-text-primary">
                  AI Model &amp; Token Cost Guide
                </h2>
                <p className="text-xs text-text-secondary">
                  Clear reference on model capabilities, token pricing, and prompting standards.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-border-subtle text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 bg-bg-tertiary border-b border-border-default overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer shrink-0 ${
                activeTab === 'calculator'
                  ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs border border-border-default'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Cost Estimator</span>
            </button>

            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer shrink-0 ${
                activeTab === 'catalog'
                  ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs border border-border-default'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Model Comparison</span>
            </button>

            <button
              onClick={() => setActiveTab('parameters')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer shrink-0 ${
                activeTab === 'parameters'
                  ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs border border-border-default'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Parameters Explained</span>
            </button>

            <button
              onClick={() => setActiveTab('engineering')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer shrink-0 ${
                activeTab === 'engineering'
                  ? 'bg-bg-secondary text-text-primary font-semibold shadow-xs border border-border-default'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Prompting Standards</span>
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            
            {/* TAB 1: COST CALCULATOR */}
            {activeTab === 'calculator' && (
              <div className="space-y-4">
                {/* Plain-Language Primer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default space-y-1 shadow-xs">
                    <div className="flex items-center gap-1.5 text-text-primary font-bold">
                      <HelpCircle className="w-3.5 h-3.5 text-brand-primary" />
                      <span>What is a Token?</span>
                    </div>
                    <p className="text-text-secondary leading-relaxed">
                      AI models calculate input in tokens:
                    </p>
                    <div className="p-2 rounded-md bg-bg-tertiary font-mono text-[11px] text-text-primary border border-border-default">
                      1,000 tokens ≈ 750 words
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default space-y-1 shadow-xs">
                    <div className="flex items-center gap-1.5 text-text-primary font-bold">
                      <Layers className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Input vs. Output</span>
                    </div>
                    <p className="text-text-secondary leading-relaxed">
                      Input is what you send. Output is generated text. Output compute is priced slightly higher.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default space-y-1 shadow-xs">
                    <div className="flex items-center gap-1.5 text-text-primary font-bold">
                      <Coins className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Zero-Trust BYOK</span>
                    </div>
                    <p className="text-text-secondary leading-relaxed">
                      When using your own API keys, PromptHub consumes 0 platform credits.
                    </p>
                  </div>
                </div>

                {/* Scenario Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                    <span className="font-bold uppercase text-[10px]">Real-World Scenario Presets:</span>
                    <span>Input: {inputTokens.toLocaleString()} | Output: {outputTokens.toLocaleString()} tokens</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {SCENARIOS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          activePreset === preset.name
                            ? 'bg-brand-primary-light border-brand-primary text-brand-primary'
                            : 'bg-bg-secondary border-border-default hover:bg-bg-tertiary text-text-primary shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span>{preset.icon}</span>
                          <span className="text-[10px] font-mono text-text-muted">
                            ~{preset.input + preset.output} tokens
                          </span>
                        </div>
                        <h4 className="text-xs font-bold">{preset.name}</h4>
                        <p className="text-[11px] text-text-secondary line-clamp-1 mt-0.5">
                          {preset.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders */}
                <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Input Tokens:</span>
                        <span className="text-brand-primary font-bold">{inputTokens.toLocaleString()} (~{(inputTokens * 0.75).toFixed(0)} words)</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="30000"
                        step="50"
                        value={inputTokens}
                        onChange={(e) => {
                          setInputTokens(parseInt(e.target.value));
                          setActivePreset(null);
                        }}
                        className="w-full accent-brand-primary cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Output Tokens:</span>
                        <span className="text-brand-primary font-bold">{outputTokens.toLocaleString()} (~{(outputTokens * 0.75).toFixed(0)} words)</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="8000"
                        step="50"
                        value={outputTokens}
                        onChange={(e) => {
                          setOutputTokens(parseInt(e.target.value));
                          setActivePreset(null);
                        }}
                        className="w-full accent-brand-primary cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Model Pricing Comparison Table */}
                <div className="rounded-xl border border-border-default bg-bg-secondary overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono min-w-[500px]">
                      <thead className="bg-bg-tertiary border-b border-border-default text-text-muted text-[10px] uppercase font-semibold">
                        <tr>
                          <th className="p-3">Model</th>
                          <th className="p-3">Provider</th>
                          <th className="p-3">Rate ($/1M)</th>
                          <th className="p-3 text-right">Cost / Run</th>
                          <th className="p-3 text-right">Cost / 100 Runs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default text-text-secondary">
                        {FALLBACK_CATALOG.slice(0, 8).map((model) => {
                          const singleCost = calculateModelCost(model);
                          const hundredCost = calculateHundredCost(model);
                          return (
                            <tr key={model.id} className="hover:bg-bg-tertiary/50 transition-colors">
                              <td className="p-3 font-semibold text-text-primary">{model.name}</td>
                              <td className="p-3">{model.provider}</td>
                              <td className="p-3">${model.pricing?.prompt || 0}</td>
                              <td className="p-3 text-right font-semibold text-text-primary">{singleCost}</td>
                              <td className="p-3 text-right">{hundredCost}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MODEL COMPARISON */}
            {activeTab === 'catalog' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {FALLBACK_CATALOG.slice(0, 9).map((model) => (
                    <div
                      key={model.id}
                      onClick={() => setSelectedModel(model)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        selectedModel.id === model.id
                          ? 'bg-brand-primary-light border-brand-primary'
                          : 'bg-bg-secondary border-border-default hover:border-border-hover shadow-xs'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.2 rounded bg-bg-tertiary text-[10px] font-mono text-text-secondary border border-border-default">
                            {model.provider}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-text-primary">{model.name}</h3>
                        <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                          {model.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border-default text-[10px] font-mono text-text-muted flex justify-between">
                        <span>Context: {(model.contextLength / 1000).toFixed(0)}k</span>
                        <span>${model.pricing.prompt}/1M</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: PARAMETERS */}
            {activeTab === 'parameters' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Temperature */}
                  <div className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-text-primary">Temperature ({tempValue})</h3>
                      <span className="text-[10px] font-mono text-text-muted">
                        {tempValue < 0.3 ? 'Deterministic' : tempValue < 0.8 ? 'Balanced' : 'Creative'}
                      </span>
                    </div>

                    <p className="text-text-secondary leading-relaxed">
                      Controls randomness. Lower values produce strict, reproducible code and math answers.
                    </p>

                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.05"
                      value={tempValue}
                      onChange={(e) => setTempValue(parseFloat(e.target.value))}
                      className="w-full accent-brand-primary cursor-pointer"
                    />
                  </div>

                  {/* Top P */}
                  <div className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-text-primary">Top P Sampling ({topPValue})</h3>
                      <span className="text-[10px] font-mono text-text-muted">
                        Pool: {(topPValue * 100).toFixed(0)}%
                      </span>
                    </div>

                    <p className="text-text-secondary leading-relaxed">
                      Nucleus sampling filters out erratic tail tokens. Set to 1.0 for standard generation.
                    </p>

                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={topPValue}
                      onChange={(e) => setTopPValue(parseFloat(e.target.value))}
                      className="w-full accent-brand-primary cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PROMPTING STANDARDS */}
            {activeTab === 'engineering' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-2 shadow-xs">
                    <h4 className="font-bold text-text-primary">Dynamic Variables</h4>
                    <p className="text-text-secondary leading-relaxed">
                      Use double curly braces like <code className="bg-bg-tertiary px-1 py-0.5 rounded font-mono text-brand-primary">&#123;&#123;variable_name&#125;&#125;</code> so PromptHub automatically generates test arena form fields.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-2 shadow-xs">
                    <h4 className="font-bold text-text-primary">XML Section Tags</h4>
                    <p className="text-text-secondary leading-relaxed">
                      Structure complex instructions with XML delimiters such as <code className="bg-bg-tertiary px-1 py-0.5 rounded font-mono text-text-primary">&lt;instructions&gt;</code> and <code className="bg-bg-tertiary px-1 py-0.5 rounded font-mono text-text-primary">&lt;rules&gt;</code>.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-4 sm:px-5 py-3 border-t border-border-default bg-bg-tertiary flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors min-h-[36px]"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default ModelExplanationModal;
