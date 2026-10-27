import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Edit3,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';

export interface PromptTransformationCardProps {
  simplePrompt: string;
  betterPrompt: string;
  activeSkills?: string[];
  mcpEnabled?: boolean;
  hasPreviousContext?: boolean;
  modelUsed?: string;
  onEditBetterPrompt?: (updatedPrompt: string) => void;
  className?: string;
}

export const PromptTransformationCard: React.FC<PromptTransformationCardProps> = ({
  simplePrompt,
  betterPrompt,
  activeSkills = ['/adapt', '/audit', '/polish'],
  mcpEnabled = true,
  hasPreviousContext = true,
  modelUsed = 'CO-STAR Prompt Architect',
  onEditBetterPrompt,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(betterPrompt);
  const [copied, setCopied] = useState(false);

  // Sync if betterPrompt changes
  React.useEffect(() => {
    setEditedText(betterPrompt);
  }, [betterPrompt]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(betterPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (onEditBetterPrompt) {
      onEditBetterPrompt(editedText);
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`rounded-xl bg-bg-secondary border border-border-default hover:border-brand-primary/40 transition-all shadow-3xs overflow-hidden select-text ${className}`}
    >
      {/* ── 1. Transformation Compact Header ── */}
      <div className="p-2 sm:p-2.5 bg-gradient-to-r from-brand-primary/5 via-bg-secondary to-brand-accent/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0 shadow-3xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-text-primary font-display whitespace-nowrap">
              Prompt Enhanced
            </span>
            <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>CO-STAR Spec</span>
            </span>
            {!isExpanded && (
              <span className="hidden md:inline text-[11px] text-text-muted truncate max-w-[260px] font-mono">
                &bull; {betterPrompt.replace(/\s+/g, ' ').slice(0, 60)}...
              </span>
            )}
          </div>
        </div>

        {/* Action Controls (All min-h-[44px] compliant) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[44px] px-2.5 py-1 rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer flex items-center gap-1"
            title="Copy Enhanced Prompt"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {onEditBetterPrompt && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(!isEditing);
                setIsExpanded(true);
              }}
              className={`min-h-[44px] px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                isEditing
                  ? 'bg-brand-primary text-white border-brand-primary font-semibold'
                  : 'bg-bg-primary hover:bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
              }`}
              title="Edit or adjust the Better Prompt"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Done Editing' : 'Tweak'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="min-h-[44px] px-2.5 py-1 rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer flex items-center gap-1"
            title={isExpanded ? 'Collapse prompt details' : 'Expand full prompt view'}
            aria-label={isExpanded ? 'Collapse Better Prompt' : 'Expand Better Prompt'}
          >
            <span className="text-[11px] font-mono">{isExpanded ? 'Less' : 'Details'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── 2. Before / After Comparison (Only rendered when expanded) ── */}
      {isExpanded && (
        <div className="p-3 border-t border-border-default space-y-2.5 bg-bg-primary/50">
          {/* Simple Prompt Row (Input) */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
              <span>User &bull; Simple Prompt</span>
            </div>
            <div className="p-2 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-secondary font-mono leading-relaxed break-words">
              &ldquo;{simplePrompt}&rdquo;
            </div>
          </div>

          {/* Visual Connector */}
          <div className="flex items-center gap-2 pl-1.5">
            <div className="w-px h-2.5 bg-brand-primary/40" />
            <div className="flex items-center gap-1 text-[9.5px] font-mono font-bold text-brand-primary">
              <ArrowRight className="w-3 h-3 text-brand-primary" />
              <span>Enhanced Production Specification</span>
            </div>
            {/* Active Skill & Context Badges */}
            <div className="flex items-center gap-1 flex-wrap">
              {activeSkills.map((skill) => (
                <span
                  key={skill}
                  className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                >
                  {skill}
                </span>
              ))}
              {mcpEnabled && (
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  MCP
                </span>
              )}
              {hasPreviousContext && (
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Memory
                </span>
              )}
            </div>
          </div>

          {/* Better Prompt (Output from Model) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-brand-primary font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                <span>Better Prompt &bull; Production Spec</span>
              </span>
              <span className="text-[9px] font-normal text-text-muted">{modelUsed}</span>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={5}
                  className="w-full p-2.5 rounded-lg bg-bg-primary border border-brand-primary text-xs font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y"
                  placeholder="Adjust the enhanced prompt instructions..."
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="min-h-[44px] px-3 py-1 rounded-lg border border-border-default text-xs text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="min-h-[44px] px-3 py-1 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold cursor-pointer"
                  >
                    Apply Tweak
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-bg-primary border border-brand-primary/30 text-xs text-text-primary font-mono leading-relaxed max-h-60 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                {betterPrompt}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
