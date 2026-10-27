import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Check,
  Zap,
  Brain,
  Code2,
  Layers,
  X,
  Sparkles,
} from 'lucide-react';
import { modelCatalogService, type CatalogModel } from '../../services/modelCatalogService';

interface FreeModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModelId: string;
  onSelectModel: (model: CatalogModel) => void;
}

export const FreeModelSelector: React.FC<FreeModelSelectorProps> = ({
  isOpen,
  onClose,
  selectedModelId,
  onSelectModel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'reasoning' | 'coding'>('all');
  const [models, setModels] = useState<CatalogModel[]>(() => modelCatalogService.getFreeModels());
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      modelCatalogService.fetchCatalog().then(() => {
        const freeList = modelCatalogService.getFreeModels();
        if (freeList && freeList.length > 0) {
          setModels(freeList);
        }
      }).catch(() => {});

      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle escape key and outside clicks
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredModels = useMemo(() => {
    let list = models;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q) ||
          (m.description || '').toLowerCase().includes(q)
      );
    }

    if (selectedTab === 'reasoning') {
      list = list.filter(
        (m) =>
          m.isReasoning ||
          m.id.includes('r1') ||
          m.id.includes('o1') ||
          m.id.includes('nemotron') ||
          m.id.includes('glm') ||
          m.id.includes('reason')
      );
    } else if (selectedTab === 'coding') {
      list = list.filter(
        (m) =>
          m.isCoding ||
          m.id.includes('code') ||
          m.id.includes('coder') ||
          m.id.includes('laguna') ||
          m.id.includes('north') ||
          m.id.includes('llama') ||
          m.id.includes('gemma') ||
          m.id.includes('qwen')
      );
    }

    return list;
  }, [models, searchQuery, selectedTab]);

  if (typeof document === 'undefined') return null;

  const easing = [0.16, 1, 0.3, 1] as const;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0"
          />

          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: easing }}
            className="relative w-full max-w-lg rounded-2xl bg-bg-secondary border border-border-default shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] text-left font-sans"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 pb-3 border-b border-border-subtle bg-bg-secondary flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-600" />
                    <span>Free OpenRouter Models</span>
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">Zero Cost</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold font-display text-text-primary">
                  Choose a free model for live analysis
                </h3>
                <p className="text-xs text-text-secondary leading-snug">
                  Select a model once. PromptHub will use your chosen free model for all homepage prompt analyses.
                </p>
              </div>

              <button
                onClick={onClose}
                aria-label="Close free model selector"
                className="min-h-[44px] min-w-[44px] rounded-lg hover:bg-bg-tertiary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="p-3 sm:px-4 border-b border-border-subtle bg-bg-secondary space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search free models (DeepSeek, Llama, Qwen, Gemini)..."
                  className="w-full pl-8 pr-7 py-2 bg-bg-tertiary border border-border-default rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-brand-primary transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="min-h-[32px] min-w-[32px] absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary cursor-pointer flex items-center justify-center"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {[
                  { id: 'all', label: 'All Free Models', icon: Layers },
                  { id: 'reasoning', label: 'Reasoning', icon: Brain },
                  { id: 'coding', label: 'Coding / Arch', icon: Code2 },
                ].map((tab) => {
                  const isSelected = selectedTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
                        isSelected
                          ? 'bg-brand-primary text-white font-semibold shadow-2xs'
                          : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 divide-y divide-border-subtle/50 bg-bg-secondary">
              {filteredModels.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-text-muted font-mono">No free models match "{searchQuery}"</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-brand-primary font-semibold hover:underline cursor-pointer min-h-[36px]"
                  >
                    Clear search filter
                  </button>
                </div>
              ) : (
                filteredModels.map((model) => {
                  const isSelected = selectedModelId === model.id;
                  const contextStr = model.contextLength
                    ? model.contextLength >= 1000000
                      ? `${(model.contextLength / 1000000).toFixed(1)}M`
                      : `${Math.round(model.contextLength / 1000)}K`
                    : '32K';

                  return (
                    <div
                      key={model.id}
                      onClick={() => {
                        onSelectModel(model);
                        onClose();
                      }}
                      className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 pt-2.5 first:pt-0 ${
                        isSelected
                          ? 'bg-brand-primary-light/50 border border-brand-primary/30 ring-1 ring-brand-primary/20'
                          : 'hover:bg-bg-tertiary border border-transparent'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-primary font-display truncate">
                            {model.name.replace(/\s*\(Free\)/i, '')}
                          </span>
                          {model.isRouter || model.id === 'openrouter/free' ? (
                            <span className="px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 font-mono text-[10px] font-bold shrink-0">
                              ROUTER
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-bold shrink-0">
                              FREE ₹0
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 rounded bg-bg-tertiary text-text-muted font-mono text-[10px] shrink-0">
                            {contextStr} Ctx
                          </span>
                        </div>

                        <p className="text-[11.5px] text-text-secondary line-clamp-1 leading-snug">
                          {model.description || `Fast intelligence model from ${model.provider}.`}
                        </p>

                        <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted">
                          <span>{model.isRouter ? 'Routing Engine' : 'Provider'}: <strong className="text-text-secondary">{model.provider}</strong></span>
                          <span>•</span>
                          <span className="truncate">{model.id}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-center">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-border-default hover:border-brand-primary flex items-center justify-center text-text-muted transition-colors">
                            <span className="text-[10px]">→</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:px-4 bg-bg-secondary border-t border-border-default flex items-center justify-between text-xs text-text-muted font-mono">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                <span>Preference saved in local browser</span>
              </span>
              <button
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-surface-inverse text-white text-xs font-semibold hover:bg-surface-inverse-hi transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default FreeModelSelector;
