/**
 * src/services/ai/agentTeamRegistry.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Antigravity Agent Teamwork & Specialist Roles Registry for PromptHub Workspace.
 *
 * Defines the specialized agent team roles that collaborate concurrently to
 * plan, code, style, and audit deliverables faster.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface AgentTeamMember {
  id: string;
  role: string;
  title: string;
  specialty: string;
  avatarIcon: string;
  badge: string;
  status: 'idle' | 'planning' | 'coding' | 'styling' | 'auditing' | 'completed';
}

export const DEFAULT_AGENT_TEAM: AgentTeamMember[] = [
  {
    id: 'architect',
    role: 'Lead Architect',
    title: 'Systems & Architecture Lead',
    specialty: 'Goal decomposition, schema planning, and pipeline orchestration',
    avatarIcon: 'Compass',
    badge: 'ARCHITECT',
    status: 'idle',
  },
  {
    id: 'coder',
    role: 'Fullstack Coder',
    title: 'Senior Software Engineer',
    specialty: 'Production TypeScript, React, HTML5, CSS3, and API integration',
    avatarIcon: 'Code2',
    badge: 'ENGINEER',
    status: 'idle',
  },
  {
    id: 'designer',
    role: 'UI/UX Craftsperson',
    title: 'Impeccable Design Lead',
    specialty: 'Responsive ergonomics, typography hierarchy, and obsidian-slate styling',
    avatarIcon: 'Palette',
    badge: 'DESIGNER',
    status: 'idle',
  },
  {
    id: 'auditor',
    role: 'QA & Security Reviewer',
    title: 'Security & Quality Specialist',
    specialty: 'WCAG AA accessibility, input sanitization, and quota verification',
    avatarIcon: 'ShieldCheck',
    badge: 'AUDITOR',
    status: 'idle',
  },
];
