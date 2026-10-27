/**
 * src/data/workspaceDomains.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Multi-Domain Workspace Catalog & Starter Specifications.
 * Expands PromptHub Workspace across all core digital domains:
 *  - SaaS & Tech Startups
 *  - E-Commerce & Retail
 *  - Portfolios & Creators
 *  - Creative Agencies & Studios
 *  - Developer Docs & API Portals
 *  - Dashboards & Internal Tools
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type WorkspaceDomainCategory =
  | 'all'
  | 'saas'
  | 'ecommerce'
  | 'portfolio'
  | 'agency'
  | 'docs'
  | 'dashboard';

export interface WorkspaceDomainInfo {
  id: WorkspaceDomainCategory;
  label: string;
  shortLabel: string;
  iconName: string;
  description: string;
  sampleCount: number;
}

export interface WorkspaceStarterPrompt {
  id: string;
  title: string;
  domain: WorkspaceDomainCategory;
  badge: string;
  description: string;
  prompt: string;
  features: string[];
  accentColor: string;
  recommendedModel: string;
}

export const WORKSPACE_DOMAINS: WorkspaceDomainInfo[] = [
  {
    id: 'all',
    label: 'All Domains',
    shortLabel: 'All',
    iconName: 'Globe',
    description: 'Explore all real-world templates and starter briefs',
    sampleCount: 12,
  },
  {
    id: 'saas',
    label: 'SaaS & Startups',
    shortLabel: 'SaaS',
    iconName: 'Zap',
    description: 'High-converting landing pages, interactive product demos, pricing matrices',
    sampleCount: 2,
  },
  {
    id: 'ecommerce',
    label: 'E-Commerce & Retail',
    shortLabel: 'E-Commerce',
    iconName: 'ShoppingBag',
    description: 'Product storefronts, catalog filters, shopping cart drawers, checkout flows',
    sampleCount: 2,
  },
  {
    id: 'portfolio',
    label: 'Portfolios & Creators',
    shortLabel: 'Portfolio',
    iconName: 'Code2',
    description: 'Developer showcases, designer case studies, interactive resume sites',
    sampleCount: 2,
  },
  {
    id: 'agency',
    label: 'Agencies & Studios',
    shortLabel: 'Agency',
    iconName: 'Palette',
    description: 'Client case studies, service offerings, interactive pitch inquiry forms',
    sampleCount: 2,
  },
  {
    id: 'docs',
    label: 'Developer Docs',
    shortLabel: 'Docs',
    iconName: 'BookOpen',
    description: 'API reference guides, multi-language code sandboxes, token registries',
    sampleCount: 2,
  },
  {
    id: 'dashboard',
    label: 'Dashboards & Tools',
    shortLabel: 'Dashboard',
    iconName: 'LayoutDashboard',
    description: 'Revenue operations, user cohort analytics, cloud infrastructure monitors',
    sampleCount: 2,
  },
];

export const WORKSPACE_STARTER_PROMPTS: WorkspaceStarterPrompt[] = [
  // ── 1. SaaS & Tech Startups ──────────────────────────────────────────────
  {
    id: 'starter_saas_copilot',
    title: 'AI Copilot & Workflow Automation SaaS',
    domain: 'saas',
    badge: 'B2B SaaS',
    description: 'Sleek dark landing page with interactive prompt simulator, bento feature grid, and pricing calculator.',
    prompt: 'Build a high-converting B2B SaaS landing page for an AI Automation Copilot named "Synapse AI". Include a hero section with an interactive prompt execution simulator, a 4-item bento grid highlighting workflow features, an interactive annual vs monthly pricing toggle with tiered feature checklist, and client logo cloud.',
    features: ['Live Prompt Simulator', 'Annual / Monthly Toggle', 'Bento Feature Grid'],
    accentColor: '#6A89A7',
    recommendedModel: 'openrouter/free',
  },
  {
    id: 'starter_saas_devops',
    title: 'Cloud Orchestrator & DevOps Platform',
    domain: 'saas',
    badge: 'Developer Tool',
    description: 'Terminal-themed developer landing with live CLI snippet builder, architecture graph, and latency benchmarks.',
    prompt: 'Design a developer-first SaaS platform landing for "KubeStream", an automated Kubernetes deployment pipeline. Include an interactive CLI terminal where users can test deploy commands, a real-time latency comparison chart against legacy CI/CD, and an enterprise security compliance badge strip.',
    features: ['Interactive CLI Terminal', 'Benchmark Comparison', 'Enterprise Compliance Strip'],
    accentColor: '#384959',
    recommendedModel: 'openrouter/free',
  },

  // ── 2. E-Commerce & Retail ───────────────────────────────────────────────
  {
    id: 'starter_ecom_apparel',
    title: 'Artisanal Streetwear & Apparel Store',
    domain: 'ecommerce',
    badge: 'Storefront',
    description: 'Minimalist editorial fashion store with category filters, dynamic cart drawer, and quick product modal.',
    prompt: 'Create a modern minimalist e-commerce storefront for an artisanal Japanese streetwear brand named "KURO Studio". Include a filterable collection grid (Hoodies, Denim, Accessories), product cards with hover color swatches, an interactive sliding shopping cart drawer with price subtotals, and a size guide modal.',
    features: ['Filterable Product Grid', 'Sliding Cart Drawer', 'Color Swatches & Size Guide'],
    accentColor: '#1F2A34',
    recommendedModel: 'openrouter/free',
  },
  {
    id: 'starter_ecom_roastery',
    title: 'Single-Origin Specialty Roastery',
    domain: 'ecommerce',
    badge: 'Subscription',
    description: 'Rich warm specialty coffee shop with interactive flavor profile radar, roast picker, and subscription builder.',
    prompt: 'Build a specialty coffee roaster website for "Aura Coffee Labs" featuring single-origin beans. Include an interactive flavor note radar selector (Floral, Fruity, Chocolate, Nutty), a custom coffee subscription frequency builder (Weekly, Bi-weekly, Monthly) with grind type selection, and customer tasting reviews.',
    features: ['Flavor Profile Radar', 'Subscription Frequency Builder', 'Grind Type Selector'],
    accentColor: '#88BDF2',
    recommendedModel: 'openrouter/free',
  },

  // ── 3. Portfolios & Creators ─────────────────────────────────────────────
  {
    id: 'starter_portfolio_ai_eng',
    title: 'Senior AI Engineer & Systems Architect',
    domain: 'portfolio',
    badge: 'Engineer',
    description: 'Interactive terminal-hybrid portfolio with live system telemetry, GitHub project repo cards, and tech stack tags.',
    prompt: 'Create an impressive personal portfolio for a Senior AI & Distributed Systems Engineer. Include an interactive terminal header showing uptime and recent model training runs, highlighted deep learning project cards with metrics (e.g. 99.4% precision, 42ms p99), an interactive skills matrix, and a direct contact form.',
    features: ['Live Terminal Telemetry', 'Production Project Metrics', 'Interactive Skills Matrix'],
    accentColor: '#6A89A7',
    recommendedModel: 'openrouter/free',
  },
  {
    id: 'starter_portfolio_creative_dir',
    title: 'Design Executive & Creative Technologist',
    domain: 'portfolio',
    badge: 'Design Studio',
    description: 'Editorial typographic portfolio with full-screen project previews, magnetic cursor cards, and client roster.',
    prompt: 'Design an editorial high-craft portfolio for a Design Executive and Digital Art Director. Feature large typographic headlines in Outfit font, an asymmetric bento grid of featured brand identities, interactive before/after case study comparison sliders, and a client roster including Fortune 500 tech companies.',
    features: ['Editorial Asymmetry', 'Case Study Comparison', 'Interactive Client Roster'],
    accentColor: '#BDDDFC',
    recommendedModel: 'openrouter/free',
  },

  // ── 4. Agencies & Studios ────────────────────────────────────────────────
  {
    id: 'starter_agency_digital',
    title: 'High-Impact Digital Product Agency',
    domain: 'agency',
    badge: 'Product Agency',
    description: 'Modern studio agency page with interactive project reels, service breakdown, and project budget estimator.',
    prompt: 'Build a full website for a high-end digital design and engineering agency named "Form & Function Studio". Include a dynamic case study grid with video preview mockups, a 4-phase delivery process accordion (Discover, Prototype, Build, Scale), an interactive project inquiry budget estimator, and team leadership bios.',
    features: ['Interactive Budget Estimator', '4-Phase Process Accordion', 'Client Impact Reel'],
    accentColor: '#384959',
    recommendedModel: 'openrouter/free',
  },
  {
    id: 'starter_agency_growth',
    title: 'Growth & Performance Marketing Lab',
    domain: 'agency',
    badge: 'Growth Lab',
    description: 'Data-driven agency layout with live ROI calculator, client revenue growth benchmarks, and audit scheduler.',
    prompt: 'Create an agency website for "HyperScale Growth Partners", a performance marketing and CRO agency. Include an interactive marketing ROI and ad-spend revenue calculator, verified case studies with percentage uplift badges (+314% conversion), client video testimonials, and an instant audit scheduler widget.',
    features: ['Interactive ROI Calculator', 'Case Study Uplift Badges', 'Audit Scheduler Widget'],
    accentColor: '#88BDF2',
    recommendedModel: 'openrouter/free',
  },

  // ── 5. Developer Docs & API Portals ──────────────────────────────────────
  {
    id: 'starter_docs_api',
    title: 'Developer API & SDK Documentation Portal',
    domain: 'docs',
    badge: 'API Reference',
    description: 'Multi-pane API docs with language selector (cURL, Python, TS), live request runner, and JSON response sandbox.',
    prompt: 'Build an interactive developer documentation portal for a REST & GraphQL Payments API named "VaultPay API". Include a sticky 3-column layout (sidebar navigation, documentation markdown with parameter tables, live code snippet container with cURL / Python / Node tabs), and an interactive "Try It Live" request test console with JSON response highlighting.',
    features: ['Multi-Language Code Tabs', 'Interactive Request Console', 'Response JSON Highlighting'],
    accentColor: '#6A89A7',
    recommendedModel: 'openrouter/free',
  },
  {
    id: 'starter_docs_design_system',
    title: 'Design System & Component Library Portal',
    domain: 'docs',
    badge: 'Design System',
    description: 'Living design system documentation with interactive component sandbox, color token table, and accessibility specs.',
    prompt: 'Create a comprehensive Design System documentation site for "Slate UI". Include an interactive button and input playground with real-time prop toggles (variant, size, disabled, state), a design tokens reference table with 1-click hex copy, typography hierarchy scale preview, and WCAG AA accessibility notes.',
    features: ['Interactive Prop Playground', '1-Click Token Copy', 'Accessibility Guidelines'],
    accentColor: '#BDDDFC',
    recommendedModel: 'openrouter/free',
  },

  // ── 6. Dashboards & Internal Tools ───────────────────────────────────────
  {
    id: 'starter_dashboard_revenue',
    title: 'SaaS Revenue Operations & Cohort Dashboard',
    domain: 'dashboard',
    badge: 'RevOps Dashboard',
    description: 'Executive SaaS dashboard with MRR/ARR velocity cards, churn analytics graph, and searchable customer table.',
    prompt: 'Develop an interactive executive dashboard for a SaaS company tracking Revenue Operations. Include high-level KPI cards (MRR, Net Retention Rate, LTV, Churn Rate) with sparkline trends, a monthly recurring revenue breakdown chart, customer renewal cohort matrix, and a searchable/filterable subscriptions table with status badges.',
    features: ['KPI Cards with Sparklines', 'Revenue Trend Visualizer', 'Searchable Subscription Table'],
    accentColor: '#384959',
    recommendedModel: 'openrouter/free',
  },
  {
    id: 'starter_dashboard_infra',
    title: 'Cloud Infrastructure & Incident Monitor',
    domain: 'dashboard',
    badge: 'System Monitor',
    description: 'Real-time infrastructure health dashboard with cluster latency heatmaps, incident status toggles, and live log stream.',
    prompt: 'Build a mission-critical Cloud Infrastructure Status and Incident Response dashboard. Include global region cluster health indicators (US-East, EU-Central, AP-South), real-time p99 API latency heatmaps, an active incident alert banner with severity toggles (P0-P3), and a live simulated deployment and error log stream.',
    features: ['Global Region Health Gauges', 'p99 Latency Heatmap', 'Live Simulated Event Stream'],
    accentColor: '#88BDF2',
    recommendedModel: 'openrouter/free',
  },
];
