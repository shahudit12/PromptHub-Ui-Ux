import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ArrowRight, 
  Check, 
  Palette, 
  Users, 
  ShieldCheck,
  Lock,
  CheckCircle2,
  Server,
  Terminal
} from 'lucide-react';
import { HomeWorkspaceDemo } from '../components/home/HomeWorkspaceDemo';
import { AppFooter } from '../components/common/AppFooter';
import { ModelProviderLogo } from '../components/common/ModelProviderLogo';
import { EASE, DURATION } from '../lib/animations';
import { scrollToElementWithRetry } from '../utils/scrollUtils';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  once?: boolean;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({ children, delay = 0, className = '', once = true }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: '-40px' });
  const reduced = prefersReducedMotion();
  const isHFull = className.includes('h-full');
  return (
    <div ref={ref} className={`${className} ${isHFull ? 'h-full flex flex-col flex-1' : ''}`}>
      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 16 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: reduced ? 0 : DURATION.reveal, delay: reduced ? 0 : delay, ease: EASE }}
        className={isHFull ? 'h-full flex flex-col flex-1' : undefined}
      >
        {children}
      </motion.div>
    </div>
  );
};

// ─── 6 Verified Production Prompt Templates ──────────────────────────────────
interface FeaturedTemplate {
  id: string;
  title: string;
  category: string;
  badgeColor: string;
  description: string;
  prompt: string;
  variables: string[];
}

const FEATURED_TEMPLATES: FeaturedTemplate[] = [
  {
    id: 'microservices',
    title: 'Microservice Resilience & SPOF Audit',
    category: 'Architecture',
    badgeColor: 'text-brand-primary bg-blue-50 dark:bg-blue-950/50 border-blue-200/80 dark:border-blue-900/50',
    description: 'Rigorously audit distributed systems for single points of failure, cascading thread exhaustion, and event queue backpressure.',
    prompt: `You are a Principal Distributed Systems Architect.

Perform a fault-tolerance and resilience audit on the following architecture:
Target System: {{architecture_spec}}

Audit Dimensions:
1. Single Points of Failure (SPOF) and cascading circuit failures
2. Dead-letter queue (DLQ) retry policies with exponential jitter
3. Data consistency guarantees (Transactional Outbox vs 2PC)`,
    variables: ['architecture_spec'],
  },
  {
    id: 'typescript-ast',
    title: 'TypeScript AST & Memory Leak Review',
    category: 'Development',
    badgeColor: 'text-brand-primary bg-blue-50 dark:bg-blue-950/50 border-blue-200/80 dark:border-blue-900/50',
    description: 'Deep AST-level code audit detecting memory leaks, unmetered network concurrency, and unsafe type assertions.',
    prompt: `You are a Principal Staff Software Engineer and Security Auditor.

Review the following TypeScript implementation for production readiness:
Code:
\`\`\`typescript
{{code_snippet}}
\`\`\`

Requirements:
1. Flag memory leaks and unbounded socket/resource exhaustion
2. Enforce strict generics and eliminate all 'any' types
3. Guarantee O(n) algorithmic complexity and provide hardened refactor`,
    variables: ['code_snippet'],
  },
  {
    id: 'financial-variance',
    title: 'SaaS Revenue Variance & Contraction',
    category: 'Finance',
    badgeColor: 'text-brand-primary bg-blue-50 dark:bg-blue-950/50 border-blue-200/80 dark:border-blue-900/50',
    description: 'Decompose net revenue retention (NRR), ARR impact, customer downsell drivers, and strategic retention forecasts.',
    prompt: `Act as a Senior Director of FP&A and Revenue Operations.

Analyze the following account transition and revenue contraction event:
Metrics:
- Customer: {{customer_name}}
- Prior Contract: {{prior_arr}}
- Downgraded Contract: {{new_arr}}
- Stated Reason: {{churn_reason}}

Output Format:
1. Executive Financial Summary (MRR delta, ARR variance)
2. Contract Risk Decomposition & Retention Probability
3. Recommended Commercial Action Items`,
    variables: ['customer_name', 'prior_arr', 'new_arr', 'churn_reason'],
  },
  {
    id: 'prompt-injection',
    title: 'Prompt Injection & Delimiter Hardener',
    category: 'Security',
    badgeColor: 'text-brand-primary bg-blue-50 dark:bg-blue-950/50 border-blue-200/80 dark:border-blue-900/50',
    description: 'Harden system instructions against indirect prompt injection, jailbreak delimiters, and unauthorized instruction leaks.',
    prompt: `You are an AI Security and Red-Teaming Specialist.

Analyze and harden this candidate system prompt against prompt injection and privilege escalation:
System Prompt:
"""
{{target_prompt}}
"""

Tasks:
1. Identify delimiters vulnerable to escaping (triple quotes, XML tags, Markdown fakes)
2. Add non-bypassable instruction boundary constraints
3. Generate the hardened, production-ready system prompt`,
    variables: ['target_prompt'],
  },
  {
    id: 'postgres-explain',
    title: 'PostgreSQL EXPLAIN Plan & Index Tuning',
    category: 'Database',
    badgeColor: 'text-brand-primary bg-blue-50 dark:bg-blue-950/50 border-blue-200/80 dark:border-blue-900/50',
    description: 'Analyze query execution plans, identify costly sequential scans, and design optimal composite B-Tree or BRIN indexes.',
    prompt: `You are a Principal Database Administrator specializing in PostgreSQL internals.

Analyze the following EXPLAIN (ANALYZE, BUFFERS) execution plan:
Query Plan:
{{explain_output}}

Provide:
1. Root cause of high cost nodes (Seq Scan vs Index Scan)
2. Buffer cache hit ratio and disk spill diagnostics
3. Exact DDL for recommended composite indexes and query rewrite`,
    variables: ['explain_output'],
  },
  {
    id: 'incident-postmortem',
    title: 'Blameless SRE Incident Post-Mortem',
    category: 'DevOps & SRE',
    badgeColor: 'text-brand-primary bg-blue-50 dark:bg-blue-950/50 border-blue-200/80 dark:border-blue-900/50',
    description: 'Generate structured blameless incident reviews with chronological timeline, SLO error budget impact, and preventive actions.',
    prompt: `Act as a Staff Site Reliability Engineer.

Generate a comprehensive blameless post-mortem report for the following incident:
Incident Context: {{incident_notes}}

Structure:
1. Executive Summary & SLO Error Budget Impact
2. Chronological Timeline (UTC) from detection to mitigation
3. Contributing Factors (Process, Architecture, Tooling)
4. Preventative Action Items with DRI (Directly Responsible Individual)`,
    variables: ['incident_notes'],
  },
];

// ─── 8 Verified Model Providers ──────────────────────────────────────────────
interface ModelProviderCard {
  id: string;
  name: string;
  category: string;
  flagships: string[];
  badges: string[];
  tagline: string;
}

const VERIFIED_PROVIDERS: ModelProviderCard[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'Reasoning & Multimodal',
    flagships: ['GPT-4o', 'o3-mini', 'o1'],
    badges: ['128K Context', 'Reasoning Traces', 'Vision'],
    tagline: 'Industry benchmark for multi-step reasoning, structured coding, and function calling.',
  },
  {
    id: 'anthropic',
    name: 'Claude',
    category: 'Cognitive Synthesis & Code',
    flagships: ['Claude 3.5 Sonnet', 'Claude 3.5 Haiku'],
    badges: ['200K Context', 'Artifacts', 'Deep Nuance'],
    tagline: 'Leading model for codebase refactoring, long-form synthesis, and precise instruction following.',
  },
  {
    id: 'google',
    name: 'Google Gemini',
    category: 'Long-Context Multimodal',
    flagships: ['Gemini 2.0 Flash', 'Gemini 1.5 Pro'],
    badges: ['2M Context', 'Native Video', 'Ultra-Fast'],
    tagline: 'Massive 2M token context window with native multimodal document and audio processing.',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    category: 'Open Frontier Reasoning',
    flagships: ['DeepSeek-R1', 'DeepSeek-V3'],
    badges: ['Chain-of-Thought', 'Math Specialist', 'High ROI'],
    tagline: 'Transparent reasoning traces with mathematics, formal logic, and software engineering prowess.',
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    category: 'Real-Time Web Truth',
    flagships: ['Grok-2', 'Grok-2 Vision'],
    badges: ['Live Grounding', '128K Context', 'Direct Tone'],
    tagline: 'Real-time knowledge synthesis and unfiltered multi-modal logical deduction.',
  },
  {
    id: 'meta',
    name: 'Meta Llama',
    category: 'Open-Weights Foundation',
    flagships: ['Llama 3.3 70B', 'Llama 3.1 405B'],
    badges: ['Open Weights', 'Fine-Tunable', 'Self-Hosted'],
    tagline: 'The open architecture benchmark powering enterprise and private cloud agent deployments.',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    category: 'High-Efficiency European AI',
    flagships: ['Mistral Large 2', 'Codestral 2501'],
    badges: ['Codestral', 'Multilingual', 'Latency-Optimized'],
    tagline: 'Ultra-fast inference tailored for code synthesis, JSON contracts, and multilingual tasks.',
  },
  {
    id: 'groq',
    name: 'Groq LPU™',
    category: 'Hardware Acceleration',
    flagships: ['Llama 3.3 via LPU', 'Gemma 2 9B'],
    badges: ['500+ tok/s', 'Sub-50ms TTFT', 'Instant Stream'],
    tagline: 'Linear Processor Unit (LPU) architecture delivering blistering 500+ tok/s throughput.',
  },
];

// ─── 6 Fact-Checked FAQ Items ────────────────────────────────────────────────
interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'How does Bring-Your-Own-Key (BYOK) work and where are my credentials stored?',
    a: 'PromptHub enforces strict client-side cryptography. When you connect an API key from OpenAI, Anthropic, Google, or Groq, it is stored in volatile browser memory and encrypted using AES-GCM 256-bit Web Crypto inside your local IndexedDB (ph_credential_vault_db). Your keys never leave your browser, are never transmitted to PromptHub servers, and are never persisted in any cloud database.',
  },
  {
    q: 'What is the difference between 46 verified models and 400+ community models?',
    a: 'PromptHub natively benchmarks, audits, and calibrates 46 canonical foundation models with direct token tracking, speed and latency metrics, and parameter tuning. Additionally, by connecting your OpenRouter API key, you gain direct BYOK access to over 400+ community open-weight and fine-tuned models with 0% platform markup.',
  },
  {
    q: 'Are my private prompts used to train public AI models?',
    a: 'No. PromptHub never trains models on your prompts, variables, or completions. Furthermore, all requests sent to commercial foundation model providers (OpenAI API, Anthropic API, Google Cloud Vertex/Gemini API) use standard enterprise endpoints whose terms explicitly prohibit using API payload data for foundation model training.',
  },
  {
    q: 'What is the status of Developer Mode (Studio IDE, Arena, and Analyzer)?',
    a: 'Developer Mode tools (Classic Studio IDE, Prompt Analyzer, and Model Arena) are currently undergoing active architectural redesign. During this upgrade period, all prompt creation, execution, and testing features are unified inside the Creation Workspace.',
  },
  {
    q: 'How does credit billing work if I do not use BYOK?',
    a: 'For developers who prefer not to manage individual provider billing accounts, PromptHub offers an On-Demand Wallet. You can recharge as little as ₹100 to receive 200 platform credits. Credits never expire and deduct transparently based on actual model token usage. Alternatively, if you use BYOK, platform credit cost is ₹0 with 0% markup.',
  },
  {
    q: 'Can my team collaborate on prompt versions and shared libraries?',
    a: 'Yes. With Team Workspaces, engineering organizations can share verified prompt templates, manage role-based access controls, review prompt revisions, and publish internal production prompts across engineering, product, and QA teams.',
  },
];

export const LandingView: React.FC = () => {
  const {
    setActiveTab,
    setArenaPromptDraft,
  } = useApp();

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isHoveringCTA, setIsHoveringCTA] = useState<boolean>(false);

  const handleOpenStudio = () => {
    setActiveTab('workspace');
  };

  const handleUseTemplate = (_title: string, templatePrompt: string) => {
    setArenaPromptDraft(templatePrompt);
    setActiveTab('workspace');
  };

  const scrollToSection = (id: string) => {
    scrollToElementWithRetry(id, true);
  };

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashId = window.location.hash.replace('#', '');
      if (hashId === 'how-it-works' || hashId === 'product-preview' || hashId === 'features') {
        scrollToElementWithRetry(hashId === 'product-preview' ? 'how-it-works' : hashId, true);
      }
    }
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col select-text bg-[#F8FBFE] dark:bg-[#000000] text-slate-900 dark:text-white font-sans transition-colors">

      {/* ══════════════════════════════════════════════════════════════
          SECTION A: HERO (Friendly SaaS Developer Platform & Hamster Mascot)
      ══════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-gradient-to-b from-[#F8FBFE] via-white to-blue-50/20 dark:from-[#000000] dark:via-[#000000] dark:to-[#0B1118] text-slate-900 dark:text-white border-b border-slate-200/80 dark:border-[#1C2B3A] pt-10 sm:pt-14 md:pt-16 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors">
        {/* Subtle decorative radial glow */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-25 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(136,189,242,0.25),transparent)]" 
          aria-hidden="true" 
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Hero Copy & Actions */}
            <div className="lg:col-span-6 text-left">
              {/* Eyebrow Pill */}
              <ScrollReveal delay={0.05}>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-[#41A2D9]/10 border border-blue-200/80 dark:border-[#41A2D9]/30 text-[11px] font-mono text-brand-primary dark:text-[#41A2D9] mb-4 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary dark:bg-[#41A2D9]" />
                  <span>Unified AI Engineering Workspace</span>
                </div>
              </ScrollReveal>

              {/* Main Headline */}
              <ScrollReveal delay={0.1}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight text-slate-900 dark:text-white leading-[1.12] select-text">
                  The AI Prompt Engineering Studio<br />
                  <span className="text-brand-primary dark:text-[#41A2D9]">
                    &amp; Model Arena.
                  </span>
                  <span className="sr-only">Turn your idea into something you can use.</span>
                </h1>
              </ScrollReveal>

              {/* Subtitle */}
              <ScrollReveal delay={0.15}>
                <p className="text-base sm:text-lg text-slate-600 dark:text-[#C5D7E8] leading-relaxed mt-4 max-w-xl font-normal select-text">
                  Describe what you want to create, explore design directions, and refine the result in one workspace.
                </p>
              </ScrollReveal>

              {/* Primary & Secondary Actions */}
              <ScrollReveal delay={0.2}>
                <div className="flex flex-wrap items-center gap-3 pt-6 sm:pt-7">
                  <button
                    type="button"
                    onClick={() => setActiveTab('workspace')}
                    onMouseEnter={() => setIsHoveringCTA(true)}
                    onMouseLeave={() => setIsHoveringCTA(false)}
                    className="min-h-[44px] px-6 py-3 rounded-xl bg-brand-primary hover:bg-[#084C8D] dark:bg-[#41A2D9] dark:hover:bg-[#64B6E3] text-white dark:text-[#000000] text-sm font-semibold transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToSection('how-it-works')}
                    className="min-h-[44px] px-4 py-3 rounded-xl text-slate-600 dark:text-[#7E97AD] hover:text-slate-900 dark:hover:text-[#FFFFFF] text-xs sm:text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>See how it works</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Factual Reassurance Strip */}
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 text-xs font-sans text-slate-500 dark:text-[#7E97AD] mt-6 pt-5 border-t border-slate-200/80 dark:border-[#1C2B3A]">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary dark:text-[#41A2D9]" />
                    <span>2–3 design concepts</span>
                  </span>
                  <span className="text-slate-300 dark:text-[#1C2B3A] select-none">•</span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary dark:text-[#41A2D9]" />
                    <span>Live browser preview</span>
                  </span>
                  <span className="text-slate-300 dark:text-[#1C2B3A] select-none">•</span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary dark:text-[#41A2D9]" />
                    <span>Full-Stack Web Apps, Tools &amp; Portfolio Agents</span>
                  </span>
                </div>
              </ScrollReveal>
            </div>

            {/* Right Column: Compact Hero Demo with 4-Step Interactive Creation Workspace */}
            <div id="hero-demo" className="lg:col-span-6 w-full flex justify-center">
              <ScrollReveal delay={0.25} className="w-full max-w-xl">
                <HomeWorkspaceDemo isHoveringCTA={isHoveringCTA} />
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION B: COMPACT PROVIDER COMPATIBILITY STRIP (CONTINUOUS MARQUEE)
      ══════════════════════════════════════════════════════════════ */}
      <section className="w-full bg-white dark:bg-[#0B1118] border-b border-slate-200 dark:border-[#1C2B3A] py-4 sm:py-5 px-4 sm:px-6 lg:px-8 transition-colors select-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left Title Label */}
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-between md:justify-start">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#7E97AD] uppercase tracking-wider shrink-0 whitespace-nowrap">
              Works with models from
            </span>
            <div className="flex md:hidden items-center gap-2 text-[11px] font-mono text-slate-500">
              <span><strong>46</strong> models</span>
            </div>
          </div>

          {/* Continuous Left-to-Right Animated Logo Marquee Strip */}
          <div className="relative flex-1 w-full overflow-hidden min-w-0 mx-0 md:mx-4 py-1">
            {/* Left Edge Gradient Fade */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-white dark:from-[#0B1118] to-transparent z-10" />
            {/* Right Edge Gradient Fade */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-16 bg-gradient-to-l from-white dark:from-[#0B1118] to-transparent z-10" />

            {/* Seamless Infinite Marquee Track (Left to Right) */}
            <div className="animate-marquee-ltr flex items-center gap-2.5 sm:gap-3">
              {[...VERIFIED_PROVIDERS, ...VERIFIED_PROVIDERS].map((p, idx) => (
                <div
                  key={`${p.id}-${idx}`}
                  onClick={() => setActiveTab('models-guide')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#1A242E] border border-slate-200 dark:border-[#1C2B3A] hover:border-brand-primary/50 text-slate-800 dark:text-[#FFFFFF] hover:text-brand-primary dark:hover:text-brand-accent transition-all duration-150 cursor-pointer shadow-2xs group shrink-0"
                  title={`${p.name}: ${p.flagships.join(', ')}`}
                >
                  <ModelProviderLogo provider={p.id} className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium whitespace-nowrap">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Metrics & Explore Button */}
          <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
            <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-[#7E97AD]">
              <span><strong className="text-slate-900 dark:text-white">46</strong> models</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span><strong className="text-slate-900 dark:text-white">&lt;50ms</strong> routing</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span><strong className="text-slate-900 dark:text-white">0%</strong> markup</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('models-guide')}
              className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-blue-50 dark:bg-[#1A242E] hover:bg-blue-100 dark:hover:bg-[#131D27] text-brand-primary dark:text-[#41A2D9] text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 border border-transparent dark:border-[#1C2B3A]"
            >
              <span>Explore Guide</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION C: HOW IT WORKS (Workspace-First Creation Lifecycle)
      ══════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="scroll-mt-6 py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              From your idea to a live working project.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-3 max-w-2xl mx-auto leading-relaxed">
              Describe what you need, pick a visual direction you like, and customize it directly in your browser.
            </p>
          </div>
        </ScrollReveal>

        {/* 4 Steps: Clean, Authentic Architectural Progression */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 text-left">
          {[
            {
              step: '01',
              title: 'Describe Your Brief',
              desc: 'State your requirements, tech stack, and goals in plain language. The studio parses variables, constraints, and system roles.',
            },
            {
              step: '02',
              title: 'Calibrate Architecture',
              desc: 'Explore tailored layout directions with authentic color systems, monospace hierarchy, and responsive mobile breakpoints.',
            },
            {
              step: '03',
              title: 'Compile & Preview',
              desc: 'Synthesize production-ready code with live interactive execution in an isolated client-side browser sandbox.',
            },
            {
              step: '04',
              title: 'Refine & Deploy',
              desc: 'Tweak code conversationally in real time, benchmark against foundation models, and export clean assets to GitHub.',
            },
          ].map((item, idx) => (
            <ScrollReveal key={item.step} delay={idx * 0.06}>
              <div className="border-t-2 border-slate-200 dark:border-[#1C2B3A] pt-4 group hover:border-brand-primary dark:hover:border-[#41A2D9] transition-colors">
                <span className="font-mono text-xs font-semibold text-brand-primary dark:text-[#41A2D9] tracking-wider block mb-2">
                  // {item.step}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2 font-display">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-[#C5D7E8] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION D: THREE MAIN BENEFITS (Alternating Editorial Rhythm)
      ══════════════════════════════════════════════════════════════ */}
      <section id="features" className="scroll-mt-24 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-slate-200/60 dark:border-[#1C2B3A] transition-colors">
        <div className="max-w-7xl mx-auto space-y-16 sm:space-y-24">

          {/* Section Header: Core Capabilities */}
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
              <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                Engineered for precision and model intelligence.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-3 max-w-2xl mx-auto leading-relaxed">
                Three integrated pillars to eliminate prompt ambiguity, automate rubric audits, and benchmark LLMs side-by-side.
              </p>
            </div>
          </ScrollReveal>

          {/* Benefit 1: Write with clarity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6 text-left">
              <ScrollReveal>
                <p className="text-[11px] font-mono uppercase tracking-wider text-brand-primary dark:text-brand-accent mb-2 font-semibold">
                  Precision Syntax &amp; Guardrails
                </p>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-display text-slate-900 dark:text-white tracking-tight leading-tight">
                  Structure prompts that eliminate ambiguity.
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-[#C5D7E8] mt-4 leading-relaxed font-normal">
                  Write prompts with clear roles, reusable variables, and strict rules. Catch missing parameters and formatting issues before your prompts run in production.
                </p>
                <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-600 dark:text-[#C5D7E8]">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary dark:text-brand-accent mt-0.5 shrink-0" />
                    <span><strong>Reusable variables</strong> with instant preview (<code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1A242E] text-brand-primary dark:text-brand-accent font-mono text-xs">{`{{variable}}`}</code>)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary dark:text-brand-accent mt-0.5 shrink-0" />
                    <span><strong>Security guardrails</strong> to protect against prompt leaks and unwanted behavior</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary dark:text-brand-accent mt-0.5 shrink-0" />
                    <span><strong>Instant quality scoring</strong> that checks clarity, role definition, and output formatting</span>
                  </li>
                </ul>
                <div className="pt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('workspace')}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-[#084C8D] dark:bg-[#41A2D9] dark:hover:bg-[#64B6E3] text-white dark:text-[#000000] text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer inline-flex items-center gap-2 shadow-sm active:scale-[0.98]"
                  >
                    <span>Open Creation Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </ScrollReveal>
            </div>

            <div className="lg:col-span-6">
              <ScrollReveal delay={0.15}>
                {/* Visual Code/Prompt Card */}
                <div className="rounded-xl bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#1C2B3A] shadow-lg p-5 sm:p-6 text-left">
                  <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-[#1C2B3A]">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                      <span className="text-xs font-mono font-medium text-slate-500 dark:text-[#7E97AD]">system_prompt.prompt</span>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      Syntax Validated
                    </span>
                  </div>

                  <div className="font-mono text-xs sm:text-sm text-slate-700 dark:text-[#C5D7E8] space-y-2 leading-relaxed bg-slate-50 dark:bg-[#1A242E] p-4 rounded-lg border border-slate-200/80 dark:border-[#1C2B3A]">
                    <p><span className="text-purple-600 dark:text-purple-400 font-semibold"># ROLE DEFINITION</span></p>
                    <p className="text-slate-600 dark:text-[#7E97AD]">You are a Senior Security Auditor evaluating React application hooks.</p>
                    <p className="pt-2"><span className="text-purple-600 dark:text-purple-400 font-semibold"># DYNAMIC CONTEXT</span></p>
                    <p>Target Component: <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-[#131D27] text-brand-primary dark:text-[#41A2D9] font-bold">{`{{target_hook}}`}</span></p>
                    <p>Privilege Level: <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-[#131D27] text-brand-primary dark:text-[#41A2D9] font-bold">{`{{user_role}}`}</span></p>
                    <p className="pt-2"><span className="text-purple-600 dark:text-purple-400 font-semibold"># NEGATIVE CONSTRAINTS</span></p>
                    <p className="text-slate-600 dark:text-[#7E97AD]">- Never echo private auth tokens in logs or responses.</p>
                    <p className="text-slate-600 dark:text-[#7E97AD]">- Return recommendations as structured RFC 7807 JSON.</p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-[#7E97AD] pt-2">
                    <span className="font-medium text-slate-700 dark:text-[#C5D7E8]">2 Variables detected</span>
                    <span className="text-brand-primary dark:text-brand-accent font-medium font-mono">AST Schema Valid</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>

          {/* Benefit 2: Explore visual directions with live preview (Reversed layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <ScrollReveal delay={0.15}>
                {/* Visual Directions Card */}
                <div className="rounded-xl bg-white dark:bg-[#0B1118] border border-slate-200/80 dark:border-[#1C2B3A] shadow-sm p-5 sm:p-6 text-left space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1C2B3A]">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-brand-primary dark:text-brand-accent" />
                      <span className="text-xs font-mono font-semibold text-slate-800 dark:text-[#FFFFFF]">Visual Direction Matrix</span>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-50 dark:bg-[#131D27] text-brand-primary dark:text-brand-accent font-medium">
                      3 Tailored Concepts
                    </span>
                  </div>

                  {/* Concept 1 */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1A242E] border-2 border-brand-primary/40 dark:border-brand-accent/50 text-xs transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-primary dark:bg-brand-accent" />
                        <span className="font-bold text-slate-900 dark:text-white">Direction A: Modern Bento Grid</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary dark:text-brand-accent font-semibold">
                        Recommended
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-[#C5D7E8] text-[11.5px] leading-relaxed">
                      Asymmetric multi-panel layout with rich stat cards, monospace accents, and high-contrast dark tones.
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#000000] border border-white/20" title="Pitch Black" />
                      <span className="w-3.5 h-3.5 rounded-full bg-[#0B60B0]" title="Cobalt Blue" />
                      <span className="w-3.5 h-3.5 rounded-full bg-[#41A2D9]" title="Sky Cerulean" />
                      <span className="w-3.5 h-3.5 rounded-full bg-[#F0EDCE] border border-black/10" title="Warm Sand" />
                      <span className="text-[10px] font-mono text-slate-500 dark:text-[#7E97AD] ml-1.5">Calibrated Palette</span>
                    </div>
                  </div>

                  {/* Concept 2 */}
                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#1A242E]/70 border border-slate-200/80 dark:border-[#1C2B3A] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Direction B: Minimalist Editorial</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-[#7E97AD]">Alternative</span>
                    </div>
                    <p className="text-slate-500 dark:text-[#7E97AD] text-[11.5px] leading-relaxed">
                      Restrained typography, generous negative space, and refined monospace hierarchy.
                    </p>
                  </div>

                  {/* Concept 3 */}
                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#1A242E]/70 border border-slate-200/80 dark:border-[#1C2B3A] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Direction C: Neo-Brutalist Studio</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-[#7E97AD]">Alternative</span>
                    </div>
                    <p className="text-slate-500 dark:text-[#7E97AD] text-[11.5px] leading-relaxed">
                      High-contrast borders, solid shadows, bold typography, and tactile button controls.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-slate-500 dark:text-[#7E97AD] border-t border-slate-100 dark:border-[#1C2B3A]">
                    <span>Responsive Desktop &amp; Mobile</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Instant Live Preview</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            <div className="lg:col-span-6 text-left order-1 lg:order-2">
              <ScrollReveal>
                <p className="text-[11px] font-mono uppercase tracking-wider text-brand-primary dark:text-[#41A2D9] mb-2 font-semibold">
                  Multi-Variant Generation
                </p>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-display text-slate-900 dark:text-white tracking-tight leading-tight">
                  Choose your visual style before building.
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-4 leading-relaxed font-normal">
                  Stop settling for generic templates. Every creation prompt automatically generates 2–3 tailored visual design directions with custom color palettes, typography, and responsive layouts.
                </p>
                <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
                    <span><strong>2–3 tailored design directions</strong> created specifically for your project brief</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
                    <span><strong>Live responsive preview</strong> with instant desktop and mobile viewport testing</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
                    <span><strong>1-click code export</strong> with production-ready HTML, CSS, and component assets</span>
                  </li>
                </ul>
                <div className="pt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('marketplace')}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-[#084C8D] dark:bg-[#41A2D9] dark:hover:bg-[#64B6E3] text-white dark:text-[#000000] text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer inline-flex items-center gap-2 shadow-sm active:scale-[0.98]"
                  >
                    <span>Explore Templates &amp; Marketplace</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('workspace')}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A242E] dark:hover:bg-[#131D27] text-slate-800 dark:text-[#C5D7E8] border border-slate-200 dark:border-[#1C2B3A] text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Creation Workspace</span>
                  </button>
                </div>
              </ScrollReveal>
            </div>
          </div>

          {/* Benefit 3: Keep prompts organized and team-ready */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6 text-left">
              <ScrollReveal>
                <p className="text-[11px] font-mono uppercase tracking-wider text-brand-primary dark:text-brand-accent mb-2 font-semibold">
                  Team Operations &amp; Versioning
                </p>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-display text-slate-900 dark:text-white tracking-tight leading-tight">
                  A shared, organized prompt library for your team.
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-[#C5D7E8] mt-4 leading-relaxed font-normal">
                  Stop losing prompts across messy notes, docs, and chat channels. Keep all your team's best prompts organized in one shared workspace with version history and permissions.
                </p>
                <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-600 dark:text-[#C5D7E8]">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary dark:text-brand-accent mt-0.5 shrink-0" />
                    <span><strong>Version history and restore</strong> so you can restore previous versions whenever you need</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary dark:text-brand-accent mt-0.5 shrink-0" />
                    <span><strong>Shared team collections</strong> with clear owner, editor, and viewer permissions</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary dark:text-brand-accent mt-0.5 shrink-0" />
                    <span><strong>One-click prompt cloning</strong> to customize templates safely in your own workspace</span>
                  </li>
                </ul>
                <div className="pt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-[#084C8D] dark:bg-[#41A2D9] dark:hover:bg-[#64B6E3] text-white dark:text-[#000000] text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer inline-flex items-center gap-2 shadow-sm active:scale-[0.98]"
                  >
                    <span>Open Saved Library</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('teams')}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A242E] dark:hover:bg-[#131D27] text-slate-800 dark:text-[#C5D7E8] border border-slate-200 dark:border-[#1C2B3A] text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Team Workspaces</span>
                  </button>
                </div>
              </ScrollReveal>
            </div>

            <div className="lg:col-span-6">
              <ScrollReveal delay={0.15}>
                {/* Visual Team & Collection Directory Card */}
                <div className="rounded-xl bg-white dark:bg-[#0B1118] border border-slate-200/80 dark:border-[#1C2B3A] shadow-sm p-5 sm:p-6 text-left space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1C2B3A]">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-primary dark:text-brand-accent" />
                      <span className="text-xs font-mono font-semibold text-slate-800 dark:text-[#FFFFFF]">Acme Engineering Workspace</span>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-[#131D27] text-brand-primary dark:text-[#41A2D9] font-medium">
                      4 Members Active
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#1A242E] border border-slate-200/80 dark:border-[#1C2B3A]">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">Customer Support Router v3</div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-[#7E97AD]">Production · Updated 2h ago by Sarah</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-[#0B1118] text-slate-700 dark:text-[#C5D7E8]">
                        v3.2
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#1A242E] border border-slate-200/80 dark:border-[#1C2B3A]">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">TypeScript AST Reviewer</div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-[#7E97AD]">CI/CD Pipeline · 12 Forks</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-[#0B1118] text-slate-700 dark:text-[#C5D7E8]">
                        v2.0
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#1A242E] border border-slate-200/80 dark:border-[#1C2B3A]">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">SQL Optimization Assistant</div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-[#7E97AD]">Database Engineering · 8 Forks</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-[#0B1118] text-slate-700 dark:text-[#C5D7E8]">
                        v1.4
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-[#7E97AD] border-t border-slate-100 dark:border-[#1C2B3A]">
                    <span>Role-Based Access Control</span>
                    <span className="text-brand-primary dark:text-brand-accent font-medium">Automatic Backups</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION E: TEMPLATES (6 Curated Production Templates)
      ══════════════════════════════════════════════════════════════ */}
      <section id="templates" className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Ready-to-use prompt templates.
            </h2>
            <p className="text-sm text-slate-600 dark:text-[#C5D7E8] mt-1.5">
              Battle-tested prompts ready to test, customize, and run with one click.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('marketplace')}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-brand-primary dark:text-brand-accent hover:underline min-h-[44px] cursor-pointer"
          >
            <span>Explore full prompt library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURED_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              className="p-6 rounded-2xl bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#1C2B3A] hover:border-brand-primary/40 transition-all duration-150 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${tmpl.badgeColor}`}>
                    {tmpl.category}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-[#7E97AD]">
                    {tmpl.variables.length} {tmpl.variables.length === 1 ? 'variable' : 'variables'}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
                  {tmpl.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-[#C5D7E8] leading-relaxed mt-2 font-normal">
                  {tmpl.description}
                </p>

                <div className="mt-4 p-2.5 rounded-lg bg-slate-50 dark:bg-[#1A242E] border border-slate-200/80 dark:border-[#1C2B3A] text-[11px] font-mono text-slate-600 dark:text-[#7E97AD] truncate">
                  {tmpl.prompt.slice(0, 90)}...
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleUseTemplate(tmpl.title, tmpl.prompt)}
                className="min-h-[44px] mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#1A242E] hover:bg-slate-200 dark:hover:bg-[#131D27] border border-slate-200 dark:border-[#1C2B3A] text-xs font-semibold text-slate-800 dark:text-[#FFFFFF] hover:text-brand-primary dark:hover:text-brand-accent transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Use in Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION F: PRICING & CREDITS (Factual Breakdown from billingConfig)
      ══════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-200/60 dark:border-[#1C2B3A] transition-colors">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
              <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                Transparent developer pricing. No lock-in.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-[#C5D7E8] mt-3 leading-relaxed">
                Start free with verified free models or your own API keys. Recharge credits on demand or subscribe for priority team features.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left items-stretch">
            {/* Free Tier */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#1C2B3A] flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-[#7E97AD]">
                  Free Developer
                </span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold font-mono text-slate-900 dark:text-white">₹0</span>
                  <span className="text-xs text-slate-500 dark:text-[#7E97AD]">/ forever</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#C5D7E8] mt-2 leading-relaxed">
                  Everything you need to write and test prompts with free models or your own API keys.
                </p>

                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#1C2B3A] space-y-2.5 text-xs text-slate-600 dark:text-[#C5D7E8]">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-primary dark:text-[#41A2D9] shrink-0" />
                    <span>Free OpenRouter models (0 credits)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-primary dark:text-[#41A2D9] shrink-0" />
                    <span>Unlimited BYOK runs (0% markup)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-primary dark:text-[#41A2D9] shrink-0" />
                    <span>Unlimited saved prompts in library</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-primary dark:text-[#41A2D9] shrink-0" />
                    <span>AES-GCM 256-bit client-side credential vault</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenStudio}
                className="min-h-[44px] mt-8 w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#000000] hover:bg-slate-200 dark:hover:bg-[#131D27] border border-slate-200 dark:border-[#1C2B3A] text-xs font-semibold text-slate-800 dark:text-[#FFFFFF] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Start Free in Workspace</span>
              </button>
            </div>

            {/* Wallet Recharge (Most Flexible) */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#0B1118] border-2 border-brand-primary dark:border-[#41A2D9] relative flex flex-col justify-between shadow-lg shadow-blue-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-primary dark:bg-[#41A2D9] text-white dark:text-[#000000] text-[10px] font-mono font-bold uppercase tracking-wider shadow-xs">
                Most Flexible
              </div>

              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-brand-primary dark:text-[#41A2D9]">
                  On-Demand Wallet
                </span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold font-mono text-slate-900 dark:text-white">₹100</span>
                  <span className="text-xs text-slate-500 dark:text-[#7E97AD]">= 200 credits</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#C5D7E8] mt-2 leading-relaxed">
                  Pay-as-you-go credit packs for managed access to paid frontier models without BYOK.
                </p>

                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#1C2B3A] space-y-2.5 text-xs text-slate-600 dark:text-[#C5D7E8]">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-primary dark:text-[#41A2D9] shrink-0" />
                    <span>Credits never expire</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-primary dark:text-[#41A2D9] shrink-0" />
                    <span>Access GPT-4o, Claude 3.5, Gemini 2.0</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-primary dark:text-[#41A2D9] shrink-0" />
                    <span>Zero subscription commitments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-primary dark:text-[#41A2D9] shrink-0" />
                    <span>UPI, Cards &amp; NetBanking via Razorpay</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('pricing')}
                className="min-h-[44px] mt-8 w-full py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-blue-700 dark:bg-[#41A2D9] dark:text-[#000000] dark:hover:bg-[#64B6E3] text-white text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
              >
                <span>Recharge Credits</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pro Plan */}
            <div className="p-7 rounded-2xl bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#1C2B3A] flex flex-col justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-[#7E97AD]">
                  Pro Plan
                </span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold font-mono text-slate-900 dark:text-white">₹799</span>
                  <span className="text-xs text-slate-500 dark:text-[#7E97AD]">/ month</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#C5D7E8] mt-2 leading-relaxed">
                  Designed for power prompt engineers, agency consultants, and growing dev teams.
                </p>

                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#1C2B3A] space-y-2.5 text-xs text-slate-600 dark:text-[#C5D7E8]">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-primary dark:text-[#41A2D9] shrink-0" />
                    <span>500 included platform credits/mo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-primary dark:text-[#41A2D9] shrink-0" />
                    <span>Priority model routing &amp; low latency</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-primary dark:text-[#41A2D9] shrink-0" />
                    <span>Team workspace &amp; shared prompt repos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-primary dark:text-[#41A2D9] shrink-0" />
                    <span>Full Workspace export &amp; live preview</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('pricing')}
                className="min-h-[44px] mt-8 w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#000000] hover:bg-slate-200 dark:hover:bg-[#131D27] border border-slate-200 dark:border-[#1C2B3A] text-xs font-semibold text-slate-800 dark:text-[#FFFFFF] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>View Plan Details</span>
              </button>
            </div>
          </div>

          {/* BYOK Zero Markup Guarantee Banner */}
          <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#1C2B3A] text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-[#1A242E] text-brand-primary dark:text-[#41A2D9] border border-blue-200/80 dark:border-[#1C2B3A] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-brand-primary dark:text-[#41A2D9]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  100% Client-Side BYOK with 0% Platform Markup
                </h4>
                <p className="text-xs text-slate-600 dark:text-[#C5D7E8] mt-0.5 leading-relaxed">
                  Have your own API keys? Connect OpenAI, Anthropic, Gemini, DeepSeek, or Groq directly. PromptHub charges zero platform fees or token markups on BYOK runs.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-blue-700 dark:bg-[#41A2D9] dark:text-[#000000] dark:hover:bg-[#64B6E3] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              Configure BYOK Keys
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION G: TRUST, SECURITY ARCHITECTURE & FAQ
      ══════════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Security Architecture Cards */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-5xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight leading-[1.15]">
            Privacy and security built in from day one.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#C5D7E8] mt-3 leading-relaxed">
            PromptHub is designed to keep your prompts, data, and API keys safe, isolated, and completely private.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 text-left">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#1C2B3A] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#1A242E] text-brand-primary dark:text-[#41A2D9] border border-blue-200/80 dark:border-[#1C2B3A] flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-brand-primary dark:text-[#41A2D9]" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Encrypted Local Storage
            </h3>
            <p className="text-xs text-slate-600 dark:text-[#C5D7E8] leading-relaxed mt-2 font-normal">
              Your API keys are encrypted with AES-256 and stored only in your local browser storage. PromptHub servers never receive, log, or store your third-party API keys.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#1C2B3A] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#1A242E] text-brand-primary dark:text-[#41A2D9] border border-blue-200/80 dark:border-[#1C2B3A] flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5 text-brand-primary dark:text-[#41A2D9]" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Zero Model Training
            </h3>
            <p className="text-xs text-slate-600 dark:text-[#C5D7E8] leading-relaxed mt-2 font-normal">
              PromptHub never trains models on your prompts or completions. All inference requests route directly to enterprise API endpoints that guarantee non-training.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#1C2B3A] shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#1A242E] text-brand-primary dark:text-[#41A2D9] border border-blue-200/80 dark:border-[#1C2B3A] flex items-center justify-center mb-4">
              <Server className="w-5 h-5 text-brand-primary dark:text-[#41A2D9]" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Secure by Default
            </h3>
            <p className="text-xs text-slate-600 dark:text-[#C5D7E8] leading-relaxed mt-2 font-normal">
              Modern security practices including strict content security policies, encrypted database access, and automatic input sanitization keep your data safe.
            </p>
          </div>
        </div>

        {/* Accordion FAQ Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start pt-6 border-t border-slate-200 dark:border-[#1C2B3A] text-left">
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <ScrollReveal>
              <h3 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
                Frequently Asked Questions
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#C5D7E8] mt-3 leading-relaxed">
                Clear answers about architecture, BYOK keys, billing, model counts, and team governance.
              </p>
            </ScrollReveal>
          </div>

          <div className="lg:col-span-7">
            <ScrollReveal delay={0.1}>
              <div className="space-y-0 divide-y divide-slate-200 dark:divide-[#324453] border-t border-b border-slate-200 dark:border-[#1C2B3A]">
                {FAQS.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div key={idx} className="py-1">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full flex justify-between items-center py-4 text-sm font-semibold text-slate-900 dark:text-white text-left hover:text-brand-primary dark:hover:text-[#41A2D9] transition-colors duration-150 cursor-pointer min-h-[44px]"
                        aria-expanded={isOpen}
                      >
                        <span className="pr-4">{faq.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 dark:text-[#7E97AD] shrink-0 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-brand-primary dark:text-[#41A2D9]' : ''
                          }`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18, ease: EASE }}
                            className="overflow-hidden"
                          >
                            <div className="pb-4 text-xs sm:text-sm text-slate-600 dark:text-[#C5D7E8] leading-relaxed font-sans">
                              {faq.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION H: FINAL ACTION & FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <ScrollReveal>
          <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white border border-blue-900/50 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8 text-left relative overflow-hidden">
            <div 
              className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse_60%_50%_at_20%_20%,rgba(37,99,235,0.4),transparent)]" 
              aria-hidden="true" 
            />

            <div className="max-w-2xl relative z-10">
              <p className="text-[11px] font-mono uppercase tracking-wider text-blue-300 mb-3 font-semibold">
                Start Engineering
              </p>
              <h3 className="text-2xl sm:text-4xl font-bold font-display text-white tracking-tight">
                Build better prompts. Ship reliable AI.
              </h3>
              <p className="text-xs sm:text-sm text-blue-200/80 mt-2 font-normal leading-relaxed">
                Turn your ideas into live interactive projects in seconds. Free to start, zero setup required.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 relative z-10">
              <button
                type="button"
                onClick={handleOpenStudio}
                className="min-h-[44px] px-6 py-3 rounded-xl bg-brand-primary hover:bg-[#084C8D] dark:bg-[#41A2D9] dark:hover:bg-[#64B6E3] text-white dark:text-[#000000] text-sm font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2 shadow-lg shadow-blue-600/30 whitespace-nowrap active:scale-[0.98]"
              >
                <span>Open Workspace</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('templates')}
                className="min-h-[44px] px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white text-sm font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap active:scale-[0.98]"
              >
                <span>Explore Templates</span>
              </button>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* AppFooter: Multi-column navigation, resources, legal, and copyright */}
      <AppFooter />
    </div>
  );
};

export default LandingView;
