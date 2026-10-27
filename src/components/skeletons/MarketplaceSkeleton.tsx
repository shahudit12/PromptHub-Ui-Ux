import React from 'react';
import { ShoppingBag, Search } from 'lucide-react';

export interface MarketplaceSkeletonProps {
  label?: string;
}

export const MarketplaceSkeleton: React.FC<MarketplaceSkeletonProps> = ({ label = 'Marketplace prompts' }) => {
  return (
    <div
      className="flex-1 w-full flex flex-col p-4 sm:p-6 md:p-8 bg-bg-primary overflow-hidden select-none space-y-6"
      aria-label={`Loading ${label}`}
      aria-busy="true"
    >
      {/* Top Banner & Title Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-default/60">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary animate-pulse">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="h-6 w-48 bg-border-default/60 rounded-md animate-pulse" />
          </div>
          <div className="h-3.5 w-72 bg-border-subtle/80 rounded-md animate-pulse" />
        </div>

        {/* Sell / Submit Prompt CTA placeholder */}
        <div className="flex items-center gap-2">
          <div className="h-10 w-32 bg-bg-secondary border border-border-default rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <div className="h-10 w-full bg-bg-secondary border border-border-default rounded-xl flex items-center px-3.5 gap-2 animate-pulse">
              <Search className="w-4 h-4 text-text-muted shrink-0" />
              <div className="h-3.5 w-40 bg-border-subtle rounded" />
            </div>
          </div>

          {/* Sort selector */}
          <div className="h-10 w-36 bg-bg-secondary border border-border-default rounded-xl animate-pulse" />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          {['All Prompts', 'Coding', 'Marketing', 'Creative', 'Reasoning', 'Data Analysis'].map((_, i) => (
            <div
              key={i}
              className={`h-9 px-4 rounded-xl border border-border-default flex items-center shrink-0 animate-pulse ${
                i === 0 ? 'bg-brand-primary/15 border-brand-primary/30 w-24' : 'bg-bg-secondary w-20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 6-Card Prompt Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-1">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-bg-secondary rounded-xl p-4 border border-border-default flex flex-col justify-between gap-3.5 shadow-xs"
          >
            {/* Top row: Category tag + Price Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 bg-brand-primary/10 rounded border border-brand-primary/20 animate-pulse" />
                <div className="h-5 w-20 bg-bg-tertiary rounded border border-border-default animate-pulse" />
              </div>
              <div className="h-5 w-14 bg-border-default/60 rounded animate-pulse" />
            </div>

            {/* Title & Description Lines */}
            <div className="space-y-2 py-1 flex-1">
              <div className="h-4 w-4/5 bg-border-default/80 rounded animate-pulse" />
              <div className="h-3.5 w-full bg-border-subtle/70 rounded animate-pulse" />
              <div className="h-3.5 w-3/4 bg-border-subtle/50 rounded animate-pulse" />
            </div>

            {/* Tag Pills */}
            <div className="flex items-center gap-1.5 pt-1">
              <div className="h-4 w-12 bg-bg-tertiary rounded animate-pulse" />
              <div className="h-4 w-14 bg-bg-tertiary rounded animate-pulse" />
              <div className="h-4 w-10 bg-bg-tertiary rounded animate-pulse" />
            </div>

            {/* Bottom Row: Author Avatar + Run / Fork CTA */}
            <div className="pt-3 border-t border-border-default/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-border-default animate-pulse" />
                <div className="h-3 w-20 bg-border-subtle rounded animate-pulse" />
              </div>
              <div className="h-8 w-20 bg-bg-tertiary border border-border-default rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketplaceSkeleton;
