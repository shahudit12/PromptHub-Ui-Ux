/**
 * src/components/voice/VoicePromptModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Multilingual Voice Dictation Modal for Prompt Creation & Studio Workflows.
 *
 * Supported Providers:
 * - Sarvam AI (Saaras Indic Model): Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, etc.
 * - Deepgram (Nova-3 Global Model): High-accuracy English & Global transcription.
 * - Web Speech API: Zero-latency offline client fallback.
 *
 * Adheres strictly to PromptHub Design Guidelines:
 * - Primary Forest Green (#315C4A), Mint Mist (#E3ECE7), Emerald (#529E7C), Obsidian (#0E110F).
 * - Touch targets >= 44px.
 * - Smooth quartic micro-interactions.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Square, Check, X, Globe, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { ALL_SUPPORTED_LANGUAGES, type VoiceLanguage } from '../../services/voice/types';
import { VoiceGateway } from '../../services/voice/voiceGateway';
import { browserSpeechProvider, type LiveSpeechSession } from '../../services/voice/browserSpeechProvider';

interface VoicePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptReady: (transcript: string) => void;
  initialLanguage?: string;
}

export const VoicePromptModal: React.FC<VoicePromptModalProps> = ({
  isOpen,
  onClose,
  onTranscriptReady,
  initialLanguage = 'en-US',
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialLanguage);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<{ stop: () => Promise<Blob>; cancel: () => void } | null>(null);
  const liveSessionRef = useRef<LiveSpeechSession | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (liveSessionRef.current) {
        liveSessionRef.current.cancel();
        liveSessionRef.current = null;
      }
      if (recorderRef.current) {
        recorderRef.current.cancel();
        recorderRef.current = null;
      }
      clearInterval(timerRef.current);
      setIsRecording(false);
      setRecordingDuration(0);
      setIsProcessing(false);
      setErrorMessage(null);
    } else {
      // Lock body scroll while modal is active
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isRecording && !isProcessing) {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, isRecording, isProcessing, onClose]);

  const handleStartRecording = async () => {
    setErrorMessage(null);
    setTranscript('');
    try {
      // 1. Start audio recording (MediaRecorder) for audio blob
      const recorder = await VoiceGateway.recordAudio(45000);
      recorderRef.current = recorder;

      // 2. Concurrently start live Web Speech recognition for zero-latency real-time display & reliable fallback
      if (browserSpeechProvider.isSupported()) {
        try {
          const liveSession = browserSpeechProvider.startLiveSession({
            language: selectedLanguage,
            onInterimTranscript: (liveText) => {
              if (liveText) {
                setTranscript(liveText);
              }
            },
          });
          liveSessionRef.current = liveSession;
        } catch (speechErr) {
          console.warn('[VoicePromptModal] Live speech session notice:', speechErr);
        }
      }

      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[Voice Recording Error]:', err);
      setErrorMessage(err?.message || 'Microphone access denied or unavailable.');
    }
  };

  const handleStopRecording = async () => {
    clearInterval(timerRef.current);
    setIsRecording(false);
    setIsProcessing(true);

    try {
      // Stop live browser recognition if active
      let liveResult: any = null;
      if (liveSessionRef.current) {
        liveResult = await liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }

      // Stop audio recorder if active
      let audioBlob: Blob = new Blob([], { type: 'audio/webm' });
      if (recorderRef.current) {
        audioBlob = await recorderRef.current.stop();
        recorderRef.current = null;
      }

      const fallbackText = (liveResult?.transcript || transcript || '').trim();
      const result = await VoiceGateway.transcribe(audioBlob, selectedLanguage, {
        fallbackTranscript: fallbackText,
      });

      setTranscript(result.transcript);
    } catch (err: any) {
      console.error('[Voice Transcription Error]:', err);
      if (transcript.trim()) {
        // Retain recognized text from live Web Speech recognition without alarming error
      } else {
        let cleanMsg = err?.message || 'Failed to transcribe audio. Please try again.';
        if (cleanMsg.includes('{') && cleanMsg.includes('}')) {
          try {
            const start = cleanMsg.indexOf('{');
            const parsed = JSON.parse(cleanMsg.slice(start));
            cleanMsg = parsed.err_msg || parsed.message || 'Could not process audio. Please try speaking again.';
          } catch {
            cleanMsg = 'Could not process audio. Please try speaking again.';
          }
        }
        setErrorMessage(cleanMsg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptTranscript = () => {
    if (transcript.trim()) {
      onTranscriptReady(transcript.trim());
      onClose();
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const currentLangObj: VoiceLanguage | undefined = ALL_SUPPORTED_LANGUAGES.find(
    (l) => l.code === selectedLanguage
  );
  const isIndic = VoiceGateway.isIndianLanguage(selectedLanguage);

  return createPortal(
    <AnimatePresence>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget && !isRecording && !isProcessing) {
            onClose();
          }
        }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-bg-secondary border border-border-default rounded-2xl shadow-2xl overflow-hidden p-4 sm:p-6 text-text-primary max-h-[92dvh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border-default">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold font-display text-text-primary">
                  Voice Dictation Studio
                </h3>
                <p className="text-xs text-text-muted">
                  Powered by {isIndic ? 'Sarvam AI / Web Speech' : 'Deepgram Nova-3 / Web Speech'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Language Selector */}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-primary dark:text-brand-accent" />
              Select Speech Language:
            </label>
            <div className="relative">
              <select
                value={selectedLanguage}
                disabled={isRecording || isProcessing}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full appearance-none bg-bg-tertiary border border-border-default rounded-xl px-3.5 py-2.5 pr-10 text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary min-h-[44px] cursor-pointer transition-all"
              >
                <optgroup label="Indian Languages (Sarvam AI / Web Speech)" className="bg-bg-secondary text-text-primary">
                  {ALL_SUPPORTED_LANGUAGES.filter((l) => l.provider === 'sarvam').map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-bg-secondary text-text-primary">
                      {lang.name} ({lang.native})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Global Languages (Deepgram Nova-3 / Web Speech)" className="bg-bg-secondary text-text-primary">
                  {ALL_SUPPORTED_LANGUAGES.filter((l) => l.provider === 'deepgram').map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-bg-secondary text-text-primary">
                      {lang.name} ({lang.native})
                    </option>
                  ))}
                </optgroup>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Recording / Processing Display */}
          <div className="mt-6 flex flex-col items-center justify-center py-6 px-4 bg-bg-tertiary/60 rounded-xl border border-border-default/60">
            {isRecording ? (
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-full bg-rose-500/20"
                  />
                  <div className="relative w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                    <Mic className="w-8 h-8" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                    Listening ({recordingDuration}s)...
                  </p>
                  <p className="text-xs text-text-muted">Speak your prompt naturally</p>
                </div>

                {/* Live speech preview during speech */}
                {transcript ? (
                  <div className="w-full mt-1 p-3 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary font-mono max-h-24 overflow-y-auto text-left shadow-2xs">
                    <span className="text-brand-primary dark:text-[#41A2D9] font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
                      Live Speech:
                    </span>
                    {transcript}
                  </div>
                ) : null}

                <button
                  onClick={handleStopRecording}
                  className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-text-primary text-bg-primary rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity min-h-[44px]"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop & Transcribe
                </button>
              </div>
            ) : isProcessing ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-8 h-8 text-brand-primary dark:text-[#41A2D9] animate-spin" />
                <p className="text-xs font-medium text-text-secondary">
                  Synthesizing speech via {currentLangObj?.provider === 'sarvam' ? 'Sarvam AI / Web Speech' : 'Deepgram / Web Speech'}...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleStartRecording}
                  className="w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/25 hover:scale-105 active:scale-95 transition-transform min-h-[44px] min-w-[44px]"
                  aria-label="Start recording"
                >
                  <Mic className="w-8 h-8" />
                </button>
                <p className="text-xs text-text-muted text-center">
                  Tap microphone to begin dictating in {currentLangObj?.name || 'selected language'}
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 break-words overflow-hidden">
              <MicOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="break-words overflow-hidden flex-1">{errorMessage}</span>
            </div>
          )}

          {/* Transcript Preview */}
          {transcript && (
            <div className="mt-4">
              <label className="block text-xs font-medium text-text-secondary mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-primary dark:text-[#41A2D9]" />
                Recognized Prompt:
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={3}
                className="w-full bg-bg-tertiary border border-border-default rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40 resize-none font-mono"
              />
            </div>
          )}

          {/* Modal Footer */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-border-default">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-text-secondary hover:bg-bg-tertiary rounded-xl transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleAcceptTranscript}
              disabled={!transcript.trim()}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hi transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm min-h-[44px]"
            >
              <Check className="w-4 h-4" />
              Insert Prompt
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
export default VoicePromptModal;
