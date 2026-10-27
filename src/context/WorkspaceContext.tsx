import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApp } from './AppContext';
import { draftPersistenceService } from '../services/draftPersistenceService';
import { smartModelResolver } from '../services/ai/smartModelResolver';

export interface WorkingPromptState {
  id: string | null;
  title: string;
  description: string;
  rawContent: string;
  category: string;
  tags: string[];
  model: string;
  variables: Record<string, string>;
  variableValues: Record<string, string>;
  lastModified: number;
}

export interface WorkspaceProjectState {
  id: string | null;
  name: string;
  description: string;
  activeTaskId: string | null;
  activeTaskPrompt: string;
}

export interface WorkspaceAnalysisState {
  promptText: string;
  result: any | null;
  improvedPrompt: string | null;
  analyzedAt: number | null;
}

export interface WorkspaceContextType {
  // Working prompt state
  workingPrompt: WorkingPromptState;
  setWorkingPrompt: (update: Partial<WorkingPromptState>) => void;
  resetWorkingPrompt: () => void;

  // Active Project & Task
  project: WorkspaceProjectState;
  setProject: (update: Partial<WorkspaceProjectState>) => void;

  // Analysis result cache for cross-tool continuity
  analysis: WorkspaceAnalysisState;
  setAnalysis: (update: Partial<WorkspaceAnalysisState>) => void;

  // Cross-Tool Seamless Transitions (Describe → Create → Analyze → Compare → Improve → Save → Reuse → Deliver)
  sendToStudio: (promptText?: string, modelId?: string, title?: string) => void;
  sendToAnalyzer: (promptText?: string, modelId?: string) => void;
  sendToArena: (promptText?: string, candidateModels?: string[]) => void;
  sendToWork: (task: { title?: string; prompt: string; intent?: string }) => void;
  acceptOptimizedPrompt: (improvedPrompt: string, destination?: 'workspace' | 'arena') => void;

  // Context breadcrumb helper
  getBreadcrumbInfo: () => { tool: string; subtask?: string; model?: string };
}

const DEFAULT_PROMPT: WorkingPromptState = {
  id: null,
  title: 'Untitled Prompt',
  description: '',
  rawContent: '',
  category: 'Development',
  tags: [],
  model: 'openrouter/free',
  variables: {},
  variableValues: {},
  lastModified: Date.now(),
};

const DEFAULT_PROJECT: WorkspaceProjectState = {
  id: null,
  name: 'Default Workspace',
  description: 'Primary AI Development Workspace',
  activeTaskId: null,
  activeTaskPrompt: '',
};

const DEFAULT_ANALYSIS: WorkspaceAnalysisState = {
  promptText: '',
  result: null,
  improvedPrompt: null,
  analyzedAt: null,
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    activeTab,
    setActiveTab,
    setActivePromptId,
    prompts,
    activePromptId,
    showToast,
    setArenaPromptDraft,
  } = useApp();

  // 1. Initial State Hydration from draft persistence or active prompt
  const [workingPrompt, setWorkingPromptInternal] = useState<WorkingPromptState>(() => {
    const saved = draftPersistenceService.getWorkspaceDraft();
    if (saved && (saved.rawContent || (saved.title && saved.title !== 'Untitled Prompt'))) {
      return {
        id: saved.activePromptId || null,
        title: saved.title || 'Untitled Prompt',
        description: saved.description || '',
        rawContent: saved.rawContent || '',
        category: saved.category || 'Development',
        tags: saved.tagsText ? saved.tagsText.split(',').map((t) => t.trim()).filter(Boolean) : [],
        model: saved.model || 'openrouter/free',
        variables: {},
        variableValues: saved.variableValues || {},
        lastModified: saved.lastUpdatedAt || Date.now(),
      };
    }
    return DEFAULT_PROMPT;
  });

  const [project, setProjectInternal] = useState<WorkspaceProjectState>(DEFAULT_PROJECT);
  const [analysis, setAnalysisInternal] = useState<WorkspaceAnalysisState>(DEFAULT_ANALYSIS);

  // Sync working prompt if activePromptId changes in AppContext
  useEffect(() => {
    if (activePromptId) {
      const found = prompts.find((p) => p.id === activePromptId);
      if (found) {
        setWorkingPromptInternal((prev) => {
          if (prev.id === found.id && prev.rawContent === found.rawContent) return prev;
          return {
            id: found.id,
            title: found.title,
            description: found.description || '',
            rawContent: found.rawContent,
            category: found.category || 'Development',
            tags: found.tags || [],
            model: found.model || prev.model || 'openrouter/free',
            variables: {},
            variableValues: {},
            lastModified: Date.now(),
          };
        });
      }
    }
  }, [activePromptId, prompts]);

  // Debounced auto-save to draft persistence
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setWorkingPrompt = useCallback((update: Partial<WorkingPromptState>) => {
    setWorkingPromptInternal((prev) => {
      const next: WorkingPromptState = {
        ...prev,
        ...update,
        lastModified: Date.now(),
      };

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        draftPersistenceService.saveWorkspaceDraft({
          title: next.title,
          description: next.description,
          rawContent: next.rawContent,
          category: next.category,
          tagsText: next.tags.join(', '),
          model: next.model,
          visibility: 'private',
          variableValues: next.variableValues,
          activePromptId: next.id,
        });
      }, 300);

      return next;
    });
  }, []);

  const resetWorkingPrompt = useCallback(() => {
    setWorkingPromptInternal(DEFAULT_PROMPT);
    draftPersistenceService.clearWorkspaceDraft();
    setActivePromptId(null);
  }, [setActivePromptId]);

  const setProject = useCallback((update: Partial<WorkspaceProjectState>) => {
    setProjectInternal((prev) => ({ ...prev, ...update }));
  }, []);

  const setAnalysis = useCallback((update: Partial<WorkspaceAnalysisState>) => {
    setAnalysisInternal((prev) => ({ ...prev, ...update }));
  }, []);

  // ─── Cross-Tool Transitions ───────────────────────────────────────────────

  // 1. Send to Prompt Studio
  const sendToStudio = useCallback((promptText?: string, modelId?: string, title?: string) => {
    const update: Partial<WorkingPromptState> = {};
    if (promptText !== undefined) update.rawContent = promptText;
    if (modelId) {
      update.model = modelId;
      smartModelResolver.setLastSelectedModel(modelId, user?.id);
    }
    if (title) update.title = title;
    
    if (Object.keys(update).length > 0) {
      setWorkingPrompt(update);
    }

    if (promptText) {
      try {
        localStorage.setItem('prompthub_working_prompt_draft', promptText);
        sessionStorage.setItem('ph_creation_workspace_prompt', promptText);
      } catch {}
      window.dispatchEvent(new CustomEvent('ph_set_editor_content', { detail: { content: promptText } }));
    }

    setActiveTab('workspace');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = '/workspace';
      url.searchParams.delete('mode');
      if (modelId) url.searchParams.set('model', modelId);
      window.history.pushState({ tab: 'workspace', model: modelId }, '', url.toString());
    }
  }, [setWorkingPrompt, setActiveTab, user?.id]);

  // 2. Send to Analyzer
  const sendToAnalyzer = useCallback((promptText?: string, modelId?: string) => {
    const textToAnalyze = promptText !== undefined ? promptText : workingPrompt.rawContent;
    if (!textToAnalyze?.trim()) {
      showToast('Please enter a prompt first before analyzing.', 'info');
      setActiveTab('workspace');
      return;
    }

    setWorkingPrompt({
      rawContent: textToAnalyze,
      ...(modelId ? { model: modelId } : {}),
    });

    try {
      sessionStorage.setItem('ph_creation_workspace_prompt', textToAnalyze);
    } catch {}

    setActiveTab('workspace');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = '/workspace';
      window.history.pushState({ tab: 'workspace' }, '', url.toString());
    }
  }, [workingPrompt.rawContent, setWorkingPrompt, setActiveTab, showToast]);

  // 3. Send to Multi-Model Arena
  const sendToArena = useCallback((promptText?: string, _candidateModels?: string[]) => {
    const targetText = promptText !== undefined ? promptText : workingPrompt.rawContent;
    if (!targetText?.trim()) {
      showToast('Please enter a prompt first before testing.', 'info');
      setActiveTab('workspace');
      return;
    }

    setWorkingPrompt({ rawContent: targetText });
    setArenaPromptDraft(targetText);

    try {
      sessionStorage.setItem('ph_creation_workspace_prompt', targetText);
    } catch {}

    setActiveTab('workspace');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = '/workspace';
      window.history.pushState({ tab: 'workspace' }, '', url.toString());
    }
  }, [workingPrompt.rawContent, setWorkingPrompt, setArenaPromptDraft, setActiveTab, showToast]);

  // 4. Send to Autonomous Work IDE
  const sendToWork = useCallback((task: { title?: string; prompt: string; intent?: string }) => {
    setProjectInternal((prev) => ({
      ...prev,
      activeTaskPrompt: task.prompt,
      activeTaskId: `task_${Date.now()}`,
      name: task.title || prev.name,
    }));

    try {
      sessionStorage.setItem('ph_work_pending_task', JSON.stringify(task));
    } catch {}

    window.dispatchEvent(new CustomEvent('ph_work_incoming_task', { detail: task }));
    setActiveTab('work');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = '/work';
      window.history.pushState({ tab: 'work' }, '', url.toString());
    }
  }, [setActiveTab]);

  // 5. Accept Optimized Prompt (Loop completion)
  const acceptOptimizedPrompt = useCallback((improvedPrompt: string, destination: 'workspace' | 'arena' = 'workspace') => {
    setWorkingPrompt({
      rawContent: improvedPrompt,
      title: workingPrompt.title.includes('(Optimized)') ? workingPrompt.title : `${workingPrompt.title} (Optimized)`,
    });

    showToast('Accepted optimized prompt version.', 'success');

    if (destination === 'arena') {
      sendToArena(improvedPrompt);
    } else {
      sendToStudio(improvedPrompt);
    }
  }, [workingPrompt.title, setWorkingPrompt, showToast, sendToArena, sendToStudio]);

  // 6. Breadcrumb info calculation
  const getBreadcrumbInfo = useCallback(() => {
    switch (activeTab) {
      case 'home':
        return { tool: 'Home', subtask: 'Product Overview' };
      case 'dashboard':
        return { tool: 'Developer Dashboard', subtask: 'Metrics & Activity' };
      case 'create-and-improve':
        return { tool: 'Create & Improve', subtask: 'Conversational Workspace' };
      case 'workspace':
        return { tool: 'Workspace', subtask: 'Studio' };
      case 'classic-studio':
      case 'arena':
      case 'analyzer':
      case 'developer':
      case 'developer-mode':
        return {
          tool: 'Developer Mode',
          subtask: 'Under Development',
        };
      case 'work':
        return {
          tool: 'Work IDE',
          subtask: project.name || 'Autonomous Development',
        };
      case 'agents':
        return { tool: 'AI Agents Studio', subtask: 'Autonomous Agents' };
      case 'library':
        return { tool: 'Prompt Library', subtask: 'Saved Prompts' };
      case 'teams':
        return { tool: 'Teams', subtask: 'Collaborate' };
      case 'community':
        return { tool: 'Community', subtask: 'Discussions' };
      case 'profile':
        return { tool: 'Profile', subtask: 'Account & Settings' };
      case 'marketplace':
        return { tool: 'Prompt Marketplace', subtask: 'Discover' };
      case 'collections':
        return { tool: 'Templates & Collections', subtask: 'Browse' };
      case 'pricing':
      case 'wallet':
      case 'recharge':
        return { tool: 'Usage & Credits', subtask: 'Wallet' };
      case 'settings':
        return { tool: 'Account Settings', subtask: 'Preferences' };
      case 'credentials':
        return { tool: 'API Keys & BYOK', subtask: 'Credentials' };
      case 'models-guide':
      case 'models':
        return { tool: 'Models Directory', subtask: 'LLM Comparison' };
      case 'news':
        return { tool: 'AI News & Insights', subtask: 'Latest Releases' };
      case 'admin':
        return { tool: 'Admin Console', subtask: 'Platform Governance' };
      default:
        return { tool: 'Dashboard', subtask: activeTab };
    }
  }, [activeTab, workingPrompt.title, workingPrompt.model, project.name]);

  const value = useMemo<WorkspaceContextType>(() => ({
    workingPrompt,
    setWorkingPrompt,
    resetWorkingPrompt,
    project,
    setProject,
    analysis,
    setAnalysis,
    sendToStudio,
    sendToAnalyzer,
    sendToArena,
    sendToWork,
    acceptOptimizedPrompt,
    getBreadcrumbInfo,
  }), [
    workingPrompt,
    setWorkingPrompt,
    resetWorkingPrompt,
    project,
    setProject,
    analysis,
    setAnalysis,
    sendToStudio,
    sendToAnalyzer,
    sendToArena,
    sendToWork,
    acceptOptimizedPrompt,
    getBreadcrumbInfo,
  ]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
