/**
 * src/types/knowledgeGraph.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Type Definitions for PromptHub Relational Project Knowledge Graph.
 *
 * Requirements Covered:
 * - Master Prompt §5: Structured Project Relational Knowledge Graph.
 * - ORIGINAL_REQUEST.md § R2: Relational Project Knowledge Graph.
 * - scripts/verify-knowledge-graph.mjs: Verification contract.
 *
 * Taxonomies:
 * - 12 Entity Types: project, goal, requirement, decision, preference, source,
 *   file, artifact, artifact_version, task, validation_result, deployment.
 * - 8 Edge Types: belongs_to, derived_from, requires, uses, supersedes,
 *   approved_by, validated_by, deployed_as.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const VALID_ENTITY_TYPES = [
  'project',
  'goal',
  'requirement',
  'decision',
  'preference',
  'source',
  'file',
  'artifact',
  'artifact_version',
  'task',
  'validation_result',
  'deployment',
] as const;

export type KnowledgeNodeType = typeof VALID_ENTITY_TYPES[number];

export const VALID_EDGE_TYPES = [
  'belongs_to',
  'derived_from',
  'requires',
  'uses',
  'supersedes',
  'approved_by',
  'validated_by',
  'deployed_as',
] as const;

export type KnowledgeEdgeType = typeof VALID_EDGE_TYPES[number];

export type NodeConfidenceState =
  | 'confirmed_fact'
  | 'inferred_hypothesis'
  | 'user_approved'
  | 'system_deduction'
  | 'rejected';

export type NodeStatus =
  | 'active'
  | 'forgotten'
  | 'superseded'
  | 'archived';

export type NodeScope =
  | 'project'
  | 'personal'
  | 'team'
  | 'conversation';

export interface KnowledgeNode {
  id: string;
  userId: string;
  projectId: string;
  teamId?: string | null;
  nodeType: KnowledgeNodeType;
  scope: NodeScope;
  title: string;
  name?: string; // Semantic alias for title
  content: string;
  confidenceState: NodeConfidenceState;
  status: NodeStatus;
  metadata: Record<string, any>;
  version: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface KnowledgeEdge {
  id: string;
  userId: string;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: KnowledgeEdgeType;
  edgeType?: KnowledgeEdgeType; // Semantic alias for relationshipType
  properties?: Record<string, any>;
  metadata?: Record<string, any>; // Semantic alias for properties
  createdAt: string; // ISO 8601
}

export interface GraphSyncQueueItem {
  id: string;
  action: 'insert_node' | 'update_node' | 'delete_node' | 'insert_edge' | 'delete_edge';
  entityId: string;
  payload?: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount?: number;
  errorMessage?: string;
}

export type GraphSyncItem = GraphSyncQueueItem;

export interface GraphQueryFilter {
  userId: string;
  projectId?: string;
  nodeType?: KnowledgeNodeType | KnowledgeNodeType[];
  scope?: NodeScope;
  status?: NodeStatus;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface TraversalHop {
  node: KnowledgeNode;
  edge: KnowledgeEdge;
  depth?: number;
}

export type NodeTraversalResult = TraversalHop;

export interface TraversalOptions {
  maxDepth?: number;
  allowedRelationships?: KnowledgeEdgeType[];
  includeForgotten?: boolean;
}

export interface GraphTraversalResult {
  dependencies: TraversalHop[];
  dependents: TraversalHop[];
  supersededChain: KnowledgeNode[];
  lineage: KnowledgeNode[];
  hasCycles: boolean;
  cycleNodes?: string[];
}

export interface KnowledgeGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  projectId: string;
  selectedNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
}
