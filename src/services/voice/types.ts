/**
 * src/services/voice/types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * TypeScript definitions for Voice, Audio & Multilingual Speech Systems.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface VoiceLanguage {
  code: string;
  name: string;
  native: string;
  provider: 'sarvam' | 'deepgram' | 'assemblyai' | 'browser' | 'any';
}

export interface VoiceSttResult {
  transcript: string;
  provider: 'sarvam' | 'deepgram' | 'assemblyai' | 'browser';
  languageCode: string;
  confidence?: number;
  durationMs: number;
}

export interface VoiceTtsResult {
  audioUrl: string;
  provider: 'sarvam' | 'deepgram' | 'assemblyai' | 'browser';
  format: string;
  durationMs: number;
}

export interface VoiceTranslateResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: 'sarvam';
  durationMs: number;
}

export const INDIAN_LANGUAGES: VoiceLanguage[] = [
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी', provider: 'sarvam' },
  { code: 'bn-IN', name: 'Bengali', native: 'বাংলা', provider: 'sarvam' },
  { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்', provider: 'sarvam' },
  { code: 'te-IN', name: 'Telugu', native: 'తెలుగు', provider: 'sarvam' },
  { code: 'mr-IN', name: 'Marathi', native: 'मराठी', provider: 'sarvam' },
  { code: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી', provider: 'sarvam' },
  { code: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ', provider: 'sarvam' },
  { code: 'ml-IN', name: 'Malayalam', native: 'മലയാളം', provider: 'sarvam' },
  { code: 'pa-IN', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', provider: 'sarvam' },
  { code: 'od-IN', name: 'Odia', native: 'ଓଡ଼ିଆ', provider: 'sarvam' },
  { code: 'en-IN', name: 'Indian English', native: 'English', provider: 'sarvam' },
];

export const GLOBAL_LANGUAGES: VoiceLanguage[] = [
  { code: 'en-US', name: 'English (US)', native: 'English', provider: 'deepgram' },
  { code: 'en-GB', name: 'English (UK)', native: 'English', provider: 'deepgram' },
  { code: 'es', name: 'Spanish', native: 'Español', provider: 'deepgram' },
  { code: 'fr', name: 'French', native: 'Français', provider: 'deepgram' },
  { code: 'de', name: 'German', native: 'Deutsch', provider: 'deepgram' },
  { code: 'ja', name: 'Japanese', native: '日本語', provider: 'deepgram' },
];

export const ALL_SUPPORTED_LANGUAGES: VoiceLanguage[] = [
  ...INDIAN_LANGUAGES,
  ...GLOBAL_LANGUAGES,
];
