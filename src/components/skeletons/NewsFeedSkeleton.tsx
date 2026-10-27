import React from 'react';
import { Newspaper } from 'lucide-react';

export const NewsFeedSkeleton: React.FC = () => {
  return (
    <div
      className="flex-1 w-full flex flex-col p-4 sm:p-6 md:p-8 bg-bg-primary overflow-hidden select-none space-y-6"
      aria-label="Loading AI News intelligence"
      aria-busy="true"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-default/60">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary animate-pulse">
              <Newspaper className="w-4 h-4" />
            </div>
            <div className="h-6 w-56 bg-border-default/60 rounded-md animate-pulse" />
          </div>
          <div className="h-3.5 w-80 bg-border-subtle/80 rounded-md animate-pulse" />
        </div>

        {/* Live Pulse Indicator */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 bg-bg-secondary border border-border-default rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Topic Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
        {['All Intelligence', 'OpenAI', 'Anthropic', 'Google', 'DeepSeek', 'Open-Source', 'Research'].map((_, i) => (
          <div
            key={i}
            className={`h-9 px-4 rounded-xl border border-border-default flex items-center shrink-0 animate-pulse ${
              i === 0 ? 'bg-brand-primary/20 border-brand-primary/30 w-28' : 'bg-bg-secondary w-24'
            }`}
          />
        ))}
      </div>

      {/* Editorial News Cards Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-bg-secondary rounded-2xl border border-border-default overflow-hidden flex flex-col justify-between shadow-xs"
          >
            {/* 16:9 Thumbnail Image Placeholder */}
            <div className="aspect-video w-full bg-bg-tertiary border-b border-border-default/60 flex items-center justify-center text-text-muted/40 animate-pulse" />

            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                {/* Meta: Source + Time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="h-4 w-20 bg-brand-primary/10 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-border-subtle rounded animate-pulse" />
                </div>

                {/* Headline Lines */}
                <div className="h-4 w-full bg-border-default/80 rounded animate-pulse" />
                <div className="h-4 w-4/5 bg-border-default/70 rounded animate-pulse" />

                {/* Description Lines */}
                <div className="space-y-1.5 pt-1">
                  <div className="h-3 w-full bg-border-subtle/70 rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-border-subtle/50 rounded animate-pulse" />
                </div>
              </div>

              {/* Card Footer: Read Action */}
              <div className="pt-3 border-t border-border-default/50 flex items-center justify-between">
                <div className="h-3 w-24 bg-border-subtle rounded animate-pulse" />
                <div className="h-4 w-4 rounded bg-border-default animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsFeedSkeleton;
