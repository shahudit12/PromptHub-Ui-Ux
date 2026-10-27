/**
 * src/components/voice/VoiceAgentPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Autonomous Voice Agent Studio Panel for PromptHub Workspace.
 *
 * Implements:
 * - Real-time conversational voice intelligence powered by Deepgram STT/TTS.
 * - Entire agent loop executes strictly using the user's selected model.
 * - Direct workspace orchestration (builds apps, updates code, tracks jobs).
 * - Impeccable Craftsmanship & Taste Skill standards.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Volume2,
  Cpu,
  X,
  Minimize2,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  Terminal,
} from 'lucide-react';
import { useVoiceSession, type VoiceSessionStatus } from '../../hooks/useVoiceSession';

export interface VoiceAgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onModelChange?: (model: string) => void;
  projectId?: string;
  sessionId?: string;
}

export const VoiceAgentPanel: React.FC<VoiceAgentPanelProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onModelChange: _onModelChange,
  projectId = 'workspace_proj',
  sessionId = 'workspace_session',
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [typedInput, setTypedInput] = useState('');

  const {
    status,
    isMuted,
    audioLevel,
    interimTranscript,
    messages,
    activeJob,
    errorMessage,
    startSession,
    endSession,
    toggleMute,
    sendTextUtterance,
  } = useVoiceSession({
    selectedModel,
    projectId,
    sessionId,
    autoStart: true,
  });

  if (!isOpen) return null;

  const handleClose = () => {
    endSession();
    onClose();
  };

  const handleSendTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    sendTextUtterance(typedInput.trim());
    setTypedInput('');
  };

  const getStatusBadge = (s: VoiceSessionStatus) => {
    switch (s) {
      case 'listening':
        return {
          label: 'Listening...',
          color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500 animate-pulse',
        };
      case 'thinking':
        return {
          label: `Thinking (${selectedModel.split('/').pop()})...`,
          color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500 animate-ping',
        };
      case 'speaking':
        return {
          label: 'Speaking (Deepgram Aura)...',
          color: 'bg-brand-primary/15 text-brand-primary border-brand-primary/30',
          dot: 'bg-brand-primary animate-pulse',
        };
      case 'connecting':
        return {
          label: 'Connecting...',
          color: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
          dot: 'bg-blue-500 animate-pulse',
        };
      case 'error':
        return {
          label: 'Error',
          color: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
          dot: 'bg-rose-500',
        };
      default:
        return {
          label: 'Ready',
          color: 'bg-bg-tertiary text-text-muted border-border-default',
          dot: 'bg-text-muted',
        };
    }
  };

  const statusInfo = getStatusBadge(status);

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isMinimized
          ? 'bottom-6 right-6 w-72 rounded-2xl bg-bg-elevated/95 backdrop-blur-xl border border-border-default shadow-2xl p-3'
          : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-32px)] sm:w-[420px] max-h-[85vh] rounded-3xl bg-bg-elevated/95 backdrop-blur-2xl border border-border-default shadow-2xl flex flex-col overflow-hidden'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-border-subtle/70 bg-bg-secondary/40 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-brand-primary/15 border border-brand-primary/30 text-brand-primary shrink-0">
            <Mic className="w-4 h-4" />
            <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${statusInfo.dot}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-text-primary truncate">Voice Workspace Agent</span>
              <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-bg-tertiary text-brand-primary border border-brand-primary/20 shrink-0">
                Deepgram
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <Cpu className="w-2.5 h-2.5 text-text-muted shrink-0" />
              <span className="truncate max-w-[170px]" title={selectedModel}>
                {selectedModel.split('/').pop()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-7 h-7 min-h-[28px] rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary flex items-center justify-center transition-colors cursor-pointer"
            aria-label={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 min-h-[28px] rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close voice agent"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Minimized Quick Status Bar */}
      {isMinimized ? (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleMute}
            className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
              isMuted
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                : 'bg-bg-secondary text-text-secondary border-border-default'
            }`}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
        </div>
      ) : (
        <>
          {/* Active Job Progress Banner */}
          {activeJob && activeJob.status !== 'idle' && (
            <div className="px-3.5 py-2 bg-brand-primary/10 border-b border-brand-primary/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-text-primary truncate">
                    {activeJob.message || 'Workspace creation active...'}
                  </div>
                  <div className="text-[9.5px] font-mono text-text-muted truncate">
                    Job: {activeJob.jobId} &bull; {activeJob.progress}% complete
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-elevated border border-brand-primary/30 text-brand-primary font-bold shrink-0">
                Live
              </span>
            </div>
          )}

          {/* Error Banner with Reconnect Trigger */}
          {status === 'error' && (
            <div className="px-3.5 py-2 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="text-[11px] text-rose-600 dark:text-rose-400 truncate">
                  {errorMessage || 'Voice connection issue'}
                </span>
              </div>
              <button
                type="button"
                onClick={startSession}
                className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500 text-white hover:bg-rose-600 transition-colors shrink-0 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Visualizer & Dynamic Sound Wave */}
          <div className="p-4 flex flex-col items-center justify-center border-b border-border-subtle/50 bg-gradient-to-b from-bg-secondary/20 to-transparent">
            <div className="relative flex items-center justify-center my-2">
              {/* Pulsing Aura Rings */}
              <div
                className="absolute rounded-full transition-transform duration-100 ease-out bg-brand-primary/10"
                style={{
                  width: `${64 + audioLevel * 80}px`,
                  height: `${64 + audioLevel * 80}px`,
                }}
              />
              <div
                className="absolute rounded-full transition-transform duration-100 ease-out bg-brand-primary/20"
                style={{
                  width: `${54 + audioLevel * 50}px`,
                  height: `${54 + audioLevel * 50}px`,
                }}
              />

              <div
                className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${
                  status === 'speaking'
                    ? 'bg-brand-primary text-white shadow-brand-primary/30'
                    : status === 'thinking'
                    ? 'bg-amber-500 text-white shadow-amber-500/30'
                    : isMuted
                    ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                    : 'bg-bg-secondary border border-border-default text-brand-primary'
                }`}
              >
                {status === 'speaking' ? (
                  <Volume2 className="w-7 h-7 animate-pulse" />
                ) : status === 'thinking' ? (
                  <Sparkles className="w-7 h-7 animate-spin" />
                ) : isMuted ? (
                  <MicOff className="w-7 h-7" />
                ) : (
                  <Mic className="w-7 h-7" />
                )}
              </div>
            </div>

            {/* Status Pill */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[10.5px] font-medium px-2.5 py-0.5 rounded-full border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>

            {/* Live Interim Transcript Bubble */}
            {interimTranscript && (
              <p className="mt-2 text-xs text-text-secondary text-center italic line-clamp-2 px-4 animate-fade-in">
                &ldquo;{interimTranscript}&rdquo;
              </p>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="mt-2.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[11px] flex items-center gap-1.5 w-full">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Transcript History */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar max-h-56 min-h-[120px]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-4 text-text-muted text-xs">
                <Terminal className="w-5 h-5 mb-1.5 text-text-muted/60" />
                <p className="font-medium text-text-secondary">Speak your instruction naturally</p>
                <p className="text-[11px] mt-0.5">
                  &ldquo;Create an invoice calculator for freelancers&rdquo;
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-brand-primary text-white rounded-br-sm'
                        : 'bg-bg-secondary text-text-primary border border-border-default rounded-bl-sm'
                    }`}
                  >
                    <p>{m.spokenText || m.text}</p>
                    {m.modelUsed && m.role === 'assistant' && (
                      <div className="flex items-center gap-1 mt-1 text-[9px] text-text-muted/80">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                        <span>Powered by {m.modelUsed.split('/').pop()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Spoken Action Controls */}
          <div className="p-3 border-t border-border-subtle/70 bg-bg-secondary/40 space-y-2">
            <form onSubmit={handleSendTyped} className="flex items-center gap-1.5">
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder="Or type to voice agent..."
                className="flex-1 min-h-[36px] px-3 rounded-xl bg-bg-primary border border-border-default text-text-primary text-xs focus:outline-hidden focus:border-brand-primary transition-colors placeholder:text-text-muted/60"
              />
              <button
                type="submit"
                disabled={!typedInput.trim()}
                className="min-h-[36px] px-3 rounded-xl bg-bg-tertiary hover:bg-brand-primary hover:text-white border border-border-default text-text-secondary text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={toggleMute}
                className={`min-h-[44px] px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  isMuted
                    ? 'bg-rose-500/15 text-rose-500 border-rose-500/30 hover:bg-rose-500/25'
                    : 'bg-bg-tertiary text-text-secondary border-border-default hover:bg-bg-primary'
                }`}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isMuted ? 'Unmute' : 'Mute Mic'}</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>End Call</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
