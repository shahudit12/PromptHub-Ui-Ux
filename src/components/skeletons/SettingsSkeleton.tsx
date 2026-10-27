import React from 'react';
import { Settings } from 'lucide-react';

export const SettingsSkeleton: React.FC = () => {
  return (
    <div
      className="flex-1 w-full flex flex-col p-4 sm:p-6 md:p-8 bg-bg-primary overflow-hidden select-none space-y-6 max-w-4xl"
      aria-label="Loading Settings"
      aria-busy="true"
    >
      {/* Header Bar */}
      <div className="flex items-center gap-3 pb-5 border-b border-border-default/60">
        <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary animate-pulse">
          <Settings className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="h-6 w-40 bg-border-default/70 rounded-md animate-pulse" />
          <div className="h-3.5 w-64 bg-border-subtle/70 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
        {['General Profile', 'Security & Keys', 'BYOK Providers', 'Notifications', 'Billing'].map((_, i) => (
          <div
            key={i}
            className={`h-9 px-4 rounded-xl border border-border-default flex items-center shrink-0 animate-pulse ${
              i === 0 ? 'bg-brand-primary/20 border-brand-primary/30 w-28' : 'bg-bg-secondary w-24'
            }`}
          />
        ))}
      </div>

      {/* Form Card */}
      <div className="bg-bg-secondary rounded-2xl p-6 border border-border-default shadow-xs space-y-6">
        {/* Avatar Upload Placeholder */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-bg-tertiary border-2 border-border-default animate-pulse shrink-0" />
          <div className="space-y-2">
            <div className="h-9 w-32 bg-bg-tertiary border border-border-default rounded-xl animate-pulse" />
            <div className="h-3 w-48 bg-border-subtle/60 rounded animate-pulse" />
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-4 pt-2 border-t border-border-default/40">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-24 bg-border-subtle rounded animate-pulse" />
              <div className="h-10 w-full bg-bg-tertiary border border-border-default rounded-xl animate-pulse" />
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="pt-2 flex justify-end">
          <div className="h-10 w-32 bg-brand-primary/30 border border-brand-primary/40 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default SettingsSkeleton;
