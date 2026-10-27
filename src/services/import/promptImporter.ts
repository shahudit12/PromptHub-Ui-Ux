/**
 * Multi-Format Prompt Import Engine
 *
 * Automatically detects and parses prompt architectures from various formats:
 * - PromptHub / Open Prompt JSON (.json)
 * - Collection Bundle JSON (.json)
 * - Markdown with YAML Frontmatter (.md)
 * - Cursor Rules (.mdc)
 * - Google Antigravity Skill (SKILL.md)
 * - OpenAI Codex Agent (.toml)
 * - CSV Tabular Dataset (.csv)
 * - Plain Text (.txt)
 */

import { extractVariables } from '../ai/variableEngine';
import type { CategoryType } from '../../db/schema';

export interface ImportedPrompt {
  title: string;
  description: string;
  template: string;
  category: CategoryType;
  model: string;
  tags: string[];
  variables: Array<{ name: string; defaultValue?: string; description?: string }>;
  version?: string;
  author?: string;
  license?: string;
  sourceFormat: string;
}

export interface ImportResult {
  success: boolean;
  prompts: ImportedPrompt[];
  collectionName?: string;
  detectedFormat: string;
  error?: string;
  warnings?: string[];
}

const VALID_CATEGORIES: CategoryType[] = [
  'Development',
  'Marketing',
  'Design',
  'Writing',
  'Business',
  'Education',
  'Other',
];

function normalizeCategory(cat?: string): CategoryType {
  if (!cat) return 'Development';
  const cLower = cat.trim().toLowerCase();
  if (cLower === 'academic' || cLower === 'education') return 'Education';
  if (cLower === 'creative' || cLower === 'writing') return 'Writing';
  if (cLower === 'design') return 'Design';
  if (cLower === 'marketing') return 'Marketing';
  if (cLower === 'business') return 'Business';
  if (cLower === 'cybersecurity' || cLower === 'development' || cLower === 'coding' || cLower === 'productivity' || cLower === 'gaming') return 'Development';
  const match = VALID_CATEGORIES.find(
    (c) => c.toLowerCase() === cLower
  );
  return match || 'Other';
}

/**
 * Parses YAML-like frontmatter key-value pairs without heavy external dependencies.
 */
function parseFrontmatter(raw: string): { frontmatter: Record<string, any>; body: string } {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('---')) {
    return { frontmatter: {}, body: trimmed };
  }

  const endIdx = trimmed.indexOf('---', 3);
  if (endIdx === -1) {
    return { frontmatter: {}, body: trimmed };
  }

  const fmBlock = trimmed.slice(3, endIdx).trim();
  const body = trimmed.slice(endIdx + 3).trim();
  const frontmatter: Record<string, any> = {};

  const lines = fmBlock.split(/\r?\n/);
  let currentArrayKey: string | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    if (trimmedLine.startsWith('- ') && currentArrayKey) {
      const item = trimmedLine.slice(2).trim().replace(/^["']|["']$/g, '');
      if (Array.isArray(frontmatter[currentArrayKey])) {
        frontmatter[currentArrayKey].push(item);
      }
      continue;
    }

    const colonIdx = trimmedLine.indexOf(':');
    if (colonIdx !== -1) {
      const key = trimmedLine.slice(0, colonIdx).trim();
      let value = trimmedLine.slice(colonIdx + 1).trim();

      if (!value) {
        currentArrayKey = key;
        frontmatter[key] = [];
        continue;
      }

      currentArrayKey = null;
      // Strip outer quotes
      value = value.replace(/^["']|["']$/g, '');

      // Check for inline array: ["tag1", "tag2"]
      if (value.startsWith('[') && value.endsWith(']')) {
        const items = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        frontmatter[key] = items;
      } else {
        frontmatter[key] = value;
      }
    }
  }

  return { frontmatter, body };
}

/**
 * Parses simple TOML string key-values.
 */
function parseToml(raw: string): { agent: Record<string, string>; prompt: string } {
  const agent: Record<string, string> = {};
  let prompt = '';

  const nameMatch = raw.match(/name\s*=\s*"([^"]+)"/);
  if (nameMatch) agent.name = nameMatch[1];

  const descMatch = raw.match(/description\s*=\s*"([^"]+)"/);
  if (descMatch) agent.description = descMatch[1];

  const catMatch = raw.match(/category\s*=\s*"([^"]+)"/);
  if (catMatch) agent.category = catMatch[1];

  const authorMatch = raw.match(/author\s*=\s*"([^"]+)"/);
  if (authorMatch) agent.author = authorMatch[1];

  const systemTripleMatch = raw.match(/system\s*=\s*"""([\s\S]*?)"""/);
  if (systemTripleMatch) {
    prompt = systemTripleMatch[1].trim();
  } else {
    const systemSingleMatch = raw.match(/system\s*=\s*"([^"]+)"/);
    if (systemSingleMatch) prompt = systemSingleMatch[1].trim();
  }

  return { agent, prompt: prompt || raw };
}

/**
 * Parses CSV lines respecting quoted strings.
 */
function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuote = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    const nextChar = raw[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.some((val) => val.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((val) => val.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Primary multi-format import parser.
 */
export function importPromptFromContent(
  rawContent: string,
  filename = ''
): ImportResult {
  const content = (rawContent || '').trim();
  if (!content) {
    return {
      success: false,
      prompts: [],
      detectedFormat: 'unknown',
      error: 'Cannot import empty content.',
    };
  }

  const warnings: string[] = [];
  const lowerFile = filename.toLowerCase();

  // ─── 1. Check for JSON / Collection Bundle ──────────────────────────────────
  if (content.startsWith('{') || content.startsWith('[') || lowerFile.endsWith('.json')) {
    try {
      const parsed = JSON.parse(content);

      // A. Collection Bundle: { collectionName, prompts: [...] }
      if (parsed && Array.isArray(parsed.prompts)) {
        const prompts: ImportedPrompt[] = parsed.prompts.map((p: any, idx: number) => {
          const template = p.template || p.rawContent || p.content || '';
          const { variables } = extractVariables(template);
          return {
            title: p.title || p.name || `Imported Prompt #${idx + 1}`,
            description: p.description || '',
            template,
            category: normalizeCategory(p.category),
            model: p.model || 'openai/gpt-4o',
            tags: Array.isArray(p.tags) ? p.tags : [],
            variables: p.variables || variables.map((v) => ({ name: v.name, defaultValue: v.defaultValue })),
            version: p.version || '1.0.0',
            author: p.author || 'Imported Author',
            license: p.license || 'MIT',
            sourceFormat: 'JSON Collection Bundle',
          };
        });

        return {
          success: true,
          prompts,
          collectionName: parsed.collectionName || 'Imported Collection',
          detectedFormat: 'JSON Collection Bundle',
          warnings,
        };
      }

      // B. Array of prompts: [ { title, template }, ... ]
      if (Array.isArray(parsed)) {
        const prompts: ImportedPrompt[] = parsed.map((p: any, idx: number) => {
          const template = p.template || p.rawContent || p.content || (typeof p === 'string' ? p : '');
          const { variables } = extractVariables(template);
          return {
            title: p.title || p.name || `Imported Prompt #${idx + 1}`,
            description: p.description || '',
            template,
            category: normalizeCategory(p.category),
            model: p.model || 'openai/gpt-4o',
            tags: Array.isArray(p.tags) ? p.tags : [],
            variables: p.variables || variables.map((v) => ({ name: v.name, defaultValue: v.defaultValue })),
            version: p.version || '1.0.0',
            sourceFormat: 'JSON Array',
          };
        });

        return {
          success: true,
          prompts,
          detectedFormat: 'JSON Array',
          warnings,
        };
      }

      // C. Single Prompt JSON object
      if (parsed && typeof parsed === 'object') {
        const template = parsed.template || parsed.rawContent || parsed.content || parsed.prompt || '';
        const { variables } = extractVariables(template);
        const prompt: ImportedPrompt = {
          title: parsed.title || parsed.name || (filename ? filename.replace(/\.[^/.]+$/, '') : 'Imported Prompt'),
          description: parsed.description || '',
          template,
          category: normalizeCategory(parsed.category),
          model: parsed.model || 'openai/gpt-4o',
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          variables: parsed.variables || variables.map((v) => ({ name: v.name, defaultValue: v.defaultValue })),
          version: parsed.version || '1.0.0',
          author: parsed.author,
          license: parsed.license || 'MIT',
          sourceFormat: 'Open Prompt JSON',
        };

        return {
          success: true,
          prompts: [prompt],
          detectedFormat: 'Open Prompt JSON',
          warnings,
        };
      }
    } catch {
      // Not valid JSON, continue to other parsers
    }
  }

  // ─── 2. Check for TOML / Codex Agent ───────────────────────────────────────
  if (lowerFile.endsWith('.toml') || (content.includes('[agent]') && content.includes('[prompt]'))) {
    const { agent, prompt: template } = parseToml(content);
    const { variables } = extractVariables(template);
    return {
      success: true,
      prompts: [
        {
          title: agent.name || (filename ? filename.replace(/\.[^/.]+$/, '') : 'Imported Codex Agent'),
          description: agent.description || '',
          template,
          category: normalizeCategory(agent.category),
          model: 'openai/gpt-4o',
          tags: ['codex', 'agent'],
          variables: variables.map((v) => ({ name: v.name, defaultValue: v.defaultValue })),
          version: agent.version || '1.0.0',
          author: agent.author,
          sourceFormat: 'OpenAI Codex TOML',
        },
      ],
      detectedFormat: 'OpenAI Codex TOML',
      warnings,
    };
  }

  // ─── 3. Check for CSV ─────────────────────────────────────────────────────
  if (lowerFile.endsWith('.csv') || (content.includes('\n') && content.split('\n')[0].toLowerCase().includes('template'))) {
    const rows = parseCsv(content);
    if (rows.length >= 2) {
      const header = rows[0].map((h) => h.toLowerCase().trim());
      const titleIdx = header.findIndex((h) => h.includes('title') || h.includes('name'));
      const templateIdx = header.findIndex((h) => h.includes('template') || h.includes('prompt') || h.includes('content'));
      const descIdx = header.findIndex((h) => h.includes('desc'));
      const catIdx = header.findIndex((h) => h.includes('cat'));
      const modelIdx = header.findIndex((h) => h.includes('model'));
      const tagsIdx = header.findIndex((h) => h.includes('tag'));

      if (templateIdx !== -1) {
        const prompts: ImportedPrompt[] = [];
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          const template = row[templateIdx] || '';
          if (!template.trim()) continue;

          const title = titleIdx !== -1 && row[titleIdx] ? row[titleIdx] : `Imported Prompt #${r}`;
          const description = descIdx !== -1 ? row[descIdx] : '';
          const category = catIdx !== -1 ? normalizeCategory(row[catIdx]) : 'Development';
          const model = modelIdx !== -1 && row[modelIdx] ? row[modelIdx] : 'openai/gpt-4o';
          const tags = tagsIdx !== -1 && row[tagsIdx] ? row[tagsIdx].split(';').map((t) => t.trim()).filter(Boolean) : [];
          const { variables } = extractVariables(template);

          prompts.push({
            title,
            description,
            template,
            category,
            model,
            tags,
            variables: variables.map((v) => ({ name: v.name, defaultValue: v.defaultValue })),
            sourceFormat: 'CSV Dataset',
          });
        }

        if (prompts.length > 0) {
          return {
            success: true,
            prompts,
            detectedFormat: 'CSV Tabular Dataset',
            warnings,
          };
        }
      }
    }
  }

  // ─── 4. Check for Markdown with Frontmatter / Cursor Rules / Antigravity ──
  if (content.startsWith('---') || lowerFile.endsWith('.md') || lowerFile.endsWith('.mdc')) {
    const { frontmatter, body } = parseFrontmatter(content);

    let template = body;
    let title = frontmatter.name || frontmatter.title || '';
    let description = frontmatter.description || '';
    const category = normalizeCategory(frontmatter.category);
    const model = frontmatter.model || 'openai/gpt-4o';
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];

    // Extract title from first markdown header if not in frontmatter
    if (!title) {
      const headerMatch = body.match(/^#\s+(.+)$/m);
      if (headerMatch) {
        title = headerMatch[1].trim();
        template = body.replace(/^#\s+.+$/m, '').trim();
      }
    }

    // Extract description from blockquote if present: > description
    if (!description) {
      const quoteMatch = template.match(/^>\s*(.+)$/m);
      if (quoteMatch) {
        description = quoteMatch[1].trim();
        template = template.replace(/^>\s*.+$/m, '').trim();
      }
    }

    // Extract from code blocks: ```markdown\n<template>\n```
    const codeBlockMatch = template.match(/```(?:markdown|prompt|text)?\r?\n([\s\S]*?)\r?\n```/);
    if (codeBlockMatch) {
      template = codeBlockMatch[1].trim();
    }

    // Check for Antigravity Skill structure: ## Instructions
    if (content.includes('## Instructions')) {
      const instructionsPart = content.split('## Instructions')[1];
      if (instructionsPart && instructionsPart.trim()) {
        template = instructionsPart.trim();
      }
    }

    if (!title) {
      title = filename ? filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'Imported Prompt';
    }

    const { variables } = extractVariables(template);

    let detectedFormat = 'Markdown with Frontmatter';
    if (lowerFile.endsWith('.mdc') || content.includes('globs:')) {
      detectedFormat = 'Cursor Rules (.mdc)';
    } else if (filename.toLowerCase().includes('skill') || content.includes('## Instructions')) {
      detectedFormat = 'Google Antigravity Skill';
    } else if (lowerFile.endsWith('.md')) {
      detectedFormat = 'Markdown (.md)';
    }

    return {
      success: true,
      prompts: [
        {
          title,
          description,
          template: template || content,
          category,
          model,
          tags,
          variables: variables.map((v) => ({ name: v.name, defaultValue: v.defaultValue })),
          version: frontmatter.version || '1.0.0',
          author: frontmatter.author,
          license: frontmatter.license || 'MIT',
          sourceFormat: detectedFormat,
        },
      ],
      detectedFormat,
      warnings,
    };
  }

  // ─── 5. Fallback: Plain Text / Raw Prompt ─────────────────────────────────
  let fallbackTitle = filename ? filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : 'Imported Prompt';
  let fallbackTemplate = content;
  let fallbackDescription = '';

  const firstHeader = content.match(/^#\s+(.+)$/m);
  if (firstHeader) {
    fallbackTitle = firstHeader[1].trim();
    fallbackTemplate = content.replace(/^#\s+.+$/m, '').trim();
  }

  const { variables } = extractVariables(fallbackTemplate);

  return {
    success: true,
    prompts: [
      {
        title: fallbackTitle,
        description: fallbackDescription,
        template: fallbackTemplate,
        category: 'Development',
        model: 'openai/gpt-4o',
        tags: [],
        variables: variables.map((v) => ({ name: v.name, defaultValue: v.defaultValue })),
        sourceFormat: 'Plain Text (.txt)',
      },
    ],
    detectedFormat: 'Plain Text (.txt)',
    warnings,
  };
}
