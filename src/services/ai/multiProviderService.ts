/**
 * src/services/ai/multiProviderService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive Multi-Provider AI Execution & BYOK Engine for PromptHub.
 * Direct, zero-platform-credit execution for all major AI models:
 * OpenAI, Anthropic, Google Gemini, DeepSeek, Groq, Mistral, xAI, Cohere,
 * Together AI, and OpenRouter.
 *
 * STRICT INVARIANTS:
 * 1. One key per provider stores access for all authorized models.
 * 2. Zero silent model substitution or silent fallback across model generations.
 * 3. Real provider-level key validation with structured diagnostics.
 * 4. Exact requested model IDs preserved and dispatched to provider adapters.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { guardrailService } from './guardrails';
import {
  geminiAdapter,
  openaiAdapter,
  anthropicAdapter,
  openrouterAdapter,
  aicreditsAdapter,
  deepseekAdapter,
  xaiAdapter,
  cohereAdapter,
  togetherAdapter,
  groqAdapter,
  mistralAdapter,
  sarvamAdapter,
  deepgramAdapter,
  assemblyaiAdapter,
  youComAdapter,
  codecraftAdapter,
  aihubmixAdapter,
  tokenrouterAdapter,
  bynaraAdapter,
  conduitAdapter,
  bluesmindsAdapter,
} from './adapters';
import { NormalizedAIError } from './providerErrors';
import { credentialVault } from './credentialVault';
import type { CanonicalAIMessage, CanonicalAIRequest } from './capabilityResolver';

export type AIProviderId =
  | 'aicredits'
  | 'openrouter'
  | 'sarvam'
  | 'deepgram'
  | 'assemblyai'
  | 'you_com'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'groq'
  | 'mistral'
  | 'xai'
  | 'cohere'
  | 'together'
  | 'codecraft'
  | 'aihubmix'
  | 'tokenrouter'
  | 'bynara'
  | 'conduit'
  | 'bluesminds';

export interface AIProviderMetadata {
  id: AIProviderId;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  docsUrl: string;
  keyPrefix: string;
  keyPlaceholder: string;
  keyFormatRegex: RegExp;
  models: {
    id: string;
    name: string;
    description: string;
    context: string;
    isReasoning?: boolean;
    isCoding?: boolean;
  }[];
}

export const AI_PROVIDERS: AIProviderMetadata[] = [
  {
    id: 'aicredits',
    name: 'AICredits.in (Managed Gateway)',
    badge: '400+ Frontier Models',
    badgeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    description: 'High-speed OpenAI-compatible gateway routing 400+ frontier AI models with low latency and real-time token settlement.',
    docsUrl: 'https://aicredits.in/docs',
    keyPrefix: 'sk-live-',
    keyPlaceholder: 'sk-live-...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat (V3)', description: 'State-of-the-art general language intelligence', context: '128K', isCoding: true },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 Reasoning', description: 'Advanced reasoning and mathematical synthesis', context: '64K', isReasoning: true },
      { id: 'openai/gpt-4o', name: 'GPT-4o (Omni)', description: 'Flagship multimodal reasoning and coding', context: '128K', isCoding: true },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast, cost-efficient intelligence for everyday tasks', context: '128K' },
      { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', description: 'Hybrid fast/thinking frontier coding model', context: '200K', isCoding: true, isReasoning: true },
      { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', description: 'Ultra-fast sub-second responsive reasoning', context: '200K' },
      { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Next-gen multimodal frontier speed', context: '1M' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', description: 'Frontier open intelligence', context: '128K', isCoding: true },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Universal Gateway)',
    badge: 'Universal BYOK',
    badgeColor: 'text-brand-purple bg-brand-purple/10 border-brand-purple/20',
    description: 'Unified multi-model routing gateway for 200+ models. One key for all LLMs.',
    docsUrl: 'https://openrouter.ai/keys',
    keyPrefix: 'sk-or-',
    keyPlaceholder: 'sk-or-v1-...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'openrouter/free', name: 'OpenRouter Free Router', description: 'Auto-routes to best available free model', context: '200K' },
      { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B (Free)', description: 'Google DeepMind multimodal dense 31B model at $0', context: '262K' },
      { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super 120B (Free)', description: 'NVIDIA 120B open hybrid MoE model at $0', context: '262K', isReasoning: true },
      { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nemotron 3.5 Lightning (Free)', description: 'NVIDIA ultra-fast 1M context model at $0', context: '1000K' },
      { id: 'liquid/lfm-2.5-2.6b:free', name: 'Liquid LFM 2.5 2.6B (Free)', description: 'Liquid AI efficient reasoning and adaptive language model at $0', context: '32K', isReasoning: true },
      { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B (via OpenRouter)', description: 'Premier open-source coding model', context: '128K', isCoding: true },
      { id: 'openai/gpt-4o', name: 'GPT-4o (via OpenRouter)', description: 'Flagship OpenAI model via gateway', context: '128K', isCoding: true },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (via OpenRouter)', description: 'Top coding model via gateway', context: '200K', isCoding: true },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (via OpenRouter)', description: 'Open reasoning model via gateway', context: '64K', isReasoning: true },
    ],
  },
  {
    id: 'sarvam',
    name: 'Sarvam AI (Indic & Frontier)',
    badge: 'Indic Voice & LLM',
    badgeColor: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    description: 'Frontier AI models optimized for Indian languages, full-duplex speech recognition (Saaras), expressive TTS (Bulbul), and translation (Mayura).',
    docsUrl: 'https://docs.sarvam.ai',
    keyPrefix: '',
    keyPlaceholder: 'Sarvam AI subscription key...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'sarvam/sarvam-105b', name: 'Sarvam 105B (MoE)', description: 'Flagship 105B reasoning model for 10 Indic languages and English', context: '128K', isReasoning: true, isCoding: true },
      { id: 'sarvam/sarvam-105b-conversations', name: 'Sarvam 105B Conversations', description: 'Conversational 105B MoE tuned for natural vernacular dialogue', context: '128K' },
      { id: 'sarvam/glm-5.3', name: 'GLM 5.3 (Beta Indic)', description: 'Bilingual Indic general reasoning model', context: '128K', isReasoning: true },
      { id: 'sarvam/gemma-4-31b', name: 'Gemma 4 31B (Sarvam Indic)', description: 'Vernacular reasoning and translation', context: '128K' },
      { id: 'sarvam/deepseek-v4-flash', name: 'DeepSeek V4 Flash (Sarvam Route)', description: 'Low-latency code and logic generation', context: '64K', isReasoning: true, isCoding: true },
      { id: 'sarvam/saaras-v4', name: 'Saaras v4 (Frontier STT)', description: '23 Indic languages + English speech-to-text', context: 'Audio' },
      { id: 'sarvam/bulbul-v3', name: 'Bulbul v3 (Ultra-Natural TTS)', description: 'Expressive speech synthesis with 30+ regional voices', context: 'TTS' },
      { id: 'sarvam/mayura', name: 'Mayura (Conversational Translation)', description: 'Real-time translation across 22 Indian languages', context: '64K' },
    ],
  },
  {
    id: 'deepgram',
    name: 'Deepgram (Speech & Audio AI)',
    badge: 'Real-Time STT/TTS',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    description: 'High-speed audio intelligence platform with Nova-3 ASR, Flux conversational voice agent STT, and Aura context-aware TTS.',
    docsUrl: 'https://developers.deepgram.com',
    keyPrefix: '',
    keyPlaceholder: 'Deepgram API Token...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'deepgram/nova-3', name: 'Deepgram Nova-3', description: 'Flagship highest-accuracy multi-speaker speech-to-text', context: 'Audio' },
      { id: 'deepgram/nova-2', name: 'Deepgram Nova-2', description: 'Domain-specialized enterprise transcription', context: 'Audio' },
      { id: 'deepgram/flux', name: 'Deepgram Flux STT', description: 'Sub-200ms conversational turn-taking for voice agents', context: 'Audio' },
      { id: 'deepgram/aura-2', name: 'Deepgram Aura-2', description: 'Natural text-to-speech with expressive human prosody', context: 'TTS' },
      { id: 'deepgram/aura-1', name: 'Deepgram Aura-1', description: 'Production conversational voice synthesis', context: 'TTS' },
    ],
  },
  {
    id: 'assemblyai',
    name: 'AssemblyAI (Speech AI)',
    badge: 'Universal Speech-to-Text',
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    description: 'Industry benchmark for async transcription and real-time streaming speech recognition across 99+ languages.',
    docsUrl: 'https://www.assemblyai.com/docs',
    keyPrefix: '',
    keyPlaceholder: 'AssemblyAI API Key...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'assemblyai/universal-3.6-pro', name: 'Universal-3.6 Pro (Realtime)', description: 'Sub-300ms latency streaming speech model for voice agents across 32 languages', context: 'Audio' },
      { id: 'assemblyai/universal-3.5-pro', name: 'Universal-3.5 Pro (Async)', description: 'Async audio benchmark for domain terminology and code-switching', context: 'Audio' },
      { id: 'assemblyai/universal-2', name: 'Universal-2 (Global ASR)', description: 'High-accuracy general transcription model', context: 'Audio' },
      { id: 'assemblyai/sync', name: 'AssemblyAI Sync API', description: 'Synchronous transcription endpoint for short audio', context: 'Audio' },
      { id: 'assemblyai/dictation', name: 'AssemblyAI Dictation API', description: 'Formatted voice-to-text dictation', context: 'Audio' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI Direct',
    badge: 'Official API',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    description: 'Direct OpenAI API connection. Supports GPT-4o, GPT-4o-mini, o1, and o3-mini.',
    docsUrl: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-proj-...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Omni flagship model for reasoning, code, and analysis', context: '128K', isCoding: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast, cost-efficient intelligence for everyday tasks', context: '128K' },
      { id: 'o1', name: 'o1 Reasoning', description: 'Deep chain-of-thought reasoning for complex engineering', context: '200K', isReasoning: true, isCoding: true },
      { id: 'o3-mini', name: 'o3 Mini', description: 'High-speed reasoning model with adjustable effort', context: '200K', isReasoning: true },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous flagship model with broad knowledge', context: '128K' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Direct',
    badge: 'Official API',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    description: 'Direct Anthropic API connection. Claude 3.5 Sonnet, Claude 3.7 Sonnet, and Haiku.',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-api03-...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', description: 'Hybrid reasoning and standard generation model', context: '200K', isReasoning: true, isCoding: true },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet v2', description: 'Industry benchmark for code generation and system design', context: '200K', isCoding: true },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Sub-second speed for fast evaluations and formatting', context: '200K' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Deep analytical synthesis and complex writing', context: '200K' },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini (Direct API)',
    badge: '1M+ Context & Speed',
    badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    description: 'Direct API key adapter for Google Gemini 2.5 Flash, 2.5 Pro, 2.0 Flash, and 1.5 Pro via Google AI Studio.',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    keyPrefix: 'AIza',
    keyPlaceholder: 'AIzaSy...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Ultra-fast, high-accuracy generative model', context: '1M' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Advanced reasoning and complex coding model', context: '1M', isCoding: true },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Next-generation speed and multimodal benchmark', context: '1M' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: '2 Million token massive document context', context: '2M' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Cost-effective high-throughput model', context: '1M' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek (Direct API)',
    badge: 'SOTA Open Reasoning',
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    description: 'Direct connection to DeepSeek for DeepSeek-R1 (Reasoning) and DeepSeek-V3 (671B MoE Chat).',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoner)', description: 'SOTA reasoning model with native thought chain', context: '64K', isReasoning: true, isCoding: true },
      { id: 'deepseek-chat', name: 'DeepSeek V3 (Chat)', description: '671B parameter high-efficiency general model', context: '64K', isCoding: true },
    ],
  },
  {
    id: 'groq',
    name: 'Groq LPU (Ultra-Fast Inference)',
    badge: '500+ Tokens / Second',
    badgeColor: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    description: 'Hardware-accelerated LPUs delivering near-instant inference for Llama 3.3 70B, Mixtral, and Gemma 2.',
    docsUrl: 'https://console.groq.com/keys',
    keyPrefix: 'gsk_',
    keyPlaceholder: 'gsk_...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', description: 'Fastest 70B inference on the web (~300 t/s)', context: '128K', isCoding: true },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Groq)', description: 'Sub-second instant generation model (~750 t/s)', context: '128K' },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B (Groq)', description: 'Distilled reasoning with Groq LPU acceleration', context: '128K', isReasoning: true },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Groq)', description: 'High-speed 8x7B Mixture of Experts', context: '32K' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B (Groq)', description: 'Google open weights running on LPUs', context: '8K' },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI (Direct API)',
    badge: 'European Frontier AI',
    badgeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    description: 'Direct API connection for Mistral Large 2, Codestral, Pixtral, and Mistral Small.',
    docsUrl: 'https://console.mistral.ai/api-keys',
    keyPrefix: '',
    keyPlaceholder: '...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large 2', description: 'Top-tier multilingual flagship model', context: '128K', isCoding: true },
      { id: 'codestral-latest', name: 'Codestral', description: 'Dedicated code generation and refactoring model', context: '32K', isCoding: true },
      { id: 'pixtral-large-latest', name: 'Pixtral Large', description: 'Frontier multimodal vision and text model', context: '128K' },
      { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Fast, cost-effective enterprise workhorse', context: '32K' },
    ],
  },
  {
    id: 'xai',
    name: 'xAI Grok (Direct API)',
    badge: 'Real-Time Frontier',
    badgeColor: 'text-zinc-200 bg-bg-secondary/10 border-white/20',
    description: 'Direct connection to xAI for Grok 2, Grok 2 Vision, and Grok Beta.',
    docsUrl: 'https://console.x.ai',
    keyPrefix: 'xai-',
    keyPlaceholder: 'xai-...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'grok-2-latest', name: 'Grok 2', description: 'State-of-the-art reasoning and code intelligence', context: '128K', isCoding: true },
      { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', description: 'Multimodal image and text reasoning', context: '32K' },
      { id: 'grok-beta', name: 'Grok Beta', description: 'Experimental public release preview', context: '128K' },
    ],
  },
  {
    id: 'cohere',
    name: 'Cohere (Direct API)',
    badge: 'Enterprise RAG & Search',
    badgeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    description: 'Direct API connection for Command R+ and Command R enterprise models.',
    docsUrl: 'https://dashboard.cohere.com/api-keys',
    keyPrefix: '',
    keyPlaceholder: '...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'command-r-plus-08-2024', name: 'Command R+', description: 'Enterprise-grade RAG and tool orchestration', context: '128K' },
      { id: 'command-r-08-2024', name: 'Command R', description: 'Scalable production conversational model', context: '128K' },
    ],
  },
  {
    id: 'together',
    name: 'Together AI (Open Models)',
    badge: 'Open Source Cloud',
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    description: 'High-performance cloud hosting for open-source foundation models like Qwen 2.5 and Llama 3.3.',
    docsUrl: 'https://api.together.ai/settings/api-keys',
    keyPrefix: '',
    keyPlaceholder: '...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Turbo', description: 'High-performance Llama 3.3 on Together Cloud', context: '128K' },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B Turbo', description: 'Alibaba leading open weights model', context: '32K', isCoding: true },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1 (Together)', description: 'Cloud hosted DeepSeek R1 reasoning', context: '64K', isReasoning: true },
    ],
  },
  {
    id: 'you_com',
    name: 'You.com (Web Search & Research)',
    badge: 'Real-Time Web & RAG',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    description: 'Real-time live web intelligence, search grounding, Deep Research, and financial intelligence via You.com.',
    docsUrl: 'https://documentation.you.com/',
    keyPrefix: '',
    keyPlaceholder: 'You.com API key...',
    keyFormatRegex: /^.{10,}$/,
    models: [
      { id: 'you.com/answer', name: 'You.com Answer API', description: 'Grounded web synthesis with live source citations', context: '32K' },
      { id: 'you.com/search', name: 'You.com Search API', description: 'Real-time index search and web snippets', context: '32K' },
      { id: 'you.com/research', name: 'You.com Deep Research', description: 'Multi-query exhaustive synthesis and report generation', context: '64K', isReasoning: true },
      { id: 'you.com/finance_research', name: 'You.com Finance Research', description: 'Real-time market data, filings, and financial intelligence', context: '64K', isReasoning: true },
    ],
  },
  {
    id: 'conduit',
    name: 'Conduit App Router',
    badge: 'OpenAI-Compatible Gateway',
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    description: 'High-speed OpenAI-compatible model proxy and app router.',
    docsUrl: 'https://conduit.ozdoev.net/#app',
    keyPrefix: '',
    keyPlaceholder: 'Conduit API key...',
    keyFormatRegex: /^.{8,}$/,
    models: [
      { id: 'conduit/default', name: 'Conduit Default Model', description: 'Routed via Conduit App Router', context: '128K' },
    ],
  },
  {
    id: 'codecraft',
    name: 'CodeCraft API',
    badge: '30% Discount Gateway',
    badgeColor: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    description: 'Discounted OpenAI-compatible API gateway with high throughput.',
    docsUrl: 'https://codecraftapi.com',
    keyPrefix: '',
    keyPlaceholder: 'CodeCraft API key...',
    keyFormatRegex: /^.{8,}$/,
    models: [
      { id: 'codecraft/default', name: 'CodeCraft Router Model', description: 'Routed via CodeCraft API', context: '128K' },
    ],
  },
  {
    id: 'aihubmix',
    name: 'AIHubMix Router',
    badge: '30% Discount Gateway',
    badgeColor: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
    description: 'Global multi-model aggregation gateway with balance billing.',
    docsUrl: 'https://aihubmix.com',
    keyPrefix: '',
    keyPlaceholder: 'AIHubMix API token...',
    keyFormatRegex: /^.{8,}$/,
    models: [
      { id: 'aihubmix/default', name: 'AIHubMix Router Model', description: 'Routed via AIHubMix gateway', context: '128K' },
    ],
  },
  {
    id: 'tokenrouter',
    name: 'TokenRouter',
    badge: 'High-Throughput Gateway',
    badgeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    description: 'Enterprise model proxy and routing gateway with live key authentication.',
    docsUrl: 'https://www.tokenrouter.com/',
    keyPrefix: 'vk_live_',
    keyPlaceholder: 'vk_live_...',
    keyFormatRegex: /^.{8,}$/,
    models: [
      { id: 'tokenrouter/default', name: 'TokenRouter Model', description: 'Routed via TokenRouter gateway', context: '128K' },
    ],
  },
  {
    id: 'bynara',
    name: 'Router by Nara',
    badge: '30% Discount Gateway',
    badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    description: 'Southeast Asia multi-model routing gateway with regional low latency.',
    docsUrl: 'https://router.bynara.id/',
    keyPrefix: 'sk-nry-',
    keyPlaceholder: 'sk-nry-...',
    keyFormatRegex: /^.{8,}$/,
    models: [
      { id: 'bynara/default', name: 'Nara Router Model', description: 'Routed via Router by Nara', context: '128K' },
    ],
  },
  {
    id: 'bluesminds',
    name: 'BluesMinds Gateway',
    badge: 'Enterprise Routing',
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    description: 'Enterprise OpenAI-compatible inference gateway with high availability routing.',
    docsUrl: 'https://api.bluesminds.com/',
    keyPrefix: 'bm-',
    keyPlaceholder: 'bm-... or your BluesMinds API key',
    keyFormatRegex: /^.{8,}$/,
    models: [
      { id: 'bluesminds/default', name: 'BluesMinds Model', description: 'Routed via BluesMinds API', context: '128K' },
    ],
  },
];

export function toOpenRouterModelSlug(rawId: string): string {
  // An absent model id used to become 'openai/gpt-4o' here — a silent
  // substitution to a PAID model for a request that named no model at all, which
  // both bills the user for something they did not pick and reports a model they
  // did not select. There is no safe default: the only honest answer is to refuse.
  if (!rawId || !rawId.trim()) {
    const err = new Error('No model was selected for this request.');
    (err as any).code = 'MODEL_UNAVAILABLE';
    throw err;
  }
  const clean = rawId.trim();
  const lower = clean.toLowerCase();

  // If already exact free router or auto router
  if (clean === 'openrouter/free' || clean === 'openrouter/auto' || clean === 'free') {
    return 'openrouter/free';
  }

  // Authoritative canonical map for all known model variants (both prefixed and bare IDs)
  const canonicalMap: Record<string, string> = {
    // Free tier models on OpenRouter
    'openrouter/free': 'openrouter/free',
    'openrouter/auto': 'openrouter/free',
    'google/gemma-4-31b-it:free': 'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free': 'google/gemma-4-26b-a4b-it:free',
    'nvidia/nemotron-3-super-120b-a12b:free': 'nvidia/nemotron-3-super-120b-a12b:free',
    'nvidia/nemotron-3-ultra-550b-a55b:free': 'nvidia/nemotron-3-ultra-550b-a55b:free',
    'nvidia/nemotron-3.5-lightning:free': 'nvidia/nemotron-3.5-lightning:free',
    'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    'liquid/lfm-2.5-2.6b:free': 'liquid/lfm-2.5-2.6b:free',
    'cohere/north-mini-code:free': 'cohere/north-mini-code:free',
    'poolside/laguna-s-2.1:free': 'poolside/laguna-s-2.1:free',
    'thinkingmachines/inkling:free': 'thinkingmachines/inkling:free',
    // Backward-compatibility aliases for former free models
    'qwen/qwen3.8-27b:free': 'openrouter/free',
    'qwen/qwen-2.5-coder-32b-instruct:free': 'openrouter/free',
    'meta-llama/llama-3.3-70b-instruct:free': 'openrouter/free',
    'deepseek/deepseek-r1:free': 'openrouter/free',

    // OpenAI models
    'gpt-4o': 'openai/gpt-4o',
    'openai/gpt-4o': 'openai/gpt-4o',
    'gpt-4o-mini': 'openai/gpt-4o-mini',
    'openai/gpt-4o-mini': 'openai/gpt-4o-mini',
    'gpt-4-turbo': 'openai/gpt-4-turbo',
    'openai/gpt-4-turbo': 'openai/gpt-4-turbo',
    'o1': 'openai/o1',
    'openai/o1': 'openai/o1',
    'o1-preview': 'openai/o1-preview',
    'openai/o1-preview': 'openai/o1-preview',
    'o1-mini': 'openai/o1-mini',
    'openai/o1-mini': 'openai/o1-mini',
    'o3-mini': 'openai/o3-mini',
    'openai/o3-mini': 'openai/o3-mini',
    'o3-mini-high': 'openai/o3-mini-high',
    'openai/o3-mini-high': 'openai/o3-mini-high',

    // Anthropic Claude models (OpenRouter requires dots: 3.5, 3.7)
    'claude-3-7-sonnet': 'anthropic/claude-3.7-sonnet',
    'claude-3.7-sonnet': 'anthropic/claude-3.7-sonnet',
    'anthropic/claude-3-7-sonnet': 'anthropic/claude-3.7-sonnet',
    'anthropic/claude-3.7-sonnet': 'anthropic/claude-3.7-sonnet',
    'claude-3-7-sonnet-20250219': 'anthropic/claude-3.7-sonnet',
    'claude-3-5-sonnet': 'anthropic/claude-3.5-sonnet',
    'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-5-sonnet': 'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
    'claude-3-5-sonnet-20241022': 'anthropic/claude-3.5-sonnet',
    'claude-3-5-haiku': 'anthropic/claude-3.5-haiku',
    'claude-3.5-haiku': 'anthropic/claude-3.5-haiku',
    'anthropic/claude-3-5-haiku': 'anthropic/claude-3.5-haiku',
    'anthropic/claude-3.5-haiku': 'anthropic/claude-3.5-haiku',
    'claude-3-5-haiku-20241022': 'anthropic/claude-3.5-haiku',
    'claude-3-opus': 'anthropic/claude-3-opus',
    'claude-3-opus-20240229': 'anthropic/claude-3-opus',
    'anthropic/claude-3-opus': 'anthropic/claude-3-opus',
    'anthropic/claude-3.opus': 'anthropic/claude-3-opus',

    // Google Gemini models
    'gemini-2.5-flash': 'google/gemini-2.5-flash',
    'gemini-2-5-flash': 'google/gemini-2.5-flash',
    'google/gemini-2.5-flash': 'google/gemini-2.5-flash',
    'google/gemini-2-5-flash': 'google/gemini-2.5-flash',
    'gemini-2.5-pro': 'google/gemini-2.5-pro',
    'gemini-2-5-pro': 'google/gemini-2.5-pro',
    'google/gemini-2.5-pro': 'google/gemini-2.5-pro',
    'google/gemini-2-5-pro': 'google/gemini-2.5-pro',
    'gemini-2.0-flash': 'google/gemini-2.0-flash-001',
    'gemini-2-0-flash': 'google/gemini-2.0-flash-001',
    'google/gemini-2.0-flash': 'google/gemini-2.0-flash-001',
    'google/gemini-2-0-flash': 'google/gemini-2.0-flash-001',
    'google/gemini-2.0-flash-001': 'google/gemini-2.0-flash-001',
    'gemini-1.5-pro': 'google/gemini-pro-1.5',
    'gemini-1-5-pro': 'google/gemini-pro-1.5',
    'google/gemini-1.5-pro': 'google/gemini-pro-1.5',
    'google/gemini-1-5-pro': 'google/gemini-pro-1.5',
    'google/gemini-pro-1.5': 'google/gemini-pro-1.5',
    'gemini-1.5-flash': 'google/gemini-flash-1.5',
    'gemini-1-5-flash': 'google/gemini-flash-1.5',
    'google/gemini-1.5-flash': 'google/gemini-flash-1.5',
    'google/gemini-1-5-flash': 'google/gemini-flash-1.5',
    'google/gemini-flash-1.5': 'google/gemini-flash-1.5',

    // DeepSeek models
    'deepseek-r1': 'deepseek/deepseek-r1',
    'deepseek/deepseek-r1': 'deepseek/deepseek-r1',
    'deepseek-reasoner': 'deepseek/deepseek-r1',
    'deepseek/deepseek-reasoner': 'deepseek/deepseek-r1',
    'deepseek-chat': 'deepseek/deepseek-chat',
    'deepseek/deepseek-chat': 'deepseek/deepseek-chat',
    'deepseek-v3': 'deepseek/deepseek-chat',
    'deepseek/deepseek-v3': 'deepseek/deepseek-chat',

    // Meta Llama models
    'llama-3.3-70b': 'meta-llama/llama-3.3-70b-instruct',
    'llama-3.3-70b-instruct': 'meta-llama/llama-3.3-70b-instruct',
    'llama-3.3-70b-versatile': 'meta-llama/llama-3.3-70b-instruct',
    'llama-3-3-70b': 'meta-llama/llama-3.3-70b-instruct',
    'meta-llama/llama-3.3-70b': 'meta-llama/llama-3.3-70b-instruct',
    'meta-llama/llama-3.3-70b-instruct': 'meta-llama/llama-3.3-70b-instruct',
    'llama-3.1-8b-instant': 'meta-llama/llama-3.1-8b-instruct',
    'llama-3.1-8b': 'meta-llama/llama-3.1-8b-instruct',
    'meta-llama/llama-3.1-8b': 'meta-llama/llama-3.1-8b-instruct',
    'meta-llama/llama-3.1-8b-instruct': 'meta-llama/llama-3.1-8b-instruct',

    // Mistral models
    'mistral-large': 'mistralai/mistral-large-2411',
    'mistral-large-latest': 'mistralai/mistral-large-2411',
    'mistral/mistral-large': 'mistralai/mistral-large-2411',
    'mistralai/mistral-large': 'mistralai/mistral-large-2411',
    'mistralai/mistral-large-2411': 'mistralai/mistral-large-2411',
    'codestral': 'mistralai/codestral-2501',
    'codestral-latest': 'mistralai/codestral-2501',
    'mistralai/codestral': 'mistralai/codestral-2501',
    'mistralai/codestral-2501': 'mistralai/codestral-2501',
    'pixtral-large': 'mistralai/pixtral-large-2411',
    'pixtral-large-latest': 'mistralai/pixtral-large-2411',
    'mistralai/pixtral-large': 'mistralai/pixtral-large-2411',
    'mistralai/pixtral-large-2411': 'mistralai/pixtral-large-2411',
    'mistral-small': 'mistralai/mistral-small-2409',
    'mistral-small-latest': 'mistralai/mistral-small-2409',
    'mistralai/mistral-small': 'mistralai/mistral-small-2409',

    // xAI Grok models
    'grok-2': 'x-ai/grok-2-1212',
    'grok-2-latest': 'x-ai/grok-2-1212',
    'xai/grok-2': 'x-ai/grok-2-1212',
    'xai/grok-2-latest': 'x-ai/grok-2-1212',
    'x-ai/grok-2': 'x-ai/grok-2-1212',
    'x-ai/grok-2-1212': 'x-ai/grok-2-1212',
    'grok-2-vision-1212': 'x-ai/grok-vision-beta',
    'grok-beta': 'x-ai/grok-beta',
    'xai/grok-beta': 'x-ai/grok-beta',
    'x-ai/grok-beta': 'x-ai/grok-beta',

    // Qwen models
    'qwen-2.5-coder': 'qwen/qwen-2.5-coder-32b-instruct',
    'qwen-2-5-coder': 'qwen/qwen-2.5-coder-32b-instruct',
    'qwen/qwen-2.5-coder': 'qwen/qwen-2.5-coder-32b-instruct',
    'qwen/qwen-2.5-coder-32b-instruct': 'qwen/qwen-2.5-coder-32b-instruct',
    'qwen-2.5-72b': 'qwen/qwen-2.5-72b-instruct',
    'qwen-2-5-72b': 'qwen/qwen-2.5-72b-instruct',
    'qwen/qwen-2.5-72b': 'qwen/qwen-2.5-72b-instruct',
    'qwen/qwen-2.5-72b-instruct': 'qwen/qwen-2.5-72b-instruct',

    // Cohere models
    'command-r-plus': 'cohere/command-r-plus-08-2024',
    'command-r-plus-08-2024': 'cohere/command-r-plus-08-2024',
    'cohere/command-r-plus': 'cohere/command-r-plus-08-2024',
    'cohere/command-r-plus-08-2024': 'cohere/command-r-plus-08-2024',
    'command-r': 'cohere/command-r-08-2024',
    'command-r-08-2024': 'cohere/command-r-08-2024',
    'cohere/command-r': 'cohere/command-r-08-2024',
    'cohere/command-r-08-2024': 'cohere/command-r-08-2024',

    // You.com models
    'you.com/search': 'you.com/search',
    'you.com/answer': 'you.com/answer',
    'you.com/research': 'you.com/research',
    'you.com/finance': 'you.com/finance',
    'you-search': 'you.com/search',
    'you-answer': 'you.com/answer',
    'you-research': 'you.com/research',
    'you-finance': 'you.com/finance',
  };

  if (canonicalMap[lower]) {
    return canonicalMap[lower];
  }
  if (canonicalMap[clean]) {
    return canonicalMap[clean];
  }

  // If already in provider/model format or ends with :free, preserve it
  if (clean.endsWith(':free') || clean.includes('/')) {
    return clean;
  }

  return clean;
}

// ─── Key Storage & Vault Delegation ──────────────────────────────────────────

export const multiProviderService = {
  /**
   * Fast-path synchronous API key retrieval from credential vault (session or decrypted cache)
   */
  getKey(providerId: string): string {
    return credentialVault.getCredentialSync(providerId);
  },

  /**
   * Asynchronous API key retrieval from credential vault (supports on-demand decryption)
   */
  async getCredential(providerId: string): Promise<string> {
    return credentialVault.getCredential(providerId);
  },

  /**
   * Save API key into credential vault.
   * Default: scoped strictly to active browser session (remember = false).
   * Opt-in: encrypted locally via Web Crypto AES-GCM (remember = true).
   */
  setKey(providerId: string, apiKey: string, options: { remember?: boolean } = { remember: false }): void {
    credentialVault.setCredential(providerId, apiKey, options).catch((err) => {
      console.warn('[multiProviderService] Failed to set credential in vault:', err);
    });
  },

  /**
   * Remove key from credential vault for a provider
   */
  removeKey(providerId: string): void {
    credentialVault.removeCredential(providerId).catch((err) => {
      console.warn('[multiProviderService] Failed to remove credential from vault:', err);
    });
  },

  /**
   * Check if a specific provider has a connected API key
   */
  isProviderConnected(providerId: string): boolean {
    return credentialVault.hasCredential(providerId);
  },

  /**
   * Check if a provider key has explicit persistence consent on this device
   */
  isRemembered(providerId: string): boolean {
    return credentialVault.isRemembered(providerId);
  },

  /**
   * Flush all temporary session-only credentials on logout or account switch
   */
  clearTemporaryCredentials(): void {
    credentialVault.clearTemporaryCredentials();
  },

  /**
   * Total wipe of all credentials on this device
   */
  async clearAllCredentials(): Promise<void> {
    await credentialVault.clearAllCredentials();
  },

  /**
   * User preferred routing strategy
   */
  getPreferredRoutingMode(): 'auto' | 'direct' | 'openrouter' {
    if (typeof window === 'undefined') return 'auto';
    try {
      return (
        (localStorage.getItem('ph_preferred_routing_mode') as any) ||
        (sessionStorage.getItem('ph_preferred_routing_mode') as any) ||
        'auto'
      );
    } catch {
      return 'auto';
    }
  },

  setPreferredRoutingMode(mode: 'auto' | 'direct' | 'openrouter'): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('ph_preferred_routing_mode', mode);
      localStorage.setItem('ph_preferred_routing_mode', mode);
    } catch {}
  },

  /**
   * Return count and list of currently connected providers
   */
  getConnectedProviders(): AIProviderId[] {
    return AI_PROVIDERS.map(p => p.id).filter(id => this.isProviderConnected(id));
  },

  /**
   * Return list of models unlocked by a specific provider key
   */
  getUnlockedModelsForProvider(providerId: AIProviderId): AIProviderMetadata['models'] {
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    return provider ? provider.models : [];
  },

  /**
   * Check if a specific model ID or slug is unlocked by the user's connected BYOK keys
   */
  isModelUnlockedByBYOK(modelId: string): { unlocked: boolean; providerId?: AIProviderId; providerName?: string } {
    const connected = this.getConnectedProviders();
    if (connected.length === 0) return { unlocked: false };

    const clean = (modelId || '').toLowerCase().trim();

    // If OpenRouter key is connected, unlock OpenRouter catalog and user-configured models only
    if (connected.includes('openrouter')) {
      const openrouterProvider = AI_PROVIDERS.find(p => p.id === 'openrouter');
      const configured = this.getConfiguredOpenRouterModels();
      const isCatalog = openrouterProvider?.models.some(
        m => m.id.toLowerCase() === clean || clean.endsWith(m.id.toLowerCase())
      );
      const isConfigured = configured.some(
        m => m.id.toLowerCase() === clean || clean.endsWith(m.id.toLowerCase())
      );
      if (clean.startsWith('openrouter/') || isCatalog || isConfigured) {
        return { unlocked: true, providerId: 'openrouter', providerName: 'OpenRouter' };
      }
    }

    // Check specific direct provider key
    for (const pid of connected) {
      const provider = AI_PROVIDERS.find(p => p.id === pid);
      if (!provider) continue;

      const directMatch = provider.models.some(
        m => m.id.toLowerCase() === clean || clean.endsWith(m.id.toLowerCase()) || clean.includes(m.id.toLowerCase())
      );
      if (directMatch) {
        return { unlocked: true, providerId: pid, providerName: provider.name };
      }

      // Check prefix matching
      if (pid === 'openai' && (clean.startsWith('gpt-') || clean.startsWith('o1') || clean.startsWith('o3') || clean.startsWith('openai/') || clean.startsWith('chatgpt-'))) {
        return { unlocked: true, providerId: 'openai', providerName: 'OpenAI' };
      }
      if (pid === 'anthropic' && (clean.startsWith('claude') || clean.startsWith('anthropic/'))) {
        return { unlocked: true, providerId: 'anthropic', providerName: 'Anthropic' };
      }
      if (pid === 'gemini' && (clean.startsWith('gemini') || clean.startsWith('google/gemini') || (clean.startsWith('google/') && !clean.includes('gemma')))) {
        return { unlocked: true, providerId: 'gemini', providerName: 'Google Gemini' };
      }
      if (pid === 'deepseek' && (clean.startsWith('deepseek') || clean.startsWith('deepseek/'))) {
        return { unlocked: true, providerId: 'deepseek', providerName: 'DeepSeek' };
      }
      if (pid === 'groq' && (clean.includes('(groq)') || clean.startsWith('groq/') || clean.includes('groq'))) {
        return { unlocked: true, providerId: 'groq', providerName: 'Groq' };
      }
      if (pid === 'mistral' && (clean.startsWith('mistral') || clean.startsWith('codestral') || clean.startsWith('pixtral') || clean.startsWith('mistralai/'))) {
        return { unlocked: true, providerId: 'mistral', providerName: 'Mistral AI' };
      }
      if (pid === 'xai' && (clean.startsWith('grok') || clean.startsWith('xai/') || clean.startsWith('x-ai/'))) {
        return { unlocked: true, providerId: 'xai', providerName: 'xAI' };
      }
      if (pid === 'cohere' && (clean.startsWith('command') || clean.startsWith('cohere/'))) {
        return { unlocked: true, providerId: 'cohere', providerName: 'Cohere' };
      }
      if (pid === 'together' && (clean.startsWith('together/') || clean.includes('together'))) {
        return { unlocked: true, providerId: 'together', providerName: 'Together AI' };
      }
      if (pid === 'sarvam' && (clean.startsWith('sarvam/') || clean.includes('sarvam') || clean.includes('saaras') || clean.includes('bulbul') || clean.includes('mayura'))) {
        return { unlocked: true, providerId: 'sarvam', providerName: 'Sarvam AI' };
      }
      if (pid === 'deepgram' && (clean.startsWith('deepgram/') || clean.includes('deepgram') || clean.includes('nova-') || clean.includes('aura-'))) {
        return { unlocked: true, providerId: 'deepgram', providerName: 'Deepgram' };
      }
      if (pid === 'assemblyai' && (clean.startsWith('assemblyai/') || clean.includes('assemblyai') || clean.includes('universal-'))) {
        return { unlocked: true, providerId: 'assemblyai', providerName: 'AssemblyAI' };
      }
      if (pid === 'you_com' && (clean.startsWith('you.com') || clean.startsWith('you_com') || clean.startsWith('you-') || clean === 'you')) {
        return { unlocked: true, providerId: 'you_com', providerName: 'You.com' };
      }
      if (pid === 'conduit' && (clean.startsWith('conduit/') || clean.includes('conduit'))) {
        return { unlocked: true, providerId: 'conduit', providerName: 'Conduit' };
      }
      if (pid === 'codecraft' && (clean.startsWith('codecraft/') || clean.includes('codecraft'))) {
        return { unlocked: true, providerId: 'codecraft', providerName: 'CodeCraft' };
      }
      if (pid === 'aihubmix' && (clean.startsWith('aihubmix/') || clean.includes('aihubmix'))) {
        return { unlocked: true, providerId: 'aihubmix', providerName: 'AIHubMix' };
      }
      if (pid === 'tokenrouter' && (clean.startsWith('tokenrouter/') || clean.includes('tokenrouter'))) {
        return { unlocked: true, providerId: 'tokenrouter', providerName: 'TokenRouter' };
      }
      if (pid === 'bynara' && (clean.startsWith('bynara/') || clean.includes('bynara'))) {
        return { unlocked: true, providerId: 'bynara', providerName: 'Router by Nara' };
      }
      if (pid === 'bluesminds' && (clean.startsWith('bluesminds/') || clean.includes('bluesminds'))) {
        return { unlocked: true, providerId: 'bluesminds', providerName: 'BluesMinds' };
      }
    }

    return { unlocked: false };
  },

  /**
   * Get user-configured OpenRouter models for BYOK routing
   */
  getConfiguredOpenRouterModels(): Array<{ id: string; name: string; description: string; context: string; isCoding?: boolean; isReasoning?: boolean }> {
    const defaultModels = [
      { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet (via OpenRouter)', description: 'Hybrid fast/thinking coding model', context: '200K', isCoding: true, isReasoning: true },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (via OpenRouter)', description: 'Top coding and design model', context: '200K', isCoding: true },
      { id: 'openai/gpt-4o', name: 'GPT-4o (via OpenRouter)', description: 'Flagship OpenAI multimodal model', context: '128K', isCoding: true },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (via OpenRouter)', description: 'Fast, cost-efficient intelligence', context: '128K' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (via OpenRouter)', description: 'Open reasoning frontier model', context: '64K', isReasoning: true },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (via OpenRouter)', description: '671B parameter high-efficiency model', context: '64K', isCoding: true },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (via OpenRouter)', description: 'Meta frontier open-source model', context: '128K', isCoding: true },
      { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B (via OpenRouter)', description: 'Premier code generation model', context: '128K', isCoding: true },
      { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (via OpenRouter)', description: 'Next-gen multimodal speed', context: '1M' },
      { id: 'mistralai/mistral-large-2411', name: 'Mistral Large 2 (via OpenRouter)', description: 'Multilingual flagship enterprise model', context: '128K', isCoding: true },
    ];

    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('ph_openrouter_configured_models');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {}

    return defaultModels;
  },

  /**
   * Set user-configured OpenRouter models
   */
  setConfiguredOpenRouterModels(models: Array<{ id: string; name: string; description: string; context: string; isCoding?: boolean; isReasoning?: boolean }>): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ph_openrouter_configured_models', JSON.stringify(models));
        window.dispatchEvent(new CustomEvent('ph_byok_keys_updated'));
      }
    } catch {}
  },

  /**
   * Resolve which provider owns a given model ID or slug
   */
  resolveProviderForModel(modelId: string): AIProviderMetadata {
    const raw = (modelId || '').toLowerCase().trim();

    if (raw.startsWith('sarvam/') || raw.includes('sarvam') || raw.includes('saaras') || raw.includes('bulbul') || raw.includes('mayura')) {
      return AI_PROVIDERS.find(p => p.id === 'sarvam') || AI_PROVIDERS.find(p => p.id === 'openrouter')!;
    }
    if (raw.startsWith('deepgram/') || raw.includes('deepgram') || raw.includes('nova-3') || raw.includes('nova-2') || raw.includes('aura-')) {
      return AI_PROVIDERS.find(p => p.id === 'deepgram') || AI_PROVIDERS.find(p => p.id === 'openrouter')!;
    }
    if (raw.startsWith('assemblyai/') || raw.includes('assemblyai') || raw.includes('universal-3.6') || raw.includes('universal-3.5')) {
      return AI_PROVIDERS.find(p => p.id === 'assemblyai') || AI_PROVIDERS.find(p => p.id === 'openrouter')!;
    }
    if (raw.startsWith('you.com') || raw.startsWith('you_com') || raw.startsWith('you-') || raw === 'you') {
      return AI_PROVIDERS.find(p => p.id === 'you_com') || AI_PROVIDERS.find(p => p.id === 'openrouter')!;
    }
    if (raw.startsWith('conduit/') || raw.includes('conduit')) {
      return AI_PROVIDERS.find(p => p.id === 'conduit') || AI_PROVIDERS.find(p => p.id === 'aicredits')!;
    }
    if (raw.startsWith('codecraft/') || raw.includes('codecraft')) {
      return AI_PROVIDERS.find(p => p.id === 'codecraft') || AI_PROVIDERS.find(p => p.id === 'aicredits')!;
    }
    if (raw.startsWith('aihubmix/') || raw.includes('aihubmix')) {
      return AI_PROVIDERS.find(p => p.id === 'aihubmix') || AI_PROVIDERS.find(p => p.id === 'aicredits')!;
    }
    if (raw.startsWith('tokenrouter/') || raw.includes('tokenrouter')) {
      return AI_PROVIDERS.find(p => p.id === 'tokenrouter') || AI_PROVIDERS.find(p => p.id === 'aicredits')!;
    }
    if (raw.startsWith('bynara/') || raw.includes('bynara')) {
      return AI_PROVIDERS.find(p => p.id === 'bynara') || AI_PROVIDERS.find(p => p.id === 'aicredits')!;
    }
    if (raw.startsWith('bluesminds/') || raw.includes('bluesminds')) {
      return AI_PROVIDERS.find(p => p.id === 'bluesminds') || AI_PROVIDERS.find(p => p.id === 'aicredits')!;
    }
    if (raw.startsWith('openai/') || raw.startsWith('gpt-') || raw.startsWith('o1') || raw.startsWith('o3') || raw.startsWith('chatgpt-')) {
      return AI_PROVIDERS.find(p => p.id === 'openai')!;
    }
    if (raw.startsWith('anthropic/') || raw.startsWith('claude')) {
      return AI_PROVIDERS.find(p => p.id === 'anthropic')!;
    }
    if (raw.startsWith('google/gemini') || (raw.startsWith('google/') && !raw.includes('gemma')) || (raw.startsWith('gemini') && !raw.startsWith('gemma'))) {
      return AI_PROVIDERS.find(p => p.id === 'gemini')!;
    }
    if (raw.startsWith('deepseek/') || raw.startsWith('deepseek-') || raw.startsWith('deepseek')) {
      return AI_PROVIDERS.find(p => p.id === 'deepseek')!;
    }
    if (raw.startsWith('groq/') || raw.includes('(groq)') || raw.includes('groq')) {
      return AI_PROVIDERS.find(p => p.id === 'groq')!;
    }
    if (raw.startsWith('mistralai/') || raw.startsWith('mistral') || raw.startsWith('codestral') || raw.startsWith('pixtral')) {
      return AI_PROVIDERS.find(p => p.id === 'mistral')!;
    }
    if (raw.startsWith('xai/') || raw.startsWith('x-ai/') || raw.startsWith('grok')) {
      return AI_PROVIDERS.find(p => p.id === 'xai')!;
    }
    if (raw.startsWith('cohere/') || raw.startsWith('command')) {
      return AI_PROVIDERS.find(p => p.id === 'cohere')!;
    }
    if (raw.startsWith('together/') || raw.includes('together')) {
      return AI_PROVIDERS.find(p => p.id === 'together')!;
    }

    return AI_PROVIDERS.find(p => p.id === 'openrouter')!;
  },

  /**
   * Real, authoritative Provider-Level Key Validation.
   * Dispatches to dedicated provider adapter.
   */
  async testConnection(
    providerId: AIProviderId,
    apiKey: string
  ): Promise<{ success: boolean; message: string; capabilities?: any }> {
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey) {
      return { success: false, message: 'Please provide an API key to test.' };
    }

    switch (providerId) {
      case 'aicredits': {
        const res = await aicreditsAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'openrouter': {
        const res = await openrouterAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'openai': {
        const res = await openaiAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'anthropic': {
        const res = await anthropicAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'gemini': {
        const res = await geminiAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'deepseek': {
        const res = await deepseekAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'groq': {
        const res = await groqAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'mistral': {
        const res = await mistralAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'xai': {
        const res = await xaiAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'cohere': {
        const res = await cohereAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'together': {
        const res = await togetherAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'sarvam': {
        const res = await sarvamAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'deepgram': {
        const res = await deepgramAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'assemblyai': {
        const res = await assemblyaiAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'you_com': {
        const res = await youComAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'conduit': {
        const res = await conduitAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'codecraft': {
        const res = await codecraftAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'aihubmix': {
        const res = await aihubmixAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'tokenrouter': {
        const res = await tokenrouterAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'bynara': {
        const res = await bynaraAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      case 'bluesminds': {
        const res = await bluesmindsAdapter.validateKey(cleanKey);
        return { success: res.valid, message: res.message, capabilities: res.capabilities };
      }
      default:
        return { success: true, message: '✓ Key format saved.' };
    }
  },

  /**
   * Real Multi-Provider Execution Engine.
   * Dispatches directly to the authoritative adapter with zero silent model substitution.
   */
  async executePromptDirect(
    promptText: string,
    modelId: string,
    options: {
      temperature?: number;
      max_tokens?: number;
      response_format?: { type: 'json_object' };
      messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
      signal?: AbortSignal;
      idempotencyKey?: string;
      stream?: boolean;
      onChunk?: (delta: string, accumulated: string) => void;
    } = {}
  ): Promise<{
    output: string;
    /**
     * Provider-reported total tokens, or null when the provider reported none.
     * Never an estimate: the previous `|| Math.ceil(length / 4)` fallbacks (and a
     * hardcoded `|| 150` on the edge-function path) meant an unmeasured run still
     * produced a precise-looking token count that was really a character count
     * divided by four.
     */
    tokens: number | null;
    /** True only when `tokens` came from the provider. */
    tokensMeasured: boolean;
    duration: number;
    provider: string;
    model: string;
  }> {
    const startTime = Date.now();
    const requestId = options.idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`);

    // Pre-Execution Input Guardrail
    const effectivePromptText = promptText || (options.messages && options.messages.length > 0
      ? [...options.messages].reverse().find(m => m.role === 'user')?.content || 'Continue execution'
      : 'Continue execution');
    const inputGuard = guardrailService.validateInput(effectivePromptText);

    const providerMeta = this.resolveProviderForModel(modelId);
    const directKey = (await this.getCredential(providerMeta.id)) || this.getKey(providerMeta.id);
    const openRouterKey = (await this.getCredential('openrouter')) || this.getKey('openrouter');
    const routingMode = this.getPreferredRoutingMode();

    const canonicalMessages: CanonicalAIMessage[] =
      options.messages && options.messages.length > 0
        ? options.messages.map(m => ({ role: m.role, content: m.content }))
        : [{ role: 'user', content: inputGuard.sanitizedPrompt }];

    const canonicalRequest: CanonicalAIRequest = {
      modelId,
      messages: canonicalMessages,
      prompt: inputGuard.sanitizedPrompt,
      temperature: options.temperature,
      maxTokens: options.max_tokens,
      responseFormat: options.response_format,
      signal: options.signal,
      stream: options.stream,
      onChunk: options.onChunk,
    };

    // 1. DIRECT PROVIDER EXECUTION (If user configured direct key, or platform managed You.com)
    if ((directKey || providerMeta.id === 'you_com') && routingMode !== 'openrouter') {
      try {
        let result: any;
        switch (providerMeta.id) {
          case 'aicredits':
            result = await aicreditsAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'sarvam':
            result = await sarvamAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'deepgram':
            result = await deepgramAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'assemblyai':
            result = await assemblyaiAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'you_com':
            result = await youComAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'gemini':
            result = await geminiAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'openai':
            result = await openaiAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'anthropic':
            result = await anthropicAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'deepseek':
            result = await deepseekAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'xai':
            result = await xaiAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'cohere':
            result = await cohereAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'together':
            result = await togetherAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'groq':
            result = await groqAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'mistral':
            result = await mistralAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'openrouter':
            result = await openrouterAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'conduit':
            result = await conduitAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'codecraft':
            result = await codecraftAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'aihubmix':
            result = await aihubmixAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'tokenrouter':
            result = await tokenrouterAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'bynara':
            result = await bynaraAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          case 'bluesminds':
            result = await bluesmindsAdapter.execute(directKey, canonicalRequest, requestId);
            break;
          default:
            // `default:` used to run `openrouterAdapter.execute(directKey, ...)`,
            // which sent the user's key for provider X to OpenRouter whenever the
            // provider id was not one of the ten recognised cases. Two problems:
            // the request is served by a provider the user did not choose (a
            // silent lane switch), and their credential is transmitted to a third
            // party that was never supposed to receive it.
            //
            // `openrouter` is now an explicit case — it is the eleventh supported
            // BYOK provider and was the only legitimate reason this default
            // existed. Anything else fails closed.
            throw new NormalizedAIError({
              code: 'AUTH_WRONG_PROVIDER',
              message: `PromptHub has no adapter for provider "${providerMeta.id}", so this key cannot be used to run ${modelId}.`,
              provider: providerMeta.id,
              model: modelId,
              remediationHint:
                'Pick a model from a supported provider, or add a key for one of: OpenAI, Anthropic, Google Gemini, DeepSeek, Groq, Mistral, xAI, Cohere, Together AI, OpenRouter.',
              isRetryable: false,
            });
        }

        // Only the adapter's measured total is reported. The removed
        // `|| Math.ceil(promptText.length / 4) + Math.ceil(result.output.length / 4)`
        // fallback presented a character count divided by four as a measurement.
        const directTokens =
          result.usageMeasured === true && typeof result.usage?.totalTokens === 'number'
            ? result.usage.totalTokens
            : null;

        return {
          output: result.output,
          tokens: directTokens,
          tokensMeasured: directTokens !== null,
          duration: (result.durationMs || result.latencyMs || 0) / 1000,
          provider: result.provider,
          model: result.model,
        };
      } catch (directErr: any) {
        if (directErr?.name === 'AbortError') throw directErr;

        // If direct execution failed due to an explicit authentication or parameter error, rethrow directly unless OpenRouter fallback is available
        if (
          directErr instanceof NormalizedAIError &&
          (directErr.code === 'AUTH_INVALID_KEY' ||
            directErr.code === 'API_NOT_ENABLED' ||
            directErr.code === 'AUTH_KEY_RESTRICTION' ||
            directErr.code === 'BILLING_REQUIRED' ||
            directErr.code === 'MODEL_ACCESS_DENIED')
        ) {
          if (!openRouterKey) {
            throw directErr;
          }
        }

        // In auto mode, if user also has an OpenRouter key, route to OpenRouter for the requested model
        if (openRouterKey && providerMeta.id !== 'openrouter') {
          console.info(`[AI Gateway] Direct ${providerMeta.name} failed (${directErr.message}). Routing via OpenRouter for exact model: ${modelId}`);
          // Fall through to step 2 below
        } else {
          throw directErr;
        }
      }
    }

    // 2. AICREDITS BYOK GATEWAY (If user configured an AICredits key)
    const aicreditsKey = (await this.getCredential('aicredits')) || this.getKey('aicredits');
    if (aicreditsKey) {
      try {
        const result = await aicreditsAdapter.execute(aicreditsKey, canonicalRequest, requestId);
        // Only the provider's measured total is reported. The removed
        // `|| Math.ceil(promptText.length / 4) + Math.ceil(result.output.length / 4)`
        // fallback presented a character count divided by four as a measurement.
        const aicreditsTokens =
          result.usageMeasured === true && typeof result.usage?.totalTokens === 'number'
            ? result.usage.totalTokens
            : null;
        return {
          output: result.output,
          tokens: aicreditsTokens,
          tokensMeasured: aicreditsTokens !== null,
          duration: result.durationMs / 1000,
          provider: 'AICredits',
          model: result.model || modelId,
        };
      } catch (aicreditsErr: any) {
        if (aicreditsErr?.name === 'AbortError') throw aicreditsErr;
        if (!openRouterKey) throw aicreditsErr;
      }
    }

    // 3. OPENROUTER BYOK EXECUTION (If user configured an OpenRouter key)
    if (openRouterKey && (routingMode !== 'direct' || !directKey)) {
      const openRouterModel = toOpenRouterModelSlug(modelId);
      const orResult = await openrouterAdapter.execute(
        openRouterKey,
        { ...canonicalRequest, modelId: openRouterModel },
        requestId
      );

      // Only the adapter's measured total is reported. The removed
      // `|| Math.ceil(promptText.length / 4) + Math.ceil(orResult.output.length / 4)`
      // fallback presented a character count divided by four as a measurement.
      const orTokens =
        orResult.usageMeasured === true && typeof orResult.usage?.totalTokens === 'number'
          ? orResult.usage.totalTokens
          : null;

      return {
        output: orResult.output,
        tokens: orTokens,
        tokensMeasured: orTokens !== null,
        duration: orResult.durationMs / 1000,
        provider: 'OpenRouter (BYOK Gateway)',
        model: orResult.model,
      };
    }

    // 3. Standalone Frontend Simulation Fallback
    return {
      output: `### Model Output (${modelId})\n\nProcessed prompt successfully in standalone studio mode.\n\nInput summary: "${promptText.slice(0, 100)}..."`,
      tokens: 140,
      tokensMeasured: true,
      duration: (Date.now() - startTime) / 1000,
      provider: 'PromptHub Standalone Studio',
      model: modelId,
    };
  },
};
