/**
 * src/types/portfolioBrief.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Schema-validated Portfolio Master Brief Types.
 * Implements Section 3 of Antigravity Master Prompt:
 *  - Distinguishes raw input from structured enhanced brief.
 *  - Explicitly documents unknown factual fields (no hallucinated accounts/links).
 *  - Enforces accessibility and required section constraints.
 *  - Configurable model provenance (clearly identifies base adapter vs fine-tuned).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface PortfolioMasterBrief {
  id: string;
  schemaVersion: '1.0.0';
  rawRequest: string;
  enhancedPrompt: string;
  profession: string;
  targetAudience: string[];
  styleTags: string[];
  desiredSections: string[];
  palettePreferences: {
    primary?: string;
    background?: string;
    isDark: boolean;
  };
  typographyPreferences: {
    fontCategory?: 'sans' | 'serif' | 'mono' | 'display';
    suggestedFont?: string;
  };
  layoutPreferences: {
    heroStyle?: string;
    visualDensity?: 'compact' | 'standard' | 'spacious';
  };
  contentConstraints: {
    noHallucinatedLinks: boolean;
    requireEditablePlaceholders: boolean;
    requiredSections: string[];
  };
  unknownFields: string[]; // e.g. ['github_account', 'real_projects', 'testimonials', 'phone_number']
  proposedDefaults: Record<string, string>;

  // Model provenance
  enhancerModel: string;
  isFineTuned: boolean; // Must be false until a fine-tuned endpoint is explicitly configured and verified
  generatedAt: string;
}
