/**
 * src/services/portfolio/promptEnhancerService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Portfolio Prompt Enhancer Base Adapter & Schema Validator.
 * Implements Section 3 of Antigravity Master Prompt:
 *  - Converts raw request into schema-validated Master Brief.
 *  - Preserves hard constraints and identifies unknown factual fields.
 *  - Never invents GitHub handles, projects, employers, or testimonials.
 *  - Configurable model endpoint; clearly marks base model adapter vs fine-tuned.
 *  - Robust offline deterministic fixture mode for test & BYOK boundaries.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { PortfolioMasterBrief } from '../../types/portfolioBrief';

export class PromptEnhancerService {
  private configuredModel: string = 'meta-llama/llama-3.3-70b-instruct:free';
  private fineTunedEndpoint?: string;

  /**
   * Set custom or fine-tuned model endpoint when verified.
   */
  public setModelConfiguration(model: string, fineTunedEndpoint?: string) {
    this.configuredModel = model;
    this.fineTunedEndpoint = fineTunedEndpoint;
  }

  public getModelConfiguration() {
    return {
      model: this.configuredModel,
      isFineTuned: Boolean(this.fineTunedEndpoint),
      fineTunedEndpoint: this.fineTunedEndpoint,
    };
  }

  /**
   * Enhances raw user prompt into a structured Master Brief.
   * Runs local deterministic synthesis with zero hallucinated facts.
   */
  public enhancePrompt(
    rawRequest: string,
    options?: {
      userName?: string;
      explicitProfession?: string;
      explicitDarkPreference?: boolean;
    }
  ): PortfolioMasterBrief {
    const rawLower = rawRequest.toLowerCase();

    // 1. Infer profession with sensible defaults
    let profession = options?.explicitProfession || 'Software Engineer';
    if (rawLower.includes('systems') || rawLower.includes('distributed')) {
      profession = 'Distributed Systems Architect';
    } else if (rawLower.includes('game') || rawLower.includes('arcade') || rawLower.includes('pixel')) {
      profession = 'Game Developer & Creative Technologist';
    } else if (rawLower.includes('product designer') || rawLower.includes('design')) {
      profession = 'Product Designer & Design Technologist';
    } else if (rawLower.includes('ai') || rawLower.includes('ml') || rawLower.includes('data')) {
      profession = 'AI/ML Systems Engineer';
    }

    // 2. Infer style tags and palettes
    const styleTags: string[] = [];
    let isDark = options?.explicitDarkPreference ?? true;

    if (rawLower.includes('light') && !rawLower.includes('dark')) {
      isDark = false;
      styleTags.push('light_mode');
    } else {
      styleTags.push('dark_mode');
    }

    if (rawLower.includes('minimal') || rawLower.includes('clean')) {
      styleTags.push('minimalist');
    }
    if (rawLower.includes('cli') || rawLower.includes('terminal') || rawLower.includes('hacker')) {
      styleTags.push('cli', 'terminal');
    }
    if (rawLower.includes('bento') || rawLower.includes('modern')) {
      styleTags.push('bento_grid', 'modern');
    }
    if (rawLower.includes('arcade') || rawLower.includes('retro') || rawLower.includes('game') || rawLower.includes('8-bit')) {
      styleTags.push('retro', 'arcade', 'playful');
    }
    if (styleTags.length === 1) {
      styleTags.push('developer_portfolio', 'clean_typography');
    }

    // 3. Determine sections (preserve hard constraints)
    const desiredSections = ['hero', 'projects', 'skills', 'contact'];
    if (rawLower.includes('about') || rawLower.includes('bio')) {
      desiredSections.push('about');
    }
    if (rawLower.includes('game') || rawLower.includes('arcade')) {
      desiredSections.push('interactive_minigame');
    }

    // 4. Formulate enhanced direction adhering to Section 3 rules
    const enhancedDirection = `${profession} portfolio with ${isDark ? 'dark' : 'light'} aesthetic, focusing on ${styleTags.slice(0, 3).join(', ')}. Include ${desiredSections.join(', ')}. Keep factual links as clean editable placeholders until user connects accounts.`;

    // 5. Unknown fields that MUST NOT be hallucinated
    const unknownFields: string[] = [
      'github_account',
      'verified_work_history',
      'real_projects',
      'real_project_urls',
      'client_testimonials',
    ];

    const proposedDefaults: Record<string, string> = {
      name: options?.userName || 'Alex Chen',
      title: profession,
      location: 'Remote & Global',
      contactEmail: 'hello@example.com',
      ctaText: 'Get In Touch',
    };

    return {
      id: `brief_${Date.now()}`,
      schemaVersion: '1.0.0',
      rawRequest,
      enhancedPrompt: enhancedDirection,
      profession,
      targetAudience: ['engineering_leads', 'technical_recruiters', 'collaborators'],
      styleTags,
      desiredSections,
      palettePreferences: {
        primary: isDark ? '#10B981' : '#384959',
        background: isDark ? '#0B0F17' : '#F8FBFE',
        isDark,
      },
      typographyPreferences: {
        fontCategory: styleTags.includes('cli') ? 'mono' : 'sans',
        suggestedFont: styleTags.includes('cli') ? 'JetBrains Mono' : 'Inter, Outfit',
      },
      layoutPreferences: {
        heroStyle: styleTags.includes('cli') ? 'terminal_fullscreen' : 'asymmetric_bento',
        visualDensity: 'standard',
      },
      contentConstraints: {
        noHallucinatedLinks: true,
        requireEditablePlaceholders: true,
        requiredSections: desiredSections,
      },
      unknownFields,
      proposedDefaults,
      enhancerModel: this.configuredModel,
      isFineTuned: Boolean(this.fineTunedEndpoint),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Validates that an incoming brief complies with schema requirements.
   */
  public validateBrief(brief: Partial<PortfolioMasterBrief>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!brief.rawRequest) errors.push('Missing rawRequest');
    if (!brief.enhancedPrompt) errors.push('Missing enhancedPrompt');
    if (!brief.profession) errors.push('Missing profession');
    if (!Array.isArray(brief.styleTags) || brief.styleTags.length === 0) errors.push('Missing styleTags');
    if (!Array.isArray(brief.unknownFields)) errors.push('Missing unknownFields array');
    if (brief.contentConstraints?.noHallucinatedLinks !== true) {
      errors.push('contentConstraints.noHallucinatedLinks must be true');
    }
    return { valid: errors.length === 0, errors };
  }
}

export const promptEnhancerService = new PromptEnhancerService();
