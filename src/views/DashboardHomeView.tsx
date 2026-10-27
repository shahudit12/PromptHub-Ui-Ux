/**
 * DashboardHomeView — Authenticated Home
 *
 * Design Read: "Reading this as: authenticated home dashboard for prompt engineers and creators,
 * with a developer studio language, leaning toward high-utility editorial product UI."
 *
 * Requirements (Handwritten Home Specification Image 1):
 * - Workspace composer removed from Home page (Workspace kept strictly inside Workspace tab)
 * - Section 1 (S1): Dynamic Animated Greeting with rotating subtitles
 * - Section 2 (S2): Real Stats & Metrics (Total Prompts, Public Prompts/Forks, Profile Visits, Total Likes, Prompts in Library)
 * - Section 3 (S3): Quick Start action buttons & Recent Prompts list
 * - Section 4 (S4): Explore Platform feature cards
 * - Footer / Reviews: Ready to launch banner & 5-star developer testimonials
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import type { TabType } from '../context/AppContext';
import type { Prompt } from '../db/schema';
import {
  PenLine,
  BookOpen,
  ChevronRight,
  GitFork,
  Eye,
  FileText,
  Layers,
  TrendingUp,
  ArrowUpRight,
  ShoppingBag,
  Newspaper,
  Star,
  CheckCircle2,
  Send,
  Sparkles,
  Code2,
  Terminal,
  Trash2,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useConfirm } from '../hooks/useConfirm';
import { securityUtils } from '../utils/security';
import { PromptKeyIcon } from '../components/icons/PromptHubIcons';
import {
  isSpamReview,
  sanitizeAndDeduplicateReviews,
  type PlatformReview,
} from '../utils/reviewUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(isoDate: string): string {
  try {
    const diff = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    coding: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    writing: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
    analysis: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    creative: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
    business: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
    research: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300',
    education: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
    marketing: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
  };
  return map[category?.toLowerCase()] ?? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  tab: TabType;
  onNavigate: (tab: TabType) => void;
  accent?: boolean;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, description, tab, onNavigate, accent }) => (
  <button
    type="button"
    onClick={() => onNavigate(tab)}
    aria-label={`Go to ${label}`}
    className={`
      group w-full text-left min-h-[66px] px-4 py-3 sm:py-3.5 rounded-xl border transition-all cursor-pointer
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-1
      ${accent
        ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hi)] shadow-xs'
        : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--bg-tertiary)]/70'
      }
    `}
    style={{ transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
  >
    <div className="flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          accent ? 'bg-white/20 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--brand-primary)] group-hover:bg-[var(--brand-primary-light)]'
        }`}
        style={{ transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold leading-tight ${accent ? 'text-white' : 'text-[var(--text-primary)]'}`}>
          {label}
        </div>
        <div className={`text-xs mt-0.5 leading-tight truncate ${accent ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
          {description}
        </div>
      </div>
      <ChevronRight
        className={`w-4 h-4 opacity-40 group-hover:opacity-90 group-hover:translate-x-0.5 shrink-0 ${accent ? 'text-white' : 'text-[var(--text-muted)]'}`}
        style={{ transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      />
    </div>
  </button>
);

interface PromptRowProps {
  prompt: Prompt;
  onOpen: (prompt: Prompt) => void;
}

const PromptRow: React.FC<PromptRowProps> = ({ prompt, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(prompt)}
    aria-label={`Open prompt: ${prompt.title}`}
    className="
      group w-full text-left min-h-[60px] px-4 py-3 flex items-center gap-3
      border-b border-[var(--border-subtle)] last:border-0
      hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary)]
    "
    style={{ transition: 'background 150ms ease' }}
  >
    {/* Icon */}
    <div
      className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] group-hover:bg-[var(--brand-primary-light)] flex items-center justify-center shrink-0"
      style={{ transition: 'background 150ms ease' }}
    >
      <FileText className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
    </div>

    {/* Title + meta */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium text-[var(--text-primary)] truncate">
          {prompt.title}
        </span>
        {prompt.visibility === 'public' && (
          <Eye className="w-3 h-3 text-[var(--text-muted)] shrink-0" aria-label="Public" />
        )}
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${getCategoryColor(prompt.category)}`}>
          {prompt.category}
        </span>
        <span className="text-[11px] text-[var(--text-muted)]">
          {formatRelativeTime(prompt.updatedAt)}
        </span>
      </div>
    </div>

    {/* Stats */}
    <div className="hidden sm:flex items-center gap-3 shrink-0 text-[11px] text-[var(--text-muted)]">
      {prompt.likesCount > 0 && (
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {prompt.likesCount}
        </span>
      )}
      {prompt.forksCount > 0 && (
        <span className="flex items-center gap-1">
          <GitFork className="w-3 h-3" />
          {prompt.forksCount}
        </span>
      )}
    </div>

    <ChevronRight
      className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-60 shrink-0"
      style={{ transition: 'opacity 150ms ease' }}
    />
  </button>
);

interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subtext, icon }) => (
  <div className="flex flex-col justify-between p-4 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl min-h-[96px] shadow-3xs transition-all hover:border-[var(--brand-primary)]/40 hover:shadow-xs">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        {label}
      </span>
      <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0 text-[var(--brand-primary)]">
        {icon}
      </div>
    </div>
    <div className="mt-2">
      <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--text-primary)] leading-tight">
        {value}
      </div>
      {subtext && (
        <div className="text-[10.5px] text-[var(--text-muted)] mt-0.5 truncate">
          {subtext}
        </div>
      )}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const DashboardHomeView: React.FC = () => {
  const { user, prompts, setActiveTab, setActivePromptId, showToast, setShowAuthModal } = useApp();
  const { setWorkingPrompt } = useWorkspace();

  // Real data — sorted by most recently updated
  const recentPrompts = useMemo<Prompt[]>(() => {
    if (!prompts?.length) return [];
    const seen = new Set<string>();
    return [...prompts]
      .filter((p) => {
        if (!p?.id || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8);
  }, [prompts]);

  const myPrompts = useMemo(() => prompts?.filter((p) => p.authorId === user?.id) ?? [], [prompts, user]);
  const publicPrompts = useMemo(() => myPrompts.filter((p) => p.visibility === 'public'), [myPrompts]);
  const totalLikes = useMemo(
    () => myPrompts.reduce((acc, p) => acc + (p.likesCount ?? 0), 0) || (user?.totalLikes ?? 0),
    [myPrompts, user]
  );
  const totalForks = useMemo(
    () => myPrompts.reduce((acc, p) => acc + (p.forksCount ?? 0), 0) || (user?.forkCount ?? 0),
    [myPrompts, user]
  );

  const handleOpenPrompt = (prompt: Prompt) => {
    setActivePromptId(prompt.id);
    setActiveTab('workspace');
  };

  const firstName = user?.name?.split(' ')[0] || user?.username || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Section 1: Animated Rotating Subtitle Messages (Image 1 specifications)
  const rotatingMessages = useMemo(() => {
    const promptCount = myPrompts.length;
    return [
      promptCount === 1
        ? 'You have 1 prompt in your personal library'
        : `You have ${promptCount} prompts in your personal library`,
      'PromptHub — your platform for crafting, testing, and sharing prompts',
      'Have an idea? Create a prompt and test it across top AI models',
      promptCount === 0
        ? 'Your library is ready — create your first prompt today'
        : 'Continue where you left off, or discover new community templates',
    ];
  }, [myPrompts.length]);

  const [activeMessageIndex, setActiveMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMessageIndex((prev) => (prev + 1) % rotatingMessages.length);
    }, 4200);
    return () => clearInterval(interval);
  }, [rotatingMessages.length]);

  const confirm = useConfirm();

  // Real platform reviews state (sanitized and deduplicated — ZERO fake or spam data)
  const [reviews, setReviews] = useState<PlatformReview[]>(() => {
    try {
      const stored = localStorage.getItem('ph_platform_reviews');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      const cleaned = sanitizeAndDeduplicateReviews(parsed);
      // Immediately purge dirty spam from localStorage if detected
      if (cleaned.length !== parsed.length) {
        localStorage.setItem('ph_platform_reviews', JSON.stringify(cleaned.slice(0, 50)));
      }
      return cleaned;
    } catch {
      return [];
    }
  });

  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [isDeletingMyReview, setIsDeletingMyReview] = useState<boolean>(false);

  // Sync authenticated user review strictly to user.id (NEVER fall back to someone else's review)
  const currentUserReview = useMemo(() => {
    if (!user?.id) return null;
    return reviews.find((r) => r.userId === user.id) || null;
  }, [user?.id, reviews]);

  const hasUserReviewed = Boolean(currentUserReview);

  useEffect(() => {
    try {
      // Purge obsolete guest review flag so it never pollutes logged-in users
      localStorage.removeItem('ph_user_has_reviewed_guest');

      // Purge or sync user's personal review key
      if (user?.id) {
        const key = `ph_user_has_reviewed_${user.id}`;
        if (currentUserReview) {
          localStorage.setItem(key, 'true');
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch {}
  }, [user?.id, currentUserReview]);

  useEffect(() => {
    const handleReviewDeleted = (e: any) => {
      const deletedId = e.detail?.id;
      const deletedUserId = e.detail?.userId;
      setReviews((prev) => prev.filter((r) => r.id !== deletedId && (!deletedUserId || r.userId !== deletedUserId)));
    };
    window.addEventListener('ph_review_deleted', handleReviewDeleted);

    return () => {
      window.removeEventListener('ph_review_deleted', handleReviewDeleted);
    };
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to submit a review.', 'info');
      return;
    }

    if (hasUserReviewed || localStorage.getItem(`ph_user_has_reviewed_${user.id}`) === 'true' || reviews.some((r) => r.userId === user.id)) {
      showToast('You have already submitted a review for PromptHub. You cannot review twice.', 'info');
      return;
    }

    const rateCheck = securityUtils.rateLimit('submit_platform_review', 3000);
    if (!rateCheck.allowed) {
      showToast(rateCheck.error || 'Please wait a moment before submitting another review.', 'info');
      return;
    }

    const cleanComment = securityUtils.sanitizeText(reviewComment.trim());
    if (userRating < 1 || userRating > 5) {
      showToast('Please select a star rating between 1 and 5.', 'info');
      return;
    }

    // Anti-spam guard: reject gibberish keyboard-mashing
    if (cleanComment && isSpamReview({ comment: cleanComment })) {
      showToast('Please provide constructive and meaningful feedback.', 'info');
      return;
    }

    setIsSubmittingReview(true);
    const reviewId = securityUtils.generateUUID();
    const now = new Date().toISOString();
    const newReview: PlatformReview = {
      id: reviewId,
      userId: user?.id || 'guest',
      userName: user?.name || user?.username || 'Verified Creator',
      rating: userRating,
      comment: cleanComment,
      createdAt: now,
    };

    try {
      const updatedReviews = sanitizeAndDeduplicateReviews([newReview, ...reviews]);
      setReviews(updatedReviews);
      try {
        localStorage.setItem('ph_platform_reviews', JSON.stringify(updatedReviews.slice(0, 50)));
        if (user?.id) {
          localStorage.setItem(`ph_user_has_reviewed_${user.id}`, 'true');
        }
      } catch {
        // quota fallback
      }

      // Dispatch event to Admin Portal & other components
      window.dispatchEvent(new CustomEvent('ph_review_submitted', { detail: newReview }));

      

      setReviewComment('');
      showToast('Thank you! Your review has been submitted and sent to the Admin Portal.', 'success');
    } catch {
      showToast('Review submitted locally.', 'success');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteMyReview = async () => {
    if (!currentUserReview) return;
    const isConfirmed = await confirm({
      title: 'Delete Your Review',
      message: 'Are you sure you want to remove your review from PromptHub? Each account is permitted at most one review.',
      confirmText: 'Delete Review',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    setIsDeletingMyReview(true);
    try {
      const reviewIdToDelete = currentUserReview.id;
      const currentUserId = user?.id;
      const updatedReviews = reviews.filter((r) => r.id !== reviewIdToDelete && (!currentUserId || r.userId !== currentUserId));
      setReviews(updatedReviews);
      try {
        localStorage.setItem('ph_platform_reviews', JSON.stringify(updatedReviews.slice(0, 50)));
        if (currentUserId) {
          localStorage.removeItem(`ph_user_has_reviewed_${currentUserId}`);
        }
      } catch {}

      

      setReviewComment('');
      setUserRating(5);

      window.dispatchEvent(new CustomEvent('ph_review_deleted', { detail: { id: reviewIdToDelete, userId: currentUserId } }));
      showToast('Your review has been removed. You can now submit a new review.', 'success');
    } catch {
      showToast('Failed to delete review.', 'error');
    } finally {
      setIsDeletingMyReview(false);
    }
  };

  return (
    <main
      className="min-h-screen bg-[var(--bg-primary)] select-none"
      aria-label="Home dashboard"
    >
      {/* ── Page body ────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">

        {/* ── S1: Dynamic Animated Greeting ────────────────────────── */}
        <section aria-labelledby="home-greeting" className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1
                id="home-greeting"
                className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] tracking-tight font-display"
              >
                {greeting}, {firstName}.
              </h1>

              {/* Dynamic Animated Rotating Subtitle */}
              <div className="mt-2 h-7 flex items-center min-w-0 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeMessageIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="text-sm sm:text-base font-normal text-[var(--text-secondary)] flex items-center gap-2 truncate"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] shrink-0" />
                    <span className="truncate">{rotatingMessages[activeMessageIndex]}</span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Direct Quick Action to Open Workspace */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('workspace')}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hi)] text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                style={{ transition: 'background 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Open Workspace</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── S2: Stats & Metrics Grid (Image 1 S2) ────────────────── */}
        <section aria-label="Account statistics and activity metrics">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Metrics &amp; Activity
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* 1. Total Prompts */}
            <StatCard
              icon={<FileText className="w-4 h-4 text-blue-500" />}
              label="Total Prompts"
              value={myPrompts.length || (user?.promptCount ?? 0)}
              subtext="Created by you"
            />

            {/* 2. Public Prompts (Your Forks) */}
            <StatCard
              icon={<GitFork className="w-4 h-4 text-sky-500" />}
              label="Public Prompts"
              value={publicPrompts.length}
              subtext={`${totalForks} forks • Your forks`}
            />

            {/* 3. Total Profile Visits */}
            <StatCard
              icon={<Eye className="w-4 h-4 text-emerald-500" />}
              label="Profile Visits"
              value={(user?.totalViews ?? 0).toLocaleString('en-IN')}
              subtext="Total profile visits"
            />

            {/* 4. Total Likes */}
            <StatCard
              icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
              label="Total Likes"
              value={totalLikes.toLocaleString('en-IN')}
              subtext="Community appreciation"
            />

            {/* 5. Total Prompts in Library */}
            <StatCard
              icon={<BookOpen className="w-4 h-4 text-purple-500" />}
              label="Prompts in Library"
              value={(prompts?.length ?? 0).toLocaleString('en-IN')}
              subtext="Total prompts in library"
            />
          </div>
        </section>

        {/* ── S3: Main layout: Quick Start Buttons & Recent Prompts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6 lg:gap-8 items-start">

          {/* ── Quick Start Buttons ────────────────────────────── */}
          <section aria-labelledby="quick-actions-heading" className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2
                id="quick-actions-heading"
                className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider"
              >
                Quick Start
              </h2>
            </div>
            <div className="flex flex-col gap-2.5">
              <QuickAction
                icon={<Sparkles className="w-4 h-4" />}
                label="Workspace"
                description="One chat, live interactive builds"
                tab="workspace"
                onNavigate={setActiveTab}
                accent
              />
              <QuickAction
                icon={<PenLine className="w-4 h-4" />}
                label="Create Prompt"
                description="Draft structured AI templates"
                tab="create-prompt"
                onNavigate={setActiveTab}
              />
              <QuickAction
                icon={<BookOpen className="w-4 h-4" />}
                label="Browse Library"
                description="Your saved & forked prompts"
                tab="library"
                onNavigate={setActiveTab}
              />
              <QuickAction
                icon={<PromptKeyIcon size={16} className="text-amber-500" />}
                label="API Keys & BYOK"
                description="Add custom OpenAI, Claude, Gemini keys"
                tab="credentials"
                onNavigate={setActiveTab}
              />
            </div>
          </section>

          {/* ── Recent Prompts ─────────────────────────────────── */}
          <section aria-labelledby="recent-prompts-heading" className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2
                id="recent-prompts-heading"
                className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider"
              >
                Recent Prompts
              </h2>
              {recentPrompts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('library')}
                  className="flex items-center gap-1 text-[11px] text-[var(--brand-primary)] hover:text-[var(--brand-primary-hi)] font-medium transition-colors min-h-[44px] px-2 cursor-pointer"
                  aria-label="View all prompts in library"
                >
                  View all
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {recentPrompts.length === 0 ? (
              /* ── Interactive Starter Templates Empty State ── */
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl sm:rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-3xs space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)] font-display uppercase tracking-wider">
                      Quick Starter Templates
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Launch high-performance AI prompts or build live web apps in 1 click
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('marketplace')}
                    className="text-[11px] font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>More templates</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      title: 'Fullstack React App',
                      desc: 'Interactive web app with state & Tailwind CSS',
                      category: 'Coding',
                      icon: Code2,
                      prompt: 'Build a modern responsive dashboard web application with interactive widgets, dark mode support, and clean state management.',
                    },
                    {
                      title: 'System Prompt Architect',
                      desc: 'Production-grade instructions with strict guardrails',
                      category: 'System',
                      icon: Terminal,
                      prompt: 'Create a production-grade system prompt for an autonomous AI support assistant with strict tone guardrails, JSON output formatting, and fallback logic.',
                    },
                    {
                      title: 'REST API & Schema Generator',
                      desc: 'Type-safe TypeScript endpoints with validation',
                      category: 'Backend',
                      icon: Sparkles,
                      prompt: 'Generate a complete TypeScript REST API with Zod validation schemas, error handlers, and mock endpoints for an e-commerce platform.',
                    },
                    {
                      title: 'Multi-Agent Orchestrator',
                      desc: 'Sequential task execution with error recovery',
                      category: 'Agents',
                      icon: Layers,
                      prompt: 'Design a multi-agent orchestration workflow where a researcher, writer, and editor agent collaborate to produce a comprehensive technical research report.',
                    },
                  ].map((tpl) => (
                    <button
                      key={tpl.title}
                      type="button"
                      onClick={() => {
                        setWorkingPrompt({
                          title: tpl.title,
                          description: tpl.desc,
                          rawContent: tpl.prompt,
                          category: tpl.category as any,
                          model: 'liquid/lfm-2.5-2.6b:free',
                        });
                        setActiveTab('workspace');
                      }}
                      className="group p-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)]/50 hover:bg-[var(--bg-tertiary)] hover:border-[var(--brand-primary)]/40 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[96px]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <tpl.icon className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                          <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors truncate">
                            {tpl.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-subtle)] shrink-0">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-1">
                        {tpl.desc}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--brand-primary)] mt-2">
                        <span>Open in Workspace</span>
                        <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
                  <span>Want to craft a prompt template from scratch?</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create-prompt')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white text-xs font-semibold hover:bg-[var(--brand-primary-hi)] transition-colors cursor-pointer min-h-[36px]"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    <span>Create a Prompt</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ── Prompt list ── */
              <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl sm:rounded-2xl overflow-hidden divide-y divide-[var(--border-subtle)] shadow-3xs">
                {recentPrompts.map((prompt) => (
                  <PromptRow
                    key={prompt.id}
                    prompt={prompt}
                    onOpen={handleOpenPrompt}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── S4: Explore Platform (Image 1 S4) ────────────────────── */}
        <section aria-label="Explore Platform features" className="pt-8 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />
              <h2 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Explore Platform
              </h2>
            </div>
            <span className="text-[11px] text-[var(--text-muted)] font-medium hidden sm:inline">
              PromptHub Core Modules
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                icon: <ShoppingBag className="w-4 h-4" />,
                label: 'Prompt Marketplace',
                tab: 'marketplace' as TabType,
                desc: 'Discover, trade & test prompts',
              },
              {
                icon: <Sparkles className="w-4 h-4" />,
                label: 'Creation Workspace',
                tab: 'workspace' as TabType,
                desc: 'Generate web apps & prototypes',
              },
              {
                icon: <Layers className="w-4 h-4" />,
                label: 'Community Hub',
                tab: 'community' as TabType,
                desc: 'Trending prompts, forks & chat',
              },
              {
                icon: <Newspaper className="w-4 h-4" />,
                label: 'AI News & Insights',
                tab: 'news' as TabType,
                desc: 'Curated AI model releases',
              },
            ].map(({ icon, label, tab, desc }) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-label={`Go to ${label}`}
                className="
                  group relative flex flex-col justify-between p-4 sm:p-5 min-h-[116px]
                  bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl sm:rounded-2xl
                  hover:border-[var(--brand-primary)]/50 hover:bg-[var(--bg-tertiary)]/70 hover:shadow-xs
                  transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]
                  text-left cursor-pointer
                "
                style={{ transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className="w-9 h-9 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] group-hover:bg-[var(--brand-primary)] group-hover:text-white flex items-center justify-center text-[var(--brand-primary)]"
                    style={{ transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                  >
                    {icon}
                  </div>
                  <ArrowUpRight
                    className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    style={{ transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                  />
                </div>
                <div className="min-w-0 mt-3 sm:mt-4">
                  <div className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                    {label}
                  </div>
                  <div className="text-[11px] sm:text-xs text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] mt-0.5 transition-colors truncate">
                    {desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Ready to Launch (V1 Final) & Reviews Section per Image 1 ── */}
        <section aria-label="Ready to Launch & Customer Reviews" className="pt-8 border-t border-[var(--border-subtle)]">
          {/* Ready to launch (FINAL) Banner */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border border-[var(--border-default)] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Ready to launch &bull; FINAL (V1)
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono">100% Production Ready</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight font-display">
                Ready to build and launch your next AI application?
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Take advantage of unified multi-agent coding, 50+ free models, and deterministic testing to ship faster with PromptHub.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('create-prompt')}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hi)] text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <PenLine className="w-4 h-4 shrink-0" />
                <span>Create a Prompt</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('marketplace')}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[var(--border-default)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                Browse Marketplace
              </button>
            </div>
          </div>

          {/* Reviews & Feedback (Image 1: Reviews :- 1, 2, 3, 4, 5) — Zero Fake Data */}
          <div className="mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        reviews.length > 0 && star <= Math.round(reviews.reduce((a, b) => a + b.rating, 0) / reviews.length)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-amber-400/20 text-amber-400/50'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {reviews.length > 0
                    ? `Reviews • ${(reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1)} / 5.0 (${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'})`
                    : 'Reviews & Feedback • 1 to 5 Stars'}
                </span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {reviews.length > 0
                  ? 'Real feedback submitted by creators'
                  : 'Zero fake testimonials • Share honest feedback'}
              </span>
            </div>

            {/* Once-only Review Lock: Show confirmation card if user has already reviewed */}
            {hasUserReviewed ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-secondary)] border border-emerald-500/30 bg-emerald-500/5 shadow-3xs flex flex-col gap-3 mb-6 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5 flex-wrap">
                        <span>Your Review Has Been Submitted</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                          1 Review Per Account • You cannot review twice
                        </span>
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Synchronized directly to PromptHub Admin Portal &amp; 24/7 Live Monitoring
                      </p>
                    </div>
                  </div>
                  {currentUserReview && (
                    <div className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20 self-start sm:self-auto shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= currentUserReview.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-600'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-mono font-bold text-amber-500 ml-1">
                        {currentUserReview.rating}.0
                      </span>
                    </div>
                  )}
                </div>
                {currentUserReview?.comment ? (
                  <p className="text-xs text-[var(--text-secondary)] italic bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-subtle)]">
                    "{currentUserReview.comment}"
                  </p>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic">
                    Rated {currentUserReview?.rating || 5} out of 5 stars (No written feedback provided).
                  </p>
                )}
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono pt-1">
                  <span>Author: {currentUserReview?.userName || user?.name || 'Verified Creator'}</span>
                  <div className="flex items-center gap-3">
                    {currentUserReview?.createdAt && (
                      <span>Submitted {formatRelativeTime(currentUserReview.createdAt)}</span>
                    )}
                    <button
                      type="button"
                      onClick={handleDeleteMyReview}
                      disabled={isDeletingMyReview}
                      aria-label="Delete my review"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50 min-h-[32px] font-sans font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isDeletingMyReview ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : !user ? (
              /* Interactive Review & Feedback Submission Form */
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)] shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Sign in to leave a review</h4>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Each verified account is permitted at most one review. Sign in to share your rating.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(true)}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hi)] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors shrink-0"
                  >
                    Sign In to Review
                  </button>
                </div>
              ) : (
              <form
                onSubmit={handleSubmitReview}
                className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-default)] shadow-3xs flex flex-col gap-3.5 mb-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Rate your PromptHub experience:
                  </span>
                  <div className="flex items-center gap-1" role="radiogroup" aria-label="Select star rating">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = star <= (hoverRating || userRating);
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setUserRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
                        >
                          <Star
                            className={`w-5 h-5 transition-transform ${
                              isFilled ? 'fill-amber-400 text-amber-400 scale-110' : 'text-neutral-300 dark:text-neutral-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                    <span className="text-xs font-mono font-medium text-[var(--text-secondary)] ml-1">
                      {userRating} / 5
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share feedback, suggestions or feature requests (optional)..."
                    maxLength={500}
                    className="flex-1 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hi)] text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    style={{ transition: 'background 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingReview ? 'Submitting...' : 'Submit Review'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Real Submitted Reviews Display or Authentic Empty State (ZERO FAKE DATA) */}
            {reviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                {reviews.slice(0, 6).map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] shadow-3xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-0.5 text-amber-400 mb-2">
                        {Array.from({ length: rev.rating }).map((_, sIdx) => (
                          <Star key={sIdx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      {rev.comment ? (
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                          "{rev.comment}"
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] italic">
                          Rated {rev.rating} out of 5 stars
                        </p>
                      )}
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">{rev.userName}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">
                          {formatRelativeTime(rev.createdAt)}
                        </div>
                      </div>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-[var(--bg-secondary)] border border-dashed border-[var(--border-default)] text-center flex flex-col items-center justify-center">
                <Star className="w-6 h-6 text-amber-400/60 mb-2" />
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  No community reviews submitted yet
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-sm">
                  Be the first to rate PromptHub and share feedback using the form above.
                </p>
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
};

export default DashboardHomeView;
