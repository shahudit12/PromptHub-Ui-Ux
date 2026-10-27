import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderOpen, 
  Bot, 
  Code2, 
  GitCommit, 
  FileText, 
  Globe, 
  GitBranch, 
  ArrowLeft, 
  Loader2, 
  Sparkles 
} from 'lucide-react';
import type { 
  WorkProject, 
  WorkTask, 
  WorkAgent, 
  WorkFile, 
  WorkArtifact, 
  WorkFileDiff,
  WorkMessage,
  WorkApproval 
} from '../../types/work';
import { workService, normalizeWorkPath } from '../../services/work/workService';
import { workGitService } from '../../services/work/workGitService';
import { workSandboxService } from '../../services/work/workSandboxService';
import { workEventBus } from '../../services/work/workEventBus';
import { WorkFileExplorer } from './WorkFileExplorer';
import { WorkCodeEditor } from './WorkCodeEditor';
import { WorkDiffViewer } from './WorkDiffViewer';
import { WorkBrowserPreview } from './WorkBrowserPreview';
import { WorkArtifactViewer } from './WorkArtifactViewer';
import { WorkTerminal } from './WorkTerminal';
import { WorkAgentCard } from './WorkAgentCard';
import { WorkApprovalModal } from './WorkApprovalModal';
import { WorkTaskComposer } from './WorkTaskComposer';

interface WorkProjectWorkspaceProps {
  project: WorkProject;
  onBackToOverview: () => void;
}

type MainViewTab = 'code' | 'diffs' | 'preview' | 'artifacts';
type LeftNavTab = 'files' | 'agents';

export const WorkProjectWorkspace: React.FC<WorkProjectWorkspaceProps> = ({
  project,
  onBackToOverview,
}) => {
  const [files, setFiles] = useState<WorkFile[]>([]);
  const [openFiles, setOpenFiles] = useState<WorkFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>('src/App.tsx');
  const [agents, setAgents] = useState<WorkAgent[]>([]);
  const [artifacts, setArtifacts] = useState<WorkArtifact[]>([]);
  const [_tasks, setTasks] = useState<WorkTask[]>([]);
  const [activeTask, setActiveTask] = useState<WorkTask | null>(null);
  const [diffs, setDiffs] = useState<WorkFileDiff[]>([]);

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<MainViewTab>('code');
  const [leftTab, setLeftTab] = useState<LeftNavTab>('files');
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Resizable Left Sidebar Drawer width (persisted in localStorage)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ph_work_sidebar_width');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 180 && parsed <= 480) return parsed;
      }
    } catch {}
    return 256;
  });
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const sidebarContainerRef = useRef<HTMLDivElement>(null);

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
  };

  const handleSidebarTouchStart = () => {
    setIsDraggingSidebar(true);
  };

  useEffect(() => {
    if (!isDraggingSidebar) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!sidebarContainerRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const rect = sidebarContainerRef.current.getBoundingClientRect();
      const currentWidth = clientX - rect.left;
      const clamped = Math.min(480, Math.max(180, Math.round(currentWidth)));
      setSidebarWidth(clamped);
    };

    const handlePointerUp = () => {
      setIsDraggingSidebar(false);
      try {
        localStorage.setItem('ph_work_sidebar_width', sidebarWidth.toString());
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
  }, [isDraggingSidebar, sidebarWidth]);

  // Approval modal state
  const [pendingApproval, setPendingApproval] = useState<WorkApproval | null>(null);

  // Activity Messages
  const [messages, setMessages] = useState<WorkMessage[]>([]);

  // Load project initial data
  useEffect(() => {
    const loadWorkspaceData = async () => {
      const projFiles = await workService.getFiles(project.id);
      setFiles(projFiles);
      if (projFiles.length > 0) {
        setOpenFiles(projFiles.slice(0, 3));
        setActiveFilePath(projFiles[0].path);
      }

      const projAgents = await workService.getAgents(project.id);
      setAgents(projAgents);

      const projTasks = await workService.getTasks(project.id);
      setTasks(projTasks);
      if (projTasks.length > 0) {
        setActiveTask(projTasks[projTasks.length - 1]);
      }

      const projArtifacts = await workService.getArtifacts(project.id);
      setArtifacts(projArtifacts);
    };

    loadWorkspaceData();
  }, [project.id]);

  // Subscribe to real-time events for this project
  useEffect(() => {
    const unsubscribe = workEventBus.subscribeAll((event) => {
      if (event.projectId && event.projectId !== project.id) return;

      if (event.eventType === 'FILE_CREATED' || event.eventType === 'FILE_UPDATED' || event.eventType === 'FILE_DELETED') {
        workService.getFiles(project.id).then((freshFiles) => {
          setFiles(freshFiles);
          setOpenFiles((prev) => prev.filter((f) => freshFiles.some((ff) => normalizeWorkPath(ff.path) === normalizeWorkPath(f.path))));
          setActiveFilePath((prev) => {
            const norm = normalizeWorkPath(prev);
            return freshFiles.some((f) => normalizeWorkPath(f.path) === norm) ? prev : (freshFiles[0]?.path || '');
          });
        });
      } else if (event.eventType === 'ARTIFACT_CREATED') {
        workService.getArtifacts(project.id).then(setArtifacts);
      } else if (event.eventType === 'TASK_COMPLETED' || event.eventType === 'TASK_FAILED') {
        setIsExecuting(false);
        workService.getTasks(project.id).then(setTasks);
      }
    });

    return () => unsubscribe();
  }, [project.id]);

  // Handle task launch
  const handleLaunchTask = async (data: {
    title: string;
    description: string;
    model: string;
    provider: string;
    priority: any;
    executionMode: any;
  }) => {
    setIsExecuting(true);
    setIsComposerOpen(false);

    try {
      const task = await workService.createTask({
        projectId: project.id,
        title: data.title,
        description: data.description,
        model: data.model,
        provider: data.provider,
        priority: data.priority,
        executionMode: data.executionMode,
      });

      setActiveTask(task);
      setTasks((prev) => [task, ...prev]);

      // Execute task
      const result = await workService.executeTask(task.id, {
        onMessage: (msg) => {
          setMessages((prev) => [...prev, msg]);
        },
        onRequestApproval: async (approval) => {
          setPendingApproval(approval);
          return new Promise<boolean>((resolve) => {
            // Handled via modal actions
            const checkInterval = setInterval(() => {
              if (!pendingApproval) {
                clearInterval(checkInterval);
                resolve(true);
              }
            }, 500);
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
        setActiveTab('diffs'); // Auto-switch to review diffs
      }

      // Refresh files & artifacts
      const updatedFiles = await workService.getFiles(project.id);
      setFiles(updatedFiles);
      const updatedArtifacts = await workService.getArtifacts(project.id);
      setArtifacts(updatedArtifacts);
    } catch {
      // Handled
    } finally {
      setIsExecuting(false);
    }
  };

  // Run terminal command directly
  const handleRunTerminalCommand = async (command: string) => {
    await workSandboxService.executeCommand(command, {
      taskId: activeTask?.id || 'manual',
      projectId: project.id,
    });
  };

  // File explorer interactions
  const handleSelectFile = (file: WorkFile) => {
    setActiveFilePath(file.path);
    if (!openFiles.some((f) => f.path === file.path)) {
      setOpenFiles((prev) => [...prev, file]);
    }
    setActiveTab('code');
  };

  const handleCloseTab = (path: string) => {
    const nextOpen = openFiles.filter((f) => f.path !== path);
    setOpenFiles(nextOpen);
    if (activeFilePath === path) {
      setActiveFilePath(nextOpen[0]?.path || '');
    }
  };

  const handleSaveFile = async (path: string, content: string) => {
    await workService.writeFile(project.id, { path, content });
    const updated = await workService.getFiles(project.id);
    setFiles(updated);
  };

  const handleCreateFile = async (path: string) => {
    await workService.writeFile(project.id, {
      path,
      content: '// New module\n',
    });
    const updated = await workService.getFiles(project.id);
    setFiles(updated);
    const newFile = updated.find((f) => f.path === path);
    if (newFile) handleSelectFile(newFile);
  };

  const handleDeleteFile = async (path: string) => {
    const normTarget = normalizeWorkPath(path);
    await workService.deleteFile(project.id, normTarget);
    const updated = await workService.getFiles(project.id);
    setFiles(updated);
    setOpenFiles((prev) => prev.filter((f) => normalizeWorkPath(f.path) !== normTarget));
    if (normalizeWorkPath(activeFilePath) === normTarget) {
      const remaining = openFiles.filter((f) => normalizeWorkPath(f.path) !== normTarget);
      setActiveFilePath(remaining[0]?.path || updated[0]?.path || '');
    }
  };

  const handleExportToDesktop = async () => {
    if (!project) return;
    await workService.exportProjectToDesktop(project.id);
  };

  const handleDownloadFile = async (path: string) => {
    if (!project) return;
    await workService.downloadFileToDesktop(project.id, path);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-bg-primary overflow-hidden">
      {/* Top Workspace Header */}
      <div className="bg-bg-secondary border-b border-border-default px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBackToOverview}
            title="Back to Work Overview"
            className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center rounded-lg border border-border-default hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-text-primary tracking-tight truncate">
                {project.name}
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-subtle text-text-muted flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-brand-primary" />
                <span>main</span>
              </span>
            </div>
            <p className="text-[11px] text-text-muted truncate hidden sm:block">
              {project.description || 'Full-stack agent development workspace'}
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2">
          {isExecuting && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Agents Working...</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsComposerOpen(!isComposerOpen)}
            className="min-h-[44px] sm:min-h-[36px] px-3.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Inline Task Composer Drawer */}
      {isComposerOpen && (
        <div className="p-3 sm:p-4 bg-bg-tertiary/40 border-b border-border-default shrink-0">
          <div className="max-w-4xl mx-auto">
            <WorkTaskComposer
              projectId={project.id}
              isSubmitting={isExecuting}
              onLaunchTask={handleLaunchTask}
            />
          </div>
        </div>
      )}

      {/* Main Workspace 3-Pane Layout */}
      <div 
        ref={sidebarContainerRef}
        className="flex-1 flex overflow-hidden relative"
        style={{ userSelect: isDraggingSidebar ? 'none' : undefined }}
      >
        {/* Left Sidebar Drawer (Files / Agents) */}
        <div 
          style={{ width: `${sidebarWidth}px` }}
          className="border-r border-border-default bg-bg-secondary flex flex-col shrink-0 overflow-hidden"
        >
          {/* Tab switcher: Files vs Agents */}
          <div className="flex items-center border-b border-border-subtle p-1.5 bg-bg-tertiary/50 shrink-0">
            <button
              type="button"
              onClick={() => setLeftTab('files')}
              className={`flex-1 min-h-[44px] sm:min-h-[28px] py-1 text-xs font-mono font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                leftTab === 'files'
                  ? 'bg-bg-secondary text-text-primary shadow-2xs font-semibold'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-brand-primary" />
              <span>Files</span>
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('agents')}
              className={`flex-1 min-h-[44px] sm:min-h-[28px] py-1 text-xs font-mono font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                leftTab === 'agents'
                  ? 'bg-bg-secondary text-text-primary shadow-2xs font-semibold'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-brand-primary" />
              <span>Agents ({agents.length})</span>
            </button>
          </div>

          {/* Left panel contents */}
          <div className="flex-1 overflow-y-auto p-2">
            {leftTab === 'files' ? (
              <WorkFileExplorer
                files={files}
                selectedFilePath={activeFilePath}
                onSelectFile={handleSelectFile}
                onCreateFile={handleCreateFile}
                onDeleteFile={handleDeleteFile}
                onExportToDesktop={handleExportToDesktop}
                onDownloadFile={handleDownloadFile}
              />
            ) : (
              <div className="space-y-2.5">
                {agents.map((agent) => (
                  <WorkAgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Draggable Sidebar Divider */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={Math.round(sidebarWidth)}
          aria-valuemin={180}
          aria-valuemax={480}
          tabIndex={0}
          onMouseDown={handleSidebarMouseDown}
          onTouchStart={handleSidebarTouchStart}
          onDoubleClick={() => {
            setSidebarWidth(256);
            try {
              localStorage.setItem('ph_work_sidebar_width', '256');
            } catch {}
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setSidebarWidth((prev) => Math.max(180, prev - 10));
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setSidebarWidth((prev) => Math.min(480, prev + 10));
            } else if (e.key === 'Home' || e.key === 'Enter') {
              setSidebarWidth(256);
            }
          }}
          className={`hidden md:flex items-center justify-center relative w-2 hover:w-3 cursor-col-resize select-none shrink-0 transition-all z-20 ${
            isDraggingSidebar
              ? 'bg-brand-primary'
              : 'bg-border-default hover:bg-brand-primary/60'
          }`}
          title="Drag to resize sidebar • Double-click to reset (256px) • Left/Right arrows to adjust"
        >
          <div className={`h-8 w-1 rounded-full transition-colors flex flex-col items-center justify-center gap-0.5 ${
            isDraggingSidebar ? 'bg-white' : 'bg-text-muted hover:bg-white'
          }`}>
            <span className="w-0.5 h-0.5 rounded-full bg-current opacity-70" />
            <span className="w-0.5 h-0.5 rounded-full bg-current opacity-70" />
            <span className="w-0.5 h-0.5 rounded-full bg-current opacity-70" />
          </div>
        </div>

        {/* Center Main Stage */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Center Stage Nav Tabs */}
          <div className="bg-bg-secondary border-b border-border-default px-3 pt-1 flex items-center justify-between shrink-0 overflow-x-auto whitespace-nowrap no-scrollbar">
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`min-h-[44px] sm:min-h-[34px] px-3.5 text-xs font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'code'
                    ? 'border-b-2 border-brand-primary text-brand-primary font-semibold bg-brand-primary-light/20'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Code Editor</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('diffs')}
                className={`min-h-[44px] sm:min-h-[34px] px-3.5 text-xs font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'diffs'
                    ? 'border-b-2 border-brand-primary text-brand-primary font-semibold bg-brand-primary-light/20'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>Diffs</span>
                {diffs.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
                    {diffs.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`min-h-[44px] sm:min-h-[34px] px-3.5 text-xs font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'border-b-2 border-brand-primary text-brand-primary font-semibold bg-brand-primary-light/20'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Browser Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('artifacts')}
                className={`min-h-[44px] sm:min-h-[34px] px-3.5 text-xs font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'artifacts'
                    ? 'border-b-2 border-brand-primary text-brand-primary font-semibold bg-brand-primary-light/20'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Artifacts</span>
                {artifacts.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-mono">
                    {artifacts.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active View Container */}
          <div className="flex-1 p-2 sm:p-3 overflow-hidden bg-bg-primary">
            {activeTab === 'code' && (
              <WorkCodeEditor
                openFiles={openFiles}
                activeFilePath={activeFilePath}
                onSelectTab={setActiveFilePath}
                onCloseTab={handleCloseTab}
                onSaveFile={handleSaveFile}
                onDeleteFile={handleDeleteFile}
              />
            )}

            {activeTab === 'diffs' && (
              <WorkDiffViewer diffs={diffs} />
            )}

            {activeTab === 'preview' && (
              <WorkBrowserPreview files={files} />
            )}

            {activeTab === 'artifacts' && (
              <WorkArtifactViewer artifacts={artifacts} />
            )}
          </div>

          {/* Terminal Drawer */}
          <div className="p-2 sm:p-3 pt-0 shrink-0">
            <WorkTerminal
              taskId={activeTask?.id}
              projectId={project.id}
              onRunCommand={handleRunTerminalCommand}
              isExpanded={isTerminalExpanded}
              onToggleExpand={() => setIsTerminalExpanded(!isTerminalExpanded)}
            />
          </div>
        </div>

        {/* Right Drawer: Agent Activity & Telemetry */}
        <div className="w-72 border-l border-border-default bg-bg-secondary hidden lg:flex flex-col shrink-0 overflow-hidden">
          <div className="p-3 border-b border-border-subtle flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-primary" />
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
                Agent Activity
              </span>
            </div>
            {activeTask && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-subtle text-text-muted">
                {activeTask.status}
              </span>
            )}
          </div>

          {/* Activity Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted">
                <Bot className="w-8 h-8 mx-auto text-text-muted/60 mb-2" />
                <span>No active agent tasks running. Launch a task to see live thoughts, tool executions, and checkpoints.</span>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2.5 rounded-lg border text-xs leading-relaxed ${
                    msg.role === 'system'
                      ? 'bg-bg-tertiary/70 border-border-subtle text-text-muted italic'
                      : 'bg-bg-primary border-border-default text-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1 font-mono text-[10px] text-text-muted">
                    <span className="font-semibold text-brand-primary">{msg.senderName}</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Human Approval Modal */}
      <WorkApprovalModal
        isOpen={Boolean(pendingApproval)}
        approval={pendingApproval}
        onApprove={() => setPendingApproval(null)}
        onDeny={() => setPendingApproval(null)}
      />
    </div>
  );
};
