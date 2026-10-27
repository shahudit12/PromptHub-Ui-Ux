/**
 * src/components/work/WorkVisualDirectionCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive Visual Direction Selection & Refinement Card for PromptHub Work.
 * Implements the 2-way visual candidate workflow:
 *  1) User accepts -> Locks visual direction and generates the full implementation.
 *  2) User rejects & demands changes -> Incorporates feedback and synthesizes 2-3 new images.
 * Features persistent account limit cap indicator (Max 8 images per account).
 * Crafted under Impeccable & Taste Skill design guidelines (quartic easing, 44px targets).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Sparkles, 
  Maximize2, 
  SlidersHorizontal, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Loader2,
  RefreshCw,
  Palette,
  Video,
  MessageSquare,
  Globe
} from 'lucide-react';
import type { WorkVisualDirection } from '../../types/work';
import { workImageCapService, MAX_IMAGE_GENERATION_CAP } from '../../services/work/workImageCapService';

interface WorkVisualDirectionCardProps {
  directions: WorkVisualDirection[];
  selectedDirectionId?: string;
  isExecuting?: boolean;
  onAcceptDirection: (direction: WorkVisualDirection) => void;
  onRejectAndChange: (feedback: string, previousDirections: WorkVisualDirection[]) => void;
  accountId?: string;
}

export const WorkVisualDirectionCard: React.FC<WorkVisualDirectionCardProps> = ({
  directions,
  selectedDirectionId,
  isExecuting = false,
  onAcceptDirection,
  onRejectAndChange,
  accountId,
}) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // Live account quota tracking
  const [quotaState, setQuotaState] = useState(() => ({
    remaining: workImageCapService.getRemainingImagesCount(accountId),
    totalGenerated: workImageCapService.getImagesGeneratedCount(accountId),
    maxCap: MAX_IMAGE_GENERATION_CAP,
  }));

  useEffect(() => {
    // Initial fetch
    setQuotaState({
      remaining: workImageCapService.getRemainingImagesCount(accountId),
      totalGenerated: workImageCapService.getImagesGeneratedCount(accountId),
      maxCap: MAX_IMAGE_GENERATION_CAP,
    });

    // Subscribe to live cap updates
    const unsubscribe = workImageCapService.subscribe((detail) => {
      setQuotaState({
        remaining: detail.remaining,
        totalGenerated: detail.totalGenerated,
        maxCap: detail.maxCap,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [accountId]);

  if (!directions || directions.length === 0) {
    return null;
  }

  const isCapReached = quotaState.remaining <= 0;

  const handleFeedbackSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!feedbackText.trim() || isExecuting || isCapReached) return;
    onRejectAndChange(feedbackText.trim(), directions);
    setFeedbackText('');
    setIsFeedbackOpen(false);
  };

  return (
    <div className="w-full my-3 p-3.5 sm:p-4 rounded-2xl bg-bg-primary border border-border-default shadow-sm space-y-3.5 transition-all">
      {/* Header Bar: Status & Strict 8-Image Account Cap Meter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-text-primary">
                Fine-Tuned Visual Candidates
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-bg-tertiary text-text-secondary border border-border-subtle">
                {directions.length} options
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              Choose an aesthetic direction to generate code or demand changes.
            </p>
          </div>
        </div>

        {/* 8-Image Persistent Cap Tracker */}
        <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-bg-secondary border border-border-default self-start sm:self-auto shrink-0">
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-text-muted">Account Cap:</span>
              <span className={`text-[11px] font-mono font-bold ${
                isCapReached ? 'text-rose-500' : quotaState.remaining <= 2 ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {quotaState.totalGenerated} / {MAX_IMAGE_GENERATION_CAP} used
              </span>
            </div>
            <span className="text-[9.5px] font-mono text-text-muted">
              ({quotaState.remaining} remaining)
            </span>
          </div>

          {/* 8 Dot Indicators */}
          <div className="flex items-center gap-1">
            {Array.from({ length: MAX_IMAGE_GENERATION_CAP }).map((_, i) => {
              const isFilled = i < quotaState.totalGenerated;
              return (
                <span
                  key={i}
                  title={`Image slot ${i + 1} of ${MAX_IMAGE_GENERATION_CAP} (${isFilled ? 'Used' : 'Available'})`}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isFilled
                      ? isCapReached
                        ? 'bg-rose-500 ring-1 ring-rose-500/30'
                        : 'bg-brand-primary ring-1 ring-brand-primary/30'
                      : 'bg-border-default/60 border border-border-subtle'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Cap Warning Barrier if reached */}
      {isCapReached && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-500">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            <strong>Account generation cap reached ({MAX_IMAGE_GENERATION_CAP}/{MAX_IMAGE_GENERATION_CAP} images used).</strong> You can accept any proposed direction below to build your project, but new image generations are paused.
          </span>
        </div>
      )}

      {/* Analyzed Reference Sources Pill Row */}
      {directions[0]?.analyzedSources && directions[0].analyzedSources.length > 0 && (
        <div className="p-2.5 rounded-xl bg-bg-secondary border border-border-default space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-brand-primary" />
              <span>Analyzed Reference Sources ({directions[0].analyzedSources.length})</span>
            </span>
            <span className="text-[10px] font-mono">
              {directions[0].analyzedSources.filter((s) => s.isImportant).length} Primary /{' '}
              {directions[0].analyzedSources.filter((s) => !s.isImportant).length} Auxiliary
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {directions[0].analyzedSources.map((src, sIdx) => {
              const isYt = src.type === 'youtube';
              const isReddit = src.type === 'reddit';
              return (
                <div
                  key={sIdx}
                  title={`${src.url}\n${src.designCue}`}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10.5px] font-mono border transition-colors ${
                    src.isImportant
                      ? isYt
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : isReddit
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary'
                      : 'bg-bg-tertiary border-border-subtle text-text-muted'
                  }`}
                >
                  {isYt ? (
                    <Video className="w-3 h-3 shrink-0" />
                  ) : isReddit ? (
                    <MessageSquare className="w-3 h-3 shrink-0" />
                  ) : (
                    <Globe className="w-3 h-3 shrink-0" />
                  )}
                  <span className="font-medium truncate max-w-[140px] sm:max-w-[200px]">
                    {src.label}
                  </span>
                  {src.isImportant && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 font-bold uppercase">
                      IMP
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Direction Candidate Cards Grid (2-3 images) */}
      <div className={`grid gap-3 ${
        directions.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      }`}>
        {directions.map((direction, idx) => {
          const isSelected = selectedDirectionId === direction.id;
          return (
            <div
              key={direction.id}
              className={`group rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ${
                isSelected
                  ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/30 shadow-sm'
                  : 'border-border-default hover:border-brand-primary/40 bg-bg-secondary hover:bg-bg-tertiary/60'
              }`}
            >
              <div className="space-y-2.5">
                {/* Thumbnail Preview with Aspect Ratio and Zoom Action */}
                <div className="relative rounded-lg overflow-hidden bg-black/10 border border-border-subtle aspect-video group/img">
                  <img
                    src={direction.imageUrl}
                    alt={direction.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                    <button
                      type="button"
                      onClick={() => setZoomedImage({ url: direction.imageUrl, title: direction.title })}
                      className="min-h-[44px] min-w-[44px] rounded-lg bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                      title="Enlarge candidate image"
                      aria-label="Enlarge candidate image"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="absolute top-1.5 left-1.5 text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/70 text-white backdrop-blur-xs">
                    Option {idx + 1}
                  </span>
                </div>

                {/* Title & Aesthetic Meta */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h3 className="text-xs font-bold text-text-primary truncate">
                      {direction.title}
                    </h3>
                  </div>
                  <div className="text-[10px] font-mono text-brand-primary font-medium truncate">
                    {direction.aesthetic}
                  </div>
                </div>

                {/* Description */}
                <p className="text-[11px] text-text-secondary leading-snug line-clamp-2">
                  {direction.description}
                </p>

                {/* Color Palette Swatches */}
                {direction.colorPalette && direction.colorPalette.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Palette className="w-3 h-3 text-text-muted shrink-0" />
                    <div className="flex items-center gap-1">
                      {direction.colorPalette.map((col, cIdx) => (
                        <span
                          key={cIdx}
                          className="w-3 h-3 rounded-full border border-white/20 shadow-2xs shrink-0"
                          style={{ backgroundColor: col }}
                          title={col}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Option 1: Accept Direction Button (min-h-[44px] touch target) */}
              <div className="pt-3 mt-3 border-t border-border-subtle/80">
                <button
                  type="button"
                  onClick={() => onAcceptDirection(direction)}
                  disabled={isExecuting}
                  className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
                    isSelected
                      ? 'bg-brand-primary text-white hover:bg-brand-primary-hi ring-1 ring-brand-primary/50'
                      : 'bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white border border-brand-primary/30'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>✓ Accepted (Generating Like This)</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept & Generate Implementation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Option 2: Reject & Request Changes Section */}
      <div className="pt-2 border-t border-border-subtle">
        {!isFeedbackOpen ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] text-text-muted">
              Not what you had in mind? You can reject these and request alterations.
            </span>
            <button
              type="button"
              onClick={() => setIsFeedbackOpen(true)}
              disabled={isExecuting || isCapReached}
              className="min-h-[44px] px-3.5 py-1.5 rounded-xl border border-border-default hover:border-brand-primary/40 bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-brand-primary" />
              <span>Reject & Demand Changes</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} className="space-y-2.5 p-3 rounded-xl bg-bg-secondary border border-border-default animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-brand-primary" />
                <span>Specify Changes to Regenerate 2-3 Alternative Images</span>
              </span>
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(false)}
                className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-1 text-text-muted hover:text-text-primary cursor-pointer flex items-center justify-center"
                aria-label="Cancel changes input"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={2}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="What changes would you like? (e.g., make it softer with light pastels, add warm retro tones, reduce card count, use bolder typography...)"
              disabled={isExecuting || isCapReached}
              className="w-full p-2.5 rounded-lg border border-border-default bg-bg-primary text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-text-muted">
                {isCapReached
                  ? '⚠️ 0 images remaining. Cannot regenerate.'
                  : `Uses up to ${Math.min(3, quotaState.remaining)} of ${quotaState.remaining} remaining image allowance.`}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFeedbackOpen(false)}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!feedbackText.trim() || isExecuting || isCapReached}
                  className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-brand-primary text-white hover:bg-brand-primary-hi disabled:opacity-40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Regenerate Other 2-3 Images</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Modal Zoom for Full-Resolution Inspection */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="max-w-3xl w-full bg-bg-secondary border border-border-default rounded-2xl overflow-hidden shadow-2xl space-y-2 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-text-primary truncate">
                {zoomedImage.title}
              </span>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="min-h-[44px] min-w-[44px] rounded-lg text-text-muted hover:text-text-primary flex items-center justify-center cursor-pointer"
                aria-label="Close zoom preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-border-subtle bg-black">
              <img
                src={zoomedImage.url}
                alt={zoomedImage.title}
                className="w-full max-h-[75vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
