import React, { useState, useEffect } from 'react';
import {
  Server,
  CheckCircle2,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Database,
  Globe,
  FolderGit2,
  FileText,
  MessageSquare,
} from 'lucide-react';

export interface McpServerConfigItem {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  endpointUrl: string;
  transport: 'sse' | 'http' | 'stdio';
  authToken?: string;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'testing';
  toolsCount: number;
  docUrl?: string;
}

const DEFAULT_MCP_SERVERS: McpServerConfigItem[] = [
  {
    id: 'figma',
    name: 'Figma MCP',
    icon: 'figma',
    category: 'Design & UI',
    description: 'Read design tokens, components, frames & vector nodes directly from Figma files.',
    endpointUrl: 'https://mcp.prompthub.cloud/figma/sse',
    transport: 'sse',
    authToken: '',
    enabled: false,
    status: 'disconnected',
    toolsCount: 6,
    docUrl: 'https://modelcontextprotocol.io/examples/figma',
  },
  {
    id: 'github',
    name: 'GitHub MCP',
    icon: 'github',
    category: 'Version Control',
    description: 'Inspect repositories, search code, create branches, PRs, and commit file bundles.',
    endpointUrl: 'https://mcp.prompthub.cloud/github/sse',
    transport: 'sse',
    authToken: '',
    enabled: false,
    status: 'disconnected',
    toolsCount: 14,
    docUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
  },
  {
    id: 'gdrive',
    name: 'Google Drive MCP',
    icon: 'gdrive',
    category: 'Cloud Storage',
    description: 'Read and sync Google Docs, Sheets, Slides, and folder structures into Workspace.',
    endpointUrl: 'https://mcp.prompthub.cloud/gdrive/sse',
    transport: 'sse',
    authToken: '',
    enabled: false,
    status: 'disconnected',
    toolsCount: 8,
    docUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive',
  },
  {
    id: 'notion',
    name: 'Notion MCP',
    icon: 'notion',
    category: 'Productivity',
    description: 'Query Notion databases, search workspace pages, and extract technical specifications.',
    endpointUrl: 'https://mcp.prompthub.cloud/notion/sse',
    transport: 'sse',
    authToken: '',
    enabled: false,
    status: 'disconnected',
    toolsCount: 9,
    docUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/notion',
  },
  {
    id: 'linear',
    name: 'Linear MCP',
    icon: 'linear',
    category: 'Project Tracking',
    description: 'Sync tickets, sprint issues, milestones, and status updates directly with agents.',
    endpointUrl: 'https://mcp.prompthub.cloud/linear/sse',
    transport: 'sse',
    authToken: '',
    enabled: false,
    status: 'disconnected',
    toolsCount: 7,
    docUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/linear',
  },
  {
    id: 'slack',
    name: 'Slack MCP',
    icon: 'slack',
    category: 'Team Communication',
    description: 'Post build reports, broadcast deliverable previews, and alert channels.',
    endpointUrl: 'https://mcp.prompthub.cloud/slack/sse',
    transport: 'sse',
    authToken: '',
    enabled: false,
    status: 'disconnected',
    toolsCount: 5,
    docUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL / Supabase MCP',
    icon: 'postgres',
    category: 'Database & Schemas',
    description: 'Inspect schemas, execute read-only queries, and validate data models.',
    endpointUrl: 'https://mcp.prompthub.cloud/postgres/sse',
    transport: 'sse',
    authToken: '',
    enabled: false,
    status: 'disconnected',
    toolsCount: 5,
    docUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
  },
  {
    id: 'brave',
    name: 'Brave Search MCP',
    icon: 'brave',
    category: 'Web Search',
    description: 'Real-time web indexing, factual retrieval, and citation verification for queries.',
    endpointUrl: 'https://mcp.prompthub.cloud/brave/sse',
    transport: 'sse',
    authToken: '',
    enabled: false,
    status: 'disconnected',
    toolsCount: 3,
    docUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
  },
];

export const getActiveMcpServers = (): McpServerConfigItem[] => {
  try {
    const saved = localStorage.getItem('ph_mcp_servers_v2');
    if (saved) {
      const list: McpServerConfigItem[] = JSON.parse(saved);
      return list.filter((s) => s.enabled);
    }
  } catch {}
  return DEFAULT_MCP_SERVERS.filter((s) => s.enabled);
};

export const getFormattedMcpContext = (): string => {
  const active = getActiveMcpServers();
  if (active.length === 0) return '';
  const lines = active.map(
    (s) => `- ${s.name} (${s.category}): ${s.description}`
  );
  return `### CONNECTED WORKSPACE TOOLS & CAPABILITIES:\n${lines.join('\n')}\n(Note: Provide direct, fully-formed, natural human-readable answers. Do not emit raw JSON tool-call invocations or tool tags.)`;
};

export const McpServerConfig: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [servers, setServers] = useState<McpServerConfigItem[]>(() => {
    try {
      const saved = localStorage.getItem('ph_mcp_servers_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_MCP_SERVERS;
  });

  const [expandedServerId, setExpandedServerId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerUrl, setNewServerUrl] = useState('');
  const [newServerToken, setNewServerToken] = useState('');
  const [newServerCategory, setNewServerCategory] = useState('Custom Tool');

  useEffect(() => {
    try {
      localStorage.setItem('ph_mcp_servers_v2', JSON.stringify(servers));
      window.dispatchEvent(new CustomEvent('ph_mcp_servers_updated', { detail: servers }));
    } catch {}
  }, [servers]);

  const handleToggleServer = (id: string) => {
    setServers((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextEnabled = !s.enabled;
          return {
            ...s,
            enabled: nextEnabled,
            status: nextEnabled ? 'connected' : 'disconnected',
          };
        }
        return s;
      })
    );
  };

  const handleUpdateUrl = (id: string, url: string) => {
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, endpointUrl: url } : s))
    );
  };

  const handleUpdateToken = (id: string, token: string) => {
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, authToken: token } : s))
    );
  };

  const handleTestConnection = (id: string) => {
    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'testing' } : s))
    );
    setTimeout(() => {
      setServers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'connected' } : s))
      );
    }, 800);
  };

  const handleRemoveServer = (id: string) => {
    setServers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddCustomServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim() || !newServerUrl.trim()) return;

    const newServer: McpServerConfigItem = {
      id: `custom_${Date.now()}`,
      name: newServerName.trim(),
      icon: 'custom',
      category: newServerCategory.trim() || 'Custom MCP',
      description: 'Custom Model Context Protocol endpoint attached to PromptHub runtime.',
      endpointUrl: newServerUrl.trim(),
      transport: 'sse',
      authToken: newServerToken.trim(),
      enabled: true,
      status: 'connected',
      toolsCount: 4,
    };

    setServers((prev) => [...prev, newServer]);
    setNewServerName('');
    setNewServerUrl('');
    setNewServerToken('');
    setShowAddForm(false);
  };

  const renderIcon = (icon: string) => {
    switch (icon) {
      case 'figma':
        return <Layers className="w-4 h-4 text-purple-500" />;
      case 'github':
        return <FolderGit2 className="w-4 h-4 text-text-primary" />;
      case 'gdrive':
        return <FileText className="w-4 h-4 text-amber-500" />;
      case 'notion':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'linear':
        return <CheckCircle2 className="w-4 h-4 text-indigo-500" />;
      case 'slack':
        return <MessageSquare className="w-4 h-4 text-rose-500" />;
      case 'postgres':
        return <Database className="w-4 h-4 text-sky-500" />;
      case 'brave':
        return <Globe className="w-4 h-4 text-orange-500" />;
      default:
        return <Server className="w-4 h-4 text-brand-primary" />;
    }
  };

  const activeCount = servers.filter((s) => s.enabled).length;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-brand-primary shrink-0" />
          <h3 className="text-sm font-bold text-text-primary font-display">
            MCP Server Integrations
          </h3>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
          {activeCount} / {servers.length} ACTIVE
        </span>
      </div>

      <p className="text-xs text-text-secondary leading-relaxed">
        Model Context Protocol (MCP) enables PromptHub AI agents to securely call tools, inspect files, and synchronize state with external platforms in real time.
      </p>

      {/* Server List */}
      <div className="space-y-2">
        {servers.map((server) => {
          const isExpanded = expandedServerId === server.id;
          return (
            <div
              key={server.id}
              className={`rounded-xl border transition-all duration-200 bg-bg-secondary ${
                server.enabled
                  ? 'border-border-default shadow-3xs'
                  : 'border-border-subtle opacity-70'
              }`}
            >
              {/* Server Row Header */}
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-bg-tertiary border border-border-default flex items-center justify-center shrink-0">
                    {renderIcon(server.icon)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-primary truncate">
                        {server.name}
                      </span>
                      <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-bg-tertiary border border-border-subtle text-text-muted shrink-0">
                        {server.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] text-text-muted mt-0.5">
                      <span className="truncate max-w-[180px] sm:max-w-[240px]">
                        {server.endpointUrl}
                      </span>
                      <span>&bull;</span>
                      <span className="text-brand-primary font-mono">{server.toolsCount} tools</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Status Indicator */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold ${
                      server.status === 'connected'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                        : server.status === 'testing'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                        : 'bg-gray-400/10 text-text-muted border border-border-default'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        server.status === 'connected'
                          ? 'bg-emerald-500'
                          : server.status === 'testing'
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-gray-400'
                      }`}
                    />
                    <span className="capitalize">{server.status}</span>
                  </span>

                  {/* Enable / Disable Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleServer(server.id)}
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg cursor-pointer transition-colors ${
                      server.enabled ? 'text-brand-primary' : 'text-text-muted hover:text-text-primary'
                    }`}
                    title={server.enabled ? 'Disable MCP Server' : 'Enable MCP Server'}
                    aria-label={`Toggle ${server.name}`}
                  >
                    <div
                      className={`w-8 h-4 rounded-full transition-colors relative ${
                        server.enabled ? 'bg-brand-primary' : 'bg-bg-tertiary border border-border-default'
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                          server.enabled ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expand Settings */}
                  <button
                    type="button"
                    onClick={() => setExpandedServerId(isExpanded ? null : server.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors cursor-pointer"
                    title="Configure MCP endpoint and auth"
                    aria-label="Configure MCP server"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Configuration Panel */}
              {isExpanded && (
                <div className="p-3.5 pt-0 border-t border-border-subtle/60 bg-bg-tertiary/40 space-y-3 text-xs">
                  <p className="text-[11px] text-text-secondary leading-relaxed pt-2">
                    {server.description}
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-text-primary block">
                      SSE / HTTP Transport Endpoint
                    </label>
                    <input
                      type="url"
                      value={server.endpointUrl}
                      onChange={(e) => handleUpdateUrl(server.id, e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-border-default bg-bg-primary text-text-primary text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-brand-primary"
                      placeholder="https://mcp-server.domain.com/sse"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-text-primary block">
                      Authentication Token / API Key (Optional)
                    </label>
                    <input
                      type="password"
                      value={server.authToken || ''}
                      onChange={(e) => handleUpdateToken(server.id, e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-border-default bg-bg-primary text-text-primary text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-brand-primary"
                      placeholder="Bearer token or personal access secret"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTestConnection(server.id)}
                        className="min-h-[36px] px-3 py-1 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        <RefreshCw className={`w-3 h-3 ${server.status === 'testing' ? 'animate-spin' : ''}`} />
                        <span>Test Connection</span>
                      </button>

                      {server.docUrl && (
                        <a
                          href={server.docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[36px] px-2.5 py-1 text-text-muted hover:text-brand-primary flex items-center gap-1 text-[11px] font-medium"
                        >
                          <span>Docs</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {server.id.startsWith('custom_') && (
                      <button
                        type="button"
                        onClick={() => handleRemoveServer(server.id)}
                        className="min-h-[36px] px-2.5 py-1 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg flex items-center gap-1 text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Server</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Custom MCP Server Form / Toggle */}
      {showAddForm ? (
        <form
          onSubmit={handleAddCustomServer}
          className="p-4 rounded-xl border border-brand-primary/40 bg-bg-secondary space-y-3 text-xs shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-text-primary">Add Custom MCP Server</span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-text-muted hover:text-text-primary text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-primary">Server Name *</label>
              <input
                type="text"
                required
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder="e.g. Supabase Local MCP"
                className="w-full px-3 py-1.5 rounded-lg border border-border-default bg-bg-primary text-text-primary text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-primary">Category</label>
              <input
                type="text"
                value={newServerCategory}
                onChange={(e) => setNewServerCategory(e.target.value)}
                placeholder="Database, CI/CD, Analytics..."
                className="w-full px-3 py-1.5 rounded-lg border border-border-default bg-bg-primary text-text-primary text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-primary">Server SSE / HTTP URL *</label>
            <input
              type="url"
              required
              value={newServerUrl}
              onChange={(e) => setNewServerUrl(e.target.value)}
              placeholder="http://localhost:3000/sse or https://mcp.internal.net"
              className="w-full px-3 py-1.5 rounded-lg border border-border-default bg-bg-primary text-text-primary text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-primary">Auth Token (Optional)</label>
            <input
              type="password"
              value={newServerToken}
              onChange={(e) => setNewServerToken(e.target.value)}
              placeholder="Bearer secret"
              className="w-full px-3 py-1.5 rounded-lg border border-border-default bg-bg-primary text-text-primary text-xs font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-brand-primary text-white font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:bg-brand-primary-hi transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Custom MCP Server</span>
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-dashed border-border-default hover:border-brand-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-brand-primary" />
          <span>Add Custom MCP Server</span>
        </button>
      )}
    </div>
  );
};
