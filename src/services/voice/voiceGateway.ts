/**
 * src/services/voice/voiceGateway.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Master Unified Voice Gateway for PromptHub.
 *
 * Automatically routes voice intelligence:
 * - Indic languages (Hindi, Tamil, Telugu, Bengali, Gujarati, etc.) -> Sarvam AI
 * - Global languages & high-speed streaming -> Deepgram Nova-3 / Aura
 * - Offline / fallback -> Standard Web Speech API
 *
 * Integrated with Mixpanel telemetry and Sentry error auditing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { INDIAN_LANGUAGES, type VoiceSttResult, type VoiceTranslateResult, type VoiceTtsResult } from './types';
import { sarvamProvider } from './sarvamProvider';
import { assemblyaiProvider } from './assemblyaiProvider';
import { deepgramProvider } from './deepgramProvider';
import { browserSpeechProvider } from './browserSpeechProvider';
import { featureFlags } from '../../config/featureFlags';
import {
  trackSpeechToTextStarted,
  trackSpeechToTextCompleted,
  trackTranslationStarted,
  trackTranslationCompleted,
  trackTextToSpeechStarted,
  trackTextToSpeechCompleted,
} from '../../lib/mixpanelEvents';
import { captureException } from '../../lib/sentry';

export class VoiceGateway {
  /**
   * Helper to check if a language code represents an Indian regional language.
   */
  static isIndianLanguage(languageCode: string): boolean {
    const clean = (languageCode || '').toLowerCase();
    return INDIAN_LANGUAGES.some((l) => l.code.toLowerCase() === clean || clean.startsWith(l.code.split('-')[0].toLowerCase()));
  }

  /**
   * Transcribe an audio recording using the optimal provider.
   * Gracefully degrades from Cloud Providers (Sarvam / Deepgram) to Web Speech API.
   */
  static async transcribe(
    audioBlob: Blob,
    languageCode = 'en-US',
    options?: { fallbackTranscript?: string }
  ): Promise<VoiceSttResult> {
    const isIndic = this.isIndianLanguage(languageCode);
    const primaryProvider = isIndic ? 'sarvam' : 'deepgram';

    trackSpeechToTextStarted({
      provider: primaryProvider,
      languageCode,
    });

    const startTime = performance.now();
    let lastCloudError: any = null;

    // 1. Try Indic provider (Sarvam AI) if applicable
    if (isIndic && featureFlags.isSarvamEnabled()) {
      try {
        const result = await sarvamProvider.transcribe(audioBlob, languageCode);
        trackSpeechToTextCompleted({
          provider: 'sarvam',
          languageCode,
          durationMs: result.durationMs,
          transcriptLength: result.transcript.length,
          audioSizeBytes: audioBlob.size,
          isSuccess: true,
        });
        return result;
      } catch (sarvamErr: any) {
        lastCloudError = sarvamErr;
        console.warn('[VoiceGateway] Sarvam STT failed or unconfigured, evaluating fallbacks:', sarvamErr?.message);
      }
    }

    // 2. Try AssemblyAI (Primary Global STT)
    try {
      const result = await assemblyaiProvider.transcribe(audioBlob, languageCode.split('-')[0] || 'en');
      trackSpeechToTextCompleted({
        provider: 'assemblyai',
        languageCode,
        durationMs: result.durationMs,
        transcriptLength: result.transcript.length,
        audioSizeBytes: audioBlob.size,
        isSuccess: true,
      });
      return result;
    } catch (assemblyErr: any) {
      lastCloudError = assemblyErr;
      console.warn('[VoiceGateway] AssemblyAI STT failed or unconfigured, evaluating Deepgram fallback:', assemblyErr?.message);
    }

    // 3. Fallback: Deepgram Nova-3 (Blueprint: "If nothing works -> deepgram")
    if (featureFlags.isDeepgramEnabled()) {
      try {
        const result = await deepgramProvider.transcribe(audioBlob, languageCode.split('-')[0] || 'en');
        trackSpeechToTextCompleted({
          provider: 'deepgram',
          languageCode,
          durationMs: result.durationMs,
          transcriptLength: result.transcript.length,
          audioSizeBytes: audioBlob.size,
          isSuccess: true,
        });
        return result;
      } catch (deepgramErr: any) {
        lastCloudError = deepgramErr;
        console.warn('[VoiceGateway] Deepgram STT failed or unconfigured, evaluating fallbacks:', deepgramErr?.message);
      }
    }

    // 3. Fallback to Browser Web Speech transcript if available
    const fallbackText = (options?.fallbackTranscript || '').trim();
    if (fallbackText) {
      const durationMs = Math.round(performance.now() - startTime);
      trackSpeechToTextCompleted({
        provider: 'browser',
        languageCode,
        durationMs,
        transcriptLength: fallbackText.length,
        audioSizeBytes: audioBlob.size,
        isSuccess: true,
      });

      return {
        transcript: fallbackText,
        provider: 'browser',
        languageCode,
        durationMs,
      };
    }

    // 4. Telemetry failure report
    const durationMs = Math.round(performance.now() - startTime);
    trackSpeechToTextCompleted({
      provider: primaryProvider,
      languageCode,
      durationMs,
      transcriptLength: 0,
      audioSizeBytes: audioBlob.size,
      isSuccess: false,
    });

    const isKeyMissingOrOffline =
      lastCloudError?.code === 'DEEPGRAM_KEY_MISSING' ||
      lastCloudError?.code === 'SARVAM_KEY_MISSING' ||
      lastCloudError?.status === 503 ||
      lastCloudError?.message?.includes('not configured') ||
      lastCloudError?.message?.includes('Failed to fetch');

    const isClientAudioFormatIssue =
      lastCloudError?.status === 400 ||
      lastCloudError?.message?.toLowerCase().includes('failed to process audio') ||
      lastCloudError?.message?.toLowerCase().includes('corrupt') ||
      lastCloudError?.message?.toLowerCase().includes('unsupported');

    // Only report unexpected crashes to Sentry when keys are actively configured,
    // NEVER send missing optional keys, format rejections, or short recordings to Sentry
    if (lastCloudError && !isKeyMissingOrOffline && !isClientAudioFormatIssue && audioBlob.size > 5000) {
      captureException(lastCloudError, {
        category: 'voice.stt',
        extra: { languageCode, audioSize: audioBlob.size },
      });
    }

    const userMessage = isKeyMissingOrOffline
      ? 'Voice dictation requires microphone speech or Chrome/Edge/Safari for built-in transcription. Please speak clearly while holding the microphone.'
      : isClientAudioFormatIssue
      ? 'Could not transcribe speech clearly. Please speak closer to your microphone and try again.'
      : (lastCloudError?.message || 'Speech transcription could not be completed with the available providers.');

    throw new Error(userMessage);
  }

  /**
   * Translate prompt text into an Indian language or English using Sarvam AI.
   */
  static async translate(
    text: string,
    targetLanguageCode: string,
    sourceLanguageCode = 'en-IN'
  ): Promise<VoiceTranslateResult> {
    trackTranslationStarted({
      provider: 'sarvam',
      sourceLanguage: sourceLanguageCode,
      targetLanguage: targetLanguageCode,
      charCount: text.length,
    });

    const startTime = performance.now();

    try {
      const result = await sarvamProvider.translate(text, targetLanguageCode, sourceLanguageCode);
      trackTranslationCompleted({
        provider: 'sarvam',
        sourceLanguage: sourceLanguageCode,
        targetLanguage: targetLanguageCode,
        durationMs: result.durationMs,
        charCount: text.length,
        isSuccess: true,
      });
      return result;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      trackTranslationCompleted({
        provider: 'sarvam',
        sourceLanguage: sourceLanguageCode,
        targetLanguage: targetLanguageCode,
        durationMs,
        charCount: text.length,
        isSuccess: false,
      });

      captureException(err, {
        category: 'voice.translate',
        extra: { sourceLanguageCode, targetLanguageCode, textLength: text.length },
      });

      throw err;
    }
  }

  /**
   * Synthesize audio from prompt text.
   */
  static async synthesize(text: string, languageCode = 'hi-IN'): Promise<VoiceTtsResult> {
    const isIndic = this.isIndianLanguage(languageCode);
    const provider = isIndic ? 'sarvam' : 'deepgram';

    trackTextToSpeechStarted({
      provider,
      languageCode,
      charCount: text.length,
    });

    const startTime = performance.now();

    if (isIndic && featureFlags.isSarvamEnabled()) {
      try {
        const result = await sarvamProvider.synthesize(text, languageCode);
        trackTextToSpeechCompleted({
          provider: 'sarvam',
          languageCode,
          durationMs: result.durationMs,
          audioFormat: result.format,
          isSuccess: true,
        });
        return result;
      } catch (err) {
        console.warn('[VoiceGateway] Sarvam TTS failed:', err);
      }
    }

    if (featureFlags.isDeepgramEnabled()) {
      try {
        const result = await deepgramProvider.synthesize(text);
        trackTextToSpeechCompleted({
          provider: 'deepgram',
          languageCode,
          durationMs: result.durationMs,
          audioFormat: result.format,
          isSuccess: true,
        });
        return result;
      } catch (err) {
        console.warn('[VoiceGateway] Deepgram TTS failed:', err);
      }
    }

    // Fallback: Web Speech API synthesis in browser
    await browserSpeechProvider.speakText(text, languageCode);
    const durationMs = Math.round(performance.now() - startTime);

    trackTextToSpeechCompleted({
      provider: 'browser',
      languageCode,
      durationMs,
      audioFormat: 'native_speech_synthesis',
      isSuccess: true,
    });

    return {
      audioUrl: '',
      provider: 'browser',
      format: 'native',
      durationMs,
    };
  }

  /**
   * Browser microphone recording helper with clean MediaRecorder lifecycle.
   */
  static async recordAudio(maxDurationMs = 30000): Promise<{
    stop: () => Promise<Blob>;
    cancel: () => void;
  }> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is not supported in this environment.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : '';

    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.start(250);

    let isStopped = false;

    const cleanup = () => {
      stream.getTracks().forEach((track) => track.stop());
    };

    const timer = setTimeout(() => {
      if (!isStopped && recorder.state !== 'inactive') {
        recorder.stop();
      }
    }, maxDurationMs);

    return {
      stop(): Promise<Blob> {
        return new Promise((resolve) => {
          if (isStopped || recorder.state === 'inactive') {
            cleanup();
            clearTimeout(timer);
            resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
            return;
          }

          recorder.onstop = () => {
            isStopped = true;
            cleanup();
            clearTimeout(timer);
            resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
          };

          recorder.stop();
        });
      },
      cancel() {
        isStopped = true;
        clearTimeout(timer);
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
        cleanup();
      },
    };
  }
}
