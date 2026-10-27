/**
 * PromptHub Guide — Grounded Answering Service
 * 
 * Synthesizes grounded answers strictly from the verified knowledge base.
 * Guarantees zero hallucinations, zero vulgarity responses, and honest fallbacks.
 */

import { guideSearchService } from './guideSearchService';
import { securityUtils } from '../../utils/security';
import type { KnowledgeBaseArticle } from '../../data/guideKnowledgeBase';
import type { TabType } from '../../context/AppContext';

export interface GuideAnswer {
  text: string;
  sourceArticles: KnowledgeBaseArticle[];
  suggestedTourId?: string;
  suggestedRoute?: TabType;
  isGrounded: boolean;
  confidence: 'high' | 'medium' | 'unverified';
}

export class GuideAnsweringService {
  /**
   * Answer a developer question using verified knowledge base retrieval
   */
  async answerQuestion(
    query: string,
    context?: {
      currentRoute?: TabType;
      isSignedIn?: boolean;
      explicitPromptAttachment?: string;
    }
  ): Promise<GuideAnswer> {
    const trimmed = query.trim();

    // 1. Empty query
    if (!trimmed) {
      return {
        text: 'Hello! I am Pip, your PromptHub documentation guide. Ask me anything about prompts, variables, models, BYOK keys, credits, or team workspaces.',
        sourceArticles: [],
        isGrounded: true,
        confidence: 'high'
      };
    }

    // 2. Profanity / Hostility Guard
    if (securityUtils.isProfaneOrHostile(trimmed)) {
      return {
        text: 'Please keep questions focused on PromptHub features, studio workflows, or model engineering. How can I help you with your project today?',
        sourceArticles: [],
        isGrounded: false,
        confidence: 'unverified'
      };
    }

    // 3. Meaningless / Gibberish Guard
    if (securityUtils.isMeaninglessOrGibberish(trimmed)) {
      return {
        text: "I couldn't understand that question because it appears to contain random or unclear characters. Please ask about PromptHub studio features, AI models, API keys, or team workspaces.",
        sourceArticles: [],
        isGrounded: false,
        confidence: 'unverified'
      };
    }

    // 4. Conversational Greetings Guard (Never match random keywords on a greeting)
    const isGreeting = /^(hi|hello|hey|yo|greetings|hola|howdy|sup|good\s+(morning|afternoon|evening|day))[\s!.]*$/i.test(trimmed);
    if (isGreeting) {
      return {
        text: 'Hello! How can I help you navigate PromptHub today? You can ask about connecting API keys, running model comparisons in the Arena, managing Drive storage, or setting up team workspaces.',
        sourceArticles: [],
        isGrounded: true,
        confidence: 'high'
      };
    }

    // 5. Retrieve top matching verified knowledge base articles
    const searchResults = guideSearchService.search(trimmed, {
      currentRoute: context?.currentRoute,
      limit: 3
    });

    // 6. High confidence match (score >= 35)
    if (searchResults.length > 0 && searchResults[0].score >= 35) {
      const topArticle = searchResults[0].article;
      
      let answerText = `${topArticle.summary}\n\n**Step-by-step guide:**\n`;
      topArticle.steps.forEach((step, idx) => {
        answerText += `${idx + 1}. ${step}\n`;
      });

      if (topArticle.costNote) {
        answerText += `\n**Cost & Billing:** ${topArticle.costNote}`;
      }

      return {
        text: answerText,
        sourceArticles: searchResults.map(r => r.article),
        suggestedTourId: topArticle.tourId,
        suggestedRoute: topArticle.route,
        isGrounded: true,
        confidence: searchResults[0].score >= 50 ? 'high' : 'medium'
      };
    }

    // 7. Low confidence or unverified inquiry -> Honest Fallback with context
    const fallbackRecommendations = guideSearchService.getContextualRecommendations(context?.currentRoute, 3);
    
    return {
      text: "We couldn't find a direct match in PromptHub's verified documentation for that inquiry. You can explore our core guides below, or chat directly with our support team.",
      sourceArticles: fallbackRecommendations.map(r => r.article),
      suggestedRoute: context?.currentRoute || 'workspace',
      isGrounded: false,
      confidence: 'unverified'
    };
  }
}

export const guideAnsweringService = new GuideAnsweringService();
