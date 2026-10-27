/**
 * src/types/scopedMemory.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Type Definitions for PromptHub Scoped Multi-Tier Memory Store.
 *
 * Requirements Covered:
 * - Master Prompt §5: Memory: persistent, editable, and scoped.
 * - ORIGINAL_REQUEST.md § R2: Scoped Multi-Tier Memory Store.
 * - scripts/verify-scoped-memory.mjs: Verification contract.
 *
 * Scopes:
 * - 'conversation': Ephemeral to active turn/session, purged on session end, bypassed in temporary mode.
 * - 'project': Bound to projectId, shared across turns in project, strict cross-project isolation.
 * - 'personal': Bound to userId across projects, personal developer style and preferences.
 * - 'team': Bound to teamId, shared across authorized team members, enterprise brand tokens.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const VALID_MEMORY_SCOPES = ['conversation', 'project', 'personal', 'team'] as const;
export type MemoryScope = typeof VALID_MEMORY_SCOPES[number];

export const VALID_MEMORY_CATEGORIES = [
  'preference',
  'rule',
  'fact',
  'decision',
  'constraint',
  'schema',
  'domain',
] as const;
export type MemoryCategory = typeof VALID_MEMORY_CATEGORIES[number];

export const VALID_CONFIDENCE_STATES = [
  'confirmed_fact',
  'user_approved',
  'system_deduction',
] as const;
export type MemoryConfidenceState = typeof VALID_CONFIDENCE_STATES[number];
export type ConfidenceState = MemoryConfidenceState;

export const VALID_SENSITIVITY_LEVELS = [
  'low',
  'normal',
  'sensitive',
  'secret',
  'public',
  'internal',
  'confidential',
  'restricted',
] as const;
export type MemorySensitivity = typeof VALID_SENSITIVITY_LEVELS[number];
export type SensitivityLevel = MemorySensitivity;

export const VALID_MEMORY_STATUSES = [
  'active',
  'forgotten',
  'expired',
  'superseded',
  'ephemeral',
] as const;
export type MemoryStatus = typeof VALID_MEMORY_STATUSES[number];

export interface MemorySourceReference {
  turnTimestamp?: number;
  turnIndex?: number;
  sessionId?: string;
  messageId?: string;
  briefId?: string;
  sourceType?: 'user_chat' | 'yuno_voice' | 'file_attachment' | 'manual_ui' | 'system_deduction';
  fileRef?: string;
}

export interface MemoryRecord {
  id: string;
  userId: string;
  scope: MemoryScope;
  projectId?: string | null;
  teamId?: string | null;
  sessionId?: string | null;
  category: MemoryCategory;
  key: string;
  value: string;
  content: string;
  sourceReference?: MemorySourceReference;
  confidenceState: MemoryConfidenceState;
  sensitivity: MemorySensitivity;
  status: MemoryStatus;
  hasSensitiveSecret?: boolean;
  tags?: string[];
  expiresAt?: string | null;
  forgottenAt?: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface SaveMemoryOptions {
  isTemporary?: boolean;
  rejectOnSecret?: boolean;
  elevateFromDeduction?: boolean;
}

export interface ScopedMemoryFilter {
  userId: string;
  scope?: MemoryScope;
  projectId?: string;
  teamId?: string;
  sessionId?: string;
  category?: MemoryCategory;
  confidenceState?: MemoryConfidenceState;
  includeSuperseded?: boolean;
  searchQuery?: string;
}

export interface MemoryRetrievalOptions {
  userId: string;
  projectId?: string;
  teamId?: string;
  scope?: MemoryScope;
  maxTokens?: number;
  currentUserInstruction?: string;
  includeSuperseded?: boolean;
}

export type BudgetedRetrievalOptions = MemoryRetrievalOptions;

export interface MemoryRetrievalResult {
  memories: MemoryRecord[];
  totalTokens: number;
  budget: number;
  userInstructionOverridesMemory: boolean;
  formattedMarkdown: string;
}

export interface ContextBudgetResult {
  injectedMemories: MemoryRecord[];
  totalTokens: number;
  tokenBudget: number;
  userInstructionOverridesMemory: boolean;
  formattedMarkdown: string;
}

export type BudgetedMemoryContext = ContextBudgetResult;

export interface MemorySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  projectId?: string;
  teamId?: string;
  isTemporaryChat: boolean;
  onToggleTemporaryChat: (enabled: boolean) => void;
  onMemoryChanged?: () => void;
}
