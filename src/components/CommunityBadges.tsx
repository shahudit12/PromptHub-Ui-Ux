import React from 'react';
import type { BadgeType } from '../db/schema';
import { Bug, Star, Rocket, Flame, Gem, Shield, TrendingUp, Crown, Zap } from 'lucide-react';

interface CommunityBadgesProps {
  badges?: BadgeType[];
  size?: 'xs' | 'sm' | 'md';
}

const BADGE_CONFIG: Record<
  BadgeType,
  { label: string; description: string; icon: React.ReactNode; color: string; border: string; bg: string }
> = {
  early_pioneer: {
    label: 'Early Pioneer',
    description: 'Early Pioneer: User signed in before 1/09/2026',
    icon: <Rocket className="w-3 h-3 text-brand-primary" />,
    color: 'text-brand-primary',
    border: 'border-brand-primary/30',
    bg: 'bg-brand-primary-light',
  },
  bug_hunter: {
    label: 'Bug Hunter',
    description: 'Bug Hunter: User reported a bug approved by admin',
    icon: <Bug className="w-3 h-3 text-brand-primary" />,
    color: 'text-brand-primary',
    border: 'border-brand-primary/30',
    bg: 'bg-brand-primary-light',
  },
  top_creator: {
    label: 'Top Creator',
    description: 'Top Creator: User prompt is #1 on the leaderboard',
    icon: <Star className="w-3 h-3 text-amber-600 dark:text-amber-400 fill-amber-500/20" />,
    color: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
  prompt_master: {
    label: 'Prompt Master',
    description: 'Prompt Master: Proven high quality prompt architect',
    icon: <Flame className="w-3 h-3 text-rose-600 dark:text-rose-400 fill-rose-500/20" />,
    color: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
  },
  pro_member: {
    label: 'Pro Member',
    description: 'Pro Member: Active subscription or unlocked trial',
    icon: <Gem className="w-3 h-3 text-brand-primary" />,
    color: 'text-brand-primary',
    border: 'border-brand-primary/30',
    bg: 'bg-brand-primary-light',
  },
  core_contributor: {
    label: 'Core Contributor',
    description: 'Core Contributor: PromptHub Team & Administrator',
    icon: <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />,
    color: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
  // ── Subscription-tier badges ───────────────────────────────────────────────
  free_explorer: {
    label: 'Free Explorer',
    description: 'Free Explorer: Active PromptHub community member',
    icon: <Rocket className="w-3 h-3 text-text-muted" />,
    color: 'text-text-muted',
    border: 'border-border-default',
    bg: 'bg-bg-tertiary',
  },
  starter_member: {
    label: 'Starter Member',
    description: 'Starter Member: PromptHub Starter plan subscriber',
    icon: <Star className="w-3 h-3 text-sky-600 fill-sky-400/20" />,
    color: 'text-sky-700',
    border: 'border-sky-200',
    bg: 'bg-sky-50',
  },
  growth_member: {
    label: 'Growth Member',
    description: 'Growth Member: PromptHub Growth plan subscriber',
    icon: <TrendingUp className="w-3 h-3 text-amber-600" />,
    color: 'text-amber-700',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
  },
  studio_elite: {
    label: 'Studio Elite',
    description: 'Studio Elite: PromptHub Studio plan subscriber — top tier',
    icon: <Crown className="w-3 h-3 text-violet-600" />,
    color: 'text-violet-700',
    border: 'border-violet-200',
    bg: 'bg-violet-50',
  },
  // ── Credit backer badge ────────────────────────────────────────────────────
  power_patron: {
    label: 'Power Patron',
    description: 'Power Patron: Backed PromptHub with ₹200+ in AI credits',
    icon: <Zap className="w-3 h-3 text-amber-500 fill-amber-400/20" />,
    color: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-400/40',
    bg: 'bg-amber-500/10',
  },
};

export const CommunityBadges: React.FC<CommunityBadgesProps> = ({
  badges,
  size = 'xs',
}) => {
  // Only display valid, actually earned badges
  const displayBadges: BadgeType[] = Array.isArray(badges)
    ? badges.filter((b): b is BadgeType => Boolean(b && BADGE_CONFIG[b]))
    : [];

  if (displayBadges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 inline-flex">
      {displayBadges.map((badgeKey) => {
        const cfg = BADGE_CONFIG[badgeKey];
        if (!cfg) return null;

        return (
          <span
            key={badgeKey}
            title={cfg.description}
            aria-label={cfg.description}
            className={`inline-flex items-center gap-1 font-mono font-bold rounded-full border shadow-sm transition-all hover:scale-105 cursor-default ${
              size === 'xs'
                ? 'px-2 py-0.5 text-[9px]'
                : size === 'sm'
                ? 'px-2.5 py-1 text-[10px]'
                : 'px-3 py-1 text-xs'
            } ${cfg.bg} ${cfg.border} ${cfg.color}`}
          >
            {cfg.icon}
            <span>{cfg.label}</span>
          </span>
        );
      })}
    </div>
  );
};
