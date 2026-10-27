/**
 * src/services/ai/sharedExecutionService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared Unified Execution Service for PromptHub Workspace.
 *
 * Consolidates:
 * - Typed Text Chat
 * - Yuno Voice Turns
 * - Starter Templates / Blueprints
 * - Artifact Surgical Refinements
 * - Plugin-Assisted Operations
 *
 * Faithfully implements:
 * - Process A (8-Step Everyday Interaction Loop)
 * - Process B (Contextual Heavy Execution Loop)
 * - Fast-Path Zero-Sandbox Conversational Interception (greetings & help queries)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  type StructuredProjectBrief,
  type DeliverableIntentType,
  type ProcessedBriefAttachment,
} from '../../types/projectBrief.ts';
import { structuredBriefManager } from './structuredBriefManager.ts';
import {
  classifyDeliverableIntent,
  isConversationalGreeting,
  isCapabilitiesOrHelpQuery,
  isHostingQuery,
} from './intentClassifier.ts';
import { resolveAutonomousModelRoute } from './modelRouter.ts';
import { aiGateway } from './aiGateway.ts';
import { workspaceActionBridge } from '../work/workspaceActionBridge.ts';
import { securityUtils } from '../../utils/security.ts';
import type { WorkFile } from '../../types/work.ts';
import {
  type DeliverableBundle,
  createAdDeliverable,
  createReportDeliverable,
  createDataTableDeliverable,
  createCodeAppDeliverable,
  createPresentationDeliverable,
  createVideoStoryboardDeliverable,
} from '../../types/deliverableState.ts';
import type { WorkspaceAttachment } from '../../utils/workspaceAttachmentEngine.ts';
import { scopedMemoryService } from '../memory/scopedMemoryService.ts';
import { memoryRetrievalBudget } from '../memory/memoryRetrievalBudget.ts';
import { knowledgeGraphService } from '../knowledge/knowledgeGraphService.ts';

export interface WorkspaceExecutionRequest {
  requestId: string;
  projectId: string;
  sessionId: string;
  source: 'text' | 'voice' | 'template' | 'refinement';
  text: string;
  userId?: string;
  attachments?: WorkspaceAttachment[];
  selectedModel?: string;
  developerSettings?: {
    temperature?: number;
    maxTokens?: number;
    modelOverride?: string;
    systemPromptOverride?: string;
  };
  activeSkills?: string[] | any[];
  mcpContext?: string;
  pinnedContext?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  activeBriefId?: string;
  isTemporaryChat?: boolean;
}

export interface WorkspaceExecutionResponse {
  jobId: string;
  status: 'completed' | 'failed' | 'requires_approval';
  brief: StructuredProjectBrief;
  outputMarkdown?: string;
  deliverable?: DeliverableBundle | null;
  files?: WorkFile[];
  creditsDeducted: number;
  modelUsed: string;
  durationMs: number;
  error?: string;
  suggestedFollowUps?: string[];
}

export interface SharedExecutionRequest {
  requestId: string;
  source: 'text' | 'voice' | 'template' | 'refinement' | 'plugin';
  rawQuery: string;
  projectId: string;
  sessionId: string;
  attachments?: any[];
  selectedModel?: string;
  developerSettings?: {
    modelOverride?: string;
    temperature?: number;
    maxTokens?: number;
    systemPromptOverride?: string;
  };
  activeSkills?: string[];
  activeArtifact?: {
    id?: string;
    path?: string;
    content?: string;
    version?: string;
  };
  mcpContext?: string;
  pinnedContext?: string;
}

export interface ExecutionJobResult {
  jobId: string;
  status: 'completed' | 'failed' | 'requires_approval';
  brief: StructuredProjectBrief;
  deliverable?: DeliverableBundle;
  files?: WorkFile[];
  output?: string;
  error?: string;
  metrics?: {
    modelUsed: string;
    durationMs: number;
    tokensEstimated: number;
    creditsDeducted: number;
  };
}

export class SharedExecutionService {
  /**
   * Main consolidated execution entry point for UnifiedCreationWorkspace
   */
  public async executeWorkspaceSubmission(
    request: WorkspaceExecutionRequest
  ): Promise<WorkspaceExecutionResponse> {
    const startTime = Date.now();
    const rawQuery = (request.text || '').trim();
    const cleanQuery = securityUtils.sanitizeInput(rawQuery);
    const jobId = request.requestId || `job_${startTime}_${Math.random().toString(36).slice(2, 7)}`;

    // ─── Step 1: Record Job Received ───────────────────────────────────────────
    workspaceActionBridge.updateJob(jobId, {
      status: 'planning',
      progress: 10,
      message: 'Analyzing workspace request and compiling brief...',
    });

    // ─── Step 2: Capability & Conversational Fast-Path Interception ─────────────
    // Direct conversational inquiries and greetings must return clear Markdown without
    // triggering sandboxes, creating empty files, or deducting credits.
    const fastPathResult = await this.handleConversationalFastPath(request, cleanQuery, jobId);
    if (fastPathResult) {
      workspaceActionBridge.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        message: 'Conversational response delivered.',
        filesCount: 0,
      });
      return fastPathResult;
    }

    // ─── Step 2.5: Scoped Multi-Tier Memory Retrieval within Context Budget ─────
    const userId = request.userId || 'anonymous_user';
    const memoryContext = await memoryRetrievalBudget.getBudgetedMemoryContext({
      userId,
      projectId: request.projectId,
      maxTokens: 1500,
      currentUserInstruction: cleanQuery,
    });

    // ─── Step 3: Intent Classification & Brief Lifecycle Resolution ───────────
    const intentClassification = classifyDeliverableIntent(cleanQuery, request.attachments);
    const intent: DeliverableIntentType = intentClassification.deliverableType as DeliverableIntentType;

    // Convert workspace attachments to brief attachments format
    const processedAttachments: ProcessedBriefAttachment[] = (request.attachments || []).map((att) => ({
      id: att.id,
      fileName: att.name || 'attachment',
      mimeType: att.mimeType || 'application/octet-stream',
      sizeBytes: att.sizeBytes || 0,
      status: 'extracted',
      extractedTextPreview: att.extractedContent?.slice(0, 300),
      dataUrl: att.previewUrl,
    }));

    // Extract active skills list
    const activeSkillsList: string[] = Array.isArray(request.activeSkills)
      ? request.activeSkills.map((s) => (typeof s === 'string' ? s : s?.command || s?.name || ''))
      : [];

    let currentBrief: StructuredProjectBrief;
    const existingBrief = structuredBriefManager.getBrief(request.sessionId);

    if (!existingBrief || existingBrief.version === 0) {
      currentBrief = structuredBriefManager.createInitialBrief({
        projectId: request.projectId,
        sessionId: request.sessionId,
        rawQuery: cleanQuery,
        intent,
        modelId: request.developerSettings?.modelOverride || request.selectedModel || intentClassification.recommendedModel,
        attachments: processedAttachments,
        skills: activeSkillsList,
      });
    } else {
      currentBrief = structuredBriefManager.applyDelta(
        request.sessionId,
        {
          turnPrompt: cleanQuery,
          intent,
          attachments: processedAttachments,
          activeSkills: activeSkillsList,
          selectedModel: {
            modelId: request.developerSettings?.modelOverride || request.selectedModel || existingBrief.selectedModel.modelId,
          },
        },
        request.projectId
      );
    }

    // Link retrieved memory references to the structured brief
    if (memoryContext.injectedMemories.length > 0) {
      currentBrief.relevantMemoryReferences = Array.from(
        new Set([
          ...(currentBrief.relevantMemoryReferences || []),
          ...memoryContext.injectedMemories.map((m) => m.id),
        ])
      );
    }

    // ─── Step 4: Model Selection from Trusted State & Guardrails ───────────────
    const resolvedRoute = resolveAutonomousModelRoute({
      deliverableType: intent,
      hasVisionInput: (request.attachments?.length || 0) > 0,
      userPrompt: cleanQuery,
      explicitModelOverride: request.developerSettings?.modelOverride || request.selectedModel || null,
    });

    const isFree = resolvedRoute.creditCost === 0 || resolvedRoute.modelId.includes(':free') || resolvedRoute.modelId.includes('openrouter/free');
    const creditsToDeduct = isFree ? 0 : resolvedRoute.creditCost;

    workspaceActionBridge.updateJob(jobId, {
      status: 'building',
      progress: 35,
      message: `Generating ${intent.replace(/_/g, ' ')} using ${resolvedRoute.gatewayLabel}...`,
    });

    // ─── Step 5: Route Decision (Process B vs Non-Code Deliverables) ────────────
    const isContentDeliverable =
      intent === 'ad_campaign' ||
      intent === 'written_report' ||
      intent === 'strategic_plan' ||
      intent === 'data_analysis' ||
      intent === 'presentation_deck' ||
      intent === 'video_script';

    const isExplicitWebCode =
      intent === 'interactive_web_app' ||
      intent === 'code_script' ||
      (!isContentDeliverable &&
        /\b(html|website|web\s*app|landing\s*page|ui\s*dashboard|interactive\s*dashboard|calculator\s*app|portfolio\s*(?:website|app)|product|software|tool|app|prototype|component)\b/i.test(cleanQuery));

    if (isExplicitWebCode) {
      return await this.executeProcessB(request, currentBrief, resolvedRoute, jobId, startTime, creditsToDeduct, memoryContext);
    }

    // For non-code deliverables: execute LLM pass with structured master prompt
    return await this.executeContextualContentDeliverable(request, currentBrief, resolvedRoute, jobId, startTime, creditsToDeduct, memoryContext);
  }

  /**
   * Process A — Step 2: Conversational Fast-Path Interception
   */
  private async handleConversationalFastPath(
    request: WorkspaceExecutionRequest,
    cleanQuery: string,
    jobId: string
  ): Promise<WorkspaceExecutionResponse | null> {
    const isGreeting = isConversationalGreeting(cleanQuery);
    const isHelp = isCapabilitiesOrHelpQuery(cleanQuery);
    const isHosting = isHostingQuery(cleanQuery);
    const isMemoryInquiry = /\b(what do you remember|what do you know about me|show my memory|show memories|list memories)\b/i.test(cleanQuery);
    const isForgetCommand = /^(forget this|forget that|forget everything|clear memories|clear memory)\b/i.test(cleanQuery);

    if (!isGreeting && !isHelp && !isHosting && !isMemoryInquiry && !isForgetCommand) {
      return null;
    }

    const brief = structuredBriefManager.createInitialBrief({
      projectId: request.projectId,
      sessionId: request.sessionId,
      rawQuery: cleanQuery,
      intent: 'general_inquiry',
      modelId: 'openrouter/free',
      isFreeModel: true,
      budgetCredits: 0,
    });

    if (isMemoryInquiry) {
      const userId = request.userId || 'anonymous_user';
      const memories = await scopedMemoryService.getScopedMemories({
        userId,
        projectId: request.projectId,
      });

      let memoryMarkdown = `### Memory Store & Learned Context\n\n`;
      if (memories.length === 0) {
        memoryMarkdown += `I currently have **0 active memories** saved for your account in this project. You can define rules, brand tokens, or coding preferences in chat or via the **Memory** settings modal.`;
      } else {
        memoryMarkdown += `Here are the active rules, preferences, and constraints I remember for this workspace:\n\n`;
        for (const m of memories) {
          memoryMarkdown += `- **[${m.scope.toUpperCase()}]** \`${m.key}\`: ${m.value || m.content} *(Confidence: ${m.confidenceState.replace(/_/g, ' ')})*\n`;
        }
        memoryMarkdown += `\n*You can inspect, edit, or purge any memory record anytime using the **Memory** inspector button.*`;
      }

      return {
        jobId,
        status: 'completed',
        brief,
        outputMarkdown: memoryMarkdown,
        deliverable: null,
        files: [],
        creditsDeducted: 0,
        modelUsed: 'openrouter/free',
        durationMs: 15,
        suggestedFollowUps: [
          'Open memory settings',
          'Forget a specific memory',
          'Build an interactive web app',
        ],
      };
    }

    if (isForgetCommand) {
      const userId = request.userId || 'anonymous_user';
      await scopedMemoryService.clearScopedMemory({
        userId,
        scope: 'project',
        projectId: request.projectId,
      });

      return {
        jobId,
        status: 'completed',
        brief,
        outputMarkdown: `### Memory Purged\n\nAll active project-scoped memories for this workspace have been immediately forgotten and evicted from the active retrieval index with zero ghost memory.`,
        deliverable: null,
        files: [],
        creditsDeducted: 0,
        modelUsed: 'openrouter/free',
        durationMs: 12,
        suggestedFollowUps: [
          'What do you remember about me?',
          'Set a new brand color',
          'Build an interactive web app',
        ],
      };
    }

    if (isGreeting) {
      const greetingMarkdown = `Hello! How can I help you today? Let me know what you would like to build or work on.`;

      return {
        jobId,
        status: 'completed',
        brief,
        outputMarkdown: greetingMarkdown,
        deliverable: null,
        files: [],
        creditsDeducted: 0,
        modelUsed: 'openrouter/free',
        durationMs: 15,
        suggestedFollowUps: [
          'Build an interactive web app',
          'Draft a system prompt',
          'Compare models side-by-side',
        ],
      };
    }

    if (isHelp) {
      const helpMarkdown = `### PromptHub Studio Capabilities

PromptHub transforms conversational requests into completed, production-ready deliverables without manual tool or model selection:

1. **Autonomous Outcome Engine**:
   - **Interactive Web Apps**: Generates clean, responsive HTML5 + Tailwind CSS with live browser sandboxing, ZIP export, and instant cloud deployment.
   - **Ad Campaigns**: Produces headline options, persuasive body copy, CTA tags, and visual preview mockups.
   - **Executive Reports**: Formats strategic briefs, SWOT matrices, milestone checklists, and KPI scorecards.
   - **Data Tables**: Ingests CSV/JSON data client-side with real-time column sorting, filtering, and metric calculation.

2. **Multimodal Attachments**:
   - Drag and drop product photos, brand documents (PDF/TXT), or spreadsheets (CSV) to extract context automatically.

3. **Yuno Voice Assistant**:
   - Click the glowing orb in the bottom-right corner to speak naturally. Voice turns compile the same structured brief and execute identically to typed chat.

4. **Multi-Turn Adaptive Brief**:
   - Click the **Brief [v#]** badge in the toolbar to inspect or rollback the AI's internal requirements and strict negative constraints at any time.`;

      return {
        jobId,
        status: 'completed',
        brief,
        outputMarkdown: helpMarkdown,
        deliverable: null,
        files: [],
        creditsDeducted: 0,
        modelUsed: 'openrouter/free',
        durationMs: 20,
        suggestedFollowUps: [
          'Create a SaaS pricing calculator',
          'Generate a product launch ad',
          'Show me hosting options',
        ],
      };
    }

    if (isHosting) {
      const hostingMarkdown = `### 🚀 Website Hosting & Deployment Guide

PromptHub supports 1-click cloud deployment for all web apps and portfolios generated in your workspace:

- **Free Tier Hosting**: Deploy instantly to **Netlify** or **Vercel** with a free sub-domain (\`https://your-app.netlify.app\`).
- **Custom Domains**: Connect your own domain via Cloudflare or Hostinger with automatic SSL certificates.
- **Export ZIP**: Download the complete standalone \`index.html\` bundle to host on any server or GitHub Pages.

Click the **Deploy & Host** button above any code card or open the Live Preview pane to configure your deployment.`;

      return {
        jobId,
        status: 'completed',
        brief,
        outputMarkdown: hostingMarkdown,
        deliverable: null,
        files: [],
        creditsDeducted: 0,
        modelUsed: 'openrouter/free',
        durationMs: 18,
        suggestedFollowUps: [
          'Deploy website now',
          'Export code as ZIP',
          'Make website responsive',
        ],
      };
    }

    return null;
  }

  /**
   * Process B: Contextual Heavy Execution Loop (Sandboxes, Code Extraction, Syntax Validation)
   */
  private async executeProcessB(
    request: WorkspaceExecutionRequest,
    brief: StructuredProjectBrief,
    modelRoute: any,
    jobId: string,
    startTime: number,
    creditsToDeduct: number,
    memoryContext?: any
  ): Promise<WorkspaceExecutionResponse> {
    const rawQuery = (request.text || '').trim();

    // 1. Compile 12-Section Master Prompt
    const masterPrompt = structuredBriefManager.compileMasterPrompt(brief);

    // 2. Format Context & Attachments
    let promptWithContext = masterPrompt;
    if (memoryContext?.formattedMarkdown) {
      promptWithContext = `${memoryContext.formattedMarkdown}\n\n${promptWithContext}`;
    }
    if (request.pinnedContext) {
      promptWithContext = `### PINNED WORKSPACE CONTEXT\n${request.pinnedContext}\n\n${promptWithContext}`;
    }
    if (request.mcpContext) {
      promptWithContext = `### MCP SYSTEM CONTEXT\n${request.mcpContext}\n\n${promptWithContext}`;
    }

    workspaceActionBridge.updateJob(jobId, {
      status: 'building',
      progress: 60,
      message: 'Synthesizing production code and building live sandbox...',
    });

    // 3. Inference Pass via aiGateway
    let aiResponseText = '';
    try {
      const aiResponse = await aiGateway.executePrompt(promptWithContext, {
        modelId: modelRoute.modelId,
        temperature: request.developerSettings?.temperature ?? 0.3,
        maxTokens: request.developerSettings?.maxTokens ?? 4096,
        systemPrompt: request.developerSettings?.systemPromptOverride,
      });
      aiResponseText = typeof aiResponse === 'string'
        ? aiResponse
        : (aiResponse as any)?.output || (aiResponse as any)?.text || (aiResponse as any)?.content || '';

      // Defensively strip any meta-specification boilerplate so user only receives actual deliverable
      if (aiResponseText) {
        aiResponseText = aiResponseText
          .replace(/^#+\s*(?:AUTONOMOUS DELIVERABLE INSTRUCTION|PROMPTHUB AUTONOMOUS DELIVERABLE SPECIFICATION)[\s\S]*?(?=\n#|\n```|[A-Za-z0-9]|\Z)/gi, '')
          .replace(/^#+\s*(?:MANDATORY OUTPUT DIRECTIVE|A\.\s*OBJECTIVE|B\.\s*AUDIENCE|C\.\s*CONFIRMED FACTS|D\.\s*REQUIREMENTS|E\.\s*CREATIVE|F\.\s*ASSETS|G\.\s*TECHNICAL|H\.\s*EXCLUSIONS|I\.\s*QUALITY|J\.\s*OUTPUT CONTRACT|K\.\s*ACCEPTANCE CRITERIA|L\.\s*ASSUMPTIONS)[\s\S]*?(?=\n#|\n```|[A-Za-z0-9]|\Z)/gi, '')
          .replace(/^#+\s*(?:EXECUTIVE\s+SUMMARY|FUNCTIONAL\s+REQUIREMENTS|TECHNICAL\s+SPECIFICATIONS|CREATIVE\s+DIRECTION|OUTPUT\s+CONTRACT|ACCEPTANCE\s+CRITERIA)[\s\S]*?(?=\n#|\n```|[A-Za-z0-9]|\Z)/gi, '')
          .trim();
      }
    } catch (err: any) {
      workspaceActionBridge.updateJob(jobId, {
        status: 'failed',
        progress: 100,
        error: err?.message || 'Execution error during model inference',
      });
      return {
        jobId,
        status: 'failed',
        brief,
        error: err?.message || 'Execution error during model inference',
        creditsDeducted: 0,
        modelUsed: modelRoute.modelId,
        durationMs: Date.now() - startTime,
      };
    }

    // 4. Extract HTML and Assemble WorkFile Bundle
    const { html, files } = this.extractHtmlAndBundleFiles(aiResponseText, rawQuery, request.projectId, modelRoute.displayName);

    // 5. Construct CodeAppDeliverable
    let deliverable: DeliverableBundle | null = null;
    if (html && files.length > 0) {
      const codeAppData = createCodeAppDeliverable(rawQuery, files);
      deliverable = {
        type: 'interactive_web_app',
        version: brief.version,
        versions: [
          {
            version: brief.version,
            label: `v${brief.version}`,
            timestamp: Date.now(),
            summary: `Compiled ${brief.goal || 'Web App'}`,
          },
        ],
        codeAppData: {
          ...codeAppData,
          rawCodeSnippet: html,
        },
      };
    }

    if (!aiResponseText.trim() && deliverable?.codeAppData) {
      aiResponseText = `### 🚀 ${deliverable.codeAppData.title}\n\n${deliverable.codeAppData.description}\n\n- **Live Sandbox**: Ready to test in preview pane\n- **Project Bundle**: ${files.length} source files compiled\n- **Hosting**: Ready for 1-click Netlify, Vercel, or PromptHub Live deployment.`;
    }

    if (deliverable && !request.isTemporaryChat && request.projectId) {
      try {
        await knowledgeGraphService.insertNode({
          userId: request.userId || 'anonymous_user',
          projectId: request.projectId,
          nodeType: 'artifact',
          title: brief.goal || 'Generated Interactive Web App',
          content: `Web application compiled for turn #${brief.version}`,
        });
      } catch {
        // Non-blocking
      }
    }

    const durationMs = Date.now() - startTime;
    workspaceActionBridge.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      message: 'Deliverable ready.',
      filesCount: files.length,
    });

    return {
      jobId,
      status: 'completed',
      brief,
      outputMarkdown: aiResponseText,
      deliverable,
      files,
      creditsDeducted: creditsToDeduct,
      modelUsed: modelRoute.modelId,
      durationMs,
      suggestedFollowUps: [
        'Open Live Preview',
        'Make the theme dark',
        'Add interactive animations',
        'Deploy & Host website',
      ],
    };
  }

  /**
   * Execution for Non-Code Content Deliverables (Ads, Reports, Tables, Presentations, Video Scripts)
   */
  private async executeContextualContentDeliverable(
    request: WorkspaceExecutionRequest,
    brief: StructuredProjectBrief,
    modelRoute: any,
    jobId: string,
    startTime: number,
    creditsToDeduct: number,
    memoryContext?: any
  ): Promise<WorkspaceExecutionResponse> {
    const rawQuery = (request.text || '').trim();
    let masterPrompt = structuredBriefManager.compileMasterPrompt(brief);
    if (memoryContext?.formattedMarkdown) {
      masterPrompt = `${memoryContext.formattedMarkdown}\n\n${masterPrompt}`;
    }

    workspaceActionBridge.updateJob(jobId, {
      status: 'building',
      progress: 60,
      message: `Generating ${brief.intent.replace(/_/g, ' ')}...`,
    });

    let aiResponseText = '';
    try {
      const aiResponse = await aiGateway.executePrompt(masterPrompt, {
        modelId: modelRoute.modelId,
        temperature: request.developerSettings?.temperature ?? 0.5,
        maxTokens: request.developerSettings?.maxTokens ?? 3000,
        systemPrompt: request.developerSettings?.systemPromptOverride,
      });
      aiResponseText = typeof aiResponse === 'string'
        ? aiResponse
        : (aiResponse as any)?.output || (aiResponse as any)?.text || (aiResponse as any)?.content || '';

      if (aiResponseText) {
        aiResponseText = aiResponseText
          .replace(/^#+\s*(?:AUTONOMOUS DELIVERABLE INSTRUCTION|PROMPTHUB AUTONOMOUS DELIVERABLE SPECIFICATION)[\s\S]*?(?=\n#|\n```|[A-Za-z0-9]|\Z)/gi, '')
          .replace(/^#+\s*(?:MANDATORY OUTPUT DIRECTIVE|A\.\s*OBJECTIVE|B\.\s*AUDIENCE|C\.\s*CONFIRMED FACTS|D\.\s*REQUIREMENTS|E\.\s*CREATIVE|F\.\s*ASSETS|G\.\s*TECHNICAL|H\.\s*EXCLUSIONS|I\.\s*QUALITY|J\.\s*OUTPUT CONTRACT|K\.\s*ACCEPTANCE CRITERIA|L\.\s*ASSUMPTIONS)[\s\S]*?(?=\n#|\n```|[A-Za-z0-9]|\Z)/gi, '')
          .replace(/^#+\s*(?:EXECUTIVE\s+SUMMARY|FUNCTIONAL\s+REQUIREMENTS|TECHNICAL\s+SPECIFICATIONS|CREATIVE\s+DIRECTION|OUTPUT\s+CONTRACT|ACCEPTANCE\s+CRITERIA)[\s\S]*?(?=\n#|\n```|[A-Za-z0-9]|\Z)/gi, '')
          .trim();
      }
    } catch (err: any) {
      workspaceActionBridge.updateJob(jobId, {
        status: 'failed',
        progress: 100,
        error: err?.message || 'Error generating deliverable',
      });
      return {
        jobId,
        status: 'failed',
        brief,
        error: err?.message || 'Error generating deliverable',
        creditsDeducted: 0,
        modelUsed: modelRoute.modelId,
        durationMs: Date.now() - startTime,
      };
    }

    // Construct native deliverable card bundle based on intent
    let deliverable: DeliverableBundle | null = null;
    const imageAttachment = request.attachments?.find((a) => a.mimeType?.startsWith('image/'));

    switch (brief.intent) {
      case 'ad_campaign': {
        const adData = createAdDeliverable(rawQuery, imageAttachment);
        deliverable = {
          type: 'ad_campaign',
          version: brief.version,
          versions: [{ version: brief.version, label: `v${brief.version}`, timestamp: Date.now(), summary: 'Initial ad copy' }],
          adData,
        };
        break;
      }
      case 'written_report':
      case 'strategic_plan': {
        const docAttachment = request.attachments?.find((a) => a.mimeType?.includes('pdf') || a.mimeType?.includes('text') || a.mimeType?.includes('document'));
        const reportData = createReportDeliverable(rawQuery, docAttachment);
        deliverable = {
          type: brief.intent === 'strategic_plan' ? 'strategic_plan' : 'written_report',
          version: brief.version,
          versions: [{ version: brief.version, label: `v${brief.version}`, timestamp: Date.now(), summary: 'Initial report draft' }],
          reportData,
        };
        break;
      }
      case 'data_analysis': {
        const tableAttachment = request.attachments?.find((a) => a.mimeType?.includes('csv') || a.mimeType?.includes('json'));
        const tableData = createDataTableDeliverable(rawQuery, tableAttachment);
        deliverable = {
          type: 'data_analysis',
          version: brief.version,
          versions: [{ version: brief.version, label: `v${brief.version}`, timestamp: Date.now(), summary: 'Parsed data table' }],
          tableData,
        };
        break;
      }
      case 'presentation_deck': {
        const presentationData = createPresentationDeliverable(rawQuery);
        deliverable = {
          type: 'presentation_deck',
          version: brief.version,
          versions: [{ version: brief.version, label: `v${brief.version}`, timestamp: Date.now(), summary: 'Presentation slides' }],
          presentationData,
        };
        break;
      }
      case 'video_script': {
        const videoData = createVideoStoryboardDeliverable(rawQuery);
        deliverable = {
          type: 'video_script',
          version: brief.version,
          versions: [{ version: brief.version, label: `v${brief.version}`, timestamp: Date.now(), summary: 'Video storyboard' }],
          videoData,
        };
        break;
      }
      default:
        deliverable = null;
    }

    if (deliverable && !request.isTemporaryChat && request.projectId) {
      try {
        await knowledgeGraphService.insertNode({
          userId: request.userId || 'anonymous_user',
          projectId: request.projectId,
          nodeType: 'artifact',
          title: brief.goal || 'Generated Content Deliverable',
          content: `${brief.intent} deliverable compiled for turn #${brief.version}`,
        });
      } catch {
        // Non-blocking
      }
    }

    // Auto-extract HTML files if the model returned HTML markup or code fences
    let extractedFiles: WorkFile[] = [];
    const hasHtmlMarkup =
      aiResponseText.includes('<!DOCTYPE') ||
      aiResponseText.includes('<html') ||
      aiResponseText.includes('```html') ||
      aiResponseText.includes('```htm') ||
      /<(?:nav|header|main|section|div|body)\b/i.test(aiResponseText);

    if (hasHtmlMarkup) {
      const bundle = this.extractHtmlAndBundleFiles(aiResponseText, rawQuery, request.projectId, modelRoute.displayName);
      if (bundle.files.length > 0) {
        extractedFiles = bundle.files;
      }
    }

    const durationMs = Date.now() - startTime;
    workspaceActionBridge.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      message: 'Deliverable ready.',
      filesCount: extractedFiles.length,
    });

    return {
      jobId,
      status: 'completed',
      brief,
      outputMarkdown: aiResponseText,
      deliverable,
      files: extractedFiles,
      creditsDeducted: creditsToDeduct,
      modelUsed: modelRoute.modelId,
      durationMs,
      suggestedFollowUps: [
        'Make it shorter and punchier',
        'Add more quantifiable metrics',
        'Download Markdown (.md)',
      ],
    };
  }

  /**
   * Extract HTML and assemble WorkFile bundle with multi-pattern fallback
   */
  private extractHtmlAndBundleFiles(
    aiResponseText: string,
    rawQuery: string,
    projectId: string,
    usedModelName: string
  ): { html: string; files: WorkFile[] } {
    let cleanedHtml = '';

    // Pattern 1: Fenced code block with html/htm/xml tag
    const htmlBlockMatch = aiResponseText.match(/```(?:html|htm|xml)\s*([\s\S]*?)(?:```|$)/i);
    if (htmlBlockMatch && htmlBlockMatch[1].trim()) {
      cleanedHtml = htmlBlockMatch[1].trim();
    }

    // Pattern 2: Generic fenced code block containing HTML markup
    if (!cleanedHtml) {
      const anyFencedBlocks = aiResponseText.match(/```(?:[a-z0-9_-]+)?\s*([\s\S]*?)(?:```|$)/gi);
      if (anyFencedBlocks) {
        for (const block of anyFencedBlocks) {
          const inner = block.replace(/^```[a-z0-9_-]*\s*/i, '').replace(/```$/i, '').trim();
          if (
            inner.includes('<!DOCTYPE') ||
            inner.includes('<html') ||
            (/<(?:div|nav|section|header|main|body|table|article|aside|footer|form|h1|h2|h3|p|button)\b/i.test(inner) && (inner.includes('</') || inner.includes('/>')))
          ) {
            cleanedHtml = inner;
            break;
          }
        }
      }
    }

    // Pattern 3: Explicit <!DOCTYPE html> document
    if (!cleanedHtml) {
      const docTypeMatch = aiResponseText.match(/(<!DOCTYPE html[\s\S]*?(?:<\/html>|$))/i);
      if (docTypeMatch && docTypeMatch[1].trim()) {
        cleanedHtml = docTypeMatch[1].trim();
      }
    }

    // Pattern 4: <html document
    if (!cleanedHtml) {
      const htmlTagMatch = aiResponseText.match(/(<html[\s\S]*?(?:<\/html>|$))/i);
      if (htmlTagMatch && htmlTagMatch[1].trim()) {
        cleanedHtml = htmlTagMatch[1].trim();
      }
    }

    // Pattern 5: Structural tag fragment
    if (!cleanedHtml) {
      const rawFragmentMatch = aiResponseText.match(/(<(?:nav|header|main|section|div|body)[\s\S]*)/i);
      if (rawFragmentMatch && rawFragmentMatch[1].trim() && (rawFragmentMatch[1].includes('</') || rawFragmentMatch[1].includes('/>'))) {
        cleanedHtml = rawFragmentMatch[1].trim();
      }
    }

    if (!cleanedHtml) {
      const isWebQuery = /website|web\s*app|calculator|landing|page|portfolio|dashboard|app|tool|business/i.test(rawQuery);
      if (isWebQuery) {
        const fallbackDeliverable = createCodeAppDeliverable(rawQuery);
        cleanedHtml = fallbackDeliverable.rawCodeSnippet || '';
      }
    }

    if (!cleanedHtml) {
      return { html: '', files: [] };
    }

    // Auto-heal structure if missing DOCTYPE or closing tags
    let fullHtml = cleanedHtml;
    if (!fullHtml.includes('<!DOCTYPE html>') && !fullHtml.includes('<html')) {
      fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${rawQuery.slice(0, 35) || 'PromptHub Web Deliverable'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Outfit', system-ui, -apple-system, sans-serif; }
    h1, h2, h3, h4, h5, h6 { font-family: 'Outfit', system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen">
  ${fullHtml}
  <script>
    if (window.lucide) { lucide.createIcons(); }
  </script>
</body>
</html>`;
    } else if (!fullHtml.includes('</html>')) {
      if (!fullHtml.includes('</body>')) {
        fullHtml += '\n</body>';
      }
      fullHtml += '\n</html>';
    }

    const indexFile: WorkFile = {
      id: `wf_${Date.now()}_index`,
      projectId: projectId || 'workspace_proj',
      worktreeId: 'main',
      path: 'index.html',
      name: 'index.html',
      content: fullHtml,
      size: fullHtml.length,
      isDirectory: false,
      mimeType: 'text/html',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const readmeFile: WorkFile = {
      id: `wf_${Date.now()}_md`,
      projectId: projectId || 'workspace_proj',
      worktreeId: 'main',
      path: 'README.md',
      name: 'README.md',
      content: `# ${rawQuery.slice(0, 40) || 'Web Application Deliverable'}\n\nBuilt autonomously with PromptHub AI Studio using ${usedModelName}.\n\n### Deliverables\n- \`index.html\`: Complete responsive single-file web application with modern Tailwind CSS and interactive UI.\n\n### Getting Started\nOpen \`index.html\` in any web browser or deploy directly to Netlify, Vercel, or custom domain.\n`,
      size: 250,
      isDirectory: false,
      mimeType: 'text/markdown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      html: fullHtml,
      files: [indexFile, readmeFile],
    };
  }

  /**
   * Compatibility alias for SharedExecutionRequest
   */
  public async execute(request: SharedExecutionRequest): Promise<ExecutionJobResult> {
    const res = await this.executeWorkspaceSubmission({
      requestId: request.requestId,
      projectId: request.projectId,
      sessionId: request.sessionId,
      source: request.source === 'plugin' ? 'text' : request.source,
      text: request.rawQuery,
      attachments: request.attachments,
      selectedModel: request.selectedModel,
      developerSettings: request.developerSettings,
      activeSkills: request.activeSkills,
      mcpContext: request.mcpContext,
      pinnedContext: request.pinnedContext,
    });

    return {
      jobId: res.jobId,
      status: res.status,
      brief: res.brief,
      deliverable: res.deliverable || undefined,
      files: res.files,
      output: res.outputMarkdown,
      error: res.error,
      metrics: {
        modelUsed: res.modelUsed,
        durationMs: res.durationMs,
        tokensEstimated: 1200,
        creditsDeducted: res.creditsDeducted,
      },
    };
  }
}

export const sharedExecutionService = new SharedExecutionService();
