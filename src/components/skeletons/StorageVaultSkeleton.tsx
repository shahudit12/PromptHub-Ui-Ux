import React from 'react';
import { HardDrive, UploadCloud, FileText } from 'lucide-react';

export const StorageVaultSkeleton: React.FC = () => {
  return (
    <div
      className="flex-1 w-full flex flex-col p-4 sm:p-6 md:p-8 bg-bg-primary overflow-hidden select-none space-y-6"
      aria-label="Loading Storage Vault assets"
      aria-busy="true"
    >
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-default/60">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary animate-pulse">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="h-6 w-52 bg-border-default/60 rounded-md animate-pulse" />
          </div>
          <div className="h-3.5 w-80 bg-border-subtle/80 rounded-md animate-pulse" />
        </div>

        {/* Upload Action Button */}
        <div className="flex items-center gap-2">
          <div className="h-10 w-32 bg-brand-primary/20 border border-brand-primary/30 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Quota Progress Overview Card */}
      <div className="bg-bg-secondary rounded-2xl p-5 border border-border-default shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1.5">
            <div className="h-4 w-36 bg-border-default/70 rounded animate-pulse" />
            <div className="h-3 w-56 bg-border-subtle rounded animate-pulse" />
          </div>
          <div className="h-6 w-24 bg-border-subtle/60 rounded-full animate-pulse" />
        </div>

        {/* Storage Bar */}
        <div className="w-full h-2.5 bg-bg-tertiary rounded-full overflow-hidden border border-border-default/40">
          <div className="h-full bg-brand-primary/30 rounded-full w-2/5 animate-pulse" />
        </div>

        {/* Breakdown Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-2.5 rounded-xl bg-bg-tertiary/60 border border-border-default/40 space-y-1">
              <div className="h-3 w-16 bg-border-subtle rounded animate-pulse" />
              <div className="h-4 w-12 bg-border-default rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Drag & Drop Upload Zone Placeholder */}
      <div className="border-2 border-dashed border-border-default/80 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 bg-bg-secondary/40 text-center">
        <div className="w-10 h-10 rounded-2xl bg-bg-tertiary flex items-center justify-center text-text-muted animate-pulse">
          <UploadCloud className="w-5 h-5" />
        </div>
        <div className="h-4 w-48 bg-border-default/60 rounded animate-pulse" />
        <div className="h-3 w-64 bg-border-subtle/60 rounded animate-pulse" />
      </div>

      {/* Category Tabs & Filter Pills */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          {['All Files', 'AI Knowledge', 'Prompt Assets', 'Uploads', 'Backups'].map((_, i) => (
            <div
              key={i}
              className={`h-9 px-4 rounded-xl border border-border-default flex items-center shrink-0 animate-pulse ${
                i === 0 ? 'bg-brand-primary/20 border-brand-primary/30 w-24' : 'bg-bg-secondary w-28'
              }`}
            />
          ))}
        </div>

        {/* Format Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {['All Formats', '.md', '.pdf', '.png', '.jpg', '.csv'].map((_, i) => (
            <div
              key={i}
              className="h-8 px-3 rounded-xl bg-bg-secondary border border-border-default flex items-center shrink-0 w-16 animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* 6-Card Files Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-bg-secondary border border-border-default space-y-3 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-bg-tertiary flex items-center justify-center text-text-muted animate-pulse">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 bg-border-default/80 rounded animate-pulse" />
                  <div className="h-2.5 w-20 bg-border-subtle rounded animate-pulse" />
                </div>
              </div>
              <div className="h-5 w-12 bg-bg-tertiary rounded-full border border-border-default/60 animate-pulse" />
            </div>

            <div className="pt-2 border-t border-border-default/40 flex items-center justify-between">
              <div className="h-3 w-16 bg-border-subtle rounded animate-pulse" />
              <div className="flex gap-1">
                <div className="w-7 h-7 rounded-lg bg-bg-tertiary animate-pulse" />
                <div className="w-7 h-7 rounded-lg bg-bg-tertiary animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StorageVaultSkeleton;
