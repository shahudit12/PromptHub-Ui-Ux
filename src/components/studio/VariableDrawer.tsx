import React, { useState, useEffect, useRef } from 'react';
import { Variable, X, Sparkles, CheckCircle2, AlertCircle, Hash } from 'lucide-react';
import { extractVariables, validateVariableValues } from '../../services/ai/variableEngine';

export interface VariableDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  template: string;
  variableValues: Record<string, string>;
  onValueChange: (key: string, value: string) => void;
  onResetValues: () => void;
  onExecute?: () => void;
}

export const VariableDrawer: React.FC<VariableDrawerProps> = ({
  isOpen,
  onClose,
  template,
  variableValues,
  onValueChange,
  onResetValues,
  onExecute,
}) => {
  if (!isOpen) return null;

  const { variables, tokens } = extractVariables(template);
  const validation = validateVariableValues(template, variableValues);

  // Resizable Variable Drawer width (persisted in localStorage)
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ph_variable_drawer_width');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 280 && parsed <= 640) return parsed;
      }
    } catch {}
    return 384;
  });
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(drawerWidth);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = drawerWidth;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
    startWidthRef.current = drawerWidth;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const delta = startXRef.current - clientX;
      const newWidth = Math.min(640, Math.max(280, Math.round(startWidthRef.current + delta)));
      setDrawerWidth(newWidth);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      try {
        localStorage.setItem('ph_variable_drawer_width', drawerWidth.toString());
      } catch {}
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, drawerWidth]);

  // Count occurrences of each variable in the prompt
  const getUsageCount = (varName: string) => {
    return tokens.filter((t) => t.key === varName).length;
  };

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 sm:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside 
        style={typeof window !== 'undefined' && window.innerWidth >= 640 ? { width: `${drawerWidth}px` } : undefined}
        className="fixed inset-y-0 right-0 w-full sm:relative sm:inset-auto border-l border-border-default bg-bg-secondary flex flex-col h-full shrink-0 shadow-2xl sm:shadow-none z-50 sm:z-auto transition-all relative"
      >
        {/* Left Draggable Resizer (Desktop) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={Math.round(drawerWidth)}
          aria-valuemin={280}
          aria-valuemax={640}
          tabIndex={0}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={() => {
            setDrawerWidth(384);
            try {
              localStorage.setItem('ph_variable_drawer_width', '384');
            } catch {}
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setDrawerWidth((prev) => Math.min(640, prev + 10));
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setDrawerWidth((prev) => Math.max(280, prev - 10));
            } else if (e.key === 'Home' || e.key === 'Enter') {
              setDrawerWidth(384);
            }
          }}
          className={`hidden sm:flex items-center justify-center absolute left-0 top-0 bottom-0 -translate-x-1/2 w-2 hover:w-3 cursor-col-resize select-none shrink-0 transition-all z-20 ${
            isDragging
              ? 'bg-brand-primary'
              : 'hover:bg-brand-primary/60'
          }`}
          title="Drag to resize variable inspector • Double-click to reset (384px) • Left/Right arrows to adjust"
        >
          <div className={`h-8 w-1 rounded-full transition-colors flex flex-col items-center justify-center gap-0.5 ${
            isDragging ? 'bg-white' : 'bg-text-muted hover:bg-white'
          }`}>
            <span className="w-0.5 h-0.5 rounded-full bg-current opacity-70" />
            <span className="w-0.5 h-0.5 rounded-full bg-current opacity-70" />
            <span className="w-0.5 h-0.5 rounded-full bg-current opacity-70" />
          </div>
        </div>
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border-default bg-bg-primary/50 shrink-0">
          <div className="flex items-center gap-2">
            <Variable className="w-4 h-4 text-brand-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Variable Inspector</h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-primary-light text-brand-primary">
              {variables.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Helper Note */}
          <div className="p-3 rounded-lg bg-bg-primary border border-border-default text-xs text-text-secondary space-y-1">
            <p className="font-medium text-text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
              Dynamic AST Variable Engine
            </p>
            <p className="text-[11px] leading-relaxed text-text-muted">
              Inspect parameter usage, defaults, and resolution before model execution.
            </p>
          </div>

          {/* Variable List */}
          {variables.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-border-default rounded-xl bg-bg-primary/30">
              <Variable className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-text-primary">No Variables Detected</p>
              <p className="text-[11px] text-text-muted mt-1">
                Add parameters like <code className="bg-bg-tertiary px-1 py-0.5 rounded text-brand-primary font-mono font-medium">{'{{user_input}}'}</code> to your prompt.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {variables.map((v) => {
                const currentValue = variableValues[v.name] ?? '';
                const isMissing = v.required && !currentValue.trim();
                const isNested = v.name.includes('.') || v.name.includes('[');
                const usageCount = getUsageCount(v.name);

                return (
                  <div
                    key={v.name}
                    className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                      isMissing
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-bg-primary border-border-default hover:border-border-hover'
                    }`}
                  >
                    {/* Top Info Bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-mono font-bold text-text-primary truncate">
                          {v.name}
                        </span>
                        {isNested && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-bg-tertiary text-text-muted">
                            nested
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
                        <span className="flex items-center gap-0.5" title="Occurrences in prompt">
                          <Hash className="w-3 h-3" /> {usageCount}x
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded font-medium ${
                            v.required
                              ? 'bg-red-500/10 text-red-700 dark:text-red-400 font-bold'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {v.required ? 'required' : 'optional'}
                        </span>
                      </div>
                    </div>

                    {v.defaultValue && (
                      <div className="text-[10px] font-mono text-text-muted">
                        Fallback default: <span className="text-text-secondary">"{v.defaultValue}"</span>
                      </div>
                    )}

                    {/* Input Box */}
                    <input
                      type="text"
                      data-studio-hotkey-run="true"
                      value={currentValue}
                      onChange={(e) => onValueChange(v.name, e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          (e.ctrlKey || e.metaKey) &&
                          (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13)
                        ) {
                          e.preventDefault();
                          if (onExecute) onExecute();
                        }
                      }}
                      placeholder={v.defaultValue ? `Default: ${v.defaultValue}` : `Enter value for ${v.name}...`}
                      className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-bg-secondary border border-border-default text-text-primary focus:outline-none focus:border-brand-primary transition-colors"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Validation Status & Quick Fill Helpers */}
          {variables.length > 0 && (
            <div className="pt-2 space-y-2">
              {validation.isValid ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>All required parameters resolved</span>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate">Missing: {validation.missingVariables.join(', ')}</span>
                  </div>
                </div>
              )}

              {/* Quick Fill Action */}
              <button
                type="button"
                onClick={() => {
                  variables.forEach((v) => {
                    if (!variableValues[v.name]?.trim()) {
                      const sample =
                        v.defaultValue ||
                        (v.name.toLowerCase().includes('code') ? 'console.log("Hello PromptHub!");' :
                         v.name.toLowerCase().includes('lang') ? 'TypeScript' :
                         v.name.toLowerCase().includes('topic') ? 'Machine Learning Prompt Optimization' :
                         v.name.toLowerCase().includes('query') ? 'How do neural attention networks work?' :
                         v.name.toLowerCase().includes('url') ? 'https://prompthub.cloud' :
                         `Sample ${v.name.replace(/_/g, ' ')} value`);
                      onValueChange(v.name, sample);
                    }
                  });
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-bg-primary hover:bg-bg-tertiary border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                <span>Auto-Fill Sample Parameter Values</span>
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {variables.length > 0 && (
          <div className="p-3 border-t border-border-default bg-bg-primary/50 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onResetValues}
              className="text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Clear Values
            </button>
            <span className="text-[11px] font-mono text-text-muted">
              {Object.keys(variableValues).length} of {variables.length} parameters set
            </span>
          </div>
        )}
      </aside>
    </>
  );
};
