/**
 * src/services/ai/skillsRegistry.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Antigravity Skills Registry for PromptHub Workspace.
 *
 * Exposes specialized craftsmanship, design, and engineering skills that users
 * can trigger via inline chips or slash commands (e.g. /audit, /adapt, /polish).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface WorkspaceSkill {
  id: string;
  command: string;
  label: string;
  badge: string;
  description: string;
  iconName: string;
  colorClass: string;
  instruction: string;
}

export const WORKSPACE_SKILLS: WorkspaceSkill[] = [
  {
    id: 'audit',
    command: '/audit',
    label: 'Audit Quality',
    badge: 'WCAG • SEC',
    description: 'Technical quality checks across accessibility (WCAG AA), security, and performance.',
    iconName: 'ShieldCheck',
    colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    instruction:
      'ENFORCE SKILL [AUDIT]: Rigorously audit code for accessibility (WCAG AA color contrast, aria labels, role attributes), security sanitization (no unsafe innerHTML), zero lint defects, and robust error boundaries.',
  },
  {
    id: 'adapt',
    command: '/adapt',
    label: 'Adapt Responsive',
    badge: 'MOBILE • FLUID',
    description: 'Enforce fluid responsiveness across mobile (375px), tablet (768px), and desktop breakpoints.',
    iconName: 'Smartphone',
    colorClass: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    instruction:
      'ENFORCE SKILL [ADAPT]: Ensure flawless responsive layout across mobile (375px), tablet (768px), and desktop (1280px+). All interactive touch targets must be at least 44px (min-h-[44px]). Prevent any horizontal clipping or overflow.',
  },
  {
    id: 'polish',
    command: '/polish',
    label: 'Polish Craft',
    badge: 'CRAFT • DETAIL',
    description: 'Final craftsmanship pass fixing spacing rhythm, micro-alignments, and visual polish.',
    iconName: 'Sparkles',
    colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    instruction:
      'ENFORCE SKILL [POLISH]: Apply Impeccable craftsmanship standards. Ensure harmonious visual rhythm, calibrated padding (p-4 to p-8), smooth quartic easing, and subtle borders with zero raw or unstyled edges.',
  },
  {
    id: 'bolder',
    command: '/bolder',
    label: 'Bolder Design',
    badge: 'IMPACT • HERO',
    description: 'Amplify safe or generic designs with bold typography, asymmetric accents, and distinct personality.',
    iconName: 'Zap',
    colorClass: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    instruction:
      'ENFORCE SKILL [BOLDER]: Amplify visual character with bold display typography, high-contrast asymmetric layout accents, and confident visual presence while preserving rock-solid usability.',
  },
  {
    id: 'clarify',
    command: '/clarify',
    label: 'Clarify UX Copy',
    badge: 'COPY • CLARITY',
    description: 'Refine confusing text, microcopy, form labels, and error messages for effortless clarity.',
    iconName: 'MessageSquare',
    colorClass: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    instruction:
      'ENFORCE SKILL [CLARIFY]: Elevate UX copy to be concise, human, and crystal clear. Eliminate jargon, write active button labels, and provide actionable feedback in all states.',
  },
  {
    id: 'harden',
    command: '/harden',
    label: 'Harden Edge Cases',
    badge: 'PROD • RESILIENT',
    description: 'Production hardening: handle error states, empty states, network latency, and text overflow.',
    iconName: 'Cpu',
    colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    instruction:
      'ENFORCE SKILL [HARDEN]: Production harden the solution: include graceful empty states, loading skeletons, defensive null checks, text truncation with tooltips, and resilient network fallbacks.',
  },
  {
    id: 'optimize',
    command: '/optimize',
    label: 'Optimize Speed',
    badge: 'PERF • 60FPS',
    description: 'Diagnose and optimize rendering performance, asset weights, and GPU-accelerated motion.',
    iconName: 'Gauge',
    colorClass: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    instruction:
      'ENFORCE SKILL [OPTIMIZE]: Maximize frontend performance. Use lightweight CSS transformations (transform, opacity), eliminate unnecessary re-renders, and ensure 60fps interaction smoothness.',
  },
  {
    id: 'delight',
    command: '/delight',
    label: 'Delight Motion',
    badge: 'MOTION • FEEL',
    description: 'Add purposeful micro-interactions, smooth hover transitions, and engaging animations.',
    iconName: 'Smile',
    colorClass: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
    instruction:
      'ENFORCE SKILL [DELIGHT]: Add purposeful micro-interactions. Use smooth quartic easing cubic-bezier(0.16, 1, 0.3, 1), subtle hover lifts, active press scales, and engaging feedback.',
  },
  {
    id: 'minimalist-ui',
    command: '/minimalist-ui',
    label: 'Minimalist UI',
    badge: 'EDITORIAL • CLEAN',
    description: 'Clean editorial-style interface with muted pastels, flat bento grid, and typographic contrast.',
    iconName: 'Layers',
    colorClass: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
    instruction:
      'ENFORCE SKILL [MINIMALIST-UI]: Build in a clean editorial minimalist style: warm monochrome tones, crisp typographic contrast, flat bento grid containers, and no gaudy gradients or heavy drop shadows.',
  },
  {
    id: 'browser',
    command: '/browser',
    label: 'Browser Sandbox',
    badge: 'LIVE • BROWSER',
    description: 'Interactive live browser preview sandbox with real-time responsive testing and DOM verification.',
    iconName: 'Globe',
    colorClass: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    instruction:
      'ENFORCE SKILL [BROWSER]: Run and preview in the interactive sandboxed browser preview. Verify viewport adaptations, live component compilation, and realistic user interactions.',
  },
  {
    id: 'learn',
    command: '/learn',
    label: 'Adaptive Learn',
    badge: 'MEMORY • KB',
    description: 'Continuous memory loop that extracts preferences, design rules, and constraints into the knowledge base.',
    iconName: 'Brain',
    colorClass: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    instruction:
      'ENFORCE SKILL [LEARN]: Extract high-importance brand tokens, architectural guidelines, and user preferences into the Adaptive Knowledge Base for cross-turn persistence.',
  },
  {
    id: 'teamwork-preview',
    command: '/teamwork-preview',
    label: 'Teamwork Preview',
    badge: 'MULTI • AGENT',
    description: 'Multi-agent orchestration: Lead Architect, UI Designer, Fullstack Coder, and QA Auditor real-time pipeline.',
    iconName: 'Users',
    colorClass: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    instruction:
      'ENFORCE SKILL [TEAMWORK-PREVIEW]: Orchestrate the full multi-agent collaborative pipeline with step-by-step role handoffs and instant visual concept previews.',
  },
  {
    id: 'grill-me',
    command: '/grill-me',
    label: 'Grill Me',
    badge: 'PROBE • INTERVIEW',
    description: 'Stress-test plans and edge cases with rigorous, relentless architectural probing and requirement checks.',
    iconName: 'Flame',
    colorClass: 'text-red-500 bg-red-500/10 border-red-500/20',
    instruction:
      'ENFORCE SKILL [GRILL-ME]: Relentlessly interview and probe each branch of the architectural decision tree. Surface hidden assumptions, edge-case bottlenecks, and trade-offs before finalizing implementation.',
  },
  {
    id: 'boost',
    command: '/boost',
    label: 'Boost Engine',
    badge: 'TURBO • OPTIMIZE',
    description: 'Autonomous token compression, model router acceleration, and execution latency optimization.',
    iconName: 'Zap',
    colorClass: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    instruction:
      'ENFORCE SKILL [BOOST]: Turbocharge execution: minify conversational fluff, compress prompts with variable preservation, route to highest-speed frontier endpoints, and enforce sub-second response telemetry.',
  },
];

/**
 * Resolves a skill from the registry or creates an Antigravity custom skill dynamically.
 */
export function resolveWorkspaceSkill(commandOrId: string): WorkspaceSkill {
  const norm = commandOrId.trim();
  const cmd = norm.startsWith('/') ? norm : `/${norm}`;
  const existing = WORKSPACE_SKILLS.find(
    (s) => s.command.toLowerCase() === cmd.toLowerCase() || s.id.toLowerCase() === norm.toLowerCase()
  );
  if (existing) return existing;

  const rawName = cmd.replace(/^\//, '');
  const title = rawName.charAt(0).toUpperCase() + rawName.slice(1).replace(/-/g, ' ');
  return {
    id: rawName.toLowerCase(),
    command: cmd.toLowerCase(),
    label: title,
    badge: 'CUSTOM • SKILL',
    description: `Antigravity custom directive: ${title}`,
    iconName: 'Sparkles',
    colorClass: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20',
    instruction: `ENFORCE SKILL [${cmd.toUpperCase()}]: Follow user-requested specialized directive "${title}" throughout implementation.`,
  };
}
