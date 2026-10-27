/**
 * src/services/ai/adaptiveKnowledgeService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Adaptive Knowledge Base & Self-Improving Memory Loop for PromptHub Workspace.
 *
 * Implements the continuous learning architecture:
 * User input -> Best Model (OpenRouter) -> Output <-> Adaptive Knowledge Base
 * -> Variable Knowledge Base -> User & Knowledge both know what to do -> Loop
 *
 * Remembers high-importance user preferences, architectural rules, brand tokens,
 * and domain constraints across conversational turns and saved projects.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface KnowledgeItem {
  id: string;
  category: 'preference' | 'rule' | 'schema' | 'domain' | 'constraint';
  key: string;
  value: string;
  source: 'user_input' | 'system_learned' | 'manual';
  timestamp: number;
  importance: 'high' | 'medium' | 'low';
}

const STORAGE_PREFIX = 'ph_adaptive_kb_';

class AdaptiveKnowledgeService {
  private getStorageKey(userId?: string, projectId?: string): string {
    const scope = projectId ? `proj_${projectId}` : userId ? `user_${userId}` : 'global';
    return `${STORAGE_PREFIX}${scope}`;
  }

  /**
   * Retrieves all active knowledge items for the current session/project.
   */
  getKnowledgeItems(userId?: string, projectId?: string): KnowledgeItem[] {
    try {
      const key = this.getStorageKey(userId, projectId);
      const raw = localStorage.getItem(key);
      if (!raw) {
        return [];
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Saves knowledge items to persistent storage.
   */
  private saveKnowledgeItems(items: KnowledgeItem[], userId?: string, projectId?: string): void {
    try {
      const key = this.getStorageKey(userId, projectId);
      localStorage.setItem(key, JSON.stringify(items.slice(0, 50))); // Cap at 50 most important rules
    } catch (err) {
      console.warn('[AdaptiveKnowledge] Failed to persist knowledge items:', err);
    }
  }

  /**
   * Adds or updates a knowledge item.
   */
  addKnowledgeItem(
    item: Omit<KnowledgeItem, 'id' | 'timestamp'>,
    userId?: string,
    projectId?: string
  ): KnowledgeItem {
    const items = this.getKnowledgeItems(userId, projectId);
    const existingIdx = items.findIndex(
      (i) => i.key.toLowerCase().trim() === item.key.toLowerCase().trim()
    );

    const newItem: KnowledgeItem = {
      ...item,
      id: `kb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    if (existingIdx >= 0) {
      items[existingIdx] = newItem;
    } else {
      items.unshift(newItem);
    }

    this.saveKnowledgeItems(items, userId, projectId);
    return newItem;
  }

  /**
   * Removes a knowledge item by ID.
   */
  removeKnowledgeItem(id: string, userId?: string, projectId?: string): void {
    const items = this.getKnowledgeItems(userId, projectId);
    const filtered = items.filter((i) => i.id !== id);
    this.saveKnowledgeItems(filtered, userId, projectId);
  }

  /**
   * Clears all knowledge items for the current session.
   */
  clearKnowledge(userId?: string, projectId?: string): void {
    try {
      const key = this.getStorageKey(userId, projectId);
      localStorage.removeItem(key);
    } catch {}
  }

  /**
   * Automatically extracts important user rules and preferences from natural language input.
   * "User Input -> check knowledge <-> if not in knowledge add it"
   */
  extractAndLearnFromInput(
    userInput: string,
    userId?: string,
    projectId?: string
  ): KnowledgeItem[] {
    if (!userInput || userInput.length < 5) return [];

    const text = userInput.trim();
    const learned: KnowledgeItem[] = [];
    const currentItems = this.getKnowledgeItems(userId, projectId);

    const isDuplicate = (key: string, val: string) => {
      return currentItems.some(
        (i) =>
          i.key.toLowerCase() === key.toLowerCase() &&
          i.value.toLowerCase().includes(val.toLowerCase())
      );
    };

    // 1. Detect Color / Brand instructions (e.g. "use purple accent", "brand color is #123456")
    const hexMatch = text.match(/#([0-9a-fA-F]{3,8})/);
    if (hexMatch) {
      const hex = hexMatch[0];
      if (!isDuplicate('Brand Color', hex)) {
        learned.push(
          this.addKnowledgeItem(
            {
              category: 'preference',
              key: 'Brand Color',
              value: `Preferred brand accent color: ${hex}`,
              source: 'system_learned',
              importance: 'high',
            },
            userId,
            projectId
          )
        );
      }
    }

    // 2. Detect Theme preferences ("dark mode", "light mode", "cyberpunk", "minimalist")
    if (/\b(dark\s*theme|dark\s*mode|obsidian|slate)\b/i.test(text)) {
      if (!isDuplicate('Theme Preference', 'Dark')) {
        learned.push(
          this.addKnowledgeItem(
            {
              category: 'preference',
              key: 'Theme Preference',
              value: 'Always default to Dark Canvas / Obsidian mode',
              source: 'system_learned',
              importance: 'medium',
            },
            userId,
            projectId
          )
        );
      }
    } else if (/\b(light\s*theme|light\s*mode|clean\s*white)\b/i.test(text)) {
      if (!isDuplicate('Theme Preference', 'Light')) {
        learned.push(
          this.addKnowledgeItem(
            {
              category: 'preference',
              key: 'Theme Preference',
              value: 'Always default to Clean Light Canvas mode',
              source: 'system_learned',
              importance: 'medium',
            },
            userId,
            projectId
          )
        );
      }
    }

    // 3. Detect Framework / Tech Stack preferences ("Tailwind", "React", "TypeScript", "Next.js", "Supabase")
    if (/\b(tailwind|tailwindcss)\b/i.test(text) && !isDuplicate('Tech Stack', 'Tailwind')) {
      learned.push(
        this.addKnowledgeItem(
          {
            category: 'rule',
            key: 'Tech Stack (Styling)',
            value: 'Use modern Tailwind CSS utility classes with semantic tokens',
            source: 'system_learned',
            importance: 'high',
          },
          userId,
          projectId
        )
      );
    }

    if (/\b(mobile-first|responsive\s*first|fluid\s*layout)\b/i.test(text) && !isDuplicate('Layout Rule', 'Mobile-First')) {
      learned.push(
        this.addKnowledgeItem(
          {
            category: 'rule',
            key: 'Layout Rule',
            value: 'Enforce fluid, mobile-first responsive layouts with no horizontal scroll',
            source: 'system_learned',
            importance: 'high',
          },
          userId,
          projectId
        )
      );
    }

    // 4. Detect User Role / Industry ("I am a photographer", "for an e-commerce shop", "law firm")
    const roleMatch = text.match(/\b(?:i am a|i'm a|for a|for an|building for)\s+([a-zA-Z\s]{3,25})\b/i);
    if (roleMatch && roleMatch[1]) {
      const domainVal = roleMatch[1].trim();
      if (!isDuplicate('Domain Focus', domainVal) && !['a', 'the', 'my', 'new'].includes(domainVal.toLowerCase())) {
        learned.push(
          this.addKnowledgeItem(
            {
              category: 'domain',
              key: 'Domain Focus',
              value: `Primary audience / domain target: ${domainVal}`,
              source: 'system_learned',
              importance: 'medium',
            },
            userId,
            projectId
          )
        );
      }
    }

    return learned;
  }

  /**
   * Formats all active knowledge items into an injection-ready markdown string
   * for the AI prompt system instructions.
   */
  formatKnowledgeForPrompt(userId?: string, projectId?: string): string {
    const items = this.getKnowledgeItems(userId, projectId);
    if (!items || items.length === 0) return '';

    const lines = items.map((i) => `- [${i.category.toUpperCase()}] ${i.key}: ${i.value}`);
    return `\n### ADAPTIVE KNOWLEDGE BASE (Active Learned Rules & Preferences)\n${lines.join('\n')}\n`;
  }
}

export const adaptiveKnowledgeService = new AdaptiveKnowledgeService();
