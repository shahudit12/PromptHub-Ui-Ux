import React, { useState } from 'react';
import { 
  FolderOpen, 
  FileCode, 
  FileText, 
  FileJson, 
  Plus, 
  Trash2, 
  Search,
  Check,
  X,
  HardDrive,
  Download
} from 'lucide-react';
import type { WorkFile } from '../../types/work';
import { useConfirm } from '../../hooks/useConfirm';

interface WorkFileExplorerProps {
  files: WorkFile[];
  selectedFilePath?: string;
  onSelectFile: (file: WorkFile) => void;
  onCreateFile: (path: string) => Promise<void>;
  onDeleteFile: (path: string) => Promise<void>;
  onSyncToDrive?: () => Promise<void>;
  onImportFromDrive?: () => void;
  onExportToDesktop?: () => Promise<void> | void;
  onDownloadFile?: (filePath: string) => Promise<void> | void;
}

export const WorkFileExplorer: React.FC<WorkFileExplorerProps> = ({
  files,
  selectedFilePath,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onSyncToDrive,
  onImportFromDrive,
  onExportToDesktop,
  onDownloadFile,
}) => {
  const confirm = useConfirm();
  const [filterQuery, setFilterQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');

  const filteredFiles = files.filter((f) =>
    f.path.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewFilePath('');
  };

  const handleConfirmCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath.trim()) return;
    await onCreateFile(newFilePath.trim());
    setIsCreating(false);
    setNewFilePath('');
  };

  const getFileIcon = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        return <FileCode className="w-3.5 h-3.5 text-brand-primary shrink-0" />;
      case 'json':
        return <FileJson className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'md':
        return <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />;
    }
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl flex flex-col h-full overflow-hidden">
      {/* Header & Controls */}
      <div className="p-3 border-b border-border-subtle flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <FolderOpen className="w-4 h-4 text-brand-primary shrink-0" />
          <span className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
            Files ({files.length})
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onExportToDesktop && (
            <button
              type="button"
              onClick={onExportToDesktop}
              title="Export Project (.zip) to Desktop"
              className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center rounded-md border border-border-default hover:bg-bg-tertiary text-brand-primary hover:text-brand-primary-hi transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {onImportFromDrive && (
            <button
              type="button"
              onClick={onImportFromDrive}
              title="Import File from Google Drive"
              className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center rounded-md border border-border-default hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5 text-sky-600" />
            </button>
          )}

          {onSyncToDrive && (
            <button
              type="button"
              onClick={onSyncToDrive}
              title="Sync Workspace to Google Drive"
              className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center rounded-md border border-border-default hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
            </button>
          )}

          <button
            type="button"
            onClick={handleStartCreate}
            title="New File"
            className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center rounded-md border border-border-default hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter search */}
      <div className="px-2.5 py-1.5 border-b border-border-subtle/60 shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-primary border border-border-subtle">
          <Search className="w-3 h-3 text-text-muted shrink-0" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-transparent text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </div>
      </div>

      {/* Inline Create Input */}
      {isCreating && (
        <form onSubmit={handleConfirmCreate} className="p-2 border-b border-border-subtle bg-bg-tertiary/40 flex items-center gap-1">
          <input
            type="text"
            autoFocus
            value={newFilePath}
            onChange={(e) => setNewFilePath(e.target.value)}
            placeholder="e.g. src/components/Header.tsx"
            className="flex-1 px-2 py-1 text-xs rounded border border-border-default bg-bg-secondary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
          <button
            type="submit"
            className="min-h-[44px] min-w-[44px] sm:min-h-[26px] sm:min-w-[26px] flex items-center justify-center rounded bg-brand-primary text-white hover:bg-brand-primary-hi"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="min-h-[44px] min-w-[44px] sm:min-h-[26px] sm:min-w-[26px] flex items-center justify-center rounded border border-border-default text-text-muted hover:text-text-primary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {filteredFiles.length === 0 ? (
          <div className="p-4 text-center text-xs text-text-muted">
            No files found matching criteria.
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isSelected = selectedFilePath === file.path;

            return (
              <div
                key={file.path}
                onClick={() => onSelectFile(file)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelectFile(file);
                }}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer min-h-[44px] sm:min-h-[32px] ${
                  isSelected
                    ? 'bg-brand-primary-light/60 text-brand-primary-hi font-semibold border-l-2 border-brand-primary'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  {getFileIcon(file.path)}
                  <span className="truncate">{file.path}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {file.isNew && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-sans font-medium">
                      NEW
                    </span>
                  )}
                  {file.isModified && !file.isNew && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 font-sans font-medium">
                      MOD
                    </span>
                  )}

                  {onDownloadFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadFile(file.path);
                      }}
                      title={`Download ${file.path} to Desktop`}
                      className="opacity-70 group-hover:opacity-100 min-h-[44px] min-w-[44px] sm:min-h-[22px] sm:min-w-[22px] flex items-center justify-center rounded text-text-muted hover:text-brand-primary transition-opacity cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const ok = await confirm({
                        title: 'Delete File',
                        message: `Are you sure you want to delete ${file.path}? This action cannot be undone.`,
                        confirmText: 'Delete File',
                        cancelText: 'Cancel',
                        variant: 'danger',
                      });
                      if (ok) {
                        await onDeleteFile(file.path);
                      }
                    }}
                    title="Delete file"
                    className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 min-h-[44px] min-w-[44px] sm:min-h-[22px] sm:min-w-[22px] flex items-center justify-center rounded text-text-muted hover:text-rose-600 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
