/**
 * src/services/ai/workspaceModels.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central model catalog for PromptHub Workspace & Model Router.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface WorkspaceModelInfo {
  id: string;
  label: string;
  badge: string;
  category: 'code' | 'image';
  tier: 'free' | 'paid' | 'auto';
  providerName: string;
  creditCost?: number;
  delayNotice?: string;
  description: string;
  isByok?: boolean;
}

export const WORKSPACE_MODELS: WorkspaceModelInfo[] = [
  // ── 1. PromptHub Autonomous Intelligent Router ──
  {
    id: 'prompthub/auto-free',
    label: 'PromptHub Auto (Free)',
    badge: 'Auto • Free',
    category: 'code',
    tier: 'auto',
    providerName: 'OpenRouter Free',
    creditCost: 0,
    delayNotice: 'Free tier models may experience queue delays during peak traffic hours.',
    description: 'PromptHub autonomously chooses the optimal free OpenRouter model for your task (0 credits).',
  },
  {
    id: 'prompthub/auto-paid',
    label: 'PromptHub Auto (Frontier Paid)',
    badge: 'Auto • Paid (1-2 cr)',
    category: 'code',
    tier: 'auto',
    providerName: 'aicredits.in',
    creditCost: 2,
    description: 'Autonomously routes to frontier models (Claude 3.5 Sonnet, GPT-4o, o3-mini) with sub-second execution.',
  },

  // ── 2. OpenRouter Free Models (0 platform credits) ──
  {
    id: 'openrouter/free',
    label: 'OpenRouter Free Auto',
    badge: 'Free • OpenRouter',
    category: 'code',
    tier: 'free',
    providerName: 'OpenRouter Free',
    creditCost: 0,
    delayNotice: 'Free OpenRouter model — may experience provider queuing/latency during peak hours. For sub-second response times, connect your own API key (BYOK) or upgrade to an AICredits Pro plan.',
    description: 'Auto-routes dynamically to the highest-performing free models currently live.',
  },
  {
    id: 'qwen/qwen-2.5-coder-32b-instruct:free',
    label: 'Qwen Coder 32B',
    badge: 'Free • OpenRouter',
    category: 'code',
    tier: 'free',
    providerName: 'OpenRouter Free',
    creditCost: 0,
    delayNotice: 'Free OpenRouter model — may experience provider queuing/latency during peak hours. For sub-second response times, connect your own API key (BYOK) or upgrade to an AICredits Pro plan.',
    description: 'State-of-the-art HTML5, Tailwind CSS, JavaScript, and React app specialist.',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    label: 'Llama 3.3 70B',
    badge: 'Free • OpenRouter',
    category: 'code',
    tier: 'free',
    providerName: 'OpenRouter Free',
    creditCost: 0,
    delayNotice: 'Free OpenRouter model — may experience provider queuing/latency during peak hours. For sub-second response times, connect your own API key (BYOK) or upgrade to an AICredits Pro plan.',
    description: 'Meta 70B flagship model for robust multi-step business logic.',
  },
  {
    id: 'deepseek/deepseek-r1:free',
    label: 'DeepSeek R1',
    badge: 'Free • OpenRouter',
    category: 'code',
    tier: 'free',
    providerName: 'OpenRouter Free',
    creditCost: 0,
    delayNotice: 'Free OpenRouter model — may experience provider queuing/latency during peak hours. For sub-second response times, connect your own API key (BYOK) or upgrade to an AICredits Pro plan.',
    description: 'Open reasoning model with transparent chain-of-thought analysis.',
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    label: 'Nemotron 3.5',
    badge: 'Free • OpenRouter',
    category: 'code',
    tier: 'free',
    providerName: 'OpenRouter Free',
    creditCost: 0,
    delayNotice: 'Free OpenRouter model — may experience provider queuing/latency during peak hours. For sub-second response times, connect your own API key (BYOK) or upgrade to an AICredits Pro plan.',
    description: 'High context window for large documentation and multi-file projects.',
  },
  {
    id: 'google/gemma-4-31b-it:free',
    label: 'Gemma 4 31B',
    badge: 'Free • OpenRouter',
    category: 'code',
    tier: 'free',
    providerName: 'OpenRouter Free',
    creditCost: 0,
    delayNotice: 'Free OpenRouter model — may experience provider queuing/latency during peak hours. For sub-second response times, connect your own API key (BYOK) or upgrade to an AICredits Pro plan.',
    description: 'Google DeepMind multimodal model for clean text & structured layout.',
  },

  // ── 3. aicredits.in Paid Frontier Models (Requires credits or active plan) ──
  {
    id: 'anthropic/claude-3.5-sonnet',
    label: 'Claude 3.5 Sonnet',
    badge: 'Paid • aicredits.in',
    category: 'code',
    tier: 'paid',
    providerName: 'aicredits.in',
    creditCost: 2,
    description: 'Frontier reasoning, complex system design, and high-conversion creative prose.',
  },
  {
    id: 'openai/gpt-4o',
    label: 'GPT-4o',
    badge: 'Paid • aicredits.in',
    category: 'code',
    tier: 'paid',
    providerName: 'aicredits.in',
    creditCost: 2,
    description: 'OpenAI flagship model with broad reasoning and multimodal execution.',
  },
  {
    id: 'openai/o3-mini',
    label: 'o3-mini',
    badge: 'Paid • aicredits.in',
    category: 'code',
    tier: 'paid',
    providerName: 'aicredits.in',
    creditCost: 2,
    description: 'High-stamina STEM and algorithmic reasoning specialist.',
  },
  {
    id: 'deepseek/deepseek-chat',
    label: 'DeepSeek V3',
    badge: 'Paid • aicredits.in',
    category: 'code',
    tier: 'paid',
    providerName: 'aicredits.in',
    creditCost: 1,
    description: '671B parameter Mixture-of-Experts model running at ultra-fast speeds.',
  },

  // ── 4. Visual Image & Concept Models ──
  {
    id: 'pollinations/flux',
    label: 'FLUX (Image)',
    badge: 'Free • Image',
    category: 'image',
    tier: 'free',
    providerName: 'Pollinations AI',
    creditCost: 0,
    description: 'Free image generation via Pollinations — no API key needed.',
  },
  {
    id: 'black-forest-labs/flux-1-schnell',
    label: 'FLUX.1 Schnell',
    badge: 'Paid • aicredits.in',
    category: 'image',
    tier: 'paid',
    providerName: 'aicredits.in',
    creditCost: 1,
    description: '12B rectified flow transformer for lightning-fast visual concepts.',
  },
  {
    id: 'stabilityai/stable-diffusion-xl',
    label: 'Stable Diffusion XL',
    badge: 'BYOK • Image',
    category: 'image',
    tier: 'paid',
    providerName: 'Stability AI',
    creditCost: 1,
    description: 'High-fidelity UI mockups with rich photographic textures.',
  },
];
