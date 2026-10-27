/**
 * src/types/portfolioReference.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Schema-validated Reference Record & Ingestion Types for Portfolio Builder.
 * Adheres strictly to the Antigravity Master Prompt & Founder Corrections:
 *  - Distinguishes inferred font category from identified font.
 *  - Explicitly marks hidden page sections as unknown.
 *  - Stores license provenance & permitted use (reference metadata only).
 *  - Reports actual dataset availability honestly (never assumes 300 images).
 *  - Diversity ranking ensures the top 3 recommendations are distinct.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type ReferenceLicenseStatus =
  | 'authorized_internal'
  | 'synthetic_fixture'
  | 'fair_use_reference'
  | 'cc_by'
  | 'proprietary_restricted';

export type ReferenceReviewStatus =
  | 'unreviewed'
  | 'verified'
  | 'synthetic_fixture'
  | 'rejected';

export type FontCategory =
  | 'sans'
  | 'serif'
  | 'mono'
  | 'display'
  | 'geometric_sans'
  | 'humanist_sans';

export type HeroLayoutType =
  | 'single_column'
  | 'two_column_split'
  | 'asymmetric_bento'
  | 'terminal_fullscreen'
  | 'minimal_centered'
  | 'editorial_cover';

export interface ReferencePalette {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  accent: string;
  isDark: boolean;
}

export interface ReferenceTypography {
  inferredCategory: FontCategory;
  suggestedFont: string;
  headingWeight: string;
  isIdentifiedExactFont: boolean; // Must distinguish inferred vs identified exact font
}

export interface ReferenceLayoutTraits {
  heroLayout: HeroLayoutType;
  visualDensity: 'compact' | 'standard' | 'spacious';
  sectionsVisible: string[];
  sectionsUnknown: string[]; // Explicitly mark unknown/hidden sections
  componentTraits: string[];
}

export interface PortfolioReferenceRecord {
  id: string; // Unique record ID, e.g. "ref_cli_obsidian_01"
  schemaVersion: string; // "1.0.0"
  imageHash: string; // SHA-256 hash of image content
  source: string; // Origin path or URI
  license: ReferenceLicenseStatus;
  permittedUse: 'reference_metadata_only';
  extractionModel: string; // Model used or "manual_verified_fixture"
  extractedAt: string; // ISO 8601
  reviewStatus: ReferenceReviewStatus;
  confidence: number; // 0.0 - 1.0

  styleTags: string[]; // e.g. ['minimalist', 'dark_mode', 'terminal', 'developer']
  compatibleProfessions: string[]; // e.g. ['software_engineer', 'systems_architect']
  compatibleAudiences: string[]; // e.g. ['technical_recruiters', 'engineering_leads']

  palette: ReferencePalette;
  typography: ReferenceTypography;
  layout: ReferenceLayoutTraits;

  strengths: string[];
  notes?: string;
}

export interface IngestionManifest {
  manifestVersion: string;
  lastUpdated: string;
  targetCorpusSize: number; // Target ~300
  actualAvailableCount: number; // Real number of supplied images actually on disk
  verifiedRecordsCount: number; // Validated records ready for retrieval
  syntheticFixturesCount: number; // Explicitly labelled synthetic fixtures
  records: PortfolioReferenceRecord[];
}

export interface RetrievalQuery {
  rawPrompt?: string;
  profession?: string;
  desiredStyles?: string[];
  prefersDark?: boolean;
  requiredSections?: string[];
  limit?: number; // default 3
}

export interface RetrievalResult {
  records: PortfolioReferenceRecord[];
  retrievalMethod: 'metadata_tag_matching' | 'template_default_supplement';
  scores: Record<string, number>;
  diversityApplied: boolean;
  disclaimer?: string;
}
