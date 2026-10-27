import React, { useState, useMemo } from 'react';
import { Columns, AlignLeft, Copy, Check, Sparkles, ShieldCheck } from 'lucide-react';

export interface PromptDiffViewerProps {
  original: string;
  improved: string;
  className?: string;
}

interface DiffChunk {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

// Tokenize text by words and whitespace
function computeWordDiff(originalText: string, improvedText: string): { chunks: DiffChunk[]; addedCount: number; removedCount: number } {
  const origTokens = (originalText || '').split(/(\s+|[.,!?;:()[\]{}"])/).filter(Boolean);
  const impTokens = (improvedText || '').split(/(\s+|[.,!?;:()[\]{}"])/).filter(Boolean);

  let addedCount = 0;
  let removedCount = 0;

  // Simple and robust LCS diff implementation
  const m = origTokens.length;
  const n = impTokens.length;
  
  // Guard against giant inputs to keep render snappy
  if (m * n > 400000) {
    return {
      chunks: [
        { type: 'removed', value: originalText },
        { type: 'added', value: improvedText },
      ],
      addedCount: impTokens.length,
      removedCount: origTokens.length,
    };
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origTokens[i - 1] === impTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = m;
  let j = n;
  const tempChunks: DiffChunk[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origTokens[i - 1] === impTokens[j - 1]) {
      tempChunks.unshift({ type: 'unchanged', value: origTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tempChunks.unshift({ type: 'added', value: impTokens[j - 1] });
      if (/\S/.test(impTokens[j - 1])) addedCount++;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      tempChunks.unshift({ type: 'removed', value: origTokens[i - 1] });
      if (/\S/.test(origTokens[i - 1])) removedCount++;
      i--;
    }
  }

  return { chunks: tempChunks, addedCount, removedCount };
}

export const PromptDiffViewer: React.FC<PromptDiffViewerProps> = ({
  original,
  improved,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [copied, setCopied] = useState(false);

  const safeOriginal = typeof original === 'string' ? original : '';
  const safeImproved = typeof improved === 'string' ? improved : '';

  const { chunks, addedCount, removedCount } = useMemo(() => {
    return computeWordDiff(safeOriginal, safeImproved);
  }, [safeOriginal, safeImproved]);

  const handleCopyImproved = () => {
    if (!safeImproved) return;
    navigator.clipboard.writeText(safeImproved);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-bg-secondary border border-border-default rounded-xl overflow-hidden shadow-xs flex flex-col ${className}`}>
      {/* Diff Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-bg-tertiary/60 border-b border-border-default">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-text-secondary">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span className="font-semibold text-text-primary">Prompt Architecture Diff</span>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 font-medium">
              +{addedCount} additions
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20 font-medium">
              -{removedCount} pruned
            </span>
          </div>
        </div>

        {/* Controls: Mode Switcher & Copy */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-0.5 rounded-lg bg-bg-primary border border-border-default text-xs">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-3 py-1.5 sm:py-1 rounded-md transition-all font-mono text-xs sm:text-[11px] min-h-[40px] sm:min-h-[28px] cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-bg-secondary text-text-primary font-bold shadow-xs border border-border-default/50'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Side-by-side split view"
            >
              <Columns className="w-3.5 h-3.5" /> Split
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1 px-3 py-1.5 sm:py-1 rounded-md transition-all font-mono text-xs sm:text-[11px] min-h-[40px] sm:min-h-[28px] cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-bg-secondary text-text-primary font-bold shadow-xs border border-border-default/50'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Unified inline diff view"
            >
              <AlignLeft className="w-3.5 h-3.5" /> Unified
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyImproved}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[44px] sm:min-h-[30px]"
            title="Copy improved prompt"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Hardened'}</span>
          </button>
        </div>
      </div>

      {/* Diff Content Body */}
      <div className="p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed custom-scrollbar">
        {viewMode === 'unified' ? (
          <div className="p-4 bg-bg-primary rounded-lg border border-border-default/70 whitespace-pre-wrap break-words select-text">
            {chunks.map((chunk, idx) => {
              if (chunk.type === 'added') {
                return (
                  <span
                    key={idx}
                    className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 px-0.5 py-0.2 rounded border border-emerald-300 dark:border-emerald-800/80 font-semibold"
                  >
                    {chunk.value}
                  </span>
                );
              }
              if (chunk.type === 'removed') {
                return (
                  <span
                    key={idx}
                    className="bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-400 line-through opacity-70 px-0.5 py-0.2 rounded border border-rose-200 dark:border-rose-900/50"
                  >
                    {chunk.value}
                  </span>
                );
              }
              return <span key={idx} className="text-text-primary">{chunk.value}</span>;
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Original Column */}
            <div className="flex flex-col space-y-1.5 min-w-0">
              <div className="flex items-center justify-between text-[11px] text-text-muted font-sans font-semibold uppercase tracking-wider pb-1">
                <span>Original Prompt (Unoptimized)</span>
                <span className="text-text-muted font-mono">{safeOriginal.split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <div className="p-3.5 bg-bg-primary rounded-lg border border-border-default/80 whitespace-pre-wrap break-words text-text-secondary flex-1 min-h-[140px] select-text">
                {safeOriginal || <span className="text-text-muted italic">No original prompt text</span>}
              </div>
            </div>

            {/* Improved Column */}
            <div className="flex flex-col space-y-1.5 min-w-0">
              <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 font-sans font-semibold uppercase tracking-wider pb-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Hardened Architecture (Target Model)
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                  {safeImproved.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-lg border border-emerald-300/50 dark:border-emerald-800/40 whitespace-pre-wrap break-words text-text-primary flex-1 min-h-[140px] select-text">
                {safeImproved || <span className="text-text-muted italic">No improved prompt available</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
