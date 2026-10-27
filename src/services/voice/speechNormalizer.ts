/**
 * src/services/voice/speechNormalizer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Streaming-safe text normalizer for Text-to-Speech (TTS) output.
 *
 * Mandate:
 * Normal assistant messages go directly to speech synthesis.
 * They must NEVER say:
 * - Formatting instructions: "star star", "asterisk", "hashtag", "backtick"
 * - Raw markdown tokens: ###, **, ``, ```, >
 * - Chain of thought / reasoning preamble: "Here's a thinking process:", "<thought>"
 * - URLs, raw JSON schemas, tool arguments, or internal IDs
 * - Internal 12-Section Master Prompt (A through L) read aloud
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Completely eradicate thinking process / reasoning / scratchpad tokens
 * that frontier reasoning models (Gemini 2.0 Flash, Claude, DeepSeek) output.
 */
export function stripThinkingProcess(rawText: string): string {
  if (!rawText) return '';
  let text = rawText;

  // 1. Strip explicit <thought>...</thought> or <reasoning> XML tags
  text = text.replace(/<(thought|thinking|reasoning|reflection|scratchpad)[^>]*>[\s\S]*?<\/\1>/gi, '');
  text = text.replace(/<\/?(thought|thinking|reasoning|reflection|scratchpad)[^>]*>/gi, '');

  // 2. Strip "Here's a thinking process: ... " or "Thinking Process: ..." blocks
  text = text.replace(/(?:Here's a thinking process:|Thinking Process:|Thought Process:|My thought process:?)[\s\S]*?(?=(?:\r?\n\s*){2,}[A-Z0-9"']|(?:\r?\n\s*){2,}\*{1,3}[A-Z]|$)/i, '');

  // 3. Strip individual lines starting with "Thought:" or "Thinking:" or "Analyze User Input:"
  text = text.replace(/^(?:thought|thinking|analysis|analyze user input):\s*.*$/gim, '');

  // 4. Strip leading reasoning fragments like "Here's a thinking process: Analyze User Input: ..."
  text = text.replace(/^Here's a thinking process:[^\n]*\n?/i, '');
  text = text.replace(/^Analyze User Input:[^\n]*\n?/i, '');

  return text.trim();
}

/**
 * Suppress raw Master Prompt specification blocks from spoken audio.
 * Prevents TTS engine from reading Sections A through L aloud unless explicitly requested.
 */
export function stripMasterPromptSections(rawText: string): string {
  if (!rawText) return '';
  let text = rawText;

  // 1. If full autonomous deliverable specification header is present, replace with concise spoken confirmation
  if (text.includes('PROMPTHUB AUTONOMOUS DELIVERABLE SPECIFICATION') || text.includes('## PROMPTHUB AUTONOMOUS')) {
    text = text.replace(/##\s*PROMPTHUB\s+AUTONOMOUS[\s\S]*?(?=(?:\r?\n\s*){2,}[A-Z0-9"']|$)/i, ' I have compiled your master project brief and submitted it to the workspace. ');
  }

  // 2. Strip individual master prompt sections: ### A. OBJECTIVE ... through ### L. ASSUMPTIONS
  text = text.replace(/###\s*[A-L]\.\s+[A-Z\s_-]+[\s\S]*?(?=(?:###\s*[A-L]\.)|(?:\r?\n\s*){2,}|$)/g, '');

  return text;
}

export function normalizeTextForSpeech(rawText: string): string {
  if (!rawText) return '';

  // 0. Eradicate any thinking/reasoning blocks first
  let text = stripThinkingProcess(rawText);

  // 0.5. Suppress Master Prompt sections from spoken narration
  text = stripMasterPromptSections(text);

  // 1. Remove XML/Action blocks e.g. <action>...</action>, <thought>...</thought>
  text = text.replace(/<(action|thought|tool_call|spoken_only)[^>]*>[\s\S]*?<\/\1>/gi, '');
  text = text.replace(/<[^>]+>/g, '');

  // 2. Strip multi-line code blocks e.g. ```html ... ```
  text = text.replace(/```[\s\S]*?```/g, ' I have generated the deliverable code in your workspace. ');

  // 3. Strip inline code backticks `...`
  text = text.replace(/`([^`]+)`/g, '$1');

  // 4. Strip markdown bold / italic asterisks and underscores e.g. **bold**, *italic*, __underline__
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');

  // 5. Strip markdown headers (# Heading, ## Heading)
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 6. Strip markdown lists, bullet points, numbered items e.g. - item, * item, 1. item
  text = text.replace(/^[-*+]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');

  // 7. Strip markdown links [Title](https://...) -> Title
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 8. Strip URLs
  text = text.replace(/https?:\/\/[^\s)]+/g, '');

  // 9. Strip markdown table markers (| --- | --- |)
  text = text.replace(/\|[-:\s|]+\|/g, '');
  text = text.replace(/\|/g, ', ');

  // 10. Strip stray asterisks, backticks, hashes, angle brackets
  text = text.replace(/[*`#<>~]/g, '');

  // 11. Replace common abbreviations with clear spoken words
  text = text.replace(/\bGST\b/g, 'G S T');
  text = text.replace(/\bAI\b/g, 'A I');
  text = text.replace(/\bUI\b/g, 'U I');
  text = text.replace(/\bUX\b/g, 'U X');
  text = text.replace(/\bLLM\b/g, 'L L M');
  text = text.replace(/\bAPI\b/g, 'A P I');
  text = text.replace(/\bJSON\b/g, 'Jason');

  // 12. Normalize whitespace and trim
  text = text.replace(/\s+/g, ' ').trim();

  // 13. Ensure sentence ends cleanly
  if (text && !/[.!?]$/.test(text)) {
    text += '.';
  }

  return text;
}
