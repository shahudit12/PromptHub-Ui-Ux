import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Check,
  X,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { modelCatalogService, type CatalogModel, isBatchModel } from '../services/modelCatalogService';
import { multiProviderService } from '../services/ai/multiProviderService';
import { smartModelResolver } from '../services/ai/smartModelResolver';
import { isModelAvailableForUser } from '../config/providerRegistry';
import { ModelProviderLogo } from './common/ModelProviderLogo';

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModelId: string;
  onSelectModel: (modelId: string, model: CatalogModel) => void;
  feature?: string;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedModelId,
  onSelectModel,
  feature,
}) => {
  const [models, setModels] = useState<CatalogModel[]>(() => modelCatalogService.getUserAvailableCatalog());
  const [isLoading, setIsLoading] = useState<boolean>(() => modelCatalogService.getUserAvailableCatalog().length === 0);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'free' | 'premium' | 'byok' | 'fast' | 'coding' | 'reasoning' | 'multimodal'
  >(() => (feature === 'arena' ? 'free' : 'all'));
  const [onlyExecutable, setOnlyExecutable] = useState(false);

  // Auto-switch to free models filter when opening from Arena
  useEffect(() => {
    if (isOpen && feature === 'arena') {
      setSelectedFilter('free');
    }
  }, [isOpen, feature]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const loadCatalog = async () => {
    setIsLoading(true);
    try {
      const fetched = await modelCatalogService.getCatalog();
      if (fetched && fetched.length > 0) {
        setModels(fetched.filter((m) => isModelAvailableForUser(m.id)));
      }
    } catch (err: any) {
      console.warn('[ModelSelectorModal] Catalog load warning:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCatalog();
    }
  }, [isOpen]);

  const connectedProviders = useMemo(() => {
    return new Set(multiProviderService.getConnectedProviders());
  }, [isOpen]);

  const isModelUnlocked = (m: CatalogModel): boolean => {
    if (multiProviderService.isModelUnlockedByBYOK(m.id).unlocked) return true;
    if (m.canonicalId && multiProviderService.isModelUnlockedByBYOK(m.canonicalId).unlocked) return true;
    if (connectedProviders.has(m.providerId)) return true;
    return false;
  };

  const lastSelectedModelId = useMemo(() => {
    return isOpen ? smartModelResolver.getLastSelectedModel() : null;
  }, [isOpen]);

  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      if (!isModelAvailableForUser(m.id)) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        (q === 'free' && m.isFree) ||
        (q === 'coding' && m.isCoding) ||
        (q === 'reasoning' && m.isReasoning) ||
        (q === 'vision' && m.inputModalities?.includes('image'));

      if (isBatchModel(m.id)) return false;

      let matchesFilter = true;
      if (selectedFilter === 'free') {
        matchesFilter = m.isFree;
      } else if (selectedFilter === 'premium') {
        matchesFilter = !m.isFree;
      } else if (selectedFilter === 'byok') {
        matchesFilter = isModelUnlocked(m);
      } else if (selectedFilter === 'fast') {
        matchesFilter = m.id.includes('mini') || m.id.includes('flash') || m.id.includes('haiku');
      } else if (selectedFilter === 'coding') {
        matchesFilter = m.isCoding || m.id.includes('coder') || m.id.includes('sonnet');
      } else if (selectedFilter === 'reasoning') {
        matchesFilter = m.isReasoning || m.id.includes('r1') || m.id.includes('o1') || m.id.includes('o3');
      } else if (selectedFilter === 'multimodal') {
        matchesFilter = m.inputModalities?.includes('image');
      }

      if (onlyExecutable && !m.isFree && !isModelUnlocked(m)) {
        return false;
      }

      return matchesSearch && matchesFilter;
    });
  }, [models, searchQuery, selectedFilter, onlyExecutable, connectedProviders]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[88vh] sm:max-h-[90vh] bg-bg-secondary rounded-t-2xl sm:rounded-2xl border border-border-default shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Mobile drag handle */}
        <div className="sm:hidden w-12 h-1 bg-border-hover rounded-full mx-auto my-2 shrink-0" aria-hidden="true" />

        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border-default bg-bg-tertiary/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shadow-xs shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold font-display text-text-primary truncate">
                Model Catalog & Gateway Selector
              </h2>
              <p className="text-[11px] sm:text-xs text-text-secondary truncate">
                Select from free and frontier models with model-centric routing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-3 sm:p-4 border-b border-border-default bg-bg-primary/50 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models (e.g., 'gpt-4o', 'claude', 'free')..."
                className="w-full pl-9 pr-4 py-2.5 bg-bg-secondary border border-border-default rounded-xl text-base sm:text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer shrink-0 select-none">
              <input
                type="checkbox"
                checked={onlyExecutable}
                onChange={(e) => setOnlyExecutable(e.target.checked)}
                className="rounded border-border-default text-brand-primary focus:ring-brand-primary"
              />
              <span>Free / Unlocked Only</span>
            </label>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'All Models' },
              { id: 'free', label: '🆓 Free (OpenRouter)' },
              { id: 'premium', label: '💎 Premium (AICredits)' },
              { id: 'byok', label: `🔑 Connected BYOK` },
              { id: 'fast', label: '⚡ Ultra-Fast' },
              { id: 'coding', label: '💻 Coding' },
              { id: 'reasoning', label: '🧠 Reasoning' },
              { id: 'multimodal', label: '🖼️ Vision / Multimodal' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilter(tab.id as any)}
                className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer inline-flex items-center ${
                  selectedFilter === tab.id
                    ? 'bg-brand-primary text-white shadow-2xs font-semibold'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-default/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Model List Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-muted">
              <RefreshCw className="w-5 h-5 animate-spin text-brand-primary" />
              <span className="text-xs">Loading model catalog...</span>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="py-12 text-center text-text-muted space-y-2">
              <p className="text-xs">No models match your current filter and search query.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFilter('all');
                  setOnlyExecutable(false);
                }}
                className="text-xs text-brand-primary font-semibold hover:underline cursor-pointer"
              >
                Reset search & filters
              </button>
            </div>
          ) : (
            filteredModels.map((model) => {
              const isSelected = selectedModelId === model.id;
              const isByokUnlocked = isModelUnlocked(model);

              return (
                <div
                  key={model.id}
                  onClick={() => {
                    if (feature !== 'arena') {
                      smartModelResolver.setLastSelectedModel(model.id);
                    }
                    onSelectModel(model.id, model);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-brand-primary-light/40 border-brand-primary/40 ring-1 ring-brand-primary/20'
                      : 'bg-bg-secondary hover:bg-bg-tertiary/60 border-border-default'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-bg-tertiary border border-border-default/60 flex items-center justify-center shrink-0 p-1.5 mt-0.5 shadow-2xs">
                      <ModelProviderLogo provider={model.provider} modelId={model.id} className="w-4 h-4" />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-text-primary font-display">
                          {model.name}
                        </span>

                      {/* Tag: Last Selected */}
                      {model.id === lastSelectedModelId && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border border-brand-primary/20 font-bold inline-flex items-center gap-1">
                          <span>★</span>
                          <span>Last Selected</span>
                        </span>
                      )}

                      {/* Tag: BYOK */}
                      {isByokUnlocked && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border border-brand-primary/20 font-bold inline-flex items-center gap-1">
                          <span>🔑</span>
                          <span>BYOK (0 Credits)</span>
                        </span>
                      )}

                      {/* Tag: Free */}
                      {model.isFree && !isByokUnlocked && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border border-brand-primary/20 font-bold inline-flex items-center gap-1">
                          <span>🆓</span>
                          <span>Free (0 Credits)</span>
                        </span>
                      )}

                      {/* Tag: Platform Model */}
                      {!model.isFree && !isByokUnlocked && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-semibold inline-flex items-center gap-1">
                          <span>💎</span>
                          <span>PromptHub Credits</span>
                        </span>
                      )}

                      {/* Provider pill */}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary border border-border-default">
                        {model.provider}
                      </span>

                      {/* Reasoning badge */}
                      {model.isReasoning && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                          🧠 Reasoning
                        </span>
                      )}

                      {/* Coding badge */}
                      {model.isCoding && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                          💻 Coding
                        </span>
                      )}
                    </div>

                    <p className="text-[11.5px] text-text-secondary leading-relaxed line-clamp-2">
                      {model.description || `High-performance model from ${model.provider}.`}
                    </p>

                    <div className="flex items-center gap-3 text-[10.5px] text-text-muted font-mono pt-1">
                      <span>Context: {Math.round((model.contextLength || 128000) / 1000)}k</span>
                      <span>•</span>
                      <span>
                        {isByokUnlocked
                          ? '🔑 Using your connected key (0 platform credits)'
                          : model.isFree
                          ? '🆓 0 Credits per execution'
                          : typeof model.creditPricing?.aicredits === 'number'
                          ? `💎 ${model.creditPricing.aicredits} Credits per run`
                          : '💎 Priced by the server at run time'}
                      </span>
                    </div>
                  </div>
                </div>

                  <div className="flex items-center gap-2 shrink-0 self-center">
                    {isSelected ? (
                      <div className="w-7 h-7 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-xs">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-semibold transition-colors cursor-pointer inline-flex items-center"
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border-default bg-bg-tertiary flex items-center justify-between text-xs text-text-muted">
          <span>
            Showing <strong>{filteredModels.length}</strong> models
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary font-semibold text-xs cursor-pointer inline-flex items-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ModelSelectorModal;
