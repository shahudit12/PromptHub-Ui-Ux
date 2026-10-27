/**
 * src/services/work/workVisualDirectionService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fine-Tuned Visual Direction & Design Synthesizer for PromptHub Work.
 * Generates 2-3 visual direction preview images based on user creation input.
 * Manages the interactive workflow:
 *  - Option 1 (Accept): Locks selected direction and drives perfect matching code generation.
 *  - Option 2 (Reject & Request Changes): Incorporates feedback and synthesizes 2-3 new images.
 * Strictly enforces and records against the 8-image per account generation cap.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { workImageCapService } from './workImageCapService';
import type { WorkVisualDirection, AnalyzedUrlSource } from '../../types/work';
import { securityUtils } from '../../utils/security';

export interface VisualDirectionResult {
  success: boolean;
  directions: WorkVisualDirection[];
  remainingImages: number;
  totalCap: number;
  imagesGeneratedThisRun: number;
  analyzedSources?: AnalyzedUrlSource[];
  error?: string;
  isCapReached: boolean;
}

/**
 * Extracts and analyzes URLs (YouTube, Reddit, websites, portfolios) from user prompt.
 * Distinguishes important ("imp") vs non-important ("non imp") references.
 * Extracts design DNA and cleans the prompt for text-to-image synthesis.
 */
export function extractAndAnalyzeUrls(input: string): {
  analyzedSources: AnalyzedUrlSource[];
  sanitizedPrompt: string;
  hasUrls: boolean;
  importantCount: number;
  nonImportantCount: number;
} {
  const urlRegex = /https?:\/\/[^\s)\]>"',]+/gi;
  const rawUrls = input.match(urlRegex) || [];

  if (rawUrls.length === 0) {
    return {
      analyzedSources: [],
      sanitizedPrompt: input.trim(),
      hasUrls: false,
      importantCount: 0,
      nonImportantCount: 0,
    };
  }

  const analyzedSources: AnalyzedUrlSource[] = [];
  let importantCount = 0;
  let nonImportantCount = 0;

  for (let idx = 0; idx < rawUrls.length; idx++) {
    const rawUrl = rawUrls[idx];
    let domain = '';
    let pathname = '';
    try {
      const parsed = new URL(rawUrl);
      domain = parsed.hostname.toLowerCase();
      pathname = parsed.pathname.toLowerCase();
    } catch {
      domain = rawUrl.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
    }

    // Determine type
    let type: 'youtube' | 'reddit' | 'website' | 'portfolio' = 'website';
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      type = 'youtube';
    } else if (domain.includes('reddit.com') || domain.includes('redd.it')) {
      type = 'reddit';
    } else if (
      domain.includes('dribbble.com') ||
      domain.includes('behance.com') ||
      domain.includes('awwwards.com') ||
      pathname.includes('portfolio')
    ) {
      type = 'portfolio';
    }

    const urlIdx = input.indexOf(rawUrl);

    // Check qualifier immediately preceding this URL (up to previous URL or 40 chars)
    const prevUrlEnd = idx > 0 ? input.indexOf(rawUrls[idx - 1]) + rawUrls[idx - 1].length : 0;
    const textBeforeThisUrl = input.slice(Math.max(prevUrlEnd, urlIdx - 40), urlIdx).toLowerCase();

    // Suffix qualifier is recognized when enclosed in parentheses e.g. (imp) or (non imp)
    const nextUrlStart = idx < rawUrls.length - 1 ? input.indexOf(rawUrls[idx + 1]) : input.length;
    const textAfterThisUrl = input.slice(urlIdx + rawUrl.length, Math.min(nextUrlStart, urlIdx + rawUrl.length + 30)).toLowerCase();
    const parenSuffixMatch = textAfterThisUrl.match(/^\s*\(([^)]+)\)/);
    const suffixContent = parenSuffixMatch ? parenSuffixMatch[1] : '';

    const isNonImpBefore = /\b(non[- ]?imp|not[- ]?imp|secondary|auxiliary|optional|low)\b/i.test(textBeforeThisUrl);
    const isImpBefore = /\b(imp|important|primary|main|key|essential|focus)\b/i.test(textBeforeThisUrl);

    const isNonImpAfter = /\b(non[- ]?imp|not[- ]?imp|secondary|auxiliary|optional|low)\b/i.test(suffixContent);
    const isImpAfter = /\b(imp|important|primary|main|key|essential|focus)\b/i.test(suffixContent);

    let isImportant = true;
    if (isNonImpBefore || isNonImpAfter) {
      isImportant = false;
    } else if (isImpBefore || isImpAfter) {
      isImportant = true;
    } else {
      // Default first URL or YouTube/Reddit to true, subsequent sites to false
      isImportant = idx === 0 || type === 'youtube' || type === 'reddit';
    }

    if (isImportant) importantCount++;
    else nonImportantCount++;

    // Design Cues based on platform & route
    let designCue = '';
    let label = '';
    if (type === 'youtube') {
      label = isImportant ? 'YouTube (Primary Demo)' : 'YouTube (Reference)';
      designCue = 'Dynamic video showcase with modern layout rhythm, fluid micro-interactions, and visual storytelling.';
    } else if (type === 'reddit') {
      label = isImportant ? 'Reddit (Community Benchmark)' : 'Reddit (Discussion)';
      designCue = 'Community-vetted UI with high typographical clarity, minimal noise, and accessible contrast.';
    } else if (type === 'portfolio') {
      label = isImportant ? 'Portfolio (Core Aesthetic)' : 'Portfolio (Showcase)';
      designCue = 'Award-grade portfolio layout with asymmetric bento cards and editorial typographic hierarchy.';
    } else {
      label = isImportant ? `Website: ${domain} (Core Model)` : `Website: ${domain} (Reference)`;
      designCue = `Production-grade interface modeled after ${domain} with structured navigation and clean whitespace.`;
    }

    analyzedSources.push({
      url: rawUrl,
      type,
      domain,
      isImportant,
      label,
      designCue,
    });
  }

  // Strip URLs and qualification tags from prompt to produce clean descriptive text
  let cleanText = input
    .replace(/https?:\/\/[^\s)\]>"',]+/gi, '')
    .replace(/\b(non[- ]?imp|imp|important|secondary|auxiliary):?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText || cleanText.length < 3) {
    cleanText = 'Modern web application based on analyzed reference sources';
  }

  return {
    analyzedSources,
    sanitizedPrompt: cleanText,
    hasUrls: true,
    importantCount,
    nonImportantCount,
  };
}

export interface RefineDirectionParams {
  feedback: string;
  previousDirections: WorkVisualDirection[];
  originalPrompt: string;
  accountId?: string;
}

interface DirectionThemeTemplate {
  titleSuffix: string;
  aesthetic: string;
  description: string;
  styleTags: string[];
  colorPalette: string[];
  promptModifier: string;
  themeSpec: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    cardStyle: string;
    layout: string;
  };
}

const DEFAULT_TEMPLATES: DirectionThemeTemplate[] = [
  {
    titleSuffix: 'Direction A: Obsidian Slate & Minimalist Bento',
    aesthetic: 'Obsidian & Cobalt Studio',
    description: 'High-utility developer studio layout with asymmetric bento cards, pitch black canvas, royal cobalt blue primary actions, and crisp cerulean sky-blue accents.',
    styleTags: ['bento-grid', 'dark-canvas', 'slate-typography', 'minimalist'],
    colorPalette: ['#000000', '#0B60B0', '#41A2D9', '#F0EDCE'],
    promptModifier: 'clean obsidian cobalt UI concept mockup, minimal bento grid cards, subtle glowing borders, modern SaaS aesthetic, 8k UI shot',
    themeSpec: {
      primaryColor: '#0B60B0',
      secondaryColor: '#41A2D9',
      backgroundColor: '#000000',
      textColor: '#FFFFFF',
      accentColor: '#41A2D9',
      cardStyle: 'border border-slate-700/60 bg-slate-900/60 rounded-2xl backdrop-blur-md',
      layout: 'asymmetric-bento',
    },
  },
  {
    titleSuffix: 'Direction B: Vibrant Cyber Glassmorphism',
    aesthetic: 'Cyber Luminescence',
    description: 'High-contrast glowing interface with frosted glass containers, electric indigo highlights, and dynamic visual depth.',
    styleTags: ['glassmorphism', 'neon-glow', 'cyber-indigo', 'high-contrast'],
    colorPalette: ['#0B0F19', '#6366F1', '#EC4899', '#06B6D4', '#FFFFFF'],
    promptModifier: 'futuristic glassmorphism UI concept mockup, vibrant glowing neon accents, frosted translucent cards, dark mode dashboard, award-winning dribbble design',
    themeSpec: {
      primaryColor: '#6366F1',
      secondaryColor: '#EC4899',
      backgroundColor: '#0B0F19',
      textColor: '#FFFFFF',
      accentColor: '#06B6D4',
      cardStyle: 'border border-indigo-500/30 bg-indigo-950/20 backdrop-blur-xl rounded-2xl shadow-lg shadow-indigo-500/10',
      layout: 'fluid-grid',
    },
  },
  {
    titleSuffix: 'Direction C: Warm Editorial & Swiss Grid',
    aesthetic: 'Warm Editorial Monochrome',
    description: 'Restrained editorial layout with refined typography contrast, warm parchment accents, and generous breathing room.',
    styleTags: ['editorial', 'swiss-grid', 'warm-minimalism', 'high-readability'],
    colorPalette: ['#18181B', '#E4E4E7', '#F59E0B', '#3F3F46', '#FAFAFA'],
    promptModifier: 'editorial luxury web design mockup, warm typography hierarchy, structured swiss grid, elegant subtle borders, linear design language',
    themeSpec: {
      primaryColor: '#F59E0B',
      secondaryColor: '#E4E4E7',
      backgroundColor: '#18181B',
      textColor: '#FAFAFA',
      accentColor: '#F59E0B',
      cardStyle: 'border border-zinc-800 bg-zinc-900/90 rounded-xl',
      layout: 'editorial-columns',
    },
  },
];

class WorkVisualDirectionService {
  /**
   * Synthesizes 2-3 visual direction preview images based on the user's creation input.
   * Strictly respects and records against the 8-image per account generation cap.
   */
  async proposeVisualDirections(
    userInput: string,
    accountId?: string,
    options?: { count?: number; customModifiers?: string[] }
  ): Promise<VisualDirectionResult> {
    const { analyzedSources, sanitizedPrompt, hasUrls } = extractAndAnalyzeUrls(userInput);
    const cleanInput = securityUtils.sanitizePromptInput(sanitizedPrompt) || 'Modern web application';
    const remainingBefore = workImageCapService.getRemainingImagesCount(accountId);

    if (remainingBefore <= 0) {
      return {
        success: false,
        directions: [],
        remainingImages: 0,
        totalCap: workImageCapService.getImageCap(),
        imagesGeneratedThisRun: 0,
        analyzedSources: analyzedSources.length > 0 ? analyzedSources : undefined,
        isCapReached: true,
        error: 'Account generation cap reached (8/8 images used). Maximum limit of 8 generated images per account reached.',
      };
    }

    // Propose 2 to 3 images, bounded by remaining cap
    const requestedCount = options?.count ?? 3;
    const targetCount = Math.min(requestedCount, Math.min(3, remainingBefore));

    if (targetCount <= 0) {
      return {
        success: false,
        directions: [],
        remainingImages: remainingBefore,
        totalCap: workImageCapService.getImageCap(),
        imagesGeneratedThisRun: 0,
        analyzedSources: analyzedSources.length > 0 ? analyzedSources : undefined,
        isCapReached: true,
        error: 'Insufficient generation allowance remaining.',
      };
    }

    const templates = this.selectTemplatesForInput(cleanInput, targetCount);
    const directions: WorkVisualDirection[] = [];
    const recordsToLog: Array<{ prompt: string; imageUrl: string; directionId: string }> = [];

    const now = Date.now();

    for (let i = 0; i < targetCount; i++) {
      const tpl = templates[i % templates.length];
      const dirId = `dir_${now}_${i + 1}`;
      const seed = Math.floor(Math.random() * 900000) + 100000;

      // Inject clean synthesized design references rather than raw URL tokens
      const urlStyleHint = analyzedSources.length > 0
        ? `inspired by ${analyzedSources.map((s) => s.label).join(' and ')}`
        : '';
      const visualPrompt = [
        cleanInput,
        urlStyleHint,
        tpl.promptModifier,
        'UI design mockup',
        'high resolution, 8k textures'
      ].filter(Boolean).join(', ');

      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=1024&height=640&nologo=true&seed=${seed}`;

      const direction: WorkVisualDirection = {
        id: dirId,
        title: tpl.titleSuffix,
        subtitle: tpl.aesthetic,
        aesthetic: tpl.aesthetic,
        description: tpl.description,
        imageUrl,
        colorPalette: tpl.colorPalette,
        styleTags: [...tpl.styleTags, ...(hasUrls ? ['url-analyzed', analyzedSources[0]?.type || 'web-ref'] : [])],
        aspectRatio: '16:9',
        prompt: visualPrompt,
        themeSpec: tpl.themeSpec,
        analyzedSources: analyzedSources.length > 0 ? analyzedSources : undefined,
      };

      directions.push(direction);
      recordsToLog.push({
        prompt: visualPrompt,
        imageUrl,
        directionId: dirId,
      });
    }

    // Persist usage to image cap service
    const recordResult = workImageCapService.recordImagesGenerated(recordsToLog, accountId);

    return {
      success: true,
      directions,
      remainingImages: recordResult.remaining,
      totalCap: workImageCapService.getImageCap(),
      imagesGeneratedThisRun: directions.length,
      analyzedSources: analyzedSources.length > 0 ? analyzedSources : undefined,
      isCapReached: recordResult.remaining <= 0,
    };
  }

  /**
   * Option 2: User rejects previous directions and demands specific changes.
   * Analyzes feedback, incorporates requested modifications, and generates 2-3 new images.
   */
  async refineVisualDirections(params: RefineDirectionParams): Promise<VisualDirectionResult> {
    const { feedback, originalPrompt, accountId } = params;
    const urlAnalysis = extractAndAnalyzeUrls(feedback);
    const cleanFeedback = securityUtils.sanitizePromptInput(urlAnalysis.sanitizedPrompt).trim();
    const remainingBefore = workImageCapService.getRemainingImagesCount(accountId);

    // Maintain analyzed sources from previous directions if not re-specified
    const activeAnalyzedSources = urlAnalysis.analyzedSources.length > 0
      ? urlAnalysis.analyzedSources
      : params.previousDirections?.[0]?.analyzedSources;

    if (remainingBefore <= 0) {
      return {
        success: false,
        directions: [],
        remainingImages: 0,
        totalCap: workImageCapService.getImageCap(),
        imagesGeneratedThisRun: 0,
        analyzedSources: activeAnalyzedSources,
        isCapReached: true,
        error: 'Account generation cap reached (8/8 images used). Cannot generate additional preview images.',
      };
    }

    // Generate up to 3 alternative directions based on remaining allowance
    const targetCount = Math.min(3, remainingBefore);

    // Mark previous directions as rejected in history
    if (params.previousDirections && params.previousDirections.length > 0) {
      for (const prev of params.previousDirections) {
        workImageCapService.updateRecordStatus(prev.id, 'rejected', accountId);
      }
    }

    const modifiedInput = `${originalPrompt} [User Refinement: ${cleanFeedback}]`;
    const directions: WorkVisualDirection[] = [];
    const recordsToLog: Array<{ prompt: string; imageUrl: string; directionId: string }> = [];
    const now = Date.now();

    // Generate refined variations highlighting the demanded changes
    for (let i = 0; i < targetCount; i++) {
      const dirId = `dir_rev_${now}_${i + 1}`;
      const seed = Math.floor(Math.random() * 900000) + 100000;
      const variationLabel = i === 0 ? 'Refined Primary' : i === 1 ? 'Refined Alternative' : 'Refined Hybrid';

      const promptText = `Modern UI mockup of ${modifiedInput}, variation ${i + 1}, modern web design, high fidelity, 8k`;
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=1024&height=640&nologo=true&seed=${seed}`;

      const direction: WorkVisualDirection = {
        id: dirId,
        title: `Revision ${i + 1}: ${variationLabel}`,
        subtitle: `Modified based on: "${cleanFeedback.slice(0, 36)}"`,
        aesthetic: `Custom Refinement (${cleanFeedback.slice(0, 24)})`,
        description: `Directly implements your requested changes: ${cleanFeedback}`,
        imageUrl,
        colorPalette: this.derivePaletteFromFeedback(cleanFeedback),
        styleTags: ['refined', 'user-modified', ...cleanFeedback.toLowerCase().split(/\s+/).slice(0, 3)],
        aspectRatio: '16:9',
        prompt: promptText,
        themeSpec: {
          primaryColor: '#38BDF8',
          secondaryColor: '#818CF8',
          backgroundColor: cleanFeedback.toLowerCase().includes('light') ? '#F0EDCE' : '#000000',
          textColor: cleanFeedback.toLowerCase().includes('light') ? '#000000' : '#FFFFFF',
          accentColor: '#38BDF8',
          cardStyle: 'border border-border-default rounded-xl',
          layout: 'responsive-custom',
        },
        analyzedSources: activeAnalyzedSources,
      };

      directions.push(direction);
      recordsToLog.push({
        prompt: promptText,
        imageUrl,
        directionId: dirId,
      });
    }

    const recordResult = workImageCapService.recordImagesGenerated(recordsToLog, accountId);

    return {
      success: true,
      directions,
      remainingImages: recordResult.remaining,
      totalCap: workImageCapService.getImageCap(),
      imagesGeneratedThisRun: directions.length,
      analyzedSources: activeAnalyzedSources,
      isCapReached: recordResult.remaining <= 0,
    };
  }

  /**
   * Option 1: User accepts a specific visual direction.
   * Records acceptance and formats theme instructions for downstream code generation.
   */
  acceptVisualDirection(
    direction: WorkVisualDirection,
    accountId?: string
  ): {
    success: boolean;
    acceptedDirection: WorkVisualDirection;
    codeGenerationPrompt: string;
  } {
    workImageCapService.updateRecordStatus(direction.id, 'accepted', accountId);

    const codePrompt = `Generate the full, complete implementation matching the accepted visual direction:
- Title: ${direction.title}
- Aesthetic: ${direction.aesthetic}
- Color Palette: ${direction.colorPalette.join(', ')}
- Style Tags: ${direction.styleTags.join(', ')}
- Visual Spec: ${direction.description}
- Theme Spec: ${JSON.stringify(direction.themeSpec || {})}

Ensure all components, backgrounds, buttons, and typography strictly follow this aesthetic.`;

    return {
      success: true,
      acceptedDirection: direction,
      codeGenerationPrompt: codePrompt,
    };
  }

  private selectTemplatesForInput(input: string, count: number): DirectionThemeTemplate[] {
    const lower = input.toLowerCase();
    if (lower.includes('retro') || lower.includes('arcade') || lower.includes('game') || lower.includes('pixel')) {
      return [
        {
          titleSuffix: 'Direction A: 8-Bit Retro Arcade Cabinet',
          aesthetic: 'Arcade Pixel & CRT',
          description: 'Playful retro gaming interface with CRT scanlines, neon phosphor glow, and pixel art accents.',
          styleTags: ['8-bit', 'arcade', 'crt-scanlines', 'retro-gaming'],
          colorPalette: ['#1A0B2E', '#F59E0B', '#EC4899', '#8B5CF6'],
          promptModifier: '8-bit retro arcade interface mockup, pixel art glowing CRT monitor, vintage gaming UI, neon scanlines',
          themeSpec: {
            primaryColor: '#F59E0B',
            secondaryColor: '#EC4899',
            backgroundColor: '#1A0B2E',
            textColor: '#FDE047',
            accentColor: '#8B5CF6',
            cardStyle: 'border-2 border-amber-500/80 bg-purple-950/80 rounded-none shadow-md',
            layout: 'arcade-cabinet',
          },
        },
        ...DEFAULT_TEMPLATES.slice(0, count - 1),
      ];
    }

    if (lower.includes('light') || lower.includes('clean') || lower.includes('minimal')) {
      return [
        DEFAULT_TEMPLATES[2],
        DEFAULT_TEMPLATES[0],
        DEFAULT_TEMPLATES[1],
      ].slice(0, count);
    }

    return DEFAULT_TEMPLATES.slice(0, count);
  }

  private derivePaletteFromFeedback(feedback: string): string[] {
    const lower = feedback.toLowerCase();
    if (lower.includes('warm') || lower.includes('orange') || lower.includes('amber')) {
      return ['#1C1917', '#F59E0B', '#D97706', '#78350F', '#FEF3C7'];
    }
    if (lower.includes('purple') || lower.includes('violet')) {
      return ['#0F0728', '#8B5CF6', '#A855F7', '#C084FC', '#F3E8FF'];
    }
    if (lower.includes('emerald') || lower.includes('green')) {
      return ['#062419', '#10B981', '#059669', '#34D399', '#ECFDF5'];
    }
    if (lower.includes('light') || lower.includes('white')) {
      return ['#F0EDCE', '#000000', '#0B60B0', '#41A2D9'];
    }
    return ['#0F172A', '#38BDF8', '#818CF8', '#C084FC', '#F8FAFC'];
  }
}

export const workVisualDirectionService = new WorkVisualDirectionService();
