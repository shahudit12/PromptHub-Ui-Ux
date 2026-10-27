import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  Award,
  Layers,
} from 'lucide-react';
import { DeliverableVersionPills, type DeliverableVersion } from './DeliverableVersionPills';

export interface ReportKpiMetric {
  id: string;
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  badge?: string;
  content: string;
  keyTakeaways?: string[];
  defaultExpanded?: boolean;
}

export interface ReportRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Critical';
  effort: 'Low' | 'Medium' | 'High';
  timeline?: string;
}

export interface ReportDeliverableData {
  title: string;
  subtitle?: string;
  readingTimeMinutes?: number;
  generatedDate?: string;
  authorModel?: string;
  executiveSummary?: string;
  kpis?: ReportKpiMetric[];
  sections?: ReportSection[];
  recommendations?: ReportRecommendation[];
  markdownRaw?: string;
  version?: number;
  versions?: DeliverableVersion[];
}

export interface ReportDeliverableCardProps {
  data?: Partial<ReportDeliverableData>;
  onIterate?: (prompt: string) => void;
  onVersionChange?: (version: number) => void;
  onDownloadReport?: (data: ReportDeliverableData) => void;
  className?: string;
}

const DEFAULT_REPORT_DATA: ReportDeliverableData = {
  title: 'Executive Strategic Assessment: AI Engineering Velocity & Infrastructure ROI',
  subtitle: 'Comparative operational analysis, automated prompt pipeline benchmarks, and 12-month capital deployment model',
  readingTimeMinutes: 5,
  generatedDate: 'October 20, 2026',
  authorModel: 'DeepSeek R1 Frontier • PromptHub Strategic Intelligence',
  version: 2,
  versions: [
    {
      version: 1,
      label: 'v1',
      summary: 'Initial executive briefing draft',
      timestamp: Date.now() - 7200000,
    },
    {
      version: 2,
      label: 'v2',
      summary: 'Incorporated 12-month cash flow & SLA benchmarks',
      timestamp: Date.now() - 1200000,
    },
  ],
  executiveSummary:
    'Transitioning legacy LLM workflows to an autonomous routing architecture (zero-cost free cluster + high-reasoning fallback) yields an estimated 68% decrease in gross API costs while driving feature cycle time from 14 days down to 48 hours. Key risks center on multi-tenant rate limits and downstream context drift, both mitigated through centralized verification sandboxes.',
  kpis: [
    {
      id: 'kpi_roi',
      label: 'Annualized Cost Savings',
      value: '$240,000',
      change: '+68.2%',
      trend: 'up',
      description: 'API cost elimination via smart tiered routing',
    },
    {
      id: 'kpi_velocity',
      label: 'Engineering Cycle Time',
      value: '2.4 Days',
      change: '-72.0%',
      trend: 'up',
      description: 'Reduction in prompt-to-production deployment',
    },
    {
      id: 'kpi_sla',
      label: 'Pipeline SLA Uptime',
      value: '99.94%',
      change: '+1.4%',
      trend: 'up',
      description: 'High availability across frontier provider fallbacks',
    },
    {
      id: 'kpi_efficiency',
      label: 'Developer Net CSAT',
      value: '94 / 100',
      change: '+22.5%',
      trend: 'up',
      description: 'Internal developer productivity satisfaction',
    },
  ],
  sections: [
    {
      id: 'sec_arch',
      title: '1. Architectural Transition & Infrastructure Audit',
      badge: 'Architecture',
      defaultExpanded: true,
      content:
        'The legacy infrastructure relied on homogenous frontier calls to commercial models for all tasks—ranging from trivial text classification to multi-stage synthesis. Under the revised routing matrix, multimodal requests route directly to Google Gemini 2.0 Flash, deep architectural reasoning delegates to DeepSeek R1, and coding operations execute against Qwen 2.5 Coder 32B.\n\nThis segregation reduces token wastage by 73% and ensures enterprise rate limits are isolated per workload category.',
      keyTakeaways: [
        'Homogenous model coupling eliminated in favor of task-specific routing.',
        'Zero-credit open clusters absorb 82% of baseline developmental queries.',
        'Deterministic validation gateways prevent hallucinated schema mutations.',
      ],
    },
    {
      id: 'sec_benchmarks',
      title: '2. Latency & Token Economy Benchmarks',
      badge: 'Performance',
      defaultExpanded: true,
      content:
        'Empirical latency benchmarks across 1,500 synthetic workloads reveal that client-side file preprocessing (extracting tabular data from CSV and text client-side prior to network dispatch) compresses round-trip latency by 410ms on average. Multimodal vision parsing of UI screenshots achieved 94.6% accuracy on color token extraction without requiring proprietary vector database lookups.',
      keyTakeaways: [
        'Average query turnaround dropped from 4.8s to 1.9s.',
        'Client-side tabular preprocessing reduced prompt payload sizes by 44%.',
      ],
    },
    {
      id: 'sec_governance',
      title: '3. Security, Privacy & Air-Gap Compliance',
      badge: 'Security',
      defaultExpanded: false,
      content:
        'All client prompt inputs, file attachments, and synthesized outputs undergo mandatory client-side DOMPurify sanitization. BYOK (Bring Your Own Key) credentials remain isolated in client memory and are never persisted to public server logs or training data stores. Row-Level Security (RLS) policies strictly enforce tenant boundary isolation.',
      keyTakeaways: [
        'Zero data retention on open-weight inference clusters.',
        'Full SOC 2 Type II audit readiness for customer workspaces.',
      ],
    },
  ],
  recommendations: [
    {
      id: 'rec_1',
      priority: 'high',
      title: 'Deploy Autonomous Model Router to All Production Workspaces',
      description:
        'Eliminate manual model selector drop-downs in favor of background intent classification. Move advanced parameter tuning to Developer Mode drawer.',
      impact: 'Critical',
      effort: 'Low',
      timeline: 'Sprint 1',
    },
    {
      id: 'rec_2',
      priority: 'high',
      title: 'Integrate Inline Deliverable Cards for Non-Code Artifacts',
      description:
        'Replace raw markdown chat bubbles with specialized cards (Ads, Reports, Data Tables) featuring 1-click clipboard export and download actions.',
      impact: 'High',
      effort: 'Medium',
      timeline: 'Sprint 2',
    },
    {
      id: 'rec_3',
      priority: 'medium',
      title: 'Establish Granular Version Diff Viewer for Iterative Revisions',
      description:
        'Implement [v1] [v2] version tracking pills on deliverable cards allowing users to inspect deltas and revert to earlier iterations with one click.',
      impact: 'Medium',
      effort: 'Low',
      timeline: 'Sprint 3',
    },
  ],
};

const REPORT_REVISION_CHIPS = [
  'Add financial ROI forecast',
  'Deepen competitive moat analysis',
  'Add 90-day implementation milestones',
  'Condense into executive bullet points',
  'Expand security & compliance section',
  'Add sensitivity risk matrix',
];

export const ReportDeliverableCard: React.FC<ReportDeliverableCardProps> = ({
  data = {},
  onIterate,
  onVersionChange,
  onDownloadReport,
  className = '',
}) => {
  const mergedData: ReportDeliverableData = {
    ...DEFAULT_REPORT_DATA,
    ...data,
  };

  const [activeVersion, setActiveVersion] = useState<number>(mergedData.version || 2);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    (mergedData.sections || []).forEach((sec) => {
      initial[sec.id] = sec.defaultExpanded ?? true;
    });
    return initial;
  });

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const generateMarkdown = (): string => {
    if (mergedData.markdownRaw) return mergedData.markdownRaw;

    const kpiBlock = (mergedData.kpis || [])
      .map((k) => `| **${k.label}** | **${k.value}** (${k.change || 'N/A'}) | ${k.description || ''} |`)
      .join('\n');

    const sectionsBlock = (mergedData.sections || [])
      .map(
        (s) => `### ${s.title}
*Category: ${s.badge || 'General'}*

${s.content}

${
  s.keyTakeaways && s.keyTakeaways.length > 0
    ? `**Key Takeaways:**\n${s.keyTakeaways.map((t) => `- ${t}`).join('\n')}`
    : ''
}`
      )
      .join('\n\n');

    const recommendationsBlock = (mergedData.recommendations || [])
      .map(
        (r, i) => `${i + 1}. **${r.title}**
   - Priority: ${r.priority.toUpperCase()} | Impact: ${r.impact} | Effort: ${r.effort} | Timeline: ${r.timeline || 'Immediate'}
   - ${r.description}`
      )
      .join('\n\n');

    return `# ${mergedData.title}
*${mergedData.subtitle || ''}*

**Generated:** ${mergedData.generatedDate || 'Current'} | **Reading Time:** ~${mergedData.readingTimeMinutes || 5} min | **Intelligence Engine:** ${mergedData.authorModel || 'PromptHub'}

---

## Executive Summary
${mergedData.executiveSummary || ''}

---

## Key Performance Indicators
| Metric | Value & Trend | Rationale |
| :--- | :--- | :--- |
${kpiBlock}

---

## Detailed Analysis & Findings
${sectionsBlock}

---

## Strategic Action Items & Recommendations
${recommendationsBlock}

---
*Report synthesized with PromptHub Strategic Intelligence Studio.*
`;
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdown();
    copyToClipboard(md, 'copy_markdown');
  };

  const handleDownloadMarkdown = () => {
    if (onDownloadReport) {
      onDownloadReport(mergedData);
      return;
    }

    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (mergedData.title || 'executive-report')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 40);
    link.download = `${safeTitle}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    copyToClipboard(md, 'download_feedback');
  };

  const handleVersionSelect = (v: number) => {
    setActiveVersion(v);
    if (onVersionChange) {
      onVersionChange(v);
    }
  };

  return (
    <div
      className={`w-full rounded-2xl bg-bg-secondary border border-border-default shadow-md overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
    >
      {/* ─── Header: Deliverable Identification & Version Pills ─── */}
      <div className="p-4 sm:p-5 border-b border-border-subtle bg-bg-tertiary/40 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-bold">
                  EXECUTIVE PUBLICATION
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-text-muted">
                  <Clock className="w-3 h-3 text-brand-accent" />
                  <span>{mergedData.readingTimeMinutes || 5} min read</span>
                </span>
              </div>
              <p className="text-xs text-text-muted">{mergedData.authorModel}</p>
            </div>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-medium border border-border-default hover:border-brand-primary/40 bg-bg-secondary hover:bg-bg-tertiary text-text-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-3xs"
              title="Copy formatted markdown report to clipboard"
              aria-label="Copy Markdown"
            >
              {copiedKey === 'copy_markdown' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="font-semibold text-brand-primary">Copied MD!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-text-muted" />
                  <span className="hidden sm:inline">Copy Markdown</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-brand-primary hover:bg-brand-primary-hi text-white transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Download standalone Markdown file (.md)"
              aria-label="Download Report"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Download Report (.md)</span>
            </button>
          </div>
        </div>

        {/* Version Pills */}
        <DeliverableVersionPills
          versions={mergedData.versions || [1, 2]}
          activeVersion={activeVersion}
          onSelectVersion={handleVersionSelect}
          title="Report Iterations"
        />
      </div>

      {/* ─── Document Title & Subtitle Banner ─── */}
      <div className="p-5 sm:p-6 border-b border-border-subtle bg-bg-primary/20 space-y-2">
        <h2 className="text-lg sm:text-xl font-display font-bold text-text-primary leading-tight">
          {mergedData.title}
        </h2>
        {mergedData.subtitle && (
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {mergedData.subtitle}
          </p>
        )}
        <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-text-muted">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-brand-accent" />
            <span>{mergedData.generatedDate}</span>
          </span>
          <span>•</span>
          <span className="text-brand-primary font-medium">Confidence Score: 98.4%</span>
        </div>
      </div>

      {/* ─── KPI Metrics Grid ─── */}
      {mergedData.kpis && mergedData.kpis.length > 0 && (
        <div className="p-4 sm:p-6 border-b border-border-subtle">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-brand-accent" />
            <span>Key Performance Indicators & ROI Forecast</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {mergedData.kpis.map((kpi) => (
              <div
                key={kpi.id}
                className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default hover:border-brand-primary/40 transition-colors space-y-1.5"
              >
                <div className="text-[11px] font-mono text-text-muted truncate">{kpi.label}</div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xl font-display font-bold text-text-primary">{kpi.value}</span>
                  {kpi.change && (
                    <span
                      className={`text-xs font-mono font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                        kpi.trend === 'up'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : kpi.trend === 'down'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-brand-primary/10 text-brand-primary'
                      }`}
                    >
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{kpi.change}</span>
                    </span>
                  )}
                </div>
                {kpi.description && (
                  <p className="text-[11px] text-text-secondary leading-snug truncate">
                    {kpi.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Executive Summary Section (Highlight Box) ─── */}
      {mergedData.executiveSummary && (
        <div className="p-4 sm:p-6 border-b border-border-subtle">
          <div className="p-4 sm:p-5 rounded-xl bg-brand-primary/5 border border-brand-primary/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Summary & Strategic Takeaway</span>
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(mergedData.executiveSummary || '', 'summary')}
                className="min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-mono rounded-lg border border-border-subtle bg-bg-secondary hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 cursor-pointer"
                title="Copy executive summary"
              >
                {copiedKey === 'summary' ? (
                  <Check className="w-3 h-3 text-brand-primary" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm text-text-primary leading-relaxed font-normal">
              {mergedData.executiveSummary}
            </p>
          </div>
        </div>
      )}

      {/* ─── Collapsible Deep Sections ─── */}
      <div className="p-4 sm:p-6 border-b border-border-subtle space-y-3">
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-brand-primary" />
          <span>Detailed Analytical Sections</span>
        </div>

        {(mergedData.sections || []).map((sec) => {
          const isExpanded = expandedSections[sec.id] ?? true;

          return (
            <div
              key={sec.id}
              className="rounded-xl bg-bg-tertiary/40 border border-border-default overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
            >
              {/* Accordion header button */}
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                className="min-h-[44px] min-w-[44px] w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-bg-tertiary/80 transition-colors cursor-pointer"
                aria-expanded={isExpanded}
                aria-controls={`section-content-${sec.id}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs sm:text-sm font-display font-semibold text-text-primary">
                    {sec.title}
                  </span>
                  {sec.badge && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-secondary border border-border-subtle text-text-muted">
                      {sec.badge}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-text-muted">
                  <span className="text-[11px] font-mono hidden sm:inline">
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 shrink-0 text-text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 shrink-0 text-text-muted" />
                  )}
                </div>
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div
                  id={`section-content-${sec.id}`}
                  className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-3 border-t border-border-subtle pt-3"
                >
                  <div className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                    {sec.content}
                  </div>

                  {sec.keyTakeaways && sec.keyTakeaways.length > 0 && (
                    <div className="p-3 rounded-lg bg-bg-secondary border border-border-subtle space-y-1.5">
                      <span className="text-[11px] font-mono text-text-muted font-semibold block">
                        Core Observations & Evidence:
                      </span>
                      <ul className="text-xs text-text-primary space-y-1">
                        {sec.keyTakeaways.map((takeaway, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-brand-primary font-bold mt-0.5 shrink-0">›</span>
                            <span>{takeaway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Strategic Recommendations List ─── */}
      {mergedData.recommendations && mergedData.recommendations.length > 0 && (
        <div className="p-4 sm:p-6 border-b border-border-subtle space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
              Strategic Action Items & Implementation Plan
            </span>
            <span className="text-[10px] font-mono text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">
              Prioritized by Impact
            </span>
          </div>

          <div className="space-y-2.5">
            {mergedData.recommendations.map((rec, i) => (
              <div
                key={rec.id}
                className="p-3.5 sm:p-4 rounded-xl bg-bg-tertiary/40 border border-border-default hover:border-brand-primary/30 transition-colors space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <h4 className="text-xs sm:text-sm font-semibold text-text-primary">
                      {rec.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-bold">
                      Impact: {rec.impact}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-bg-secondary border border-border-subtle text-text-muted">
                      Effort: {rec.effort}
                    </span>
                    {rec.timeline && (
                      <span className="px-2 py-0.5 rounded bg-bg-secondary border border-border-subtle text-text-secondary font-medium">
                        {rec.timeline}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed pl-7">
                  {rec.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Quick Iteration Revision Chips ─── */}
      <div className="p-4 sm:p-5 bg-bg-tertiary/30">
        <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted mb-2.5">
          <RefreshCw className="w-3.5 h-3.5 text-brand-primary shrink-0" />
          <span>Quick Iteration Revisions:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {REPORT_REVISION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                if (onIterate) {
                  onIterate(chip);
                } else {
                  copyToClipboard(`Iterate report: "${chip}"`, `chip_${chip}`);
                }
              }}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-mono bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-3xs"
              title={`Request report iteration: "${chip}"`}
              aria-label={`Revise report: ${chip}`}
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
