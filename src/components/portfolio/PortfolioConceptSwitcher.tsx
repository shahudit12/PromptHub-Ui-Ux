/**
 * src/components/portfolio/PortfolioConceptSwitcher.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-Concept Live Scrollable Portfolio Preview Switcher & Selection Bar.
 * Implements Founder Page 1 & Page 2 Requirements:
 *  1. Renders 3 actual, live, scrollable web pages before user selection.
 *  2. "Agree & Select" adopts the pre-compiled spec and assets with ZERO model calls.
 *  3. "Revise This Design" directly patches the spec fields and re-renders instantly (0 model calls).
 *  4. "Regenerate All" restarts high-level brief discovery.
 * Crafted under Impeccable & Taste Skill guidelines (quartic easing, 44px touch targets).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import {
  Check,
  Monitor,
  Tablet,
  Smartphone,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  Terminal,
  Gamepad2,
  LayoutGrid,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { PortfolioConcept, PortfolioSpecPatch } from '../../types/portfolioSpec';

interface PortfolioConceptSwitcherProps {
  concepts: PortfolioConcept[];
  selectedConceptId?: string;
  onSelectConcept: (concept: PortfolioConcept) => void;
  onPartialRevision: (concept: PortfolioConcept, patch: PortfolioSpecPatch) => void;
  onRegenerateAll?: () => void;
  isAdopting?: boolean;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export const PortfolioConceptSwitcher: React.FC<PortfolioConceptSwitcherProps> = ({
  concepts,
  selectedConceptId,
  onSelectConcept,
  onPartialRevision,
  onRegenerateAll,
  isAdopting = false,
}) => {
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return selectedConceptId || concepts[0]?.id || 'spec_minimal_cli';
  });

  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editColor, setEditColor] = useState('');

  if (!concepts || concepts.length === 0) {
    return null;
  }

  const activeConcept = concepts.find((c) => c.id === activeTabId) || concepts[0];
  const isSelected = selectedConceptId === activeConcept.id;

  const handleOpenRevision = () => {
    setEditName(activeConcept.spec.profile.name);
    setEditTitle(activeConcept.spec.profile.title);
    setEditBio(activeConcept.spec.profile.bio);
    setEditColor(activeConcept.spec.palette.primary);
    setIsRevisionOpen(true);
  };

  const handleApplyRevision = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const patch: PortfolioSpecPatch = {
      profile: {
        name: editName.trim() || activeConcept.spec.profile.name,
        title: editTitle.trim() || activeConcept.spec.profile.title,
        bio: editBio.trim() || activeConcept.spec.profile.bio,
      },
    };
    if (editColor && editColor.startsWith('#')) {
      patch.palette = { primary: editColor };
    }
    onPartialRevision(activeConcept, patch);
    setIsRevisionOpen(false);
  };

  const getContainerWidth = () => {
    switch (device) {
      case 'mobile':
        return 'w-full max-w-[390px] h-[640px]';
      case 'tablet':
        return 'w-full max-w-[768px] h-[680px]';
      case 'desktop':
      default:
        return 'w-full h-[620px]';
    }
  };

  const getIconForTemplate = (templateId: string) => {
    switch (templateId) {
      case 'minimal_cli':
        return <Terminal className="w-3.5 h-3.5 shrink-0" />;
      case 'retro_arcade':
        return <Gamepad2 className="w-3.5 h-3.5 shrink-0" />;
      case 'modern_bento':
      default:
        return <LayoutGrid className="w-3.5 h-3.5 shrink-0" />;
    }
  };

  return (
    <div data-tour="tour-workspace-concepts" className="w-full my-4 rounded-2xl bg-bg-secondary border border-border-default shadow-sm overflow-hidden flex flex-col transition-all">
      {/* ─── Top Concept Bar: 3 Pre-Rendered Choices ─── */}
      <div className="p-3 sm:p-4 border-b border-border-subtle bg-bg-primary/80 backdrop-blur-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-primary">
                  Live Pre-Rendered Concepts
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
                  3 Interactive Previews Ready
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                Each design is already pre-compiled from a validated spec. Selecting adopts it instantly with 0 AI rebuild cost.
              </p>
            </div>
          </div>

          {/* Viewport Device Mode Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-tertiary border border-border-subtle self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={`min-h-[36px] min-w-[36px] p-1.5 rounded-lg text-xs font-medium flex items-center justify-center transition-colors cursor-pointer ${
                device === 'desktop'
                  ? 'bg-bg-primary text-brand-primary shadow-2xs font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Desktop viewport"
              aria-label="Desktop viewport"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDevice('tablet')}
              className={`min-h-[36px] min-w-[36px] p-1.5 rounded-lg text-xs font-medium flex items-center justify-center transition-colors cursor-pointer ${
                device === 'tablet'
                  ? 'bg-bg-primary text-brand-primary shadow-2xs font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Tablet viewport (768px)"
              aria-label="Tablet viewport"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={`min-h-[36px] min-w-[36px] p-1.5 rounded-lg text-xs font-medium flex items-center justify-center transition-colors cursor-pointer ${
                device === 'mobile'
                  ? 'bg-bg-primary text-brand-primary shadow-2xs font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Mobile viewport (390px)"
              aria-label="Mobile viewport"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Concept Navigation Tabs (3 distinct design styles) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          {concepts.map((concept) => {
            const isActive = concept.id === activeTabId;
            const isChosen = selectedConceptId === concept.id;

            return (
              <button
                key={concept.id}
                type="button"
                onClick={() => {
                  setActiveTabId(concept.id);
                  setIsRevisionOpen(false);
                }}
                className={`min-h-[44px] p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'border-brand-primary bg-brand-primary/10 shadow-xs ring-1 ring-brand-primary/40'
                    : 'border-border-default hover:border-brand-primary/30 bg-bg-secondary hover:bg-bg-tertiary/80'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                    <span className={isActive ? 'text-brand-primary' : 'text-text-muted'}>
                      {getIconForTemplate(concept.spec.templateId)}
                    </span>
                    <span className={isActive ? 'text-text-primary' : 'text-text-secondary'}>
                      {concept.spec.name}
                    </span>
                  </div>
                  {isChosen && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                      <Check className="w-2.5 h-2.5" /> Selected
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1 mt-1.5 text-[10px] text-text-muted">
                  <span className="font-mono truncate">{concept.spec.aesthetic}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className="w-2 h-2 rounded-full border border-white/20"
                      style={{ backgroundColor: concept.spec.palette.primary }}
                      title={`Primary: ${concept.spec.palette.primary}`}
                    />
                    <span
                      className="w-2 h-2 rounded-full border border-white/20"
                      style={{ backgroundColor: concept.spec.palette.background }}
                      title={`Canvas: ${concept.spec.palette.background}`}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Highlights / Metadata Row ─── */}
      <div className="px-3 sm:px-4 py-2 bg-bg-tertiary/50 border-b border-border-subtle flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-text-muted">Stack:</span>
          <span className="font-mono px-1.5 py-0.5 rounded bg-bg-secondary border border-border-subtle text-text-secondary">
            {activeConcept.spec.templateId} (v{activeConcept.spec.templateVersion})
          </span>
          <span className="text-text-muted">•</span>
          <span className="text-text-secondary line-clamp-1 max-w-[420px]">
            {activeConcept.highlights.join(' • ')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Zero CDN • Zero Dependencies
          </span>
        </div>
      </div>

      {/* ─── Live Scrollable Sandbox Preview ─── */}
      <div className="flex-1 bg-black/40 p-2 sm:p-4 flex items-center justify-center overflow-auto min-h-[460px]">
        <div
          className={`${getContainerWidth()} bg-bg-primary rounded-xl overflow-hidden border border-border-default shadow-xl transition-all duration-300 flex flex-col`}
        >
          {/* Virtual Browser Top Strip */}
          <div className="h-8 px-3 bg-bg-secondary border-b border-border-subtle flex items-center justify-between text-[11px] text-text-muted select-none shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500/80"></span>
              <span className="w-2 h-2 rounded-full bg-amber-500/80"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-500/80"></span>
            </div>
            <div className="px-3 py-0.5 rounded-md bg-bg-primary border border-border-subtle font-mono text-[10px] text-text-secondary max-w-[280px] truncate">
              https://portfolio.local/{activeConcept.spec.templateId}
            </div>
            <div className="text-[10px] font-mono text-text-muted">
              {device === 'desktop' ? '100% Fluid' : device === 'tablet' ? '768px' : '390px'}
            </div>
          </div>

          {/* Sandboxed Iframe (Live, Interactive, Scrollable) */}
          <iframe
            key={`${activeConcept.id}-${device}`}
            srcDoc={activeConcept.previewHtml}
            title={activeConcept.spec.name}
            className="w-full flex-1 border-none bg-black"
            sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
          />
        </div>
      </div>

      {/* ─── Inline Partial Revision Drawer (Zero Model Calls) ─── */}
      {isRevisionOpen && (
        <form
          onSubmit={handleApplyRevision}
          className="p-3.5 sm:p-4 bg-bg-primary border-t border-border-default space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-brand-primary" />
              <span className="text-xs font-bold text-text-primary">
                Direct Spec Revision (0 Model Calls • Instant Rerender)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsRevisionOpen(false)}
              className="min-h-[44px] min-w-[44px] p-1 text-text-muted hover:text-text-primary flex items-center justify-center cursor-pointer"
              aria-label="Close revision form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-text-muted mb-1">Full Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-bg-secondary border border-border-default text-xs text-text-primary focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-text-muted mb-1">Headline Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-bg-secondary border border-border-default text-xs text-text-primary focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-text-muted mb-1">Primary Color (Hex)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-bg-secondary border border-border-default text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none"
                />
                <span
                  className="w-7 h-7 rounded-lg border border-border-default shrink-0 shadow-2xs"
                  style={{ backgroundColor: editColor || activeConcept.spec.palette.primary }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-text-muted mb-1">Bio Summary</label>
            <textarea
              rows={2}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-bg-secondary border border-border-default text-xs text-text-primary focus:border-brand-primary focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <span className="text-[10px] font-mono text-emerald-500">
              ⚡ Direct spec patch applied instantly — no AI token usage or billing charges.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRevisionOpen(false)}
                className="min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 py-1.5 rounded-lg bg-brand-primary text-white hover:bg-brand-primary-hi text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Spec Changes & Rerender</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ─── Bottom Founder 3-Choice Action Bar ─── */}
      <div data-tour="tour-workspace-actions" className="p-3 sm:p-4 bg-bg-primary border-t border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-primary">
            Ready with {activeConcept.spec.name}?
          </span>
          <span className="text-[10px] font-mono text-text-muted">
            (Spec: {activeConcept.spec.templateId})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Choice 3: Disagree Completely (Regenerate All) */}
          {onRegenerateAll && (
            <button
              type="button"
              onClick={onRegenerateAll}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-border-default hover:border-brand-primary/40 bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Regenerate all 3 concepts with new direction"
            >
              <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
              <span>Regenerate All</span>
            </button>
          )}

          {/* Choice 2: Partially Disagree (Revise this design) */}
          <button
            type="button"
            onClick={handleOpenRevision}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-border-default hover:border-brand-primary/40 bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Update text, bio, or palette directly without calling AI models"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-primary" />
            <span>Revise This Design</span>
          </button>

          {/* Choice 1: Agree & Select (Adopt without rebuild) */}
          <button
            type="button"
            onClick={() => onSelectConcept(activeConcept)}
            disabled={isAdopting}
            className={`min-h-[44px] px-5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
              isSelected
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/40'
                : 'bg-brand-primary text-white hover:bg-brand-primary-hi ring-1 ring-brand-primary/50'
            }`}
          >
            {isSelected ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ Concept Selected (Editing Active)</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Agree & Select This Portfolio</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
