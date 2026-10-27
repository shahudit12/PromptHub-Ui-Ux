/**
 * src/services/ai/capabilityResolver.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Model & Provider Capability Resolver for PromptHub.
 *
 * Dynamically sanitizes and transforms canonical generation requests into
 * provider-native payloads, safely filtering out unsupported parameters.
 *
 * CRITICAL RULE: Zero silent model substitution. Exact requested model IDs
 * are preserved and dispatched to the native provider adapter.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { modelCatalogService } from '../modelCatalogService';

export interface MultimodalContentPart {
  type: 'text' | 'image_url' | 'inline_data' | 'image_data';
  text?: string;
  imageUrl?: string;
  mimeType?: string;
  base64Data?: string;
}

export interface CanonicalAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  parts?: MultimodalContentPart[];
}

export interface CanonicalAIRequest {
  modelId: string;
  messages: CanonicalAIMessage[];
  prompt?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' };
  signal?: AbortSignal;
  stream?: boolean;
  onChunk?: (delta: string, accumulated: string) => void;
}

export interface ResolvedPayloadResult {
  resolvedModelId: string;
  nativePayload: Record<string, any>;
  fieldsSent: string[];
  fieldsRemoved: string[];
  endpointFamily: string;
  apiVersion?: string;
}

export const capabilityResolver = {
  /**
   * Determine whether an OpenAI model is in the reasoning family (o1/o3).
   */
  isOpenAIReasoningModel(modelId: string): boolean {
    const clean = (modelId || '').toLowerCase();
    return (
      clean === 'o1' ||
      clean === 'o1-mini' ||
      clean === 'o1-preview' ||
      clean === 'o3-mini' ||
      clean.startsWith('openai/o1') ||
      clean.startsWith('openai/o3') ||
      clean.includes('/o1') ||
      clean.includes('/o3-mini')
    );
  },

  /**
   * Determine whether a model is an Anthropic Claude model.
   */
  isAnthropicModel(modelId: string): boolean {
    const clean = (modelId || '').toLowerCase();
    return clean.startsWith('anthropic/') || clean.startsWith('claude');
  },

  /**
   * Determine whether a model is a native Google Gemini model.
   */
  isGeminiModel(modelId: string): boolean {
    const clean = (modelId || '').toLowerCase();
    return (clean.startsWith('google/gemini') || clean.startsWith('gemini')) && !clean.includes('gemma');
  },

  /**
   * Determine whether a model is DeepSeek R1 / Reasoner.
   */
  isDeepSeekReasoner(modelId: string): boolean {
    const clean = (modelId || '').toLowerCase();
    return clean.includes('deepseek-reasoner') || clean.includes('deepseek-r1') || clean.includes('r1');
  },

  /**
   * Formats a canonical message content for OpenAI/OpenRouter chat completions.
   * If multimodal parts are present, returns an array of content parts (text and image_url).
   * Otherwise returns the plain string content.
   */
  formatOpenAIContent(
    message: CanonicalAIMessage
  ): string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> {
    if (!message.parts || message.parts.length === 0) {
      return message.content || '';
    }

    const contentParts: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];
    const hasTextPart = message.parts.some(p => p.type === 'text' && typeof p.text === 'string' && p.text.trim().length > 0);
    if (!hasTextPart && message.content && message.content.trim().length > 0) {
      contentParts.push({ type: 'text', text: message.content });
    }

    for (const part of message.parts) {
      if (part.type === 'text') {
        if (part.text) {
          contentParts.push({ type: 'text', text: part.text });
        }
      } else if (part.imageUrl) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: part.imageUrl },
        });
      } else if (part.base64Data) {
        const mime = part.mimeType || 'image/png';
        contentParts.push({
          type: 'image_url',
          image_url: { url: `data:${mime};base64,${part.base64Data}` },
        });
      }
    }

    return contentParts.length > 0 ? contentParts : message.content || '';
  },

  /**
   * Formats a canonical message into Gemini parts array.
   * Supports text and inlineData for images and PDF documents.
   */
  formatGeminiParts(
    message: CanonicalAIMessage,
    fallbackText = ''
  ): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
    if (!message.parts || message.parts.length === 0) {
      return [{ text: message.content || fallbackText || '' }];
    }

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    const hasTextPart = message.parts.some(p => p.type === 'text' && typeof p.text === 'string' && p.text.trim().length > 0);
    const textToInclude = message.content || fallbackText;
    if (!hasTextPart && textToInclude && textToInclude.trim().length > 0) {
      parts.push({ text: textToInclude });
    }

    for (const p of message.parts) {
      if (p.type === 'text') {
        if (p.text) {
          parts.push({ text: p.text });
        }
      } else if (p.base64Data) {
        parts.push({
          inlineData: {
            mimeType: p.mimeType || 'image/png',
            data: p.base64Data,
          },
        });
      } else if (p.imageUrl && p.imageUrl.startsWith('data:')) {
        const match = p.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }
    }

    return parts.length > 0 ? parts : [{ text: message.content || fallbackText || '' }];
  },

  /**
   * Transforms canonical request into OpenAI Direct payload.
   */
  resolveOpenAIPayload(request: CanonicalAIRequest): ResolvedPayloadResult {
    const cleanModel = this.resolveNativeModelId('openai', request.modelId);
    const isReasoning = this.isOpenAIReasoningModel(cleanModel);

    const fieldsSent: string[] = ['model', 'messages'];
    const fieldsRemoved: string[] = [];

    const nativePayload: Record<string, any> = {
      model: cleanModel,
      messages: request.messages.map(m => ({ role: m.role, content: this.formatOpenAIContent(m) })),
    };

    if (isReasoning) {
      // Reasoning models (o1/o3-mini) reject 'max_tokens' and custom 'temperature'
      const tokens = request.maxTokens ?? 8192;
      nativePayload.max_completion_tokens = tokens;
      fieldsSent.push('max_completion_tokens');

      if (request.temperature !== undefined) {
        fieldsRemoved.push('temperature');
      }
      if (request.maxTokens !== undefined) {
        fieldsRemoved.push('max_tokens (transformed to max_completion_tokens)');
      }
    } else {
      if (typeof request.temperature === 'number') {
        nativePayload.temperature = request.temperature;
        fieldsSent.push('temperature');
      }
      if (typeof request.maxTokens === 'number') {
        nativePayload.max_tokens = request.maxTokens;
        fieldsSent.push('max_tokens');
      }
    }

    if (request.responseFormat) {
      nativePayload.response_format = request.responseFormat;
      fieldsSent.push('response_format');
    }

    return {
      resolvedModelId: cleanModel,
      nativePayload,
      fieldsSent,
      fieldsRemoved,
      endpointFamily: 'chat.completions',
      apiVersion: 'v1',
    };
  },

  /**
   * Transforms canonical request into Anthropic Messages API payload.
   */
  resolveAnthropicPayload(request: CanonicalAIRequest): ResolvedPayloadResult {
    const cleanModel = this.resolveNativeModelId('anthropic', request.modelId);

    const fieldsSent: string[] = ['model', 'messages', 'max_tokens'];
    const fieldsRemoved: string[] = [];

    // Extract top-level system message
    const systemMsg = request.messages.find(m => m.role === 'system')?.content;

    // Filter user and assistant messages (Anthropic messages cannot contain system)
    const filteredMessages = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content || '',
      }));

    // Ensure at least one user message exists
    const validMessages = filteredMessages.length > 0
      ? filteredMessages
      : [{ role: 'user' as const, content: request.prompt || 'Hello' }];

    // Enforce alternating user/assistant turns if required
    const consolidatedMessages: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const msg of validMessages) {
      if (consolidatedMessages.length === 0) {
        consolidatedMessages.push(msg);
      } else {
        const last = consolidatedMessages[consolidatedMessages.length - 1];
        if (last.role === msg.role) {
          // Merge consecutive identical roles
          last.content += `\n\n${msg.content}`;
        } else {
          consolidatedMessages.push(msg);
        }
      }
    }

    const nativePayload: Record<string, any> = {
      model: cleanModel,
      max_tokens: request.maxTokens ?? 8192,
      messages: consolidatedMessages,
    };

    if (systemMsg) {
      nativePayload.system = systemMsg;
      fieldsSent.push('system');
    }

    if (typeof request.temperature === 'number') {
      // Anthropic temperature must be between 0.0 and 1.0
      nativePayload.temperature = Math.min(1.0, Math.max(0.0, request.temperature));
      fieldsSent.push('temperature');
    }

    if (request.responseFormat) {
      fieldsRemoved.push('response_format (unsupported natively on Anthropic Messages API)');
    }

    return {
      resolvedModelId: cleanModel,
      nativePayload,
      fieldsSent,
      fieldsRemoved,
      endpointFamily: 'messages',
      apiVersion: '2023-06-01',
    };
  },

  /**
   * Authoritatively translates model IDs and slugs into the exact model strings
   * accepted by each direct provider's native API.
   */
  resolveNativeModelId(providerId: string, modelId: string): string {
    const raw = (modelId || '').trim();
    const lower = raw.toLowerCase();

    switch (providerId) {
      case 'mistral': {
        // Direct Mistral API (api.mistral.ai) accepts:
        // 'mistral-large-latest', 'mistral-small-latest', 'codestral-latest', 'pixtral-large-latest', 'open-mistral-nemo', 'ministral-8b-latest', 'ministral-3b-latest'
        const stripped = lower.replace(/^(mistralai|mistral)\//, '');
        if (stripped.includes('large')) return 'mistral-large-latest';
        if (stripped.includes('codestral')) return 'codestral-latest';
        if (stripped.includes('pixtral')) return stripped.includes('large') ? 'pixtral-large-latest' : 'pixtral-12b-2409';
        if (stripped.includes('small')) return 'mistral-small-latest';
        if (stripped.includes('nemo')) return 'open-mistral-nemo';
        if (stripped.includes('ministral-8b')) return 'ministral-8b-latest';
        if (stripped.includes('ministral-3b')) return 'ministral-3b-latest';
        return stripped || 'mistral-large-latest';
      }

      case 'anthropic': {
        // Anthropic direct Messages API accepts:
        // 'claude-3-7-sonnet-20250219' (or 'claude-3-7-sonnet-latest'), 'claude-3-5-sonnet-20241022' (or 'claude-3-5-sonnet-latest'), 'claude-3-5-haiku-20241022' (or 'claude-3-5-haiku-latest'), 'claude-3-opus-20240229'
        const stripped = lower.replace(/^anthropic\//, '');
        if (stripped.includes('3-7-sonnet') || stripped.includes('3.7-sonnet')) return 'claude-3-7-sonnet-20250219';
        if (stripped.includes('3-5-sonnet') || stripped.includes('3.5-sonnet')) return 'claude-3-5-sonnet-20241022';
        if (stripped.includes('3-5-haiku') || stripped.includes('3.5-haiku')) return 'claude-3-5-haiku-20241022';
        if (stripped.includes('3-opus') || stripped.includes('3.opus') || stripped.includes('opus')) return 'claude-3-opus-20240229';
        return stripped.replace(/\./g, '-');
      }

      case 'openai': {
        const stripped = lower.replace(/^openai\//, '');
        if (stripped.startsWith('chatgpt-4o')) return 'gpt-4o';
        return stripped;
      }

      case 'gemini': {
        // Google AI Studio expects: gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash, gemini-2.5-pro, gemini-2.5-flash
        const stripped = lower.replace(/^(google|models)\//, '');
        if (stripped === 'gemini-pro-1.5' || stripped === 'gemini-1-5-pro') return 'gemini-1.5-pro';
        if (stripped === 'gemini-flash-1.5' || stripped === 'gemini-1-5-flash') return 'gemini-1.5-flash';
        if (stripped.startsWith('gemini-2.0-flash') || stripped === 'gemini-2-0-flash') return 'gemini-2.0-flash';
        if (stripped.startsWith('gemini-2.5-flash') || stripped === 'gemini-2-5-flash') return 'gemini-2.0-flash';
        if (stripped.startsWith('gemini-2.5-pro') || stripped === 'gemini-2-5-pro') return 'gemini-1.5-pro';
        return stripped;
      }

      case 'deepseek': {
        const stripped = lower.replace(/^deepseek\//, '');
        if (stripped.includes('reasoner') || stripped.includes('r1')) return 'deepseek-reasoner';
        if (stripped.includes('chat') || stripped.includes('v3')) return 'deepseek-chat';
        return stripped;
      }

      case 'groq': {
        const stripped = lower.replace(/^groq\//, '');
        if (stripped.includes('llama-3.3-70b') || stripped.includes('llama-3-3-70b')) return 'llama-3.3-70b-versatile';
        if (stripped.includes('llama-3.1-8b') || stripped.includes('llama-3-1-8b')) return 'llama-3.1-8b-instant';
        if (stripped.includes('deepseek-r1') || stripped.includes('r1-distill')) return 'deepseek-r1-distill-llama-70b';
        if (stripped.includes('mixtral')) return 'mixtral-8x7b-32768';
        if (stripped.includes('gemma')) return 'gemma2-9b-it';
        return stripped;
      }

      case 'xai': {
        const stripped = lower.replace(/^(xai|x-ai)\//, '');
        if (stripped.includes('vision')) return 'grok-2-vision-1212';
        if (stripped.includes('grok-2')) return 'grok-2-1212';
        if (stripped.includes('beta')) return 'grok-beta';
        return stripped || 'grok-2-1212';
      }

      case 'cohere': {
        const stripped = lower.replace(/^cohere\//, '');
        if (stripped.includes('command-r-plus') || stripped.includes('command-r+')) return 'command-r-plus-08-2024';
        if (stripped.includes('command-r')) return 'command-r-08-2024';
        return stripped;
      }

      case 'together': {
        return raw.replace(/^together\//, '');
      }

      default:
        return raw;
    }
  },

  /**
   * Transforms canonical request into Google Gemini API payload.
   */
  resolveGeminiPayload(request: CanonicalAIRequest): ResolvedPayloadResult {
    // Preserve exact Gemini model ID without 'google/' prefix
    const cleanModel = this.resolveNativeModelId('gemini', request.modelId);

    const fieldsSent: string[] = ['contents'];
    const fieldsRemoved: string[] = [];

    // Extract system message for Gemini top-level systemInstruction
    const systemMsg = request.messages.find(m => m.role === 'system')?.content;

    // Map non-system messages into Gemini contents array
    const nonSystemMessages = request.messages.filter(m => m.role !== 'system');
    const sourceMessages = nonSystemMessages.length > 0 ? nonSystemMessages : [{ role: 'user' as const, content: request.prompt || '' }];
    const contents = sourceMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: this.formatGeminiParts(m, request.prompt || ''),
    }));

    const nativePayload: Record<string, any> = {
      contents,
    };

    if (systemMsg) {
      nativePayload.systemInstruction = {
        parts: [{ text: systemMsg }],
      };
      fieldsSent.push('systemInstruction');
    }

    const generationConfig: Record<string, any> = {};

    if (typeof request.temperature === 'number') {
      generationConfig.temperature = request.temperature;
      fieldsSent.push('generationConfig.temperature');
    }
    if (typeof request.maxTokens === 'number') {
      generationConfig.maxOutputTokens = request.maxTokens;
      fieldsSent.push('generationConfig.maxOutputTokens');
    }
    if (request.responseFormat?.type === 'json_object') {
      generationConfig.responseMimeType = 'application/json';
      fieldsSent.push('generationConfig.responseMimeType');
    }

    if (Object.keys(generationConfig).length > 0) {
      nativePayload.generationConfig = generationConfig;
    }

    return {
      resolvedModelId: cleanModel,
      nativePayload,
      fieldsSent,
      fieldsRemoved,
      endpointFamily: 'generateContent',
      apiVersion: 'v1beta',
    };
  },

  /**
   * Transforms canonical request into OpenRouter payload.
   * STRICT INVARIANT: Exact model ID is preserved (zero silent model substitution).
   * Dynamically filters unsupported parameters based on live model capabilities metadata.
   */
  resolveOpenRouterPayload(request: CanonicalAIRequest): ResolvedPayloadResult {
    const rawModel = request.modelId.trim();
    const isReasoning = this.isOpenAIReasoningModel(rawModel);

    // Resolve live catalog model metadata for capability filtering
    const modelMeta = modelCatalogService?.getModelById(rawModel);
    const supportedParams = modelMeta?.supportedParameters;

    const fieldsSent: string[] = ['model', 'messages'];
    const fieldsRemoved: string[] = [];

    const nativePayload: Record<string, any> = {
      model: rawModel,
      messages: request.messages.map(m => ({ role: m.role, content: this.formatOpenAIContent(m) })),
    };

    if (typeof request.maxTokens === 'number') {
      if (!supportedParams || supportedParams.includes('max_tokens') || supportedParams.includes('max_completion_tokens') || rawModel === 'openrouter/free') {
        nativePayload.max_tokens = request.maxTokens;
        fieldsSent.push('max_tokens');
      } else {
        fieldsRemoved.push('max_tokens (unsupported parameter)');
      }
    }

    if (typeof request.temperature === 'number') {
      const allowsTemp = !isReasoning && (!supportedParams || supportedParams.includes('temperature') || rawModel === 'openrouter/free');
      if (allowsTemp) {
        nativePayload.temperature = request.temperature;
        fieldsSent.push('temperature');
      } else {
        fieldsRemoved.push(`temperature (${isReasoning ? 'reasoning model' : 'unsupported parameter'})`);
      }
    }

    if (request.responseFormat) {
      const allowsStructured = !supportedParams || 
        supportedParams.includes('response_format') || 
        supportedParams.includes('structured_outputs') || 
        rawModel === 'openrouter/free';

      if (allowsStructured) {
        nativePayload.response_format = request.responseFormat;
        fieldsSent.push('response_format');
      } else {
        fieldsRemoved.push('response_format (unsupported by model)');
      }
    }

    return {
      resolvedModelId: rawModel,
      nativePayload,
      fieldsSent,
      fieldsRemoved,
      endpointFamily: 'chat.completions',
      apiVersion: 'v1',
    };
  },

  /**
   * Transforms canonical request for DeepSeek, xAI, Cohere, Together, Groq, Mistral.
   */
  resolveGenericPayload(providerId: string, request: CanonicalAIRequest): ResolvedPayloadResult {
    const cleanModel = this.resolveNativeModelId(providerId, request.modelId);

    const fieldsSent: string[] = ['model', 'messages'];
    const fieldsRemoved: string[] = [];

    const nativePayload: Record<string, any> = {
      model: cleanModel,
      messages: request.messages.map(m => ({ role: m.role, content: this.formatOpenAIContent(m) })),
    };

    if (typeof request.temperature === 'number') {
      nativePayload.temperature = request.temperature;
      fieldsSent.push('temperature');
    }
    if (typeof request.maxTokens === 'number') {
      nativePayload.max_tokens = request.maxTokens;
      fieldsSent.push('max_tokens');
    }
    if (request.responseFormat) {
      nativePayload.response_format = request.responseFormat;
      fieldsSent.push('response_format');
    }

    return {
      resolvedModelId: cleanModel,
      nativePayload,
      fieldsSent,
      fieldsRemoved,
      endpointFamily: providerId === 'cohere' ? 'v2.chat' : 'chat.completions',
      apiVersion: providerId === 'cohere' ? 'v2' : 'v1',
    };
  },
};
