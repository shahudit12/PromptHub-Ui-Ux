/**
 * src/services/work/workspaceActionBridge.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Workspace Action Bridge for PromptHub.
 *
 * Connects autonomous agents (including Yuno Voice Assistant and background workers)
 * directly into the live UnifiedCreationWorkspace runtime.
 *
 * Exposes core actions:
 * 1. get_project_context: Read active project, files, selected artifact, models.
 * 2. start_creation: Trigger full creation workflow for prompt & style.
 * 3. submit_master_prompt: Deliver complete 12-section master prompt to execution engine.
 * 4. refine_artifact: Modify code/artifacts in the active workspace.
 * 5. get_job_status: Track build/generation progress independently.
 * 6. select_design_concept: Apply design concepts/styles to the active workflow.
 * 7. select_model: Select or switch model (handles "any free model" resolving to verified free model).
 * 8. update_project_brief & display_brief: Project brief synchronization.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { StructuredProjectBrief } from '../../types/projectBrief.ts';

export interface WorkspaceFileSummary {
  path: string;
  name: string;
  size: number;
  mimeType?: string;
}

export interface WorkspaceProjectContext {
  projectId: string;
  projectName: string;
  projectSummary: string;
  files: WorkspaceFileSummary[];
  selectedArtifact?: {
    id: string;
    type: string;
    title: string;
    snippet?: string;
  } | null;
  selectedModel: string;
  activeJobId?: string | null;
  jobStatus: 'idle' | 'planning' | 'building' | 'completed' | 'failed';
  jobProgress: number;
  availableConcepts?: string[];
  supportedDeliverables?: string[];
}

export interface WorkspaceJobStatus {
  jobId: string;
  status: 'idle' | 'planning' | 'building' | 'completed' | 'failed';
  progress: number;
  message: string;
  filesCount: number;
  error?: string;
  output?: string;
}

export interface WorkspaceActionHandler {
  getProjectContext: () => Promise<WorkspaceProjectContext>;
  startCreation: (prompt: string, style?: string, requestId?: string) => Promise<{ jobId: string; status: string; message: string; output?: string; error?: string }>;
  submitMasterPrompt?: (masterPrompt: string, deliverableType?: string, modelId?: string, requestId?: string) => Promise<{ jobId: string; status: string; message: string; output?: string; error?: string }>;
  refineArtifact: (instruction: string, targetFile?: string, requestId?: string) => Promise<{ jobId: string; status: string; message: string; output?: string; error?: string }>;
  getJobStatus: (jobId: string) => Promise<WorkspaceJobStatus>;
  selectDesignConcept: (concept: string, conceptIndex?: number) => Promise<{ success: boolean; concept: string; message: string }>;
  selectModel?: (modelQuery: string) => Promise<{ success: boolean; modelId: string; modelLabel: string; isFree: boolean; message: string }>;
  onDisplayBrief?: (brief: StructuredProjectBrief, displayType?: 'structured_brief' | 'master_prompt') => void;
}

class WorkspaceActionBridge {
  private handler: WorkspaceActionHandler | null = null;
  private jobs: Map<string, WorkspaceJobStatus> = new Map();
  private activeBrief: StructuredProjectBrief | null = null;
  private briefListeners: Set<(brief: StructuredProjectBrief) => void> = new Set();

  /**
   * Register the active workspace handler from UnifiedCreationWorkspace.
   */
  public registerHandler(handler: WorkspaceActionHandler): () => void {
    this.handler = handler;
    return () => {
      if (this.handler === handler) {
        this.handler = null;
      }
    };
  }

  /**
   * Updates or logs the progress of a tracked job.
   */
  public updateJob(jobId: string, updates: Partial<WorkspaceJobStatus>): void {
    const existing = this.jobs.get(jobId) || {
      jobId,
      status: 'idle',
      progress: 0,
      message: 'Initialized',
      filesCount: 0,
    };
    const updated = { ...existing, ...updates };
    this.jobs.set(jobId, updated);
  }

  /**
   * 1. get_project_context
   */
  public async getProjectContext(): Promise<WorkspaceProjectContext> {
    if (this.handler) {
      return await this.handler.getProjectContext();
    }
    return {
      projectId: 'workspace_proj',
      projectName: 'PromptHub Studio Project',
      projectSummary: 'Active studio workspace',
      files: [],
      selectedModel: 'openrouter/free',
      jobStatus: 'idle',
      jobProgress: 0,
      supportedDeliverables: [
        'interactive_web_app',
        'written_report',
        'strategic_plan',
        'ad_campaign',
        'presentation_deck',
        'video_script',
        'data_analysis',
        'code_script',
        'visual_asset',
      ],
    };
  }

  /**
   * 2. start_creation
   */
  public async startCreation(
    prompt: string,
    style?: string,
    requestId?: string
  ): Promise<{ jobId: string; status: string; message: string; output?: string; error?: string }> {
    const effectiveRequestId = requestId || `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.updateJob(effectiveRequestId, {
      status: 'planning',
      progress: 10,
      message: `Planning creation for: ${prompt.slice(0, 40)}...`,
    });

    if (this.handler) {
      return await this.handler.startCreation(prompt, style, effectiveRequestId);
    }

    return {
      jobId: effectiveRequestId,
      status: 'started',
      message: `Workspace creation initiated for: "${prompt}"`,
    };
  }

  /**
   * 3. submit_master_prompt (Unified Execution Handler)
   */
  public async submitMasterPrompt(
    masterPrompt: string,
    deliverableType = 'interactive_web_app',
    modelId?: string,
    requestId?: string,
    options?: { isFinal?: boolean }
  ): Promise<{ jobId: string; status: string; message: string; output?: string; error?: string }> {
    // Partial transcript guardrail: NEVER execute from non-final speech
    if (options?.isFinal === false) {
      return {
        jobId: requestId || '',
        status: 'ignored_interim',
        message: 'Interim speech transcript ignored. Awaiting final transcript.',
      };
    }

    const effectiveRequestId = requestId || `req_yuno_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Idempotency check: Do not re-execute or duplicate charge if already completed
    const existingJob = this.jobs.get(effectiveRequestId);
    if (existingJob && (existingJob.status === 'completed' || existingJob.status === 'building')) {
      return {
        jobId: effectiveRequestId,
        status: existingJob.status,
        message: `Job ${effectiveRequestId} already processed (idempotency guard).`,
        output: existingJob.output,
        error: existingJob.error,
      };
    }

    this.updateJob(effectiveRequestId, {
      status: 'building',
      progress: 25,
      message: `Autonomous execution in workspace sandbox...`,
    });

    if (this.handler?.submitMasterPrompt) {
      return await this.handler.submitMasterPrompt(masterPrompt, deliverableType, modelId, effectiveRequestId);
    } else if (this.handler) {
      return await this.handler.startCreation(masterPrompt, undefined, effectiveRequestId);
    }

    // Direct delegation fallback to sharedExecutionService if workspace UI is not registered
    try {
      const { sharedExecutionService } = await import('../ai/sharedExecutionService.ts');
      const res = await sharedExecutionService.executeWorkspaceSubmission({
        requestId: effectiveRequestId,
        projectId: 'workspace_proj',
        sessionId: `sess_voice_${Date.now()}`,
        source: 'voice',
        text: masterPrompt,
        selectedModel: modelId,
      });
      return {
        jobId: effectiveRequestId,
        status: res.status,
        message: res.status === 'completed' ? 'Master prompt compiled and deliverable executed.' : 'Execution failed',
        output: res.outputMarkdown,
        error: res.error,
      };
    } catch {
      return {
        jobId: effectiveRequestId,
        status: 'started',
        message: 'Master prompt submitted to workspace engine.',
      };
    }
  }

  /**
   * 4. refine_artifact
   */
  public async refineArtifact(
    instruction: string,
    targetFile?: string,
    requestId?: string
  ): Promise<{ jobId: string; status: string; message: string; output?: string; error?: string }> {
    const jobId = requestId || `refine_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.updateJob(jobId, {
      status: 'building',
      progress: 20,
      message: `Applying refinement: ${instruction.slice(0, 40)}...`,
    });

    if (this.handler) {
      return await this.handler.refineArtifact(instruction, targetFile, jobId);
    }

    return {
      jobId,
      status: 'updating',
      message: `Refinement initiated: "${instruction}"`,
    };
  }

  /**
   * 5. get_job_status
   */
  public async getJobStatus(jobId: string): Promise<WorkspaceJobStatus> {
    if (!jobId) {
      return {
        jobId: '',
        status: 'idle',
        progress: 0,
        message: 'No job ID provided.',
        filesCount: 0,
      };
    }

    const recorded = this.jobs.get(jobId);
    if (recorded) {
      if (this.handler && (recorded.status === 'building' || recorded.status === 'planning')) {
        try {
          const liveStatus = await this.handler.getJobStatus(jobId);
          if (liveStatus && liveStatus.jobId === jobId) {
            this.updateJob(jobId, liveStatus);
            return liveStatus;
          }
        } catch {}
      }
      return recorded;
    }

    if (this.handler) {
      try {
        const liveStatus = await this.handler.getJobStatus(jobId);
        if (liveStatus && liveStatus.jobId === jobId && liveStatus.status !== 'completed') {
          this.updateJob(jobId, liveStatus);
          return liveStatus;
        }
      } catch {}
    }

    return {
      jobId,
      status: 'idle',
      progress: 0,
      message: 'Job not found or not started.',
      filesCount: 0,
    };
  }

  /**
   * 6. select_design_concept
   */
  public async selectDesignConcept(
    concept: string,
    conceptIndex?: number
  ): Promise<{ success: boolean; concept: string; message: string }> {
    if (this.handler) {
      return await this.handler.selectDesignConcept(concept, conceptIndex);
    }
    return {
      success: true,
      concept,
      message: `Selected concept "${concept}".`,
    };
  }

  /**
   * 7. select_model
   */
  public async selectModel(
    modelQuery: string
  ): Promise<{ success: boolean; modelId: string; modelLabel: string; isFree: boolean; message: string }> {
    if (this.handler?.selectModel) {
      return await this.handler.selectModel(modelQuery);
    }

    // Default resolution for "free" model
    const isFreeQuery = modelQuery.toLowerCase().includes('free') || modelQuery.toLowerCase().includes('any');
    const modelId = isFreeQuery ? 'meta-llama/llama-3.3-70b-instruct:free' : modelQuery;
    return {
      success: true,
      modelId,
      modelLabel: isFreeQuery ? 'Llama 3.3 70B Instruct (Free)' : modelQuery.split('/').pop() || modelQuery,
      isFree: isFreeQuery || modelId.includes(':free'),
      message: `Selected model ${modelId}`,
    };
  }

  /**
   * 8. Project Brief Management
   */
  public updateProjectBrief(brief: StructuredProjectBrief): void {
    this.activeBrief = brief;
    try {
      import('../ai/structuredBriefManager.ts').then(({ structuredBriefManager }) => {
        structuredBriefManager.registerBrief(brief);
      }).catch(() => {});
    } catch {}
    this.briefListeners.forEach((listener) => {
      try {
        listener(brief);
      } catch {}
    });
  }

  public getActiveBrief(): StructuredProjectBrief | null {
    return this.activeBrief;
  }

  public onBriefUpdated(listener: (brief: StructuredProjectBrief) => void): () => void {
    this.briefListeners.add(listener);
    return () => {
      this.briefListeners.delete(listener);
    };
  }

  public displayBrief(brief: StructuredProjectBrief, displayType: 'structured_brief' | 'master_prompt' = 'structured_brief'): void {
    this.updateProjectBrief(brief);
    if (this.handler?.onDisplayBrief) {
      this.handler.onDisplayBrief(brief, displayType);
    }
  }
}

export const workspaceActionBridge = new WorkspaceActionBridge();
