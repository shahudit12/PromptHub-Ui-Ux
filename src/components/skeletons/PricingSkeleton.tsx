import React from 'react';
import { CreditCard, Check } from 'lucide-react';

export const PricingSkeleton: React.FC = () => {
  return (
    <div
      className="flex-1 w-full flex flex-col p-4 sm:p-6 md:p-8 bg-bg-primary overflow-hidden select-none space-y-6"
      aria-label="Loading Pricing and Wallet packages"
      aria-busy="true"
    >
      {/* Header Bar */}
      <div className="flex flex-col items-center text-center space-y-3 max-w-2xl mx-auto pt-2">
        <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary animate-pulse">
          <CreditCard className="w-5 h-5" />
        </div>
        <div className="h-7 w-64 bg-border-default/80 rounded-lg animate-pulse" />
        <div className="h-4 w-96 bg-border-subtle/70 rounded-md animate-pulse" />

        {/* Monthly / Yearly Billing Toggle Switch */}
        <div className="pt-2">
          <div className="h-10 w-52 bg-bg-secondary border border-border-default rounded-xl p-1 flex items-center gap-1 animate-pulse">
            <div className="h-full flex-1 bg-brand-primary/20 rounded-lg" />
            <div className="h-full flex-1" />
          </div>
        </div>
      </div>

      {/* 4 Plan Tier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 pt-4">
        {['Starter Free', 'Pro Creator', 'Pro Plus Studio', 'Team Workspace'].map((_, i) => (
          <div
            key={i}
            className={`bg-bg-secondary rounded-2xl p-5 border flex flex-col justify-between shadow-xs space-y-5 ${
              i === 1 ? 'border-brand-primary/40 ring-1 ring-brand-primary/30 relative' : 'border-border-default'
            }`}
          >
            <div className="space-y-4">
              {/* Card Header: Plan Name & Badge */}
              <div className="flex items-center justify-between">
                <div className="h-5 w-24 bg-border-default/80 rounded animate-pulse" />
                {i === 1 && (
                  <div className="h-5 w-16 bg-brand-primary/20 rounded-full animate-pulse" />
                )}
              </div>

              {/* Price Tag in INR */}
              <div className="space-y-1 py-1">
                <div className="flex items-baseline gap-1">
                  <div className="h-8 w-24 bg-border-default/90 rounded animate-pulse" />
                  <div className="h-3.5 w-10 bg-border-subtle rounded animate-pulse" />
                </div>
                <div className="h-3 w-32 bg-border-subtle/60 rounded animate-pulse" />
              </div>

              {/* Feature Checklist Lines */}
              <div className="space-y-2.5 pt-2 border-t border-border-default/40">
                {[...Array(5)].map((_, fi) => (
                  <div key={fi} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-brand-primary/15 shrink-0 flex items-center justify-center text-brand-primary animate-pulse">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <div className="h-3 w-full bg-border-subtle/70 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Subscribe / Select CTA Button */}
            <div className="pt-2">
              <div
                className={`h-11 w-full rounded-xl animate-pulse ${
                  i === 1
                    ? 'bg-brand-primary/30 border border-brand-primary/40'
                    : 'bg-bg-tertiary border border-border-default'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingSkeleton;
