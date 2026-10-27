/**
 * src/services/ai/guardrails.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified Runtime Guardrails & Safety Screening Pipeline for PromptHub.
 * Shared across all AI providers (OpenAI, Anthropic, Google Gemini, OpenRouter, Groq, etc.)
 * 
 * Pipeline:
 * User Input → Validation → Normalization → Safety Screening → Provider Request 
 * → Response Validation → Output Safety Check → UI
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { securityUtils } from '../../utils/security.ts';

export interface GuardrailInputOptions {
  maxCharLength?: number;
  allowMarkdown?: boolean;
  strictDelimiterCheck?: boolean;
}

export interface GuardrailOutputOptions {
  expectedFormat?: 'json' | 'text' | 'markdown';
  maxOutputLength?: number;
  maskApiKeyLeaks?: boolean;
}

export interface GuardrailValidationResult {
  isValid: boolean;
  sanitizedPrompt: string;
  warnings: string[];
  error?: string;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface GuardrailOutputResult {
  isValid: boolean;
  sanitizedOutput: string;
  warnings: string[];
  error?: string;
}

// Known common API key patterns to prevent accidental model leakage / reflection
const API_KEY_PATTERNS = [
  /sk-proj-[a-zA-Z0-9_-]{20,}/g,
  /sk-[a-zA-Z0-9_-]{20,}/g,
  /sk-ant-[a-zA-Z0-9_-]{20,}/g,
  /sk-or-v1-[a-zA-Z0-9_-]{20,}/g,
  /AIza[a-zA-Z0-9_-]{30,}/g,
  /gsk_[a-zA-Z0-9_-]{20,}/g,
];

export const guardrailService = {
  /**
   * Pre-execution Input Guardrail:
   * Validates payload sizes, normalizes control characters, strips null bytes,
   * and screens for dangerous delimiter breakouts without destroying legitimate developer prompts.
   */
  validateInput(
    rawPrompt: string,
    variables: Record<string, string> = {},
    options: GuardrailInputOptions = {}
  ): GuardrailValidationResult {
    const maxLen = options.maxCharLength || 100000;
    const warnings: string[] = [];
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';

    if (!rawPrompt || !rawPrompt.trim()) {
      return {
        isValid: true,
        sanitizedPrompt: rawPrompt || '',
        warnings: ['Prompt content is empty.'],
        riskLevel: 'Low',
      };
    }

    // 1. Payload Size Check - Soft clamp rather than hard blocking
    let sanitized = securityUtils.sanitizePromptInput(rawPrompt);
    if (sanitized.length > maxLen) {
      warnings.push(`Prompt exceeds maximum character length of ${maxLen}; payload clamped.`);
      sanitized = sanitized.slice(0, maxLen);
    }

    // 2. Control Character & Null Byte Sanitization (Preserving Markdown / JSON / Code) - already performed during sanitization above

    // 3. Scan for High-Risk Delimiter Breakouts in User Variables
    Object.entries(variables).forEach(([key, val]) => {
      if (val && typeof val === 'string') {
        if (val.length > 50000) {
          warnings.push(`Variable '{{${key}}}' exceeds 50k characters.`);
          riskLevel = 'Medium';
        }
        // Detect suspicious role override prefixes in user variables
        if (/^(system|assistant|admin)\s*:\s*/i.test(val.trim())) {
          warnings.push(`Variable '{{${key}}}' starts with a role prefix that may override prompt behavior.`);
          riskLevel = 'Medium';
        }
      }
    });

    return {
      isValid: true,
      sanitizedPrompt: sanitized,
      warnings,
      riskLevel,
    };
  },

  /**
   * Post-execution Output Guardrail:
   * Validates response integrity, checks structured output syntax, and masks any reflected secrets.
   */
  validateOutput(
    rawOutput: string,
    options: GuardrailOutputOptions = {}
  ): GuardrailOutputResult {
    const warnings: string[] = [];

    if (rawOutput === undefined || rawOutput === null) {
      return {
        isValid: false,
        sanitizedOutput: '',
        warnings: ['Output is empty or null.'],
        error: 'Model returned an empty response.',
      };
    }

    let sanitized = String(rawOutput);

    // 1. Mask any accidentally reflected API key patterns (strictly stateless)
    if (options.maskApiKeyLeaks !== false) {
      API_KEY_PATTERNS.forEach(pattern => {
        const testRegex = new RegExp(pattern.source, 'i');
        const replaceRegex = new RegExp(pattern.source, 'gi');
        if (testRegex.test(sanitized)) {
          warnings.push('Detected potential API key in output; masked for safety.');
          sanitized = sanitized.replace(replaceRegex, '••••[REDACTED_API_KEY]••••');
        }
      });
    }

    // 2. Format validation if JSON was expected
    if (options.expectedFormat === 'json') {
      try {
        const cleanJson = sanitized.replace(/```json\s*|```/g, '').trim();
        JSON.parse(cleanJson);
      } catch {
        warnings.push('Output was expected to be JSON but failed standard JSON parsing.');
      }
    }

    // 3. Strip rogue tool-call wrapper tokens leaked by upstream models
    if (sanitized.includes('<tool_call_start>') || sanitized.includes('<tool_call>') || /\[(?:write|call|run|execute)\(path=/i.test(sanitized)) {
      sanitized = sanitized
        .replace(/<tool_call_start>[\s\S]*?<tool_call_end>/gi, '')
        .replace(/<tool_call_start>[\s\S]*$/gi, '')
        .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
        .replace(/\[(?:write|call|run|execute)\(path=[^\]]+\]/gi, '')
        .trim();
      warnings.push('Stripped unexecuted tool-call wrapper tags from output.');
    }

    // 4. Strip rogue safety moderation echoes (e.g. from moderation models, Llama Guard, Nemotron Safety)
    const safetyHeaderRegex = /^(?:\s*(?:User|Assistant)?\s*Safety:\s*(?:safe|unsafe)\s*[\r\n]*)+/i;
    const safetyTrailingRegex = /(?:[\r\n]+\s*(?:User|Assistant)?\s*Safety:\s*(?:safe|unsafe)\s*)+$/i;
    if (safetyHeaderRegex.test(sanitized)) {
      sanitized = sanitized.replace(safetyHeaderRegex, '').trim();
      warnings.push('Stripped safety classifier preamble from output.');
    }
    if (safetyTrailingRegex.test(sanitized)) {
      sanitized = sanitized.replace(safetyTrailingRegex, '').trim();
      warnings.push('Stripped safety classifier suffix from output.');
    }

    // If output was purely safety classifier evaluation (e.g. "User Safety: safe" or "safe")
    const isOnlySafetyTag = /^(?:(?:User|Assistant)?\s*Safety:\s*(?:safe|unsafe)\s*)+$/i.test(String(rawOutput).trim()) || /^(?:safe|unsafe)$/i.test(sanitized);
    if (isOnlySafetyTag || !sanitized) {
      return {
        isValid: false,
        sanitizedOutput: '',
        warnings: [...warnings, 'Model returned only safety classification metadata instead of output.'],
        error: 'Model returned safety metadata instead of completion.',
      };
    }

    return {
      isValid: true,
      sanitizedOutput: sanitized,
      warnings,
    };
  }
};
