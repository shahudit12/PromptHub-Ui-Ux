import React, { useState } from 'react';
import { History, GitCompare, RotateCcw, Check, Sparkles } from 'lucide-react';

export interface DeliverableVersion {
  version: number;
  label?: string;
  timestamp?: number;
  summary?: string;
  author?: string;
  changes?: string[];
}

export interface DeliverableVersionPillsProps {
  versions: DeliverableVersion[] | number[];
  activeVersion: number;
  onSelectVersion: (version: number) => void;
  onCompare?: (versionA: number, versionB: number) => void;
  onRevert?: (version: number) => void;
  className?: string;
  title?: string;
  allowCompareModal?: boolean;
}

export const DeliverableVersionPills: React.FC<DeliverableVersionPillsProps> = ({
  versions,
  activeVersion,
  onSelectVersion,
  onCompare,
  onRevert,
  className = '',
  title = 'Iterations',
  allowCompareModal = true,
}) => {
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareTargetA, setCompareTargetA] = useState<number>(1);
  const [compareTargetB, setCompareTargetB] = useState<number>(activeVersion);
  const [revertFeedback, setRevertFeedback] = useState<string | null>(null);

  // Normalize versions to DeliverableVersion objects
  const normalizedVersions: DeliverableVersion[] = versions.map((v, index) => {
    if (typeof v === 'number') {
      return {
        version: v,
        label: `v${v}`,
        summary: index === 0 ? 'Initial generation' : `Iteration ${v}`,
      };
    }
    return {
      ...v,
      label: v.label || `v${v.version}`,
    };
  });

  const latestVersion = Math.max(...normalizedVersions.map((v) => v.version), 1);
  const isViewingHistorical = activeVersion < latestVersion;
  const currentVersionMeta = normalizedVersions.find((v) => v.version === activeVersion);

  const handleRevert = (v: number) => {
    if (onRevert) {
      onRevert(v);
    }
    setRevertFeedback(`Reverted to version v${v}`);
    setTimeout(() => setRevertFeedback(null), 2500);
  };

  const handleCompareClick = () => {
    if (onCompare) {
      const targetA = activeVersion > 1 ? activeVersion - 1 : 1;
      const targetB = activeVersion;
      onCompare(targetA, targetB);
    } else if (allowCompareModal) {
      setCompareTargetA(activeVersion > 1 ? activeVersion - 1 : 1);
      setCompareTargetB(activeVersion);
      setShowCompareDialog(true);
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2.5 py-1.5 px-3 rounded-xl bg-bg-tertiary/60 border border-border-default transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
    >
      {/* Left side: Version pills container */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-text-muted text-xs font-mono font-medium shrink-0">
          <History className="w-3.5 h-3.5 text-brand-primary shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">{title}:</span>
        </div>

        <div
          className="flex items-center gap-1.5 p-0.5 rounded-lg bg-bg-secondary border border-border-subtle"
          role="tablist"
          aria-label="Deliverable version history"
        >
          {normalizedVersions.map((item) => {
            const isActive = item.version === activeVersion;
            const isLatest = item.version === latestVersion;

            return (
              <button
                key={item.version}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Switch to iteration ${item.label || `v${item.version}`}${item.summary ? `: ${item.summary}` : ''}`}
                title={item.summary || `Switch to version ${item.version}`}
                onClick={() => onSelectVersion(item.version)}
                className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-md text-xs font-mono font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer flex items-center justify-center gap-1.5 ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-xs font-bold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80'
                }`}
              >
                <span>{item.label}</span>
                {isLatest && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-sans uppercase tracking-wider font-semibold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-brand-primary/10 text-brand-primary'
                    }`}
                  >
                    Latest
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Current version summary pill */}
        {currentVersionMeta?.summary && (
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono text-text-muted px-2 py-1 rounded bg-bg-secondary/80 border border-border-subtle">
            <Sparkles className="w-3 h-3 text-brand-accent shrink-0" />
            <span className="truncate max-w-[180px]">{currentVersionMeta.summary}</span>
          </span>
        )}
      </div>

      {/* Right side: Quick actions (Compare / Revert) */}
      <div className="flex items-center gap-1.5 shrink-0">
        {revertFeedback && (
          <span className="flex items-center gap-1 text-xs text-brand-primary font-mono bg-brand-primary/10 px-2 py-1 rounded-md animate-fade-in">
            <Check className="w-3 h-3 text-brand-primary" />
            <span>{revertFeedback}</span>
          </span>
        )}

        {normalizedVersions.length > 1 && (
          <button
            type="button"
            onClick={handleCompareClick}
            className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-mono rounded-lg border border-border-default hover:border-brand-primary/40 bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-3xs"
            title="Compare changes between iterations"
            aria-label="Compare changes between iterations"
          >
            <GitCompare className="w-3.5 h-3.5 text-brand-accent shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Compare</span>
          </button>
        )}

        {isViewingHistorical && (
          <button
            type="button"
            onClick={() => handleRevert(activeVersion)}
            className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-mono font-medium rounded-lg border border-brand-primary/30 hover:border-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-3xs"
            title={`Restore v${activeVersion} as current active deliverable`}
            aria-label={`Restore version ${activeVersion}`}
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Revert to v{activeVersion}</span>
          </button>
        )}
      </div>

      {/* In-component compare modal */}
      {showCompareDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="compare-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl bg-bg-secondary border border-border-default p-5 shadow-xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-brand-accent" />
                <h3 id="compare-modal-title" className="text-sm font-semibold font-display text-text-primary">
                  Compare Historical Iterations
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCompareDialog(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                aria-label="Close compare dialog"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                Select two iterations to inspect diffs and understand what changed between generations:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-bg-tertiary/70 border border-border-subtle">
                  <label className="block text-[11px] font-mono text-text-muted mb-1.5">Base Version</label>
                  <select
                    value={compareTargetA}
                    onChange={(e) => setCompareTargetA(Number(e.target.value))}
                    className="min-h-[44px] w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-bg-secondary border border-border-default text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-accent"
                  >
                    {normalizedVersions.map((v) => (
                      <option key={v.version} value={v.version}>
                        {v.label} {v.summary ? `— ${v.summary}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 rounded-xl bg-bg-tertiary/70 border border-border-subtle">
                  <label className="block text-[11px] font-mono text-text-muted mb-1.5">Target Version</label>
                  <select
                    value={compareTargetB}
                    onChange={(e) => setCompareTargetB(Number(e.target.value))}
                    className="min-h-[44px] w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-bg-secondary border border-border-default text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-accent"
                  >
                    {normalizedVersions.map((v) => (
                      <option key={v.version} value={v.version}>
                        {v.label} {v.summary ? `— ${v.summary}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Summary comparison card */}
              <div className="p-3 rounded-xl bg-bg-primary/50 border border-border-subtle text-xs space-y-1.5">
                <div className="font-semibold text-text-primary flex items-center justify-between">
                  <span>Delta Summary</span>
                  <span className="font-mono text-[10px] text-brand-primary">v{compareTargetA} → v{compareTargetB}</span>
                </div>
                <div className="text-text-secondary text-[11px] font-mono">
                  Base: {normalizedVersions.find((v) => v.version === compareTargetA)?.summary || 'None'}
                </div>
                <div className="text-text-secondary text-[11px] font-mono">
                  Target: {normalizedVersions.find((v) => v.version === compareTargetB)?.summary || 'None'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setShowCompareDialog(false)}
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-mono rounded-xl border border-border-default hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCompareDialog(false);
                  if (onCompare) {
                    onCompare(compareTargetA, compareTargetB);
                  }
                }}
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-mono font-semibold rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white transition-colors cursor-pointer shadow-xs"
              >
                Inspect Diffs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
