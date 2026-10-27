/**
 * PromptHub Guide — Grounded Knowledge Base
 * 
 * Fact-checked documentation derived directly from verified codebase capabilities.
 * Every article contains stable ID, category, route, intent keywords, summary,
 * step-by-step guidance, prerequisites, troubleshooting, cost notes, and verified commit.
 */

import type { TabType } from '../context/AppContext';

export type KnowledgeCategory =
  | 'getting-started'
  | 'studio'
  | 'arena'
  | 'analyzer'
  | 'models'
  | 'byok'
  | 'billing'
  | 'teams'
  | 'storage'
  | 'marketplace'
  | 'news'
  | 'support'
  | 'settings';

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  category: KnowledgeCategory;
  route: TabType;
  tourId?: string;
  intent: string[];
  summary: string;
  steps: string[];
  prerequisites: string[];
  troubleshooting: string[];
  costNote: string;
  verifiedCommit: string;
}

export const GUIDE_KNOWLEDGE_BASE: KnowledgeBaseArticle[] = [
  {
    id: 'kb-fin-support-agent',
    title: 'How does the Fin 24/7 Customer Support Agent work?',
    category: 'support',
    route: 'support',
    intent: ['fin', 'customer support', 'help', 'ticket', 'contact', 'support agent', 'intercom', 'live chat', 'talk to human'],
    summary: 'PromptHub provides 24/7 automated and human-assisted customer support powered by Fin (Intercom). Open live chat anytime from any screen to resolve questions, credit recharges, or account issues.',
    steps: [
      'Click the Intercom chat bubble in the bottom right corner or click "Chat with Fin" in the top bar and settings.',
      'Type your question in natural language regarding recharge orders, Pro billing, prompt licensing, or studio tools.',
      'Fin checks your verified account telemetry and provides immediate answers or escalates directly to human administrators.'
    ],
    prerequisites: ['Available to all users, visitors, and logged-in developers without extra charges.'],
    troubleshooting: [
      'If the chat widget does not appear, ensure ad blockers are not blocking api-iam.intercom.io.',
      'You can also email support@prompthub.cloud directly for enterprise and security inquiries.'
    ],
    costNote: '100% Free 24/7 support across all PromptHub accounts.',
    verifiedCommit: 'f6a136b'
  },
  {
    id: 'kb-unified-creation-engine',
    title: 'How does the Unified Creation Workspace bundle code, images & prompt.md?',
    category: 'studio',
    route: 'workspace',
    tourId: 'workspace-creation-tour',
    intent: ['workspace', 'creation', 'deliverables', 'code editor', 'preview', 'bundle', 'folder', 'prompt.md', 'export zip'],
    summary: 'The Creation Workspace accepts natural language prompts, runs multi-concept visual pipelines, and bundles all source code, assets, and master prompt.md into an uncluttered project folder with instant Google Drive sync and ZIP export.',
    steps: [
      'Type your product or software requirement into the Unified Studio composer.',
      'Our engine applies domain skills and MCP tools to produce clean deliverable code and interactive preview.',
      'Click "Export ZIP" to download a clean offline archive, or click "Sync to Drive" to back up to Google Drive Vault.'
    ],
    prerequisites: ['Free account gets full workspace capabilities and interactive browser preview.'],
    troubleshooting: [
      'If a preview fails to render, check the console tab in the split editor or use "Quick Refine" to fix syntax.',
      'Folder names and chat sessions have standard character limits to keep the interface clean and structured.'
    ],
    costNote: 'Runs free with BYOK or standard PromptHub inference credits.',
    verifiedCommit: 'f6a136b'
  },
  {
    id: 'kb-upi-qr-creator-payouts',
    title: 'How do prompt creators receive 70% royalties via Instant UPI & Bank Transfer?',
    category: 'marketplace',
    route: 'settings',
    intent: ['upi', 'payout', 'royalties', 'earnings', 'bank', 'sell', 'qr code', 'vpa', 'creator payout'],
    summary: 'PromptHub pays creators 70% direct royalty on every marketplace license sale with zero hidden platform withdrawal deductions. Configure your UPI ID (VPA), upload your personal QR code, or link an Indian bank account.',
    steps: [
      'Navigate to Settings and select the "Creator Payouts" category.',
      'Select preferred payout destination: UPI ID (e.g. username@okhdfcbank) or Bank Account (NEFT/IMPS).',
      'Optionally upload your branded QR Code image (Google Pay, PhonePe, Paytm, or BHIM) for instant scannable display.',
      'Click "Save Payout Details". All payouts are encrypted and protected by Supabase RLS.'
    ],
    prerequisites: ['Valid Indian UPI VPA or verified bank account with IFSC code.'],
    troubleshooting: [
      'Ensure your UPI ID matches standard VPA formatting (handle@bank).',
      'Uploaded QR images must be PNG, JPG, or WEBP under 5MB.'
    ],
    costNote: '70% creator share is credited directly with 0 withdrawal processing fee.',
    verifiedCommit: 'f6a136b'
  },
  {
    id: 'kb-google-drive-vault',
    title: 'How do I use Google Drive Cloud Storage Vault for project backups & ZIP exports?',
    category: 'storage',
    route: 'settings',
    intent: ['drive', 'google drive', 'cloud', 'backup', 'vault', 'zip', 'export', 'storage'],
    summary: 'Connect your Google Drive in Settings or Drive Vault to automatically sync your workspace projects, code folders, image deliverables, and prompt history with 1-click cloud sync and zero lock-in.',
    steps: [
      'Open Settings → Google Drive Vault or navigate to the Drive Vault tab.',
      'Sign in with Google OAuth to grant secure storage permissions.',
      'From Workspace or Studio, click "Sync to Google Drive" to push active project folders directly to your Drive.'
    ],
    prerequisites: ['Google account with available Drive storage quota.'],
    troubleshooting: [
      'If Drive sync fails, verify that your browser pop-up blocker did not interrupt Google OAuth authentication.',
      'You can check your live storage quota directly in the Settings Companion Sidebar.'
    ],
    costNote: 'Cloud sync uses your existing Google Drive free tier (15 GB) with 0 PromptHub storage markup.',
    verifiedCommit: 'f6a136b'
  },
  {
    id: 'kb-mobile-app-apk',
    title: 'How do I install the PromptHub Mobile App or Android APK?',
    category: 'settings',
    route: 'settings',
    intent: ['apk', 'mobile app', 'android', 'install', 'pwa', 'download', 'mobile prompt engineering'],
    summary: 'PromptHub offers a native Android APK and Progressive Web App (PWA). You can download the APK file directly in Settings or install it to your home screen on Android and iOS.',
    steps: [
      'Navigate to Settings and select "Mobile & APK".',
      'Click "Download Android APK" to get the latest production release package.',
      'On mobile browsers (Chrome or Safari), click "Add to Home Screen" to install PromptHub as a full-screen PWA.'
    ],
    prerequisites: ['Android device running Android 8.0+ or modern mobile browser.'],
    troubleshooting: [
      'Enable "Install unknown apps" in Android security settings if sideloading the standalone APK file.',
      'The mobile app features full Studio IDE, Workspace deliverables, and model testing.'
    ],
    costNote: 'Free download and installation for all registered developers.',
    verifiedCommit: 'f6a136b'
  },
  {
    id: 'kb-first-prompt',
    title: 'What should I use first as a beginner on PromptHub?',
    category: 'getting-started',
    route: 'workspace',
    tourId: 'workspace-creation-tour',
    intent: ['start', 'beginner', 'first prompt', 'how to use', 'getting started', 'guide', 'create', 'workspace'],
    summary: 'Start in the Creation Workspace. Describe your idea in plain English, review 2–3 visual design concepts, approve your preferred direction, and watch PromptHub build the live project.',
    steps: [
      'Navigate to Workspace by clicking "Workspace" in the top navbar or "Open Workspace" on the homepage.',
      'Describe what you want to create (e.g. "Minimalist dark portfolio for a senior engineer with clean typography").',
      'Review the 2–3 live visual design options generated by PromptHub.',
      'Click "Use this design" to accept, "Generate new designs" for more options, or "Request changes" to tweak parameters.',
      'Refine the live project in the browser preview with natural-language follow-up prompts.'
    ],
    prerequisites: ['Free sign-in unlocks persistent project storage and full browser preview.'],
    troubleshooting: [
      'If the Create button is disabled, ensure your message composer contains non-whitespace text.',
      'If you need advanced prompt editing, multi-model benchmarking, or quality scoring, use Studio IDE or Arena.'
    ],
    costNote: '100% Free to explore concepts and review pre-rendered specs. 0 credits consumed.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-workspace-build',
    title: 'How does PromptHub turn natural language descriptions into live projects?',
    category: 'getting-started',
    route: 'workspace',
    tourId: 'workspace-creation-tour',
    intent: ['build project', 'generate portfolio', 'design concept', 'vite hmr', 'preview', 'how it works'],
    summary: 'PromptHub uses a 4-step creation engine: plain-English description, multi-concept visual generation, interactive approval, and live browser compilation with Vite HMR preview.',
    steps: [
      'Step 1 (Describe): Type your concept or brief into the creation composer.',
      'Step 2 (Explore Concepts): Browse tailored aesthetic directions like Deep Navy Studio, Terminal CLI, or Retro 8-bit.',
      'Step 3 (Approve & Build): Select your preferred aesthetic and PromptHub compiles responsive React components and Tailwind styling.',
      'Step 4 (Refine & Export): Preview the live application, request changes in natural language, and export the code bundle.'
    ],
    prerequisites: ['Works immediately in browser.'],
    troubleshooting: [
      'Use the desktop/mobile preview toggle above the canvas to verify responsiveness on all devices.',
      'Click "Start Over" if you want to generate completely fresh design directions.'
    ],
    costNote: 'Free to test in workspace demo. 0 credits consumed.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-studio-ide',
    title: 'How do I use the Prompt Studio IDE to write and test prompts?',
    category: 'studio',
    route: 'workspace',
    tourId: 'workspace-variables-tour',
    intent: ['studio', 'ide', 'editor', 'system prompt', 'test prompt', 'run model', 'developer'],
    summary: 'Prompt Studio is an interactive prompt editor featuring system role configuration, reusable {{variable}} syntax, direct model runs, token & latency tracking, and version snapshot history.',
    steps: [
      'Open Workspace or Studio from the navigation.',
      'Write your system prompt or role instructions in the prompt composer.',
      'Add reusable parameters using {{variable_name}} syntax.',
      'Fill in sample test values in the auto-detected parameter fields on the right panel.',
      'Select your preferred AI model from the top model pill and click "Run" (or ⌘Enter) to test.'
    ],
    prerequisites: ['Free account required to save prompts permanently to your private library.'],
    troubleshooting: [
      'If test values are missing, PromptHub highlights undefined variables before dispatching to the model.',
      'Check token consumption and latency metrics displayed directly below the model completion.'
    ],
    costNote: 'Free with free OpenRouter models or BYOK keys; 1–4 credits for managed frontier model runs.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-dynamic-variables',
    title: 'How do dynamic variables like {{variable_name}} work?',
    category: 'studio',
    route: 'workspace',
    tourId: 'workspace-variables-tour',
    intent: ['variable', 'parameter', 'curly braces', 'template parameter', 'dynamic text', 'syntax', 'interpolation'],
    summary: 'Variables turn static prompts into reusable templates. Wrap any parameter name in double curly braces, like {{user_role}} or {{code_snippet}}, and PromptHub automatically extracts input fields for testing.',
    steps: [
      'In the prompt editor, type double curly braces around your parameter: {{parameter_name}}.',
      'PromptHub automatically extracts detected variables into the Parameters tab in the right-hand panel.',
      'Provide test values for each variable in the generated input fields.',
      'When running or benchmarking, PromptHub interpolates variable values seamlessly into the prompt payload.'
    ],
    prerequisites: ['Valid variable names contain alphanumeric characters and underscores (e.g. {{user_name}}, {{target_audience}}).'],
    troubleshooting: [
      'If a variable is not detected, ensure there are no spaces inside the curly braces: use {{name}}, not {{ name }}.',
      'Switch between JSON input and form field mode in the Parameters panel for complex payloads.'
    ],
    costNote: 'Variable extraction and validation happens 100% client-side in browser memory. 0 credits consumed.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-ai-improve',
    title: 'How does AI Auto-Improvement work for my prompts?',
    category: 'analyzer',
    route: 'analyzer',
    intent: ['improve', 'optimize prompt', 'auto enhance', 'better prompt', 'refine prompt', 'fix prompt'],
    summary: 'The Auto-Improvement engine analyzes your prompt against 7 quality dimensions, injects clear boundary constraints and output formatting schemas, and optimizes instructions while preserving your original intent.',
    steps: [
      'Paste your draft prompt into the Analyzer or Studio editor.',
      'Review the automated 7-Point Quality Breakdown highlighting missing constraints or ambiguous language.',
      'Click the "Auto-Improve" button (Sparkles icon).',
      'Inspect the side-by-side diff showing what was changed, added, or clarified.',
      'Click "Accept Changes" to replace your draft or "Copy Improved Prompt" to use elsewhere.'
    ],
    prerequisites: ['Available across all prompt lengths up to 32,000 characters.'],
    troubleshooting: [
      'If you prefer strict programmatic tone over conversational polish, select "Technical Strict" mode before clicking improve.',
      'You can always press ⌘Z or use Version History to restore your original draft.'
    ],
    costNote: '1 platform credit per auto-improvement run (or free with your personal BYOK key).',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-voice-prompts',
    title: 'Can I dictate prompts using voice and speech-to-text?',
    category: 'studio',
    route: 'workspace',
    intent: ['voice', 'microphone', 'dictate', 'speech to text', 'audio prompt', 'mic', 'hands free'],
    summary: 'Yes! In the Studio and Dashboard composers, click the Microphone icon to dictate your prompt hands-free. PromptHub transcribes spoken speech into text with automated variable syntax parsing.',
    steps: [
      'In the Workspace composer or quick prompt bar, click the Microphone button.',
      'Grant browser microphone permission when prompted.',
      'Speak your prompt instructions clearly.',
      'Click Stop to transcribe. The text populates your active editor session automatically.'
    ],
    prerequisites: ['Browser microphone permission.'],
    troubleshooting: [
      'If microphone permission was denied, click the lock icon in your browser URL bar to re-enable microphone access.',
      'For best accuracy, use in a quiet environment with a clear speaking voice.'
    ],
    costNote: 'Free using browser Web Speech API. 0 credits consumed.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-image-multimodal',
    title: 'Can I attach images or screenshots to prompts for multimodal models?',
    category: 'studio',
    route: 'workspace',
    intent: ['image', 'screenshot', 'attachment', 'multimodal', 'vision', 'ocr', 'drag and drop photo'],
    summary: 'Yes. You can paste, drag-and-drop, or upload screenshots, UI mockups, and diagrams. Multimodal models like GPT-4o, Claude 3.5 Sonnet, and Gemini 2.0 Flash analyze image context directly alongside your text instructions.',
    steps: [
      'In the composer, drag and drop an image or click the Camera / Attachment icon.',
      'Alternatively, press Ctrl+V / ⌘V while focused on the composer to paste a screenshot directly from your clipboard.',
      'PromptHub compresses and attaches the image as visual context.',
      'Select a vision-capable model (e.g., GPT-4o, Claude 3.5 Sonnet, Gemini 2.0 Flash).',
      'Run the prompt to receive visual audits, code generation from UI, or image analysis.'
    ],
    prerequisites: ['Supported image formats: PNG, JPG, WEBP, GIF (up to 10 MB).'],
    troubleshooting: [
      'Ensure you select a model with vision support; text-only models like DeepSeek-R1 will ignore image attachments.'
    ],
    costNote: 'Uses standard token pricing based on image resolution per provider terms.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-multi-model-arena',
    title: 'How does the Multi-Model Arena evaluate prompts across frontier models?',
    category: 'arena',
    route: 'arena',
    tourId: 'arena-benchmarking-tour',
    intent: ['arena', 'multi model', 'compare models', 'benchmark', 'latency', 'ttft', 'side by side', 'cost tracking'],
    summary: 'The Multi-Model Arena broadcasts your identical prompt simultaneously across 2 to 4 frontier AI models (OpenAI, Claude, Gemini, DeepSeek, Groq). It measures time-to-first-token (TTFT), completion speed, token count, and exact INR cost side-by-side.',
    steps: [
      'Navigate to the Multi-Model Arena from the sidebar or by clicking "Arena Test".',
      'Type or paste your prompt into the Arena composer.',
      'Select 2 to 4 models to compare (e.g., Claude 3.5 Sonnet vs GPT-4o vs DeepSeek-R1 vs Gemini 2.0 Flash).',
      'Click "Run Arena Benchmark" (⌘Enter).',
      'Inspect responses side-by-side with synchronized metrics for latency, tokens, and cost.'
    ],
    prerequisites: ['Connect BYOK keys for 0% markup, or use wallet credits / free models.'],
    troubleshooting: [
      'Use the Diff Comparison toggle to highlight structural differences in model completions.',
      'Click "Export Benchmark" to download a CSV or JSON report of your model shootout.'
    ],
    costNote: '0 credits when using personal BYOK keys or free models. When using managed credits, token cost is deducted transparently per provider.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-analyzer-breakdown',
    title: 'How does the Prompt Analyzer 7-Point Quality Breakdown work?',
    category: 'analyzer',
    route: 'analyzer',
    intent: ['analyzer', 'audit', 'score', 'quality score', 'heuristics', 'rubric', 'prompt injection', 'safety'],
    summary: 'Prompt Analyzer audits prompts across 7 critical dimensions: Clarity, Specificity, Context, Boundary Constraints, Output Format, Role Definition, and Safety Guardrails. It flags vulnerabilities, score gaps, and ambiguous instructions before production deployment.',
    steps: [
      'Open the Analyzer tab from the sidebar.',
      'Paste any system prompt, user prompt, or agent instruction.',
      'Click "Analyze Prompt" to trigger the multi-point evaluation.',
      'Review your Overall Quality Score (0–100) and the 7-Point breakdown bars.',
      'Click on any identified issue to view why it poses a risk and how to fix it.'
    ],
    prerequisites: ['Works with prompts in all languages and formats.'],
    troubleshooting: [
      'Scores above 85 are considered Production Ready.',
      'Get actionable engineering feedback, structural scores, and automated improvements.'
    ],
    costNote: '1 platform credit per deep audit (or free with your personal BYOK key).',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-model-catalog-diff',
    title: 'What is the difference between 46 verified models and 400+ community models?',
    category: 'models',
    route: 'models-guide',
    intent: ['verified models', 'community models', 'openrouter', 'model catalog', 'providers', 'foundation models'],
    summary: 'PromptHub provides direct calibrated access to 46 canonical foundation models with native token tracking, speed metrics, and parameter sliders. Connecting an OpenRouter API key unlocks over 400+ community open-weights models with 0% platform markup.',
    steps: [
      'Navigate to the Models Guide (/models) from the navbar or sidebar.',
      'Browse verified models categorized by Reasoning, Coding, Long-Context, and Speed.',
      'Inspect model latency benchmarks, context window limits (up to 2M tokens), and input/output pricing.',
      'To unlock 400+ community models, add your OpenRouter key under Settings > API Credentials.'
    ],
    prerequisites: ['All 46 verified models are available immediately in Studio, Arena, and Analyzer.'],
    troubleshooting: [
      'Filter models by "Free Tier", "Vision Capable", or "Reasoning Traces" using the search filter chips.'
    ],
    costNote: 'Verified models can be run via Wallet Credits or personal BYOK keys. OpenRouter community models run via BYOK at 0% markup.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-free-models',
    title: 'Which AI models can I use completely free on PromptHub?',
    category: 'models',
    route: 'models-guide',
    intent: ['free models', 'no credit cost', 'zero cost', 'free tier', 'deepseek free', 'llama free'],
    summary: 'PromptHub provides curated free-tier models that consume 0 platform credits. These include DeepSeek-R1, DeepSeek-V3, Meta Llama 3.3 70B, Google Gemma 2, and Mistral Small via verified community gateways.',
    steps: [
      'In Studio, Arena, or Analyzer, click the Model Selector dropdown.',
      'Look for the green "Free Tier" or "0 Cr" badge next to model names.',
      'Select any free model (e.g., DeepSeek-R1, Llama 3.3 70B, Gemma 2 9B).',
      'Run your prompts with zero credit deduction from your wallet balance.'
    ],
    prerequisites: ['Free account registration.'],
    troubleshooting: [
      'Free community models have shared rate limits. If a 429 rate limit occurs, wait 10 seconds or connect a personal BYOK key for dedicated quota.'
    ],
    costNote: '0 platform credits. 100% free forever.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-byok-explained',
    title: 'What is Bring-Your-Own-Key (BYOK) and how do I connect my keys?',
    category: 'byok',
    route: 'credentials',
    tourId: 'settings-credentials-tour',
    intent: ['byok', 'api key', 'connect openai', 'connect anthropic', 'connect gemini', 'groq key', 'openrouter key'],
    summary: 'Bring-Your-Own-Key (BYOK) lets you connect your personal API keys from OpenAI, Anthropic, Google Gemini, Groq, DeepSeek, and OpenRouter. You get direct inference with 0% platform markup and dedicated rate limits.',
    steps: [
      'Navigate to Settings > API Credentials (/settings).',
      'Select the provider you wish to connect (OpenAI, Anthropic, Google, Groq, DeepSeek, or OpenRouter).',
      'Paste your secret API key into the secure credential field.',
      'Click "Test & Save Credential". PromptHub verifies key validity with a lightweight test call.',
      'Once verified, all subsequent model runs route directly to your provider key at ₹0 platform cost.'
    ],
    prerequisites: ['Active developer API account with the respective AI provider.'],
    troubleshooting: [
      'If key validation fails, ensure your provider account has active billing credits and valid permissions.',
      'You can disconnect or overwrite any saved API key at any time with one click.'
    ],
    costNote: '0% platform markup. You pay only your direct provider invoice.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-byok-security',
    title: 'Where are my API keys stored and how are they encrypted?',
    category: 'byok',
    route: 'settings',
    intent: ['security', 'encryption', 'aes gcm', 'web crypto', 'vault', 'privacy', 'where are keys stored', 'safe'],
    summary: 'Your API keys never leave your browser. They are encrypted client-side using 256-bit AES-GCM Web Crypto and stored locally in your browser\'s IndexedDB (ph_credential_vault_db). PromptHub servers never receive, log, or persist your third-party credentials.',
    steps: [
      'When you enter an API key, the browser invokes window.crypto.subtle to derive an encryption key via PBKDF2.',
      'The raw credential is encrypted using AES-GCM with a randomized initialization vector (IV).',
      'The encrypted ciphertext is stored inside IndexedDB under database ph_credential_vault_db.',
      'During inference, the key is decrypted in volatile browser memory only for the duration of the API call.'
    ],
    prerequisites: ['Supported on all modern browsers with Web Crypto API (Chrome, Safari, Firefox, Edge).'],
    troubleshooting: [
      'Clearing your browser site data or cookies removes stored keys, requiring you to reconnect them.',
      'To wipe your keys manually, click "Clear Credential Vault" under Settings > Security.'
    ],
    costNote: 'Client-side cryptographic security is 100% free and built into PromptHub.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-model-training',
    title: 'Are my private prompts used to train public AI models?',
    category: 'byok',
    route: 'settings',
    intent: ['privacy', 'training', 'data retention', 'is my data safe', 'train models', 'confidentiality', 'gdpr'],
    summary: 'No. PromptHub operates with a strict zero data training policy and never trains models on your prompts, variables, or completions. All inference requests route to standard enterprise endpoints that explicitly guarantee non-training per provider terms.',
    steps: [
      'Requests sent through PromptHub utilize commercial enterprise API endpoints (e.g. OpenAI API, Anthropic API, Google Cloud Vertex/Gemini API).',
      'These enterprise API endpoints are legally bound by provider business terms that prohibit using API payloads for model training.',
      'When using BYOK, your requests travel directly from browser to provider with zero PromptHub proxy interception.'
    ],
    prerequisites: ['Applies to all users, plans, and workspace modes.'],
    troubleshooting: [
      'For enterprise data processing agreements (DPA) or SOC 2 compliance documentation, contact prompthub.cloud@gmail.com.'
    ],
    costNote: 'Zero training and privacy protection is standard for every user.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-credit-costs',
    title: 'How do credits work and what does each model run cost?',
    category: 'billing',
    route: 'pricing',
    intent: ['credits', 'cost', 'pricing', 'how much', 'wallet cost', 'token pricing', 'rate'],
    summary: 'PromptHub credits provide managed access to frontier models without requiring individual provider accounts. Credits are pegged at ₹1 = 2 credits (₹0.50 per credit) and deduct transparently based on actual model token consumption.',
    steps: [
      'Navigate to Pricing or Recharge to inspect the credit cost calculator.',
      'Standard model runs consume between 1 to 4 credits depending on model tier and output length.',
      'Fast models (Gemini 2.0 Flash, Claude 3.5 Haiku): ~1 credit per run.',
      'Frontier reasoning models (GPT-4o, Claude 3.5 Sonnet, o3-mini): ~2 to 4 credits per run.',
      'Free community models (DeepSeek-R1, Llama 3.3): 0 credits per run.'
    ],
    prerequisites: ['Available across all accounts.'],
    troubleshooting: [
      'You can connect your personal BYOK key anytime to run paid models at 0 platform credit cost.'
    ],
    costNote: '₹1 = 2 platform credits. Credits never expire.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-wallet-recharge',
    title: 'How do I recharge my PromptHub wallet?',
    category: 'billing',
    route: 'recharge',
    intent: ['recharge', 'top up', 'buy credits', 'razorpay', 'upi', 'cards', 'wallet', 'payment'],
    summary: 'You can recharge your on-demand wallet starting at just ₹100 for 200 credits. We support all Indian payment rails via Razorpay (UPI, Google Pay, PhonePe, Paytm, Debit/Credit Cards, NetBanking) and international cards via Stripe.',
    steps: [
      'Navigate to Recharge (/recharge) from the sidebar or click your credit balance badge.',
      'Choose a recharge pack: Starter (₹100 = 200 cr), Developer (₹300 = 650 cr), Power (₹500 = 1,150 cr), or Studio (₹1,000 = 2,400 cr).',
      'Click "Recharge Now" to open the secure Razorpay checkout modal.',
      'Pay via your preferred UPI app, card, or NetBanking.',
      'Upon successful payment, credits are added atomically to your wallet balance within 2 seconds.'
    ],
    prerequisites: ['Valid Indian UPI ID, debit/credit card, or netbanking account.'],
    troubleshooting: [
      'If your UPI app approved the payment but credits did not update, click "Verify Recent Payment" or contact support with your Razorpay payment ID.',
      'Tax invoices with GST breakdown are generated automatically in your Billing History.'
    ],
    costNote: 'Minimum recharge is ₹100. Zero hidden fees, zero maintenance charges.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-credit-expiry',
    title: 'Do PromptHub credits expire?',
    category: 'billing',
    route: 'pricing',
    intent: ['expire', 'validity', 'credit expiration', 'do credits expire', 'carry over', 'refund'],
    summary: 'PromptHub credits never expire. Any credits purchased via wallet recharge remain in your account indefinitely until used, carrying over month after month.',
    steps: [
      'Recharge any amount from ₹100 upwards.',
      'Use credits whenever you need to test models, run audits, or build projects.',
      'Your remaining credit balance carries over indefinitely without expiration dates or forfeiture.'
    ],
    prerequisites: ['Applies to all on-demand wallet credit purchases.'],
    troubleshooting: [
      'Pro plan monthly recurring credit allowances refresh every 30 days, while on-demand wallet credits never expire.'
    ],
    costNote: 'No inactivity fees or monthly decay.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-pro-subscription',
    title: 'What is included in the PromptHub Pro plan (₹799/month)?',
    category: 'billing',
    route: 'pricing',
    intent: ['pro plan', 'subscription', 'upgrade', '799', 'pro features', 'benefits'],
    summary: 'The Pro plan (₹799/month) is built for serious developers, agencies, and power teams. It includes 500 monthly platform credits, priority model routing, team workspace creation, and unlimited cloud backups.',
    steps: [
      'Navigate to Pricing (/pricing) and select the Pro Plan card.',
      'Click "Upgrade to Pro" to complete checkout via Razorpay or Stripe.',
      'Enjoy 500 platform credits renewed every billing cycle.',
      'Unlock team workspaces with role-based member management (up to 4 members).',
      'Access priority model queues with reduced latency during peak hours.'
    ],
    prerequisites: ['Active payment method.'],
    troubleshooting: [
      'You can cancel your Pro subscription anytime in Settings > Billing. Your Pro benefits remain active until the end of the billing period.'
    ],
    costNote: '₹799 per month. Cancel anytime with one click.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-team-workspaces',
    title: 'How do Team Workspaces work and how do I collaborate?',
    category: 'teams',
    route: 'teams',
    tourId: 'teams-collaboration-tour',
    intent: ['teams', 'collaboration', 'share prompts', 'team workspace', 'roles', 'permissions', 'invite members'],
    summary: 'Team Workspaces let engineering and product teams share verified prompt collections, manage role-based permissions (Owner, Admin, Editor, Viewer), review prompt revisions, and collaborate together in real-time.',
    steps: [
      'Navigate to Teams (/teams) from the sidebar.',
      'Click "Create Team Workspace" and give your team a name and description.',
      'Invite team members by email or by sharing your unique 6-character team join code.',
      'Assign roles: Owner (full control), Admin (manage members & prompts), Editor (create & edit prompts), or Viewer (read & run prompts).',
      'Save prompts directly to your shared team collections.'
    ],
    prerequisites: ['Available on Pro plans or trial invitations.'],
    troubleshooting: [
      'Private personal prompts remain isolated from team collections unless explicitly shared.',
      'Each team supports up to 4 members to maintain tight collaboration.'
    ],
    costNote: 'Team workspace creation is included with Pro plan.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-team-member-limit',
    title: 'How many members can join a single team workspace?',
    category: 'teams',
    route: 'teams',
    intent: ['team limit', 'max members', 'how many people', '4 members', 'team size', 'member cap'],
    summary: 'Each team workspace supports a maximum of 4 members (1 Owner + up to 3 Admins/Editors/Viewers). This ensures focused, high-trust collaboration and streamlined prompt governance.',
    steps: [
      'Open your team workspace in Teams view.',
      'View your active team roster count in the team header (e.g., 3/4 Members).',
      'If your team currently has fewer than 4 members, click "Invite Member" to add a teammate.',
      'If your team has reached the 4-member limit, you must remove an inactive member before inviting a new one.'
    ],
    prerequisites: ['Team Owner or Admin permission to invite or remove members.'],
    troubleshooting: [
      'If an invite fails with "Team member limit reached", check your active members count and pending invitations.'
    ],
    costNote: 'Up to 4 members included at no extra per-seat cost.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-google-drive-storage',
    title: 'How do I connect Google Drive and back up my prompts to Cloud Storage?',
    category: 'storage',
    route: 'storage',
    intent: ['google drive', 'storage', 'cloud backup', 'backup prompts', 'drive sync', '500 mb', 'restore'],
    summary: 'PromptHub includes a cloud storage vault with 500 MB free quota (up to 5 TB enterprise). You can connect your Google Drive account to automatically back up your prompts, export library snapshots, and restore working versions.',
    steps: [
      'Navigate to Storage Vault (/storage) from the sidebar.',
      'Click "Connect Google Drive" and authenticate with your Google account.',
      'Authorize PromptHub to create a secure, isolated folder (/PromptHub Backups) in your Drive.',
      'Toggle "Automated Daily Backups" to keep your prompt repository safely synchronized.',
      'Click "Download Backup Archive" anytime to get an offline JSON/ZIP snapshot of all your prompts.'
    ],
    prerequisites: ['Google account for Google Drive integration.'],
    troubleshooting: [
      'PromptHub only requests scoped folder access to its own folder; it cannot view or access any other files in your Google Drive.',
      'If the connection expires, click "Reconnect Drive" to refresh the OAuth token.'
    ],
    costNote: '500 MB free storage quota included for all users.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-marketplace-buy-sell',
    title: 'How do I buy or sell prompts in the PromptHub Marketplace?',
    category: 'marketplace',
    route: 'marketplace',
    tourId: 'marketplace-templates-tour',
    intent: ['marketplace', 'templates', 'buy prompt', 'sell prompt', 'creator', 'monetize', 'royalties'],
    summary: 'The PromptHub Marketplace features battle-tested prompts across 10+ categories. Anyone can explore and fork free prompts, purchase premium templates, or publish their own verified prompts to earn 80% creator royalties.',
    steps: [
      'Explore Templates: Filter by category (Engineering, SRE, Marketing, Creative, Writing, etc.).',
      'Click any template card to inspect the prompt preview, detected variables, and benchmark outputs.',
      'Click "Use in Studio" to fork the prompt directly into your private workspace.',
      'To sell prompts: Click "Publish Prompt" from Studio, set your price (in credits or INR), and submit for moderation.',
      'Earn 80% creator revenue share on every purchase of your template.'
    ],
    prerequisites: ['Registered user account.'],
    troubleshooting: [
      'All published prompts pass through automated quality and safety verification before going public.'
    ],
    costNote: 'Browse and fork free templates for 0 credits. Premium templates priced by creator.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-creator-payouts',
    title: 'How do prompt creators request payouts for their sales?',
    category: 'marketplace',
    route: 'profile',
    intent: ['payout', 'withdraw', 'creator earnings', 'royalties', 'bank transfer', 'upi payout'],
    summary: 'Creators who sell prompts in the Marketplace accumulate revenue in their Creator Wallet. Once you reach the minimum balance of ₹500, you can request an instant payout via UPI or direct bank transfer.',
    steps: [
      'Navigate to Profile > Creator Earnings (/profile).',
      'Inspect your total sales volume, prompt purchases, and available payout balance.',
      'Enter your UPI ID or bank account details (Account Number, IFSC, Account Holder Name).',
      'Click "Request Payout".',
      'The admin team verifies and settles payouts within 24–48 business hours via RazorpayX.'
    ],
    prerequisites: ['Minimum payout threshold is ₹500.'],
    troubleshooting: [
      'Ensure your UPI ID is active and correctly formatted (e.g. yourname@okhdfcbank or yourname@paytm).',
      'View completed payout transaction receipts under Payout History.'
    ],
    costNote: '80% net revenue goes directly to creators.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-ai-daily-news',
    title: 'What is AI Daily News & Intelligence and how often is it updated?',
    category: 'news',
    route: 'news',
    intent: ['news', 'ai news', 'frontier models', 'updates', 'research papers', 'daily news', 'breaking'],
    summary: 'AI Daily News is PromptHub\'s curated real-time intelligence feed covering frontier model releases, prompt engineering breakthroughs, research papers, and developer tooling announcements.',
    steps: [
      'Click "News" in the top navbar or sidebar (/news).',
      'Browse chronological articles with source attribution, model tags, and difficulty ratings.',
      'Use the search bar to find articles by model name (e.g. "DeepSeek", "Claude", "Gemini") or topic.',
      'Filter articles by category: Model Releases, Prompt Engineering, Research, or Industry.'
    ],
    prerequisites: ['Publicly accessible to all visitors and users.'],
    troubleshooting: [
      'Click "Live Feed" to refresh the latest intelligence updates.',
      'Click external citation links to read original research whitepapers and official announcement blogs.'
    ],
    costNote: '100% Free for everyone.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-prompt-versioning',
    title: 'How does version control and instant rollback work for prompts?',
    category: 'studio',
    route: 'workspace',
    tourId: 'studio-versioning-tour',
    intent: ['version', 'rollback', 'git', 'history', 'revisions', 'diff', 'restore prompt'],
    summary: 'PromptHub provides git-style snapshot versioning for all your prompts. Every save creates an immutable checkpoint with visual side-by-side diffs and one-click restore.',
    steps: [
      'In the Studio editor, make edits to your prompt content, parameters, or system message.',
      'Click "Save Snapshot" (or press ⌘S) and provide an optional change note.',
      'Open the "History" tab in the right-hand sidebar to view all chronological revisions.',
      'Click on any previous version to view a color-coded visual diff of added and removed lines.',
      'Click "Restore this Version" to roll your active editor draft back instantly.'
    ],
    prerequisites: ['Registered user account.'],
    troubleshooting: [
      'Snapshots preserve variable values and model parameter configurations along with prompt text.'
    ],
    costNote: 'Unlimited snapshot versioning included at 0 credit cost.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-forking-prompts',
    title: 'How do I fork a prompt from the community into my private workspace?',
    category: 'marketplace',
    route: 'marketplace',
    intent: ['fork', 'clone', 'copy prompt', 'template', 'branch', 'save template'],
    summary: 'Forking creates a private, isolated copy of any public or team template in your personal workspace. You can edit, customize variables, and run tests without affecting the upstream prompt.',
    steps: [
      'Find any prompt card in the Marketplace or Team library.',
      'Click "Fork into Studio" or the Git Branch icon.',
      'PromptHub creates an independent copy in your private library (/library).',
      'The prompt opens immediately in Studio ready for editing and execution.'
    ],
    prerequisites: ['Works with all public and team-shared prompts.'],
    troubleshooting: [
      'Your forked prompts maintain attribution to the original author while giving you 100% editing autonomy.'
    ],
    costNote: '0 credits to fork.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-export-prompts',
    title: 'How do I export my prompts into my own codebase or application?',
    category: 'studio',
    route: 'workspace',
    intent: ['export', 'download', 'json', 'typescript', 'sdk', 'integrate', 'code snippet'],
    summary: 'PromptHub allows you to export any prompt directly as executable TypeScript/JavaScript functions, JSON schemas, or LangChain/OpenAI SDK code snippets with one click.',
    steps: [
      'In Studio, click the "Export" button in the editor toolbar.',
      'Choose your desired export format: TypeScript Module, OpenAI SDK Snippet, LangChain, or Raw JSON.',
      'Review the auto-generated code with typed parameter arguments and model options.',
      'Click "Copy Code" or "Download File" to paste directly into your Next.js, Python, or Node.js project.'
    ],
    prerequisites: ['Available for all prompts in your library.'],
    troubleshooting: [
      'The TypeScript export includes type definitions for all double-curly variable parameters (e.g. interface PromptInputs).'
    ],
    costNote: '0 credits.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-theme-toggle',
    title: 'How do I switch between Dark and Light mode?',
    category: 'settings',
    route: 'settings',
    intent: ['theme', 'dark mode', 'light mode', 'appearance', 'sun', 'moon', 'black background'],
    summary: 'PromptHub includes calibrated Light and Dark themes adhering to high-contrast WCAG AA standards. You can switch modes instantly using the theme toggle in the top header.',
    steps: [
      'Look at the top-right header of any page.',
      'Click the Sun / Moon toggle icon to flip between Light and Dark mode.',
      'Alternatively, navigate to Settings > Appearance and choose "Light", "Dark", or "System Default".',
      'Your theme preference is saved in localStorage and persists across all sessions.'
    ],
    prerequisites: ['None.'],
    troubleshooting: [
      'If your browser is in incognito mode, the theme will default to Dark mode upon new session start.'
    ],
    costNote: '0 credits.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-account-deletion',
    title: 'How do I permanently delete my account and data?',
    category: 'settings',
    route: 'settings',
    intent: ['delete account', 'erase data', 'gdpr', 'remove account', 'privacy erasure', 'danger zone'],
    summary: 'PromptHub provides self-serve permanent account erasure. In Settings, the Delete Account tool permanently wipes your Supabase profile, prompts, credentials, and uploaded files.',
    steps: [
      'Navigate to Settings > Danger Zone (/settings).',
      'Click "Delete My Account & Cloud Data".',
      'Read the irreversible deletion notice and type "DELETE" to confirm.',
      'Our serverless erasure RPC cascades across auth.users, profiles, prompts, work_projects, and storage buckets.',
      'Your browser IndexedDB vault, local caches, and active cookies are purged immediately.'
    ],
    prerequisites: ['Logged-in user.'],
    troubleshooting: [
      'Deletion is irreversible. Export any prompts you wish to preserve before confirming.'
    ],
    costNote: 'Free. Self-serve GDPR Article 17 right to erasure.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-developer-mode',
    title: 'What is Developer Mode and what engineering tools are included?',
    category: 'getting-started',
    route: 'developer',
    intent: ['developer mode', 'dev mode', 'studio', 'arena', 'analyzer', 'vault', 'developer tools', 'deep dive'],
    summary: 'Developer Mode is a high-utility developer workspace container that combines the Classic Studio Composer, Multi-Model Arena, 7-Point Prompt Analyzer, and BYOK Credential Vault into a unified tabbed engineering suite.',
    steps: [
      'Navigate to Developer Mode from the sidebar or via URL parameter ?tool=studio.',
      'Switch between the Classic Prompt Studio, Multi-Model Arena benchmark shootout, Prompt Analyzer heuristics, and BYOK Key Vault.',
      'Use deep links such as ?tool=arena or ?tool=analyzer to jump directly into specific developer workflows.',
      'Click "Return to Workspace" anytime to switch back to the natural language portfolio builder.'
    ],
    prerequisites: ['Available to all users with zero credit costs for browsing and configuration.'],
    troubleshooting: [
      'Use keyboard shortcuts (⌘Enter / Ctrl+Enter) to quickly execute runs within the developer tools.'
    ],
    costNote: 'Access to Developer Mode suite is 100% free. Paid model executions consume wallet credits or personal BYOK keys.',
    verifiedCommit: '2bd9725'
  },
  {
    id: 'kb-support-tickets-chat',
    title: 'How does PromptHub live support and ticket chat work?',
    category: 'support',
    route: 'home',
    intent: ['support', 'chat', 'ticket', 'whatsapp', 'admin chat', 'customer care', 'helpdesk', 'contact'],
    summary: 'PromptHub features a WhatsApp-style live ticket and chat system built into the Help Assistant. You can raise a ticket for billing, technical issues, or feature requests and chat directly with PromptHub administrators in real-time.',
    steps: [
      'Click the floating "Help" button in the bottom right corner (or press Shift + ?).',
      'Select the "Contact Support" tab.',
      'Click "+ Raise New Ticket" and choose your topic (Billing, Studio, Arena, BYOK Keys, Teams, Bug Report).',
      'Provide your subject, email, and message description, then submit.',
      'Once submitted, the ticket opens into a live WhatsApp-style chat interface where you can send follow-ups and receive instant replies from PromptHub admins!'
    ],
    prerequisites: ['Available for all users and guests.'],
    troubleshooting: [
      'You can switch between multiple past tickets using the "All Tickets" button.',
      'Admins review open tickets in the Admin Console and reply directly into your chat thread.'
    ],
    costNote: '100% Free direct human support.',
    verifiedCommit: '2bd9725'
  }
];
