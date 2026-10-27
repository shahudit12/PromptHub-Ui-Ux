import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoryProblemStage } from './StoryProblemStage';
import { StoryAnalyzeStage } from './StoryAnalyzeStage';
import { StoryOptimizeStage } from './StoryOptimizeStage';
import { StoryTestStage } from './StoryTestStage';
import { StoryCompareStage } from './StoryCompareStage';
import { StorySaveStage } from './StorySaveStage';
import { StoryPayoffStage } from './StoryPayoffStage';
import { EASE, DURATION } from '../../lib/animations';
import { 
  Sparkles, 
  Gauge, 
  Wand2, 
  Play, 
  Award, 
  BookmarkCheck, 
  Trophy,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export interface InteractiveProductStoryProps {
  className?: string;
}

const STORY_STAGES = [
  { id: 1, name: 'The Problem', icon: Sparkles, available: true },
  { id: 2, name: 'Analyze', icon: Gauge, available: true },
  { id: 3, name: 'Optimize', icon: Wand2, available: true },
  { id: 4, name: 'Test', icon: Play, available: true },
  { id: 5, name: 'Verify', icon: Award, available: true },
  { id: 6, name: 'Save & Use', icon: BookmarkCheck, available: true },
  { id: 7, name: 'Why PromptHub', icon: Trophy, available: true },
];

export const InteractiveProductStory: React.FC<InteractiveProductStoryProps> = ({
  className = '',
}) => {
  const [activeStage, setActiveStage] = useState<number>(1);

  const prefersReduced = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleNext = () => {
    setActiveStage((prev) => (prev < 7 ? prev + 1 : prev));
  };

  const handleBack = () => {
    setActiveStage((prev) => (prev > 1 ? prev - 1 : prev));
  };

  return (
    <section 
      id="product-story"
      aria-label="Interactive Product Story"
      className={`w-full bg-bg-primary border-b border-border-default transition-colors relative overflow-hidden ${className}`}
    >
      {/* ─── STORY PROGRESS RAIL / STEPPER ───────────────────────────── */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-5 sm:pt-6">
        {/* Desktop: Full 7-stage Segmented Navigation Bar */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="inline-flex items-center p-1 rounded-xl bg-bg-secondary border border-border-default shadow-2xs">
            {STORY_STAGES.map((stage) => {
              const isActive = activeStage === stage.id;
              const isAvailable = stage.available;
              const Icon = stage.icon;

              return (
                <button
                  key={stage.id}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => isAvailable && setActiveStage(stage.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap min-h-[40px] ${
                    isActive
                      ? 'bg-brand-primary text-white font-bold shadow-2xs'
                      : isAvailable
                      ? 'text-text-primary hover:bg-bg-tertiary cursor-pointer font-medium'
                      : 'text-text-muted/50 cursor-not-allowed opacity-60'
                  }`}
                  aria-label={`Story stage ${stage.id}: ${stage.name}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>0{stage.id}</span>
                  <span>{stage.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile & Portrait Tablet: Compact Progress Header with One-Handed Thumb Controls */}
        <div className="lg:hidden flex flex-col gap-2 p-3 rounded-xl bg-bg-secondary border border-border-default shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {React.createElement(STORY_STAGES[activeStage - 1].icon, {
                className: 'w-4 h-4 text-brand-primary shrink-0',
              })}
              <div className="flex items-baseline gap-1.5 font-mono text-xs">
                <span className="font-bold text-text-primary">
                  0{activeStage}
                </span>
                <span className="text-text-muted">•</span>
                <span className="font-bold text-brand-primary">
                  {STORY_STAGES[activeStage - 1].name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={activeStage === 1}
                onClick={handleBack}
                className="w-11 h-11 rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-text-secondary cursor-pointer transition-colors"
                aria-label="Previous story stage"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-text-muted px-1 select-none">
                {activeStage}/7
              </span>
              <button
                type="button"
                disabled={activeStage === 7}
                onClick={handleNext}
                className="w-11 h-11 rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-text-secondary cursor-pointer transition-colors"
                aria-label="Next story stage"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 7-Segmented Mobile Progress Bar */}
          <div className="flex items-center gap-1 w-full pt-1">
            {STORY_STAGES.map((stage) => {
              const isPastOrCurrent = stage.id <= activeStage;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStage(stage.id)}
                  aria-label={`Jump to stage ${stage.id}: ${stage.name}`}
                  className="h-1.5 flex-1 rounded-full transition-colors cursor-pointer bg-border-default"
                >
                  <span
                    className={`block h-full w-full rounded-full transition-colors ${
                      isPastOrCurrent ? 'bg-brand-primary' : 'bg-border-default'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── STAGE CONTAINER WITH TRANSITIONS ────────────────────────── */}
      <div className="relative w-full">
        <AnimatePresence mode="wait">
          {activeStage === 1 && (
            <motion.div
              key="stage-1"
              initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReduced ? 0 : -12 }}
              transition={{ duration: prefersReduced ? 0 : DURATION.page, ease: EASE }}
            >
              <StoryProblemStage onNext={handleNext} />
            </motion.div>
          )}

          {activeStage === 2 && (
            <motion.div
              key="stage-2"
              initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReduced ? 0 : -12 }}
              transition={{ duration: prefersReduced ? 0 : DURATION.page, ease: EASE }}
            >
              <StoryAnalyzeStage onBack={handleBack} onNext={handleNext} />
            </motion.div>
          )}

          {activeStage === 3 && (
            <motion.div
              key="stage-3"
              initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReduced ? 0 : -12 }}
              transition={{ duration: prefersReduced ? 0 : DURATION.page, ease: EASE }}
            >
              <StoryOptimizeStage onBack={handleBack} onNext={handleNext} />
            </motion.div>
          )}

          {activeStage === 4 && (
            <motion.div
              key="stage-4"
              initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReduced ? 0 : -12 }}
              transition={{ duration: prefersReduced ? 0 : DURATION.page, ease: EASE }}
            >
              <StoryTestStage onBack={handleBack} onNext={handleNext} />
            </motion.div>
          )}

          {activeStage === 5 && (
            <motion.div
              key="stage-5"
              initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReduced ? 0 : -12 }}
              transition={{ duration: prefersReduced ? 0 : DURATION.page, ease: EASE }}
            >
              <StoryCompareStage onBack={handleBack} onNext={handleNext} />
            </motion.div>
          )}

          {activeStage === 6 && (
            <motion.div
              key="stage-6"
              initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReduced ? 0 : -12 }}
              transition={{ duration: prefersReduced ? 0 : DURATION.page, ease: EASE }}
            >
              <StorySaveStage onBack={handleBack} onNext={handleNext} />
            </motion.div>
          )}

          {activeStage === 7 && (
            <motion.div
              key="stage-7"
              initial={{ opacity: 0, y: prefersReduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: prefersReduced ? 0 : -12 }}
              transition={{ duration: prefersReduced ? 0 : DURATION.page, ease: EASE }}
            >
              <StoryPayoffStage onBack={handleBack} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default InteractiveProductStory;