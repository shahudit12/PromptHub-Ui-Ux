/**
 * src/services/voice/voiceWorkspaceAgent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Autonomous Voice Workspace Agent for PromptHub.
 *
 * Configurable Agent Engine:
 * - Runs strictly on the user's selected model (OpenAI GPT-4o, Claude 3.5 Sonnet,
 *   DeepSeek R1, Llama 3.3 70B, Qwen Coder, Gemini, etc.).
 * - ZERO hardcoded model dependencies.
 * - Converts spoken utterances into workspace actions (start_creation, refine_artifact, etc.)
 *   and synthesizes short conversational spoken responses via Deepgram Aura TTS.
 * - Tracks jobs independently of voice session continuity.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { aiGateway } from '../ai/aiGateway';
import { deepgramProvider } from './deepgramProvider';
import { workspaceActionBridge, type WorkspaceProjectContext } from '../work/workspaceActionBridge';
import { resolveModelRoute } from '../ai/modelRouter';
import { logger } from '../../utils/logger';

export interface VoiceTurnMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  spokenText?: string;
  actionCall?: {
    action: string;
    parameters: Record<string, any>;
    result?: any;
  };
  modelUsed?: string;
  providerUsed?: string;
  timestamp: number;
}

export interface VoiceAgentSessionConfig {
  selectedModel: string;
  projectId: string;
  sessionId: string;
  userPlan?: string;
}

export class VoiceWorkspaceAgent {
  private config: VoiceAgentSessionConfig;
  private history: VoiceTurnMessage[] = [];
  private activeJobId: string | null = null;

  constructor(config: VoiceAgentSessionConfig) {
    this.config = config;
  }

  public updateModel(newModel: string): void {
    this.config.selectedModel = newModel;
  }

  public getHistory(): VoiceTurnMessage[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
  }

  /**
   * Process a user spoken utterance through the configured AI model.
   */
  public async processSpokenTurn(userUtterance: string): Promise<{
    spokenText: string;
    audioUrl?: string;
    audioBase64?: string;
    actionResult?: any;
    modelUsed: string;
    providerUsed: string;
    jobId?: string;
  }> {
    const cleanInput = userUtterance.trim();
    if (!cleanInput) {
      return {
        spokenText: "I'm listening. What would you like to build or change in your workspace?",
        modelUsed: this.config.selectedModel,
        providerUsed: 'PromptHub Voice',
      };
    }

    // 1. Record user message in history
    const userMsg: VoiceTurnMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: cleanInput,
      timestamp: Date.now(),
    };
    this.history.push(userMsg);

    // 2. Fetch live workspace context
    const projectContext: WorkspaceProjectContext = await workspaceActionBridge.getProjectContext();

    // 3. Construct System Directives
    const systemPrompt = `You are the PromptHub Voice Workspace Assistant. You operate PromptHub's creation studio via voice.
You understand spoken user requests, ask concise clarifying questions, start builds, discuss designs, and apply modifications.

CURRENT WORKSPACE CONTEXT:
- Project ID: ${projectContext.projectId}
- Project Name: ${projectContext.projectName}
- Summary: ${projectContext.projectSummary}
- Existing Files (${projectContext.files.length}): ${projectContext.files.map((f) => f.name).join(', ') || 'No files yet'}
- Active Job Status: ${projectContext.jobStatus} (${projectContext.jobProgress}%)
${projectContext.selectedArtifact ? `- Selected Artifact: "${projectContext.selectedArtifact.title}" (${projectContext.selectedArtifact.type})` : ''}

AVAILABLE ACTIONS:
1. start_creation: When user wants to create a new website, app, tool, or deliverable.
   Schema: {"action": "start_creation", "parameters": {"prompt": "...", "style": "minimal | colourful | modern | etc"}}
2. refine_artifact: When user asks to modify, add a feature, or change the existing code/design.
   Schema: {"action": "refine_artifact", "parameters": {"instruction": "...", "targetFile": "..."}}
3. select_design_concept: When user picks a design direction or choice (e.g. "minimal", "second design").
   Schema: {"action": "select_design_concept", "parameters": {"concept": "...", "conceptIndex": 2}}
4. get_project_context: When user asks what files or code exist.
   Schema: {"action": "get_project_context", "parameters": {}}
5. get_job_status: Check build status if user asks "is it done yet?".
   Schema: {"action": "get_job_status", "parameters": {"jobId": "..."}}

MANDATORY RESPONSE FORMAT:
- If a workspace action is needed, output an <action> JSON block:
<action>
{"action": "ACTION_NAME", "parameters": { ... }}
</action>

- Always provide your spoken reply inside <spoken>...</spoken> tags:
<spoken>
[1-2 natural, friendly, conversational sentences. NEVER recite raw code, HTML, CSS, or markdown tables. The Workspace displays the visual code.]
</spoken>

Example Flow:
User: "Create an invoice calculator for freelancers."
Assistant:
<spoken>
Do you prefer a minimal or colourful design?
</spoken>

User: "Minimal."
Assistant:
<action>
{"action": "start_creation", "parameters": {"prompt": "Minimal invoice calculator for freelancers with clean currency and fee breakdown", "style": "minimal"}}
</action>
<spoken>
I've started building your minimal invoice calculator. You can watch it assemble in the workspace.
</spoken>

User: "Add GST to the totals."
Assistant:
<action>
{"action": "refine_artifact", "parameters": {"instruction": "Add GST calculation percentage slider and breakdown to invoice totals"}}
</action>
<spoken>
I've added the GST calculator to your invoice totals.
</spoken>`;

    // 4. Resolve Route & Model Execution
    // The user's chosen model MUST power this entire step!
    const targetModel = this.config.selectedModel || 'openrouter/free';
    const route = resolveModelRoute(targetModel, 'auto');

    let rawModelOutput = '';
    let usedModel = targetModel;
    let usedProvider: string = route.gatewayLabel;

    try {
      // Build conversation history for model
      const modelMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...this.history.slice(-8).map((m) => ({
          role: m.role,
          content: m.text,
        })),
      ];

      const aiResponse = await aiGateway.executePrompt(cleanInput, {
        modelId: targetModel,
        temperature: 0.6,
        maxTokens: 2048,
        messages: modelMessages,
        executionMode: 'raw',
      });

      rawModelOutput = (aiResponse.output || '').trim();
      usedModel = aiResponse.model || targetModel;
      usedProvider = aiResponse.provider || route.gatewayLabel;
    } catch (modelErr: any) {
      logger.error('[VoiceWorkspaceAgent] Execution failed on selected model:', modelErr);
      // We NEVER silently switch models without the user's consent.
      const errorSpoken = `I encountered an issue executing with ${targetModel.split('/').pop()}: ${modelErr?.message || 'Connection error'}. Would you like to retry or pick another model?`;
      return {
        spokenText: errorSpoken,
        modelUsed: targetModel,
        providerUsed: route.gatewayLabel,
      };
    }

    // 5. Parse Action and Spoken Utterance
    let actionResult: any = null;
    let spokenText = '';
    let activeJobId: string | undefined;

    // Check for <action> block
    const actionMatch = rawModelOutput.match(/<action>([\s\S]*?)<\/action>/i);
    if (actionMatch) {
      try {
        const actionJson = JSON.parse(actionMatch[1].trim());
        const actionName = actionJson.action;
        const params = actionJson.parameters || {};

        if (actionName === 'start_creation') {
          const creationRes = await workspaceActionBridge.startCreation(
            params.prompt,
            params.style,
            `voice_${Date.now()}`
          );
          activeJobId = creationRes.jobId;
          this.activeJobId = activeJobId;
          actionResult = creationRes;
        } else if (actionName === 'refine_artifact') {
          const refineRes = await workspaceActionBridge.refineArtifact(
            params.instruction,
            params.targetFile
          );
          activeJobId = refineRes.jobId;
          this.activeJobId = activeJobId;
          actionResult = refineRes;
        } else if (actionName === 'select_design_concept') {
          actionResult = await workspaceActionBridge.selectDesignConcept(
            params.concept,
            params.conceptIndex
          );
        } else if (actionName === 'get_project_context') {
          actionResult = await workspaceActionBridge.getProjectContext();
        } else if (actionName === 'get_job_status') {
          const targetJob = params.jobId || this.activeJobId || '';
          actionResult = await workspaceActionBridge.getJobStatus(targetJob);
        }
      } catch (actErr) {
        logger.warn('[VoiceWorkspaceAgent] Failed to parse or execute action JSON:', actErr);
      }
    }

    // Check for <spoken> block
    const spokenMatch = rawModelOutput.match(/<spoken>([\s\S]*?)<\/spoken>/i);
    if (spokenMatch) {
      spokenText = spokenMatch[1].trim();
    } else {
      // Clean fallback: strip code blocks, xml tags, and markdown headers
      spokenText = rawModelOutput
        .replace(/<action>[\s\S]*?<\/action>/gi, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]+`/g, '')
        .replace(/#{1,6}\s+/g, '')
        .replace(/<[^>]+>/g, '')
        .trim();
      // Keep only first 2 sentences for pleasant voice cadence
      const sentences = spokenText.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 0) {
        spokenText = sentences.slice(0, 2).join(' ').trim();
      }
    }

    if (!spokenText) {
      spokenText = actionResult
        ? "I've updated your workspace as requested."
        : "I've processed your instruction.";
    }

    // 6. Synthesize Speech via Deepgram Aura TTS
    let audioUrl: string | undefined;
    let audioBase64: string | undefined;
    try {
      const ttsResult = await deepgramProvider.synthesize(spokenText);
      audioUrl = ttsResult.audioUrl;
      audioBase64 = ttsResult.audioUrl.replace(/^data:audio\/[^;]+;base64,/, '');
    } catch (ttsErr) {
      logger.warn('[VoiceWorkspaceAgent] Deepgram TTS synthesis notice:', ttsErr);
    }

    // 7. Record Assistant Turn
    const asstMsg: VoiceTurnMessage = {
      id: `asst_${Date.now()}`,
      role: 'assistant',
      text: spokenText,
      spokenText,
      actionCall: actionMatch ? { action: 'executed', parameters: {}, result: actionResult } : undefined,
      modelUsed: usedModel,
      providerUsed: usedProvider,
      timestamp: Date.now(),
    };
    this.history.push(asstMsg);

    return {
      spokenText,
      audioUrl,
      audioBase64,
      actionResult,
      modelUsed: usedModel,
      providerUsed: usedProvider,
      jobId: activeJobId,
    };
  }
}
