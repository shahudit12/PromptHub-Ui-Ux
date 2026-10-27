/**
 * Prompt Intent Classification & Complexity Recommendation Engine
 *
 * Adapted from PromptPilot and Agency-Agents architectural patterns.
 * Analyzes prompt semantics, keywords, and structural directives to:
 * 1. Classify prompt domain intent (Coding, Reasoning, Creative, Data, etc.)
 * 2. Evaluate complexity score and recommended tier
 * 3. Suggest optimal model classes (Reasoning, Frontier, Fast/Efficient)
 * 4. Generate recommended acceptance criteria and evaluation constraints.
 */

export type PromptIntentType =
  | 'coding'
  | 'reasoning'
  | 'creative'
  | 'data_extraction'
  | 'analysis'
  | 'explanation'
  | 'automation'
  | 'agent_workflow';

export type ComplexityLevel = 'concise' | 'production' | 'exhaustive';

export interface IntentAnalysisResult {
  primaryIntent: PromptIntentType;
  confidence: number;
  detectedKeywords: string[];
  complexityLevel: ComplexityLevel;
  complexityScore: number; // 0 - 100
  recommendedModelClass: 'reasoning' | 'frontier' | 'fast_efficient';
  suggestedModels: string[];
  recommendedStructure: string;
  recommendedConstraints: string[];
}

const INTENT_PATTERNS: Array<{
  intent: PromptIntentType;
  keywords: RegExp;
  recommendedModels: string[];
  modelClass: 'reasoning' | 'frontier' | 'fast_efficient';
  structure: string;
  constraints: string[];
}> = [
  {
    intent: 'coding',
    keywords: /\b(function|class|interface|refactor|typescript|python|react|component|api|endpoint|sql|database|bug|fix|unit test|debug|algorithm|syntax|compile)\b/i,
    recommendedModels: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'deepseek/deepseek-coder'],
    modelClass: 'frontier',
    structure: 'Role -> Context -> Input Code -> Strict Requirements -> Clean Solution -> Tests',
    constraints: [
      'Write production-ready code with complete type annotations.',
      'Handle edge cases (null/undefined, boundary limits).',
      'Provide concise explanatory comments.',
    ],
  },
  {
    intent: 'reasoning',
    keywords: /\b(prove|derive|analyze|logical|why|deduce|axiom|consensus|math|algorithm complexity|game theory|probability|step-by-step|reasoning)\b/i,
    recommendedModels: ['deepseek/deepseek-r1', 'openai/o1', 'openai/o3-mini'],
    modelClass: 'reasoning',
    structure: 'Problem Statement -> Axioms/Assumptions -> Step-by-Step Proof -> Conclusion',
    constraints: [
      'Exhaustively verify each intermediate deduction.',
      'Highlight potential counterexamples or edge cases.',
    ],
  },
  {
    intent: 'data_extraction',
    keywords: /\b(extract|json|schema|csv|table|parse|entities|key-value|structured|regex|format as json|clean data)\b/i,
    recommendedModels: ['google/gemini-2.0-flash', 'openai/gpt-4o', 'mistralai/mistral-large-2411'],
    modelClass: 'fast_efficient',
    structure: 'Schema Definition -> Source Excerpt -> Strict JSON Output',
    constraints: [
      'Return strictly valid JSON conforming to the requested schema.',
      'Never include conversational markdown preambles or explanations.',
      'Extract verbatim facts without hallucination.',
    ],
  },
  {
    intent: 'creative',
    keywords: /\b(write|story|copywriting|headline|tweet|blog|narrative|brand|tone|marketing|campaign|dialogue|creative|poem|pitch)\b/i,
    recommendedModels: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o'],
    modelClass: 'frontier',
    structure: 'Persona/Voice -> Target Audience -> Key Message -> Output Formats -> Variations',
    constraints: [
      'Adhere strictly to the defined brand voice and tone.',
      'Avoid generic corporate clichés and passive phrasing.',
    ],
  },
  {
    intent: 'agent_workflow',
    keywords: /\b(agent|tool|function call|subagent|workflow|handoff|orchestrator|router|pipeline|action|guardrail)\b/i,
    recommendedModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    modelClass: 'frontier',
    structure: 'Identity -> Tools -> Memory Protocol -> Handoff Criteria -> Output Contract',
    constraints: [
      'Specify exact tool parameters and schema validations.',
      'Define clear termination conditions to avoid infinite execution loops.',
    ],
  },
];

/**
 * Classifies prompt intent and computes complexity scoring based on text analysis.
 */
export function classifyPromptIntent(promptText: string): IntentAnalysisResult {
  if (!promptText || typeof promptText !== 'string' || promptText.trim().length === 0) {
    return {
      primaryIntent: 'explanation',
      confidence: 0.5,
      detectedKeywords: [],
      complexityLevel: 'concise',
      complexityScore: 10,
      recommendedModelClass: 'fast_efficient',
      suggestedModels: ['google/gemini-2.0-flash', 'openai/gpt-4o-mini'],
      recommendedStructure: 'Clear Prompt -> Concise Answer',
      recommendedConstraints: ['Be direct and concise.'],
    };
  }

  let bestMatch = INTENT_PATTERNS[0];
  let maxMatches = 0;
  let detectedKeywords: string[] = [];

  for (const pattern of INTENT_PATTERNS) {
    const matches = promptText.match(new RegExp(pattern.keywords.source, 'gi'));
    if (matches && matches.length > maxMatches) {
      maxMatches = matches.length;
      bestMatch = pattern;
      detectedKeywords = Array.from(new Set(matches.map((m) => m.toLowerCase())));
    }
  }

  // Calculate complexity score based on length, variables, constraints, and nesting
  const lengthScore = Math.min(40, (promptText.length / 500) * 20);
  const variableCount = (promptText.match(/\{\{/g) || []).length;
  const variableScore = Math.min(30, variableCount * 10);
  const constraintScore = /\b(must|never|always|strict|only|format|schema)\b/gi.test(promptText) ? 20 : 5;
  const complexityScore = Math.min(100, Math.round(lengthScore + variableScore + constraintScore));

  let complexityLevel: ComplexityLevel = 'concise';
  if (complexityScore >= 65) {
    complexityLevel = 'exhaustive';
  } else if (complexityScore >= 35) {
    complexityLevel = 'production';
  }

  return {
    primaryIntent: bestMatch.intent,
    confidence: Math.min(0.95, 0.6 + maxMatches * 0.08),
    detectedKeywords,
    complexityLevel,
    complexityScore,
    recommendedModelClass: bestMatch.modelClass,
    suggestedModels: bestMatch.recommendedModels,
    recommendedStructure: bestMatch.structure,
    recommendedConstraints: bestMatch.constraints,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERABLE INTENT CLASSIFICATION ENGINE (M2)
// ─────────────────────────────────────────────────────────────────────────────

export type DeliverableType =
  | 'visual_asset'
  | 'ad_campaign'
  | 'presentation_deck'
  | 'video_script'
  | 'written_report'
  | 'strategic_plan'
  | 'data_analysis'
  | 'interactive_web_app'
  | 'code_script'
  | 'general_inquiry';

export interface DeliverableClassification {
  deliverableType: DeliverableType;
  confidence: number;
  hasVisionInput: boolean;
  recommendedModel: string;
  modelRationale: string;
  detectedKeywords: string[];
  formatSpecification: string;
}

/**
 * Robustly detects whether attachments include images (multimodal vision input).
 */
export function detectVisionInput(attachments?: any[]): boolean {
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return false;
  }
  return attachments.some((att) => {
    if (!att) return false;
    if (att.isImage === true) return true;
    const mime = String(att.mimeType || att.type || '').toLowerCase();
    if (mime.startsWith('image/')) return true;
    if (att.file && typeof att.file.type === 'string' && att.file.type.toLowerCase().startsWith('image/')) {
      return true;
    }
    const name = String(att.name || att.fileName || att.filename || '').toLowerCase();
    if (/\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(name)) return true;
    const url = String(att.dataUrl || att.url || '').toLowerCase();
    if (url.startsWith('data:image/') || /\.(png|jpe?g|webp|gif|svg|bmp|avif)(\?.*)?$/i.test(url)) return true;
    return false;
  });
}

interface DeliverableRule {
  type: DeliverableType;
  primaryPhrases: RegExp;
  keywords: RegExp;
  formatSpecification: string;
  defaultModel: string;
  defaultRationale: string;
}

const DELIVERABLE_RULES: DeliverableRule[] = [
  {
    type: 'visual_asset',
    primaryPhrases: /\b(generate image|create image|make image|draw image|render image|generate photo|create photo|make photo|generate visual|create artwork|draw illustration|design logo|generate picture|create picture|make banner|generate banner|produce image)\b/i,
    keywords: /\b(image|picture|photo|illustration|artwork|banner|logo|drawing|render|visual)\b/i,
    formatSpecification: 'High-Fidelity AI Visual Asset generated with FLUX engine and downloadable PNG output.',
    defaultModel: 'pollinations/flux',
    defaultRationale: 'FLUX image generation engine selected for high-fidelity photorealistic rendering and visual concepts.',
  },
  {
    type: 'presentation_deck',
    primaryPhrases: /\b(ppt|powerpoint|presentation|slide deck|slides|pitch deck|keynote|slideshow)\b/i,
    keywords: /\b(ppt|presentation|slide|slides|pitch deck|keynote|deck)\b/i,
    formatSpecification: 'Interactive Multi-Slide Deck Deliverable with visual themes, speaker notes, and HTML5 presentation export.',
    defaultModel: 'deepseek/deepseek-r1:free',
    defaultRationale: 'DeepSeek R1 structures logical presentation narratives, bullet hierarchies, and executive takeaway slides with high coherence.',
  },
  {
    type: 'video_script',
    primaryPhrases: /\b(video script|storyboard|tiktok video|youtube video|reel|commercial video|explainer video|video concept|film script)\b/i,
    keywords: /\b(video|storyboard|scene|scenes|script|voiceover|footage|b-roll|tiktok|reel|youtube)\b/i,
    formatSpecification: 'Production Video Storyboard Deliverable with scene-by-scene visual cues, camera directions, voiceover script, and timing.',
    defaultModel: 'google/gemini-2.0-flash-001',
    defaultRationale: 'Gemini 2.0 Flash excels at cinematic multimodal sequencing, shot framing, and viral pacing.',
  },

  {
    type: 'ad_campaign',
    primaryPhrases: /\b(ad campaign|marketing campaign|facebook ad|instagram ad|google ad|linkedin ad|social ad|ad copy|marketing copy|promotional campaign|display ad|banner ad|billboard ad|ad mockup|conversion ad|call to action|cta button)\b/i,
    keywords: /\b(ad|ads|advertisement|advertisements|campaign|copywriting|tagline|slogan|promo|commercial|headline|cta|hook|copywriter|flyer)\b/i,
    formatSpecification: 'Structured ad suite with Headline, Primary Body Copy, Call to Action, Target Demographic, and Visual Mockup specifications.',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    defaultRationale: 'Claude 3.5 Sonnet selected for high-conversion creative copywriting, nuanced brand voice, and persuasive campaign hooks.',
  },
  {
    type: 'interactive_web_app',
    primaryPhrases: /\b(interactive web app|web app|web application|interactive prototype|portfolio website|landing page|business website|website for my business|make a website|create a website|build a website|dashboard app|single page app|spa|calculator app|interactive game|ui prototype|web interface|frontend app|html5 app|react app|interactive tool|product for|make a product|build a product|create a product|software for|app for|mapping tool|geo mapping|tool for)\b/i,
    keywords: /\b(webapp|website|portfolio|frontend|tailwind|html|prototype|dashboard|calculator|interactive|component|wireframe|product|software|tool|app)\b/i,
    formatSpecification: 'Complete, self-contained interactive web prototype (HTML5, Tailwind CSS, JS) with live preview capability.',
    defaultModel: 'qwen/qwen-2.5-coder-32b-instruct:free',
    defaultRationale: 'Qwen 2.5 Coder 32B selected for state-of-the-art interactive HTML5/Tailwind web prototype generation with zero truncated syntax.',
  },
  {
    type: 'code_script',
    primaryPhrases: /\b(code script|python script|typescript script|bash script|shell script|sql script|utility script|automation script|data pipeline script|scraping script|cron script|api endpoint|unit test|unit tests|code snippet|backend service|database schema|refactor code)\b/i,
    keywords: /\b(script|scripts|python|typescript|sql|bash|regex|endpoint|query|refactor|function|class|method|algorithm|debug|syntax|bug)\b/i,
    formatSpecification: 'Clean, production-grade executable code script with complete type annotations, docstrings, and edge-case handling.',
    defaultModel: 'qwen/qwen-2.5-coder-32b-instruct:free',
    defaultRationale: 'Qwen 2.5 Coder 32B selected for high-precision syntax generation, type annotations, and clean code architecture.',
  },
  {
    type: 'data_analysis',
    primaryPhrases: /\b(data analysis|data table|spreadsheet analysis|csv analysis|statistical analysis|metrics breakdown|dataset summary|trend analysis|pivot table|outlier detection|data summary|parse csv|tabular data)\b/i,
    keywords: /\b(csv|dataset|spreadsheet|tabular|metrics|statistical|statistics|kpis|kpi|correlations|distribution|aggregates|excel|table)\b/i,
    formatSpecification: 'Structured tabular dataset with Key Metrics, Statistical Summary, Trend Observations, and Actionable Insights.',
    defaultModel: 'openrouter/free',
    defaultRationale: 'Auto Free OpenRouter cluster selected for rapid numerical processing, tabular data structuring, and trend extraction.',
  },
  {
    type: 'strategic_plan',
    primaryPhrases: /\b(strategic plan|strategy roadmap|business plan|action plan|implementation plan|go-to-market plan|gtm strategy|growth strategy|scaling roadmap|quarterly roadmap|strategic framework|vision plan|contingency plan|executive roadmap|okrs plan)\b/i,
    keywords: /\b(strategy|roadmap|milestones|okrs|gtm|scaling|priorities|strategic|deliverables|execution plan)\b/i,
    formatSpecification: 'Phased strategic plan with Vision, Core Objectives, Implementation Phases, Milestones, and Risk Mitigation.',
    defaultModel: 'deepseek/deepseek-r1:free',
    defaultRationale: 'DeepSeek R1 selected for comprehensive strategic deduction, milestone planning, and multi-phase risk analysis.',
  },
  {
    type: 'written_report',
    primaryPhrases: /\b(written report|executive report|formal report|audit report|research report|whitepaper|executive summary|status report|quarterly report|comprehensive report|briefing document|dossier|investigation report|formal analysis|evaluation report)\b/i,
    keywords: /\b(report|reports|whitepaper|dossier|briefing|findings|summary|evaluation|document|overview)\b/i,
    formatSpecification: 'Structured publication report with Executive Summary, Key Findings, In-depth Analysis, and Strategic Recommendations.',
    defaultModel: 'deepseek/deepseek-r1:free',
    defaultRationale: 'DeepSeek R1 selected for deep reasoning, transparent chain-of-thought analysis, and structured synthesis.',
  },
];

/**
 * Central utility to detect conversational greetings and small talk (e.g. "hi", "hello", "hey", "good morning").
 */
export function isConversationalGreeting(input: string): boolean {
  if (!input) return false;
  const clean = input.trim();

  // If the prompt explicitly contains deliverable creation intent, it's an actionable command, not a greeting
  // (e.g. "hi, create a website for my bakery" or "hello, make an ad campaign")
  const hasCreationIntent = /\b(create|build|make|generate|write\s+(?:an?|the|me|code|script|prompt|quarterly)|design|develop|code|implement|analyze|audit)\b/i.test(clean);
  if (hasCreationIntent) return false;

  // Check if it starts with or consists of common greeting phrases
  const startsWithGreeting = /^(?:hi|hello|hey|heya|howdy|sup|yo|hola|namaste|greetings|good\s+(?:morning|afternoon|evening|day))\b/i.test(clean);
  if (startsWithGreeting) return true;

  // Check general casual conversational greetings/queries
  const isCasualGreeting = /^(?:what'?s\s+up|whats\s+up|wassup|how\s+are\s+you|how's\s+it\s+going|are\s+you\s+there|can\s+you\s+hear\s+me)\b/i.test(clean);
  if (isCasualGreeting) return true;

  return false;
}

/**
 * Central utility to detect general capabilities or assistance queries (e.g. "what can you do", "help", "who are you").
 */
export function isCapabilitiesOrHelpQuery(input: string): boolean {
  if (!input) return false;
  const clean = input.trim();
  return /^(?:who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do|how\s+does\s+this\s+work|what\s+is(?:\s+(?:prompthub|this|studio))?|tell\s+me\s+about(?:\s+(?:prompthub|this|studio))?|about(?:\s+(?:prompthub|this|studio))?|explain(?:\s+(?:prompthub|this|studio))?|help(?:\s+me)?|how\s+to\s+use(?:\s+(?:prompthub|this|studio))?|features(?:\s+of\s+prompthub)?)(?:\s+this|\s+prompthub|\s+studio|[!?. ])*$/i.test(clean);
}

/**
 * Central utility to detect hosting, deployment, or domain questions.
 */
export function isHostingQuery(input: string): boolean {
  if (!input) return false;
  const clean = input.trim().toLowerCase();
  return (
    /(?:how\s+to\s+host|where\s+to\s+host|deploy\s+website|host\s+website|hosting\s+provider|hosting\s+options|publish\s+website|deploy\s+to\s+(?:vercel|netlify|cloudflare|hostinger)|free\s+hosting|paid\s+hosting|hosting\s+budget)/i.test(clean) ||
    clean === 'deploy & host website' ||
    clean === 'deploy & host website (free / paid)' ||
    clean === 'hosting options' ||
    clean === 'deploy' ||
    clean === 'host'
  );
}

/**
 * Autonomously classifies user input & attachments into concrete deliverable contracts.
 * Recommends optimal model and provides human-readable rationale.
 */
export function classifyDeliverableIntent(
  input: string,
  attachments?: any[]
): DeliverableClassification {
  const hasVision = detectVisionInput(attachments);
  const cleanInput = (input || '').trim();

  // 1. Empty input fallback
  if (!cleanInput && !hasVision) {
    return {
      deliverableType: 'general_inquiry',
      confidence: 0.5,
      hasVisionInput: false,
      recommendedModel: 'openrouter/free',
      modelRationale: 'Auto Free OpenRouter cluster provides sub-second low-latency conversational responses and broad world knowledge.',
      detectedKeywords: [],
      formatSpecification: 'Clear, concise, and informative conversational answer.',
    };
  }

  // 2. Pure Conversational Greeting bypass (e.g. "hi", "hello")
  if (isConversationalGreeting(cleanInput) && !hasVision) {
    return {
      deliverableType: 'general_inquiry',
      confidence: 0.99,
      hasVisionInput: false,
      recommendedModel: 'openrouter/free',
      modelRationale: 'Auto Free OpenRouter cluster routed for fast, sub-second conversational greeting and onboarding guidance.',
      detectedKeywords: ['conversational_greeting'],
      formatSpecification: 'Warm, friendly greeting guiding the user toward creating deliverables.',
    };
  }

  // 3. Capabilities / Help bypass
  if (isCapabilitiesOrHelpQuery(cleanInput) && !hasVision) {
    return {
      deliverableType: 'general_inquiry',
      confidence: 0.95,
      hasVisionInput: false,
      recommendedModel: 'openrouter/free',
      modelRationale: 'Auto Free OpenRouter cluster routed for instant studio capabilities guidance.',
      detectedKeywords: ['capabilities_help'],
      formatSpecification: 'Concise, high-impact breakdown of studio capabilities and outcomes.',
    };
  }

  // 4. Definitional / Conceptual Inquiry Guardrail
  // Interrogative questions (e.g. "what is an ad campaign?", "what is a website?", "explain react components")
  // must return pure explanatory markdown without attaching deliverable cards or spawning sandboxes.
  const isDefinitionalQuery =
    /^(?:what\s+(?:is|are)|what's|whats|define|definition\s+of|explain|meaning\s+of|how\s+does\s+an?|how\s+do\s+i|how\s+does|can\s+you\s+explain|tell\s+me\s+about\s+what|difference\s+between)\b/i.test(cleanInput) &&
    !/\b(create|make|build|generate|write|design|code|produce|draft|craft|prepare|compose|develop|implement)\b/i.test(cleanInput);

  if (isDefinitionalQuery && !hasVision) {
    return {
      deliverableType: 'general_inquiry',
      confidence: 0.9,
      hasVisionInput: false,
      recommendedModel: 'openrouter/free',
      modelRationale: 'Routed as general inquiry explaining concepts conversationally without generating deliverables.',
      detectedKeywords: ['definitional_inquiry'],
      formatSpecification: 'Clear, concise, and informative conversational explanation in Markdown.',
    };
  }

  // If vision input is present, evaluate whether a specialized deliverable is requested
  // (e.g. ad campaign with product photo or web mockup from design image)
  let bestType: DeliverableType = 'general_inquiry';
  let highestScore = 0;
  let detectedKeywords: string[] = [];
  let matchingRule = DELIVERABLE_RULES[0];

  for (const rule of DELIVERABLE_RULES) {
    let score = 0;
    const currentKeywords: string[] = [];

    // Check primary multi-word phrases (higher weight)
    const phraseMatches = cleanInput.match(new RegExp(rule.primaryPhrases.source, 'gi'));
    if (phraseMatches) {
      score += phraseMatches.length * 4;
      currentKeywords.push(...phraseMatches.map((m) => m.toLowerCase()));
    }

    // Check individual keywords
    const keywordMatches = cleanInput.match(new RegExp(rule.keywords.source, 'gi'));
    if (keywordMatches) {
      score += keywordMatches.length;
      currentKeywords.push(...keywordMatches.map((m) => m.toLowerCase()));
    }

    if (score > highestScore) {
      highestScore = score;
      bestType = rule.type;
      matchingRule = rule;
      detectedKeywords = Array.from(new Set(currentKeywords));
    }
  }

  // Vision input context booster
  if (hasVisionInput(attachments)) {
    // If user has an image and mentions product/marketing words without high score, bias to ad_campaign
    if (bestType === 'general_inquiry' && /\b(product|brand|business|sell|marketing|coffee|store|item|launch)\b/i.test(cleanInput)) {
      bestType = 'ad_campaign';
      matchingRule = DELIVERABLE_RULES.find((r) => r.type === 'ad_campaign')!;
      detectedKeywords.push('multimodal_product_image');
      highestScore = Math.max(highestScore, 3);
    }
  }

  // If no deliverable matches were found (score == 0) and no vision input, default to general_inquiry
  if (highestScore === 0 && !hasVision) {
    return {
      deliverableType: 'general_inquiry',
      confidence: 0.6,
      hasVisionInput: false,
      recommendedModel: 'openrouter/free',
      modelRationale: 'Auto Free OpenRouter cluster provides sub-second low-latency conversational responses and broad world knowledge.',
      detectedKeywords: [],
      formatSpecification: 'Clear, concise, and informative conversational answer.',
    };
  }

  // Model selection resolution
  let recommendedModel = matchingRule.defaultModel;
  let modelRationale = matchingRule.defaultRationale;

  if (hasVision) {
    recommendedModel = 'openrouter/free';
    modelRationale = 'Auto Free OpenRouter cluster selected for native multimodal vision perception and visual asset extraction.';
  }

  const confidence = Math.min(0.98, Math.max(0.65, 0.65 + highestScore * 0.05));

  return {
    deliverableType: bestType,
    confidence,
    hasVisionInput: hasVision,
    recommendedModel,
    modelRationale,
    detectedKeywords,
    formatSpecification: matchingRule.formatSpecification,
  };
}

// Alias for convenience
export const hasVisionInput = detectVisionInput;

