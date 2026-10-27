import React from 'react';
import { Trophy } from 'lucide-react';

export const LeaderboardSkeleton: React.FC = () => {
  return (
    <div
      className="flex-1 w-full flex flex-col p-4 sm:p-6 md:p-8 bg-bg-primary overflow-hidden select-none space-y-6"
      aria-label="Loading Leaderboard rankings"
      aria-busy="true"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-default/60">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 animate-pulse">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="h-6 w-56 bg-border-default/60 rounded-md animate-pulse" />
          </div>
          <div className="h-3.5 w-80 bg-border-subtle/80 rounded-md animate-pulse" />
        </div>

        {/* Timeframe Filter Pills */}
        <div className="flex items-center gap-2">
          {['All Time', 'This Month', 'This Week'].map((_, i) => (
            <div
              key={i}
              className={`h-9 px-3 rounded-xl border border-border-default flex items-center shrink-0 animate-pulse ${
                i === 0 ? 'bg-brand-primary/20 border-brand-primary/30 w-20' : 'bg-bg-secondary w-20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Top 3 Creators Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* #2 Silver */}
        <div className="bg-bg-secondary rounded-2xl p-5 border border-border-default flex flex-col items-center text-center space-y-3 shadow-xs order-2 md:order-1">
          <div className="w-6 h-6 rounded-full bg-slate-400/20 flex items-center justify-center animate-pulse">
            <span className="text-xs font-bold text-slate-500">2</span>
          </div>
          <div className="w-16 h-16 rounded-full bg-bg-tertiary border-2 border-border-default animate-pulse" />
          <div className="space-y-1.5 w-full flex flex-col items-center">
            <div className="h-4 w-28 bg-border-default/80 rounded animate-pulse" />
            <div className="h-3 w-20 bg-border-subtle/60 rounded animate-pulse" />
          </div>
          <div className="h-6 w-24 bg-bg-tertiary rounded-full animate-pulse mt-2" />
        </div>

        {/* #1 Gold (Taller & Highlighted) */}
        <div className="bg-bg-secondary rounded-2xl p-6 border-2 border-amber-500/30 flex flex-col items-center text-center space-y-3 shadow-sm order-1 md:order-2 md:-mt-2">
          <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
            <Trophy className="w-4 h-4 text-amber-600" />
          </div>
          <div className="w-20 h-20 rounded-full bg-bg-tertiary border-2 border-amber-500/30 animate-pulse" />
          <div className="space-y-1.5 w-full flex flex-col items-center">
            <div className="h-4.5 w-32 bg-border-default/90 rounded animate-pulse" />
            <div className="h-3 w-24 bg-border-subtle/70 rounded animate-pulse" />
          </div>
          <div className="h-7 w-28 bg-amber-500/15 border border-amber-500/20 rounded-full animate-pulse mt-2" />
        </div>

        {/* #3 Bronze */}
        <div className="bg-bg-secondary rounded-2xl p-5 border border-border-default flex flex-col items-center text-center space-y-3 shadow-xs order-3">
          <div className="w-6 h-6 rounded-full bg-amber-700/20 flex items-center justify-center animate-pulse">
            <span className="text-xs font-bold text-amber-700">3</span>
          </div>
          <div className="w-16 h-16 rounded-full bg-bg-tertiary border-2 border-border-default animate-pulse" />
          <div className="space-y-1.5 w-full flex flex-col items-center">
            <div className="h-4 w-28 bg-border-default/80 rounded animate-pulse" />
            <div className="h-3 w-20 bg-border-subtle/60 rounded animate-pulse" />
          </div>
          <div className="h-6 w-24 bg-bg-tertiary rounded-full animate-pulse mt-2" />
        </div>
      </div>

      {/* Ranks #4 through #10 Table List */}
      <div className="bg-bg-secondary rounded-2xl border border-border-default overflow-hidden shadow-xs">
        <div className="divide-y divide-border-default/60">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-5 text-center text-xs font-mono font-bold text-text-muted">
                  {i + 4}
                </div>
                <div className="w-9 h-9 rounded-full bg-bg-tertiary shrink-0 animate-pulse" />
                <div className="space-y-1">
                  <div className="h-3.5 w-32 bg-border-default/80 rounded animate-pulse" />
                  <div className="h-2.5 w-20 bg-border-subtle/60 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-5 w-16 bg-bg-tertiary rounded-full animate-pulse" />
                <div className="h-4 w-12 bg-border-default/70 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardSkeleton;
