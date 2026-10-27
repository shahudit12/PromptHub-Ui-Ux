import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { AIUpgradeModal } from '../components/AIUpgradeModal';
import { ModelSelectorModal } from '../components/ModelSelectorModal';
import { modelCatalogService } from '../services/modelCatalogService';
import { calculateCostFromCatalog } from '../lib/openrouter';
import { aiGateway } from '../services/ai/aiGateway';
import { securityUtils } from '../utils/security';
import { logger } from '../utils/logger';
import { scanPromptSecurity } from '../services/ai/promptSecurityScanner';
import { extractVariables, renderPromptTemplate, validateVariableValues } from '../services/ai/variableEngine';
import { classifyPromptIntent } from '../services/ai/intentClassifier';
import { PromptRepository } from '../repositories/promptRepository';
import { normalizeError } from '../utils/errorMessages';
import type { CategoryType, PromptVersion, Prompt } from '../db/schema';
import { smartModelResolver, type SelectionMode } from '../services/ai/smartModelResolver';
import { multiProviderService } from '../services/ai/multiProviderService';
import { trackPromptExecuted as trackMixpanelPromptExecuted } from '../lib/mixpanelEvents';
import { isFreeOpenRouterModel } from '../config/providerRegistry';

// Studio Modular Components
import {
  PromptHeader,
  StudioToolbar,
  type StudioTabMode,
  EditorPane,
  VariableDrawer,
  ExecutionPanel,
  ArenaPanel,
  RefinementPanel,
  ExportPanel,
  VersionHistoryPanel,
  CollectionPickerModal,
} from '../components/studio';
import { ImportPromptModal } from '../components/studio/ImportPromptModal';
import type { ImportedPrompt } from '../services/import/promptImporter';
import { draftPersistenceService } from '../services/draftPersistenceService';
import { useWorkspace } from '../context/WorkspaceContext';

import { 
  Plus, 
  Search, 
  Layers, 
  Lock, 
  Globe, 
  X, 
  Code2, 
  Play 
} from 'lucide-react';

export interface WorkspaceViewProps {
  initialMode?: StudioTabMode;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({ initialMode = 'editor' }) => {
  const {
    prompts,
    activePromptId,
    setActivePromptId,
    createPrompt,
    updatePrompt,
    forkPrompt,
    collections,
    createCollection,
    addPromptToCollection,
    showToast,
    getVersionsForPrompt,
    setShowAuthModal,
    user,
    userPurchases,
    arenaPromptDraft,
    setArenaPromptDraft,
    activeTab,
    setActiveTab,
    selectedStudioModel,
  } = useApp();

  const {
    workingPrompt,
    setWorkingPrompt,
    sendToAnalyzer,
    sendToWork,
  } = useWorkspace();

  // Active prompt reference
  const activePrompt = prompts.find((p) => p.id === activePromptId);

  // Helper to resolve initial prompt payload on mount
  const initialPromptData = useMemo(() => {
    if (activePrompt) return activePrompt;
    if (activePromptId) {
      try {
        const stored = sessionStorage.getItem('ph_active_prompt_data');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id === activePromptId) return parsed as Prompt;
        }
      } catch {}
    }
    if (workingPrompt.id && workingPrompt.rawContent) {
      return {
        id: workingPrompt.id,
        title: workingPrompt.title,
        description: workingPrompt.description,
        rawContent: workingPrompt.rawContent,
        category: workingPrompt.category as CategoryType,
        tags: workingPrompt.tags,
        model: workingPrompt.model,
        visibility: 'private' as const,
      } as Partial<Prompt>;
    }
    const draft = draftPersistenceService.getWorkspaceDraft();
    if (draft && (draft.rawContent || (draft.title && draft.title !== 'Untitled Prompt'))) {
      return {
        id: draft.activePromptId || undefined,
        title: draft.title || 'Untitled Prompt',
        description: draft.description || '',
        rawContent: draft.rawContent || '',
        category: (draft.category as CategoryType) || 'Development',
        tags: draft.tagsText ? draft.tagsText.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        model: draft.model || undefined,
        visibility: draft.visibility || 'private',
      } as Partial<Prompt>;
    }
    return null;
  }, [activePrompt, activePromptId, workingPrompt]);

  // Editor Core State
  const [title, setTitle] = useState(() => initialPromptData?.title || 'Untitled Prompt');
  const [description, setDescription] = useState(() => initialPromptData?.description || '');
  const [rawContent, setRawContent] = useState(() => initialPromptData?.rawContent || '');
  const [category, setCategory] = useState<CategoryType>(() => (initialPromptData?.category as CategoryType) || 'Development');
  const [tagsText, setTagsText] = useState(() => initialPromptData?.tags?.join(', ') || '');
  const [model, setModel] = useState<string>(() => {
    if (initialPromptData?.model) return initialPromptData.model;
    const lastSelected = smartModelResolver.getLastSelectedModel();
    if (lastSelected) {
      return lastSelected;
    }
    const smart = smartModelResolver.resolveSmartDefaultModel('ide', { category: (initialPromptData?.category as CategoryType) || 'Development', selectionMode: 'automatic' });
    return smart.status === 'resolved' ? smart.model.modelId : 'openrouter/free';
  });
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(() => {
    return initialPromptData?.model || smartModelResolver.getLastSelectedModel() ? 'explicit-user-selection' : 'automatic';
  });
  const [visibility, setVisibility] = useState<'public' | 'private'>(() => (initialPromptData?.visibility === 'public' ? 'public' : 'private'));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Studio Mode State
  const [studioMode, setStudioMode] = useState<StudioTabMode>(() => {
    if (activeTab === 'arena') return 'arena';
    return initialMode;
  });

  useEffect(() => {
    if (activeTab === 'arena') {
      setStudioMode('arena');
    } else if (activeTab === 'classic-studio') {
      setStudioMode('editor');
    }
  }, [activeTab]);

  const [mobilePane, setMobilePane] = useState<'editor' | 'output'>('editor');
  // Desktop layout: 'split' (adjustable ratio), 'editor' (editor full-width, output hidden), 'output' (output full-width, editor hidden)
  const [desktopLayout, setDesktopLayout] = useState<'split' | 'editor' | 'output'>('split');
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ph_workspace_split_ratio');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 20 && parsed <= 80) return parsed;
      }
    } catch {}
    return 50;
  });
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  };

  const handleSplitTouchStart = () => {
    setIsDraggingSplit(true);
  };

  useEffect(() => {
    if (!isDraggingSplit) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!splitContainerRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const rect = splitContainerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(80, Math.max(20, Math.round(pct * 10) / 10));
      setSplitRatio(clamped);
    };

    const handlePointerUp = () => {
      setIsDraggingSplit(false);
      try {
        localStorage.setItem('ph_workspace_split_ratio', splitRatio.toString());
      } catch {}
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDraggingSplit, splitRatio]);

  const handleToggleEditorLayout = () => {
    setDesktopLayout((prev) => (prev === 'editor' ? 'split' : 'editor'));
  };
  const handleToggleOutputLayout = () => {
    setDesktopLayout((prev) => (prev === 'output' ? 'split' : 'output'));
  };

  // Variable State & Drawer
  const [isVariablesOpen, setIsVariablesOpen] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string>>(() => {
    const initialVars: Record<string, string> = {};
    if (initialPromptData && (initialPromptData as any).variables) {
      (initialPromptData as any).variables.forEach((v: any) => {
        initialVars[v.name] = v.defaultValue || '';
      });
    }
    return initialVars;
  });

  // Execution & Output State
  const [executionOutput, setExecutionOutput] = useState('');
  const [executionReasoning, setExecutionReasoning] = useState<string | undefined>(undefined);
  const [executionProvider, setExecutionProvider] = useState<string | undefined>(undefined);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLatencyMs, setExecutionLatencyMs] = useState(0);
  // null means the provider reported no usage for the last run. It is not 0, and it
  const [executionTokens, setExecutionTokens] = useState<number | null>(null);
  const [executionCostUsd, setExecutionCostUsd] = useState<number | null>(null);
  const [isDeliverableEngineActive, setIsDeliverableEngineActive] = useState<boolean>(true);
  const [fineTunedPrompt, setFineTunedPrompt] = useState<string>('');
  const [taskClassification, setTaskClassification] = useState<any>(null);
  const [isExecutionTruncated, setIsExecutionTruncated] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modals
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleImportPrompt = (imported: ImportedPrompt) => {
    setTitle(imported.title);
    setDescription(imported.description || '');
    setRawContent(imported.template);
    setCategory(imported.category);
    if (imported.tags && imported.tags.length > 0) {
      setTagsText(imported.tags.join(', '));
    }
    if (imported.model) {
      setModel(imported.model);
    }
    setHasUnsavedChanges(true);
    showToast(`🎉 Imported "${imported.title}" from ${imported.sourceFormat}!`, 'success');
  };

  // Search in Library Sidebar
  const [searchQuery, setSearchQuery] = useState('');

  // History & Versions
  const [versionsList, setVersionsList] = useState<PromptVersion[]>([]);

  // Fetch catalog on mount & check for preselected model from credentials / model hub
  useEffect(() => {
    modelCatalogService.fetchCatalog().catch(() => {});

    const stored = sessionStorage.getItem('ph_ide_selected_model');
    if (stored) {
      setModel(stored);
      setSelectionMode('explicit-user-selection');
      smartModelResolver.setLastSelectedModel(stored, user?.id);
      sessionStorage.removeItem('ph_ide_selected_model');
    }

    const handleModelSelect = (e: any) => {
      if (e.detail?.modelId) {
        setModel(e.detail.modelId);
        setSelectionMode('explicit-user-selection');
        smartModelResolver.setLastSelectedModel(e.detail.modelId, user?.id);
      }
    };
    const handleSetEditorContent = (e: any) => {
      if (e.detail?.content) {
        setRawContent(e.detail.content);
        setHasUnsavedChanges(true);
      }
    };
    window.addEventListener('ph_select_ide_model', handleModelSelect);
    window.addEventListener('ph_set_editor_content', handleSetEditorContent);
    return () => {
      window.removeEventListener('ph_select_ide_model', handleModelSelect);
      window.removeEventListener('ph_set_editor_content', handleSetEditorContent);
    };
  }, [user?.id]);

  // Synchronize workingPrompt if navigating from Composer or Analyzer with new prompt text
  useEffect(() => {
    if (!activePromptId && workingPrompt.rawContent && (!rawContent || rawContent.trim().length === 0)) {
      setRawContent(workingPrompt.rawContent);
      if (workingPrompt.title && workingPrompt.title !== 'Untitled Prompt') setTitle(workingPrompt.title);
      if (workingPrompt.model) setModel(workingPrompt.model);
    }
  }, [workingPrompt.rawContent, workingPrompt.title, workingPrompt.model, activePromptId, rawContent]);

  // Sync edits back to workingPrompt in WorkspaceContext
  useEffect(() => {
    // If activePromptId is set but content is still empty, do not overwrite workingPrompt with blank data
    if (activePromptId && (!rawContent || rawContent.trim().length === 0) && (!title || title === 'Untitled Prompt')) {
      return;
    }

    setWorkingPrompt({
      title,
      rawContent,
      category,
      model,
      description,
      variableValues,
      id: activePromptId,
    });
  }, [title, rawContent, category, model, description, variableValues, activePromptId, setWorkingPrompt]);

  // Listen for arena prompt draft and URL query params
  useEffect(() => {
    if (arenaPromptDraft) {
      setStudioMode('arena');
      if (!rawContent || rawContent.trim().length === 0 || arenaPromptDraft !== rawContent) {
        setRawContent(arenaPromptDraft);
        setHasUnsavedChanges(true);
      }
      setArenaPromptDraft('');
    }
  }, [arenaPromptDraft, rawContent, setArenaPromptDraft]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode') || params.get('tab');
      if (modeParam === 'arena') {
        setStudioMode('arena');
      } else if (modeParam === 'editor' || modeParam === 'history' || modeParam === 'optimizer') {
        setStudioMode(modeParam as StudioTabMode);
      }
      const modelParam = params.get('model');
      if (modelParam) {
        setModel(modelParam);
        setSelectionMode('explicit-user-selection');
        smartModelResolver.setLastSelectedModel(modelParam, user?.id);
      }
    }
  }, [user?.id]);

  // Sync selectedStudioModel from context navigation
  useEffect(() => {
    if (selectedStudioModel) {
      setModel(selectedStudioModel);
      setSelectionMode('explicit-user-selection');
      smartModelResolver.setLastSelectedModel(selectedStudioModel, user?.id);
    }
  }, [selectedStudioModel, user?.id]);

  // Sync studioMode when navigating to arena tab
  useEffect(() => {
    if (activeTab === 'arena') {
      setStudioMode('arena');
    }
  }, [activeTab]);

  // Context-aware automatic model adaptation based on prompt intent (coding vs reasoning vs general)
  // Ensures the default model is strictly an OpenRouter Free model tailored to the user's task
  useEffect(() => {
    if (selectionMode === 'automatic') {
      const smart = smartModelResolver.resolveSmartDefaultModel('ide', {
        promptText: rawContent,
        title,
        category,
        selectionMode: 'automatic',
      });
      if (smart.status === 'resolved' && smart.model.modelId !== model) {
        setModel(smart.model.modelId);
      }
    }
  }, [rawContent, title, category, selectionMode]);

  const refreshVersions = async (promptId: string) => {
    try {
      const v = await getVersionsForPrompt(promptId);
      setVersionsList(v || []);
    } catch {
      setVersionsList([]);
    }
  };

  // Sync state when active prompt changes
  useEffect(() => {
    if (activePrompt) {
      setTitle(activePrompt.title);
      setDescription(activePrompt.description || '');
      setRawContent(activePrompt.rawContent);
      setCategory(activePrompt.category);
      setTagsText(activePrompt.tags?.join(', ') || '');
      if (activePrompt.model) {
        setModel(activePrompt.model);
        setSelectionMode('explicit-user-selection');
      } else {
        const lastSelected = smartModelResolver.getLastSelectedModel(user?.id);
        if (lastSelected) {
          setModel(lastSelected);
          setSelectionMode('explicit-user-selection');
        } else {
          const smart = smartModelResolver.resolveSmartDefaultModel('ide', {
            promptText: activePrompt.rawContent,
            title: activePrompt.title,
            category: activePrompt.category,
            selectionMode: 'automatic',
          });
          setModel(smart.status === 'resolved' ? smart.model.modelId : 'openrouter/free');
          setSelectionMode('automatic');
        }
      }
      setVisibility(activePrompt.visibility === 'public' ? 'public' : 'private');
      setHasUnsavedChanges(false);

      // Load versions
      refreshVersions(activePrompt.id);

      // Setup initial variable values
      const initialVars: Record<string, string> = {};
      if (activePrompt.variables) {
        activePrompt.variables.forEach((v) => {
          initialVars[v.name] = v.defaultValue || '';
        });
      }
      setVariableValues(initialVars);
      setExecutionOutput('');
      setExecutionReasoning(undefined);
    } else if (activePromptId) {
      let isCancelled = false;
      try {
        const stored = sessionStorage.getItem('ph_active_prompt_data');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id === activePromptId) {
            setTitle(parsed.title || 'Untitled Prompt');
            setDescription(parsed.description || '');
            setRawContent(parsed.rawContent || '');
            setCategory(parsed.category || 'Development');
            setTagsText(parsed.tags?.join(', ') || '');
            if (parsed.model) {
              setModel(parsed.model);
              setSelectionMode('explicit-user-selection');
            }
            setVisibility(parsed.visibility === 'public' ? 'public' : 'private');
            setHasUnsavedChanges(false);
            refreshVersions(parsed.id);
            const initialVars: Record<string, string> = {};
            if (parsed.variables) {
              parsed.variables.forEach((v: any) => {
                initialVars[v.name] = v.defaultValue || '';
              });
            }
            setVariableValues(initialVars);
          }
        }
      } catch {}

      PromptRepository.getPromptById(activePromptId).then((fetchedPrompt) => {
        if (isCancelled || !fetchedPrompt) return;
        setTitle(fetchedPrompt.title);
        setDescription(fetchedPrompt.description || '');
        setRawContent(fetchedPrompt.rawContent || '');
        setCategory(fetchedPrompt.category);
        setTagsText(fetchedPrompt.tags?.join(', ') || '');
        if (fetchedPrompt.model) {
          setModel(fetchedPrompt.model);
          setSelectionMode('explicit-user-selection');
        } else {
          const smart = smartModelResolver.resolveSmartDefaultModel('ide', {
            promptText: fetchedPrompt.rawContent,
            title: fetchedPrompt.title,
            category: fetchedPrompt.category,
            selectionMode: 'automatic',
          });
          setModel(smart.status === 'resolved' ? smart.model.modelId : 'openrouter/free');
          setSelectionMode('automatic');
        }
        setVisibility(fetchedPrompt.visibility === 'public' ? 'public' : 'private');
        setHasUnsavedChanges(false);
        refreshVersions(fetchedPrompt.id);
        const initialVars: Record<string, string> = {};
        if (fetchedPrompt.variables) {
          fetchedPrompt.variables.forEach((v) => {
            initialVars[v.name] = v.defaultValue || '';
          });
        }
        setVariableValues(initialVars);
        setExecutionOutput('');
        setExecutionReasoning(undefined);
      }).catch((err) => {
        logger.warn('[WorkspaceView] Failed to fetch active prompt on demand:', err);
      });
      return () => {
        isCancelled = true;
      };
    } else {
      const savedDraft = draftPersistenceService.getWorkspaceDraft();
      if (savedDraft && (savedDraft.rawContent || savedDraft.title)) {
        setTitle(savedDraft.title || 'Untitled Prompt');
        setDescription(savedDraft.description || '');
        setRawContent(savedDraft.rawContent || '');
        setCategory((savedDraft.category as CategoryType) || 'Development');
        setTagsText(savedDraft.tagsText || '');
        if (savedDraft.model) {
          setModel(savedDraft.model);
          setSelectionMode((savedDraft.selectionMode as SelectionMode) || 'automatic');
        }
        setVisibility(savedDraft.visibility || 'private');
        setVariableValues(savedDraft.variableValues || {});
        setHasUnsavedChanges(true);
      } else {
        setTitle('Untitled Prompt');
        setDescription('');
        setRawContent('');
        setCategory('Development');
        setTagsText('');
        const lastSelected = smartModelResolver.getLastSelectedModel(user?.id);
        if (lastSelected) {
          setModel(lastSelected);
          setSelectionMode('explicit-user-selection');
        } else {
          const smart = smartModelResolver.resolveSmartDefaultModel('ide', { category: 'Development', selectionMode: 'automatic' });
          setModel(smart.status === 'resolved' ? smart.model.modelId : 'openrouter/free');
          setSelectionMode('automatic');
        }
        setVisibility('private');
        setVersionsList([]);
        setVariableValues({});
        setExecutionOutput('');
        setExecutionReasoning(undefined);
        setHasUnsavedChanges(false);
      }
    }
  }, [activePromptId, prompts]);

  // Persist working draft automatically to localStorage across refreshes
  useEffect(() => {
    if (!activePromptId || hasUnsavedChanges) {
      draftPersistenceService.saveWorkspaceDraft({
        title,
        description,
        rawContent,
        category,
        tagsText,
        model,
        selectionMode,
        visibility,
        variableValues,
        activePromptId,
      });
    }
  }, [title, description, rawContent, category, tagsText, model, selectionMode, visibility, variableValues, activePromptId, hasUnsavedChanges]);

  // Detected variables
  const { variables } = extractVariables(rawContent);
  const variableNames = variables.map((v) => v.name);

  // Security score
  const securityReport = scanPromptSecurity(rawContent);

  // Intent and Complexity Engine
  const intentReport = classifyPromptIntent(rawContent);

  // Save handler
  const handleSave = async () => {
    if (!title.trim()) {
      showToast('Please enter a prompt title', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const sanitizedTitle = securityUtils.sanitizeInput(title);
      const sanitizedDesc = securityUtils.sanitizeInput(description);
      const sanitizedContent = securityUtils.sanitizePromptInput(rawContent);
      const tags = tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const promptVariables = variables.map((v) => ({
        name: v.name,
        defaultValue: v.defaultValue || '',
        description: v.description || '',
      }));

      if (activePromptId) {
        // If current prompt belongs to another creator, auto-save as a new fork in private library (admins can edit directly)
        if (activePrompt && user && activePrompt.authorId !== user.id && user.role !== 'Admin') {
          const forked = await forkPrompt(activePromptId);
          if (forked && forked.id) {
            await updatePrompt(forked.id, {
              title: sanitizedTitle,
              description: sanitizedDesc,
              rawContent: sanitizedContent,
              category,
              tags,
              model,
              visibility: 'private',
              variables: promptVariables,
            });
            setActivePromptId(forked.id);
            showToast(`Saved a customized copy to your private library (created by @${activePrompt.authorName || 'community'})`, 'success');
          }
          setHasUnsavedChanges(false);
          return;
        }

        await updatePrompt(activePromptId, {
          title: sanitizedTitle,
          description: sanitizedDesc,
          rawContent: sanitizedContent,
          category,
          tags,
          model,
          visibility,
          variables: promptVariables,
        });
        showToast(visibility === 'public' ? 'Prompt updated and published to public catalog' : 'Prompt saved to your private library', 'success');
      } else {
        const newPrompt = await createPrompt({
          title: sanitizedTitle,
          description: sanitizedDesc,
          rawContent: sanitizedContent,
          category,
          tags,
          model,
          visibility,
          variables: promptVariables,
          assetType: 'prompt',
          isPremium: false,
          price: 0,
        });
        if (newPrompt && newPrompt.id) setActivePromptId(newPrompt.id);
        showToast(visibility === 'public' ? 'Prompt published to community showcase!' : 'Prompt saved to your private library!', 'success');
      }
      draftPersistenceService.clearWorkspaceDraft();
      setHasUnsavedChanges(false);
    } catch (err: any) {
      logger.error('Failed to save prompt', err);
      const { userMessage } = normalizeError(err);
      showToast(userMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Execution runner with variable pre-validation & real-time streaming
  const handleStopExecution = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsExecuting(false);
    showToast('Execution stopped by user.', 'info');
  };

  const handleExecute = async () => {
    if (!rawContent.trim()) {
      showToast('Cannot run empty prompt', 'error');
      return;
    }

    // Pre-flight auth / BYOK check: allow free models or BYOK keys without login
    const isUnlocked = multiProviderService.isModelUnlockedByBYOK(model);
    const isFree = isFreeOpenRouterModel(model);
    if (!user && !isUnlocked.unlocked && !isFree) {
      setShowAuthModal(true);
      showToast('Please sign in for free to execute premium models with platform credits, or connect an API key.', 'info');
      return;
    }

    // Validate variables before execution
    const validation = validateVariableValues(rawContent, variableValues);
    if (!validation.isValid) {
      setIsVariablesOpen(true);
      showToast(`Missing required parameters: ${validation.missingVariables.join(', ')}`, 'error');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsExecuting(true);
    setIsExecutionTruncated(false);
    setMobilePane('output');
    setExecutionOutput('');
    setExecutionLatencyMs(0);
    setExecutionReasoning(undefined);
    const startTime = Date.now();

    const latencyTimer = setInterval(() => {
      setExecutionLatencyMs(Date.now() - startTime);
    }, 100);

    const isFreeModel = isFreeOpenRouterModel(model);
    const isYouModel = model.startsWith('you.com') || model.startsWith('you_com');
    const initialExpectedProvider = isFreeModel
      ? 'OpenRouter Free'
      : isYouModel
      ? 'You.com Intelligence'
      : 'AICredits Premium';
    setExecutionProvider(initialExpectedProvider);


    try {
      const substituted = renderPromptTemplate(rawContent, variableValues);
      const res = await aiGateway.executePrompt(substituted, {
        modelId: model,
        selectionMode,
        feature: 'ide',
        providerPreference: 'auto',
        executionMode: isDeliverableEngineActive ? 'deliverable' : 'raw',
        maxTokens: 8192,
        signal: controller.signal,
        stream: true,
        onChunk: (_delta, accumulated) => {
          setExecutionOutput(accumulated);
        },
      });
      const elapsed = res.durationMs || (Date.now() - startTime);
      if (res.fineTunedPrompt) {
        setFineTunedPrompt(res.fineTunedPrompt);
      }
      if (res.taskClassification) {
        setTaskClassification(res.taskClassification);
      }
      // Tokens and cost are shown only when the provider actually measured usage.
      // This previously fell back to `Math.ceil(substituted.length / 4)` and
      // `Math.ceil(res.output.length / 4)`, so an unmeasured run displayed a precise
      // "N tokens" chip — and a dollar figure derived from it labelled "Incurred
      // Cost" — that was really a character count divided by four.
      const measured = res.usageMeasured === true;
      const promptTokens = measured ? res.usage?.promptTokens : undefined;
      const outputTokens = measured ? res.usage?.completionTokens : undefined;
      const totalTokens =
        measured && typeof res.usage?.totalTokens === 'number'
          ? res.usage.totalTokens
          : measured && (typeof promptTokens === 'number' || typeof outputTokens === 'number')
          ? (promptTokens ?? 0) + (outputTokens ?? 0)
          : null;
      // Cost needs measured token counts on both sides to be a fact rather than a guess.
      const calculatedCost =
        typeof promptTokens === 'number' && typeof outputTokens === 'number'
          ? calculateCostFromCatalog(model, promptTokens, outputTokens)
          : null;

      setExecutionOutput(res.output || 'No output received.');
      setIsExecutionTruncated(Boolean(res.isTruncated || res.finishReason === 'length'));
      setExecutionProvider(res.provider || initialExpectedProvider);
      setExecutionLatencyMs(elapsed);
      setExecutionTokens(totalTokens);
      setExecutionCostUsd(calculatedCost?.costUsd ?? null);

      trackMixpanelPromptExecuted({
        model,
        provider: (res.provider as any) || 'openrouter',
        tokensUsed: totalTokens || 0,
        creditCost: calculatedCost?.costUsd ? Math.round(calculatedCost.costUsd * 100) : 0,
        durationMs: elapsed,
        isByok: res.provider === 'byok' || res.provider?.startsWith('byok_'),
      });

    } catch (err: any) {
      setExecutionProvider(undefined);
      if (err?.name === 'AbortError' || err?.message?.includes('cancelled') || err?.message?.includes('abort')) {
        return;
      }
      logger.error('Execution failed', err);
      const { userMessage } = normalizeError(err);
      if (err?.status === 401 || err?.code === 'UNAUTHENTICATED' || userMessage?.toLowerCase().includes('sign in')) {
        setShowAuthModal(true);
      }
      setExecutionOutput(`Execution error: ${userMessage}`);
      showToast(userMessage, 'error');
    } finally {
      clearInterval(latencyTimer);
      abortControllerRef.current = null;
      setIsExecuting(false);
    }
  };

  // Seamless continuation engine for truncated model outputs
  const handleContinueExecution = async () => {
    if (!executionOutput.trim() || isExecuting) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsExecuting(true);
    const latencyTimer = setInterval(() => {
      setExecutionLatencyMs((prev) => prev + 100);
    }, 100);

    const baseOutput = executionOutput;

    try {
      const substituted =
        renderPromptTemplate(rawContent || 'Build complete production deliverable', variableValues) ||
        rawContent ||
        'Build complete production deliverable';
      const continuationPrompt =
        'CONTINUE GENERATING IMMEDIATELY: Your previous output reached the maximum token budget and was cut off. ' +
        'Continue outputting the remaining code and text starting from the EXACT cutoff point without repeating any prior lines. ' +
        'Ensure all code fences, tags, and functions are completely closed.';

      const continuationMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'user', content: substituted },
        { role: 'assistant', content: baseOutput },
        {
          role: 'user',
          content: continuationPrompt,
        },
      ];
      const res = await aiGateway.executePrompt(continuationPrompt, {
        modelId: model,
        selectionMode,
        feature: 'ide',
        providerPreference: 'auto',
        executionMode: 'raw',
        messages: continuationMessages,
        maxTokens: 8192,
        signal: controller.signal,
        stream: true,
        onChunk: (_delta, accumulated) => {
          let chunkToAdd = accumulated;
          if (baseOutput.includes('```') && chunkToAdd.startsWith('```')) {
            chunkToAdd = chunkToAdd.replace(/^```[a-zA-Z]*\n?/, '');
          }
          setExecutionOutput(baseOutput + chunkToAdd);
        },
      });

      let cleanContinuation = res.output || '';
      if (baseOutput.includes('```') && cleanContinuation.startsWith('```')) {
        cleanContinuation = cleanContinuation.replace(/^```[a-zA-Z]*\n?/, '');
      }
      const finalOutput = baseOutput + cleanContinuation;
      setExecutionOutput(finalOutput);
      setIsExecutionTruncated(Boolean(res.isTruncated || res.finishReason === 'length'));
      showToast('Successfully continued and appended deliverable output!', 'success');
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('cancelled')) {
        return;
      }
      logger.error('Continuation failed', err);
      const { userMessage } = normalizeError(err);
      showToast(`Continuation error: ${userMessage}`, 'error');
    } finally {
      clearInterval(latencyTimer);
      abortControllerRef.current = null;
      setIsExecuting(false);
    }
  };

  // Snapshot & Version Persistence
  const handleCreateSnapshot = async (notes: string) => {
    if (!rawContent.trim()) {
      showToast('Cannot create snapshot of empty prompt', 'error');
      return;
    }

    const currentVerNumber = versionsList.length + 1;
    const localVersion: PromptVersion = {
      id: `ver_${Date.now()}`,
      promptId: activePromptId || 'draft',
      versionNumber: currentVerNumber,
      rawContent: rawContent,
      updateNotes: notes,
      createdAt: new Date().toISOString(),
    };

    setVersionsList((prev) => [localVersion, ...prev.filter(v => v.id !== localVersion.id)]);

    if (activePromptId && user) {
      try {
        await PromptRepository.saveVersion(activePromptId, rawContent, notes, user.id);
        await refreshVersions(activePromptId);
      } catch (err: any) {
        console.warn('[WorkspaceView] Remote snapshot save fallback:', err);
      }
    }
    showToast(`Version ${currentVerNumber} snapshot created!`, 'success');
  };

  // Restore Version Non-Destructively
  const handleRestoreVersion = async (ver: PromptVersion) => {
    if (!ver.rawContent) return;
    setRawContent(ver.rawContent);
    setHasUnsavedChanges(true);

    if (activePromptId) {
      try {
        const authorId = user?.id || 'current_user';
        await PromptRepository.saveVersion(
          activePromptId,
          ver.rawContent,
          `Non-destructive restore of v${ver.versionNumber}`,
          authorId
        );
        await refreshVersions(activePromptId);
        showToast(`Restored v${ver.versionNumber} and appended new snapshot!`, 'success');
      } catch (err: any) {
        const { userMessage } = normalizeError(err);
        showToast(userMessage, 'info');
      }
    }
  };



  // Create new blank prompt
  const handleCreateNew = () => {
    setActivePromptId(null);
    setTitle('New Prompt');
    setDescription('');
    setRawContent('');
    setCategory('Development');
    setTagsText('');
    const lastSelected = smartModelResolver.getLastSelectedModel(user?.id);
    if (lastSelected) {
      setModel(lastSelected);
      setSelectionMode('explicit-user-selection');
    } else {
      const smart = smartModelResolver.resolveSmartDefaultModel('ide', { category: 'Development', selectionMode: 'automatic' });
      setModel(smart.status === 'resolved' ? smart.model.modelId : 'openrouter/free');
      setSelectionMode('automatic');
    }
    setVisibility('private');
    setHasUnsavedChanges(true);
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setIsLibraryOpen(false);
    }
  };

  // Filtered prompts in library drawer (only user written, forked, or purchased prompts)
  const userOwnedOrLicensedPrompts = useMemo<Prompt[]>(() => {
    if (!user) return [];
    const purchasedIds = new Set(
      (userPurchases || [])
        .filter((p: any) => p.status === 'completed')
        .map((p: any) => p.promptId)
    );
    return prompts.filter((p: Prompt) => p.authorId === user.id || purchasedIds.has(p.id));
  }, [prompts, user, userPurchases]);

  const filteredPrompts = userOwnedOrLicensedPrompts.filter((p: Prompt) => {
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="flex h-full flex-1 min-h-0 w-full bg-bg-primary text-text-primary overflow-hidden font-sans select-none relative">
      {/* ── Universal Slide-over Backdrop & Library Drawer ─────────── */}
      {isLibraryOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            onClick={() => setIsLibraryOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[700] animate-fade-in cursor-pointer"
            aria-hidden="true"
          />

          {/* ── Collapsible & Responsive Prompt Library Drawer ─────────── */}
          <aside
            className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-bg-secondary border-r border-border-default shadow-2xl z-[710] flex flex-col transition-transform duration-200 ease-out translate-x-0"
          >
        {/* Library Header */}
        <div className="p-3 sm:p-3.5 border-b border-border-default flex items-center justify-between bg-bg-primary/60">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 text-brand-primary shrink-0" />
            <span className="text-xs font-semibold text-text-primary truncate">Prompt Library</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-brand-primary-light text-brand-primary shrink-0">
              {prompts.length}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCreateNew}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-colors shadow-2xs cursor-pointer min-h-[34px]"
              title="Create New Prompt"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>

            {/* Close X button */}
            <button
              type="button"
              onClick={() => setIsLibraryOpen(false)}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center"
              title="Close Library Drawer"
              aria-label="Close Library"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2.5 border-b border-border-default bg-bg-secondary">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter prompts..."
              className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-md bg-bg-primary border border-border-default text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        {/* Prompt List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredPrompts.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-muted">No prompts found.</div>
          ) : (
            filteredPrompts.map((p) => {
              const isActive = p.id === activePromptId;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setActivePromptId(p.id);
                    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
                      setIsLibraryOpen(false);
                    }
                  }}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                    isActive
                      ? 'bg-brand-primary-light/60 border-brand-primary/30 text-text-primary font-medium shadow-3xs'
                      : 'bg-bg-secondary hover:bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-semibold truncate flex-1 min-w-0 pr-1">{p.title}</p>
                    <span className="text-[10px] font-mono text-text-muted shrink-0">
                      {p.visibility === 'public' ? <Globe className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-text-muted" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted truncate">
                    {p.description || p.rawContent.slice(0, 40) || 'Empty prompt'}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>,
    document.body
  )}

      {/* ── 2. Studio Workspace Main Area ───────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Editorial Header (Image 4: PROMPT WORKSPACE / LOCAL LIBRARY) */}
        <div className="px-4 sm:px-6 py-3.5 bg-bg-primary border-b border-border-default shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-[11px] font-mono font-semibold tracking-[0.14em] text-[#7A7E75] dark:text-[#9AA0A6] uppercase">
                PROMPT WORKSPACE / LOCAL LIBRARY
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-text-primary tracking-tight">
                Build a prompt that holds up.
              </h1>
              <p className="text-xs text-text-secondary">
                Assemble directives, bind dynamic variables, and test generation fidelity across providers.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF5ED] dark:bg-[#1A3326] text-[11px] font-mono font-semibold text-[#2D6A4F] dark:text-[#86A696] border border-[#D0E6D5] dark:border-[#224A38] self-start sm:self-center shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span>Local workspace ready</span>
            </div>
          </div>
        </div>

        {/* Top Header with Library Toggle */}
        <PromptHeader
          title={title}
          onTitleChange={(val) => {
            setTitle(val);
            setHasUnsavedChanges(true);
          }}
          category={category}
          onCategoryChange={(cat) => {
            setCategory(cat);
            setHasUnsavedChanges(true);
          }}
          visibility={visibility}
          onVisibilityChange={(vis) => {
            setVisibility(vis);
            setHasUnsavedChanges(true);
          }}
          onSave={handleSave}
          onAddToCollection={() => setIsCollectionModalOpen(true)}
          onImport={() => setIsImportModalOpen(true)}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          activePromptId={activePromptId}
          onToggleLibrary={() => setIsLibraryOpen(!isLibraryOpen)}
          isLibraryOpen={isLibraryOpen}
          promptsCount={prompts.length}
        />

        {/* Studio Navigation Toolbar */}
        <StudioToolbar
          activeMode={studioMode}
          onModeChange={(mode) => setStudioMode(mode)}
          selectedModel={model}
          onOpenModelModal={() => setIsModelModalOpen(true)}
          variablesCount={variableNames.length}
          onToggleVariables={() => setIsVariablesOpen(!isVariablesOpen)}
          isVariablesOpen={isVariablesOpen}
          isDeliverableEngineActive={isDeliverableEngineActive}
          onToggleDeliverableEngine={() => setIsDeliverableEngineActive((prev) => !prev)}
          onAnalyzePrompt={() => sendToAnalyzer(rawContent, model)}
          onSendToWork={() => sendToWork({ title: title || 'Studio Task', prompt: rawContent })}
          onSwitchToOneChat={() => setActiveTab('workspace')}
        />

        {/* Main Interactive Studio Canvas */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          {/* Mode Switcher Views */}
          {studioMode === 'editor' && (
            <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
              {/* Mobile View Switcher (<lg) */}
              <div className="lg:hidden flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border-default shrink-0">
                <div className="flex bg-bg-tertiary p-0.5 rounded-lg border border-border-default select-none w-full">
                  <button
                    type="button"
                    onClick={() => setMobilePane('editor')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold font-mono transition-all min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer ${
                      mobilePane === 'editor'
                        ? 'bg-bg-secondary text-text-primary shadow-xs font-bold'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Prompt Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobilePane('output')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold font-mono transition-all min-h-[44px] flex items-center justify-center gap-1.5 relative cursor-pointer ${
                      mobilePane === 'output'
                        ? 'bg-bg-secondary text-text-primary shadow-xs font-bold'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Execution Output</span>
                    {isExecuting && (
                      <span className="w-2 h-2 rounded-full bg-brand-primary ml-1" />
                    )}
                    {executionOutput && !isExecuting && (
                      <span className="text-[10px] font-mono px-1 rounded bg-brand-primary-light text-brand-primary ml-1">
                        Ready
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div 
                ref={splitContainerRef} 
                className="flex flex-col lg:flex-row flex-1 min-h-0 h-full overflow-hidden relative"
                style={{ userSelect: isDraggingSplit ? 'none' : undefined }}
              >
                {/* Editor Pane — Left on desktop, full height on mobile when active */}
                <div 
                  style={{
                    width: desktopLayout === 'split' ? `${splitRatio}%` : undefined,
                    flex: desktopLayout === 'editor' ? '1 1 0%' : undefined,
                  }}
                  className={`flex-col min-h-0 h-full min-w-0 overflow-hidden ${
                    // Mobile: show based on mobilePane
                    mobilePane === 'editor' ? 'flex' : 'hidden lg:flex'
                  } ${
                    // Desktop: expand/collapse based on desktopLayout
                    desktopLayout === 'editor'
                      ? 'lg:flex-1'
                      : desktopLayout === 'output'
                      ? 'lg:hidden'
                      : ''
                  }`}
                >
                  <EditorPane
                    content={rawContent}
                    onChange={(val) => {
                      setRawContent(val);
                      setHasUnsavedChanges(true);
                    }}
                    onExecute={handleExecute}
                    onStop={handleStopExecution}
                    isExecuting={isExecuting}
                    variables={variableNames}
                    onInsertVariable={(v) => {
                      setRawContent((prev) => `${prev} {{${v}}}`);
                      setHasUnsavedChanges(true);
                    }}
                    selectedModel={model}
                    layoutMode={desktopLayout}
                    onToggleLayout={handleToggleEditorLayout}
                    intentReport={intentReport}
                    securityScore={securityReport.securityScore}
                    onOpenOptimizer={() => setStudioMode('optimizer')}
                  />
                </div>

                {/* Draggable Divider (Desktop split mode) */}
                {desktopLayout === 'split' && (
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-valuenow={Math.round(splitRatio)}
                    aria-valuemin={20}
                    aria-valuemax={80}
                    tabIndex={0}
                    onMouseDown={handleSplitMouseDown}
                    onTouchStart={handleSplitTouchStart}
                    onDoubleClick={() => {
                      setSplitRatio(50);
                      try {
                        localStorage.setItem('ph_workspace_split_ratio', '50');
                      } catch {}
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        setSplitRatio((prev) => Math.max(20, prev - 2));
                      } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        setSplitRatio((prev) => Math.min(80, prev + 2));
                      } else if (e.key === 'Home' || e.key === 'Enter') {
                        setSplitRatio(50);
                      }
                    }}
                    className={`hidden lg:flex items-center justify-center relative w-2 hover:w-3 cursor-col-resize select-none shrink-0 transition-all z-20 ${
                      isDraggingSplit
                        ? 'bg-brand-primary'
                        : 'bg-border-default hover:bg-brand-primary/60'
                    }`}
                    title="Drag to resize panes • Double-click to reset 50/50 • Left/Right arrows to adjust"
                  >
                    <div className={`h-8 w-1 rounded-full transition-colors flex flex-col items-center justify-center gap-0.5 ${
                      isDraggingSplit ? 'bg-white' : 'bg-text-muted hover:bg-white'
                    }`}>
                      <span className="w-0.5 h-0.5 rounded-full bg-current opacity-70" />
                      <span className="w-0.5 h-0.5 rounded-full bg-current opacity-70" />
                      <span className="w-0.5 h-0.5 rounded-full bg-current opacity-70" />
                    </div>
                  </div>
                )}

                {/* Live Execution Stream Output Panel — Right on desktop, full height on mobile when active */}
                <div 
                  style={{
                    width: desktopLayout === 'split' ? `${100 - splitRatio}%` : undefined,
                    flex: desktopLayout === 'output' ? '1 1 0%' : undefined,
                  }}
                  className={`flex-col min-h-0 h-full min-w-0 overflow-hidden border-t lg:border-t-0 border-border-default ${
                    mobilePane === 'output' ? 'flex' : 'hidden lg:flex'
                  } ${
                    desktopLayout === 'output'
                      ? 'lg:flex-1'
                      : desktopLayout === 'editor'
                      ? 'lg:hidden'
                      : ''
                  }`}
                >
                  <ExecutionPanel
                    output={executionOutput}
                    reasoning={executionReasoning}
                    isExecuting={isExecuting}
                    selectedModel={model}
                    latencyMs={executionLatencyMs}
                    tokensCount={executionTokens}
                    estimatedCost={executionCostUsd}
                    provider={executionProvider}
                    fineTunedPrompt={fineTunedPrompt}
                    taskClassification={taskClassification}
                    isTruncated={isExecutionTruncated}
                    onContinue={handleContinueExecution}
                    onApplyFineTunedPrompt={(tuned) => {
                      setRawContent(tuned);
                      setHasUnsavedChanges(true);
                      showToast('Applied fine-tuned prompt to Studio Editor!', 'success');
                    }}
                    onOpenInAnalyzer={(promptTextToAnalyze) => {
                      draftPersistenceService.saveAnalyzerDraft({
                        promptText: promptTextToAnalyze,
                      });
                      setActiveTab('analyzer');
                    }}
                    onRetry={handleExecute}
                    onStop={handleStopExecution}
                    onUpgrade={() => setShowUpgradeModal(true)}
                    layoutMode={desktopLayout}
                    onToggleLayout={handleToggleOutputLayout}
                  />
                </div>
              </div>
            </div>
          )}

          {studioMode === 'arena' && (
            <ArenaPanel
              promptText={rawContent}
              onUpdatePrompt={(newText) => {
                setRawContent(newText);
                setHasUnsavedChanges(true);
              }}
              onExecuteArena={async () => {}}
              onSelectWinner={(winnerSlot) => {
                if (winnerSlot.output) {
                  setRawContent(winnerSlot.output);
                  setHasUnsavedChanges(true);
                }
              }}
              isRunning={false}
            />
          )}

          {studioMode === 'optimizer' && (
            <RefinementPanel
              currentPrompt={rawContent}
              selectedModel={model}
              onApplyOptimization={async (opt) => {
                setRawContent(opt);
                setHasUnsavedChanges(true);
                if (activePromptId) {
                  const authorId = user?.id || 'current_user';
                  await PromptRepository.saveVersion(
                    activePromptId,
                    opt,
                    'Optimization: Applied structural refinement',
                    authorId
                  );
                  await refreshVersions(activePromptId);
                }
                showToast('Applied optimization and saved version snapshot', 'success');
              }}
            />
          )}

          {studioMode === 'history' && (
            <VersionHistoryPanel
              versions={versionsList}
              currentContent={rawContent}
              onRestoreVersion={handleRestoreVersion}
              onCreateSnapshot={handleCreateSnapshot}
            />
          )}

          {studioMode === 'export' && (
            <ExportPanel
              promptData={{
                title,
                slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                description,
                template: rawContent,
                category,
                tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
                variables: variables.map((v) => ({
                  name: v.name,
                  defaultValue: v.defaultValue,
                  description: v.description,
                })),
                author: 'PromptHub Creator',
              }}
            />
          )}

          {/* Variable Drawer */}
          <VariableDrawer
            isOpen={isVariablesOpen}
            onClose={() => setIsVariablesOpen(false)}
            template={rawContent}
            variableValues={variableValues}
            onValueChange={(k, v) => setVariableValues((prev) => ({ ...prev, [k]: v }))}
            onResetValues={() => setVariableValues({})}
            onExecute={handleExecute}
          />
        </div>
      </div>

      {/* ── 3. Modals ────────────────────────────────────────────── */}
      <ModelSelectorModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedModelId={model}
        feature="ide"
        onSelectModel={(modelId) => {
          setModel(modelId);
          setSelectionMode('explicit-user-selection');
          smartModelResolver.setLastSelectedModel(modelId, user?.id);
          setIsModelModalOpen(false);
        }}
      />

      <CollectionPickerModal
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        collections={collections}
        onSelectCollection={async (colId) => {
          if (activePromptId) {
            await addPromptToCollection(colId, activePromptId);
            showToast('Added to collection', 'success');
          }
        }}
        onCreateCollection={async (name, desc, isPrivate) => {
          const col = await createCollection(name, desc, isPrivate);
          if (col && activePromptId) {
            await addPromptToCollection(col.id, activePromptId);
            showToast(`Created ${isPrivate ? 'private' : 'public'} collection and added prompt`, 'success');
          }
        }}
      />

      <ImportPromptModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportPrompt}
      />

      <AIUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        mode="credits"
      />
    </div>
  );
};
