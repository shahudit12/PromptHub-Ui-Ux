/**
 * src/config/toolProviderRegistry.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical Tool & Web-Intelligence Provider Registry for PromptHub (V3).
 *
 * SEPARATION PRINCIPLE:
 * Tool providers (You.com, Firecrawl) provide grounded search, crawling,
 * contents extraction, financial data, and MCP capabilities to prompt agents.
 * They are NEVER LLM text completion models and MUST NOT appear in the
 * LLM model catalog or model picker modals.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type ToolProviderId = 'you_com' | 'firecrawl';
export type ToolServiceType = 'search_research' | 'web_crawler' | 'mcp_server';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: 'search' | 'answer' | 'contents' | 'research' | 'finance' | 'crawler' | 'mcp';
  endpoint: string;
  method: 'GET' | 'POST';
  authHeader: string;
  status: 'ACTIVE' | 'PLANNED';
  inputSchema?: Record<string, unknown>;
}

export interface ToolProviderMetadata {
  id: ToolProviderId;
  name: string;
  serviceType: ToolServiceType;
  baseUrl: string;
  docsUrl: string;
  apiKeyEnvVar: string;
  tools: ToolDefinition[];
}

export const TOOL_PROVIDERS: Record<ToolProviderId, ToolProviderMetadata> = {
  you_com: {
    id: 'you_com',
    name: 'You.com Web Intelligence & Agents Platform',
    serviceType: 'search_research',
    baseUrl: 'https://ydc-index.io/v1',
    docsUrl: 'https://documentation.you.com/',
    apiKeyEnvVar: 'YOU_COM_API_KEY',
    tools: [
      {
        id: 'you-search',
        name: 'You.com Web Search API',
        description: 'Structured web and news search designed for agent consumption with snippet extraction.',
        category: 'search',
        endpoint: 'https://ydc-index.io/v1/search',
        method: 'GET',
        authHeader: 'X-API-Key: <YOU_COM_API_KEY>',
        status: 'ACTIVE',
      },
      {
        id: 'you-answer',
        name: 'You.com Answer API',
        description: 'Cited and synthesized factual answers designed for grounding LLM prompts.',
        category: 'answer',
        endpoint: 'https://ydc-index.io/v1/answer',
        method: 'GET',
        authHeader: 'X-API-Key: <YOU_COM_API_KEY>',
        status: 'ACTIVE',
      },
      {
        id: 'you-contents',
        name: 'You.com Contents API',
        description: 'Targeted URL content extraction and clean markdown generation for RAG pipelines.',
        category: 'contents',
        endpoint: 'https://ydc-index.io/v1/contents',
        method: 'GET',
        authHeader: 'X-API-Key: <YOU_COM_API_KEY>',
        status: 'ACTIVE',
      },
      {
        id: 'you-research',
        name: 'You.com Research API',
        description: 'Multi-step deep synthesis and live web investigation for autonomous research agents.',
        category: 'research',
        endpoint: 'https://ydc-index.io/v1/research',
        method: 'POST',
        authHeader: 'X-API-Key: <YOU_COM_API_KEY>',
        status: 'ACTIVE',
      },
      {
        id: 'you-finance',
        name: 'You.com Finance Research API',
        description: 'Live market data, financial intelligence, and company fundamentals for financial agents.',
        category: 'finance',
        endpoint: 'https://ydc-index.io/v1/finance',
        method: 'GET',
        authHeader: 'X-API-Key: <YOU_COM_API_KEY>',
        status: 'ACTIVE',
      },
      {
        id: 'you-mcp',
        name: 'You.com MCP Server',
        description: 'Official Model Context Protocol server exposing you-search, you-contents, you-answer.',
        category: 'mcp',
        endpoint: 'mcp://you.com/tools',
        method: 'POST',
        authHeader: 'X-API-Key: <YOU_COM_API_KEY>',
        status: 'ACTIVE',
      },
    ],
  },
  firecrawl: {
    id: 'firecrawl',
    name: 'Firecrawl Search & Extract',
    serviceType: 'web_crawler',
    baseUrl: 'https://api.firecrawl.dev/v1',
    docsUrl: 'https://docs.firecrawl.dev/',
    apiKeyEnvVar: 'FIRECRAWL_API_KEY',
    tools: [
      {
        id: 'firecrawl-scrape',
        name: 'Firecrawl Scrape URL',
        description: 'Scrapes web pages with dynamic DOM rendering and returns LLM-clean Markdown.',
        category: 'crawler',
        endpoint: 'https://api.firecrawl.dev/v1/scrape',
        method: 'POST',
        authHeader: 'Authorization: Bearer <FIRECRAWL_API_KEY>',
        status: 'ACTIVE',
      },
    ],
  },
};

/**
 * Checks whether an ID refers to a specialized tool provider or tool model rather than an LLM model.
 */
export function isToolProvider(id: string): boolean {
  if (!id) return false;
  const clean = id.toLowerCase().trim();
  return (
    clean === 'you_com' ||
    clean === 'you.com' ||
    clean === 'firecrawl' ||
    clean.startsWith('you-') ||
    clean.startsWith('firecrawl-')
  );
}

export const isToolProviderOrModel = isToolProvider;

/**
 * Returns all active tool provider definitions.
 */
export function getActiveToolProviders(): ToolProviderMetadata[] {
  return Object.values(TOOL_PROVIDERS);
}
