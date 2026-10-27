import React from 'react';
import {
  Save,
  Lock,
  Globe,
  FolderPlus,
  ChevronDown,
  Check,
  Loader2,
  Layers,
  Upload,
} from 'lucide-react';
import type { CategoryType } from '../../db/schema';
import { useTone } from '../../context/ToneContext';

export interface PromptHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  category: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
  visibility: 'public' | 'private';
  onVisibilityChange: (visibility: 'public' | 'private') => void;
  onSave: () => void;
  onAddToCollection: () => void;
  onImport?: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  activePromptId?: string | null;
  onToggleLibrary?: () => void;
  isLibraryOpen?: boolean;
  promptsCount?: number;
}

const CATEGORIES: CategoryType[] = [
  'Development',
  'Marketing',
  'Design',
  'Writing',
  'Business',
  'Education',
  'Other',
];

export const PromptHeader: React.FC<PromptHeaderProps> = ({
  title,
  onTitleChange,
  category,
  onCategoryChange,
  visibility,
  onVisibilityChange,
  onSave,
  onAddToCollection,
  onImport,
  isSaving = false,
  hasUnsavedChanges = false,
  activePromptId: _activePromptId,
  onToggleLibrary,
  isLibraryOpen = false,
  promptsCount = 0,
}) => {
  const { copy } = useTone();

  const saveButton = (
    <button
      type="button"
      onClick={onSave}
      disabled={isSaving}
      data-tour="tour-save-prompt"
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs shrink-0 min-h-[44px] sm:min-h-[36px] cursor-pointer ${
        isSaving
          ? 'bg-brand-primary/70 text-white cursor-not-allowed'
          : hasUnsavedChanges
          ? 'bg-brand-primary hover:bg-brand-primary-hi text-white shadow-brand-primary/20 ring-1 ring-brand-primary/30'
          : 'bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover'
      }`}
      title={hasUnsavedChanges ? `${copy.savePrompt} (Ctrl+S)` : 'All changes saved'}
    >
      {isSaving ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Saving...</span>
        </>
      ) : hasUnsavedChanges ? (
        <>
          <Save className="w-3.5 h-3.5" />
          <span>Save *</span>
        </>
      ) : (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-500" />
          <span>Saved</span>
        </>
      )}
    </button>
  );

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-bg-secondary border-b border-border-default shrink-0 select-none">
      {/* ── ROW 1 on Mobile / LEFT CLUSTER on Desktop ── */}
      <div className="flex items-center justify-between sm:justify-start gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Library Toggle Button */}
          {onToggleLibrary && (
            <button
              type="button"
              onClick={onToggleLibrary}
              data-tour="tour-library-toggle"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shrink-0 min-h-[44px] sm:min-h-[36px] ${
                isLibraryOpen
                  ? 'bg-brand-primary-light border-brand-primary/40 text-brand-primary shadow-2xs'
                  : 'bg-bg-primary border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover'
              }`}
              title={isLibraryOpen ? 'Close Prompt Library (Drawer)' : 'Open Prompt Library (Drawer)'}
              aria-label="Toggle Prompt Library"
            >
              <Layers className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-brand-primary" />
              <span className="hidden md:inline">Library</span>
              {promptsCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-brand-primary/10 text-brand-primary">
                  {promptsCount}
                </span>
              )}
            </button>
          )}

          {/* Inline Editable Title */}
          <input
            type="text"
            value={title}
            maxLength={100}
            onChange={(e) => onTitleChange(e.target.value.slice(0, 100))}
            placeholder="Untitled Prompt..."
            data-tour="tour-prompt-title"
            aria-label="Prompt Title"
            className="text-sm font-semibold text-text-primary bg-transparent border border-transparent hover:border-border-default focus:border-brand-primary focus:bg-bg-primary focus:outline-none transition-all rounded-md px-2 py-1 truncate flex-1 min-w-0 min-h-[44px] sm:min-h-0 sm:max-w-xs md:max-w-sm"
          />
        </div>

        {/* Mobile-only Save Button positioned in Row 1 beside Title */}
        <div className="flex items-center sm:hidden shrink-0">
          {saveButton}
        </div>
      </div>

      {/* ── ROW 2 on Mobile / RIGHT CLUSTER on Desktop ── */}
      <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto shrink-0 overflow-x-auto no-scrollbar pt-1 sm:pt-0 border-t border-border-default/40 sm:border-t-0">
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Category Pill */}
          <div className="relative inline-flex items-center shrink-0">
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value as CategoryType)}
              aria-label="Prompt Category"
              className="appearance-none text-xs sm:text-[11px] font-mono font-medium pl-2 pr-6 py-1.5 sm:py-1 rounded-md bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover focus:outline-none focus:border-brand-primary transition-colors cursor-pointer min-h-[44px] sm:min-h-[32px]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-text-muted absolute right-1.5 pointer-events-none" />
          </div>

          {/* Visibility Pill */}
          <button
            type="button"
            onClick={() => onVisibilityChange(visibility === 'public' ? 'private' : 'public')}
            className={`flex items-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-md text-xs sm:text-[11px] font-mono font-medium border transition-colors shrink-0 min-h-[44px] sm:min-h-[32px] cursor-pointer ${
              visibility === 'public'
                ? 'bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border-brand-primary/20 hover:bg-brand-primary/20'
                : 'bg-bg-primary text-text-muted border-border-default hover:text-text-primary hover:border-border-hover'
            }`}
            title={`Visibility: ${visibility} (click to toggle)`}
          >
            {visibility === 'public' ? (
              <Globe className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-brand-primary dark:text-[#41A2D9]" />
            ) : (
              <Lock className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-text-muted" />
            )}
            <span className="capitalize">{visibility}</span>
          </button>
        </div>

        {/* Action Controls Cluster */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Import Button */}
          {onImport && (
            <button
              type="button"
              onClick={onImport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover text-xs font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] shrink-0"
              title="Import prompt from Markdown, JSON, Cursor, or TOML"
            >
              <Upload className="w-3.5 h-3.5 text-brand-primary" />
              <span className="hidden md:inline">Import</span>
            </button>
          )}

          {/* Add to Collection */}
          <button
            type="button"
            onClick={onAddToCollection}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover text-xs font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px] shrink-0"
            title="Add to Collection"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Collect</span>
          </button>

          {/* Desktop-only Save Button */}
          <div className="hidden sm:flex items-center shrink-0">
            {saveButton}
          </div>
        </div>
      </div>
    </header>
  );
};
