import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const GuidedTaskComposer: React.FC = () => {
  const { showToast, setActiveTab } = useApp();
  const [inputGoal, setInputGoal] = useState('');

  const handleLaunchPlan = () => {
    const trimmed = inputGoal.trim();
    if (!trimmed) {
      showToast('Tell PromptHub what you want to create, improve or accomplish...', 'info');
      return;
    }

    try {
      sessionStorage.setItem('ph_unified_creation_pending_goal', trimmed);
    } catch {}

    setActiveTab('workspace');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleLaunchPlan();
    }
  };

  return (
    <section 
      aria-label="Unified Task Composer" 
      className="w-full bg-bg-secondary border border-border-default rounded-2xl p-4 sm:p-6 lg:p-7 shadow-xs relative overflow-hidden"
    >
      {/* Background Accent Mesh */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Header */}
      <div className="relative z-10 max-w-2xl mb-4 sm:mb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-primary-light/60 dark:bg-emerald-950/40 border border-brand-primary/20 dark:border-emerald-800/40 text-[11px] font-mono font-medium text-brand-primary dark:text-emerald-300 mb-2">
          <Sparkles className="w-3 h-3" />
          <span>WORKSPACE</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-text-primary tracking-tight leading-snug">
          What would you like to create today?
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
          Describe your idea in your own words. I'll help you turn it into something real.
        </p>
      </div>

      {/* Goal Input Field */}
      <div className="relative z-10">
        <div className="relative flex flex-col bg-bg-primary rounded-xl border border-border-default focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all duration-200">
          <textarea
            value={inputGoal}
            onChange={(e) => setInputGoal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell PromptHub what you want to create, improve or accomplish..."
            rows={3}
            className="w-full bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/60 resize-none outline-none font-sans leading-relaxed custom-scrollbar"
          />

          <div className="px-3 py-2 flex items-center justify-between border-t border-border-subtle bg-bg-tertiary/40 rounded-b-xl">
            <span className="text-[11px] font-mono text-text-muted hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border-default text-text-secondary font-mono text-[10px]">Enter</kbd> to start &bull; <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border-default text-text-secondary font-mono text-[10px]">Shift</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border-default text-text-secondary font-mono text-[10px]">Enter</kbd> for newline
            </span>

            <button
              type="button"
              onClick={handleLaunchPlan}
              className="ml-auto min-h-[44px] px-4 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer"
            >
              <span>Start in Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
