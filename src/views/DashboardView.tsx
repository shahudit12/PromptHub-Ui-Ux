import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  Search,
  Globe,
  Database,
  Cpu,
  Workflow,
  Compass,
  Heart,
  Clock,
  Copy,
  Check,
  Plus,
  ArrowRight,
  Award,
  Camera
} from 'lucide-react';
import type { AssetType, Prompt } from '../db/schema';
import { PromptOfTheDaySection } from '../components/PromptOfTheDaySection';
import { PromptCameraMicControls } from '../components/common/PromptCameraMicControls';
import { uploadPromptImage } from '../utils/promptMediaAttachment';

export const DashboardView: React.FC = () => {
  const {
    prompts,
    activities,
    setActiveTab,
    setActivePromptId,
    arenaRuns,
    setArenaPromptDraft,
    isLoggedIn,
    user,
    showToast,
  } = useApp();

  const [localSearch, setLocalSearch] = useState('');
  const [activeAssetType, setActiveAssetType] = useState<AssetType | 'All'>('All');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // Quick Prompt Launcher State
  const [quickPrompt, setQuickPrompt] = useState('');
  const [isDraggingQuickPhoto, setIsDraggingQuickPhoto] = useState(false);

  const processQuickImage = async (file: File) => {
    try {
      const { markdownTag } = await uploadPromptImage(file, { showToast });
      setQuickPrompt(prev => prev.trim() ? `${prev.trim()}${markdownTag}` : markdownTag.trimStart());
    } catch {
      // toast handled
    }
  };

  const handleQuickDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      setIsDraggingQuickPhoto(true);
    }
  };

  const handleQuickDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingQuickPhoto(false);
  };

  const handleQuickDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingQuickPhoto(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && ((file.type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(file.name || ''))) {
      await processQuickImage(file);
    }
  };

  const handleQuickPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if ((items[i]?.type || '').startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await processQuickImage(file);
          break;
        }
      }
    }
  };

  const handleLaunchWorkspace = () => {
    if (!quickPrompt.trim()) return;
    try {
      sessionStorage.setItem('ph_creation_workspace_prompt', quickPrompt);
      sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
        title: 'Quick Prompt',
        prompt: quickPrompt,
      }));
    } catch {}
    setArenaPromptDraft(quickPrompt);
    setActiveTab('workspace');
  };

  const handlePromptClick = (id: string) => {
    const prompt = prompts.find((p) => p.id === id);
    if (prompt) {
      try {
        sessionStorage.setItem('ph_active_prompt_id', prompt.id);
        sessionStorage.setItem('ph_active_prompt_data', JSON.stringify(prompt));
        sessionStorage.setItem('ph_creation_workspace_prompt', prompt.rawContent);
        sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
          title: prompt.title,
          prompt: prompt.rawContent,
          category: prompt.category,
        }));
      } catch {}
    }
    setActivePromptId(id);
    setActiveTab('workspace');
  };

  const handleQuickCopy = (e: React.MouseEvent, prompt: Prompt) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.rawContent);
    setCopiedPromptId(prompt.id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };



  // Real stats derived entirely from live data
  const totalAssets   = prompts.length;
  const publicAssets  = prompts.filter(p => p.visibility === 'public').length;
  const totalForks    = prompts.reduce((sum, p) => sum + (p.forksCount || 0), 0);
  const uniqueAuthors = new Set(prompts.map(p => p.authorId)).size;

  const registryStats = [
    { label: 'Total Prompts',   value: totalAssets.toString(),   icon: Database,  sub: 'In platform registry' },
    { label: 'Public Library',  value: publicAssets.toString(),  icon: Workflow,  sub: 'Available to fork' },
    { label: 'Community Forks', value: totalForks.toString(),    icon: Cpu,       sub: 'Reused by developers' },
    { label: 'Active Creators', value: uniqueAuthors.toString(), icon: Globe,     sub: 'Contributors' },
  ];

  // Filtering
  const filteredAssets = useMemo(() => {
    const seen = new Set<string>();
    return prompts.filter(p => {
      if (!p?.id || seen.has(p.id)) return false;
      seen.add(p.id);
      const matchesSearch =
        p.title.toLowerCase().includes(localSearch.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(localSearch.toLowerCase())) ||
        p.description.toLowerCase().includes(localSearch.toLowerCase());
      const matchesType = activeAssetType === 'All' || p.assetType === activeAssetType;
      return matchesSearch && matchesType;
    });
  }, [prompts, localSearch, activeAssetType]);

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-bg-primary text-text-primary select-text space-y-5 text-left">

      {/* ── Action-Oriented Hero Section ───────────────────────────────────── */}
      <div className="rounded-2xl bg-bg-secondary border border-border-default p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl space-y-2.5 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-primary-light border border-brand-primary/20 text-brand-primary text-[10px] font-mono font-bold tracking-wide uppercase">
              <Sparkles className="w-3 h-3" />
              <span>PromptHub Engineering Studio</span>
            </div>
            {/* Streak retention badge */}
            {isLoggedIn && (user?.currentStreakDays ?? 0) > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold tracking-wide uppercase">
                <Award className="w-3 h-3 text-amber-500" />
                <span>{user?.currentStreakDays} Day Streak 🔥</span>
              </div>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-display text-text-primary tracking-tight leading-tight">
            Build better prompts. Test them. Compare them. Improve them.
          </h1>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
            Your all-in-one workspace to write prompts, analyze quality, compare AI models side-by-side, and collaborate with your team.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2 flex-wrap">
            <button
              onClick={() => setActiveTab('create-prompt')}
              className="px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Prompt</span>
            </button>

            <button
              onClick={() => setActiveTab('workspace')}
              className="px-4 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 min-h-[38px]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Open Creation Workspace</span>
            </button>

            <button
              onClick={() => setActiveTab('marketplace')}
              className="px-4 py-2 rounded-lg bg-bg-secondary border border-border-default hover:bg-bg-tertiary text-text-primary text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 min-h-[38px] shadow-xs"
            >
              <Compass className="w-3.5 h-3.5 text-brand-primary" />
              <span>Explore Marketplace</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick Prompt Launch Bar ───────────────────────────────────────── */}
      <div className="rounded-2xl bg-bg-secondary border border-border-default p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono">Quick Prompt Launcher</h3>
          </div>
          <PromptCameraMicControls
            variant="compact"
            onImageAttached={(url) => {
              setQuickPrompt(prev => prev.trim() ? `${prev.trim()}\n\n![Image Context](${url})\n` : `![Image Context](${url})\n`);
            }}
            onTranscriptReady={(text) => {
              setQuickPrompt(prev => prev.trim() ? `${prev.trim()} ${text}` : text);
            }}
          />
        </div>

        <div className="relative">
          <textarea
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
            onDragOver={handleQuickDragOver}
            onDragLeave={handleQuickDragLeave}
            onDrop={handleQuickDrop}
            onPaste={handleQuickPaste}
            placeholder="Type a prompt, dictate with voice, or attach an image to jump straight into Creation Workspace..."
            rows={2}
            className="w-full text-xs font-mono p-3 rounded-xl bg-bg-tertiary border border-border-default text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 resize-none leading-relaxed"
          />
          {isDraggingQuickPhoto && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand-primary/10 border-2 border-dashed border-brand-primary rounded-xl backdrop-blur-[1px] pointer-events-none text-xs font-semibold text-brand-primary gap-1">
              <Camera className="w-5 h-5 animate-pulse text-brand-primary" />
              <span>Drop image here to attach to prompt</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
          <div className="flex items-center gap-2 text-[11px] text-text-muted font-mono">
            <span>{quickPrompt.length} chars</span>
            {quickPrompt && (
              <button
                type="button"
                onClick={() => setQuickPrompt('')}
                className="hover:text-rose-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLaunchWorkspace}
              disabled={!quickPrompt.trim()}
              className="px-4 py-1.5 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 min-h-[36px]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Open in Workspace</span>
            </button>
          </div>
        </div>
      </div>



      {/* ── Platform Registry Overview ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {registryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-4 rounded-xl bg-bg-secondary border border-border-default shadow-xs text-left space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider font-mono">{stat.label}</span>
                <Icon className="w-4 h-4 text-text-muted" />
              </div>
              <div className="text-2xl font-black text-text-primary font-mono tracking-tight">{stat.value}</div>
              <p className="text-[10px] text-text-muted font-mono">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Prompt of the Day & Live Sandbox ────────────────────────────────── */}
      <PromptOfTheDaySection />


      {/* ── Recent Work & Arena Benchmark History ───────────────────────────── */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* Left 2 Cols: Recent Prompts & Library */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-brand-primary" />
                <span>Prompt Library Registry</span>
              </h4>
              <p className="text-xs text-text-secondary">Explore community and personal prompts</p>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1">
              {(['All', 'prompt', 'workflow', 'mcp', 'agent', 'rag'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setActiveAssetType(type)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold border transition-colors shrink-0 cursor-pointer ${
                    activeAssetType === type
                      ? 'bg-brand-primary-light border-brand-primary text-brand-primary'
                      : 'border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-tertiary bg-bg-secondary'
                  }`}
                >
                  {type === 'All' ? 'All Types' : type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar with Camera & Mic */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              placeholder="Filter by title, tags, or description..."
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className="w-full bg-bg-secondary border border-border-default rounded-lg pl-9 pr-24 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <PromptCameraMicControls
                variant="compact"
                cameraTooltip="Search by image / attach photo"
                micTooltip="Voice search dictation"
                onImageAttached={(url) => {
                  setLocalSearch(url);
                }}
                onTranscriptReady={(text) => {
                  setLocalSearch(text);
                }}
              />
            </div>
          </div>

          {/* List of Prompts */}
          <div className="space-y-2">
            {filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-border-default border-dashed rounded-xl gap-2 bg-bg-secondary">
                <Database className="w-6 h-6 text-text-muted" />
                <p className="text-xs font-semibold text-text-primary">No matching assets found</p>
                <p className="text-[11px] text-text-muted max-w-xs">
                  {localSearch ? 'Try adjusting your search query.' : 'Create your first prompt template to get started.'}
                </p>
              </div>
            ) : (
              filteredAssets.slice(0, 6).map((prompt, idx) => (
                <div
                  key={`dashboard-asset-${prompt.id}-${idx}`}
                  onClick={() => handlePromptClick(prompt.id)}
                  className="p-3.5 rounded-lg bg-bg-secondary border border-border-default hover:border-border-hover hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary border border-border-default">
                        {prompt.assetType || 'PROMPT'}
                      </span>
                      <h5 className="text-xs font-semibold text-text-primary truncate group-hover:text-brand-primary transition-colors">
                        {prompt.title}
                      </h5>
                    </div>
                    <p className="text-[11px] text-text-secondary line-clamp-1">
                      {prompt.description}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-text-muted font-mono pt-0.5">
                      <span>By @{prompt.authorName || 'creator'}</span>
                      <span>•</span>
                      <span>{prompt.model}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-2.5 h-2.5" /> {prompt.likesCount || 0}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => handleQuickCopy(e, prompt)}
                      aria-label="Copy prompt content"
                      className="p-1.5 rounded-md hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors border border-border-default"
                    >
                      {copiedPromptId === prompt.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handlePromptClick(prompt.id)}
                      className="px-2.5 py-1.5 rounded-md bg-bg-tertiary hover:bg-border-subtle text-text-primary text-[11px] font-medium transition-colors flex items-center gap-1 border border-border-default"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Rail: Recent Arena Runs & Platform Activity */}
        <div className="space-y-4">

          {/* Recent Arena Runs */}
          <div className="p-4 rounded-xl bg-bg-secondary border border-border-default shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-brand-primary" />
                <span>Recent Benchmarks</span>
              </h4>
              <button
                onClick={() => setActiveTab('workspace')}
                className="text-[10px] font-mono text-brand-primary hover:underline"
              >
                All ({arenaRuns.length})
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
              {arenaRuns.length === 0 ? (
                <p className="text-xs text-text-muted italic py-3 text-center">No arena runs logged yet</p>
              ) : (
                arenaRuns.slice(0, 4).map((run, idx) => (
                  <div
                    key={`dashboard-run-${run.id}-${idx}`}
                    onClick={() => {
                      setArenaPromptDraft(run.promptText);
                      setActiveTab('workspace');
                    }}
                    className="p-2.5 rounded-lg border border-border-default bg-bg-tertiary hover:border-brand-primary transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-text-primary group-hover:text-brand-primary">
                      <span className="truncate">{run.promptTitle || 'Benchmark Run'}</span>
                      {run.winnerModelId && <Award className="w-3 h-3 text-amber-600 shrink-0" />}
                    </div>
                    <span className="text-[10px] text-text-muted font-mono block mt-0.5">
                      {run.results.length} models · {new Date(run.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="p-4 rounded-xl bg-bg-secondary border border-border-default shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Recent Activity</span>
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {activities.length === 0 ? (
                <p className="text-xs text-text-muted italic py-3 text-center">No recent activity logged</p>
              ) : (
                activities.slice(0, 5).map((act, idx) => (
                  <div key={`dashboard-activity-${act.id}-${idx}`} className="text-xs border-b border-border-subtle pb-2 last:border-0 last:pb-0 space-y-0.5">
                    <p className="text-text-secondary leading-snug">
                      {act.description}
                    </p>
                    <span className="text-[10px] text-text-muted font-mono block">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

    </div>

    </div>
  );
};

export default DashboardView;
