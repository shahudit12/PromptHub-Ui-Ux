/**
 * src/services/portfolio/referenceRetrievalService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Metadata-based Reference Retrieval Engine with Diversity Ranking.
 * Implements Milestone 2 requirements:
 *  - Matches enhanced brief criteria against validated reference records.
 *  - Combines tag relevance with diversity reranking to avoid near-duplicates.
 *  - Filters disallowed/incompatible records.
 *  - Honest disclosure when fewer than 3 records exist; seamlessly supplements
 *    with approved template defaults rather than fabricating records.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  PortfolioReferenceRecord,
  RetrievalQuery,
  RetrievalResult,
} from '../../types/portfolioReference';
import { referenceIngestionService } from './referenceIngestionService.ts';

export class ReferenceRetrievalService {
  private auditHistory: Array<{
    timestamp: string;
    query: RetrievalQuery;
    retrievedIds: string[];
    method: string;
  }> = [];

  /**
   * Retrieves top 3 diverse reference records matching query criteria.
   */
  public retrieveReferences(query: RetrievalQuery): RetrievalResult {
    const manifest = referenceIngestionService.getManifest();
    const candidateRecords = manifest.records.filter(r => r.reviewStatus !== 'rejected');
    const scores: Record<string, number> = {};

    const targetProf = (query.profession || '').toLowerCase().trim();
    const targetStyles = (query.desiredStyles || []).map(s => s.toLowerCase().trim());
    const rawLower = (query.rawPrompt || '').toLowerCase();

    // 1. Calculate base relevance score for each candidate
    for (const record of candidateRecords) {
      let score = 50; // base baseline score

      // Profession match
      if (targetProf && record.compatibleProfessions.some(p => p.toLowerCase().includes(targetProf) || targetProf.includes(p.toLowerCase()))) {
        score += 35;
      }

      // Explicit style tag match
      for (const style of targetStyles) {
        if (record.styleTags.some(t => t.toLowerCase().includes(style) || style.includes(t.toLowerCase()))) {
          score += 20;
        }
      }

      // Keyword match from rawPrompt
      for (const tag of record.styleTags) {
        if (rawLower.includes(tag.toLowerCase())) {
          score += 15;
        }
      }

      // Dark / Light mode preference
      if (query.prefersDark !== undefined) {
        if (query.prefersDark === record.palette.isDark) {
          score += 25;
        } else {
          score -= 15; // Soft penalty, not exclusion, unless explicit
        }
      }

      // Required sections check
      if (query.requiredSections && query.requiredSections.length > 0) {
        for (const reqSec of query.requiredSections) {
          if (record.layout.sectionsVisible.includes(reqSec)) {
            score += 10;
          }
        }
      }

      scores[record.id] = score;
    }

    // Sort candidates by relevance descending
    const sortedCandidates = [...candidateRecords].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

    // 2. Diversity Re-ranking: Ensure top 3 are not near-duplicates
    const selected: PortfolioReferenceRecord[] = [];
    const usedLayouts = new Set<string>();
    const usedFontCategories = new Set<string>();

    for (const cand of sortedCandidates) {
      if (selected.length === 0) {
        selected.push(cand);
        usedLayouts.add(cand.layout.heroLayout);
        usedFontCategories.add(cand.typography.inferredCategory);
        continue;
      }

      // Check diversity distance against already selected items
      const hasUniqueLayout = !usedLayouts.has(cand.layout.heroLayout);
      const hasUniqueFont = !usedFontCategories.has(cand.typography.inferredCategory);

      if (hasUniqueLayout || hasUniqueFont || selected.length >= candidateRecords.length) {
        selected.push(cand);
        usedLayouts.add(cand.layout.heroLayout);
        usedFontCategories.add(cand.typography.inferredCategory);
      }

      if (selected.length >= (query.limit || 3)) {
        break;
      }
    }

    // If diversity filtering was too strict, backfill with remaining best candidates
    if (selected.length < (query.limit || 3)) {
      for (const cand of sortedCandidates) {
        if (!selected.some(s => s.id === cand.id)) {
          selected.push(cand);
          if (selected.length >= (query.limit || 3)) break;
        }
      }
    }

    // 3. Fallback and Honest Disclaimer Handling
    let disclaimer: string | undefined;
    if (selected.length < (query.limit || 3)) {
      disclaimer = `Notice: Only ${selected.length} verified reference records available in current index matching criteria. Approved template defaults (Minimal CLI, Modern Bento, Retro Arcade) will supplement remaining live previews.`;
    }

    const result: RetrievalResult = {
      records: selected,
      retrievalMethod: 'metadata_tag_matching',
      scores,
      diversityApplied: true,
      disclaimer,
    };

    // Log for audit traceability
    this.auditHistory.push({
      timestamp: new Date().toISOString(),
      query,
      retrievedIds: selected.map(s => s.id),
      method: result.retrievalMethod,
    });

    return result;
  }

  /**
   * Retrieves audit logs for evaluation and provenance inspection.
   */
  public getAuditHistory() {
    return [...this.auditHistory];
  }
}

export const referenceRetrievalService = new ReferenceRetrievalService();
