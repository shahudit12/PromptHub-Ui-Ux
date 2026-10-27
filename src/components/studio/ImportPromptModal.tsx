import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileCode,
  CheckCircle2,
  AlertCircle,
  X,
  Variable,
  Layers,
  Sparkles,
  ArrowRight,
  ClipboardPaste,
  FileUp,
  Tag
} from 'lucide-react';
import { importPromptFromContent, type ImportedPrompt, type ImportResult } from '../../services/import/promptImporter';

export interface ImportPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (imported: ImportedPrompt) => void;
  onImportBatch?: (prompts: ImportedPrompt[], collectionName?: string) => void;
  title?: string;
  subtitle?: string;
}

export const ImportPromptModal: React.FC<ImportPromptModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onImportBatch,
  title = 'Import Prompt Architecture',
  subtitle = 'Import prompt templates from Markdown (.md/.mdc), JSON, Cursor Rules, Agent Skills, TOML, CSV, or raw text.',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleParse = (content: string, name = '') => {
    if (!content.trim()) {
      setImportResult(null);
      return;
    }
    const res = importPromptFromContent(content, name);
    setImportResult(res);
    setSelectedIndex(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleParse(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleParse(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    handleParse(text, 'pasted-content.txt');
  };

  const handleConfirmImport = () => {
    if (!importResult || importResult.prompts.length === 0) return;

    if (importResult.prompts.length > 1 && onImportBatch) {
      onImportBatch(importResult.prompts, importResult.collectionName);
    } else {
      const target = importResult.prompts[selectedIndex] || importResult.prompts[0];
      onImport(target);
    }
    onClose();
  };

  const activePrompt = importResult?.prompts?.[selectedIndex];

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[800] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-3xl bg-bg-secondary border border-border-default rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-left text-text-primary space-y-6"
        >
          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center -mt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-border-default" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="space-y-1 pr-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary-light border border-brand-primary/20 text-brand-primary text-xs font-mono font-medium">
              <Upload className="w-3.5 h-3.5" />
              <span>Universal Import Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-text-primary">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary">
              {subtitle}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 p-1 bg-bg-primary border border-border-default rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer min-h-[40px] ${
                activeTab === 'upload'
                  ? 'bg-brand-primary text-white shadow-2xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileUp className="w-4 h-4" />
              <span>Upload File</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer min-h-[40px] ${
                activeTab === 'paste'
                  ? 'bg-brand-primary text-white shadow-2xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>Paste Content</span>
            </button>
          </div>

          {/* Upload / Paste Surface */}
          {activeTab === 'upload' ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-brand-primary bg-brand-primary-light/40 ring-4 ring-brand-primary/10'
                  : 'border-border-default hover:border-brand-primary/50 bg-bg-primary/50 hover:bg-bg-primary'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.md,.txt,.toml,.csv,.mdc"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-brand-primary-light border border-brand-primary/20 text-brand-primary flex items-center justify-center mx-auto mb-3">
                <FileCode className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-text-primary mb-1">
                {fileName ? `Selected: ${fileName}` : 'Drop prompt file here or click to browse'}
              </h4>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Supports Markdown (<code className="text-brand-primary font-mono">.md</code>), Cursor (<code className="text-brand-primary font-mono">.mdc</code>), JSON (<code className="text-brand-primary font-mono">.json</code>), Agent Skills (<code className="text-brand-primary font-mono">SKILL.md</code>), TOML, CSV, & TXT.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary">
                Paste JSON, Markdown with YAML, Cursor Rule, or plain text:
              </label>
              <textarea
                value={rawText}
                onChange={handlePasteChange}
                placeholder={`---\nname: Code Review Expert\ndescription: Systematic code reviewer\ncategory: Development\n---\n\nYou are a principal software engineer. Review the following code:\n{{code_snippet}}`}
                rows={6}
                className="w-full p-3.5 bg-bg-primary border border-border-default rounded-xl font-mono text-base sm:text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-brand-primary transition-colors resize-y leading-relaxed"
              />
            </div>
          )}

          {/* Live Preview Card */}
          {importResult && importResult.success && activePrompt && (
            <div className="rounded-2xl border border-border-default bg-bg-primary overflow-hidden shadow-sm space-y-0">
              <div className="flex items-center justify-between p-3.5 border-b border-border-default bg-bg-secondary">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold text-text-primary">
                    Detected Format: <span className="font-mono text-brand-primary">{importResult.detectedFormat}</span>
                  </span>
                </div>

                {importResult.prompts.length > 1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-primary text-white">
                    {importResult.prompts.length} Prompts in Bundle
                  </span>
                )}
              </div>

              {/* Multi-Prompt Selector if bundle */}
              {importResult.prompts.length > 1 && (
                <div className="p-3 border-b border-border-default bg-bg-tertiary/20 flex gap-2 overflow-x-auto">
                  {importResult.prompts.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 cursor-pointer transition-all ${
                        selectedIndex === idx
                          ? 'bg-brand-primary text-white'
                          : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-border-default'
                      }`}
                    >
                      {idx + 1}. {p.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Prompt Metadata Grid */}
              <div className="p-4 space-y-3">
                <div className="space-y-1">
                  <h3 className="text-base font-bold font-display text-text-primary">
                    {activePrompt.title}
                  </h3>
                  {activePrompt.description && (
                    <p className="text-xs text-text-secondary">
                      {activePrompt.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg-secondary border border-border-default text-xs font-medium text-text-secondary">
                    <Layers className="w-3 h-3 text-brand-primary" />
                    <span>{activePrompt.category}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg-secondary border border-border-default text-xs font-medium text-text-secondary">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>{activePrompt.model}</span>
                  </span>
                  {activePrompt.variables.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg-secondary border border-border-default text-xs font-medium text-text-secondary">
                      <Variable className="w-3 h-3 text-cyan-600" />
                      <span>{activePrompt.variables.length} Variable{activePrompt.variables.length === 1 ? '' : 's'}</span>
                    </span>
                  )}
                  {activePrompt.tags.map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-bg-secondary text-[11px] text-text-muted border border-border-default">
                      <Tag className="w-2.5 h-2.5" />
                      <span>{t}</span>
                    </span>
                  ))}
                </div>

                {/* Template Code Preview */}
                <div className="space-y-1 pt-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                    <span>Template Content Preview:</span>
                    <span>{activePrompt.template.length} characters</span>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-bg-secondary border border-border-default font-mono text-xs text-text-primary overflow-x-auto max-h-[180px] leading-relaxed whitespace-pre-wrap">
                    {activePrompt.template}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {importResult && !importResult.success && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importResult.error || 'Could not parse prompt content from provided source.'}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-default">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!importResult || !importResult.success || importResult.prompts.length === 0}
              onClick={handleConfirmImport}
              className="btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{importResult && importResult.prompts.length > 1 ? `Import All (${importResult.prompts.length})` : 'Import into Studio'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

