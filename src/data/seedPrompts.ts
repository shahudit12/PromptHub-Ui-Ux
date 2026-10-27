import type { Prompt, Collection } from '../db/schema';
import { CURATED_ADMIN_PROMPTS } from './curatedAdminPrompts';
import { MASTER_PROMPTS } from './masterPrompts';

const ADMIN_AUTHOR_ID = 'admin';
const ADMIN_AUTHOR_NAME = 'PromptHub Admin';
const ADMIN_AUTHOR_AVATAR = '/admin-avatar.png';

const BASE_DEV_PROMPTS: Prompt[] = [
  {
    id: 'seed-prompt-01',
    title: 'Senior Next.js 15 & React 19 Architect',
    description: 'Generates production-ready, type-safe Next.js 15 App Router components with Server Actions, optimistic UI, and Tailwind styling.',
    rawContent: `You are an elite Senior Full-Stack Engineer and Next.js 15 App Router specialist.

Your task is to implement the following feature: {{feature_description}}

Strict Requirements:
1. Use React 19 features (useActionState, useOptimistic, Server Actions).
2. Adhere to TypeScript strict mode with zero 'any'.
3. Follow idiomatic Next.js 15 caching and streaming conventions (Suspense boundaries, loading.tsx).
4. Apply modern Tailwind CSS v4 styling with accessible ARIA semantics.
5. Provide comprehensive error boundaries and edge-case handling.

Target Framework: {{framework_version}}
Preferred State Strategy: {{state_strategy}}`,
    variables: [
      { name: 'feature_description', defaultValue: 'Multi-tenant team invitation modal with role selection and instant email validation', description: 'Description of the UI feature to generate' },
      { name: 'framework_version', defaultValue: 'Next.js 15.2 + React 19', description: 'Framework and runtime target' },
      { name: 'state_strategy', defaultValue: 'Server Actions + useActionState', description: 'State handling approach' },
    ],
    category: 'Development',
    tags: ['Next.js', 'React 19', 'TypeScript', 'Tailwind', 'Frontend'],
    model: 'anthropic/claude-3.7-sonnet',
    visibility: 'public',
    authorId: ADMIN_AUTHOR_ID,
    authorName: ADMIN_AUTHOR_NAME,
    authorAvatar: ADMIN_AUTHOR_AVATAR,
    likesCount: 0,
    forksCount: 0,
    viewsCount: 0,
    copiesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    isPremium: false,
    priceInr: 0,
    difficulty: 'Advanced',
    versionCount: 1,
    assetType: 'prompt',
    license: 'MIT',
    status: 'active',
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-02-20T14:30:00.000Z',
  },
  {
    id: 'seed-prompt-02',
    title: 'Autonomous ReAct Agent Decision Engine',
    description: 'Structured system instruction enabling LLMs to reason step-by-step, call external tools, and parse JSON actions reliably.',
    rawContent: `You are an autonomous ReAct (Reasoning + Acting) Agent operating within the {{domain}} environment.

Available Tools:
{{available_tools}}

Cycle Protocol:
1. THOUGHT: Break down the current goal and reason through observations.
2. ACTION: Choose a specific tool and provide JSON parameters.
3. OBSERVATION: Interpret the response from the tool execution.
4. FINAL ANSWER: When the task is complete, present the final verified solution.

Constraint: Never invent tool outputs. Always output action calls as valid RFC 8259 JSON blocks.`,
    variables: [
      { name: 'domain', defaultValue: 'Cloud Infrastructure & DevOps Diagnostics', description: 'Operational domain for the agent' },
      { name: 'available_tools', defaultValue: 'read_logs(service, timeframe), restart_pod(pod_id), query_metrics(metric_name)', description: 'Tools provided to the agent' },
    ],
    category: 'Development',
    tags: ['ReAct', 'Agent', 'Tool Calling', 'Reasoning', 'JSON'],
    model: 'google/gemini-2.0-flash',
    visibility: 'public',
    authorId: ADMIN_AUTHOR_ID,
    authorName: ADMIN_AUTHOR_NAME,
    authorAvatar: ADMIN_AUTHOR_AVATAR,
    likesCount: 0,
    forksCount: 0,
    viewsCount: 0,
    copiesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    isPremium: false,
    priceInr: 0,
    difficulty: 'Advanced',
    versionCount: 1,
    assetType: 'prompt',
    license: 'MIT',
    status: 'active',
    createdAt: '2025-01-20T08:00:00.000Z',
    updatedAt: '2025-03-01T11:15:00.000Z',
  },
  {
    id: 'seed-prompt-03',
    title: 'Deterministic PostgreSQL Query Optimizer & Index Planner',
    description: 'Analyzes query execution plans (EXPLAIN ANALYZE), eliminates sequential scans, and suggests optimal composite indexes.',
    rawContent: `You are an expert PostgreSQL Database Architect and Performance Engineer.

Analyze the provided SQL query and execution plan:
SQL Query:
\`\`\`sql
{{sql_query}}
\`\`\`

Execution Plan:
\`\`\`
{{explain_analyze_plan}}
\`\`\`

Provide:
1. Root cause of execution bottlenecks (Seq Scans, Disk Spills, Hash Joins).
2. Rewritten optimized SQL query.
3. Exact CREATE INDEX CONCURRENTLY statements with partial/composite reasoning.
4. Estimated latency improvement percentage.`,
    variables: [
      { name: 'sql_query', defaultValue: 'SELECT o.id, o.total, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.created_at >= NOW() - INTERVAL \'30 days\' ORDER BY o.total DESC LIMIT 50;', description: 'Slow SQL query' },
      { name: 'explain_analyze_plan', defaultValue: 'Seq Scan on orders (cost=0.00..4520.00 rows=15200 width=32) (actual time=0.045..24.120 rows=15100 loops=1)', description: 'EXPLAIN output' },
    ],
    category: 'Development',
    tags: ['PostgreSQL', 'SQL', 'Database', 'Performance', 'Indexing'],
    model: 'openai/gpt-4o',
    visibility: 'public',
    authorId: ADMIN_AUTHOR_ID,
    authorName: ADMIN_AUTHOR_NAME,
    authorAvatar: ADMIN_AUTHOR_AVATAR,
    likesCount: 0,
    forksCount: 0,
    viewsCount: 0,
    copiesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    isPremium: false,
    priceInr: 0,
    difficulty: 'Intermediate',
    versionCount: 1,
    assetType: 'prompt',
    license: 'MIT',
    status: 'active',
    createdAt: '2025-02-05T12:00:00.000Z',
    updatedAt: '2025-02-28T09:20:00.000Z',
  },
  {
    id: 'seed-prompt-04',
    title: 'High-Converting SaaS Value Proposition & Hero Copy',
    description: 'Crafts persuasive, clear, jargon-free hero headlines, subheadlines, and CTAs utilizing proven conversion frameworks.',
    rawContent: `You are a world-class Direct Response SaaS Copywriter and Conversion Rate Optimization (CRO) strategist.

Product Name: {{product_name}}
Target Audience: {{target_persona}}
Key Differentiator: {{core_value_prop}}
Primary Pain Point: {{pain_point}}

Generate 3 distinct Hero Section variations:
- Option A: Clear & Direct (Focus on velocity and tangible outcome)
- Option B: Pain-Agitation-Solution (Focus on the frustration of existing tools)
- Option C: Social Proof & Category Contrarian (Focus on market shift)

For each option, provide:
1. Eyebrow Tagline
2. H1 Headline (max 8 words, Punchy)
3. Subheadline (max 2 sentences)
4. Primary CTA button copy & Micro-friction reducer (e.g. "No credit card required")`,
    variables: [
      { name: 'product_name', defaultValue: 'PromptHub', description: 'Name of the SaaS product' },
      { name: 'target_persona', defaultValue: 'AI Engineers, Prompt Engineers, and LLM Application Builders', description: 'Target user persona' },
      { name: 'core_value_prop', defaultValue: 'Test prompts against live models with live token cost and deterministic quality audits', description: 'Unique advantage' },
      { name: 'pain_point', defaultValue: 'Losing prompts in Slack and messy spreadsheets with zero version control or cost tracking', description: 'Primary customer pain' },
    ],
    category: 'Marketing',
    tags: ['Copywriting', 'SaaS', 'Marketing', 'Landing Page', 'Conversion'],
    model: 'openai/gpt-4o',
    visibility: 'public',
    authorId: ADMIN_AUTHOR_ID,
    authorName: ADMIN_AUTHOR_NAME,
    authorAvatar: ADMIN_AUTHOR_AVATAR,
    likesCount: 0,
    forksCount: 0,
    viewsCount: 0,
    copiesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    isPremium: false,
    priceInr: 0,
    difficulty: 'Beginner',
    versionCount: 1,
    assetType: 'prompt',
    license: 'MIT',
    status: 'active',
    createdAt: '2025-01-28T15:00:00.000Z',
    updatedAt: '2025-03-02T16:45:00.000Z',
  },
  {
    id: 'seed-prompt-05',
    title: 'Zero-Shot Structured Pydantic & JSON Data Extractor',
    description: 'Extracts clean, strictly typed, validated nested JSON from messy unstructured text, PDFs, or web transcripts.',
    rawContent: `You are an expert Data Ingestion Engine. Your sole duty is to extract structured entities from the input text and format them strictly according to this schema.

Schema Definition:
\`\`\`json
{{target_schema}}
\`\`\`

Input Text to Process:
"""
{{input_text}}
"""

Rules:
- Output ONLY pure JSON.
- Never include conversational markdown wrappers or introductory prose.
- For missing fields, use null or appropriate empty types.
- Ensure all dates conform to ISO-8601 UTC format.`,
    variables: [
      { name: 'target_schema', defaultValue: '{\n  "entities": [\n    { "name": "string", "role": "string", "company": "string", "email": "string|null" }\n  ],\n  "summary": "string"\n}', description: 'Target JSON Schema' },
      { name: 'input_text', defaultValue: 'During our Q3 briefing, Sarah Jenkins (Head of AI at Veloce Corp, s.jenkins@veloce.io) announced our strategic migration to Gemini 1.5 Pro alongside Marcus Vance from DataCore.', description: 'Raw unstructured input' },
    ],
    category: 'Development',
    tags: ['JSON', 'Data Extraction', 'Pydantic', 'Automation', 'ETL'],
    model: 'openai/o3-mini',
    visibility: 'public',
    authorId: ADMIN_AUTHOR_ID,
    authorName: ADMIN_AUTHOR_NAME,
    authorAvatar: ADMIN_AUTHOR_AVATAR,
    likesCount: 0,
    forksCount: 0,
    viewsCount: 0,
    copiesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    isPremium: false,
    priceInr: 0,
    difficulty: 'Intermediate',
    versionCount: 1,
    assetType: 'prompt',
    license: 'MIT',
    status: 'active',
    createdAt: '2025-02-10T11:00:00.000Z',
    updatedAt: '2025-03-01T10:00:00.000Z',
  },
  {
    id: 'seed-prompt-06',
    title: 'Academic Literature Review & Methodology Synthesizer',
    description: 'Synthesizes conflicting research findings, extracts core methodologies, and formats citations for peer-reviewed research papers.',
    rawContent: `You are a distinguished Academic Research Scholar and Peer Reviewer in {{academic_field}}.

Given the following research abstract or literature notes:
{{research_notes}}

Generate a rigorous Literature Review section:
1. Conceptual Framework & Thematic Grouping
2. Methodological Divergences (sample sizes, instruments, boundary conditions)
3. Synthesis Matrix of Findings
4. Identification of Empirical Gaps for Future Research
5. Formal Academic Tone with APA 7th style citations.`,
    variables: [
      { name: 'academic_field', defaultValue: 'Natural Language Processing & LLM Safety Evaluation', description: 'Scientific domain' },
      { name: 'research_notes', defaultValue: 'Recent studies on jailbreak defense mechanisms: Wei et al. (2024) evaluate circuit breakers in weights; Zou et al. (2023) demonstrate transferability of adversarial suffixes across open and closed models.', description: 'Research notes or paper citations' },
    ],
    category: 'Education',
    tags: ['Academic', 'Research', 'Literature Review', 'Synthesis', 'Paper'],
    model: 'google/gemini-1.5-pro',
    visibility: 'public',
    authorId: ADMIN_AUTHOR_ID,
    authorName: ADMIN_AUTHOR_NAME,
    authorAvatar: ADMIN_AUTHOR_AVATAR,
    likesCount: 0,
    forksCount: 0,
    viewsCount: 0,
    copiesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    isPremium: false,
    priceInr: 0,
    difficulty: 'Advanced',
    versionCount: 1,
    assetType: 'prompt',
    license: 'MIT',
    status: 'active',
    createdAt: '2025-02-14T09:30:00.000Z',
    updatedAt: '2025-02-27T17:10:00.000Z',
  }
];

export const INITIAL_SEED_PROMPTS: Prompt[] = [
  ...BASE_DEV_PROMPTS,
  ...CURATED_ADMIN_PROMPTS,
  ...MASTER_PROMPTS,
];

export const INITIAL_SEED_COLLECTIONS: Collection[] = [
  {
    id: 'col-core-engineering',
    name: 'Production Engineering & Architecture',
    description: 'Curated system prompts for modern TypeScript, React 19, Next.js, and database optimization.',
    authorId: ADMIN_AUTHOR_ID,
    isPrivate: false,
    promptIds: ['seed-prompt-01', 'seed-prompt-03', 'seed-prompt-05'],
    createdAt: '2025-01-16T10:00:00.000Z',
  },
  {
    id: 'col-agentic-workflows',
    name: 'Autonomous Agents & ReAct Reasoning',
    description: 'Industrial tool-calling prompts, JSON parsers, and multi-step reasoning architectures.',
    authorId: ADMIN_AUTHOR_ID,
    isPrivate: false,
    promptIds: ['seed-prompt-02', 'seed-prompt-05'],
    createdAt: '2025-01-22T14:00:00.000Z',
  },
  {
    id: 'col-research-analysis',
    name: 'Research & Data Analysis Suite',
    description: 'RACE & PARTS framework prompts for academic synthesis, literature reviews, and empirical data analysis.',
    authorId: ADMIN_AUTHOR_ID,
    isPrivate: false,
    promptIds: ['research-data-analysis-001', 'research-data-analysis-002', 'research-data-analysis-003'],
    createdAt: '2025-02-01T10:00:00.000Z',
  },
  {
    id: 'col-customer-support',
    name: 'Customer Support & Escalations',
    description: 'High-empathy, de-escalation, and dispute resolution prompts for modern support teams.',
    authorId: ADMIN_AUTHOR_ID,
    isPrivate: false,
    promptIds: ['customer-support-001', 'customer-support-002', 'customer-support-003'],
    createdAt: '2025-02-01T10:00:00.000Z',
  },
  {
    id: 'col-sales-ecommerce',
    name: 'Sales & E-Commerce Conversions',
    description: 'Conversion-engineered cold outreach, product copy, and buyer persona positioning.',
    authorId: ADMIN_AUTHOR_ID,
    isPrivate: false,
    promptIds: ['sales-ecommerce-001', 'sales-ecommerce-002', 'sales-ecommerce-003'],
    createdAt: '2025-02-01T10:00:00.000Z',
  }
];
