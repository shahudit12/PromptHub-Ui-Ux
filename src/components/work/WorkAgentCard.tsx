import React from 'react';
import { 
  Bot, 
  Pause, 
  Play, 
  Square, 
  FileEdit, 
  Terminal as TerminalIcon, 
  Zap 
} from 'lucide-react';
import type { WorkAgent } from '../../types/work';

interface WorkAgentCardProps {
  agent: WorkAgent;
  onPause?: (agentId: string) => void;
  onResume?: (agentId: string) => void;
  onStop?: (agentId: string) => void;
}

const STATUS_BADGES: Record<WorkAgent['status'], { label: string; bg: string; text: string; dot: string }> = {
  idle: { label: 'Idle', bg: 'bg-bg-tertiary', text: 'text-text-muted', dot: 'bg-text-muted/60' },
  planning: { label: 'Planning', bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  working: { label: 'Working', bg: 'bg-brand-primary-light/50', text: 'text-brand-primary', dot: 'bg-brand-primary' },
  waiting: { label: 'Waiting', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  testing: { label: 'Testing', bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500' },
  reviewing: { label: 'Reviewing', bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  blocked: { label: 'Blocked', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
  completed: { label: 'Completed', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  failed: { label: 'Failed', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
  paused: { label: 'Paused', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
};

export const WorkAgentCard: React.FC<WorkAgentCardProps> = ({
  agent,
  onPause,
  onResume,
  onStop,
}) => {
  const badge = STATUS_BADGES[agent.status] || STATUS_BADGES.idle;
  const isWorking = agent.status === 'working' || agent.status === 'planning' || agent.status === 'testing' || agent.status === 'reviewing';

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-3.5 sm:p-4 shadow-2xs hover:border-border-hover transition-all">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-bg-tertiary border border-border-subtle flex items-center justify-center text-text-secondary shrink-0">
            <Bot className="w-4 h-4 text-brand-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-text-primary truncate">{agent.name}</h3>
            <p className="text-[11px] text-text-muted font-mono">{agent.role}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1.5 shrink-0 ${badge.bg} ${badge.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} ${isWorking ? 'opacity-90' : ''}`} />
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Current Action */}
      <div className="text-[11px] text-text-secondary bg-bg-primary px-2.5 py-1.5 rounded-lg border border-border-subtle/80 mb-3 truncate font-mono">
        {agent.currentAction || 'Awaiting instructions...'}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-border-subtle/70 text-[10px] font-mono text-text-muted mb-3">
        <div className="flex items-center gap-1">
          <FileEdit className="w-3 h-3 text-text-muted shrink-0" />
          <span>{agent.filesChangedCount} files</span>
        </div>
        <div className="flex items-center gap-1">
          <TerminalIcon className="w-3 h-3 text-text-muted shrink-0" />
          <span>{agent.commandsRunCount} cmds</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-text-muted shrink-0" />
          <span>{agent.tokensUsed} tok</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-text-muted truncate max-w-[120px]" title={agent.model}>
          {agent.model.split('/').pop()}
        </span>

        <div className="flex items-center gap-1">
          {agent.status === 'paused' ? (
            <button
              type="button"
              onClick={() => onResume?.(agent.id)}
              title="Resume Agent"
              className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center rounded-md border border-border-default hover:bg-bg-tertiary text-emerald-600 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
            </button>
          ) : isWorking ? (
            <button
              type="button"
              onClick={() => onPause?.(agent.id)}
              title="Pause Agent"
              className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center rounded-md border border-border-default hover:bg-bg-tertiary text-amber-600 transition-colors cursor-pointer"
            >
              <Pause className="w-3 h-3 fill-current" />
            </button>
          ) : null}

          {isWorking && (
            <button
              type="button"
              onClick={() => onStop?.(agent.id)}
              title="Stop Agent"
              className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center rounded-md border border-border-default hover:bg-bg-tertiary text-rose-600 transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
