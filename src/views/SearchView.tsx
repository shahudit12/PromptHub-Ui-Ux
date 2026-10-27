import React, { useState, useEffect, useCallback, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useApp } from '../context/AppContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { searchService, type SearchHit, type SearchFilters } from '../services/searchService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PromptSearchIcon } from '../components/icons/PromptHubIcons';
import { modelCatalogService, type CatalogModel } from '../services/modelCatalogService';
import { PromptCameraMicControls } from '../components/common/PromptCameraMicControls';
import { PromptRepository } from '../repositories/promptRepository';
import { PromptImagePreview } from '../components/common/PromptImagePreview';

const CATEGORIES = ['All', 'Development', 'Writing', 'Marketing', 'Research', 'Creative', 'Business', 'Education'];
const ASSET_TYPES = ['All', 'prompt', 'workflow', 'rag', 'agent', 'dataset'];
const HITS_PER_PAGE = 10;

export const SearchView: React.FC = () => {
  const { setActivePromptId, setActiveTab } = useApp();
  const { sendToWork } = useWorkspace();

  const [liveModels, setLiveModels] = useState<CatalogModel[]>(() => modelCatalogService.getCachedCatalog());

  useEffect(() => {
    modelCatalogService.fetchCatalog().then((models) => {
      if (models && models.length > 0) setLiveModels(models);
    }).catch(() => {});
  }, []);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [processingMs, setProcessingMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [algoliaAvailable] = useState(searchService.isConfigured());

  const [filters, setFilters] = useState<SearchFilters>({});
  const [category, setCategory] = useState('All');
  const [assetType, setAssetType] = useState('All');
  const [model, setModel] = useState('All');
  const [isPremium, setIsPremium] = useState<boolean | undefined>(undefined);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    setFilters({
      category: category === 'All' ? undefined : category,
      assetType: assetType === 'All' ? undefined : assetType,
      model: model === 'All' ? undefined : model,
      isPremium,
    });
    setPage(0);
  }, [category, assetType, model, isPremium]);

  const doSearch = useCallback(async () => {
    if (!debouncedQuery.trim() && Object.values(filters).every(v => v === undefined)) {
      setHits([]);
      setTotal(0);
      setProcessingMs(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (algoliaAvailable) {
        const result = await searchService.search(debouncedQuery, {
          filters,
          page,
          hitsPerPage: HITS_PER_PAGE,
        });
        setHits(result.hits);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setProcessingMs(result.processingTimeMs);
      } else {
        const pageLimit = HITS_PER_PAGE;
        const result = await PromptRepository.getMarketplacePrompts({
          searchQuery: debouncedQuery.trim() || undefined,
          category: filters.category && filters.category !== 'All' ? filters.category : undefined,
          listingType: filters.isPremium ? 'premium' : undefined,
          limit: pageLimit,
          offset: page * pageLimit,
        });

        const mappedHits: SearchHit[] = result.items.map(p => ({
          objectID: p.id,
          id: p.id,
          title: p.title,
          description: p.description,
          rawContent: '',
          authorName: p.authorName,
          authorId: p.authorId,
          category: p.category,
          tags: p.tags,
          model: p.model,
          assetType: p.assetType,
          visibility: (p.visibility === 'private' ? 'private' : 'public') as 'public' | 'private',
          isPremium: p.isPremium,
          price: p.price,
          likesCount: p.likesCount,
          viewsCount: p.viewsCount,
          forksCount: p.forksCount,
          coverUrl: p.coverUrl,
          thumbnail: p.thumbnail,
          inputImageUrl: p.inputImageUrl,
          outputImageUrl: p.outputImageUrl,
          createdAt: new Date(p.createdAt).getTime(),
        }));

        setHits(mappedHits);
        setTotal(result.totalCount);
        setTotalPages(Math.ceil(result.totalCount / pageLimit));
        setProcessingMs(0);
      }
    } catch (err: any) {
      setError(err?.message || 'Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, filters, page, algoliaAvailable]);

  useEffect(() => { doSearch(); }, [doSearch]);

  useEffect(() => {
    const handleLikeChange = (e: Event) => {
      const { promptId, likesCount, delta } = (e as CustomEvent).detail || {};
      if (!promptId) return;
      setHits(prev => prev.map(h => {
        if (h.id === promptId || h.objectID === promptId) {
          const updated = typeof likesCount === 'number'
            ? likesCount
            : Math.max(0, (h.likesCount || 0) + (delta ?? 0));
          return { ...h, likesCount: updated };
        }
        return h;
      }));
    };

    const handleCommentChange = (e: Event) => {
      const { promptId, commentsCount, delta } = (e as CustomEvent).detail || {};
      if (!promptId) return;
      setHits(prev => prev.map(h => {
        if (h.id === promptId || h.objectID === promptId) {
          const updated = typeof commentsCount === 'number'
            ? commentsCount
            : Math.max(0, (h.commentsCount || 0) + (delta ?? 1));
          return { ...h, commentsCount: updated };
        }
        return h;
      }));
    };

    const handleForkChange = (e: Event) => {
      const { promptId, forksCount, delta } = (e as CustomEvent).detail || {};
      if (!promptId) return;
      setHits(prev => prev.map(h => {
        if (h.id === promptId || h.objectID === promptId) {
          const updated = typeof forksCount === 'number'
            ? forksCount
            : Math.max(0, (h.forksCount || 0) + (delta ?? 1));
          return { ...h, forksCount: updated };
        }
        return h;
      }));
    };

    const handleViewChange = (e: Event) => {
      const { promptId, viewsCount, delta } = (e as CustomEvent).detail || {};
      if (!promptId) return;
      setHits(prev => prev.map(h => {
        if (h.id === promptId || h.objectID === promptId) {
          const updated = typeof viewsCount === 'number'
            ? viewsCount
            : Math.max(0, (h.viewsCount || 0) + (delta ?? 1));
          return { ...h, viewsCount: updated };
        }
        return h;
      }));
    };

    window.addEventListener('ph_prompt_like_changed', handleLikeChange);
    window.addEventListener('ph_prompt_comment_changed', handleCommentChange);
    window.addEventListener('ph_prompt_fork_changed', handleForkChange);
    window.addEventListener('ph_prompt_view_changed', handleViewChange);
    return () => {
      window.removeEventListener('ph_prompt_like_changed', handleLikeChange);
      window.removeEventListener('ph_prompt_comment_changed', handleCommentChange);
      window.removeEventListener('ph_prompt_fork_changed', handleForkChange);
      window.removeEventListener('ph_prompt_view_changed', handleViewChange);
    };
  }, []);

  const handleHitClick = (hit: SearchHit) => {
    const promptId = hit.id || hit.objectID;
    try {
      if (promptId) sessionStorage.setItem('ph_active_prompt_id', promptId);
      if (hit.rawContent) {
        sessionStorage.setItem('ph_creation_workspace_prompt', hit.rawContent);
        sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
          title: hit.title,
          prompt: hit.rawContent,
          category: hit.category,
        }));
      }
    } catch {}
    if (hit.rawContent) {
      sendToWork({
        title: hit.title,
        prompt: hit.rawContent,
      });
    }
    setActivePromptId(promptId);
    setActiveTab('workspace');
  };

  const clearSearch = () => {
    setQuery('');
    setCategory('All');
    setAssetType('All');
    setModel('All');
    setIsPremium(undefined);
    setFilters({});
    setPage(0);
  };

  const hasActiveFilters = category !== 'All' || assetType !== 'All' || model !== 'All' || isPremium !== undefined;

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-primary overflow-hidden text-left">
      {/* Search Header */}
      <div className="p-4 sm:p-6 border-b border-border-default bg-bg-secondary shrink-0 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-2xl">
            <PromptSearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              id="global-search"
              type="text"
              autoComplete="off"
              autoFocus
              placeholder="Search prompts, workflows, agents, tags..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-9 pr-24 py-2 text-xs text-text-primary placeholder-text-muted focus:border-brand-primary focus:outline-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <PromptCameraMicControls
                variant="inline"
                onImageAttached={(_url) => setQuery('Vision & Multimodal Prompts')}
                onTranscriptReady={(text) => setQuery(text)}
                cameraTooltip="Search vision & image prompts"
                micTooltip="Dictate search query"
              />
              {(query || hasActiveFilters) && (
                <button
                  onClick={clearSearch}
                  className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              hasActiveFilters
                ? 'bg-brand-primary-light border-brand-primary/20 text-brand-primary font-semibold'
                : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="bg-brand-primary text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                {[category !== 'All', assetType !== 'All', model !== 'All', isPremium !== undefined].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-3 pt-3 border-t border-border-default"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-default rounded-md px-2 py-1 text-xs text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer font-mono"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Asset Type</label>
                  <select
                    value={assetType}
                    onChange={e => setAssetType(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-default rounded-md px-2 py-1 text-xs text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer font-mono"
                  >
                    {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Model</label>
                  <select
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-default rounded-md px-2 py-1 text-xs text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer font-mono"
                  >
                    <option value="All">All Models</option>
                    {Array.from(new Set(liveModels.map((m) => m.provider))).map((provider) => (
                      <optgroup key={provider} label={provider}>
                        {liveModels
                          .filter((m) => m.provider === provider)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Access</label>
                  <select
                    value={isPremium === undefined ? 'all' : String(isPremium)}
                    onChange={e => setIsPremium(e.target.value === 'all' ? undefined : e.target.value === 'true')}
                    className="w-full bg-bg-tertiary border border-border-default rounded-md px-2 py-1 text-xs text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer font-mono"
                  >
                    <option value="all">All</option>
                    <option value="false">Free</option>
                    <option value="true">Premium</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {(hits.length > 0 || total > 0) && !isLoading && (
          <div className="flex items-center justify-between mb-4 text-xs text-text-secondary">
            <p>
              <strong className="text-text-primary font-mono">{total.toLocaleString()}</strong> results
              {debouncedQuery && <> for "<span className="text-brand-primary">{debouncedQuery}</span>"</>}
              {processingMs !== null && <span className="text-text-muted ml-2 font-mono">({processingMs}ms)</span>}
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
          </div>
        )}

        {error && !isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && !error && hits.length === 0 && (query || hasActiveFilters) && (
          <div className="text-center py-16">
            <PromptSearchIcon className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-text-primary mb-0.5">No results found</h3>
            <p className="text-xs text-text-secondary">Try different keywords or adjust your filter selection.</p>
          </div>
        )}

        {!isLoading && !error && hits.length === 0 && !query && !hasActiveFilters && (
          <div className="text-center py-16">
            <PromptSearchIcon className="w-8 h-8 text-brand-primary mx-auto mb-2" />
            <h3 className="text-sm font-bold text-text-primary mb-0.5">Search PromptHub Registry</h3>
            <p className="text-xs text-text-secondary">Enter a query or select filters to search prompts and workflows.</p>
          </div>
        )}

        {!isLoading && hits.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {hits.map(hit => (
              <div
                key={hit.objectID || hit.id}
                onClick={() => handleHitClick(hit)}
                className="bg-bg-secondary rounded-xl p-4 border border-border-default hover:border-border-hover shadow-xs flex flex-col justify-between gap-3 cursor-pointer transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.2 rounded bg-bg-tertiary border border-border-default text-text-secondary">
                      {hit.assetType || 'prompt'}
                    </span>
                    {hit.isPremium && hit.price && (
                      <span className="text-xs font-mono font-bold text-text-primary">₹{hit.price.toFixed(0)}</span>
                    )}
                  </div>

                  <PromptImagePreview prompt={hit} size="compact" aspectRatio="video" className="mb-1" />

                  <h4
                    className="text-xs font-bold text-text-primary line-clamp-1"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        hit._highlightResult?.title?.value || hit.title,
                        { ALLOWED_TAGS: ['em'], ALLOWED_ATTR: [] }
                      )
                    }}
                  />

                  <p
                    className="text-xs text-text-secondary line-clamp-2 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        hit._highlightResult?.description?.value || hit.description,
                        { ALLOWED_TAGS: ['em'], ALLOWED_ATTR: [] }
                      )
                    }}
                  />

                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {(hit.tags || []).slice(0, 3).map(tag => (
                      <span key={tag} className="text-[9px] font-mono bg-bg-tertiary text-text-muted px-1.5 py-0.2 rounded border border-border-default">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border-default pt-2 text-[10px] text-text-muted font-mono">
                  <span className="truncate max-w-[120px]">@{hit.authorName}</span>
                  <div className="flex items-center gap-2">
                    <span>{hit.viewsCount || 0} views</span>
                    <span>{hit.likesCount || 0} likes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !isLoading && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded-md bg-bg-secondary border border-border-default text-xs font-medium text-text-primary disabled:opacity-40 cursor-pointer"
            >
              Prev
            </button>
            <span className="text-xs text-text-secondary font-mono">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 rounded-md bg-bg-secondary border border-border-default text-xs font-medium text-text-primary disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchView;
