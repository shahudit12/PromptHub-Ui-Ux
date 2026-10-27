import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Terminal, 
  Swords, 
  ScanLine, 
  ArrowLeft,
  LayoutDashboard,
  ShieldCheck,
  ChevronRight,
  Sliders,
  Cpu,
  Layers,
  Zap,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { ByokLogo } from '../components/ByokLogo';
import { PromptKeyIcon } from '../components/icons/PromptHubIcons';
import { DeveloperModeDrawer, type DeveloperSettings } from '../components/workspace/DeveloperModeDrawer';
import { classifyDeliverableIntent } from '../services/ai/intentClassifier';
import { resolveAutonomousModelRoute } from '../services/ai/modelRouter';
import { multiProviderService } from '../services/ai/multiProviderService';

interface DeveloperModeViewProps {
  initialTool?: string;
}

export const DeveloperModeView: React.FC<DeveloperModeViewProps> = ({ initialTool }) => {
  const { setActiveTab } = useApp();
  const searchTool = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tool') : null;
  const activeToolParam = initialTool || searchTool;
  void activeToolParam;

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [devSettings, setDevSettings] = useState<DeveloperSettings>({
    modelOverride: null,
    temperature: 0.7,
    maxTokens: 4096,
    systemPromptOverride: '',
  });

  // Routing Playground state
  const [testQuery, setTestQuery] = useState('Generate an ad campaign for organic roasted coffee with headline and CTA');
  const [simulatedVision, setSimulatedVision] = useState(false);

  // Compute live intent classification and route
  const classification = useMemo(() => {
    const mockAttachments = simulatedVision ? [{ isImage: true, name: 'product-photo.png', mimeType: 'image/png' }] : undefined;
    return classifyDeliverableIntent(testQuery, mockAttachments);
  }, [testQuery, simulatedVision]);

  const routeResult = useMemo(() => {
    return resolveAutonomousModelRoute({
      deliverableType: classification.deliverableType,
      hasVisionInput: classification.hasVisionInput,
      userPrompt: testQuery,
      explicitModelOverride: devSettings.modelOverride,
    });
  }, [classification, testQuery, devSettings.modelOverride]);

  const connectedProviders = multiProviderService.getConnectedProviders();

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-bg-primary text-text-primary select-text">
      {/* ── Sub-header / Quick Return Navigation ── */}
      <header className="h-14 shrink-0 bg-bg-secondary border-b border-border-default px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-2 transition-all duration-150 cursor-pointer group shadow-2xs"
            title="Return to the Creation Workspace"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Return to Workspace</span>
            <span className="sm:hidden">Workspace</span>
          </button>

          <div className="h-4 w-px bg-border-default hidden sm:block" />

          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold font-display text-text-primary tracking-tight">
              Developer Mode
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
              SUITE &amp; ROUTER V3
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-brand-primary" />
            <span className="hidden sm:inline">Developer Controls</span>
            <span className="sm:hidden">Controls</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PromptKeyIcon size={14} className="text-brand-primary" />
            <span className="hidden md:inline">API Keys</span>
          </button>
        </div>
      </header>

      {/* ── Main Hero Content ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {/* Developer Suite Hero Card */}
        <section className="bg-bg-secondary border border-border-default rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/25 flex items-center justify-center text-brand-primary shrink-0">
                <Terminal className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold font-display text-text-primary tracking-tight">
                  Developer Mode Suite
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary">
                  Autonomous model routing engine, inference parameters, and BYOK credential manager
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-[#084C8D] dark:bg-[#41A2D9] dark:hover:bg-[#64B6E3] text-white dark:text-[#000000] font-semibold text-xs transition-all duration-150 cursor-pointer flex items-center gap-2 shadow-sm shrink-0"
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span>Open Developer Controls Drawer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border-subtle text-xs">
            <div className="flex items-center gap-2 text-text-secondary">
              <Cpu className="w-4 h-4 text-brand-primary shrink-0" />
              <span>Active Model: <strong className="text-text-primary font-mono">{devSettings.modelOverride || 'Autonomous Auto'}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Sliders className="w-4 h-4 text-brand-primary shrink-0" />
              <span>Inference Temp: <strong className="text-text-primary font-mono">{devSettings.temperature.toFixed(2)}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <PromptKeyIcon size={14} className="text-brand-primary shrink-0" />
              <span>BYOK Keys Connected: <strong className="text-text-primary font-mono">{connectedProviders.length} active</strong></span>
            </div>
          </div>
        </section>

        {/* ── Live Intent Classification & Routing Matrix Inspector ── */}
        <section className="bg-bg-secondary border border-border-default rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-text-primary">
                  Live Deliverable Intent &amp; Model Routing Matrix
                </h3>
                <p className="text-xs text-text-muted">
                  Test prompt semantics, multimodal vision triggers, and verify autonomous routing logic
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 hidden sm:inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              ACTIVE ROUTER
            </span>
          </div>

          {/* Test Input Bar */}
          <div className="space-y-3">
            <label htmlFor="routing-inspector-input" className="text-xs font-semibold text-text-primary block">
              Sample Prompt Brief
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="routing-inspector-input"
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Type any user brief to test autonomous deliverable routing..."
                className="flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl border border-border-default bg-bg-primary text-text-primary text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setSimulatedVision(!simulatedVision)}
                className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer shrink-0 ${
                  simulatedVision
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-secondary'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Simulate Image Attachment ({simulatedVision ? 'ON' : 'OFF'})</span>
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: 'Ad Campaign', query: 'Create a social ad campaign with catchy headline and CTA for our new fitness app', vision: false },
                { label: 'Vision Multimodal', query: 'Analyze this brand logo and product packaging image for color scheme', vision: true },
                { label: 'Executive Report', query: 'Write a comprehensive Q3 research report evaluating renewable energy market trends', vision: false },
                { label: 'Strategic Roadmap', query: 'Develop a phased strategic plan and go-to-market roadmap with key milestones', vision: false },
                { label: 'Data Analysis Table', query: 'Analyze this monthly revenue CSV dataset and summarize KPI trends', vision: false },
                { label: 'Interactive Web App', query: 'Build an interactive task tracker web app with Tailwind CSS and responsive UI', vision: false },
                { label: 'Python Script', query: 'Write a python script to parse logs and send alerts via webhook', vision: false },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setTestQuery(preset.query);
                    setSimulatedVision(preset.vision);
                  }}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Diagnostics Output Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Box 1: Intent Classification */}
            <div className="bg-bg-primary border border-border-default rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-brand-primary" />
                  Classified Deliverable Intent
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-bold">
                  {Math.round(classification.confidence * 100)}% CONFIDENCE
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-text-primary bg-bg-secondary px-2.5 py-1 rounded-lg border border-border-subtle">
                    {classification.deliverableType}
                  </span>
                  {classification.hasVisionInput && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      multimodal vision
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {classification.formatSpecification}
                </p>
                {classification.detectedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {classification.detectedKeywords.map((kw) => (
                      <span key={kw} className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-bg-secondary text-text-muted border border-border-subtle">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: Autonomous Model Route */}
            <div className="bg-bg-primary border border-border-default rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-brand-primary" />
                  Resolved Model &amp; Gateway
                </span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  routeResult.creditCost === 0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}>
                  {routeResult.creditCost === 0 ? '0 CREDITS' : `${routeResult.creditCost} CREDITS`}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="font-mono font-bold text-sm text-text-primary truncate">
                  {routeResult.modelId}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-text-muted">Lane:</span>
                  <span className="font-semibold text-text-primary">{routeResult.gatewayLabel}</span>
                  <span className="text-[10px] font-mono uppercase text-brand-primary">[{routeResult.tier}]</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {routeResult.rationale}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Component Status & Alternatives Matrix ── */}
        <section className="space-y-4">
          <div className="border-b border-border-default pb-2">
            <h3 className="text-base font-bold font-display text-text-primary tracking-tight">
              Component Status &amp; Alternatives
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Current lifecycle status of individual developer tools during the upgrade period
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Classic Studio IDE */}
            <div className="bg-bg-secondary border border-border-default rounded-xl p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary shrink-0">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">Studio IDE</h4>
                    <span className="text-[10px] font-mono text-text-muted">Editor &amp; AST Parser</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                  UNIFIED
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Legacy AST controls, token highlight buffers, and Monaco editor workflows are permanently unified inside Creation Workspace with Developer Controls.
              </p>
              <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
                <span className="text-text-muted">Replacement:</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('workspace')}
                  className="font-medium text-brand-primary hover:underline flex items-center gap-1 cursor-pointer min-h-[44px]"
                >
                  <span>Creation Workspace</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 2. Model Arena */}
            <div className="bg-bg-secondary border border-border-default rounded-xl p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary shrink-0">
                    <Swords className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">Model Arena</h4>
                    <span className="text-[10px] font-mono text-text-muted">Head-to-Head Benchmarks</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                  UNIFIED
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Autonomous model routing matrix automatically selects frontier reasoning and coding architectures across DeepSeek, Claude, and Gemini.
              </p>
              <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
                <span className="text-text-muted">Replacement:</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('workspace')}
                  className="font-medium text-brand-primary hover:underline flex items-center gap-1 cursor-pointer min-h-[44px]"
                >
                  <span>Multi-Model Workspace</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 3. Prompt Analyzer */}
            <div className="bg-bg-secondary border border-border-default rounded-xl p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary shrink-0">
                    <ScanLine className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">Prompt Analyzer</h4>
                    <span className="text-[10px] font-mono text-text-muted">Deliverable Intent Engine</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Real-time deliverable intent classification evaluates user prompts, extracts multimodal parameters, and detects concrete outcomes on turn 1.
              </p>
              <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
                <span className="text-text-muted">Replacement:</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('workspace')}
                  className="font-medium text-brand-primary hover:underline flex items-center gap-1 cursor-pointer min-h-[44px]"
                >
                  <span>Workspace AI Diagnostics</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 4. BYOK Key Vault */}
            <div className="bg-bg-secondary border border-border-default rounded-xl p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <ByokLogo size={36} showTile={true} />
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">API Vault</h4>
                    <span className="text-[10px] font-mono text-text-muted">AES-GCM BYOK Local Storage</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Connect your private API keys for OpenAI, Anthropic, Gemini, DeepSeek, Groq, and OpenRouter with 100% client encryption and 0 platform credits.
              </p>
              <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs">
                <span className="text-text-muted">Status: {connectedProviders.length} Active</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('credentials')}
                  className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer min-h-[44px]"
                >
                  <span>Open Vault</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Helpful FAQ Strip */}
        <section className="bg-bg-secondary border border-border-default rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
            <ShieldCheck className="w-4 h-4 text-brand-primary" />
            <span>Developer FAQ</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-text-secondary">
            <div className="space-y-1">
              <div className="font-semibold text-text-primary">How does Autonomous Routing work?</div>
              <p className="leading-relaxed text-text-muted">
                PromptHub evaluates task requirements (vision, code, reasoning, ads) and selects the best model enforcing BYOK (0 cr) &rarr; Free Cluster (0 cr) &rarr; AICredits Gateway.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-text-primary">Can I lock an explicit model?</div>
              <p className="leading-relaxed text-text-muted">
                Yes. Open the Developer Controls Drawer to lock any specific model from our catalog, customize sampling temperature, or set max tokens.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Embedded Developer Controls Drawer */}
      <DeveloperModeDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        settings={devSettings}
        onSettingsChange={(newSettings) => setDevSettings(newSettings)}
        onOpenByokVault={() => setActiveTab('credentials')}
      />
    </div>
  );
};

export default DeveloperModeView;
