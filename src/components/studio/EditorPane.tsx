import React, { useRef, useState, useEffect } from 'react';
import { Play, Copy, Check, Hash, Coins, Variable, HardDrive, Square, Mic, Globe, Video, Camera, Loader2, Maximize2, Minimize2, Lightbulb, AlertCircle } from 'lucide-react';
import { estimateTokens } from '../../services/ai/tokenEstimator';
import { getPlatformModifierKey } from '../../utils/modelFormatting';
import { useTone } from '../../context/ToneContext';
import { useApp } from '../../context/AppContext';
import { uploadPromptImage } from '../../utils/promptMediaAttachment';
import { VoicePromptModal } from '../voice/VoicePromptModal';
import { TranslatePromptModal } from '../voice/TranslatePromptModal';
import { PromptVideoDemoModal } from '../media/PromptVideoDemoModal';
import { MediaPickerModal, type MediaPickerResult } from '../common/MediaPickerModal';

export interface EditorPaneProps {
  content: string;
  onChange: (content: string) => void;
  onExecute: () => void;
  onStop?: () => void;
  isExecuting?: boolean;
  variables: string[];
  onInsertVariable: (varName: string) => void;
  selectedModel: string;
  layoutMode?: 'split' | 'editor' | 'output';
  onToggleLayout?: () => void;
  intentReport?: {
    primaryIntent: string;
    complexityLevel: string;
    suggestedModels: string[];
  };
  securityScore?: number;
  onOpenOptimizer?: () => void;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  content,
  onChange,
  onExecute,
  onStop,
  isExecuting = false,
  variables,
  onInsertVariable,
  selectedModel,
  layoutMode = 'split',
  onToggleLayout,
  intentReport,
  securityScore,
  onOpenOptimizer,
}) => {
  const { copy } = useTone();
  const { showToast } = useApp();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isTranslateModalOpen, setIsTranslateModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const processImageFile = async (file: File) => {
    if (isUploadingImage) return;
    setIsUploadingImage(true);
    try {
      const { markdownTag } = await uploadPromptImage(file, { showToast });
      onChange(content.trim() ? `${content.trim()}${markdownTag}` : markdownTag.trimStart());
    } catch {
      // Toast already shown in uploadPromptImage
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleMediaSelect = (result: MediaPickerResult) => {
    setIsMediaPickerOpen(false);
    const markdownTag = `\n\n![Image](${result.url})\n`;
    onChange(content.trim() ? `${content.trim()}${markdownTag}` : markdownTag.trimStart());
    showToast('Image attached to prompt.', 'success');
  };

  const handleCameraClick = () => {
    if (isUploadingImage) return;
    setIsMediaPickerOpen(true);
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && ((file.type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(file.name || ''))) {
      await processImageFile(file);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if ((items[i]?.type || '').startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await processImageFile(file);
          break;
        }
      }
    }
  };

  const tokenStats = estimateTokens(content);
  const modifierKey = getPlatformModifierKey();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onExecuteRef = useRef(onExecute);
  onExecuteRef.current = onExecute;
  const contentRef = useRef(content);
  contentRef.current = content;
  const isExecutingRef = useRef(isExecuting);
  isExecutingRef.current = isExecuting;

  const lastExecuteTimeRef = useRef(0);

  const triggerExecute = () => {
    const now = Date.now();
    if (now - lastExecuteTimeRef.current < 400) {
      return;
    }
    lastExecuteTimeRef.current = now;

    if (isExecutingRef.current) {
      showToast('Prompt execution is already running...', 'info');
      return;
    }
    if (!contentRef.current.trim()) {
      showToast('Please enter a prompt template in the editor to run (Ctrl+Enter)', 'info');
      return;
    }
    onExecuteRef.current();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to run
    const isEnter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13;
    if ((e.metaKey || e.ctrlKey) && isEnter) {
      e.preventDefault();
      e.stopPropagation();
      triggerExecute();
    }
  };

  // Global window listener: enables Ctrl+Enter / Cmd+Enter to execute prompt anywhere in studio
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isEnter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13;
      if ((e.ctrlKey || e.metaKey) && isEnter) {
        // Skip if any full modal is currently active
        if (isVoiceModalOpen || isTranslateModalOpen || isVideoModalOpen || isMediaPickerOpen) return;

        const target = e.target as HTMLElement | null;
        // Don't trigger if user is inside an unrelated full-page modal dialog
        if (target?.closest('[role="dialog"]') && !target?.closest('[data-studio-editor="true"]')) {
          return;
        }

        e.preventDefault();
        triggerExecute();
      }
    };

    const handleCustomCtrlEnter = (e: Event) => {
      if (isVoiceModalOpen || isTranslateModalOpen || isVideoModalOpen || isMediaPickerOpen) return;
      const detail = (e as CustomEvent)?.detail;
      if (detail?.activeTab && detail.activeTab !== 'workspace' && detail.activeTab !== 'arena') {
        return;
      }
      triggerExecute();
    };

    window.addEventListener('keydown', handleGlobalKeyDown, false);
    window.addEventListener('ph_global_ctrl_enter', handleCustomCtrlEnter);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, false);
      window.removeEventListener('ph_global_ctrl_enter', handleCustomCtrlEnter);
    };
  }, [isVoiceModalOpen, isTranslateModalOpen, isVideoModalOpen, isMediaPickerOpen, showToast]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.currentTarget.scrollTop;
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Helper to render variable tags in the backdrop overlay
  const renderHighlightedContent = () => {
    if (!content) return null;
    const parts = content.split(/(\{\{\s*[a-zA-Z0-9_.[\]]+(?:\s*(?:\|\||\|)\s*(?:"[^"]*"|'[^']*'|[a-zA-Z0-9_]+))?\s*\}\})/g);
    return parts.map((part, index) => {
      if (/^\{\{\s*[a-zA-Z0-9_.[\]]+/.test(part)) {
        return (
          <mark
            key={index}
            className="bg-brand-primary-light/60 dark:bg-brand-primary/20 text-transparent rounded px-1.5 py-0.5 border border-brand-primary/30 select-none inline font-mono text-sm leading-none"
          >
            {part}
          </mark>
        );
      }
      return <span key={index} className="text-transparent">{part}</span>;
    });
  };

  return (
    <div data-tour="tour-prompt-editor" className="flex flex-col flex-1 h-full min-h-0 bg-bg-secondary relative">
      {/* Editor Sub-Header (Variable Quick Insertion Bar & Telemetry) */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 h-11 min-h-[44px] bg-bg-secondary border-b border-border-default text-xs text-text-secondary shrink-0 min-w-0 overflow-hidden">
        {/* Variable Quick-Insert Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 min-w-0 flex-1">
          <span className="text-[11px] text-text-muted flex items-center gap-1 font-sans shrink-0">
            <Variable className="w-3.5 h-3.5 text-brand-primary shrink-0" /> Variables:
          </span>
          {variables.length === 0 ? (
            <span className="text-[11px] text-text-muted italic truncate font-sans">
              Type <code className="font-mono text-brand-primary font-medium">{'{{variable}}'}</code> to add
            </span>
          ) : (
            variables.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onInsertVariable(v)}
                className="px-2 py-0.5 rounded-md bg-bg-tertiary border border-border-default hover:border-brand-primary/30 text-brand-primary text-[11px] font-mono font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-[26px] flex items-center"
                title={`Click to insert {{${v}}}`}
              >
                {`{{${v}}}`}
              </button>
            ))
          )}
        </div>

        {/* Live pre-run editor telemetry & layout toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] text-text-muted font-sans shrink-0 ml-auto pl-1.5 bg-bg-secondary z-10">
          <span
            className="flex items-center gap-1 whitespace-nowrap shrink-0 px-1.5 py-0.5 rounded bg-bg-tertiary/60 border border-border-default/60"
            title="Estimated from prompt length (~4 characters per token). Not a provider-reported count."
          >
            <Hash className="w-3 h-3 text-text-muted shrink-0" />
            <strong className="text-text-primary font-medium">~{tokenStats.estimatedTokens.toLocaleString()}</strong>
            <span className="hidden xs:inline">tokens</span>
          </span>
          <span
            className="hidden sm:flex items-center gap-1 whitespace-nowrap shrink-0 px-1.5 py-0.5 rounded bg-bg-tertiary/60 border border-border-default/60"
            title="Rough input-only estimate at ₹0.05 per 1K tokens. Not a quote — your actual charge is settled server-side from real usage after the run."
          >
            <Coins className="w-3 h-3 text-text-muted shrink-0" />
            <strong className="text-text-primary font-medium">
              ~₹{((tokenStats.estimatedTokens / 1000) * 0.05).toFixed(2)}
            </strong>
          </span>
          {onToggleLayout && (
            <button
              type="button"
              onClick={onToggleLayout}
              className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center shrink-0 ml-0.5"
              title={layoutMode === 'editor' ? 'Restore split view' : 'Maximize editor view'}
              aria-label={layoutMode === 'editor' ? 'Restore split view' : 'Maximize editor view'}
            >
              {layoutMode === 'editor' ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Studio Intelligence Recommendation Strip (Scoped cleanly inside EditorPane) */}
      {content.trim().length > 30 && intentReport && (
        <div className="px-3 sm:px-4 py-1.5 bg-bg-tertiary/40 border-b border-border-default flex items-center justify-between text-[11px] font-mono text-text-muted shrink-0 min-h-[34px] overflow-x-auto scrollbar-none gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <span className="flex items-center gap-1 text-brand-primary font-medium">
              <Lightbulb className="w-3.5 h-3.5 text-brand-primary shrink-0" /> Domain: <strong className="uppercase font-semibold text-text-primary">{intentReport.primaryIntent}</strong>
            </span>
            <span className="hidden xs:inline">Complexity: <strong className="text-text-primary capitalize">{intentReport.complexityLevel}</strong></span>
            <span className="hidden md:inline">Recommended: <strong className="text-text-primary">{intentReport.suggestedModels[0]}</strong></span>
          </div>
          {securityScore !== undefined && securityScore < 85 && onOpenOptimizer && (
            <button
              type="button"
              onClick={onOpenOptimizer}
              className="text-amber-700 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 shrink-0 cursor-pointer min-h-[44px] sm:min-h-[28px] ml-auto"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Security Notice ({securityScore}%)</span>
            </button>
          )}
        </div>
      )}

      {/* Editor Body: Document-First Spacious Writing Surface */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden bg-bg-secondary">
        {/* Textarea Container with Highlight Backdrop */}
        <div className="flex-1 relative h-full min-h-0 overflow-hidden">
          {/* Backdrop Syntax Highlight Overlay */}
          <div
            ref={backdropRef}
            aria-hidden="true"
            className="absolute inset-0 p-5 sm:p-7 pb-24 sm:pb-32 font-sans text-base leading-relaxed whitespace-pre-wrap break-words pointer-events-none overflow-hidden select-none z-0 custom-scrollbar"
          >
            {renderHighlightedContent()}
          </div>

          {/* Foreground Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
            data-tour="tour-editor-textarea"
            placeholder="Write your prompt template here... Use {{variable}} for dynamic parameters."
            className="relative z-10 w-full h-full p-5 sm:p-7 pb-24 sm:pb-32 font-sans text-base leading-relaxed text-text-primary bg-transparent resize-none focus:outline-none focus:ring-0 placeholder:text-text-muted/50"
            spellCheck={false}
          />

          {/* Visual drag-over file attachment overlay */}
          {isDraggingFile && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand-primary/10 border-2 border-dashed border-brand-primary rounded-xl backdrop-blur-[1px] pointer-events-none text-xs font-semibold text-brand-primary gap-1">
              <Camera className="w-6 h-6 animate-pulse text-brand-primary" />
              <span>Drop image here to attach to prompt</span>
            </div>
          )}
        </div>
      </div>

      {/* Editor Footer / Run Trigger Bar */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-bg-secondary border-t border-border-default shrink-0 min-h-[52px] min-w-0">
        {/* Left Actions: Understated Tool Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!content.trim()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-border-bright text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            title="Copy prompt content to clipboard"
            aria-label="Copy prompt content"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {layoutMode === 'editor' && (
              <span className="hidden xl:inline whitespace-nowrap">{copied ? copy.copiedSuccess : copy.copyPrompt}</span>
            )}
          </button>

          <a
            href="/storage"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-border-bright text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] shrink-0"
            title="Open Asset & Knowledge Vault"
            aria-label="Storage Vault"
          >
            <HardDrive className="w-3.5 h-3.5 text-brand-primary" />
            {layoutMode === 'editor' && (
              <span className="hidden xl:inline whitespace-nowrap">Vault</span>
            )}
          </a>

          {/* Hidden camera file input */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            disabled={isUploadingImage}
            onChange={handleImageFileSelect}
            className="hidden"
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={handleCameraClick}
            disabled={isUploadingImage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] shrink-0"
            title="Attach Photo / Image Context (Gallery, Link, or Storage Vault)"
            aria-label="Attach Photo"
          >
            {isUploadingImage ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
            ) : (
              <Camera className="w-3.5 h-3.5 text-brand-primary" />
            )}
            {layoutMode === 'editor' && (
              <span className="hidden xl:inline">{isUploadingImage ? 'Uploading...' : 'Photo'}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] shrink-0"
            title="Voice Dictation (Sarvam AI & Deepgram)"
            aria-label="Voice Dictation"
          >
            <Mic className="w-3.5 h-3.5 text-brand-primary" />
            {layoutMode === 'editor' && (
              <span className="hidden xl:inline">Voice</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsTranslateModalOpen(true)}
            disabled={!content.trim()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            title="Translate Prompt (Sarvam AI Mayura)"
            aria-label="Translate Prompt"
          >
            <Globe className="w-3.5 h-3.5 text-brand-primary" />
            {layoutMode === 'editor' && (
              <span className="hidden xl:inline">Translate</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsVideoModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] shrink-0"
            title="Prompt Walkthrough & Video Demos (Mux)"
            aria-label="Walkthrough Demos"
          >
            <Video className="w-3.5 h-3.5 text-brand-primary" />
            {layoutMode === 'editor' && (
              <span className="hidden xl:inline">Walkthrough</span>
            )}
          </button>

          {layoutMode === 'editor' && (
            <span className="hidden 2xl:inline-flex items-center gap-1 text-[11px] text-text-muted font-mono whitespace-nowrap ml-2">
              Press <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border-default rounded text-[10px] font-sans font-medium">{modifierKey}</kbd> + <kbd className="px-1.5 py-0.5 bg-bg-tertiary border border-border-default rounded text-[10px] font-sans font-medium">Enter</kbd> to run
            </span>
          )}
        </div>

        {/* Right Action: Execute / Stop Button */}
        {isExecuting ? (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-xs shrink-0 whitespace-nowrap min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-[0.98]"
            title="Stop / Cancel AI Generation"
            aria-label="Stop Generating"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Stop Generating</span>
            <span className="sm:hidden">Stop</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onExecute}
            disabled={!content.trim()}
            data-tour="tour-run-action"
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-2xs shrink-0 whitespace-nowrap min-h-[44px] ${
              !content.trim()
                ? 'bg-bg-tertiary text-text-muted border border-border-default cursor-not-allowed opacity-60'
                : 'bg-brand-primary hover:bg-brand-primary-hi text-white cursor-pointer active:scale-[0.98]'
            }`}
            title={!content.trim() ? 'Enter prompt text to execute' : `Run template on ${selectedModel}`}
            aria-label={`Run prompt on ${selectedModel}`}
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            <span className="font-semibold hidden sm:inline">{copy.runPrompt || 'Run Prompt'}</span>
            <span className="font-semibold sm:hidden">Run</span>
          </button>
        )}
      </div>

      {/* Integrated Modals */}
      <VoicePromptModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onTranscriptReady={(transcript) => {
          onChange(content ? `${content}\n${transcript}` : transcript);
        }}
      />

      <TranslatePromptModal
        isOpen={isTranslateModalOpen}
        onClose={() => setIsTranslateModalOpen(false)}
        originalPrompt={content}
        onApplyTranslation={(translated) => {
          onChange(translated);
        }}
      />

      <PromptVideoDemoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        promptTitle="Studio Prompt Demo"
      />

      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
        title="Attach Photo / Image"
        description="Choose a photo from your device gallery, enter an image link, or select from your Storage Vault."
        mediaType="image"
      />
    </div>
  );
};
