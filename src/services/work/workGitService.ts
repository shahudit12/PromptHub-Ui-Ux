/**
 * src/services/work/workGitService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Virtual Git & Worktree Service for PromptHub Work.
 * Manages isolated task worktrees, branches, line-by-line diff generation,
 * and change reviews without touching or corrupting the user's host repo.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { WorkWorktree, WorkFileDiff } from '../../types/work';

export interface WorkCommit {
  id: string;
  projectId: string;
  worktreeId: string;
  message: string;
  author: string;
  timestamp: string;
  filesChanged: string[];
}

class WorkGitService {
  private worktrees: Map<string, WorkWorktree> = new Map();
  private commits: Map<string, WorkCommit[]> = new Map();

  /**
   * Creates an isolated worktree for a specific task.
   */
  createWorktree(projectId: string, taskId: string, branchName?: string): WorkWorktree {
    const id = `wt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const branch = branchName || `agent/task-${taskId.slice(0, 8)}`;
    const worktree: WorkWorktree = {
      id,
      projectId,
      taskId,
      name: branch,
      branch,
      baseRevision: 'HEAD',
      currentRevision: 'HEAD',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.worktrees.set(id, worktree);
    return worktree;
  }

  getWorktree(id: string): WorkWorktree | undefined {
    return this.worktrees.get(id);
  }

  /**
   * Generates a line-by-line diff between two file versions.
   */
  computeFileDiff(
    filePath: string,
    oldContent: string = '',
    newContent: string = '',
    status: 'added' | 'modified' | 'deleted' | 'renamed' = 'modified'
  ): WorkFileDiff {
    const oldLines = oldContent ? oldContent.split('\n') : [];
    const newLines = newContent ? newContent.split('\n') : [];

    let linesAdded = 0;
    let linesRemoved = 0;

    const chunks: WorkFileDiff['chunks'] = [];
    const chunkLines: Array<{
      type: 'add' | 'delete' | 'context';
      content: string;
      oldLineNumber?: number;
      newLineNumber?: number;
    }> = [];

    if (status === 'added') {
      newLines.forEach((line, idx) => {
        linesAdded++;
        chunkLines.push({
          type: 'add',
          content: line,
          newLineNumber: idx + 1,
        });
      });
      chunks.push({
        oldStart: 0,
        oldLines: 0,
        newStart: 1,
        newLines: newLines.length,
        lines: chunkLines,
      });
    } else if (status === 'deleted') {
      oldLines.forEach((line, idx) => {
        linesRemoved++;
        chunkLines.push({
          type: 'delete',
          content: line,
          oldLineNumber: idx + 1,
        });
      });
      chunks.push({
        oldStart: 1,
        oldLines: oldLines.length,
        newStart: 0,
        newLines: 0,
        lines: chunkLines,
      });
    } else {
      // Simple line diff with context
      const maxLen = Math.max(oldLines.length, newLines.length);
      for (let i = 0; i < maxLen; i++) {
        const oLine = oldLines[i];
        const nLine = newLines[i];

        if (oLine === undefined) {
          linesAdded++;
          chunkLines.push({
            type: 'add',
            content: nLine,
            newLineNumber: i + 1,
          });
        } else if (nLine === undefined) {
          linesRemoved++;
          chunkLines.push({
            type: 'delete',
            content: oLine,
            oldLineNumber: i + 1,
          });
        } else if (oLine !== nLine) {
          linesRemoved++;
          chunkLines.push({
            type: 'delete',
            content: oLine,
            oldLineNumber: i + 1,
          });
          linesAdded++;
          chunkLines.push({
            type: 'add',
            content: nLine,
            newLineNumber: i + 1,
          });
        } else {
          chunkLines.push({
            type: 'context',
            content: oLine,
            oldLineNumber: i + 1,
            newLineNumber: i + 1,
          });
        }
      }
      chunks.push({
        oldStart: 1,
        oldLines: oldLines.length,
        newStart: 1,
        newLines: newLines.length,
        lines: chunkLines,
      });
    }

    return {
      path: filePath,
      status,
      oldContent,
      newContent,
      linesAdded,
      linesRemoved,
      chunks,
    };
  }

  /**
   * Records a commit into the virtual worktree.
   */
  recordCommit(
    projectId: string,
    worktreeId: string,
    message: string,
    author: string,
    filesChanged: string[]
  ): WorkCommit {
    const commit: WorkCommit = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId,
      worktreeId,
      message,
      author,
      timestamp: new Date().toISOString(),
      filesChanged,
    };

    if (!this.commits.has(worktreeId)) {
      this.commits.set(worktreeId, []);
    }
    this.commits.get(worktreeId)!.unshift(commit);

    const wt = this.worktrees.get(worktreeId);
    if (wt) {
      wt.currentRevision = commit.id;
      wt.updatedAt = commit.timestamp;
    }

    return commit;
  }

  getCommits(worktreeId: string): WorkCommit[] {
    return this.commits.get(worktreeId) || [];
  }
}

export const workGitService = new WorkGitService();
