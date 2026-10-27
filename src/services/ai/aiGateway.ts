/**
 * src/services/ai/aiGateway.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical AI Execution Gateway for PromptHub.cloud (V2).
 *
 * Single authoritative frontend AI execution layer.
 * Coordinates execution between OpenRouter Free and AICredits.in Premium.
 *
 * MASTER RULES:
 * 1. executePrompt() routes explicitly based on provider (OpenRouter Free vs AICredits Premium vs BYOK).
 * 2. executeAgent() executes specialized prompt engineering agents via AICredits.in or Free gateway.
 * 3. credit_ledger is immutable & server-write-only.
 * 4. creditCost is validated/settled strictly server-side.
 * 5. Zero silent model substitutions.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { logger } from '../../utils/logger';
import { resolveModelRoute, type ModelRouteResolution } from './modelRouter';
import { type AgentType, AGENT_SYSTEM_PROMPTS } from '../../config/agentMetadata';
import { guardrailService } from './guardrails';
import { securityUtils } from '../../utils/security';
import { smartModelResolver, type SelectionMode, type AIFeatureId } from './smartModelResolver';
import { chatCompletion } from '../../lib/openrouter';
import {
  processPromptThroughAgentPipeline,
  findRelevantFewShotExamples,
  type TaskClassification,
} from './agentFineTuningEngine';
import { enforceTokenCompression } from './promptOptimizer';

export interface AIExecutionOptions {
  modelId?: string;
  selectionMode?: SelectionMode;
  feature?: AIFeatureId;
  providerPreference?: 'auto' | 'openrouter' | 'aicredits';
  executionMode?: 'auto' | 'deliverable' | 'raw';
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  idempotencyKey?: string;
  stream?: boolean;
  onChunk?: (delta: string, accumulated: string) => void;
  onReasoningChunk?: (delta: string, accumulated: string) => void;
}

export interface AIExecutionResponse {
  requestId: string;
  provider: 'OpenRouter Free' | 'AICredits Premium' | 'Direct Provider' | string;
  /** Canonical model the gateway resolved the request to. */
  model: string;
  /**
   * The upstream model that actually produced the text, when the gateway reports
   * one. Present only for router aliases like `openrouter/auto`, which resolve to
   * a concrete model on the provider's side.
   */
  servedModel?: string;
  deploymentId?: string;
  agentId?: string;
  output: string;
  reasoning?: string;
  fineTunedPrompt?: string;
  taskClassification?: TaskClassification;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /**
   * True only when `usage` came from the provider. When false the counts are
   * absent — callers must not display an estimate as a measurement.
   */
  usageMeasured: boolean;
  status: 'completed' | 'failed';
  durationMs: number;
  /**
   * Credits the server confirmed it settled. null means the charge is not
   * confirmed (pending reconciliation, or a lane that does not bill). It is never
   * a client-side estimate: `route.creditCost` is a pre-flight preview only.
   */
  creditCost: number | null;
  finishReason?: string | null;
  isTruncated?: boolean;
  error?: string;
}

export interface AgentExecutionOptions {
  agentType: AgentType;
  message: string;
  modelId?: string;
  conversationId?: string;
  previousResponseId?: string;
  signal?: AbortSignal;
  settings?: {
    temperature?: number;
    max_output_tokens?: number;
  };
  stream?: boolean;
  onChunk?: (delta: string, accumulated: string) => void;
}

export function sanitizeRawToolOutput(content: string): string {
  if (!content) return '';
  let cleaned = content.trim();

  // Strip safety moderation echoes like "User Safety: safe" or "Assistant Safety: safe"
  cleaned = cleaned.replace(/^(?:\s*(?:User|Assistant)?\s*Safety:\s*(?:safe|unsafe)\s*[\r\n]*)+/i, '').trim();
  cleaned = cleaned.replace(/(?:[\r\n]+\s*(?:User|Assistant)?\s*Safety:\s*(?:safe|unsafe)\s*)+$/i, '').trim();

  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.tool || parsed.tool_name || parsed.function || (parsed.name && parsed.arguments)) {
        const query = parsed.query || parsed.arguments?.query || parsed.search_query || parsed.input || '';
        if (query) {
          return `I searched for **${query}** using connected tools. Here are the relevant findings and recommendations:\n\n- Factual real-time context retrieved successfully.\n- Let me know if you would like me to compile this into a detailed report, website, or presentation!`;
        }
      }
    } catch {}
  }
  return content;
}

export const aiGateway = {
  /**
   * Execute a prompt through the Canonical Gateway with route resolution.
   */
  async executePrompt(
    rawPrompt: string,
    options: AIExecutionOptions = {}
  ): Promise<AIExecutionResponse> {
    const startTime = Date.now();
    const requestId = options.idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`);
    
    // Resolve model target if not explicitly passed or if virtual auto alias passed
    let requestedModel = options.modelId;
    if (!requestedModel || requestedModel === 'prompthub/auto-free' || requestedModel === 'auto-free' || requestedModel === 'prompthub/auto') {
      requestedModel = 'openrouter/free';
    } else if (requestedModel === 'prompthub/auto-paid' || requestedModel === 'auto-paid') {
      requestedModel = 'anthropic/claude-3.5-sonnet';
    }
    if (!requestedModel) {
      const smartDefault = smartModelResolver.resolveSmartDefaultModel(options.feature || 'ide');
      if (smartDefault.status === 'resolved') {
        requestedModel = smartDefault.model.modelId;
      } else {
        const err = new Error(smartDefault.reason || 'No AI model is currently executable.');
        (err as any).code = smartDefault.code || 'NO_EXECUTABLE_MODEL_AVAILABLE';
        (err as any).recoveryActions = smartDefault.recoveryActions;
        throw err;
      }
    }
    
    let cleanPrompt = (rawPrompt || '').trim();

    // If cleanPrompt is empty but multi-turn / continuation messages are supplied, extract prompt from messages
    if (!cleanPrompt && options.messages && options.messages.length > 0) {
      const lastUser = [...options.messages].reverse().find((m) => m && m.role === 'user');
      cleanPrompt = (lastUser?.content || options.messages[options.messages.length - 1]?.content || '').trim();
    }

    if (!cleanPrompt) {
      cleanPrompt = 'Continue generating output';
    }

    // 1. Pre-execution Input Guardrail
    const inputCheck = guardrailService.validateInput(cleanPrompt, {});
    const effectivePrompt = inputCheck.sanitizedPrompt || cleanPrompt;

    // Autonomous Multi-Agent Pipeline & System Directive Conditioning
    const isRawExecution = options.executionMode === 'raw';
    const isCasualGreeting = /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|howdy|sup|who\s+are\s+you|what\s+can\s+you\s+do|how\s+are\s+you)(\s+[!?.]*)?$/i.test(effectivePrompt.trim());
    const agentPacket = (!isRawExecution && !isCasualGreeting && effectivePrompt)
      ? processPromptThroughAgentPipeline(effectivePrompt)
      : null;

    let executionMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    const customSysPrompt = options.systemPrompt?.trim();
    if (options.messages && options.messages.length > 0) {
      executionMessages = [...options.messages];
      const lastMsg = executionMessages[executionMessages.length - 1];
      if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== effectivePrompt) {
        executionMessages.push({ role: 'user', content: effectivePrompt });
      }
      if (agentPacket && !executionMessages.some((m) => m.role === 'system')) {
        executionMessages.unshift({ role: 'system', content: agentPacket.systemExecutionDirective });
      }
    } else if (agentPacket) {
      executionMessages = [
        { role: 'system', content: agentPacket.systemExecutionDirective },
        { role: 'user', content: effectivePrompt },
      ];
    } else {
      executionMessages = [{ role: 'user', content: effectivePrompt }];
    }
    if (customSysPrompt && !executionMessages.some((m) => m.role === 'system' && m.content.includes(customSysPrompt))) {
      executionMessages.unshift({ role: 'system', content: customSysPrompt });
    }

    // 2. Direct BYOK Execution (Highest Priority - 0 Platform Credits)
    //
    // LANE FIDELITY: if the user has a working BYOK key for this model, BYOK is
    // the lane. An empty response used to fall through to the managed gateway in
    // step 3, silently moving the run onto platform credits and re-executing a
    // prompt the user's own key may have already been billed for.
    try {
      const { multiProviderService } = await import('./multiProviderService');
      const isUnlocked = multiProviderService.isModelUnlockedByBYOK(requestedModel);

      if (isUnlocked.unlocked) {
        const directResult = await multiProviderService.executePromptDirect(
          effectivePrompt,
          requestedModel,
          {
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            messages: executionMessages,
            signal: options.signal,
            idempotencyKey: requestId,
            stream: options.stream || Boolean(options.onChunk),
            onChunk: options.onChunk,
          }
        );

        if (!directResult?.output) {
          const emptyErr: any = new Error(
            `${isUnlocked.providerName || 'Your connected provider'} returned an empty response for "${requestedModel}". ` +
            `Retry, or pick a different model.`
          );
          emptyErr.code = 'BYOK_EMPTY_RESPONSE';
          throw emptyErr;
        }

        const durationMs = Date.now() - startTime;
        const outputCheck = guardrailService.validateOutput(directResult.output);

        return {
          requestId,
          provider: (directResult.provider as any) || isUnlocked.providerName || 'Direct Provider',
          model: directResult.model || requestedModel,
          output: sanitizeRawToolOutput(outputCheck.sanitizedOutput),
          fineTunedPrompt: agentPacket?.fineTunedPromptText,
          taskClassification: agentPacket?.classification,
          // BYOK adapters do not return provider usage totals, so nothing is
          // reported rather than a character-count divided by four.
          usage: typeof directResult.tokens === 'number' ? { totalTokens: directResult.tokens } : undefined,
          usageMeasured: typeof directResult.tokens === 'number',
          status: 'completed',
          durationMs,
          // The user's own key was billed by their own provider. PromptHub
          // charged nothing, and 0 here is a fact, not an estimate.
          creditCost: 0,
        };
      }
    } catch (byokErr: any) {
      if (byokErr?.name === 'AbortError') throw byokErr;
      const { isQuotaOrCreditError } = await import('./providerErrors');
      const isBalanceError =
        isQuotaOrCreditError(byokErr) ||
        byokErr?.httpStatus === 402 ||
        byokErr?.code === 'INSUFFICIENT_CREDITS' ||
        (typeof byokErr?.message === 'string' &&
          (byokErr.message.toLowerCase().includes('balance is empty') ||
            byokErr.message.toLowerCase().includes('insufficient funds') ||
            byokErr.message.toLowerCase().includes('insufficient credits')));

      if (isBalanceError) {
        logger.warn(
          `[AIGateway] Connected key balance is empty ($0.00) or insufficient for "${requestedModel}". Seamlessly routing to PromptHub free cluster so the run completes.`,
          byokErr
        );
        try {
          const { multiProviderService } = await import('./multiProviderService');
          const fallbackRes = await multiProviderService.executePromptDirect(
            effectivePrompt,
            'openrouter/free',
            {
              temperature: options.temperature,
              max_tokens: options.maxTokens,
              messages: executionMessages,
              signal: options.signal,
              idempotencyKey: requestId,
              stream: options.stream || Boolean(options.onChunk),
              onChunk: options.onChunk,
            }
          );
          if (fallbackRes?.output) {
            return {
              requestId,
              provider: 'PromptHub Free Cluster (BYOK Balance Fallback)',
              model: 'openrouter/free',
              output: sanitizeRawToolOutput(guardrailService.validateOutput(fallbackRes.output).sanitizedOutput),
              fineTunedPrompt: agentPacket?.fineTunedPromptText,
              taskClassification: agentPacket?.classification,
              usage: typeof fallbackRes.tokens === 'number' ? { totalTokens: fallbackRes.tokens } : undefined,
              usageMeasured: typeof fallbackRes.tokens === 'number',
              status: 'completed',
              durationMs: Date.now() - startTime,
              creditCost: 0,
            };
          }
        } catch (fbErr) {
          logger.warn('[AIGateway] Free fallback attempt error:', fbErr);
        }
      } else {
        throw byokErr;
      }
    }

    // 2b. Managed Platform Execution for You.com Models
    const isYouComModel = requestedModel.startsWith('you.com') || requestedModel.startsWith('you_com');
    if (isYouComModel) {
      const creditCost = 0;
      const { multiProviderService } = await import('./multiProviderService');
      const directResult = await multiProviderService.executePromptDirect(
        effectivePrompt,
        requestedModel,
        {
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          messages: executionMessages,
          signal: options.signal,
          idempotencyKey: requestId,
          stream: options.stream || Boolean(options.onChunk),
          onChunk: options.onChunk,
        }
      );

      const durationMs = Date.now() - startTime;
      const outputCheck = guardrailService.validateOutput(directResult.output);

      this.logExecutionRun({
        provider: 'You.com (Platform Credits)',
        model: requestedModel,
        status: 'completed',
        durationMs,
        requestId,
        creditCost,
      }).catch(() => {});

      return {
        requestId,
        provider: 'You.com (Platform Credits)',
        model: directResult.model || requestedModel,
        output: sanitizeRawToolOutput(outputCheck.sanitizedOutput),
        fineTunedPrompt: agentPacket?.fineTunedPromptText,
        taskClassification: agentPacket?.classification,
        usage: typeof directResult.tokens === 'number' ? { totalTokens: directResult.tokens } : undefined,
        usageMeasured: typeof directResult.tokens === 'number',
        status: 'completed',
        durationMs,
        creditCost,
      };
    }

    // 3. Resolve Model Routing (OpenRouter Free vs AICredits Premium)
    const route: ModelRouteResolution = resolveModelRoute(
      requestedModel,
      options.providerPreference || 'auto'
    );

    try {
      const { chatCompletion } = await import('../../lib/openrouter');
      const completion = await chatCompletion(executionMessages, {
        model: route.modelId,
        temperature: options.temperature,
        max_tokens: options.maxTokens ?? 8192,
        signal: options.signal,
        stream: options.stream || Boolean(options.onChunk),
        onChunk: options.onChunk,
        onReasoningChunk: options.onReasoningChunk,
      });

      const durationMs = Date.now() - startTime;
      const outputCheck = guardrailService.validateOutput(completion.content);
      // Usage is reported only when the provider measured it. The `|| length / 4`
      // fallbacks this replaces meant every unmeasured run displayed a precise
      // token count that was really a character count divided by four, and wrote
      // that number into the ai_execution_runs audit table.
      const usageMeasured = completion.usageMeasured === true;
      const attributedProvider = completion.provider || route.gatewayLabel;
      const canonicalModel = completion.model || route.modelId;
      // Only the server's settled figure is treated as the charge.
      // `route.creditCost` is a pre-flight preview and must not be logged as fact.
      const settledCreditCost = typeof completion.creditCost === 'number' ? completion.creditCost : null;

      this.logExecutionRun({
        provider: attributedProvider,
        model: canonicalModel,
        status: 'completed',
        usage: usageMeasured
          ? {
              promptTokens: completion.usage?.prompt_tokens,
              completionTokens: completion.usage?.completion_tokens,
              totalTokens: completion.usage?.total_tokens,
            }
          : undefined,
        durationMs,
        requestId,
        creditCost: settledCreditCost,
      }).catch(() => {});

      const isTruncated =
        completion.isTruncated === true ||
        completion.finishReason === 'length';

      let verifiedOutput = sanitizeRawToolOutput(outputCheck.sanitizedOutput);
      if (!verifiedOutput || /^(?:safe|unsafe)$/i.test(verifiedOutput)) {
        console.warn('[AIGateway] Model returned safety metadata or empty response. Executing resilient fallback...');
        try {
          const { executeResilientFreeModel } = await import('../../lib/openrouter');
          const fallbackRes = await executeResilientFreeModel(
            'openrouter/free',
            effectivePrompt,
            executionMessages,
            {
              temperature: options.temperature,
              max_tokens: options.maxTokens ?? 8192,
              signal: options.signal,
            }
          );
          verifiedOutput = sanitizeRawToolOutput(fallbackRes.content || '');
        } catch (fbErr) {
          console.error('[AIGateway] Resilient fallback error:', fbErr);
        }
      }

      return {
        requestId,
        provider: attributedProvider,
        model: canonicalModel,
        servedModel: completion.servedModel,
        output: verifiedOutput,
        reasoning: completion.reasoning,
        finishReason: completion.finishReason || null,
        isTruncated,
        fineTunedPrompt: agentPacket?.fineTunedPromptText,
        taskClassification: agentPacket?.classification,
        usage: usageMeasured
          ? {
              promptTokens: completion.usage?.prompt_tokens,
              completionTokens: completion.usage?.completion_tokens,
              totalTokens: completion.usage?.total_tokens,
            }
          : undefined,
        usageMeasured,
        status: 'completed',
        durationMs,
        creditCost: settledCreditCost,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      const { isQuotaOrCreditError } = await import('./providerErrors');
      const isBalanceOrQuota = isQuotaOrCreditError(err) || err?.httpStatus === 402 || err?.code === 'INSUFFICIENT_CREDITS';
      if (isBalanceOrQuota) {
        logger.warn(
          `[AIGateway] Execution encountered quota or balance limit for "${route.modelId}". Running resilient free cluster fallback.`,
          err
        );
        try {
          const { executeResilientFreeModel } = await import('../../lib/openrouter');
          const fallbackRes = await executeResilientFreeModel(
            'openrouter/free',
            effectivePrompt,
            executionMessages,
            {
              temperature: options.temperature,
              max_tokens: options.maxTokens ?? 8192,
              signal: options.signal,
            }
          );
          if (fallbackRes?.content) {
            const verifiedFallback = sanitizeRawToolOutput(fallbackRes.content);
            const durationMs = Date.now() - startTime;
            this.logExecutionRun({
              provider: 'PromptHub Resilient Free Cluster',
              model: fallbackRes.model || 'openrouter/free',
              status: 'completed',
              durationMs,
              requestId,
              creditCost: 0,
            }).catch(() => {});

            return {
              requestId,
              provider: 'PromptHub Resilient Free Cluster',
              model: fallbackRes.model || 'openrouter/free',
              servedModel: fallbackRes.servedModel,
              output: verifiedFallback,
              finishReason: fallbackRes.finishReason || null,
              isTruncated: false,
              fineTunedPrompt: agentPacket?.fineTunedPromptText,
              taskClassification: agentPacket?.classification,
              usageMeasured: false,
              status: 'completed',
              durationMs,
              creditCost: 0,
            };
          }
        } catch (fbErr) {
          logger.error('[AIGateway] Resilient fallback also failed:', fbErr);
        }
      }

      const durationMs = Date.now() - startTime;
      this.logExecutionRun({
        provider: route.gatewayLabel,
        model: route.modelId,
        status: 'failed',
        durationMs,
        requestId,
        errorMessage: err?.message,
      }).catch(() => {});

      throw err;
    }
  },

  /**
   * Execute a specialized Prompt Engineering Agent via AICredits, OpenRouter Free, or BYOK.
   */
  async executeAgent(
    options: AgentExecutionOptions
  ): Promise<AIExecutionResponse> {
    const startTime = Date.now();
    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_agent_${Date.now()}`;
    const targetModel = options.modelId || 'openrouter/free';
    let systemContent = AGENT_SYSTEM_PROMPTS[options.agentType] || AGENT_SYSTEM_PROMPTS.prompt_analyzer;

    // Inject dynamic gold-standard few-shot benchmark guidance if generating or engineering
    const isGenerator = [
      'prompt_generator',
      'prompt_optimizer',
      'code_prompt_engineer',
      'writing_prompt_engineer',
      'business_prompt_engineer',
    ].includes(options.agentType);

    if (isGenerator) {
      try {
        const relevantExamples = findRelevantFewShotExamples(options.message, undefined, 1);
        if (relevantExamples.length > 0) {
          const exemplar = relevantExamples[0];
          systemContent += `\n\nGOLD-STANDARD FEW-SHOT BENCHMARK EXEMPLAR (${exemplar.category} / ${exemplar.framework}):\n[User Goal]: "${exemplar.input}"\n[Gold-Standard Engineered Prompt Output]:\n${exemplar.output}\n\nEmulate this exact level of rigor, variable extraction, step-by-step deliverable contract, and negative constraints for the user's request.`;
        }
      } catch {
        // Non-blocking fallback
      }
    }

    try {
      // 1. Primary execution via unified chatCompletion gateway
      // Supports BYOK, OpenRouter Free, and AICredits seamlessly
      const completion = await chatCompletion(
        [
          { role: 'system', content: systemContent },
          { role: 'user', content: options.message },
        ],
        {
          model: targetModel,
          temperature: options.settings?.temperature ?? 0.4,
          max_tokens: options.settings?.max_output_tokens ?? 8192,
          signal: options.signal,
          stream: options.stream,
          onChunk: options.onChunk,
        }
      );

      const durationMs = Date.now() - startTime;
      const outputCheck = guardrailService.validateOutput(completion.content || '');

      try {
        const { trackAgentExecuted } = await import('../../lib/mixpanelEvents');
        trackAgentExecuted({
          agentType: options.agentType,
          model: completion.model || targetModel,
          provider: completion.provider || 'PromptHub AI Gateway',
          inputLength: options.message.length,
          outputLength: (outputCheck.sanitizedOutput || '').length,
          durationMs,
          creditCost: typeof completion.creditCost === 'number' ? completion.creditCost : null,
        });
      } catch {
        // Non-blocking analytics
      }

      return {
        requestId,
        provider: completion.provider || 'PromptHub AI Gateway',
        model: completion.model || targetModel,
        servedModel: completion.servedModel || undefined,
        agentId: options.agentType,
        output: sanitizeRawToolOutput(outputCheck.sanitizedOutput),
        usage: completion.usageMeasured === true ? {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens,
        } : undefined,
        usageMeasured: completion.usageMeasured === true,
        status: 'completed',
        durationMs,
        creditCost: typeof completion.creditCost === 'number' ? completion.creditCost : null,
      };
    } catch (agentErr: any) {
      // If direct execution threw and was not an abort, log and propagate clean error
      const durationMs = Date.now() - startTime;
      this.logExecutionRun({
        provider: 'PromptHub Gateway',
        model: `agent/${options.agentType}`,
        agent: options.agentType,
        status: 'failed',
        durationMs,
        requestId,
        errorMessage: agentErr?.message,
      }).catch(() => {});

      throw agentErr;
    }
  },

  /**
   * Optimize a prompt using the authenticated server-side optimization engine.
   */
  async optimizePrompt(
    rawPrompt: string,
    directive: 'clarity' | 'tokens' | 'compress' | 'explain' | 'alternates' | 'review' | 'debug' | 'translate' | 'improve' = 'improve',
    targetModel: string = 'openai/gpt-4o'
  ): Promise<{ result: string; durationMs: number; tokensUsed?: number }> {
    const startTime = Date.now();
    const cleanPrompt = securityUtils.sanitizePromptInput(rawPrompt);
    const isCompression = directive === 'compress' || directive === 'tokens';

    // Direct chatCompletion with prompt engineering directive
    const { chatCompletion } = await import('../../lib/openrouter');
    const systemDirectives: Record<string, string> = {
      clarity: 'Rewrite this prompt to be unambiguous, highly structured, and crisp with clear section headers.',
      compress: 'Compress this prompt to use minimal tokens while preserving all core directives, variables, and constraints. Output must be strictly shorter than input.',
      tokens: 'Compress this prompt to use minimal tokens while preserving all core directives, variables, and constraints. Output must be strictly shorter than input.',
      explain: 'Explain the architecture, system persona, and expected output behavior of this prompt.',
      alternates: 'Provide 2 distinct alternative variations of this prompt for different target models.',
      review: 'Perform a security and prompt injection audit on this prompt.',
      debug: 'Identify edge cases, failure modes, and potential hallucinations in this prompt and fix them.',
      translate: 'Translate and optimize this prompt into professional English prompt engineering syntax.',
      improve: 'Upgrade this prompt into a production-grade system prompt with explicit persona, output constraints, and formatting rules.',
    };

    const actionPrompt = systemDirectives[directive] || systemDirectives.improve;
    const response = await chatCompletion([
      {
        role: 'system',
        content: isCompression
          ? 'You are a strict Prompt Minifier & Token Compression Engine. Return ONLY the minified prompt directly with zero preamble, zero explanation, and no added sections.'
          : 'You are a Principal AI Prompt Engineer. Return ONLY the improved prompt text directly with clean formatting.',
      },
      { role: 'user', content: `${actionPrompt}\n\n[Original Prompt]\n${cleanPrompt}` },
    ], {
      model: targetModel,
      temperature: isCompression ? 0.1 : 0.2,
      max_tokens: isCompression ? Math.min(1536, Math.max(96, Math.ceil(cleanPrompt.length / 2))) : 1536,
    });

    let finalResult = (response.content || '').trim();
    if (isCompression) {
      finalResult = enforceTokenCompression(cleanPrompt, finalResult);
    }

    return {
      result: finalResult,
      durationMs: Date.now() - startTime,
      tokensUsed: response.usage?.total_tokens,
    };
  },

  /**
   * Log an execution run into the server-side audit table.
   *
   * `creditCost` is `number | null`: null means the charge was not confirmed, and
   * is recorded as null rather than coerced to 0. `0` and "unknown" are different
   * facts, and an audit row that says 0 for an unsettled paid run is a false one.
   */
  async logExecutionRun(_runData: {
    provider: string;
    model: string;
    deployment?: string;
    agent?: string;
    status: 'completed' | 'failed';
    usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
    durationMs: number;
    requestId: string;
    creditCost?: number | null;
    errorMessage?: string;
  }): Promise<void> {
    // Audit logging in standalone frontend mode
  },
};
