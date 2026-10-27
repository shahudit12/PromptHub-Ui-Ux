import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { 
  Trophy, 
  Star, 
  GitBranch, 
  Eye, 
  Heart, 
  UserCheck, 
  Terminal, 
  Flame,
  Crown,
  Medal,
  Award,
  Search,
  Filter,
  Info,
  Layers
} from 'lucide-react';
import { CommunityBadges } from '../components/CommunityBadges';
import { isEarlyPioneerEligible } from '../services/badgeService';
import type { BadgeType, Prompt } from '../db/schema';
import { FollowButton } from '../components/FollowButton';
import { CreatorProfileModal } from '../components/CreatorProfileModal';
import { UserAvatar } from '../components/UserAvatar';
import { PromptPreviewModal } from '../components/PromptPreviewModal';

export const LeaderboardView: React.FC = () => {
  const { prompts, setActivePromptId, setActiveTab, user, setShowAuthModal, showToast, forkPrompt } = useApp();
  const { sendToWork } = useWorkspace();
  
  const [leaderboardTab, setLeaderboardTab] = useState<'assets' | 'creators'>('assets');
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [inspectedCreatorId, setInspectedCreatorId] = useState<string | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState<Prompt | null>(null);

  // Time filter helper
  const isWithinTimeRange = (dateStr?: string) => {
    if (timeFilter === 'all') return true;
    if (!dateStr) return true;
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return true;
    const now = Date.now();
    if (timeFilter === 'week') return now - time <= 7 * 24 * 60 * 60 * 1000;
    if (timeFilter === 'month') return now - time <= 30 * 24 * 60 * 60 * 1000;
    return true;
  };

  // Calculate Impact Score for a prompt
  const calculatePromptImpact = (p: Prompt) => {
    const likes = p.likesCount || 0;
    const forks = p.forksCount || 0;
    const views = p.viewsCount || 0;
    const rating = ((p.ratingCount || 0) > 0 && p.averageRating) ? p.averageRating : 0;
    return Math.round(forks * 5 + likes * 3 + views * 0.1 + rating * 2);
  };

  // Filtered & Sorted Top Assets
  const topAssets = useMemo(() => {
    return prompts
      .filter((p) => {
        if (p.visibility !== 'public') return false;
        if (!isWithinTimeRange(p.createdAt)) return false;
        if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchAuthor = (p.authorName || '').toLowerCase().includes(q);
          const matchModel = (p.model || '').toLowerCase().includes(q);
          const matchTags = (p.tags || []).some(t => t.toLowerCase().includes(q));
          if (!matchTitle && !matchAuthor && !matchModel && !matchTags) return false;
        }
        return true;
      })
      .map(p => ({
        ...p,
        impactScore: calculatePromptImpact(p),
      }))
      .sort((a, b) => b.impactScore - a.impactScore);
  }, [prompts, timeFilter, categoryFilter, searchQuery]);

  // Aggregate & Sort Top Creators
  const topCreators = useMemo(() => {
    const creatorsMap: Record<string, {
      id: string;
      name: string;
      avatar: string;
      views: number;
      forks: number;
      likes: number;
      count: number;
      totalRating: number;
      ratedCount: number;
      topCategory: string;
      recentDate?: string;
    }> = {};

    prompts
      .filter((p) => p.visibility === 'public')
      .forEach(p => {
        if (!creatorsMap[p.authorId]) {
          creatorsMap[p.authorId] = {
            id: p.authorId,
            name: p.authorName || 'Anonymous',
            avatar: p.authorAvatar || '',
            views: 0,
            forks: 0,
            likes: 0,
            count: 0,
            totalRating: 0,
            ratedCount: 0,
            topCategory: p.category || 'Development',
            recentDate: p.createdAt,
          };
        }
        const c = creatorsMap[p.authorId];
        c.views += (p.viewsCount || 0);
        c.forks += (p.forksCount || 0);
        c.likes += (p.likesCount || 0);
        c.count += 1;
        if (p.ratingCount && p.ratingCount > 0 && p.averageRating) {
          c.totalRating += p.averageRating * p.ratingCount;
          c.ratedCount += p.ratingCount;
        }
        if (p.createdAt && (!c.recentDate || new Date(p.createdAt) > new Date(c.recentDate))) {
          c.recentDate = p.createdAt;
        }
      });
    
    return Object.values(creatorsMap)
      .filter(creator => {
        if (!isWithinTimeRange(creator.recentDate)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return creator.name.toLowerCase().includes(q);
        }
        return true;
      })
      .map(creator => {
        const avgRating = creator.ratedCount > 0 ? parseFloat((creator.totalRating / creator.ratedCount).toFixed(1)) : 0;
        const impactScore = Math.round(creator.forks * 5 + creator.likes * 3 + creator.views * 0.1 + creator.count * 10 + (avgRating * 2));
        return {
          ...creator,
          avgRating,
          impactScore,
        };
      })
      .sort((a, b) => b.impactScore - a.impactScore);
  }, [prompts, timeFilter, searchQuery]);

  // Overall platform statistics
  const stats = useMemo(() => {
    const publicPrompts = prompts.filter(p => p.visibility === 'public');
    const totalForks = publicPrompts.reduce((acc, p) => acc + (p.forksCount || 0), 0);
    const totalLikes = publicPrompts.reduce((acc, p) => acc + (p.likesCount || 0), 0);
    const totalViews = publicPrompts.reduce((acc, p) => acc + (p.viewsCount || 0), 0);
    return {
      publicCount: publicPrompts.length,
      creatorsCount: topCreators.length,
      totalForks,
      totalLikes,
      totalViews,
    };
  }, [prompts, topCreators]);

  // Current logged in user standing
  const userRankIndex = useMemo(() => {
    if (!user) return -1;
    return topCreators.findIndex(c => c.id === user.id);
  }, [user, topCreators]);

  const handleOpenAssetInIde = (e: React.MouseEvent, prompt: Prompt) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to open prompt in Creation Workspace.', 'info');
      return;
    }
    try {
      sessionStorage.setItem('ph_active_prompt_id', prompt.id);
      sessionStorage.setItem('ph_creation_workspace_prompt', prompt.rawContent);
      sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
        title: prompt.title,
        prompt: prompt.rawContent,
        category: prompt.category,
      }));
    } catch {}
    setActivePromptId(prompt.id);
    sendToWork({
      title: prompt.title,
      prompt: prompt.rawContent,
    });
    setActiveTab('workspace');
  };

  const handlePreviewPrompt = (prompt: Prompt) => {
    setPreviewPrompt(prompt);
  };

  // Podium splits
  const topThreeAssets = topAssets.slice(0, 3);
  const topThreeCreators = topCreators.slice(0, 3);

  const categories = ['All', 'Development', 'Marketing', 'Writing', 'Design', 'Business', 'Education', 'Other'];

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary text-left text-text-primary select-text font-sans pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ─── Hero Header & Stats Ribbon ────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-secondary to-bg-tertiary/40 p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary-light border border-brand-primary/20 text-brand-primary text-xs font-mono font-medium tracking-wide">
                <Trophy className="w-3.5 h-3.5" />
                <span>COMMUNITY BENCHMARKS</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary tracking-tight flex items-center gap-2.5">
                <span>Hall of Fame &amp; Leaderboards</span>
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Recognizing top-performing prompt architectures, deterministic evaluation benchmarks, and leading AI prompt engineers.
              </p>
            </div>

            {/* Quick Stats Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-bg-primary/80 backdrop-blur-xs p-3.5 rounded-xl border border-border-default shrink-0">
              <div className="text-center px-2">
                <span className="text-[10px] font-mono uppercase text-text-muted">Prompts</span>
                <p className="text-sm sm:text-base font-bold font-mono text-text-primary mt-0.5">{stats.publicCount}</p>
              </div>
              <div className="text-center px-2 border-l border-border-subtle">
                <span className="text-[10px] font-mono uppercase text-text-muted">Creators</span>
                <p className="text-sm sm:text-base font-bold font-mono text-brand-primary mt-0.5">{stats.creatorsCount}</p>
              </div>
              <div className="text-center px-2 border-l border-border-subtle">
                <span className="text-[10px] font-mono uppercase text-text-muted">Total Forks</span>
                <p className="text-sm sm:text-base font-bold font-mono text-text-primary mt-0.5">{stats.totalForks}</p>
              </div>
              <div className="text-center px-2 border-l border-border-subtle">
                <span className="text-[10px] font-mono uppercase text-text-muted">Total Views</span>
                <p className="text-sm sm:text-base font-bold font-mono text-emerald-500 mt-0.5">{stats.totalViews}</p>
              </div>
            </div>
          </div>

          {/* User's Standing Banner (if logged in) */}
          {user && (
            <div className="mt-5 pt-4 border-t border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <UserAvatar
                  src={user.avatarUrl}
                  name={user.name || user.username || 'You'}
                  size="xs"
                  shape="circle"
                />
                <span className="text-text-secondary">
                  {userRankIndex >= 0 ? (
                    <>
                      You are ranked <span className="font-bold text-brand-primary font-mono">#{userRankIndex + 1}</span> among creators with{' '}
                      <span className="font-bold text-text-primary font-mono">{topCreators[userRankIndex]?.impactScore || 0}</span> Impact Points.
                    </>
                  ) : (
                    <>You haven&apos;t published public prompts yet. Publish verified templates to rank on the leaderboard!</>
                  )}
                </span>
              </div>

              {userRankIndex >= 0 && (
                <div className="inline-flex items-center gap-1.5 font-mono text-[11px] text-text-muted">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>{topCreators[userRankIndex]?.count || 0} Prompts Published</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Filter & Navigation Bar ───────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-bg-secondary p-3 sm:p-4 rounded-xl border border-border-default shadow-xs">
          {/* Main Tab Switcher */}
          <div className="flex bg-bg-tertiary p-1 border border-border-default rounded-xl select-none w-fit">
            <button
              onClick={() => setLeaderboardTab('assets')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all min-h-[36px] ${
                leaderboardTab === 'assets' 
                  ? 'bg-bg-secondary text-brand-primary shadow-xs' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Trending Prompts</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-bg-tertiary text-text-muted">
                {topAssets.length}
              </span>
            </button>
            
            <button
              onClick={() => setLeaderboardTab('creators')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all min-h-[36px] ${
                leaderboardTab === 'creators' 
                  ? 'bg-bg-secondary text-brand-primary shadow-xs' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Top Creators</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-bg-tertiary text-text-muted">
                {topCreators.length}
              </span>
            </button>
          </div>

          {/* Time Filter & Search Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={leaderboardTab === 'assets' ? 'Search prompt or author...' : 'Search creator name...'}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary transition-colors min-h-[38px]"
              />
            </div>

            {/* Time Window Buttons */}
            <div className="flex items-center bg-bg-tertiary border border-border-default rounded-lg p-0.5 select-none shrink-0">
              <button
                type="button"
                onClick={() => setTimeFilter('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors cursor-pointer min-h-[34px] ${
                  timeFilter === 'all'
                    ? 'bg-bg-secondary text-text-primary font-bold shadow-2xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('month')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors cursor-pointer min-h-[34px] ${
                  timeFilter === 'month'
                    ? 'bg-bg-secondary text-text-primary font-bold shadow-2xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('week')}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors cursor-pointer min-h-[34px] ${
                  timeFilter === 'week'
                    ? 'bg-bg-secondary text-text-primary font-bold shadow-2xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                This Week
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills (Only on Prompts Tab) */}
        {leaderboardTab === 'assets' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <span className="text-[10px] font-mono uppercase text-text-muted mr-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Category:</span>
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer min-h-[32px] ${
                  categoryFilter === cat
                    ? 'bg-brand-primary text-white font-semibold'
                    : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary border border-border-default'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* ─── TOP 3 PODIUM SECTION ─────────────────────────────────────────── */}
        {leaderboardTab === 'assets' && topThreeAssets.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-text-secondary">
                Top 3 Prompt Champions
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              {/* Rank 2 (Silver) */}
              {topThreeAssets[1] && (
                <div 
                  onClick={() => handlePreviewPrompt(topThreeAssets[1])}
                  className="rounded-2xl border border-slate-400/30 bg-bg-secondary p-5 flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-slate-400/60 transition-all cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                        <Medal className="w-3.5 h-3.5" />
                        <span>#2 Silver</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-tertiary border border-border-default text-text-muted">
                        {topThreeAssets[1].model || 'OpenAI'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-text-primary line-clamp-1 group-hover:text-brand-primary transition-colors">
                        {topThreeAssets[1].title}
                      </h4>
                      <p className="text-xs text-text-secondary line-clamp-2 mt-1 leading-relaxed">
                        {topThreeAssets[1].description || 'High-performance prompt architecture.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <UserAvatar src={topThreeAssets[1].authorAvatar} name={topThreeAssets[1].authorName} size="xs" shape="circle" />
                      <span>@{topThreeAssets[1].authorName}</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border-default flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="flex items-center gap-1 text-text-secondary">
                        <GitBranch className="w-3.5 h-3.5 text-brand-primary" />
                        {topThreeAssets[1].forksCount || 0}
                      </span>
                      <span className="flex items-center gap-1 text-text-secondary">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        {topThreeAssets[1].likesCount || 0}
                      </span>
                      {(topThreeAssets[1].ratingCount || 0) > 0 && topThreeAssets[1].averageRating && (
                        <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {topThreeAssets[1].averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-500/10 px-2 py-0.5 rounded">
                      {topThreeAssets[1].impactScore} pts
                    </span>
                  </div>
                </div>
              )}

              {/* Rank 1 (Gold - Elevated Champion) */}
              {topThreeAssets[0] && (
                <div 
                  onClick={() => handlePreviewPrompt(topThreeAssets[0])}
                  className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/5 via-bg-secondary to-bg-secondary p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden shadow-md hover:border-amber-500/70 transition-all cursor-pointer group md:-translate-y-1.5"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs">
                        <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>#1 Champion</span>
                      </span>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-brand-primary-light text-brand-primary font-semibold border border-brand-primary/20">
                        {topThreeAssets[0].category || 'Development'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-base text-text-primary line-clamp-1 group-hover:text-brand-primary transition-colors">
                        {topThreeAssets[0].title}
                      </h4>
                      <p className="text-xs text-text-secondary line-clamp-2 mt-1 leading-relaxed">
                        {topThreeAssets[0].description || 'Top ranked prompt architecture.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <div className="flex items-center gap-2">
                        <UserAvatar src={topThreeAssets[0].authorAvatar} name={topThreeAssets[0].authorName} size="xs" shape="circle" />
                        <span className="font-medium text-text-primary">@{topThreeAssets[0].authorName}</span>
                      </div>
                      <span className="font-mono text-[11px] text-text-muted">{topThreeAssets[0].model}</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3.5 text-xs font-mono">
                      <span className="flex items-center gap-1 text-text-secondary font-medium">
                        <GitBranch className="w-4 h-4 text-brand-primary" />
                        {topThreeAssets[0].forksCount || 0}
                      </span>
                      <span className="flex items-center gap-1 text-text-secondary font-medium">
                        <Heart className="w-4 h-4 text-rose-500" />
                        {topThreeAssets[0].likesCount || 0}
                      </span>
                      {(topThreeAssets[0].ratingCount || 0) > 0 && topThreeAssets[0].averageRating && (
                        <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                          <Star className="w-4 h-4 fill-current" />
                          {topThreeAssets[0].averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-md border border-amber-500/30">
                      {topThreeAssets[0].impactScore} pts
                    </span>
                  </div>
                </div>
              )}

              {/* Rank 3 (Bronze) */}
              {topThreeAssets[2] && (
                <div 
                  onClick={() => handlePreviewPrompt(topThreeAssets[2])}
                  className="rounded-2xl border border-amber-800/30 bg-bg-secondary p-5 flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-amber-800/60 transition-all cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-amber-800/15 text-amber-800 dark:text-amber-400 border border-amber-800/30">
                        <Award className="w-3.5 h-3.5" />
                        <span>#3 Bronze</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-tertiary border border-border-default text-text-muted">
                        {topThreeAssets[2].model || 'OpenAI'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-text-primary line-clamp-1 group-hover:text-brand-primary transition-colors">
                        {topThreeAssets[2].title}
                      </h4>
                      <p className="text-xs text-text-secondary line-clamp-2 mt-1 leading-relaxed">
                        {topThreeAssets[2].description || 'High-performance prompt architecture.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <UserAvatar src={topThreeAssets[2].authorAvatar} name={topThreeAssets[2].authorName} size="xs" shape="circle" />
                      <span>@{topThreeAssets[2].authorName}</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border-default flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="flex items-center gap-1 text-text-secondary">
                        <GitBranch className="w-3.5 h-3.5 text-brand-primary" />
                        {topThreeAssets[2].forksCount || 0}
                      </span>
                      <span className="flex items-center gap-1 text-text-secondary">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        {topThreeAssets[2].likesCount || 0}
                      </span>
                      {(topThreeAssets[2].ratingCount || 0) > 0 && topThreeAssets[2].averageRating && (
                        <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {topThreeAssets[2].averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-400 bg-amber-800/10 px-2 py-0.5 rounded">
                      {topThreeAssets[2].impactScore} pts
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TOP 3 CREATORS PODIUM ────────────────────────────────────────── */}
        {leaderboardTab === 'creators' && topThreeCreators.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-text-secondary">
                Top 3 Creator Champions
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              {/* Creator Rank 2 */}
              {topThreeCreators[1] && (
                <div 
                  onClick={() => setInspectedCreatorId(topThreeCreators[1].id)}
                  className="rounded-2xl border border-slate-400/30 bg-bg-secondary p-5 flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-slate-400/60 transition-all cursor-pointer group text-center"
                >
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 mx-auto">
                      <Medal className="w-3.5 h-3.5" />
                      <span>#2 Silver</span>
                    </span>

                    <UserAvatar
                      src={topThreeCreators[1].avatar}
                      name={topThreeCreators[1].name}
                      size="lg"
                      shape="circle"
                      className="mx-auto ring-2 ring-slate-400/40 ring-offset-2 ring-offset-bg-secondary"
                    />

                    <div>
                      <h4 className="font-bold text-sm text-text-primary group-hover:text-brand-primary transition-colors">
                        {topThreeCreators[1].name}
                      </h4>
                      <p className="text-[11px] text-text-muted font-mono mt-0.5">
                        {topThreeCreators[1].count} Prompts Published
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 text-xs font-mono text-text-secondary">
                      <span>{topThreeCreators[1].views} Views</span>
                      <span>·</span>
                      <span>{topThreeCreators[1].forks} Forks</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border-default flex items-center justify-between" onClick={e => e.stopPropagation()}>
                    <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-500/10 px-2 py-0.5 rounded">
                      {topThreeCreators[1].impactScore} pts
                    </span>
                    <FollowButton
                      targetUserId={topThreeCreators[1].id}
                      targetUserName={topThreeCreators[1].name}
                      size="xs"
                    />
                  </div>
                </div>
              )}

              {/* Creator Rank 1 (Champion) */}
              {topThreeCreators[0] && (
                <div 
                  onClick={() => setInspectedCreatorId(topThreeCreators[0].id)}
                  className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-500/5 via-bg-secondary to-bg-secondary p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden shadow-md hover:border-amber-500/70 transition-all cursor-pointer group text-center md:-translate-y-1.5"
                >
                  <div className="space-y-3.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs mx-auto">
                      <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span>#1 Grandmaster</span>
                    </span>

                    <UserAvatar
                      src={topThreeCreators[0].avatar}
                      name={topThreeCreators[0].name}
                      size="xl"
                      shape="circle"
                      className="mx-auto ring-4 ring-amber-500/40 ring-offset-2 ring-offset-bg-secondary"
                    />

                    <div>
                      <h4 className="font-bold text-base text-text-primary group-hover:text-brand-primary transition-colors">
                        {topThreeCreators[0].name}
                      </h4>
                      <p className="text-xs text-text-muted font-mono mt-0.5">
                        {topThreeCreators[0].count} Prompts Published · {topThreeCreators[0].views} Views
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 text-xs font-mono text-text-secondary">
                      <span>{topThreeCreators[0].views} Views</span>
                      <span>·</span>
                      <span>{topThreeCreators[0].forks} Forks</span>
                      <span>·</span>
                      <span>{topThreeCreators[0].likes} Likes</span>
                    </div>

                    <div className="flex justify-center">
                      <CommunityBadges 
                        badges={
                          (() => {
                            const list: BadgeType[] = [];
                            list.push('top_creator');
                            if (isEarlyPioneerEligible()) {
                              list.push('early_pioneer');
                            }
                            return list;
                          })()
                        } 
                        size="xs" 
                      />
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-amber-500/20 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-md border border-amber-500/30">
                      {topThreeCreators[0].impactScore} pts
                    </span>
                    <FollowButton
                      targetUserId={topThreeCreators[0].id}
                      targetUserName={topThreeCreators[0].name}
                      size="xs"
                    />
                  </div>
                </div>
              )}

              {/* Creator Rank 3 */}
              {topThreeCreators[2] && (
                <div 
                  onClick={() => setInspectedCreatorId(topThreeCreators[2].id)}
                  className="rounded-2xl border border-amber-800/30 bg-bg-secondary p-5 flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-amber-800/60 transition-all cursor-pointer group text-center"
                >
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-800/15 text-amber-800 dark:text-amber-400 border border-amber-800/30 mx-auto">
                      <Award className="w-3.5 h-3.5" />
                      <span>#3 Bronze</span>
                    </span>

                    <UserAvatar
                      src={topThreeCreators[2].avatar}
                      name={topThreeCreators[2].name}
                      size="lg"
                      shape="circle"
                      className="mx-auto ring-2 ring-amber-800/40 ring-offset-2 ring-offset-bg-secondary"
                    />

                    <div>
                      <h4 className="font-bold text-sm text-text-primary group-hover:text-brand-primary transition-colors">
                        {topThreeCreators[2].name}
                      </h4>
                      <p className="text-[11px] text-text-muted font-mono mt-0.5">
                        {topThreeCreators[2].count} Prompts Published
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 text-xs font-mono text-text-secondary">
                      <span>{topThreeCreators[2].views} Views</span>
                      <span>·</span>
                      <span>{topThreeCreators[2].forks} Forks</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border-default flex items-center justify-between" onClick={e => e.stopPropagation()}>
                    <span className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-400 bg-amber-800/10 px-2 py-0.5 rounded">
                      {topThreeCreators[2].impactScore} pts
                    </span>
                    <FollowButton
                      targetUserId={topThreeCreators[2].id}
                      targetUserName={topThreeCreators[2].name}
                      size="xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── RANKINGS TABLE / CARDS (4th to N) ────────────────────────────── */}
        <div className="rounded-2xl border border-border-default bg-bg-secondary overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border-default flex items-center justify-between bg-bg-secondary">
            <h3 className="text-sm font-bold text-text-primary font-display flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-primary" />
              <span>Full Rankings Directory</span>
            </h3>
            <span className="text-xs font-mono text-text-muted">
              {leaderboardTab === 'assets' ? `${topAssets.length} Prompts` : `${topCreators.length} Creators`}
            </span>
          </div>

          {leaderboardTab === 'assets' ? (
            topAssets.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <Terminal className="w-8 h-8 text-text-muted mx-auto" />
                <p className="text-text-primary font-semibold text-xs">No prompts found matching your filters.</p>
                <p className="text-text-muted text-[11px]">Try adjusting your search query, time range, or category filter.</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards View (<640px) */}
                <div className="sm:hidden divide-y divide-border-default">
                  {topAssets.map((asset, idx) => {
                    const rank = idx + 1;
                    return (
                      <div 
                        key={asset.id} 
                        onClick={() => handlePreviewPrompt(asset)}
                        className="p-4 space-y-3 bg-bg-secondary hover:bg-bg-tertiary/40 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-mono font-bold text-xs shrink-0 ${
                              rank === 1 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40' :
                              rank === 2 ? 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/40' :
                              rank === 3 ? 'bg-amber-800/20 text-amber-800 dark:text-amber-400 border border-amber-800/40' :
                              'bg-bg-tertiary text-text-muted border border-border-default'
                            }`}>
                              {rank}
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-xs text-text-primary line-clamp-1">{asset.title}</h4>
                              <p className="text-[11px] text-text-muted truncate">by @{asset.authorName}</p>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-bg-tertiary border border-border-default text-text-secondary shrink-0">
                            {asset.category || 'Development'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <div className="flex items-center gap-3 text-text-secondary font-mono text-[11px]">
                            <span className="flex items-center gap-1">
                              <GitBranch className="w-3.5 h-3.5 text-brand-primary" />
                              {asset.forksCount || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5 text-rose-500" />
                              {asset.likesCount || 0}
                            </span>
                            {(asset.ratingCount || 0) > 0 && asset.averageRating && (
                              <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                {asset.averageRating.toFixed(1)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handlePreviewPrompt(asset)}
                              className="px-2.5 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer min-h-[44px]"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenAssetInIde(e, asset)}
                              className="px-2.5 py-1.5 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-xs font-semibold text-white transition-colors cursor-pointer min-h-[44px]"
                              title="Open in Creation Workspace"
                            >
                              Workspace
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (>=640px) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[650px]">
                    <thead>
                      <tr className="border-b border-border-default text-[10px] uppercase font-semibold text-text-muted bg-bg-tertiary">
                        <th className="p-3.5 w-16 text-center">Rank</th>
                        <th className="p-3.5">Prompt Architecture</th>
                        <th className="p-3.5">Category &amp; Model</th>
                        <th className="p-3.5">Community Metrics</th>
                        <th className="p-3.5 text-center">Impact Score</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {topAssets.map((asset, idx) => {
                        const rank = idx + 1;
                        return (
                          <tr 
                            key={asset.id} 
                            onClick={() => handlePreviewPrompt(asset)}
                            className="hover:bg-bg-tertiary/50 transition-colors cursor-pointer group"
                          >
                            <td className="p-3.5 text-center">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-mono font-bold text-xs ${
                                rank === 1 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40' :
                                rank === 2 ? 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/40' :
                                rank === 3 ? 'bg-amber-800/20 text-amber-800 dark:text-amber-400 border border-amber-800/40' :
                                'text-text-muted font-mono'
                              }`}>
                                {rank}
                              </span>
                            </td>

                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-text-primary group-hover:text-brand-primary transition-colors">
                                  {asset.title}
                                </span>
                                {rank === 1 && <CommunityBadges badges={['top_creator']} size="xs" />}
                              </div>
                              <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1.5">
                                <span>by @{asset.authorName}</span>
                                <span>·</span>
                                <span className="text-[10px] font-mono text-text-muted">{asset.assetType || 'prompt'}</span>
                              </div>
                            </td>

                            <td className="p-3.5">
                              <div className="flex flex-col gap-1 items-start">
                                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-bg-tertiary border border-border-default text-text-secondary">
                                  {asset.category || 'Development'}
                                </span>
                                <span className="text-[10px] font-mono text-text-muted truncate max-w-[130px]">
                                  {asset.model}
                                </span>
                              </div>
                            </td>

                            <td className="p-3.5">
                              <div className="flex items-center gap-3 text-text-secondary font-mono text-[11px]">
                                <span className="flex items-center gap-1" title="Forks">
                                  <GitBranch className="w-3.5 h-3.5 text-brand-primary" />
                                  {asset.forksCount || 0}
                                </span>
                                <span className="flex items-center gap-1" title="Likes">
                                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                                  {asset.likesCount || 0}
                                </span>
                                <span className="flex items-center gap-1" title="Views">
                                  <Eye className="w-3.5 h-3.5 text-text-muted" />
                                  {asset.viewsCount || 0}
                                </span>
                                {(asset.ratingCount || 0) > 0 && asset.averageRating && (
                                  <span className="flex items-center gap-0.5 text-amber-500 font-semibold" title="Community Rating">
                                    <Star className="w-3 h-3 fill-current" />
                                    {asset.averageRating.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-3.5 text-center">
                              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-bg-tertiary border border-border-default text-text-primary">
                                {asset.impactScore}
                              </span>
                            </td>

                            <td className="p-3.5 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handlePreviewPrompt(asset)}
                                  className="px-2.5 py-1 rounded-md bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer"
                                >
                                  Preview
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenAssetInIde(e, asset)}
                                  className="px-2.5 py-1 rounded-md bg-surface-inverse hover:bg-surface-inverse-hi text-xs font-semibold text-white transition-colors cursor-pointer"
                                  title="Open in Creation Workspace"
                                >
                                  Workspace
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          ) : (
            topCreators.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <UserCheck className="w-8 h-8 text-text-muted mx-auto" />
                <p className="text-text-primary font-semibold text-xs">No active creators found matching your search.</p>
                <p className="text-text-muted text-[11px]">Be the first to publish a public prompt to top the leaderboard!</p>
              </div>
            ) : (
              <>
                {/* Mobile Creators Cards View (<640px) */}
                <div className="sm:hidden divide-y divide-border-default">
                  {topCreators.map((creator, idx) => {
                    const rank = idx + 1;
                    return (
                      <div 
                        key={creator.id}
                        onClick={() => setInspectedCreatorId(creator.id)}
                        className="p-4 space-y-3 bg-bg-secondary hover:bg-bg-tertiary/40 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-mono font-bold text-xs shrink-0 ${
                              rank === 1 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40' :
                              rank === 2 ? 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/40' :
                              rank === 3 ? 'bg-amber-800/20 text-amber-800 dark:text-amber-400 border border-amber-800/40' :
                              'bg-bg-tertiary text-text-muted border border-border-default'
                            }`}>
                              {rank}
                            </span>
                            <UserAvatar
                              src={creator.avatar}
                              name={creator.name}
                              size="sm"
                              shape="circle"
                              className="shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="font-semibold text-xs text-text-primary truncate">{creator.name}</h4>
                              <p className="text-[10px] text-text-muted font-mono">{creator.count} Prompts Published</p>
                            </div>
                          </div>

                          <div onClick={e => e.stopPropagation()}>
                            <FollowButton
                              targetUserId={creator.id}
                              targetUserName={creator.name}
                              size="xs"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border-subtle">
                          <div className="flex items-center gap-3 text-text-secondary font-mono text-[11px]">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5 text-text-muted" />
                              {creator.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <GitBranch className="w-3.5 h-3.5 text-brand-primary" />
                              {creator.forks}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5 text-rose-500" />
                              {creator.likes}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <CommunityBadges 
                              badges={
                                (() => {
                                  const list: BadgeType[] = [];
                                  if (rank === 1 || (topAssets[0] && topAssets[0].authorId === creator.id)) {
                                    list.push('top_creator');
                                  }
                                  if (isEarlyPioneerEligible()) {
                                    list.push('early_pioneer');
                                  }
                                  return list;
                                })()
                              } 
                              size="xs" 
                            />
                            <span className="text-[11px] font-mono font-bold text-text-primary bg-bg-tertiary px-2 py-0.5 rounded border border-border-default">
                              {creator.impactScore} pts
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Creators Table (>=640px) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[650px]">
                    <thead>
                      <tr className="border-b border-border-default text-[10px] uppercase font-semibold text-text-muted bg-bg-tertiary">
                        <th className="p-3.5 w-16 text-center">Rank</th>
                        <th className="p-3.5">Engineer / Creator</th>
                        <th className="p-3.5">Published Assets</th>
                        <th className="p-3.5">Engagement &amp; Reach</th>
                        <th className="p-3.5 text-center">Impact Score</th>
                        <th className="p-3.5 text-right">Badges &amp; Follow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {topCreators.map((creator, idx) => {
                        const rank = idx + 1;
                        return (
                          <tr 
                            key={creator.id}
                            onClick={() => setInspectedCreatorId(creator.id)}
                            className="hover:bg-bg-tertiary/50 transition-colors cursor-pointer group"
                          >
                            <td className="p-3.5 text-center">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-mono font-bold text-xs ${
                                rank === 1 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40' :
                                rank === 2 ? 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/40' :
                                rank === 3 ? 'bg-amber-800/20 text-amber-800 dark:text-amber-400 border border-amber-800/40' :
                                'text-text-muted font-mono'
                              }`}>
                                {rank}
                              </span>
                            </td>

                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <UserAvatar
                                  src={creator.avatar}
                                  name={creator.name}
                                  size="sm"
                                  shape="circle"
                                  className="shrink-0 group-hover:border-brand-primary transition-colors"
                                />
                                <div>
                                  <div className="font-semibold text-text-primary group-hover:text-brand-primary transition-colors">
                                    {creator.name}
                                  </div>
                                  <div className="text-[10px] text-text-muted font-mono">
                                    @{creator.name.toLowerCase().replace(/[^a-z0-9]/g, '')}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5 font-mono text-text-primary">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold">{creator.count}</span>
                                <span className="text-text-muted text-[11px]">prompts</span>
                              </div>
                            </td>

                            <td className="p-3.5">
                              <div className="flex items-center gap-3.5 text-text-secondary font-mono text-[11px]">
                                <span className="flex items-center gap-1" title="Total Views">
                                  <Eye className="w-3.5 h-3.5 text-text-muted" />
                                  {creator.views}
                                </span>
                                <span className="flex items-center gap-1" title="Total Forks">
                                  <GitBranch className="w-3.5 h-3.5 text-brand-primary" />
                                  {creator.forks}
                                </span>
                                <span className="flex items-center gap-1" title="Total Likes">
                                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                                  {creator.likes}
                                </span>
                              </div>
                            </td>

                            <td className="p-3.5 text-center">
                              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-bg-tertiary border border-border-default text-text-primary">
                                {creator.impactScore}
                              </span>
                            </td>

                            <td className="p-3.5 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2.5">
                                <CommunityBadges 
                                  badges={
                                    (() => {
                                      const list: BadgeType[] = [];
                                      if (rank === 1 || (topAssets[0] && topAssets[0].authorId === creator.id)) {
                                        list.push('top_creator');
                                      }
                                      if (isEarlyPioneerEligible()) {
                                        list.push('early_pioneer');
                                      }
                                      return list;
                                    })()
                                  } 
                                  size="xs" 
                                />
                                <FollowButton
                                  targetUserId={creator.id}
                                  targetUserName={creator.name}
                                  size="xs"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}
        </div>

        {/* ─── Algorithmic Transparency Box ──────────────────────────────────── */}
        <div className="rounded-xl border border-border-default bg-bg-tertiary/40 p-4 flex items-start gap-3 text-xs text-text-secondary">
          <Info className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <span className="font-bold text-text-primary font-mono text-[11px] uppercase tracking-wide">
              Deterministic Impact Index Transparency
            </span>
            <p className="text-[11px]">
              PromptHub rankings are computed mathematically from verified community engagement signals: 
              <span className="font-mono text-text-primary font-medium"> (Forks × 5) + (Likes × 3) + (Execution Views × 0.1) + (Quality Audit Score × 1)</span>. 
              Workflows tested across multi-model benchmark arenas and adopted by other engineers receive higher algorithmic authority.
            </p>
          </div>
        </div>

      </div>

      {/* ─── Modals ────────────────────────────────────────────────────────── */}
      {/* Prompt Preview Modal */}
      {previewPrompt && (
        <PromptPreviewModal
          isOpen={Boolean(previewPrompt)}
          prompt={previewPrompt}
          onClose={() => setPreviewPrompt(null)}
          onFork={async (p) => {
            try {
              const forked = await forkPrompt(p.id);
              if (forked && (forked as any).id) {
                setActivePromptId((forked as any).id);
              }
              const target = forked || p;
              try {
                sessionStorage.setItem('ph_active_prompt_id', target.id);
                sessionStorage.setItem('ph_creation_workspace_prompt', target.rawContent || '');
                sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
                  title: target.title,
                  prompt: target.rawContent,
                  category: target.category,
                }));
              } catch {}
              sendToWork({
                title: target.title,
                prompt: target.rawContent,
              });
              setPreviewPrompt(null);
              setActiveTab('workspace');
              return forked;
            } catch {}
          }}
        />
      )}

      {/* Creator Profile Modal */}
      {inspectedCreatorId && (
        <CreatorProfileModal
          isOpen={Boolean(inspectedCreatorId)}
          onClose={() => setInspectedCreatorId(null)}
          creatorId={inspectedCreatorId}
        />
      )}
    </div>
  );
};

export default LeaderboardView;
