/**
 * src/types/projectBrief.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative 18-Field Adaptive Project Brief Schema for PromptHub.
 *
 * Implements:
 * - Master Prompt §4: Structured Brief and Prompt Enhancement
 * - spec_report.md §4.2: Comprehensive Structured Project Brief Schema
 * - ORIGINAL_REQUEST.md: Milestone 1 Execution Architecture & Adaptive Brief
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type DeliverableIntentType =
  | 'general_inquiry'
  | 'ad_campaign'
  | 'written_report'
  | 'data_analysis'
  | 'presentation_deck'
  | 'video_script'
  | 'code_script'
  | 'interactive_web_app'
  | 'visual_asset'
  | 'strategic_plan';

export type BriefStatus =
  | 'drafting'
  | 'ready_for_approval'
  | 'submitted'
  | 'executing'
  | 'completed'
  | 'failed';

export interface ProcessedBriefAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: 'pending' | 'extracted' | 'failed';
  extractedTextPreview?: string;
  dataUrl?: string;
  tabularSummary?: {
    rowCount: number;
    columnCount: number;
    columns: string[];
  };
  visionSummary?: string;
}

export interface ProjectEntityReferences {
  artifactId?: string;
  artifactVersion?: string;
  parentBriefId?: string;
  rootProjectId?: string;
  activeFilePaths?: string[];
}

export interface BriefSelectedModel {
  modelId: string;
  provider: string;
  isFree: boolean;
  lane: 'free_router' | 'byok' | 'platform_credit';
  estimatedCostCredits?: number;
}

export interface BriefBudgetBoundaries {
  maxCreditCost: number;
  requiresExplicitApproval: boolean;
  settledCost?: number;
  isByok: boolean;
}

/**
 * Authoritative 18-Field Adaptive Structured Project Brief
 */
export interface StructuredProjectBrief {
  // 1. Identity & Provenance
  id: string;
  projectId: string;
  sessionId: string;
  version: number;        // Monotonically increasing: 1, 2, 3...
  turnIndex: number;      // Turn sequence in session: 0, 1, 2...

  // 2. User Intent & Problem Boundary
  originalRequest: string;
  intent: DeliverableIntentType;
  goal: string;
  audience: string;

  // 3. Grounding & Constraints
  confirmedFacts: string[];
  requirements: string[];
  exclusions: string[];   // Strict negative constraints: MUST NEVER BE VIOLATED
  styleAndTone: string;
  outputFormat: string;

  // 4. Ingested Multimodal Inputs
  attachments: ProcessedBriefAttachment[];

  // 5. Memory & Relational Entity Linkage
  relevantMemoryReferences: string[];
  projectEntityReferences: ProjectEntityReferences;

  // 6. Runtime Configuration & Tools
  selectedModel: BriefSelectedModel;
  allowedTools: string[];
  activeSkills: string[];

  // 7. Human Decisions & Telemetry
  approvedDecisions: string[];
  assumptions: string[];
  openQuestions: string[];
  validationCriteria: string[];
  budgetBoundaries: BriefBudgetBoundaries;

  // 8. Lifecycle Metadata
  status: BriefStatus;
  createdAt: number;
  updatedAt: number;

  // Optional compiled Master Prompt cache
  masterPrompt?: string;

  // ── Backward-Compatibility Accessors & Aliases ──
  /** Backward-compat alias for goal */
  objective?: string;
  /** Backward-compat alias for intent */
  deliverableType?: DeliverableIntentType;
  /** Backward-compat alias for requirements */
  requiredFeatures?: string[];
  /** Backward-compat alias for styleAndTone */
  creativeDirection?: string;
  /** Backward-compat alias for openQuestions */
  missingFacts?: string[];
  /** Backward-compat alias for projectEntityReferences.artifactId */
  targetArtifact?: string;
  /** Backward-compat alias for projectEntityReferences.artifactVersion */
  targetVersion?: string;
  /** Backward-compat alias for selectedModel.isFree */
  isFreeModel?: boolean;
}

/**
 * Delta input for multi-turn conversational updates
 */
export interface BriefDelta {
  turnPrompt: string;
  goal?: string;
  audience?: string;
  intent?: DeliverableIntentType;
  confirmedFacts?: string[];
  requirements?: string[];
  exclusions?: string[];
  styleAndTone?: string;
  outputFormat?: string;
  attachments?: ProcessedBriefAttachment[];
  selectedModel?: Partial<BriefSelectedModel>;
  allowedTools?: string[];
  activeSkills?: string[];
  approvedDecisions?: string[];
  assumptions?: string[];
  openQuestions?: string[];
  validationCriteria?: string[];
  budgetBoundaries?: Partial<BriefBudgetBoundaries>;
  projectEntityReferences?: Partial<ProjectEntityReferences>;
}

/**
 * Structural diff between two brief versions for inspection
 */
export interface BriefDiff {
  fromVersion: number;
  toVersion: number;
  changedFields: string[];
  addedRequirements: string[];
  removedRequirements: string[];
  preservedExclusions: string[];
  updatedGoal?: { previous: string; current: string };
  updatedModel?: { previous: string; current: string };
}

/**
 * Helper factory to create a valid baseline StructuredProjectBrief
 */
export function createDefaultStructuredBrief(
  projectId: string,
  sessionId: string,
  options: Partial<StructuredProjectBrief> = {}
): StructuredProjectBrief {
  const now = Date.now();
  const defaultModel: BriefSelectedModel = {
    modelId: 'openrouter/free',
    provider: 'openrouter',
    isFree: true,
    lane: 'free_router',
    estimatedCostCredits: 0,
  };

  const brief: StructuredProjectBrief = {
    id: options.id || `brief_${now}_${Math.random().toString(36).slice(2, 7)}`,
    projectId: projectId || 'workspace_proj',
    sessionId: sessionId || 'default_session',
    version: options.version ?? 1,
    turnIndex: options.turnIndex ?? 0,
    originalRequest: options.originalRequest || '',
    intent: options.intent || 'interactive_web_app',
    goal: options.goal || '',
    audience: options.audience || 'General end-users and stakeholders',
    confirmedFacts: options.confirmedFacts ? [...options.confirmedFacts] : [],
    requirements: options.requirements ? [...options.requirements] : [],
    exclusions: options.exclusions ? [...options.exclusions] : [],
    styleAndTone: options.styleAndTone || 'Clean, modern, developer-grade UI',
    outputFormat: options.outputFormat || 'Single-file production-ready HTML5',
    attachments: options.attachments ? [...options.attachments] : [],
    relevantMemoryReferences: options.relevantMemoryReferences ? [...options.relevantMemoryReferences] : [],
    projectEntityReferences: options.projectEntityReferences || {
      rootProjectId: projectId || 'workspace_proj',
    },
    selectedModel: options.selectedModel || defaultModel,
    allowedTools: options.allowedTools ? [...options.allowedTools] : [],
    activeSkills: options.activeSkills ? [...options.activeSkills] : [],
    approvedDecisions: options.approvedDecisions ? [...options.approvedDecisions] : [],
    assumptions: options.assumptions ? [...options.assumptions] : [],
    openQuestions: options.openQuestions ? [...options.openQuestions] : [],
    validationCriteria: options.validationCriteria ? [...options.validationCriteria] : [
      'Responsive design across mobile and desktop',
      'Zero console errors and valid syntax',
      'Accessible interactive elements min-h-[44px]',
    ],
    budgetBoundaries: options.budgetBoundaries || {
      maxCreditCost: 0,
      requiresExplicitApproval: false,
      isByok: false,
    },
    status: options.status || 'drafting',
    createdAt: options.createdAt || now,
    updatedAt: options.updatedAt || now,
    masterPrompt: options.masterPrompt,
  };

  // Sync legacy compatibility fields
  brief.objective = brief.goal;
  brief.deliverableType = brief.intent;
  brief.requiredFeatures = brief.requirements;
  brief.creativeDirection = brief.styleAndTone;
  brief.missingFacts = brief.openQuestions;
  brief.isFreeModel = brief.selectedModel.isFree;

  return brief;
}
