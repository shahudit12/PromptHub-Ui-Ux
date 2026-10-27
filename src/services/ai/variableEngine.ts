/**
 * Variable Templating & AST Parsing Engine
 *
 * Clean-room TypeScript implementation inspired by Coze Studio's Mustache AST
 * and JSONPath parameter evaluation engine. Supports:
 * - Dynamic token extraction ({{variable}})
 * - Nested object property resolution ({{user.profile.name}})
 * - Array indexing ({{items[0].title}})
 * - Default fallback values ({{var || "default"}})
 * - Type-safe validation and AST tokenization
 */

export interface VariableDefinition {
  name: string;
  label?: string;
  description?: string;
  defaultValue?: string;
  type?: 'string' | 'number' | 'boolean' | 'json' | 'select';
  options?: string[];
  required?: boolean;
}

export interface VariableToken {
  raw: string;
  key: string;
  fallback?: string;
  startIndex: number;
  endIndex: number;
}

export interface ParseResult {
  tokens: VariableToken[];
  variables: VariableDefinition[];
  hasVariables: boolean;
}

/**
 * Extracts all unique {{variable}} tokens from a prompt template string.
 */
export function extractVariables(template: string): ParseResult {
  if (!template || typeof template !== 'string') {
    return { tokens: [], variables: [], hasVariables: false };
  }

  // Matches {{ key }} or {{ key || "default" }} or {{ key | default }}
  const variableRegex = /\{\{\s*([a-zA-Z0-9_.[\]]+)(?:\s*(?:\|\||\|)\s*(?:"([^"]*)"|'([^']*)'|([a-zA-Z0-9_]+)))?\s*\}\}/g;
  const tokens: VariableToken[] = [];
  const variableMap = new Map<string, VariableDefinition>();

  let match: RegExpExecArray | null;
  while ((match = variableRegex.exec(template)) !== null) {
    const raw = match[0];
    const key = match[1].trim();
    const fallback = match[2] ?? match[3] ?? match[4];
    const startIndex = match.index;
    const endIndex = startIndex + raw.length;

    tokens.push({
      raw,
      key,
      fallback,
      startIndex,
      endIndex,
    });

    if (!variableMap.has(key)) {
      // Derive a user-friendly label from camelCase or snake_case
      const label = key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();

      variableMap.set(key, {
        name: key,
        label,
        defaultValue: fallback || '',
        type: 'string',
        required: fallback === undefined,
      });
    }
  }

  return {
    tokens,
    variables: Array.from(variableMap.values()),
    hasVariables: variableMap.size > 0,
  };
}

/**
 * Resolves a dotted or indexed path from a nested context object.
 * Example: resolvePath({ user: { tags: ['admin'] } }, 'user.tags[0]') -> 'admin'
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;

  // Normalize array access notation: a[0].b -> a.0.b
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
  const segments = normalizedPath.split('.').filter(Boolean);

  let current: unknown = obj;
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/**
 * Renders a prompt template by substituting values into {{variable}} tokens.
 */
export function renderPromptTemplate(
  template: string,
  values: Record<string, unknown> = {},
  options: { preserveUnresolved?: boolean; sanitizeValues?: boolean } = {}
): string {
  if (!template) return '';

  const { preserveUnresolved = false, sanitizeValues = true } = options;

  return template.replace(
    /\{\{\s*([a-zA-Z0-9_.[\]]+)(?:\s*(?:\|\||\|)\s*(?:"([^"]*)"|'([^']*)'|([a-zA-Z0-9_]+)))?\s*\}\}/g,
    (match, key: string, dqFallback?: string, sqFallback?: string, bareFallback?: string) => {
      const fallback = dqFallback ?? sqFallback ?? bareFallback;

      // 1. Check direct key match
      let value = values[key];

      // 2. Check nested JSONPath resolution if direct key is undefined
      if (value === undefined && key.includes('.')) {
        value = resolvePath(values, key);
      }

      // 3. Fallback handling
      if (value === undefined || value === null || value === '') {
        if (fallback !== undefined) {
          return fallback;
        }
        return preserveUnresolved ? match : '';
      }

      // 4. Stringify objects / arrays cleanly
      let resultString: string;
      if (typeof value === 'object') {
        resultString = JSON.stringify(value, null, 2);
      } else {
        resultString = String(value);
      }

      // 5. Basic sanitization
      if (sanitizeValues) {
        resultString = resultString.trim();
      }

      return resultString;
    }
  );
}

/**
 * Validates that all required variables in a template have been provided.
 */
export function validateVariableValues(
  template: string,
  values: Record<string, unknown>
): { isValid: boolean; missingVariables: string[] } {
  const { variables } = extractVariables(template);
  const missing: string[] = [];

  for (const v of variables) {
    const val = values[v.name];
    if (v.required && (val === undefined || val === null || val === '')) {
      missing.push(v.name);
    }
  }

  return {
    isValid: missing.length === 0,
    missingVariables: missing,
  };
}

/**
 * Alias for renderPromptTemplate
 */
export const substituteVariables = renderPromptTemplate;
