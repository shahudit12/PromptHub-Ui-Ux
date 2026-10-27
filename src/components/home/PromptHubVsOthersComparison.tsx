import React from 'react';
import { 
  CheckCircle2, 
  Minus, 
  Swords, 
  Gauge, 
  GitBranch, 
  Variable, 
  ShieldCheck, 
  ShoppingBag,
  Sparkles
} from 'lucide-react';

interface ComparisonRow {
  dimension: string;
  icon: React.ComponentType<any>;
  prompthub: {
    title: string;
    description: string;
  };
  others: {
    title: string;
    description: string;
  };
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    dimension: 'Multi-Model Benchmarking',
    icon: Swords,
    prompthub: {
      title: 'Simultaneous Multi-Model Arena',
      description: 'Run identical prompts side-by-side across Claude 3.5, GPT-4o, Gemini 2.0, and DeepSeek R1 with real-time response times, token count, and cost tracking.',
    },
    others: {
      title: 'Single-Model Execution',
      description: 'Requires testing models one at a time across separate vendor interfaces without synchronized inputs or latency comparison.',
    },
  },
  {
    dimension: 'Prompt Quality Evaluation',
    icon: Gauge,
    prompthub: {
      title: 'Instant Quality & Security Audit',
      description: 'Automatic scoring across clarity, instructions, formatting, constraints, and potential edge cases.',
    },
    others: {
      title: 'Subjective Trial & Error',
      description: 'Zero automated quality scoring; prompt engineers must guess failure modes through manual inspection.',
    },
  },
  {
    dimension: 'Parameter Management',
    icon: Variable,
    prompthub: {
      title: 'Dynamic {{variable}} Detection',
      description: 'Automatic parameter extraction with interactive input fields, schema validation, and multi-turn batch test execution.',
    },
    others: {
      title: 'Manual Text Substitution',
      description: 'Developers must manually find and replace variables within prompt text before each test execution.',
    },
  },
  {
    dimension: 'Version Control & History',
    icon: GitBranch,
    prompthub: {
      title: 'Version History & Restore',
      description: 'Save version snapshots, compare changes with visual diffs, and restore any previous version with one click.',
    },
    others: {
      title: 'Unversioned Chat Logs',
      description: 'Prompts remain scattered across linear chat logs or external document files with no change tracking or diffs.',
    },
  },
  {
    dimension: 'Privacy & API Security',
    icon: ShieldCheck,
    prompthub: {
      title: 'Zero Training & Encrypted BYOK',
      description: 'Zero model training on user prompt data, DPDP compliance, and client-side session-encrypted BYOK provider credentials.',
    },
    others: {
      title: 'Vendor Training Retention',
      description: 'Consumer AI tools often log and retain prompt interactions for continuous model fine-tuning and evaluation.',
    },
  },
  {
    dimension: 'Asset Marketplace & Vault',
    icon: ShoppingBag,
    prompthub: {
      title: 'Tested Templates & Cloud Storage',
      description: 'Ready-to-use prompt templates, creator earnings, Google Drive storage sync, and customizable templates.',
    },
    others: {
      title: 'Unvetted Forum Snippets',
      description: 'Unvetted forum snippets with no test history, versioning, or storage sync.',
    },
  },
];

export const PromptHubVsOthersComparison: React.FC = () => {
  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 md:px-8 bg-bg-secondary border-b border-border-default text-left font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Section Header */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary-light border border-brand-primary/20 text-brand-primary text-xs font-mono font-medium tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PRODUCT DIFFERENTIATION</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-text-primary tracking-tight">
            PromptHub vs Generic AI Tools
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Built specifically for crafting quality prompts, comparing AI models side-by-side, and managing your team's prompts.
          </p>
        </div>

        {/* Comparison Matrix Table */}
        <div className="rounded-2xl border border-border-default bg-bg-primary overflow-hidden shadow-xs">
          {/* Header Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-border-default bg-bg-tertiary/60 text-xs font-mono uppercase tracking-wider font-semibold">
            <div className="md:col-span-4 p-3.5 sm:p-4 text-text-muted">
              Capability &amp; Feature Area
            </div>
            <div className="md:col-span-4 p-3.5 sm:p-4 text-brand-primary bg-brand-primary/5 border-l md:border-l border-border-default/60 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-primary" />
              <span>PromptHub Studio</span>
            </div>
            <div className="md:col-span-4 p-3.5 sm:p-4 text-text-muted border-l md:border-l border-border-default/60 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-text-muted/60" />
              <span>Generic AI Chatbots &amp; Playgrounds</span>
            </div>
          </div>

          {/* Matrix Rows */}
          <div className="divide-y divide-border-default">
            {COMPARISON_ROWS.map((row) => {
              const Icon = row.icon;
              return (
                <div 
                  key={row.dimension}
                  className="grid grid-cols-1 md:grid-cols-12 text-xs sm:text-sm transition-colors hover:bg-bg-secondary/40"
                >
                  {/* Dimension Name & Icon */}
                  <div className="md:col-span-4 p-3.5 sm:p-5 flex items-start gap-3 bg-bg-primary">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary-light border border-brand-primary/15 flex items-center justify-center text-brand-primary shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary text-xs sm:text-sm font-display">{row.dimension}</h3>
                      <span className="text-[10px] text-text-muted font-mono uppercase">Key Capability</span>
                    </div>
                  </div>

                  {/* PromptHub Column */}
                  <div className="md:col-span-4 p-3.5 sm:p-5 bg-brand-primary/[0.02] border-t md:border-t-0 md:border-l border-border-default/60 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                      <strong className="text-text-primary font-semibold text-xs sm:text-sm">{row.prompthub.title}</strong>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed pl-6 font-sans">
                      {row.prompthub.description}
                    </p>
                  </div>

                  {/* Others Column */}
                  <div className="md:col-span-4 p-3.5 sm:p-5 bg-bg-primary border-t md:border-t-0 md:border-l border-border-default/60 space-y-1.5 text-text-muted">
                    <div className="flex items-center gap-2">
                      <Minus className="w-4 h-4 text-text-muted/60 shrink-0" />
                      <span className="text-text-secondary font-medium text-xs sm:text-sm">{row.others.title}</span>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed pl-6 font-sans">
                      {row.others.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-border-default bg-bg-primary shadow-xs">
            <span className="text-[10px] font-mono uppercase font-semibold text-text-muted">Model Benchmarks</span>
            <div className="text-lg font-bold font-display text-text-primary mt-1">Multi-Model Arena</div>
            <p className="text-xs text-text-secondary mt-0.5">Compare up to 4 models side-by-side with speed and cost tracking.</p>
          </div>
          <div className="p-4 rounded-xl border border-border-default bg-bg-primary shadow-xs">
            <span className="text-[10px] font-mono uppercase font-semibold text-text-muted">Evaluation Engine</span>
            <div className="text-lg font-bold font-display text-text-primary mt-1">Quality Scoring</div>
            <p className="text-xs text-text-secondary mt-0.5">Automated checks for clarity, missing instructions, and formatting issues.</p>
          </div>
          <div className="p-4 rounded-xl border border-border-default bg-bg-primary shadow-xs">
            <span className="text-[10px] font-mono uppercase font-semibold text-text-muted">Data Security</span>
            <div className="text-lg font-bold font-display text-text-primary mt-1">Zero Training Retention</div>
            <p className="text-xs text-text-secondary mt-0.5">Private workspaces with encrypted browser storage for your personal API keys.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
