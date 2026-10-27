import React from 'react';
import { Sparkles, Key } from 'lucide-react';

export interface ModelProviderLogoProps {
  provider?: string;
  modelId?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * Normalized provider resolution helper
 * Maps raw provider IDs, model IDs, or slugs to canonical provider keys.
 */
export function resolveProviderKey(provider?: string, modelId?: string): string {
  const p = (provider || '').toLowerCase().trim();
  const m = (modelId || '').toLowerCase().trim();

  // 1. OpenAI / ChatGPT
  if (
    p.includes('openai') ||
    m.startsWith('openai/') ||
    m.includes('gpt-') ||
    m.includes('chatgpt') ||
    m.includes('/o1') ||
    m.includes('/o3') ||
    m === 'o1' ||
    m === 'o3' ||
    m.startsWith('o1-') ||
    m.startsWith('o3-')
  ) {
    return 'openai';
  }

  // 2. Anthropic Claude
  if (
    p.includes('anthropic') ||
    m.startsWith('anthropic/') ||
    m.includes('claude')
  ) {
    return 'anthropic';
  }

  // 3. Google Gemini / Gemma
  if (
    p.includes('google') ||
    m.startsWith('google/') ||
    m.includes('gemini') ||
    m.includes('gemma')
  ) {
    return 'google';
  }

  // 4. DeepSeek
  if (
    p.includes('deepseek') ||
    m.startsWith('deepseek/') ||
    m.includes('deepseek-')
  ) {
    return 'deepseek';
  }

  // 5. Qwen / Alibaba Cloud
  if (
    p.includes('qwen') ||
    m.startsWith('qwen/') ||
    m.includes('qianwen') ||
    p.includes('alibaba')
  ) {
    return 'qwen';
  }

  // 6. NVIDIA Nemotron
  if (
    p.includes('nvidia') ||
    m.startsWith('nvidia/') ||
    m.includes('nemotron')
  ) {
    return 'nvidia';
  }

  // 7. Cohere
  if (
    p.includes('cohere') ||
    m.startsWith('cohere/') ||
    m.includes('command-r') ||
    m.includes('north-mini')
  ) {
    return 'cohere';
  }

  // 8. Meta Llama
  if (
    p.includes('meta') ||
    m.startsWith('meta/') ||
    m.startsWith('meta-llama/') ||
    m.includes('llama')
  ) {
    return 'meta';
  }

  // 9. Mistral AI
  if (
    p.includes('mistral') ||
    m.startsWith('mistral/') ||
    m.startsWith('mistralai/') ||
    m.includes('codestral') ||
    m.includes('pixtral') ||
    m.includes('ministral')
  ) {
    return 'mistral';
  }

  // 10. Groq
  if (
    p.includes('groq') ||
    m.startsWith('groq/')
  ) {
    return 'groq';
  }

  // 11. xAI / Grok
  if (
    p.includes('xai') ||
    p.includes('x-ai') ||
    m.startsWith('x-ai/') ||
    m.startsWith('xai/') ||
    m.includes('grok')
  ) {
    return 'xai';
  }

  // 12. Microsoft / Phi
  if (
    p.includes('microsoft') ||
    m.startsWith('microsoft/') ||
    m.includes('phi-') ||
    m.includes('wizardlm')
  ) {
    return 'microsoft';
  }

  // 13. Amazon Bedrock / Nova
  if (
    p.includes('amazon') ||
    p.includes('aws') ||
    p.includes('bedrock') ||
    m.startsWith('amazon/') ||
    m.includes('nova-') ||
    m.includes('titan-')
  ) {
    return 'amazon';
  }

  // 14. Stability AI
  if (
    p.includes('stability') ||
    m.startsWith('stabilityai/') ||
    m.includes('stable-diffusion') ||
    m.includes('sdxl')
  ) {
    return 'stability';
  }

  // 15. Black Forest Labs / FLUX
  if (
    p.includes('flux') ||
    p.includes('black-forest') ||
    m.startsWith('black-forest-labs/') ||
    m.includes('flux-')
  ) {
    return 'flux';
  }

  // 16. Midjourney
  if (
    p.includes('midjourney') ||
    m.includes('midjourney')
  ) {
    return 'midjourney';
  }

  // 17. Liquid AI
  if (
    p.includes('liquid') ||
    m.startsWith('liquid/') ||
    m.includes('lfm')
  ) {
    return 'liquid';
  }

  // 18. Dots Studio
  if (
    p.includes('dots') ||
    m.startsWith('dots-studio/') ||
    m.startsWith('dots/')
  ) {
    return 'dots';
  }

  // 19. Sarvam AI
  if (
    p.includes('sarvam') ||
    m.startsWith('sarvam/')
  ) {
    return 'sarvam';
  }

  // 20. Deepgram
  if (
    p.includes('deepgram') ||
    m.startsWith('deepgram/')
  ) {
    return 'deepgram';
  }

  // 21. AssemblyAI
  if (
    p.includes('assembly') ||
    m.startsWith('assemblyai/')
  ) {
    return 'assemblyai';
  }

  // 22. AICredits.in
  if (
    p.includes('aicredits') ||
    m.startsWith('aicredits/')
  ) {
    return 'aicredits';
  }

  // 23. OpenRouter
  if (
    p.includes('openrouter') ||
    m.startsWith('openrouter/')
  ) {
    return 'openrouter';
  }

  // 24. You.com
  if (
    p.includes('you') ||
    m.startsWith('you.') ||
    m.startsWith('you_')
  ) {
    return 'you_com';
  }

  // 25. BYOK / Custom Key
  if (
    p.includes('byok') ||
    p.includes('custom_key') ||
    m === 'byok'
  ) {
    return 'byok';
  }

  return 'generic';
}

/**
 * Authoritative Model Provider Vector Logo
 * Features high-precision SVGs for all major frontier, open-source, and media AI providers.
 */
export const ModelProviderLogo: React.FC<ModelProviderLogoProps> = ({
  provider,
  modelId,
  className = 'w-4 h-4',
}) => {
  const key = resolveProviderKey(provider, modelId);

  switch (key) {
    // ── 1. OpenAI ─────────────────────────────────────────────────────────────
    case 'openai':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#10A37F]`}
          aria-label="OpenAI"
          role="img"
        >
          <path
            d="M22.28 9.37a5.98 5.98 0 0 0-.52-4.93 6.09 6.09 0 0 0-6.47-2.9 6.07 6.07 0 0 0-4.63-2.06c-2.58 0-4.8 1.63-5.6 4.02a6.05 6.05 0 0 0-3.9 2.82 6.08 6.08 0 0 0 .74 7.07 5.98 5.98 0 0 0 .51 4.93 6.08 6.08 0 0 0 6.47 2.9 6.06 6.06 0 0 0 4.63 2.06c2.58 0 4.8-1.63 5.6-4.02a6.05 6.05 0 0 0 3.9-2.82 6.08 6.08 0 0 0-.73-7.07zm-8.86 12.7a4.57 4.57 0 0 1-2.9-1.04l.15-.08 4.82-2.78a.78.78 0 0 0 .39-.68v-6.8l2.04 1.18v5.62a4.6 4.6 0 0 1-4.5 4.58zm-8.5-4.22a4.58 4.58 0 0 1-.55-3.05l.15.09 4.82 2.78a.77.77 0 0 0 .78 0l5.89-3.4v2.36l-4.87 2.81a4.6 4.6 0 0 1-6.22-1.59zm-1.74-8.8a4.57 4.57 0 0 1 2.36-2.02v5.73a.77.77 0 0 0 .39.67l5.89 3.4-2.04 1.18-4.87-2.81a4.6 4.6 0 0 1-1.73-6.15zm14.36 4.38-5.89-3.4 2.04-1.18 4.87 2.81a4.6 4.6 0 0 1 1.73 6.16 4.58 4.58 0 0 1-2.36 2.02v-5.74a.77.77 0 0 0-.39-.67zm2.5-2.4a4.58 4.58 0 0 1 .55 3.05l-.15-.09-4.82-2.78a.77.77 0 0 0-.78 0l-5.89 3.4v-2.36l4.87-2.81a4.6 4.6 0 0 1 6.22 1.59zM9.54 12.82l2.46-1.42 2.46 1.42v2.84l-2.46 1.42-2.46-1.42z"
            fill="currentColor"
          />
        </svg>
      );

    // ── 2. Google Gemini ──────────────────────────────────────────────────────
    case 'google':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0`}
          aria-label="Google Gemini"
          role="img"
        >
          <defs>
            <linearGradient id="ph-gemini-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1A73E8" />
              <stop offset="35%" stopColor="#8E24AA" />
              <stop offset="70%" stopColor="#EA4335" />
              <stop offset="100%" stopColor="#00BCD4" />
            </linearGradient>
          </defs>
          <path
            d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"
            fill="url(#ph-gemini-grad)"
          />
          <path
            d="M18.5 2C18.5 4.49 16.49 6.5 14 6.5C16.49 6.5 18.5 8.51 18.5 11C18.5 8.51 20.51 6.5 23 6.5C20.51 6.5 18.5 4.49 18.5 2Z"
            fill="url(#ph-gemini-grad)"
            opacity="0.85"
          />
        </svg>
      );

    // ── 3. Anthropic Claude ───────────────────────────────────────────────────
    case 'anthropic':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#D97757]`}
          aria-label="Anthropic Claude"
          role="img"
        >
          <path
            d="M13.83 3.5h3.94l5.23 17h-3.95l-1.12-3.83H10.1l-1.12 3.83H5.03l5.23-17h3.57zm2.93 10.45l-2.02-6.93h-.08l-2.02 6.93h4.12z"
            fill="currentColor"
          />
        </svg>
      );

    // ── 4. DeepSeek ───────────────────────────────────────────────────────────
    case 'deepseek':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0`}
          aria-label="DeepSeek"
          role="img"
        >
          <defs>
            <linearGradient id="ph-deepseek-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0066FF" />
              <stop offset="100%" stopColor="#00B4D8" />
            </linearGradient>
          </defs>
          <path
            d="M3 13.5C3.5 10 6 7 10 6.5C14.5 6 18.5 8 20.5 11.5C21.5 13.2 21.8 15 21 16.5C20.2 18 18.5 18.8 16.5 18.5C13 18 10 16 7.5 17.5C5.5 18.7 3.5 17.5 3 13.5Z"
            fill="url(#ph-deepseek-grad)"
          />
          <circle cx="15.5" cy="11.5" r="1.3" fill="#FFFFFF" />
          <path
            d="M3.5 13.5C2.5 12 1.5 12 1 13C1.5 14.5 2.5 15.5 4 16C3.5 15 3.3 14.2 3.5 13.5Z"
            fill="#0066FF"
          />
          <path
            d="M10 6.5C11 4 13.5 3.5 14.5 4.5C13.5 5.5 12.5 6 10 6.5Z"
            fill="#00B4D8"
          />
        </svg>
      );

    // ── 5. xAI / Grok ─────────────────────────────────────────────────────────
    case 'xai':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-text-primary`}
          aria-label="xAI Grok"
          role="img"
        >
          <path
            d="M18.9 3H22L14.7 11.4L23.3 22H16.7L11.5 15.3L5.7 22H2.6L10.4 13.1L2.1 3H8.9L13.6 9.3L18.9 3ZM17.8 20.1H19.5L7.7 4.7H5.9L17.8 20.1Z"
            fill="currentColor"
          />
        </svg>
      );

    // ── 6. Microsoft / Phi ────────────────────────────────────────────────────
    case 'microsoft':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0`}
          aria-label="Microsoft"
          role="img"
        >
          <rect x="2.5" y="2.5" width="9" height="9" fill="#F25022" />
          <rect x="12.5" y="2.5" width="9" height="9" fill="#7FBA00" />
          <rect x="2.5" y="12.5" width="9" height="9" fill="#00A4EF" />
          <rect x="12.5" y="12.5" width="9" height="9" fill="#FFB900" />
        </svg>
      );

    // ── 7. Meta Llama ─────────────────────────────────────────────────────────
    case 'meta':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#0668E1]`}
          aria-label="Meta Llama"
          role="img"
        >
          <path
            d="M17.06 6.13c-1.89 0-3.35 1.05-4.4 2.56-1.04-1.51-2.5-2.56-4.39-2.56-3.23 0-5.77 2.76-5.77 6.46 0 3.73 2.54 6.54 5.77 6.54 2.05 0 3.56-1.12 4.39-2.61.83 1.49 2.34 2.61 4.4 2.61 3.23 0 5.77-2.81 5.77-6.54 0-3.7-2.54-6.46-5.77-6.46zm-8.79 10.74c-1.97 0-3.48-1.84-3.48-4.28 0-2.42 1.51-4.25 3.48-4.25 1.63 0 2.83 1.34 3.49 3.27-.66 2.01-1.86 3.26-3.49 3.26zm8.79 0c-1.63 0-2.83-1.25-3.49-3.26.66-1.93 1.86-3.27 3.49-3.27 1.97 0 3.48 1.83 3.48 4.25 0 2.44-1.51 4.28-3.48 4.28z"
            fill="currentColor"
          />
        </svg>
      );

    // ── 8. Mistral AI ─────────────────────────────────────────────────────────
    case 'mistral':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0`}
          aria-label="Mistral AI"
          role="img"
        >
          <rect x="3" y="4" width="4" height="4" fill="#FF7000" />
          <rect x="17" y="4" width="4" height="4" fill="#FF7000" />
          <rect x="7.67" y="9.33" width="4" height="4" fill="#FF7000" />
          <rect x="12.33" y="9.33" width="4" height="4" fill="#FF7000" />
          <rect x="10" y="14.67" width="4" height="4" fill="#FF7000" />
        </svg>
      );

    // ── 9. Qwen / Alibaba Cloud ───────────────────────────────────────────────
    case 'qwen':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#6C5CE7]`}
          aria-label="Qwen"
          role="img"
        >
          <path
            d="M12 2L20.5 7V17L12 22L3.5 17V7L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="currentColor"
            fillOpacity="0.15"
          />
          <path
            d="M12 2V12L20.5 17M12 12L3.5 17"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        </svg>
      );

    // ── 10. NVIDIA Nemotron ───────────────────────────────────────────────────
    case 'nvidia':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#76B900]`}
          aria-label="NVIDIA"
          role="img"
        >
          <path
            d="M10.87 5.86c-3.13 0-5.67 2.49-5.67 5.56s2.54 5.56 5.67 5.56c2.47 0 4.59-1.55 5.34-3.73-.78 1.48-2.38 2.5-4.22 2.5-2.67 0-4.83-2.12-4.83-4.73s2.16-4.73 4.83-4.73c1.78 0 3.33.97 4.14 2.41-.69-1.99-2.65-3.44-5.26-3.44zm-.01-2.86c-4.7 0-8.51 3.75-8.51 8.37s3.81 8.37 8.51 8.37c3.9 0 7.2-2.6 8.18-6.19-.94 2.53-3.4 4.34-6.32 4.34-3.73 0-6.75-2.98-6.75-6.66s3.02-6.66 6.75-6.66c2.86 0 5.27 1.74 6.25 4.19-.92-3.47-4.14-5.96-8.11-5.96zM12 1C5.92 1 1 5.92 1 12s4.92 11 11 11 11-4.92 11-11c0-1.84-.45-3.57-1.25-5.09-.94 1.78-2.48 3.25-4.43 4.09 1.34-1.25 2.18-3.04 2.18-5.02 0-3.84-3.11-6.98-6.95-6.98z"
            fill="currentColor"
          />
        </svg>
      );

    // ── 11. Cohere ────────────────────────────────────────────────────────────
    case 'cohere':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0`}
          aria-label="Cohere"
          role="img"
        >
          <path
            d="M5 9c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7-7-3.13-7-7z"
            fill="#39594C"
            opacity="0.85"
          />
          <path
            d="M12 11c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"
            fill="#D13415"
          />
        </svg>
      );

    // ── 12. Groq ──────────────────────────────────────────────────────────────
    case 'groq':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#F55036]`}
          aria-label="Groq"
          role="img"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" />
          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    // ── 13. Amazon Bedrock / Nova ─────────────────────────────────────────────
    case 'amazon':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#FF9900]`}
          aria-label="Amazon Bedrock"
          role="img"
        >
          <path
            d="M19.5 13.5C18.2 16.5 15.3 18.5 12 18.5C8.7 18.5 5.8 16.5 4.5 13.5M20 13L19 14.5L17.5 13.5M12 4L15 9.5H9L12 4Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    // ── 14. Stability AI ──────────────────────────────────────────────────────
    case 'stability':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#7C3AED]`}
          aria-label="Stability AI"
          role="img"
        >
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <circle cx="12" cy="3" r="1.5" fill="currentColor" />
          <circle cx="21" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="21" r="1.5" fill="currentColor" />
          <circle cx="3" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );

    // ── 15. Black Forest Labs / FLUX ──────────────────────────────────────────
    case 'flux':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#FF4B4B]`}
          aria-label="FLUX / Black Forest Labs"
          role="img"
        >
          <path
            d="M12 2L20.5 7V17L12 22L3.5 17V7L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M12 6L16.5 9V15L12 18L7.5 15V9L12 6Z"
            fill="currentColor"
            fillOpacity="0.8"
          />
        </svg>
      );

    // ── 16. Midjourney ────────────────────────────────────────────────────────
    case 'midjourney':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#0284C7]`}
          aria-label="Midjourney"
          role="img"
        >
          <path
            d="M4 17L12 4L20 17H4ZM6.5 19H17.5L15 21H9L6.5 19Z"
            fill="currentColor"
          />
        </svg>
      );

    // ── 17. OpenRouter ────────────────────────────────────────────────────────
    case 'openrouter':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#6366F1]`}
          aria-label="OpenRouter"
          role="img"
        >
          <circle cx="12" cy="12" r="3.5" fill="currentColor" />
          <path
            d="M12 2v4m0 12v4M2 12h4m12 0h4m-3.05-6.95-2.83 2.83m-8.24 8.24-2.83 2.83m0-13.9 2.83 2.83m8.24 8.24 2.83 2.83"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );

    // ── 18. Sarvam AI ─────────────────────────────────────────────────────────
    case 'sarvam':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#FF6E14]`}
          aria-label="Sarvam AI"
          role="img"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <path d="M12 3v3m0 12v3M3 12h3m12 0h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    // ── 19. Deepgram ──────────────────────────────────────────────────────────
    case 'deepgram':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#13EF93]`}
          aria-label="Deepgram Speech AI"
          role="img"
        >
          <path d="M4 10v4M8 6v12M12 2v20M16 6v12M20 10v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    // ── 20. AssemblyAI ────────────────────────────────────────────────────────
    case 'assemblyai':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#2563EB]`}
          aria-label="AssemblyAI"
          role="img"
        >
          <rect x="3" y="9" width="3" height="6" rx="1.5" fill="currentColor" />
          <rect x="8" y="5" width="3" height="14" rx="1.5" fill="currentColor" />
          <rect x="13" y="3" width="3" height="18" rx="1.5" fill="currentColor" />
          <rect x="18" y="7" width="3" height="10" rx="1.5" fill="currentColor" />
        </svg>
      );

    // ── 21. AICredits.in ──────────────────────────────────────────────────────
    case 'aicredits':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#3B82F6]`}
          aria-label="AICredits.in"
          role="img"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7v10M9 9.5h6a1.5 1.5 0 0 1 0 3H9a1.5 1.5 0 0 0 0 3h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    // ── 22. Liquid AI ─────────────────────────────────────────────────────────
    case 'liquid':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0`}
          aria-label="Liquid AI"
          role="img"
        >
          <defs>
            <linearGradient id="ph-liquid-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>
          <path
            d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
            fill="url(#ph-liquid-grad)"
          />
        </svg>
      );

    // ── 23. Dots Studio ───────────────────────────────────────────────────────
    case 'dots':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#A855F7]`}
          aria-label="Dots Studio"
          role="img"
        >
          <circle cx="6" cy="12" r="3" fill="currentColor" />
          <circle cx="18" cy="7" r="3" fill="currentColor" />
          <circle cx="18" cy="17" r="3" fill="currentColor" />
          <path d="M6 12l12-5M6 12l12 5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );

    // ── 24. You.com ───────────────────────────────────────────────────────────
    case 'you_com':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} shrink-0 text-[#00D2B4]`}
          aria-label="You.com"
          role="img"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-2h-2v2zm2-4h-2V7h2v6z"
            fill="currentColor"
          />
        </svg>
      );

    // ── 25. BYOK / Custom Key ─────────────────────────────────────────────────
    case 'byok':
      return (
        <div className={`${className} shrink-0 flex items-center justify-center text-brand-primary`}>
          <Key className="w-full h-full" />
        </div>
      );

    // ── Fallback Generic Provider Glyph ───────────────────────────────────────
    default:
      return (
        <div className={`${className} shrink-0 flex items-center justify-center text-brand-primary`}>
          <Sparkles className="w-full h-full" />
        </div>
      );
  }
};

export default ModelProviderLogo;
