/**
 * src/services/ai/structuredBriefManager.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Adaptive Structured Project Brief Manager for PromptHub.
 *
 * Implements:
 * - Master Prompt §4: Structured Brief & Prompt Enhancement
 * - Master Prompt §10, §11: Master Prompt Compilation (Sections A through L)
 * - Multi-turn monotonic versioning (v1, v2, v3...)
 * - Strict Invariants:
 *   1. Exclusions Strictly Preserved (Negative Constraint Rule)
 *   2. Domain-Aware Fact Replacement ("No, only UDIT" replaces prior names)
 *   3. Requirement Preservation with targeted updates
 *   4. Full audit trail and version rollback
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  type StructuredProjectBrief,
  type DeliverableIntentType,
  type BriefDelta,
  type BriefDiff,
  type ProcessedBriefAttachment,
  type BriefSelectedModel,
  createDefaultStructuredBrief,
} from '../../types/projectBrief.ts';
import { workspaceActionBridge } from '../work/workspaceActionBridge.ts';

export interface ParsedFactEntity {
  raw: string;
  category: 'name' | 'company' | 'generic_key' | 'unstructured';
  key?: string;
  value: string;
  formatted: string;
}

const NAME_KEYS = new Set(['name', 'user name', 'full name', 'author', 'creator', 'founder']);
const COMPANY_KEYS = new Set(['company', 'brand', 'brand / company', 'business', 'organization', 'product']);

export function parseFactEntity(fact: string): ParsedFactEntity {
  const trimmed = fact.trim();

  // 1. Key: Value pattern (e.g. "Name: Alice", "Brand / Company: PromptHub", "Location: India")
  const kvMatch = trimmed.match(/^([A-Za-z0-9\s/_-]+):\s*(.+)$/);
  if (kvMatch) {
    const rawKey = kvMatch[1].trim();
    const keyLower = rawKey.toLowerCase();
    const value = kvMatch[2].trim();

    if (NAME_KEYS.has(keyLower)) {
      return {
        raw: trimmed,
        category: 'name',
        key: 'name',
        value,
        formatted: `Name: ${value}`,
      };
    }

    if (COMPANY_KEYS.has(keyLower)) {
      return {
        raw: trimmed,
        category: 'company',
        key: 'company',
        value,
        formatted: `Brand / Company: ${value}`,
      };
    }

    return {
      raw: trimmed,
      category: 'generic_key',
      key: keyLower,
      value,
      formatted: `${rawKey}: ${value}`,
    };
  }

  // 2. Conversational name correction pattern without colon:
  // e.g. "No, only UDIT", "No only UDIT", "Actually, my name is UDIT", "Name is UDIT"
  const correctionMatch = trimmed.match(
    /^(?:no,?\s+)?(?:actually,?\s+)?(?:it'?s\s+)?(?:only|just|(?:my\s+)?name\s+is)\s+([A-Za-z0-9_']+(?:\s+[A-Za-z0-9_']+)*)$/i
  );
  if (correctionMatch) {
    const candidate = correctionMatch[1].trim();
    if (!/^(?:use|modern|clean|dark|light|minimal|responsive|single|developing|building|creating|making)\b/i.test(candidate)) {
      return {
        raw: trimmed,
        category: 'name',
        key: 'name',
        value: candidate,
        formatted: `Name: ${candidate}`,
      };
    }
  }

  // 3. Fallback: Unstructured domain fact (e.g. "Security audit in Q3", "Tailwind CSS v4")
  return {
    raw: trimmed,
    category: 'unstructured',
    value: trimmed,
    formatted: trimmed,
  };
}

export function mergeConfirmedFacts(
  existingFacts: string[],
  incomingFacts: string[]
): {
  mergedFacts: string[];
  supersededNames: string[];
} {
  let facts = [...existingFacts];
  const supersededNames: string[] = [];

  for (const rawFact of incomingFacts) {
    const trimmed = rawFact.trim();
    if (!trimmed) continue;

    const parsed = parseFactEntity(trimmed);

    if (parsed.category === 'name') {
      facts.forEach((f) => {
        const p = parseFactEntity(f);
        if (p.category === 'name' && p.value.toLowerCase() !== parsed.value.toLowerCase()) {
          supersededNames.push(p.value);
        }
      });
      facts = facts.filter((f) => parseFactEntity(f).category !== 'name');
      facts.push(parsed.formatted);
    } else if (parsed.category === 'company') {
      facts = facts.filter((f) => parseFactEntity(f).category !== 'company');
      facts.push(parsed.formatted);
    } else if (parsed.category === 'generic_key') {
      facts = facts.filter((f) => {
        const p = parseFactEntity(f);
        return !(p.category === 'generic_key' && p.key === parsed.key);
      });
      facts.push(parsed.formatted);
    } else {
      const lower = parsed.value.toLowerCase();
      if (!facts.some((f) => f.toLowerCase() === lower)) {
        facts.push(parsed.formatted);
      }
    }
  }

  return { mergedFacts: facts, supersededNames };
}

export interface CreateBriefParams {
  projectId: string;
  sessionId: string;
  rawQuery: string;
  intent?: DeliverableIntentType;
  modelId?: string;
  provider?: string;
  isFreeModel?: boolean;
  lane?: 'free_router' | 'byok' | 'platform_credit';
  attachments?: ProcessedBriefAttachment[];
  skills?: string[];
  tools?: string[];
  budgetCredits?: number;
}

export class StructuredBriefManager {
  private activeBriefsBySession: Map<string, StructuredProjectBrief> = new Map();
  private briefHistoryBySession: Map<string, StructuredProjectBrief[]> = new Map();

  /**
   * Helper to safely persist to browser localStorage if available
   */
  private persistHistory(sessionId: string, history: StructuredProjectBrief[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = `ph_brief_history_${sessionId}`;
        window.localStorage.setItem(key, JSON.stringify(history));
      }
    } catch {
      // LocalStorage full or quota restricted; memory map retains history
    }
  }

  /**
   * Helper to restore from browser localStorage if session map is cold
   */
  private loadHistory(sessionId: string): StructuredProjectBrief[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = `ph_brief_history_${sessionId}`;
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {}
    return [];
  }

  /**
   * Extracts preliminary facts and negative exclusions from natural user input
   */
  private extractConstraintsFromText(text: string): {
    extractedFacts: string[];
    extractedExclusions: string[];
    extractedRequirements: string[];
    extractedGoal?: string;
  } {
    const extractedFacts: string[] = [];
    const extractedExclusions: string[] = [];
    const extractedRequirements: string[] = [];
    let extractedGoal: string | undefined;

    if (!text) {
      return { extractedFacts, extractedExclusions, extractedRequirements };
    }

    // 1. Name Facts
    const NON_NAME_WORDS = /^(?:a|an|the|this|that|these|those|building|creating|making|developing|designing|coding|writing|looking|trying|hoping|planning|seeking|ready|excited|interested|modern|clean|dark|light|minimal|responsive|single|multi|interactive|new|good|great|fast|full|with|without|for|about|all|any|some|none|not|no|only|just|use|using|include|including)\b/i;

    // Rule 1A: Direct name declaration ("my name is Alice", "call me Udit")
    const directNameMatch = text.match(/\b(?:my\s+name\s+is|name\s+is|call\s+me)\s+([A-Za-z0-9_']+(?:\s+[A-Za-z0-9_']+)*?)(?=\s+(?:for|at|from|with|and|in)\b|[.,;!\n]|$)/i);
    if (directNameMatch) {
      const candidate = directNameMatch[1].trim();
      if (candidate.length >= 2 && !NON_NAME_WORDS.test(candidate)) {
        extractedFacts.push(`Name: ${candidate}`);
      }
    } else {
      // Rule 1B: Conversational correction ("No, only UDIT", "No only UDIT")
      const convCorrectionMatch = text.match(/(?:^|[.,;!]\s*)(?:no,?\s+)?(?:it'?s\s+)?(?:only|just)\s+([A-Za-z0-9_']+(?:\s+[A-Za-z0-9_']+)*?)(?=\s+(?:for|at|from|with|and|in)\b|[.,;!\n]|$)/i);
      if (convCorrectionMatch) {
        const candidate = convCorrectionMatch[1].trim();
        if (candidate.length >= 2 && !NON_NAME_WORDS.test(candidate)) {
          extractedFacts.push(`Name: ${candidate}`);
        }
      } else {
        // Rule 1C: "I am <Capitalized Name>" (strict proper noun, no /i flag)
        const iAmMatch = text.match(/\b(?:i\s+am|i'm)\s+([A-Z][a-zA-Z0-9_']*(?:\s+[A-Z][a-zA-Z0-9_']*){0,2})(?=\s+(?:for|at|from|with|and|in)\b|[.,;!\n]|$)/);
        if (iAmMatch) {
          const candidate = iAmMatch[1].trim();
          if (candidate.length >= 2 && !NON_NAME_WORDS.test(candidate)) {
            extractedFacts.push(`Name: ${candidate}`);
          }
        }
      }
    }

    // Company / Brand
    const brandMatch = text.match(/\b(?:(?:for\s+)?(?:brand|company|business|product)(?:\s+(?:is|called|named))?|for)\s+["']?([A-Za-z0-9_-]+(?:\s+[A-Za-z0-9_-]+)*?)["']?(?=\s+(?:and|with|to|create|build|make)\b|[.,;!\n]|$)/i);
    if (brandMatch) {
      const brandCandidate = brandMatch[1].trim();
      if (!/^(?:my|a|an|the|this|it|all|any|our)\b/i.test(brandCandidate) && brandCandidate.length >= 2) {
        extractedFacts.push(`Brand / Company: ${brandCandidate}`);
      }
    }

    // 2. Strict Negative Exclusions
    const CONVERSATIONAL_EXCLUSIONS = /^(?:only|my\s+name|i\s+am|i'm|i\s+want|actually|wait|that's|that\s+is|instead|problem|worries|doubt|preference|thanks|thank\s+you|matter|hesitate|stop|fear)\b/i;
    const exclusionRegex = /\b(?:do\s+not|don['’]t|never|without|exclude|avoid|no)\s+([a-zA-Z0-9\s_,-]{2,50})(?=[.,;\n]|$)/gi;
    let excMatch: RegExpExecArray | null;

    while ((excMatch = exclusionRegex.exec(text)) !== null) {
      const matchPrefix = excMatch[0].trim().toLowerCase();
      const exc = excMatch[1].trim();

      // Guard against conversational "no"
      if (matchPrefix.startsWith('no')) {
        const matchIndex = excMatch.index;
        const textAfterNo = text.slice(matchIndex + 2, matchIndex + 4);
        if (textAfterNo.includes(',')) continue;
        if (CONVERSATIONAL_EXCLUSIONS.test(exc)) continue;
      }

      if (CONVERSATIONAL_EXCLUSIONS.test(exc)) continue;

      if (!exc.toLowerCase().startsWith('use ') && !exc.toLowerCase().startsWith('include ') && !exc.toLowerCase().startsWith('allow ')) {
        extractedExclusions.push(`Do not ${exc}`);
      } else {
        extractedExclusions.push(`Do not ${exc}`);
      }
    }

    // 3. Goal extraction
    if (text.length > 10) {
      let rawFirstLine = text.split('\n')[0].slice(0, 150).trim();
      // Strip conversational greetings and personal intros
      rawFirstLine = rawFirstLine
        .replace(/^(?:hi|hello|hey|greetings)[,!]?\s*/i, '')
        .replace(/^(?:my\s+name\s+is|i\s+am|i'm|call\s+me)\s+[A-Za-z0-9_'\s]+?(?:[.,;!]|\s+(?:and|who|for|wanting\s+to|looking\s+to)\s+)/i, '')
        .trim();
      if (rawFirstLine.length > 5) {
        extractedGoal = rawFirstLine.charAt(0).toUpperCase() + rawFirstLine.slice(1);
      }
    }

    return {
      extractedFacts,
      extractedExclusions,
      extractedRequirements,
      extractedGoal,
    };
  }

  /**
   * Create an initial version 1 brief for a new session or project
   */
  public createInitialBrief(params: CreateBriefParams): StructuredProjectBrief {
    const now = Date.now();
    const briefId = `brief_${now}_${Math.random().toString(36).slice(2, 7)}`;
    const { extractedFacts, extractedExclusions, extractedGoal } = this.extractConstraintsFromText(params.rawQuery);

    const isFree: boolean = params.isFreeModel !== undefined
      ? params.isFreeModel
      : Boolean(params.modelId && (params.modelId.includes(':free') || params.modelId.includes('openrouter/free')));

    const selectedModel: BriefSelectedModel = {
      modelId: params.modelId || 'openrouter/free',
      provider: params.provider || 'openrouter',
      isFree,
      lane: params.lane || (isFree ? 'free_router' : 'platform_credit'),
      estimatedCostCredits: isFree ? 0 : (params.budgetCredits || 2),
    };

    const brief = createDefaultStructuredBrief(params.projectId, params.sessionId, {
      id: briefId,
      version: 1,
      turnIndex: 0,
      originalRequest: params.rawQuery,
      intent: params.intent || 'interactive_web_app',
      goal: extractedGoal || params.rawQuery.slice(0, 140) || 'Deliver high-utility workspace artifact',
      confirmedFacts: extractedFacts,
      exclusions: extractedExclusions,
      requirements: [
        'Production-ready implementation adhering to PromptHub design standards',
        'Responsive layout with minimum 44px touch targets',
      ],
      attachments: params.attachments || [],
      selectedModel,
      activeSkills: params.skills || [],
      allowedTools: params.tools || [],
      budgetBoundaries: {
        maxCreditCost: selectedModel.estimatedCostCredits || 0,
        requiresExplicitApproval: !isFree,
        isByok: params.lane === 'byok',
      },
      status: 'drafting',
      createdAt: now,
      updatedAt: now,
    });

    // Compile 12-section master prompt
    brief.masterPrompt = this.compileMasterPrompt(brief);

    // Save into active map and history
    this.activeBriefsBySession.set(params.sessionId, brief);
    const history = [brief];
    this.briefHistoryBySession.set(params.sessionId, history);
    this.persistHistory(params.sessionId, history);

    // Broadcast update via bridge
    try {
      workspaceActionBridge.updateProjectBrief(brief);
    } catch {}

    return brief;
  }

  /**
   * Core Surgical Revision Engine: applyDelta
   *
   * Enforces all 4 Invariants:
   * - Invariant A: Exclusions are strictly preserved (Negative Constraint Rule).
   * - Invariant B: Domain-aware fact replacement ("No, only UDIT" replaces outdated names).
   * - Invariant C: Requirements preserved with targeted updates.
   * - Invariant D: Version monotonicity (v1 -> v2 -> v3...).
   */
  public applyDelta(sessionId: string, delta: BriefDelta, projectId?: string): StructuredProjectBrief {
    let priorBrief = this.getBrief(sessionId);
    if (!priorBrief) {
      priorBrief = this.createInitialBrief({
        projectId: projectId || 'workspace_proj',
        sessionId,
        rawQuery: delta.turnPrompt || 'Initial request',
        intent: delta.intent,
      });
    }

    const now = Date.now();
    const nextVersion = priorBrief.version + 1;
    const nextTurnIndex = priorBrief.turnIndex + 1;
    const nextBriefId = `brief_${now}_${Math.random().toString(36).slice(2, 7)}`;

    // 1. INVARIANT A: Exclusions Strictly Preserved
    const mergedExclusionsSet = new Set<string>();
    priorBrief.exclusions.forEach((e) => mergedExclusionsSet.add(e.trim()));

    // Also extract exclusions from the turn prompt text if any
    const { extractedExclusions, extractedFacts } = this.extractConstraintsFromText(delta.turnPrompt || '');
    extractedExclusions.forEach((e) => mergedExclusionsSet.add(e.trim()));

    if (delta.exclusions) {
      for (const exc of delta.exclusions) {
        const clean = exc.trim();
        if (clean && !Array.from(mergedExclusionsSet).some((e) => e.toLowerCase() === clean.toLowerCase())) {
          mergedExclusionsSet.add(clean);
        }
      }
    }
    const finalExclusions = Array.from(mergedExclusionsSet);

    // 2. INVARIANT B: Domain-Aware Fact Replacement
    const incomingFacts = [...extractedFacts, ...(delta.confirmedFacts || [])];
    const { mergedFacts, supersededNames } = mergeConfirmedFacts(priorBrief.confirmedFacts, incomingFacts);

    // Reconcile goal if earlier names were superseded
    let updatedGoal = delta.goal ? delta.goal.trim() : priorBrief.goal;
    if (supersededNames.length > 0) {
      const currentNameFact = mergedFacts.find((f) => parseFactEntity(f).category === 'name');
      const currentName = currentNameFact ? parseFactEntity(currentNameFact).value : '';

      for (const oldName of supersededNames) {
        if (updatedGoal.toLowerCase().includes(oldName.toLowerCase())) {
          if (currentName) {
            const escapedOld = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedOld}\\b`, 'gi');
            updatedGoal = updatedGoal.replace(regex, currentName);
          } else {
            const escapedOld = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(?:my\\s+name\\s+is|i\\s+am|i'm|call\\s+me)?\\s*\\b${escapedOld}\\b[,.]?\\s*`, 'gi');
            updatedGoal = updatedGoal.replace(regex, '').trim();
          }
        }
      }
    }

    // 3. INVARIANT C: Requirement Preservation with targeted updates
    const mergedRequirements = [...priorBrief.requirements];
    if (delta.requirements) {
      for (const req of delta.requirements) {
        const reqClean = req.trim();
        if (reqClean && !mergedRequirements.some((r) => r.toLowerCase() === reqClean.toLowerCase())) {
          mergedRequirements.push(reqClean);
        }
      }
    }

    // 4. INVARIANT D: Version Monotonicity & Assembly
    const nextBrief: StructuredProjectBrief = {
      ...priorBrief,
      id: nextBriefId,
      projectId: projectId || priorBrief.projectId,
      sessionId,
      version: nextVersion,
      turnIndex: nextTurnIndex,
      originalRequest: priorBrief.originalRequest,
      intent: delta.intent || priorBrief.intent,
      goal: updatedGoal,
      audience: delta.audience ? delta.audience.trim() : priorBrief.audience,
      confirmedFacts: mergedFacts,
      requirements: mergedRequirements,
      exclusions: finalExclusions,
      styleAndTone: delta.styleAndTone ? delta.styleAndTone.trim() : priorBrief.styleAndTone,
      outputFormat: delta.outputFormat ? delta.outputFormat.trim() : priorBrief.outputFormat,
      attachments: delta.attachments ? [...priorBrief.attachments, ...delta.attachments] : [...priorBrief.attachments],
      projectEntityReferences: {
        ...priorBrief.projectEntityReferences,
        parentBriefId: priorBrief.id,
        ...delta.projectEntityReferences,
      },
      relevantMemoryReferences: [...priorBrief.relevantMemoryReferences],
      selectedModel: delta.selectedModel ? { ...priorBrief.selectedModel, ...delta.selectedModel } : { ...priorBrief.selectedModel },
      allowedTools: delta.allowedTools ? [...delta.allowedTools] : [...priorBrief.allowedTools],
      activeSkills: delta.activeSkills ? [...delta.activeSkills] : [...priorBrief.activeSkills],
      approvedDecisions: delta.approvedDecisions ? [...priorBrief.approvedDecisions, ...delta.approvedDecisions] : [...priorBrief.approvedDecisions],
      assumptions: delta.assumptions ? [...delta.assumptions] : [...priorBrief.assumptions],
      openQuestions: delta.openQuestions ? [...delta.openQuestions] : [...priorBrief.openQuestions],
      validationCriteria: delta.validationCriteria ? [...delta.validationCriteria] : [...priorBrief.validationCriteria],
      budgetBoundaries: delta.budgetBoundaries ? { ...priorBrief.budgetBoundaries, ...delta.budgetBoundaries } : { ...priorBrief.budgetBoundaries },
      status: 'drafting',
      createdAt: priorBrief.createdAt,
      updatedAt: now,
    };

    // Update backward-compatibility accessors
    nextBrief.objective = nextBrief.goal;
    nextBrief.deliverableType = nextBrief.intent;
    nextBrief.requiredFeatures = nextBrief.requirements;
    nextBrief.creativeDirection = nextBrief.styleAndTone;
    nextBrief.missingFacts = nextBrief.openQuestions;
    nextBrief.isFreeModel = nextBrief.selectedModel.isFree;

    // Compile new 12-section master prompt
    nextBrief.masterPrompt = this.compileMasterPrompt(nextBrief);

    // Save to memory and history
    this.activeBriefsBySession.set(sessionId, nextBrief);
    const history = this.getBriefHistory(sessionId);
    history.push(nextBrief);
    this.briefHistoryBySession.set(sessionId, history);
    this.persistHistory(sessionId, history);

    // Broadcast update via bridge
    try {
      workspaceActionBridge.updateProjectBrief(nextBrief);
    } catch {}

    return nextBrief;
  }

  /**
   * Retrieve the active brief for a session
   */
  public getBrief(sessionId: string): StructuredProjectBrief | null {
    const memoryBrief = this.activeBriefsBySession.get(sessionId);
    if (memoryBrief) return memoryBrief;

    // Check localStorage history
    const history = this.loadHistory(sessionId);
    if (history.length > 0) {
      const latest = history[history.length - 1];
      this.activeBriefsBySession.set(sessionId, latest);
      this.briefHistoryBySession.set(sessionId, history);
      return latest;
    }

    return null;
  }

  /**
   * Registers or updates a brief directly from an external compiler (e.g. Yuno voice turns).
   * Ensures active session state and historical audit trail are unified across text & voice.
   */
  public registerBrief(brief: StructuredProjectBrief): void {
    this.activeBriefsBySession.set(brief.sessionId, brief);
    const history = this.getBriefHistory(brief.sessionId);
    const existingIndex = history.findIndex((b) => b.id === brief.id);
    if (existingIndex >= 0) {
      history[existingIndex] = brief;
    } else {
      history.push(brief);
    }
    this.briefHistoryBySession.set(brief.sessionId, history);
    this.persistHistory(brief.sessionId, history);
  }

  /**
   * Retrieve the full version history for a session
   */
  public getBriefHistory(sessionId: string): StructuredProjectBrief[] {
    let history = this.briefHistoryBySession.get(sessionId);
    if (!history || history.length === 0) {
      history = this.loadHistory(sessionId);
      if (history.length > 0) {
        this.briefHistoryBySession.set(sessionId, history);
      } else {
        const active = this.activeBriefsBySession.get(sessionId);
        history = active ? [active] : [];
        this.briefHistoryBySession.set(sessionId, history);
      }
    }
    return history;
  }

  /**
   * Roll back to an earlier brief version (restoring previous specs as a new version)
   */
  public rollbackToVersion(sessionId: string, targetVersion: number): StructuredProjectBrief {
    const history = this.getBriefHistory(sessionId);
    const target = history.find((b) => b.version === targetVersion);
    if (!target) {
      throw new Error(`Brief version ${targetVersion} not found in session history.`);
    }

    const current = this.getBrief(sessionId) || target;
    const now = Date.now();
    const rollbackBrief: StructuredProjectBrief = {
      ...target,
      id: `brief_${now}_${Math.random().toString(36).slice(2, 7)}`,
      version: current.version + 1,
      turnIndex: current.turnIndex + 1,
      projectEntityReferences: {
        ...target.projectEntityReferences,
        parentBriefId: current.id,
      },
      updatedAt: now,
    };

    rollbackBrief.objective = rollbackBrief.goal;
    rollbackBrief.deliverableType = rollbackBrief.intent;
    rollbackBrief.requiredFeatures = rollbackBrief.requirements;
    rollbackBrief.creativeDirection = rollbackBrief.styleAndTone;
    rollbackBrief.missingFacts = rollbackBrief.openQuestions;
    rollbackBrief.isFreeModel = rollbackBrief.selectedModel.isFree;

    rollbackBrief.masterPrompt = this.compileMasterPrompt(rollbackBrief);

    this.activeBriefsBySession.set(sessionId, rollbackBrief);
    history.push(rollbackBrief);
    this.briefHistoryBySession.set(sessionId, history);
    this.persistHistory(sessionId, history);

    try {
      workspaceActionBridge.updateProjectBrief(rollbackBrief);
    } catch {}

    return rollbackBrief;
  }

  /**
   * Compiles the complete, self-contained 12-Section Master Prompt (A through L)
   * conforming strictly to PromptHub Master Prompt specification §4 and §10.
   */
  public compileMasterPrompt(brief: StructuredProjectBrief): string {
    const sections: string[] = [];

    // A. OBJECTIVE
    let objectiveText = brief.goal || brief.objective || 'Create a production-grade deliverable fulfilling user conversational requirements.';
    const activeNameFact = brief.confirmedFacts.find((f) => parseFactEntity(f).category === 'name');
    if (activeNameFact) {
      const activeName = parseFactEntity(activeNameFact).value;
      const introMatch = objectiveText.match(/^(?:my\s+name\s+is|i\s+am|i'm|call\s+me)\s+([A-Za-z0-9_'\s]+?)(?=[.,;!]|s+(?:and|who|for|wanting\s+to|looking\s+to)\s+|$)/i);
      if (introMatch && !introMatch[1].toLowerCase().includes(activeName.toLowerCase())) {
        objectiveText = objectiveText.replace(introMatch[0], '').replace(/^[.,;!\s]+/, '');
      }
    }

    const factsList = brief.confirmedFacts.length > 0
      ? brief.confirmedFacts.map((f) => `- ${f}`).join('\n')
      : '- Implement cleanly with accessible inputs.';

    const reqsList = brief.requirements.length > 0
      ? brief.requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')
      : '1. Production-ready implementation with responsive design and modern UX.';

    const creativeDesc = brief.styleAndTone || brief.creativeDirection || 'Modern, high-contrast, clean typography with accessible touch targets (min-h-[44px]).';

    const exclusionsList = brief.exclusions.length > 0
      ? brief.exclusions.map((e) => `- DO NOT: ${e}`).join('\n')
      : '- DO NOT: Leave placeholders, incomplete functions, or broken links.';

    const isCodeDeliverable =
      brief.intent === 'interactive_web_app' ||
      brief.intent === 'code_script' ||
      brief.deliverableType === 'interactive_web_app' ||
      brief.deliverableType === 'code_script';

    if (isCodeDeliverable) {
      sections.push(`You are an expert software engineer and UI developer.
Build a production-grade, beautiful, complete solution for:
"${objectiveText.trim()}"

Confirmed Details:
${factsList}

Requirements:
${reqsList}

UI & Design Guidelines:
- Visual aesthetic: ${creativeDesc}
- Modern, clean, fully responsive layout (mobile + desktop).
- Minimum 44px touch targets on all interactive elements.
- Working JavaScript interactivity (working buttons, forms, calculations, or filters).

Negative Constraints:
${exclusionsList}

STRICT OUTPUT FORMAT:
- Directly output the final production-ready code inside a \`\`\`html ... \`\`\` block with <!DOCTYPE html>, Tailwind CSS CDN, and working JavaScript.
- NEVER output corporate spec headers (no "EXECUTIVE SUMMARY", "FUNCTIONAL REQUIREMENTS", "TECHNICAL SPECIFICATIONS", "OUTPUT CONTRACT", or "ACCEPTANCE CRITERIA").
- Include a friendly 1-2 sentence developer summary before the code.`);
    } else {
      sections.push(`You are a helpful, senior AI developer and creative strategist.
Directly fulfill the user's request:
"${objectiveText.trim()}"

Confirmed Details:
${factsList}

Key Requirements:
${reqsList}

Constraints:
${exclusionsList}

STRICT OUTPUT FORMAT:
- Provide the final requested content directly in clean, user-friendly markdown.
- NEVER output corporate spec boilerplate (no "EXECUTIVE SUMMARY", "FUNCTIONAL REQUIREMENTS", "OUTPUT CONTRACT", or "ACCEPTANCE CRITERIA").
- Keep explanations clear, natural, and friendly.`);
    }

    const compiled = sections.join('\n\n');
    brief.masterPrompt = compiled;
    return compiled;
  }

  public exportBriefAsMarkdown(brief: StructuredProjectBrief): string {
    return this.compileMasterPrompt(brief);
  }

  /**
   * Compute structural diff between two brief versions for inspection
   */
  public computeBriefDiff(fromBrief: StructuredProjectBrief, toBrief: StructuredProjectBrief): BriefDiff {
    const changedFields: string[] = [];
    if (fromBrief.goal !== toBrief.goal) changedFields.push('goal');
    if (fromBrief.audience !== toBrief.audience) changedFields.push('audience');
    if (fromBrief.intent !== toBrief.intent) changedFields.push('intent');
    if (fromBrief.styleAndTone !== toBrief.styleAndTone) changedFields.push('styleAndTone');
    if (fromBrief.selectedModel.modelId !== toBrief.selectedModel.modelId) changedFields.push('selectedModel');

    const addedRequirements = toBrief.requirements.filter(
      (r) => !fromBrief.requirements.some((fr) => fr.toLowerCase() === r.toLowerCase())
    );
    const removedRequirements = fromBrief.requirements.filter(
      (r) => !toBrief.requirements.some((tr) => tr.toLowerCase() === r.toLowerCase())
    );
    const preservedExclusions = toBrief.exclusions.filter((e) =>
      fromBrief.exclusions.some((fe) => fe.toLowerCase() === e.toLowerCase())
    );

    return {
      fromVersion: fromBrief.version,
      toVersion: toBrief.version,
      changedFields,
      addedRequirements,
      removedRequirements,
      preservedExclusions,
      updatedGoal: fromBrief.goal !== toBrief.goal ? { previous: fromBrief.goal, current: toBrief.goal } : undefined,
      updatedModel: fromBrief.selectedModel.modelId !== toBrief.selectedModel.modelId ? { previous: fromBrief.selectedModel.modelId, current: toBrief.selectedModel.modelId } : undefined,
    };
  }
}

export const structuredBriefManager = new StructuredBriefManager();
