/**
 * src/lib/mixpanelEvents.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Mixpanel Event Tracking Suite for PromptHub.
 *
 * Implements strict snake_case naming conventions and type-safe properties
 * for core activation, engagement, value moments, monetization, and teams.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { trackMixpanelEvent, setMixpanelTeamGroup } from './mixpanel';

/**
 * 1. AUTH & ACTIVATION
 */
export function trackSignUpCompleted(props: {
  signUpMethod: 'email' | 'google' | 'github' | string;
  referralSource?: string;
}): void {
  trackMixpanelEvent('sign_up_completed', {
    sign_up_method: props.signUpMethod,
    platform: 'web',
    referral_source: props.referralSource || 'organic',
  });
}

export function trackLoginSuccess(props: {
  loginMethod: 'email' | 'google' | 'github' | string;
}): void {
  trackMixpanelEvent('login_success', {
    login_method: props.loginMethod,
    platform: 'web',
  });
}

/**
 * 2. PRIMARY VALUE MOMENT: PROMPT CREATION
 * Fires whenever a user successfully saves / creates a prompt in the Studio IDE.
 */
export function trackPromptCreated(props: {
  promptId: string;
  category?: string;
  visibility?: 'public' | 'private' | 'unlisted' | string;
  hasVariables?: boolean;
  variableCount?: number;
  isPremium?: boolean;
  priceInr?: number;
  modelType?: string;
  titleLength?: number;
  promptLength?: number;
}): void {
  trackMixpanelEvent('prompt_created', {
    prompt_id: props.promptId,
    category: props.category || 'general',
    visibility: props.visibility || 'private',
    has_variables: Boolean(props.hasVariables),
    variable_count: props.variableCount || 0,
    is_premium: Boolean(props.isPremium),
    price_inr: props.priceInr || 0,
    model_type: props.modelType || 'any',
    title_length: props.titleLength || 0,
    prompt_length: props.promptLength || 0,
  });
}

/**
 * 3. CORE ANALYZER MOMENT: PROMPT ANALYZED / OPTIMIZED
 * Fires whenever a user scores or optimizes a prompt using the AI Engine.
 */
export function trackPromptAnalyzed(props: {
  promptId?: string;
  model: string;
  score?: number | null;
  durationMs?: number;
  issueCount?: number;
  promptLength?: number;
  analysisMode?: 'analyze' | 'improve' | 'test' | string;
}): void {
  trackMixpanelEvent('prompt_analyzed', {
    prompt_id: props.promptId || null,
    model: props.model,
    score: typeof props.score === 'number' ? props.score : null,
    duration_ms: props.durationMs || 0,
    issue_count: props.issueCount || 0,
    prompt_length: props.promptLength || 0,
    analysis_mode: props.analysisMode || 'analyze',
  });
}

/**
 * 4. COLLABORATION & FORKING
 */
export function trackPromptForked(props: {
  promptId: string;
  originalPromptId: string;
  authorId?: string;
}): void {
  trackMixpanelEvent('prompt_forked', {
    prompt_id: props.promptId,
    original_prompt_id: props.originalPromptId,
    original_author_id: props.authorId || null,
  });
}

export function trackPromptShared(props: {
  promptId: string;
  shareMethod: 'clipboard' | 'twitter' | 'linkedin' | string;
}): void {
  trackMixpanelEvent('prompt_shared', {
    prompt_id: props.promptId,
    share_method: props.shareMethod,
  });
}

/**
 * 5. AI EXECUTION & MODEL RUNS
 */
export function trackPromptExecuted(props: {
  model: string;
  provider: 'openrouter' | 'aicredits' | 'sarvam' | 'deepgram' | 'assemblyai' | 'byok' | string;
  tokensUsed?: number;
  creditCost?: number;
  durationMs?: number;
  isByok?: boolean;
}): void {
  trackMixpanelEvent('prompt_executed', {
    model: props.model,
    provider: props.provider,
    tokens_used: props.tokensUsed || 0,
    credit_cost: props.creditCost || 0,
    duration_ms: props.durationMs || 0,
    is_byok: Boolean(props.isByok),
  });
}

/**
 * 6. MONETIZATION & CHECKOUT (RAZORPAY)
 */
export function trackOrderCompleted(props: {
  orderId: string;
  amountInr: number;
  creditsAdded: number;
  packageId?: string;
  paymentMethod?: string;
}): void {
  trackMixpanelEvent('order_completed', {
    order_id: props.orderId,
    amount_inr: props.amountInr,
    credits_added: props.creditsAdded,
    package_id: props.packageId || 'topup',
    payment_method: props.paymentMethod || 'upi_card',
  });
}

export function trackSubscriptionUpgraded(props: {
  plan: string;
  amountInr: number;
  billingPeriod?: 'monthly' | 'yearly';
}): void {
  trackMixpanelEvent('subscription_upgraded', {
    plan: props.plan.toLowerCase(),
    amount_inr: props.amountInr,
    billing_period: props.billingPeriod || 'monthly',
  });
}

export function trackSubscriptionCancelled(props: {
  previousPlan: string;
}): void {
  trackMixpanelEvent('subscription_cancelled', {
    previous_plan: props.previousPlan.toLowerCase(),
  });
}

export function trackAccountDeleted(props?: {
  reason?: string;
}): void {
  trackMixpanelEvent('account_deleted', {
    reason: props?.reason || 'user_requested',
  });
}

/**
 * 7. GROUP ANALYTICS: TEAMS & WORKSPACES
 */
export function trackTeamCreated(props: {
  teamId: string;
  teamName: string;
  visibility?: 'public' | 'private' | string;
}): void {
  setMixpanelTeamGroup(props.teamId, {
    name: props.teamName,
    created_at: new Date().toISOString(),
    visibility: props.visibility || 'private',
  });

  trackMixpanelEvent('team_created', {
    team_id: props.teamId,
    team_name: props.teamName,
    visibility: props.visibility || 'private',
  });
}

export function trackTeamMemberJoined(props: {
  teamId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | string;
}): void {
  setMixpanelTeamGroup(props.teamId);

  trackMixpanelEvent('team_member_joined', {
    team_id: props.teamId,
    role: props.role,
  });
}

/**
 * 8. VOICE & MULTILINGUAL SPEECH (SARVAM AI & DEEPGRAM)
 */
export function trackSpeechToTextStarted(props: {
  provider: 'sarvam' | 'deepgram' | 'browser' | string;
  languageCode?: string;
}): void {
  trackMixpanelEvent('speech_to_text_started', {
    provider: props.provider,
    language_code: props.languageCode || 'unknown',
  });
}

export function trackSpeechToTextCompleted(props: {
  provider: 'sarvam' | 'deepgram' | 'browser' | string;
  languageCode?: string;
  durationMs: number;
  transcriptLength: number;
  audioSizeBytes?: number;
  isSuccess: boolean;
}): void {
  trackMixpanelEvent('speech_to_text_completed', {
    provider: props.provider,
    language_code: props.languageCode || 'unknown',
    duration_ms: props.durationMs,
    transcript_length: props.transcriptLength,
    audio_size_bytes: props.audioSizeBytes || 0,
    is_success: props.isSuccess,
  });
}

export function trackTranslationStarted(props: {
  provider: 'sarvam' | string;
  sourceLanguage: string;
  targetLanguage: string;
  charCount: number;
}): void {
  trackMixpanelEvent('translation_started', {
    provider: props.provider,
    source_language: props.sourceLanguage,
    target_language: props.targetLanguage,
    char_count: props.charCount,
  });
}

export function trackTranslationCompleted(props: {
  provider: 'sarvam' | string;
  sourceLanguage: string;
  targetLanguage: string;
  durationMs: number;
  charCount: number;
  isSuccess: boolean;
}): void {
  trackMixpanelEvent('translation_completed', {
    provider: props.provider,
    source_language: props.sourceLanguage,
    target_language: props.targetLanguage,
    duration_ms: props.durationMs,
    char_count: props.charCount,
    is_success: props.isSuccess,
  });
}

export function trackTextToSpeechStarted(props: {
  provider: 'sarvam' | 'deepgram' | string;
  languageCode: string;
  targetGender?: 'male' | 'female';
  charCount: number;
}): void {
  trackMixpanelEvent('text_to_speech_started', {
    provider: props.provider,
    language_code: props.languageCode,
    target_gender: props.targetGender || 'female',
    char_count: props.charCount,
  });
}

export function trackTextToSpeechCompleted(props: {
  provider: 'sarvam' | 'deepgram' | string;
  languageCode: string;
  durationMs: number;
  audioFormat: string;
  isSuccess: boolean;
}): void {
  trackMixpanelEvent('text_to_speech_completed', {
    provider: props.provider,
    language_code: props.languageCode,
    duration_ms: props.durationMs,
    audio_format: props.audioFormat,
    is_success: props.isSuccess,
  });
}

/**
 * 9. VIDEO & MULTIMEDIA (MUX)
 */
export function trackVideoDemoViewed(props: {
  playbackId: string;
  promptId?: string;
  videoTitle?: string;
}): void {
  trackMixpanelEvent('video_demo_viewed', {
    playback_id: props.playbackId,
    prompt_id: props.promptId || null,
    video_title: props.videoTitle || 'Prompt Walkthrough',
  });
}

export function trackVideoPlaybackStarted(props: {
  playbackId: string;
  promptId?: string;
  durationSec?: number;
}): void {
  trackMixpanelEvent('video_playback_started', {
    playback_id: props.playbackId,
    prompt_id: props.promptId || null,
    duration_sec: props.durationSec || 0,
  });
}

/**
 * 10. EXPERIMENTATION & CREATIVE GENERATION (PLENTY LABS)
 */
export function trackExperimentCreated(props: {
  campaignId: string;
  platform: string;
  tone: string;
  promptId?: string;
  variantCount: number;
}): void {
  trackMixpanelEvent('experiment_created', {
    campaign_id: props.campaignId,
    platform: props.platform,
    tone: props.tone,
    prompt_id: props.promptId || null,
    variant_count: props.variantCount,
  });
}

export function trackExperimentRun(props: {
  campaignId: string;
  platform: string;
  status: 'draft' | 'running' | 'completed' | 'failed' | string;
  durationMs?: number;
}): void {
  trackMixpanelEvent('experiment_run', {
    campaign_id: props.campaignId,
    platform: props.platform,
    status: props.status,
    duration_ms: props.durationMs || 0,
  });
}

/**
 * 11. LAUNCH PROMOTION ENGINE
 * Tracks atomic first-100 500-credit claims.
 */
export function trackLaunchBonusClaimed(props: {
  userId: string;
  claimNumber: number;
  creditsGranted: number;
  remainingSlots: number;
}): void {
  trackMixpanelEvent('launch_bonus_claimed', {
    user_id: props.userId,
    claim_number: props.claimNumber,
    credits_granted: props.creditsGranted,
    remaining_slots: props.remainingSlots,
    amount_inr: props.creditsGranted * 0.50,
  });
}

/**
 * 12. PROMPT OPTIMIZER & AGENT SUITE
 */
export function trackPromptOptimized(props: {
  mode: string;
  model: string;
  provider: string;
  originalTokens: number;
  optimizedTokens: number;
  tokenDelta: number;
  hasBenchmarkExemplar?: boolean;
}): void {
  trackMixpanelEvent('prompt_optimized', {
    optimization_mode: props.mode,
    model: props.model,
    provider: props.provider,
    original_tokens: props.originalTokens,
    optimized_tokens: props.optimizedTokens,
    token_delta: props.tokenDelta,
    has_benchmark_exemplar: Boolean(props.hasBenchmarkExemplar),
  });
}

export function trackAgentExecuted(props: {
  agentType: string;
  model: string;
  provider: string;
  inputLength: number;
  outputLength: number;
  durationMs?: number;
  creditCost?: number | null;
}): void {
  trackMixpanelEvent('agent_executed', {
    agent_type: props.agentType,
    model: props.model,
    provider: props.provider,
    input_length: props.inputLength,
    output_length: props.outputLength,
    duration_ms: props.durationMs || 0,
    credit_cost: props.creditCost ?? 0,
  });
}

/**
 * 13. NAVIGATION & SESSION TAB TELEMETRY
 * Tracks active view transitions and user journey across application tabs.
 */
export function trackTabNavigated(props: {
  tabName: string;
  previousTab?: string | null;
  isAuthenticated?: boolean;
}): void {
  trackMixpanelEvent('tab_navigated', {
    tab_name: props.tabName,
    previous_tab: props.previousTab || null,
    is_authenticated: Boolean(props.isAuthenticated),
  });
}

/**
 * 14. WORK STUDIO ACTIONS
 */
export function trackWorkTaskStarted(props: {
  model: string;
  taskType?: string;
  promptLength: number;
}): void {
  trackMixpanelEvent('work_task_started', {
    model: props.model,
    task_type: props.taskType || 'chat',
    prompt_length: props.promptLength,
  });
}

export function trackWorkStorageExport(props: {
  exportType: 'desktop_zip' | 'indexed_db' | 'google_drive';
  fileCount?: number;
  totalSizeBytes?: number;
}): void {
  trackMixpanelEvent('work_storage_exported', {
    export_type: props.exportType,
    file_count: props.fileCount || 0,
    total_size_bytes: props.totalSizeBytes || 0,
  });
}
