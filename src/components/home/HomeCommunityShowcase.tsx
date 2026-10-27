import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Heart,
  ArrowRight,
  ChevronDown,
  Copy,
  Check,
  Search,
  X,
  Terminal,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { copyToClipboard } from '../../utils/clipboard';
import { getPromptDisplayImages } from '../../utils/imageUrlResolver';

interface PopularPromptItem {
  id: string;
  title: string;
  description: string;
  authorName: string;
  category: string;
  likesCount: number;
  imageUrl: string;
  rawContent?: string;
  isRealDb?: boolean;
}

const SHOWCASE_CATEGORIES = [
  { id: 'Trending', label: 'Trending' },
  { id: 'Productivity', label: 'Productivity' },
  { id: 'Development', label: 'Development' },
  { id: 'Content Creation', label: 'Content Creation' },
  { id: 'Research', label: 'Research' },
  { id: 'Marketing', label: 'Marketing' },
];

export const HomeCommunityShowcase: React.FC = () => {
  const { user, setShowAuthModal, prompts, setActiveTab, setActivePromptId, showToast, likedPromptIds, toggleLikePrompt } = useApp();

  const [activeCategory, setActiveCategory] = useState<string>('Trending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // Strictly real public database prompts with zero mock or fake data
  const allPrompts: PopularPromptItem[] = useMemo(() => {
    return prompts
      .filter((p) => p.visibility === 'public')
      .map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description || 'Production prompt template for LLM orchestration.',
        authorName: p.authorName || 'creator',
        category: p.category || 'General',
        likesCount: p.likesCount ?? 0,
        imageUrl: getPromptDisplayImages(p).primaryImageUrl || '',
        rawContent: p.rawContent,
        isRealDb: true,
      }));
  }, [prompts]);

  // Filter cards based on selected category tab and search query
  const displayedCards = useMemo(() => {
    let list = allPrompts;

    if (activeCategory !== 'Trending') {
      const matched = list.filter(
        (p) => p.category.toLowerCase() === activeCategory.toLowerCase()
      );
      if (matched.length > 0) list = matched;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.authorName.toLowerCase().includes(q) ||
          (p.rawContent || '').toLowerCase().includes(q)
      );
    }

    return list.slice(0, 4);
  }, [allPrompts, activeCategory, searchQuery]);

  const handleLikeClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to like prompts.', 'info');
      return;
    }
    toggleLikePrompt(id).catch(() => {});
  };

  const handleCopyPrompt = async (prompt: PopularPromptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to copy prompts.', 'info');
      return;
    }
    const content = prompt.rawContent || prompt.description || prompt.title;
    const res = await copyToClipboard(content);
    if (res.success) {
      setCopiedPromptId(prompt.id);
      showToast('Prompt copied to clipboard!', 'success');
      setTimeout(() => setCopiedPromptId((curr) => (curr === prompt.id ? null : curr)), 2000);
    } else {
      showToast('Failed to copy prompt.', 'error');
    }
  };

  const handleCardClick = (prompt: PopularPromptItem) => {
    if (!user) {
      setShowAuthModal(true);
      showToast('Please sign in to use this prompt in Studio.', 'info');
      return;
    }
    if (prompt.isRealDb) {
      setActivePromptId(prompt.id);
    }
    setActiveTab('workspace');
  };

  return (
    <section className="py-10 sm:py-14 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto w-full text-left font-sans overflow-hidden">
      {/* Header Row: Title & View all link */}
      <div className="flex items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-primary-light flex items-center justify-center text-brand-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-text-primary tracking-tight">
            Explore Popular Prompts
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('community')}
          className="text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors cursor-pointer group min-h-[44px] sm:min-h-[32px]"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Category Pills Row with responsive wrapping */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-6 pt-1 w-full min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 max-w-full">
          {SHOWCASE_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap min-h-[44px] sm:min-h-[32px] ${
                  isActive
                    ? 'bg-brand-primary-light border border-brand-primary/20 text-brand-primary font-semibold'
                    : 'bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setActiveTab('community')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 min-h-[44px] sm:min-h-[32px]"
          >
            <span>More</span>
            <ChevronDown className="w-3 h-3 text-text-muted" />
          </button>
        </div>

        {/* Search input if user wants to filter */}
        <div className="relative w-full sm:w-60 shrink-0">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts..."
            className="w-full pl-8 pr-7 py-1.5 bg-bg-secondary border border-border-default rounded-lg text-xs font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary min-h-[44px] sm:min-h-[36px]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Prompt Cards Grid or Honest Empty State */}
      {displayedCards.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-border-default bg-bg-secondary text-center space-y-2">
          <Terminal className="w-6 h-6 text-text-muted mx-auto" />
          <p className="text-sm font-semibold text-text-primary">No public community prompts yet</p>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Prompts published to the public library will be featured here automatically with zero mock fallbacks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayedCards.map((card) => {
            const isLiked = likedPromptIds?.includes(card.id);
            const displayLikes = card.likesCount;
            const isCopied = copiedPromptId === card.id;

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className="group rounded-xl border border-border-default hover:border-border-hover bg-bg-secondary shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
              >
                {/* Thumbnail Image Container */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-bg-tertiary flex items-center justify-center">
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-bg-secondary to-bg-tertiary flex items-center justify-center text-text-muted group-hover:text-brand-primary transition-colors">
                      <Terminal className="w-8 h-8 opacity-40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

                {/* Top Actions: Copy on Left, Like Count on Right */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => handleCopyPrompt(card, e)}
                    title="Copy prompt"
                    className="px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white text-[11px] font-mono font-medium flex items-center gap-1.5 border border-white/20 hover:bg-black/70 transition-colors min-h-[32px] cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300 font-bold">Copied ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-white" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleLikeClick(card.id, e)}
                    title={user ? 'Like prompt' : 'Sign in to like'}
                    className="px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white text-[11px] font-mono font-medium flex items-center gap-1.5 border border-white/20 hover:bg-black/70 transition-colors min-h-[32px] cursor-pointer"
                  >
                    <Heart
                      className={`w-3 h-3 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-white'}`}
                    />
                    <span>{displayLikes}</span>
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold font-display text-text-primary group-hover:text-brand-primary transition-colors line-clamp-2 min-h-[2.5rem] leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                    {card.description}
                  </p>
                </div>

                {/* Footer: Author & Category Tag */}
                <div className="pt-2 border-t border-border-default/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-text-muted min-w-0 flex-1 mr-2">
                    <div className="w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-[9px] uppercase font-mono shrink-0">
                      {card.authorName.charAt(0)}
                    </div>
                    <span className="truncate flex-1 min-w-0">By {card.authorName}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-bg-tertiary border border-border-default/60 text-text-muted font-mono text-[10px]">
                      {card.category}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(card);
                      }}
                      title="Open in Prompt Studio"
                      className="p-1.5 rounded-md hover:bg-bg-tertiary text-text-muted hover:text-brand-primary transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
};

export default HomeCommunityShowcase;
