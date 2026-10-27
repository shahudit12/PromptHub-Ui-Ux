import React, { useState } from 'react';
import { 
  GitCommit, 
  Check, 
  Copy, 
  Columns, 
  AlignLeft
} from 'lucide-react';
import type { WorkFileDiff } from '../../types/work';

interface WorkDiffViewerProps {
  diffs: WorkFileDiff[];
  selectedPath?: string;
  onSelectPath?: (path: string) => void;
}

export const WorkDiffViewer: React.FC<WorkDiffViewerProps> = ({
  diffs,
  selectedPath,
  onSelectPath,
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [isCopied, setIsCopied] = useState(false);

  const activeDiff = diffs.find((d) => d.path === selectedPath) || diffs[0];

  const handleCopyPatch = async () => {
    if (!activeDiff) return;
    let patchText = `--- a/${activeDiff.path}\n+++ b/${activeDiff.path}\n`;
    activeDiff.chunks.forEach((chunk) => {
      patchText += `@@ -${chunk.oldStart},${chunk.oldLines} +${chunk.newStart},${chunk.newLines} @@\n`;
      chunk.lines.forEach((l) => {
        const prefix = l.type === 'add' ? '+' : l.type === 'delete' ? '-' : ' ';
        patchText += `${prefix}${l.content}\n`;
      });
    });
    await navigator.clipboard.writeText(patchText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  if (!activeDiff || diffs.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border-default rounded-xl flex flex-col items-center justify-center p-8 text-center h-full">
        <GitCommit className="w-10 h-10 text-text-muted/60 mb-2" />
        <h3 className="text-sm font-semibold text-text-primary">No Virtual Diffs</h3>
        <p className="text-xs text-text-muted mt-1 max-w-sm">
          No modified files in this task's virtual worktree yet. Execute an agent task to generate changes.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl flex flex-col h-full overflow-hidden shadow-2xs">
      {/* Diff Header */}
      <div className="bg-bg-tertiary/60 border-b border-border-subtle px-3 py-2 flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <GitCommit className="w-4 h-4 text-brand-primary shrink-0" />

          {/* Diff file dropdown/selector if multiple */}
          {diffs.length > 1 ? (
            <select
              value={activeDiff.path}
              onChange={(e) => onSelectPath?.(e.target.value)}
              aria-label="Select Diff File"
              className="bg-bg-secondary border border-border-default rounded px-2 py-1 text-xs font-mono text-text-primary focus:outline-none cursor-pointer min-h-[44px] sm:min-h-[28px]"
            >
              {diffs.map((d) => (
                <option key={d.path} value={d.path}>
                  {d.path} (+{d.linesAdded}, -{d.linesRemoved})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-mono font-semibold text-text-primary truncate">
              {activeDiff.path}
            </span>
          )}

          {/* Addition / Deletion badge */}
          <div className="flex items-center gap-1.5 text-xs font-mono shrink-0 ml-1">
            <span className="text-emerald-600 font-medium">+{activeDiff.linesAdded}</span>
            <span className="text-rose-600 font-medium">-{activeDiff.linesRemoved}</span>
          </div>
        </div>

        {/* View Mode & Copy Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-bg-secondary rounded-md p-0.5 border border-border-default">
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              title="Unified Diff View"
              className={`min-h-[44px] min-w-[44px] sm:min-h-[26px] sm:min-w-[26px] flex items-center justify-center rounded transition-colors ${
                viewMode === 'unified' ? 'bg-bg-tertiary text-text-primary font-medium' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              title="Split Side-by-Side View"
              className={`min-h-[44px] min-w-[44px] sm:min-h-[26px] sm:min-w-[26px] flex items-center justify-center rounded transition-colors ${
                viewMode === 'split' ? 'bg-bg-tertiary text-text-primary font-medium' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyPatch}
            title="Copy Git Patch"
            className="min-h-[44px] sm:min-h-[28px] px-2.5 rounded-md border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Copy Patch</span>
          </button>
        </div>
      </div>

      {/* Diff Content Body */}
      <div className="flex-1 overflow-auto font-mono text-xs p-2 bg-bg-primary selection:bg-brand-primary selection:text-white">
        {activeDiff.chunks.map((chunk, cIdx) => (
          <div key={cIdx} className="mb-4 last:mb-0 border border-border-subtle rounded-lg overflow-hidden bg-bg-secondary">
            {/* Chunk Header */}
            <div className="bg-bg-tertiary/70 text-text-muted px-3 py-1 text-[11px] font-mono border-b border-border-subtle select-none">
              @@ -{chunk.oldStart},{chunk.oldLines} +{chunk.newStart},{chunk.newLines} @@
            </div>

            {/* Chunk Lines */}
            <div className="divide-y divide-border-subtle/30 font-mono text-[11px] leading-5">
              {chunk.lines.map((line, lIdx) => {
                const isAdd = line.type === 'add';
                const isDel = line.type === 'delete';

                return (
                  <div
                    key={lIdx}
                    className={`flex items-start ${
                      isAdd
                        ? 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                        : isDel
                        ? 'bg-rose-500/10 text-rose-900 dark:text-rose-200'
                        : 'text-text-secondary'
                    }`}
                  >
                    {/* Old line number */}
                    <div className="w-10 text-right pr-2 select-none text-text-muted/60 shrink-0 border-r border-border-subtle/40">
                      {line.oldLineNumber || ''}
                    </div>

                    {/* New line number */}
                    <div className="w-10 text-right pr-2 select-none text-text-muted/60 shrink-0 border-r border-border-subtle/40">
                      {line.newLineNumber || ''}
                    </div>

                    {/* Prefix sign */}
                    <div className="w-6 text-center select-none shrink-0 font-bold">
                      {isAdd ? '+' : isDel ? '-' : ' '}
                    </div>

                    {/* Code content */}
                    <div className="flex-1 px-1 whitespace-pre overflow-x-auto">
                      {line.content || ' '}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
