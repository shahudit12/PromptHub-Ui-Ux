/**
 * src/services/voice/deepgramProvider.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client adapter for Deepgram Voice Intelligence (Nova-3 STT & Aura TTS).
 *
 * Calls PromptHub backend gateway `/api/deepgram`.
 * Never touches DEEPGRAM_API_KEY directly in the browser.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { VoiceSttResult, VoiceTtsResult } from './types';
import { blobToBase64 } from './sarvamProvider';
import { featureFlags } from '../../config/featureFlags';

export const deepgramProvider = {
  async getStatus(): Promise<{ configured: boolean; models?: any }> {
    if (!featureFlags.isDeepgramEnabled()) {
      return { configured: false };
    }
    try {
      const res = await fetch('/api/deepgram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' }),
      });
      if (!res.ok) return { configured: false };
      const data = await res.json();
      return { configured: Boolean(data.configured), models: data.models };
    } catch {
      return { configured: false };
    }
  },

  async transcribe(audioBlob: Blob, language = 'en'): Promise<VoiceSttResult> {
    const startTime = performance.now();
    const base64Audio = await blobToBase64(audioBlob);

    const res = await fetch('/api/deepgram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'stt',
        audio: base64Audio,
        mimetype: audioBlob.type || 'audio/webm',
        language,
        model: 'nova-3',
      }),
    });

    const durationMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let rawMsg = err.error || `Deepgram STT failed with status ${res.status}`;
      if (typeof rawMsg === 'string' && rawMsg.includes('{') && rawMsg.includes('}')) {
        try {
          const jsonStart = rawMsg.indexOf('{');
          const jsonParsed = JSON.parse(rawMsg.slice(jsonStart));
          rawMsg = jsonParsed.err_msg || jsonParsed.message || rawMsg;
        } catch {
          // fallback
        }
      }
      const error = new Error(rawMsg);
      (error as any).code = err.code || `HTTP_${res.status}`;
      (error as any).status = res.status;
      throw error;
    }

    const data = await res.json();
    return {
      transcript: data.transcript || '',
      provider: 'deepgram',
      languageCode: language,
      confidence: data.confidence,
      durationMs,
    };
  },

  async synthesize(text: string, model = 'aura-asteria-en'): Promise<VoiceTtsResult> {
    const startTime = performance.now();

    const res = await fetch('/api/deepgram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'tts',
        text,
        model,
      }),
    });

    const durationMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Deepgram TTS failed with status ${res.status}`);
    }

    const data = await res.json();
    const audioDataUrl = `data:audio/mp3;base64,${data.audio}`;

    return {
      audioUrl: audioDataUrl,
      provider: 'deepgram',
      format: 'mp3',
      durationMs,
    };
  },
};
