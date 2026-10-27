import React, { useState } from 'react';
import { History, ArrowLeftRight, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';

interface VersionDiffViewerProps {
  currentVersion: { versionNumber: number; rawContent: string; title: string };
  previousVersion: { versionNumber: number; rawContent: string; title: string };
  onRestore: (versionNumber: number) => void;
}

export const VersionDiffViewer: React.FC<VersionDiffViewerProps> = ({
  currentVersion,
  previousVersion,
  onRestore,
}) => {
  const [viewMode, setViewMode] = useState<'sideBySide' | 'inline'>('sideBySide');

  const currLines = currentVersion.rawContent.split('\n');
  const prevLines = previousVersion.rawContent.split('\n');

  return (
    <div className="rounded-xl bg-bg-secondary border border-border-default p-5 space-y-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary text-sm flex items-center gap-1.5">
              <span>Version Comparison</span>
              <span className="font-mono text-xs text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">v{previousVersion.versionNumber}</span>
              <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
              <span className="font-mono text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">v{currentVersion.versionNumber}</span>
            </h3>
            <p className="text-[11px] text-text-secondary mt-0.5">Inspect visual line diffs before restoring prior revisions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'sideBySide' ? 'inline' : 'sideBySide')}
            className="btn-secondary text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5 cursor-pointer min-h-[36px]"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{viewMode === 'sideBySide' ? 'Inline View' : 'Side-by-Side'}</span>
          </button>

          <button
            onClick={() => onRestore(previousVersion.versionNumber)}
            className="btn-primary text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[36px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore v{previousVersion.versionNumber}</span>
          </button>
        </div>
      </div>

      {viewMode === 'sideBySide' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-rose-50/30 border border-rose-200/70 rounded-xl p-3.5 space-y-1.5 overflow-x-auto">
            <div className="text-xs font-semibold text-rose-900 pb-2 border-b border-rose-200/50 mb-2 flex items-center justify-between">
              <span>v{previousVersion.versionNumber} (Previous Revision)</span>
            </div>
            {prevLines.map((line, idx) => (
              <div key={idx} className="text-rose-900 bg-rose-100/50 px-2.5 py-1 rounded border border-rose-200/50">
                - {line}
              </div>
            ))}
          </div>

          <div className="bg-emerald-50/30 border border-emerald-200/70 rounded-xl p-3.5 space-y-1.5 overflow-x-auto">
            <div className="text-xs font-semibold text-emerald-900 pb-2 border-b border-emerald-200/50 mb-2 flex items-center justify-between">
              <span>v{currentVersion.versionNumber} (Current Active)</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            {currLines.map((line, idx) => (
              <div key={idx} className="text-emerald-900 bg-emerald-100/50 px-2.5 py-1 rounded border border-emerald-200/50">
                + {line}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-bg-tertiary border border-border-default rounded-xl p-3.5 space-y-1.5 font-mono text-xs overflow-x-auto">
          {prevLines.map((line, idx) => (
            <div key={`prev-${idx}`} className="text-rose-900 bg-rose-50 px-2.5 py-1 rounded border border-rose-200/70">
              - {line}
            </div>
          ))}
          {currLines.map((line, idx) => (
            <div key={`curr-${idx}`} className="text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200/70">
              + {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VersionDiffViewer;
