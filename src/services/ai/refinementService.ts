/**
 * Conversational Prompt Refinement Service
 *
 * Adapted from prompt-architect-main's 2-stage clarifying question engine.
 * Generates targeted constraint and audience questions before synthesizing
 * a finalized CO-STAR prompt.
 */

export interface RefinementQuestion {
  id: string;
  question: string;
  category: 'context' | 'audience' | 'style' | 'constraints' | 'output_format';
  suggestedAnswers?: string[];
}

export interface RefinementState {
  originalPrompt: string;
  intent: string;
  targetModel: string;
  targetStyle: 'professional' | 'creative' | 'technical' | 'academic';
  questions: RefinementQuestion[];
  answers: Record<string, string>;
  isQuestionsGenerated: boolean;
  refinedPrompt?: string;
}

export const PROMPT_STYLES = [
  { id: 'professional', label: 'Professional & Business', description: 'Structured, direct, and actionable executive tone' },
  { id: 'technical', label: 'Technical & Engineering', description: 'Code-centric, architecture-aware, strict types' },
  { id: 'creative', label: 'Creative & Narrative', description: 'Imaginative, evocative, engaging storytelling' },
  { id: 'academic', label: 'Academic & Analytical', description: 'Rigorous, research-oriented, citation-ready' },
] as const;

/**
 * System instruction for generating clarifying questions
 */
export function buildQuestionGenerationPrompt(prompt: string, style: string, targetEngine: string): string {
  return `You are a world-class prompt engineer analyzing a user's initial prompt draft.
Your goal is to identify ambiguities, missing context, and unspecified constraints to turn this into a production-grade prompt.

Draft Prompt:
"""
${prompt}
"""

Target Prompt Style: ${style}
Target AI Engine: ${targetEngine}

Analyze the draft and return a JSON object with:
1. "intent": A 1-sentence summary of what the user is trying to accomplish.
2. "questions": Exactly 2 to 3 high-impact clarifying questions to refine constraints, target audience, and output format.
For each question provide:
- "id": a unique string key (e.g. "q_audience", "q_format", "q_constraints")
- "category": one of "context", "audience", "style", "constraints", "output_format"
- "question": the clarifying question
- "suggestedAnswers": 3 short, clickable multiple-choice options

Return ONLY valid JSON matching this exact structure:
{
  "intent": "string",
  "questions": [
    {
      "id": "string",
      "category": "context",
      "question": "string",
      "suggestedAnswers": ["option1", "option2", "option3"]
    }
  ]
}`;
}

/**
 * System instruction for synthesizing the final CO-STAR prompt
 */
export function buildPromptSynthesisPrompt(
  originalPrompt: string,
  style: string,
  targetEngine: string,
  answers: Record<string, string>
): string {
  const answeredContext = Object.entries(answers)
    .filter(([_, ans]) => Boolean(ans?.trim()))
    .map(([key, ans]) => `- ${key}: ${ans.trim()}`)
    .join('\n');

  return `You are an expert prompt architect. Synthesize a pristine, production-grade prompt using the CO-STAR framework.

Original Draft:
"""
${originalPrompt}
"""

Target Style: ${style}
Target Engine: ${targetEngine}

User Specified Clarifications:
${answeredContext || 'None specified. Use best industry practices.'}

Construct an authoritative prompt with:
# Role & Identity
# Context & Background
# Objective & Core Task
# Input Variables (using {{variable_name}} syntax for dynamic inputs)
# Instructions & Step-by-Step Workflow
# Constraints & Negative Directives (what NOT to do)
# Output Format & Example Schema

Deliver only the finalized markdown prompt ready for immediate use.`;
}
