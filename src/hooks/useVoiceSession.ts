/**
 * src/hooks/useVoiceSession.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook managing active Deepgram Voice Agent sessions for PromptHub Workspace.
 *
 * Handles:
 * - Microphone capture & streaming
 * - Interruption handling (stops audio playback on user speech)
 * - Deepgram STT transcription & Aura TTS playback
 * - Configurable model dispatching through VoiceWorkspaceAgent
 * - Background job continuity
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceWorkspaceAgent, type VoiceTurnMessage } from '../services/voice/voiceWorkspaceAgent';
import { deepgramProvider } from '../services/voice/deepgramProvider';
import { workspaceActionBridge, type WorkspaceJobStatus } from '../services/work/workspaceActionBridge';

export type VoiceSessionStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export interface UseVoiceSessionOptions {
  selectedModel: string;
  projectId?: string;
  sessionId?: string;
  autoStart?: boolean;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onSpokenTurn?: (agentReply: string, actionResult?: any) => void;
  onError?: (error: string) => void;
}

export function useVoiceSession({
  selectedModel,
  projectId = 'workspace_proj',
  sessionId = 'workspace_session',
  autoStart = false,
  onTranscript,
  onSpokenTurn,
  onError,
}: UseVoiceSessionOptions) {
  const [status, setStatus] = useState<VoiceSessionStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [messages, setMessages] = useState<VoiceTurnMessage[]>([]);
  const [activeJob, setActiveJob] = useState<WorkspaceJobStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const agentRef = useRef<VoiceWorkspaceAgent | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const activeJobIdRef = useRef<string | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize or update the Voice Workspace Agent instance with selected model
  useEffect(() => {
    if (!agentRef.current) {
      agentRef.current = new VoiceWorkspaceAgent({
        selectedModel,
        projectId,
        sessionId,
      });
    } else {
      agentRef.current.updateModel(selectedModel);
    }
  }, [selectedModel, projectId, sessionId]);

  // Track running workspace jobs
  useEffect(() => {
    let interval: any = null;
    if (activeJobIdRef.current) {
      interval = setInterval(async () => {
        if (!activeJobIdRef.current) return;
        try {
          const status = await workspaceActionBridge.getJobStatus(activeJobIdRef.current);
          setActiveJob(status);
          if (status.status === 'completed' || status.status === 'failed') {
            activeJobIdRef.current = null;
          }
        } catch {}
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeJob?.jobId]);

  /**
   * Stop any ongoing audio playback immediately (interruption handling).
   */
  const interruptPlayback = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    isSpeakingRef.current = false;
    if (status === 'speaking') {
      setStatus('listening');
    }
  }, [status]);

  /**
   * Play TTS audio response with interruption detection.
   */
  const playAgentAudio = useCallback((audioUrlOrBase64: string): Promise<void> => {
    return new Promise((resolve) => {
      interruptPlayback();
      const audioSrc =
        audioUrlOrBase64.startsWith('data:') || audioUrlOrBase64.startsWith('http') || audioUrlOrBase64.startsWith('blob:')
          ? audioUrlOrBase64
          : `data:audio/mp3;base64,${audioUrlOrBase64}`;
      const audio = new Audio(audioSrc);
      currentAudioRef.current = audio;
      isSpeakingRef.current = true;
      setStatus('speaking');

      audio.onended = () => {
        currentAudioRef.current = null;
        isSpeakingRef.current = false;
        setStatus('listening');
        resolve();
      };

      audio.onerror = () => {
        currentAudioRef.current = null;
        isSpeakingRef.current = false;
        setStatus('listening');
        resolve();
      };

      audio.play().catch(() => {
        isSpeakingRef.current = false;
        setStatus('listening');
        resolve();
      });
    });
  }, [interruptPlayback]);

  /**
   * Process a captured speech utterance through the Voice Workspace Agent.
   */
  const handleUserUtterance = useCallback(
    async (transcriptText: string) => {
      if (!transcriptText.trim() || !agentRef.current) return;

      interruptPlayback();
      setStatus('thinking');
      setInterimTranscript('');

      try {
        const turnResult = await agentRef.current.processSpokenTurn(transcriptText);

        setMessages(agentRef.current.getHistory());
        onSpokenTurn?.(turnResult.spokenText, turnResult.actionResult);

        if (turnResult.jobId) {
          activeJobIdRef.current = turnResult.jobId;
          setActiveJob({
            jobId: turnResult.jobId,
            status: 'building',
            progress: 25,
            message: 'Building in workspace...',
            filesCount: 1,
          });
        }

        const audioToPlay = turnResult.audioUrl || turnResult.audioBase64;
        if (audioToPlay) {
          await playAgentAudio(audioToPlay);
        } else {
          setStatus('listening');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err?.message || 'Failed to process voice turn.');
        onError?.(err?.message || 'Voice turn processing error.');
      }
    },
    [interruptPlayback, onSpokenTurn, onError, playAgentAudio]
  );

  /**
   * Start microphone capture and audio analysis loop.
   */
  const startSession = useCallback(async () => {
    setErrorMessage(null);
    setStatus('connecting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // Audio analysis for level metering & voice activity detection
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128);
        setAudioLevel(normalized);

        // If user starts talking loudly while agent is speaking, trigger interruption
        if (isSpeakingRef.current && normalized > 0.35) {
          interruptPlayback();
        }

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      // Configure MediaRecorder for speech segment chunks
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          audioChunksRef.current = [];
          if (audioBlob.size > 1500) {
            try {
              const res = await deepgramProvider.transcribe(audioBlob, 'en');
              if (res.transcript && res.transcript.trim()) {
                onTranscript?.(res.transcript, true);
                await handleUserUtterance(res.transcript);
              }
            } catch (err: any) {
              console.warn('[VoiceSession] Transcription chunk warning:', err?.message);
            }
          }
        }
        // Auto-restart listening if session is still alive
        if (mediaStreamRef.current && mediaStreamRef.current.active) {
          try {
            recorder.start();
          } catch {}
        }
      };

      recorder.start();
      setStatus('listening');

      // Setup utterance interval slicer
      silenceTimerRef.current = setInterval(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 4000);
    } catch (err: any) {
      console.error('[VoiceSession] Microphone error:', err);
      setStatus('error');
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow microphone access in your browser settings.'
        : `Could not access microphone: ${err.message || 'Unknown error'}`;
      setErrorMessage(msg);
      onError?.(msg);
    }
  }, [handleUserUtterance, interruptPlayback, onError, onTranscript]);

  /**
   * End the voice session: stops mic and audio playback.
   * Generation tasks in the workspace continue running independently!
   */
  const endSession = useCallback(() => {
    interruptPlayback();

    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
    }

    setStatus('idle');
    setAudioLevel(0);
    setInterimTranscript('');
  }, [interruptPlayback]);

  /**
   * Toggle microphone mute state.
   */
  const toggleMute = useCallback(() => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsMuted(!audioTracks[0]?.enabled);
    }
  }, []);

  useEffect(() => {
    if (autoStart) {
      startSession();
    }
    return () => {
      endSession();
    };
  }, [autoStart, endSession, startSession]);

  return {
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
    interruptPlayback,
    sendTextUtterance: handleUserUtterance,
  };
}
