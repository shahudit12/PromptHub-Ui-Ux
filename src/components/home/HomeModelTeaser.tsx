import React, { useState, useEffect } from 'react';
import { ArrowRight, Cpu } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { modelCatalogService } from '../../services/modelCatalogService';

export const HomeModelTeaser: React.FC = () => {
  const { setActiveTab } = useApp();
  const [modelCount, setModelCount] = useState<number>(() => {
    const cached = modelCatalogService.getCachedCatalog();
    return cached.length > 0 ? cached.length : 400;
  });

  useEffect(() => {
    modelCatalogService.fetchCatalog().then((models) => {
      if (models && models.length > 0) {
        setModelCount(models.length);
      }
    }).catch(() => {});
  }, []);

  return (
    <section className="py-8 sm:py-10 px-4 sm:px-6 md:px-8 bg-bg-secondary border-b border-border-default text-left font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="p-5 sm:p-6 rounded-2xl bg-bg-primary border border-border-default shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-brand-primary font-mono uppercase tracking-widest bg-brand-primary-light border border-brand-primary/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Cpu className="w-3 h-3 text-brand-primary" />
                <span>MODEL ECOSYSTEM</span>
              </span>
              <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50 font-bold">
                {modelCount}+ Supported Models
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold font-display text-text-primary">
              Frontier models, pricing, tokens, and technical guides.
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Explore the full OpenRouter model catalog, live pricing per 1M tokens, reasoning capabilities, and platform architecture in our dedicated knowledge hub.
            </p>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('models-guide')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 hover:-translate-y-px min-h-[40px]"
            >
              <span>Explore Models & Guide</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeModelTeaser;
