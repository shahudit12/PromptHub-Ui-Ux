import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Save, 
  Copy, 
  Check, 
  X, 
  Eye, 
  Edit3,
  RotateCcw,
  Sparkles,
  HardDrive,
  ArrowRight,
  Download,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import type { WorkFile } from '../../types/work';
import { useConfirm } from '../../hooks/useConfirm';

interface WorkCodeEditorProps {
  openFiles: WorkFile[];
  activeFilePath?: string;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onSaveFile: (path: string, content: string) => Promise<void>;
  onDeleteFile?: (path: string) => Promise<void> | void;
  onPromptAction?: (promptText: string) => void;
  onCreateNewFile?: () => void;
}

export const WorkCodeEditor: React.FC<WorkCodeEditorProps> = ({
  openFiles,
  activeFilePath,
  onSelectTab,
  onCloseTab,
  onSaveFile,
  onDeleteFile,
  onPromptAction,
  onCreateNewFile,
}) => {
  const confirm = useConfirm();
  const activeFile = openFiles.find((f) => f.path === activeFilePath) || openFiles[0];
  const isImage = Boolean(
    activeFile &&
    (activeFile.mimeType?.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(activeFile.path))
  );
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    if (activeFile) {
      setContent(activeFile.content);
      setIsDirty(false);
    } else {
      setContent('');
      setIsDirty(false);
    }
  }, [activeFile?.path, activeFile?.content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!activeFile || !isDirty || isSaving) return;
    setIsSaving(true);
    try {
      await onSaveFile(activeFile.path, content);
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const handleReset = () => {
    if (activeFile) {
      setContent(activeFile.content);
      setIsDirty(false);
    }
  };

  if (!activeFile) {
    return (
      <div className="bg-bg-secondary border border-border-default rounded-xl flex flex-col items-center justify-center p-6 sm:p-10 text-center h-full overflow-y-auto">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary-light/40 border border-brand-primary/30 text-brand-primary text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5" /> PromptHub IDE &amp; Execution Engine
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-text-primary">
              Clean Workspace Canvas
            </h2>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-md mx-auto">
              No fake boilerplate files. Tell the autonomous agent what you want to construct, or pick a starter action below to run immediately:
            </p>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
            <button
              type="button"
              onClick={() => onPromptAction?.('make a tiger image')}
              className="p-4 rounded-xl bg-bg-tertiary/70 hover:bg-bg-tertiary border border-border-subtle hover:border-brand-primary/50 text-left transition-all group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-bold text-text-primary mb-1">
                <span>🎨 Make a tiger image</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-primary opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Auto-selects visual diffusion model (Flux Schnell) and delivers high-resolution visual asset directly.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onPromptAction?.('i want a portfolio')}
              className="p-4 rounded-xl bg-bg-tertiary/70 hover:bg-bg-tertiary border border-border-subtle hover:border-brand-primary/50 text-left transition-all group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-bold text-text-primary mb-1">
                <span>💼 Build portfolio</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-primary opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Generates complete React 19 portfolio with projects, skills bento, and contact form.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onPromptAction?.('build a modern AI SaaS landing page with dark mode and bento grid')}
              className="p-4 rounded-xl bg-bg-tertiary/70 hover:bg-bg-tertiary border border-border-subtle hover:border-brand-primary/50 text-left transition-all group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-bold text-text-primary mb-1">
                <span>🚀 SaaS Landing Page</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-primary opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Generates interactive marketing page with hero, pricing tiers, and bento grid.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onCreateNewFile?.()}
              className="p-4 rounded-xl bg-bg-tertiary/70 hover:bg-bg-tertiary border border-border-subtle hover:border-brand-primary/50 text-left transition-all group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-bold text-text-primary mb-1">
                <span>➕ Create Clean File</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-primary opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Create a new TypeScript, React, or Markdown file in the virtual worktree.
              </p>
            </button>
          </div>

          {/* Drive Vault Status Footer */}
          <div className="p-3 rounded-xl bg-bg-primary/80 border border-border-subtle flex items-center justify-between text-xs font-mono text-text-muted">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-sky-500" />
              <span>Google Drive Persistent Vault Active</span>
            </div>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">500MB Free</span>
          </div>
        </div>
      </div>
    );
  }

  const lines = content.split('\n');

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl flex flex-col h-full overflow-hidden shadow-2xs">
      {/* Tab Bar */}
      <div className="bg-bg-tertiary/60 border-b border-border-subtle flex items-center justify-between px-2 pt-1.5 shrink-0 gap-2 overflow-hidden">
        {/* Scrollable Tabs Lane */}
        <div className="flex items-center flex-1 min-w-0 overflow-x-auto custom-scrollbar gap-1 pr-1">
          {openFiles.map((file) => {
            const isActive = file.path === activeFile.path;

            return (
              <div
                key={file.path}
                onClick={() => onSelectTab(file.path)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelectTab(file.path);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-mono transition-all cursor-pointer select-none shrink-0 min-h-[44px] sm:min-h-[36px] ${
                  isActive
                    ? 'bg-bg-secondary text-text-primary border-t-2 border-brand-primary font-semibold shadow-xs'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-secondary/40'
                }`}
              >
                {file.mimeType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(file.path) ? (
                  <ImageIcon className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                ) : (
                  <FileCode className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                )}
                <span className="truncate max-w-[130px] sm:max-w-[170px]">{file.name}</span>
                {isActive && isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved changes" />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(file.path);
                  }}
                  className="min-h-[44px] min-w-[44px] sm:w-4 sm:h-4 sm:min-h-0 sm:min-w-0 ml-1 flex items-center justify-center rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Editor Controls: Pinned right with background & divider */}
        <div className="flex items-center gap-1 pb-1 shrink-0 pl-2 border-l border-border-subtle bg-bg-tertiary/90 backdrop-blur-xs z-10">
          <button
            type="button"
            onClick={() => setIsReadOnly(!isReadOnly)}
            title={isReadOnly ? 'Switch to Edit Mode' : 'Switch to Read-Only Mode'}
            className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center rounded-md border border-border-default hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            {isReadOnly ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
          </button>

          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              title="Discard Unsaved Changes"
              className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center rounded-md border border-border-default hover:bg-bg-tertiary text-text-secondary hover:text-amber-600 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            title="Copy File Content"
            className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center rounded-md border border-border-default hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`min-h-[44px] sm:min-h-[28px] px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              isDirty
                ? 'bg-brand-primary text-white hover:bg-brand-primary-hi shadow-xs'
                : 'border border-border-default text-text-muted opacity-60 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>

          {activeFile && onDeleteFile && (
            <button
              type="button"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Delete Workspace File',
                  message: `Are you sure you want to delete ${activeFile.path}? This action cannot be undone.`,
                  confirmText: 'Delete File',
                  cancelText: 'Cancel',
                  variant: 'danger',
                });
                if (ok) {
                  await onDeleteFile(activeFile.path);
                }
              }}
              title={`Delete ${activeFile.path}`}
              className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center rounded-md border border-border-default hover:bg-rose-500/10 hover:border-rose-500/40 text-text-muted hover:text-rose-600 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Editor Body with Line Numbers or Image Viewer */}
      {isImage ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-bg-primary overflow-auto">
          <div className="max-w-2xl w-full flex flex-col items-center gap-4 p-6 rounded-2xl bg-bg-secondary/90 border border-border-default shadow-lg">
            <div className="flex items-center justify-between w-full pb-3 border-b border-border-subtle text-xs">
              <span className="font-semibold text-text-primary">{activeFile.name}</span>
              <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-bold">
                Image Asset ({activeFile.mimeType || 'image/png'})
              </span>
            </div>
            <div className="relative rounded-xl overflow-hidden border border-border-subtle bg-black/5 dark:bg-black/30 flex items-center justify-center max-h-[55vh] w-full p-2">
              <img
                src={content}
                alt={activeFile.name}
                className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="flex items-center justify-between w-full pt-2 text-xs flex-wrap gap-2">
              <span className="text-text-muted text-[11px] font-mono truncate max-w-xs">{activeFile.path}</span>
              <div className="flex items-center gap-2">
                {onDeleteFile && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Delete Image Asset',
                        message: `Delete image asset ${activeFile.path}? This action cannot be undone.`,
                        confirmText: 'Delete Image',
                        cancelText: 'Cancel',
                        variant: 'danger',
                      });
                      if (ok) {
                        await onDeleteFile(activeFile.path);
                      }
                    }}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Image</span>
                  </button>
                )}
                <a
                  href={content}
                  download={activeFile.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Image</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden bg-bg-primary font-mono text-xs">
          {/* Line Numbers Gutter */}
          <div className="w-12 py-3 select-none text-right pr-3 bg-bg-secondary/40 border-r border-border-subtle/80 text-text-muted/60 shrink-0 font-mono text-[11px] leading-5 overflow-hidden">
            {lines.map((_, idx) => (
              <div key={idx}>{idx + 1}</div>
            ))}
          </div>

          {/* Text Area */}
          <textarea
            value={content}
            onChange={handleChange}
            readOnly={isReadOnly}
            spellCheck={false}
            className="flex-1 p-3 bg-transparent text-text-primary resize-none focus:outline-none font-mono text-xs leading-5 whitespace-pre tab-4 overflow-auto"
          />
        </div>
      )}

      {/* Status Bar */}
      <div className="px-3 py-1 bg-bg-secondary border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-text-muted shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="truncate max-w-[150px] sm:max-w-[300px]">{activeFile.path}</span>
          <span className="shrink-0">{lines.length} lines</span>
          <span className="shrink-0 hidden xs:inline">{content.length} chars</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline">{activeFile.mimeType}</span>
          <span>{isReadOnly ? 'READ ONLY' : 'UTF-8'}</span>
        </div>
      </div>
    </div>
  );
};
