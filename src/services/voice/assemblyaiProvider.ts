/**
 * src/services/voice/assemblyaiProvider.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client adapter for AssemblyAI Speech Intelligence (STT).
 *
 * Calls PromptHub backend gateway `/api/assemblyai`.
 * Never touches ASSEMBLYAI_API_KEY directly in the browser.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { VoiceSttResult } from './types';
import { blobToBase64 } from './sarvamProvider';

export const assemblyaiProvider = {
  async getStatus(): Promise<{ configured: boolean; models?: any }> {
    try {
      const res = await fetch('/api/assemblyai', {
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

    const res = await fetch('/api/assemblyai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'stt',
        audio: base64Audio,
        mimetype: audioBlob.type || 'audio/webm',
        language_code: language,
        speech_model: 'nano',
      }),
    });

    const durationMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.error || `AssemblyAI STT failed with status ${res.status}`);
      (error as any).code = err.code || `HTTP_${res.status}`;
      (error as any).status = res.status;
      throw error;
    }

    const data = await res.json();
    return {
      transcript: data.transcript || '',
      provider: 'assemblyai',
      languageCode: language,
      confidence: data.confidence,
      durationMs,
    };
  },
};
