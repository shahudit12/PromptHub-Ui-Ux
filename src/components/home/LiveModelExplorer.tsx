import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  Search,
  Swords,
  Zap,
  ArrowRight,
  Brain,
  Code2,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { modelCatalogService, type CatalogModel } from '../../services/modelCatalogService';

export const LiveModelExplorer: React.FC = () => {
  const { navigateToStudio, navigateToArena } = useApp();

  const [models, setModels] = useState<CatalogModel[]>(() =>
    modelCatalogService.getCachedCatalog()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'reasoning' | 'coding' | 'free' | 'vision'>('all');

  useEffect(() => {
    modelCatalogService
      .fetchCatalog()
      .then((data) => {
        if (data && data.length > 0) {
          setModels(data);
        }
      })
      .catch(() => {});
  }, []);

  // Filtered models - maximum 6 for the homepage teaser
  const filteredModels = useMemo(() => {
    let list = models;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.description || '').toLowerCase().includes(q)
      );
    }

    if (selectedCategory === 'reasoning') {
      list = list.filter(
        (m) =>
          m.isReasoning ||
          m.id.includes('o1') ||
          m.id.includes('o3') ||
          m.id.includes('r1') ||
          m.id.includes('3.7-sonnet') ||
          m.id.includes('grok') ||
          m.id.includes('reason') ||
          m.name.toLowerCase().includes('reasoning') ||
          m.name.toLowerCase().includes('r1')
      );
    } else if (selectedCategory === 'coding') {
      list = list.filter(
        (m) =>
          m.isCoding ||
          m.id.includes('coder') ||
          m.id.includes('code') ||
          m.id.includes('sonnet') ||
          m.id.includes('opus') ||
          m.id.includes('gpt-4o') ||
          m.id.includes('seed') ||
          m.id.includes('deepseek') ||
          m.name.toLowerCase().includes('code')
      );
    } else if (selectedCategory === 'free') {
      list = list.filter((m) => m.isFree || (m.pricing.prompt === 0 && m.pricing.completion === 0));
    } else if (selectedCategory === 'vision') {
      list = list.filter(
        (m) =>
          (m.inputModalities && m.inputModalities.includes('image')) ||
          m.id.includes('vision') ||
          m.id.includes('flash') ||
          m.id.includes('gpt-4o') ||
          m.id.includes('claude-3') ||
          m.id.includes('gemini') ||
          m.id.includes('qwen3.8')
      );
    }

    return list.slice(0, 6);
  }, [models, searchQuery, selectedCategory]);

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 md:px-8 bg-bg-primary text-left font-sans border-b border-border-default">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Section Header */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-brand-primary font-mono uppercase tracking-widest bg-brand-primary-light border border-brand-primary/20 px-3 py-0.5 rounded-full inline-flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            <span>Model Ecosystem</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-text-primary tracking-tight">
            Explore the model ecosystem.
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Real-time catalog from OpenRouter. Compare context windows, token pricing, and capabilities.
          </p>
        </div>

        {/* Compact Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-bg-secondary p-2.5 rounded-xl border border-border-default shadow-xs">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models (Claude, GPT-4o, DeepSeek, Gemini, Qwen)..."
              className="w-full pl-8 pr-7 py-1.5 bg-bg-tertiary border border-border-default rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:border-brand-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Capability Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
            {[
              { id: 'all', label: 'All', icon: Layers },
              { id: 'reasoning', label: 'Reasoning', icon: Brain },
              { id: 'coding', label: 'Coding', icon: Code2 },
              { id: 'free', label: 'Free Tier', icon: Zap },
              { id: 'vision', label: 'Vision', icon: ImageIcon },
            ].map((tab) => {
              const isSelected = selectedCategory === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id as any)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 min-h-[30px] ${
                    isSelected
                      ? 'bg-brand-primary text-white shadow-2xs font-semibold'
                      : 'bg-bg-tertiary hover:bg-border-subtle text-text-secondary hover:text-text-primary border border-border-default'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact 6 Model Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredModels.map((model) => {
            const providerName = model.id.split('/')[0] || 'AI';
            const contextStr = model.contextLength
              ? model.contextLength >= 1000000
                ? `${(model.contextLength / 1000000).toFixed(1)}M`
                : `${Math.round(model.contextLength / 1000)}K`
              : '128K';

            const promptCost = model.pricing?.prompt !== undefined
              ? (model.pricing.prompt === 0 && model.pricing.completion === 0) || model.isFree
                ? 'Free'
                : `$${model.pricing.prompt.toFixed(2)}/1M`
              : '$0.00';

            return (
              <motion.div
                key={model.id}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                className="bg-bg-secondary rounded-xl border border-border-default hover:border-brand-primary/50 hover:shadow-xs p-3.5 space-y-2.5 flex flex-col justify-between transition-all group text-left"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted capitalize block truncate">
                        {providerName}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors line-clamp-1">
                        {model.name}
                      </h4>
                    </div>
                    {model.isFree || model.pricing?.prompt === 0 ? (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-bold shrink-0">
                        FREE
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-bg-tertiary border border-border-default text-text-secondary font-mono text-[10px] shrink-0">
                        {promptCost}
                      </span>
                    )}
                  </div>

                  <p className="text-[11.5px] text-text-secondary line-clamp-2 leading-relaxed font-sans">
                    {model.description || `High-performance intelligence model from ${providerName}.`}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-border-subtle">
                  <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                    <span>Context: <strong>{contextStr}</strong></span>
                    {model.inputModalities && model.inputModalities.includes('image') && (
                      <span className="flex items-center gap-0.5 text-blue-700">
                        <ImageIcon className="w-2.5 h-2.5" />
                        <span>Vision</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => navigateToStudio(model.id)}
                      className="py-1 px-2 rounded-lg bg-bg-tertiary hover:bg-brand-primary hover:text-white text-text-primary text-[11px] font-medium border border-border-default hover:border-brand-primary transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[30px]"
                      title={`Open ${model.name} in Prompt Studio`}
                    >
                      <Cpu className="w-3 h-3 shrink-0" />
                      <span>Studio</span>
                    </button>
                    <button
                      onClick={() => navigateToArena(model.id)}
                      className="py-1 px-2 rounded-lg bg-bg-tertiary hover:bg-brand-primary hover:text-white text-text-primary text-[11px] font-medium border border-border-default hover:border-brand-primary transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[30px]"
                      title={`Benchmark ${model.name} in Arena`}
                    >
                      <Swords className="w-3 h-3 shrink-0" />
                      <span>Arena</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Explore All Link Card */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-bg-secondary border border-border-default shadow-2xs">
          <div className="space-y-0.5 text-center sm:text-left">
            <h4 className="text-xs font-bold text-text-primary">Want to test models with your own API keys (BYOK)?</h4>
            <p className="text-[11px] text-text-secondary">Connect OpenRouter, OpenAI, Anthropic, Gemini, or Groq keys with zero markup.</p>
          </div>
          <button
            onClick={() => navigateToArena()}
            className="px-3.5 py-1.5 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5 min-h-[34px]"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Explore all 400+ models in Arena</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default LiveModelExplorer;

