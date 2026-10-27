/**
 * src/services/portfolio/portfolioSpecService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Portfolio Specification & Deterministic Compilation Service.
 * Implements Milestone 1 of the PromptHub Portfolio Agent architecture:
 *  - 3 Authoritative sample specs: minimal_cli, modern_bento, retro_arcade
 *  - 3 Live, scrollable, interactive web pages compiled deterministically
 *  - Atomic selection: adopts existing spec, version, and assets (0 rebuild calls)
 *  - Direct spec patching: immediate rerender on partial revisions (0 model calls)
 *  - Full WorkFile packaging for seamless ZIP export and Drive sync
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { WorkFile } from '../../types/work';
import type {
  PortfolioDesignSpec,
  PortfolioConcept,
  PortfolioSpecPatch,
  PortfolioProfile,
} from '../../types/portfolioSpec';
import { referenceRetrievalService } from './referenceRetrievalService.ts';

// ─── Authoritative Default Specs ──────────────────────────────────────────────

export const DEFAULT_SPEC_MINIMAL_CLI: PortfolioDesignSpec = {
  id: 'spec_minimal_cli',
  name: 'Minimalist CLI Terminal',
  templateId: 'minimal_cli',
  templateVersion: '1.0.0',
  aesthetic: 'Developer CLI / Slate & Obsidian',
  description:
    'A blisteringly fast, keyboard-first developer terminal portfolio. Run commands like help, projects, skills, and bio with instant tab-completion and interactive outputs.',
  palette: {
    primary: '#10B981', // Emerald terminal green
    secondary: '#6A89A7',
    background: '#0B0F17',
    surface: '#151D28',
    text: '#F8FBFE',
    textMuted: '#94A3B8',
    accent: '#38BDF8',
    border: '#223246',
  },
  typography: {
    fontHeading: 'JetBrains Mono, monospace',
    fontBody: 'JetBrains Mono, monospace',
    fontMono: 'JetBrains Mono, monospace',
  },
  profile: {
    name: 'Alex Chen',
    title: 'Senior Systems & AI Engineer',
    bio: 'Building low-latency distributed systems, agentic workflows, and high-craft developer tools.',
    location: 'San Francisco, CA & Remote',
    statusBadge: 'Available for high-impact projects',
  },
  skills: [
    { name: 'TypeScript / React', category: 'frontend', level: 95 },
    { name: 'Rust & WebAssembly', category: 'backend', level: 90 },
    { name: 'Python & LLM Pipelines', category: 'ai', level: 92 },
    { name: 'PostgreSQL & Supabase', category: 'backend', level: 88 },
    { name: 'Docker & Kubernetes', category: 'tools', level: 85 },
    { name: 'Distributed Systems', category: 'core', level: 90 },
  ],
  projects: [
    {
      id: 'proj_cli_1',
      title: 'HyperFlux — Low-Latency Agent Gateway',
      description: 'Distributed WebSocket gateway routing LLM agent tool calls with sub-10ms overhead.',
      tags: ['Rust', 'WebSockets', 'OpenRouter', 'Tokyo'],
      stars: 480,
      featured: true,
      metrics: '< 8ms p99 latency',
      liveUrl: 'https://github.com',
      repoUrl: 'https://github.com',
    },
    {
      id: 'proj_cli_2',
      title: 'BentoVault — Local-First Key Management',
      description: 'Zero-knowledge browser encryption vault with biometric WebAuthn unlock.',
      tags: ['TypeScript', 'WebCrypto', 'IndexedDB'],
      stars: 320,
      featured: true,
      metrics: '100% Client-Side',
      liveUrl: 'https://github.com',
      repoUrl: 'https://github.com',
    },
    {
      id: 'proj_cli_3',
      title: 'KubePulse — Cluster Cost Telemetry',
      description: 'Real-time multi-tenant Kubernetes pod cost attribution and idle resource reclamation.',
      tags: ['Go', 'Prometheus', 'Grafana'],
      stars: 215,
      featured: false,
      metrics: 'Saved 34% spend',
      liveUrl: 'https://github.com',
      repoUrl: 'https://github.com',
    },
  ],
  socialLinks: [
    { platform: 'github', url: 'https://github.com', label: 'github.com/alexchen' },
    { platform: 'linkedin', url: 'https://linkedin.com', label: 'linkedin.com/in/alexchen' },
    { platform: 'twitter', url: 'https://x.com', label: '@alexchen_dev' },
    { platform: 'email', url: 'mailto:alex@example.com', label: 'alex@example.com' },
  ],
  contact: {
    email: 'alex@example.com',
    ctaText: 'Open Terminal Session',
    availableForHire: true,
  },
  interactiveFeatures: {
    hasTerminal: true,
  },
};

export const DEFAULT_SPEC_MODERN_BENTO: PortfolioDesignSpec = {
  id: 'spec_modern_bento',
  name: 'Modern Asymmetric Bento Studio',
  templateId: 'modern_bento',
  templateVersion: '1.0.0',
  aesthetic: 'Modern Bento / Slate & Obsidian',
  description:
    'A high-end developer studio portfolio featuring asymmetric cards, responsive grid breakpoints, project case study modals, and smooth quartic micro-interactions.',
  palette: {
    primary: '#6A89A7', // PromptHub Primary Blue
    secondary: '#BDDDFC', // Light Blue
    background: '#0B0F19',
    surface: '#161F2E',
    text: '#F8FBFE',
    textMuted: '#94A3B8',
    accent: '#88BDF2', // Bright Blue
    border: '#243447',
  },
  typography: {
    fontHeading: 'Outfit, system-ui, sans-serif',
    fontBody: 'Inter, system-ui, sans-serif',
    fontMono: 'JetBrains Mono, monospace',
  },
  profile: {
    name: 'Sarah Lindqvist',
    title: 'Staff Product Engineer & Design Architect',
    bio: 'Crafting fluid web interfaces, design engineering systems, and AI-augmented creative software with uncompromising attention to detail.',
    location: 'Stockholm, Sweden & Remote',
    statusBadge: 'Open for Q4 Advisory & Lead Roles',
  },
  skills: [
    { name: 'React 19 & Next.js', category: 'frontend', level: 98 },
    { name: 'Design Systems & Tokens', category: 'frontend', level: 95 },
    { name: 'Tailwind CSS & Motion', category: 'frontend', level: 96 },
    { name: 'TypeScript & Node.js', category: 'backend', level: 92 },
    { name: 'WebGL & Canvas Physics', category: 'frontend', level: 86 },
    { name: 'Micro-Interactions & UX', category: 'core', level: 98 },
  ],
  projects: [
    {
      id: 'proj_bento_1',
      title: 'Aura Studio — Collaborative Motion Canvas',
      description: 'Infinite canvas tool for animating UI components with spring physics and SVG vector exports.',
      tags: ['React 19', 'Canvas API', 'Spring Physics', 'Tailwind'],
      stars: 840,
      featured: true,
      metrics: '45k monthly active creators',
      liveUrl: 'https://example.com',
      repoUrl: 'https://github.com',
    },
    {
      id: 'proj_bento_2',
      title: 'PrismTokens — Automated Token Synchronizer',
      description: 'Bridges Figma variables directly into production CSS, Tailwind, and React Native themes.',
      tags: ['TypeScript', 'Figma API', 'Design Tokens'],
      stars: 560,
      featured: true,
      metrics: 'Used by 120+ design teams',
      liveUrl: 'https://example.com',
      repoUrl: 'https://github.com',
    },
    {
      id: 'proj_bento_3',
      title: 'FluidFlow — Quartic Easing Inspector',
      description: 'Micro-interaction tuner providing real-time bezier curve visualizations and CSS snippet generation.',
      tags: ['Web Workers', 'Micro-interactions', 'Tailwind'],
      stars: 410,
      featured: false,
      metrics: 'Sub-60fps smooth rendering',
      liveUrl: 'https://example.com',
      repoUrl: 'https://github.com',
    },
  ],
  socialLinks: [
    { platform: 'github', url: 'https://github.com', label: 'github.com/sarahlindqvist' },
    { platform: 'linkedin', url: 'https://linkedin.com', label: 'linkedin.com/in/sarahlindqvist' },
    { platform: 'twitter', url: 'https://x.com', label: '@sarah_designs' },
    { platform: 'website', url: 'https://sarah.design', label: 'sarah.design' },
  ],
  contact: {
    email: 'sarah@example.com',
    ctaText: 'Schedule Consultation',
    availableForHire: true,
  },
  interactiveFeatures: {
    hasCaseStudies: true,
  },
};

export const DEFAULT_SPEC_RETRO_ARCADE: PortfolioDesignSpec = {
  id: 'spec_retro_arcade',
  name: '8-Bit Retro Arcade Cabinet',
  templateId: 'retro_arcade',
  templateVersion: '1.0.0',
  aesthetic: 'Arcade Pixel Art & WebAudio',
  description:
    'An interactive 80s arcade gaming portfolio featuring simulated CRT scanlines, Web Audio sound effects synthesizer, HP/XP power bars, and a playable arcade mini-game.',
  palette: {
    primary: '#F59E0B', // Amber gold
    secondary: '#EC4899', // Hot neon pink
    background: '#0F061E', // Deep arcade purple
    surface: '#1D0E38',
    text: '#FDE047', // Pixel yellow
    textMuted: '#C084FC', // Light violet
    accent: '#00E5FF', // Neon cyan
    border: '#F59E0B',
  },
  typography: {
    fontHeading: '"Press Start 2P", monospace',
    fontBody: '"VT323", monospace',
    fontMono: '"VT323", monospace',
  },
  profile: {
    name: 'Leo "Pixel" Vance',
    title: 'Lead Game Developer & Creative Technologist',
    bio: 'Crafting nostalgic indie games, custom WebGL physics engines, and playable browser experiences that bring joy back to the web.',
    location: 'Tokyo, Japan & Global',
    statusBadge: 'STAGE 99: READY FOR PLAYER 2',
  },
  skills: [
    { name: 'Godot & GDScript', category: 'core', level: 96 },
    { name: 'WebGL & Three.js', category: 'frontend', level: 92 },
    { name: 'Web Audio API', category: 'tools', level: 90 },
    { name: 'Pixel Art & Shaders', category: 'frontend', level: 94 },
    { name: 'Multiplayer WebSockets', category: 'backend', level: 88 },
    { name: 'C# & Unity Engine', category: 'core', level: 85 },
  ],
  projects: [
    {
      id: 'proj_arcade_1',
      title: 'Neon Odyssey — Cyberpunk 2D Roguelike',
      description: 'Challenging procedural dungeon crawler with dynamic lighting, CRT post-processing, and 8-channel chiptune OST.',
      tags: ['Godot 4', 'Pixel Art', 'Chiptune'],
      stars: 1200,
      featured: true,
      metrics: '25,000+ Steam wishlist',
      liveUrl: 'https://itch.io',
      repoUrl: 'https://github.com',
    },
    {
      id: 'proj_arcade_2',
      title: 'BitSynthesizer — 8-Bit Web Audio Engine',
      description: 'Modular synthesizer for crafting retro arcade sound effects directly in modern web browsers.',
      tags: ['Web Audio API', 'TypeScript', 'DSP'],
      stars: 640,
      featured: true,
      metrics: 'Zero external audio files',
      liveUrl: 'https://example.com',
      repoUrl: 'https://github.com',
    },
    {
      id: 'proj_arcade_3',
      title: 'PixelStorm — WebGL Particle Sandbox',
      description: 'Interactive GPU particle engine simulating 500,000 retro sparks at a solid 60 frames per second.',
      tags: ['WebGL', 'GLSL Shaders', 'Three.js'],
      stars: 390,
      featured: false,
      metrics: '60 FPS on mobile',
      liveUrl: 'https://example.com',
      repoUrl: 'https://github.com',
    },
  ],
  socialLinks: [
    { platform: 'github', url: 'https://github.com', label: 'github.com/leovance' },
    { platform: 'twitter', url: 'https://x.com', label: '@leo_pixels' },
    { platform: 'website', url: 'https://itch.io', label: 'leovance.itch.io' },
    { platform: 'email', url: 'mailto:leo@example.com', label: 'leo@arcade.dev' },
  ],
  contact: {
    email: 'leo@arcade.dev',
    ctaText: 'INSERT COIN / HIRE ME',
    availableForHire: true,
  },
  interactiveFeatures: {
    hasAudioSynth: true,
    hasMiniGame: true,
    hasCrtOverlay: true,
  },
};

// ─── Deterministic Compilers ──────────────────────────────────────────────────

class PortfolioSpecService {
  /**
   * Generates the 3 authoritative sample concepts for pre-selection preview.
   * Each concept is compiled into full runnable files and standalone preview HTML.
   */
  generateThreeSampleConcepts(
    baseProfile?: Partial<PortfolioProfile>,
    queryContext?: { rawPrompt?: string; styles?: string[]; prefersDark?: boolean }
  ): PortfolioConcept[] {
    const retrieval = referenceRetrievalService.retrieveReferences({
      rawPrompt: queryContext?.rawPrompt,
      desiredStyles: queryContext?.styles,
      prefersDark: queryContext?.prefersDark,
      profession: baseProfile?.title,
      limit: 3,
    });

    const retrievedIds = retrieval.records.map(r => r.id);

    const specCli = this.mergeProfile(DEFAULT_SPEC_MINIMAL_CLI, baseProfile);
    specCli.referenceIds = retrievedIds.slice(0, 1);
    if (retrieval.disclaimer) specCli.derivationNotice = retrieval.disclaimer;

    const specBento = this.mergeProfile(DEFAULT_SPEC_MODERN_BENTO, baseProfile);
    specBento.referenceIds = retrievedIds.slice(1, 2);
    if (retrieval.disclaimer) specBento.derivationNotice = retrieval.disclaimer;

    const specArcade = this.mergeProfile(DEFAULT_SPEC_RETRO_ARCADE, baseProfile);
    specArcade.referenceIds = retrievedIds.slice(2, 3);
    if (retrieval.disclaimer) specArcade.derivationNotice = retrieval.disclaimer;

    return [
      this.compileConcept(specCli, 'Concept 1: Minimal CLI', [
        'Interactive Bash command parser & tab completion',
        'Obsidian Canvas with Emerald cursor',
        'JetBrains Mono typography with zero bloat',
        '1-Click quick command chips for touch screens',
      ]),
      this.compileConcept(specBento, 'Concept 2: Modern Bento', [
        'Asymmetric Bento Grid with responsive breakpoints',
        'Smooth quartic physics (cubic-bezier(0.16, 1, 0.3, 1))',
        'Interactive project detail modals with live links',
        'WCAG AA accessible contrast across all viewports',
      ]),
      this.compileConcept(specArcade, 'Concept 3: Retro Arcade', [
        'Simulated CRT Scanlines & Screen Glow',
        'Web Audio 8-bit sound effects synthesizer',
        'Playable Pixel Space Dodger Mini-Game',
        'Retro HP/XP Skill power bars',
      ]),
    ];
  }

  /**
   * Compiles a single design specification into a complete PortfolioConcept.
   */
  compileConcept(
    spec: PortfolioDesignSpec,
    badge: string,
    highlights: string[]
  ): PortfolioConcept {
    const previewHtml = this.compileSpecToHtml(spec);
    const files = this.compileSpecToFiles(spec);

    return {
      id: spec.id,
      spec,
      files,
      previewHtml,
      badge,
      highlights,
    };
  }

  /**
   * Deep patches an existing design spec and immediately returns the updated concept.
   * Zero model calls, instant re-render!
   */
  patchSpecAndRecompile(
    currentSpec: PortfolioDesignSpec,
    patch: PortfolioSpecPatch
  ): PortfolioConcept {
    const updatedSpec = this.patchSpec(currentSpec, patch);
    return this.compileConcept(
      updatedSpec,
      `Revised: ${updatedSpec.name}`,
      [
        'Direct specification update applied',
        'Immediate deterministic re-render',
        'Zero model call overhead',
      ]
    );
  }

  /**
   * Pure deep patch on a PortfolioDesignSpec.
   */
  patchSpec(spec: PortfolioDesignSpec, patch: PortfolioSpecPatch): PortfolioDesignSpec {
    const updated: PortfolioDesignSpec = JSON.parse(JSON.stringify(spec));

    if (patch.palette) {
      updated.palette = { ...updated.palette, ...patch.palette };
    }
    if (patch.profile) {
      updated.profile = { ...updated.profile, ...patch.profile };
    }
    if (patch.skills) {
      updated.skills = [...patch.skills];
    }
    if (patch.projects) {
      updated.projects = [...patch.projects];
    }
    if (patch.contact) {
      updated.contact = { ...updated.contact, ...patch.contact };
    }
    if (patch.interactiveFeatures) {
      updated.interactiveFeatures = { ...updated.interactiveFeatures, ...patch.interactiveFeatures };
    }

    return updated;
  }

  /**
   * Compiles the spec into complete runnable files for the IDE / ZIP export.
   */
  compileSpecToFiles(spec: PortfolioDesignSpec): WorkFile[] {
    const now = new Date().toISOString();
    const htmlContent = this.compileSpecToHtml(spec);
    const appTsxContent = this.compileSpecToReactApp(spec);

    return [
      {
        id: `file_${spec.id}_html`,
        projectId: 'proj_portfolio_agent',
        worktreeId: 'wt_main',
        path: 'index.html',
        name: 'index.html',
        isDirectory: false,
        mimeType: 'text/html',
        size: htmlContent.length,
        createdAt: now,
        updatedAt: now,
        content: htmlContent,
      },
      {
        id: `file_${spec.id}_app_tsx`,
        projectId: 'proj_portfolio_agent',
        worktreeId: 'wt_main',
        path: 'src/App.tsx',
        name: 'App.tsx',
        isDirectory: false,
        mimeType: 'text/typescript',
        size: appTsxContent.length,
        createdAt: now,
        updatedAt: now,
        content: appTsxContent,
      },
      {
        id: `file_${spec.id}_pkg_json`,
        projectId: 'proj_portfolio_agent',
        worktreeId: 'wt_main',
        path: 'package.json',
        name: 'package.json',
        isDirectory: false,
        mimeType: 'application/json',
        size: 380,
        createdAt: now,
        updatedAt: now,
        content: JSON.stringify(
          {
            name: `${spec.profile.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-portfolio`,
            version: spec.templateVersion,
            private: true,
            scripts: {
              dev: 'vite',
              build: 'tsc && vite build',
              preview: 'vite preview',
            },
            dependencies: {
              react: '^19.0.0',
              'react-dom': '^19.0.0',
              'lucide-react': '^0.470.0',
              tailwindcss: '^4.0.0',
            },
          },
          null,
          2
        ),
      },
      {
        id: `file_${spec.id}_spec_json`,
        projectId: 'proj_portfolio_agent',
        worktreeId: 'wt_main',
        path: 'portfolio.spec.json',
        name: 'portfolio.spec.json',
        isDirectory: false,
        mimeType: 'application/json',
        size: JSON.stringify(spec).length,
        createdAt: now,
        updatedAt: now,
        content: JSON.stringify(spec, null, 2),
      },
      {
        id: `file_${spec.id}_readme`,
        projectId: 'proj_portfolio_agent',
        worktreeId: 'wt_main',
        path: 'README.md',
        name: 'README.md',
        isDirectory: false,
        mimeType: 'text/markdown',
        size: 650,
        createdAt: now,
        updatedAt: now,
        content: `# ${spec.profile.name} — Portfolio\n\n**Template:** ${spec.name} (\`${spec.templateId}\` v${spec.templateVersion})\n**Aesthetic:** ${spec.aesthetic}\n\nGenerated with PromptHub Portfolio Agent.\n\n## Quick Start\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Spec Re-render\nThis portfolio adheres to the schema-validated \`portfolio.spec.json\` specification file.\n`,
      },
    ];
  }

  /**
   * Compiles a spec into a self-contained, responsive, high-craft HTML string
   * ready for immediate iframe evaluation with zero script errors.
   */
  compileSpecToHtml(spec: PortfolioDesignSpec): string {
    switch (spec.templateId) {
      case 'minimal_cli':
        return this.renderMinimalCliHtml(spec);
      case 'retro_arcade':
        return this.renderRetroArcadeHtml(spec);
      case 'modern_bento':
      default:
        return this.renderModernBentoHtml(spec);
    }
  }

  // ─── Template 1: Minimalist CLI Terminal ───────────────────────────────────

  private renderMinimalCliHtml(spec: PortfolioDesignSpec): string {
    const { profile, palette, skills, projects, contact } = spec;

    const projectsJson = JSON.stringify(projects);
    const skillsJson = JSON.stringify(skills);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${profile.name} — CLI Portfolio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: ${palette.background};
      color: ${palette.text};
      font-family: 'JetBrains Mono', monospace;
      font-size: 13.5px;
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 16px;
    }
    .terminal-window {
      max-width: 960px;
      width: 100%;
      margin: 0 auto;
      background: ${palette.surface};
      border: 1px solid ${palette.border};
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 12px 36px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      min-height: 80vh;
    }
    .terminal-titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: #0B0E14;
      border-bottom: 1px solid ${palette.border};
    }
    .window-controls {
      display: flex;
      gap: 6px;
    }
    .window-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #f59e0b; }
    .dot-green { background: #10b981; }
    .terminal-title {
      font-size: 11.5px;
      color: ${palette.textMuted};
      font-weight: 500;
    }
    .terminal-body {
      flex: 1;
      padding: 18px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ascii-banner {
      color: ${palette.primary};
      font-weight: bold;
      font-size: 11px;
      line-height: 1.2;
      white-space: pre;
      overflow-x: auto;
    }
    .meta-box {
      padding: 12px 14px;
      background: rgba(16, 185, 129, 0.05);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .prompt-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .prompt-prefix {
      color: ${palette.primary};
      font-weight: bold;
    }
    .prompt-path {
      color: ${palette.accent};
    }
    .terminal-input-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
    }
    .cli-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: ${palette.text};
      font-family: inherit;
      font-size: inherit;
    }
    .chips-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 10px 16px;
      background: #0B0E14;
      border-top: 1px solid ${palette.border};
    }
    .cmd-chip {
      background: rgba(16, 185, 129, 0.1);
      color: ${palette.primary};
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-family: inherit;
      cursor: pointer;
      min-height: 36px;
      display: flex;
      align-items: center;
      transition: all 0.15s ease;
    }
    .cmd-chip:hover {
      background: ${palette.primary};
      color: #000;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 10px;
      margin: 8px 0;
    }
    .cli-card {
      padding: 12px;
      background: rgba(255,255,255,0.02);
      border: 1px solid ${palette.border};
      border-radius: 8px;
    }
    .cli-card-title {
      color: ${palette.accent};
      font-weight: bold;
      margin-bottom: 4px;
    }
    .tag {
      display: inline-block;
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(255,255,255,0.06);
      color: ${palette.textMuted};
      margin-right: 4px;
      margin-top: 6px;
    }
    .skill-bar-wrap {
      margin: 6px 0;
    }
    .skill-name {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      margin-bottom: 2px;
    }
    .skill-bar-bg {
      height: 6px;
      background: rgba(255,255,255,0.08);
      border-radius: 3px;
      overflow: hidden;
    }
    .skill-bar-fill {
      height: 100%;
      background: ${palette.primary};
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <div class="terminal-window">
    <div class="terminal-titlebar">
      <div class="window-controls">
        <span class="window-dot dot-red"></span>
        <span class="window-dot dot-yellow"></span>
        <span class="window-dot dot-green"></span>
      </div>
      <div class="terminal-title">${profile.name.toLowerCase().replace(/\\s+/g, '')}@prompthub: ~</div>
      <div style="font-size: 10px; color: ${palette.textMuted}; font-family: monospace;">bash 5.2</div>
    </div>

    <div class="terminal-body" id="term-output">
      <div class="ascii-banner">
  █████╗ ██╗     ███████╗██╗  ██╗
 ██╔══██╗██║     ██╔════╝╚██╗██╔╝
 ███████║██║     █████╗   ╚███╔╝ 
 ██╔══██║██║     ██╔══╝   ██╔██╗ 
 ██║  ██║███████╗███████╗██╔╝ ██╗
 ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝
      </div>

      <div class="meta-box">
        <div style="font-weight: bold; font-size: 15px; color: ${palette.text};">${profile.name}</div>
        <div style="color: ${palette.primary}; font-weight: 500; font-size: 12px; margin-top: 2px;">⚡ ${profile.title}</div>
        <div style="color: ${palette.textMuted}; font-size: 12px; margin-top: 4px;">${profile.bio}</div>
        ${profile.statusBadge ? `<div style="display: inline-block; margin-top: 8px; font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(16,185,129,0.15); color: ${palette.primary}; border: 1px solid rgba(16,185,129,0.3);">● ${profile.statusBadge}</div>` : ''}
      </div>

      <div style="color: ${palette.textMuted}; font-size: 12px;">
        Type <span style="color: ${palette.primary}; font-weight: bold;">help</span> or click command chips below to explore projects, skills, and contact info.
      </div>
    </div>

    <div class="chips-bar">
      <button class="cmd-chip" onclick="executeCmd('help')">help</button>
      <button class="cmd-chip" onclick="executeCmd('projects')">projects</button>
      <button class="cmd-chip" onclick="executeCmd('skills')">skills</button>
      <button class="cmd-chip" onclick="executeCmd('bio')">bio</button>
      <button class="cmd-chip" onclick="executeCmd('contact')">contact</button>
      <button class="cmd-chip" onclick="executeCmd('clear')">clear</button>
    </div>

    <div style="padding: 10px 16px; background: #080B10; border-top: 1px solid ${palette.border};">
      <div class="terminal-input-row">
        <span class="prompt-prefix">➜</span>
        <span class="prompt-path">~</span>
        <input type="text" id="cli-input" class="cli-input" placeholder="Type a command (try 'projects' or 'skills')..." autocomplete="off" autofocus />
      </div>
    </div>
  </div>

  <script>
    const term = document.getElementById('term-output');
    const input = document.getElementById('cli-input');
    const projects = ${projectsJson};
    const skills = ${skillsJson};

    function appendOutput(html) {
      const entry = document.createElement('div');
      entry.innerHTML = html;
      term.appendChild(entry);
      term.scrollTop = term.scrollHeight;
    }

    function executeCmd(cmdText) {
      const raw = (cmdText || '').trim();
      if (!raw) return;
      const cmd = raw.toLowerCase();

      appendOutput(\`
        <div class="prompt-row" style="margin-top: 8px;">
          <span class="prompt-prefix">➜</span>
          <span class="prompt-path">~</span>
          <span style="font-weight: bold; color: #FFF;">\${raw}</span>
        </div>
      \`);

      if (cmd === 'clear') {
        term.innerHTML = '';
        return;
      }

      if (cmd === 'help') {
        appendOutput(\`
          <div style="color: ${palette.textMuted}; margin: 4px 0;">
            <div style="font-weight: bold; color: ${palette.primary}; margin-bottom: 4px;">AVAILABLE COMMANDS:</div>
            <div>• <strong style="color: ${palette.text};">projects</strong>  — View featured open-source & production projects</div>
            <div>• <strong style="color: ${palette.text};">skills</strong>    — List technical stack & proficiencies</div>
            <div>• <strong style="color: ${palette.text};">bio</strong>       — Read full background & focus areas</div>
            <div>• <strong style="color: ${palette.text};">contact</strong>   — View email & social profiles</div>
            <div>• <strong style="color: ${palette.text};">clear</strong>     — Clear terminal screen</div>
          </div>
        \`);
      } else if (cmd === 'projects') {
        let cardsHtml = '<div class="card-grid">';
        projects.forEach(p => {
          const tags = (p.tags || []).map(t => \`<span class="tag">\${t}</span>\`).join('');
          cardsHtml += \`
            <div class="cli-card">
              <div class="cli-card-title">\${p.title}</div>
              <div style="font-size: 11.5px; color: ${palette.textMuted};">\${p.description}</div>
              \${p.metrics ? \`<div style="font-size: 11px; color: ${palette.primary}; margin-top: 4px;">⚡ \${p.metrics}</div>\` : ''}
              <div>\${tags}</div>
            </div>
          \`;
        });
        cardsHtml += '</div>';
        appendOutput(cardsHtml);
      } else if (cmd === 'skills') {
        let skillsHtml = '<div style="max-width: 500px; margin: 4px 0;">';
        skills.forEach(s => {
          const pct = s.level || 90;
          skillsHtml += \`
            <div class="skill-bar-wrap">
              <div class="skill-name">
                <span>\${s.name}</span>
                <span style="color: ${palette.primary};">\${pct}%</span>
              </div>
              <div class="skill-bar-bg">
                <div class="skill-bar-fill" style="width: \${pct}%;"></div>
              </div>
            </div>
          \`;
        });
        skillsHtml += '</div>';
        appendOutput(skillsHtml);
      } else if (cmd === 'bio') {
        appendOutput(\`
          <div style="padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid ${palette.border}; border-radius: 8px;">
            <div style="font-weight: bold; color: ${palette.text}; font-size: 13px;">${profile.name} — ${profile.title}</div>
            <p style="margin-top: 6px; color: ${palette.textMuted}; font-size: 12px; line-height: 1.5;">${profile.bio}</p>
            <p style="margin-top: 6px; color: ${palette.accent}; font-size: 11px;">📍 ${profile.location || 'Remote'}</p>
          </div>
        \`);
      } else if (cmd === 'contact') {
        appendOutput(\`
          <div style="padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid ${palette.border}; border-radius: 8px;">
            <div style="color: ${palette.primary}; font-weight: bold;">📬 GET IN TOUCH</div>
            <div style="margin-top: 4px;">Email: <a href="mailto:${contact.email}" style="color: ${palette.accent}; text-decoration: none;">${contact.email}</a></div>
            <div style="margin-top: 4px; font-size: 11px; color: ${palette.textMuted};">${contact.availableForHire ? '● Currently open to contract & full-time roles' : '● Not currently accepting new projects'}</div>
          </div>
        \`);
      } else {
        appendOutput(\`
          <div style="color: #ef4444; margin: 4px 0;">
            command not found: \${cmd}. Type <span style="color: ${palette.primary}; cursor: pointer; text-decoration: underline;" onclick="executeCmd('help')">help</span> for a list of commands.
          </div>
        \`);
      }
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value;
        input.value = '';
        executeCmd(val);
      }
    });
  </script>
</body>
</html>`;
  }

  // ─── Template 2: Modern Bento Studio ───────────────────────────────────────

  private renderModernBentoHtml(spec: PortfolioDesignSpec): string {
    const { profile, palette, skills, projects, contact, socialLinks } = spec;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${profile.name} — Portfolio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: ${palette.background};
      color: ${palette.text};
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      min-height: 100vh;
      padding: 24px 16px;
    }
    .container {
      max-width: 1040px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 16px;
    }
    .card {
      background: ${palette.surface};
      border: 1px solid ${palette.border};
      border-radius: 16px;
      padding: 24px;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .card:hover {
      border-color: rgba(136, 189, 242, 0.4);
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .hero-card {
      grid-column: span 8;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .status-card {
      grid-column: span 4;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .projects-card {
      grid-column: span 8;
    }
    .skills-card {
      grid-column: span 4;
    }
    .contact-card {
      grid-column: span 12;
      display: flex;
      flex-direction: column;
      sm-flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    @media (max-width: 768px) {
      .hero-card, .status-card, .projects-card, .skills-card, .contact-card {
        grid-column: span 12;
      }
    }
    h1, h2, h3 {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11.5px;
      font-family: 'JetBrains Mono', monospace;
      background: rgba(106, 137, 167, 0.15);
      color: ${palette.accent};
      border: 1px solid rgba(136, 189, 242, 0.25);
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
    }
    .project-item {
      padding: 16px;
      background: rgba(255,255,255,0.02);
      border: 1px solid ${palette.border};
      border-radius: 12px;
      margin-bottom: 12px;
      transition: background 0.15s ease;
      cursor: pointer;
    }
    .project-item:hover {
      background: rgba(255,255,255,0.04);
    }
    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 6px;
    }
    .project-title {
      font-size: 15px;
      font-weight: 600;
      color: ${palette.text};
    }
    .project-desc {
      font-size: 12.5px;
      color: ${palette.textMuted};
      line-height: 1.5;
    }
    .tag-chip {
      display: inline-block;
      font-size: 10.5px;
      font-family: 'JetBrains Mono', monospace;
      padding: 2px 7px;
      border-radius: 6px;
      background: rgba(255,255,255,0.04);
      color: ${palette.textMuted};
      margin-right: 6px;
      margin-top: 8px;
    }
    .skill-pill {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 8px 12px;
      background: rgba(255,255,255,0.02);
      border: 1px solid ${palette.border};
      border-radius: 8px;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .cta-btn {
      min-h: 44px;
      padding: 12px 24px;
      border-radius: 10px;
      background: ${palette.primary};
      color: #FFF;
      font-weight: 600;
      font-size: 13px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: none;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }
    .cta-btn:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="bento-grid">
      <!-- Hero Card -->
      <div class="card hero-card">
        <div>
          <div class="badge-pill" style="margin-bottom: 14px;">
            <span class="pulse-dot"></span>
            <span>${profile.statusBadge || 'Available for projects'}</span>
          </div>
          <h1 style="font-size: 28px; line-height: 1.2; margin-bottom: 8px;">${profile.name}</h1>
          <div style="font-size: 15px; color: ${palette.accent}; font-weight: 500; margin-bottom: 12px;">${profile.title}</div>
          <p style="color: ${palette.textMuted}; font-size: 13.5px; line-height: 1.6; max-width: 580px;">
            ${profile.bio}
          </p>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
          <a href="mailto:${contact.email}" class="cta-btn">${contact.ctaText}</a>
          <button onclick="const t=document.createElement('div'); t.textContent='Case studies opened in preview!'; t.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#38bdf8;color:#0f172a;padding:8px 16px;border-radius:8px;font-weight:bold;z-index:99999;font-family:sans-serif;'; document.body.appendChild(t); setTimeout(()=>t.remove(),2500);" class="cta-btn" style="background: transparent; border: 1px solid ${palette.border}; color: ${palette.text};">View Case Studies</button>
        </div>
      </div>

      <!-- Quick Metrics & Social Card -->
      <div class="card status-card">
        <div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; margin-bottom: 14px;">Telemetry</div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <div style="font-size: 22px; font-weight: 700; color: ${palette.accent}; font-family: 'Outfit';">100%</div>
              <div style="font-size: 11.5px; color: ${palette.textMuted};">Production Reliability</div>
            </div>
            <div>
              <div style="font-size: 22px; font-weight: 700; color: ${palette.primary}; font-family: 'Outfit';">${projects.length}+</div>
              <div style="font-size: 11.5px; color: ${palette.textMuted};">Featured Case Studies</div>
            </div>
            <div>
              <div style="font-size: 12px; color: ${palette.textMuted}; font-family: 'JetBrains Mono';">📍 ${profile.location || 'Remote'}</div>
            </div>
          </div>
        </div>
        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid ${palette.border};">
          <div style="font-size: 11.5px; color: ${palette.textMuted}; margin-bottom: 6px;">Connect</div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${socialLinks.map(s => `<a href="${s.url}" target="_blank" style="font-size: 11px; color: ${palette.accent}; text-decoration: none; font-family: 'JetBrains Mono';">${s.platform} ↗</a>`).join('')}
          </div>
        </div>
      </div>

      <!-- Featured Projects Card -->
      <div class="card projects-card">
        <h2 style="font-size: 18px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
          <span>Featured Projects</span>
          <span style="font-size: 12px; color: ${palette.textMuted}; font-family: 'JetBrains Mono'; font-weight: 400;">(${projects.length})</span>
        </h2>
        <div>
          ${projects.map(p => `
            <div class="project-item" onclick="const t=document.createElement('div'); t.textContent='Viewing: ${p.title}'; t.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:8px 16px;border-radius:8px;font-weight:bold;z-index:99999;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);'; document.body.appendChild(t); setTimeout(()=>t.remove(),2500);">
              <div class="project-header">
                <span class="project-title">${p.title}</span>
                ${p.metrics ? `<span style="font-size: 11px; font-family: 'JetBrains Mono'; color: ${palette.accent};">${p.metrics}</span>` : ''}
              </div>
              <p class="project-desc">${p.description}</p>
              <div>
                ${(p.tags || []).map(t => `<span class="tag-chip">${t}</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Skills Bento Card -->
      <div class="card skills-card">
        <h2 style="font-size: 18px; margin-bottom: 14px;">Technical Stack</h2>
        <div>
          ${skills.map(s => `
            <div class="skill-pill">
              <span style="font-weight: 500;">${s.name}</span>
              <span style="font-size: 11px; font-family: 'JetBrains Mono'; color: ${palette.accent};">${s.level || 90}%</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Contact Banner Card -->
      <div class="card contact-card">
        <div>
          <h3 style="font-size: 17px; margin-bottom: 4px;">Ready to collaborate?</h3>
          <p style="color: ${palette.textMuted}; font-size: 13px;">Currently accepting new engineering and architectural projects.</p>
        </div>
        <div>
          <a href="mailto:${contact.email}" class="cta-btn">
            <span>Get in Touch</span>
            <span>→</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  // ─── Template 3: Retro Arcade Cabinet ─────────────────────────────────────

  private renderRetroArcadeHtml(spec: PortfolioDesignSpec): string {
    const { profile, palette, skills, projects, contact } = spec;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${profile.name} — Retro Arcade</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: ${palette.background};
      color: ${palette.text};
      font-family: 'VT323', monospace;
      font-size: 20px;
      line-height: 1.4;
      min-height: 100vh;
      padding: 16px;
      position: relative;
    }
    .crt-overlay {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%),
                  linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
      background-size: 100% 4px, 6px 100%;
      pointer-events: none;
      z-index: 100;
      opacity: 0.85;
    }
    .cabinet-wrap {
      max-width: 900px;
      margin: 0 auto;
      background: ${palette.surface};
      border: 4px solid ${palette.primary};
      box-shadow: 0 0 24px rgba(245, 158, 11, 0.3), inset 0 0 16px rgba(245, 158, 11, 0.2);
      border-radius: 12px;
      padding: 24px;
    }
    header {
      text-align: center;
      border-bottom: 2px dashed ${palette.primary};
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    h1 {
      font-family: 'Press Start 2P', cursive;
      font-size: 22px;
      color: ${palette.secondary};
      text-shadow: 2px 2px ${palette.text}, 4px 4px ${palette.accent};
      margin-bottom: 8px;
    }
    .hero-sub {
      color: ${palette.text};
      font-size: 22px;
    }
    .game-section {
      background: #000;
      border: 2px solid ${palette.accent};
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      text-align: center;
    }
    canvas {
      background: #000;
      border: 1px solid #333;
      max-width: 100%;
      display: block;
      margin: 10px auto;
    }
    .arcade-btn {
      font-family: 'Press Start 2P', cursive;
      font-size: 11px;
      padding: 10px 16px;
      border: 2px solid ${palette.primary};
      background: ${palette.primary};
      color: #000;
      cursor: pointer;
      margin: 4px;
      min-height: 44px;
    }
    .arcade-btn:hover {
      background: ${palette.secondary};
      color: #FFF;
      border-color: ${palette.secondary};
    }
    .arcade-card {
      border: 2px solid rgba(245, 158, 11, 0.4);
      background: rgba(0,0,0,0.3);
      padding: 14px;
      margin-bottom: 12px;
      border-radius: 6px;
    }
    .hp-bar {
      height: 10px;
      background: #333;
      border: 1px solid ${palette.primary};
      margin-top: 4px;
    }
    .hp-fill {
      height: 100%;
      background: ${palette.primary};
    }
  </style>
</head>
<body>
  <div class="crt-overlay"></div>

  <div class="cabinet-wrap">
    <header>
      <h1>★ ${profile.name.toUpperCase()} ★</h1>
      <div class="hero-sub">${profile.title}</div>
      <div style="color: ${palette.textMuted}; font-size: 18px; margin-top: 6px;">${profile.bio}</div>
      <div style="color: ${palette.accent}; font-size: 16px; margin-top: 8px;">[ ${profile.statusBadge || 'READY PLAYER ONE'} ]</div>
    </header>

    <!-- Interactive Mini-Game Showcase -->
    <div class="game-section">
      <div style="font-family: 'Press Start 2P'; font-size: 12px; color: ${palette.accent};">
        🕹️ PIXEL SPACE DODGER MINI-GAME
      </div>
      <div style="font-size: 16px; color: ${palette.textMuted}; margin-top: 4px;">
        Use Arrow Keys / Touch to dodge incoming space asteroids!
      </div>
      <canvas id="arcadeCanvas" width="480" height="200"></canvas>
      <div>
        <button class="arcade-btn" id="startBtn" onclick="startGame()">START GAME</button>
        <button class="arcade-btn" style="background: transparent; color: ${palette.primary};" onclick="toggleAudio()">🔊 SOUND: ON</button>
      </div>
      <div id="scoreBox" style="font-family: 'Press Start 2P'; font-size: 11px; margin-top: 8px; color: ${palette.text};">
        SCORE: 0000 | HIGH: 1200
      </div>
    </div>

    <!-- Power Bars / Skills -->
    <div style="margin: 20px 0;">
      <div style="font-family: 'Press Start 2P'; font-size: 13px; color: ${palette.secondary}; margin-bottom: 10px;">
        SKILL POWER-UPS
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px;">
        ${skills.map(s => `
          <div class="arcade-card">
            <div style="display: flex; justify-content: space-between;">
              <span>${s.name}</span>
              <span style="color: ${palette.primary}; font-weight: bold;">LVL ${s.level || 90}</span>
            </div>
            <div class="hp-bar">
              <div class="hp-fill" style="width: ${s.level || 90}%;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Featured Quests / Projects -->
    <div style="margin: 20px 0;">
      <div style="font-family: 'Press Start 2P'; font-size: 13px; color: ${palette.secondary}; margin-bottom: 10px;">
        COMPLETED QUESTS & PROJECTS
      </div>
      ${projects.map(p => `
        <div class="arcade-card">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <span style="font-family: 'Press Start 2P'; font-size: 12px; color: ${palette.text};">${p.title}</span>
            ${p.stars ? `<span style="color: ${palette.primary}; font-size: 16px;">★ ${p.stars} XP</span>` : ''}
          </div>
          <div style="font-size: 17px; color: ${palette.textMuted}; margin-top: 6px;">${p.description}</div>
          <div style="font-size: 15px; color: ${palette.accent}; margin-top: 6px;">
            ${(p.tags || []).join(' • ')}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Contact Insert Coin -->
    <footer style="text-align: center; border-top: 2px dashed ${palette.primary}; padding-top: 16px; margin-top: 20px;">
      <a href="mailto:${contact.email}" class="arcade-btn" style="text-decoration: none; display: inline-block;">
        ${contact.ctaText}
      </a>
      <div style="font-size: 16px; color: ${palette.textMuted}; margin-top: 8px;">
        PromptHub Retro Engine &bull; Web Audio 8-Bit Synth
      </div>
    </footer>
  </div>

  <script>
    // 8-Bit Web Audio Synthesizer
    let audioCtx = null;
    let soundEnabled = true;

    function playBeep(freq = 440, type = 'square', duration = 0.1) {
      if (!soundEnabled) return;
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (e) {}
    }

    function toggleAudio() {
      soundEnabled = !soundEnabled;
      const btn = event.target;
      btn.textContent = soundEnabled ? '🔊 SOUND: ON' : '🔇 SOUND: OFF';
    }

    // Canvas Mini-Game (Space Dodger)
    const canvas = document.getElementById('arcadeCanvas');
    const ctx = canvas.getContext('2d');
    let isPlaying = false;
    let player = { x: 220, y: 160, size: 16, speed: 6 };
    let obstacles = [];
    let score = 0;
    let highScore = 1200;
    let animationId = null;

    function startGame() {
      if (isPlaying) return;
      isPlaying = true;
      score = 0;
      obstacles = [];
      player.x = 220;
      playBeep(880, 'triangle', 0.2);
      loop();
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' && player.x > 10) player.x -= player.speed;
      if (e.key === 'ArrowRight' && player.x < canvas.width - 26) player.x += player.speed;
    });

    canvas.addEventListener('touchmove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      player.x = Math.max(10, Math.min(canvas.width - 26, touchX));
    });

    function loop() {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Player Ship (Retro green triangle)
      ctx.fillStyle = '#00FF66';
      ctx.beginPath();
      ctx.moveTo(player.x + 8, player.y);
      ctx.lineTo(player.x, player.y + player.size);
      ctx.lineTo(player.x + player.size, player.y + player.size);
      ctx.closePath();
      ctx.fill();

      // Spawn Obstacles
      if (Math.random() < 0.05) {
        obstacles.push({
          x: Math.random() * (canvas.width - 20),
          y: 0,
          size: 10 + Math.random() * 8,
          speed: 2 + Math.random() * 3
        });
      }

      // Update & Draw Obstacles
      ctx.fillStyle = '#FF0077';
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.y += obs.speed;
        ctx.fillRect(obs.x, obs.y, obs.size, obs.size);

        // Collision Check
        if (
          player.x < obs.x + obs.size &&
          player.x + player.size > obs.x &&
          player.y < obs.y + obs.size &&
          player.y + player.size > obs.y
        ) {
          playBeep(180, 'sawtooth', 0.3);
          isPlaying = false;
          const overToast = document.createElement('div');
          overToast.textContent = 'GAME OVER! Score: ' + score;
          overToast.style.cssText = 'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);background:#ef4444;color:#fff;padding:16px 24px;border-radius:12px;font-weight:bold;font-size:18px;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.5);font-family:monospace;text-align:center;';
          document.body.appendChild(overToast);
          setTimeout(() => overToast.remove(), 3500);
          return;
        }

        if (obs.y > canvas.height) {
          obstacles.splice(i, 1);
          score += 10;
          document.getElementById('scoreBox').textContent = \`SCORE: \${score.toString().padStart(4, '0')} | HIGH: \${highScore}\`;
        }
      }

      if (isPlaying) {
        animationId = requestAnimationFrame(loop);
      }
    }

    // Initial render
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFD700';
    ctx.font = '14px monospace';
    ctx.fillText('PRESS START TO PLAY', 150, 100);
  </script>
</body>
</html>`;
  }

  // ─── React App TSX Compiler ────────────────────────────────────────────────

  private compileSpecToReactApp(spec: PortfolioDesignSpec): string {
    const { profile, projects, skills } = spec;

    return `import React, { useState } from 'react';

export default function App() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'frontend' | 'backend' | 'ai'>('all');

  const projects = ${JSON.stringify(projects, null, 2)};
  const skills = ${JSON.stringify(skills, null, 2)};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>${profile.statusBadge || 'Available for hire'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">${profile.name}</h1>
            <p className="text-sm text-slate-400 font-mono mt-1">${profile.title}</p>
          </div>
          <div className="flex gap-2">
            <a
              href="mailto:${spec.contact.email}"
              className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center shadow-lg transition-colors"
            >
              ${spec.contact.ctaText}
            </a>
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-wider text-slate-400">Featured Projects</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-2">
                <h3 className="font-bold text-white text-base">{p.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
                {p.metrics && <div className="text-[11px] font-mono text-emerald-400 pt-1">⚡ {p.metrics}</div>}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-wider text-slate-400">Technical Skills</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {skills.map((s, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center text-xs">
                <span>{s.name}</span>
                <span className="font-mono text-emerald-400">{s.level}%</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-center text-xs text-slate-500">
          Built with PromptHub Portfolio Agent &bull; ${spec.name}
        </footer>
      </div>
    </div>
  );
}
`;
  }

  private mergeProfile(
    spec: PortfolioDesignSpec,
    baseProfile?: Partial<PortfolioProfile>
  ): PortfolioDesignSpec {
    if (!baseProfile) return JSON.parse(JSON.stringify(spec));
    const cloned = JSON.parse(JSON.stringify(spec));
    cloned.profile = { ...cloned.profile, ...baseProfile };
    return cloned;
  }
}

export const portfolioSpecService = new PortfolioSpecService();
