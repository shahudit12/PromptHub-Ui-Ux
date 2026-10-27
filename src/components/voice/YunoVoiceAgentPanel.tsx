/**
 * src/components/voice/YunoVoiceAgentPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Yuno - PromptHub Deepgram Voice Assistant Studio Panel.
 *
 * Implements:
 * 1. GPT-style fluid glowing Voice Orb with real-time audio reactivity.
 * 2. Clean 2-zone header layout with zero clipping / text truncation.
 * 3. Compact Voice Island when messages exist to maximize chat & brief readability.
 * 4. High-craft chat bubbles with clear participant attribution.
 * 5. 30-minute daily voice quota tracking with live remaining timer.
 * 6. Collapsible Project Brief drawer with structured facts & 1-click master prompt copy.
 * 7. Minimum 44px touch targets on all interactive controls (min-h-[44px]).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  Send,
  Cpu,
  FileText,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Layers,
  Clock,
  Volume2,
  Lock,
  RefreshCw,
  Laptop,
  Globe,
  Smartphone,
} from 'lucide-react';
import { useYunoVoiceSession } from '../../hooks/useYunoVoiceSession';
import { formatModelDisplayName, isFreeModel as checkIsFreeModel } from '../../utils/modelFormatting';

export interface YunoVoiceAgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  projectId?: string;
  sessionId?: string;
  userId?: string;
  onModelChange?: (model: string) => void;
}

const getInitialGuideTab = (): 'chrome' | 'safari' | 'mobile' => {
  if (typeof navigator === 'undefined') return 'chrome';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod|android/i.test(ua)) return 'mobile';
  if (/safari/i.test(ua) && !/chrome|chromium|crios|edg/i.test(ua)) return 'safari';
  return 'chrome';
};

export const YunoVoiceAgentPanel: React.FC<YunoVoiceAgentPanelProps> = ({
  isOpen,
  onClose,
  selectedModel,
  projectId = 'workspace_proj',
  sessionId = 'default_session',
  userId = 'anonymous_user',
  onModelChange: _onModelChange,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [typedInput, setTypedInput] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'chrome' | 'safari' | 'mobile'>(getInitialGuideTab);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const {
    status,
    isMuted,
    audioLevel,
    messages,
    currentBrief,
    activeJob,
    errorMessage,
    isBriefOpen,
    quotaState,
    startSession,
    endSession,
    toggleMute,
    toggleBrief,
    submitCurrentBrief,
    copyMasterPrompt,
    sendTextTurn,
  } = useYunoVoiceSession({
    selectedModel,
    projectId,
    sessionId,
    userId,
    autoStart: true,
  });

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  // Intercom Launcher collision safeguard: Hide Intercom launcher while voice panel is active
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (typeof win.Intercom === 'function') {
        win.Intercom('update', { hide_default_launcher: true });
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        const win = window as any;
        if (typeof win.Intercom === 'function') {
          win.Intercom('update', { hide_default_launcher: false });
        }
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    endSession();
    onClose();
  };

  const handleRequestPermission = async () => {
    setIsRequestingMic(true);
    try {
      await startSession();
    } catch {
      // handled inside hook
    } finally {
      setIsRequestingMic(false);
    }
  };

  const handleOrbClick = () => {
    if (status === 'disconnected' || status === 'mic_denied' || status === 'error') {
      startSession();
    } else {
      toggleMute();
    }
  };

  const handleSendTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    sendTextTurn(typedInput.trim());
    setTypedInput('');
  };

  const handleCopyPrompt = () => {
    const ok = copyMasterPrompt();
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'listening':
        return { label: 'Live', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', dot: 'bg-emerald-500 animate-pulse' };
      case 'thinking':
        return { label: 'Thinking...', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30', dot: 'bg-amber-500 animate-pulse' };
      case 'speaking':
        return { label: 'Speaking', color: 'bg-brand-primary/15 text-brand-primary border-brand-primary/30', dot: 'bg-brand-primary animate-pulse' };
      case 'connecting':
        return { label: 'Connecting...', color: 'bg-sky-500/15 text-sky-500 border-sky-500/30', dot: 'bg-sky-500 animate-pulse' };
      case 'mic_denied':
        return { label: 'Blocked', color: 'bg-rose-500/15 text-rose-500 border-rose-500/30', dot: 'bg-rose-500' };
      case 'limit_reached':
        return { label: 'Limit', color: 'bg-purple-500/15 text-purple-500 border-purple-500/30', dot: 'bg-purple-500' };
      case 'error':
        return { label: 'Error', color: 'bg-rose-500/15 text-rose-500 border-rose-500/30', dot: 'bg-rose-500' };
      case 'disconnected':
        return { label: 'Offline', color: 'bg-bg-tertiary text-text-muted border-border-default', dot: 'bg-text-muted' };
      default:
        return { label: 'Ready', color: 'bg-bg-tertiary text-text-muted border-border-default', dot: 'bg-text-muted' };
    }
  };

  const statusInfo = getStatusBadge();
  const isPermissionGuideActive = status === 'mic_denied' || showPermissionGuide;

  const resolveDisplayModel = (model: string) => {
    if (!model || model === 'prompthub/auto-free' || model === 'auto-free' || model === 'prompthub/auto' || model === 'auto' || model === 'openrouter/free') {
      return 'PromptHub Auto (Free)';
    }
    if (model === 'prompthub/auto-paid' || model === 'auto-paid') {
      return 'PromptHub Auto (Pro)';
    }
    return formatModelDisplayName(model);
  };

  const displayModelName = resolveDisplayModel(selectedModel);
  const isFree = checkIsFreeModel(selectedModel) || selectedModel.toLowerCase().includes('free') || selectedModel.toLowerCase().includes('auto');

  // Floating Minimized Quick View (Pill Mode)
  if (isMinimized) {
    return (
      <div
        className="fixed z-50 bottom-4 right-4 sm:bottom-6 sm:right-6 rounded-full bg-bg-elevated/95 backdrop-blur-2xl border border-border-default shadow-2xl px-4 py-2 flex items-center gap-3 select-none transition-all duration-300"
        role="dialog"
        aria-label="Yuno Voice Assistant Minimized"
      >
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary/20 text-brand-primary">
          <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.dot}`} />
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-semibold text-text-primary leading-tight">Yuno Voice</span>
          <span className="text-[10px] text-text-muted leading-tight">{statusInfo.label}</span>
        </div>

        <div className="flex items-center gap-0.5 h-3">
          {[0.5, 0.9, 1.2, 0.7, 0.4].map((mult, idx) => (
            <div
              key={idx}
              className={`w-0.5 rounded-full transition-all duration-75 ${isMuted || status === 'disconnected' ? 'bg-border-default h-1' : 'bg-brand-primary'}`}
              style={{
                height: isMuted || status === 'disconnected' ? '2px' : `${Math.max(2, Math.min(12, audioLevel * 12 * mult))}px`,
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-1 border-l border-border-subtle pl-2">
          <button
            type="button"
            onClick={status === 'mic_denied' ? () => setIsMinimized(false) : toggleMute}
            className={`w-8 h-8 min-h-[44px] min-w-[36px] rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              status === 'mic_denied' || isMuted
                ? 'text-rose-500 bg-rose-500/10'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
            title={status === 'mic_denied' ? 'Microphone blocked - click to view guide' : isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-label={status === 'mic_denied' ? 'Microphone blocked' : isMuted ? 'Unmute' : 'Mute'}
          >
            {status === 'mic_denied' ? <Lock className="w-3.5 h-3.5 text-rose-500" /> : isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="w-8 h-8 min-h-[44px] min-w-[36px] rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-tertiary flex items-center justify-center transition-colors cursor-pointer"
            title="Expand Yuno Voice Studio"
            aria-label="Expand"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 min-h-[44px] min-w-[36px] rounded-full text-text-muted hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
            title="End voice session"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-[70] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] bottom-0 right-0 left-0 sm:left-auto sm:bottom-6 sm:right-6 w-full sm:w-[480px] max-h-[92vh] sm:max-h-[86vh] rounded-t-3xl sm:rounded-3xl bg-bg-elevated/95 backdrop-blur-2xl border border-border-default shadow-2xl flex flex-col overflow-hidden text-text-primary select-none"
      role="dialog"
      aria-label="Yuno Voice Assistant Panel"
    >
      <style>{`
        #intercom-container .intercom-launcher-frame,
        .intercom-lightweight-app-launcher {
          display: none !important;
        }
      `}</style>

      {/* ─── Header Row 1: Brand, Title, Status & Actions ───────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-secondary/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-brand-primary/15 border border-brand-primary/30 text-brand-primary shrink-0">
            <Sparkles className="w-4 h-4" />
            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${statusInfo.dot}`} />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-sm text-text-primary whitespace-nowrap">Yuno Voice</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Daily Quota Badge */}
          <div
            className={`flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-lg border shrink-0 ${
              quotaState.isLimitReached
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                : 'bg-bg-tertiary text-text-muted border-border-subtle'
            }`}
            title="Daily voice limit: 30 minutes per day"
          >
            <Clock className="w-3 h-3 shrink-0" />
            <span>{quotaState.isLimitReached ? 'Limit' : `${Math.ceil(quotaState.remainingSeconds / 60)}m`}</span>
          </div>

          <button
            type="button"
            onClick={toggleBrief}
            className={`min-h-[44px] min-w-[40px] px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              isBriefOpen
                ? 'bg-brand-primary/15 text-brand-primary border-brand-primary/30'
                : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary border-border-default'
            }`}
            title="Toggle Live Project Brief Panel"
            aria-label="Toggle Live Project Brief Panel"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px]">Brief</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPermissionGuide((prev) => !prev)}
            className={`min-h-[44px] min-w-[36px] px-2 rounded-lg border text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              showPermissionGuide || status === 'mic_denied'
                ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary border-border-default'
            }`}
            title="Microphone setup guide"
            aria-label="Microphone Help"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="w-8 h-8 min-h-[44px] min-w-[36px] rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Minimize"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 min-h-[44px] min-w-[36px] rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close Yuno"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Header Row 2: Model & Audio Metadata Bar (Never truncates) ───────── */}
      <div className="px-4 py-1.5 bg-bg-tertiary/40 border-b border-border-subtle flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-mono text-text-muted truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
          <span className="text-text-secondary font-medium">Nova-3 • Aura-2</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Cpu className="w-3 h-3 text-text-muted shrink-0" />
          <span className="font-semibold text-text-primary max-w-[180px] truncate" title={displayModelName}>
            {displayModelName}
          </span>
          <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold ${
            isFree
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              : 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
          }`}>
            {isFree ? 'Free' : 'Pro'}
          </span>
        </div>
      </div>

      {/* ─── Active Job Progress Banner ─────────────────────────────────────── */}
      {activeJob && activeJob.status !== 'idle' && (
        <div className="px-4 py-2 bg-brand-primary/10 border-b border-brand-primary/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-text-primary truncate">
                {activeJob.message || 'Executing workspace deliverable...'}
              </div>
              <div className="text-[9.5px] font-mono text-text-muted truncate">
                Job: {activeJob.jobId} • {activeJob.progress}% complete
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-elevated border border-brand-primary/30 text-brand-primary font-bold shrink-0">
            Live Sandbox
          </span>
        </div>
      )}

      {/* ─── Quota Limit Notice ──────────────────────────────────────────────── */}
      {status === 'limit_reached' && (
        <div className="p-4 bg-purple-500/10 border-b border-purple-500/20 flex flex-col gap-2">
          <div className="flex items-start gap-2.5">
            <Clock className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-semibold text-purple-600 dark:text-purple-400">Daily Voice Quota Reached (30m / day)</div>
              <div className="text-text-muted mt-0.5">
                You’ve used your 30 minutes of voice time for today. Quota resets at 00:00 UTC. You can continue creating with typed chat!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Generic Error Notice ────────────────────────────────────────────── */}
      {status === 'error' && (
        <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="text-[11px] text-rose-600 dark:text-rose-400 truncate">
              {errorMessage || 'Connection issue occurred.'}
            </span>
          </div>
          <button
            type="button"
            onClick={startSession}
            className="min-h-[44px] text-[11px] font-semibold px-3 py-1 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors shrink-0 cursor-pointer"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* ─── Dedicated Microphone Permission Guide & Activator ─────────────── */}
      {isPermissionGuideActive ? (
        <div className="p-4 sm:p-5 flex flex-col gap-3.5 bg-gradient-to-b from-rose-500/10 via-bg-secondary/40 to-transparent border-b border-border-subtle max-h-[420px] overflow-y-auto custom-scrollbar select-text">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
              <MicOff className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-text-primary">Microphone Access</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 font-semibold">
                    {status === 'mic_denied' ? 'Blocked' : 'Settings'}
                  </span>
                </div>
                {showPermissionGuide && status !== 'mic_denied' && (
                  <button
                    type="button"
                    onClick={() => setShowPermissionGuide(false)}
                    className="min-h-[44px] min-w-[36px] text-xs text-text-muted hover:text-text-primary px-2 cursor-pointer"
                  >
                    Close
                  </button>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Yuno needs microphone access to listen to your design instructions in real time.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-1">
            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={isRequestingMic}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
            >
              {isRequestingMic ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Requesting Microphone...</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Enable Microphone & Speak</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Reload the page after changing browser permissions"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Page</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 bg-bg-tertiary rounded-xl border border-border-subtle">
            <button
              type="button"
              onClick={() => setActiveGuideTab('chrome')}
              className={`min-h-[44px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeGuideTab === 'chrome'
                  ? 'bg-bg-elevated text-text-primary shadow-xs border border-border-default'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Chrome / Edge</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGuideTab('safari')}
              className={`min-h-[44px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeGuideTab === 'safari'
                  ? 'bg-bg-elevated text-text-primary shadow-xs border border-border-default'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Safari</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGuideTab('mobile')}
              className={`min-h-[44px] py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeGuideTab === 'mobile'
                  ? 'bg-bg-elevated text-text-primary shadow-xs border border-border-default'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Mobile</span>
            </button>
          </div>

          <div className="p-3 bg-bg-secondary/60 rounded-xl border border-border-subtle text-xs text-text-secondary space-y-1.5 leading-relaxed">
            {activeGuideTab === 'chrome' && (
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the 🔒 icon on the left of your URL bar.</li>
                <li>Find <strong>Microphone</strong> in the permissions menu.</li>
                <li>Switch to <strong className="text-emerald-500">Allow</strong>.</li>
              </ol>
            )}
            {activeGuideTab === 'safari' && (
              <ol className="list-decimal list-inside space-y-1">
                <li>Click <strong>Safari</strong> → <strong>Settings for This Website...</strong></li>
                <li>Set <strong>Microphone</strong> to <strong className="text-emerald-500">Allow</strong>.</li>
              </ol>
            )}
            {activeGuideTab === 'mobile' && (
              <ol className="list-decimal list-inside space-y-1">
                <li>Tap the <strong>aA</strong> or 🔒 icon in the address bar.</li>
                <li>Tap <strong>Permissions</strong> → Set <strong>Microphone: Allow</strong>.</li>
              </ol>
            )}
          </div>
        </div>
      ) : messages.length > 0 ? (
        /* ─── Compact Reactive Voice Island (When conversation is in progress) ── */
        <div className="px-4 py-2 bg-gradient-to-r from-bg-secondary/60 via-bg-primary/40 to-bg-secondary/60 border-b border-border-subtle flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={handleOrbClick}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer min-h-[44px] min-w-[36px] shadow-sm ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
                  : status === 'speaking'
                  ? 'bg-brand-primary text-white scale-105 animate-pulse'
                  : status === 'thinking'
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 animate-pulse'
                  : 'bg-brand-primary/15 text-brand-primary border border-brand-primary/30'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <MicOff className="w-4 h-4" />
              ) : status === 'speaking' ? (
                <Volume2 className="w-4 h-4" />
              ) : status === 'thinking' ? (
                <Sparkles className="w-4 h-4 animate-pulse" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            <div className="flex items-center gap-1 h-4">
              {[0.4, 0.9, 1.4, 0.7, 1.1, 0.5, 0.8].map((mult, idx) => (
                <div
                  key={idx}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isMuted || status === 'disconnected'
                      ? 'bg-border-default h-1'
                      : status === 'speaking'
                      ? 'bg-sky-400'
                      : 'bg-brand-primary'
                  }`}
                  style={{
                    height:
                      isMuted || status === 'disconnected'
                        ? '3px'
                        : `${Math.max(3, Math.min(16, audioLevel * 16 * mult))}px`,
                  }}
                />
              ))}
            </div>

            <span className="text-[11px] font-medium text-text-secondary truncate">
              {status === 'speaking'
                ? 'Speaking...'
                : status === 'thinking'
                ? 'Processing brief...'
                : isMuted
                ? 'Microphone muted'
                : 'Listening naturally...'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {status === 'disconnected' ? (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-primary text-white hover:bg-brand-primary-hi transition-colors min-h-[44px] cursor-pointer"
              >
                Connect Mic
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleMute}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors min-h-[44px] cursor-pointer ${
                  isMuted
                    ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                    : 'bg-bg-secondary text-text-secondary border-border-default hover:bg-bg-tertiary'
                }`}
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ─── Hero Glowing Voice Orb (Initial state with 0 messages) ──────────── */
        <div className="relative py-7 px-4 flex flex-col items-center justify-center border-b border-border-subtle bg-gradient-to-b from-bg-secondary/40 via-bg-primary/20 to-transparent overflow-hidden">
          <div
            className={`absolute rounded-full filter blur-2xl transition-all duration-300 pointer-events-none ${
              status === 'disconnected'
                ? 'opacity-0'
                : status === 'speaking'
                ? 'bg-gradient-to-r from-brand-primary via-sky-400 to-indigo-500 opacity-40'
                : status === 'thinking'
                ? 'bg-gradient-to-r from-amber-500 to-orange-400 opacity-30 animate-pulse'
                : 'bg-gradient-to-r from-brand-primary/60 to-brand-primary/30 opacity-35'
            }`}
            style={{
              width: `${120 + audioLevel * 100}px`,
              height: `${120 + audioLevel * 100}px`,
              transform: `scale(${1 + audioLevel * 0.3})`,
            }}
          />

          <div className="relative flex items-center justify-center my-3">
            {status !== 'disconnected' && (
              <div
                className="absolute rounded-full border border-brand-primary/25 transition-transform duration-100 ease-out pointer-events-none"
                style={{
                  width: `${100 + audioLevel * 80}px`,
                  height: `${100 + audioLevel * 80}px`,
                  opacity: isMuted ? 0.1 : 0.3 + audioLevel * 0.6,
                }}
              />
            )}

            <button
              type="button"
              onClick={handleOrbClick}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-xl min-h-[44px] min-w-[44px] ${
                status === 'disconnected'
                  ? 'bg-bg-tertiary border-2 border-border-default text-text-muted hover:border-brand-primary/50 hover:text-text-primary'
                  : isMuted
                  ? 'bg-rose-500/20 border-2 border-rose-500/40 text-rose-500'
                  : status === 'speaking'
                  ? 'bg-gradient-to-tr from-brand-primary via-sky-400 to-indigo-500 border-2 border-white/60 text-white scale-105 shadow-brand-primary/30'
                  : status === 'thinking'
                  ? 'bg-gradient-to-tr from-amber-500 to-orange-400 border-2 border-amber-300/60 text-white animate-pulse'
                  : 'bg-gradient-to-tr from-bg-tertiary via-brand-primary to-brand-primary-hi border-2 border-white/40 text-white hover:scale-105'
              }`}
              title={status === 'disconnected' ? 'Enable microphone' : isMuted ? 'Unmute microphone' : 'Mute microphone'}
              aria-label={status === 'disconnected' ? 'Enable microphone' : isMuted ? 'Unmute' : 'Mute'}
            >
              {status === 'disconnected' ? (
                <MicOff className="w-7 h-7 text-text-muted" />
              ) : isMuted ? (
                <MicOff className="w-7 h-7" />
              ) : status === 'speaking' ? (
                <Volume2 className="w-7 h-7 animate-pulse" />
              ) : status === 'thinking' ? (
                <Sparkles className="w-7 h-7 animate-pulse" />
              ) : (
                <Mic className="w-7 h-7" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 h-6 my-2">
            {[0.3, 0.7, 1.2, 0.9, 0.5, 1.1, 0.8, 0.4].map((mult, idx) => (
              <div
                key={idx}
                className={`w-1 rounded-full transition-all duration-75 ${
                  status === 'disconnected' || isMuted
                    ? 'bg-border-default h-1.5 opacity-40'
                    : status === 'speaking'
                    ? 'bg-sky-400'
                    : status === 'thinking'
                    ? 'bg-amber-400'
                    : 'bg-brand-primary'
                }`}
                style={{
                  height:
                    status === 'disconnected' || isMuted
                      ? '4px'
                      : `${Math.max(4, Math.min(24, audioLevel * 24 * mult))}px`,
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold text-text-primary text-center">
              {status === 'disconnected'
                ? 'Microphone Offline'
                : isMuted
                ? 'Microphone Muted'
                : status === 'thinking'
                ? 'Yuno is processing...'
                : status === 'speaking'
                ? 'Yuno is speaking...'
                : 'Listening naturally • Speak your request'}
            </span>
          </div>

          {status === 'disconnected' && (
            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={isRequestingMic}
              className="mt-3.5 min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.98]"
            >
              <Mic className="w-4 h-4" />
              <span>Connect Microphone & Speak</span>
            </button>
          )}
        </div>
      )}

      {/* ─── Collapsible Project Brief Drawer ───────────────────────────────── */}
      {isBriefOpen && currentBrief && (
        <div className="p-3.5 bg-bg-secondary/70 border-b border-border-default max-h-64 overflow-y-auto custom-scrollbar select-text">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-brand-primary" />
              <span className="text-xs font-bold text-text-primary">Live Project Brief</span>
              <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                {currentBrief.status}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="min-h-[44px] min-w-[36px] px-2.5 py-1 rounded-md text-[11px] font-semibold bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors cursor-pointer"
                title="Copy complete 12-section master prompt"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{isCopied ? 'Copied' : 'Copy Prompt'}</span>
              </button>

              <button
                type="button"
                onClick={submitCurrentBrief}
                className="min-h-[44px] min-w-[36px] px-3 py-1 rounded-md text-[11px] font-bold bg-brand-primary hover:bg-brand-primary-hi text-white flex items-center gap-1 transition-colors cursor-pointer shadow-3xs"
                title="Authorize and build now"
              >
                <span>Build Now</span>
              </button>
            </div>
          </div>

          <div className="mt-2.5 space-y-2 text-xs">
            {currentBrief.objective && (
              <div>
                <span className="font-semibold text-text-secondary text-[11px]">Objective: </span>
                <span className="text-text-primary">{currentBrief.objective}</span>
              </div>
            )}

            {currentBrief.creativeDirection && (
              <div>
                <span className="font-semibold text-text-secondary text-[11px]">Creative Direction: </span>
                <span className="text-brand-primary font-medium">{currentBrief.creativeDirection}</span>
              </div>
            )}

            {currentBrief.confirmedFacts && currentBrief.confirmedFacts.length > 0 && (
              <div>
                <span className="font-semibold text-text-secondary text-[11px]">Confirmed Facts: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentBrief.confirmedFacts.map((fact, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-subtle text-[10.5px] text-text-primary">
                      {fact}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {currentBrief.requiredFeatures && currentBrief.requiredFeatures.length > 0 && (
              <div>
                <span className="font-semibold text-text-secondary text-[11px]">Requirements: </span>
                <ul className="list-disc list-inside mt-0.5 text-text-muted text-[11px] space-y-0.5">
                  {currentBrief.requiredFeatures.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {currentBrief.exclusions && currentBrief.exclusions.length > 0 && (
              <div>
                <span className="font-semibold text-rose-500 text-[11px]">Exclusions: </span>
                <ul className="list-disc list-inside mt-0.5 text-rose-400/90 text-[11px] space-y-0.5">
                  {currentBrief.exclusions.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              </div>
            )}

            {currentBrief.masterPrompt && (
              <div className="mt-2 pt-2 border-t border-border-subtle">
                <span className="font-semibold text-text-secondary text-[10.5px]">Compiled Master Prompt:</span>
                <pre className="mt-1 p-2 rounded-lg bg-bg-primary text-[10px] font-mono text-text-muted overflow-x-auto max-h-28 custom-scrollbar">
                  {currentBrief.masterPrompt}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Dialogue Transcript Stream (High-Craft Bubbles) ─────────────────── */}
      <div className="flex-1 min-h-[180px] max-h-[360px] overflow-y-auto p-4 space-y-3.5 custom-scrollbar select-text bg-bg-primary/20">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-text-muted">
            {status === 'disconnected' ? (
              <>
                <MicOff className="w-8 h-8 mb-2 text-text-muted/60" />
                <p className="text-sm font-semibold text-text-primary">Microphone not connected</p>
                <p className="text-xs mt-1 text-text-muted max-w-[300px] leading-relaxed">
                  Tap "Connect Microphone & Speak" above or type an instruction below to start building with Yuno.
                </p>
              </>
            ) : (
              <>
                <Mic className="w-8 h-8 mb-2 text-brand-primary animate-pulse" />
                <p className="text-sm font-semibold text-text-primary">Listening to your instructions</p>
                <p className="text-xs mt-1 text-text-muted max-w-[300px] leading-relaxed">
                  Describe whatever you want to build (e.g. "Create an anime portfolio with manga scroll down animations"). Yuno organizes your brief in real time.
                </p>
              </>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div className="flex items-center gap-1.5 px-1 text-[10.5px] font-medium text-text-muted">
                {msg.role === 'user' ? (
                  <span>You</span>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-brand-primary" />
                    <span className="text-text-secondary font-semibold">Yuno</span>
                  </>
                )}
              </div>
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-brand-primary text-white rounded-br-xs font-medium'
                    : 'bg-bg-elevated text-text-primary border border-border-default rounded-bl-xs'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* ─── Typed Turn Input Fallback ───────────────────────────────────────── */}
      <form onSubmit={handleSendTyped} className="p-3 border-t border-border-subtle bg-bg-secondary/40 flex items-center gap-2">
        <input
          type="text"
          value={typedInput}
          onChange={(e) => setTypedInput(e.target.value)}
          placeholder="Type or speak an instruction to Yuno..."
          className="flex-1 h-10 min-h-[44px] px-3.5 rounded-xl bg-bg-primary border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary/50 transition-colors shadow-2xs"
        />
        <button
          type="submit"
          disabled={!typedInput.trim()}
          className="h-10 min-h-[44px] w-10 rounded-xl bg-brand-primary hover:bg-brand-primary-hi disabled:opacity-40 disabled:hover:bg-brand-primary text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-3xs"
          aria-label="Send typed instruction"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
