/**
 * src/services/voice/browserSpeechProvider.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Zero-network browser fallback using standard Web Speech API.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { VoiceSttResult } from './types';

export interface LiveSpeechSession {
  stop: () => Promise<VoiceSttResult>;
  cancel: () => void;
  getTranscript: () => string;
}

export const browserSpeechProvider = {
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  },

  startLiveSession(options?: {
    language?: string;
    onInterimTranscript?: (transcript: string) => void;
    onError?: (error: any) => void;
  }): LiveSpeechSession {
    const SpeechRecognition = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;

    const language = options?.language || 'en-US';
    const startTime = performance.now();

    if (!SpeechRecognition) {
      return {
        stop: async () => ({
          transcript: '',
          provider: 'browser',
          languageCode: language,
          durationMs: 0,
        }),
        cancel: () => {},
        getTranscript: () => '',
      };
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = language;

    let finalTranscript = '';
    let interimTranscript = '';
    let isStopped = false;

    recognition.onresult = (event: any) => {
      interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const text = item[0]?.transcript || '';
        if (item.isFinal) {
          finalTranscript = (finalTranscript ? finalTranscript + ' ' : '') + text.trim();
        } else {
          interimTranscript = (interimTranscript ? interimTranscript + ' ' : '') + text.trim();
        }
      }
      const combined = (finalTranscript + (interimTranscript ? (finalTranscript ? ' ' : '') + interimTranscript : '')).trim();
      options?.onInterimTranscript?.(combined);
    };

    recognition.onerror = (event: any) => {
      if (event?.error === 'no-speech') return; // Natural pause between phrases
      console.warn('[BrowserSpeechProvider] Live speech event:', event?.error);
      options?.onError?.(event);
    };

    recognition.onend = () => {
      // Auto-restart if user is still actively recording (browsers can pause on silence)
      if (!isStopped) {
        try {
          recognition.start();
        } catch {
          // Lifecycle handling
        }
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.warn('[BrowserSpeechProvider] Recognition start notice:', err);
    }

    return {
      getTranscript() {
        return (finalTranscript + (interimTranscript ? (finalTranscript ? ' ' : '') + interimTranscript : '')).trim();
      },
      cancel() {
        isStopped = true;
        try {
          recognition.abort();
        } catch {}
      },
      stop(): Promise<VoiceSttResult> {
        isStopped = true;
        return new Promise((resolve) => {
          let resolved = false;
          const finish = () => {
            if (resolved) return;
            resolved = true;
            const durationMs = Math.round(performance.now() - startTime);
            const fullText = (finalTranscript + (interimTranscript ? (finalTranscript ? ' ' : '') + interimTranscript : '')).trim();
            resolve({
              transcript: fullText,
              provider: 'browser',
              languageCode: language,
              durationMs,
            });
          };

          try {
            recognition.onend = finish;
            recognition.stop();
            // Fallback timeout in case onend event delays
            setTimeout(finish, 350);
          } catch {
            finish();
          }
        });
      },
    };
  },

  async startListening(options?: { language?: string; maxDurationSec?: number }): Promise<VoiceSttResult> {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Web Speech API is not supported in this browser.');
    }

    const startTime = performance.now();
    const language = options?.language || 'en-US';

    return new Promise((resolve, reject) => {
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let hasResolved = false;
      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        if (event.results && event.results[0]) {
          finalTranscript = event.results[0][0].transcript;
        }
      };

      recognition.onerror = (event: any) => {
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error(event.error || 'Speech recognition encountered an error.'));
        }
      };

      recognition.onend = () => {
        if (!hasResolved) {
          hasResolved = true;
          const durationMs = Math.round(performance.now() - startTime);
          resolve({
            transcript: finalTranscript,
            provider: 'browser',
            languageCode: language,
            durationMs,
          });
        }
      };

      try {
        recognition.start();
      } catch (err) {
        reject(err);
      }
    });
  },

  speakText(text: string, lang = 'en-US'): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        return resolve();
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // Non-blocking

      window.speechSynthesis.speak(utterance);
    });
  },
};
