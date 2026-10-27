import React from 'react';
import {
  BarChart2, Eye, Heart, GitBranch, Star, Zap, HardDrive, Award
} from 'lucide-react';
import type { User, Prompt } from '../db/schema';

interface ProfileDashboardWidgetProps {
  user: User;
  prompts: Prompt[];
  onNavigate: (tab: string) => void;
}

export const ProfileDashboardWidget: React.FC<ProfileDashboardWidgetProps> = ({
  user,
  prompts,
  onNavigate,
}) => {
  const myPrompts = prompts.filter(p => p.authorId === user.id);
  const totalViews = myPrompts.reduce((s, p) => s + (p.viewsCount || 0), 0);
  const totalLikes = myPrompts.reduce((s, p) => s + (p.likesCount || 0), 0);
  const totalForks = myPrompts.reduce((s, p) => s + (p.forksCount || 0), 0);
  const ratedPrompts = myPrompts.filter(p => (p.ratingCount || 0) > 0 && p.averageRating);
  const avgRating = ratedPrompts.length > 0
    ? ratedPrompts.reduce((s, p) => s + (p.averageRating || 0), 0) / ratedPrompts.length
    : 0;

  const storageUsed = user.storageBytesUsed ?? 0;
  const storageQuota = user.storageQuotaBytes ?? 524288000;
  const storagePct = Math.min(100, Math.round((storageUsed / storageQuota) * 100));

  const fmtNum = (n: number) =>
    n >= 1000000 ? `${(n / 1000000).toFixed(1)}M`
    : n >= 1000 ? `${(n / 1000).toFixed(1)}K`
    : String(n);

  const fmtBytes = (b: number) =>
    b >= 1073741824 ? `${(b / 1073741824).toFixed(1)} GB`
    : `${(b / 1048576).toFixed(0)} MB`;

  const stats = [
    { icon: BarChart2, label: 'Prompts', value: String(myPrompts.length), tab: 'library', color: 'var(--brand-primary)' },
    { icon: Eye, label: 'Views', value: fmtNum(totalViews), tab: null, color: 'var(--text-secondary)' },
    { icon: Heart, label: 'Likes', value: fmtNum(totalLikes), tab: null, color: 'var(--accent-coral)' },
    { icon: GitBranch, label: 'Forks', value: fmtNum(totalForks), tab: null, color: 'var(--brand-primary)' },
    { icon: Star, label: 'Avg Rating', value: avgRating > 0 ? avgRating.toFixed(1) : '–', tab: null, color: 'var(--brand-primary)' },
    { icon: Zap, label: 'Credits', value: fmtNum(user.credits ?? 0), tab: 'recharge', color: 'var(--brand-primary)' },
    { icon: Award, label: 'Plan', value: (user.plan ?? 'Free').charAt(0).toUpperCase() + (user.plan ?? 'free').slice(1), tab: 'pricing', color: 'var(--brand-primary)' },
  ];

  return (
    <div
      className="rounded-xl border bg-bg-secondary dark:bg-bg-secondary p-4 mb-5"
      style={{
        borderColor: 'var(--border-default)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="w-4 h-4 text-brand-primary" />
        <span className="text-sm font-semibold font-display text-text-primary">Your Dashboard</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 min-[380px]:grid-cols-4 sm:grid-cols-7 gap-2">
        {stats.map(({ icon: Icon, label, value, tab, color }) => (
          <button
            key={label}
            type="button"
            onClick={() => tab && onNavigate(tab)}
            disabled={!tab}
            className={[
              'flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-150 min-h-[44px]',
              tab ? 'cursor-pointer hover:bg-bg-tertiary dark:hover:bg-bg-tertiary' : 'cursor-default',
            ].join(' ')}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
            <span className="text-sm font-bold text-text-primary tabular-nums">{value}</span>
            <span className="text-[10px] text-text-muted font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Storage Bar */}
      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-xs text-text-secondary font-medium">Storage</span>
          </div>
          <span className="text-xs text-text-muted font-mono">
            {fmtBytes(storageUsed)} / {fmtBytes(storageQuota)}
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--border-subtle)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${storagePct}%`,
              background: storagePct > 90 ? 'var(--accent-coral)' : storagePct > 70 ? 'var(--text-muted)' : 'var(--brand-primary)',
              transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
