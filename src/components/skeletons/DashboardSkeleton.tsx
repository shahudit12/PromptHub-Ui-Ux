import React from 'react';
import { LayoutDashboard, Zap } from 'lucide-react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div
      className="flex-1 w-full flex flex-col p-4 sm:p-6 md:p-8 bg-bg-primary overflow-hidden select-none space-y-6"
      aria-label="Loading Developer Dashboard"
      aria-busy="true"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-default/60">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary animate-pulse">
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <div className="h-6 w-48 bg-border-default/60 rounded-md animate-pulse" />
          </div>
          <div className="h-3.5 w-64 bg-border-subtle/80 rounded-md animate-pulse" />
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center gap-2">
          <div className="h-10 w-28 bg-bg-secondary border border-border-default rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-brand-primary/20 border border-brand-primary/30 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-bg-secondary rounded-2xl p-5 border border-border-default shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-border-subtle rounded animate-pulse" />
              <div className="w-8 h-8 rounded-xl bg-bg-tertiary flex items-center justify-center text-text-muted animate-pulse">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="h-7 w-20 bg-border-default/90 rounded animate-pulse" />
              <div className="h-3 w-32 bg-border-subtle/60 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Analytics Chart + Activity Stream Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
        {/* Left Column: Telemetry & Usage Chart (8 cols) */}
        <div className="lg:col-span-8 bg-bg-secondary rounded-2xl p-5 border border-border-default shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-default/40">
            <div className="space-y-1">
              <div className="h-4 w-36 bg-border-default/80 rounded animate-pulse" />
              <div className="h-3 w-48 bg-border-subtle/60 rounded animate-pulse" />
            </div>
            <div className="h-8 w-24 bg-bg-tertiary rounded-xl animate-pulse" />
          </div>

          {/* Chart Placeholder with Bars */}
          <div className="h-56 w-full flex items-end justify-between gap-3 pt-4 px-2">
            {[35, 60, 45, 80, 55, 90, 70, 40, 85, 65, 95, 75].map((height, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div
                  className="w-full bg-brand-primary/20 rounded-t-lg border border-brand-primary/30 animate-pulse transition-all"
                  style={{ height: `${height}%` }}
                />
                <div className="h-2 w-4 bg-border-subtle/40 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Activity Feed (4 cols) */}
        <div className="lg:col-span-4 bg-bg-secondary rounded-2xl p-5 border border-border-default shadow-xs space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border-default/40">
            <div className="h-4 w-32 bg-border-default/80 rounded animate-pulse" />
            <div className="h-3 w-16 bg-border-subtle rounded animate-pulse" />
          </div>

          {/* Activity Rows */}
          <div className="space-y-3.5 flex-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-bg-tertiary shrink-0 animate-pulse mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-4/5 bg-border-default/80 rounded animate-pulse" />
                  <div className="h-2.5 w-1/2 bg-border-subtle/60 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
