import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Brain, CheckCircle2, Loader2 } from 'lucide-react';

export interface ThoughtStep {
  title: string;
  content: string;
  status: 'thinking' | 'finished' | 'pending';
  durationSeconds?: number;
}

export interface ThoughtChainProps {
  thinkingText?: string;
  steps?: ThoughtStep[];
  isThinking?: boolean;
  durationSeconds?: number;
  className?: string;
  defaultExpanded?: boolean;
}

export const ThoughtChain: React.FC<ThoughtChainProps> = ({
  thinkingText,
  steps,
  isThinking = false,
  durationSeconds,
  className = '',
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded || isThinking);

  // If there's no thinking content and not currently thinking, render nothing
  if (!thinkingText && (!steps || steps.length === 0) && !isThinking) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[#1F2A34]/20 backdrop-blur-md overflow-hidden transition-all duration-200 ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium text-[var(--foreground)]/80 hover:text-[var(--foreground)] hover:bg-bg-secondary/[0.03] transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          {isThinking ? (
            <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin" />
          ) : (
            <Brain className="w-3.5 h-3.5 text-brand-primary dark:text-[#88BDF2]" />
          )}
          <span className="font-semibold tracking-wide">
            {isThinking ? 'Reasoning in progress...' : 'Thought Process & Reasoning'}
          </span>
          {durationSeconds !== undefined && durationSeconds > 0 && (
            <span className="text-[10px] text-[var(--foreground)]/50 font-mono">
              ({durationSeconds.toFixed(1)}s)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[var(--foreground)]/50">
          <span className="text-[10px] uppercase tracking-wider">{isExpanded ? 'Hide' : 'Show'}</span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3.5 pb-3 pt-1 border-t border-[var(--border)]/50 text-xs text-[var(--foreground)]/70 font-mono space-y-2 max-h-80 overflow-y-auto">
          {steps && steps.length > 0 ? (
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {step.status === 'finished' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary dark:text-[#88BDF2]" />
                    ) : step.status === 'thinking' ? (
                      <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-[var(--border)]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[var(--foreground)]/90">{step.title}</div>
                    <div className="text-[11px] text-[var(--foreground)]/60 whitespace-pre-wrap mt-0.5">
                      {step.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="whitespace-pre-wrap leading-relaxed text-[11px] text-[var(--foreground)]/75 bg-black/20 p-2.5 rounded-lg">
              {thinkingText || 'Analyzing parameters, constraints, and instructions...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
