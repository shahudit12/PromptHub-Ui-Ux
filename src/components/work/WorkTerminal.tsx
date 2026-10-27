import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, 
  Trash2, 
  Copy, 
  Check, 
  Play, 
  Maximize2, 
  Minimize2,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { workEventBus } from '../../services/work/workEventBus';

interface WorkTerminalProps {
  taskId?: string;
  projectId?: string;
  onRunCommand?: (command: string) => Promise<void>;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

interface LogEntry {
  id: string;
  type: 'stdout' | 'stderr' | 'command' | 'system';
  text: string;
  timestamp: string;
}

export const WorkTerminal: React.FC<WorkTerminalProps> = ({
  taskId,
  projectId,
  onRunCommand,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init_1',
      type: 'system',
      text: '[PromptHub Work Sandbox] Virtual execution terminal initialized. Isolated from host OS.\n',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputCommand, setInputCommand] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [filter, setFilter] = useState<'all' | 'stdout' | 'stderr'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time events from workEventBus
  useEffect(() => {
    const unsubscribe = workEventBus.subscribeAll((event) => {
      if (taskId && event.taskId && event.taskId !== taskId && event.taskId !== 'system') return;
      if (projectId && event.projectId && event.projectId !== projectId) return;

      if (event.eventType === 'COMMAND_STARTED') {
        setIsRunning(true);
        setLogs((prev) => [
          ...prev,
          {
            id: `cmd_${Date.now()}`,
            type: 'command',
            text: `$ ${event.payload.command || ''}\n`,
            timestamp: event.timestamp,
          },
        ]);
      } else if (event.eventType === 'COMMAND_OUTPUT') {
        const streamType = event.payload.stream === 'stderr' ? 'stderr' : 'stdout';
        setLogs((prev) => [
          ...prev,
          {
            id: `out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: streamType,
            text: event.payload.chunk || '',
            timestamp: event.timestamp,
          },
        ]);
      } else if (event.eventType === 'COMMAND_FINISHED') {
        setIsRunning(false);
        const code = event.payload.exitCode;
        setLogs((prev) => [
          ...prev,
          {
            id: `fin_${Date.now()}`,
            type: 'system',
            text: `[Process Exited with code ${code ?? 0}]\n`,
            timestamp: event.timestamp,
          },
        ]);
      }
    });

    return () => unsubscribe();
  }, [taskId, projectId]);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleClear = () => {
    setLogs([
      {
        id: `clear_${Date.now()}`,
        type: 'system',
        text: '[Terminal logs cleared]\n',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleCopyLogs = async () => {
    const raw = logs.map((l) => l.text).join('');
    await navigator.clipboard.writeText(raw);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCommand.trim() || isRunning) return;
    const cmd = inputCommand.trim();
    setInputCommand('');

    if (cmd.toLowerCase() === 'clear') {
      handleClear();
      return;
    }

    if (onRunCommand) {
      setIsRunning(true);
      try {
        await onRunCommand(cmd);
      } finally {
        setIsRunning(false);
      }
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (filter === 'all') return true;
    if (filter === 'stdout') return l.type === 'stdout' || l.type === 'command' || l.type === 'system';
    if (filter === 'stderr') return l.type === 'stderr';
    return true;
  });

  return (
    <div className={`bg-[#0D1110] border border-border-default rounded-xl flex flex-col overflow-hidden shadow-sm transition-all ${
      isExpanded ? 'h-full min-h-[360px]' : 'h-80 min-h-[280px]'
    }`}>
      {/* Terminal Title Bar */}
      <div className="bg-[#141917] border-b border-border-default/40 px-3 py-1.5 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-brand-primary" />
          <span className="text-xs font-mono font-medium text-stone-200">Terminal &amp; Sandbox Logs</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>RUNNING</span>
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {/* Filter pills */}
          <div className="flex items-center bg-[#0D1110] rounded-md p-0.5 border border-border-default/30 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`min-h-[44px] sm:min-h-0 px-2 py-0.5 rounded transition-colors flex items-center justify-center ${
                filter === 'all' ? 'bg-brand-primary text-white font-semibold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('stdout')}
              className={`min-h-[44px] sm:min-h-0 px-2 py-0.5 rounded transition-colors flex items-center justify-center ${
                filter === 'stdout' ? 'bg-brand-primary text-white font-semibold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Stdout
            </button>
            <button
              type="button"
              onClick={() => setFilter('stderr')}
              className={`min-h-[44px] sm:min-h-0 px-2 py-0.5 rounded transition-colors flex items-center justify-center ${
                filter === 'stderr' ? 'bg-brand-primary text-white font-semibold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Stderr
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyLogs}
            title="Copy all logs"
            className="min-h-[44px] min-w-[44px] sm:min-h-[26px] sm:min-w-[26px] flex items-center justify-center rounded text-stone-400 hover:text-stone-100 hover:bg-[#1C2420] transition-colors cursor-pointer"
          >
            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={handleClear}
            title="Clear logs"
            className="min-h-[44px] min-w-[44px] sm:min-h-[26px] sm:min-w-[26px] flex items-center justify-center rounded text-stone-400 hover:text-rose-400 hover:bg-[#1C2420] transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              title={isExpanded ? 'Collapse' : 'Expand'}
              className="min-h-[44px] min-w-[44px] sm:min-h-[26px] sm:min-w-[26px] flex items-center justify-center rounded text-stone-400 hover:text-stone-100 hover:bg-[#1C2420] transition-colors cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Terminal Output Area */}
      <div
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto font-mono text-[11px] leading-5 text-stone-300 selection:bg-brand-primary selection:text-white space-y-0.5"
      >
        {filteredLogs.map((log) => {
          if (log.type === 'command') {
            return (
              <div key={log.id} className="text-emerald-400 font-semibold whitespace-pre-wrap">
                {log.text}
              </div>
            );
          }
          if (log.type === 'stderr') {
            return (
              <div key={log.id} className="text-rose-400 whitespace-pre-wrap">
                {log.text}
              </div>
            );
          }
          if (log.type === 'system') {
            return (
              <div key={log.id} className="text-stone-400 italic whitespace-pre-wrap">
                {log.text}
              </div>
            );
          }
          return (
            <div key={log.id} className="text-stone-200 whitespace-pre-wrap">
              {log.text}
            </div>
          );
        })}
      </div>

      {/* Interactive Command Input */}
      {onRunCommand && (
        <form
          onSubmit={handleExecute}
          className="border-t border-border-default/40 bg-[#121614] px-3 py-1.5 flex items-center gap-2 shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5 text-brand-primary shrink-0" />
          <input
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            disabled={isRunning}
            placeholder="Run safe sandbox command (e.g. npm run build, vitest run, echo hello)..."
            className="flex-1 bg-transparent font-mono text-xs text-stone-100 placeholder:text-stone-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputCommand.trim() || isRunning}
            className="min-h-[44px] min-w-[44px] sm:min-h-[26px] sm:min-w-[26px] flex items-center justify-center rounded bg-brand-primary text-white hover:bg-brand-primary-hi disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
          </button>
        </form>
      )}
    </div>
  );
};
