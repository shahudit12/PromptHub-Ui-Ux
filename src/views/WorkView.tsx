import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Briefcase, 
  Code2, 
  GitCommit, 
  FileText, 
  Globe, 
  Plus, 
  Play, 
  GitBranch,
  Cpu,
  FolderOpen,
  HardDrive,
  Loader2,
  Check,
  Download,
  Cloud,
  X,
  Database,
  Users,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { 
  WorkProject, 
  WorkTask, 
  WorkAgent, 
  WorkFile, 
  WorkArtifact, 
  WorkFileDiff,
  WorkMessage,
  WorkApproval 
} from '../types/work';
import { workService, normalizeWorkPath } from '../services/work/workService';
import { workGitService } from '../services/work/workGitService';
import { workEventBus } from '../services/work/workEventBus';
import { isImageGenerationIntent } from '../services/work/workAgentEngine';
import { workImageCapService, MAX_IMAGE_GENERATION_CAP } from '../services/work/workImageCapService';
import { workVisualDirectionService } from '../services/work/workVisualDirectionService';
import { storageService, formatStorageBytes } from '../services/storageService';
import type { WorkVisualDirection } from '../types/work';
import { WorkAgentChat } from '../components/work/WorkAgentChat';
import { WorkCodeEditor } from '../components/work/WorkCodeEditor';
import { WorkFileExplorer } from '../components/work/WorkFileExplorer';
import { WorkDiffViewer } from '../components/work/WorkDiffViewer';
import { WorkBrowserPreview } from '../components/work/WorkBrowserPreview';
import { WorkArtifactViewer } from '../components/work/WorkArtifactViewer';
import { WorkApprovalModal } from '../components/work/WorkApprovalModal';

type InspectorTab = 'code' | 'files' | 'diffs' | 'preview' | 'artifacts';
type MobileViewMode = 'chat' | 'inspector';

export const AVAILABLE_FREE_MODELS = [
  { id: 'openrouter/free', name: 'OpenRouter Free Router (Auto)', provider: 'openrouter', tier: 'Free', badge: 'FREE' },
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B (Free)', provider: 'openrouter', tier: 'Free', badge: 'FREE' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', provider: 'openrouter', tier: 'Free', badge: 'FREE' },
  { id: 'qwen/qwen-2.5-coder-32b-instruct:free', name: 'Qwen 2.5 Coder 32B (Free)', provider: 'openrouter', tier: 'Free', badge: 'FREE' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', provider: 'openrouter', tier: 'Free', badge: 'FREE' },
  { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nemotron 3.5 (Free)', provider: 'openrouter', tier: 'Free', badge: 'FREE' },
  { id: 'inclusionai/ling-3.1-flash', name: 'Ling 3.1 Flash (Free)', provider: 'openrouter', tier: 'Free', badge: 'FREE' },
  { id: 'poolside/laguna-s-2.1:free', name: 'Laguna S 2.1 (Free)', provider: 'openrouter', tier: 'Free', badge: 'FREE' },
  { id: 'dots-studio/dots-3-note-preview:free', name: 'Dots 3 Note (Free)', provider: 'openrouter', tier: 'Free', badge: 'FREE' },
];

export const WorkView: React.FC = () => {
  // App & Team Collaboration Context
  const {
    teams,
    activeTeamId,
    setActiveTeamId,
    user,
    setActiveTab,
    showToast,
  } = useApp();

  const activeTeam = teams.find((t) => t.id === activeTeamId) || null;
  const isTeamMode = Boolean(activeTeam);

  // Projects & Core State
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [activeProject, setActiveProject] = useState<WorkProject | null>(null);
  const [files, setFiles] = useState<WorkFile[]>([]);
  const [openFiles, setOpenFiles] = useState<WorkFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>('src/App.tsx');
  const [agents, setAgents] = useState<WorkAgent[]>([]);
  const [artifacts, setArtifacts] = useState<WorkArtifact[]>([]);
  const [activeTask, setActiveTask] = useState<WorkTask | null>(null);
  const [diffs, setDiffs] = useState<WorkFileDiff[]>([]);
  const [messages, setMessages] = useState<WorkMessage[]>([]);

  // Execution & Control State (Free models only)
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_FREE_MODELS[0].id);
  const [executionMode, setExecutionMode] = useState<'single_agent' | 'orchestrated_team'>('single_agent');
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<WorkApproval | null>(null);
  const approvalResolverRef = useRef<((approved: boolean) => void) | null>(null);

  // Desktop Export State (Local Desktop Storage Tier)
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Google Drive Integration State (Cloud Storage Tier - 500 MB Free Cap)
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [driveSyncSuccess, setDriveSyncSuccess] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [driveQuota, setDriveQuota] = useState<any>(null);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveStatusNotice, setDriveStatusNotice] = useState<string | null>(null);

  // Layout View Tabs
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('code');
  const [mobileView, setMobileView] = useState<MobileViewMode>('chat');

  // Split Pane Resizing State (Chat vs Codex Inspector)
  const [workSplitRatio, setWorkSplitRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ph_work_split_ratio');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 25 && parsed <= 75) return parsed;
      }
    } catch {}
    return 42;
  });
  const [isDraggingWorkSplit, setIsDraggingWorkSplit] = useState(false);
  const workSplitContainerRef = useRef<HTMLDivElement>(null);

  const handleWorkSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingWorkSplit(true);
  };

  const handleWorkSplitTouchStart = () => {
    setIsDraggingWorkSplit(true);
  };

  useEffect(() => {
    if (!isDraggingWorkSplit) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!workSplitContainerRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const rect = workSplitContainerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const pct = ((clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(75, Math.max(25, Math.round(pct * 10) / 10));
      setWorkSplitRatio(clamped);
    };

    const handlePointerUp = () => {
      setIsDraggingWorkSplit(false);
      try {
        localStorage.setItem('ph_work_split_ratio', workSplitRatio.toString());
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
  }, [isDraggingWorkSplit, workSplitRatio]);

  // Image Generation Quota State (Strict 8 Images Cap per Account)
  const [imageCapState, setImageCapState] = useState(() => ({
    remaining: workImageCapService.getRemainingImagesCount(user?.id),
    totalGenerated: workImageCapService.getImagesGeneratedCount(user?.id),
    maxCap: MAX_IMAGE_GENERATION_CAP,
  }));
  const lastCreationPromptRef = useRef<string>('Developer portfolio');

  useEffect(() => {
    setImageCapState({
      remaining: workImageCapService.getRemainingImagesCount(user?.id),
      totalGenerated: workImageCapService.getImagesGeneratedCount(user?.id),
      maxCap: MAX_IMAGE_GENERATION_CAP,
    });
    return workImageCapService.subscribe((detail) => {
      setImageCapState({
        remaining: detail.remaining,
        totalGenerated: detail.totalGenerated,
        maxCap: detail.maxCap,
      });
    });
  }, [user?.id]);

  // New Project Modal State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectTeamId, setNewProjectTeamId] = useState<string | null>(activeTeamId || null);

  // Keep newProjectTeamId in sync with activeTeamId
  useEffect(() => {
    setNewProjectTeamId(activeTeamId || null);
  }, [activeTeamId]);

  // 1. Initial Data Fetch & Workspace Scoping (Personal vs Team)
  useEffect(() => {
    const initializeWork = async () => {
      let projs: WorkProject[] = [];
      if (activeTeam) {
        projs = await workService.getProjects(activeTeam.id);
        if (projs.length === 0) {
          const teamProj = await workService.getOrCreateTeamProject(activeTeam.id, activeTeam.name);
          projs = [teamProj];
        }
      } else {
        projs = await workService.getProjects(null);
        if (projs.length === 0) {
          projs = await workService.getProjects();
        }
      }

      setProjects(projs);
      const current = projs[0] || null;
      setActiveProject(current);

      if (current) {
        await loadProjectWorkspace(current.id);
      }
    };

    initializeWork();
  }, [activeTeamId, activeTeam?.id, activeTeam?.name]);

  const loadProjectWorkspace = async (projectId: string) => {
    const projFiles = await workService.getFiles(projectId);
    setFiles(projFiles);
    if (projFiles.length > 0) {
      setOpenFiles(projFiles.slice(0, 3));
      setActiveFilePath(projFiles[0].path);
    }

    const projAgents = await workService.getAgents(projectId);
    setAgents(projAgents);

    const projArtifacts = await workService.getArtifacts(projectId);
    setArtifacts(projArtifacts);

    const projTasks = await workService.getTasks(projectId);
    if (projTasks.length > 0) {
      const latestTask = projTasks[projTasks.length - 1];
      setActiveTask(latestTask);
      const taskMsgs = workService.getTaskMessages(latestTask.id);
      if (taskMsgs.length > 0) {
        setMessages(taskMsgs);
      }
    }
  };

  // 2. Real-time Event Subscription
  useEffect(() => {
    const unsubscribe = workEventBus.subscribeAll((event) => {
      if (activeProject && event.projectId && event.projectId !== activeProject.id && event.projectId !== 'system') return;

      if (event.eventType === 'FILE_CREATED' || event.eventType === 'FILE_UPDATED' || event.eventType === 'FILE_DELETED') {
        if (activeProject) {
          workService.getFiles(activeProject.id).then((freshFiles) => {
            setFiles(freshFiles);
            setOpenFiles((prev) => prev.filter((f) => freshFiles.some((ff) => normalizeWorkPath(ff.path) === normalizeWorkPath(f.path))));
            setActiveFilePath((prev) => {
              const norm = normalizeWorkPath(prev);
              return freshFiles.some((f) => normalizeWorkPath(f.path) === norm) ? prev : (freshFiles[0]?.path || '');
            });
          });
        }
      } else if (event.eventType === 'ARTIFACT_CREATED') {
        if (activeProject) workService.getArtifacts(activeProject.id).then(setArtifacts);
      } else if (event.eventType === 'TASK_COMPLETED' || event.eventType === 'TASK_FAILED') {
        setIsExecuting(false);
      } else if (event.eventType === 'DRIVE_SYNC_COMPLETED') {
        setDriveSyncSuccess(true);
        setTimeout(() => setDriveSyncSuccess(false), 3000);
      }
    });

    return () => unsubscribe();
  }, [activeProject?.id]);

  // 3. User launches task through Chat input
  const handleSendMessage = async (promptText: string) => {
    if (!activeProject || isExecuting) return;
    setIsExecuting(true);

    // Create user message immediately in chat
    const userMsg: WorkMessage = {
      id: `usr_${Date.now()}`,
      taskId: 'current',
      projectId: activeProject.id,
      senderType: 'user',
      senderName: user?.name ? (isTeamMode ? `${user.name} (${activeTeam?.name})` : user.name) : 'You',
      role: 'user',
      content: promptText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    lastCreationPromptRef.current = promptText;

    // Detect if this is a visual creation / portfolio / website / UI design request or has reference URLs
    const lowerPrompt = promptText.toLowerCase().trim();
    const hasUrls = /https?:\/\/[^\s)\]>"',]+/i.test(promptText);
    const isVisualRequest = (
      hasUrls ||
      lowerPrompt.includes('create') ||
      lowerPrompt.includes('build') ||
      lowerPrompt.includes('make') ||
      lowerPrompt.includes('visual direction') ||
      lowerPrompt.includes('visual options') ||
      lowerPrompt.includes('design direction') ||
      lowerPrompt.includes('concept images') ||
      lowerPrompt.includes('portfolio') ||
      lowerPrompt.includes('website') ||
      lowerPrompt.includes('landing') ||
      lowerPrompt.includes('store') ||
      lowerPrompt.includes('dashboard') ||
      lowerPrompt.includes('ui') ||
      lowerPrompt.includes('design') ||
      lowerPrompt.includes('app') ||
      lowerPrompt.includes('mockup') ||
      lowerPrompt.includes('theme')
    ) && !isImageGenerationIntent(promptText) && !lowerPrompt.startsWith('git ') && !lowerPrompt.startsWith('npm ') && !lowerPrompt.startsWith('test ');

    if (isVisualRequest) {
      const remaining = workImageCapService.getRemainingImagesCount(user?.id);
      if (remaining > 0) {
        try {
          const dirRes = await workVisualDirectionService.proposeVisualDirections(promptText, user?.id);
          if (dirRes.success && dirRes.directions.length > 0) {
            const sourceSummary = dirRes.analyzedSources && dirRes.analyzedSources.length > 0
              ? `\n\n🔍 **Analyzed Reference Sources (${dirRes.analyzedSources.length}):**\n` +
                dirRes.analyzedSources.map((s) => `• **${s.label}**: \`${s.domain}\` — *${s.designCue}*`).join('\n') +
                '\n'
              : '';

            const proposalMsg: WorkMessage = {
              id: `msg_dir_${Date.now()}`,
              taskId: 'visual_selection',
              projectId: activeProject.id,
              senderType: 'agent',
              senderName: 'Atlas Visual Architect',
              role: 'assistant',
              content: `🎨 I've synthesized **${dirRes.directions.length} visual direction candidates** for: "${promptText}".${sourceSummary}\nReview the visual options below. **Accept** one to generate the complete matching code implementation, or **Reject & Demand Changes** to synthesize alternative images.\n\n*Account Generation Cap: ${dirRes.remainingImages}/${dirRes.totalCap} remaining.*`,
              visualDirections: dirRes.directions,
              visualDirectionStatus: 'pending_choice',
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, proposalMsg]);
            setIsExecuting(false);
            return;
          }
        } catch {
          // If proposing failed, continue to standard execution
        }
      } else {
        const capNoticeMsg: WorkMessage = {
          id: `msg_cap_${Date.now()}`,
          taskId: 'cap_reached',
          projectId: activeProject.id,
          senderType: 'system',
          senderName: 'System',
          role: 'system',
          content: `⚠️ **Account image generation cap reached (${MAX_IMAGE_GENERATION_CAP}/${MAX_IMAGE_GENERATION_CAP} images used).** Visual candidate images skipped; building standard architecture directly.`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, capNoticeMsg]);
      }
    }

    try {
      const selectedModelObj = AVAILABLE_FREE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_FREE_MODELS[0];
      const task = await workService.createTask({
        projectId: activeProject.id,
        userId: user?.id || 'local-user',
        title: promptText.split('\n')[0].slice(0, 60),
        description: promptText,
        model: selectedModelObj.id,
        provider: selectedModelObj.provider,
        priority: 'medium',
        executionMode,
      });
      setActiveTask(task);

      // Execute task through autonomous runtime
      const result = await workService.executeTask(task.id, {
        onMessage: (msg) => {
          setMessages((prev) => [...prev, msg]);
        },
        onRequestApproval: async (approval) => {
          setPendingApproval(approval);
          return new Promise<boolean>((resolve) => {
            approvalResolverRef.current = resolve;
          });
        },
      });

      // Update diffs
      if (result.filesChanged.length > 0) {
        const computedDiffs: WorkFileDiff[] = result.filesChanged.map((f) => {
          return workGitService.computeFileDiff(
            f.path,
            f.isNew ? '' : '// original file content\n',
            f.content,
            f.isNew ? 'added' : 'modified'
          );
        });
        setDiffs(computedDiffs);

        const isPureImage = isImageGenerationIntent(promptText);

        // Smart tab selection
        if (isPureImage) {
          setInspectorTab('artifacts');
          setMobileView('inspector');
        } else if (
          promptText.toLowerCase().includes('preview') ||
          promptText.toLowerCase().includes('website') ||
          promptText.toLowerCase().includes('landing') ||
          promptText.toLowerCase().includes('app') ||
          promptText.toLowerCase().includes('ui') ||
          promptText.toLowerCase().includes('page') ||
          promptText.toLowerCase().includes('component') ||
          promptText.toLowerCase().includes('portfolio')
        ) {
          setInspectorTab('preview');
          setMobileView('inspector');
        } else if (result.artifacts && result.artifacts.some((a: WorkArtifact) => a.type === 'image' || a.type === 'document')) {
          setInspectorTab('artifacts');
          setMobileView('inspector');
        } else {
          setInspectorTab((prev) => (prev === 'preview' ? 'preview' : 'diffs'));
        }
      } else if (result.artifacts && result.artifacts.length > 0) {
        setInspectorTab('artifacts');
        setMobileView('inspector');
      }

      // Refresh files & artifacts
      const updatedFiles = await workService.getFiles(activeProject.id);
      setFiles(updatedFiles);
      if (result.filesChanged.length > 0) {
        const normPrimary = normalizeWorkPath(result.filesChanged[0].path);
        const primaryFile = updatedFiles.find((f) => normalizeWorkPath(f.path) === normPrimary) || updatedFiles[0];
        if (primaryFile) {
          setActiveFilePath(primaryFile.path);
          setOpenFiles((prev) => {
            if (!prev.some((p) => normalizeWorkPath(p.path) === normPrimary)) {
              return [...prev, primaryFile];
            }
            return prev.map((p) => (normalizeWorkPath(p.path) === normPrimary ? primaryFile : p));
          });
        }
      }
      const updatedArtifacts = await workService.getArtifacts(activeProject.id);
      setArtifacts(updatedArtifacts);

      // Automatically sync project to Google Drive Vault so storage issue is permanently solved
      try {
        const driveRes = await workService.syncProjectToDrive(activeProject.id);
        if (driveRes.success) {
          setDriveSyncSuccess(true);
          setTimeout(() => setDriveSyncSuccess(false), 3000);
        }
      } catch {}
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          taskId: 'err',
          projectId: activeProject.id,
          senderType: 'system',
          senderName: 'System',
          role: 'system',
          content: `Task execution error: ${err?.message || err}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      if (approvalResolverRef.current) {
        approvalResolverRef.current(false);
        approvalResolverRef.current = null;
      }
      setPendingApproval(null);
      setIsExecuting(false);
    }
  };

  // Option 1: User accepts a specific visual direction candidate
  const handleAcceptVisualDirection = async (direction: WorkVisualDirection) => {
    if (!activeProject || isExecuting) return;
    setIsExecuting(true);

    // Update message state to show acceptance
    setMessages((prev) =>
      prev.map((m) =>
        m.visualDirections
          ? {
              ...m,
              selectedDirectionId: direction.id,
              visualDirectionStatus: 'accepted' as const,
            }
          : m
      )
    );

    const acceptAcknowledgment: WorkMessage = {
      id: `ack_${Date.now()}`,
      taskId: 'accept_visual',
      projectId: activeProject.id,
      senderType: 'agent',
      senderName: 'Atlas Engineer',
      role: 'assistant',
      content: `✓ **Accepted visual direction: ${direction.title}** (${direction.aesthetic}).\n\nNow generating the complete application code perfectly matching this design aesthetic in \`src/App.tsx\`...`,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, acceptAcknowledgment]);

    workVisualDirectionService.acceptVisualDirection(direction, user?.id);

    const codePrompt = `${lastCreationPromptRef.current || 'Web application'}\n\n[ACCEPTED_VISUAL_DIRECTION]:\nTitle: ${direction.title}\nAesthetic: ${direction.aesthetic}\nColor Palette: ${direction.colorPalette.join(', ')}\nDescription: ${direction.description}\nTheme Spec: ${JSON.stringify(direction.themeSpec || {})}`;

    try {
      const selectedModelObj = AVAILABLE_FREE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_FREE_MODELS[0];
      const task = await workService.createTask({
        projectId: activeProject.id,
        userId: user?.id || 'local-user',
        title: `Build: ${direction.title}`,
        description: codePrompt,
        model: selectedModelObj.id,
        provider: selectedModelObj.provider,
        priority: 'high',
        executionMode,
      });
      setActiveTask(task);

      const result = await workService.executeTask(task.id, {
        onMessage: (msg) => {
          setMessages((prev) => [...prev, msg]);
        },
        onRequestApproval: async (approval) => {
          setPendingApproval(approval);
          return new Promise<boolean>((resolve) => {
            approvalResolverRef.current = resolve;
          });
        },
      });

      if (result.filesChanged.length > 0) {
        const computedDiffs: WorkFileDiff[] = result.filesChanged.map((f) => {
          return workGitService.computeFileDiff(
            f.path,
            f.isNew ? '' : '// original file content\n',
            f.content,
            f.isNew ? 'added' : 'modified'
          );
        });
        setDiffs(computedDiffs);
        setInspectorTab('preview');
        setMobileView('inspector');
      }

      const updatedFiles = await workService.getFiles(activeProject.id);
      setFiles(updatedFiles);
      if (result.filesChanged.length > 0) {
        const normPrimary = normalizeWorkPath(result.filesChanged[0].path);
        const primaryFile = updatedFiles.find((f) => normalizeWorkPath(f.path) === normPrimary) || updatedFiles[0];
        if (primaryFile) {
          setActiveFilePath(primaryFile.path);
          setOpenFiles((prev) => {
            if (!prev.some((p) => normalizeWorkPath(p.path) === normPrimary)) {
              return [...prev, primaryFile];
            }
            return prev.map((p) => (normalizeWorkPath(p.path) === normPrimary ? primaryFile : p));
          });
        }
      }
      const updatedArtifacts = await workService.getArtifacts(activeProject.id);
      setArtifacts(updatedArtifacts);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          taskId: 'err',
          projectId: activeProject.id,
          senderType: 'system',
          senderName: 'System',
          role: 'system',
          content: `Task execution error: ${err?.message || err}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  // Option 2: User rejects previous visual directions and demands changes
  const handleRejectVisualDirection = async (feedback: string, previousDirections: WorkVisualDirection[]) => {
    if (!activeProject || isExecuting) return;
    const remaining = workImageCapService.getRemainingImagesCount(user?.id);
    if (remaining <= 0) {
      const blockedMsg: WorkMessage = {
        id: `msg_blocked_${Date.now()}`,
        taskId: 'cap_blocked',
        projectId: activeProject.id,
        senderType: 'system',
        senderName: 'System',
        role: 'system',
        content: `⚠️ **Account generation cap reached (${MAX_IMAGE_GENERATION_CAP}/${MAX_IMAGE_GENERATION_CAP} images used).** Cannot generate additional alternative preview images. Please accept one of the existing candidates.`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, blockedMsg]);
      return;
    }

    setIsExecuting(true);
    try {
      const res = await workVisualDirectionService.refineVisualDirections({
        feedback,
        previousDirections,
        originalPrompt: lastCreationPromptRef.current || 'Web application',
        accountId: user?.id,
      });

      if (res.success && res.directions.length > 0) {
        const refinedMsg: WorkMessage = {
          id: `msg_dir_rev_${Date.now()}`,
          taskId: 'visual_selection',
          projectId: activeProject.id,
          senderType: 'agent',
          senderName: 'Atlas Visual Architect',
          role: 'assistant',
          content: `🔄 I've generated **${res.directions.length} alternative visual directions** incorporating your requested changes: "${feedback}".\n\nReview the refined options below:\n\n*Account Generation Cap: ${res.remainingImages}/${res.totalCap} remaining.*`,
          visualDirections: res.directions,
          visualDirectionStatus: 'pending_choice',
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, refinedMsg]);
      } else {
        const errMsg: WorkMessage = {
          id: `msg_err_${Date.now()}`,
          taskId: 'visual_error',
          projectId: activeProject.id,
          senderType: 'system',
          senderName: 'System',
          role: 'system',
          content: res.error || 'Could not generate alternative directions.',
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          taskId: 'visual_error',
          projectId: activeProject.id,
          senderType: 'system',
          senderName: 'System',
          role: 'system',
          content: `Error refining directions: ${err?.message || err}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  // Local Desktop 1-Click Export (.zip archive)
  const handleExportToDesktop = async () => {
    if (!activeProject || isExportingZip) return;
    setIsExportingZip(true);
    setExportNotice(null);
    try {
      const ok = await workService.exportProjectToDesktop(activeProject.id);
      if (ok) {
        setExportNotice(`✓ Downloaded ${activeProject.name}.zip directly to your desktop.`);
        setTimeout(() => setExportNotice(null), 4000);
      }
    } catch (err: any) {
      setExportNotice(`Export failed: ${err?.message || err}`);
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExportingZip(false);
    }
  };

  // Local Desktop Single File Download
  const handleDownloadSingleFile = async (filePath: string) => {
    if (!activeProject) return;
    await workService.downloadFileToDesktop(activeProject.id, filePath);
  };

  // Google Drive 1-Click Sync
  const handleSyncToDrive = async () => {
    if (!activeProject || isSyncingDrive) return;
    setIsSyncingDrive(true);
    setDriveStatusNotice(null);
    try {
      const res = await workService.syncProjectToDrive(activeProject.id);
      if (res.success) {
        setDriveSyncSuccess(true);
        setDriveStatusNotice(`✓ Successfully backed up project to Google Drive Vault (${formatStorageBytes(res.sizeBytes || 0)})`);
        setTimeout(() => setDriveSyncSuccess(false), 3000);
      } else {
        setDriveStatusNotice(`❌ Drive sync error: ${res.error}`);
      }
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Open Drive Browser Modal
  const handleOpenDriveModal = async () => {
    setIsDriveModalOpen(true);
    setIsDriveLoading(true);
    setDriveStatusNotice(null);
    try {
      const [filesList, quota] = await Promise.all([
        storageService.listFiles(),
        storageService.getQuota(),
      ]);
      setDriveFiles(filesList.files);
      setDriveQuota(quota);
    } catch (err: any) {
      setDriveStatusNotice(`Failed to load Google Drive vault: ${err?.message || err}`);
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Import specific file from Drive Vault into active project
  const handleImportDriveFile = async (driveFileId: string) => {
    if (!activeProject) return;
    setIsDriveLoading(true);
    try {
      const res = await workService.importFromDrive(driveFileId, activeProject.id);
      if (res.success) {
        setDriveStatusNotice(`✓ Imported ${res.filesImported} file(s) into workspace.`);
        await loadProjectWorkspace(activeProject.id);
        setInspectorTab('files');
      } else {
        setDriveStatusNotice(`❌ Import failed: ${res.error}`);
      }
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Quick 1-Click Starter Action: "Run Hello World Slice"
  const handleRunStarterSlice = () => {
    handleSendMessage('Create src/pages/HelloWorld.tsx, run project build in the sandbox, verify the resulting diff, and generate an implementation report.');
  };

  // File selection
  const handleOpenFile = (fileOrPath: string | WorkFile) => {
    const path = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.path;
    setActiveFilePath(path);
    const existing = files.find((f) => f.path === path);
    if (existing && !openFiles.some((f) => f.path === path)) {
      setOpenFiles((prev) => [...prev, existing]);
    }
    setInspectorTab('code');
    setMobileView('inspector');
  };

  const handleCloseTab = (path: string) => {
    const nextOpen = openFiles.filter((f) => f.path !== path);
    setOpenFiles(nextOpen);
    if (activeFilePath === path) {
      setActiveFilePath(nextOpen[0]?.path || '');
    }
  };

  const handleSaveFile = async (path: string, content: string) => {
    if (!activeProject) return;
    await workService.writeFile(activeProject.id, { path, content });
    const updated = await workService.getFiles(activeProject.id);
    setFiles(updated);
  };

  const handleCreateFile = async (path: string) => {
    if (!activeProject) return;
    await workService.writeFile(activeProject.id, { path, content: '// New module\n' });
    const updated = await workService.getFiles(activeProject.id);
    setFiles(updated);
    const newF = updated.find((f) => f.path === path);
    if (newF) handleOpenFile(newF.path);
  };

  const handleDeleteFile = async (path: string) => {
    if (!activeProject) return;
    const normTarget = normalizeWorkPath(path);
    await workService.deleteFile(activeProject.id, normTarget);
    const updated = await workService.getFiles(activeProject.id);
    setFiles(updated);
    setOpenFiles((prev) => prev.filter((f) => normalizeWorkPath(f.path) !== normTarget));
    if (normalizeWorkPath(activeFilePath) === normTarget) {
      const remaining = openFiles.filter((f) => normalizeWorkPath(f.path) !== normTarget);
      setActiveFilePath(remaining[0]?.path || updated[0]?.path || '');
    }
    showToast(`Deleted ${normTarget}`, 'info');
  };

  const handleCreateNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const targetTeamId = newProjectTeamId === 'personal' ? null : (newProjectTeamId || (activeTeam ? activeTeam.id : null));
    const created = await workService.createProject({
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      teamId: targetTeamId,
    });

    setProjects((prev) => [...prev, created]);
    setActiveProject(created);
    setNewProjectName('');
    setNewProjectDesc('');
    setIsNewProjectModalOpen(false);
    await loadProjectWorkspace(created.id);
  };

  return (
    <div className="flex flex-col h-full w-full bg-bg-primary text-text-primary overflow-hidden select-none font-sans">
      {/* ─── EXPORT NOTIFICATION TOAST ────────────────────────────────────────── */}
      {exportNotice && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2 flex items-center justify-between z-30 transition-all shrink-0">
          <div className="flex items-center gap-2 font-mono">
            <Check className="w-4 h-4 shrink-0" />
            <span>{exportNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center rounded hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── TOP BAR: WORKSPACE CONTROLS ──────────────────────────── */}
      <header className="bg-bg-secondary border-b border-border-default px-3 py-2 flex items-center justify-between gap-2 shrink-0 z-20 w-full overflow-x-auto no-scrollbar">
        {/* Left: Workspace Scope, Project Selector & Branch */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <div className="flex items-center gap-1.5 font-bold text-xs tracking-tight text-brand-primary shrink-0 whitespace-nowrap">
            <Briefcase className="w-4 h-4" />
            <span className="hidden sm:inline">WORK</span>
          </div>

          <div className="h-4 w-px bg-border-subtle shrink-0" />

          {/* Workspace Switcher (Personal Studio vs Team Workspace) */}
          <div className="flex items-center gap-1 bg-bg-tertiary border border-border-default rounded-md px-2 py-1 text-xs font-semibold shrink-0 min-h-[44px] sm:min-h-[30px]">
            {isTeamMode ? (
              <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            ) : (
              <HardDrive className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            )}
            <select
              value={activeTeamId || 'personal'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'personal') {
                  setActiveTeamId(null);
                } else {
                  setActiveTeamId(val);
                }
              }}
              aria-label="Workspace Scope"
              className="bg-transparent text-text-primary text-xs font-semibold focus:outline-none cursor-pointer max-w-[120px] sm:max-w-[155px] truncate"
            >
              <option value="personal">Personal Studio</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({(t.members || []).length}/4)
                </option>
              ))}
            </select>
          </div>

          {/* Active Team Collaborators Presence Pill (up to 4 members) */}
          {activeTeam && (
            <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs shrink-0">
              <div className="flex items-center -space-x-1.5">
                {(activeTeam.members || []).slice(0, 4).map((m, idx) => (
                  <img
                    key={m.userId || idx}
                    src={m.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(m.name || 'member')}`}
                    alt={m.name}
                    title={`${m.name} (${m.role || 'Member'}) — Active in Workspace`}
                    className="w-4 h-4 rounded-full object-cover border border-bg-secondary bg-bg-tertiary"
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-300">
                {(activeTeam.members || []).length}/4
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('teams')}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                title="Manage Team Roster"
              >
                Team
              </button>
            </div>
          )}

          <div className="h-4 w-px bg-border-subtle shrink-0" />

          {/* Project Switcher */}
          <select
            value={activeProject?.id || ''}
            onChange={(e) => {
              const p = projects.find((x) => x.id === e.target.value);
              if (p) {
                setActiveProject(p);
                loadProjectWorkspace(p.id);
              }
            }}
            aria-label="Active Project"
            className="bg-bg-tertiary/80 border border-border-default rounded-md px-2 py-1 text-xs font-semibold text-text-primary focus:outline-none cursor-pointer min-h-[44px] sm:min-h-[30px] max-w-[120px] sm:max-w-[155px] truncate shrink-0"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsNewProjectModalOpen(true)}
            title="Create New Project"
            className="min-h-[44px] min-w-[44px] sm:min-h-[30px] sm:min-w-[30px] flex items-center justify-center rounded-md border border-border-default hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-bg-tertiary border border-border-subtle text-text-muted shrink-0 whitespace-nowrap">
            <GitBranch className="w-3 h-3 text-brand-primary" />
            <span>main</span>
          </div>
        </div>

        {/* Right: Models, Storage Actions & Controls */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Model picker (100% Free models - md+ screens) */}
          <div className="hidden md:flex items-center gap-1.5 bg-bg-tertiary border border-border-subtle rounded-lg px-2 py-1 text-xs font-mono shrink-0">
            <Cpu className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1 py-0.2 rounded shrink-0">
              FREE
            </span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              aria-label="AI Free Model"
              className="bg-transparent text-text-primary focus:outline-none cursor-pointer max-w-[120px] lg:max-w-[160px] truncate"
            >
              {AVAILABLE_FREE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Compact Storage Tier Pill (Export + Sync + Vault in unified segmented control) */}
          <div className="hidden sm:flex items-center rounded-lg border border-border-default bg-bg-tertiary p-0.5 shrink-0 shadow-2xs">
            {/* Desktop Export Button */}
            <button
              type="button"
              onClick={handleExportToDesktop}
              disabled={isExportingZip || !activeProject}
              title="Download Workspace (.zip) directly to Desktop"
              className="min-h-[44px] px-2.5 sm:min-h-[28px] sm:px-2 rounded-md hover:bg-bg-secondary text-text-secondary hover:text-brand-primary text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isExportingZip ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
              ) : (
                <Download className="w-3.5 h-3.5 text-brand-primary" />
              )}
              <span className="hidden xl:inline">{isExportingZip ? 'Exporting...' : 'Export'}</span>
            </button>

            <div className="h-3.5 w-px bg-border-subtle mx-0.5" />

            {/* Google Drive Vault Sync Button */}
            <button
              type="button"
              onClick={handleSyncToDrive}
              disabled={isSyncingDrive || !activeProject}
              title={driveSyncSuccess ? 'Project Synced with Google Drive Vault' : 'Sync Project to Google Drive Vault (500 MB Free)'}
              className={`min-h-[44px] px-2.5 sm:min-h-[28px] sm:px-2 rounded-md hover:bg-bg-secondary text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                driveSyncSuccess ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {isSyncingDrive ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
              ) : driveSyncSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <HardDrive className="w-3.5 h-3.5 text-sky-600" />
              )}
              <span className="hidden xl:inline">{driveSyncSuccess ? 'Synced' : 'Sync'}</span>
            </button>

            <div className="h-3.5 w-px bg-border-subtle mx-0.5" />

            {/* Google Drive Vault Browser Modal Button */}
            <button
              type="button"
              onClick={handleOpenDriveModal}
              title="Open Google Drive Storage Vault (500 MB Free Tier)"
              className="min-h-[44px] px-2.5 sm:min-h-[28px] sm:px-2 rounded-md hover:bg-bg-secondary text-text-secondary hover:text-text-primary text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden 2xl:inline">Vault</span>
            </button>
          </div>

          {/* Starter Slice Action */}
          <button
            type="button"
            onClick={handleRunStarterSlice}
            disabled={isExecuting}
            title="1-Click Starter Slice Run"
            className="min-h-[44px] min-w-[44px] sm:min-h-[30px] sm:min-w-auto px-2.5 sm:px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
          >
            <Play className="w-3 h-3 fill-current shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">Run Starter</span>
          </button>

          {/* Account Image Cap Meter (Max 8 images) */}
          <div
            title={`Account Image Cap: ${imageCapState.totalGenerated}/${MAX_IMAGE_GENERATION_CAP} used (${imageCapState.remaining} remaining)`}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono shrink-0 min-h-[44px] sm:min-h-[30px] transition-colors ${
              imageCapState.remaining <= 0
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 font-bold'
                : imageCapState.remaining <= 2
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                : 'bg-bg-tertiary text-text-secondary border-border-subtle'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span>Cap: {imageCapState.totalGenerated}/{MAX_IMAGE_GENERATION_CAP}</span>
          </div>

          {/* Mobile Chat vs Inspector Tab Switcher */}
          <div className="flex md:hidden items-center bg-bg-tertiary rounded-lg p-0.5 border border-border-subtle text-xs font-medium shrink-0">
            <button
              type="button"
              onClick={() => setMobileView('chat')}
              className={`min-h-[44px] px-2.5 py-1 rounded-md transition-colors ${
                mobileView === 'chat' ? 'bg-bg-secondary text-brand-primary font-semibold shadow-2xs' : 'text-text-muted'
              }`}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setMobileView('inspector')}
              className={`min-h-[44px] px-2.5 py-1 rounded-md transition-colors ${
                mobileView === 'inspector' ? 'bg-bg-secondary text-brand-primary font-semibold shadow-2xs' : 'text-text-muted'
              }`}
            >
              Surface
            </button>
          </div>
        </div>
      </header>

      {/* ─── TEAM COLLABORATION BANNER (When Team Workspace Active) ─────────── */}
      {activeTeam && (
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border-b border-blue-500/20 text-xs text-text-secondary shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-semibold text-text-primary truncate">
              Team Workspace Mode: <span className="font-mono text-blue-600 dark:text-blue-400">{activeTeam.name}</span>
            </span>
            <span className="hidden sm:inline text-text-muted text-[11px]">
              · {(activeTeam.members || []).length}/4 members collaborating in shared studio
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('teams')}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Users className="w-3 h-3" />
              <span>Workspace Members ({(activeTeam.members || []).length}/4)</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── MOBILE/TABLET SUB-BAR: FREE MODEL SELECTOR & TRIPLE STORAGE STATUS ──── */}
      <div className="flex md:hidden items-center justify-between gap-2 px-3 sm:px-4 py-1.5 bg-bg-tertiary/60 border-b border-border-subtle text-xs font-mono shrink-0">
        {/* Mobile/Tablet Free Model Selector with min-h-[44px] touch target */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 bg-bg-secondary border border-border-subtle rounded-md px-2 min-h-[44px]">
          <Cpu className="w-3.5 h-3.5 text-brand-primary shrink-0" />
          <span className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1 py-0.5 rounded shrink-0 whitespace-nowrap">
            FREE
          </span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            aria-label="Mobile AI Free Model"
            className="bg-transparent text-text-primary text-xs focus:outline-none cursor-pointer flex-1 min-w-0 truncate min-h-[44px]"
          >
            {AVAILABLE_FREE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mobile-only Storage Action Buttons (< sm) */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleExportToDesktop}
            disabled={isExportingZip || !activeProject}
            title="Download Workspace (.zip) directly to Desktop"
            className="min-h-[44px] min-w-[44px] rounded-md border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-brand-primary flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            {isExportingZip ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
            ) : (
              <Download className="w-3.5 h-3.5 text-brand-primary" />
            )}
          </button>
          <button
            type="button"
            onClick={handleSyncToDrive}
            disabled={isSyncingDrive || !activeProject}
            title={driveSyncSuccess ? 'Project Synced with Drive' : 'Sync Drive'}
            className={`min-h-[44px] min-w-[44px] rounded-md border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 ${
              driveSyncSuccess
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            {isSyncingDrive ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
            ) : driveSyncSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <HardDrive className="w-3.5 h-3.5 text-sky-600" />
            )}
          </button>
        </div>

        {/* Triple Storage Status Chip (Interactive trigger to open Drive Vault modal) */}
        <button
          type="button"
          onClick={handleOpenDriveModal}
          title="Open Google Drive Storage Vault (500 MB Free Tier)"
          className="flex items-center gap-1.5 px-2.5 rounded-md bg-bg-secondary hover:bg-bg-tertiary border border-border-subtle text-[10px] text-text-secondary hover:text-text-primary shrink-0 min-h-[44px] transition-colors cursor-pointer"
        >
          <Database className="w-3.5 h-3.5 text-brand-primary shrink-0" />
          <span className="hidden sm:inline">Storage:</span>
          <span className="font-semibold text-text-primary">500MB Free</span>
        </button>
      </div>

      {/* ─── MAIN 2-PANEL WORKSPACE ───────────────────── */}
      <div 
        ref={workSplitContainerRef}
        className="flex-1 flex min-h-0 overflow-hidden relative"
        style={{ userSelect: isDraggingWorkSplit ? 'none' : undefined }}
      >
        {/* ─── LEFT PANE: AGENT CONVERSATION & TASK STREAM (Adjustable width) ─── */}
        <div 
          style={{ width: `${workSplitRatio}%` }}
          className={`w-full md:w-auto h-full flex flex-col shrink-0 ${
            mobileView === 'inspector' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <WorkAgentChat
            messages={messages}
            isExecuting={isExecuting}
            activeTask={activeTask}
            onSendMessage={handleSendMessage}
            onOpenFile={handleOpenFile}
            onOpenArtifact={(_id) => {
              setInspectorTab('artifacts');
              setMobileView('inspector');
            }}
            onOpenDiffs={() => {
              setInspectorTab('diffs');
              setMobileView('inspector');
            }}
            executionMode={executionMode}
            onToggleExecutionMode={setExecutionMode}
            agentCount={agents.length || 4}
            onAcceptVisualDirection={handleAcceptVisualDirection}
            onRejectVisualDirection={handleRejectVisualDirection}
            accountId={user?.id}
          />
        </div>

        {/* Draggable Divider (Desktop split mode) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={Math.round(workSplitRatio)}
          aria-valuemin={25}
          aria-valuemax={75}
          tabIndex={0}
          onMouseDown={handleWorkSplitMouseDown}
          onTouchStart={handleWorkSplitTouchStart}
          onDoubleClick={() => {
            setWorkSplitRatio(42);
            try {
              localStorage.setItem('ph_work_split_ratio', '42');
            } catch {}
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setWorkSplitRatio((prev) => Math.max(25, prev - 2));
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setWorkSplitRatio((prev) => Math.min(75, prev + 2));
            } else if (e.key === 'Home' || e.key === 'Enter') {
              setWorkSplitRatio(42);
            }
          }}
          className={`hidden md:flex items-center justify-center relative w-2 hover:w-3 cursor-col-resize select-none shrink-0 transition-all z-20 ${
            isDraggingWorkSplit
              ? 'bg-brand-primary'
              : 'bg-border-default hover:bg-brand-primary/60'
          }`}
          title="Drag to resize panels • Double-click to reset (42%) • Left/Right arrows to adjust"
        >
          <div className={`h-8 w-1 rounded-full transition-colors flex flex-col items-center justify-center gap-0.5 ${
            isDraggingWorkSplit ? 'bg-white' : 'bg-text-muted hover:bg-white'
          }`}>
            <span className="w-0.5 h-0.5 rounded-full bg-current opacity-70" />
            <span className="w-0.5 h-0.5 rounded-full bg-current opacity-70" />
            <span className="w-0.5 h-0.5 rounded-full bg-current opacity-70" />
          </div>
        </div>

        {/* ─── RIGHT PANE: CODEX WORK SURFACE & INSPECTOR ──── */}
        <div 
          style={{ width: `${100 - workSplitRatio}%` }}
          className={`flex-1 h-full flex flex-col min-w-0 bg-bg-primary overflow-hidden ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Inspector Tab Bar */}
          <div className="h-10 bg-bg-secondary border-b border-border-default px-3 flex items-center justify-between shrink-0 gap-1 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-0">
              <button
                type="button"
                onClick={() => setInspectorTab('code')}
                className={`min-h-[44px] sm:min-h-[32px] px-3 text-xs font-mono font-medium rounded-t-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                  inspectorTab === 'code'
                    ? 'border-b-2 border-brand-primary text-brand-primary font-semibold bg-brand-primary-light/20'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('files')}
                className={`min-h-[44px] sm:min-h-[32px] px-3 text-xs font-mono font-medium rounded-t-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                  inspectorTab === 'files'
                    ? 'border-b-2 border-brand-primary text-brand-primary font-semibold bg-brand-primary-light/20'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Files ({files.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('diffs')}
                className={`min-h-[44px] sm:min-h-[32px] px-3 text-xs font-mono font-medium rounded-t-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                  inspectorTab === 'diffs'
                    ? 'border-b-2 border-brand-primary text-brand-primary font-semibold bg-brand-primary-light/20'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>Diffs</span>
                {diffs.length > 0 && (
                  <span className="text-[10px] px-1 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    +{diffs.reduce((acc, d) => acc + d.linesAdded, 0)}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('preview')}
                className={`min-h-[44px] sm:min-h-[32px] px-3 text-xs font-mono font-medium rounded-t-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                  inspectorTab === 'preview'
                    ? 'border-b-2 border-brand-primary text-brand-primary font-semibold bg-brand-primary-light/20'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectorTab('artifacts')}
                className={`min-h-[44px] sm:min-h-[32px] px-3 text-xs font-mono font-medium rounded-t-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                  inspectorTab === 'artifacts'
                    ? 'border-b-2 border-brand-primary text-brand-primary font-semibold bg-brand-primary-light/20'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Artifacts</span>
                {artifacts.length > 0 && (
                  <span className="text-[10px] px-1 py-0.2 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-mono">
                    {artifacts.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Inspector Body Area with smooth independent scrolling */}
          <div className="flex-1 p-2 sm:p-3 overflow-hidden">
            {inspectorTab === 'code' && (
              <WorkCodeEditor
                openFiles={openFiles}
                activeFilePath={activeFilePath}
                onSelectTab={setActiveFilePath}
                onCloseTab={handleCloseTab}
                onSaveFile={handleSaveFile}
                onDeleteFile={handleDeleteFile}
                onPromptAction={handleSendMessage}
                onCreateNewFile={() => setInspectorTab('files')}
              />
            )}

            {inspectorTab === 'files' && (
              <WorkFileExplorer
                files={files}
                selectedFilePath={activeFilePath}
                onSelectFile={handleOpenFile}
                onCreateFile={handleCreateFile}
                onDeleteFile={handleDeleteFile}
                onSyncToDrive={handleSyncToDrive}
                onImportFromDrive={handleOpenDriveModal}
                onExportToDesktop={handleExportToDesktop}
                onDownloadFile={handleDownloadSingleFile}
              />
            )}

            {inspectorTab === 'diffs' && (
              <WorkDiffViewer diffs={diffs} />
            )}

            {inspectorTab === 'preview' && (
              <WorkBrowserPreview files={files} />
            )}

            {inspectorTab === 'artifacts' && (
              <WorkArtifactViewer artifacts={artifacts} />
            )}
          </div>
        </div>
      </div>

      {/* Human-in-the-Loop Approval Modal */}
      <WorkApprovalModal
        isOpen={Boolean(pendingApproval)}
        approval={pendingApproval}
        onApprove={() => {
          if (approvalResolverRef.current) {
            approvalResolverRef.current(true);
            approvalResolverRef.current = null;
          }
          setPendingApproval(null);
        }}
        onDeny={() => {
          if (approvalResolverRef.current) {
            approvalResolverRef.current(false);
            approvalResolverRef.current = null;
          }
          setPendingApproval(null);
        }}
        onClose={() => {
          if (approvalResolverRef.current) {
            approvalResolverRef.current(false);
            approvalResolverRef.current = null;
          }
          setPendingApproval(null);
        }}
      />

      {/* Google Drive Storage Vault Modal */}
      {typeof document !== 'undefined' && isDriveModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDriveModalOpen(false);
          }}
        >
          <div className="w-full max-w-xl bg-bg-secondary border border-border-default rounded-xl p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary">Google Drive Storage Vault</h2>
                  <p className="text-[11px] text-text-muted">
                    Sync project snapshots, AI datasets, and import documents into Work.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDriveModalOpen(false)}
                className="min-h-[44px] min-w-[44px] sm:w-7 sm:h-7 rounded-md flex items-center justify-center hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quota bar */}
            {driveQuota && (
              <div className="py-3 border-b border-border-subtle/60 text-xs">
                <div className="flex justify-between text-[11px] text-text-secondary mb-1">
                  <span className="font-semibold text-text-primary">Storage Quota ({driveQuota.tierName || 'Free (500 MB)'})</span>
                  <span className="font-mono">
                    {formatStorageBytes(driveQuota.usedBytes || 0)} / {formatStorageBytes(driveQuota.limitBytes || driveQuota.totalBytes || 524288000)} ({Math.round(driveQuota.usedPercentage ?? driveQuota.usagePercent ?? (((driveQuota.usedBytes || 0) / (driveQuota.limitBytes || driveQuota.totalBytes || 524288000)) * 100))}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-primary rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        Math.round(driveQuota.usedPercentage ?? driveQuota.usagePercent ?? (((driveQuota.usedBytes || 0) / (driveQuota.limitBytes || driveQuota.totalBytes || 524288000)) * 100)),
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-text-muted mt-1.5">
                  Free tier allocation: 500 MB. Backed-up project workspaces, datasets, and files are preserved safely.
                </p>
              </div>
            )}

            {/* Triple Storage Architecture Info */}
            <div className="my-2 p-2.5 rounded-lg border border-border-subtle bg-bg-tertiary/40 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-text-primary">
                <Database className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                <span>PromptHub Triple Storage Architecture</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px]">
                <div className="p-1.5 rounded bg-bg-secondary border border-border-subtle">
                  <span className="font-semibold text-brand-primary block">1. Local Browser</span>
                  <span className="text-text-muted">IndexedDB + localStorage. Instant offline runtime.</span>
                </div>
                <div className="p-1.5 rounded bg-bg-secondary border border-border-subtle">
                  <span className="font-semibold text-sky-600 dark:text-sky-400 block">2. User Desktop</span>
                  <span className="text-text-muted">1-Click .zip project exports and single-file downloads.</span>
                </div>
                <div className="p-1.5 rounded bg-bg-secondary border border-border-subtle">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 block">3. Cloud Drive</span>
                  <span className="text-text-muted">Google Drive Vault capped at 500 MB (Free tier).</span>
                </div>
              </div>
            </div>

            {/* Status notice if any */}
            {driveStatusNotice && (
              <div className="my-2 p-2 rounded-lg bg-bg-tertiary text-xs font-mono text-brand-primary">
                {driveStatusNotice}
              </div>
            )}

            {/* Quick Actions */}
            <div className="py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="text-xs font-semibold text-text-primary">Vault Files ({driveFiles.length})</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleExportToDesktop}
                  disabled={isExportingZip || !activeProject}
                  className="min-h-[44px] sm:min-h-[28px] px-3 rounded-md border border-border-default hover:bg-bg-tertiary text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Export .zip to Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={handleSyncToDrive}
                  disabled={isSyncingDrive || !activeProject}
                  className="min-h-[44px] sm:min-h-[28px] px-3 rounded-md bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSyncingDrive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
                  <span>Backup to Drive</span>
                </button>
              </div>
            </div>

            {/* Files list */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {isDriveLoading ? (
                <div className="py-8 flex flex-col items-center justify-center text-text-muted text-xs gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                  <span>Loading Google Drive assets...</span>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="py-8 text-center text-text-muted text-xs">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <span>No files in your Google Drive Vault yet. Click "Backup Active Project Now" to create your first backup.</span>
                </div>
              ) : (
                driveFiles.map((f) => (
                  <div
                    key={f.id}
                    className="p-2.5 rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary/60 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-text-primary truncate">{f.originalName}</div>
                      <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-bg-secondary text-[10px] font-mono">{f.category}</span>
                        <span>{formatStorageBytes(f.sizeBytes)}</span>
                        <span>{new Date(f.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleImportDriveFile(f.id)}
                      className="min-h-[44px] sm:min-h-[26px] px-2.5 rounded bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-primary text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      <Download className="w-3 h-3 text-sky-600" />
                      <span>Import</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-border-subtle mt-2 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsDriveModalOpen(false)}
                className="min-h-[44px] sm:min-h-[30px] px-4 rounded-lg border border-border-default text-xs font-medium hover:bg-bg-tertiary transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* New Project Modal */}
      {typeof document !== 'undefined' && isNewProjectModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsNewProjectModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xl">
            <h2 className="text-base font-bold text-text-primary mb-3">Create New Work Project</h2>
            <form onSubmit={handleCreateNewProject} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="new-proj-name" className="block text-xs font-medium text-text-secondary">
                    Project Name
                  </label>
                  <span className="text-[10px] font-mono text-text-muted tabular-nums">
                    {newProjectName.length}/40
                  </span>
                </div>
                <input
                  id="new-proj-name"
                  type="text"
                  required
                  maxLength={40}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value.slice(0, 40))}
                  placeholder="e.g. NextGen Web App"
                  className="w-full min-h-[44px] px-3 rounded-lg border border-border-default bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label htmlFor="new-proj-desc" className="block text-xs font-medium text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  id="new-proj-desc"
                  rows={2}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Autonomous agent tasks and instructions..."
                  className="w-full p-3 rounded-lg border border-border-default bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                />
              </div>
              <div>
                <label htmlFor="new-proj-scope" className="block text-xs font-medium text-text-secondary mb-1">
                  Workspace Scope
                </label>
                <select
                  id="new-proj-scope"
                  value={newProjectTeamId || 'personal'}
                  onChange={(e) => setNewProjectTeamId(e.target.value === 'personal' ? null : e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-lg border border-border-default bg-bg-primary text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer font-mono"
                >
                  <option value="personal">Personal Workspace</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Team · {(t.members || []).length}/4)
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="min-h-[44px] px-4 rounded-lg border border-border-default text-xs font-medium hover:bg-bg-tertiary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-4 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Create &amp; Open
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
