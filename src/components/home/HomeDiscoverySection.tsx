import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  Eye,
  GitFork,
  ArrowRight,
  Users,
  Terminal,
  Newspaper,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NewsService } from '../../services/newsService';
import type { AINewsArticle } from '../../db/schema';
import { UserAvatar } from '../UserAvatar';
import { getPromptDisplayImages } from '../../utils/imageUrlResolver';

interface AggregatedCreator {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  promptCount: number;
  viewsCount: number;
  likesCount: number;
}

export const HomeDiscoverySection: React.FC = () => {
  const { prompts, setActiveTab, setActivePromptId, isLoggedIn, setShowAuthModal, showToast } = useApp();

  const [newsArticles, setNewsArticles] = useState<AINewsArticle[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>({});
  const [isLoadingNews, setIsLoadingNews] = useState(true);

  // 1. Fetch Latest AI News from live database
  useEffect(() => {
    let isMounted = true;
    setIsLoadingNews(true);
    NewsService.listNews({ limit: 3 })
      .then((articles) => {
        if (isMounted) {
          setNewsArticles(articles || []);
        }
      })
      .catch(() => {
        if (isMounted) setNewsArticles([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingNews(false);
      });
    return () => { isMounted = false; };
  }, []);

  // 2. Select top 3 trending prompts derived strictly from real public database records
  const trendingPrompts = useMemo(() => {
    const publicPrompts = prompts.filter((p) => p.visibility === 'public');
    return [...publicPrompts]
      .sort((a, b) => {
        const scoreA = (a.viewsCount || 0) + (a.likesCount || 0) * 3 + (a.forksCount || 0) * 2;
        const scoreB = (b.viewsCount || 0) + (b.likesCount || 0) * 3 + (b.forksCount || 0) * 2;
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }, [prompts]);

  // 3. Aggregate top creators dynamically from actual public prompts in database
  const featuredCreators = useMemo(() => {
    const publicPrompts = prompts.filter((p) => p.visibility === 'public');
    const creatorsMap: Record<string, AggregatedCreator> = {};

    publicPrompts.forEach((p) => {
      const creatorKey = p.authorId || p.authorName || 'unknown';
      if (!creatorsMap[creatorKey]) {
        const rawName = p.authorName || 'Creator';
        const cleanHandle = rawName.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'creator';
        creatorsMap[creatorKey] = {
          id: p.authorId || creatorKey,
          name: rawName,
          username: `@${cleanHandle}`,
          avatarUrl: p.authorAvatar || undefined,
          promptCount: 0,
          viewsCount: 0,
          likesCount: 0,
        };
      }
      creatorsMap[creatorKey].promptCount += 1;
      creatorsMap[creatorKey].viewsCount += (p.viewsCount || 0);
      creatorsMap[creatorKey].likesCount += (p.likesCount || 0);
    });

    return Object.values(creatorsMap)
      .sort((a, b) => {
        const scoreA = a.viewsCount + a.likesCount * 3 + a.promptCount * 10;
        const scoreB = b.viewsCount + b.likesCount * 3 + b.promptCount * 10;
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }, [prompts]);

  const handleToggleFollow = (creatorId: string) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    const current = !!followingMap[creatorId];
    setFollowingMap((prev) => ({ ...prev, [creatorId]: !current }));
    showToast(!current ? 'Followed creator' : 'Unfollowed creator', 'info');
  };

  const handleToggleBookmark = (promptId: string) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    setBookmarkedMap((prev) => ({ ...prev, [promptId]: !prev[promptId] }));
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <section className="py-10 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto w-full text-left font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* ─── COLUMN 1: Trending Prompts ──────────────────────────────────── */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pb-1">
            <h3 className="font-semibold text-text-primary text-[15px] tracking-tight">
              Trending Prompts
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('marketplace')}
              className="text-xs font-medium text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors cursor-pointer min-h-[44px] sm:min-h-[32px]"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {trendingPrompts.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border-default bg-bg-secondary text-center space-y-1.5">
                <Terminal className="w-5 h-5 text-text-muted mx-auto" />
                <p className="text-xs font-semibold text-text-primary">No public prompts yet</p>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Publish prompts from Prompt Studio to make them visible across the community.
                </p>
              </div>
            ) : (
              trendingPrompts.map((item) => {
                const isLiked = !!bookmarkedMap[item.id];
                const displayTags = (item.tags && item.tags.length > 0)
                  ? item.tags.slice(0, 2)
                  : [item.category || 'Prompt'];
                const imageUrl = getPromptDisplayImages(item).primaryImageUrl;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActivePromptId?.(item.id);
                      setActiveTab('marketplace');
                    }}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border-default bg-bg-secondary hover:border-border-hover transition-colors cursor-pointer group"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-12 h-12 rounded-lg object-cover bg-bg-tertiary shrink-0 border border-border-default/60 mt-0.5"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-bg-tertiary border border-border-default/60 flex items-center justify-center text-text-muted shrink-0 mt-0.5 group-hover:text-brand-primary group-hover:border-brand-primary/30 transition-colors">
                        <Terminal className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-primary line-clamp-2 leading-snug group-hover:text-brand-primary transition-colors">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {displayTags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted text-[10px] font-sans font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-text-muted shrink-0 text-[11px] pt-0.5">
                      <span className="flex items-center gap-0.5" title="Views">
                        <Eye className="w-3 h-3 text-text-muted" />
                        <span>{(item.viewsCount || 0).toLocaleString()}</span>
                      </span>
                      <span className="flex items-center gap-0.5" title="Likes">
                        <GitFork className="w-3 h-3 text-text-muted" />
                        <span>{(item.likesCount || 0).toLocaleString()}</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBookmark(item.id);
                        }}
                        className="p-1 hover:text-rose-500 transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center -mr-1"
                        aria-label="Save to bookmarks"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-text-muted'}`} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── COLUMN 2: Featured Creators ─────────────────────────────────── */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pb-1">
            <h3 className="font-semibold text-text-primary text-[15px] tracking-tight">
              Featured Creators
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('community')}
              className="text-xs font-medium text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors cursor-pointer min-h-[44px] sm:min-h-[32px]"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {featuredCreators.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border-default bg-bg-secondary text-center space-y-1.5">
                <Users className="w-5 h-5 text-text-muted mx-auto" />
                <p className="text-xs font-semibold text-text-primary">No public creators yet</p>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Share your prompt templates with the community to be featured here.
                </p>
              </div>
            ) : (
              featuredCreators.map((creator) => {
                const isFollowing = !!followingMap[creator.id];
                return (
                  <div
                    key={creator.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border-default bg-bg-secondary hover:border-border-hover transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        src={creator.avatarUrl}
                        name={creator.name}
                        username={creator.username}
                        size="md"
                        shape="circle"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-text-primary truncate">
                            {creator.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted truncate">
                          {creator.username}
                        </p>
                        <p className="text-[10.5px] text-text-muted/80">
                          {creator.promptCount} {creator.promptCount === 1 ? 'prompt' : 'prompts'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFollow(creator.id)}
                      className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                        isFollowing
                          ? 'bg-bg-tertiary text-text-primary border border-border-default'
                          : 'border border-border-default hover:border-border-hover bg-bg-secondary text-text-primary hover:bg-bg-tertiary'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── COLUMN 3: Latest AI News ────────────────────────────────────── */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pb-1">
            <h3 className="font-semibold text-text-primary text-[15px] tracking-tight">
              Latest AI News
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('news')}
              className="text-xs font-medium text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors cursor-pointer min-h-[44px] sm:min-h-[32px]"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {isLoadingNews ? (
              <div className="p-6 rounded-xl border border-border-default bg-bg-secondary text-center space-y-1.5 animate-pulse">
                <p className="text-xs text-text-muted">Loading latest updates...</p>
              </div>
            ) : newsArticles.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border-default bg-bg-secondary text-center space-y-1.5">
                <Newspaper className="w-5 h-5 text-text-muted mx-auto" />
                <p className="text-xs font-semibold text-text-primary">No news articles yet</p>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Check back soon for the latest AI models and ecosystem announcements.
                </p>
              </div>
            ) : (
              newsArticles.map((news) => (
                <div
                  key={news.id}
                  onClick={() => setActiveTab('news')}
                  className="flex items-start gap-3 p-3 rounded-xl border border-border-default bg-bg-secondary hover:border-border-hover transition-colors cursor-pointer group"
                >
                  {news.imageUrl ? (
                    <img
                      src={news.imageUrl}
                      alt={news.title}
                      className="w-12 h-12 rounded-lg object-cover bg-bg-tertiary shrink-0 border border-border-default/60 mt-0.5"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-bg-tertiary border border-border-default/60 flex items-center justify-center text-text-muted shrink-0 mt-0.5 group-hover:text-brand-primary group-hover:border-brand-primary/30 transition-colors">
                      <BookOpen className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary line-clamp-2 leading-snug group-hover:text-brand-primary transition-colors">
                      {news.title}
                    </p>
                    <p className="text-[10.5px] text-text-muted mt-1 font-mono">
                      {formatRelativeTime(news.publishedAt || news.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
