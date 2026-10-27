/**
 * src/hooks/useYunoVoiceSession.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * React Hook managing Yuno Voice Assistant session lifecycle and state.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  DeepgramVoiceAgentClient,
  type YunoVoiceAgentStatus,
} from '../services/voice/deepgramVoiceAgentClient';
import type { StructuredProjectBrief } from '../services/voice/yunoBriefCompiler';
import { workspaceActionBridge, type WorkspaceJobStatus } from '../services/work/workspaceActionBridge';
import { voiceUsageService, type VoiceQuotaState } from '../services/voice/voiceUsageService';

export interface YunoVoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface UseYunoVoiceSessionProps {
  selectedModel: string;
  projectId?: string;
  sessionId?: string;
  userId?: string;
  autoStart?: boolean;
}

export function useYunoVoiceSession({
  selectedModel,
  projectId = 'workspace_proj',
  sessionId = 'session_default',
  userId = 'anonymous_user',
  autoStart = false,
}: UseYunoVoiceSessionProps) {
  const [status, setStatus] = useState<YunoVoiceAgentStatus>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [messages, setMessages] = useState<YunoVoiceMessage[]>([]);
  const [currentBrief, setCurrentBrief] = useState<StructuredProjectBrief | null>(null);
  const [activeJob, setActiveJob] = useState<WorkspaceJobStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [quotaState, setQuotaState] = useState<VoiceQuotaState>(() => voiceUsageService.getQuotaState(userId));

  const clientRef = useRef<DeepgramVoiceAgentClient | null>(null);
  const autoStartedRef = useRef(false);

  // Keep latest props in refs to give startSession a stable reference and avoid teardown cascades
  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // Periodically refresh quota state while in session
  useEffect(() => {
    const timer = setInterval(() => {
      setQuotaState(voiceUsageService.getQuotaState(userIdRef.current));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync brief updates from workspace bridge
  useEffect(() => {
    const unsub = workspaceActionBridge.onBriefUpdated((brief) => {
      setCurrentBrief(brief);
    });
    return unsub;
  }, []);

  // Update model dynamically if selectedModel changes without tearing down voice session
  useEffect(() => {
    if (clientRef.current && selectedModel) {
      clientRef.current.updateModel(selectedModel);
    }
  }, [selectedModel]);

  // Track initial mount for sessionId to avoid wiping greeting on initial mount
  const prevSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevSessionIdRef.current && prevSessionIdRef.current !== sessionId) {
      setMessages([]);
      setCurrentBrief(null);
      setErrorMessage(null);
    }
    prevSessionIdRef.current = sessionId;
  }, [sessionId]);

  const startSession = useCallback(async () => {
    setErrorMessage(null);

    // If client is already active and running, avoid tearing down and re-greeting
    if (clientRef.current) {
      const existingStatus = clientRef.current.getStatus();
      if (existingStatus === 'listening' || existingStatus === 'speaking' || existingStatus === 'thinking') {
        return;
      }
      clientRef.current.stop(true);
    }

    // Check quota before initiating
    const currentQuota = voiceUsageService.getQuotaState(userIdRef.current);
    setQuotaState(currentQuota);
    if (currentQuota.isLimitReached) {
      setStatus('limit_reached');
      setErrorMessage('Daily voice limit reached (30 min/day). Reset at midnight UTC.');
      return;
    }

    const client = new DeepgramVoiceAgentClient(
      {
        selectedModel: selectedModelRef.current,
        projectId: projectIdRef.current,
        sessionId: sessionIdRef.current,
        userId: userIdRef.current,
      },
      {
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
        },
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },
        onTranscript: (role, text) => {
          setMessages((prev) => {
            // Deduplicate immediately adjacent identical messages
            const last = prev[prev.length - 1];
            if (last && last.role === role && last.text.trim().toLowerCase() === text.trim().toLowerCase()) {
              return prev;
            }
            return [
              ...prev,
              {
                id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                role,
                text,
                timestamp: Date.now(),
              },
            ];
          });
        },
        onBriefUpdated: (brief) => {
          setCurrentBrief(brief);
        },
        onError: (err) => {
          setErrorMessage(err);
        },
      }
    );

    clientRef.current = client;
    setCurrentBrief(client.getBrief());
    await client.start();
  }, []);

  const endSession = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stop();
      clientRef.current = null;
    }
    setStatus('disconnected');
    setAudioLevel(0);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      clientRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const toggleBrief = useCallback(() => {
    setIsBriefOpen((prev) => !prev);
  }, []);

  const submitCurrentBrief = useCallback(async () => {
    if (!currentBrief?.masterPrompt) return;
    setStatus('thinking');
    try {
      const res = await workspaceActionBridge.submitMasterPrompt(
        currentBrief.masterPrompt,
        currentBrief.deliverableType,
        selectedModelRef.current,
        `req_manual_${Date.now()}`
      );
      setActiveJob({
        jobId: res.jobId,
        status: 'building',
        progress: 35,
        message: 'Building deliverable in workspace...',
        filesCount: 1,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit brief.');
    } finally {
      setStatus('listening');
    }
  }, [currentBrief]);

  const copyMasterPrompt = useCallback(() => {
    if (currentBrief?.masterPrompt) {
      navigator.clipboard.writeText(currentBrief.masterPrompt);
      return true;
    }
    return false;
  }, [currentBrief]);

  const sendTextTurn = useCallback(async (text: string) => {
    if (!text.trim() || !clientRef.current) return;
    await clientRef.current.processTextTurn(text.trim());
  }, []);

  // Single autostart trigger on mount
  useEffect(() => {
    if (autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true;
      startSession();
    }
  }, [autoStart, startSession]);

  // Teardown strictly on unmount, page hide, or tab close
  useEffect(() => {
    const handleUnload = () => {
      clientRef.current?.stop();
      clientRef.current = null;
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      clientRef.current?.stop();
      clientRef.current = null;
    };
  }, []);

  return {
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
  };
}
