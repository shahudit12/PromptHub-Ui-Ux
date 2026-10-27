/**
 * src/services/ai/providerErrors.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical Normalized AI Error System & Classifier for PromptHub.
 * Standardizes upstream provider error codes, HTTP status codes, and raw responses
 * into actionable, user-friendly, and secure diagnostics.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type NormalizedAIErrorCode =
  // Authentication & Credentials
  | 'AUTH_INVALID_KEY'
  | 'AUTH_REVOKED_KEY'
  | 'AUTH_EXPIRED_KEY'
  | 'AUTH_KEY_RESTRICTION'
  | 'AUTH_WRONG_PROVIDER'
  | 'AUTH_MISSING'

  // Service Enablement & Configuration
  | 'API_NOT_ENABLED'
  | 'PROJECT_CONFIGURATION_ERROR'

  // Model Availability & Access
  | 'MODEL_NOT_FOUND'
  | 'MODEL_ACCESS_DENIED'
  | 'MODEL_DEPRECATED'
  | 'MODEL_UNAVAILABLE'
  | 'BATCH_ONLY_MODEL'

  // Billing & Quota
  | 'BILLING_REQUIRED'
  | 'INSUFFICIENT_CREDITS'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'PRIMARY_PROVIDER_CREDITS_EXHAUSTED'
  | 'MODEL_FALLBACK_UNAVAILABLE'

  // Request & Parameter Compatibility
  | 'INVALID_REQUEST'
  | 'UNSUPPORTED_PARAMETER'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'CONTENT_FILTER_TRIGGERED'

  // Provider Availability & Network
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_INTERNAL_ERROR'

  // PromptHub Internal Routing
  | 'BACKEND_ROUTING_ERROR'
  | 'UNKNOWN_PROVIDER_ERROR';

export interface ProviderErrorDetails {
  code: NormalizedAIErrorCode;
  message: string;
  provider: string;
  model?: string;
  httpStatus?: number;
  rawMessage?: string;
  remediationHint?: string;
  isRetryable?: boolean;
}

export class NormalizedAIError extends Error {
  public readonly code: NormalizedAIErrorCode;
  public readonly provider: string;
  public readonly model?: string;
  public readonly httpStatus?: number;
  public readonly rawMessage?: string;
  public readonly remediationHint?: string;
  public readonly isRetryable: boolean;

  constructor(details: ProviderErrorDetails) {
    super(details.message);
    this.name = 'NormalizedAIError';
    this.code = details.code;
    this.provider = details.provider;
    this.model = details.model;
    this.httpStatus = details.httpStatus;
    this.rawMessage = details.rawMessage;
    this.remediationHint = details.remediationHint;
    this.isRetryable = details.isRetryable ?? false;
  }

  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      provider: this.provider,
      model: this.model,
      httpStatus: this.httpStatus,
      rawMessage: this.rawMessage,
      remediationHint: this.remediationHint,
      isRetryable: this.isRetryable,
    };
  }
}

/**
 * Normalizes error responses from Google Gemini / Google AI Studio.
 */
export function classifyGeminiError(
  status: number,
  errData: any,
  requestedModel: string
): NormalizedAIError {
  const rawMsg: string =
    errData?.error?.message ||
    errData?.message ||
    (typeof errData === 'string' ? errData : `Gemini HTTP ${status}`);
  const rawStatusStr: string = errData?.error?.status || '';
  const lower = rawMsg.toLowerCase();

  // 1. API Enablement in GCP
  if (
    lower.includes('generative language api has not been used') ||
    lower.includes('it is disabled') ||
    lower.includes('api_key_service_blocked') ||
    lower.includes('service disabled')
  ) {
    return new NormalizedAIError({
      code: 'API_NOT_ENABLED',
      provider: 'Google Gemini',
      model: requestedModel,
      httpStatus: status,
      rawMessage: rawMsg,
      message:
        'Your Google Cloud project does not have the Generative Language API enabled. Please enable it in your Google Cloud Console for this key to function.',
      remediationHint:
        'Visit https://console.developers.google.com/apis/api/generativelanguage.googleapis.com to enable the API for your project.',
      isRetryable: false,
    });
  }

  // 2. Key Restrictions (HTTP Referrer / IP / Application Restrictions)
  if (
    lower.includes('api_key_http_referrer_blocked') ||
    lower.includes('api_key_ip_address_blocked') ||
    lower.includes('requests from this referrer') ||
    lower.includes('requests from this android') ||
    lower.includes('requests from this ios') ||
    lower.includes('api key restriction')
  ) {
    return new NormalizedAIError({
      code: 'AUTH_KEY_RESTRICTION',
      provider: 'Google Gemini',
      model: requestedModel,
      httpStatus: status,
      rawMessage: rawMsg,
      message:
        'Your Gemini API key has HTTP referrer or IP restrictions that prevent direct browser calls.',
      remediationHint:
        'In Google Cloud Console > APIs & Services > Credentials, edit your API key and set Application restrictions to "None" or add your PromptHub domain.',
      isRetryable: false,
    });
  }

  // 3. Invalid / Revoked / Expired Key
  if (
    status === 400 &&
    (lower.includes('api key not valid') || lower.includes('invalid api key'))
  ) {
    return new NormalizedAIError({
      code: 'AUTH_INVALID_KEY',
      provider: 'Google Gemini',
      model: requestedModel,
      httpStatus: status,
      rawMessage: rawMsg,
      message: 'The provided Google Gemini API key is invalid or has been revoked.',
      remediationHint: 'Generate a new API key at https://aistudio.google.com/app/apikey.',
      isRetryable: false,
    });
  }

  if (status === 401 || status === 403) {
    if (lower.includes('permission_denied') || rawStatusStr === 'PERMISSION_DENIED') {
      if (lower.includes('billing') || lower.includes('quota') || lower.includes('project')) {
        return new NormalizedAIError({
          code: 'BILLING_REQUIRED',
          provider: 'Google Gemini',
          model: requestedModel,
          httpStatus: status,
          rawMessage: rawMsg,
          message:
            'Access denied for this model. This Gemini model may require a linked billing account on your Google AI project.',
          remediationHint: 'Check billing status at https://aistudio.google.com/app/plan_information.',
          isRetryable: false,
        });
      }

      return new NormalizedAIError({
        code: 'MODEL_ACCESS_DENIED',
        provider: 'Google Gemini',
        model: requestedModel,
        httpStatus: status,
        rawMessage: rawMsg,
        message: `Your Gemini API key does not have permission to access model "${requestedModel}".`,
        remediationHint: 'Verify model availability for your Google AI project tier.',
        isRetryable: false,
      });
    }

    return new NormalizedAIError({
      code: 'AUTH_INVALID_KEY',
      provider: 'Google Gemini',
      model: requestedModel,
      httpStatus: status,
      rawMessage: rawMsg,
      message: 'Authentication failed for Google Gemini. Please check your API key.',
      remediationHint: 'Generate a fresh key at https://aistudio.google.com/app/apikey.',
      isRetryable: false,
    });
  }

  // 4. Model Not Found / Unsupported
  if (status === 404 || lower.includes('not found') || rawStatusStr === 'NOT_FOUND') {
    return new NormalizedAIError({
      code: 'MODEL_NOT_FOUND',
      provider: 'Google Gemini',
      model: requestedModel,
      httpStatus: status,
      rawMessage: rawMsg,
      message: `Model "${requestedModel}" was not found on Google AI Studio API for your key/region.`,
      remediationHint: 'Select another Gemini model (e.g. gemini-2.0-flash or gemini-1.5-pro).',
      isRetryable: false,
    });
  }

  // 5. Rate Limits / Quotas
  if (status === 429 || lower.includes('resource_exhausted') || rawStatusStr === 'RESOURCE_EXHAUSTED') {
    return new NormalizedAIError({
      code: 'RATE_LIMITED',
      provider: 'Google Gemini',
      model: requestedModel,
      httpStatus: 429,
      rawMessage: rawMsg,
      message: 'Gemini rate limit or quota exceeded. Please wait a moment before trying again.',
      remediationHint: 'Consider upgrading your Google AI Studio plan or wait for quota reset.',
      isRetryable: true,
    });
  }

  // 6. Content Safety Filter
  if (lower.includes('safety') || lower.includes('blocked') || lower.includes('recitation')) {
    return new NormalizedAIError({
      code: 'CONTENT_FILTER_TRIGGERED',
      provider: 'Google Gemini',
      model: requestedModel,
      httpStatus: status,
      rawMessage: rawMsg,
      message: 'The prompt or completion was blocked by Google Gemini content safety filters.',
      remediationHint: 'Adjust prompt wording to conform to Google Generative AI safety guidelines.',
      isRetryable: false,
    });
  }

  // 7. Unsupported Parameter / Bad Request
  if (status === 400) {
    return new NormalizedAIError({
      code: 'UNSUPPORTED_PARAMETER',
      provider: 'Google Gemini',
      model: requestedModel,
      httpStatus: status,
      rawMessage: rawMsg,
      message: `Google Gemini rejected request format: ${rawMsg}`,
      remediationHint: 'Check generation parameters or message formatting.',
      isRetryable: false,
    });
  }

  // 8. Server / Outage Error
  if (status >= 500) {
    return new NormalizedAIError({
      code: 'PROVIDER_INTERNAL_ERROR',
      provider: 'Google Gemini',
      model: requestedModel,
      httpStatus: status,
      rawMessage: rawMsg,
      message: 'Google Gemini service encountered an internal error. Please try again shortly.',
      remediationHint: 'Check Google Cloud status dashboard.',
      isRetryable: true,
    });
  }

  return new NormalizedAIError({
    code: 'UNKNOWN_PROVIDER_ERROR',
    provider: 'Google Gemini',
    model: requestedModel,
    httpStatus: status,
    rawMessage: rawMsg,
    message: `Gemini API returned error (${status}): ${rawMsg}`,
    isRetryable: false,
  });
}

/**
 * Normalizes error responses from OpenAI Direct.
 */
export function classifyOpenAIError(
  status: number,
  errData: any,
  requestedModel: string
): NormalizedAIError {
  const rawMsg: string =
    errData?.error?.message ||
    errData?.message ||
    (typeof errData === 'string' ? errData : `OpenAI HTTP ${status}`);
  const errCode = errData?.error?.code || '';
  const lower = rawMsg.toLowerCase();

  if (status === 401 || errCode === 'invalid_api_key') {
    return new NormalizedAIError({
      code: 'AUTH_INVALID_KEY',
      provider: 'OpenAI Direct',
      model: requestedModel,
      httpStatus: 401,
      rawMessage: rawMsg,
      message: 'Invalid OpenAI API key. Please check your key in Settings -> API Credentials.',
      remediationHint: 'Generate a new API key at https://platform.openai.com/api-keys.',
      isRetryable: false,
    });
  }

  if (errCode === 'insufficient_quota' || lower.includes('quota') || lower.includes('billing')) {
    return new NormalizedAIError({
      code: 'INSUFFICIENT_CREDITS',
      provider: 'OpenAI Direct',
      model: requestedModel,
      httpStatus: 429,
      rawMessage: rawMsg,
      message: 'You have exceeded your current OpenAI quota. Please check your plan and billing details.',
      remediationHint: 'Add funds or check usage at https://platform.openai.com/account/billing.',
      isRetryable: false,
    });
  }

  if (status === 429) {
    return new NormalizedAIError({
      code: 'RATE_LIMITED',
      provider: 'OpenAI Direct',
      model: requestedModel,
      httpStatus: 429,
      rawMessage: rawMsg,
      message: 'OpenAI rate limit reached. Please wait a moment and try again.',
      remediationHint: 'Slow down request frequency or request a tier upgrade.',
      isRetryable: true,
    });
  }

  if (status === 404 || errCode === 'model_not_found' || lower.includes('model')) {
    return new NormalizedAIError({
      code: 'MODEL_NOT_FOUND',
      provider: 'OpenAI Direct',
      model: requestedModel,
      httpStatus: 404,
      rawMessage: rawMsg,
      message: `The model "${requestedModel}" does not exist or your OpenAI account does not have access to it.`,
      remediationHint: 'Verify your organization has access to this model on platform.openai.com.',
      isRetryable: false,
    });
  }

  if (status === 400 && (lower.includes('parameter') || lower.includes('not supported') || lower.includes('max_tokens'))) {
    return new NormalizedAIError({
      code: 'UNSUPPORTED_PARAMETER',
      provider: 'OpenAI Direct',
      model: requestedModel,
      httpStatus: 400,
      rawMessage: rawMsg,
      message: `OpenAI rejected incompatible parameter: ${rawMsg}`,
      remediationHint: 'Reasoning models (o1/o3-mini) do not accept temperature or max_tokens.',
      isRetryable: false,
    });
  }

  if (status >= 500) {
    return new NormalizedAIError({
      code: 'PROVIDER_INTERNAL_ERROR',
      provider: 'OpenAI Direct',
      model: requestedModel,
      httpStatus: status,
      rawMessage: rawMsg,
      message: 'OpenAI servers are experiencing temporary issues. Please try again shortly.',
      remediationHint: 'Check https://status.openai.com.',
      isRetryable: true,
    });
  }

  return new NormalizedAIError({
    code: 'UNKNOWN_PROVIDER_ERROR',
    provider: 'OpenAI Direct',
    model: requestedModel,
    httpStatus: status,
    rawMessage: rawMsg,
    message: `OpenAI error (${status}): ${rawMsg}`,
    isRetryable: false,
  });
}

/**
 * Normalizes error responses from Anthropic Direct.
 */
export function classifyAnthropicError(
  status: number,
  errData: any,
  requestedModel: string
): NormalizedAIError {
  const errObj = errData?.error || errData || {};
  const rawMsg: string = errObj.message || (typeof errData === 'string' ? errData : `Anthropic HTTP ${status}`);
  const errType = errObj.type || '';
  const lower = rawMsg.toLowerCase();

  if (status === 401 || errType === 'authentication_error') {
    return new NormalizedAIError({
      code: 'AUTH_INVALID_KEY',
      provider: 'Anthropic Direct',
      model: requestedModel,
      httpStatus: 401,
      rawMessage: rawMsg,
      message: 'Invalid Anthropic API key. Please check your key in Settings -> API Credentials.',
      remediationHint: 'Generate a new key at https://console.anthropic.com/settings/keys.',
      isRetryable: false,
    });
  }

  if (status === 403 || errType === 'permission_error') {
    return new NormalizedAIError({
      code: 'MODEL_ACCESS_DENIED',
      provider: 'Anthropic Direct',
      model: requestedModel,
      httpStatus: 403,
      rawMessage: rawMsg,
      message: `Your Anthropic API key does not have permission to execute "${requestedModel}".`,
      remediationHint: 'Check your Anthropic organization permissions.',
      isRetryable: false,
    });
  }

  if (status === 404 || lower.includes('not_found') || lower.includes('model:')) {
    return new NormalizedAIError({
      code: 'MODEL_NOT_FOUND',
      provider: 'Anthropic Direct',
      model: requestedModel,
      httpStatus: 404,
      rawMessage: rawMsg,
      message: `Model "${requestedModel}" was not found on Anthropic Messages API.`,
      remediationHint: 'Choose a supported Claude model (e.g. claude-3-7-sonnet-20250219 or claude-3-5-sonnet-20241022).',
      isRetryable: false,
    });
  }

  if (status === 429 || errType === 'rate_limit_error') {
    return new NormalizedAIError({
      code: 'RATE_LIMITED',
      provider: 'Anthropic Direct',
      model: requestedModel,
      httpStatus: 429,
      rawMessage: rawMsg,
      message: 'Anthropic Claude rate limit reached. Please wait a moment before trying again.',
      remediationHint: 'Reduce request rate or review Tier limits at console.anthropic.com.',
      isRetryable: true,
    });
  }

  if (status === 529 || errType === 'overloaded_error') {
    return new NormalizedAIError({
      code: 'PROVIDER_UNAVAILABLE',
      provider: 'Anthropic Direct',
      model: requestedModel,
      httpStatus: 529,
      rawMessage: rawMsg,
      message: 'Anthropic servers are currently overloaded. Please retry in a few seconds.',
      remediationHint: 'Check https://status.anthropic.com.',
      isRetryable: true,
    });
  }

  if (status === 400) {
    return new NormalizedAIError({
      code: 'INVALID_REQUEST',
      provider: 'Anthropic Direct',
      model: requestedModel,
      httpStatus: 400,
      rawMessage: rawMsg,
      message: `Anthropic Messages API error: ${rawMsg}`,
      remediationHint: 'Anthropic requires max_tokens and alternating user/assistant messages.',
      isRetryable: false,
    });
  }

  return new NormalizedAIError({
    code: 'UNKNOWN_PROVIDER_ERROR',
    provider: 'Anthropic Direct',
    model: requestedModel,
    httpStatus: status,
    rawMessage: rawMsg,
    message: `Anthropic error (${status}): ${rawMsg}`,
    isRetryable: false,
  });
}

/**
 * Normalizes error responses from OpenRouter Universal Gateway.
 */
export function classifyOpenRouterError(
  status: number,
  errData: any,
  requestedModel: string
): NormalizedAIError {
  const rawMsg: string =
    errData?.error?.message ||
    errData?.message ||
    (typeof errData === 'string' ? errData : `OpenRouter HTTP ${status}`);
  const lower = rawMsg.toLowerCase();

  if (status === 401 || lower.includes('invalid api key') || lower.includes('unauthorized')) {
    return new NormalizedAIError({
      code: 'AUTH_INVALID_KEY',
      provider: 'OpenRouter',
      model: requestedModel,
      httpStatus: 401,
      rawMessage: rawMsg,
      message: 'Invalid OpenRouter API key. Please check your key in Settings -> API Credentials.',
      remediationHint: 'Generate a new key at https://openrouter.ai/keys.',
      isRetryable: false,
    });
  }

  if (status === 403 || lower.includes('permission') || lower.includes('forbidden') || lower.includes('access denied')) {
    return new NormalizedAIError({
      code: 'MODEL_ACCESS_DENIED',
      provider: 'OpenRouter',
      model: requestedModel,
      httpStatus: 403,
      rawMessage: rawMsg,
      message: `Access denied for model "${requestedModel}". Your key does not have permission to execute this model.`,
      remediationHint: 'Check your OpenRouter account permissions or key limits.',
      isRetryable: false,
    });
  }

  if (status === 402 || lower.includes('insufficient') || lower.includes('credit') || lower.includes('balance')) {
    return new NormalizedAIError({
      code: 'INSUFFICIENT_CREDITS',
      provider: 'OpenRouter',
      model: requestedModel,
      httpStatus: 402,
      rawMessage: rawMsg,
      message: `Your personal OpenRouter account balance is empty ($0.00) or insufficient to run "${requestedModel}".`,
      remediationHint: 'Add funds to your personal OpenRouter account at https://openrouter.ai/credits, or select a free model (e.g. models ending in :free). PromptHub charges 0 credits when using your own key.',
      isRetryable: false,
    });
  }

  if (status === 404) {
    if (lower.includes('batch api')) {
      return new NormalizedAIError({
        code: 'BATCH_ONLY_MODEL',
        provider: 'OpenRouter',
        model: requestedModel,
        httpStatus: 404,
        rawMessage: rawMsg,
        message: `Model "${requestedModel}" is only available through the OpenRouter Batch API.`,
        remediationHint: 'Please select a real-time interactive model from the selector.',
        isRetryable: false,
      });
    }

    // Detect explicit discontinuation signals from upstream message
    const isExplicitlyDiscontinued =
      lower.includes('deactivated') ||
      lower.includes('discontinued') ||
      lower.includes('deprecated') ||
      lower.includes('no longer available') ||
      lower.includes('removed');

    return new NormalizedAIError({
      code: 'MODEL_NOT_FOUND',
      provider: 'OpenRouter',
      model: requestedModel,
      httpStatus: 404,
      rawMessage: rawMsg,
      message: isExplicitlyDiscontinued
        ? `The model "${requestedModel}" has been discontinued by OpenRouter and is no longer available. Please select another model.`
        : `The model "${requestedModel}" has been discontinued by OpenRouter or is no longer available. Please select another model from the selector.`,
      remediationHint: 'Open the model selector to pick an active model from the live catalog.',
      isRetryable: false,
    });
  }

  if (status === 408 || lower.includes('timeout')) {
    return new NormalizedAIError({
      code: 'PROVIDER_TIMEOUT',
      provider: 'OpenRouter',
      model: requestedModel,
      httpStatus: 408,
      rawMessage: rawMsg,
      message: `OpenRouter request timed out while waiting for model "${requestedModel}".`,
      remediationHint: 'Try running the request again or select a faster model.',
      isRetryable: true,
    });
  }

  if (status === 429) {
    return new NormalizedAIError({
      code: 'RATE_LIMITED',
      provider: 'OpenRouter',
      model: requestedModel,
      httpStatus: 429,
      rawMessage: rawMsg,
      message: 'OpenRouter or upstream model rate limit reached. Please wait a moment and retry.',
      remediationHint: 'Wait 10-15 seconds before re-running.',
      isRetryable: true,
    });
  }

  if (status === 400) {
    return new NormalizedAIError({
      code: 'UNSUPPORTED_PARAMETER',
      provider: 'OpenRouter',
      model: requestedModel,
      httpStatus: 400,
      rawMessage: rawMsg,
      message: `OpenRouter rejected request parameter format: ${rawMsg}`,
      remediationHint: 'Check for incompatible model options (e.g. structured output or unsupported parameters).',
      isRetryable: false,
    });
  }

  if (status === 502 || status === 503 || status === 504) {
    return new NormalizedAIError({
      code: 'PROVIDER_UNAVAILABLE',
      provider: 'OpenRouter',
      model: requestedModel,
      httpStatus: status,
      rawMessage: rawMsg,
      message: `OpenRouter upstream provider for "${requestedModel}" is currently unavailable (HTTP ${status}).`,
      remediationHint: 'Select another model or check https://status.openrouter.ai.',
      isRetryable: true,
    });
  }

  if (status >= 500) {
    return new NormalizedAIError({
      code: 'PROVIDER_INTERNAL_ERROR',
      provider: 'OpenRouter',
      model: requestedModel,
      httpStatus: status,
      rawMessage: rawMsg,
      message: 'OpenRouter service encountered an internal error. Please try again shortly.',
      remediationHint: 'Check https://status.openrouter.ai.',
      isRetryable: true,
    });
  }

  return new NormalizedAIError({
    code: 'UNKNOWN_PROVIDER_ERROR',
    provider: 'OpenRouter',
    model: requestedModel,
    httpStatus: status,
    rawMessage: rawMsg,
    message: `OpenRouter API error (${status}): ${rawMsg}`,
    isRetryable: false,
  });
}

/**
 * Normalizes error responses for DeepSeek, xAI, Cohere, Together, Groq, Mistral.
 */
export function classifyGenericProviderError(
  providerName: string,
  status: number,
  errData: any,
  requestedModel: string
): NormalizedAIError {
  const rawMsg: string =
    errData?.error?.message ||
    errData?.message ||
    (typeof errData === 'string' ? errData : `${providerName} HTTP ${status}`);
  const lower = rawMsg.toLowerCase();

  if (status === 401 || lower.includes('invalid api key') || lower.includes('unauthorized') || lower.includes('invalid token')) {
    return new NormalizedAIError({
      code: 'AUTH_INVALID_KEY',
      provider: providerName,
      model: requestedModel,
      httpStatus: 401,
      rawMessage: rawMsg,
      message: `Invalid ${providerName} API key. Please check your key in Settings -> API Credentials.`,
      remediationHint: 'Check your API key in provider console.',
      isRetryable: false,
    });
  }

  if (status === 402 || lower.includes('insufficient balance') || lower.includes('insufficient funds') || lower.includes('payment required')) {
    return new NormalizedAIError({
      code: 'INSUFFICIENT_CREDITS',
      provider: providerName,
      model: requestedModel,
      httpStatus: 402,
      rawMessage: rawMsg,
      message: `Insufficient credits or balance on your ${providerName} account.`,
      remediationHint: `Please add credits or check billing at ${providerName} developer portal.`,
      isRetryable: false,
    });
  }

  if (status === 403) {
    return new NormalizedAIError({
      code: 'MODEL_ACCESS_DENIED',
      provider: providerName,
      model: requestedModel,
      httpStatus: 403,
      rawMessage: rawMsg,
      message: `Access denied to model "${requestedModel}" on ${providerName}.`,
      remediationHint: 'Check model access permissions in provider portal.',
      isRetryable: false,
    });
  }

  if (status === 404 || lower.includes('model not found') || lower.includes('does not exist')) {
    return new NormalizedAIError({
      code: 'MODEL_NOT_FOUND',
      provider: providerName,
      model: requestedModel,
      httpStatus: 404,
      rawMessage: rawMsg,
      message: `Model "${requestedModel}" was not found on ${providerName}.`,
      remediationHint: 'Select another model from the model selector.',
      isRetryable: false,
    });
  }

  if (status === 429 || lower.includes('rate limit')) {
    return new NormalizedAIError({
      code: 'RATE_LIMITED',
      provider: providerName,
      model: requestedModel,
      httpStatus: 429,
      rawMessage: rawMsg,
      message: `${providerName} rate limit reached. Please wait a moment and try again.`,
      remediationHint: 'Wait 10-15 seconds before retrying.',
      isRetryable: true,
    });
  }

  if (status >= 500) {
    return new NormalizedAIError({
      code: 'PROVIDER_INTERNAL_ERROR',
      provider: providerName,
      model: requestedModel,
      httpStatus: status,
      rawMessage: rawMsg,
      message: `${providerName} service is experiencing internal issues. Please try again shortly.`,
      remediationHint: 'Try again in a few moments.',
      isRetryable: true,
    });
  }

  return new NormalizedAIError({
    code: 'UNKNOWN_PROVIDER_ERROR',
    provider: providerName,
    model: requestedModel,
    httpStatus: status,
    rawMessage: rawMsg,
    message: `${providerName} error (${status}): ${rawMsg}`,
    isRetryable: false,
  });
}

/**
 * Normalizes error responses from AICredits Gateway.
 */
export function classifyAICreditsError(
  status: number,
  errData: any,
  requestedModel: string
): NormalizedAIError {
  const rawMsg: string =
    errData?.error?.message ||
    errData?.message ||
    (typeof errData === 'string' ? errData : `AICredits HTTP ${status}`);
  const lower = rawMsg.toLowerCase();

  if (status === 401 || status === 403 || lower.includes('invalid api key') || lower.includes('unauthorized') || lower.includes('auth')) {
    return new NormalizedAIError({
      code: 'AUTH_INVALID_KEY',
      provider: 'AICredits',
      model: requestedModel,
      httpStatus: status,
      rawMessage: rawMsg,
      message: requestedModel === 'key-validation'
        ? 'Invalid AICredits.in API key. Please verify your key in your aicredits.in dashboard.'
        : 'AICredits API key authentication error. Please verify your credentials.',
      isRetryable: false,
    });
  }

  if (status === 402 || lower.includes('insufficient balance') || lower.includes('balance') || lower.includes('credit')) {
    return new NormalizedAIError({
      code: 'INSUFFICIENT_CREDITS',
      provider: 'AICredits',
      model: requestedModel,
      httpStatus: 402,
      rawMessage: rawMsg,
      message: requestedModel === 'key-validation'
        ? 'Key is valid, but your AICredits.in wallet has Insufficient Balance. Please recharge on aicredits.in.'
        : 'Insufficient AICredits.in provider balance to complete this run. Please top up credits on aicredits.in.',
      isRetryable: false,
    });
  }

  if (status === 404 || lower.includes('model not found') || lower.includes('not available')) {
    return new NormalizedAIError({
      code: 'MODEL_NOT_FOUND',
      provider: 'AICredits',
      model: requestedModel,
      httpStatus: 404,
      rawMessage: rawMsg,
      message: `Model "${requestedModel}" is not available on AICredits gateway.`,
      remediationHint: 'Please choose another model from the Premium tab.',
      isRetryable: false,
    });
  }

  if (status === 429 || lower.includes('rate limit')) {
    return new NormalizedAIError({
      code: 'RATE_LIMITED',
      provider: 'AICredits',
      model: requestedModel,
      httpStatus: 429,
      rawMessage: rawMsg,
      message: 'AICredits rate limit reached. Please wait a few seconds and try again.',
      remediationHint: 'Wait 5-10 seconds before retrying.',
      isRetryable: true,
    });
  }

  return new NormalizedAIError({
    code: 'PROVIDER_INTERNAL_ERROR',
    provider: 'AICredits',
    model: requestedModel,
    httpStatus: status,
    rawMessage: rawMsg,
    message: `AICredits gateway error: ${rawMsg}`,
    isRetryable: status >= 500,
  });
}

/**
 * Strictly classifies whether an error indicates that the primary provider's credit/balance is exhausted.
 * ONLY explicit credit/quota exhaustion signals return true.
 * HTTP 400, 401, 403, 404, 429, 500, 502, 503, timeouts, network errors, etc. return FALSE.
 */
export function isExplicitCreditExhaustion(status: number, errData: any): boolean {
  if (status === 402) return true;

  const rawMsg = (
    errData?.error?.message ||
    errData?.message ||
    (typeof errData === 'string' ? errData : '')
  ).toLowerCase();

  const code = (
    errData?.error?.code ||
    errData?.code ||
    ''
  ).toString().toUpperCase();

  // Explicit code checks
  if (
    code === 'INSUFFICIENT_CREDITS' ||
    code === 'INSUFFICIENT_BALANCE' ||
    code === 'INSUFFICIENT_QUOTA' ||
    code === 'QUOTA_EXHAUSTED' ||
    code === 'BALANCE_EXHAUSTED' ||
    code === 'BILLING_REQUIRED' ||
    code === 'CREDIT_LIMIT_REACHED' ||
    code === 'OUT_OF_CREDITS'
  ) {
    return true;
  }

  // Explicit message checks
  if (
    rawMsg.includes('insufficient balance') ||
    rawMsg.includes('insufficient credits') ||
    rawMsg.includes('balance exhausted') ||
    rawMsg.includes('credit limit reached') ||
    rawMsg.includes('quota exhausted') ||
    rawMsg.includes('exceeded your current quota') ||
    rawMsg.includes('please check your plan and billing details') ||
    rawMsg.includes('account has insufficient funds')
  ) {
    // Exclude rate limits or tokens per minute quota
    if (
      rawMsg.includes('rate limit') ||
      rawMsg.includes('per minute') ||
      rawMsg.includes('per day') ||
      rawMsg.includes('tokens per') ||
      rawMsg.includes('requests per') ||
      status === 429
    ) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Checks whether an error is a quota exhaustion, credit deficit, or billing failure.
 */
export function isQuotaOrCreditError(err: any): boolean {
  if (!err) return false;
  if (err.httpStatus === 402) return true;
  if (isExplicitCreditExhaustion(err.httpStatus || 0, err)) return true;
  const code = (err.code || err.error?.code || '').toString().toUpperCase();
  if (
    code === 'INSUFFICIENT_CREDITS' ||
    code === 'QUOTA_EXCEEDED' ||
    code === 'BILLING_REQUIRED' ||
    code === 'PRIMARY_PROVIDER_CREDITS_EXHAUSTED'
  ) {
    return true;
  }
  const msg = (err.message || err.rawMessage || '').toLowerCase();
  return (
    msg.includes('insufficient credits') ||
    msg.includes('balance is empty') ||
    msg.includes('insufficient funds') ||
    msg.includes('credit limit reached')
  );
}


