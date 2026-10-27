/**
 * src/services/knowledge/graphTraversal.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Graph Traversal & Cycle Detection Algorithms for PromptHub.
 *
 * Capabilities:
 * - Upstream prerequisites (getDependencies) & Downstream impact (getDependents)
 * - Supersedes precedence & historical version chains
 * - Deep end-to-end provenance lineage tracing
 * - Cycle detection and topological ordering with recursion-stack guarding
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  KnowledgeNode,
  KnowledgeEdgeType,
  TraversalHop,
  TraversalOptions,
  GraphTraversalResult,
} from '../../types/knowledgeGraph.ts';
import { knowledgeGraphService } from './knowledgeGraphService.ts';

export class GraphTraversalEngine {
  /**
   * Retrieves upstream dependencies for a node
   */
  public async getDependencies(
    nodeId: string,
    userId: string,
    allowedRelationships: KnowledgeEdgeType[] | null = null
  ): Promise<TraversalHop[]> {
    return knowledgeGraphService.getDependencies(nodeId, userId, allowedRelationships);
  }

  /**
   * Retrieves downstream dependents for a node
   */
  public async getDependents(
    nodeId: string,
    userId: string,
    allowedRelationships: KnowledgeEdgeType[] | null = null
  ): Promise<TraversalHop[]> {
    return knowledgeGraphService.getDependents(nodeId, userId, allowedRelationships);
  }

  /**
   * Traces chronological supersedes chain (e.g. v3 -> v2 -> v1)
   */
  public async getSupersededChain(nodeId: string, userId: string): Promise<KnowledgeNode[]> {
    return knowledgeGraphService.getSupersededChain(nodeId, userId);
  }

  /**
   * Traces end-to-end provenance lineage
   */
  public async traceLineage(
    nodeId: string,
    userId: string,
    options: TraversalOptions = {}
  ): Promise<KnowledgeNode[]> {
    return knowledgeGraphService.traceLineage(nodeId, userId, options);
  }

  /**
   * Detects cycles in the graph starting from a node using Tarjan's / DFS recursion stack
   */
  public async detectCycles(
    nodeId: string,
    userId: string
  ): Promise<{ hasCycles: boolean; cyclePath: string[] }> {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];
    let cyclePath: string[] = [];

    const dfs = (currId: string): boolean => {
      visited.add(currId);
      recStack.add(currId);
      path.push(currId);

      for (const edge of knowledgeGraphService.edges.values()) {
        if (edge.userId === userId && edge.sourceNodeId === currId) {
          const neighbor = edge.targetNodeId;
          if (!visited.has(neighbor)) {
            if (dfs(neighbor)) return true;
          } else if (recStack.has(neighbor)) {
            const cycleStartIdx = path.indexOf(neighbor);
            cyclePath = path.slice(cycleStartIdx).concat(neighbor);
            return true;
          }
        }
      }

      path.pop();
      recStack.delete(currId);
      return false;
    };

    const hasCycles = dfs(nodeId);
    return { hasCycles, cyclePath };
  }

  /**
   * Performs full traversal analysis on a node: dependencies, dependents, chain, and lineage
   */
  public async analyzeNode(nodeId: string, userId: string): Promise<GraphTraversalResult> {
    const dependencies = await this.getDependencies(nodeId, userId);
    const dependents = await this.getDependents(nodeId, userId);
    const supersededChain = await this.getSupersededChain(nodeId, userId);
    const lineage = await this.traceLineage(nodeId, userId);
    const cycleCheck = await this.detectCycles(nodeId, userId);

    return {
      dependencies,
      dependents,
      supersededChain,
      lineage,
      hasCycles: cycleCheck.hasCycles,
      cycleNodes: cycleCheck.cyclePath,
    };
  }
}

export const graphTraversal = new GraphTraversalEngine();
