import React, { useState } from 'react';
import { History, GitCommit, Clock, RotateCcw, Plus } from 'lucide-react';
import type { PromptVersion } from '../../db/schema';
import { VersionDiffViewer } from '../ui/VersionDiffViewer';

export interface VersionHistoryPanelProps {
  versions: PromptVersion[];
  currentContent: string;
  onRestoreVersion: (version: PromptVersion) => void;
  onCreateSnapshot?: (notes: string) => void;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  versions,
  currentContent,
  onRestoreVersion,
  onCreateSnapshot,
}) => {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    versions.length > 0 ? versions[0].id : null
  );
  const [newSnapshotNotes, setNewSnapshotNotes] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  const selectedVersion = versions.find((v) => v.id === selectedVersionId);

  const handleSnapshotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapshotNotes.trim() || !onCreateSnapshot) return;
    onCreateSnapshot(newSnapshotNotes.trim());
    setNewSnapshotNotes('');
    setIsCreatingSnapshot(false);
  };

  return (
    <div className="flex flex-col md:flex-row flex-1 h-full min-h-0 bg-bg-primary overflow-hidden">
      {/* Version Sidebar / List */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border-default bg-bg-secondary flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-border-default flex items-center justify-between bg-bg-primary/50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-brand-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Version History</h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-primary-light text-brand-primary">
              {versions.length}
            </span>
          </div>

          {onCreateSnapshot && (
            <button
              type="button"
              onClick={() => setIsCreatingSnapshot(!isCreatingSnapshot)}
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
              title="Create Version Snapshot"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Snapshot Creation Form */}
        {isCreatingSnapshot && (
          <form onSubmit={handleSnapshotSubmit} className="p-3 border-b border-border-default bg-bg-primary space-y-2">
            <input
              type="text"
              value={newSnapshotNotes}
              onChange={(e) => setNewSnapshotNotes(e.target.value)}
              placeholder="e.g. Added JSON schema validation"
              className="w-full text-xs px-2.5 py-1.5 rounded-md bg-bg-secondary border border-border-default text-text-primary focus:outline-none focus:border-brand-primary"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingSnapshot(false)}
                className="text-[11px] text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded bg-brand-primary text-white text-[11px] font-semibold hover:bg-brand-primary-hi"
              >
                Save Snapshot
              </button>
            </div>
          </form>
        )}

        {/* Version Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {versions.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-muted">
              No previous version snapshots found.
            </div>
          ) : (
            versions.map((ver) => {
              const isSelected = ver.id === selectedVersionId;
              const dateStr = ver.createdAt ? new Date(ver.createdAt).toLocaleString() : 'Recent';

              return (
                <div
                  key={ver.id}
                  onClick={() => setSelectedVersionId(ver.id)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-brand-primary-light/50 border-brand-primary text-text-primary ring-1 ring-brand-primary/20 shadow-2xs'
                      : 'bg-bg-primary/50 border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold flex items-center gap-1">
                      <GitCommit className="w-3.5 h-3.5 text-brand-primary" />
                      v{ver.versionNumber}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                    {ver.updateNotes || 'Automated version save snapshot.'}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Diff & Rollback View Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-bg-primary overflow-y-auto p-6 space-y-4">
        {selectedVersion ? (
          <>
            <div className="flex items-center justify-between p-4 rounded-xl bg-bg-secondary border border-border-default">
              <div>
                <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <span>Comparing Current Prompt with v{selectedVersion.versionNumber}</span>
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  Restoring will append a new version snapshot non-destructively.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onRestoreVersion(selectedVersion)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore v{selectedVersion.versionNumber} as New Version</span>
              </button>
            </div>

            <div className="rounded-xl border border-border-default bg-bg-secondary p-4 shadow-sm overflow-hidden">
              <VersionDiffViewer
                currentVersion={{ versionNumber: selectedVersion.versionNumber + 1, rawContent: currentContent, title: 'Current Editor Content' }}
                previousVersion={{ versionNumber: selectedVersion.versionNumber, rawContent: selectedVersion.rawContent, title: `Snapshot v${selectedVersion.versionNumber}` }}
                onRestore={() => onRestoreVersion(selectedVersion)}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-xs text-text-muted">
            Select a version snapshot to preview line-by-line diff.
          </div>
        )}
      </div>
    </div>
  );
};
