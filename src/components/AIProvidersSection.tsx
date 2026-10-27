import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  ShieldCheck, 
  Check, 
  Loader2, 
  Globe2, 
  Lock,
  AlertTriangle,
  Play,
  Copy,
  CheckCheck,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';
import { 
  AI_PROVIDERS, 
  multiProviderService, 
  type AIProviderId, 
  type AIProviderMetadata 
} from '../services/ai/multiProviderService';
import { modelCatalogService, type CatalogModel } from '../services/modelCatalogService';
import { smartModelResolver } from '../services/ai/smartModelResolver';
import { ModelProviderLogo } from './common/ModelProviderLogo';
import { ByokLogo } from './ByokLogo';

export const AIProvidersSection: React.FC = () => {
  const { user, updateUser, showToast, setActiveTab } = useApp();

  // Load all initial keys from multiProviderService / credential vault
  const [keys, setKeys] = useState<{ [key: string]: string }>(() => {
    const initial: Record<string, string> = {};
    AI_PROVIDERS.forEach(p => {
      initial[p.id] = multiProviderService.getKey(p.id);
    });
    return initial;
  });

  // Remember toggle per provider (Default: FALSE / unchecked)
  const [rememberKeys, setRememberKeys] = useState<{ [key: string]: boolean }>(() => {
    const initial: Record<string, boolean> = {};
    AI_PROVIDERS.forEach(p => {
      initial[p.id] = multiProviderService.isRemembered(p.id);
    });
    return initial;
  });

  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<{ [key: string]: { success: boolean; message: string } | null }>({});
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'flagship' | 'reasoning' | 'fast'>('all');
  const [expandedModels, setExpandedModels] = useState<{ [key: string]: boolean }>({});
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);
  const [openrouterSearchQuery, setOpenrouterSearchQuery] = useState('');
  const [aicreditsSearchQuery, setAicreditsSearchQuery] = useState('');
  const [openrouterCatalog, setOpenrouterCatalog] = useState<CatalogModel[]>(() => modelCatalogService.getCachedCatalog());
  const [routingMode, setRoutingMode] = useState<'auto' | 'openrouter' | 'direct'>(() => {
    return multiProviderService.getPreferredRoutingMode();
  });
  const [configuredOpenRouterModels, setConfiguredOpenRouterModels] = useState(() => {
    return multiProviderService.getConfiguredOpenRouterModels();
  });

  // Sync state when vault emits update events
  useEffect(() => {
    const handleVaultUpdate = () => {
      const refreshedKeys: Record<string, string> = {};
      const refreshedRemember: Record<string, boolean> = {};
      AI_PROVIDERS.forEach(p => {
        refreshedKeys[p.id] = multiProviderService.getKey(p.id);
        refreshedRemember[p.id] = multiProviderService.isRemembered(p.id);
      });
      setKeys(refreshedKeys);
      setRememberKeys(refreshedRemember);
      setConfiguredOpenRouterModels(multiProviderService.getConfiguredOpenRouterModels());
    };

    window.addEventListener('ph_byok_keys_updated', handleVaultUpdate);
    return () => window.removeEventListener('ph_byok_keys_updated', handleVaultUpdate);
  }, []);

  // Load live OpenRouter catalog for rich model search
  useEffect(() => {
    modelCatalogService.fetchCatalog().then((cat) => {
      if (cat && cat.length > 0) {
        setOpenrouterCatalog(cat);
      }
    }).catch(() => {});
  }, []);

  const handleToggleOpenRouterModel = (model: { id: string; name: string; description?: string; context?: string; contextLength?: number }) => {
    const isConfigured = configuredOpenRouterModels.some(m => m.id === model.id);
    let updated;
    if (isConfigured) {
      updated = configuredOpenRouterModels.filter(m => m.id !== model.id);
      showToast(`Removed ${model.name} from Studio model list`, 'info');
    } else {
      updated = [
        ...configuredOpenRouterModels,
        {
          id: model.id,
          name: model.name,
          description: model.description || 'Configured via OpenRouter',
          context: model.context || (model.contextLength ? `${Math.round(model.contextLength / 1000)}K` : '128K'),
          isCoding: true,
        },
      ];
      showToast(`Added ${model.name} to Studio model list`, 'success');
    }
    setConfiguredOpenRouterModels(updated);
    multiProviderService.setConfiguredOpenRouterModels(updated);
  };

  const handleLaunchModelInIDE = (modelId: string, _modelName?: string) => {
    sessionStorage.setItem('ph_ide_selected_model', modelId);
    try {
      localStorage.setItem('ph_workspace_selected_model', modelId);
      const configured = multiProviderService.getConfiguredOpenRouterModels();
      if (!configured.some(m => m.id === modelId)) {
        const updated = [
          {
            id: modelId,
            name: _modelName || modelId.split('/').pop() || modelId,
            description: 'Custom configured via OpenRouter',
            context: '128K',
            isCoding: true,
          },
          ...configured,
        ];
        multiProviderService.setConfiguredOpenRouterModels(updated);
        setConfiguredOpenRouterModels(updated);
      }
    } catch {}
    smartModelResolver.setLastSelectedModel(modelId, user?.id);
    window.dispatchEvent(new CustomEvent('ph_select_ide_model', { detail: { modelId } }));
    setActiveTab('workspace');
  };

  const handleCopyModelId = (modelId: string) => {
    navigator.clipboard.writeText(modelId);
    setCopiedModelId(modelId);
    setTimeout(() => setCopiedModelId(null), 2000);
  };

  const handleRoutingModeChange = (mode: 'auto' | 'openrouter' | 'direct') => {
    setRoutingMode(mode);
    multiProviderService.setPreferredRoutingMode(mode);
  };

  const toggleShow = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandModels = (id: string) => {
    setExpandedModels(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleKeyChange = (id: string, val: string) => {
    setKeys(prev => ({ ...prev, [id]: val }));
    if (testStatus[id]) {
      setTestStatus(prev => ({ ...prev, [id]: null }));
    }
  };

  const isConnected = (id: string): boolean => {
    return (keys[id] || '').trim().length > 0;
  };

  const connectedCount = AI_PROVIDERS.filter(p => isConnected(p.id)).length;
  const hasOpenRouterConnected = isConnected('openrouter');
  const totalUnlockedDisplay = hasOpenRouterConnected
    ? '400+ Models Unlocked'
    : `${AI_PROVIDERS.filter(p => isConnected(p.id)).reduce((acc, p) => acc + p.models.length, 0)} Models Unlocked`;

  const handleConnect = async (provider: AIProviderMetadata) => {
    const rawKey = (keys[provider.id] || '').trim().replace(/^Bearer\s+/i, '');
    if (!rawKey) {
      showToast(`Please enter an API key for ${provider.name}.`, 'error');
      return;
    }

    if (!provider.keyFormatRegex.test(rawKey)) {
      showToast(
        `Invalid key format for ${provider.name}. Expected format: ${provider.keyPlaceholder}`,
        'error'
      );
      return;
    }

    const shouldRemember = !!rememberKeys[provider.id];

    try {
      multiProviderService.setKey(provider.id, rawKey, { remember: shouldRemember });

      if (user) {
        await updateUser({
          hasBYOK: true,
          byokProvider: provider.id as any,
        });
      }

      showToast(
        shouldRemember
          ? `✓ ${provider.name} key encrypted and saved locally on this device!`
          : `✓ ${provider.name} key connected for this session only (0 credits used).`,
        'success'
      );
    } catch (err: any) {
      showToast(`Failed to connect key: ${err.message}`, 'error');
    }
  };

  const handleDisconnect = async (providerId: AIProviderId) => {
    setKeys(prev => ({ ...prev, [providerId]: '' }));
    setTestStatus(prev => ({ ...prev, [providerId]: null }));
    multiProviderService.removeKey(providerId);

    const remainingProviders = multiProviderService.getConnectedProviders();
    if (user && remainingProviders.length === 0) {
      await updateUser({
        hasBYOK: false,
        byokProvider: undefined,
      });
    }

    showToast(`Removed API key for ${providerId}.`, 'info');
  };

  const handleTestConnection = async (provider: AIProviderMetadata) => {
    const rawKey = (keys[provider.id] || '').trim().replace(/^Bearer\s+/i, '');
    if (!rawKey) {
      showToast(`Please enter an API key for ${provider.name} before testing.`, 'error');
      return;
    }

    setTestingId(provider.id);
    setTestStatus(prev => ({ ...prev, [provider.id]: null }));

    try {
      const res = await multiProviderService.testConnection(provider.id, rawKey);
      setTestStatus(prev => ({ ...prev, [provider.id]: res }));

      if (res.success) {
        showToast(`✓ ${provider.name} API connection verified!`, 'success');
        multiProviderService.setKey(provider.id, rawKey, { remember: !!rememberKeys[provider.id] });
      } else {
        showToast(`Connection failed: ${res.message}`, 'error');
      }
    } catch (err: any) {
      const msg = `Connection test failed: ${err.message}`;
      setTestStatus(prev => ({ ...prev, [provider.id]: { success: false, message: msg } }));
      showToast(msg, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handlePurgeAllKeys = async () => {
    try {
      await multiProviderService.clearAllCredentials();
      const emptyKeys: Record<string, string> = {};
      const emptyRem: Record<string, boolean> = {};
      AI_PROVIDERS.forEach(p => {
        emptyKeys[p.id] = '';
        emptyRem[p.id] = false;
      });
      setKeys(emptyKeys);
      setRememberKeys(emptyRem);
      setTestStatus({});

      if (user) {
        await updateUser({
          hasBYOK: false,
          byokProvider: undefined,
        });
      }

      setShowPurgeModal(false);
      showToast('All API keys have been wiped from this device.', 'success');
    } catch (err: any) {
      showToast(`Failed to purge keys: ${err.message}`, 'error');
    }
  };

  const filteredProviders = useMemo(() => {
    if (selectedFilter === 'all') return AI_PROVIDERS;
    if (selectedFilter === 'flagship') {
      return AI_PROVIDERS.filter(p => ['aicredits', 'openrouter', 'sarvam', 'you_com', 'openai', 'anthropic', 'gemini'].includes(p.id));
    }
    if (selectedFilter === 'reasoning') {
      return AI_PROVIDERS.filter(p => ['deepseek', 'openai', 'anthropic', 'xai', 'you_com', 'aicredits'].includes(p.id));
    }
    if (selectedFilter === 'fast') {
      return AI_PROVIDERS.filter(p => ['groq', 'gemini', 'mistral', 'deepgram', 'assemblyai', 'sarvam'].includes(p.id));
    }
    return AI_PROVIDERS;
  }, [selectedFilter]);

  return (
    <div className="space-y-6 text-left">
      {/* Header & Status Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-bg-secondary border border-border-default shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <ByokLogo size={28} showTile={true} />
              <h3 className="text-sm font-bold text-text-primary">
                Multi-Provider AI &amp; BYOK Key Vault
              </h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed max-w-xl">
              Connect your provider API keys. <strong>One key authorizes all models supported by that provider</strong> with zero platform credits consumed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-default text-text-primary text-xs font-semibold flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${connectedCount > 0 ? 'bg-emerald-500' : 'bg-text-muted'}`} />
              <span>{connectedCount} of {AI_PROVIDERS.length} Connected</span>
            </div>

            {connectedCount > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-brand-primary-light border border-brand-primary/30 text-brand-primary text-xs font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>{totalUnlockedDisplay}</span>
              </div>
            )}

            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>0 Credits Used</span>
            </div>

            {connectedCount > 0 && (
              <button
                type="button"
                onClick={() => setShowPurgeModal(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Forget all API keys on this device"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Forget All Keys</span>
              </button>
            )}
          </div>
        </div>

        {/* Local-Only Privacy Guarantee Notice */}
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-bg-tertiary border border-border-default text-text-secondary text-xs">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand-primary" />
          <p className="leading-relaxed">
            <strong className="text-text-primary font-semibold">Local-Only Security Guarantee:</strong> Your API keys are stored strictly on this device. PromptHub{' '}
            <strong>never saves your API keys in its database, server storage, or analytics</strong>. Keys are sent directly from your browser to the AI provider over encrypted HTTPS.
          </p>
        </div>

        {/* AI Gateway Routing Strategy Selector */}
        <div className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-brand-primary" />
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide font-mono">
                  Execution Routing Strategy
                </h4>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Choose how PromptHub dispatches prompt runs across your connected keys.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleRoutingModeChange('auto')}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer space-y-1 ${
                routingMode === 'auto'
                  ? 'border-brand-primary bg-bg-tertiary ring-1 ring-brand-primary/20'
                  : 'border-border-default hover:bg-bg-tertiary'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">Smart Auto-Routing</span>
                {routingMode === 'auto' && <Check className="w-3.5 h-3.5 text-brand-primary" />}
              </div>
              <p className="text-[10px] text-text-secondary leading-tight">
                Dispatches to direct native provider key first, automatically using OpenRouter as backup.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleRoutingModeChange('openrouter')}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer space-y-1 ${
                routingMode === 'openrouter'
                  ? 'border-brand-primary bg-bg-tertiary ring-1 ring-brand-primary/20'
                  : 'border-border-default hover:bg-bg-tertiary'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">Universal Gateway (OpenRouter)</span>
                {routingMode === 'openrouter' && <Check className="w-3.5 h-3.5 text-brand-primary" />}
              </div>
              <p className="text-[10px] text-text-secondary leading-tight">
                Routes all 400+ models strictly through your OpenRouter key with zero model substitutions.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleRoutingModeChange('direct')}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer space-y-1 ${
                routingMode === 'direct'
                  ? 'border-brand-primary bg-bg-tertiary ring-1 ring-brand-primary/20'
                  : 'border-border-default hover:bg-bg-tertiary'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">Direct Provider Only</span>
                {routingMode === 'direct' && <Check className="w-3.5 h-3.5 text-brand-primary" />}
              </div>
              <p className="text-[10px] text-text-secondary leading-tight">
                Strictly requires native direct API keys (OpenAI, Gemini, Claude, Groq, etc.) without gateway routing.
              </p>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              selectedFilter === 'all'
                ? 'bg-brand-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
            }`}
          >
            All Providers ({AI_PROVIDERS.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('flagship')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              selectedFilter === 'flagship'
                ? 'bg-brand-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
            }`}
          >
            Flagship (OpenAI, Claude, Gemini)
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('reasoning')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              selectedFilter === 'reasoning'
                ? 'bg-brand-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
            }`}
          >
            Deep Reasoning (R1, o1, o3)
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('fast')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              selectedFilter === 'fast'
                ? 'bg-brand-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
            }`}
          >
            Ultra-Fast LPUs (Groq, Gemini Flash)
          </button>
        </div>
      </div>

      {/* Provider Matrix Grid */}
      <div data-tour="tour-byok-providers" className="grid grid-cols-1 gap-4">
        {filteredProviders.map(provider => {
          const connected = isConnected(provider.id);
          const currentKey = keys[provider.id] || '';
          const hasEnteredKey = currentKey.trim().length > 0;
          const isTesting = testingId === provider.id;
          const status = testStatus[provider.id];
          const isExpanded = expandedModels[provider.id] !== undefined ? expandedModels[provider.id] : (connected || hasEnteredKey);
          const isRemembered = multiProviderService.isRemembered(provider.id);
          const isOpenRouter = provider.id === 'openrouter';
          const isAICredits = provider.id === 'aicredits';

          return (
            <div
              key={provider.id}
              className={`bg-bg-secondary rounded-xl p-4 sm:p-5 border transition-all space-y-4 shadow-xs ${
                connected ? 'border-brand-primary ring-1 ring-brand-primary/20' : 'border-border-default'
              }`}
            >
              {/* Provider Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-bg-tertiary border border-border-default flex items-center justify-center shrink-0 shadow-2xs">
                    <ModelProviderLogo provider={provider.id} className="w-5 h-5 shrink-0" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-text-primary">{provider.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-bg-tertiary text-text-secondary border border-border-default font-semibold">
                        {provider.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">{provider.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-md bg-bg-tertiary hover:bg-border-subtle text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 border border-border-default"
                  >
                    <span>Get Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {connected && (
                    <span className={`px-2.5 py-1 rounded border text-[10px] font-semibold flex items-center gap-1 font-mono ${
                      isRemembered
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-sky-50 border-sky-200 text-sky-800'
                    }`}>
                      <Check className="w-3 h-3" />
                      <span>{isRemembered ? 'Saved on device' : 'Session only'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* API Key Input & Action Controls */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeys[provider.id] ? 'text' : 'password'}
                      value={currentKey}
                      onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                      data-tour="tour-byok-input"
                      placeholder={provider.keyPlaceholder}
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-brand-primary pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShow(provider.id)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors cursor-pointer p-0.5"
                      title={showKeys[provider.id] ? 'Hide Key' : 'Show Key'}
                    >
                      {showKeys[provider.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTestConnection(provider)}
                      disabled={isTesting || !currentKey.trim()}
                      className="px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-border-subtle text-text-primary text-xs font-medium border border-border-default transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40 min-h-[36px]"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Test Ping</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleConnect(provider)}
                      disabled={!currentKey.trim()}
                      data-tour="tour-byok-save"
                      className="px-4 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm disabled:opacity-40 min-h-[36px]"
                    >
                      Save Key
                    </button>

                    {connected && (
                      <button
                        onClick={() => handleDisconnect(provider.id)}
                        className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 min-h-[36px]"
                        title="Forget Key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Forget</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Explicit Persistence Consent */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!rememberKeys[provider.id]}
                      onChange={(e) => setRememberKeys(prev => ({ ...prev, [provider.id]: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded border-border-default text-brand-primary focus:ring-brand-primary"
                    />
                    <span>Remember this key on this device (Local encrypted storage)</span>
                  </label>
                </div>

                {/* Test Feedback Message */}
                {status && (
                  <div className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                    status.success 
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium' 
                      : 'bg-rose-50 border border-rose-200 text-rose-800 font-medium'
                  }`}>
                    {status.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{status.message}</span>
                  </div>
                )}
              </div>

              {/* UNLOCKED AI MODELS SECTION */}
              <div className="pt-3 border-t border-border-default space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-primary">
                        {isAICredits ? 'AICredits Frontier Catalog' : isOpenRouter ? 'OpenRouter Catalog Unlocked' : 'AI Models Unlocked by this Key'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {isAICredits || isOpenRouter ? '400+ Models' : `${provider.models.length} Models (0 Credits)`}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpandModels(provider.id)}
                    className="text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 cursor-pointer py-1 px-2 rounded hover:bg-bg-tertiary min-h-[28px]"
                  >
                    <span>{isExpanded ? 'Hide Models' : 'View Unlocked Models'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="space-y-3 pt-1">
                    {/* AICredits.in Gateway Dedicated Explorer */}
                    {isAICredits ? (
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
                          <p className="text-xs text-text-primary leading-relaxed">
                            <strong>💎 AICredits.in Frontier Gateway:</strong> High-performance gateway providing access to <strong>400+ frontier AI models</strong> (Claude 3.7 Sonnet, GPT-4o, DeepSeek R1, Gemini 2.0 Flash, Llama 3.3, and more) with real-time token settlement.
                          </p>
                        </div>

                        {/* Search Input for AICredits Catalog */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search 400+ AICredits frontier models (e.g. 'claude', 'gpt-4o', 'deepseek', 'gemini')..."
                            value={aicreditsSearchQuery}
                            onChange={(e) => setAicreditsSearchQuery(e.target.value)}
                            className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary focus:border-brand-primary focus:outline-none font-mono"
                          />
                        </div>

                        {/* AICredits Filtered Model Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                          {(aicreditsSearchQuery
                            ? openrouterCatalog.filter(m => {
                                const q = aicreditsSearchQuery.toLowerCase().trim();
                                return m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q);
                              })
                            : provider.models
                          ).map((model: any, idx: number) => {
                            const isCopied = copiedModelId === model.id;
                            const ctx = model.contextLength ? `${Math.round(model.contextLength / 1000)}K` : (model.context || '128K');
                            return (
                              <div
                                key={`aicredits-${model.id}-${idx}`}
                                className="p-3 rounded-xl bg-bg-tertiary border border-border-default hover:border-amber-500/40 transition-all space-y-2 flex flex-col justify-between"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-start justify-between gap-1.5">
                                    <span className="text-xs font-bold text-text-primary line-clamp-1 font-display">
                                      {model.name}
                                    </span>
                                    <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-bg-secondary text-text-secondary border border-border-default shrink-0">
                                      {ctx}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-semibold">
                                      💎 AICredits
                                    </span>
                                    {model.isCoding && (
                                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                                        💻 Coding
                                      </span>
                                    )}
                                    {model.isReasoning && (
                                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-50 text-purple-800 border border-purple-200 font-semibold">
                                        🧠 Reasoning
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-text-secondary line-clamp-2 leading-tight">
                                    {model.description || `Frontier AI model powered via AICredits.in gateway.`}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-subtle/60">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyModelId(model.id)}
                                    className="p-1 text-[10px] font-mono text-text-muted hover:text-text-primary rounded hover:bg-bg-secondary transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Copy Model ID"
                                  >
                                    {isCopied ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    <span>{isCopied ? 'Copied' : 'ID'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleLaunchModelInIDE(model.id, model.name)}
                                    className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>Try in IDE</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : isOpenRouter ? (
                      /* OpenRouter Universal Banner & Search */
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-brand-primary-light/40 border border-brand-primary/20 space-y-1">
                          <p className="text-xs text-text-primary leading-relaxed">
                            <strong>🌟 Universal Multi-Model Pass:</strong> Connecting your OpenRouter key authorizes <strong>all 400+ frontier and open-weight models</strong> (Claude 3.7 Sonnet, GPT-4o, DeepSeek R1, Llama 3.3, Gemini, Mistral, and dynamic free routers) with <strong>0 platform credits</strong> consumed.
                          </p>
                        </div>

                        {/* Search Input for OpenRouter Catalog */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search 400+ OpenRouter models unlocked by your key (e.g. 'claude', 'r1', 'gpt-4o', 'llama')..."
                            value={openrouterSearchQuery}
                            onChange={(e) => setOpenrouterSearchQuery(e.target.value)}
                            className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary focus:border-brand-primary focus:outline-none font-mono"
                          />
                        </div>

                        {/* OpenRouter Filtered Model Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                          {(openrouterSearchQuery
                            ? openrouterCatalog.filter(m => {
                                const q = openrouterSearchQuery.toLowerCase().trim();
                                return m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q);
                              })
                            : provider.models
                          ).map((model: any, idx: number) => {
                            const isCopied = copiedModelId === model.id;
                            const ctx = model.contextLength ? `${Math.round(model.contextLength / 1000)}K` : (model.context || '128K');
                            return (
                              <div
                                key={`openrouter-${model.id}-${idx}`}
                                className="p-3 rounded-xl bg-bg-tertiary border border-border-default hover:border-brand-primary/40 transition-all space-y-2 flex flex-col justify-between"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-start justify-between gap-1.5">
                                    <span className="text-xs font-bold text-text-primary line-clamp-1 font-display">
                                      {model.name}
                                    </span>
                                    <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-bg-secondary text-text-secondary border border-border-default shrink-0">
                                      {ctx}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-text-secondary line-clamp-2 leading-tight">
                                    {model.description || `Fast high-performance model.`}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-subtle/60">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyModelId(model.id)}
                                    className="p-1 text-[10px] font-mono text-text-muted hover:text-text-primary rounded hover:bg-bg-secondary transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Copy Model ID"
                                  >
                                    {isCopied ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    <span>{isCopied ? 'Copied' : 'ID'}</span>
                                  </button>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleOpenRouterModel(model)}
                                      className={`px-2 py-1 rounded-md text-[10.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
                                        configuredOpenRouterModels.some((cm) => cm.id === model.id)
                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30'
                                          : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary border-border-default'
                                      }`}
                                      title={configuredOpenRouterModels.some((cm) => cm.id === model.id) ? 'Remove from Studio model list' : 'Add to Studio model list'}
                                    >
                                      {configuredOpenRouterModels.some((cm) => cm.id === model.id) ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                          <span>In Studio</span>
                                        </>
                                      ) : (
                                        <span>+ Studio</span>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleLaunchModelInIDE(model.id, model.name)}
                                      className="px-2.5 py-1 rounded-md bg-brand-primary hover:bg-brand-primary-hi text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                    >
                                      <Play className="w-3 h-3 fill-current" />
                                      <span>Try in IDE</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Direct Native Provider Unlocked Model Cards */
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {provider.models.map((model, idx) => {
                          const isCopied = copiedModelId === model.id;
                          return (
                            <div
                              key={`${provider.id}-${model.id}-${idx}`}
                              className="p-3 rounded-xl bg-bg-tertiary border border-border-default hover:border-brand-primary/40 transition-all space-y-2 flex flex-col justify-between"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-start justify-between gap-1.5">
                                  <span className="text-xs font-bold text-text-primary line-clamp-1 font-display">
                                    {model.name}
                                  </span>
                                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-bg-secondary text-text-secondary border border-border-default shrink-0">
                                    {model.context}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap">
                                  {model.isReasoning && (
                                    <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-800 border border-purple-200 text-[9px] font-mono font-semibold">
                                      🧠 Reasoning
                                    </span>
                                  )}
                                  {model.isCoding && (
                                    <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[9px] font-mono font-semibold">
                                      💻 Coding
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-mono font-semibold">
                                    0 Credits
                                  </span>
                                </div>

                                <p className="text-[11px] text-text-secondary line-clamp-2 leading-tight">
                                  {model.description}
                                </p>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border-subtle/60">
                                <button
                                  type="button"
                                  onClick={() => handleCopyModelId(model.id)}
                                  className="p-1 text-[10px] font-mono text-text-muted hover:text-text-primary rounded hover:bg-bg-secondary transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Copy Model ID"
                                >
                                  {isCopied ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  <span>{isCopied ? 'Copied' : 'ID'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleLaunchModelInIDE(model.id, model.name)}
                                  className="px-2.5 py-1 rounded-md bg-brand-primary hover:bg-brand-primary-hi text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Try in IDE</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal for Forget All Keys */}
      {showPurgeModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-secondary rounded-2xl max-w-md w-full p-6 space-y-4 border border-border-default shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-text-primary font-display">Forget All API Keys on Device?</h3>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              This action will permanently erase all connected BYOK credentials (both active session keys and locally encrypted remembered keys) from this browser profile. You will need to re-enter your API keys to use direct BYOK execution.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-border-subtle border border-border-default transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePurgeAllKeys}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
              >
                Yes, Forget All Keys
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AIProvidersSection;
