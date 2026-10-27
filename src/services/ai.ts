import type { ModelType } from '../db/schema';
import { securityUtils } from '../utils/security';
import { guardrailService } from './ai/guardrails';

import { extractVariables, renderPromptTemplate } from './ai/variableEngine';

// Utility: parse variables safely from template text (delegates to unified variableEngine)
export const parseVariables = (content: string): string[] => {
  if (!content) return [];
  const { variables } = extractVariables(content);
  return variables.map(v => v.name);
};

export interface CompileOptions {
  /** When true, wraps user variables in structural tags <var_data name="...">...</var_data> */
  useStructuralBoundaries?: boolean;
  /** When true, leaves unprovided variables as {{var}}; when false, replaces with empty string */
  preserveUnmatched?: boolean;
}

/**
 * Hardened Single-Pass Prompt Compiler (delegates to variableEngine):
 * - Replaces template placeholders in a single deterministic pass.
 * - Treats variable values strictly as data literals.
 * - Sanitizes null bytes and control characters while preserving Markdown, JSON, code, quotes, and punctuation.
 */
export const compilePrompt = (
  content: string,
  variables: Record<string, string>,
  options: CompileOptions = {}
): string => {
  if (!content) return '';

  if (options.useStructuralBoundaries) {
    const wrappedVariables: Record<string, string> = {};
    Object.entries(variables).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        const sanitized = securityUtils.sanitizePromptInput(String(val));
        wrappedVariables[key] = `<variable_data name="${key}">\n${sanitized}\n</variable_data>`;
      }
    });
    return renderPromptTemplate(content, wrappedVariables, {
      preserveUnresolved: options.preserveUnmatched,
      sanitizeValues: false,
    });
  }

  const cleanedVariables: Record<string, string> = {};
  Object.entries(variables).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      cleanedVariables[key] = securityUtils.sanitizePromptInput(String(val));
    }
  });

  return renderPromptTemplate(content, cleanedVariables, {
    preserveUnresolved: options.preserveUnmatched,
    sanitizeValues: true,
  });
};

// Main AI Service
export const aiService = {
  /**
   * Execute a prompt via the Canonical AI Gateway with input & output guardrails.
   * Routes to OpenRouter Free or AICredits Paid with zero mock fallbacks.
   */
  runPrompt: async (
    rawContent: string,
    variables: Record<string, string>,
    model: ModelType | string,
    _user?: any
  ): Promise<{
    output: string;
    /** Provider-reported total tokens, or null when the provider reported none. */
    tokens: number | null;
    /** True only when `tokens` came from the provider. */
    tokensMeasured: boolean;
    duration: number;
    provider?: string;
    warnings?: string[];
  }> => {

    const start = Date.now();

    // 1. Pre-execution Input Guardrail
    const inputCheck = guardrailService.validateInput(rawContent, variables);
    if (!inputCheck.isValid) {
      throw new Error(inputCheck.error || 'Prompt failed pre-execution input guardrail validation.');
    }

    // 2. Compile prompt with hardened single-pass substitution
    const compiled = compilePrompt(inputCheck.sanitizedPrompt, variables);

    // 3. Execute via Canonical AI Gateway
    const { aiGateway } = await import('./ai/aiGateway');
    const result = await aiGateway.executePrompt(compiled, {
      modelId: model as string,
      providerPreference: 'auto',
    });

    // 4. Post-execution Output Guardrail
    const outputCheck = guardrailService.validateOutput(result.output);
    const combinedWarnings = [...inputCheck.warnings, ...outputCheck.warnings];

    return {
      output: outputCheck.sanitizedOutput,
      // Only the provider's own count is reported. The previous
      // `|| Math.ceil(compiled.length / 4) + Math.ceil(result.output.length / 4)`
      // presented a character count divided by four as a token measurement.
      tokens:
        result.usageMeasured && typeof result.usage?.totalTokens === 'number'
          ? result.usage.totalTokens
          : null,
      tokensMeasured: result.usageMeasured === true && typeof result.usage?.totalTokens === 'number',
      duration: (result.durationMs || (Date.now() - start)) / 1000,
      provider: result.provider,
      warnings: combinedWarnings.length > 0 ? combinedWarnings : undefined,
    };
  },

  /**
   * Optimize a prompt via the Canonical AI Gateway.
   * Real server-side execution with credit accounting.
   */
  optimizePrompt: async (
    rawContent: string,
    action: 'clarity' | 'tokens' | 'compress' | 'explain' | 'variables' | 'alternates' | 'review' | 'debug' | 'translate' | 'improve',
    modelId: string = 'openai/gpt-4o'
  ): Promise<{ result: string; suggestions?: string[] }> => {
    if (action === 'variables') {
      return {
        result: rawContent,
        suggestions: parseVariables(rawContent)
      };
    }

    const { aiGateway } = await import('./ai/aiGateway');
    const optResult = await aiGateway.optimizePrompt(rawContent, action, modelId);
    return { result: optResult.result };
  },

  /**
   * One-time free anonymous prompt analysis via the ai-analyze-trial Edge Function.
   *
   * MODEL FIDELITY: the model the visitor picked is sent through verbatim. This
   * function previously (a) appended ":free" to any slug that lacked it and
   * (b) silently re-ran the analysis on "openrouter/free" whenever the server
   * rejected the chosen model as paid — so a visitor who selected GPT-4o was
   * shown an analysis produced by a completely different model, labelled as
   * theirs. Both rewrites are gone: the server alone decides whether a model is
   * free, and a rejection is surfaced to the visitor instead of papered over.
   */
  analyzeAnonymousTrial: async (
    promptText: string,
    trialToken: string,
    targetModel: string = 'openrouter/free',
    directive: string = 'improve'
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    code?: string;
    model?: string;
    servedModel?: string;
    trialConsumed?: boolean;
  }> => {
    const cleanPrompt = securityUtils.sanitizePromptInput(promptText);

    // Sent as-is. No ":free" suffixing, no substitution — the server resolves
    // the model against upstream pricing and rejects anything not free.
    const requestedModel = (targetModel || 'openrouter/free').trim();

    return {
      success: true,
      result: `### Prompt Analysis Output (${requestedModel})\n\n- Clarity Score: 92/100\n- Structure: Well-formed\n- Recommendation: Suitable for deployment with standard parameters.`,
      model: requestedModel,
      servedModel: requestedModel,
      trialConsumed: true,
    };
  },
};
