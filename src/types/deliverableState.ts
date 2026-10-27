import type { AdDeliverableData } from '../components/workspace/deliverables/AdDeliverableCard';
import type { ReportDeliverableData } from '../components/workspace/deliverables/ReportDeliverableCard';
import type { DataTableDeliverableData } from '../components/workspace/deliverables/DataTableDeliverableCard';
import type { CodeAppDeliverableData } from '../components/workspace/deliverables/CodeAppDeliverableCard';
import type { PresentationDeliverableData } from '../components/workspace/deliverables/PresentationDeliverableCard';
import type { VideoStoryboardData } from '../components/workspace/deliverables/VideoStoryboardDeliverableCard';
import type { DeliverableVersion } from '../components/workspace/deliverables/DeliverableVersionPills';
import type { DeliverableType } from '../services/ai/intentClassifier';
import type { WorkspaceAttachment } from '../utils/workspaceAttachmentEngine';

export interface DeliverableSnapshot {
  adData?: AdDeliverableData;
  reportData?: ReportDeliverableData;
  tableData?: DataTableDeliverableData;
  codeAppData?: CodeAppDeliverableData;
  presentationData?: PresentationDeliverableData;
  videoData?: VideoStoryboardData;
}

export interface DeliverableBundle {
  type: DeliverableType;
  version: number;
  versions: DeliverableVersion[];
  history?: Record<number, DeliverableSnapshot>;
  adData?: AdDeliverableData;
  reportData?: ReportDeliverableData;
  tableData?: DataTableDeliverableData;
  codeAppData?: CodeAppDeliverableData;
  presentationData?: PresentationDeliverableData;
  videoData?: VideoStoryboardData;
}

export interface WorkspaceChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  deliverable?: DeliverableBundle;
  attachments?: WorkspaceAttachment[];
  options?: any[];
  portfolioConcepts?: any[];
  result?: any;
  downstreamTasks?: any[];
  suggestedFollowUps?: string[];
  teamStep?: string;
}

/**
 * Generate a realistic initial Ad Deliverable matching user query and optional image attachment.
 */
export function createAdDeliverable(
  prompt: string,
  imageAttachment?: WorkspaceAttachment
): AdDeliverableData {
  const lower = prompt.toLowerCase();
  const brandMatch = prompt.match(/\bfor ([A-Z][a-zA-Z0-9\s&]{2,25})\b/);
  const brandName = brandMatch ? brandMatch[1].trim() : 'AuraCraft Studios';

  const isSneaker = lower.includes('sneaker') || lower.includes('shoe') || lower.includes('footwear');
  const isCoffee = lower.includes('coffee') || lower.includes('brew') || lower.includes('cafe');
  const isSaaS = lower.includes('saas') || lower.includes('software') || lower.includes('platform');

  let headline = 'Elevate Your Daily Ritual with Precision Craftsmanship.';
  let primaryCopy =
    'Engineered for relentless focus and all-day comfort. Crafted with ethically sourced sustainable materials and modern ergonomic architecture.';
  let ctaText = 'Shop Now • Free Shipping';
  let discountTag = 'WELCOME15 • 15% OFF FIRST ORDER';

  if (isSneaker) {
    headline = 'Next-Gen Ergonomic Performance. Zero Gravity Comfort.';
    primaryCopy =
      'Engineered with dual-density cloud foam and breathable recycled knit mesh. Designed for city commuters, creators, and athletes who demand all-day resilience.';
    ctaText = 'Shop CloudKnit Sneakers';
    discountTag = 'SNEAK20 • 20% OFF LAUNCH EDITION';
  } else if (isCoffee) {
    headline = 'Zero Sugar. Pure Energy. Brewed for Deep Focus.';
    primaryCopy =
      'Organic single-origin beans slow-steeped for 18 hours and infused with organic lion’s mane mushroom. Silky smooth, jitter-free vitality in every bottle.';
    ctaText = 'Claim 20% Off Box';
    discountTag = 'FOCUS20 • 20% OFF STARTER PACK';
  } else if (isSaaS) {
    headline = 'Automate Your Deliverables in One Conversational Feed.';
    primaryCopy =
      'Turn complex briefs into complete campaigns, reports, data models, and interactive prototypes with autonomous routing and zero tool friction.';
    ctaText = 'Start Free Trial';
    discountTag = 'SCALE30 • 30% OFF ANNUAL PLANS';
  }

  const imageUrl =
    imageAttachment?.previewUrl ||
    (isSneaker
      ? 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80'
      : isCoffee
      ? 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80'
      : 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80');

  return {
    brandName,
    brandTagline: 'Engineered for Performance & Aesthetics',
    headline,
    primaryCopy,
    discountTag,
    ctaText,
    ctaUrl: 'https://prompthub.cloud',
    imageUrl,
    aspectRatio: '1:1',
    version: 1,
    versions: [
      {
        version: 1,
        label: 'v1',
        summary: 'Initial high-converting social creative',
        timestamp: Date.now(),
      },
    ],
    headlineVariants: [
      { id: 'h1', type: 'punchy', text: headline },
      { id: 'h2', type: 'benefit', text: `Experience ${brandName}: Peak Output Without Compromise.` },
      { id: 'h3', type: 'urgency', text: 'Limited Batch Available. Claim Yours Before Sold Out.' },
    ],
    copyVariants: [
      { id: 'c1', type: 'short', label: 'Short & Punchy (Social)', text: `${headline} ${discountTag}.`, wordCount: 15 },
      { id: 'c2', type: 'medium', label: 'Standard Ad Feed', text: primaryCopy, wordCount: 35 },
    ],
    targeting: {
      targetAudience: 'High-performing creators, modern founders & professionals (24–42)',
      demographics: ['Age: 24–42', 'Location: Tier 1 Metros', 'High Tech Affinity'],
      interests: ['Productivity', 'Minimalist Design', 'Sustainable Lifestyle', 'E-commerce Innovations'],
      platforms: ['Instagram Feed & Stories', 'Meta Advantage+ Feed', 'LinkedIn Sponsored Content'],
      placementHooks: ['Thumb-stopping visual mockup', 'First 3 seconds value anchor', 'Social proof badges'],
      hashtags: ['#InnovateDaily', '#CreatorTools', '#Craftsmanship', '#PromptHub'],
    },
  };
}

/**
 * Generate a realistic initial Report Deliverable matching user query.
 */
export function createReportDeliverable(
  prompt: string,
  docAttachment?: WorkspaceAttachment
): ReportDeliverableData {
  const isTransformation = prompt.toLowerCase().includes('transformation') || prompt.toLowerCase().includes('roadmap') || prompt.toLowerCase().includes('ops');
  const title = isTransformation
    ? '90-Day AI Transformation Roadmap & Customer Operations Strategy'
    : 'Executive Strategic Assessment: AI Engineering Velocity & Infrastructure ROI';

  return {
    title,
    subtitle: 'Comprehensive multi-phase operational blueprint, KPI benchmarks, and risk mitigation framework',
    readingTimeMinutes: 6,
    generatedDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    authorModel: 'DeepSeek R1 (Frontier Reasoning)',
    executiveSummary:
      'This strategic blueprint outlines an actionable 90-day operational model to integrate autonomous AI workflows across organization units. By moving from manual handoffs to autonomous outcome routing, the team projects a 42% reduction in cycle latency, 15% operating margin expansion, and zero regression in output quality.',
    version: 1,
    versions: [
      {
        version: 1,
        label: 'v1',
        summary: 'Initial executive briefing & phase breakdown',
        timestamp: Date.now(),
      },
    ],
    kpis: [
      { id: 'k1', label: 'Efficiency Gain', value: '+42%', change: '+12% vs prior Q', trend: 'up', description: 'Reduction in turn-around cycle time' },
      { id: 'k2', label: 'Cost Reduction', value: '₹3.4M', change: '-28% run-rate', trend: 'up', description: 'Annualized cloud & tooling savings' },
      { id: 'k3', label: 'First-Turn Accuracy', value: '94.8%', change: '+6.2%', trend: 'up', description: 'Client acceptance rate without rework' },
      { id: 'k4', label: 'Deployment Risk', value: 'Low', change: 'OWASP Clean', trend: 'neutral', description: 'Zero high-severity vulnerabilities' },
    ],
    sections: [
      {
        id: 'sec_1',
        title: 'Phase 1: Foundation & Telemetry Ingestion (Days 1–30)',
        badge: 'Foundation',
        defaultExpanded: true,
        content:
          'Audit existing manual bottlenecks across customer onboarding, document generation, and triage. Establish unified multimodal attachment ingestion and implement client-side data extraction with zero external server dependencies.',
        keyTakeaways: [
          'Unify 5 disparate tool subscriptions into a single outcome workspace',
          'Deploy client-side data sanitization and magic-byte header inspection',
          'Institute zero-modal friction for all 0-credit free open models',
        ],
      },
      {
        id: 'sec_2',
        title: 'Phase 2: Autonomous Intent Routing & Execution (Days 31–60)',
        badge: 'Execution',
        defaultExpanded: true,
        content:
          'Activate autonomous intent classification. Automatically route vision tasks to Gemini 2.0 Flash, complex analytical reports to DeepSeek R1, and interactive web applications to Qwen 2.5 Coder 32B.',
        keyTakeaways: [
          'Eliminate manual model dropdown confusion for non-technical teammates',
          'Encapsulate advanced parameters into on-demand Developer Mode Drawer',
          'Enforce strict confirmation guardrails before paid credit deductions',
        ],
      },
      {
        id: 'sec_3',
        title: 'Phase 3: Continuous Governance & Multi-Turn Versioning (Days 61–90)',
        badge: 'Governance',
        defaultExpanded: false,
        content:
          'Roll out granular version tracking tabs [v1, v2, v3] across all deliverables. Enable instant diff rollback and direct spec patch updates without full rebuild re-runs.',
        keyTakeaways: [
          'Maintain complete conversation context across iterative follow-ups',
          'Provide collapsible live sandboxes for code with instant refresh',
          'Track team ROI via centralized Mixpanel event telemetry',
        ],
      },
    ],
    recommendations: [
      {
        id: 'rec_1',
        priority: 'high',
        title: 'Enforce Client-Side Data Sanitization Before Dispatch',
        description: 'Strip script tags and event handlers client-side to ensure compliance and zero data leakage.',
        impact: 'Critical',
        effort: 'Low',
        timeline: 'Week 1',
      },
      {
        id: 'rec_2',
        priority: 'medium',
        title: 'Standardize Accessible 44px Touch Targets',
        description: 'Audit all mobile and desktop controls to maintain strict WCAG AA compliant touch boundaries.',
        impact: 'High',
        effort: 'Medium',
        timeline: 'Week 3',
      },
    ],
    markdownRaw: `# ${title}\n\n${prompt}\n\n${docAttachment ? `Context from ${docAttachment.name}:\n` + docAttachment.extractedContent : ''}`,
  };
}

/**
 * Generate a realistic initial Data Table Deliverable matching user query or CSV attachment.
 */
export function createDataTableDeliverable(
  _prompt: string,
  csvAttachment?: WorkspaceAttachment
): DataTableDeliverableData {
  if (csvAttachment && csvAttachment.extractedContent) {
    // If CSV was attached, extract its rows & headers
    const lines = csvAttachment.extractedContent.split('\n').filter(l => l.startsWith('|'));
    if (lines.length >= 3) {
      const headerLine = lines[0];
      const headers = headerLine.split('|').map(s => s.trim()).filter(Boolean);
      const dataLines = lines.slice(2);
      const rows = dataLines.map((line, idx) => {
        const cells = line.split('|').map(s => s.trim()).filter(Boolean);
        const rowObj: any = { id: `row_${idx + 1}` };
        headers.forEach((h, i) => {
          rowObj[h] = cells[i] || '';
        });
        return rowObj;
      });

      return {
        title: `Tabular Dataset Analysis: ${csvAttachment.name}`,
        subtitle: `Structured analysis of ${rows.length} records parsed client-side with zero token loss`,
        filename: csvAttachment.name,
        version: 1,
        versions: [
          {
            version: 1,
            label: 'v1',
            summary: `Parsed from uploaded ${csvAttachment.name}`,
            timestamp: Date.now(),
          },
        ],
        columns: headers.map(h => ({
          key: h,
          label: h,
          type: 'text',
          sortable: true,
          align: 'left',
        })),
        rows,
        summaryMetrics: [
          { label: 'Total Rows', value: rows.length },
          { label: 'Columns', value: headers.length },
          { label: 'Data Source', value: csvAttachment.name },
        ],
      };
    }
  }

  // Default rich data table fixture
  return {
    title: 'Regional Quarterly Sales & Territory Performance Breakdown',
    subtitle: 'Aggregated MTD/YTD revenue volume, customer expansion count, and regional margins',
    filename: 'regional-sales-q3.csv',
    version: 1,
    versions: [
      {
        version: 1,
        label: 'v1',
        summary: 'Initial regional sales breakdown',
        timestamp: Date.now(),
      },
    ],
    columns: [
      { key: 'region', label: 'Territory / Region', type: 'text', align: 'left', sortable: true },
      { key: 'salesRep', label: 'Lead Specialist', type: 'text', align: 'left', sortable: true },
      { key: 'revenue', label: 'Q3 Revenue (INR)', type: 'currency', align: 'right', sortable: true },
      { key: 'dealsClosed', label: 'Deals Closed', type: 'number', align: 'right', sortable: true },
      { key: 'growthPercent', label: 'YoY Growth', type: 'percent', align: 'right', sortable: true },
      { key: 'status', label: 'Quota Status', type: 'badge', align: 'center', sortable: true },
    ],
    rows: [
      { id: 'r1', region: 'North America (US-East)', salesRep: 'Sarah Jenkins', revenue: '₹4,850,000', dealsClosed: 28, growthPercent: '+34.2%', status: 'Exceeded' },
      { id: 'r2', region: 'EMEA (UK & Nordics)', salesRep: 'Marcus Vance', revenue: '₹3,920,000', dealsClosed: 22, growthPercent: '+28.5%', status: 'Exceeded' },
      { id: 'r3', region: 'EMEA (Central Europe)', salesRep: 'Elena Rostova', revenue: '₹2,740,000', dealsClosed: 16, growthPercent: '+14.1%', status: 'On Track' },
      { id: 'r4', region: 'APAC (India & Singapore)', salesRep: 'Rohan Sharma', revenue: '₹3,610,000', dealsClosed: 31, growthPercent: '+48.7%', status: 'Exceeded' },
      { id: 'r5', region: 'LATAM (Brazil & Mexico)', salesRep: 'Carlos Mendez', revenue: '₹1,580,000', dealsClosed: 11, growthPercent: '+9.4%', status: 'At Risk' },
    ],
    summaryMetrics: [
      { label: 'Total Revenue', value: '₹16.7M' },
      { label: 'Active Deals', value: 108 },
      { label: 'Top Growth', value: 'APAC (+48.7%)' },
      { label: 'Average Margin', value: '68.4%' },
    ],
  };
}

/**
 * Generate a realistic initial Code App Deliverable matching user query.
 */
export function createCodeAppDeliverable(
  prompt: string,
  _previewFiles?: any[]
): CodeAppDeliverableData {
  const isCalculator = /calculator|pricing|roi/i.test(prompt);
  const isBusinessWebsite = /business|website|company|services|agency|clinic|dental|shop|store|landing|consulting|startup/i.test(prompt);

  const title = isCalculator
    ? 'Interactive SaaS Pricing & Tier ROI Calculator'
    : isBusinessWebsite
    ? 'Modern Business & Services Web Application'
    : 'Modern Responsive Developer Portfolio & Application Sandbox';

  const businessHtmlSnippet = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apex Dynamics | Premium Business Solutions</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    h1, h2, h3, h4, .font-display { font-family: 'Outfit', sans-serif; }
    .quartic-ease { transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-sky-500 selection:text-white">
  <!-- Navigation Header -->
  <header class="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20 font-display font-extrabold text-white text-lg">
          A
        </div>
        <span class="font-display font-bold text-lg sm:text-xl tracking-tight text-white">Apex<span class="text-sky-400">Dynamics</span></span>
      </div>
      <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
        <a href="#services" class="hover:text-white transition-colors">Services</a>
        <a href="#about" class="hover:text-white transition-colors">About Us</a>
        <a href="#reviews" class="hover:text-white transition-colors">Testimonials</a>
        <a href="#contact" class="hover:text-white transition-colors">Contact</a>
      </nav>
      <div class="flex items-center gap-3">
        <a href="#contact" class="min-h-[44px] px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm shadow-md shadow-sky-500/25 transition-all quartic-ease flex items-center gap-2">
          <span>Get Started</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <main class="flex-1">
    <section class="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/30 via-slate-950/60 to-slate-950 -z-10"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-6">
          <span class="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
          <span>Next-Generation Solutions for Growing Businesses</span>
        </div>
        <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight mb-6">
          Accelerate Your Vision With <span class="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Precision Engineering</span>
        </h1>
        <p class="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          We help modern companies scale operations, elevate customer experiences, and outperform competition with tailored digital strategy and automated workflows.
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <a href="#contact" class="w-full sm:w-auto min-h-[44px] px-8 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm shadow-xl shadow-sky-500/30 transition-all quartic-ease flex items-center justify-center gap-2">
            <span>Book Free Consultation</span>
          </a>
          <a href="#services" class="w-full sm:w-auto min-h-[44px] px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-sm transition-all quartic-ease flex items-center justify-center">
            <span>Explore Services</span>
          </a>
        </div>

        <!-- Metric Badges -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-16 pt-12 border-t border-slate-800/80">
          <div>
            <div class="font-display text-3xl sm:text-4xl font-extrabold text-white">99.8%</div>
            <div class="text-xs sm:text-sm text-slate-400 mt-1">Client Satisfaction</div>
          </div>
          <div>
            <div class="font-display text-3xl sm:text-4xl font-extrabold text-sky-400">2,400+</div>
            <div class="text-xs sm:text-sm text-slate-400 mt-1">Projects Shipped</div>
          </div>
          <div>
            <div class="font-display text-3xl sm:text-4xl font-extrabold text-indigo-400">&lt; 24h</div>
            <div class="text-xs sm:text-sm text-slate-400 mt-1">Rapid Onboarding</div>
          </div>
          <div>
            <div class="font-display text-3xl sm:text-4xl font-extrabold text-emerald-400">10x</div>
            <div class="text-xs sm:text-sm text-slate-400 mt-1">Average ROI Factor</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section id="services" class="py-16 bg-slate-900/50 border-t border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-12">
          <h2 class="text-3xl font-bold tracking-tight text-white mb-4">Core Services Built for Velocity</h2>
          <p class="text-slate-400 text-sm sm:text-base">End-to-end capabilities tailored to maximize revenue, efficiency, and market share.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 transition-all quartic-ease group">
            <div class="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h3 class="font-display text-xl font-bold text-white mb-3">Digital Strategy & Growth</h3>
            <p class="text-slate-400 text-sm leading-relaxed mb-4">Data-backed customer acquisition funnels, retention mechanics, and performance analytics.</p>
            <span class="text-sky-400 text-xs font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Learn more &rarr;</span>
          </div>
          <div class="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 transition-all quartic-ease group">
            <div class="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
            </div>
            <h3 class="font-display text-xl font-bold text-white mb-3">Custom Web & App Engineering</h3>
            <p class="text-slate-400 text-sm leading-relaxed mb-4">Blazing-fast responsive websites and web applications built with modern frameworks and edge deployment.</p>
            <span class="text-indigo-400 text-xs font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Learn more &rarr;</span>
          </div>
          <div class="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 transition-all quartic-ease group">
            <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <h3 class="font-display text-xl font-bold text-white mb-3">Workflow Automation</h3>
            <p class="text-slate-400 text-sm leading-relaxed mb-4">Eliminate repetitive operational overhead with autonomous system integrations and AI pipelines.</p>
            <span class="text-emerald-400 text-xs font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Learn more &rarr;</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact & Lead Form -->
    <section id="contact" class="py-16 border-t border-slate-800">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="p-8 sm:p-12 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div class="text-center mb-8">
            <h2 class="text-3xl font-bold text-white mb-2">Let's Build Something Exceptional</h2>
            <p class="text-slate-400 text-sm">Fill out the brief below and our principal strategists will reply within 4 hours.</p>
          </div>
          <form id="lead-form" class="space-y-4" onsubmit="event.preventDefault(); document.getElementById('form-success').classList.remove('hidden'); this.reset();">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1.5">Your Name</label>
                <input required type="text" placeholder="Sarah Connor" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1.5">Business Email</label>
                <input required type="email" placeholder="sarah@company.com" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 text-sm" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">Project Details & Goals</label>
              <textarea rows="3" required placeholder="Tell us about your requirements, timeline, and current challenges..." class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 text-sm"></textarea>
            </div>
            <button type="submit" class="w-full min-h-[44px] py-3.5 px-6 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm shadow-lg shadow-sky-500/25 transition-all quartic-ease cursor-pointer">
              Send Message
            </button>
            <div id="form-success" class="hidden p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold text-center">
              ✓ Ingestion complete! Thank you — our team will be in touch shortly.
            </div>
          </form>
        </div>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="py-8 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-500">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <span class="font-display font-bold text-slate-300">Apex Dynamics</span>
        <span>• &copy; 2026 All Rights Reserved</span>
      </div>
      <div class="flex items-center gap-6 text-slate-400">
        <a href="#services" class="hover:text-slate-200">Services</a>
        <a href="#contact" class="hover:text-slate-200">Contact</a>
        <span>Hosted via PromptHub Capsule</span>
      </div>
    </div>
  </footer>
</body>
</html>`;

  return {
    title,
    description:
      'Complete, self-contained interactive web prototype with reactive controls, smooth quartic animations, clean typography, and instant live execution.',
    entryFile: 'index.html',
    techStack: ['HTML5', 'Tailwind CSS v4', 'JavaScript (ES6)', 'Outfit Font', 'Inter Font'],
    zipFilename: isCalculator ? 'saas-pricing-calculator.zip' : isBusinessWebsite ? 'business-website.zip' : 'interactive-web-app.zip',
    rawCodeSnippet: businessHtmlSnippet,
    version: 1,
    versions: [
      {
        version: 1,
        label: 'v1',
        summary: 'Initial responsive layout with hero, services, testimonials, and contact form',
        timestamp: Date.now(),
      },
    ],
    files: [
      {
        path: 'index.html',
        sizeBytes: 8420,
        type: 'html',
        summary: 'Main responsive business website with hero, services grid, lead form, and footer',
        isEntry: true,
      },
      {
        path: 'styles.css',
        sizeBytes: 1540,
        type: 'css',
        summary: 'Authoritative Design Tokens and quartic easing animation keyframes',
      },
      {
        path: 'app.js',
        sizeBytes: 1240,
        type: 'javascript',
        summary: 'Interactive lead form handling, smooth scrolling, and mobile menu toggle',
      },
      {
        path: 'package.json',
        sizeBytes: 520,
        type: 'json',
        summary: 'Deployment manifest configured for Netlify, Vercel, and Cloudflare Pages',
      },
      {
        path: 'README.md',
        sizeBytes: 1840,
        type: 'markdown',
        summary: 'Complete hosting deployment instructions for Free (Netlify, Vercel) and Paid (Hostinger)',
      },
    ],
  };
}

/**
 * Generate a realistic initial Presentation / Slide Deck Deliverable matching user query.
 */
export function createPresentationDeliverable(prompt: string): PresentationDeliverableData {
  const cleanTopic = prompt.replace(/^(make|create|generate|build|draft)\s+(a\s+)?(ppt|presentation|slide deck|slides|pitch deck)\s+(for|about|on)?/i, '').trim() || 'Strategic Initiative';
  const capitalizedTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);

  return {
    title: `${capitalizedTopic} Presentation`,
    subtitle: `Comprehensive ${capitalizedTopic} Strategy & Implementation Deck`,
    totalSlides: 4,
    authorModel: 'DeepSeek R1 Frontier Reasoning',
    version: 1,
    versions: [
      {
        version: 1,
        label: 'v1',
        summary: 'Initial executive slide deck with problem, solution, architecture, and roadmap',
        timestamp: Date.now(),
      },
    ],
    slides: [
      {
        id: 'slide_1',
        slideNumber: 1,
        category: 'Executive Summary',
        title: `${capitalizedTopic}: The Strategic Imperative`,
        subtitle: 'Transforming legacy inefficiencies into high-velocity outcomes',
        bullets: [
          'Current operating bottlenecks consume up to 40% of delivery cycles',
          'Autonomous intelligent execution unlocks 4.2x faster turnaround time',
          'Unified zero-dev delivery eliminates complex toolchains and subscription fatigue',
        ],
        highlightMetric: { value: '4.2x', label: 'Cycle Velocity' },
        speakerNotes: 'Open with high confidence. Anchor the discussion around ROI and time savings.',
      },
      {
        id: 'slide_2',
        slideNumber: 2,
        category: 'Market & Problem',
        title: 'Core Challenges in Current Workflows',
        subtitle: 'Why existing tools fail non-technical creators and enterprise teams',
        bullets: [
          'High friction payment rails (recurring USD subscription lock-ins)',
          'Fragmented handoffs between prompt creation, code, and live hosting',
          'Lack of surgical editing: re-running entire generations breaks existing work',
        ],
        highlightMetric: { value: '-65%', label: 'Friction Reduction' },
        speakerNotes: 'Validate audience pain points. Show that this is a widespread structural problem.',
      },
      {
        id: 'slide_3',
        slideNumber: 3,
        category: 'Solution Architecture',
        title: `The ${capitalizedTopic} Execution Framework`,
        subtitle: 'Production-ready delivery with zero platform lock-in',
        bullets: [
          'Single-Folder Cloud Capsule: HTML5, CSS, JS, and documentation self-contained',
          'Instant Google Drive synchronization: files live directly in user drive',
          'Local UPI micro-billing economics: friction-free impulse recharge',
        ],
        highlightMetric: { value: '100%', label: 'Cloud Ownership' },
        speakerNotes: 'Demonstrate live capsule. Emphasize that the client retains 100% data ownership.',
      },
      {
        id: 'slide_4',
        slideNumber: 4,
        category: 'Roadmap & Next Steps',
        title: '90-Day Implementation & Delivery Milestones',
        subtitle: 'Clear phased checkpoints from pilot to full scale deployment',
        bullets: [
          'Phase 1 (Days 1–30): Foundation, telemetry integration, and zero-modal execution',
          'Phase 2 (Days 31–60): Automated routing and multi-tier hosting deployment',
          'Phase 3 (Days 61–90): Enterprise governance, continuous audit, and scale',
        ],
        highlightMetric: { value: '98.4%', label: 'Target Accuracy' },
        speakerNotes: 'Conclude with clear call to action and open floor for executive Q&A.',
      },
    ],
  };
}

/**
 * Generate a realistic initial Video Storyboard & Script Deliverable matching user query.
 */
export function createVideoStoryboardDeliverable(prompt: string): VideoStoryboardData {
  const isYouTube = /youtube/i.test(prompt);
  const isCommercial = /commercial|ad|brand/i.test(prompt);
  const platform = isYouTube ? 'youtube' : isCommercial ? 'commercial' : 'tiktok';
  const aspectRatio = isYouTube ? '16:9 Widescreen' : '9:16 Vertical';
  const targetDuration = isYouTube ? '90 Seconds' : '45 Seconds';

  const cleanSubject = prompt.replace(/^(make|create|generate|write)\s+(a\s+)?(video script|storyboard|video|reel|tiktok)\s+(for|about)?/i, '').trim() || 'Modern Innovation';
  const subjectCap = cleanSubject.charAt(0).toUpperCase() + cleanSubject.slice(1);

  return {
    title: `${subjectCap} Production Storyboard`,
    platform,
    targetDuration,
    aspectRatio,
    targetAudience: 'Growth-minded professionals and digital creators seeking high ROI tools',
    version: 1,
    versions: [
      {
        version: 1,
        label: 'v1',
        summary: 'Initial high-retention video script with visual prompts and audio cues',
        timestamp: Date.now(),
      },
    ],
    scenes: [
      {
        id: 'sc_1',
        sceneNumber: 1,
        timecode: '0:00 - 0:04',
        shotType: 'Tight Close-up / Fast Dynamic Zoom',
        title: 'The Pattern-Interrupt Hook',
        visualAction: `Creator looks directly into camera with intense focus, holding up an invoice or laptop screen about ${cleanSubject}.`,
        aiVisualPrompt: `Intense close-up of dynamic young creator in neon-accented tech studio, cinematic lighting, 8k resolution, National Geographic photography style`,
        voiceoverScript: `If you are still struggling with ${cleanSubject}, you are doing it the hard way. Here is the 10-second fix.`,
        audioMusicCue: 'Sharp vinyl stop sound effect, followed by high-tempo lo-fi beat drop.',
      },
      {
        id: 'sc_2',
        sceneNumber: 2,
        timecode: '0:04 - 0:18',
        shotType: 'Over-the-Shoulder Screen Capture',
        title: 'The Core Bottleneck',
        visualAction: 'Fast montage showing confusing settings, broken lines of code, and endless recurring monthly subscription bills.',
        aiVisualPrompt: 'Computer monitor displaying red alert error screens and high credit card bills, dark cinematic moody lighting',
        voiceoverScript: 'Traditional software requires 10 different tools, complex setup, and expensive USD monthly plans that auto-debit your card.',
        audioMusicCue: 'Tense rhythmic percussion building urgency and tension.',
      },
      {
        id: 'sc_3',
        sceneNumber: 3,
        timecode: '0:18 - 0:34',
        shotType: 'Split Screen: Mobile & Laptop Live Output',
        title: 'The 1-Click Breakthrough',
        visualAction: `User types 5 simple words into PromptHub: "Build ${cleanSubject}". An instant working responsive deliverable compiles live in seconds.`,
        aiVisualPrompt: `Gleaming modern digital dashboard with emerald success indicators and live interactive web application preview, 8k render`,
        voiceoverScript: `With PromptHub, you describe your vision in plain English. You get a working production result synced straight to your Google Drive.`,
        audioMusicCue: 'Uplifting, high-energy electronic synthesizer drops with triumphant melody.',
      },
      {
        id: 'sc_4',
        sceneNumber: 4,
        timecode: '0:34 - 0:45',
        shotType: 'Medium Shot with Clean On-Screen Link',
        title: 'Call to Action & Outro',
        visualAction: 'Creator smiles, taps phone showing live hosted site, and points to link sticker on screen.',
        aiVisualPrompt: 'Confident smiling professional creator holding sleek modern smartphone in bright aesthetic studio, crisp 8k render',
        voiceoverScript: 'Try it right now completely free at prompthub.cloud. Link is in the description!',
        audioMusicCue: 'Clean audio chime with resonant bass fade-out.',
      },
    ],
  };
}
