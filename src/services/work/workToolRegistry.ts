/**
 * src/services/work/workToolRegistry.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sandboxed Agent Tool Registry for PromptHub Work.
 * Exposes safe, audited tool interfaces to autonomous agents.
 * Validates permissions, prevents path traversal, and emits tool events.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { workEventBus } from './workEventBus';
import { workSandboxService } from './workSandboxService';
import { storageService } from '../storageService';
import { workImageCapService } from './workImageCapService';
import { workService } from './workService';
import type { WorkFile, WorkPermissionProfile, WorkApprovalAction, WorkArtifactType } from '../../types/work';

export interface ToolExecutionContext {
  taskId: string;
  projectId: string;
  worktreeId: string;
  agentId: string;
  permissions: WorkPermissionProfile;
  filesStore: Map<string, WorkFile>;
  onFileWrite?: (file: WorkFile) => void;
  onFileDelete?: (path: string) => void;
  onArtifactCreate?: (type: WorkArtifactType, title: string, content: string) => void;
  onRequestApproval?: (action: WorkApprovalAction, title: string, desc: string, details: any) => Promise<boolean>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parametersSchema: Record<string, any>;
  minimumPermission: WorkPermissionProfile;
  execute: (args: Record<string, any>, ctx: ToolExecutionContext) => Promise<any>;
}

const PERMISSION_HIERARCHY: Record<WorkPermissionProfile, number> = {
  read_only: 1,
  read_write: 2,
  developer: 3,
  deployment: 4,
  admin: 5,
};

function hasSufficientPermission(agentPerm: WorkPermissionProfile, requiredPerm: WorkPermissionProfile): boolean {
  return (PERMISSION_HIERARCHY[agentPerm] || 0) >= (PERMISSION_HIERARCHY[requiredPerm] || 0);
}

function sanitizeFilePath(rawPath: string): string {
  // Normalize and block directory traversal
  let clean = rawPath.replace(/\\/g, '/').replace(/\/+/g, '/').trim();
  if (clean.startsWith('/')) clean = clean.slice(1);
  if (clean.startsWith('./')) clean = clean.slice(2);
  if (clean.includes('../') || clean.includes('..\\') || clean === '..') {
    throw new Error(`Security Violation: Path traversal forbidden ("${rawPath}").`);
  }
  return clean;
}

class WorkToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerBuiltinTools();
  }

  private registerBuiltinTools() {
    // 1. read_file
    this.register({
      name: 'read_file',
      description: 'Read the contents of a file within the current virtual workspace.',
      parametersSchema: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Relative path to file' } },
        required: ['path'],
      },
      minimumPermission: 'read_only',
      execute: async (args, ctx) => {
        const path = sanitizeFilePath(args.path);
        const file = ctx.filesStore.get(path);
        if (!file) {
          throw new Error(`File not found: "${path}"`);
        }
        return { path: file.path, content: file.content, size: file.size };
      },
    });

    // 2. write_file
    this.register({
      name: 'write_file',
      description: 'Write or overwrite a file within the workspace.',
      parametersSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to file' },
          content: { type: 'string', description: 'Complete file content to write' },
        },
        required: ['path', 'content'],
      },
      minimumPermission: 'read_write',
      execute: async (args, ctx) => {
        const path = sanitizeFilePath(args.path);
        const content = String(args.content || '');
        const name = path.split('/').pop() || path;

        const existing = ctx.filesStore.get(path);
        const file: WorkFile = {
          id: existing?.id || `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          projectId: ctx.projectId,
          worktreeId: ctx.worktreeId,
          path,
          name,
          content,
          size: content.length,
          isDirectory: false,
          mimeType: path.endsWith('.json') ? 'application/json' : path.endsWith('.md') ? 'text/markdown' : 'text/plain',
          isModified: true,
          isNew: !existing,
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        ctx.filesStore.set(path, file);
        ctx.onFileWrite?.(file);

        await workEventBus.emit(
          ctx.taskId,
          ctx.projectId,
          existing ? 'FILE_UPDATED' : 'FILE_CREATED',
          { path, size: content.length, isNew: !existing },
          ctx.agentId
        );

        return { path, status: existing ? 'updated' : 'created', size: content.length };
      },
    });

    // 3. edit_file
    this.register({
      name: 'edit_file',
      description: 'Replace an exact block of text within an existing workspace file.',
      parametersSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to file' },
          targetContent: { type: 'string', description: 'The exact string block to replace' },
          replacementContent: { type: 'string', description: 'The replacement string' },
        },
        required: ['path', 'targetContent', 'replacementContent'],
      },
      minimumPermission: 'read_write',
      execute: async (args, ctx) => {
        const path = sanitizeFilePath(args.path);
        const file = ctx.filesStore.get(path);
        if (!file) {
          throw new Error(`Cannot edit file: "${path}" does not exist.`);
        }

        const target = String(args.targetContent);
        const replacement = String(args.replacementContent);

        if (!file.content.includes(target)) {
          throw new Error(`Target content block not found in "${path}". Please ensure exact whitespace matching.`);
        }

        const updatedContent = file.content.replace(target, replacement);
        file.content = updatedContent;
        file.size = updatedContent.length;
        file.isModified = true;
        file.updatedAt = new Date().toISOString();

        ctx.filesStore.set(path, file);
        ctx.onFileWrite?.(file);

        await workEventBus.emit(
          ctx.taskId,
          ctx.projectId,
          'FILE_UPDATED',
          { path, size: file.size, editType: 'block_replacement' },
          ctx.agentId
        );

        return { path, status: 'updated', size: file.size };
      },
    });

    // 4. delete_file
    this.register({
      name: 'delete_file',
      description: 'Delete a file from the workspace.',
      parametersSchema: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Relative path to file' } },
        required: ['path'],
      },
      minimumPermission: 'read_write',
      execute: async (args, ctx) => {
        const path = sanitizeFilePath(args.path);
        if (!ctx.filesStore.has(path)) {
          throw new Error(`Cannot delete: "${path}" does not exist.`);
        }

        ctx.filesStore.delete(path);
        ctx.onFileDelete?.(path);

        await workEventBus.emit(
          ctx.taskId,
          ctx.projectId,
          'FILE_DELETED',
          { path },
          ctx.agentId
        );

        return { path, status: 'deleted' };
      },
    });

    // 5. list_files
    this.register({
      name: 'list_files',
      description: 'List all files and directories in the workspace.',
      parametersSchema: {
        type: 'object',
        properties: { directory: { type: 'string', description: 'Optional directory path' } },
      },
      minimumPermission: 'read_only',
      execute: async (_args, ctx) => {
        const files = Array.from(ctx.filesStore.values()).map((f) => ({
          path: f.path,
          name: f.name,
          size: f.size,
          isDirectory: f.isDirectory,
          updatedAt: f.updatedAt,
        }));
        return { files, total: files.length };
      },
    });

    // 6. run_terminal_command
    this.register({
      name: 'run_terminal_command',
      description: 'Run a shell command inside the isolated virtual sandbox environment.',
      parametersSchema: {
        type: 'object',
        properties: { command: { type: 'string', description: 'Shell command string' } },
        required: ['command'],
      },
      minimumPermission: 'developer',
      execute: async (args, ctx) => {
        const cmd = String(args.command || '');
        const res = await workSandboxService.executeCommand(cmd, {
          taskId: ctx.taskId,
          projectId: ctx.projectId,
          agentId: ctx.agentId,
        });
        return {
          command: cmd,
          exitCode: res.exitCode,
          stdout: res.stdout,
          stderr: res.stderr,
          durationMs: res.durationMs,
        };
      },
    });

    // 7. run_tests
    this.register({
      name: 'run_tests',
      description: 'Execute workspace test suites and report pass/fail metrics.',
      parametersSchema: {
        type: 'object',
        properties: { suite: { type: 'string', description: 'Optional suite path or filter' } },
      },
      minimumPermission: 'developer',
      execute: async (args, ctx) => {
        await workEventBus.emit(ctx.taskId, ctx.projectId, 'TEST_STARTED', { suite: args.suite || 'all' }, ctx.agentId);
        const res = await workSandboxService.executeCommand('npm test', {
          taskId: ctx.taskId,
          projectId: ctx.projectId,
          agentId: ctx.agentId,
        });
        await workEventBus.emit(ctx.taskId, ctx.projectId, 'TEST_FINISHED', { exitCode: res.exitCode, passed: res.exitCode === 0 }, ctx.agentId);
        return {
          status: res.exitCode === 0 ? 'passed' : 'failed',
          exitCode: res.exitCode,
          output: res.stdout,
        };
      },
    });

    // 8. create_artifact
    this.register({
      name: 'create_artifact',
      description: 'Produce an output deliverable artifact (Markdown report, code patch, test summary, diagram).',
      parametersSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['markdown', 'code', 'patch', 'test_report', 'diff', 'json', 'document'] },
          title: { type: 'string', description: 'Descriptive title' },
          content: { type: 'string', description: 'Artifact content' },
        },
        required: ['type', 'title', 'content'],
      },
      minimumPermission: 'read_write',
      execute: async (args, ctx) => {
        const type = args.type as WorkArtifactType;
        const title = String(args.title);
        const content = String(args.content);

        ctx.onArtifactCreate?.(type, title, content);

        await workEventBus.emit(
          ctx.taskId,
          ctx.projectId,
          'ARTIFACT_CREATED',
          { type, title, size: content.length },
          ctx.agentId
        );

        return { status: 'created', type, title, size: content.length };
      },
    });

    // 9. request_human_approval
    this.register({
      name: 'request_human_approval',
      description: 'Request user confirmation before proceeding with sensitive or destructive actions.',
      parametersSchema: {
        type: 'object',
        properties: {
          actionType: { type: 'string', enum: ['file_deletion', 'config_change', 'payment_logic', 'db_migration', 'production_deploy', 'privileged_command'] },
          title: { type: 'string', description: 'Short summary of what requires approval' },
          description: { type: 'string', description: 'Detailed justification and risk explanation' },
        },
        required: ['actionType', 'title', 'description'],
      },
      minimumPermission: 'read_write',
      execute: async (args, ctx) => {
        const actionType = args.actionType as WorkApprovalAction;
        const title = String(args.title);
        const desc = String(args.description);

        await workEventBus.emit(
          ctx.taskId,
          ctx.projectId,
          'APPROVAL_REQUIRED',
          { actionType, title, description: desc },
          ctx.agentId
        );

        let granted = false;
        if (ctx.onRequestApproval) {
          granted = await ctx.onRequestApproval(actionType, title, desc, args);
        }

        await workEventBus.emit(
          ctx.taskId,
          ctx.projectId,
          granted ? 'APPROVAL_GRANTED' : 'APPROVAL_DENIED',
          { actionType, title },
          ctx.agentId
        );

        return { approved: granted, actionType };
      },
    });

    // 10. optimize_task_prompt (PromptHub Superpower)
    this.register({
      name: 'optimize_task_prompt',
      description: 'Enhance a task instruction into a production-grade specification using PromptHub prompt engineering.',
      parametersSchema: {
        type: 'object',
        properties: { rawTask: { type: 'string', description: 'Unrefined user task or prompt' } },
        required: ['rawTask'],
      },
      minimumPermission: 'read_only',
      execute: async (args) => {
        const raw = String(args.rawTask || '');
        const optimized = `[Optimized Specification by PromptHub]\nGoal: ${raw}\nArchitecture: Production-grade\nConstraints: Zero regressions, type safety, test verification\nDeliverables: Working implementation, tests, and diff report.`;
        return { optimizedPrompt: optimized, original: raw };
      },
    });

    // 11. sync_to_drive (Google Drive Cloud & Vault Sync)
    this.register({
      name: 'sync_to_drive',
      description: 'Backup and sync all project workspace files to Google Drive storage vault.',
      parametersSchema: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Reason or milestone message for backup' },
        },
      },
      minimumPermission: 'developer',
      execute: async (args, ctx) => {
        await workEventBus.emit(ctx.taskId, ctx.projectId, 'DRIVE_SYNC_STARTED', { reason: args.reason }, ctx.agentId);
        try {
          const files = Array.from(ctx.filesStore.values()).map((f) => ({
            path: f.path,
            content: f.content,
            mimeType: f.mimeType,
            size: f.size,
          }));

          const bundle = {
            projectId: ctx.projectId,
            timestamp: new Date().toISOString(),
            filesCount: files.length,
            reason: args.reason || 'Agent milestone backup',
            files,
          };

          const art = await workService.createArtifact(ctx.projectId, {
            title: `Backup: ${args.reason || 'Milestone Backup'}`,
            content: JSON.stringify(bundle, null, 2),
            type: 'report',
          });

          return {
            status: 'saved_locally',
            artifactId: art.id,
            filesCount: files.length,
            note: 'Project milestone saved in local workspace. Upload to Google Drive Vault requires explicit user approval.',
          };
        } catch (err: any) {
          await workEventBus.emit(
            ctx.taskId,
            ctx.projectId,
            'DRIVE_SYNC_FAILED',
            { error: err?.message || String(err) },
            ctx.agentId
          );
          throw err;
        }
      },
    });

    // 12. read_from_drive (Google Drive File Import & Inspection)
    this.register({
      name: 'read_from_drive',
      description: 'Fetch and read file content or dataset from user Google Drive storage vault.',
      parametersSchema: {
        type: 'object',
        properties: {
          fileId: { type: 'string', description: 'Google Drive file ID to read' },
        },
        required: ['fileId'],
      },
      minimumPermission: 'read_only',
      execute: async (args) => {
        const fileId = String(args.fileId);
        const content = await storageService.getFileText(fileId);
        const filesRes = await storageService.listFiles();
        const meta = filesRes.files.find((f) => f.id === fileId);
        return {
          fileId,
          content,
          mimeType: meta?.mimeType || 'text/plain',
          originalName: meta?.originalName || `file-${fileId}`,
        };
      },
    });

    // 13. save_artifact_to_drive (Google Drive Knowledge & Deliverable Vault)
    this.register({
      name: 'save_artifact_to_drive',
      description: 'Save a generated deliverable or document directly to Google Drive as an AI Knowledge asset.',
      parametersSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Document title' },
          content: { type: 'string', description: 'Document markdown or code content' },
          category: { type: 'string', enum: ['ai-knowledge', 'prompt-assets', 'generated'], description: 'Vault category' },
        },
        required: ['title', 'content'],
      },
      minimumPermission: 'read_write',
      execute: async (args, ctx) => {
        const { title, content, category } = args;
        const art = await workService.createArtifact(ctx.projectId, {
          title,
          content,
          type: 'document',
        });

        return {
          status: 'saved_locally',
          artifactId: art.id,
          title,
          category,
          note: 'Document saved in local workspace. Upload to Google Drive Vault requires explicit user approval.',
        };
      },
    });

    // 14. list_drive_files (Browse Drive Vault Assets)
    this.register({
      name: 'list_drive_files',
      description: 'List available files and documents stored in user Google Drive vault.',
      parametersSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Optional category filter' },
        },
      },
      minimumPermission: 'read_only',
      execute: async (args) => {
        const res = await storageService.listFiles(args.category ? { category: args.category as any } : undefined);
        return {
          files: res.files.map((f: any) => ({
            id: f.id,
            name: f.originalName,
            sizeBytes: f.sizeBytes,
            category: f.category,
            mimeType: f.mimeType,
            updatedAt: f.updatedAt,
          })),
          count: res.files.length,
        };
      },
    });

    // 15. generate_image (Pollinations AI Free Image Engine)
    this.register({
      name: 'generate_image',
      description: 'Generate high-resolution photos, visual mockups, or UI illustration assets from a text prompt.',
      parametersSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Detailed visual prompt describing the photo or image' },
          aspectRatio: { type: 'string', enum: ['1:1', '16:9', '4:3', '9:16'], description: 'Desired aspect ratio' },
          filename: { type: 'string', description: 'Optional filename e.g. hero-banner.png' },
        },
        required: ['prompt'],
      },
      minimumPermission: 'read_write',
      execute: async (args, ctx) => {
        // Enforce strict 8-image per account generation cap
        const quotaCheck = workImageCapService.canGenerateImages(1);
        if (!quotaCheck.allowed) {
          throw new Error(quotaCheck.error || 'Account generation cap reached (8/8 images used). Maximum limit of 8 generated images per account reached.');
        }

        const promptText = String(args.prompt || 'Modern AI digital graphic');
        const seed = Math.floor(Math.random() * 900000) + 100000;
        let width = 1024;
        let height = 1024;
        if (args.aspectRatio === '16:9') {
          width = 1280;
          height = 720;
        } else if (args.aspectRatio === '4:3') {
          width = 1024;
          height = 768;
        } else if (args.aspectRatio === '9:16') {
          width = 720;
          height = 1280;
        }

        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
        const filename = args.filename || `generated-${promptText.slice(0, 20).toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
        const assetPath = `src/assets/${filename}`;

        // Save reference file in virtual workspace
        const existing = ctx.filesStore.get(assetPath);
        const file: WorkFile = {
          id: existing?.id || `f_img_${Date.now()}`,
          projectId: ctx.projectId,
          worktreeId: ctx.worktreeId,
          path: assetPath,
          name: filename,
          content: imageUrl,
          size: 1024,
          isDirectory: false,
          mimeType: 'image/png',
          isModified: true,
          isNew: !existing,
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        ctx.filesStore.set(assetPath, file);
        ctx.onFileWrite?.(file);

        // Also create deliverable artifact
        ctx.onArtifactCreate?.(
          'image',
          `Photo: ${promptText.slice(0, 36)}`,
          `![${promptText}](${imageUrl})\n\n**Visual Prompt:** ${promptText}\n**Resolution:** ${width}x${height}px\n**Asset Path:** \`${assetPath}\``
        );

        // Record persistent image cap decrement
        workImageCapService.recordImagesGenerated([
          { prompt: promptText, imageUrl }
        ]);

        await workEventBus.emit(
          ctx.taskId,
          ctx.projectId,
          'ARTIFACT_CREATED',
          { type: 'image', title: `Photo: ${promptText.slice(0, 36)}`, imageUrl, path: assetPath },
          ctx.agentId
        );

        return {
          status: 'generated',
          imageUrl,
          prompt: promptText,
          path: assetPath,
          resolution: `${width}x${height}`,
          markdown: `![${promptText}](${imageUrl})`,
        };
      },
    });

    // 16. get_project_context
    this.register({
      name: 'get_project_context',
      description: 'Inspect the active workspace project, existing files, and selected deliverable artifact.',
      parametersSchema: {
        type: 'object',
        properties: {},
      },
      minimumPermission: 'read_only',
      execute: async (_args, _ctx) => {
        const { workspaceActionBridge } = await import('./workspaceActionBridge');
        return await workspaceActionBridge.getProjectContext();
      },
    });

    // 17. start_creation
    this.register({
      name: 'start_creation',
      description: 'Start a new creation task or build a website/application/deliverable in the workspace.',
      parametersSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'The comprehensive creation brief or user goal' },
          style: { type: 'string', description: 'Visual design aesthetic e.g. minimal, colourful, executive' },
          requestId: { type: 'string', description: 'Optional unique request ID to prevent duplicate builds' },
        },
        required: ['prompt'],
      },
      minimumPermission: 'read_write',
      execute: async (args, _ctx) => {
        const { workspaceActionBridge } = await import('./workspaceActionBridge');
        return await workspaceActionBridge.startCreation(
          String(args.prompt || ''),
          args.style ? String(args.style) : undefined,
          args.requestId ? String(args.requestId) : undefined
        );
      },
    });

    // 18. refine_artifact
    this.register({
      name: 'refine_artifact',
      description: 'Modify or enhance the active workspace code, deliverable, or layout (e.g. add a feature, fix layout, adjust style).',
      parametersSchema: {
        type: 'object',
        properties: {
          instruction: { type: 'string', description: 'Specific refinement instruction' },
          targetFile: { type: 'string', description: 'Optional path of file to modify' },
        },
        required: ['instruction'],
      },
      minimumPermission: 'read_write',
      execute: async (args, _ctx) => {
        const { workspaceActionBridge } = await import('./workspaceActionBridge');
        return await workspaceActionBridge.refineArtifact(
          String(args.instruction || ''),
          args.targetFile ? String(args.targetFile) : undefined
        );
      },
    });

    // 19. get_job_status
    this.register({
      name: 'get_job_status',
      description: 'Query the current progress and build status of a running workspace job.',
      parametersSchema: {
        type: 'object',
        properties: {
          jobId: { type: 'string', description: 'The tracking ID returned by start_creation or refine_artifact' },
        },
        required: ['jobId'],
      },
      minimumPermission: 'read_only',
      execute: async (args, _ctx) => {
        const { workspaceActionBridge } = await import('./workspaceActionBridge');
        return await workspaceActionBridge.getJobStatus(String(args.jobId || ''));
      },
    });

    // 20. select_design_concept
    this.register({
      name: 'select_design_concept',
      description: 'Select a visual design concept or direction for the active project.',
      parametersSchema: {
        type: 'object',
        properties: {
          concept: { type: 'string', description: 'Name of the concept, e.g. minimal, colourful, dark mode' },
          conceptIndex: { type: 'number', description: 'Optional numeric index of concept' },
        },
        required: ['concept'],
      },
      minimumPermission: 'read_write',
      execute: async (args, _ctx) => {
        const { workspaceActionBridge } = await import('./workspaceActionBridge');
        return await workspaceActionBridge.selectDesignConcept(
          String(args.concept || ''),
          typeof args.conceptIndex === 'number' ? args.conceptIndex : undefined
        );
      },
    });

    // 21. submit_master_prompt
    this.register({
      name: 'submit_master_prompt',
      description: 'Submit the fully compiled, self-contained master prompt (Sections A-L) to PromptHub workspace execution engine.',
      parametersSchema: {
        type: 'object',
        properties: {
          masterPrompt: { type: 'string', description: 'The 12-section master prompt specification' },
          deliverableType: { type: 'string', description: 'Target deliverable contract' },
          modelId: { type: 'string', description: 'Optional target model ID' },
          requestId: { type: 'string', description: 'Optional unique request ID' },
        },
        required: ['masterPrompt'],
      },
      minimumPermission: 'read_write',
      execute: async (args, _ctx) => {
        const { workspaceActionBridge } = await import('./workspaceActionBridge');
        return await workspaceActionBridge.submitMasterPrompt(
          String(args.masterPrompt || ''),
          args.deliverableType ? String(args.deliverableType) : undefined,
          args.modelId ? String(args.modelId) : undefined,
          args.requestId ? String(args.requestId) : undefined
        );
      },
    });

    // 22. select_model
    this.register({
      name: 'select_model',
      description: 'Select or request an available model from PromptHub verified catalogue, including free models.',
      parametersSchema: {
        type: 'object',
        properties: {
          modelQuery: { type: 'string', description: 'Model identifier or "free" query' },
        },
        required: ['modelQuery'],
      },
      minimumPermission: 'read_write',
      execute: async (args, _ctx) => {
        const { workspaceActionBridge } = await import('./workspaceActionBridge');
        return await workspaceActionBridge.selectModel(String(args.modelQuery || ''));
      },
    });
  }

  register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Executes a tool with strict permission enforcement and event emission.
   */
  async executeTool(
    toolName: string,
    args: Record<string, any>,
    ctx: ToolExecutionContext
  ): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: "${toolName}"`);
    }

    if (!hasSufficientPermission(ctx.permissions, tool.minimumPermission)) {
      throw new Error(
        `Permission Denied: Agent with "${ctx.permissions}" profile cannot execute "${toolName}" (requires "${tool.minimumPermission}").`
      );
    }

    await workEventBus.emit(
      ctx.taskId,
      ctx.projectId,
      'TOOL_STARTED',
      { toolName, args: Object.keys(args) },
      ctx.agentId
    );

    try {
      const result = await tool.execute(args, ctx);

      await workEventBus.emit(
        ctx.taskId,
        ctx.projectId,
        'TOOL_FINISHED',
        { toolName, success: true },
        ctx.agentId
      );

      return result;
    } catch (err: any) {
      await workEventBus.emit(
        ctx.taskId,
        ctx.projectId,
        'TOOL_FINISHED',
        { toolName, success: false, error: err?.message },
        ctx.agentId
      );
      throw err;
    }
  }
}

export const workToolRegistry = new WorkToolRegistry();
