/**
 * src/services/voice/sarvamProvider.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client adapter for Sarvam AI (Indian Language Speech-to-Text, Translation & TTS).
 *
 * Calls PromptHub backend gateway `/api/sarvam`.
 * Never touches SARVAM_API_KEY directly in the browser.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { VoiceSttResult, VoiceTranslateResult, VoiceTtsResult } from './types';
import { featureFlags } from '../../config/featureFlags';

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const sarvamProvider = {
  async getStatus(): Promise<{ configured: boolean; supportedLanguages?: any[] }> {
    if (!featureFlags.isSarvamEnabled()) {
      return { configured: false };
    }
    try {
      const res = await fetch('/api/sarvam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' }),
      });
      if (!res.ok) return { configured: false };
      const data = await res.json();
      return { configured: Boolean(data.configured), supportedLanguages: data.supportedLanguages };
    } catch {
      return { configured: false };
    }
  },

  async transcribe(audioBlob: Blob, languageCode = 'hi-IN'): Promise<VoiceSttResult> {
    const startTime = performance.now();
    const base64Audio = await blobToBase64(audioBlob);

    const res = await fetch('/api/sarvam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'stt',
        audio: base64Audio,
        language_code: languageCode,
        model: 'saaras:v2',
      }),
    });

    const durationMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || `Sarvam STT failed with status ${res.status}`);
      (error as any).code = err.code || `HTTP_${res.status}`;
      (error as any).status = res.status;
      throw error;
    }

    const data = await res.json();
    return {
      transcript: data.transcript || '',
      provider: 'sarvam',
      languageCode: data.language_code || languageCode,
      durationMs,
    };
  },

  async translate(text: string, targetLanguageCode = 'hi-IN', sourceLanguageCode = 'en-IN'): Promise<VoiceTranslateResult> {
    const startTime = performance.now();

    const res = await fetch('/api/sarvam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'translate',
        input: text,
        source_language_code: sourceLanguageCode,
        target_language_code: targetLanguageCode,
        speaker_gender: 'Female',
        mode: 'formal',
      }),
    });

    const durationMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Sarvam Translation failed with status ${res.status}`);
    }

    const data = await res.json();
    return {
      translatedText: data.translated_text || '',
      sourceLanguage: sourceLanguageCode,
      targetLanguage: targetLanguageCode,
      provider: 'sarvam',
      durationMs,
    };
  },

  async synthesize(text: string, targetLanguageCode = 'hi-IN', speaker = 'meera'): Promise<VoiceTtsResult> {
    const startTime = performance.now();

    const res = await fetch('/api/sarvam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'tts',
        text,
        target_language_code: targetLanguageCode,
        speaker,
        model: 'bulbul:v1',
      }),
    });

    const durationMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Sarvam TTS failed with status ${res.status}`);
    }

    const data = await res.json();
    const audioDataUrl = `data:audio/wav;base64,${data.audio}`;

    return {
      audioUrl: audioDataUrl,
      provider: 'sarvam',
      format: 'wav',
      durationMs,
    };
  },
};
