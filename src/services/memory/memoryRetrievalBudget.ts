/**
 * src/services/memory/memoryRetrievalBudget.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Context-Budgeted Memory Retrieval Engine for PromptHub Workspace.
 *
 * Requirements Covered:
 * - Master Prompt §1 & §5: Memory budgeting and instruction override precedence.
 * - ORIGINAL_REQUEST.md § R2: Context Token Bounds & Hierarchy.
 * - scripts/verify-scoped-memory.mjs: Verification contract.
 *
 * Algorithm:
 * 1. Query scoped memories across personal and project tiers.
 * 2. Prioritize: confirmed_fact (3) > user_approved (2) > system_deduction (1).
 * 3. Tie-break: updatedAt descending (freshest records first).
 * 4. Token budgeting: approximate 1 token ~ 4 chars + 10 token envelope.
 * 5. Instruction precedence: explicitly flags userInstructionOverridesMemory.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  MemoryRecord,
  MemoryRetrievalOptions,
  ContextBudgetResult,
} from '../../types/scopedMemory.ts';
import { scopedMemoryService } from './scopedMemoryService.ts';

const DEFAULT_MAX_TOKENS = 1500;

export const PRIORITY_WEIGHTS: Record<string, number> = {
  confirmed_fact: 3,
  user_approved: 2,
  system_deduction: 1,
};

/**
 * Estimates token consumption for a single memory record.
 * 1 token ~ 4 characters + 10 tokens metadata envelope.
 */
export function estimateMemoryTokens(record: MemoryRecord): number {
  const contentLen = (record.content || '').length;
  const keyValLen = (record.key || '').length + (record.value || '').length;
  const totalChars = Math.max(contentLen, keyValLen);
  return Math.ceil(totalChars / 4) + 10;
}

export class MemoryRetrievalBudget {
  /**
   * Retrieves memories within the specified token budget and formats context
   */
  public async getBudgetedMemoryContext(
    options: MemoryRetrievalOptions
  ): Promise<ContextBudgetResult> {
    const {
      userId,
      projectId,
      teamId,
      scope,
      maxTokens = DEFAULT_MAX_TOKENS,
      currentUserInstruction = '',
      includeSuperseded = false,
    } = options;

    if (!userId) {
      return {
        injectedMemories: [],
        totalTokens: 0,
        tokenBudget: maxTokens,
        userInstructionOverridesMemory: false,
        formattedMarkdown: '',
      };
    }

    const allMemories = await scopedMemoryService.getScopedMemories({
      userId,
      projectId,
      teamId,
      scope,
      includeSuperseded,
    });

    // Sort by priority weight then by freshness
    allMemories.sort((a, b) => {
      const weightA = PRIORITY_WEIGHTS[a.confidenceState] || 0;
      const weightB = PRIORITY_WEIGHTS[b.confidenceState] || 0;
      const pDiff = weightB - weightA;
      if (pDiff !== 0) return pDiff;

      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    let currentTokens = 0;
    const selectedMemories: MemoryRecord[] = [];

    for (const mem of allMemories) {
      const estimatedTokens = estimateMemoryTokens(mem);
      if (currentTokens + estimatedTokens > maxTokens) {
        break;
      }
      selectedMemories.push(mem);
      currentTokens += estimatedTokens;
    }

    const hasInstruction = currentUserInstruction.trim().length > 0;
    let formattedMarkdown = '';

    if (selectedMemories.length > 0) {
      formattedMarkdown = `### ACTIVE SCOPED MEMORY (Budgeted: ${currentTokens}/${maxTokens} tokens)\n`;
      if (hasInstruction) {
        formattedMarkdown += `*NOTICE: The user's explicit instructions in this turn strictly OVERRIDE any stored memory or preference below.*\n`;
      }
      for (const m of selectedMemories) {
        const displayVal = m.value ? `${m.key}: ${m.value}` : `${m.key}: ${m.content}`;
        formattedMarkdown += `- [${m.scope.toUpperCase()}] ${displayVal}\n`;
      }
    }

    return {
      injectedMemories: selectedMemories,
      totalTokens: currentTokens,
      tokenBudget: maxTokens,
      userInstructionOverridesMemory: hasInstruction,
      formattedMarkdown,
    };
  }
}

export const memoryRetrievalBudget = new MemoryRetrievalBudget();
