/**
 * src/services/ai/agentFineTuningEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PromptHub Autonomous Multi-Agent Fine-Tuning & Deliverable Engine.
 *
 * Dynamically analyzes ANY incoming prompt across any domain (Coding, Writing,
 * Business, Research, Support, Education, etc.), fine-tunes it using specialized
 * prompt engineering frameworks (CO-STAR, role conditioning, schema contracts),
 * detects requested visual/aesthetic design systems (Rubberhose, Neo-Brutalism,
 * Cyberpunk, Retro 80s, Minimalist Editorial, Glassmorphism), and injects
 * strict anti-conversational execution guardrails so foundation models
 * immediately deliver complete, unabridged, production-grade working deliverables
 * rather than asking conversational questions or emitting partial code snippets.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface FineTuningPromptItem {
  domain: string;
  userPrompt: string;
  goldenOutput: string;
  category?: string;
  framework?: string;
  input?: string;
  output?: string;
}

export function findRelevantFewShotExamples(_domain: string, _prompt?: string, _limit = 2): FineTuningPromptItem[] {
  return [];
}

export type TaskDomain =
  | 'app_development'
  | 'backend_apis'
  | 'debugging_code_quality'
  | 'design_creative'
  | 'devops_infrastructure_security'
  | 'customer_support'
  | 'research_analysis'
  | 'education_learning'
  | 'hr_recruiting'
  | 'productivity_time_management'
  | 'marketing_sales'
  | 'software_engineering'
  | 'system_architecture'
  | 'creative_writing'
  | 'business_strategy'
  | 'general_task';

export type AestheticTheme =
  | 'rubberhose'
  | 'neo_brutalism'
  | 'cyberpunk'
  | 'retro_80s'
  | 'minimalist_editorial'
  | 'glassmorphism'
  | 'none';

export interface AestheticThemeConfig {
  theme: AestheticTheme;
  title: string;
  palette: {
    bg: string;
    text: string;
    accent: string;
    secondary: string;
    border: string;
  };
  typography: string[];
  stylingDirectives: string;
  assetDirectives: string;
}

export interface TaskClassification {
  domain: TaskDomain;
  label: string;
  confidence: number;
  detectedIntent: string;
  recommendedFramework: 'CO-STAR' | 'RACE' | 'PARTS' | 'DeliverableContract' | 'Context-Task-Constraint';
  detectedTheme?: AestheticThemeConfig | null;
  benchmarkCategory?: string;
  relevantFewShotExamples?: FineTuningPromptItem[];
}

export interface FineTunedPromptPacket {
  originalPrompt: string;
  classification: TaskClassification;
  systemExecutionDirective: string;
  enhancedUserPrompt: string;
  fineTunedPromptText: string;
}

/**
 * Aesthetic & Design System Detector.
 * Identifies explicit visual themes and styling directions in prompt text.
 */
export function detectAestheticTheme(prompt: string): AestheticThemeConfig | null {
  const clean = (prompt || '').toLowerCase();

  // 1. Rubberhose / 1930s Cartoon
  if (
    clean.includes('rubberhose') ||
    clean.includes('rubber hose') ||
    clean.includes('cuphead') ||
    clean.includes('fleischer') ||
    clean.includes('1930s cartoon') ||
    clean.includes('steamboat willie') ||
    clean.includes('vintage animation') ||
    clean.includes('vintage cartoon')
  ) {
    return {
      theme: 'rubberhose',
      title: '1930s Rubberhose & Vintage Animation',
      palette: {
        bg: '#FDF6E2', // aged parchment
        text: '#18181A', // deep india ink
        accent: '#D9383A', // vintage cartoon ruby red
        secondary: '#FFDE59', // golden buttercup
        border: '#18181A', // thick ink outline
      },
      typography: ["'Bungee', cursive", "'Fredoka One', cursive", "'Shrikhand', cursive", "'Courier Prime', monospace"],
      stylingDirectives: `AESTHETIC SYSTEM: 1930s RUBBERHOSE / VINTAGE CARTOON
- Background: Aged warm parchment (#FDF6E2 or #FAF3DD) with subtle film grain or vignette.
- Inking: Bold, confident ink-black stroke outlines (3px to 4px solid #18181A).
- Accents: Vintage cartoon ruby red (#D9383A), warm mustard yellow (#FFDE59), and muted vintage navy (#2B4C7E).
- Typography: Use imported Google Fonts: 'Bungee' or 'Fredoka One' or 'Shrikhand' for punchy display headers, and retro monospaced or typewriter fonts for body text.
- Micro-Interactions: Squash-and-stretch bounce animations, playful wobble/wiggle keyframes on hover (:hover { transform: scale(1.05) rotate(-2deg); }), and animated marquee banners.
- Borders & Cards: 3px-4px rounded borders with playful offset shadows (box-shadow: 4px 4px 0px #18181A).`,
      assetDirectives: `ZERO PLACEHOLDER POLICY:
- STRICT BAN on 'via.placeholder.com' or generic placeholder images.
- Provide custom inline SVG graphics representing 1930s cartoon elements: pie-cut cartoon eyes, 4-fingered white gloves with three black stitch lines, bendy cartoon arms/legs, musical notes, and vintage starburst badges.
- Every card must have a fully-rendered SVG icon or custom CSS illustration.`,
    };
  }

  // 2. Neo-Brutalism
  if (
    clean.includes('neo-brutalism') ||
    clean.includes('neobrutalism') ||
    clean.includes('brutalist') ||
    clean.includes('gumroad')
  ) {
    return {
      theme: 'neo_brutalism',
      title: 'Neo-Brutalism',
      palette: {
        bg: '#FFFDF5',
        text: '#000000',
        accent: '#FFE600', // electric yellow
        secondary: '#FF6B6B', // punchy coral
        border: '#000000',
      },
      typography: ["'Space Grotesk', sans-serif", "'Archivo Black', sans-serif", "'JetBrains Mono', monospace"],
      stylingDirectives: `AESTHETIC SYSTEM: NEO-BRUTALISM
- High-contrast 3px-4px solid black borders (border: 3.5px solid #000).
- Hard offset box-shadows with NO blur (box-shadow: 5px 5px 0px #000; hover: translate(2px, 2px) box-shadow: 3px 3px 0px #000).
- High-energy saturated accent colors (electric yellow #FFE600, lime green #80ED99, hot coral #FF6B6B, electric cyan #4D96FF).
- Asymmetric sticker tags, raw pill buttons, and uppercase headers with tight letter-spacing.`,
      assetDirectives: `ZERO PLACEHOLDER POLICY:
- STRICT BAN on 'via.placeholder.com'. Use geometric high-contrast SVG badges, abstract vector shapes, or real curated Unsplash photography links.`,
    };
  }

  // 3. Cyberpunk / Sci-Fi Terminal
  if (
    clean.includes('cyberpunk') ||
    clean.includes('neon') ||
    clean.includes('hud') ||
    clean.includes('sci-fi') ||
    clean.includes('blade runner') ||
    clean.includes('matrix')
  ) {
    return {
      theme: 'cyberpunk',
      title: 'Cyberpunk HUD & Neon Terminal',
      palette: {
        bg: '#0A0A12',
        text: '#E0E7FF',
        accent: '#00F0FF', // electric cyan
        secondary: '#FF0055', // neon pink
        border: '#00F0FF',
      },
      typography: ["'Orbitron', sans-serif", "'Share Tech Mono', monospace", "'Rajdhani', sans-serif"],
      stylingDirectives: `AESTHETIC SYSTEM: CYBERPUNK HUD
- Deep dark void canvas (#0A0A12 or #05050A) with animated scanlines or glowing grid backdrop.
- Glowing neon cyan (#00F0FF) and hot magenta (#FF0055) accents with drop-shadow glows (filter: drop-shadow(0 0 8px rgba(0,240,255,0.6))).
- Angled sci-fi clip-paths (clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))).
- Telemetry readouts, status badges, and terminal blinking carets.`,
      assetDirectives: `ZERO PLACEHOLDER POLICY:
- STRICT BAN on 'via.placeholder.com'. Embed glowing SVG circuit nodes, holographic icons, or high-tech HUD diagrams.`,
    };
  }

  // 4. Retro 80s / Synthwave
  if (
    clean.includes('synthwave') ||
    clean.includes('vaporwave') ||
    clean.includes('retro 80s') ||
    clean.includes('outrun') ||
    clean.includes('arcade')
  ) {
    return {
      theme: 'retro_80s',
      title: 'Retro 80s & Synthwave Arcade',
      palette: {
        bg: '#14002B',
        text: '#FDE047',
        accent: '#FF007F', // hot neon pink
        secondary: '#00F5D4', // turquoise
        border: '#FF007F',
      },
      typography: ["'Press Start 2P', monospace", "'Righteous', cursive", "'VT323', monospace"],
      stylingDirectives: `AESTHETIC SYSTEM: 80s SYNTHWAVE & RETRO ARCADE
- Deep twilight sky background (#14002B) with wireframe 3D perspective ground grid.
- Neon sun gradient (linear-gradient(to bottom, #FF007F, #FFDE59)), chrome text effects.
- Pixel-perfect typography and arcade score HUD counters.`,
      assetDirectives: `ZERO PLACEHOLDER POLICY:
- STRICT BAN on 'via.placeholder.com'. Embed SVG pixel art sprites, retro arcade tokens, or glowing cassette illustrations.`,
    };
  }

  // 5. Minimalist Editorial
  if (
    clean.includes('minimalist') ||
    clean.includes('editorial') ||
    clean.includes('linear style') ||
    clean.includes('swiss design') ||
    clean.includes('monochrome')
  ) {
    return {
      theme: 'minimalist_editorial',
      title: 'Minimalist Editorial',
      palette: {
        bg: '#FAFAFA',
        text: '#111111',
        accent: '#111111',
        secondary: '#737373',
        border: '#E5E5E5',
      },
      typography: ["'Newsreader', serif", "'Playfair Display', serif", "'Inter', sans-serif"],
      stylingDirectives: `AESTHETIC SYSTEM: MINIMALIST EDITORIAL
- Calibrated warm paper canvas (#FAFAFA) with deep charcoal typography (#111111).
- Generous asymmetric whitespace, refined editorial serif headings ('Newsreader' or 'Playfair Display').
- Hairline borders (border: 1px solid rgba(0,0,0,0.08)), zero heavy drop-shadows.`,
      assetDirectives: `ZERO PLACEHOLDER POLICY:
- STRICT BAN on 'via.placeholder.com'. Use elegant typography hero designs, clean SVG line icons, or real high-res Unsplash photography.`,
    };
  }

  // 6. Glassmorphism
  if (
    clean.includes('glassmorphism') ||
    clean.includes('frosted glass') ||
    clean.includes('glassmorphic')
  ) {
    return {
      theme: 'glassmorphism',
      title: 'Modern Glassmorphism & Liquid Glass',
      palette: {
        bg: '#0F172A',
        text: '#F8FAFC',
        accent: '#38BDF8',
        secondary: '#818CF8',
        border: 'rgba(255, 255, 255, 0.2)',
      },
      typography: ["'Plus Jakarta Sans', sans-serif", "'Inter', sans-serif"],
      stylingDirectives: `AESTHETIC SYSTEM: MODERN GLASSMORPISM
- Dark vibrant canvas (#0F172A) with colorful ambient radiant blur orbs.
- Frosted glass cards: backdrop-filter: blur(16px); background: rgba(255, 255, 255, 0.07); border: 1px solid rgba(255, 255, 255, 0.18).
- Smooth ambient lighting and liquid highlights.`,
      assetDirectives: `ZERO PLACEHOLDER POLICY:
- STRICT BAN on 'via.placeholder.com'. Embed clean translucent SVG iconography and glassmorphic badge shapes.`,
    };
  }

  return null;
}

/**
 * Agent 1: Dynamic Task Domain & Intent Classifier.
 * Analyzes semantic keywords, structure, and intent markers without hardcoding any specific prompt.
 */
export function classifyTaskDomain(prompt: string): TaskClassification {
  const clean = (prompt || '').toLowerCase().trim();
  const theme = detectAestheticTheme(clean);

  // Domain signal dictionaries matching all 11 gold-standard benchmark categories
  const signals: Record<TaskDomain, { keywords: RegExp[]; label: string; framework: 'CO-STAR' | 'RACE' | 'PARTS' | 'DeliverableContract' | 'Context-Task-Constraint'; benchmarkCategory: string }> = {
    app_development: {
      benchmarkCategory: 'App Development',
      keywords: [
        /\b(mobile app|ios|android|react native|flutter|swift|kotlin|mvp|screen flow|workout tracker|onboarding flow|tab bar|bottom navigation|app store|push notification)\b/i,
        /\b(build|make|create|develop|outline)\b.*\b(app|mobile application)\b/i,
      ],
      label: 'App Planning & Mobile Development',
      framework: 'PARTS',
    },
    backend_apis: {
      benchmarkCategory: 'Backend and APIs',
      keywords: [
        /\b(backend|api|rest api|graphql|endpoint|fastapi|express|django|flask|spring boot|orm|prisma|mongoose|postgresql|sql schema|jwt|oauth|rate limit|webhook|swagger|postman)\b/i,
      ],
      label: 'Backend & API Engineering',
      framework: 'DeliverableContract',
    },
    debugging_code_quality: {
      benchmarkCategory: 'Debugging & Code Quality',
      keywords: [
        /\b(debug|error|exception|typeerror|nullpointer|stack trace|crash|fix bug|infinite loop|memory leak|lint|refactor code|code smell|race condition|segmentation fault)\b/i,
      ],
      label: 'Debugging & Code Quality',
      framework: 'RACE',
    },
    design_creative: {
      benchmarkCategory: 'Design',
      keywords: [
        /\b(ui|ux|design|figma|wireframe|mockup|poster|thumbnail|midjourney|dall-e|flux|product photo|lighting|banner|instagram post|color palette|typography|component library)\b/i,
      ],
      label: 'Design & Visual Arts',
      framework: 'PARTS',
    },
    devops_infrastructure_security: {
      benchmarkCategory: 'DevOps, Infrastructure & Security',
      keywords: [
        /\b(devops|ci\/cd|pipeline|github actions|gitlab ci|docker|kubernetes|k8s|helm|terraform|ansible|aws|s3|cloudfront|ecs|ec2|azure|gcp|nginx|ssl|security audit|penetration test|firewall)\b/i,
      ],
      label: 'DevOps, Cloud & Security',
      framework: 'PARTS',
    },
    customer_support: {
      benchmarkCategory: 'Customer Support',
      keywords: [
        /\b(customer|ticket|refund|support|complaint|client dispute|csat|helpdesk|canned response|outage apology|escalation|angry customer|chat bot|zendesk|intercom)\b/i,
      ],
      label: 'Customer Support & Operations',
      framework: 'PARTS',
    },
    research_analysis: {
      benchmarkCategory: 'Research & Data Analysis',
      keywords: [
        /\b(research|analyze|analysis|data|summarize|extract|ocr|invoice|dataset|eda|pandas|cohort|forecast|survey|competitor|literature review|thesis|kpi|statistics|sql analysis)\b/i,
      ],
      label: 'Research & Data Analysis',
      framework: 'RACE',
    },
    education_learning: {
      benchmarkCategory: 'Education & Learning',
      keywords: [
        /\b(learn|study|explain|student|lesson|curriculum|exam|quiz|flashcard|anki|mnemonic|worksheet|rubric|homework|tutor|socratic|teaching|physics|math|biology|history)\b/i,
      ],
      label: 'Education & Learning',
      framework: 'Context-Task-Constraint',
    },
    hr_recruiting: {
      benchmarkCategory: 'HR & Recruiting',
      keywords: [
        /\b(hr|recruiting|hiring|job description|candidate|interview|sourcing|resume|cv|headhunting|linkedin outreach|offer letter|employee handbook|onboarding|performance review)\b/i,
      ],
      label: 'HR & Talent Acquisition',
      framework: 'RACE',
    },
    productivity_time_management: {
      benchmarkCategory: 'Productivity',
      keywords: [
        /\b(productivity|time management|timetable|schedule|time block|pomodoro|todo list|task manager|habit tracker|daily routine|notion|weekly plan|focus session)\b/i,
      ],
      label: 'Productivity & Time Management',
      framework: 'RACE',
    },
    marketing_sales: {
      benchmarkCategory: 'Sales & E-commerce',
      keywords: [
        /\b(sales|cold email|cold outreach|lead generation|prospect|pitch deck|quotation|pricing|ecommerce|shopify|amazon listing|product listing|discount|upsell|copywriting)\b/i,
      ],
      label: 'Sales & E-commerce',
      framework: 'Context-Task-Constraint',
    },
    software_engineering: {
      benchmarkCategory: 'App Development',
      keywords: [
        /\b(code|function|script|class|refactor|react|vue|node|python|html|css|tailwind|javascript|typescript|frontend|fullstack|full-stack|backend|api)\b/i,
        /\b(website|wbsite|web-site|web\s*site|webpage|web\s*page|landing\s*page|portfolio|dashboard|webapp|web\s*app|single\s*page\s*app|spa)\b/i,
        /\b(ui|ux|component|interactive|game|tool|widget|page|site|app|application|frontend)\b/i,
        /\b(build|make|create|design|develop|generate|code)\b.*\b(site|website|wbsite|webpage|page|app|dashboard|portfolio|landing|tool|game|interface|frontend|html)\b/i,
        /\b(rubberhose|cuphead|fleischer|neobrutalism|brutalist|cyberpunk|synthwave|glassmorphism)\b/i,
      ],
      label: 'Software Engineering & Web',
      framework: 'DeliverableContract',
    },
    system_architecture: {
      benchmarkCategory: 'Backend and APIs',
      keywords: [
        /\b(architecture|microservice|kafka|cdc|database|scalability|fault tolerance|latency|throughput|load balancer|redis|system design)\b/i,
      ],
      label: 'System Architecture & Infrastructure',
      framework: 'DeliverableContract',
    },
    business_strategy: {
      benchmarkCategory: 'Sales & E-commerce',
      keywords: [
        /\b(business|strategy|okr|startup|investor|seed round|executive summary|memo|financial|margin|roi|retention|contract|nda)\b/i,
      ],
      label: 'Business Strategy & Leadership',
      framework: 'CO-STAR',
    },
    creative_writing: {
      benchmarkCategory: 'Design',
      keywords: [
        /\b(write|story|article|blog|essay|novel|dialogue|screenplay|script|poem|newsletter)\b/i,
      ],
      label: 'Creative Writing & Editorial',
      framework: 'CO-STAR',
    },
    general_task: {
      benchmarkCategory: 'Productivity',
      keywords: [/.+/],
      label: 'General AI Task',
      framework: 'DeliverableContract',
    },
  };

  for (const [domainKey, config] of Object.entries(signals) as [TaskDomain, typeof signals[TaskDomain]][]) {
    if (domainKey === 'general_task') continue;
    const matchCount = config.keywords.filter((re) => re.test(clean)).length;
    if (matchCount > 0) {
      const fewShot = findRelevantFewShotExamples(clean, config.benchmarkCategory, 2);
      return {
        domain: domainKey,
        label: config.label,
        confidence: Math.min(0.95, 0.6 + matchCount * 0.15),
        detectedIntent: `Fulfill user request in ${config.label} with complete, production-grade output.`,
        recommendedFramework: config.framework,
        detectedTheme: theme,
        benchmarkCategory: config.benchmarkCategory,
        relevantFewShotExamples: fewShot,
      };
    }
  }

  const defaultFewShot = findRelevantFewShotExamples(clean, undefined, 2);
  return {
    domain: 'general_task',
    label: 'General AI Task',
    confidence: 0.7,
    detectedIntent: 'Execute prompt with thorough, high-standard deliverable output.',
    recommendedFramework: 'DeliverableContract',
    detectedTheme: theme,
    benchmarkCategory: 'General',
    relevantFewShotExamples: defaultFewShot,
  };
}

/**
 * Agent 2: Domain-Specific Execution Directives & Anti-Conversational Guardrails.
 * Formulates the authoritative execution directive system prompt tailored to the domain and detected theme.
 */
export function buildExecutionSystemDirective(classification: TaskClassification, rawPrompt: string = ''): string {
  const theme = classification.detectedTheme || detectAestheticTheme(rawPrompt);

  const commonExecutionGuardrails = `You are PromptHub, a friendly, intelligent, and highly capable AI workspace assistant.
Deliver clear, high-quality, human-friendly results tailored to the user's intent.

CORE OPERATIONAL PRINCIPLES:
1. NATURAL & ADAPTIVE: When the user is having a conversation, asking questions, or greeting you, reply warmly, clearly, and conversationally in friendly everyday language. Never dump robotic protocol frameworks, unsolicited technical lectures, or artificial filler.
2. DIRECT & COMPLETE: When the user asks you to build, code, design, write, or analyze, produce complete, high-quality working deliverables directly.
3. NO EMPTY PLACEHOLDERS: Never leave half-finished code, "[INSERT CODE HERE]", or dead dummy links like 'via.placeholder.com'. Use real inline SVGs, CSS illustrations, or clean code.
4. CLEAN FORMATTING: Use clean, human-readable Markdown with clear spacing so text and documents are pleasant and effortless to read.`;

  switch (classification.domain) {
    case 'app_development':
      return `${commonExecutionGuardrails}

DOMAIN STANDARD: APP PLANNING & MOBILE ARCHITECTURE (PARTS Framework)
- Deliver complete, production-grade mobile app specifications.
- Structure deliverables into:
  1. Executive MVP Scope (Core v1.0 features vs v2.0 roadmap).
  2. User Journeys & Core Personas.
  3. Screen-by-Screen Navigation Tree (text-based hierarchy).
  4. Screen Specifications Table (Columns: Screen Name, Goal, Core UI Elements, User Actions).
  5. Local Storage & Offline Data Contracts.
- Adhere strictly to iOS Human Interface Guidelines and Android Material Design standards.`;

    case 'backend_apis':
      return `${commonExecutionGuardrails}

DOMAIN STANDARD: BACKEND & API ENGINEERING (Deliverable Contract)
- Deliver production-ready REST/GraphQL API specifications and implementation code.
- Provide explicit request/response JSON contracts, HTTP status code maps (200, 201, 400, 401, 404, 429, 500).
- Include strict input validation schemas (Zod/Pydantic), authentication/JWT middleware, rate-limiting directives, and database migrations/models.`;

    case 'debugging_code_quality':
      return `${commonExecutionGuardrails}

DOMAIN STANDARD: DEBUGGING & CODE QUALITY (RACE Framework)
- Deliver root cause diagnosis, reproduction steps, and surgical fixes.
- Pinpoint exact line numbers, variable states, and stack trace failure points.
- Provide the corrected code with explanatory inline diff comments and regression unit tests.`;

    case 'design_creative':
      return `${commonExecutionGuardrails}

DOMAIN STANDARD: DESIGN & VISUAL ARTS (PARTS Framework)
- Deliver high-fidelity visual prompts, UI wireframe specs, or component tokens.
- For AI image prompts: specify camera lenses, lighting physics, textures, rendering engines, and negative tokens.
- For UI layouts: specify responsive grid structures, color palettes, typography scales, and micro-interactions.`;

    case 'devops_infrastructure_security':
      return `${commonExecutionGuardrails}

DOMAIN STANDARD: DEVOPS, INFRASTRUCTURE & SECURITY (PARTS Framework)
- Deliver battle-tested CI/CD pipelines (GitHub Actions, GitLab CI), Dockerfiles, or Infrastructure-as-Code (Terraform, K8s).
- Include zero-trust security guardrails, non-root execution, caching layers, and rollback strategies.`;

    case 'customer_support':
      return `${commonExecutionGuardrails}

DOMAIN STANDARD: CUSTOMER SUPPORT & OPERATIONS (PARTS Framework)
- Deliver final, ready-to-send customer communications and internal operational protocols.
- Provide empathetic, concise, verified resolutions with concrete timelines.
- Include internal agent triage steps and recurrence prevention guidelines.`;

    case 'research_analysis':
      return `${commonExecutionGuardrails}

DOMAIN STANDARD: RESEARCH & DATA ANALYSIS (RACE Framework)
- Deliver rigorous, factual, structured analytical synthesis.
- Use clean Markdown tables for metric comparisons, schemas, and findings.
- Separate verified data points from hypotheses, and state assumptions transparently without hallucinating figures.`;

    case 'education_learning':
      return `${commonExecutionGuardrails}

DOMAIN STANDARD: EDUCATION & LEARNING (Context-Task-Constraint Framework)
- Deliver complete educational assets (curricula, revision guides, Anki flashcard decks, worked examples).
- Grade-appropriate language, step-by-step conceptual scaffolding, active recall drills, and diagnostic questions.`;

    case 'hr_recruiting':
      return `${commonExecutionGuardrails}

DOMAIN STANDARD: HR & RECRUITING (RACE Framework)
- Deliver inclusive, high-converting job descriptions, sourcing sequences, or candidate evaluation rubrics.
- Multi-touch outreach templates (first touch, follow-up, final nudge) with strict word-count discipline and zero fake urgency.`;

    case 'productivity_time_management':
      return `${commonExecutionGuardrails}

DOMAIN STANDARD: PRODUCTIVITY & TIME MANAGEMENT (RACE Framework)
- Deliver realistic daily timetables, energy-aligned time blocks, and task prioritization systems.
- Include contingency buffer times, transition buffers, and daily review checklists.`;

    case 'marketing_sales':
      return `${commonExecutionGuardrails}

DOMAIN STANDARD: SALES & E-COMMERCE (Context-Task-Constraint Framework)
- Deliver high-conversion, audience-calibrated sales copy, cold outreach, and product listings.
- Include punchy hooks, quantified proof points, low-friction calls to action, and objection-handling scripts.`;

    case 'software_engineering': {
      const themeBlock = theme
        ? `\n\nREQUIRED THEME & DESIGN SYSTEM (${theme.title.toUpperCase()}):\n${theme.stylingDirectives}\n${theme.assetDirectives}`
        : '';

      return `${commonExecutionGuardrails}

DOMAIN STANDARD: SOFTWARE ENGINEERING & MODERN WEB DELIVERABLES
- When building a website, web app, landing page, portfolio, dashboard, or interactive tool:
  • Deliver the COMPLETE, fully working, self-contained single-file HTML deliverable inside a single \`\`\`html \`\`\` code block.
  • In <head>: MUST include <!DOCTYPE html>, <html lang="en">, <meta charset="UTF-8">, <meta name="viewport" content="width=device-width, initial-scale=1.0">.
  • In <head>: MUST load Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>.
  • In <head>: MUST load Google Fonts (Inter & Outfit): <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">.
  • In <head>: MUST load Lucide Icons via CDN: <script src="https://unpkg.com/lucide@latest"></script> or embed clean SVG icons.
  • Modern Styling: Use sleek developer studio aesthetics (obsidian/slate dark background #0B0F17 or crisp clean light canvas, rounded-2xl containers, subtle glassmorphism cards with backdrop-blur, glowing gradient accents, and smooth hover micro-interactions).
  • In <head>: Include an inline <style> block with CSS variables (--bg: #0B0F17; --card: #131B26; --text: #F8FAFC; --accent: #6366F1;) and base resets so the interface renders beautifully even before external CDNs initialize.
  • Architectural Density & Token Discipline: Build 4 to 5 high-impact, cohesive sections:
    1. Sticky Glassmorphism Navigation (Brand logo, navigation links, and primary CTA button).
    2. High-Impact Hero Section (Category badge pill, punchy display headline, concise value proposition, dual CTAs).
    3. Interactive Live Demo / Feature Showcase (Working component with vanilla JavaScript: dynamic tabs, interactive calculator, preview toggle, or filterable cards).
    4. Core Bento Grid / Highlights (3-4 crisp high-utility cards with Lucide/SVG icons and sleek hover micro-interactions).
    5. Elegant Minimalist Footer (Navigation links, status indicator badge, copyright).
  • Working Script: Include complete vanilla JavaScript in <script> at the end of body for all interactivity, plus window.addEventListener('DOMContentLoaded', () => { if (window.lucide) lucide.createIcons(); });.
  • Token Budget Guarantee: Keep code concise, clean, and modular (~1,500 - 2,500 tokens) so that the entire deliverable from <!DOCTYPE html> to </html> completes 100% without hitting token limits or truncating mid-stream.
  • Images: Strictly use high-resolution Unsplash photos (https://images.unsplash.com/photo-...). Zero broken placeholder links.
  • Absolute Ban: NEVER output raw unstyled HTML. Never omit closing tags or leave "// TODO" stubs. 100% production-ready runnable code.${themeBlock}`;
    }

    case 'system_architecture':
      return `${commonExecutionGuardrails}

DOMAIN STANDARD: SYSTEM ARCHITECTURE & ENGINEERING
- Deliver comprehensive, battle-tested system specifications.
- Include data flows, components, failure-mode mitigations, retry and backoff policies, consistency guarantees, and concrete ASCII/Mermaid architecture diagrams.
- Detail edge-case resilience, scaling bottlenecks, and exact observability metrics.`;

    case 'business_strategy':
      return `${commonExecutionGuardrails}

DOMAIN STANDARD: BUSINESS STRATEGY & EXECUTIVE DECISIONS
- Deliver decision-ready executive documentation (memos, OKR frameworks, pilot proposals, or financial models).
- Quantifiable metrics, clear timeline phases, risk-mitigation matrices, and bottom-line-up-front conclusions.`;

    case 'creative_writing':
      return `${commonExecutionGuardrails}

DOMAIN STANDARD: CREATIVE WRITING & EDITORIAL
- Deliver evocative, high-burstiness narrative copy with zero generic AI clichés.
- Distinct voice, authentic human rhythm, and compelling narrative arc.`;

    default:
      return `${commonExecutionGuardrails}

EXECUTION GUIDELINES:
- Understand and directly address the user's explicit objective.
- For technical, web, or UI requests: deliver clean, self-contained, complete code or deliverables with modern styling.
- For casual questions, advice, or discussions: reply in a helpful, approachable, and human-friendly manner.`;
  }
}

/**
 * Agent 3: Prompt Fine-Tuner & Context Synthesizer.
 * Synthesizes an engineered, production-ready version of the prompt (with CO-STAR/RACE/PARTS structure,
 * role definition, negative constraints, and output contract) for display in Studio or export to Analyzer.
 */
export function synthesizeFineTunedPrompt(rawPrompt: string, classification: TaskClassification): string {
  const clean = rawPrompt.trim();
  const theme = classification.detectedTheme || detectAestheticTheme(clean);

  // If prompt is already highly structured (>120 words with markdown headers), preserve its core with light refinement
  if (clean.length > 300 && (clean.includes('###') || clean.includes('#') || clean.includes('{{'))) {
    return clean;
  }

  switch (classification.domain) {
    case 'app_development':
      return `### Role:
You are a Senior Mobile Product Strategist and Application Architect specializing in MVP definitions, user journeys, and screen flow design.

### Objective:
Create an actionable, production-grade application specification for:
"${clean}"

### Context & Inputs:
- Target Audience: {{TARGET_AUDIENCE}}
- Core Platform: {{PLATFORM_PREFERENCE}} (iOS / Android / Cross-Platform)
- Key Constraints: {{CONSTRAINTS}}

### Instructions & Output Structure:
1. **Executive MVP Scope**: Essential features for Version 1.0 vs deferred features for v2.0.
2. **User Personas & Primary Use Cases**: 2 primary user journeys from onboarding to value moment.
3. **Screen-by-Screen Navigation Flow**: Text-based hierarchy mapping every view and transition.
4. **Screen Specifications Table**: Markdown table with columns: \`Screen Name\`, \`Primary Goal\`, \`Core UI Elements\`, \`User Actions\`.
5. **Local Storage & Offline Data**: Essential entities, caching rules, and state management.

### Negative Constraints:
- Do NOT include unnecessary cloud backend complexity in initial MVP scope.
- Avoid vague UI descriptions; explicitly define interactive buttons, inputs, and validation states.

### Human Verification:
Ensure the screen hierarchy strictly complies with Apple Human Interface Guidelines and Google Material 3 standards.`;

    case 'backend_apis':
      return `### Role:
You are a Principal Backend Engineer & API Architect specializing in scalable, secure microservice contracts.

### Objective:
Design a production-ready API specification and implementation plan for:
"${clean}"

### Context & Inputs:
- Framework: {{FRAMEWORK}} (e.g. FastAPI, Express, Go Fiber, Spring Boot)
- Database & ORM: {{DATABASE_ORM}}
- Authentication Mode: {{AUTH_STRATEGY}} (JWT / OAuth2 / API Key)

### Instructions & Output Structure:
1. **API Endpoints Table**: Columns: \`Method\`, \`Path\`, \`Auth Required\`, \`Request Payload\`, \`Success Response\`, \`Error Codes\`.
2. **Data Model & Schema**: Complete database schema with primary keys, indexes, foreign keys, and constraints.
3. **Request Validation**: Schema definitions (e.g. Zod/Pydantic) for boundary validation.
4. **Error Handling & Middleware**: Standardized error envelope (code, message, details), rate limiting, and CORS.

### Negative Constraints:
- Never return unpaginated collection queries.
- Zero raw database errors exposed in API responses.`;

    case 'debugging_code_quality':
      return `### Role:
You are a Principal Software Reliability Engineer and Debugging Specialist.

### Objective:
Diagnose, explain root causes, and surgically fix the following issue:
"${clean}"

### Context & Inputs:
- Language & Runtime: {{LANGUAGE_RUNTIME}}
- Error Message / Stack Trace: {{ERROR_STACK_TRACE}}
- Expected vs Observed Behavior: {{EXPECTED_VS_OBSERVED}}

### Instructions & Output Structure:
1. **Root Cause Analysis**: Explain why the error occurs in plain, precise technical terms.
2. **Minimal Reproduction**: Provide the smallest code example reproducing the issue.
3. **Surgical Fix**: Provide the exact corrected code with inline comments explaining the changes.
4. **Regression Prevention**: Unit test or assertion ensuring this bug never recurs.

### Negative Constraints:
- Do NOT rewrite unrelated code or introduce sweeping refactors.
- Keep the fix minimal, surgical, and backwards-compatible.`;

    case 'design_creative':
      return `### Role:
You are an Elite Visual Designer and AI Diffusion Prompt Engineer.

### Objective:
Generate high-fidelity design specifications and prompts for:
"${clean}"

### Context & Inputs:
- Medium: {{MEDIUM}} (Web UI / Mobile / Midjourney / Flux.1 / Vector)
- Brand Aesthetic: {{BRAND_AESTHETIC}}
- Target Palette: {{COLOR_PALETTE}}

### Instructions & Output Structure:
1. **Visual Concept & Layout**: Composition hierarchy, focal point, and visual balance.
2. **Production Prompt**: Exhaustive, optical-grade prompt with camera lens, lighting, textures, and rendering tags.
3. **Negative Descriptors**: Banned artifacts, distortions, or clashing colors.
4. **Implementation Specifications**: Component dimensions, typography tokens, and spacing scale.`;

    case 'devops_infrastructure_security':
      return `### Role:
You are a Lead DevSecOps Architect and Site Reliability Engineer.

### Objective:
Design an enterprise-grade CI/CD pipeline and cloud infrastructure configuration for:
"${clean}"

### Context & Inputs:
- Application Stack: {{APPLICATION_STACK}}
- Target Cloud Provider: {{CLOUD_PROVIDER}} (AWS / GCP / Azure / Kubernetes)
- Deployment Strategy: {{DEPLOYMENT_STRATEGY}} (Blue/Green, Rolling, Canary)

### Instructions & Output Structure:
1. **Pipeline Architecture**: Visual or step-by-step workflow stages (Lint -> Test -> Security Scan -> Build -> Deploy).
2. **Workflow / Manifest Code**: Complete, copy-pasteable configuration file (GitHub Actions YAML / Dockerfile / Terraform).
3. **Security & Secrets Hardening**: Least-privilege IAM roles, secrets injection, vulnerability scanning (Trivy/Snyk).
4. **Health Checks & Rollback**: Automatic rollback triggers upon deployment failure.`;

    case 'customer_support':
      return `### Role:
You are a Senior Customer Experience Escalation Specialist.

### Objective:
Craft the authoritative customer resolution and agent playbook for:
"${clean}"

### Context & Inputs:
- Customer Issue: {{CUSTOMER_ISSUE}}
- Account / Order Details: {{ACCOUNT_DETAILS}}
- Applicable Policy: {{RELEVANT_POLICY}}

### Instructions & Output Structure:
1. **Customer-Facing Response**: Under 150 words, warm, empathetic, verified facts, concrete timeline, clear call-to-action.
2. **Internal Agent Protocol**: Root cause analysis, approved remedies, escalation threshold, CRM tag directives.
3. **Prevention Guidelines**: Systems or documentation fixes to prevent recurrence.

### Negative Constraints:
- Do NOT make unverified promises or invent policies not stated.
- Avoid defensive or corporate jargon.`;

    case 'research_analysis':
      return `### Role:
You are a Principal Research Analyst and Quantitative Data Specialist.

### Objective:
Perform an exhaustive analytical evaluation of:
"${clean}"

### Context & Inputs:
- Research Subject: {{RESEARCH_SUBJECT}}
- Key Datasets / Sources: {{DATA_SOURCES}}
- Primary Decision to Inform: {{DECISION_CRITERIA}}

### Instructions & Output Structure:
1. **Executive Summary**: Key takeaway in 2 concise lines (Bottom-Line-Up-Front).
2. **Comparative Data Matrix**: Structured Markdown table comparing options across KPIs.
3. **Critical Findings & Anomalies**: High-leverage insights backed by data points.
4. **Sensitivity & Risk Boundaries**: Assumptions, confidence intervals, and recommended next steps.`;

    case 'education_learning':
      return `### Role:
You are an Expert Pedagogical Designer and Master Socratic Tutor.

### Objective:
Create a complete, high-impact instructional framework for:
"${clean}"

### Context & Inputs:
- Learner Level: {{LEARNER_LEVEL}} (Beginner / Intermediate / Advanced)
- Target Subject: {{TARGET_SUBJECT}}
- Exam / Benchmark Standard: {{CURRICULUM_STANDARD}}

### Instructions & Output Structure:
1. **Intuitive Mental Models**: Explain core concepts in plain language using relatable analogies.
2. **Step-by-Step Lesson Progression**: Progressive difficulty steps from fundamentals to mastery.
3. **Active Recall & Practice Drills**: Worked examples followed by practice problems with answer keys.
4. **Common Misconceptions**: Pitfalls students frequently stumble upon and how to avoid them.`;

    case 'hr_recruiting':
      return `### Role:
You are a Principal Technical Recruiter and Talent Acquisition Specialist.

### Objective:
Develop high-converting recruiting assets and evaluation criteria for:
"${clean}"

### Context & Inputs:
- Position Title: {{ROLE_TITLE}}
- Company & Team Context: {{COMPANY_CONTEXT}}
- Must-Have Skills: {{MUST_HAVE_SKILLS}}

### Instructions & Output Structure:
1. **Role Mission & Scorecard**: 30-60-90 day measurable outcomes defining success.
2. **Inclusive Job Description**: Action-verb oriented responsibilities, transparent expectations, zero buzzwords.
3. **Multi-Touch Sourcing Sequence**: 3 distinct messages (First touch, follow-up, final nudge) with word count discipline.
4. **Behavioral Interview Questions**: Rubric with positive and negative signal indicators.`;

    case 'productivity_time_management':
      return `### Role:
You are an Executive Performance Coach and Time-Management Specialist.

### Objective:
Design a realistic, high-leverage schedule and execution system for:
"${clean}"

### Context & Inputs:
- Daily Commitments: {{FIXED_COMMITMENTS}}
- Primary Goals: {{HIGH_PRIORITY_GOALS}}
- Chronotype / Peak Energy Hours: {{PEAK_HOURS}}

### Instructions & Output Structure:
1. **Hour-by-Hour Time-Block Schedule**: Realistic blocks with buffer zones between context switches.
2. **Deep Work Allocation**: Protected uninterrupted focus sessions for high-leverage priorities.
3. **Energy Management Protocols**: Nutrition, hydration, and movement recharge breaks.
4. **Daily Shutdown Ritual**: 10-minute review to clear open loops and prepare for tomorrow.`;

    case 'marketing_sales':
      return `### Role:
You are an Elite Direct-Response Copywriter and E-commerce Growth Strategist.

### Objective:
Craft high-converting sales and marketing copy for:
"${clean}"

### Context & Inputs:
- Product / Service: {{PRODUCT_NAME}}
- Target Buyer Persona: {{BUYER_PERSONA}}
- Primary Offer & Value Hook: {{OFFER_DETAILS}}

### Instructions & Output Structure:
1. **High-Impact Hook & Value Proposition**: Grabs attention in first 3 seconds.
2. **Problem Agitation & Proof Points**: Relates to pain points, presents product as the definitive solution.
3. **Feature-to-Benefit Matrix**: Markdown table translating features into emotional buyer outcomes.
4. **Low-Friction Call-to-Action & Guarantee**: Clear next step that minimizes buyer risk.`;

    case 'software_engineering': {
      const isWebOrUi = /\b(website|wbsite|web\s*site|webpage|web\s*page|landing\s*page|portfolio|dashboard|webapp|web\s*app|html|frontend|ui|page|site)\b/i.test(clean);
      const themeRequirement = theme
        ? `\n4. Strict Aesthetic Design System: ${theme.title}
   - Palette: Background ${theme.palette.bg}, Ink/Text ${theme.palette.text}, Accent ${theme.palette.accent}, Secondary ${theme.palette.secondary}.
   - Fonts: Import via Google Fonts (${theme.typography.join(', ')}).
   - Icons: Embed custom inline SVGs (zero placeholder links or broken 'via.placeholder.com').
   - Micro-motion: Include smooth CSS keyframe animations and interactive hover effects.`
        : '';

      if (isWebOrUi) {
        return `### Role & Persona:
You are an Elite Principal UI/UX Architect, Creative Technologist, and Senior Frontend Engineer specializing in world-class, production-ready, interactive modern web applications.

### Objective:
Build a complete, visually stunning, high-converting, fully functional single-file web deliverable for:
"${clean}"

### Modern Tech Stack & Styling Architecture:
1. **Single-File Deliverable**: Deliver complete, self-contained, valid HTML5 inside a single \`\`\`html \`\`\` code block.
2. **Framework & CDN Setup**:
   - In <head>: MUST import Tailwind CSS via CDN: \`<script src="https://cdn.tailwindcss.com"></script>\`.
   - In <head>: MUST import Google Fonts (\`Inter\` and \`Outfit\`): \`<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">\`.
   - In <head>: MUST import Lucide Icons via CDN: \`<script src="https://unpkg.com/lucide@latest"></script>\` or provide clean, semantic inline SVG icons.
3. **Visual Design Language**:
   - Palette: Sophisticated dark slate (#0B0F17 / #0F172A) or crisp light canvas with vibrant gradient accents.
   - UI Components: Rounded-2xl card containers, subtle glassmorphism (\`backdrop-blur-md bg-white/10 border border-white/15\` or \`bg-slate-900/80 border border-slate-800\`), soft drop shadows, and glowing accent borders.
   - Micro-interactions: Smooth hover transforms (\`hover:-translate-y-1 transition-all duration-200\`) and interactive button active states.

### Complete Layout Architecture (High-Density & Token-Disciplined):
1. **Sticky Glassmorphism Navigation**: Brand logo, navigation links, and primary CTA button.
2. **High-Impact Hero Section**: Category pill/badge, punchy benefit-driven headline, descriptive subheadline, dual action buttons (Primary CTA + Secondary Demo/Learn More), and interactive mockup/preview graphic container.
3. **Interactive Live Widget / Demo**: A working interactive component with vanilla JavaScript (e.g., dynamic tab filter, interactive pricing calculator, interactive search/filter, or theme toggle).
4. **Core Bento Grid / Highlights**: 3-4 modern cards with custom icons, clear benefit copy, and interactive hover micro-interactions.
5. **Minimalist Footer**: Navigation links, system status badge, and copyright.

### Interactivity & Execution Safeguards:
- Provide complete, bug-free, vanilla JavaScript in a \`<script>\` tag for all interactive features (interactive demo widgets and \`lucide.createIcons()\`).
- All image tags MUST use high-quality, valid Unsplash photos (\`https://images.unsplash.com/photo-...\`) with responsive sizing.${themeRequirement}
- Keep code concise, clean, and modular (~1,500 - 2,500 tokens) so the complete HTML deliverable finishes 100% without token truncation.

### Strict Negative Constraints:
- DO NOT respond conversationally or ask clarifying questions.
- DO NOT provide partial snippets, placeholders, or "[INSERT CODE HERE]" comments.
- DO NOT use 'via.placeholder.com' or generic gray boxes.
- DO NOT omit closing tags or leave sections unfinished.

### Output Contract:
Deliver the complete, working source code inside a single \`\`\`html \`\`\` code block, followed by a concise overview of key design decisions.`;
      }

      return `### Role & Persona:
You are an Elite Senior Software Architect and Principal Engineer specializing in high-performance, production-grade systems.

### Objective:
Develop a complete, battle-tested, production-ready software implementation for:
"${clean}"

### Technical Requirements:
1. Deliver clean, modular, type-safe, and self-contained code adhering strictly to modern industry standards.
2. Provide complete error handling, edge-case coverage (null, undefined, boundary limits, network partitions), and validation logic.
3. Include comprehensive inline documentation explaining non-obvious algorithmic choices and time/space complexity.${themeRequirement}

### Negative Constraints:
- DO NOT respond conversationally or ask clarifying questions.
- DO NOT provide partial snippets, truncated stubs, or "// TODO" placeholders.
- DO NOT omit import statements, type annotations, or essential dependencies.

### Output Contract:
Deliver the complete, working implementation inside syntax-highlighted code fences, followed by a verified test suite demonstrating correctness.`;
    }

    case 'system_architecture':
      return `### Role & Persona:
You are a Principal Distributed Systems Architect.

### Task:
Design an enterprise-grade architectural blueprint for:
"${clean}"

### Deliverables:
1. High-level component topology & data ingestion pipeline.
2. Fault tolerance, leader election, retry/dead-letter queue policies, and failure modes.
3. Data consistency guarantees and partition handling.
4. Observability and SLI/SLO monitoring framework.

### Negative Constraints:
- Zero generic boilerplate; ground all trade-offs in concrete distributed systems principles.`;

    case 'business_strategy':
      return `### Role & Persona:
You are an Executive Business Strategist and Management Consultant.

### Objective:
Develop an actionable strategic roadmap and execution plan for:
"${clean}"

### Deliverables:
1. Executive Summary & Strategic Objectives.
2. Operational Execution Plan & Phased Milestones.
3. Key Performance Indicators (KPIs) and Risk Mitigation Matrix.`;

    case 'creative_writing':
      return `### Role & Persona:
You are an Acclaimed Editorial Author & Creative Director.

### Objective:
Write a captivating, beautifully paced narrative for:
"${clean}"

### Deliverables:
1. Compelling Narrative Hook.
2. Rich Character & World Detail.
3. Engaging Dialogue & Rhythm with zero AI clichés.`;

    default:
      return clean;
  }
}

/**
 * Orchestrator: Combines Classification, System Execution Directive, and Fine-Tuned Prompt.
 */
export function processPromptThroughAgentPipeline(rawPrompt: string): FineTunedPromptPacket {
  const classification = classifyTaskDomain(rawPrompt);
  const systemExecutionDirective = buildExecutionSystemDirective(classification, rawPrompt);
  const fineTunedPromptText = synthesizeFineTunedPrompt(rawPrompt, classification);

  return {
    originalPrompt: rawPrompt,
    classification,
    systemExecutionDirective,
    enhancedUserPrompt: rawPrompt,
    fineTunedPromptText,
  };
}
