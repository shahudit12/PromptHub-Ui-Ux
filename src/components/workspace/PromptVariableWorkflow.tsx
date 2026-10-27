/**
 * src/components/workspace/PromptVariableWorkflow.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-Stage Prompt & Variable Enhancement Engine:
 * 
 * Flow:
 * User prompt -> Our model enhance -> Gives user variables to put their needs ->
 * Enhances more (CO-STAR synthesis) -> User selected LLM -> Output -> Repeat.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Sliders,
  RotateCcw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { extractVariables, renderPromptTemplate } from '../../services/ai/variableEngine';
import { WORKSPACE_MODELS, type WorkspaceModelInfo } from '../../services/ai/workspaceModels';
import { ModelProviderLogo } from '../common/ModelProviderLogo';

export interface WorkflowVariable {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  suggestions?: string[];
  required?: boolean;
}

export interface PromptVariableWorkflowProps {
  /** The original prompt typed by the user */
  userPrompt: string;
  /** Currently selected model ID */
  selectedModel: string;
  /** Callback when user changes the target LLM */
  onSelectModel: (modelId: string) => void;
  /** Callback to execute the enhanced prompt with user variables on the selected LLM */
  onExecute: (finalPrompt: string, targetModel: string, metadata: {
    rawPrompt: string;
    variables: Record<string, string>;
    enhancedPrompt: string;
  }) => Promise<void>;
  /** Whether execution is currently in progress */
  isExecuting?: boolean;
  /** Callback to cancel or dismiss the workflow card */
  onDismiss?: () => void;
  /** Whether to show in compact inline mode or expanded studio mode */
  isCompact?: boolean;
}

/**
 * Intelligent heuristics to discover domain-specific variables from a user's prompt
 */
function deriveVariablesFromPrompt(prompt: string): {
  baseTemplate: string;
  detectedVariables: WorkflowVariable[];
  domain: string;
} {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();

  // 1. If user already included {{variable}} tokens, extract them directly
  const parsed = extractVariables(trimmed);
  if (parsed.hasVariables) {
    const vars: WorkflowVariable[] = parsed.variables.map((v) => ({
      name: v.name,
      label: v.label || v.name,
      value: v.defaultValue || '',
      placeholder: `Enter ${v.label || v.name}`,
      required: v.required,
    }));
    return {
      baseTemplate: trimmed,
      detectedVariables: vars,
      domain: 'Custom Template',
    };
  }

  // 2. Clinic & Healthcare Practice
  if (
    lower.includes('clinic') ||
    lower.includes('health') ||
    lower.includes('medical') ||
    lower.includes('doctor') ||
    lower.includes('hospital') ||
    lower.includes('patient') ||
    lower.includes('dentist')
  ) {
    const vars: WorkflowVariable[] = [
      {
        name: 'clinic_name',
        label: 'Clinic / Practice Name',
        value: 'Apex Medical & Diagnostic Center',
        placeholder: 'e.g. Horizon Family Health Clinic',
        suggestions: ['Apex Medical & Diagnostic Center', 'Nova Care Dental Clinic', 'Starlight Pediatrics', 'Pulse Health Specialists'],
        required: true,
      },
      {
        name: 'medical_specialty',
        label: 'Medical Specialty',
        value: 'General Medicine & Multispecialty Diagnostics',
        placeholder: 'e.g. Dermatology & Cosmetic Care',
        suggestions: ['General Medicine & Multispecialty', 'Pediatrics & Family Care', 'Dental Care & Orthodontics', 'Dermatology & Skin Wellness'],
      },
      {
        name: 'doctor_name',
        label: 'Lead Physician / Medical Director',
        value: 'Dr. Sarah Mitchell, MD',
        placeholder: 'e.g. Dr. Arthur Vance, MD, FACP',
        suggestions: ['Dr. Sarah Mitchell, MD', 'Dr. Arthur Vance, MD, FACP', 'Dr. Elena Rostova, DDS', 'Dr. Rajesh Patel, MBBS, MD'],
      },
      {
        name: 'key_features',
        label: 'Core Features & Patient Modules',
        value: 'Online Appointment Booking, Patient Records Portal, Doctor Rosters, Digital Prescriptions',
        placeholder: 'Key modules to include',
        suggestions: [
          'Online Appointment Booking, Patient Records Portal, Doctor Rosters, Digital Prescriptions',
          'Telehealth Video Consultations, Lab Results Dashboard, Prescription Refill',
          'Dental Treatment Plans, Before/After Gallery, Automated SMS Reminders',
        ],
      },
      {
        name: 'visual_theme',
        label: 'Visual Theme & Palette',
        value: 'Clean Clinical Teal with High-Contrast Slate Canvas',
        placeholder: 'Aesthetic style',
        suggestions: [
          'Clean Clinical Teal with High-Contrast Slate Canvas',
          'Dark Obsidian Medical with Cyan Accents',
          'Warm Minimalist Sage with Off-White Canvas',
        ],
      },
      {
        name: 'tech_stack',
        label: 'Engineering Tech Stack',
        value: 'React 19, TypeScript, Tailwind CSS, Python FastAPI',
        placeholder: 'Stack constraints',
        suggestions: [
          'React 19, TypeScript, Tailwind CSS, Python FastAPI',
          'Next.js 15, TypeScript, Tailwind CSS, PostgreSQL',
          'HTML5, Tailwind CSS CDN, JetBrains Mono font, Lucide Icons',
        ],
      },
    ];

    const baseTemplate = `# CONTEXT & ROLE
Principal Full-Stack Systems Engineer and Healthcare UI Architect.

# OBJECTIVE
Develop a complete, production-grade Web App & Clinic Management System for {{clinic_name}}.
Specialty Focus: {{medical_specialty}}
Lead Clinician: {{doctor_name}}
Goal: ${trimmed}

# DOMAIN SPECIFICATIONS
- Visual Palette & Aesthetics: {{visual_theme}}
- Key Features to Implement: {{key_features}}
- Architecture & Stack: {{tech_stack}}

# CLINICAL & ENGINEERING CONSTRAINTS
- Flawless responsiveness across Mobile (<640px), Tablet, and Desktop (1440px+).
- Minimum 44px touch targets on all interactive controls.
- Complete working appointment booking schedule with date picker and instant validation.
- Zero placeholder comments ("// TODO"), complete working scripts and interactive handlers.
`;

    return {
      baseTemplate,
      detectedVariables: vars,
      domain: 'Clinic & Healthcare Web App',
    };
  }

  // 3. ROI Calculator & Financial Modeler
  if (
    lower.includes('roi') ||
    lower.includes('calc') ||
    lower.includes('calculator') ||
    lower.includes('payback') ||
    lower.includes('return on investment')
  ) {
    const vars: WorkflowVariable[] = [
      {
        name: 'product_name',
        label: 'Product / Service Name',
        value: 'Vortex Enterprise Cloud Accelerator',
        placeholder: 'e.g. Apex AI Workflow Engine',
        suggestions: ['Vortex Enterprise Cloud Accelerator', 'AutomateOps Platform', 'CloudShield Security Hub'],
        required: true,
      },
      {
        name: 'pricing_model',
        label: 'Pricing Structure',
        value: '₹4,999 / user / month (or $60 / mo)',
        placeholder: 'e.g. Usage-based or Tiered Seats',
        suggestions: ['₹4,999 / user / month', '$120 / seat / month', 'Tiered Annual Enterprise', 'Usage-Based API Calls'],
      },
      {
        name: 'current_cost_baseline',
        label: 'Current Inefficient Cost Baseline',
        value: '₹350,000 / month in manual engineering hours',
        placeholder: 'Current cost before solution',
        suggestions: ['₹350,000 / month in manual engineering hours', '$15,000 / mo operational waste', '40 hours per team weekly'],
      },
      {
        name: 'efficiency_gain_percent',
        label: 'Expected Efficiency / Savings %',
        value: '35% reduction in recurring engineering overhead',
        placeholder: 'e.g. 40% reduction in churn',
        suggestions: ['35% reduction in recurring overhead', '50% faster deployment velocity', '25% direct cloud cost reduction'],
      },
      {
        name: 'visual_theme',
        label: 'Visual Palette & Styling',
        value: 'Dark Obsidian Canvas with Emerald ROI Accent Meters',
        placeholder: 'Visual styling',
        suggestions: [
          'Dark Obsidian Canvas with Emerald ROI Accent Meters',
          'High-Contrast Monochrome with Amber KPI Badges',
          'Clean Modern Slate with Cobalt Highlights',
        ],
      },
    ];

    const baseTemplate = `# CONTEXT & ROLE
Principal Financial Modeling Engineer and Frontend Architect.

# OBJECTIVE
Develop an interactive, high-converting ROI Calculator for {{product_name}}.
Pricing Baseline: {{pricing_model}}
Customer Baseline Cost: {{current_cost_baseline}}
Projected Savings: {{efficiency_gain_percent}}
Goal: ${trimmed}

# SPECIFICATIONS & FORMULAS
- Visual Theme: {{visual_theme}}
- Dynamic Interactive Sliders for Team Size, Hourly Rate, and Current Spend.
- Real-time Payback Period Calculation (Months to Breakeven).
- Annualized Net Savings Breakdown with visual bar charts and percentage return.

# ENGINEERING CONSTRAINTS
- Zero external chart dependencies required — use clean SVG or lightweight Canvas.
- Instant mathematical reactivity on all slider inputs without layout thrashing.
- Responsive mobile & desktop layout with export / copy summary button.
`;

    return {
      baseTemplate,
      detectedVariables: vars,
      domain: 'Interactive ROI Calculator',
    };
  }

  // 4. Client Proposal & SOW
  if (
    lower.includes('proposal') ||
    lower.includes('sow') ||
    lower.includes('statement of work') ||
    lower.includes('contract') ||
    lower.includes('pitch')
  ) {
    const vars: WorkflowVariable[] = [
      {
        name: 'client_name',
        label: 'Client Organization Name',
        value: 'Acme Global Technologies',
        placeholder: 'e.g. Horizon Financial Group',
        suggestions: ['Acme Global Technologies', 'Horizon Financial Group', 'NextGen Logistics LLC'],
        required: true,
      },
      {
        name: 'agency_name',
        label: 'Your Studio / Company Name',
        value: 'Nova Digital Architecture Lab',
        placeholder: 'e.g. Apex Systems Studio',
        suggestions: ['Nova Digital Architecture Lab', 'Apex Systems Studio', 'Cipher Solutions Group'],
      },
      {
        name: 'project_deliverables',
        label: 'Core Scope & Deliverables',
        value: 'Full-Stack Web App, Microservices API, CI/CD Pipeline, Security Penetration Audit',
        placeholder: 'Key deliverables included',
      },
      {
        name: 'project_budget',
        label: 'Total Budget & Milestones',
        value: '₹450,000 (Milestone 1: 40%, Milestone 2: 40%, Launch: 20%)',
        placeholder: 'Total budget and currency',
        suggestions: [
          '₹450,000 (Milestone 1: 40%, Milestone 2: 40%, Launch: 20%)',
          '$15,000 USD across 3 bi-weekly sprint deliverables',
          '₹200,000 fixed-price complete package',
        ],
      },
      {
        name: 'delivery_timeline',
        label: 'Delivery Timeline',
        value: '6 Weeks (3 Sprints with Bi-Weekly Demos)',
        placeholder: 'Project duration',
        suggestions: ['6 Weeks (3 Sprints with Bi-Weekly Demos)', '4 Weeks Accelerated Delivery', '8 Weeks Enterprise Rollout'],
      },
    ];

    const baseTemplate = `# CONTEXT & ROLE
Principal Technical Director and Solutions Proposal Architect.

# OBJECTIVE
Generate a high-converting, professional Statement of Work & Client Proposal for {{client_name}} prepared by {{agency_name}}.
Goal: ${trimmed}

# PROPOSAL PARAMETERS
- Deliverables Scope: {{project_deliverables}}
- Budget & Investment: {{project_budget}}
- Schedule & Timeline: {{delivery_timeline}}

# DOCUMENT STRUCTURE & SECTIONS
1. Executive Summary & Value Proposition
2. Technical Architecture & Implementation Methodology
3. Scope of Work (In-Scope vs Out-of-Scope boundaries)
4. Milestone Schedule & Acceptance Criteria
5. Commercial Terms & Payment Schedule
6. Digital Signature Acceptance Block
`;

    return {
      baseTemplate,
      detectedVariables: vars,
      domain: 'Client Proposal & SOW',
    };
  }

  // 5. Ad Campaign & Growth Engine
  if (
    lower.includes('ad') ||
    lower.includes('campaign') ||
    lower.includes('growth') ||
    lower.includes('marketing') ||
    lower.includes('advertisement')
  ) {
    const vars: WorkflowVariable[] = [
      {
        name: 'product_name',
        label: 'Brand / Product Name',
        value: 'PromptHub AI Studio',
        placeholder: 'e.g. Nova AI Cloud',
        suggestions: ['PromptHub AI Studio', 'Vortex Cloud Platform', 'Aether Analytics'],
        required: true,
      },
      {
        name: 'target_persona',
        label: 'Target Audience Persona',
        value: 'AI Prompt Engineers, Tech Founders, and CTOs',
        placeholder: 'Who is the ad targeting?',
        suggestions: ['AI Engineers & Tech Founders', 'B2B Sales Leaders', 'Growth Marketers & CMOs'],
      },
      {
        name: 'core_hook',
        label: 'Core Hook & Value Proposition',
        value: 'Stop prompt guesswork. Multi-model arena testing with automated code deliverables.',
        placeholder: 'The main irresistible promise',
      },
      {
        name: 'ad_channels',
        label: 'Primary Channels',
        value: 'LinkedIn Sponsored Content, Meta Ads, and Google Search Ads',
        placeholder: 'Where will ads run?',
        suggestions: ['LinkedIn & Meta Ads', 'Google Search & YouTube', 'X/Twitter & Developer Newsletters'],
      },
      {
        name: 'call_to_action',
        label: 'Primary Call To Action (CTA)',
        value: 'Launch Studio Free • Zero Credit Card Required',
        placeholder: 'CTA button text',
        suggestions: ['Launch Studio Free • Zero Credit Card Required', 'Book Live Demo', 'Start 14-Day Enterprise Trial'],
      },
    ];

    const baseTemplate = `# CONTEXT & ROLE
Principal Growth Marketing Strategist and Direct-Response Copywriting Architect.

# OBJECTIVE
Develop an end-to-end, high-converting Advertising & Growth Campaign for {{product_name}}.
Target Audience: {{target_persona}}
Core Hook: {{core_hook}}
Channels: {{ad_channels}}
Primary CTA: {{call_to_action}}
Goal: ${trimmed}

# DELIVERABLES TO GENERATE
1. Hook & Headline Matrix (5 High-Performing Angles: Pain-Point, Curiosity, Authority, Speed, Contrast)
2. Primary Text & Ad Copy for Each Channel (Short-form, Medium-form, Long-form)
3. Visual & Creative Direction Guidelines (Color Palette, Layout, Typography)
4. Landing Page Conversion Optimization Recommendations
5. 14-Day A/B Testing Schedule & KPI Benchmark Targets
`;

    return {
      baseTemplate,
      detectedVariables: vars,
      domain: 'Multi-Channel Ad Campaign',
    };
  }

  // 2. Web App / Dashboard / UI Prototype
  if (
    lower.includes('dashboard') ||
    lower.includes('saas') ||
    lower.includes('landing page') ||
    lower.includes('web app') ||
    lower.includes('website') ||
    lower.includes('portfolio') ||
    lower.includes('ui') ||
    lower.includes('frontend') ||
    lower.includes('calc')
  ) {
    const isDashboard = lower.includes('dashboard') || lower.includes('telemetry') || lower.includes('analytics');
    const isPortfolio = lower.includes('portfolio') || lower.includes('resume');

    const vars: WorkflowVariable[] = [
      {
        name: 'app_title',
        label: 'Application Title',
        value: isDashboard ? 'CloudMetrics Telemetry Studio' : isPortfolio ? 'Alex Rivera — Systems Engineer' : 'Nova SaaS Platform',
        placeholder: 'e.g. PulseMetrics Studio',
        suggestions: ['AetherOps AI', 'Vortex Dashboard', 'Minimalist Bento', 'Apex SaaS'],
      },
      {
        name: 'target_audience',
        label: 'Target Audience',
        value: isDashboard ? 'DevOps Engineers & Technical Founders' : isPortfolio ? 'Engineering Leaders & Recruiters' : 'Modern Software Teams',
        placeholder: 'Who is this built for?',
        suggestions: ['DevOps & Platform Teams', 'B2B Founders', 'Data Scientists', 'Design Systems Engineers'],
      },
      {
        name: 'visual_theme',
        label: 'Visual & Color Theme',
        value: 'Dark Obsidian Canvas with Cobalt Accents',
        placeholder: 'Theme aesthetic & accents',
        suggestions: [
          'Dark Obsidian Canvas with Cobalt Accents',
          'Minimalist Slate with Emerald Highlights',
          'Linear-style Restrained Monochrome',
          'Warm Sand with High-Contrast Charcoal',
        ],
      },
      {
        name: 'key_features',
        label: 'Core Features & Sections',
        value: isDashboard
          ? 'Live throughput metrics, p95 latency percentiles, provider health table'
          : isPortfolio
          ? 'Bento project showcase, interactive experience timeline, skills matrix'
          : 'Interactive product demo, pricing comparison tiers, customer testimonials',
        placeholder: 'Key components to include',
      },
      {
        name: 'tech_stack',
        label: 'Tech Stack & Libraries',
        value: 'HTML5, Tailwind CSS CDN, JetBrains Mono font, Lucide SVG icons',
        placeholder: 'Stack constraints',
        suggestions: [
          'HTML5, Tailwind CSS CDN, JetBrains Mono font, Lucide SVG icons',
          'React 19, Tailwind CSS, Lucide Icons',
          'Next.js App Router, Tailwind CSS, TypeScript',
        ],
      },
    ];

    const baseTemplate = `# CONTEXT & ROLE
Principal Full-Stack Systems Engineer and Design Architect.

# OBJECTIVE
Develop a complete, production-grade single-file application for {{app_title}}.
Goal: ${trimmed}

# DOMAIN SPECIFICATIONS
- Target Audience: {{target_audience}}
- Visual Palette & Aesthetics: {{visual_theme}}
- Key Features to Implement: {{key_features}}
- Architecture & Stack: {{tech_stack}}

# ENGINEERING CONSTRAINTS
- Flawless responsiveness across Mobile (<640px), Tablet, and Desktop (1440px+).
- Minimum 44px touch targets on all interactive controls.
- Zero placeholder comments ("// TODO"), complete working scripts and interactive handlers.
- Production contrast ratios complying with WCAG AA standards.
`;

    return {
      baseTemplate,
      detectedVariables: vars,
      domain: isDashboard ? 'SaaS Dashboard' : isPortfolio ? 'Developer Portfolio' : 'Web Application',
    };
  }

  // 3. Prompt Engineering / AI System Prompt
  if (
    lower.includes('prompt') ||
    lower.includes('system prompt') ||
    lower.includes('copilot') ||
    lower.includes('agent') ||
    lower.includes('bot')
  ) {
    const vars: WorkflowVariable[] = [
      {
        name: 'agent_role',
        label: 'Agent Persona & Role',
        value: 'Principal AI Engineering Specialist & Code Auditor',
        placeholder: 'Identity of the AI',
        suggestions: [
          'Principal AI Engineering Specialist & Code Auditor',
          'Senior Executive Technical Copywriter',
          'Enterprise Architecture Security Reviewer',
          'Customer Success Autonomous Triage Agent',
        ],
      },
      {
        name: 'operational_domain',
        label: 'Domain & Context',
        value: 'Enterprise Software & Production DevOps',
        placeholder: 'Business or technical domain',
        suggestions: ['FinTech & Payment Infrastructure', 'Healthcare Data Compliance', 'Cloud Native Architecture', 'Developer Productivity'],
      },
      {
        name: 'tone_of_voice',
        label: 'Tone & Style',
        value: 'Authoritative, precise, concise, zero conversational padding',
        placeholder: 'Tone description',
        suggestions: [
          'Authoritative, precise, concise, zero conversational padding',
          'Empathetic, clear, consultative, solution-oriented',
          'Direct, high-density, mathematical rigor',
        ],
      },
      {
        name: 'output_schema',
        label: 'Output Schema & Format',
        value: 'Hierarchical Markdown with actionable bullet points and verified code fences',
        placeholder: 'How should output be delivered?',
        suggestions: [
          'Hierarchical Markdown with actionable bullet points and verified code fences',
          'Strict minified JSON adhering to typed schema',
          'Executive 3-paragraph summary with metric tables',
        ],
      },
    ];

    const baseTemplate = `# ROLE & IDENTITY
You are a {{agent_role}} operating in {{operational_domain}}.

# OBJECTIVE
${trimmed}

# TONE & COMMUNICATION
Tone: {{tone_of_voice}}

# OUTPUT SPECIFICATION
Format: {{output_schema}}

# NEGATIVE CONSTRAINTS
- Never include conversational filler, preamble ("Certainly!", "Here is..."), or closing pleasantries.
- Never invent citations, stats, or unverified claims.
- Return only production-grade, authoritative directives.
`;

    return {
      baseTemplate,
      detectedVariables: vars,
      domain: 'AI System Prompt',
    };
  }

  // 4. General / Generic Fallback
  const vars: WorkflowVariable[] = [
    {
      name: 'core_subject',
      label: 'Core Subject / Goal',
      value: trimmed.slice(0, 60),
      placeholder: 'Primary topic or task',
    },
    {
      name: 'target_audience',
      label: 'Target Audience',
      value: 'Professional Practitioners & Stakeholders',
      placeholder: 'Who is this for?',
      suggestions: ['Technical Practitioners', 'Executives & Founders', 'General Consumers', 'Students & Researchers'],
    },
    {
      name: 'style_and_tone',
      label: 'Tone & Style',
      value: 'High-utility, structured, concise, and rigorous',
      placeholder: 'Tone style',
      suggestions: ['High-utility & rigorous', 'Creative & engaging', 'Technical & code-first', 'Direct & actionable'],
    },
    {
      name: 'deliverable_format',
      label: 'Deliverable Format',
      value: 'Comprehensive structured guide with concrete examples',
      placeholder: 'Output format',
      suggestions: ['Structured Markdown Document', 'Working Code Prototype', 'Executive Summary Table', 'Step-by-Step Action Plan'],
    },
  ];

  const baseTemplate = `# CONTEXT
Domain expert task execution environment.

# OBJECTIVE
{{core_subject}}

# AUDIENCE & TONE
Audience: {{target_audience}}
Style: {{style_and_tone}}

# DELIVERABLE FORMAT
{{deliverable_format}}

# EXECUTION RULES
- Provide exhaustive, verifiable answers.
- Avoid vague qualifiers or placeholder comments.
`;

  return {
    baseTemplate,
    detectedVariables: vars,
    domain: 'General Task',
  };
}

export const PromptVariableWorkflow: React.FC<PromptVariableWorkflowProps> = ({
  userPrompt,
  selectedModel,
  onSelectModel,
  onExecute,
  isExecuting = false,
  onDismiss,
  isCompact: _isCompact = false,
}) => {
  // Analyze and discover domain template and variables
  const initialData = useMemo(() => deriveVariablesFromPrompt(userPrompt), [userPrompt]);

  const [baseTemplate, setBaseTemplate] = useState<string>(initialData.baseTemplate);
  const [variables, setVariables] = useState<WorkflowVariable[]>(initialData.detectedVariables);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState<boolean>(false);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState<boolean>(false);
  const [newVarName, setNewVarName] = useState<string>('');
  const [isAddingCustomVar, setIsAddingCustomVar] = useState<boolean>(false);

  // Sync if userPrompt changes meaningfully
  useEffect(() => {
    const next = deriveVariablesFromPrompt(userPrompt);
    setBaseTemplate(next.baseTemplate);
    setVariables(next.detectedVariables);
  }, [userPrompt]);

  // Update a single variable value
  const handleUpdateValue = (name: string, value: string) => {
    setVariables((prev) =>
      prev.map((v) => (v.name === name ? { ...v, value } : v))
    );
  };

  // Add custom variable
  const handleAddCustomVariable = () => {
    const clean = newVarName.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    if (!clean) return;
    if (!variables.some((v) => v.name === clean)) {
      const label = clean
        .replace(/_/g, ' ')
        .replace(/^./, (str) => str.toUpperCase());
      setVariables((prev) => [
        ...prev,
        {
          name: clean,
          label,
          value: '',
          placeholder: `Value for ${label}`,
        },
      ]);
      setBaseTemplate((prev) => `${prev}\n- ${label}: {{${clean}}}`);
    }
    setNewVarName('');
    setIsAddingCustomVar(false);
  };

  // Remove variable
  const handleRemoveVariable = (name: string) => {
    setVariables((prev) => prev.filter((v) => v.name !== name));
  };

  // Compute interpolated prompt
  const finalEnhancedPrompt = useMemo(() => {
    const valuesMap: Record<string, string> = {};
    for (const v of variables) {
      valuesMap[v.name] = v.value || v.placeholder || '';
    }
    return renderPromptTemplate(baseTemplate, valuesMap, { preserveUnresolved: false });
  }, [baseTemplate, variables]);

  // Get current model metadata
  const currentModelInfo: WorkspaceModelInfo = useMemo(() => {
    return WORKSPACE_MODELS.find((m: WorkspaceModelInfo) => m.id === selectedModel) || {
      id: selectedModel,
      label: selectedModel.split('/').pop() || selectedModel,
      badge: 'Auto',
      category: 'code',
      tier: 'free',
      providerName: 'OpenRouter',
      description: 'Production LLM',
    };
  }, [selectedModel]);

  // Handle final submission
  const handleRun = async () => {
    if (isExecuting) return;
    const valuesMap: Record<string, string> = {};
    for (const v of variables) {
      valuesMap[v.name] = v.value;
    }
    await onExecute(finalEnhancedPrompt, selectedModel, {
      rawPrompt: userPrompt,
      variables: valuesMap,
      enhancedPrompt: finalEnhancedPrompt,
    });
  };

  return (
    <div className="w-full rounded-2xl bg-bg-secondary border border-border-default shadow-md overflow-hidden animate-in fade-in duration-200 text-left my-3">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-bg-tertiary/60 border-b border-border-default flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-brand-primary shrink-0">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-text-primary tracking-tight">
                PromptHub Variable Customizer
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-brand-primary/15 text-brand-primary border border-brand-primary/25">
                {initialData.domain}
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5 truncate max-w-md sm:max-w-xl">
              Fill your requirements below to synthesize and execute with the selected LLM.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
            className="h-7 px-2.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Toggle synthesized prompt preview"
          >
            <Eye className="w-3 h-3" />
            <span>{isPreviewExpanded ? 'Hide Prompt' : 'Preview Prompt'}</span>
            {isPreviewExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="h-7 w-7 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Dismiss workflow"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Prompt Preview Pane */}
      {isPreviewExpanded && (
        <div className="px-4 py-3 bg-bg-primary/90 border-b border-border-default space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-text-muted font-bold tracking-wider">
              Synthesized Prompt (CO-STAR & Negative Constraints)
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
              Live Interpolated
            </span>
          </div>
          <pre className="p-3 rounded-xl bg-bg-tertiary border border-border-default font-mono text-[11px] text-text-primary whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {finalEnhancedPrompt}
          </pre>
        </div>
      )}

      {/* Interactive Variables Form */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {variables.map((variable) => (
            <div
              key={variable.name}
              className="p-3 rounded-xl bg-bg-tertiary/40 border border-border-default hover:border-border-hover transition-colors space-y-2"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  <span>{variable.label}</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-text-muted">
                    {`{{${variable.name}}}`}
                  </span>
                  {variables.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveVariable(variable.name)}
                      className="text-text-muted hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                      title="Remove variable"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Input Control */}
              <input
                type="text"
                value={variable.value}
                onChange={(e) => handleUpdateValue(variable.name, e.target.value)}
                placeholder={variable.placeholder || `Enter ${variable.label}`}
                className="w-full h-8 px-2.5 rounded-lg bg-bg-primary border border-border-default text-xs font-sans text-text-primary focus:outline-none focus:border-brand-primary transition-colors"
              />

              {/* Suggestions / Quick Chips */}
              {variable.suggestions && variable.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {variable.suggestions.map((suggestion) => {
                    const isSelected = variable.value === suggestion;
                    return (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleUpdateValue(variable.name, suggestion)}
                        className={`text-[10.5px] px-2 py-0.5 rounded-md font-mono transition-all cursor-pointer truncate max-w-full ${
                          isSelected
                            ? 'bg-brand-primary text-white font-medium shadow-2xs'
                            : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary border border-border-default'
                        }`}
                        title={suggestion}
                      >
                        {suggestion}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Custom Variable Row */}
        {isAddingCustomVar ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-bg-tertiary/60 border border-brand-primary/30">
            <span className="text-xs font-mono text-brand-primary font-bold">{'{{'}</span>
            <input
              type="text"
              autoFocus
              value={newVarName}
              onChange={(e) => setNewVarName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomVariable();
                } else if (e.key === 'Escape') {
                  setIsAddingCustomVar(false);
                }
              }}
              placeholder="variable_name (e.g. pricing_model)"
              className="flex-1 h-7 px-2 rounded-lg bg-bg-primary border border-border-default text-xs font-mono text-text-primary focus:outline-none focus:border-brand-primary"
            />
            <span className="text-xs font-mono text-brand-primary font-bold">{'}}'}</span>
            <button
              type="button"
              onClick={handleAddCustomVariable}
              className="h-7 px-2.5 rounded-lg bg-brand-primary text-white text-xs font-medium cursor-pointer"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAddingCustomVar(false)}
              className="h-7 px-2 rounded-lg bg-bg-secondary text-text-muted hover:text-text-primary text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingCustomVar(true)}
            className="text-xs text-brand-primary hover:text-brand-primary-hi font-medium inline-flex items-center gap-1.5 cursor-pointer py-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Variable</span>
          </button>
        )}

        {/* Bottom Execution Bar with Model Selector */}
        <div className="pt-3 border-t border-border-default flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Target Model Selector */}
          <div className="relative">
            <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">
              Executing Target LLM
            </div>
            <button
              type="button"
              onClick={() => setIsModelPickerOpen(!isModelPickerOpen)}
              className="h-8 px-2.5 rounded-lg bg-bg-primary hover:bg-bg-tertiary border border-border-default text-xs font-medium text-text-primary flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <ModelProviderLogo provider={currentModelInfo.providerName} modelId={currentModelInfo.id} size="sm" />
              <span className="truncate max-w-[140px] sm:max-w-[180px]">
                {currentModelInfo.label}
              </span>
              <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-bg-secondary border border-border-default">
                {currentModelInfo.badge}
              </span>
              <ChevronDown className="w-3 h-3 text-text-muted ml-0.5" />
            </button>

            {/* Model Picker Dropdown */}
            {isModelPickerOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-64 rounded-xl bg-bg-primary border border-border-default shadow-xl z-50 p-1.5 space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono text-text-muted uppercase font-bold border-b border-border-default">
                  Select Model
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {WORKSPACE_MODELS.map((m: WorkspaceModelInfo) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelectModel(m.id);
                        setIsModelPickerOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        m.id === selectedModel
                          ? 'bg-brand-primary text-white font-medium'
                          : 'hover:bg-bg-tertiary text-text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <ModelProviderLogo provider={m.providerName} modelId={m.id} size="sm" />
                        <span className="truncate">{m.label}</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-80 shrink-0">
                        {m.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Enhance & Run Button */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              disabled={isExecuting}
              onClick={handleRun}
              className="h-8 px-4 rounded-lg bg-brand-primary hover:bg-brand-primary-hi disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isExecuting ? 'Enhancing & Running...' : `Enhance More & Run (${currentModelInfo.label})`}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptVariableWorkflow;
