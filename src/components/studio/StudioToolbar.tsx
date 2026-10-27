import React from 'react';
import { 
  Sparkles, 
  History, 
  Download, 
  Cpu, 
  ChevronDown,
  Variable,
  Zap,
  Briefcase,
} from 'lucide-react';
import {
  PromptStudioIcon,
  PromptArenaIcon,
  PromptAnalyzerIcon,
} from '../icons/PromptHubIcons';
import { formatModelDisplayName, formatModelShortName, isFreeModel } from '../../utils/modelFormatting';

export type StudioTabMode = 
  | 'editor' 
  | 'arena' 
  | 'optimizer' 
  | 'history' 
  | 'export';

export interface StudioToolbarProps {
  activeMode: StudioTabMode;
  onModeChange: (mode: StudioTabMode) => void;
  selectedModel: string;
  onOpenModelModal: () => void;
  variablesCount: number;
  onToggleVariables: () => void;
  isVariablesOpen: boolean;
  isDeliverableEngineActive?: boolean;
  onToggleDeliverableEngine?: () => void;
  onAnalyzePrompt?: () => void;
  onSendToWork?: () => void;
  onSwitchToOneChat?: () => void;
}

export const StudioToolbar: React.FC<StudioToolbarProps> = ({
  activeMode,
  onModeChange,
  selectedModel,
  onOpenModelModal,
  variablesCount,
  onToggleVariables,
  isVariablesOpen,
  isDeliverableEngineActive = true,
  onToggleDeliverableEngine,
  onAnalyzePrompt,
  onSendToWork,
  onSwitchToOneChat,
}) => {
  // Authoritative Prompt IDE Navigation Tabs (Cleaned: Editor, Arena, Optimizer, History, Export)
  const tabs: Array<{ id: StudioTabMode; label: string; icon: React.ReactNode; badge?: string | number; badgeColor?: string }> = [
    { id: 'editor', label: 'Editor', icon: <PromptStudioIcon className="w-3.5 h-3.5" /> },
    { id: 'arena', label: 'Arena 2-4x', icon: <PromptArenaIcon className="w-3.5 h-3.5" />, badge: 'Compare' },
    { id: 'optimizer', label: 'Optimizer', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'history', label: 'History', icon: <History className="w-3.5 h-3.5" /> },
    { id: 'export', label: 'Export', icon: <Download className="w-3.5 h-3.5" /> },
  ];

  const friendlyModelName = formatModelShortName(selectedModel, 24);
  const isFree = isFreeModel(selectedModel);

  const modelSelectorButton = (isMobile?: boolean) => (
    <button
      type="button"
      onClick={onOpenModelModal}
      data-model-picker-trigger="true"
      data-tour="tour-model-selector"
      aria-label="Select AI model"
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-primary border border-border-default text-xs font-sans text-text-primary hover:border-brand-primary/40 hover:bg-bg-tertiary/40 transition-colors cursor-pointer min-h-[44px] sm:min-h-[34px] shrink-0 ${
        isMobile ? 'flex-1 min-w-0 justify-between' : ''
      }`}
      title={`Active Model: ${formatModelDisplayName(selectedModel)} • Click to switch`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Cpu className="w-3.5 h-3.5 text-brand-primary shrink-0" />
        <span className={`font-medium truncate ${isMobile ? 'max-w-[180px]' : 'max-w-[95px] md:max-w-[125px] lg:max-w-[155px] xl:max-w-[185px]'}`}>
          {friendlyModelName}
        </span>
        {isFree && (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20 shrink-0">
            FREE
          </span>
        )}
      </div>
      <ChevronDown className="w-3 h-3 text-text-muted shrink-0 ml-1" />
    </button>
  );

  const variablesButton = (
    <button
      type="button"
      onClick={onToggleVariables}
      data-tour="tour-parameters-panel"
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[34px] shrink-0 ${
        isVariablesOpen
          ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
          : 'bg-bg-primary border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover'
      }`}
      title="Inspect & Edit Prompt Variables"
      aria-label="Toggle Prompt Variables Drawer"
    >
      <Variable className="w-3.5 h-3.5 shrink-0" />
      <span className="hidden md:inline whitespace-nowrap">Variables</span>
      {variablesCount > 0 && (
        <span
          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
            isVariablesOpen ? 'bg-white/20 text-white' : 'bg-brand-primary-light text-brand-primary'
          }`}
        >
          {variablesCount}
        </span>
      )}
    </button>
  );
  const deliverableEngineButton = onToggleDeliverableEngine ? (
    <button
      type="button"
      onClick={onToggleDeliverableEngine}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[34px] shrink-0 ${
        isDeliverableEngineActive
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
          : 'bg-bg-primary border-border-default text-text-muted hover:text-text-primary hover:border-border-hover'
      }`}
      title="Autonomous Deliverable Engine: Dynamically classifies intent and injects execution directives so models deliver working code, copy, or analysis immediately without asking conversational questions."
      aria-label="Toggle Autonomous Deliverable Engine"
    >
      <Zap className="w-3.5 h-3.5 shrink-0" />
      <span className="hidden xl:inline whitespace-nowrap">Deliverable Engine</span>
      <span className="hidden md:inline xl:hidden whitespace-nowrap">Engine</span>
      <span
        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
          isDeliverableEngineActive
            ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
            : 'bg-bg-tertiary text-text-muted'
        }`}
      >
        {isDeliverableEngineActive ? 'ON' : 'RAW'}
      </span>
    </button>
  ) : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-1 bg-bg-secondary border-b border-border-default shrink-0 select-none min-w-0 max-w-full overflow-hidden min-h-[48px]">
      {/* Horizontally Scrollable Mode Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0 py-0.5">
        {tabs.map((tab) => {
          const isActive = activeMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onModeChange(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer shrink-0 min-h-[44px] ${
                isActive
                  ? 'bg-brand-primary text-white shadow-xs font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60'
              }`}
            >
              {tab.icon}
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full uppercase font-bold whitespace-nowrap hidden lg:inline ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.badgeColor || 'bg-brand-primary-light text-brand-primary'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
        {onAnalyzePrompt && (
          <button
            type="button"
            onClick={onAnalyzePrompt}
            data-tour="tour-analyzer-shortcut"
            title="Audit and score current prompt in Prompt Analyzer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60 transition-all cursor-pointer shrink-0 min-h-[44px]"
          >
            <PromptAnalyzerIcon className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span className="whitespace-nowrap hidden md:inline">Analyze</span>
          </button>
        )}
        {onSendToWork && (
          <button
            type="button"
            onClick={onSendToWork}
            title="Send prompt to Autonomous Work IDE"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60 transition-all cursor-pointer shrink-0 min-h-[44px]"
          >
            <Briefcase className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span className="whitespace-nowrap hidden lg:inline"><span className="hidden xl:inline">Build in </span>Work</span>
          </button>
        )}
        {onSwitchToOneChat && (
          <button
            type="button"
            onClick={onSwitchToOneChat}
            title="Switch to One-Chat Conversational Workspace"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer shrink-0 min-h-[44px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap hidden sm:inline">One-Chat</span>
          </button>
        )}
      </div>

      {/* Mobile Row 2 Controls (<sm) */}
      <div className="flex items-center justify-between gap-2 sm:hidden pt-1 border-t border-border-default/40 overflow-x-auto scrollbar-none">
        {modelSelectorButton(true)}
        {variablesButton}
        {deliverableEngineButton}
      </div>

      {/* Desktop Pinned Controls (>=sm) */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0 border-l border-border-default/70 pl-2 sm:pl-3 overflow-x-auto scrollbar-none max-w-full">
        {deliverableEngineButton}
        {modelSelectorButton(false)}
        {variablesButton}
      </div>
    </div>
  );
};
