/**
 * src/types/work.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical Type Definitions for PromptHub Work.
 * Defines the real execution model for projects, tasks, agents, virtual worktrees,
 * sandboxed tools, event streams, artifacts, approvals, skills, and automations.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type WorkProjectType = 'code' | 'general' | 'research' | 'design';

export type WorkProjectStatus = 'active' | 'archived' | 'completed';

export interface WorkProject {
  id: string;
  userId: string;
  teamId?: string | null;
  name: string;
  slug: string;
  description: string;
  type: WorkProjectType;
  status: WorkProjectStatus;
  repositoryUrl?: string | null;
  defaultModel: string;
  defaultAgent: string;
  instructions: string;
  rules: string[];
  tags: string[];
  activeWorktreeId?: string;
  lastSyncedToDrive?: string;
  driveFileId?: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkTaskStatus =
  | 'draft'
  | 'queued'
  | 'planning'
  | 'running'
  | 'waiting_for_approval'
  | 'waiting_for_input'
  | 'testing'
  | 'reviewing'
  | 'paused'
  | 'blocked'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type WorkTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type WorkExecutionMode = 'single_agent' | 'orchestrated_team' | 'autonomous';

export type WorkTaskCheckpoint =
  | 'created'
  | 'context_resolved'
  | 'plan_created'
  | 'workspace_ready'
  | 'implementation_started'
  | 'implementation_complete'
  | 'tests_started'
  | 'tests_complete'
  | 'review_started'
  | 'review_complete'
  | 'deployment_started'
  | 'deployment_complete'
  | 'completed';

export interface WorkTask {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  description: string;
  status: WorkTaskStatus;
  priority: WorkTaskPriority;
  model: string;
  provider: string;
  agentType: string;
  executionMode: WorkExecutionMode;
  worktreeId: string;
  parentTaskId?: string | null;
  dependencies: string[];
  checkpoint: WorkTaskCheckpoint;
  estimatedCostCredits?: number;
  actualCostCredits: number;
  tokensUsed: number;
  error?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string;
}

export type WorkAgentStatus =
  | 'idle'
  | 'planning'
  | 'working'
  | 'waiting'
  | 'testing'
  | 'reviewing'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'paused';

export type WorkPermissionProfile =
  | 'read_only'
  | 'read_write'
  | 'developer'
  | 'deployment'
  | 'admin';

export interface WorkAgent {
  id: string;
  projectId: string;
  taskId?: string | null;
  userId: string;
  name: string;
  role: string;
  type: string;
  status: WorkAgentStatus;
  currentAction: string;
  model: string;
  provider: string;
  toolsAllowed: string[];
  permissions: WorkPermissionProfile;
  filesChangedCount: number;
  commandsRunCount: number;
  tokensUsed: number;
  costCredits: number;
  startedAt: string;
  lastActiveAt: string;
}

export interface WorkAgentRun {
  runId: string;
  taskId: string;
  agentId: string;
  projectId: string;
  provider: string;
  model: string;
  status: WorkTaskStatus;
  startedAt: string;
  completedAt?: string | null;
  tokens: number;
  credits: number;
  toolCallsCount: number;
  workspaceId: string;
  checkpoint: WorkTaskCheckpoint;
  error?: string | null;
}

export type WorkEventType =
  | 'TASK_CREATED'
  | 'TASK_STARTED'
  | 'TASK_PROGRESS'
  | 'AGENT_STARTED'
  | 'AGENT_PROGRESS'
  | 'TOOL_STARTED'
  | 'TOOL_FINISHED'
  | 'FILE_CREATED'
  | 'FILE_UPDATED'
  | 'FILE_DELETED'
  | 'COMMAND_STARTED'
  | 'COMMAND_OUTPUT'
  | 'COMMAND_FINISHED'
  | 'TEST_STARTED'
  | 'TEST_FINISHED'
  | 'ARTIFACT_CREATED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  | 'TASK_PAUSED'
  | 'TASK_RESUMED'
  | 'TASK_FAILED'
  | 'TASK_CANCELLED'
  | 'TASK_COMPLETED'
  | 'DRIVE_SYNC_STARTED'
  | 'DRIVE_SYNC_COMPLETED'
  | 'DRIVE_SYNC_FAILED';

export interface WorkEvent {
  id: string;
  taskId: string;
  projectId: string;
  agentId?: string;
  eventType: WorkEventType;
  payload: Record<string, any>;
  timestamp: string;
}

export interface WorkMessage {
  id: string;
  taskId: string;
  projectId: string;
  senderType: 'user' | 'agent' | 'system' | 'tool' | 'orchestrator';
  senderName: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    parameters: Record<string, any>;
  }>;
  toolResults?: Array<{
    toolCallId: string;
    name: string;
    result: any;
    error?: string;
  }>;
  artifacts?: WorkArtifactReference[];
  visualDirections?: WorkVisualDirection[];
  visualDirectionStatus?: 'pending_choice' | 'accepted' | 'rejected';
  selectedDirectionId?: string;
  createdAt: string;
}

export interface AnalyzedUrlSource {
  url: string;
  type: 'youtube' | 'reddit' | 'website' | 'portfolio';
  domain: string;
  isImportant: boolean; // "imp" vs "non-imp" reference
  label: string;
  designCue: string;
  platformTitle?: string;
}

export interface WorkVisualDirection {
  id: string;
  title: string;
  subtitle?: string;
  aesthetic: string;
  description: string;
  imageUrl: string;
  colorPalette: string[];
  styleTags: string[];
  aspectRatio?: '1:1' | '16:9' | '4:3' | '9:16';
  prompt: string;
  themeSpec?: Record<string, any>;
  analyzedSources?: AnalyzedUrlSource[];
}

export interface WorkVisualDirectionProposal {
  id: string;
  prompt: string;
  directions: WorkVisualDirection[];
  remainingImages: number;
  totalCap: number;
  status: 'pending_choice' | 'accepted' | 'rejected';
  analyzedSources?: AnalyzedUrlSource[];
  createdAt: string;
}

export interface WorkWorktree {
  id: string;
  projectId: string;
  taskId?: string | null;
  name: string;
  branch: string;
  baseRevision: string;
  currentRevision: string;
  status: 'active' | 'merged' | 'abandoned';
  createdAt: string;
  updatedAt: string;
}

export interface WorkFile {
  id: string;
  projectId: string;
  worktreeId: string;
  path: string;
  name: string;
  content: string;
  size: number;
  isDirectory: boolean;
  mimeType: string;
  isModified?: boolean;
  isNew?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WorkArtifactType =
  | 'markdown'
  | 'code'
  | 'patch'
  | 'test_report'
  | 'diff'
  | 'json'
  | 'image'
  | 'document'
  | 'report';

export interface WorkArtifact {
  id: string;
  projectId: string;
  taskId: string;
  agentId?: string;
  type: WorkArtifactType;
  name: string;
  title: string;
  content: string;
  url?: string;
  size: number;
  version: number;
  meta: Record<string, any>;
  createdAt: string;
}

export interface WorkArtifactReference {
  id: string;
  name: string;
  type: WorkArtifactType;
  title: string;
  size: number;
}

export type WorkApprovalAction =
  | 'file_deletion'
  | 'config_change'
  | 'payment_logic'
  | 'db_migration'
  | 'production_deploy'
  | 'credit_threshold'
  | 'privileged_command';

export type WorkApprovalStatus = 'pending' | 'approved' | 'denied' | 'skipped';

export interface WorkApproval {
  id: string;
  taskId: string;
  projectId: string;
  agentId: string;
  actionType: WorkApprovalAction;
  title: string;
  description: string;
  details: Record<string, any>;
  status: WorkApprovalStatus;
  decidedBy?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

export interface WorkSkill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  tools: string[];
  category: 'engineering' | 'research' | 'design' | 'security' | 'prompt_ops' | 'general';
  version: string;
  author: string;
  isBuiltin: boolean;
  isProjectSpecific: boolean;
  projectId?: string | null;
  createdAt: string;
}

export type WorkAutomationSchedule = 'daily' | 'weekly' | 'monthly' | 'custom_cron';

export interface WorkAutomation {
  id: string;
  projectId: string;
  name: string;
  description: string;
  schedule: WorkAutomationSchedule;
  cronExpression: string;
  taskTitle: string;
  taskDescription: string;
  agentType: string;
  model: string;
  provider: string;
  maxBudgetCredits: number;
  isEnabled: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
}

export interface WorkAgentMemory {
  id: string;
  projectId: string;
  taskId?: string | null;
  scope: 'project' | 'task' | 'agent' | 'user';
  key: string;
  value: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkFileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  oldContent?: string;
  newContent?: string;
  linesAdded: number;
  linesRemoved: number;
  chunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: Array<{
      type: 'add' | 'delete' | 'context';
      content: string;
      oldLineNumber?: number;
      newLineNumber?: number;
    }>;
  }>;
}

export interface WorkTerminalProcess {
  processId: string;
  command: string;
  args: string[];
  status: 'running' | 'completed' | 'failed' | 'terminated';
  exitCode?: number | null;
  startedAt: string;
  completedAt?: string | null;
  stdout: string[];
  stderr: string[];
}
