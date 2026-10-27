/**
 * src/services/work/workService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * High-Level State Management & Persistence Service for PromptHub Work.
 * Unifies project workspaces, tasks, agents, files, artifacts, skills, and memory.
 * Features dual-layer persistence: Supabase DB + instant offline-first local cache.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { workEventBus } from './workEventBus';
import { workOrchestrator } from './workOrchestrator';
import { workGitService } from './workGitService';
import { storageService, notifyStorageUpdated } from '../storageService';
import type {
  WorkProject,
  WorkTask,
  WorkAgent,
  WorkFile,
  WorkArtifact,
  WorkArtifactType,
  WorkMessage,
  WorkApproval
} from '../../types/work';
import { logger } from '../../utils/logger';
import { generateZipArchive, downloadFileToDesktop, type ZipFileInput } from '../../utils/zipGenerator';
import { indexedDbVault } from '../../utils/indexedDbVault';
import { DEFAULT_STARTER_PROJECTS } from './defaultProjects';

const STORAGE_KEYS = {
  PROJECTS: 'prompthub_work_projects',
  TASKS: 'prompthub_work_tasks',
  AGENTS: 'prompthub_work_agents',
  FILES: 'prompthub_work_files',
  ARTIFACTS: 'prompthub_work_artifacts',
  SKILLS: 'prompthub_work_skills',
  AUTOMATIONS: 'prompthub_work_automations',
};

/**
 * Normalizes file paths for workspace file storage across Windows, web, and relative paths.
 */
export function normalizeWorkPath(rawPath: string): string {
  if (!rawPath) return '';
  return rawPath
    .replace(/\\/g, '/')
    .replace(/^\.?\/+/, '')
    .trim();
}

// Seed Starter Project and Files for immediate demonstration
const SEED_PROJECT_ID = 'proj_starter_studio';
const SEED_WORKTREE_ID = 'wt_starter_main';



const SEED_AGENTS: WorkAgent[] = [
  {
    id: 'ag_planner',
    projectId: SEED_PROJECT_ID,
    userId: 'system',
    name: 'Nova Architect',
    role: 'Planner',
    type: 'architect',
    status: 'idle',
    currentAction: 'Standby for task planning',
    model: 'openrouter/free',
    provider: 'openrouter',
    toolsAllowed: ['list_files', 'read_file', 'create_artifact'],
    permissions: 'read_only',
    filesChangedCount: 0,
    commandsRunCount: 0,
    tokensUsed: 0,
    costCredits: 0,
    startedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: 'ag_developer',
    projectId: SEED_PROJECT_ID,
    userId: 'system',
    name: 'Atlas Engineer',
    role: 'Developer',
    type: 'coder',
    status: 'idle',
    currentAction: 'Ready to write and patch code',
    model: 'openrouter/free',
    provider: 'openrouter',
    toolsAllowed: ['read_file', 'write_file', 'edit_file', 'delete_file', 'list_files', 'run_terminal_command', 'run_tests', 'create_artifact'],
    permissions: 'developer',
    filesChangedCount: 0,
    commandsRunCount: 0,
    tokensUsed: 0,
    costCredits: 0,
    startedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: 'ag_qa',
    projectId: SEED_PROJECT_ID,
    userId: 'system',
    name: 'Sentinel QA',
    role: 'QA',
    type: 'tester',
    status: 'idle',
    currentAction: 'Monitoring test suites',
    model: 'openrouter/free',
    provider: 'openrouter',
    toolsAllowed: ['read_file', 'list_files', 'run_tests', 'run_terminal_command', 'create_artifact'],
    permissions: 'developer',
    filesChangedCount: 0,
    commandsRunCount: 0,
    tokensUsed: 0,
    costCredits: 0,
    startedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: 'ag_reviewer',
    projectId: SEED_PROJECT_ID,
    userId: 'system',
    name: 'Aegis Reviewer',
    role: 'Reviewer',
    type: 'reviewer',
    status: 'idle',
    currentAction: 'Reviewing diffs and audit logs',
    model: 'openrouter/free',
    provider: 'openrouter',
    toolsAllowed: ['read_file', 'list_files', 'create_artifact'],
    permissions: 'read_only',
    filesChangedCount: 0,
    commandsRunCount: 0,
    tokensUsed: 0,
    costCredits: 0,
    startedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
];

class WorkService {
  private projectsCache: Map<string, WorkProject> = new Map();
  private tasksCache: Map<string, WorkTask> = new Map();
  private agentsCache: Map<string, WorkAgent> = new Map();
  private filesCache: Map<string, WorkFile> = new Map();
  private artifactsCache: Map<string, WorkArtifact> = new Map();
  private messagesCache: Map<string, WorkMessage[]> = new Map();

  constructor() {
    this.initFromLocalStorage();
  }

  private initFromLocalStorage() {
    if (typeof window === 'undefined') return;

    try {
      const rawProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (rawProjects) {
        const parsed: WorkProject[] = JSON.parse(rawProjects);
        const cleanProjects = parsed.filter(
          (p) =>
            p &&
            p.id !== SEED_PROJECT_ID &&
            p.id !== 'proj_starter_studio' &&
            !p.id.startsWith('proj_starter_') &&
            p.userId !== 'system' &&
            !p.name?.startsWith('PromptHub Web Studio')
        );
        cleanProjects.forEach((p) => this.projectsCache.set(p.id, p));
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(cleanProjects));
      }

      // Authentic User History: Never auto-pollute user history with fake starter projects!
      // If user has 0 projects, history starts clean at 0 with an authentic empty state.

      const rawFiles = localStorage.getItem(STORAGE_KEYS.FILES);
      if (rawFiles) {
        const parsed: WorkFile[] = JSON.parse(rawFiles);
        // Delete all fake seed and starter project files from existing browser cache
        const cleanFiles = parsed.filter((f) => 
          f &&
          f.projectId !== SEED_PROJECT_ID &&
          f.projectId !== 'proj_starter_studio' &&
          !f.projectId.startsWith('proj_starter_') &&
          !f.id.startsWith('f_telem_') &&
          !f.id.startsWith('f_port_') &&
          !f.id.startsWith('f_ecom_') &&
          !f.id.startsWith('f_supp_') &&
          !f.id.startsWith('f_pkg_json') &&
          !f.id.startsWith('f_readme') &&
          !f.id.startsWith('f_app_tsx') &&
          !f.id.startsWith('f_news_') &&
          !f.content?.includes('Clicked {count} times') &&
          !f.content?.includes('prompthub-web-studio')
        );
        cleanFiles.forEach((f) => {
          const norm = normalizeWorkPath(f.path);
          this.filesCache.set(`${f.projectId}:${norm}`, { ...f, path: norm });
        });
        this.saveFilesToLocal();
      }

      const rawAgents = localStorage.getItem(STORAGE_KEYS.AGENTS);
      if (rawAgents) {
        const parsed: WorkAgent[] = JSON.parse(rawAgents);
        parsed.forEach((a) => this.agentsCache.set(a.id, a));
      } else {
        SEED_AGENTS.forEach((a) => this.agentsCache.set(a.id, a));
        this.saveAgentsToLocal();
      }

      const rawTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (rawTasks) {
        const parsed: WorkTask[] = JSON.parse(rawTasks);
        parsed.forEach((t) => this.tasksCache.set(t.id, t));
      }

      const rawArtifacts = localStorage.getItem(STORAGE_KEYS.ARTIFACTS);
      if (rawArtifacts) {
        const parsed: WorkArtifact[] = JSON.parse(rawArtifacts);
        parsed.forEach((a) => this.artifactsCache.set(a.id, a));
      }

      // Hydration fallback from IndexedDB:
      // If localStorage is cleared, empty, or misses files, recover all saved project files from IndexedDB
      const isLocalStorageEmpty = !rawFiles || (() => {
        try {
          return JSON.parse(rawFiles).length === 0;
        } catch {
          return true;
        }
      })();
      if (typeof window !== 'undefined' && indexedDbVault.isAvailable() && isLocalStorageEmpty) {
        indexedDbVault.listFiles().then((stored) => {
          let hasNewRestored = false;
          for (const sf of stored) {
            // Ignore fake dummy files in IndexedDB vault
            if (
              sf.id.includes('f_pkg_json') ||
              sf.id.includes('f_readme') ||
              sf.id.includes('f_app_tsx') ||
              sf.id.includes('f_news_') ||
              String(sf.metadata?.content || '').includes('Clicked {count} times') ||
              String(sf.metadata?.content || '').includes('prompthub-web-studio')
            ) {
              continue;
            }

            if (sf.id.startsWith('work_') && sf.metadata?.workProjectId && sf.metadata?.workPath) {
              const normPath = normalizeWorkPath(sf.metadata.workPath as string);
              const cacheKey = `${sf.metadata.workProjectId}:${normPath}`;
              if (!this.filesCache.has(cacheKey)) {
                this.filesCache.set(cacheKey, {
                  id: sf.id,
                  projectId: sf.metadata.workProjectId as string,
                  worktreeId: (sf.metadata.worktreeId as string) || 'wt_main',
                  path: normPath,
                  name: sf.originalName || sf.sanitizedName,
                  content: (sf.metadata.content as string) || '',
                  size: sf.sizeBytes || 0,
                  isDirectory: false,
                  mimeType: sf.mimeType || 'text/plain',
                  createdAt: sf.createdAt,
                  updatedAt: sf.updatedAt,
                });
                hasNewRestored = true;
              }
            } else if (sf.id.startsWith('worktask_') && sf.metadata?.taskData) {
              const task = sf.metadata.taskData as WorkTask;
              if (!this.tasksCache.has(task.id)) {
                this.tasksCache.set(task.id, task);
              }
            } else if (sf.id.startsWith('workartifact_') && sf.metadata?.artifactData) {
              const art = sf.metadata.artifactData as WorkArtifact;
              if (!this.artifactsCache.has(art.id)) {
                this.artifactsCache.set(art.id, art);
              }
            }
          }
          if (hasNewRestored) {
            try {
              localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(Array.from(this.filesCache.values())));
            } catch {}
          }
        }).catch((err) => {
          logger.warn('[WorkService] IndexedDB hydration notice:', err);
        });
      }
    } catch (err) {
      logger.warn('[WorkService] Failed to load local work cache:', err);
    }
  }

  private saveProjectsToLocal() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(Array.from(this.projectsCache.values())));
  }

  private saveTasksToLocal() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(Array.from(this.tasksCache.values())));
    } catch {}
    try {
      if (indexedDbVault.isAvailable()) {
        const tasks = Array.from(this.tasksCache.values());
        for (const task of tasks) {
          indexedDbVault.saveFile({
            id: `worktask_${task.id}`,
            userId: 'local-user',
            originalName: `task-${task.id}.json`,
            sanitizedName: `task-${task.id}.json`,
            mimeType: 'application/json',
            sizeBytes: JSON.stringify(task).length,
            storageProvider: 'local',
            googleDriveFileId: '',
            category: 'prompt-assets',
            visibility: 'private',
            status: 'active',
            createdAt: task.createdAt,
            updatedAt: task.createdAt,
            metadata: {
              source: 'prompthub_work_sync',
              workProjectId: task.projectId,
              taskData: task,
            },
          }).catch(() => {});
        }
      }
    } catch {}
  }

  private saveAgentsToLocal() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(Array.from(this.agentsCache.values())));
  }

  private saveFilesToLocal() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(Array.from(this.filesCache.values())));
    } catch {
      // localStorage may be full, graceful fallback
    }
    // Also mirror to IndexedDB for robust browser capacity
    try {
      if (indexedDbVault.isAvailable()) {
        const files = Array.from(this.filesCache.values());
        for (const file of files) {
          indexedDbVault.saveFile({
            id: `work_${file.projectId}_${file.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
            userId: 'local-user',
            originalName: file.name,
            sanitizedName: file.name,
            mimeType: file.mimeType || 'text/plain',
            sizeBytes: file.size,
            storageProvider: 'local',
            googleDriveFileId: '',
            category: 'prompt-assets',
            visibility: 'private',
            status: 'active',
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
            metadata: {
              source: 'prompthub_work_sync',
              workProjectId: file.projectId,
              workPath: file.path,
              content: file.content,
            },
          }).catch(() => {});
        }
      }
    } catch {}
  }

  private saveArtifactsToLocal() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.ARTIFACTS, JSON.stringify(Array.from(this.artifactsCache.values())));
    } catch {}
    try {
      if (indexedDbVault.isAvailable()) {
        const artifacts = Array.from(this.artifactsCache.values());
        for (const art of artifacts) {
          indexedDbVault.saveFile({
            id: `workartifact_${art.id}`,
            userId: 'local-user',
            originalName: art.title || `artifact-${art.id}`,
            sanitizedName: art.title || `artifact-${art.id}`,
            mimeType: 'text/plain',
            sizeBytes: (art.content || '').length,
            storageProvider: 'local',
            googleDriveFileId: '',
            category: 'prompt-assets',
            visibility: 'private',
            status: 'active',
            createdAt: art.createdAt,
            updatedAt: art.createdAt,
            metadata: {
              source: 'prompthub_work_sync',
              workProjectId: art.projectId,
              artifactData: art,
            },
          }).catch(() => {});
        }
      }
    } catch {}
  }

  /**
   * Export the complete project workspace as a downloadable .zip archive directly to the user's desktop.
   */
  async exportProjectToDesktop(projectId: string): Promise<{ success: boolean; filename: string; error?: string }> {
    try {
      const project = this.projectsCache.get(projectId);
      const files = await this.getFiles(projectId);
      if (!files || files.length === 0) {
        return { success: false, filename: '', error: 'No files to export in this project.' };
      }

      const zipInputs: ZipFileInput[] = files.map((f) => ({
        path: f.path,
        content: f.content,
      }));

      const zipBlob = generateZipArchive(zipInputs);
      const safeName = (project?.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `${safeName}-${Date.now().toString(36)}.zip`;

      downloadFileToDesktop(zipBlob, filename);
      return { success: true, filename };
    } catch (err: any) {
      return { success: false, filename: '', error: err?.message || String(err) };
    }
  }

  /**
   * Download a single file directly to the user's desktop.
   */
  downloadFileToDesktop(projectId: string, filePath: string): boolean {
    const file = this.filesCache.get(`${projectId}:${filePath}`);
    if (!file) return false;
    const blob = new Blob([file.content], { type: file.mimeType || 'text/plain' });
    const fileName = filePath.split('/').pop() || 'download.txt';
    downloadFileToDesktop(blob, fileName);
    return true;
  }

  public ensureDefaultStarterProjects(force: boolean = false): void {
    if (force && this.projectsCache.size === 0) {
      for (const item of DEFAULT_STARTER_PROJECTS) {
        this.projectsCache.set(item.project.id, item.project);
        for (const file of item.files) {
          const norm = normalizeWorkPath(file.path);
          this.filesCache.set(`${item.project.id}:${norm}`, { ...file, path: norm });
        }
      }
      this.saveProjectsToLocal();
      this.saveFilesToLocal();
    }
  }

  // ─── PROJECTS ──────────────────────────────────────────────────────────────

  async getProjects(teamId?: string | null): Promise<WorkProject[]> {
    const all = Array.from(this.projectsCache.values()).filter(
      (p) =>
        p &&
        p.id !== SEED_PROJECT_ID &&
        p.id !== 'proj_starter_studio' &&
        !p.id.startsWith('proj_starter_') &&
        p.userId !== 'system' &&
        !p.name?.startsWith('PromptHub Web Studio')
    );
    if (teamId) {
      return all.filter((p) => p.teamId === teamId);
    }
    if (teamId === null) {
      // Personal projects only
      return all.filter((p) => !p.teamId);
    }
    return all;
  }

  async getProject(id: string): Promise<WorkProject | undefined> {
    return this.projectsCache.get(id);
  }

  async createProject(input: Partial<WorkProject>): Promise<WorkProject> {
    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const worktreeId = `wt_${id}_main`;
    const project: WorkProject = {
      id,
      userId: input.userId || 'local-user',
      teamId: input.teamId || null,
      name: input.name || 'Untitled Project',
      slug: (input.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: input.description || '',
      type: input.type || 'code',
      status: 'active',
      defaultModel: input.defaultModel || 'openrouter/free',
      defaultAgent: input.defaultAgent || 'Atlas Engineer',
      instructions: input.instructions || '',
      rules: input.rules || [],
      tags: input.tags || [],
      activeWorktreeId: worktreeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.projectsCache.set(id, project);
    this.saveProjectsToLocal();

    // Initialize virtual worktree
    workGitService.createWorktree(id, 'init', 'main');

    // Create starter README
    await this.writeFile(id, {
      path: 'README.md',
      content: `# ${project.name}\n\n${project.description}\n`,
      worktreeId,
    });

    return project;
  }

  async deleteProject(id: string): Promise<boolean> {
    const existed = this.projectsCache.delete(id);
    if (existed) {
      this.saveProjectsToLocal();
      const prefix = `${id}:`;
      const toDelete: string[] = [];
      this.filesCache.forEach((_, key) => {
        if (key.startsWith(prefix)) toDelete.push(key);
      });
      toDelete.forEach((k) => this.filesCache.delete(k));
      this.saveFilesToLocal();

      try {
        if (typeof window !== 'undefined' && indexedDbVault.isAvailable()) {
          const stored = await indexedDbVault.listFiles();
          for (const sf of stored) {
            if (
              (sf.id.startsWith('work_') || sf.id.startsWith('worktask_') || sf.id.startsWith('workartifact_')) &&
              sf.metadata?.workProjectId === id
            ) {
              await indexedDbVault.deleteFile(sf.id);
            }
          }
        }
      } catch (err) {
        logger.warn('[WorkService] IndexedDB project deletion cleanup:', err);
      }

      await workEventBus.emit('system', id, 'PROJECT_DELETED' as any, { id });
    }
    return existed;
  }

  async archiveProject(id: string): Promise<WorkProject | undefined> {
    const proj = this.projectsCache.get(id);
    if (proj) {
      proj.status = 'archived';
      proj.updatedAt = new Date().toISOString();
      this.saveProjectsToLocal();
      return proj;
    }
    return undefined;
  }

  /**
   * Retrieves an existing team workspace project or lazily creates a collaborative studio for the team.
   */
  async getOrCreateTeamProject(teamId: string, teamName: string): Promise<WorkProject> {
    const existing = Array.from(this.projectsCache.values()).find((p) => p.teamId === teamId);
    if (existing) return existing;

    const project = await this.createProject({
      name: `${teamName} Collaborative Studio`,
      description: `Collaborative multi-agent workspace for ${teamName}. Work together across autonomous agents, shared worktrees, and live code previews.`,
      teamId,
      type: 'code',
      defaultModel: 'openrouter/free',
      defaultAgent: 'Atlas Engineer',
      rules: [
        'Collaborate with team members across shared worktrees',
        'Verify TypeScript compilation before committing',
        'Review changes with Sentinel QA and Aegis Reviewer',
      ],
      tags: ['team', 'collaboration', 'workspace', 'agentic'],
    });

    const worktreeId = project.activeWorktreeId || `wt_${project.id}_main`;
    await this.writeFile(project.id, {
      path: 'src/App.tsx',
      worktreeId,
      content: `import React, { useState } from 'react';
import { Users, Sparkles, Shield, Rocket, CheckCircle2 } from 'lucide-react';

export default function TeamApp() {
  const [activeTab, setActiveTab] = useState<'overview' | 'features'>('overview');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl p-8 backdrop-blur-md shadow-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono">
          <Users className="w-3.5 h-3.5" />
          <span>${teamName} Collaborative Studio</span>
        </div>
        
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Welcome to PromptHub Workspace
        </h1>
        
        <p className="text-slate-400 text-sm leading-relaxed">
          Your team workspace is live. Collaborate with up to 4 teammates, co-edit files, orchestrate multi-agent pipelines, and build production web apps together.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50">
            <Sparkles className="w-5 h-5 text-amber-400 mb-2" />
            <h3 className="text-xs font-bold text-slate-200">Autonomous Agents</h3>
            <p className="text-[11px] text-slate-400 mt-1">Planner, Developer, QA, and Reviewer work on your instructions.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50">
            <Users className="w-5 h-5 text-blue-400 mb-2" />
            <h3 className="text-xs font-bold text-slate-200">Max 4 Collaborators</h3>
            <p className="text-[11px] text-slate-400 mt-1">Tight-knit team with role-based access and shared state.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50">
            <Rocket className="w-5 h-5 text-emerald-400 mb-2" />
            <h3 className="text-xs font-bold text-slate-200">Live Preview</h3>
            <p className="text-[11px] text-slate-400 mt-1">Test your code instantly in the browser canvas.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
`,
    });

    return project;
  }

  // ─── TASKS ─────────────────────────────────────────────────────────────────

  async getTasks(projectId?: string): Promise<WorkTask[]> {
    const all = Array.from(this.tasksCache.values());
    if (projectId) return all.filter((t) => t.projectId === projectId);
    return all;
  }

  async getTask(taskId: string): Promise<WorkTask | undefined> {
    return this.tasksCache.get(taskId);
  }

  async createTask(input: Partial<WorkTask>): Promise<WorkTask> {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const projectId = input.projectId || SEED_PROJECT_ID;
    const worktree = workGitService.createWorktree(projectId, id);

    const task: WorkTask = {
      id,
      projectId,
      userId: input.userId || 'local-user',
      title: input.title || 'Untitled Task',
      description: input.description || '',
      status: 'queued',
      priority: input.priority || 'medium',
      model: input.model || 'openrouter/free',
      provider: input.provider || 'openrouter',
      agentType: input.agentType || 'coder',
      executionMode: input.executionMode || 'single_agent',
      worktreeId: worktree.id,
      dependencies: input.dependencies || [],
      checkpoint: 'created',
      actualCostCredits: 0,
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
    };

    this.tasksCache.set(id, task);
    this.saveTasksToLocal();

    await workEventBus.emit(task.id, task.projectId, 'TASK_CREATED', {
      title: task.title,
      priority: task.priority,
      model: task.model,
    });

    return task;
  }

  async updateTaskStatus(taskId: string, status: WorkTask['status'], extra: Partial<WorkTask> = {}) {
    const task = this.tasksCache.get(taskId);
    if (!task) return;

    task.status = status;
    Object.assign(task, extra);
    this.tasksCache.set(taskId, task);
    this.saveTasksToLocal();
  }

  /**
   * Executes a task using WorkOrchestrator.
   */
  async executeTask(
    taskId: string,
    options: {
      onMessage?: (msg: WorkMessage) => void;
      onRequestApproval?: (approval: WorkApproval) => Promise<boolean>;
      signal?: AbortSignal;
    } = {}
  ) {
    const task = this.tasksCache.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    const projectFiles = await this.getFiles(task.projectId);
    const agents = await this.getAgents(task.projectId);

    await this.updateTaskStatus(taskId, 'running', { startedAt: new Date().toISOString() });

    const result = await workOrchestrator.executeTask({
      task,
      agents,
      files: projectFiles,
      onMessage: (msg) => {
        const msgs = this.messagesCache.get(taskId) || [];
        msgs.push(msg);
        this.messagesCache.set(taskId, msgs);
        options.onMessage?.(msg);
      },
      onFileChange: (file) => {
        if (file.id?.startsWith('del_')) {
          this.deleteFile(file.projectId, file.path);
        } else {
          this.filesCache.set(`${file.projectId}:${file.path}`, file);
          this.saveFilesToLocal();
        }
      },
      onFileDelete: (path) => {
        this.deleteFile(task.projectId, path);
      },
      onArtifactCreated: (art) => {
        this.artifactsCache.set(art.id, art);
        this.saveArtifactsToLocal();
      },
      onRequestApproval: options.onRequestApproval,
      signal: options.signal,
    });

    await this.updateTaskStatus(taskId, result.status === 'succeeded' ? 'succeeded' : 'failed', {
      completedAt: new Date().toISOString(),
      tokensUsed: result.tokensUsed,
      actualCostCredits: result.creditsUsed,
      error: result.error,
    });

    // Note: Project Drive sync is strictly initiated by user action/approval to prevent unapproved clutter.
    return result;
  }

  // ─── AGENTS ────────────────────────────────────────────────────────────────

  async getAgents(projectId?: string): Promise<WorkAgent[]> {
    const all = Array.from(this.agentsCache.values());
    if (projectId) {
      const filtered = all.filter((a) => a.projectId === projectId || a.projectId === SEED_PROJECT_ID);
      return filtered.length > 0 ? filtered : all;
    }
    return all;
  }

  async updateAgent(agentId: string, updates: Partial<WorkAgent>): Promise<WorkAgent | undefined> {
    const agent = this.agentsCache.get(agentId);
    if (!agent) return undefined;
    Object.assign(agent, updates);
    this.agentsCache.set(agentId, agent);
    this.saveAgentsToLocal();
    return agent;
  }

  // ─── FILES ─────────────────────────────────────────────────────────────────

  async getFiles(projectId: string): Promise<WorkFile[]> {
    const prefix = `${projectId}:`;
    const files: WorkFile[] = [];
    this.filesCache.forEach((file, key) => {
      if (key.startsWith(prefix)) files.push(file);
    });
    if (files.length === 0) {
      const starter = DEFAULT_STARTER_PROJECTS.find((p) => p.project.id === projectId);
      if (starter) {
        for (const file of starter.files) {
          const norm = normalizeWorkPath(file.path);
          files.push({ ...file, path: norm });
        }
      }
    }
    return files;
  }

  async getFile(projectId: string, path: string): Promise<WorkFile | undefined> {
    const norm = normalizeWorkPath(path);
    return (
      this.filesCache.get(`${projectId}:${norm}`) ||
      this.filesCache.get(`${projectId}:${path}`) ||
      Array.from(this.filesCache.values()).find(
        (f) => f.projectId === projectId && (normalizeWorkPath(f.path) === norm || f.path === path)
      )
    );
  }

  async writeFile(projectId: string, input: { path: string; content: string; worktreeId?: string }): Promise<WorkFile> {
    const normPath = normalizeWorkPath(input.path);
    const key = `${projectId}:${normPath}`;
    const existing = this.filesCache.get(key) || Array.from(this.filesCache.values()).find(
      (f) => f.projectId === projectId && (normalizeWorkPath(f.path) === normPath || f.path === input.path)
    );

    const file: WorkFile = {
      id: existing?.id || `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId,
      worktreeId: input.worktreeId || existing?.worktreeId || SEED_WORKTREE_ID,
      path: normPath,
      name: normPath.split('/').pop() || normPath,
      content: input.content,
      size: input.content.length,
      isDirectory: false,
      mimeType: this.guessMimeType(normPath),
      isModified: true,
      isNew: !existing,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.filesCache.set(key, file);
    if (input.path !== normPath) {
      this.filesCache.delete(`${projectId}:${input.path}`);
    }
    this.saveFilesToLocal();

    await workEventBus.emit(
      'system',
      projectId,
      existing ? 'FILE_UPDATED' : 'FILE_CREATED',
      { path: normPath, size: file.size }
    );

    return file;
  }

  async deleteFile(projectId: string, path: string): Promise<boolean> {
    const normPath = normalizeWorkPath(path);
    const key = `${projectId}:${normPath}`;
    const rawKey = `${projectId}:${path}`;

    let existed = this.filesCache.delete(key);
    if (this.filesCache.delete(rawKey)) existed = true;

    // Thoroughly scan filesCache in case file had formatting differences
    for (const [k, file] of Array.from(this.filesCache.entries())) {
      if (
        k.startsWith(`${projectId}:`) &&
        (normalizeWorkPath(file.path) === normPath || file.path === path)
      ) {
        this.filesCache.delete(k);
        existed = true;
      }
    }

    // Always update localStorage and IndexedDB so deleted files never resurrect
    this.saveFilesToLocal();

    // Ensure immediate, permanent purge from IndexedDB
    if (typeof window !== 'undefined' && indexedDbVault.isAvailable()) {
      try {
        const idbId = `work_${projectId}_${normPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
        await indexedDbVault.deleteFile(idbId);
        const rawIdbId = `work_${projectId}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
        if (rawIdbId !== idbId) {
          await indexedDbVault.deleteFile(rawIdbId);
        }
        const allStored = await indexedDbVault.listFiles();
        for (const sf of allStored) {
          if (
            sf.id === idbId ||
            sf.id === rawIdbId ||
            (sf.id.startsWith('work_') &&
              sf.metadata?.workProjectId === projectId &&
              (normalizeWorkPath(sf.metadata?.workPath) === normPath ||
                sf.metadata?.workPath === path))
          ) {
            await indexedDbVault.deleteFile(sf.id);
          }
        }
      } catch (e) {
        logger.warn('[WorkService] IndexedDB delete file notice:', e);
      }
    }

    await workEventBus.emit('system', projectId, 'FILE_DELETED', { path: normPath, rawPath: path });
    return existed;
  }

  private guessMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'text/typescript';
      case 'js':
      case 'jsx':
        return 'text/javascript';
      case 'json':
        return 'application/json';
      case 'css':
        return 'text/css';
      case 'html':
        return 'text/html';
      case 'md':
        return 'text/markdown';
      default:
        return 'text/plain';
    }
  }

  // ─── ARTIFACTS ─────────────────────────────────────────────────────────────

  async getArtifacts(projectId?: string, taskId?: string): Promise<WorkArtifact[]> {
    const all = Array.from(this.artifactsCache.values());
    if (taskId) return all.filter((a) => a.taskId === taskId);
    if (projectId) return all.filter((a) => a.projectId === projectId);
    return all;
  }

  async createArtifact(
    projectId: string,
    input: {
      taskId?: string;
      title: string;
      content: string;
      type?: WorkArtifactType | string;
      name?: string;
      url?: string;
      meta?: Record<string, any>;
    }
  ): Promise<WorkArtifact> {
    const artifact: WorkArtifact = {
      id: `art_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      projectId,
      taskId: input.taskId || 'general',
      type: (input.type as WorkArtifactType) || 'document',
      name: input.name || input.title,
      title: input.title,
      content: input.content,
      url: input.url,
      size: input.content ? input.content.length : 0,
      version: 1,
      meta: input.meta || {},
      createdAt: new Date().toISOString(),
    };

    this.artifactsCache.set(artifact.id, artifact);
    this.saveArtifactsToLocal();

    await workEventBus.emit('system', projectId, 'ARTIFACT_CREATED', {
      artifactId: artifact.id,
      title: artifact.title,
      type: artifact.type,
    });

    return artifact;
  }

  // ─── MESSAGES ──────────────────────────────────────────────────────────────

  getTaskMessages(taskId: string): WorkMessage[] {
    return this.messagesCache.get(taskId) || [];
  }

  // ─── GOOGLE DRIVE CLOUD SYNC & VAULT ─────────────────────────────────────────

  async syncProjectToDrive(projectId: string): Promise<{
    success: boolean;
    driveFileId?: string;
    fileName?: string;
    sizeBytes?: number;
    error?: string;
  }> {
    try {
      const project = this.projectsCache.get(projectId);
      if (!project) throw new Error(`Project not found: ${projectId}`);

      const files = await this.getFiles(projectId);
      const artifacts = await this.getArtifacts(projectId);

      await workEventBus.emit('system', projectId, 'DRIVE_SYNC_STARTED', {
        projectName: project.name,
        fileCount: files.length,
      });

      const bundle = {
        version: '1.0.0',
        projectId: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        timestamp: new Date().toISOString(),
        files: files.map((f) => ({
          path: f.path,
          name: f.name,
          content: f.content,
          mimeType: f.mimeType,
          size: f.size,
        })),
        artifacts: artifacts.map((a) => ({
          type: a.type,
          title: a.title,
          content: a.content,
          name: a.name,
        })),
      };

      const filename = `${project.slug || project.id}-folder-backup.json`;
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const file = new File([blob], filename, { type: 'application/json' });

      const uploaded = await storageService.uploadFile(file, {
        category: 'backups',
        allowOverwrite: true,
        sanitizedName: filename,
        originalName: `${project.name} (Folder Bundle)`,
        visibility: 'private',
        metadata: {
          projectId: project.id,
          projectName: project.name,
          folder: project.name,
          fileCount: files.length,
          source: 'workspace_project_backup',
        },
      });

      project.lastSyncedToDrive = new Date().toISOString();
      project.driveFileId = uploaded.id;
      this.projectsCache.set(projectId, project);
      this.saveProjectsToLocal();

      try {
        notifyStorageUpdated();
      } catch {}

      await workEventBus.emit('system', projectId, 'DRIVE_SYNC_COMPLETED', {
        driveFileId: uploaded.id,
        sizeBytes: uploaded.sizeBytes,
        fileName: uploaded.sanitizedName,
      });

      return {
        success: true,
        driveFileId: uploaded.id,
        fileName: uploaded.sanitizedName,
        sizeBytes: uploaded.sizeBytes,
      };
    } catch (err: any) {
      logger.error('[WorkService] Drive sync failed:', err);
      await workEventBus.emit('system', projectId, 'DRIVE_SYNC_FAILED', {
        error: err?.message || String(err),
      });
      return { success: false, error: err?.message || String(err) };
    }
  }

  async importFromDrive(driveFileId: string, projectId: string): Promise<{
    success: boolean;
    filesImported: number;
    error?: string;
  }> {
    try {
      const content = await storageService.getFileText(driveFileId);
      const filesRes = await storageService.listFiles();
      const meta = filesRes.files.find((f) => f.id === driveFileId);
      const originalName = meta?.originalName || `imported-${driveFileId}.txt`;
      let filesImported = 0;

      try {
        const parsed = JSON.parse(content);
        if (parsed.files && Array.isArray(parsed.files)) {
          for (const f of parsed.files) {
            await this.writeFile(projectId, {
              path: f.path,
              content: f.content,
            });
            filesImported++;
          }
          return { success: true, filesImported };
        }
      } catch {
        // Not a JSON backup bundle, treat as standalone file
      }

      // Standalone file import
      const destPath = originalName.startsWith('src/')
        ? originalName
        : `src/${originalName}`;
      await this.writeFile(projectId, {
        path: destPath,
        content: content,
      });
      filesImported = 1;

      return { success: true, filesImported };
    } catch (err: any) {
      logger.error('[WorkService] Drive import failed:', err);
      return { success: false, filesImported: 0, error: err?.message || String(err) };
    }
  }

  async saveArtifactToDrive(artifactId: string): Promise<{
    success: boolean;
    driveFileId?: string;
    error?: string;
  }> {
    try {
      const art = this.artifactsCache.get(artifactId);
      if (!art) throw new Error(`Artifact not found: ${artifactId}`);

      const filename = `${art.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
      const blob = new Blob([art.content], { type: 'text/markdown;charset=utf-8' });
      const file = new File([blob], filename, { type: 'text/markdown' });

      const uploaded = await storageService.uploadFile(file, {
        category: 'ai-knowledge',
        sanitizedName: filename,
        originalName: filename,
        visibility: 'private',
        metadata: {
          artifactId: art.id,
          projectId: art.projectId,
          title: art.title,
          type: art.type,
        },
      });

      return { success: true, driveFileId: uploaded.id };
    } catch (err: any) {
      logger.error('[WorkService] Save artifact to Drive failed:', err);
      return { success: false, error: err?.message || String(err) };
    }
  }

  async getDriveFiles(category?: string) {
    return storageService.listFiles(category ? { category: category as any } : undefined);
  }
}

export const workService = new WorkService();
