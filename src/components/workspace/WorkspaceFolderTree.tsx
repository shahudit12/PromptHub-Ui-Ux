import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  Image as ImageIcon,
  HardDrive,
  Download,
  Check,
  ChevronRight,
  ChevronDown,
  Cloud,
  ChevronLeft,
  Database,
  Terminal,
} from 'lucide-react';
import type { WorkFile } from '../../types/work';
import { formatStorageBytes, type StorageQuota } from '../../services/storageService';

export interface WorkspaceFolderTreeProps {
  projectName: string;
  files: WorkFile[];
  selectedFilePath?: string;
  onSelectFile: (file: WorkFile) => void;
  onSyncToDrive?: () => Promise<void>;
  onExportZip?: () => Promise<void> | void;
  isSyncingDrive?: boolean;
  isExportingZip?: boolean;
  lastSyncedToDrive?: string;
  storageQuota?: StorageQuota | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const WorkspaceFolderTree: React.FC<WorkspaceFolderTreeProps> = ({
  projectName,
  files,
  selectedFilePath,
  onSelectFile,
  onSyncToDrive,
  onExportZip,
  isSyncingDrive = false,
  isExportingZip = false,
  lastSyncedToDrive,
  storageQuota,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
}) => {
  const [isFolderOpen, setIsFolderOpen] = useState(true);

  const getFileIcon = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return <FileCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      case 'js':
      case 'jsx':
        return <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'py':
        return <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'sql':
        return <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'html':
      case 'css':
        return <FileCode className="w-3.5 h-3.5 text-brand-primary shrink-0" />;
      case 'json':
        return <FileJson className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'md':
      case 'txt':
        return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'webp':
        return <ImageIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />;
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 h-full bg-bg-secondary border-r border-border-default flex flex-col items-center py-3 select-none justify-between shrink-0">
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
            title="Expand Folder & File Explorer"
            aria-label="Expand Folder Tree"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs">
            <Folder className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-bg-tertiary border border-border-default text-text-muted text-center" title={`${files.length} Files`}>
            {files.length}
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          {onSyncToDrive && (
            <button
              type="button"
              onClick={onSyncToDrive}
              disabled={isSyncingDrive}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-brand-primary hover:bg-bg-tertiary transition-colors cursor-pointer disabled:opacity-50"
              title="Sync to Google Drive"
              aria-label="Sync to Google Drive"
            >
              <HardDrive className={`w-4 h-4 ${isSyncingDrive ? 'animate-spin text-brand-primary' : ''}`} />
            </button>
          )}
          {onExportZip && (
            <button
              type="button"
              onClick={onExportZip}
              disabled={isExportingZip}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-brand-primary hover:bg-bg-tertiary transition-colors cursor-pointer disabled:opacity-50"
              title="Download Project ZIP"
              aria-label="Download Project ZIP"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  const quotaPercent = storageQuota && storageQuota.limitBytes > 0
    ? Math.min(100, Math.round((storageQuota.usedBytes / storageQuota.limitBytes) * 100))
    : 0;

  return (
    <aside
      aria-label="Project Files and Cloud Drive Explorer"
      className={`w-64 sm:w-72 h-full bg-bg-secondary border-r border-border-default flex flex-col justify-between select-none shrink-0 overflow-hidden font-sans ${className}`}
    >
      {/* ── 1. Header: Project & Cloud Status (Antigravity & Figma style) ── */}
      <div className="p-3 border-b border-border-default bg-bg-secondary flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
              <Cloud className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-text-primary block truncate">
                Cloud &bull; Drive
              </span>
              <span className="text-[9.5px] text-text-muted font-mono flex items-center gap-1">
                {lastSyncedToDrive ? (
                  <>
                    <Check className="w-2.5 h-2.5 text-emerald-500" />
                    <span>Drive Synced</span>
                  </>
                ) : (
                  <span>Ready to Sync</span>
                )}
              </span>
            </div>
          </div>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
              title="Collapse file navigator"
              aria-label="Collapse file navigator"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sync & Export Quick Controls */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          {onSyncToDrive && (
            <button
              type="button"
              onClick={onSyncToDrive}
              disabled={isSyncingDrive}
              className="min-h-[36px] px-2 py-1.5 rounded-lg border border-border-default hover:border-brand-primary/50 bg-bg-primary hover:bg-bg-tertiary text-xs text-text-primary font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs disabled:opacity-50"
              title="Sync project folder to Google Drive Vault"
            >
              <HardDrive className={`w-3.5 h-3.5 text-brand-primary shrink-0 ${isSyncingDrive ? 'animate-spin' : ''}`} />
              <span className="text-[11px] truncate">{isSyncingDrive ? 'Syncing...' : 'Sync Drive'}</span>
            </button>
          )}

          {onExportZip && (
            <button
              type="button"
              onClick={onExportZip}
              disabled={isExportingZip}
              className="min-h-[36px] px-2 py-1.5 rounded-lg border border-border-default hover:border-brand-primary/50 bg-bg-primary hover:bg-bg-tertiary text-xs text-text-primary font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs disabled:opacity-50"
              title="Download folder as clean .zip archive"
            >
              <Download className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span className="text-[11px] truncate">{isExportingZip ? 'Exporting...' : 'ZIP Folder'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Single Project Folder Tree (No Clutter) ── */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {/* Project Root Folder Node */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => setIsFolderOpen(!isFolderOpen)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-bg-tertiary text-text-primary text-xs font-bold transition-colors cursor-pointer group text-left min-h-[36px]"
          >
            {isFolderOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary shrink-0" />
            )}
            {isFolderOpen ? (
              <FolderOpen className="w-4 h-4 text-brand-primary shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-brand-primary shrink-0" />
            )}
            <span className="truncate flex-1 font-mono text-[11.5px]">
              {projectName || 'project-bundle'}
            </span>
            <span className="text-[10px] font-mono text-text-muted font-normal px-1.5 py-0.2 rounded bg-bg-primary border border-border-default shrink-0">
              {files.length}
            </span>
          </button>

          {/* Child Files */}
          {isFolderOpen && (
            <div className="pl-4 space-y-0.5 border-l border-border-default/60 ml-3.5 my-1">
              {files.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-text-muted font-mono italic">
                  Folder is empty. Type a prompt to generate files.
                </div>
              ) : (
                files.map((file) => {
                  const isSelected = selectedFilePath === file.path;
                  const displayName = file.path.split('/').pop() || file.path;

                  return (
                    <button
                      key={file.id || file.path}
                      type="button"
                      onClick={() => onSelectFile(file)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer text-left min-h-[34px] ${
                        isSelected
                          ? 'bg-brand-primary/15 text-brand-primary dark:text-brand-accent font-semibold border border-brand-primary/30 shadow-3xs'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-transparent'
                      }`}
                      title={`${file.path} (${formatStorageBytes(file.size || (file.content ? file.content.length : 0))})`}
                    >
                      {getFileIcon(file.path)}
                      <span className="truncate flex-1 text-[11px]">{displayName}</span>
                      <span className="text-[9.5px] text-text-muted shrink-0 opacity-70">
                        {formatStorageBytes(file.size || (file.content ? file.content.length : 0))}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Footer: Google Drive Vault Quota ── */}
      <div className="p-3 border-t border-border-default bg-bg-secondary/60 shrink-0 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
          <span className="flex items-center gap-1 font-bold">
            <HardDrive className="w-3 h-3 text-brand-primary" />
            <span>Drive Storage Vault</span>
          </span>
          <span>
            {storageQuota
              ? `${formatStorageBytes(storageQuota.usedBytes)} / ${formatStorageBytes(storageQuota.limitBytes)}`
              : '500 MB Free'}
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden border border-border-default">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              quotaPercent > 90 ? 'bg-rose-500' : quotaPercent > 75 ? 'bg-amber-500' : 'bg-brand-primary'
            }`}
            style={{ width: `${quotaPercent}%` }}
          />
        </div>

        <p className="text-[9.5px] text-text-muted leading-relaxed truncate">
          All code &amp; images packaged in a single clutter-free folder.
        </p>
      </div>
    </aside>
  );
};
