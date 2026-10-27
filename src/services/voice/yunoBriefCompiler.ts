/**
 * src/services/voice/yunoBriefCompiler.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Structured Project Brief & Master Prompt Compiler for Yuno.
 *
 * Implements Sections 6, 7 & 9:
 * 1. Maintains structured session-specific brief associated with active project.
 * 2. Requirement preservation with correction replacement ("No, only UDIT" replaces outdated names).
 * 3. Compiles self-contained 12-section execution brief (A through L) tailored to
 *    PromptHub's unified workspace execution contract.
 * 4. Never invents facts, metrics, or extra projects.
 * 5. Full alignment with authoritative 18-field StructuredProjectBrief schema.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  type StructuredProjectBrief,
  type DeliverableIntentType,
  createDefaultStructuredBrief,
} from '../../types/projectBrief.ts';
import { structuredBriefManager, mergeConfirmedFacts } from '../ai/structuredBriefManager.ts';
import { workspaceActionBridge } from '../work/workspaceActionBridge.ts';

export type { StructuredProjectBrief, DeliverableIntentType };

export class YunoBriefCompiler {
  private currentBrief: StructuredProjectBrief;

  constructor(projectId: string, sessionId: string, defaultModel = 'openrouter/free') {
    const existing = structuredBriefManager.getBrief(sessionId);
    if (existing) {
      this.currentBrief = { ...existing };
    } else {
      const isFree = defaultModel.includes(':free') || defaultModel.includes('openrouter/free');
      this.currentBrief = createDefaultStructuredBrief(projectId, sessionId, {
        selectedModel: {
          modelId: defaultModel,
          provider: 'openrouter',
          isFree,
          lane: isFree ? 'free_router' : 'platform_credit',
          estimatedCostCredits: isFree ? 0 : 2,
        },
        status: 'drafting',
      });
      structuredBriefManager.registerBrief(this.currentBrief);
    }
  }

  public getBrief(): StructuredProjectBrief {
    return { ...this.currentBrief };
  }

  /**
   * Updates brief fields. Handles correction replacement logic:
   * When a user clarifies or corrects an existing property (such as "No, only UDIT"),
   * any outdated facts in that domain are replaced rather than concatenated.
   * Monotonically increments version and turnIndex and synchronizes canonical state.
   */
  public updateFields(updates: Partial<StructuredProjectBrief>): StructuredProjectBrief {
    const prevId = this.currentBrief.id;
    const now = Date.now();
    const nextVersion = (this.currentBrief.version ?? 1) + 1;
    const nextTurnIndex = (this.currentBrief.turnIndex ?? 0) + 1;
    const nextBriefId = `brief_${now}_${Math.random().toString(36).slice(2, 7)}`;

    // 1. Process Confirmed Facts corrections
    if (updates.confirmedFacts) {
      const { mergedFacts } = mergeConfirmedFacts(this.currentBrief.confirmedFacts, updates.confirmedFacts);
      this.currentBrief.confirmedFacts = mergedFacts;
    }

    // 2. Process Exclusions (negative requirements preserved strictly)
    if (updates.exclusions) {
      const mergedExclusions = [...this.currentBrief.exclusions];
      for (const exc of updates.exclusions) {
        if (!mergedExclusions.some((e) => e.toLowerCase() === exc.toLowerCase())) {
          mergedExclusions.push(exc);
        }
      }
      this.currentBrief.exclusions = mergedExclusions;
    }

    // 3. Process Required Features (mapped to requirements)
    const incomingReqs = updates.requirements || updates.requiredFeatures;
    if (incomingReqs) {
      const mergedFeatures = [...this.currentBrief.requirements];
      for (const feat of incomingReqs) {
        if (!mergedFeatures.some((f) => f.toLowerCase() === feat.toLowerCase())) {
          mergedFeatures.push(feat);
        }
      }
      this.currentBrief.requirements = mergedFeatures;
      this.currentBrief.requiredFeatures = mergedFeatures;
    }

    // 4. Update basic scalar properties
    const incomingGoal = updates.goal || updates.objective;
    if (incomingGoal !== undefined && incomingGoal.trim()) {
      this.currentBrief.goal = incomingGoal.trim();
      this.currentBrief.objective = incomingGoal.trim();
    }
    if (updates.audience !== undefined && updates.audience.trim()) {
      this.currentBrief.audience = updates.audience.trim();
    }
    const incomingIntent = updates.intent || updates.deliverableType;
    if (incomingIntent !== undefined) {
      this.currentBrief.intent = incomingIntent;
      this.currentBrief.deliverableType = incomingIntent;
    }
    const incomingStyle = updates.styleAndTone || updates.creativeDirection;
    if (incomingStyle !== undefined && incomingStyle.trim()) {
      this.currentBrief.styleAndTone = incomingStyle.trim();
      this.currentBrief.creativeDirection = incomingStyle.trim();
    }
    if (updates.selectedModel !== undefined) {
      const rawModel: any = updates.selectedModel;
      if (typeof rawModel === 'string') {
        const modelId = rawModel.trim();
        const isFree = modelId.includes(':free') || modelId.includes('openrouter/free');
        this.currentBrief.selectedModel = {
          modelId,
          provider: 'openrouter',
          isFree,
          lane: isFree ? 'free_router' : 'platform_credit',
          estimatedCostCredits: isFree ? 0 : 2,
        };
        this.currentBrief.isFreeModel = isFree;
      } else {
        this.currentBrief.selectedModel = {
          ...this.currentBrief.selectedModel,
          ...rawModel,
        };
        this.currentBrief.isFreeModel = this.currentBrief.selectedModel.isFree;
      }
    }
    if (updates.assumptions !== undefined) {
      this.currentBrief.assumptions = updates.assumptions;
    }
    const incomingQuestions = updates.openQuestions || updates.missingFacts;
    if (incomingQuestions !== undefined) {
      this.currentBrief.openQuestions = incomingQuestions;
      this.currentBrief.missingFacts = incomingQuestions;
    }
    if (updates.targetArtifact !== undefined) {
      this.currentBrief.targetArtifact = updates.targetArtifact;
      this.currentBrief.projectEntityReferences.artifactId = updates.targetArtifact;
    }
    if (updates.status !== undefined) {
      this.currentBrief.status = updates.status;
    }

    // Monotonic Identity Progression & Lineage Link
    this.currentBrief.id = nextBriefId;
    this.currentBrief.version = nextVersion;
    this.currentBrief.turnIndex = nextTurnIndex;
    this.currentBrief.projectEntityReferences = {
      ...this.currentBrief.projectEntityReferences,
      parentBriefId: prevId,
    };
    this.currentBrief.updatedAt = now;

    // Sync legacy compatibility fields
    this.currentBrief.objective = this.currentBrief.goal;
    this.currentBrief.deliverableType = this.currentBrief.intent;
    this.currentBrief.requiredFeatures = this.currentBrief.requirements;
    this.currentBrief.creativeDirection = this.currentBrief.styleAndTone;
    this.currentBrief.missingFacts = this.currentBrief.openQuestions;
    this.currentBrief.isFreeModel = this.currentBrief.selectedModel.isFree;

    // Recompile master prompt with fresh updates
    this.compileMasterPrompt();

    // Synchronize into StructuredBriefManager canonical session state and history
    try {
      structuredBriefManager.registerBrief(this.currentBrief);
    } catch {}

    // Broadcast updated brief to Workspace Action Bridge
    try {
      workspaceActionBridge.updateProjectBrief(this.currentBrief);
    } catch {}

    return this.getBrief();
  }

  /**
   * Compiles the complete, self-contained 12-section Master Prompt (A through L)
   * conforming strictly to PromptHub's execution contract.
   */
  public compileMasterPrompt(): string {
    const compiled = structuredBriefManager.compileMasterPrompt(this.currentBrief);
    this.currentBrief.masterPrompt = compiled;
    return compiled;
  }
}
