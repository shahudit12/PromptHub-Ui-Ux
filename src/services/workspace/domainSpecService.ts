/**
 * src/services/workspace/domainSpecService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-Domain Interactive Prototype & Specification Generator.
 * Extends PromptHub creation engine across:
 *  - SaaS & Startups
 *  - E-Commerce & Retail
 *  - Portfolios & Creators
 *  - Creative Agencies & Studios
 *  - Developer Docs & Portals
 *  - Dashboards & Internal Tools
 *
 * Each generated concept includes a complete, interactive, responsive HTML/JS/CSS
 * prototype rendered live with zero build latency and 0 credit cost.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PortfolioConcept, PortfolioDesignSpec } from '../../types/portfolioSpec';
import type { WorkFile } from '../../types/work';
import type { WorkspaceDomainCategory } from '../../data/workspaceDomains';
import { portfolioSpecGeneratorService } from '../portfolio/portfolioSpecGeneratorService';
import { promptEnhancerService } from '../portfolio/promptEnhancerService';
import { referenceRetrievalService } from '../portfolio/referenceRetrievalService';

export interface DomainConceptResult {
  domain: WorkspaceDomainCategory;
  domainLabel: string;
  concepts: PortfolioConcept[];
}

export class DomainSpecService {
  /**
   * Classifies user input into the appropriate domain category.
   */
  classifyDomain(prompt: string): WorkspaceDomainCategory {
    const text = prompt.toLowerCase();

    // Check Docs & Design Systems
    if (
      /\b(api\s*docs?|documentation|developer\s*portal|design\s*system|component\s*library|sdk|endpoints?|parameters?|swagger|curl)\b/i.test(text)
    ) {
      return 'docs';
    }

    // Check Dashboards & Internal Tools
    if (
      /\b(dashboard|revops|metrics?|internal\s*tool|telemetry|incident|latency|cluster|cohort|mrr|churn|kpi|analytics\s*table)\b/i.test(text)
    ) {
      return 'dashboard';
    }

    // Check E-Commerce & Retail
    if (
      /\b(store|shop|ecommerce|e-commerce|apparel|clothing|coffee|cart|checkout|product\s*grid|fashion|retail|inventory|merch|roastery)\b/i.test(text)
    ) {
      return 'ecommerce';
    }

    // Check Agencies & Studios
    if (
      /\b(agency|creative\s*studio|client\s*roster|pitch|services?\s*matrix|budget\s*estimator|case\s*studies|marketing\s*lab|performance\s*studio)\b/i.test(text)
    ) {
      return 'agency';
    }

    // Check SaaS & Tech Startups
    if (
      /\b(saas|startup|copilot|automation|crm|devops|kube|kubernetes|cloud\s*platform|b2b|pipeline|pricing\s*toggle|pricing\s*tier|waitlist|landing\s*page)\b/i.test(text)
    ) {
      return 'saas';
    }

    // Default to Portfolio & Personal Showcase
    return 'portfolio';
  }

  /**
   * Generates 3 live, interactive concepts for any domain based on the user's prompt.
   */
  generateConcepts(
    prompt: string,
    options: {
      userName?: string;
      explicitDomain?: WorkspaceDomainCategory;
    } = {}
  ): DomainConceptResult {
    const domain = options.explicitDomain || this.classifyDomain(prompt);

    if (domain === 'portfolio') {
      const brief = promptEnhancerService.enhancePrompt(prompt, {
        userName: options.userName || 'Alex Chen',
        explicitDarkPreference: !prompt.toLowerCase().includes('light mode'),
      });
      const retrieval = referenceRetrievalService.retrieveReferences({
        rawPrompt: prompt,
        profession: brief.profession,
        desiredStyles: brief.styleTags,
        prefersDark: brief.palettePreferences.isDark,
        limit: 3,
      });
      const genResult = portfolioSpecGeneratorService.generateThreeSpecs(brief, retrieval.records);
      return {
        domain: 'portfolio',
        domainLabel: 'Portfolios & Creators',
        concepts: genResult.concepts,
      };
    }

    // Domain-Specific Concept Generators
    switch (domain) {
      case 'saas':
        return {
          domain: 'saas',
          domainLabel: 'SaaS & Tech Startups',
          concepts: this.buildSaaSConcepts(prompt),
        };
      case 'ecommerce':
        return {
          domain: 'ecommerce',
          domainLabel: 'E-Commerce & Retail',
          concepts: this.buildECommerceConcepts(prompt),
        };
      case 'agency':
        return {
          domain: 'agency',
          domainLabel: 'Agencies & Studios',
          concepts: this.buildAgencyConcepts(prompt),
        };
      case 'docs':
        return {
          domain: 'docs',
          domainLabel: 'Developer Docs & API Portals',
          concepts: this.buildDocsConcepts(prompt),
        };
      case 'dashboard':
        return {
          domain: 'dashboard',
          domainLabel: 'Dashboards & Internal Tools',
          concepts: this.buildDashboardConcepts(prompt),
        };
      default:
        return {
          domain: 'portfolio',
          domainLabel: 'Portfolios & Creators',
          concepts: this.buildSaaSConcepts(prompt),
        };
    }
  }

  private makeWorkFiles(html: string, name: string): WorkFile[] {
    const now = new Date().toISOString();
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return [
      {
        id: `file_${slug}_index`,
        projectId: 'proj_workspace',
        worktreeId: 'wt_main',
        path: 'index.html',
        name: 'index.html',
        content: html,
        size: html.length,
        isDirectory: false,
        mimeType: 'text/html',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `file_${slug}_css`,
        projectId: 'proj_workspace',
        worktreeId: 'wt_main',
        path: 'styles.css',
        name: 'styles.css',
        content: `/* Extracted tokens from ${name} */`,
        size: 30,
        isDirectory: false,
        mimeType: 'text/css',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `file_${slug}_readme`,
        projectId: 'proj_workspace',
        worktreeId: 'wt_main',
        path: 'README.md',
        name: 'README.md',
        content: `# ${name}\nGenerated via PromptHub Multi-Domain Engine.`,
        size: 45,
        isDirectory: false,
        mimeType: 'text/markdown',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  // ── 1. SaaS Concepts ───────────────────────────────────────────────────────
  private buildSaaSConcepts(prompt: string): PortfolioConcept[] {
    const isDevOps = /devops|kube|cloud|infra|ci\/cd|pipeline/i.test(prompt);
    const title = isDevOps ? 'KubeStream Cloud Platform' : 'Synapse AI Automation Copilot';

    const createSpec = (id: string, name: string, aesthetic: string, primary: string, bg: string, surface: string, text: string): PortfolioDesignSpec => ({
      id,
      name,
      templateId: 'modern_bento',
      templateVersion: '2.0.0',
      aesthetic,
      description: `Production-ready SaaS landing page featuring live interactive demo, feature bento, and pricing toggle.`,
      palette: {
        primary,
        secondary: '#BDDDFC',
        background: bg,
        surface,
        text,
        textMuted: '#8E9BAE',
        accent: '#88BDF2',
        border: 'rgba(255,255,255,0.08)',
      },
      typography: {
        fontHeading: 'Outfit, sans-serif',
        fontBody: 'Inter, sans-serif',
        fontMono: 'JetBrains Mono, monospace',
      },
      profile: {
        name: title,
        title: 'B2B Enterprise SaaS',
        bio: 'Automate complex operational workflows with AI-native intelligence.',
      },
      skills: [
        { name: 'Real-Time Orchestration', category: 'core', level: 98 },
        { name: 'SOC 2 Type II Certified', category: 'core', level: 100 },
        { name: 'Sub-40ms Latency', category: 'ai', level: 99 },
      ],
      projects: [
        {
          id: 'p1',
          title: 'Workflow Engine',
          description: 'Trigger autonomous agents with natural language instructions.',
          tags: ['AI Agent', 'Event-Driven', 'Fast'],
        },
      ],
      socialLinks: [
        { platform: 'website', url: 'https://prompthub.dev', label: 'Product' },
      ],
      contact: {
        email: 'sales@synapse.ai',
        ctaText: 'Start Free 14-Day Trial',
        availableForHire: true,
      },
      interactiveFeatures: {
        hasTerminal: true,
        hasCaseStudies: true,
      },
    });

    const c1Html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Direction A (Slate Studio)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0E1318; color: #F8FBFE; font-family: 'Inter', system-ui, sans-serif; line-height: 1.5; padding: 24px; }
    .container { max-width: 1000px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .logo { font-size: 18px; font-weight: 700; color: #BDDDFC; display: flex; align-items: center; gap: 8px; }
    .badge { font-size: 11px; padding: 3px 8px; border-radius: 9999px; background: rgba(106, 137, 167, 0.2); color: #88BDF2; border: 1px solid rgba(106, 137, 167, 0.4); }
    .btn { background: #6A89A7; color: #fff; padding: 8px 16px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; transition: 0.2s; }
    .btn:hover { background: #88BDF2; color: #0E1318; }
    .hero { text-align: center; padding: 48px 0 32px; }
    h1 { font-size: 38px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 12px; color: #FFFFFF; }
    p.sub { font-size: 16px; color: #8E9BAE; max-width: 600px; margin: 0 auto 24px; }
    .demo-card { background: #161E26; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: left; }
    .demo-bar { display: flex; gap: 8px; margin-bottom: 12px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: #384959; }
    .terminal-text { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #BDDDFC; }
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 32px; }
    .tier { background: #161E26; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; text-align: left; }
    .tier.featured { border-color: #6A89A7; background: #1B2530; }
    .price { font-size: 32px; font-weight: 800; color: #fff; margin: 12px 0; }
    .features { list-style: none; font-size: 13px; color: #8E9BAE; margin: 16px 0; }
    .features li { margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
    .features li::before { content: "✓"; color: #88BDF2; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">⚡ ${title} <span class="badge">v2.4 Live</span></div>
      <button class="btn" onclick="this.innerText='Trial Active!';">Get Started Free</button>
    </header>
    <section class="hero">
      <div class="badge" style="margin-bottom: 12px; display: inline-block;">Automated Intelligence for Teams</div>
      <h1>Workflows that run themselves.</h1>
      <p class="sub">Deploy autonomous agents that connect to your database, triage requests, and push verified code in seconds.</p>
      <div class="demo-card">
        <div class="demo-bar"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        <div class="terminal-text" id="typewriter">&gt; synapse run deploy --target=production --auto-verify</div>
      </div>
    </section>
    <div class="pricing-grid">
      <div class="tier">
        <h3>Starter</h3>
        <p style="color:#8E9BAE; font-size:12px;">For individual engineers</p>
        <div class="price">$0 <span style="font-size:14px; font-weight:normal; color:#8E9BAE;">/mo</span></div>
        <ul class="features">
          <li>500 Automated Workflows/mo</li>
          <li>Community Slack Support</li>
          <li>Sub-100ms Execution</li>
        </ul>
        <button class="btn" style="width:100%; background:#2A3744;">Start Free</button>
      </div>
      <div class="tier featured">
        <div class="badge" style="float:right;">Most Popular</div>
        <h3>Pro Studio</h3>
        <p style="color:#8E9BAE; font-size:12px;">For fast-moving product teams</p>
        <div class="price">$49 <span style="font-size:14px; font-weight:normal; color:#8E9BAE;">/mo</span></div>
        <ul class="features">
          <li>Unlimited Autonomous Pipelines</li>
          <li>Custom BYOK Integration</li>
          <li>Dedicated Slack Channel</li>
          <li>Priority Cloud Clusters</li>
        </ul>
        <button class="btn" style="width:100%;">Upgrade to Pro</button>
      </div>
      <div class="tier">
        <h3>Enterprise</h3>
        <p style="color:#8E9BAE; font-size:12px;">Custom compliance & scale</p>
        <div class="price">Custom</div>
        <ul class="features">
          <li>Self-Hosted VPC Deployment</li>
          <li>99.99% Guaranteed SLA</li>
          <li>SOC 2 & HIPAA Audited</li>
        </ul>
        <button class="btn" style="width:100%; background:#2A3744;">Contact Sales</button>
      </div>
    </div>
  </div>
</body>
</html>`;

    const c2Html = c1Html
      .replace('Direction A (Slate Studio)', 'Direction B (Terminal Cyber Dark)')
      .replace('#0E1318', '#070A0E')
      .replace('#161E26', '#0E141B')
      .replace('#6A89A7', '#384959');

    const c3Html = c1Html
      .replace('Direction A (Slate Studio)', 'Direction C (Enterprise High-Contrast Navy)')
      .replace('#0E1318', '#141D26')
      .replace('#161E26', '#1E2B38')
      .replace('#6A89A7', '#88BDF2');

    const specA = createSpec('spec_saas_slate', `${title} (Slate Studio)`, 'Slate Minimalist', '#6A89A7', '#0E1318', '#161E26', '#F8FBFE');
    const specB = createSpec('spec_saas_terminal', `${title} (Terminal Dark)`, 'Cyberpunk Terminal', '#384959', '#070A0E', '#0E141B', '#E6EDF3');
    const specC = createSpec('spec_saas_enterprise', `${title} (Enterprise Cobalt)`, 'High-Impact Navy', '#88BDF2', '#141D26', '#1E2B38', '#FFFFFF');

    return [
      {
        id: 'spec_saas_slate',
        spec: specA,
        badge: 'Slate Studio',
        highlights: ['Interactive CLI Simulator', '3-Tier Pricing Grid', 'Dark Linear Palette'],
        previewHtml: c1Html,
        files: this.makeWorkFiles(c1Html, 'SaaS Slate Studio'),
      },
      {
        id: 'spec_saas_terminal',
        spec: specB,
        badge: 'Terminal Cyber',
        highlights: ['JetBrains Mono Monospace', 'Low Latency Benchmarks', 'Deep Contrast'],
        previewHtml: c2Html,
        files: this.makeWorkFiles(c2Html, 'SaaS Terminal Cyber'),
      },
      {
        id: 'spec_saas_enterprise',
        spec: specC,
        badge: 'Enterprise Navy',
        highlights: ['Cobalt Accents', 'SOC 2 Checklist', 'Scalable Typography'],
        previewHtml: c3Html,
        files: this.makeWorkFiles(c3Html, 'SaaS Enterprise Navy'),
      },
    ];
  }

  // ── 2. E-Commerce Concepts ─────────────────────────────────────────────────
  private buildECommerceConcepts(prompt: string): PortfolioConcept[] {
    const isApparel = /apparel|clothing|streetwear|fashion/i.test(prompt);
    const storeName = isApparel ? 'KURO Studio Artisanal Store' : 'Aura Specialty Coffee Roasters';

    const createSpec = (id: string, name: string, aesthetic: string, primary: string, bg: string, surface: string, text: string): PortfolioDesignSpec => ({
      id,
      name,
      templateId: 'modern_bento',
      templateVersion: '2.0.0',
      aesthetic,
      description: `Complete e-commerce experience with interactive cart drawer, product filter, and instant checkout.`,
      palette: {
        primary,
        secondary: '#BDDDFC',
        background: bg,
        surface,
        text,
        textMuted: '#8E9BAE',
        accent: '#88BDF2',
        border: 'rgba(255,255,255,0.08)',
      },
      typography: {
        fontHeading: 'Outfit, sans-serif',
        fontBody: 'Inter, sans-serif',
        fontMono: 'JetBrains Mono, monospace',
      },
      profile: {
        name: storeName,
        title: 'Modern Retail Storefront',
        bio: 'Engineered for exceptional craft and seamless buying flows.',
      },
      skills: [
        { name: 'Instant Cart Drawer', category: 'core', level: 100 },
        { name: 'Responsive Catalog', category: 'core', level: 98 },
      ],
      projects: [],
      socialLinks: [],
      contact: {
        email: 'orders@kurostudio.com',
        ctaText: 'View Cart & Checkout',
        availableForHire: true,
      },
      interactiveFeatures: {
        hasCaseStudies: true,
      },
    });

    const c1Html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${storeName} — Direction A (Editorial Minimalist)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0F1318; color: #F8FBFE; font-family: 'Inter', sans-serif; padding: 24px; }
    .container { max-width: 1000px; margin: 0 auto; }
    nav { display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .logo { font-size: 20px; font-weight: 800; letter-spacing: -0.03em; color: #FFFFFF; }
    .cart-btn { background: #1C242D; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px 16px; border-radius: 9999px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
    .badge { background: #6A89A7; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; }
    .hero { text-align: center; padding: 36px 0 24px; }
    .hero h1 { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
    .hero p { color: #8E9BAE; font-size: 14px; }
    .filters { display: flex; gap: 8px; justify-content: center; margin: 20px 0; }
    .filter-pill { background: #1C242D; border: 1px solid rgba(255,255,255,0.08); color: #8E9BAE; padding: 6px 14px; border-radius: 9999px; font-size: 12px; cursor: pointer; }
    .filter-pill.active { background: #6A89A7; color: white; border-color: #6A89A7; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-top: 16px; }
    .card { background: #151B22; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; display: flex; flex-col; transition: transform 0.2s; }
    .card:hover { transform: translateY(-3px); border-color: #6A89A7; }
    .card-img { height: 160px; background: #202933; display: flex; align-items: center; justify-content: center; font-size: 36px; }
    .card-info { padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
    .card-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
    .card-price { font-size: 15px; font-weight: 800; color: #BDDDFC; margin-bottom: 12px; }
    .add-btn { background: #6A89A7; border: none; color: white; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; width: 100%; transition: background 0.2s; }
    .add-btn:hover { background: #88BDF2; color: #0E1318; }
  </style>
</head>
<body>
  <div class="container">
    <nav>
      <div class="logo">✦ ${storeName}</div>
      <button class="cart-btn" onclick="this.style.borderColor='#88BDF2'">Bag <span class="badge" id="cartCount">1</span></button>
    </nav>
    <div class="hero">
      <h1>Artisanal Precision. Built to Last.</h1>
      <p>Limited batch releases crafted with meticulous material selection.</p>
      <div class="filters">
        <button class="filter-pill active">All Releases</button>
        <button class="filter-pill">Outerwear</button>
        <button class="filter-pill">Essentials</button>
        <button class="filter-pill">Accessories</button>
      </div>
    </div>
    <div class="grid">
      <div class="card">
        <div class="card-img">🧥</div>
        <div class="card-info">
          <div>
            <div class="card-title">Heavyweight Raw Hoodie</div>
            <div style="font-size:11px; color:#8E9BAE; margin-bottom: 8px;">480 GSM French Terry</div>
          </div>
          <div>
            <div class="card-price">$140</div>
            <button class="add-btn" onclick="addToCart('Heavyweight Hoodie')">Add to Bag</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-img">👖</div>
        <div class="card-info">
          <div>
            <div class="card-title">Pleated Wide Trousers</div>
            <div style="font-size:11px; color:#8E9BAE; margin-bottom: 8px;">Japanese Raw Wool Blend</div>
          </div>
          <div>
            <div class="card-price">$185</div>
            <button class="add-btn" onclick="addToCart('Wide Trousers')">Add to Bag</button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-img">☕</div>
        <div class="card-info">
          <div>
            <div class="card-title">Single-Origin Roast</div>
            <div style="font-size:11px; color:#8E9BAE; margin-bottom: 8px;">Ethiopian Yirgacheffe • Floral & Peach</div>
          </div>
          <div>
            <div class="card-price">$24</div>
            <button class="add-btn" onclick="addToCart('Single-Origin Roast')">Add to Bag</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    let count = 1;
    function addToCart(item) {
      count++;
      document.getElementById('cartCount').innerText = count;
      console.log('Added ' + item + ' to cart');
    }
  </script>
</body>
</html>`;

    const c2Html = c1Html
      .replace('Direction A (Editorial Minimalist)', 'Direction B (Streetwear High Contrast)')
      .replace('#0F1318', '#000000')
      .replace('#151B22', '#111111')
      .replace('#6A89A7', '#BDDDFC');

    const c3Html = c1Html
      .replace('Direction A (Editorial Minimalist)', 'Direction C (Warm Roastery Studio)')
      .replace('#0F1318', '#141A21')
      .replace('#151B22', '#1E2833')
      .replace('#6A89A7', '#88BDF2');

    const specA = createSpec('spec_ecom_editorial', `${storeName} (Editorial)`, 'Editorial Minimalist', '#6A89A7', '#0F1318', '#151B22', '#F8FBFE');
    const specB = createSpec('spec_ecom_streetwear', `${storeName} (Streetwear High-Contrast)`, 'High-Contrast Cyber', '#BDDDFC', '#000000', '#111111', '#FFFFFF');
    const specC = createSpec('spec_ecom_roastery', `${storeName} (Specialty Roastery)`, 'Warm Studio', '#88BDF2', '#141A21', '#1E2833', '#F8FBFE');

    return [
      {
        id: 'spec_ecom_editorial',
        spec: specA,
        badge: 'Editorial Minimalist',
        highlights: ['Dynamic Cart Counter', 'Category Filter Pills', '480 GSM Card Specs'],
        previewHtml: c1Html,
        files: this.makeWorkFiles(c1Html, 'E-Commerce Editorial'),
      },
      {
        id: 'spec_ecom_streetwear',
        spec: specB,
        badge: 'Streetwear High-Contrast',
        highlights: ['Pure Black Palette', 'Bold Typography', 'Quick Swatch Add'],
        previewHtml: c2Html,
        files: this.makeWorkFiles(c2Html, 'E-Commerce Streetwear'),
      },
      {
        id: 'spec_ecom_roastery',
        spec: specC,
        badge: 'Warm Roastery Studio',
        highlights: ['Tasting Note Badges', 'Subscription Builder', 'Soft Slate Cards'],
        previewHtml: c3Html,
        files: this.makeWorkFiles(c3Html, 'E-Commerce Warm Roastery'),
      },
    ];
  }

  // ── 3. Agency & Studio Concepts ────────────────────────────────────────────
  private buildAgencyConcepts(_prompt: string): PortfolioConcept[] {
    const title = 'Form & Function Studio';

    const createSpec = (id: string, name: string, aesthetic: string, primary: string, bg: string, surface: string, text: string): PortfolioDesignSpec => ({
      id,
      name,
      templateId: 'modern_bento',
      templateVersion: '2.0.0',
      aesthetic,
      description: `Premium digital agency site featuring interactive project reels, process timeline, and budget inquiry form.`,
      palette: {
        primary,
        secondary: '#BDDDFC',
        background: bg,
        surface,
        text,
        textMuted: '#8E9BAE',
        accent: '#88BDF2',
        border: 'rgba(255,255,255,0.08)',
      },
      typography: {
        fontHeading: 'Outfit, sans-serif',
        fontBody: 'Inter, sans-serif',
        fontMono: 'JetBrains Mono, monospace',
      },
      profile: {
        name: title,
        title: 'Digital Product & Design Agency',
        bio: 'We design and engineer category-defining digital products for ambitious brands.',
      },
      skills: [
        { name: 'Brand Identity', category: 'core', level: 98 },
        { name: 'Fullstack Engineering', category: 'core', level: 95 },
        { name: 'Design Systems', category: 'core', level: 100 },
      ],
      projects: [],
      socialLinks: [],
      contact: {
        email: 'hello@formfunction.agency',
        ctaText: 'Start a Project',
        availableForHire: true,
      },
      interactiveFeatures: {
        hasCaseStudies: true,
      },
    });

    const c1Html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Direction A (High-Craft Studio)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0D1117; color: #F8FBFE; font-family: 'Inter', sans-serif; padding: 24px; line-height: 1.5; }
    .container { max-width: 1000px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .logo { font-size: 18px; font-weight: 800; color: #fff; }
    .btn { background: #6A89A7; color: #fff; padding: 8px 16px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; transition: 0.2s; }
    .hero { padding: 48px 0 32px; }
    .tag { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #88BDF2; margin-bottom: 12px; }
    h1 { font-size: 40px; font-weight: 800; letter-spacing: -0.02em; max-width: 700px; color: #fff; margin-bottom: 16px; }
    .case-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 32px; }
    .case-card { background: #161D26; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; padding: 20px; }
    .case-tag { font-size: 10px; font-mono; color: #8E9BAE; text-transform: uppercase; margin-bottom: 8px; }
    .case-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #fff; }
    .case-desc { font-size: 13px; color: #8E9BAE; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">FORM & FUNCTION</div>
      <button class="btn" onclick="this.innerText='Inquiry Sent!';">Inquire for Q3</button>
    </header>
    <div class="hero">
      <div class="tag">// DIGITAL PRODUCT & STRATEGY STUDIO</div>
      <h1>We transform complex technology into products people love.</h1>
      <p style="color:#8E9BAE; font-size:15px; max-width:600px;">From Seed to IPO, we partner with visionary teams to design design systems, SaaS platforms, and brand narratives.</p>
    </div>
    <div class="case-grid">
      <div class="case-card">
        <div class="case-tag">Fintech Platform • 2026</div>
        <div class="case-title">Aura Capital Dashboard</div>
        <div class="case-desc">Redesigned the cross-border payment experience, increasing checkout conversion by +42%.</div>
      </div>
      <div class="case-card">
        <div class="case-tag">AI Infrastructure • 2026</div>
        <div class="case-title">Helix Vector Engine</div>
        <div class="case-desc">Created the full developer documentation portal, design system tokens, and interactive console.</div>
      </div>
      <div class="case-card">
        <div class="case-tag">Healthcare SaaS • 2025</div>
        <div class="case-title">CareLink Clinical OS</div>
        <div class="case-desc">End-to-end design and frontend engineering for HIPAA-compliant patient intake workflows.</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const c2Html = c1Html
      .replace('Direction A (High-Craft Studio)', 'Direction B (Minimalist Monospace)')
      .replace('#0D1117', '#080B0F')
      .replace('#161D26', '#0F141C')
      .replace('#6A89A7', '#BDDDFC');

    const c3Html = c1Html
      .replace('Direction A (High-Craft Studio)', 'Direction C (Data Growth Lab)')
      .replace('#0D1117', '#121820')
      .replace('#161D26', '#1A232E')
      .replace('#6A89A7', '#88BDF2');

    const specA = createSpec('spec_agency_craft', `${title} (Studio Craft)`, 'High-Craft Studio', '#6A89A7', '#0D1117', '#161D26', '#F8FBFE');
    const specB = createSpec('spec_agency_mono', `${title} (Monospace Editorial)`, 'Monospace Editorial', '#BDDDFC', '#080B0F', '#0F141C', '#FFFFFF');
    const specC = createSpec('spec_agency_growth', `${title} (Data Growth Lab)`, 'Data Growth Lab', '#88BDF2', '#121820', '#1A232E', '#F8FBFE');

    return [
      {
        id: 'spec_agency_craft',
        spec: specA,
        badge: 'Studio Craft',
        highlights: ['Client Case Studies', '4-Phase Process Reel', 'Direct Inquiry Action'],
        previewHtml: c1Html,
        files: this.makeWorkFiles(c1Html, 'Agency Studio Craft'),
      },
      {
        id: 'spec_agency_mono',
        spec: specB,
        badge: 'Monospace Editorial',
        highlights: ['High-End Typographic Contrast', 'Subtle Borders', 'Focused Portfolio'],
        previewHtml: c2Html,
        files: this.makeWorkFiles(c2Html, 'Agency Monospace Editorial'),
      },
      {
        id: 'spec_agency_growth',
        spec: specC,
        badge: 'Data Growth Lab',
        highlights: ['Conversion Uplift Badges', 'Measurable Case Outcomes', 'Deep Slate Blue'],
        previewHtml: c3Html,
        files: this.makeWorkFiles(c3Html, 'Agency Data Growth Lab'),
      },
    ];
  }

  // ── 4. Docs & Design System Concepts ───────────────────────────────────────
  private buildDocsConcepts(_prompt: string): PortfolioConcept[] {
    const title = 'VaultPay API Reference';

    const createSpec = (id: string, name: string, aesthetic: string, primary: string, bg: string, surface: string, text: string): PortfolioDesignSpec => ({
      id,
      name,
      templateId: 'minimal_cli',
      templateVersion: '2.0.0',
      aesthetic,
      description: `Interactive developer documentation portal with multi-language code tabs and live sandbox runner.`,
      palette: {
        primary,
        secondary: '#BDDDFC',
        background: bg,
        surface,
        text,
        textMuted: '#8E9BAE',
        accent: '#88BDF2',
        border: 'rgba(255,255,255,0.08)',
      },
      typography: {
        fontHeading: 'Outfit, sans-serif',
        fontBody: 'Inter, sans-serif',
        fontMono: 'JetBrains Mono, monospace',
      },
      profile: {
        name: title,
        title: 'Developer Documentation',
        bio: 'Interactive documentation, SDK guides, and token references.',
      },
      skills: [
        { name: 'cURL / Python / Node Tabs', category: 'core', level: 100 },
        { name: 'Live Endpoint Runner', category: 'core', level: 98 },
      ],
      projects: [],
      socialLinks: [],
      contact: {
        email: 'developer@vaultpay.io',
        ctaText: 'Get API Keys',
        availableForHire: false,
      },
      interactiveFeatures: {
        hasTerminal: true,
      },
    });

    const c1Html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Direction A (3-Column Interactive Docs)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0E1217; color: #F8FBFE; font-family: 'Inter', sans-serif; height: 100vh; display: flex; flex-direction: column; }
    header { height: 50px; background: #151A22; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; font-size: 13px; font-weight: 700; }
    .layout { display: flex; flex: 1; overflow: hidden; }
    .sidebar { width: 220px; background: #12161E; border-right: 1px solid rgba(255,255,255,0.08); padding: 16px; font-size: 12px; }
    .sidebar h4 { color: #8E9BAE; text-transform: uppercase; font-size: 10px; margin-bottom: 8px; letter-spacing: 0.05em; }
    .sidebar ul { list-style: none; margin-bottom: 16px; }
    .sidebar li { padding: 6px 8px; border-radius: 6px; cursor: pointer; color: #C5D1DE; margin-bottom: 2px; }
    .sidebar li.active { background: rgba(106, 137, 167, 0.2); color: #88BDF2; font-weight: 600; }
    .content { flex: 1; padding: 24px; overflow-y: auto; }
    .content h2 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .content p { font-size: 13px; color: #8E9BAE; line-height: 1.5; margin-bottom: 16px; }
    .code-pane { width: 340px; background: #080A0D; border-left: 1px solid rgba(255,255,255,0.08); padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .tabs { display: flex; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; }
    .tab { color: #8E9BAE; cursor: pointer; font-size: 11px; }
    .tab.active { color: #88BDF2; font-weight: 700; }
    pre { background: #12161E; padding: 12px; border-radius: 8px; color: #BDDDFC; overflow-x: auto; }
    .param-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
    .param-table th, .param-table td { text-align: left; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .param-table th { color: #8E9BAE; }
  </style>
</head>
<body>
  <header>
    <div>⚡ VaultPay API v2.0</div>
    <div style="color:#8E9BAE; font-size:11px;">Status: All Systems Operational</div>
  </header>
  <div class="layout">
    <div class="sidebar">
      <h4>Getting Started</h4>
      <ul>
        <li>Overview</li>
        <li>Authentication</li>
        <li>Error Codes</li>
      </ul>
      <h4>Endpoints</h4>
      <ul>
        <li class="active">POST /v1/charges</li>
        <li>GET /v1/customers</li>
        <li>POST /v1/refunds</li>
      </ul>
    </div>
    <div class="content">
      <h2>Create a Charge</h2>
      <p>To charge a credit card or alternative payment method, issue a POST request to <code>/v1/charges</code> with the tokenized source.</p>
      <h3 style="font-size:14px; margin-top:20px;">Request Parameters</h3>
      <table class="param-table">
        <tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr>
        <tr><td>amount</td><td>integer</td><td>Yes</td><td>Amount in cents (e.g. 2000 = $20.00)</td></tr>
        <tr><td>currency</td><td>string</td><td>Yes</td><td>Three-letter ISO currency code (usd, inr)</td></tr>
        <tr><td>customer_id</td><td>string</td><td>No</td><td>Identifier of existing customer</td></tr>
      </table>
    </div>
    <div class="code-pane">
      <div class="tabs">
        <span class="tab active">cURL</span>
        <span class="tab">Python</span>
        <span class="tab">Node.js</span>
      </div>
      <pre><code>curl https://api.vaultpay.io/v1/charges \\
  -u sec_key_live:...: \\
  -d amount=2000 \\
  -d currency=usd</code></pre>
      <div style="margin-top:16px; font-size:11px; color:#8E9BAE;">Response (200 OK):</div>
      <pre style="margin-top:4px;"><code>{
  "id": "ch_94827104",
  "status": "succeeded",
  "amount": 2000,
  "currency": "usd"
}</code></pre>
    </div>
  </div>
</body>
</html>`;

    const c2Html = c1Html
      .replace('Direction A (3-Column Interactive Docs)', 'Direction B (Clean Component Playground)')
      .replace('#0E1217', '#090D12')
      .replace('#151A22', '#101620')
      .replace('#6A89A7', '#BDDDFC');

    const c3Html = c1Html
      .replace('Direction A (3-Column Interactive Docs)', 'Direction C (Terminal SDK Guide)')
      .replace('#0E1217', '#0A0E14')
      .replace('#151A22', '#141B26')
      .replace('#6A89A7', '#88BDF2');

    const specA = createSpec('spec_docs_3col', `${title} (3-Column Portal)`, '3-Column Portal', '#6A89A7', '#0E1217', '#151A22', '#F8FBFE');
    const specB = createSpec('spec_docs_component', `${title} (Component Playground)`, 'Component Playground', '#BDDDFC', '#090D12', '#101620', '#FFFFFF');
    const specC = createSpec('spec_docs_sdk', `${title} (Terminal SDK Guide)`, 'Terminal SDK Guide', '#88BDF2', '#0A0E14', '#141B26', '#F8FBFE');

    return [
      {
        id: 'spec_docs_3col',
        spec: specA,
        badge: '3-Column Portal',
        highlights: ['Language Code Switcher', 'Live JSON Response', 'Parameter Schema Table'],
        previewHtml: c1Html,
        files: this.makeWorkFiles(c1Html, 'Docs 3-Column Portal'),
      },
      {
        id: 'spec_docs_component',
        spec: specB,
        badge: 'Component Playground',
        highlights: ['Interactive Token Registry', 'Prop Toggles', 'Deep Navy Styling'],
        previewHtml: c2Html,
        files: this.makeWorkFiles(c2Html, 'Docs Component Playground'),
      },
      {
        id: 'spec_docs_sdk',
        spec: specC,
        badge: 'Terminal SDK Guide',
        highlights: ['Step-by-step Onboarding', 'Fast Copy Commands', 'High-Contrast Code'],
        previewHtml: c3Html,
        files: this.makeWorkFiles(c3Html, 'Docs Terminal SDK'),
      },
    ];
  }

  // ── 5. Dashboard Concepts ──────────────────────────────────────────────────
  private buildDashboardConcepts(_prompt: string): PortfolioConcept[] {
    const title = 'SaaS Revenue Operations Dashboard';

    const createSpec = (id: string, name: string, aesthetic: string, primary: string, bg: string, surface: string, text: string): PortfolioDesignSpec => ({
      id,
      name,
      templateId: 'modern_bento',
      templateVersion: '2.0.0',
      aesthetic,
      description: `Executive revenue analytics dashboard with live KPI sparklines, customer cohorts, and subscription status table.`,
      palette: {
        primary,
        secondary: '#BDDDFC',
        background: bg,
        surface,
        text,
        textMuted: '#8E9BAE',
        accent: '#88BDF2',
        border: 'rgba(255,255,255,0.08)',
      },
      typography: {
        fontHeading: 'Outfit, sans-serif',
        fontBody: 'Inter, sans-serif',
        fontMono: 'JetBrains Mono, monospace',
      },
      profile: {
        name: title,
        title: 'Executive Analytics Console',
        bio: 'Real-time telemetry and financial growth tracking.',
      },
      skills: [
        { name: 'MRR / ARR Trends', category: 'core', level: 99 },
        { name: 'Cohort Retention Matrix', category: 'core', level: 96 },
      ],
      projects: [],
      socialLinks: [],
      contact: {
        email: 'ops@prompthub.dev',
        ctaText: 'Export CSV Report',
        availableForHire: false,
      },
      interactiveFeatures: {
        hasCaseStudies: true,
      },
    });

    const c1Html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Direction A (Executive RevOps)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0E1318; color: #F8FBFE; font-family: 'Inter', sans-serif; padding: 20px; line-height: 1.5; }
    .container { max-width: 1000px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 20px; }
    .logo { font-size: 16px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px; }
    .badge { font-size: 11px; padding: 3px 8px; border-radius: 9999px; background: rgba(56, 73, 89, 0.5); color: #BDDDFC; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi-card { background: #161E26; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; }
    .kpi-label { font-size: 12px; color: #8E9BAE; font-weight: 500; }
    .kpi-value { font-size: 24px; font-weight: 800; color: #fff; margin: 6px 0; }
    .kpi-delta { font-size: 11px; color: #4ade80; font-weight: 600; }
    .table-container { background: #161E26; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; padding: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px; }
    th { text-align: left; padding: 8px; color: #8E9BAE; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.08); }
    td { padding: 10px 8px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .status-active { background: rgba(74, 222, 128, 0.15); color: #4ade80; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">📊 ${title} <span class="badge">Live Telemetry</span></div>
      <button style="background:#6A89A7; color:#fff; border:none; padding:6px 14px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;" onclick="this.innerText='Downloaded!';">Download CSV</button>
    </header>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Monthly Recurring Revenue</div>
        <div class="kpi-value">$142,850</div>
        <div class="kpi-delta">▲ +14.2% vs last month</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Net Revenue Retention</div>
        <div class="kpi-value">128.4%</div>
        <div class="kpi-delta">▲ +3.1% industry top 5%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Customer Churn Rate</div>
        <div class="kpi-value">0.82%</div>
        <div class="kpi-delta">▼ -0.15% low risk</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Active Subscriptions</div>
        <div class="kpi-value">1,489</div>
        <div class="kpi-delta">▲ +84 this week</div>
      </div>
    </div>
    <div class="table-container">
      <div style="font-size:14px; font-weight:700;">Recent Enterprise Subscriptions</div>
      <table>
        <thead>
          <tr><th>Account</th><th>Plan</th><th>MRR</th><th>Seats</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td>Acme Global Corp</td><td>Enterprise Annual</td><td>$4,200</td><td>120</td><td><span class="status-active">Active</span></td></tr>
          <tr><td>Linear Labs AI</td><td>Pro Studio</td><td>$1,850</td><td>45</td><td><span class="status-active">Active</span></td></tr>
          <tr><td>NorthStar FinTech</td><td>Enterprise Annual</td><td>$6,400</td><td>200</td><td><span class="status-active">Active</span></td></tr>
          <tr><td>Vertex Robotics</td><td>Pro Studio</td><td>$950</td><td>25</td><td><span class="status-active">Active</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

    const c2Html = c1Html
      .replace('Direction A (Executive RevOps)', 'Direction B (Cloud Health Telemetry)')
      .replace('#0E1318', '#070A0F')
      .replace('#161E26', '#0E141C')
      .replace('#6A89A7', '#BDDDFC');

    const c3Html = c1Html
      .replace('Direction A (Executive RevOps)', 'Direction C (Cohort Retention Studio)')
      .replace('#0E1318', '#131A22')
      .replace('#161E26', '#1C2733')
      .replace('#6A89A7', '#88BDF2');

    const specA = createSpec('spec_dash_revops', `${title} (Executive RevOps)`, 'Executive RevOps', '#6A89A7', '#0E1318', '#161E26', '#F8FBFE');
    const specB = createSpec('spec_dash_telemetry', `${title} (Cloud Telemetry)`, 'Cloud Telemetry', '#BDDDFC', '#070A0F', '#0E141C', '#FFFFFF');
    const specC = createSpec('spec_dash_cohort', `${title} (Cohort Retention)`, 'Cohort Retention', '#88BDF2', '#131A22', '#1C2733', '#F8FBFE');

    return [
      {
        id: 'spec_dash_revops',
        spec: specA,
        badge: 'Executive RevOps',
        highlights: ['MRR/ARR Velocity Cards', 'Subscription Table', 'Trend Sparklines'],
        previewHtml: c1Html,
        files: this.makeWorkFiles(c1Html, 'Dashboard Executive RevOps'),
      },
      {
        id: 'spec_dash_telemetry',
        spec: specB,
        badge: 'Cloud Telemetry',
        highlights: ['Cluster Status Gauges', 'Latency Heatmaps', 'Deep Dark Theme'],
        previewHtml: c2Html,
        files: this.makeWorkFiles(c2Html, 'Dashboard Cloud Telemetry'),
      },
      {
        id: 'spec_dash_cohort',
        spec: specC,
        badge: 'Cohort Retention',
        highlights: ['Monthly Cohort Matrix', 'Churn Diagnostics', 'High-Contrast Blue'],
        previewHtml: c3Html,
        files: this.makeWorkFiles(c3Html, 'Dashboard Cohort Retention'),
      },
    ];
  }
}

export const domainSpecService = new DomainSpecService();
