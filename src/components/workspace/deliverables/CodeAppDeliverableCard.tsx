import React, { useState } from 'react';
import {
  Code2,
  Play,
  Download,
  Copy,
  Check,
  FolderTree,
  ChevronDown,
  ChevronUp,
  FileCode,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Terminal,
  Cpu,
  Globe,
  Share2,
} from 'lucide-react';
import { DeliverableVersionPills, type DeliverableVersion } from './DeliverableVersionPills';
import { createShareablePreviewUrl, ensureRunnableHtmlPayload } from '../../../utils/previewBundleUtils';

export interface CodeAppFile {
  path: string;
  sizeBytes?: number;
  type?: 'typescript' | 'javascript' | 'css' | 'html' | 'json' | 'markdown';
  summary?: string;
  isEntry?: boolean;
}

export interface CodeAppDeliverableData {
  title: string;
  description: string;
  entryFile?: string;
  techStack?: string[];
  files?: CodeAppFile[];
  previewUrl?: string;
  zipFilename?: string;
  version?: number;
  versions?: DeliverableVersion[];
  rawCodeSnippet?: string;
}

export interface CodeAppDeliverableCardProps {
  data?: Partial<CodeAppDeliverableData>;
  onOpenLivePreview?: () => void;
  onExportZip?: (data: CodeAppDeliverableData) => void;
  onIterate?: (prompt: string) => void;
  onVersionChange?: (version: number) => void;
  onDeploy?: () => void;
  className?: string;
}

const DEFAULT_CODE_APP_DATA: CodeAppDeliverableData = {
  title: 'Interactive SaaS ROI & Cloud Infrastructure Calculator',
  description:
    'Full-featured dynamic web application with real-time parameter sliders, tier comparisons, SVG trend visualizer, and export to CSV/JSON built with modern reactive state.',
  entryFile: 'src/App.tsx',
  techStack: ['React 19', 'Tailwind CSS v4', 'TypeScript', 'Lucide Icons', 'Vite'],
  zipFilename: 'saas-roi-calculator.zip',
  version: 2,
  versions: [
    {
      version: 1,
      label: 'v1',
      summary: 'Initial component structure & calculation engine',
      timestamp: Date.now() - 3600000,
    },
    {
      version: 2,
      label: 'v2',
      summary: 'Added SVG margin graphs & responsive layout',
      timestamp: Date.now() - 600000,
    },
  ],
  files: [
    {
      path: 'src/App.tsx',
      sizeBytes: 4820,
      type: 'typescript',
      isEntry: true,
      summary: 'Main reactive application container with dynamic calculation state',
    },
    {
      path: 'src/components/RoiSliderGroup.tsx',
      sizeBytes: 2450,
      type: 'typescript',
      summary: 'Accessible slider input controls for cloud seat count and monthly churn',
    },
    {
      path: 'src/components/SummaryChart.tsx',
      sizeBytes: 3120,
      type: 'typescript',
      summary: 'Hardware-accelerated SVG payback curve and cumulative savings graph',
    },
    {
      path: 'src/types.ts',
      sizeBytes: 890,
      type: 'typescript',
      summary: 'Strict TypeScript interfaces for scenario model parameters',
    },
  ],
  rawCodeSnippet: `// src/App.tsx - Interactive SaaS ROI & Cloud Infrastructure Calculator
import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Users, ArrowRight } from 'lucide-react';

export default function App() {
  const [teamSize, setTeamSize] = useState(25);
  const [currentCostPerUser, setCurrentCostPerUser] = useState(120);
  const [efficiencyGain, setEfficiencyGain] = useState(35);

  const annualSavings = useMemo(() => {
    const grossCost = teamSize * currentCostPerUser * 12;
    return Math.round(grossCost * (efficiencyGain / 100));
  }, [teamSize, currentCostPerUser, efficiencyGain]);

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] p-6 font-sans">
      <div className="max-w-3xl mx-auto rounded-2xl bg-[#0B1118] border border-[#1C2B3A] p-6">
        <h1 className="text-xl font-bold font-display text-white">SaaS ROI Engine</h1>
        <p className="text-sm text-[#C5D7E8] mt-1">Projected Annual Savings: \${annualSavings.toLocaleString()}</p>
      </div>
    </div>
  );
}`,
};

const CODE_REVISION_CHIPS = [
  'Deploy & Host Website (Free / Paid)',
  'Add dark / light mode toggle',
  'Make layout mobile responsive',
  'Add export results to CSV',
  'Add unit test suite with Vitest',
  'Add loading skeleton state',
  'Add PDF summary report export',
];

export const CodeAppDeliverableCard: React.FC<CodeAppDeliverableCardProps> = ({
  data = {},
  onOpenLivePreview,
  onExportZip,
  onIterate,
  onVersionChange,
  onDeploy,
  className = '',
}) => {
  const mergedData: CodeAppDeliverableData = {
    ...DEFAULT_CODE_APP_DATA,
    ...data,
  };

  const [activeVersion, setActiveVersion] = useState<number>(mergedData.version || 2);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showFileManifest, setShowFileManifest] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleOpenPreview = () => {
    if (onOpenLivePreview) {
      onOpenLivePreview();
    } else {
      copyToClipboard('Opening live preview inspector...', 'preview_notice');
    }
  };

  const handleExportZip = () => {
    if (onExportZip) {
      onExportZip(mergedData);
      return;
    }

    setIsExporting(true);
    try {
      // Create multi-file export package archive
      const manifestObj = {
        title: mergedData.title,
        description: mergedData.description,
        techStack: mergedData.techStack,
        exportedAt: new Date().toISOString(),
        files: (mergedData.files || []).map((f) => ({
          path: f.path,
          summary: f.summary,
        })),
        entryFile: mergedData.entryFile,
        primaryCode: mergedData.rawCodeSnippet || '',
      };

      const jsonStr = JSON.stringify(manifestObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${mergedData.zipFilename?.replace(/\.zip$/, '') || 'project'}-package.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      copyToClipboard(jsonStr, 'zip_feedback');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyCode = () => {
    copyToClipboard(mergedData.rawCodeSnippet || '', 'copy_code');
  };

  const getCleanSlug = () => {
    return (mergedData.title || 'app')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24) || 'preview';
  };

  const getPreviewHtml = () => {
    const raw = mergedData.rawCodeSnippet || '';
    if (!raw) return '';
    return ensureRunnableHtmlPayload(raw, getCleanSlug());
  };

  const handleOpenInNewTab = () => {
    const slug = getCleanSlug();
    const html = getPreviewHtml();
    if (html) {
      try {
        localStorage.setItem(`ph_live_site_${slug}`, html);
        localStorage.setItem('ph_workspace_latest_html', html);
      } catch {}
    }
    const targetUrl = createShareablePreviewUrl(slug, html || undefined);
    window.open(targetUrl, '_blank');
  };

  const handleShareLink = async () => {
    const slug = getCleanSlug();
    const html = getPreviewHtml();
    if (html) {
      try {
        localStorage.setItem(`ph_live_site_${slug}`, html);
        localStorage.setItem('ph_workspace_latest_html', html);
      } catch {}
    }
    const url = createShareablePreviewUrl(slug, html || undefined);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey('share_link');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  const handleVersionSelect = (v: number) => {
    setActiveVersion(v);
    if (onVersionChange) {
      onVersionChange(v);
    }
  };

  return (
    <div
      className={`w-full rounded-xl bg-bg-secondary border border-border-default shadow-xs overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
    >
      {/* ─── Header: Deliverable Badge & Version Pills ─── */}
      <div className="p-4 sm:p-5 border-b border-border-subtle bg-bg-tertiary/40 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
              <Code2 className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-bold">
                  INTERACTIVE WEB APP
                </span>
                <span className="text-[11px] font-mono text-emerald-500 font-semibold">
                  ● Ready to Run
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Synthesized by Qwen 2.5 Coder 32B • Complete Multi-File Project
              </p>
            </div>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-medium border border-border-default hover:border-brand-primary/40 bg-bg-secondary hover:bg-bg-tertiary text-text-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-3xs"
              title="Copy entry file source code"
              aria-label="Copy Entry Code"
            >
              {copiedKey === 'copy_code' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="font-semibold text-brand-primary">Copied Code!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-text-muted" />
                  <span className="hidden sm:inline">Copy Entry Code</span>
                </>
              )}
            </button>

            {onDeploy && (
              <button
                type="button"
                onClick={onDeploy}
                className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-semibold border border-brand-primary/30 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-3xs"
                title="Deploy and host website (Free & Paid providers)"
                aria-label="Deploy and Host Website"
              >
                <Globe className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                <span className="hidden sm:inline">Deploy & Host</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportZip}
              disabled={isExporting}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-semibold border border-border-default hover:border-brand-primary/40 bg-bg-secondary hover:bg-bg-tertiary text-text-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-3xs"
              title="Export complete project files archive"
              aria-label="Export ZIP Package"
            >
              <Download className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span className="hidden sm:inline">Export Package</span>
            </button>
          </div>
        </div>

        {/* Version Pills */}
        <DeliverableVersionPills
          versions={mergedData.versions || [1, 2]}
          activeVersion={activeVersion}
          onSelectVersion={handleVersionSelect}
          title="App Iterations"
        />
      </div>

      {/* ─── Hero Overview & Prominent Live Preview Action ─── */}
      <div className="p-5 sm:p-6 border-b border-border-subtle bg-bg-primary/20 space-y-4">
        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-display font-bold text-text-primary">
            {mergedData.title}
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {mergedData.description}
          </p>
        </div>

        {/* Tech Stack Badges */}
        {mergedData.techStack && mergedData.techStack.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-mono text-text-muted mr-1 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-brand-accent" />
              <span>Stack:</span>
            </span>
            {mergedData.techStack.map((tech) => (
              <span
                key={tech}
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-bg-secondary border border-border-subtle text-text-primary shadow-3xs"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Prominent High-Contrast Call to Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={handleOpenPreview}
            className="min-h-[44px] min-w-[44px] w-full py-3 px-6 rounded-xl font-bold font-sans text-sm bg-brand-primary hover:bg-brand-primary-hi text-white shadow-md transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center gap-2.5 cursor-pointer"
            aria-label="Open Live Preview & Code Inspector"
          >
            <Play className="w-4 h-4 text-white fill-white shrink-0" />
            <span>Open Live Preview & Code Inspector</span>
            <ExternalLink className="w-4 h-4 text-white shrink-0 ml-1" />
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl font-medium font-sans text-xs bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary/40 text-text-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
              aria-label="Open in Dedicated Tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span>Open in New Tab</span>
            </button>
            <button
              type="button"
              onClick={handleShareLink}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl font-medium font-sans text-xs bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary/40 text-text-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
              aria-label="Share Preview Link"
            >
              {copiedKey === 'share_link' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span className="text-brand-primary font-semibold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span>Share Preview Link</span>
                </>
              )}
            </button>
          </div>

          {onDeploy && (
            <button
              type="button"
              onClick={onDeploy}
              className="min-h-[44px] min-w-[44px] w-full py-2.5 px-4 rounded-xl font-medium font-sans text-xs bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary/40 text-text-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center gap-2 cursor-pointer"
              aria-label="Deploy to Vercel, Netlify, Cloudflare or Hostinger"
            >
              <Globe className="w-4 h-4 text-brand-primary shrink-0" />
              <span>Deploy & Host (Free Netlify / Vercel or Custom Domain)</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── File Manifest Accordion ─── */}
      <div className="p-4 sm:p-6 border-b border-border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowFileManifest(!showFileManifest)}
            className="min-h-[44px] min-w-[44px] flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            aria-expanded={showFileManifest}
            aria-label="Toggle Project File Manifest"
          >
            <FolderTree className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span>Project File Manifest ({mergedData.files?.length || 4} files)</span>
            {showFileManifest ? (
              <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            )}
          </button>

          <span className="text-[11px] font-mono text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">
            Entry: {mergedData.entryFile || 'App.tsx'}
          </span>
        </div>

        {showFileManifest && (
          <div className="space-y-2 pt-1">
            {(mergedData.files || []).map((file) => (
              <div
                key={file.path}
                className="p-3 rounded-xl bg-bg-tertiary/40 border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-brand-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-bg-secondary border border-border-subtle text-brand-primary">
                    <FileCode className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-text-primary">
                        {file.path}
                      </span>
                      {file.isEntry && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-brand-primary text-white font-bold">
                          Entry
                        </span>
                      )}
                    </div>
                    {file.summary && (
                      <p className="text-[11px] text-text-muted truncate max-w-md">
                        {file.summary}
                      </p>
                    )}
                  </div>
                </div>

                {file.sizeBytes && (
                  <span className="text-[10px] font-mono text-text-muted shrink-0">
                    {(file.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Code Snippet Peek ─── */}
      {mergedData.rawCodeSnippet && (
        <div className="p-4 sm:p-6 border-b border-border-subtle space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-text-muted">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5 text-brand-accent" />
              <span>Entry Code Preview ({mergedData.entryFile})</span>
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="min-h-[44px] min-w-[44px] px-2.5 py-1 text-[11px] rounded-lg border border-border-subtle bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'copy_code' ? (
                <Check className="w-3 h-3 text-brand-primary" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>Copy</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-subtle text-[11px] font-mono text-text-secondary overflow-x-auto max-h-[180px] scrollbar-thin leading-relaxed">
            <code>{mergedData.rawCodeSnippet}</code>
          </pre>
        </div>
      )}

      {/* ─── Quick Iteration Revision Chips ─── */}
      <div className="p-4 sm:p-5 bg-bg-tertiary/30">
        <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted mb-2.5">
          <RefreshCw className="w-3.5 h-3.5 text-brand-primary shrink-0" />
          <span>Quick Iteration Revisions:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {CODE_REVISION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                if (onIterate) {
                  onIterate(chip);
                } else {
                  copyToClipboard(`Iterate code app: "${chip}"`, `chip_${chip}`);
                }
              }}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-mono bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-3xs"
              title={`Request code revision: "${chip}"`}
              aria-label={`Revise code: ${chip}`}
            >
              <Sparkles className="w-3 h-3 text-brand-accent shrink-0" />
              <span>{chip}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
