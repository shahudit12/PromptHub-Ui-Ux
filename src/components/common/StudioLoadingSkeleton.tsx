import React from 'react';
import { Sparkles, Cpu, Layers } from 'lucide-react';

export const StudioLoadingSkeleton: React.FC = () => {
  return (
    <div
      className="flex-1 w-full h-full flex flex-col p-4 sm:p-6 md:p-8 bg-bg-primary overflow-hidden select-none"
      aria-label="Loading PromptHub Studio surface"
      aria-busy="true"
    >
      {/* Header bar skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border-default/60">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-accent-primary animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="h-6 w-48 bg-border-default/60 rounded-md animate-pulse" />
          </div>
          <div className="h-3.5 w-72 bg-border-subtle/80 rounded-md animate-pulse" />
        </div>

        {/* Toolbar pills */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-bg-secondary border border-border-default rounded-lg animate-pulse" />
          <div className="h-9 w-24 bg-bg-secondary border border-border-default rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Main Studio 2-Column Grid Skeleton */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 overflow-hidden">
        {/* Left Column (Editor / Inputs) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Card top badge & actions */}
          <div className="bg-bg-secondary/60 border border-border-default rounded-xl p-5 space-y-4 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-border-default animate-pulse" />
                <div className="h-4 w-32 bg-border-default rounded animate-pulse" />
              </div>
              <div className="h-6 w-20 bg-border-default/40 rounded-full animate-pulse" />
            </div>

            {/* Simulated Code Lines */}
            <div className="space-y-2.5 pt-2 flex-1">
              <div className="h-4 w-5/6 bg-border-subtle rounded animate-pulse" />
              <div className="h-4 w-full bg-border-subtle/70 rounded animate-pulse" />
              <div className="h-4 w-4/6 bg-border-subtle rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-border-subtle/80 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-border-subtle/60 rounded animate-pulse" />
              <div className="h-4 w-11/12 bg-border-subtle rounded animate-pulse" />
            </div>

            {/* Bottom status */}
            <div className="pt-4 border-t border-border-default/50 flex items-center justify-between">
              <div className="h-4 w-28 bg-border-subtle rounded animate-pulse" />
              <div className="h-8 w-24 bg-accent-primary/20 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* Right Column (Metrics / Output / Rubrics) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-bg-secondary/60 border border-border-default rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3 border-b border-border-default/40">
              <Cpu className="w-4 h-4 text-text-muted animate-pulse" />
              <div className="h-4 w-36 bg-border-default rounded animate-pulse" />
            </div>

            {/* Metric Bars */}
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-3 w-24 bg-border-subtle rounded animate-pulse" />
                    <div className="h-3 w-8 bg-border-subtle rounded animate-pulse" />
                  </div>
                  <div className="h-2 w-full bg-bg-tertiary rounded-full overflow-hidden border border-border-default/40">
                    <div
                      className="h-full bg-accent-primary/30 rounded-full animate-pulse"
                      style={{ width: `${50 + i * 12}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-bg-secondary/40 border border-border-default rounded-xl p-5 space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-text-muted animate-pulse" />
              <div className="h-4 w-28 bg-border-default rounded animate-pulse" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-3.5 w-full bg-border-subtle/50 rounded animate-pulse" />
              <div className="h-3.5 w-4/5 bg-border-subtle/50 rounded animate-pulse" />
              <div className="h-3.5 w-3/4 bg-border-subtle/50 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
