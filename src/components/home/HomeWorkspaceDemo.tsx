import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  Code2, 
  SlidersHorizontal, 
  HardDrive,
  Zap,
  ExternalLink,
  Terminal
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export interface HomeWorkspaceDemoProps {
  className?: string;
  isHoveringCTA?: boolean;
}

type WorkspaceStep = 'simple' | 'better' | 'output' | 'decision';

interface StarterPrompt {
  id: string;
  label: string;
  tag: string;
  rawPrompt: string;
  betterPrompt: {
    systemRole: string;
    objective: string;
    constraints: string[];
    skillsApplied: string[];
    formattedSnippet: string;
  };
  outputPreview: {
    title: string;
    metrics: { label: string; value: string }[];
    code: string;
  };
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: 'stripe',
    label: 'Stripe Webhook API',
    tag: 'Backend & Security',
    rawPrompt: 'Write a bulletproof Stripe webhook endpoint in TypeScript with HMAC-SHA256 signature verification and idempotency.',
    betterPrompt: {
      systemRole: 'Senior FinTech Infrastructure Engineer specializing in PCI-DSS Level 1 compliant payment gateways.',
      objective: 'Implement an idempotent, replay-attack resistant webhook handler with constant-time cryptographic signature verification.',
      constraints: [
        'Enforce crypto.timingSafeEqual on webhook signatures to defeat timing analysis',
        'Store event idempotency keys with 24h TTL in Redis/Postgres before mutating state',
        'Return 200 OK immediately after event queueing to stay well within the 3-second Stripe timeout',
        'Validate event payload schema with Zod parser before database dispatch',
      ],
      skillsApplied: ['/security-guardrails', '/harden', '/idempotency-engine'],
      formattedSnippet: `// ─── PROMPTHUB ENHANCED FINTECH PROMPT ─────────────────────────────
// Role: Principal Payment Systems Architect
// Context: Next.js App Router / Edge runtime with strict security
export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const payload = await req.text();
  // Validates HMAC-SHA256 with constant-time equality
  const event = stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);
  // Atomic idempotency lock ensures zero duplicate charges
  const isProcessed = await claimIdempotencyKey(event.id);
  if (isProcessed) return Response.json({ received: true });
}`,
    },
    outputPreview: {
      title: 'Production Stripe Webhook Receiver',
      metrics: [
        { label: 'Security Grade', value: 'A+ (HMAC-SHA256)' },
        { label: 'Latency', value: '14ms' },
        { label: 'Idempotency', value: 'Guaranteed' },
      ],
      code: `import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return new Response('Missing Stripe signature header', { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Atomic idempotency verification
    const { rows } = await db.query(
      'INSERT INTO processed_events (event_id, processed_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING RETURNING event_id',
      [event.id]
    );

    if (rows.length === 0) {
      return new Response(JSON.stringify({ received: true, deduplicated: true }), { status: 200 });
    }

    // Process payment success safely
    if (event.type === 'checkout.session.completed') {
      await fulfillCustomerOrder(event.data.object);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    return new Response(\`Webhook error: \${err.message}\`, { status: 400 });
  }
}`,
    },
  },
  {
    id: 'dashboard',
    label: 'AI Observability Dashboard',
    tag: 'Full-Stack UI',
    rawPrompt: 'Build a production AI SaaS analytics dashboard with real-time model token consumption metrics, user tables, and API keys.',
    betterPrompt: {
      systemRole: 'Lead Frontend Systems Architect specializing in low-latency analytics dashboards and design systems.',
      objective: 'Construct a Bento Grid telemetry dashboard with real-time token throughput metrics, TTFT percentiles, and API credential management.',
      constraints: [
        'Dark obsidian canvas (#0B1118) with primary blue (#6A89A7) radiant accents',
        'Tabular streaming counters with monospace tabular-nums formatting',
        'Hardware-accelerated CSS transitions with smooth quartic cubic-bezier easing',
        'Full WCAG AA contrast compliance and min-44px touch targets',
      ],
      skillsApplied: ['/typeset', '/layout', '/performance-telemetry'],
      formattedSnippet: `// ─── PROMPTHUB ENHANCED UI PROMPT ──────────────────────────────────
// Architecture: React 19 + Tailwind CSS Bento Telemetry
// Tokens: Oceanic Obsidian & Slate (#0B1118, #6A89A7, #88BDF2)
export const ObservabilityDashboard: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
      <MetricCard title="Token Throughput" value="1,420 tok/s" delta="+18.4%" />
      <MetricCard title="Avg TTFT Latency" value="28.4 ms" status="optimal" />
      <MetricCard title="Live Model Swarm" value="12 Nodes Active" />
    </div>
  );
};`,
    },
    outputPreview: {
      title: 'PromptHub Real-Time Telemetry Surface',
      metrics: [
        { label: 'Throughput', value: '1,420 tok/s' },
        { label: 'Avg TTFT', value: '28.4ms' },
        { label: 'SLA Uptime', value: '99.99%' },
      ],
      code: `import React from 'react';
import { Activity, ShieldCheck, Zap } from 'lucide-react';

export const TelemetryConsole = () => (
  <div className="p-4 rounded-xl bg-slate-950 text-slate-100 border border-slate-800 font-sans space-y-3">
    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-mono text-xs font-bold text-sky-400">AI TELEMETRY CLUSTER</span>
      </div>
      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        99.99% HEALTHY
      </span>
    </div>
    <div className="grid grid-cols-3 gap-2 font-mono text-xs">
      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
        <div className="text-slate-400 text-[10px]">THROUGHPUT</div>
        <div className="text-sm font-bold text-white mt-0.5">1,420 tok/s</div>
      </div>
      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
        <div className="text-slate-400 text-[10px]">AVG TTFT</div>
        <div className="text-sm font-bold text-sky-400 mt-0.5">28.4ms</div>
      </div>
      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
        <div className="text-slate-400 text-[10px]">ACTIVE NODES</div>
        <div className="text-sm font-bold text-emerald-400 mt-0.5">12 Active</div>
      </div>
    </div>
  </div>
);`,
    },
  },
  {
    id: 'rag',
    label: 'Python RAG Retriever',
    tag: 'AI Engineering',
    rawPrompt: 'Construct an asynchronous Python RAG retrieval pipeline with semantic reranking and token budget chunking.',
    betterPrompt: {
      systemRole: 'Principal Machine Learning Engineer specializing in production RAG systems and semantic search vector databases.',
      objective: 'Build an async RAG pipeline with hybrid BM25 + dense vector embeddings, cross-encoder reranking, and dynamic token budget enforcement.',
      constraints: [
        'Asyncio concurrent retrieval across Pinecone / pgvector and BM25 lex search',
        'Cross-encoder reranking stage (bge-reranker-large) with score cutoff threshold',
        'Token budgeting: truncate chunk context window to exact model context limits',
        'Return citations with character offsets, document source UUIDs, and confidence scores',
      ],
      skillsApplied: ['/rag-optimizer', '/token-budgeting', '/harden'],
      formattedSnippet: `// ─── PROMPTHUB ENHANCED RAG PROMPT ─────────────────────────────────
// Engine: Async Python 3.12 + FastAPI + CrossEncoder Reranker
async def hybrid_retrieve(query: str, top_k: int = 5) -> List[Chunk]:
    dense_task = vector_store.similarity_search(query, k=20)
    sparse_task = bm25_index.search(query, k=20)
    dense_results, sparse_results = await asyncio.gather(dense_task, sparse_task)
    merged = reciprocal_rank_fusion(dense_results, sparse_results)
    reranked = await cross_encoder.rerank(query, merged, top_k=top_k)
    return enforce_token_budget(reranked, max_tokens=3500)`,
    },
    outputPreview: {
      title: 'Async Hybrid RAG Pipeline',
      metrics: [
        { label: 'Rerank Precision', value: '94.2%' },
        { label: 'Retrieval Time', value: '38ms' },
        { label: 'Context Budget', value: '4,096 tok' },
      ],
      code: `import asyncio
from typing import List
from dataclasses import dataclass

@dataclass
class RetrievedContext:
    doc_id: str
    content: str
    score: float
    source: str

async def retrieve_knowledge(query: str, max_tokens: int = 4000) -> List[RetrievedContext]:
    # Concurrent vector + lexical retrieval
    vector_future = vector_db.search_async(query, limit=15)
    lexical_future = bm25_db.search_async(query, limit=15)
    vectors, lexicals = await asyncio.gather(vector_future, lexical_future)

    # Reciprocal Rank Fusion & Cross-Encoder Reranking
    candidates = merge_and_rerank(vectors, lexicals)
    
    # Enforce strict token budget packing
    selected: List[RetrievedContext] = []
    budget_used = 0
    for chunk in candidates:
        if budget_used + chunk.token_count > max_tokens:
            break
        selected.append(chunk)
        budget_used += chunk.token_count

    return selected`,
    },
  },
];

const AVAILABLE_MODELS = [
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic', badge: 'Reasoning Leader' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', badge: 'High Speed' },
  { id: 'gemini-2-5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', badge: '1M Context' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', badge: 'Open Weights' },
];

export const HomeWorkspaceDemo: React.FC<HomeWorkspaceDemoProps> = ({
  className = '',
  isHoveringCTA = false,
}) => {
  const { setActiveTab } = useApp();

  // Active step in PromptHub's real 4-step pipeline:
  // 1. Simple Prompt -> 2. Better Prompt -> 3. Best Output -> 4. Decision & Drive
  const [currentStep, setCurrentStep] = useState<WorkspaceStep>('simple');
  const [selectedPrompt, setSelectedPrompt] = useState<StarterPrompt>(STARTER_PROMPTS[0]);
  const [userCustomInput, setUserCustomInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);
  const [outputViewMode, setOutputViewMode] = useState<'preview' | 'code'>('preview');
  
  // Active prompt query to use
  const activePromptText = userCustomInput.trim() || selectedPrompt.rawPrompt;

  return (
    <div
      className={`w-full rounded-xl bg-white dark:bg-[#0B1118] border ${isHoveringCTA ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-border-default'} shadow-md overflow-hidden flex flex-col transition-all duration-200 select-none ${className}`}
    >
      {/* ── Demo Header: Clean Developer Workbench Bar ── */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-[#000000] border-b border-border-default flex items-center justify-between gap-3">
        {/* Left: Pipeline Identifier */}
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-text-primary">
          <Terminal className="w-3.5 h-3.5 text-brand-primary shrink-0" />
          <span>PromptHub Creation Pipeline</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary border border-border-default">
            STUDIO WORKBENCH
          </span>
        </div>

        {/* Right: Real-time Status Badge */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-bg-secondary border border-border-default">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-text-secondary">Ready</span>
          </span>
        </div>
      </div>

      {/* ── 4-Step Lifecycle Navigation Bar (New Plan Specification) ── */}
      <div className="bg-slate-50 dark:bg-[#000000] px-3 sm:px-4 py-2 border-b border-border-default overflow-hidden select-none">
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5 w-full bg-bg-secondary p-1 rounded-lg border border-border-default" data-tour="tour-model-tabs">
          {[
            { id: 'simple', stepNum: '1', shortLabel: '1. Simple Prompt', fullLabel: '1. Simple Prompt', icon: Sparkles },
            { id: 'better', stepNum: '2', shortLabel: '2. Better Prompt', fullLabel: '2. Better Prompt', icon: SlidersHorizontal },
            { id: 'output', stepNum: '3', shortLabel: '3. Best Output', fullLabel: '3. Best Output', icon: Code2 },
            { id: 'decision', stepNum: '4', shortLabel: '4. Decision & Drive', fullLabel: '4. Decision & Drive', icon: HardDrive },
          ].map((step) => {
            const Icon = step.icon;
            const isCurrent = currentStep === step.id;
            const stepOrder = ['simple', 'better', 'output', 'decision'];
            const isCompleted = stepOrder.indexOf(currentStep) > stepOrder.indexOf(step.id);

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id as WorkspaceStep)}
                className={`min-h-[38px] py-1.5 px-1.5 sm:px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-all duration-200 cursor-pointer truncate ${
                  isCurrent
                    ? 'bg-brand-primary text-white shadow-xs font-semibold'
                    : isCompleted
                      ? 'bg-bg-tertiary text-text-primary hover:bg-border-default/60 border border-border-default'
                      : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="hidden md:inline truncate">{step.fullLabel}</span>
                <span className="inline md:hidden truncate">{step.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step Content Panes ── */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between min-h-[380px]">
        
        {/* ── STEP 1: SIMPLE PROMPT (Plain English Idea) ── */}
        {currentStep === 'simple' && (
          <div className="flex-1 flex flex-col justify-between gap-4 animate-in fade-in duration-150">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Step 1: Your Raw Natural Language Prompt
                </span>
                <span className="text-[11px] text-brand-primary font-medium">
                  Type your prompt or choose a starter
                </span>
              </div>

              {/* Starter Brief Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                {STARTER_PROMPTS.map((starter) => {
                  const isSelected = selectedPrompt.id === starter.id && !userCustomInput;
                  return (
                    <button
                      key={starter.id}
                      type="button"
                      onClick={() => {
                        setSelectedPrompt(starter);
                        setUserCustomInput('');
                      }}
                      className={`min-h-[44px] p-3 rounded-lg border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-brand-primary bg-brand-primary-light/40 dark:bg-brand-primary/20 text-text-primary ring-1 ring-brand-primary shadow-xs'
                          : 'border-border-default bg-bg-secondary text-text-secondary hover:border-border-hover hover:text-text-primary'
                      }`}
                    >
                      <div className="font-semibold text-xs leading-snug flex items-center justify-between">
                        <span>{starter.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-primary" />}
                      </div>
                      <div className="text-[10px] font-mono text-text-muted mt-1">
                        {starter.tag}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Input Area */}
              <div className="relative rounded-lg border border-border-default bg-bg-secondary p-3 focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary transition-all">
                <label className="text-[10px] font-mono font-bold uppercase text-text-muted block mb-1">
                  Plain English Input
                </label>
                <textarea
                  value={userCustomInput || selectedPrompt.rawPrompt}
                  onChange={(e) => setUserCustomInput(e.target.value)}
                  placeholder="Describe what you want to engineer or build..."
                  rows={3}
                  className="w-full bg-transparent text-xs text-text-primary resize-none focus:outline-none leading-relaxed font-mono"
                />
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-3 border-t border-border-default flex items-center justify-between">
              <span className="text-[11px] text-text-muted">
                1-click transforms plain English into production prompt architecture.
              </span>
              <button
                type="button"
                onClick={() => setCurrentStep('better')}
                className="min-h-[44px] px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <span>Engineer Better Prompt</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: BETTER PROMPT (Engineered Architecture) ── */}
        {currentStep === 'better' && (
          <div className="flex-1 flex flex-col justify-between gap-4 animate-in fade-in duration-150">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Step 2: Better Prompt Transformation
                </span>
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  {selectedPrompt.betterPrompt.skillsApplied.map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-bg-secondary text-brand-primary border border-border-default whitespace-nowrap shadow-3xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Transformation Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {/* Left: Original Simple Prompt */}
                <div className="p-3.5 rounded-lg bg-bg-secondary border border-border-default space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-rose-500 flex items-center gap-1">
                      <span>✕ Raw Simple Prompt</span>
                    </span>
                    <span className="text-[10px] text-text-muted">Unstructured</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed bg-bg-tertiary p-2.5 rounded-lg border border-border-subtle font-mono">
                    "{activePromptText}"
                  </p>
                  <p className="text-[10px] text-text-muted leading-tight">
                    Lacks system context, boundary checks, zero-shot guardrails, and deterministic schema outputs.
                  </p>
                </div>

                {/* Right: Engineered Better Prompt */}
                <div className="p-3.5 rounded-xl bg-brand-primary/5 border border-brand-primary/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-brand-primary flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>✓ PromptHub Better Prompt</span>
                    </span>
                    <span className="text-[10px] text-brand-primary font-mono font-bold">Engineered</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-bg-secondary border border-brand-primary/20 text-xs font-mono text-text-primary space-y-1.5 max-h-[140px] overflow-y-auto">
                    <div className="text-text-muted text-[10px]">
                      <strong className="text-brand-primary">ROLE:</strong> {selectedPrompt.betterPrompt.systemRole}
                    </div>
                    <div className="text-text-muted text-[10px]">
                      <strong className="text-brand-primary">OBJECTIVE:</strong> {selectedPrompt.betterPrompt.objective}
                    </div>
                    <div className="text-[10px] text-text-secondary">
                      <strong className="text-brand-primary">CONSTRAINTS:</strong>
                      <ul className="list-disc pl-3 mt-0.5 space-y-0.5">
                        {selectedPrompt.betterPrompt.constraints.slice(0, 2).map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-3 border-t border-border-default flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep('simple')}
                className="text-xs text-text-muted hover:text-text-primary cursor-pointer font-medium"
              >
                ← Back to Simple Prompt
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep('output')}
                className="min-h-[44px] px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <span>Run in Multi-Model Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: BEST OUTPUT (Live Execution & Code) ── */}
        {currentStep === 'output' && (
          <div className="flex-1 flex flex-col justify-between gap-4 animate-in fade-in duration-150">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Step 3: Best Output across AI Frontier Models
                </span>
                
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-border-default self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setOutputViewMode('preview')}
                    className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer transition-colors ${
                      outputViewMode === 'preview'
                        ? 'bg-brand-primary text-white font-semibold'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Interactive Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutputViewMode('code')}
                    className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer transition-colors ${
                      outputViewMode === 'code'
                        ? 'bg-brand-primary text-white font-semibold'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Source Code
                  </button>
                </div>
              </div>

              {/* Frontier Model Switcher */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
                {AVAILABLE_MODELS.map((model) => {
                  const isSelected = selectedModel.id === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setSelectedModel(model)}
                      className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-brand-primary text-white font-bold shadow-xs'
                          : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-border-default'
                      }`}
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>{model.name}</span>
                      <span className="text-[9px] opacity-75 hidden sm:inline">({model.badge})</span>
                    </button>
                  );
                })}
              </div>

              {/* Output Sandbox Display */}
              <div className="rounded-xl border border-border-default bg-bg-secondary overflow-hidden shadow-xs">
                {/* Sandbox Header */}
                <div className="px-3 py-2 bg-bg-tertiary border-b border-border-default flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-text-primary">{selectedPrompt.outputPreview.title}</span>
                    <span className="text-[10px] font-mono text-text-muted hidden sm:inline">via {selectedModel.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPrompt.outputPreview.metrics.map((m, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-secondary border border-border-default text-text-secondary">
                        {m.label}: <strong className="text-text-primary">{m.value}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Content Box */}
                <div className="p-3 max-h-[170px] overflow-y-auto font-mono text-xs text-text-primary">
                  {outputViewMode === 'preview' ? (
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-bg-tertiary border border-border-default flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-text-primary">Execution Sandbox Live</div>
                          <div className="text-[11px] text-text-secondary">Validated against strict TypeScript &amp; test assertions.</div>
                        </div>
                        <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                          ALL TESTS PASS
                        </span>
                      </div>
                      <div className="text-[11px] text-text-muted leading-relaxed font-sans">
                        Generated output features robust error boundaries, structured typed signatures, and 0% markup execution.
                      </div>
                    </div>
                  ) : (
                    <pre className="text-[11px] font-mono text-text-secondary whitespace-pre overflow-x-auto">
                      <code>{selectedPrompt.outputPreview.code}</code>
                    </pre>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-3 border-t border-border-default flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep('better')}
                className="text-xs text-text-muted hover:text-text-primary cursor-pointer font-medium"
              >
                ← Back to Better Prompt
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep('decision')}
                className="min-h-[44px] px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <span>Proceed to Decision &amp; Drive</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: DECISION & DRIVE (Approve, Improve, Sync to Drive) ── */}
        {currentStep === 'decision' && (
          <div className="flex-1 flex flex-col justify-between gap-4 animate-in fade-in duration-150">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Step 4: Decision Nodes &amp; Cloud Drive Vault
                </span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Output Ready for Deployment</span>
                </span>
              </div>

              {/* Three Decision Pathways: Informational Architectural Overview (Clean & Within Divisions) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 items-stretch">
                {/* Node 1: Approve Output */}
                <div className="p-3.5 rounded-xl border border-border-default bg-bg-secondary text-left flex flex-col justify-between h-full shadow-2xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-1.5 truncate">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">Approve Output</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 whitespace-nowrap">
                        READY
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug line-clamp-3">
                      Production bundle verified with constant-time cryptographic checks and zero hallucination risk.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-text-muted">
                    <span>Audit Score</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Passed</span>
                  </div>
                </div>

                {/* Node 2: Adaptive Refinement */}
                <div className="p-3.5 rounded-xl border border-border-default bg-bg-secondary text-left flex flex-col justify-between h-full shadow-2xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-1.5 truncate">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                        <span className="truncate">Prompt Tuning</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shrink-0 whitespace-nowrap">
                        ADAPTIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug line-clamp-3">
                      Recalibrate system variables, few-shot guardrails, and deterministic schema outputs in real time.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-text-muted">
                    <span>Variables</span>
                    <span className="text-brand-primary font-bold">Auto-Parsed</span>
                  </div>
                </div>

                {/* Node 3: Cloud Drive Vault */}
                <div className="p-3.5 rounded-xl border border-border-default bg-bg-secondary text-left flex flex-col justify-between h-full shadow-2xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-1.5 truncate">
                        <HardDrive className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span className="truncate">Sync to Drive Vault</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0 whitespace-nowrap">
                        SYNCED
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug line-clamp-3">
                      Backup code files, test suites, and prompt versions directly into encrypted Cloud Drive storage.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-text-muted">
                    <span>Storage</span>
                    <span className="text-sky-600 dark:text-sky-400 font-bold">Encrypted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-3 border-t border-border-default flex flex-col sm:flex-row items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep('output')}
                className="text-xs text-text-muted hover:text-text-primary cursor-pointer font-medium self-start sm:self-auto"
              >
                ← Back to Model Output
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('workspace')}
                className="min-h-[44px] w-full sm:w-auto px-6 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-brand-primary/20 transition-all cursor-pointer"
              >
                <span>Launch Full Studio Workspace</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
