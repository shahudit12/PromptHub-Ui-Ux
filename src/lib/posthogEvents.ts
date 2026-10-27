/**
 * src/lib/posthogEvents.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * PostHog Authentication, Prompt, AI, Search, Collections & Navigation Analytics Helpers.
 *
 * Helper functions for tracking strictly defined user, prompt, AI, search, collection, and navigation events.
 * Implements deduplication guards and strict privacy filters so sensitive data
 * (query strings, prompt text, AI outputs, secrets, user messages) is NEVER transmitted.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import posthog from 'posthog-js';
import { isPostHogActive } from './posthog';

// Session event deduplication tracker map
const recentEvents = new Map<string, number>();

/**
 * Prevents identical event triggers within a 5-second deduplication window.
 */
function isDuplicateEvent(eventName: string, key = ''): boolean {
  const eventKey = `${eventName}:${key}`;
  const now = Date.now();
  const lastTime = recentEvents.get(eventKey);

  if (lastTime && now - lastTime < 5000) {
    return true;
  }

  recentEvents.set(eventKey, now);
  return false;
}

// ─── AUTHENTICATION ANALYTICS EVENTS ──────────────────────────────────────────

export function trackSignupCompleted(props: {
  provider: string;
  email_verified: boolean;
  account_type: 'Free' | 'Pro' | string;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('signup_completed', props.provider)) return;

  try {
    posthog.capture('signup_completed', {
      provider: props.provider,
      email_verified: props.email_verified,
      account_type: props.account_type,
    });
    console.info('[PostHog Event] signup_completed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] signup_completed warning:', err?.message || err);
  }
}

export function trackLoginSuccess(props: {
  provider: string;
  email_verified: boolean;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('login_success', props.provider)) return;

  try {
    posthog.capture('login_success', {
      provider: props.provider,
      email_verified: props.email_verified,
    });
    console.info('[PostHog Event] login_success tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] login_success warning:', err?.message || err);
  }
}

export function trackLogout(props?: { session_duration?: number }): void {
  if (!isPostHogActive() || isDuplicateEvent('logout')) return;

  try {
    posthog.capture('logout', {
      session_duration: props?.session_duration,
    });
    console.info('[PostHog Event] logout tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] logout warning:', err?.message || err);
  }
}

export function trackPasswordResetRequested(props: { provider: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('password_reset_requested')) return;

  try {
    posthog.capture('password_reset_requested', {
      provider: props.provider,
    });
    console.info('[PostHog Event] password_reset_requested tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] password_reset_requested warning:', err?.message || err);
  }
}

export function trackPasswordResetCompleted(props: { provider: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('password_reset_completed')) return;

  try {
    posthog.capture('password_reset_completed', {
      provider: props.provider,
    });
    console.info('[PostHog Event] password_reset_completed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] password_reset_completed warning:', err?.message || err);
  }
}

export function trackEmailVerificationSent(): void {
  if (!isPostHogActive() || isDuplicateEvent('email_verification_sent')) return;

  try {
    posthog.capture('email_verification_sent', {});
    console.info('[PostHog Event] email_verification_sent tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] email_verification_sent warning:', err?.message || err);
  }
}

export function trackEmailVerified(): void {
  if (!isPostHogActive() || isDuplicateEvent('email_verified')) return;

  try {
    posthog.capture('email_verified', {});
    console.info('[PostHog Event] email_verified tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] email_verified warning:', err?.message || err);
  }
}

// ─── PROMPT LIFECYCLE ANALYTICS EVENTS ─────────────────────────────────────────

export function trackPromptCreated(props: {
  visibility: string;
  category: string;
  tags_count: number;
  prompt_length: number;
  model: string;
  has_image: boolean;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_created')) return;

  try {
    posthog.capture('prompt_created', {
      visibility: props.visibility,
      category: props.category,
      tags_count: props.tags_count,
      prompt_length: props.prompt_length,
      model: props.model,
      has_image: props.has_image,
    });
    console.info('[PostHog Event] prompt_created tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_created warning:', err?.message || err);
  }
}

export function trackPromptUpdated(props: {
  visibility: string;
  category: string;
  tags_count: number;
  prompt_length: number;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_updated')) return;

  try {
    posthog.capture('prompt_updated', {
      visibility: props.visibility,
      category: props.category,
      tags_count: props.tags_count,
      prompt_length: props.prompt_length,
    });
    console.info('[PostHog Event] prompt_updated tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_updated warning:', err?.message || err);
  }
}

export function trackPromptDeleted(props: {
  visibility: string;
  category: string;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_deleted')) return;

  try {
    posthog.capture('prompt_deleted', {
      visibility: props.visibility,
      category: props.category,
    });
    console.info('[PostHog Event] prompt_deleted tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_deleted warning:', err?.message || err);
  }
}

export function trackPromptPublished(): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_published')) return;

  try {
    posthog.capture('prompt_published', {});
    console.info('[PostHog Event] prompt_published tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_published warning:', err?.message || err);
  }
}

export function trackPromptUnpublished(): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_unpublished')) return;

  try {
    posthog.capture('prompt_unpublished', {});
    console.info('[PostHog Event] prompt_unpublished tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_unpublished warning:', err?.message || err);
  }
}

export function trackPromptFavorited(props: { owner_type: 'self' | 'other' }): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_favorited', props.owner_type)) return;

  try {
    posthog.capture('prompt_favorited', {
      owner_type: props.owner_type,
    });
    console.info('[PostHog Event] prompt_favorited tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_favorited warning:', err?.message || err);
  }
}

export function trackPromptUnfavorited(): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_unfavorited')) return;

  try {
    posthog.capture('prompt_unfavorited', {});
    console.info('[PostHog Event] prompt_unfavorited tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_unfavorited warning:', err?.message || err);
  }
}

export function trackPromptLiked(): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_liked')) return;

  try {
    posthog.capture('prompt_liked', {});
    console.info('[PostHog Event] prompt_liked tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_liked warning:', err?.message || err);
  }
}

export function trackPromptUnliked(): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_unliked')) return;

  try {
    posthog.capture('prompt_unliked', {});
    console.info('[PostHog Event] prompt_unliked tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_unliked warning:', err?.message || err);
  }
}

export function trackPromptCopied(): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_copied')) return;

  try {
    posthog.capture('prompt_copied', {});
    console.info('[PostHog Event] prompt_copied tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_copied warning:', err?.message || err);
  }
}

export function trackPromptForked(props: { source_visibility: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_forked', props.source_visibility)) return;

  try {
    posthog.capture('prompt_forked', {
      source_visibility: props.source_visibility,
    });
    console.info('[PostHog Event] prompt_forked tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_forked warning:', err?.message || err);
  }
}

export function trackPromptShared(props: {
  destination: 'copy_link' | 'twitter' | 'linkedin' | 'reddit' | 'discord' | 'email' | string;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_shared', props.destination)) return;

  try {
    posthog.capture('prompt_shared', {
      destination: props.destination,
    });
    console.info('[PostHog Event] prompt_shared tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_shared warning:', err?.message || err);
  }
}

// ─── AI INTERACTION ANALYTICS EVENTS ───────────────────────────────────────────

export function trackPromptAnalyzed(props: {
  model: string;
  prompt_length: number;
  has_image: boolean;
  analysis_type: string;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_analyzed')) return;

  try {
    posthog.capture('prompt_analyzed', {
      model: props.model,
      prompt_length: props.prompt_length,
      has_image: props.has_image,
      analysis_type: props.analysis_type,
    });
    console.info('[PostHog Event] prompt_analyzed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_analyzed warning:', err?.message || err);
  }
}

export function trackAnalysisCompleted(props: {
  duration_ms: number;
  model: string;
  token_estimate: number;
  success: true;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('analysis_completed')) return;

  try {
    posthog.capture('analysis_completed', {
      duration_ms: props.duration_ms,
      model: props.model,
      token_estimate: props.token_estimate,
      success: true,
    });
    console.info('[PostHog Event] analysis_completed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] analysis_completed warning:', err?.message || err);
  }
}

export function trackAnalysisFailed(props: {
  model: string;
  error_type: string;
  timeout: boolean;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('analysis_failed')) return;

  try {
    posthog.capture('analysis_failed', {
      model: props.model,
      error_type: props.error_type,
      timeout: props.timeout,
    });
    console.info('[PostHog Event] analysis_failed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] analysis_failed warning:', err?.message || err);
  }
}

export function trackPromptImproved(props: {
  improvement_type: 'clarity' | 'compression' | 'rewrite' | 'translation' | 'optimization' | string;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_improved', props.improvement_type)) return;

  try {
    posthog.capture('prompt_improved', {
      improvement_type: props.improvement_type,
    });
    console.info('[PostHog Event] prompt_improved tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_improved warning:', err?.message || err);
  }
}

export function trackWorkspaceStarted(props: { model: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('workspace_started')) return;

  try {
    posthog.capture('workspace_started', {
      model: props.model,
    });
    console.info('[PostHog Event] workspace_started tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] workspace_started warning:', err?.message || err);
  }
}

export function trackWorkspaceCompleted(props: {
  duration_ms: number;
  model: string;
  token_estimate: number;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('workspace_completed')) return;

  try {
    posthog.capture('workspace_completed', {
      duration_ms: props.duration_ms,
      model: props.model,
      token_estimate: props.token_estimate,
    });
    console.info('[PostHog Event] workspace_completed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] workspace_completed warning:', err?.message || err);
  }
}

export function trackWorkspaceFailed(props: {
  model: string;
  timeout: boolean;
  error_type: string;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('workspace_failed')) return;

  try {
    posthog.capture('workspace_failed', {
      model: props.model,
      timeout: props.timeout,
      error_type: props.error_type,
    });
    console.info('[PostHog Event] workspace_failed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] workspace_failed warning:', err?.message || err);
  }
}

export function trackModelSelected(props: { model: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('model_selected', props.model)) return;

  try {
    posthog.capture('model_selected', {
      model: props.model,
    });
    console.info('[PostHog Event] model_selected tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] model_selected warning:', err?.message || err);
  }
}

export function trackAiSuggestionAccepted(props: { suggestion_type: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('ai_suggestion_accepted', props.suggestion_type)) return;

  try {
    posthog.capture('ai_suggestion_accepted', {
      suggestion_type: props.suggestion_type,
    });
    console.info('[PostHog Event] ai_suggestion_accepted tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] ai_suggestion_accepted warning:', err?.message || err);
  }
}

export function trackAiSuggestionRejected(props: { suggestion_type: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('ai_suggestion_rejected', props.suggestion_type)) return;

  try {
    posthog.capture('ai_suggestion_rejected', {
      suggestion_type: props.suggestion_type,
    });
    console.info('[PostHog Event] ai_suggestion_rejected tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] ai_suggestion_rejected warning:', err?.message || err);
  }
}

// ─── SEARCH & DISCOVERY ANALYTICS EVENTS ───────────────────────────────────────

export function trackSearchPerformed(props: {
  query_length: number;
  filters_count: number;
  category: string;
  results_count: number;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('search_performed', `${props.query_length}:${props.results_count}`)) return;

  try {
    posthog.capture('search_performed', {
      query_length: props.query_length,
      filters_count: props.filters_count,
      category: props.category,
      results_count: props.results_count,
    });
    console.info('[PostHog Event] search_performed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] search_performed warning:', err?.message || err);
  }
}

export function trackSearchResultClicked(props: {
  result_position: number;
  prompt_visibility: string;
  source: 'search' | 'trending' | 'recommended' | 'collection' | string;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('search_result_clicked', `${props.source}:${props.result_position}`)) return;

  try {
    posthog.capture('search_result_clicked', {
      result_position: props.result_position,
      prompt_visibility: props.prompt_visibility,
      source: props.source,
    });
    console.info('[PostHog Event] search_result_clicked tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] search_result_clicked warning:', err?.message || err);
  }
}

export function trackFilterApplied(props: { filter_name: string; filter_value: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('filter_applied', `${props.filter_name}:${props.filter_value}`)) return;

  try {
    posthog.capture('filter_applied', {
      filter_name: props.filter_name,
      filter_value: props.filter_value,
    });
    console.info('[PostHog Event] filter_applied tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] filter_applied warning:', err?.message || err);
  }
}

export function trackSortChanged(props: { sort_type: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('sort_changed', props.sort_type)) return;

  try {
    posthog.capture('sort_changed', {
      sort_type: props.sort_type,
    });
    console.info('[PostHog Event] sort_changed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] sort_changed warning:', err?.message || err);
  }
}

export function trackCategoryViewed(props: { category: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('category_viewed', props.category)) return;

  try {
    posthog.capture('category_viewed', {
      category: props.category,
    });
    console.info('[PostHog Event] category_viewed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] category_viewed warning:', err?.message || err);
  }
}

export function trackTrendingPromptViewed(props: { prompt_position: number }): void {
  if (!isPostHogActive() || isDuplicateEvent('trending_prompt_viewed', String(props.prompt_position))) return;

  try {
    posthog.capture('trending_prompt_viewed', {
      prompt_position: props.prompt_position,
    });
    console.info('[PostHog Event] trending_prompt_viewed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] trending_prompt_viewed warning:', err?.message || err);
  }
}

export function trackRecommendedPromptViewed(props: { prompt_position: number }): void {
  if (!isPostHogActive() || isDuplicateEvent('recommended_prompt_viewed', String(props.prompt_position))) return;

  try {
    posthog.capture('recommended_prompt_viewed', {
      prompt_position: props.prompt_position,
    });
    console.info('[PostHog Event] recommended_prompt_viewed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] recommended_prompt_viewed warning:', err?.message || err);
  }
}

export function trackEmptySearchResult(props: { query_length: number; filters_count: number }): void {
  if (!isPostHogActive() || isDuplicateEvent('empty_search_result', String(props.query_length))) return;

  try {
    posthog.capture('empty_search_result', {
      query_length: props.query_length,
      filters_count: props.filters_count,
    });
    console.info('[PostHog Event] empty_search_result tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] empty_search_result warning:', err?.message || err);
  }
}

// ─── COLLECTIONS ANALYTICS EVENTS ──────────────────────────────────────────────

export function trackCollectionCreated(props: {
  visibility: 'public' | 'private' | string;
  prompts_count: number;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('collection_created')) return;

  try {
    posthog.capture('collection_created', {
      visibility: props.visibility,
      prompts_count: props.prompts_count,
    });
    console.info('[PostHog Event] collection_created tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] collection_created warning:', err?.message || err);
  }
}

export function trackCollectionUpdated(props: { prompts_count: number }): void {
  if (!isPostHogActive() || isDuplicateEvent('collection_updated')) return;

  try {
    posthog.capture('collection_updated', {
      prompts_count: props.prompts_count,
    });
    console.info('[PostHog Event] collection_updated tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] collection_updated warning:', err?.message || err);
  }
}

export function trackCollectionDeleted(props: { prompts_count: number }): void {
  if (!isPostHogActive() || isDuplicateEvent('collection_deleted')) return;

  try {
    posthog.capture('collection_deleted', {
      prompts_count: props.prompts_count,
    });
    console.info('[PostHog Event] collection_deleted tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] collection_deleted warning:', err?.message || err);
  }
}

export function trackCollectionShared(props: {
  destination: 'copy_link' | 'twitter' | 'linkedin' | 'reddit' | 'discord' | 'email' | string;
}): void {
  if (!isPostHogActive() || isDuplicateEvent('collection_shared', props.destination)) return;

  try {
    posthog.capture('collection_shared', {
      destination: props.destination,
    });
    console.info('[PostHog Event] collection_shared tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] collection_shared warning:', err?.message || err);
  }
}

export function trackCollectionViewed(props: { owner_type: 'self' | 'other' }): void {
  if (!isPostHogActive() || isDuplicateEvent('collection_viewed', props.owner_type)) return;

  try {
    posthog.capture('collection_viewed', {
      owner_type: props.owner_type,
    });
    console.info('[PostHog Event] collection_viewed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] collection_viewed warning:', err?.message || err);
  }
}

export function trackCollectionFollowed(): void {
  if (!isPostHogActive() || isDuplicateEvent('collection_followed')) return;

  try {
    posthog.capture('collection_followed', {});
    console.info('[PostHog Event] collection_followed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] collection_followed warning:', err?.message || err);
  }
}

export function trackCollectionUnfollowed(): void {
  if (!isPostHogActive() || isDuplicateEvent('collection_unfollowed')) return;

  try {
    posthog.capture('collection_unfollowed', {});
    console.info('[PostHog Event] collection_unfollowed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] collection_unfollowed warning:', err?.message || err);
  }
}

export function trackPromptAddedToCollection(props: { collection_visibility: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_added_to_collection')) return;

  try {
    posthog.capture('prompt_added_to_collection', {
      collection_visibility: props.collection_visibility,
    });
    console.info('[PostHog Event] prompt_added_to_collection tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_added_to_collection warning:', err?.message || err);
  }
}

export function trackPromptRemovedFromCollection(props: { collection_visibility: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('prompt_removed_from_collection')) return;

  try {
    posthog.capture('prompt_removed_from_collection', {
      collection_visibility: props.collection_visibility,
    });
    console.info('[PostHog Event] prompt_removed_from_collection tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] prompt_removed_from_collection warning:', err?.message || err);
  }
}

// ─── NAVIGATION & ENGAGEMENT ANALYTICS EVENTS ─────────────────────────────

export function trackScreenViewed(props: { screen_name: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('screen_viewed', props.screen_name)) return;

  try {
    posthog.capture('screen_viewed', {
      screen_name: props.screen_name,
    });
    console.info(`[PostHog Event] screen_viewed tracked: ${props.screen_name}`);
  } catch (err: any) {
    console.warn('[PostHog Event] screen_viewed warning:', err?.message || err);
  }
}

export function trackRouteChanged(props: { from: string; to: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('route_changed', `${props.from}->${props.to}`)) return;

  try {
    posthog.capture('route_changed', {
      from: props.from,
      to: props.to,
    });
    console.info(`[PostHog Event] route_changed tracked: ${props.from} -> ${props.to}`);
  } catch (err: any) {
    console.warn('[PostHog Event] route_changed warning:', err?.message || err);
  }
}

export function trackSidebarNavigation(props: { destination: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('sidebar_navigation', props.destination)) return;

  try {
    posthog.capture('sidebar_navigation', {
      destination: props.destination,
    });
    console.info(`[PostHog Event] sidebar_navigation tracked: ${props.destination}`);
  } catch (err: any) {
    console.warn('[PostHog Event] sidebar_navigation warning:', err?.message || err);
  }
}

export function trackNavbarNavigation(props: { destination: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('navbar_navigation', props.destination)) return;

  try {
    posthog.capture('navbar_navigation', {
      destination: props.destination,
    });
    console.info(`[PostHog Event] navbar_navigation tracked: ${props.destination}`);
  } catch (err: any) {
    console.warn('[PostHog Event] navbar_navigation warning:', err?.message || err);
  }
}

export function trackDashboardViewed(props: { dashboard_type: 'personal' | 'community' | 'admin' | string }): void {
  if (!isPostHogActive() || isDuplicateEvent('dashboard_viewed', props.dashboard_type)) return;

  try {
    posthog.capture('dashboard_viewed', {
      dashboard_type: props.dashboard_type,
    });
    console.info('[PostHog Event] dashboard_viewed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] dashboard_viewed warning:', err?.message || err);
  }
}

export function trackSettingsViewed(): void {
  if (!isPostHogActive() || isDuplicateEvent('settings_viewed')) return;

  try {
    posthog.capture('settings_viewed', {});
    console.info('[PostHog Event] settings_viewed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] settings_viewed warning:', err?.message || err);
  }
}

export function trackProfileViewed(props: { owner_type: 'self' | 'other' }): void {
  if (!isPostHogActive() || isDuplicateEvent('profile_viewed', props.owner_type)) return;

  try {
    posthog.capture('profile_viewed', {
      owner_type: props.owner_type,
    });
    console.info('[PostHog Event] profile_viewed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] profile_viewed warning:', err?.message || err);
  }
}

export function trackNotificationViewed(props: { unread_count: number }): void {
  if (!isPostHogActive() || isDuplicateEvent('notification_viewed', String(props.unread_count))) return;

  try {
    posthog.capture('notification_viewed', {
      unread_count: props.unread_count,
    });
    console.info('[PostHog Event] notification_viewed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] notification_viewed warning:', err?.message || err);
  }
}

export function trackNotificationClicked(props: { notification_type: string }): void {
  if (!isPostHogActive() || isDuplicateEvent('notification_clicked', props.notification_type)) return;

  try {
    posthog.capture('notification_clicked', {
      notification_type: props.notification_type,
    });
    console.info('[PostHog Event] notification_clicked tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] notification_clicked warning:', err?.message || err);
  }
}

export function trackThemeChanged(props: { theme: 'light' | 'dark' | 'system' | string }): void {
  if (!isPostHogActive() || isDuplicateEvent('theme_changed', props.theme)) return;

  try {
    posthog.capture('theme_changed', {
      theme: props.theme,
    });
    console.info('[PostHog Event] theme_changed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] theme_changed warning:', err?.message || err);
  }
}

export function trackOnboardingCompleted(): void {
  if (!isPostHogActive() || isDuplicateEvent('onboarding_completed')) return;

  try {
    posthog.capture('onboarding_completed', {});
    console.info('[PostHog Event] onboarding_completed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] onboarding_completed warning:', err?.message || err);
  }
}

export function trackTutorialStarted(): void {
  if (!isPostHogActive() || isDuplicateEvent('tutorial_started')) return;

  try {
    posthog.capture('tutorial_started', {});
    console.info('[PostHog Event] tutorial_started tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] tutorial_started warning:', err?.message || err);
  }
}

export function trackTutorialCompleted(): void {
  if (!isPostHogActive() || isDuplicateEvent('tutorial_completed')) return;

  try {
    posthog.capture('tutorial_completed', {});
    console.info('[PostHog Event] tutorial_completed tracked.');
  } catch (err: any) {
    console.warn('[PostHog Event] tutorial_completed warning:', err?.message || err);
  }
}

