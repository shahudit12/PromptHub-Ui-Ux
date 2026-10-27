/**
 * PromptHub Guide — Tour Service
 * 
 * Defines step-by-step interactive walkthroughs for verified features across
 * the entire PromptHub platform: Studio, Variables, Models, Arena, Analyzer,
 * Library, Templates, BYOK Vault, Pricing, and Teams.
 * 
 * Operates strictly with stable data-tour identifiers, route awareness,
 * viewport-bounded positioning, and zero credit costs.
 */

import type { TabType } from '../../context/AppContext';

export interface TourStep {
  id: string;
  title: string;
  instruction: string;
  targetSelector: string; // [data-tour="..."]
  requiredRoute: TabType;
  actionHint?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface TourDefinition {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  badge: string;
  route: TabType;
  steps: TourStep[];
}

export const TOURS: Record<string, TourDefinition> = {
  // 0. Homepage Intro Tour
  'intro-tour': {
    id: 'intro-tour',
    title: 'First-Time Prompt Tour',
    subtitle: 'Learn the essentials of writing, testing, and saving prompts.',
    category: 'Getting Started',
    badge: '5 Steps · Beginner',
    route: 'home',
    steps: [
      {
        id: 'step-1-starter',
        title: 'Step 1: Choose a Starting Point',
        instruction: 'Pick a curated scenario from the pills above or start with your own idea in the editor.',
        targetSelector: '[data-tour="tour-scenario-picker"]',
        requiredRoute: 'home',
        actionHint: 'Click any scenario pill to load a sample prompt.',
        placement: 'bottom'
      },
      {
        id: 'step-2-variables',
        title: 'Step 2: Use Dynamic Variables',
        instruction: 'Turn any static prompt into a reusable template by wrapping parameters in {{curly_braces}}.',
        targetSelector: '[data-tour="tour-prompt-editor"]',
        requiredRoute: 'home',
        actionHint: 'Notice how {{variables}} are highlighted automatically.',
        placement: 'bottom'
      },
      {
        id: 'step-3-models',
        title: 'Step 3: Select an Available Model',
        instruction: 'PromptHub connects to 46 verified models. Free models (like Gemini 2.0 or Llama 3.3) cost 0 credits.',
        targetSelector: '[data-tour="tour-model-tabs"]',
        requiredRoute: 'home',
        actionHint: 'Switch between models to see speed and reasoning capabilities.',
        placement: 'top'
      },
      {
        id: 'step-4-run-cost',
        title: 'Step 4: Transparent Execution',
        instruction: 'When you test a prompt, PromptHub displays exact latency, token count, and platform costs upfront.',
        targetSelector: '[data-tour="tour-improve-action"]',
        requiredRoute: 'home',
        actionHint: 'Click "Improve sample" to see automated guardrail injection.',
        placement: 'top'
      },
      {
        id: 'step-5-save',
        title: 'Step 5: Copy or Save to Library',
        instruction: 'Copy your production-ready prompt with one click, or launch Prompt Studio to save versions in your private library.',
        targetSelector: '[data-tour="tour-copy-action"]',
        requiredRoute: 'home',
        actionHint: 'Your first tour is complete! The Help Center is always available if you need guidance.',
        placement: 'top'
      }
    ]
  },

  // 1. Workspace: Creation Tour (Idea to Working Product)
  'workspace-creation-tour': {
    id: 'workspace-creation-tour',
    title: 'Workspace Creation Tour',
    subtitle: 'From an idea to a live interactive web project in 4 steps.',
    category: 'Creation',
    badge: '4 Steps · Core',
    route: 'workspace',
    steps: [
      {
        id: 'ws-step-1',
        title: 'Step 1: Describe Your Idea',
        instruction: 'Enter a plain-English description of what you want to build. PromptHub extracts requirements and structures a full project spec.',
        targetSelector: '[data-tour="tour-workspace-input"]',
        requiredRoute: 'workspace',
        actionHint: 'Type a brief or select any starter prompt below.',
        placement: 'bottom',
      },
      {
        id: 'ws-step-2',
        title: 'Step 2: Review Visual Concepts',
        instruction: 'PromptHub generates 2–3 live, distinct visual design candidates with different color palettes, typography, and bento structures.',
        targetSelector: '[data-tour="tour-workspace-input"]',
        requiredRoute: 'workspace',
        actionHint: 'Review each pre-rendered candidate before making a decision.',
        placement: 'bottom',
      },
      {
        id: 'ws-step-3',
        title: 'Step 3: Approve Direction or Revise',
        instruction: 'Choose "Use this design" to build, "Generate new designs" for alternate directions, or "Request changes" to adjust parameters without wasting credits.',
        targetSelector: '[data-tour="tour-workspace-input"]',
        requiredRoute: 'workspace',
        actionHint: 'Zero credits consumed on rejected concept variants.',
        placement: 'top',
      },
      {
        id: 'ws-step-4',
        title: 'Step 4: Refine in Live Browser Preview',
        instruction: 'The verified Portfolio Agent generates the source files and serves an interactive browser preview. Request tweaks with natural language follow-ups.',
        targetSelector: '[data-tour="tour-workspace-input"]',
        requiredRoute: 'workspace',
        actionHint: 'Inspect the code, test responsiveness, or export the completed bundle.',
        placement: 'top',
      },
    ],
  },

  // 2. Developer Mode: Comprehensive Suite Tour
  'developer-mode-tour': {
    id: 'developer-mode-tour',
    title: 'Developer Mode Suite Tour',
    subtitle: 'Tour Studio IDE, Model Arena, Prompt Analyzer, and the API Key Vault.',
    category: 'Developer Mode',
    badge: '4 Steps · Suite',
    route: 'developer',
    steps: [
      {
        id: 'dev-step-1',
        title: 'Step 1: Prompt Studio IDE',
        instruction: 'Write, parameterize, and version prompts with dynamic {{variables}} and 46 verified foundation models.',
        targetSelector: '[data-tour="tour-prompt-editor"]',
        requiredRoute: 'developer',
        actionHint: 'Click Studio in the top bar to edit prompts.',
        placement: 'bottom',
      },
      {
        id: 'dev-step-2',
        title: 'Step 2: Multi-Model Arena',
        instruction: 'Broadcast identical prompts to multiple models concurrently to benchmark latency, TTFT, and cost side-by-side.',
        targetSelector: '[data-tour="tour-arena-models"]',
        requiredRoute: 'developer',
        actionHint: 'Switch to Arena to compare models in real time.',
        placement: 'bottom',
      },
      {
        id: 'dev-step-3',
        title: 'Step 3: Prompt Analyzer',
        instruction: 'Audit system prompts across 8 heuristic dimensions with OWASP vulnerability checks and automated optimization.',
        targetSelector: '[data-tour="tour-analyzer-score"]',
        requiredRoute: 'developer',
        actionHint: 'Switch to Analyzer to score and harden prompts.',
        placement: 'bottom',
      },
      {
        id: 'dev-step-4',
        title: 'Step 4: API Key Vault (Client BYOK)',
        instruction: 'Connect your OpenAI, Anthropic, Gemini, Groq, or OpenRouter keys with 100% client-side AES-GCM encryption and 0% markup.',
        targetSelector: '[data-tour="tour-byok-input"]',
        requiredRoute: 'developer',
        actionHint: 'Keys never touch PromptHub servers.',
        placement: 'bottom',
      },
    ],
  },

  // 3. Studio: Create and Run a Prompt
  'workspace-run-prompt-tour': {
    id: 'workspace-run-prompt-tour',
    title: 'Create and Run a Prompt',
    subtitle: 'Learn the primary workflow in Prompt Studio IDE.',
    category: 'Studio IDE',
    badge: '4 Steps · Core',
    route: 'workspace',
    steps: [
      {
        id: 'studio-step-1',
        title: 'Step 1: Write or Paste Your Prompt',
        instruction: 'Enter your system instructions, constraints, and instructions in the Studio editor pane.',
        targetSelector: '[data-tour="tour-prompt-editor"]',
        requiredRoute: 'workspace',
        actionHint: 'Type your prompt directives here.',
        placement: 'bottom'
      },
      {
        id: 'studio-step-2',
        title: 'Step 2: Select Target Model',
        instruction: 'Switch models instantly from 46 options across OpenAI, Anthropic, Google, and OpenRouter.',
        targetSelector: '[data-tour="tour-model-selector"]',
        requiredRoute: 'workspace',
        actionHint: 'Click to open the model selector with latency and cost tags.',
        placement: 'bottom'
      },
      {
        id: 'studio-step-3',
        title: 'Step 3: Execute Prompt',
        instruction: 'Click Run (or press Ctrl+Enter) to stream generation tokens with live telemetry.',
        targetSelector: '[data-tour="tour-run-action"]',
        requiredRoute: 'workspace',
        actionHint: 'Test execution streams response without delay.',
        placement: 'top'
      },
      {
        id: 'studio-step-4',
        title: 'Step 4: Inspect Latency & Telemetry',
        instruction: 'Review exact response latency, measured token counts, and transparent INR cost.',
        targetSelector: '[data-tour="tour-execution-metrics"]',
        requiredRoute: 'workspace',
        actionHint: 'Telemetry gives you real production metrics.',
        placement: 'top'
      }
    ]
  },

  // 2. Studio: Dynamic Variables
  'workspace-variables-tour': {
    id: 'workspace-variables-tour',
    title: 'Insert and Configure Variables',
    subtitle: 'Build flexible prompt templates with dynamic typed parameters.',
    category: 'Studio IDE',
    badge: '3 Steps · Core',
    route: 'workspace',
    steps: [
      {
        id: 'var-step-1',
        title: 'Step 1: Syntax {{variable_name}}',
        instruction: 'Wrap any variable name in double curly braces, such as {{user_role}} or {{code_snippet}} in the editor.',
        targetSelector: '[data-tour="tour-prompt-editor"]',
        requiredRoute: 'workspace',
        actionHint: 'Variables highlight automatically in blue.',
        placement: 'bottom'
      },
      {
        id: 'var-step-2',
        title: 'Step 2: Auto-Extracted Parameters',
        instruction: 'PromptHub instantly extracts parameters and creates interactive test fields in the Variable Drawer.',
        targetSelector: '[data-tour="tour-parameters-panel"]',
        requiredRoute: 'workspace',
        actionHint: 'Click Variables to open or close the parameter values drawer.',
        placement: 'bottom'
      },
      {
        id: 'var-step-3',
        title: 'Step 3: Safe Interpolation & Run',
        instruction: 'Before running, values are escaped to prevent prompt injection and delimiter leaks.',
        targetSelector: '[data-tour="tour-run-action"]',
        requiredRoute: 'workspace',
        actionHint: 'Values are safely bound during test execution.',
        placement: 'top'
      }
    ]
  },

  // 3. Studio / Modal: Select an Available Model
  'workspace-model-selector-tour': {
    id: 'workspace-model-selector-tour',
    title: 'Select an Available Model',
    subtitle: 'Filter and compare 46 frontier LLMs by provider, cost, and reasoning.',
    category: 'Model Hub',
    badge: '3 Steps · Models',
    route: 'workspace',
    steps: [
      {
        id: 'model-step-1',
        title: 'Step 1: Open Model Catalog',
        instruction: 'Click the active model chip to open the full catalog modal.',
        targetSelector: '[data-tour="tour-model-selector"]',
        requiredRoute: 'workspace',
        actionHint: 'Shows current active model and free status.',
        placement: 'bottom'
      },
      {
        id: 'model-step-2',
        title: 'Step 2: Filter by Provider or Speed',
        instruction: 'Filter models by provider (OpenAI, Anthropic, Gemini, Groq, Meta) or category (Reasoning, Fast, Free).',
        targetSelector: '[data-tour="tour-model-selector"]',
        requiredRoute: 'workspace',
        actionHint: 'Pick free models for 0-credit testing.',
        placement: 'bottom'
      },
      {
        id: 'model-step-3',
        title: 'Step 3: Benchmark in Studio',
        instruction: 'Once selected, the model is configured for all Studio test runs.',
        targetSelector: '[data-tour="tour-run-action"]',
        requiredRoute: 'workspace',
        placement: 'top'
      }
    ]
  },

  // 4. Arena: Compare Model Responses
  'arena-benchmark-tour': {
    id: 'arena-benchmark-tour',
    title: 'Compare Model Responses',
    subtitle: 'Benchmark frontier LLMs side-by-side with identical inputs.',
    category: 'Benchmarking',
    badge: '3 Steps · Arena',
    route: 'arena',
    steps: [
      {
        id: 'arena-step-1',
        title: 'Step 1: Select Competitor Models',
        instruction: 'Choose 2 to 4 competitor models from OpenAI, Anthropic, Google Gemini, DeepSeek, or Meta.',
        targetSelector: '[data-tour="tour-arena-models"]',
        requiredRoute: 'arena',
        actionHint: 'Customize active contender slots.',
        placement: 'bottom'
      },
      {
        id: 'arena-step-2',
        title: 'Step 2: Broadcast Concurrency',
        instruction: 'Click Run All to execute completions concurrently with zero cross-talk.',
        targetSelector: '[data-tour="tour-arena-broadcast"]',
        requiredRoute: 'arena',
        actionHint: 'Parallel runs evaluate speed and reasoning fidelity.',
        placement: 'bottom'
      },
      {
        id: 'arena-step-3',
        title: 'Step 3: Compare Latency & Output Telemetry',
        instruction: 'Analyze TTFT latency, tokens/sec, and exact INR pricing side-by-side.',
        targetSelector: '[data-tour="tour-arena-telemetry"]',
        requiredRoute: 'arena',
        placement: 'top'
      }
    ]
  },

  // 5. Analyzer: Analyze a Prompt
  'analyzer-rubric-tour': {
    id: 'analyzer-rubric-tour',
    title: 'Analyze a Prompt',
    subtitle: 'Score prompt quality against a 0–100 deterministic engineering rubric.',
    category: 'Optimization',
    badge: '3 Steps · Quality',
    route: 'analyzer',
    steps: [
      {
        id: 'rubric-step-1',
        title: 'Step 1: Input Prompt to Audit',
        instruction: 'Paste any prompt to run our deterministic rubric heuristics.',
        targetSelector: '[data-tour="tour-analyzer-input"]',
        requiredRoute: 'analyzer',
        actionHint: 'Supports raw text, variables, and markdown.',
        placement: 'bottom'
      },
      {
        id: 'rubric-step-2',
        title: 'Step 2: Score Breakdown',
        instruction: 'Review the 4 pillars: Persona (25), Directives (25), Variable Safety (25), Output Contracts (25).',
        targetSelector: '[data-tour="tour-analyzer-breakdown"]',
        requiredRoute: 'analyzer',
        placement: 'top'
      },
      {
        id: 'rubric-step-3',
        title: 'Step 3: Auto-Apply Recommendations',
        instruction: 'Click Apply Improvements to automatically fix missing constraints and boost your score.',
        targetSelector: '[data-tour="tour-analyzer-apply"]',
        requiredRoute: 'analyzer',
        placement: 'top'
      }
    ]
  },

  // 6. Library: Save and Retrieve a Prompt
  'library-save-retrieve-tour': {
    id: 'library-save-retrieve-tour',
    title: 'Save and Retrieve a Prompt',
    subtitle: 'Store versions, organize collections, and manage personal prompt assets.',
    category: 'Library',
    badge: '3 Steps · Organization',
    route: 'workspace',
    steps: [
      {
        id: 'save-step-1',
        title: 'Step 1: Set Prompt Title & Category',
        instruction: 'Give your prompt a descriptive name and category in the header.',
        targetSelector: '[data-tour="tour-prompt-title"]',
        requiredRoute: 'workspace',
        placement: 'bottom'
      },
      {
        id: 'save-step-2',
        title: 'Step 2: Save to Your Vault',
        instruction: 'Click Save (or Ctrl+S) to create a versioned snapshot in your database repository.',
        targetSelector: '[data-tour="tour-save-prompt"]',
        requiredRoute: 'workspace',
        placement: 'bottom'
      },
      {
        id: 'save-step-3',
        title: 'Step 3: Access Vault & Collections',
        instruction: 'Toggle the Library drawer to search, organize into folders, and restore prior versions.',
        targetSelector: '[data-tour="tour-library-toggle"]',
        requiredRoute: 'workspace',
        placement: 'bottom'
      }
    ]
  },

  // 7. Marketplace: Start from a Template
  'marketplace-template-tour': {
    id: 'marketplace-template-tour',
    title: 'Start from a Template',
    subtitle: 'Discover verified prompts created by domain specialists.',
    category: 'Marketplace',
    badge: '3 Steps · Community',
    route: 'marketplace',
    steps: [
      {
        id: 'template-step-1',
        title: 'Step 1: Browse by Domain Filter',
        instruction: 'Filter verified prompts by Development, Writing, Marketing, Business, or Video.',
        targetSelector: '[data-tour="tour-template-filter"]',
        requiredRoute: 'marketplace',
        placement: 'bottom'
      },
      {
        id: 'template-step-2',
        title: 'Step 2: Inspect Prompt Card',
        instruction: 'View ratings, token estimates, model compatibility, and verified author badges.',
        targetSelector: '[data-tour="tour-template-card"]',
        requiredRoute: 'marketplace',
        placement: 'top'
      },
      {
        id: 'template-step-3',
        title: 'Step 3: Fork or Use in Studio',
        instruction: 'Click to open the template directly in Studio IDE with all variables pre-configured.',
        targetSelector: '[data-tour="tour-template-fork"]',
        requiredRoute: 'marketplace',
        placement: 'top'
      }
    ]
  },

  // 8. Credentials: Configure BYOK
  'byok-vault-tour': {
    id: 'byok-vault-tour',
    title: 'Configure BYOK (Bring Your Own Key)',
    subtitle: 'Learn how your API credentials are encrypted with client-side AES-GCM 256-bit.',
    category: 'Security',
    badge: '3 Steps · Security',
    route: 'credentials',
    steps: [
      {
        id: 'byok-step-1',
        title: 'Step 1: Select AI Provider',
        instruction: 'Choose from OpenAI, Anthropic, Google Gemini, Groq, DeepSeek, or OpenRouter.',
        targetSelector: '[data-tour="tour-byok-providers"]',
        requiredRoute: 'credentials',
        placement: 'bottom'
      },
      {
        id: 'byok-step-2',
        title: 'Step 2: Enter API Secret',
        instruction: 'Keys are encrypted using the Web Crypto API and saved locally in your client vault.',
        targetSelector: '[data-tour="tour-byok-input"]',
        requiredRoute: 'credentials',
        placement: 'top'
      },
      {
        id: 'byok-step-3',
        title: 'Step 3: 0% Platform Markup',
        instruction: 'PromptHub charges 0 credits for BYOK runs. Requests stream directly under your provider terms.',
        targetSelector: '[data-tour="tour-byok-save"]',
        requiredRoute: 'credentials',
        placement: 'top'
      }
    ]
  },

  // 9. Pricing: Understand Credits & Billing
  'credits-pricing-tour': {
    id: 'credits-pricing-tour',
    title: 'Understand Credits & Pricing',
    subtitle: 'Transparent pay-as-you-go credits with zero hidden platform markups.',
    category: 'Billing',
    badge: '2 Steps · Economics',
    route: 'pricing',
    steps: [
      {
        id: 'pricing-step-1',
        title: 'Step 1: Choose Token Package',
        instruction: 'Select starter top-up packs or recurring subscriptions. Unused credits never expire.',
        targetSelector: '[data-tour="tour-credit-packages"]',
        requiredRoute: 'pricing',
        placement: 'bottom'
      },
      {
        id: 'pricing-step-2',
        title: 'Step 2: Transparent Payment Methods',
        instruction: 'Checkout securely via UPI, Card, or NetBanking with instant wallet balance updates.',
        targetSelector: '[data-tour="tour-payment-methods"]',
        requiredRoute: 'pricing',
        placement: 'top'
      }
    ]
  },

  // 10. Teams: Team Workspaces
  'teams-collaboration-tour': {
    id: 'teams-collaboration-tour',
    title: 'Team Workspaces & Roles',
    subtitle: 'Collaborate with teammates on shared prompt repositories.',
    category: 'Collaboration',
    badge: '2 Steps · Enterprise',
    route: 'teams',
    steps: [
      {
        id: 'team-step-1',
        title: 'Step 1: Team Workspace Switcher',
        instruction: 'Switch between personal vaults and multi-tenant organization workspaces.',
        targetSelector: '[data-tour="tour-team-header"]',
        requiredRoute: 'teams',
        placement: 'bottom'
      },
      {
        id: 'team-step-2',
        title: 'Step 2: Invite Members with Role Permissions',
        instruction: 'Generate cryptographic invite tokens with Admin, Editor, or Viewer access.',
        targetSelector: '[data-tour="tour-team-invite"]',
        requiredRoute: 'teams',
        placement: 'bottom'
      }
    ]
  }
};

export const tourService = {
  getTour(id: string): TourDefinition | undefined {
    return TOURS[id];
  },

  getAllTours(): TourDefinition[] {
    return Object.values(TOURS);
  },

  /**
   * Find the most relevant contextual tutorial for the active route
   */
  getTutorialForRoute(route: TabType): TourDefinition | undefined {
    switch (route) {
      case 'home':
        return TOURS['intro-tour'];
      case 'workspace':
      case 'create-and-improve':
      case 'work':
        return TOURS['workspace-creation-tour'];
      case 'developer':
      case 'developer-mode':
        return TOURS['developer-mode-tour'];
      case 'classic-studio':
      case 'arena':
      case 'analyzer':
        return undefined;
      case 'marketplace':
        return TOURS['marketplace-template-tour'];
      case 'credentials':
        return TOURS['byok-vault-tour'];
      case 'pricing':
      case 'recharge':
        return TOURS['credits-pricing-tour'];
      case 'teams':
        return TOURS['teams-collaboration-tour'];
      case 'library':
      case 'collections':
        return TOURS['library-save-retrieve-tour'];
      case 'dashboard':
        return TOURS['workspace-creation-tour'];
      default:
        return TOURS['intro-tour'];
    }
  }
};
