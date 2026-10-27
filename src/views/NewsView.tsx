import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, 
  Clock, 
  ExternalLink, 
  Share2, 
  Heart, 
  Eye, 
  Tag, 
  Check, 
  ArrowRight, 
  Filter, 
  X, 
  Flame, 
  Radio, 
  BookOpen, 
  Plus, 
  Pencil, 
  Trash2, 
  ShieldCheck, 
  Save, 
  Loader2,
  Bot,
  Coins,
  Code,
  Shield,
  Wrench,
  Cpu
} from 'lucide-react';
import { PromptNewsIcon, PromptSearchIcon } from '../components/icons/PromptHubIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { NewsService } from '../services/newsService';
import type { AINewsArticle, NewsCategory } from '../db/schema';
import { useApp } from '../context/AppContext';
import { useConfirm } from '../hooks/useConfirm';
import { trackScreenViewed } from '../lib/posthogEvents';
import { extractDirectImageUrl } from '../utils/imageUrlResolver';

const CATEGORIES: Array<NewsCategory | 'All'> = [
  'All',
  'New Models',
  'AI Agents',
  'Products & Pricing',
  'Open Source',
  'AI Safety',
  'Developer Tools',
  'Hardware',
  'Industry',
  'Research',
  'Policy',
  'AI Breakthroughs',
  'LLMs & Reasoning',
  'Prompt Engineering',
  'Tools & Agents',
  'Industry & Ethics',
  'Announcements'
];

function calculateReadTime(text: string): number {
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recent';
  }
}

export const NewsView: React.FC = () => {
  const { user, setShowAuthModal, showToast } = useApp();
  const confirm = useConfirm();
  const isAdmin = user?.role === 'Admin';

  const [newsList, setNewsList] = useState<AINewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<AINewsArticle | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({});
  
  // Real-time Like Tracking (no fake data)
  const [likedArticles, setLikedArticles] = useState<Record<string, boolean>>({});

  // Pagination: 10 dispatches at first, load 10 by 10 on user action
  const [visibleCount, setVisibleCount] = useState<number>(10);

  // Admin Edit / Create Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [isSavingArticle, setIsSavingArticle] = useState(false);
  const [adminFormData, setAdminFormData] = useState<{
    id: string;
    slug: string;
    title: string;
    summary: string;
    content: string;
    category: NewsCategory;
    sourceUrl: string;
    sourceName: string;
    imageUrl: string;
    tags: string;
    isFeatured: boolean;
    isPublished: boolean;
    broadcast: boolean;
  }>({
    id: '',
    slug: '',
    title: '',
    summary: '',
    content: '',
    category: 'AI Breakthroughs',
    sourceUrl: '',
    sourceName: '',
    imageUrl: '',
    tags: '',
    isFeatured: false,
    isPublished: true,
    broadcast: false,
  });

  useEffect(() => {
    trackScreenViewed({ screen_name: 'ai_news' });
  }, []);

  const loadNews = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await NewsService.listNews({
        category: selectedCategory,
        searchQuery,
        tag: selectedTag || undefined,
        includeDrafts: isAdmin,
      });
      setNewsList(data);
    } catch (err: any) {
      console.warn('[NewsView] Error loading news:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery, selectedTag, isAdmin]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  // Load real user likes from database / storage
  useEffect(() => {
    NewsService.getUserLikedArticleIds(user?.id).then(ids => {
      const map: Record<string, boolean> = {};
      ids.forEach(id => { map[id] = true; });
      setLikedArticles(map);
    });
  }, [user?.id]);



  // Real-time Local Window event listener for like changes and article updates
  useEffect(() => {
    const handleLikeChange = (e: any) => {
      const { articleId, isLiked, likesCount, userId } = e.detail || {};
      if (articleId) {
        setNewsList(prev => prev.map(a => a.id === articleId ? { ...a, likesCount } : a));
        if (selectedArticle && selectedArticle.id === articleId) {
          setSelectedArticle(curr => curr ? { ...curr, likesCount } : null);
        }
        if (userId === (user?.id || 'local_user')) {
          setLikedArticles(prev => ({ ...prev, [articleId]: Boolean(isLiked) }));
        }
      }
    };

    const handleNewsUpdate = () => {
      loadNews();
    };

    window.addEventListener('ph_news_like_changed', handleLikeChange);
    window.addEventListener('ph_ai_news_updated', handleNewsUpdate);
    return () => {
      window.removeEventListener('ph_news_like_changed', handleLikeChange);
      window.removeEventListener('ph_ai_news_updated', handleNewsUpdate);
    };
  }, [selectedArticle, user?.id, loadNews]);

  // Deep linking via URL params (e.g. /news?id=123 or ?slug=deepseek)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('id') || params.get('article') || params.get('slug');
    if (targetId) {
      NewsService.getNewsByIdOrSlug(targetId).then(article => {
        if (article) {
          setSelectedArticle(article);
          NewsService.incrementViews(article.id, user?.id);
        }
      });
    }
  }, [user?.id]);

  const handleOpenArticle = (article: AINewsArticle) => {
    setSelectedArticle(article);
    NewsService.incrementViews(article.id, user?.id);
  };

  // Real-time Like Toggle (zero fake counters)
  const handleToggleLike = async (articleId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to upvote news articles.', 'info');
      return;
    }

    try {
      const result = await NewsService.toggleLike(articleId, user.id);
      setLikedArticles(prev => ({ ...prev, [articleId]: result.isLiked }));
      setNewsList(current => current.map(item => {
        if (item.id === articleId) {
          return { ...item, likesCount: result.likesCount };
        }
        return item;
      }));

      if (selectedArticle && selectedArticle.id === articleId) {
        setSelectedArticle(curr => curr ? { ...curr, likesCount: result.likesCount } : null);
      }
    } catch (err: any) {
      showToast('Error updating like.', 'error');
    }
  };

  const handleShare = (article: AINewsArticle, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to share news articles.', 'info');
      return;
    }
    const url = `${window.location.origin}/news?id=${article.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast('Link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Admin Modal Triggers
  const handleOpenCreateModal = () => {
    setEditingArticleId(null);
    const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : `news-${Date.now()}`;
    setAdminFormData({
      id: generatedId,
      slug: '',
      title: '',
      summary: '',
      content: '',
      category: 'New Models',
      sourceUrl: '',
      sourceName: '',
      imageUrl: '',
      tags: '',
      isFeatured: false,
      isPublished: true,
      broadcast: false,
    });
    setIsAdminModalOpen(true);
  };

  const handleOpenEditModal = (article: AINewsArticle, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingArticleId(article.id);
    setAdminFormData({
      id: article.id,
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      content: article.content,
      category: article.category,
      sourceUrl: article.sourceUrl || '',
      sourceName: article.sourceName || '',
      imageUrl: article.imageUrl || '',
      tags: article.tags.join(', '),
      isFeatured: article.isFeatured,
      isPublished: article.isPublished,
      broadcast: false,
    });
    setIsAdminModalOpen(true);
  };

  const handleDeleteArticle = async (articleId: string, title?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const ok = await confirm({
      title: 'Delete AI News Article',
      message: `Are you sure you want to delete "${title || 'this article'}"? This action cannot be undone.`,
      confirmText: 'Delete Article',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    const res = await NewsService.deleteNews(articleId);
    if (res.success) {
      showToast('AI News article deleted successfully.', 'info');
      if (selectedArticle?.id === articleId) {
        setSelectedArticle(null);
      }
      loadNews();
    } else {
      showToast(`Failed to delete: ${res.error || 'Unknown error'}`, 'error');
    }
  };

  const handleDeleteAllNews = async () => {
    const ok = await confirm({
      title: 'Purge All AI News Articles',
      message: 'Are you sure you want to delete ALL AI news articles? This will completely clear all mock and seeded news from both the database and the website. This action cannot be undone.',
      confirmText: 'Delete All Articles',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    const res = await NewsService.deleteAllNews();
    if (res.success) {
      showToast('All AI News articles have been completely purged.', 'info');
      setSelectedArticle(null);
      loadNews();
    } else {
      showToast(`Failed to purge articles: ${res.error || 'Unknown error'}`, 'error');
    }
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminFormData.title.trim() || !adminFormData.summary.trim() || !adminFormData.content.trim()) {
      showToast('Please fill in Title, Summary, and Article Body.', 'error');
      return;
    }

    setIsSavingArticle(true);
    try {
      const tagsArray = adminFormData.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      let normalizedSourceUrl = adminFormData.sourceUrl?.trim() || undefined;
      if (normalizedSourceUrl && !normalizedSourceUrl.startsWith('http://') && !normalizedSourceUrl.startsWith('https://') && !normalizedSourceUrl.startsWith('/')) {
        normalizedSourceUrl = `https://${normalizedSourceUrl}`;
      }

      const normalizedImageUrl = adminFormData.imageUrl?.trim() || undefined;

      if (editingArticleId) {
        const res = await NewsService.updateNews(editingArticleId, {
          title: adminFormData.title.trim(),
          summary: adminFormData.summary.trim(),
          content: adminFormData.content.trim(),
          category: adminFormData.category,
          sourceUrl: normalizedSourceUrl,
          sourceName: adminFormData.sourceName?.trim() || undefined,
          imageUrl: normalizedImageUrl,
          tags: tagsArray,
          isFeatured: adminFormData.isFeatured,
          isPublished: adminFormData.isPublished,
        });

        if (res.success) {
          showToast('✓ AI News article updated successfully!', 'success');
          setIsAdminModalOpen(false);
          loadNews();
          if (selectedArticle?.id === editingArticleId) {
            const refreshed = await NewsService.getNewsByIdOrSlug(editingArticleId);
            if (refreshed) setSelectedArticle(refreshed);
          }
        } else {
          showToast(`Failed to update: ${res.error}`, 'error');
        }
      } else {
        const res = await NewsService.createNews({
          id: adminFormData.id.trim() || undefined,
          slug: adminFormData.slug.trim() || undefined,
          title: adminFormData.title.trim(),
          summary: adminFormData.summary.trim(),
          content: adminFormData.content.trim(),
          category: adminFormData.category,
          sourceUrl: normalizedSourceUrl,
          sourceName: adminFormData.sourceName?.trim() || undefined,
          imageUrl: normalizedImageUrl,
          tags: tagsArray,
          isFeatured: adminFormData.isFeatured,
          isPublished: adminFormData.isPublished,
          broadcast: adminFormData.broadcast,
        });

        if (res.success) {
          showToast('✓ New AI News article published!', 'success');
          setIsAdminModalOpen(false);
          loadNews();
        } else {
          showToast(`Failed to create: ${res.error}`, 'error');
        }
      }
    } catch (err: any) {
      showToast(`Error saving article: ${err?.message || err}`, 'error');
    } finally {
      setIsSavingArticle(false);
    }
  };

  // Reset pagination to 10 whenever category, search, or tag changes
  useEffect(() => {
    setVisibleCount(10);
  }, [selectedCategory, searchQuery, selectedTag]);

  // Find breaking / featured article for hero placement
  const featuredArticle = useMemo(() => {
    return newsList.find(n => n.isFeatured) || newsList[0] || null;
  }, [newsList]);

  // Standard articles grid (excluding hero if featured)
  const remainingArticles = useMemo(() => {
    if (!featuredArticle) return newsList;
    return newsList.filter(n => n.id !== featuredArticle.id);
  }, [newsList, featuredArticle]);

  // Strictly display 10 at first, user loads 10 by 10
  const displayedArticles = useMemo(() => {
    return remainingArticles.slice(0, visibleCount);
  }, [remainingArticles, visibleCount]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary selection:bg-brand-primary/20 pb-20 font-sans">
      {/* Top Header Banner */}
      <div className="border-b border-border-default bg-bg-secondary/40 px-4 sm:px-8 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shadow-xs">
              <PromptNewsIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-text-primary">
                  AI Daily News & Intelligence
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-600" /> Live Feed
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                    <ShieldCheck className="w-2.5 h-2.5" /> Admin Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Latest AI updates, frontier model releases, prompt engineering techniques, and industry news.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative flex-1 md:w-64">
              <PromptSearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search news, models, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-secondary border border-border-default rounded-xl pl-9 pr-8 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all min-h-[44px]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Admin Action Buttons */}
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-primary text-white font-medium hover:bg-brand-primary-hi transition-colors flex items-center gap-2 text-xs shadow-xs cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add AI News</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAllNews}
                  disabled={isLoading || newsList.length === 0}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0"
                  title="Purge all fake and mock news articles"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete All News</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="max-w-7xl mx-auto mt-4 sm:mt-5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-text-muted shrink-0 mr-1" />
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  setSelectedTag(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-brand-primary text-white font-semibold shadow-xs'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-default'
                }`}
              >
                {category === 'New Models' && <Sparkles className="w-3 h-3 text-amber-300" />}
                {category === 'AI Agents' && <Bot className="w-3 h-3 text-sky-300" />}
                {category === 'Products & Pricing' && <Coins className="w-3 h-3 text-emerald-300" />}
                {category === 'Open Source' && <Code className="w-3 h-3 text-purple-300" />}
                {category === 'AI Safety' && <Shield className="w-3 h-3 text-rose-300" />}
                {category === 'Developer Tools' && <Wrench className="w-3 h-3 text-blue-300" />}
                {category === 'Hardware' && <Cpu className="w-3 h-3 text-indigo-300" />}
                {category === 'AI Breakthroughs' && <Flame className="w-3 h-3 text-orange-300" />}
                {category === 'LLMs & Reasoning' && <Sparkles className="w-3 h-3 text-violet-300" />}
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Active Tag Filter indicator */}
        {selectedTag && (
          <div className="flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 rounded-xl px-4 py-2 text-xs text-brand-primary w-fit">
            <Tag className="w-3.5 h-3.5" />
            <span>Filtering by tag: <strong className="font-semibold">#{selectedTag}</strong></span>
            <button 
              onClick={() => setSelectedTag(null)}
              className="ml-2 hover:bg-brand-primary/20 p-0.5 rounded cursor-pointer min-h-[44px] flex items-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Hero Featured Article (If available) */}
        {featuredArticle && !selectedTag && searchQuery === '' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => handleOpenArticle(featuredArticle)}
            className="group relative rounded-2xl border border-border-default bg-bg-secondary hover:border-brand-primary/40 transition-all duration-300 shadow-xs hover:shadow-md cursor-pointer overflow-hidden p-4 sm:p-6 lg:p-7"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* Image Column: Pristine 16:9 aspect ratio with zero text collisions */}
              <div className="lg:col-span-7">
                <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-bg-tertiary border border-border-default/50 shadow-xs">
                  {!failedImageIds[featuredArticle.id] ? (
                    <img
                      src={extractDirectImageUrl(featuredArticle.imageUrl) || '/news-images/news_01.png'}
                      alt={featuredArticle.title}
                      referrerPolicy="no-referrer"
                      onError={() => setFailedImageIds(prev => ({ ...prev, [featuredArticle.id]: true }))}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      style={{ display: 'block' }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-primary/15 via-bg-tertiary to-bg-secondary flex flex-col justify-center items-center text-center p-6">
                      <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mb-2">
                        <PromptNewsIcon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-mono uppercase tracking-widest text-brand-primary font-bold">
                        AI Frontier Dispatch
                      </span>
                    </div>
                  )}
                  {/* Floating Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                    <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wide uppercase bg-rose-600 text-white shadow-md flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-300" /> Featured Story
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-black/60 text-white backdrop-blur-md border border-white/15">
                      {featuredArticle.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content Column: Dedicated editorial typography column */}
              <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-4">
                <div>
                  {/* Meta Bar */}
                  <div className="flex items-center gap-2.5 text-xs text-text-muted font-mono mb-2.5 flex-wrap">
                    <span>{formatDate(featuredArticle.publishedAt)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-sans">
                      <Clock className="w-3.5 h-3.5" /> {calculateReadTime(featuredArticle.content)} min read
                    </span>
                    {featuredArticle.sourceName && (
                      <>
                        <span>•</span>
                        <span className="text-brand-primary font-sans font-semibold">{featuredArticle.sourceName}</span>
                      </>
                    )}
                  </div>

                  {/* Headline */}
                  <h2 className="text-lg sm:text-2xl lg:text-2xl xl:text-3xl font-bold font-display text-text-primary group-hover:text-brand-primary transition-colors leading-snug tracking-tight mb-3 line-clamp-3">
                    {featuredArticle.title}
                  </h2>

                  {/* Summary */}
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed line-clamp-3 sm:line-clamp-4 mb-4">
                    {featuredArticle.summary}
                  </p>

                  {/* Tags */}
                  {featuredArticle.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {featuredArticle.tags.slice(0, 4).map(tag => (
                        <span
                          key={tag}
                          onClick={(e) => { e.stopPropagation(); setSelectedTag(tag); }}
                          className="px-2 py-0.5 rounded-md text-[10.5px] font-mono bg-bg-tertiary hover:bg-border-subtle text-text-secondary border border-border-default cursor-pointer transition-colors"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Action Bar */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-border-default">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleToggleLike(featuredArticle.id, e)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer min-h-[44px] ${
                        likedArticles[featuredArticle.id]
                          ? 'bg-rose-50 border-rose-300 text-rose-600 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300 font-semibold'
                          : 'border-border-default text-text-secondary bg-bg-tertiary hover:bg-border-subtle'
                      }`}
                      title="Real-time upvote"
                    >
                      <Heart className={`w-3.5 h-3.5 ${likedArticles[featuredArticle.id] ? 'fill-rose-600 dark:fill-rose-400' : ''}`} />
                      <span>{featuredArticle.likesCount}</span>
                    </button>

                    <button
                      onClick={(e) => handleShare(featuredArticle, e)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border-default text-text-secondary bg-bg-tertiary hover:bg-border-subtle transition-colors cursor-pointer min-h-[44px]"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span>Share</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hi px-4 py-2 rounded-xl transition-colors min-h-[44px] shadow-xs">
                    <span>Read Full Story</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <div
                className="flex items-center gap-2 mt-5 pt-3 border-t border-border-default bg-bg-primary/50 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 lg:-mx-7 lg:-mb-7 px-4 sm:px-6 lg:px-7 py-3"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[11px] font-mono text-brand-primary flex items-center gap-1 font-semibold mr-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Admin:
                </span>
                <button
                  onClick={(e) => handleOpenEditModal(featuredArticle, e)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg border border-border-default bg-bg-tertiary hover:bg-bg-secondary text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={(e) => handleDeleteArticle(featuredArticle.id, featuredArticle.title, e)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg border border-rose-200/60 bg-rose-50/50 hover:bg-rose-100/60 text-rose-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* News Grid Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
              <span>Latest Dispatches</span>
              <span className="text-xs font-mono font-normal text-text-muted">({newsList.length} articles)</span>
            </h3>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="rounded-xl border border-border-default bg-bg-secondary p-5 space-y-4 animate-pulse">
                  <div className="w-full aspect-[16/9] bg-bg-tertiary rounded-lg" />
                  <div className="h-4 bg-bg-tertiary rounded w-3/4" />
                  <div className="h-3 bg-bg-tertiary rounded w-full" />
                  <div className="h-3 bg-bg-tertiary rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : newsList.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border-default rounded-2xl bg-bg-secondary/30 p-8 max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mx-auto mb-4">
                <PromptNewsIcon className="w-7 h-7" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-text-primary mb-2 font-display">
                {searchQuery || selectedCategory !== 'All' || selectedTag ? 'No matching articles found' : 'No AI News Dispatches Yet'}
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed mb-6">
                {searchQuery || selectedCategory !== 'All' || selectedTag
                  ? "We couldn't find any articles matching your search criteria. Try choosing a different category or clearing filters."
                  : 'All mock and fake data has been purged. Authentic, verified industry dispatches published by administrators will appear here in real time.'}
              </p>
              {searchQuery || selectedCategory !== 'All' || selectedTag ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All');
                    setSearchQuery('');
                    setSelectedTag(null);
                  }}
                  className="btn-secondary text-xs cursor-pointer min-h-[44px] px-4 py-2"
                >
                  Reset All Filters
                </button>
              ) : isAdmin ? (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white font-medium hover:bg-brand-primary-hi transition-colors text-xs shadow-xs cursor-pointer min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish First Verified AI News Dispatch</span>
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedArticles.map((article) => {
                const isLiked = Boolean(likedArticles[article.id]);
                return (
                  <motion.article
                    key={article.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleOpenArticle(article)}
                    className="group rounded-xl border border-border-default bg-bg-secondary hover:border-brand-primary/40 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between cursor-pointer overflow-hidden"
                  >
                    {/* Cover Thumbnail: Perfectly aligned aspect-[16/9] ratio for every card */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-bg-tertiary flex items-center justify-center border-b border-border-default/50">
                      {article.imageUrl && !failedImageIds[article.id] ? (
                        <img
                          src={extractDirectImageUrl(article.imageUrl)}
                          alt={article.title}
                          referrerPolicy="no-referrer"
                          onError={() => setFailedImageIds(prev => ({ ...prev, [article.id]: true }))}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-primary/10 via-bg-tertiary to-bg-secondary flex flex-col items-center justify-center p-4 text-center">
                          <Sparkles className="w-6 h-6 text-brand-primary/60 mb-1" />
                          <span className="text-[10px] font-mono text-text-muted">{article.category}</span>
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-black/70 text-white backdrop-blur-md">
                          {article.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Meta bar */}
                        <div className="flex items-center justify-between text-[11px] text-text-muted font-mono mb-2">
                          <span>{formatDate(article.publishedAt)}</span>
                          <span className="flex items-center gap-1 font-sans">
                            <Clock className="w-3 h-3" /> {calculateReadTime(article.content)}m read
                          </span>
                        </div>

                        {/* Title: 2 lines with consistent min-height */}
                        <h4 className="text-sm sm:text-base font-bold font-display text-text-primary group-hover:text-brand-primary transition-colors line-clamp-2 min-h-[2.5rem] leading-snug mb-2">
                          {article.title}
                        </h4>

                        {/* Summary: 3 lines with consistent min-height */}
                        <p className="text-xs text-text-secondary line-clamp-3 min-h-[3rem] leading-relaxed mb-4">
                          {article.summary}
                        </p>

                        {/* Tags: Consistent min-height row */}
                        <div className="flex flex-wrap gap-1 mb-4 min-h-[1.75rem]">
                          {article.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTag(tag);
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-bg-tertiary text-text-muted hover:text-text-primary cursor-pointer transition-colors min-h-[30px] flex items-center"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-auto">
                        <div className="flex items-center justify-between pt-3 border-t border-border-default text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleToggleLike(article.id, e)}
                              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition-colors cursor-pointer min-h-[44px] ${
                                isLiked ? 'border-rose-200 bg-rose-50 text-rose-600 font-semibold' : 'border-border-default text-text-muted hover:text-rose-600'
                              }`}
                              title="Upvote story"
                            >
                              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-600' : ''}`} />
                              <span>{article.likesCount}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-[11px] text-text-muted">
                              <Eye className="w-3.5 h-3.5" />
                              <span>{article.viewsCount}</span>
                            </span>

                            <button
                              onClick={(e) => handleShare(article, e)}
                              className="text-text-muted hover:text-brand-primary p-1.5 rounded hover:bg-bg-tertiary transition-colors cursor-pointer min-h-[44px] flex items-center"
                              title="Share article"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Admin Inline Edit / Delete on Cards */}
                        {isAdmin && (
                          <div 
                            className="flex items-center justify-between mt-3 pt-2.5 border-t border-border-default/60"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] font-mono text-brand-primary flex items-center gap-1 font-semibold">
                              <ShieldCheck className="w-3 h-3" /> Admin
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => handleOpenEditModal(article, e)}
                                className="min-h-[44px] px-2.5 py-1 rounded-md border border-border-default bg-bg-tertiary hover:bg-bg-primary text-text-primary text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3 h-3 text-brand-primary" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={(e) => handleDeleteArticle(article.id, article.title, e)}
                                className="min-h-[44px] px-2.5 py-1 rounded-md border border-rose-200/60 bg-rose-50/50 hover:bg-rose-100/60 text-rose-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>

            {/* Pagination Controls: 10 at first, load 10 by 10 on user request */}
            {remainingArticles.length > visibleCount && (
              <div className="flex flex-col items-center justify-center pt-8 pb-4 gap-2.5">
                <button
                  onClick={() => setVisibleCount(prev => prev + 10)}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-bg-secondary border border-border-default hover:border-brand-primary/50 text-text-primary text-xs font-semibold flex items-center gap-2 transition-all shadow-xs hover:shadow-sm cursor-pointer"
                >
                  <span>Load More Dispatches (+10)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-primary" />
                </button>
                <span className="text-[11px] font-mono text-text-muted">
                  Showing {Math.min(visibleCount, remainingArticles.length)} of {remainingArticles.length} articles
                </span>
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {/* Article Detail Reader Modal */}
      {typeof document !== 'undefined' && selectedArticle && createPortal(
        <AnimatePresence>
          <div
            className="fixed inset-0 z-[700] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedArticle(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-3xl bg-bg-secondary border border-border-default rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-secondary sticky top-0 z-10">
                <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
                  <span className="px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-medium font-sans">
                    {selectedArticle.category}
                  </span>
                  <span>•</span>
                  <span>{formatDate(selectedArticle.publishedAt)}</span>
                  <span>•</span>
                  <span>{calculateReadTime(selectedArticle.content)} min read</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleShare(selectedArticle)}
                    className="p-2 rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer min-h-[44px] flex items-center gap-1.5 text-xs"
                    title="Copy link"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>Share</span>
                  </button>

                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer min-h-[44px]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-6 sm:px-8 py-6 overflow-y-auto space-y-6">
                {selectedArticle.imageUrl && (
                  <div className="relative aspect-[16/9] w-full max-h-[360px] rounded-xl overflow-hidden bg-bg-tertiary flex items-center justify-center border border-border-default shadow-xs">
                    {!failedImageIds[`modal_${selectedArticle.id}`] ? (
                      <img
                        src={extractDirectImageUrl(selectedArticle.imageUrl)}
                        alt={selectedArticle.title}
                        referrerPolicy="no-referrer"
                        onError={() => setFailedImageIds(prev => ({ ...prev, [`modal_${selectedArticle.id}`]: true }))}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand-primary/15 via-bg-tertiary to-bg-secondary flex flex-col items-center justify-center p-8 text-center">
                        <PromptNewsIcon className="w-10 h-10 text-brand-primary/40 mb-2" />
                        <span className="text-xs font-mono text-text-muted">{selectedArticle.category}</span>
                      </div>
                    )}
                  </div>
                )}

                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display text-text-primary leading-tight">
                  {selectedArticle.title}
                </h1>

                {/* Summary Quote Box */}
                <div className="p-4 rounded-xl bg-bg-tertiary/80 border border-border-default text-xs sm:text-sm text-text-secondary leading-relaxed font-sans shadow-2xs">
                  {selectedArticle.summary}
                </div>

                {/* Content Body */}
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-line space-y-4">
                  {selectedArticle.content}
                </div>

                {/* External Citation Link */}
                {selectedArticle.sourceUrl && (
                  <div className="p-4 rounded-xl border border-border-default bg-bg-primary/50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <BookOpen className="w-4 h-4 text-brand-primary" />
                      <span>Original Source Citation: <strong>{selectedArticle.sourceName || 'External Research'}</strong></span>
                    </div>
                    <a
                      href={selectedArticle.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline shrink-0 min-h-[44px] items-center"
                    >
                      <span>Visit Source</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-border-default">
                  {selectedArticle.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-md text-xs bg-bg-tertiary text-text-secondary font-mono border border-border-default"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-border-default bg-bg-secondary flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleLike(selectedArticle.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer min-h-[44px] ${
                      likedArticles[selectedArticle.id]
                        ? 'bg-rose-50 border-rose-200 text-rose-600 font-semibold'
                        : 'border-border-default text-text-secondary hover:bg-bg-tertiary'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${likedArticles[selectedArticle.id] ? 'fill-rose-600' : ''}`} />
                    <span>Upvote ({selectedArticle.likesCount})</span>
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleOpenEditModal(selectedArticle)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl border border-border-default bg-bg-tertiary hover:bg-bg-primary text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Edit Article</span>
                      </button>
                      <button
                        onClick={() => handleDeleteArticle(selectedArticle.id, selectedArticle.title)}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setSelectedArticle(null)}
                  className="btn-secondary text-xs cursor-pointer min-h-[44px] px-5 py-2 font-medium"
                >
                  Close Reader
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* Admin Create / Edit News Article Modal */}
      {typeof document !== 'undefined' && isAdminModalOpen && createPortal(
        <AnimatePresence>
          <div
            className="fixed inset-0 z-[800] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSavingArticle) {
                setIsAdminModalOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl bg-bg-secondary border border-border-default rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-secondary sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold font-display text-text-primary">
                      {editingArticleId ? 'Edit AI News Article' : 'Publish New AI News Story'}
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Admin governance controls • Direct storage & live feed synchronization
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdminModalOpen(false)}
                  disabled={isSavingArticle}
                  className="p-1.5 text-text-muted hover:text-text-primary rounded-lg cursor-pointer min-h-[44px] flex items-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveArticle} noValidate className="p-6 overflow-y-auto space-y-4 text-xs">
                {/* Custom Article ID & Slug */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-text-primary mb-1">
                      Article ID <span className="text-text-muted font-normal">(Admin Defined / UUID)</span>
                    </label>
                    <input
                      type="text"
                      disabled={Boolean(editingArticleId)}
                      placeholder="e.g. a0000001-... or news-unique-id"
                      value={adminFormData.id}
                      onChange={(e) => setAdminFormData(prev => ({ ...prev, id: e.target.value }))}
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[44px] font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-text-primary mb-1">
                      URL Slug <span className="text-text-muted font-normal">(Optional unique route)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. deepseek-r1-launch"
                      value={adminFormData.slug}
                      onChange={(e) => setAdminFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[44px] font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Headline / Title */}
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Headline / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DeepSeek-R1 Emerges: Pure RL Reasoning Slashes Inference Budgets"
                    value={adminFormData.title}
                    onChange={(e) => setAdminFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[44px]"
                  />
                </div>

                {/* Category & Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-text-primary mb-1">Category *</label>
                    <select
                      value={adminFormData.category}
                      onChange={(e) => setAdminFormData(prev => ({ ...prev, category: e.target.value as NewsCategory }))}
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[44px]"
                    >
                      <option value="New Models">New Models</option>
                      <option value="AI Agents">AI Agents</option>
                      <option value="Products & Pricing">Products & Pricing</option>
                      <option value="Open Source">Open Source</option>
                      <option value="AI Safety">AI Safety</option>
                      <option value="Developer Tools">Developer Tools</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Industry">Industry</option>
                      <option value="Research">Research</option>
                      <option value="Policy">Policy</option>
                      <option value="AI Breakthroughs">AI Breakthroughs</option>
                      <option value="LLMs & Reasoning">LLMs & Reasoning</option>
                      <option value="Prompt Engineering">Prompt Engineering</option>
                      <option value="Tools & Agents">Tools & Agents</option>
                      <option value="Industry & Ethics">Industry & Ethics</option>
                      <option value="Announcements">Announcements</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-text-primary mb-1">Tags (Comma Separated)</label>
                    <input
                      type="text"
                      placeholder="DeepSeek, Reasoning, OpenWeights"
                      value={adminFormData.tags}
                      onChange={(e) => setAdminFormData(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Executive Summary */}
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Executive Summary / TL;DR *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Concise 2-3 sentence overview of the news release..."
                    value={adminFormData.summary}
                    onChange={(e) => setAdminFormData(prev => ({ ...prev, summary: e.target.value }))}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary leading-relaxed"
                  />
                </div>

                {/* Full Content Body */}
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Full Article Body (Markdown Supported) *</label>
                  <textarea
                    rows={6}
                    required
                    placeholder="## Architectural Insights&#10;&#10;Detailed breakdown of benchmarks, prompt implications, and developer takeaways..."
                    value={adminFormData.content}
                    onChange={(e) => setAdminFormData(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono text-xs leading-relaxed"
                  />
                </div>

                {/* Image URL & Source Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-text-primary mb-1">Cover Image URL</label>
                    <input
                      type="text"
                      inputMode="url"
                      placeholder="https://images.unsplash.com/... or /news-images/..."
                      value={adminFormData.imageUrl}
                      onChange={(e) => setAdminFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-text-primary mb-1">Source Name / Citation</label>
                    <input
                      type="text"
                      placeholder="e.g. DeepSeek Research"
                      value={adminFormData.sourceName}
                      onChange={(e) => setAdminFormData(prev => ({ ...prev, sourceName: e.target.value }))}
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[44px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-text-primary mb-1">Original Source URL</label>
                  <input
                    type="text"
                    inputMode="url"
                    placeholder="https://github.com/... or github.com/..."
                    value={adminFormData.sourceUrl}
                    onChange={(e) => setAdminFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[44px]"
                  />
                </div>

                {/* Options Checkboxes */}
                <div className="p-3 rounded-xl bg-bg-tertiary border border-border-default space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={adminFormData.isFeatured}
                      onChange={(e) => setAdminFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                      className="rounded border-border-default text-brand-primary focus:ring-brand-primary w-4 h-4 cursor-pointer"
                    />
                    <span className="text-text-primary font-medium">Pin as Featured Story (Hero placement)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={adminFormData.isPublished}
                      onChange={(e) => setAdminFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                      className="rounded border-border-default text-brand-primary focus:ring-brand-primary w-4 h-4 cursor-pointer"
                    />
                    <span className="text-text-primary font-medium">Published (Visible to all users)</span>
                  </label>

                  {!editingArticleId && (
                    <label className="flex items-center gap-2 cursor-pointer min-h-[36px]">
                      <input
                        type="checkbox"
                        checked={adminFormData.broadcast}
                        onChange={(e) => setAdminFormData(prev => ({ ...prev, broadcast: e.target.checked }))}
                        className="rounded border-border-default text-brand-primary focus:ring-brand-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="text-text-primary font-medium">Broadcast notification to all registered users</span>
                    </label>
                  )}
                </div>

                {/* Submit & Cancel */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
                  <button
                    type="button"
                    onClick={() => setIsAdminModalOpen(false)}
                    disabled={isSavingArticle}
                    className="btn-secondary text-xs cursor-pointer min-h-[44px] px-4 py-2"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingArticle}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-brand-primary text-white font-medium hover:bg-brand-primary-hi transition-colors flex items-center gap-2 text-xs shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSavingArticle ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Article...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{editingArticleId ? 'Save Changes' : 'Publish Article'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
