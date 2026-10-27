import React from 'react';

export const HeroLandingSkeleton: React.FC = () => {
  return (
    <div 
      className="w-full min-h-[520px] bg-gradient-to-b from-slate-50 via-white to-blue-50/40 dark:from-[#000000] dark:via-[#000000] dark:to-[#0B1118] border-b border-slate-200 dark:border-[#1C2B3A] pt-12 pb-16 px-4 sm:px-6 lg:px-8 select-none"
      role="status"
      aria-label="Loading homepage content"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Hero Column Skeleton */}
          <div className="lg:col-span-6 space-y-4">
            {/* Pill */}
            <div className="h-6 w-48 rounded-full bg-slate-200/80 dark:bg-[#131D27] animate-pulse" />
            {/* Headline */}
            <div className="space-y-2 pt-2">
              <div className="h-12 sm:h-14 w-4/5 rounded-2xl bg-slate-200 dark:bg-[#131D27] animate-pulse" />
              <div className="h-12 sm:h-14 w-3/5 rounded-2xl bg-blue-100/70 dark:bg-[#131D27]/60 animate-pulse" />
            </div>
            {/* Subtitle */}
            <div className="h-5 w-full max-w-md rounded-lg bg-slate-200/70 dark:bg-[#0B1118] animate-pulse pt-2" />
            {/* CTAs */}
            <div className="flex items-center gap-3 pt-6">
              <div className="h-11 w-44 rounded-xl bg-brand-primary animate-pulse" />
              <div className="h-11 w-36 rounded-xl bg-slate-200 dark:bg-[#131D27] animate-pulse" />
            </div>
            {/* Reassurance */}
            <div className="h-4 w-72 rounded bg-slate-200/60 dark:bg-[#0B1118] animate-pulse pt-4" />
          </div>

          {/* Right Demo Card Skeleton */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-xl h-[440px] rounded-2xl border border-slate-200 dark:border-[#1C2B3A] bg-white dark:bg-[#0B1118] p-5 shadow-xl animate-pulse space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1C2B3A]">
                <div className="h-6 w-32 rounded-lg bg-slate-200 dark:bg-[#131D27]" />
                <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-[#131D27]" />
              </div>
              <div className="h-24 w-full rounded-xl bg-slate-100 dark:bg-[#1A242E]" />
              <div className="h-28 w-full rounded-xl bg-blue-50/50 dark:bg-[#131D27]" />
              <div className="h-8 w-2/3 rounded-lg bg-slate-100 dark:bg-[#1A242E]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroLandingSkeleton;
