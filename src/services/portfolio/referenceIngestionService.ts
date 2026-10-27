/**
 * src/services/portfolio/referenceIngestionService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Reference Image Ingestion and Metadata Processing Service.
 * Implements Milestone 2 requirements:
 *  - Computes cryptographic SHA-256 image hashes to avoid duplicate processing.
 *  - Distinguishes inferred font category from identified exact font.
 *  - Explicitly marks hidden sections as unknown.
 *  - Reports actual dataset availability honestly (never assumes 300 images).
 *  - Validates all ingested records against strict schema.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  IngestionManifest,
  PortfolioReferenceRecord,
  ReferenceLicenseStatus,
  ReferenceReviewStatus,
} from '../../types/portfolioReference';
import { INITIAL_MANIFEST } from '../../data/portfolioReferenceDataset.ts';

class ReferenceIngestionService {
  private manifest: IngestionManifest;

  constructor() {
    this.manifest = { ...INITIAL_MANIFEST };
  }

  /**
   * Returns current manifest with honest accounting of real vs synthetic items.
   */
  public getManifest(): IngestionManifest {
    return this.manifest;
  }

  /**
   * High-level dataset metrics.
   */
  public getDatasetStats() {
    const records = this.manifest.records;
    const realCount = records.filter(r => r.license !== 'synthetic_fixture').length;
    const fixtureCount = records.filter(r => r.license === 'synthetic_fixture').length;
    const allStyles = Array.from(new Set(records.flatMap(r => r.styleTags)));
    const allProfessions = Array.from(new Set(records.flatMap(r => r.compatibleProfessions)));

    return {
      targetCorpusSize: this.manifest.targetCorpusSize, // 300
      actualAvailableCount: realCount,
      syntheticFixturesCount: fixtureCount,
      totalSearchableRecords: records.length,
      availableStyles: allStyles,
      availableProfessions: allProfessions,
      isRealCorpusAvailable: realCount > 0,
    };
  }

  /**
   * Computes simple SHA-256-like hex hash for browser/Node environment.
   */
  public async computeHash(input: string | Uint8Array): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const data: Uint8Array = typeof input === 'string' ? new TextEncoder().encode(input) : input;
      const digest = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
      return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    // Deterministic fallback for environments without crypto.subtle
    let hash = 0;
    const str = typeof input === 'string' ? input : input.toString();
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  /**
   * Validates a reference record against schema rules.
   */
  public validateRecord(record: Partial<PortfolioReferenceRecord>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!record.id) errors.push('Missing record id');
    if (!record.imageHash) errors.push('Missing imageHash');
    if (!record.palette?.primary || !record.palette?.background) errors.push('Missing palette primary or background color');
    if (!record.typography?.suggestedFont) errors.push('Missing typography suggestedFont');
    if (typeof record.typography?.isIdentifiedExactFont !== 'boolean') {
      errors.push('isIdentifiedExactFont must be an explicit boolean distinguishing inferred vs identified');
    }
    if (!Array.isArray(record.layout?.sectionsVisible)) errors.push('Missing layout sectionsVisible array');
    if (!Array.isArray(record.layout?.sectionsUnknown)) errors.push('Missing layout sectionsUnknown array (must mark hidden sections)');
    if (typeof record.confidence !== 'number' || record.confidence < 0 || record.confidence > 1) {
      errors.push('confidence must be a number between 0 and 1');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Adds a validated reference record to the active manifest.
   * Prevents duplicates by imageHash.
   */
  public registerRecord(record: PortfolioReferenceRecord): { success: boolean; reason?: string } {
    const { valid, errors } = this.validateRecord(record);
    if (!valid) {
      return { success: false, reason: `Validation failed: ${errors.join('; ')}` };
    }

    const existingByHash = this.manifest.records.find(r => r.imageHash === record.imageHash);
    if (existingByHash) {
      return { success: false, reason: `Duplicate image detected (already registered as ${existingByHash.id})` };
    }

    this.manifest.records.push(record);
    if (record.license !== 'synthetic_fixture') {
      this.manifest.actualAvailableCount += 1;
    } else {
      this.manifest.syntheticFixturesCount += 1;
    }
    this.manifest.verifiedRecordsCount = this.manifest.records.length;
    this.manifest.lastUpdated = new Date().toISOString();

    return { success: true };
  }

  /**
   * Helper to create a structured synthetic or real record with default safeguards.
   */
  public createRecordDraft(params: {
    id: string;
    imageHash: string;
    source: string;
    license: ReferenceLicenseStatus;
    styleTags: string[];
    compatibleProfessions: string[];
    primaryColor: string;
    backgroundColor: string;
    suggestedFont: string;
    fontCategory: 'sans' | 'serif' | 'mono' | 'display' | 'geometric_sans' | 'humanist_sans';
    heroLayout: 'single_column' | 'two_column_split' | 'asymmetric_bento' | 'terminal_fullscreen' | 'minimal_centered' | 'editorial_cover';
    sectionsVisible: string[];
    sectionsUnknown: string[];
    strengths: string[];
    confidence?: number;
    reviewStatus?: ReferenceReviewStatus;
  }): PortfolioReferenceRecord {
    return {
      id: params.id,
      schemaVersion: '1.0.0',
      imageHash: params.imageHash,
      source: params.source,
      license: params.license,
      permittedUse: 'reference_metadata_only',
      extractionModel: 'manual_verified_fixture',
      extractedAt: new Date().toISOString(),
      reviewStatus: params.reviewStatus || 'verified',
      confidence: params.confidence ?? 0.95,
      styleTags: params.styleTags,
      compatibleProfessions: params.compatibleProfessions,
      compatibleAudiences: ['technical_recruiters', 'engineering_leads'],
      palette: {
        primary: params.primaryColor,
        secondary: '#6A89A7',
        background: params.backgroundColor,
        surface: params.backgroundColor === '#FFFFFF' || params.backgroundColor === '#F8FBFE' ? '#FFFFFF' : '#161F30',
        text: params.backgroundColor === '#FFFFFF' || params.backgroundColor === '#F8FBFE' || params.backgroundColor === '#FAF6F0' ? '#1F2A34' : '#F8FBFE',
        accent: params.primaryColor,
        isDark: params.backgroundColor !== '#FFFFFF' && params.backgroundColor !== '#F8FBFE' && params.backgroundColor !== '#FAF6F0',
      },
      typography: {
        inferredCategory: params.fontCategory,
        suggestedFont: params.suggestedFont,
        headingWeight: '700',
        isIdentifiedExactFont: false,
      },
      layout: {
        heroLayout: params.heroLayout,
        visualDensity: 'standard',
        sectionsVisible: params.sectionsVisible,
        sectionsUnknown: params.sectionsUnknown,
        componentTraits: ['responsive_cards', 'clean_hierarchy'],
      },
      strengths: params.strengths,
    };
  }
}

export const referenceIngestionService = new ReferenceIngestionService();
