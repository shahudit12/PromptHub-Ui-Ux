import React, { useState } from 'react';
import {
  Presentation,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  StickyNote,
} from 'lucide-react';
import { DeliverableVersionPills, type DeliverableVersion } from './DeliverableVersionPills';

export interface PresentationSlide {
  id: string;
  slideNumber: number;
  category?: string;
  title: string;
  subtitle?: string;
  bullets: string[];
  highlightMetric?: {
    value: string;
    label: string;
  };
  speakerNotes?: string;
}

export interface PresentationDeliverableData {
  title: string;
  subtitle?: string;
  totalSlides: number;
  authorModel?: string;
  slides: PresentationSlide[];
  version?: number;
  versions?: DeliverableVersion[];
}

export interface PresentationDeliverableCardProps {
  data?: Partial<PresentationDeliverableData>;
  onIterate?: (prompt: string) => void;
  onVersionChange?: (version: number) => void;
  className?: string;
}

export const PresentationDeliverableCard: React.FC<PresentationDeliverableCardProps> = ({
  data,
  onIterate,
  onVersionChange,
  className = '',
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [copied, setCopied] = useState(false);

  const title = data?.title || 'Executive Presentation Deck';
  const subtitle = data?.subtitle || 'High-impact slide presentation';
  const slides: PresentationSlide[] = data?.slides && data.slides.length > 0 ? data.slides : [
    {
      id: 'slide_1',
      slideNumber: 1,
      category: 'Overview',
      title: 'Strategic Foundation & Vision',
      subtitle: 'Executive introduction and primary objectives',
      bullets: [
        'Disrupt market friction through autonomous execution',
        'Accelerate time-to-market by 4x across product iterations',
        'Empower non-technical creators with enterprise-grade deliverables',
      ],
      highlightMetric: { value: '4.2x', label: 'Faster Execution' },
      speakerNotes: 'Set the tone with urgency. Emphasize that traditional workflows cost 10x more and take weeks.',
    },
    {
      id: 'slide_2',
      slideNumber: 2,
      category: 'Market Opportunity',
      title: 'The Multi-Crore Blue Ocean',
      subtitle: 'Capturing underserved creators and agency builders',
      bullets: [
        '95% of business builders cannot code or write complex prompts',
        'Micro-billing economics eliminate USD credit card barriers',
        'Direct delivery into client storage drives eliminates friction',
      ],
      highlightMetric: { value: '₹3.4M', label: 'Annual Run-Rate' },
      speakerNotes: 'Walk through why competitors fail: ChatGPT outputs raw text, Cursor requires dev setup. PromptHub delivers finished capsules.',
    },
    {
      id: 'slide_3',
      slideNumber: 3,
      category: 'Execution Roadmap',
      title: 'Actionable 90-Day Milestones',
      subtitle: 'Targeted delivery timeline and core milestones',
      bullets: [
        'Phase 1: Zero-Dev Studio Capsule and 1-Click Hosting',
        'Phase 2: Local UPI Micro-Pack Billing Engine',
        'Phase 3: Autonomous AST Multi-Turn Refinement',
      ],
      highlightMetric: { value: '98.4%', label: 'Turn-1 Accuracy' },
      speakerNotes: 'Reassure stakeholders on technical feasibility and low security risk footprint.',
    },
  ];

  const currentSlide = slides[currentSlideIndex] || slides[0];

  const handlePrev = () => {
    setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1));
  };

  const handleNext = () => {
    setCurrentSlideIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0));
  };

  const handleCopyCurrentSlide = async () => {
    const text = `Slide ${currentSlide.slideNumber}: ${currentSlide.title}\n${currentSlide.subtitle || ''}\n\n` +
      currentSlide.bullets.map((b) => `• ${b}`).join('\n') +
      (currentSlide.speakerNotes ? `\n\nSpeaker Notes: ${currentSlide.speakerNotes}` : '');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownloadHtmlSlides = () => {
    const slideHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0B1118; color: #FFFFFF; }
    .slide { display: none; min-height: 100vh; padding: 4rem 2rem; }
    .slide.active { display: flex; flex-direction: column; justify-content: space-between; }
  </style>
</head>
<body class="flex flex-col min-h-screen">
  <div class="fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
    <span id="counter" class="font-mono text-cyan-400">1 / ${slides.length}</span>
    <button onclick="prevSlide()" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-white cursor-pointer">&larr;</button>
    <button onclick="nextSlide()" class="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-white cursor-pointer">&rarr;</button>
  </div>
  ${slides.map((s, idx) => `
    <div class="slide ${idx === 0 ? 'active' : ''} max-w-5xl mx-auto w-full my-auto" id="slide-${idx}">
      <div>
        <span class="px-3 py-1 rounded-full text-xs font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">${s.category || 'Presentation'}</span>
        <h1 class="text-3xl sm:text-5xl font-bold mt-4 tracking-tight">${s.title}</h1>
        ${s.subtitle ? `<p class="text-slate-400 text-lg mt-2">${s.subtitle}</p>` : ''}
      </div>
      <div class="my-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="md:col-span-2 space-y-4">
          ${s.bullets.map((b) => `<div class="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800"><span class="w-2 h-2 rounded-full bg-cyan-400 mt-2 shrink-0"></span><span class="text-slate-200 text-base leading-relaxed">${b}</span></div>`).join('')}
        </div>
        ${s.highlightMetric ? `<div class="p-6 rounded-2xl bg-gradient-to-br from-cyan-950/60 to-slate-900 border border-cyan-800/60 flex flex-col items-center justify-center text-center"><span class="text-4xl font-extrabold text-cyan-400 font-mono">${s.highlightMetric.value}</span><span class="text-xs text-slate-400 mt-2 uppercase tracking-wider">${s.highlightMetric.label}</span></div>` : ''}
      </div>
      ${s.speakerNotes ? `<div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400"><strong class="text-slate-300">Speaker Notes:</strong> ${s.speakerNotes}</div>` : ''}
    </div>
  `).join('')}
  <script>
    let current = 0;
    const total = ${slides.length};
    function showSlide(index) {
      document.querySelectorAll('.slide').forEach((el, i) => el.classList.toggle('active', i === index));
      document.getElementById('counter').innerText = (index + 1) + ' / ' + total;
    }
    function prevSlide() { current = current > 0 ? current - 1 : total - 1; showSlide(current); }
    function nextSlide() { current = current < total - 1 ? current + 1 : 0; showSlide(current); }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    });
  </script>
</body>
</html>`;

    const blob = new Blob([slideHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-slides.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`rounded-2xl border border-border-default bg-bg-secondary p-4 sm:p-5 shadow-xs transition-all ${className}`}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-border-default">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] flex items-center justify-center shrink-0">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary tracking-tight">{title}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border border-brand-primary/20">
                {slides.length} SLIDES
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data?.versions && data.versions.length > 1 && (
            <DeliverableVersionPills
              versions={data.versions}
              activeVersion={data.version || 1}
              onSelectVersion={(v) => onVersionChange?.(v)}
            />
          )}

          <button
            type="button"
            onClick={handleCopyCurrentSlide}
            className="min-h-[32px] px-2.5 py-1 rounded-lg border border-border-default hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copy current slide text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadHtmlSlides}
            className="min-h-[32px] px-3 py-1 rounded-lg bg-brand-primary hover:bg-[#084C8D] dark:bg-[#41A2D9] dark:hover:bg-[#64B6E3] text-white dark:text-[#000000] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Download standalone interactive HTML slide deck"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Deck (.html)</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Slide Canvas */}
      <div className="my-4 p-5 sm:p-7 rounded-2xl bg-bg-primary border border-border-default shadow-xs flex flex-col justify-between min-h-[340px] relative overflow-hidden group">
        {/* Top category & slide number */}
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-bg-tertiary text-brand-primary dark:text-[#41A2D9] border border-border-subtle">
            {currentSlide.category || `Slide ${currentSlide.slideNumber}`}
          </span>
          <span className="text-xs font-mono text-text-muted">
            {currentSlideIndex + 1} of {slides.length}
          </span>
        </div>

        {/* Slide Title & Bullets */}
        <div className="my-4 space-y-3">
          <h2 className="text-lg sm:text-2xl font-bold font-display text-text-primary tracking-tight">
            {currentSlide.title}
          </h2>
          {currentSlide.subtitle && (
            <p className="text-xs sm:text-sm text-text-secondary font-medium">
              {currentSlide.subtitle}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="md:col-span-2 space-y-2">
              {currentSlide.bullets.map((bullet, bIdx) => (
                <div
                  key={`b_${bIdx}`}
                  className="p-2.5 rounded-xl bg-bg-secondary border border-border-default flex items-start gap-2.5 text-xs text-text-primary leading-relaxed"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary dark:text-[#41A2D9] mt-1.5 shrink-0" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            {currentSlide.highlightMetric && (
              <div className="p-4 rounded-xl bg-bg-secondary border border-brand-primary/30 flex flex-col items-center justify-center text-center">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-brand-primary dark:text-[#41A2D9]">
                  {currentSlide.highlightMetric.value}
                </span>
                <span className="text-[10px] uppercase font-semibold text-text-muted mt-1 tracking-wider">
                  {currentSlide.highlightMetric.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Slide Navigation Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={handlePrev}
            className="min-h-[36px] px-3 py-1 rounded-xl border border-border-default hover:bg-bg-tertiary text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, dotIdx) => (
              <button
                key={`dot_${dotIdx}`}
                type="button"
                onClick={() => setCurrentSlideIndex(dotIdx)}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  dotIdx === currentSlideIndex
                    ? 'w-6 bg-brand-primary dark:bg-[#41A2D9]'
                    : 'bg-border-default hover:bg-text-muted'
                }`}
                aria-label={`Jump to slide ${dotIdx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="min-h-[36px] px-3 py-1 rounded-xl bg-brand-primary hover:bg-[#084C8D] dark:bg-[#41A2D9] dark:hover:bg-[#64B6E3] text-white dark:text-[#000000] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Speaker Notes Toggle */}
      {currentSlide.speakerNotes && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="text-xs font-medium text-text-muted hover:text-text-primary flex items-center gap-1.5 cursor-pointer"
          >
            <StickyNote className="w-3.5 h-3.5 text-brand-primary" />
            <span>{showNotes ? 'Hide Speaker Notes' : 'View Speaker Notes'}</span>
          </button>
          {showNotes && (
            <div className="mt-2 p-3 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-secondary leading-relaxed">
              <strong className="text-text-primary">Presenter Cue: </strong>
              {currentSlide.speakerNotes}
            </div>
          )}
        </div>
      )}

      {/* Quick Revision Prompts */}
      <div className="mt-3.5 pt-3 border-t border-border-default flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-mono text-text-muted uppercase font-bold mr-1">
          Revise Deck:
        </span>
        {[
          'Add competitive comparison slide',
          'Add revenue projections slide',
          'Make bullet points shorter',
          'Translate deck to Spanish',
        ].map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onIterate?.(chip)}
            className="min-h-[28px] px-2.5 py-0.5 rounded-lg border border-border-default hover:border-brand-primary bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-[11px] transition-colors cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
};
