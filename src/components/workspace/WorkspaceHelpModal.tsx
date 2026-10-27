/**
 * src/components/workspace/WorkspaceHelpModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive Guidance & Multi-Domain Help Modal for Unified Creation Workspace.
 * Explains the 4-step creation lifecycle, supported domains, zero auto-save
 * storage policy, 8-image generation limit cap, and keyboard shortcuts.
 * Adheres to Impeccable & Taste Skill standards (min 44px targets, smooth easing).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  HelpCircle,
  Sparkles,
  Zap,
  ShoppingBag,
  Code2,
  Palette,
  BookOpen,
  LayoutDashboard,
  ShieldCheck,
  Laptop,
  ArrowRight,
  HardDrive,
  Cpu,
  Keyboard,
} from 'lucide-react';
import {
  WORKSPACE_DOMAINS,
  WORKSPACE_STARTER_PROMPTS,
  type WorkspaceDomainCategory,
} from '../../data/workspaceDomains';

interface WorkspaceHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt?: (prompt: string) => void;
}

export const WorkspaceHelpModal: React.FC<WorkspaceHelpModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<'lifecycle' | 'domains' | 'policies' | 'shortcuts'>('lifecycle');
  const [selectedDomain, setSelectedDomain] = useState<WorkspaceDomainCategory>('saas');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderDomainIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="w-4 h-4" />;
      case 'ShoppingBag':
        return <ShoppingBag className="w-4 h-4" />;
      case 'Code2':
        return <Code2 className="w-4 h-4" />;
      case 'Palette':
        return <Palette className="w-4 h-4" />;
      case 'BookOpen':
        return <BookOpen className="w-4 h-4" />;
      case 'LayoutDashboard':
        return <LayoutDashboard className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const domainStarters = WORKSPACE_STARTER_PROMPTS.filter(
    (s) => s.domain === selectedDomain
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-help-title"
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-bg-secondary border border-border-default rounded-2xl shadow-2xl flex flex-col overflow-hidden text-text-primary"
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-default bg-bg-tertiary/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/25 flex items-center justify-center text-brand-primary">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="workspace-help-title" className="text-base sm:text-lg font-bold font-display tracking-tight text-text-primary">
                Creation Workspace Guide
              </h2>
              <p className="text-xs text-text-muted">
                How to describe, review, refine, and deploy web applications across any domain
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
            aria-label="Close help guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-5 pt-3 border-b border-border-subtle bg-bg-secondary overflow-x-auto">
          {[
            { id: 'lifecycle', label: '1. How It Works (4 Steps)' },
            { id: 'domains', label: '2. All Real-Life Domains' },
            { id: 'policies', label: '3. Storage & Safe Limits' },
            { id: 'shortcuts', label: '4. Shortcuts & Tips' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-brand-primary/15 text-brand-primary font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6">
          {/* TAB 1: 4-STEP LIFECYCLE (NEW PLAN: HANDWRITTEN ARCHITECTURE) */}
          {activeTab === 'lifecycle' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-xs text-text-primary flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <div>
                  <strong>PromptHub Creation Engine:</strong> You provide a simple prompt in plain language. Our model enriches it using skills, memory, and MCP tools into a high-grade prompt to generate the best output. You then connect to your model of choice to approve, regenerate, or improve — bundled in a single uncluttered folder.
                </div>
              </div>

              {/* Visual Workflow Flowchart */}
              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default space-y-2.5 font-mono text-xs shadow-3xs">
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-brand-primary font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Handwritten Flow Pipeline</span>
                  </span>
                  <span className="text-[9.5px] text-emerald-500 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10">Single Folder Bundle</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-text-primary text-[11px]">
                  <span className="px-2 py-0.8 rounded-md bg-brand-primary/10 text-brand-primary font-semibold border border-brand-primary/20">User Simple Prompt</span>
                  <span>→</span>
                  <span className="px-2 py-0.8 rounded-md bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">Our Model Generates Better Prompt</span>
                  <span>→</span>
                  <span className="px-2 py-0.8 rounded-md bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20">Best Output</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border-subtle/60 text-left">
                  <div className="p-2.5 rounded-lg bg-bg-secondary border border-emerald-500/30">
                    <div className="font-bold text-emerald-500 text-[11px] mb-0.5 flex items-center gap-1">
                      <span>✓ Positive Branch: User Likes</span>
                    </div>
                    <div className="text-text-muted text-[10.5px] leading-relaxed">
                      <strong>Approved</strong> → Connect to model of choice → Delivers all code, images &amp; <code className="text-brand-primary">prompt.md</code> in a single folder.
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-bg-secondary border border-amber-500/30">
                    <div className="font-bold text-amber-500 text-[11px] mb-0.5 flex items-center gap-1">
                      <span>✗ Negative Branch: User Doesn't Like</span>
                    </div>
                    <div className="text-text-muted text-[10.5px] leading-relaxed">
                      • <strong>New Produce:</strong> Fresh creative variation.<br/>
                      • <strong>Improve:</strong> Connect to model of choice to tweak prompt &amp; apply changes.
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {/* Step 1 */}
                <div className="p-4 rounded-xl bg-bg-tertiary/40 border border-border-subtle flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold text-brand-primary px-2 py-0.5 rounded bg-brand-primary/15">
                        STEP 1
                      </span>
                      <Sparkles className="w-4 h-4 text-brand-primary" />
                    </div>
                    <h3 className="text-sm font-bold text-text-primary mb-1">
                      Simple Prompt
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Provide your initial idea in everyday language. No prompt engineering needed. You can attach images, PDFs, CSVs, or JSON files for multimodal context.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border-subtle/50 text-[11px] font-mono text-text-muted">
                    Input: plain English or 1-click starter template
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl bg-bg-tertiary/40 border border-border-subtle flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold text-emerald-500 px-2 py-0.5 rounded bg-emerald-500/15">
                        STEP 2
                      </span>
                      <Cpu className="w-4 h-4 text-emerald-500" />
                    </div>
                    <h3 className="text-sm font-bold text-text-primary mb-1">
                      Our Model Generates Better Prompt
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      PromptHub immediately enhances your raw input using stackable skills (<code className="text-brand-primary">/adapt</code>, <code className="text-brand-primary">/audit</code>, <code className="text-brand-primary">/polish</code>), conversation memory (<code className="text-amber-500">@chat</code>), and MCP server tools into an optimized specification.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border-subtle/50 text-[11px] font-mono text-text-muted">
                    Feature: Expandable Transformation Card with 1-click edit
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl bg-bg-tertiary/40 border border-border-subtle flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold text-amber-500 px-2 py-0.5 rounded bg-amber-500/15">
                        STEP 3
                      </span>
                      <Laptop className="w-4 h-4 text-amber-500" />
                    </div>
                    <h3 className="text-sm font-bold text-text-primary mb-1">
                      Best Output &amp; Live Sandbox
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Generates complete production-grade source code, live interactive browser preview, responsive device frames (desktop, tablet, mobile), and downloadable assets.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border-subtle/50 text-[11px] font-mono text-text-muted">
                    Preview: Real interactive DOM with 0-second re-render
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-xl bg-bg-tertiary/40 border border-border-subtle flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-400/15">
                        STEP 4
                      </span>
                      <HardDrive className="w-4 h-4 text-sky-400" />
                    </div>
                    <h3 className="text-sm font-bold text-text-primary mb-1">
                      Decision Nodes &amp; Cloud Drive
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Choose <strong>Approve</strong>, <strong>New Produce</strong> (generate new output), or <strong>Improve</strong> with your <strong>Model of Choice</strong>. All code, images, and <code className="text-brand-primary">prompt.md</code> are bundled into a single folder with 1-click Drive sync.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border-subtle/50 text-[11px] font-mono text-text-muted">
                    Storage: PromptHub Drive Vault tree &amp; 1-click ZIP export
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALL DOMAINS */}
          {activeTab === 'domains' && (
            <div className="space-y-4">
              <p className="text-xs text-text-secondary">
                The workspace supports all digital applications. Select a domain below to browse real-world examples and click any starter to launch it immediately:
              </p>

              {/* Domain Pills */}
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border-subtle">
                {WORKSPACE_DOMAINS.filter((d) => d.id !== 'all').map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDomain(d.id)}
                    className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                      selectedDomain === d.id
                        ? 'bg-brand-primary/15 border-brand-primary text-brand-primary'
                        : 'bg-bg-tertiary/60 border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                  >
                    {renderDomainIcon(d.iconName)}
                    <span>{d.label}</span>
                  </button>
                ))}
              </div>

              {/* Starters Grid for Selected Domain */}
              <div className="space-y-3">
                {domainStarters.map((starter) => (
                  <div
                    key={starter.id}
                    className="p-4 rounded-xl bg-bg-tertiary/40 border border-border-subtle hover:border-brand-primary/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-bold border border-brand-primary/20">
                          {starter.badge}
                        </span>
                        <h4 className="text-sm font-bold text-text-primary truncate">
                          {starter.title}
                        </h4>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {starter.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {starter.features.map((feat, idx) => (
                          <span
                            key={idx}
                            className="text-[10.5px] px-2 py-0.5 rounded bg-bg-secondary text-text-muted border border-border-subtle"
                          >
                            &bull; {feat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onSelectPrompt) onSelectPrompt(starter.prompt);
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
                    >
                      <span>Try Starter</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: STORAGE & POLICIES */}
          {activeTab === 'policies' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-emerald-500">
                    Strict User Approval Storage Policy
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    PromptHub <strong>never automatically saves unwanted files or background dumps</strong> to your Cloud Drive storage. Everything in your Storage Vault is stored <strong>ONLY AFTER your explicit confirmation or manual upload</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl bg-bg-tertiary/40 border border-border-subtle space-y-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-brand-primary" />
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                      Zero Auto-Save Clutter
                    </h4>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    AI agent milestones, news articles, and draft iterations remain local to your temporary session. You decide when to export, download, or save files to Google Drive.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-bg-tertiary/40 border border-border-subtle space-y-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-brand-primary" />
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                      8-Image Generation Cap
                    </h4>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    To maintain fair compute resources, visual direction images are capped at a maximum of 8 generations per account. The remaining quota is visible in your model selector bar.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-bg-tertiary/40 border border-border-subtle space-y-2">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Free Models & Unlimited BYOK</span>
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Default coding and reasoning models (Llama 3.3 70B, DeepSeek R1, Qwen 2.5 Coder) are completely free with 0 credit deduction. You can also connect your own API keys (BYOK) for direct, unlimited frontier model generation.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: KEYBOARD SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-bg-tertiary/40 border border-border-subtle space-y-3">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-brand-primary" />
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                    Workspace Keyboard Shortcuts
                  </h4>
                </div>

                <div className="divide-y divide-border-subtle text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-text-secondary">Send prompt or message</span>
                    <kbd className="px-2 py-1 rounded bg-bg-secondary border border-border-default font-mono text-[11px] text-text-primary">
                      Enter
                    </kbd>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-text-secondary">Insert newline in prompt</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 rounded bg-bg-secondary border border-border-default font-mono text-[11px] text-text-primary">
                        Shift
                      </kbd>
                      <span>+</span>
                      <kbd className="px-2 py-1 rounded bg-bg-secondary border border-border-default font-mono text-[11px] text-text-primary">
                        Enter
                      </kbd>
                    </div>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-text-secondary">Trigger specialized skill command</span>
                    <kbd className="px-2 py-1 rounded bg-bg-secondary border border-border-default font-mono text-[11px] text-text-primary">
                      /
                    </kbd>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-text-secondary">Pin prompt or mention artifact</span>
                    <kbd className="px-2 py-1 rounded bg-bg-secondary border border-border-default font-mono text-[11px] text-text-primary">
                      @
                    </kbd>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-text-secondary">Close modal or dialog</span>
                    <kbd className="px-2 py-1 rounded bg-bg-secondary border border-border-default font-mono text-[11px] text-text-primary">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-border-default bg-bg-tertiary/30 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            PromptHub Studio &bull; Multi-Domain Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
