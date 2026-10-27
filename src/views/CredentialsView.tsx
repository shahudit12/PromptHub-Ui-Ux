import React from 'react';
import { AIProvidersSection } from '../components/AIProvidersSection';
import { Code2, Terminal, Sparkles, Clock } from 'lucide-react';
import { ByokLogo } from '../components/ByokLogo';

export const CredentialsView: React.FC = () => {
  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-bg-primary text-text-primary text-left select-text space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-default">
        <div className="flex items-center gap-3">
          <ByokLogo size={46} showTile={true} />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-text-primary tracking-tight">API Credentials &amp; Providers</h2>
            <p className="text-text-secondary text-xs mt-0.5 max-w-2xl leading-relaxed">
              Connect BYOK keys for OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Groq, Mistral, xAI, Cohere, Together, and OpenRouter.
              Keys are held strictly in your browser session memory and <strong className="text-text-primary">never stored on PromptHub servers</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl space-y-6">
        <AIProvidersSection />

        {/* Developer Integrations & SDK Hub - Under Development Notice */}
        <div className="pt-6 border-t border-border-default">
          <div className="rounded-xl bg-bg-secondary border border-border-default p-5 shadow-xs transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-bg-tertiary border border-border-default text-brand-primary shrink-0 mt-0.5">
                  <Code2 className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-sm sm:text-base font-bold font-display text-text-primary tracking-tight">
                      Developer SDK &amp; Integrations Hub
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                      <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      Under Development
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
                    The PromptHub Developer SDK &amp; Integrations Hub is currently under active development. Upcoming releases will feature official TypeScript and Python SDKs, terminal CLI tooling, and IDE extensions to fetch and compile versioned prompt templates directly in your production pipelines and local workflows.
                  </p>
                </div>
              </div>
            </div>

            {/* Planned Integrations Preview Tags */}
            <div className="mt-4 pt-4 border-t border-border-subtle flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-text-muted font-medium">Planned integrations:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-tertiary text-text-secondary text-xs border border-border-default font-mono">
                <Code2 className="w-3.5 h-3.5 text-brand-primary" />
                TypeScript / Node SDK
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-tertiary text-text-secondary text-xs border border-border-default font-mono">
                <Terminal className="w-3.5 h-3.5 text-brand-primary" />
                Python SDK
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-tertiary text-text-secondary text-xs border border-border-default font-mono">
                <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                CLI &amp; IDE Plugins
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CredentialsView;
