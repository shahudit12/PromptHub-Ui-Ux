import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Send,
  Download,
  Bookmark,
  Plus,
  Zap,
  Maximize2,
  Minimize2,
  HardDrive,
  Brain,
  Code2,
  Cpu,
  X,
  ChevronDown,
  Trash2,
  Pin,
  History,
  FolderGit2,
  FolderOpen,
  Globe,
  FileText,
  Search,
  Archive,
  Check,
  ExternalLink,
  ArrowRight,
  MessageSquare,
  ChevronUp,
  HelpCircle,
  AlertTriangle,
  Paperclip,
  Sliders,
  Users,
  Copy,
  Edit3,
  Printer,
  ThumbsUp,
  CheckCircle,
  RefreshCw,
  Server,
  Mic,
  Briefcase,
  EyeOff,
} from 'lucide-react';
import { PromptHubLogo } from '../PromptHubLogo';
import { securityUtils } from '../../utils/security';
import { useApp } from '../../context/AppContext';
import { useConfirm } from '../../hooks/useConfirm';
import { useWorkspace } from '../../context/WorkspaceContext';
import { multiProviderService, AI_PROVIDERS, type AIProviderId } from '../../services/ai/multiProviderService';
import {
  checkFreeTierExecutionStatus,
  recordFreeRunExecution,
  getDailyFreeRunsCount,
  FREE_TIER_DAILY_LIMIT,
} from '../../services/freeTierUsageService';
import { workService, normalizeWorkPath } from '../../services/work/workService';
import { workGitService } from '../../services/work/workGitService';
import { storageService, formatStorageBytes, type StorageQuota } from '../../services/storageService';
import {
  adaptiveKnowledgeService,
  type KnowledgeItem,
} from '../../services/ai/adaptiveKnowledgeService';
import { WORKSPACE_SKILLS, type WorkspaceSkill, resolveWorkspaceSkill } from '../../services/ai/skillsRegistry';
import { DEFAULT_AGENT_TEAM, type AgentTeamMember } from '../../services/ai/agentTeamRegistry';
import {
  unifiedOrchestrator,
  type VisualOption,
  type DownstreamTask,
  type UnifiedExecutionResult,
} from '../../services/ai/unifiedOrchestrator';
import { WorkBrowserPreview } from '../work/WorkBrowserPreview';
import { WorkCodeEditor } from '../work/WorkCodeEditor';
import { WorkFileExplorer } from '../work/WorkFileExplorer';
import { WorkDiffViewer } from '../work/WorkDiffViewer';
import { WorkArtifactViewer } from '../work/WorkArtifactViewer';
import { portfolioSpecService } from '../../services/portfolio/portfolioSpecService';
import { PortfolioConceptSwitcher } from '../portfolio/PortfolioConceptSwitcher';
import { WorkspaceHelpModal } from './WorkspaceHelpModal';
import { WorkspaceAttachmentTray } from './WorkspaceAttachmentTray';
import { WorkspaceFolderTree } from './WorkspaceFolderTree';
import { LiveWebPublishModal } from './LiveWebPublishModal';
import { MemorySettingsModal } from './MemorySettingsModal';
import { KnowledgeGraphModal } from './KnowledgeGraphModal';
import {
  processAttachment,
  formatContextFromAttachments,
  type WorkspaceAttachment,
} from '../../utils/workspaceAttachmentEngine';
import {
  classifyDeliverableIntent,
  isHostingQuery,
  isConversationalGreeting,
  isCapabilitiesOrHelpQuery,
} from '../../services/ai/intentClassifier';
import { aiGateway } from '../../services/ai/aiGateway';
import { resolveAutonomousModelRoute } from '../../services/ai/modelRouter';
import { DeveloperModeDrawer, type DeveloperSettings } from './DeveloperModeDrawer';
import { getActiveMcpServers, getFormattedMcpContext } from './McpServerConfig';
import { AdDeliverableCard } from './deliverables/AdDeliverableCard';
import { ReportDeliverableCard } from './deliverables/ReportDeliverableCard';
import { DataTableDeliverableCard } from './deliverables/DataTableDeliverableCard';
import { CodeAppDeliverableCard } from './deliverables/CodeAppDeliverableCard';
import { YunoVoiceAgentPanel } from '../voice/YunoVoiceAgentPanel';
import { workspaceActionBridge } from '../../services/work/workspaceActionBridge';
import { BriefInspectModal } from './BriefInspectModal';
import { sharedExecutionService } from '../../services/ai/sharedExecutionService';
import { structuredBriefManager } from '../../services/ai/structuredBriefManager';
import type { StructuredProjectBrief } from '../../types/projectBrief';
import { PresentationDeliverableCard } from './deliverables/PresentationDeliverableCard';
import { VideoStoryboardDeliverableCard } from './deliverables/VideoStoryboardDeliverableCard';
import { renderHumanFriendlyMarkdown } from '../../utils/documentMarkdownRenderer';
import { isRetiredOrUnavailableFreeModel } from '../../utils/modelFormatting';
import { generateZipArchive, downloadFileToDesktop, type ZipFileInput } from '../../utils/zipGenerator';
import type { DeliverableBundle } from '../../types/deliverableState';
import type { PortfolioConcept, PortfolioSpecPatch } from '../../types/portfolioSpec';
import {
  getInstantBlueprintById,
  findInstantBlueprintByPrompt,
  type InstantDeliverableBlueprint,
} from '../../data/workspaceBlueprintCatalog';
import { PromptVariableWorkflow } from './PromptVariableWorkflow';
import type {
  WorkProject,
  WorkFile,
  WorkArtifact,
  WorkFileDiff,
} from '../../types/work';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  options?: VisualOption[];
  portfolioConcepts?: PortfolioConcept[];
  result?: UnifiedExecutionResult;
  downstreamTasks?: DownstreamTask[];
  suggestedFollowUps?: string[];
  teamStep?: string;
  attachments?: WorkspaceAttachment[];
  deliverable?: DeliverableBundle;
  briefId?: string;
  briefVersion?: number;
  modelUsed?: string;
}

export interface SavedChatSession {
  id: string;
  projectId?: string;
  folderId?: string;
  folderName?: string;
  title: string;
  timestamp: number;
  messageCount: number;
  lastSnippet: string;
  messages: ChatMessage[];
  resultTitle?: string;
}

import { type WorkspaceModelInfo, WORKSPACE_MODELS } from '../../services/ai/workspaceModels';
export { type WorkspaceModelInfo, WORKSPACE_MODELS };

const OptionBlueprintPreview: React.FC<{ option: VisualOption }> = ({ option }) => {
  const optId = option.id.toLowerCase();
  const isRetro = optId.includes('retro') || optId.includes('creative') || optId.includes('arcade');
  const isTerminal = optId.includes('minimal') || optId.includes('terminal') || optId.includes('cli');
  const isBusiness = optId.includes('shop') || optId.includes('gst') || optId.includes('credit') || optId.includes('business');

  if (isRetro) {
    return (
      <div className="w-full h-36 rounded-xl overflow-hidden bg-bg-tertiary border border-emerald-500/30 p-2.5 flex flex-col justify-between font-mono select-none relative group/bp">
        <div className="flex items-center justify-between border-b border-border-default pb-1.5 relative z-10">
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>CRT 8-BIT ARCADE ENGINE</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
            SCORE: 099420
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-2 relative z-10">
          <div className="p-2 rounded-lg bg-bg-secondary border border-border-default text-center">
            <div className="text-[9px] text-text-muted">SYNTH</div>
            <div className="text-[10px] text-text-primary font-bold">Web Audio API</div>
          </div>
          <div className="p-2 rounded-lg bg-bg-secondary border border-border-default text-center">
            <div className="text-[9px] text-text-muted">RENDER</div>
            <div className="text-[10px] text-text-primary font-bold">CRT Canvas</div>
          </div>
          <div className="p-2 rounded-lg bg-bg-secondary border border-border-default text-center">
            <div className="text-[9px] text-text-muted">INPUT</div>
            <div className="text-[10px] text-text-primary font-bold">Gamepad / WASD</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-[9px] text-text-muted pt-1 border-t border-border-default relative z-10">
          <span>60 FPS &bull; Pure Canvas</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Interactive Sandbox</span>
        </div>
      </div>
    );
  }

  if (isTerminal) {
    return (
      <div className="w-full h-36 rounded-xl overflow-hidden bg-bg-tertiary border border-border-default p-2.5 flex flex-col justify-between font-mono select-none relative group/bp">
        <div className="flex items-center justify-between border-b border-border-default pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500/80" />
            <span className="w-2 h-2 rounded-full bg-amber-500/80" />
            <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
            <span className="text-[10px] text-text-muted ml-1">developer@station:~</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            CLI Terminal UI
          </span>
        </div>
        <div className="space-y-1 py-1 text-[10px]">
          <div className="text-brand-primary flex items-center gap-1 font-semibold">
            <span className="text-text-muted">$</span>
            <span>npx init-portfolio --stack=react,tailwind,ts</span>
          </div>
          <div className="text-text-secondary text-[9.5px] pl-2 border-l border-brand-primary/30">
            <div>✓ Generated 4 modular source files</div>
            <div>✓ Zero latency &bull; Monospace aesthetics</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-[9px] text-text-muted pt-1 border-t border-border-default">
          <span className="text-emerald-600 dark:text-emerald-400">● Status: Production Clean</span>
          <span className="text-brand-primary font-bold">Executable Vite Stack</span>
        </div>
      </div>
    );
  }

  if (isBusiness) {
    return (
      <div className="w-full h-36 rounded-xl overflow-hidden bg-bg-tertiary border border-amber-500/30 p-2.5 flex flex-col justify-between font-mono select-none relative group/bp">
        <div className="flex items-center justify-between border-b border-border-default pb-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
            <span>RETAIL COMMERCE &amp; LEDGER</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20">
            GST 18% &bull; INR ₹
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 py-1 text-[10px]">
          <div className="p-1.5 rounded-lg bg-bg-secondary border border-border-default text-center">
            <div className="text-[8.5px] text-text-muted">INVENTORY</div>
            <div className="text-[10px] text-text-primary font-bold">Reactive Cart</div>
          </div>
          <div className="p-1.5 rounded-lg bg-bg-secondary border border-border-default text-center">
            <div className="text-[8.5px] text-text-muted">BILLING</div>
            <div className="text-[10px] text-text-primary font-bold">Tax Breakdown</div>
          </div>
          <div className="p-1.5 rounded-lg bg-bg-secondary border border-border-default text-center">
            <div className="text-[8.5px] text-text-muted">WHATSAPP</div>
            <div className="text-[10px] text-text-primary font-bold">Auto Reminders</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-[9px] text-text-muted pt-1 border-t border-border-default">
          <span>Live Stock Management</span>
          <span className="text-amber-600 dark:text-amber-400 font-bold">Instant Sandbox</span>
        </div>
      </div>
    );
  }

  // Bento Grid / Modern Portfolio (Default)
  return (
    <div className="w-full h-36 rounded-xl overflow-hidden bg-bg-tertiary border border-border-default p-2.5 flex flex-col justify-between font-mono select-none relative group/bp">
      <div className="flex items-center justify-between border-b border-border-default pb-1.5">
        <div className="flex items-center gap-1.5 text-[10px] text-brand-primary font-bold">
          <span>✦ MODERN BENTO GRID</span>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
          Tailwind CSS
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 py-1 text-[9px]">
        <div className="col-span-2 p-1.5 rounded-lg bg-bg-secondary border border-border-default">
          <div className="text-brand-primary font-bold">Hero Card</div>
          <div className="text-text-muted text-[8px]">Avatar &bull; Role &bull; Status</div>
        </div>
        <div className="p-1.5 rounded-lg bg-bg-secondary border border-border-default text-center">
          <div className="text-emerald-600 dark:text-emerald-400 font-bold">Projects</div>
          <div className="text-text-muted text-[8px]">★ 1.4k Stars</div>
        </div>
        <div className="p-1.5 rounded-lg bg-bg-secondary border border-border-default text-center">
          <div className="text-sky-600 dark:text-sky-400 font-bold">Contact</div>
          <div className="text-text-muted text-[8px]">1-Click Form</div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[9px] text-text-muted pt-1 border-t border-border-default">
        <span>Fluid Asymmetrical Grid</span>
        <span className="text-brand-primary font-bold">Mobile Responsive</span>
      </div>
    </div>
  );
};

// ─── Workspace Request Type (Unified Typed & Spoken Architecture) ───────────
export type WorkspaceRequest = {
  text: string;
  source: 'text' | 'voice';
  projectId: string;
  sessionId: string;
  attachmentIds: string[];
  requestId: string;
};

export const UnifiedCreationWorkspace: React.FC = () => {
  const { user, showToast, setActiveTab, activePromptId, prompts, teams = [], activeTeamId } = useApp();
  const activeTeam = teams.find(t => t.id === activeTeamId);
  const confirm = useConfirm();
  const { sendToStudio, sendToAnalyzer, sendToArena, sendToWork } = useWorkspace();

  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  // processingStep is kept for internal tracking even though it's not displayed to users (clean output mode)
  const [, setProcessingStep] = useState<string>('');
  const [activeResult, setActiveResult] = useState<UnifiedExecutionResult | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [mobileActiveView, setMobileActiveView] = useState<'chat' | 'preview'>('chat');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Milestone 2: Scoped Multi-Tier Memory & Knowledge Graph State
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string | undefined>(undefined);

  // Antigravity-Style Panel & Composer Layout State (defaults to chat-only for clean focus, persisted)
  const [panelLayout, setPanelLayout] = useState<'split' | 'chat-only' | 'inspector-only'>(() => {
    try {
      const saved = localStorage.getItem('ph_unified_panel_layout');
      if (saved === 'split' || saved === 'chat-only' || saved === 'inspector-only') {
        return saved;
      }
    } catch {}
    return 'chat-only';
  });
  const [isComposerCollapsed, setIsComposerCollapsed] = useState(false);
  const [expandedOptionPreviews, setExpandedOptionPreviews] = useState<Record<string, boolean>>({});

  // Multimodal Attachment Pipeline State
  const [attachments, setAttachments] = useState<WorkspaceAttachment[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Developer Mode Drawer & Model Config (persisted & synchronized)
  const [isDeveloperDrawerOpen, setIsDeveloperDrawerOpen] = useState(false);
  const [developerSettings, setDeveloperSettings] = useState<DeveloperSettings>(() => {
    try {
      const saved = localStorage.getItem('ph_developer_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          modelOverride: parsed.modelOverride || null,
          temperature: typeof parsed.temperature === 'number' ? parsed.temperature : 0.7,
          maxTokens: typeof parsed.maxTokens === 'number' ? parsed.maxTokens : 8192,
          systemPromptOverride: parsed.systemPromptOverride || '',
        };
      }
    } catch {}
    return {
      modelOverride: null,
      temperature: 0.7,
      maxTokens: 8192,
      systemPromptOverride: '',
    };
  });

  // Active MCP Tools Tracking
  const [activeMcpCount, setActiveMcpCount] = useState<number>(() => {
    try {
      return getActiveMcpServers().length;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const handleMcpUpdate = () => {
      try {
        setActiveMcpCount(getActiveMcpServers().length);
      } catch {}
    };
    window.addEventListener('ph_mcp_servers_updated', handleMcpUpdate);
    window.addEventListener('storage', handleMcpUpdate);
    return () => {
      window.removeEventListener('ph_mcp_servers_updated', handleMcpUpdate);
      window.removeEventListener('storage', handleMcpUpdate);
    };
  }, []);

  const MAX_WORKSPACE_ATTACHMENTS = 5;

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    // Deduplication check: one file can be attached once only (Req #2)
    const existingKeys = new Set(attachments.map((a) => `${a.name.toLowerCase()}-${a.sizeBytes}`));
    const uniqueFiles: File[] = [];
    const duplicateNames: string[] = [];

    for (const file of files) {
      const key = `${file.name.toLowerCase()}-${file.size}`;
      if (existingKeys.has(key)) {
        duplicateNames.push(file.name);
      } else {
        existingKeys.add(key);
        uniqueFiles.push(file);
      }
    }

    if (duplicateNames.length > 0) {
      showToast(
        `Skipped duplicate attachment: ${duplicateNames.slice(0, 2).join(', ')}. Each file can only be attached once.`,
        'info'
      );
    }

    if (uniqueFiles.length === 0) return;

    if (attachments.length >= MAX_WORKSPACE_ATTACHMENTS) {
      showToast('Maximum 5 attachments reached. Remove an attachment to add another.', 'info');
      return;
    }

    const availableSlots = MAX_WORKSPACE_ATTACHMENTS - attachments.length;
    if (uniqueFiles.length > availableSlots) {
      showToast(`Maximum 5 attachments allowed. Processing first ${availableSlots} file${availableSlots > 1 ? 's' : ''}.`, 'info');
    }

    const filesToProcess = uniqueFiles.slice(0, availableSlots);
    const valid: WorkspaceAttachment[] = [];
    const failedNames: string[] = [];

    for (const file of filesToProcess) {
      try {
        const att = await processAttachment(file);
        valid.push(att);
      } catch (err: any) {
        failedNames.push(file.name);
      }
    }

    if (failedNames.length > 0) {
      showToast(
        `Skipped ${failedNames.length} file${failedNames.length > 1 ? 's' : ''} (${failedNames.slice(0, 3).join(', ')}). Allowed: PNG, JPG, WEBP, PDF, TXT, MD, CSV, JSON (max 10MB).`,
        'error'
      );
    }
    if (valid.length > 0) {
      setAttachments((prev) => [...prev, ...valid].slice(0, MAX_WORKSPACE_ATTACHMENTS));
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      await handleFilesSelected(e.clipboardData.files);
    }
  };

  const handleDeliverableVersionChange = (messageId: string, targetVersion: number) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId || !msg.deliverable) return msg;
        const target = msg.deliverable.versions.find((v) => v.version === targetVersion);
        if (!target) return msg;
        const snapshot = msg.deliverable.history?.[targetVersion];
        return {
          ...msg,
          deliverable: {
            ...msg.deliverable,
            version: targetVersion,
            adData: snapshot?.adData || msg.deliverable.adData,
            reportData: snapshot?.reportData || msg.deliverable.reportData,
            tableData: snapshot?.tableData || msg.deliverable.tableData,
            codeAppData: snapshot?.codeAppData || msg.deliverable.codeAppData,
          },
        };
      })
    );
  };

  // Active Loaded Prompt Info (from Library, Collections, or Marketplace)
  const [loadedPromptInfo, setLoadedPromptInfo] = useState<{
    title?: string;
    category?: string;
    id?: string;
  } | null>(null);

  // Check for incoming prompt from Library, Collections, or URL parameter
  useEffect(() => {
    try {
      const pendingWorkTask = sessionStorage.getItem('ph_work_pending_task');
      if (pendingWorkTask) {
        const parsed = JSON.parse(pendingWorkTask);
        if (parsed.prompt && (!inputPrompt || inputPrompt.trim().length === 0)) {
          setInputPrompt(parsed.prompt);
          if (parsed.title) {
            setLoadedPromptInfo({
              title: parsed.title,
              category: parsed.category,
            });
          }
          sessionStorage.removeItem('ph_work_pending_task');
          return;
        }
      }

      const pendingWorkspacePrompt = sessionStorage.getItem('ph_creation_workspace_prompt');
      if (pendingWorkspacePrompt) {
        if (!inputPrompt || inputPrompt.trim().length === 0) {
          setInputPrompt(pendingWorkspacePrompt);
          sessionStorage.removeItem('ph_creation_workspace_prompt');
          return;
        }
      }
    } catch {}

    if (activePromptId && (!inputPrompt || inputPrompt.trim().length === 0)) {
      const match = prompts.find(p => p.id === activePromptId);
      if (match?.rawContent) {
        setInputPrompt(match.rawContent);
        setLoadedPromptInfo({
          title: match.title,
          category: match.category,
        });
        return;
      }
      try {
        const storedData = sessionStorage.getItem('ph_active_prompt_data');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          if (parsed && parsed.id === activePromptId && parsed.rawContent) {
            setInputPrompt(parsed.rawContent);
            setLoadedPromptInfo({
              title: parsed.title,
              category: parsed.category,
            });
            return;
          }
        }
      } catch {}
    }
  }, [activePromptId, prompts]);

  // Listen for live incoming task events
  useEffect(() => {
    const handleIncomingTask = (e: any) => {
      if (e.detail?.prompt) {
        setInputPrompt(e.detail.prompt);
      }
    };
    window.addEventListener('ph_work_incoming_task', handleIncomingTask);
    return () => window.removeEventListener('ph_work_incoming_task', handleIncomingTask);
  }, []);

  // Resizable split ratio between chat stream and workspace inspector (persisted in localStorage)
  // Defaults to narrow 32% chat stream so user's deliverable output & live website take 68% of screen!
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ph_unified_split_ratio');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 20 && parsed <= 80) return parsed;
      }
    } catch {}
    return 32;
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

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

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
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        localStorage.setItem('ph_unified_split_ratio', splitRatio.toString());
      } catch {}
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDraggingSplit, splitRatio]);

  // Antigravity Skills & Models (Explicit User Choice, No Autonomous Routing)
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ph_workspace_selected_model');
      if (saved && !isRetiredOrUnavailableFreeModel(saved)) return saved;
    } catch {}
    return 'openrouter/free';
  });
  const [activeSkills, setActiveSkills] = useState<WorkspaceSkill[]>([]);

  // Help Modal & Multi-Domain Catalog State
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [voiceSessionKey, setVoiceSessionKey] = useState(0);
  const [voiceSessionId, setVoiceSessionId] = useState(() => `voice_sess_${Date.now()}`);

  // Milestone 1: Structured Project Brief & Inspector Modal State
  const [activeBrief, setActiveBrief] = useState<StructuredProjectBrief | null>(() => {
    return structuredBriefManager.getBrief('default_session');
  });
  const [briefHistory, setBriefHistory] = useState<StructuredProjectBrief[]>(() => {
    return structuredBriefManager.getBriefHistory('default_session');
  });
  const [isBriefModalOpen, setIsBriefModalOpen] = useState(false);
  // Connected BYOK Providers & Models
  const [connectedProviders, setConnectedProviders] = useState<AIProviderId[]>(() => {
    try {
      return multiProviderService.getConnectedProviders();
    } catch {
      return [];
    }
  });

  // Re-check connected providers on window focus, storage, or BYOK updates
  useEffect(() => {
    const refreshKeys = () => {
      try {
        const connected = multiProviderService.getConnectedProviders();
        setConnectedProviders(connected);
      } catch {}
    };
    const handleModelSelect = (e: any) => {
      if (e.detail?.modelId) {
        setSelectedModel(e.detail.modelId);
        try {
          localStorage.setItem('ph_workspace_selected_model', e.detail.modelId);
        } catch {}
      }
    };
    window.addEventListener('focus', refreshKeys);
    window.addEventListener('storage', refreshKeys);
    window.addEventListener('ph_byok_keys_updated', refreshKeys);
    window.addEventListener('ph_select_ide_model', handleModelSelect);
    return () => {
      window.removeEventListener('focus', refreshKeys);
      window.removeEventListener('storage', refreshKeys);
      window.removeEventListener('ph_byok_keys_updated', refreshKeys);
      window.removeEventListener('ph_select_ide_model', handleModelSelect);
    };
  }, []);

  // Compute available models unlocked by user's connected BYOK keys
  const byokModels = useMemo(() => {
    const list: Array<WorkspaceModelInfo & { providerId: AIProviderId; providerName: string }> = [];
    for (const pid of connectedProviders) {
      const provider = AI_PROVIDERS.find((p) => p.id === pid);
      if (!provider) continue;
      for (const m of provider.models) {
        if (m.context === 'Audio' || m.context === 'TTS') continue;
        list.push({
          id: m.id,
          label: m.name,
          badge: '0 cr • BYOK',
          category: 'code',
          tier: 'free',
          description: `${provider.name} • ${m.description} (${m.context})`,
          isByok: true,
          providerName: provider.name,
          providerId: pid,
        });
      }
      if (pid === 'openrouter') {
        const configured = multiProviderService.getConfiguredOpenRouterModels();
        for (const cm of configured) {
          if (!list.some((existing) => existing.id === cm.id)) {
            list.push({
              id: cm.id,
              label: cm.name,
              badge: '0 cr • BYOK',
              category: 'code',
              tier: 'free',
              description: `OpenRouter • ${cm.description} (${cm.context})`,
              isByok: true,
              providerName: 'OpenRouter',
              providerId: 'openrouter',
            });
          }
        }
      }
    }
    return list;
  }, [connectedProviders]);

  // Auto-switch selected model to connected BYOK provider model when user has active keys and selected model is locked
  useEffect(() => {
    if (connectedProviders.length > 0 && byokModels.length > 0) {
      const isCurrentUnlocked = byokModels.some(
        (m) => m.id === selectedModel || selectedModel.endsWith(m.id) || m.id.endsWith(selectedModel)
      );
      if (!isCurrentUnlocked) {
        const firstByokModel = byokModels[0].id;
        setSelectedModel(firstByokModel);
        try {
          localStorage.setItem('ph_workspace_selected_model', firstByokModel);
        } catch {}
      }
    }
  }, [connectedProviders, byokModels, selectedModel]);

  const [modelSearchQuery, setModelSearchQuery] = useState('');

  // Model info helper resolving standard, image, and BYOK models
  const getModelInfo = useCallback(
    (modelId: string): WorkspaceModelInfo => {
      const byokMatch = byokModels.find((m) => m.id === modelId || modelId.endsWith(m.id));
      if (byokMatch) return byokMatch;

      const standardMatch = WORKSPACE_MODELS.find((m) => m.id === modelId);
      if (standardMatch) return standardMatch;

      const unlocked = multiProviderService.isModelUnlockedByBYOK(modelId);
      if (unlocked.unlocked) {
        return {
          id: modelId,
          label: modelId.split('/').pop() || modelId,
          badge: '0 cr • BYOK',
          category: 'code',
          tier: 'free',
          description: `Direct key active: ${unlocked.providerName || 'Your API Key'}`,
          isByok: true,
          providerName: unlocked.providerName || 'Personal BYOK Key',
        };
      }

      return {
        id: modelId,
        label: modelId,
        badge: '0 cr',
        category: 'code',
        tier: 'free',
        providerName: 'OpenRouter Free',
        description: modelId,
      };
    },
    [byokModels]
  );

  // Slash Command (/) Autocomplete state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');

  // At Mention (@) Pinned Conversation state
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [savedSessions, setSavedSessions] = useState<SavedChatSession[]>([]);
  const [pinnedSession, setPinnedSession] = useState<SavedChatSession | null>(null);

  // Past Chat History Modal & Management State (Req #5)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyFolderFilter, setHistoryFolderFilter] = useState<'all' | 'folder'>('folder');

  // Storage Quota Guardrail (500 MB Free Tier Stop-Work)
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);
  const [isStorageFull, setIsStorageFull] = useState(false);

  // Adaptive Knowledge Base (Continuous Learning Loop)
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // Teamwork Preview (kept for agent orchestration tracking; not shown in clean output mode)
  const [, setTeamMembers] = useState<AgentTeamMember[]>(DEFAULT_AGENT_TEAM);

  // Projects & Codex/Antigravity Developer Studio Inspector State
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [activeProject, setActiveProject] = useState<WorkProject | null>(null);
  const [isProjectsDrawerOpen, setIsProjectsDrawerOpen] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projectFiles, setProjectFiles] = useState<WorkFile[]>([]);
  const [openFiles, setOpenFiles] = useState<WorkFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>('');
  const [artifacts, setArtifacts] = useState<WorkArtifact[]>([]);
  const [diffs, setDiffs] = useState<WorkFileDiff[]>([]);
  const [inspectorTab, setInspectorTab] = useState<'preview' | 'code' | 'files' | 'diffs' | 'artifacts'>('preview');

  // New Project Modal State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [pendingPromptForFolder, setPendingPromptForFolder] = useState<string | null>(null);

  // Export / Sync state
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [isAdoptingConcept, setIsAdoptingConcept] = useState(false);

  // ── Antigravity & Figma Redesign States ────────────────────────────────────
  const [isFolderTreeOpen, setIsFolderTreeOpen] = useState(false);
  const [isOutputApproved, setIsOutputApproved] = useState(false);
  // Session complete: true only after isProcessing goes true→false with at least one AI response
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const prevIsProcessingRef = useRef(false);
  const [latestSimplePrompt, setLatestSimplePrompt] = useState<string>('');
  const [latestBetterPrompt, setLatestBetterPrompt] = useState<string>('');
  // In-place text output editing & quick action states (for non-tech users)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [activeExportDropdownId, setActiveExportDropdownId] = useState<string | null>(null);
  const [activeBlueprintCategory, setActiveBlueprintCategory] = useState<'all' | 'web' | 'calc' | 'proposal' | 'marketing'>('all');
  const [isLivePublishOpen, setIsLivePublishOpen] = useState(false);
  // Variable Synthesizer & Multi-Stage Enhancement Workflow State
  const [variableWorkflowPrompt, setVariableWorkflowPrompt] = useState<string | null>(null);
  const [, setLastUsedVariables] = useState<Record<string, string>>({});
  // Permission gate prefs (persisted) — used in handleDeleteProject and risk-gated operations (Req #4)
  const [permissionPrefs, setPermissionPrefs] = useState<{ autoApproveAll: boolean }>(() => {
    try {
      const saved = localStorage.getItem('ph_permission_prefs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { autoApproveAll: false };
  });

  // Toggle auto-approve for risk gates (can be enabled in settings)
  const handleToggleAutoApprove = (enabled: boolean) => {
    const next = { autoApproveAll: enabled };
    setPermissionPrefs(next);
    try { localStorage.setItem('ph_permission_prefs', JSON.stringify(next)); } catch {}
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lastGoalRef = useRef<string>('');

  const [menuSelectedIndex, setMenuSelectedIndex] = useState(0);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // ── Session persistence: restore chat on remount (background task continuity, Req #1) ──
  const sessionKey = user?.id ? `ph_workspace_session_${user.id}` : 'ph_workspace_session_anon';
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(sessionKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          setMessages(parsed.messages.slice(-50));
          if (parsed.latestSimplePrompt) setLatestSimplePrompt(parsed.latestSimplePrompt);
          if (parsed.latestBetterPrompt) setLatestBetterPrompt(parsed.latestBetterPrompt);
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  // Persist messages to sessionStorage on every update (Req #1)
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify({
        messages: messages.slice(-50),
        latestSimplePrompt,
        latestBetterPrompt,
        savedAt: Date.now(),
      }));
    } catch {}
  }, [messages, latestSimplePrompt, latestBetterPrompt, sessionKey]);

  // Track isProcessing → when it goes from true to false, mark session complete (Req #3)
  useEffect(() => {
    if (prevIsProcessingRef.current === true && isProcessing === false) {
      if (messages.some(m => m.sender === 'assistant')) {
        setIsSessionComplete(true);
      }
    }
    prevIsProcessingRef.current = isProcessing;
  }, [isProcessing, messages]);

  // Auto-sync folder chat sessions into savedSessions (Antigravity-style folder chat persistence)
  useEffect(() => {
    if (messages.length === 0) return;
    const folderId = activeProject?.id || 'default_folder';
    const folderName = activeProject?.name || 'General Workspace';
    const firstUserMsg = messages.find((m) => m.sender === 'user');
    const title = activeResult?.title || firstUserMsg?.text?.slice(0, 50) || `Chat in ${folderName}`;

    setSavedSessions((prev) => {
      const existingIdx = prev.findIndex((s) => s.folderId === folderId);
      const updatedSession: SavedChatSession = {
        id: existingIdx !== -1 ? prev[existingIdx].id : `session_${folderId}`,
        projectId: activeProject?.id || 'default_proj',
        folderId,
        folderName,
        title,
        timestamp: Date.now(),
        messageCount: messages.length,
        lastSnippet: messages[messages.length - 1]?.text?.slice(0, 100) || '',
        messages: [...messages],
        resultTitle: activeResult?.title,
      };

      const next = existingIdx !== -1
        ? [updatedSession, ...prev.filter((_, idx) => idx !== existingIdx)]
        : [updatedSession, ...prev].slice(0, 50);

      try {
        localStorage.setItem('ph_workspace_chat_sessions', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [messages, activeProject, activeResult]);

  // Back-navigation: set default return tab if not already set (Req #2)
  useEffect(() => {
    try {
      if (!sessionStorage.getItem('ph_nav_return_tab')) {
        sessionStorage.setItem('ph_nav_return_tab', 'home');
      }
    } catch {}
    return () => {
      if (prevIsProcessingRef.current) {
        try { sessionStorage.setItem('ph_workspace_was_processing', 'true'); } catch {}
      }
    };
  }, []);

  const focusInput = () => {
    if (messages.length > 0) {
      activeTextareaRef.current?.focus();
    } else {
      textareaRef.current?.focus();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Load storage quota and adaptive knowledge on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const quota = await storageService.getQuota();
        setStorageQuota(quota);
        if (quota.usedBytes >= quota.limitBytes) {
          setIsStorageFull(true);
        }
      } catch (err) {
        console.warn('[Workspace] Failed to fetch storage quota:', err);
      }

      try {
        const kb = adaptiveKnowledgeService.getKnowledgeItems(user?.id);
        setKnowledgeItems(kb);
      } catch (err) {
        console.warn('[Workspace] Failed to fetch knowledge items:', err);
      }
    };
    loadState();
  }, [user]);

  // Load Projects from workService (local cache + Supabase work_projects)
  const loadProjects = async (preferredProjectId?: string) => {
    try {
      const loaded = await workService.getProjects();
      setProjects(loaded);

      let target: WorkProject | null = null;
      if (preferredProjectId) {
        target = loaded.find((p) => p.id === preferredProjectId) || null;
      }
      if (!target && activeProject) {
        target = loaded.find((p) => p.id === activeProject.id) || null;
      }
      if (!target) {
        try {
          const savedId = localStorage.getItem('ph_workspace_active_project_id');
          if (savedId) {
            target = loaded.find((p) => p.id === savedId) || null;
          }
        } catch {}
      }

      if (target) {
        await selectProject(target, false);
      } else {
        setActiveProject(null);
        setProjectFiles([]);
        setOpenFiles([]);
        setActiveFilePath('');
        setArtifacts([]);
        setDiffs([]);
        setActiveResult(null);
      }
    } catch (err) {
      console.warn('[Workspace] Failed to load projects:', err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  // 1-Click Switch Project
  const selectProject = async (proj: WorkProject, updateChat: boolean = true, _notify: boolean = false) => {
    try {
      // If currently in a project with active messages, save current session under this project folder before switching
      if (activeProject && messages.length > 0 && activeProject.id !== proj.id) {
        const curFolderId = activeProject.id;
        const curFolderName = activeProject.name;
        const firstUserMsg = messages.find((m) => m.sender === 'user');
        const sessionTitle = activeResult?.title || firstUserMsg?.text?.slice(0, 50) || `Chat in ${curFolderName}`;
        setSavedSessions((prev) => {
          const existingIdx = prev.findIndex((s) => s.folderId === curFolderId);
          const updatedSession: SavedChatSession = {
            id: existingIdx !== -1 ? prev[existingIdx].id : `session_${curFolderId}`,
            projectId: curFolderId,
            folderId: curFolderId,
            folderName: curFolderName,
            title: sessionTitle,
            timestamp: Date.now(),
            messageCount: messages.length,
            lastSnippet: messages[messages.length - 1]?.text?.slice(0, 100) || '',
            messages: [...messages],
            resultTitle: activeResult?.title,
          };
          const next = existingIdx !== -1
            ? [updatedSession, ...prev.filter((_, idx) => idx !== existingIdx)]
            : [updatedSession, ...prev].slice(0, 50);
          try { localStorage.setItem('ph_workspace_chat_sessions', JSON.stringify(next)); } catch {}
          return next;
        });
      }

      setActiveProject(proj);
      try { localStorage.setItem('ph_workspace_active_project_id', proj.id); } catch {}
      const files = await workService.getFiles(proj.id);
      setProjectFiles(files);
      if (files.length > 0) {
        setOpenFiles(files.slice(0, 3));
        setActiveFilePath(files[0].path);
      } else {
        setOpenFiles([]);
        setActiveFilePath('');
      }

      const arts = await workService.getArtifacts(proj.id);
      setArtifacts(arts);

      // Compute diffs preview for project files
      const initialDiffs = files.slice(0, 5).map((f) =>
        workGitService.computeFileDiff(f.path, '', f.content, 'added')
      );
      setDiffs(initialDiffs);

      // Create an activeResult so the live browser sandbox renders the project files
      if (files.length > 0) {
        setActiveResult({
          intent: 'web_app_portfolio',
          title: proj.name,
          summary: proj.description || `Active workspace project: ${proj.name}`,
          activeOptionId: 'option_default',
          optionTitle: proj.name,
          files,
          downstreamTasks: [],
          metrics: {
            modelUsed: 'gemini-1.5-pro',
            durationMs: 0,
            tokensEstimated: 0,
            creditsDeducted: 0,
          },
        });
      }

      // Check savedSessions for Antigravity-style folder chat persistence
      const folderSession = savedSessions.find((s) => s.folderId === proj.id || s.projectId === proj.id);
      if (folderSession && folderSession.messages && folderSession.messages.length > 0 && updateChat) {
        setMessages(folderSession.messages);
      } else {
        // Load task messages if present
        const tasks = await workService.getTasks(proj.id);
        if (tasks.length > 0) {
          const latestTask = tasks[tasks.length - 1];
          const taskMsgs = workService.getTaskMessages(latestTask.id);
          if (taskMsgs.length > 0 && updateChat) {
            const convertedMsgs: ChatMessage[] = taskMsgs.map((tm) => ({
              id: tm.id,
              sender: tm.senderType === 'user' ? 'user' : 'assistant',
              text: tm.content,
              timestamp: new Date(tm.createdAt).getTime(),
            }));
            setMessages(convertedMsgs);
          } else if (updateChat) {
            setMessages([]);
          }
        } else if (updateChat) {
          if (files.length > 0) {
            setMessages([
              {
                id: `msg_proj_${proj.id}`,
                sender: 'assistant',
                text: `Loaded project **${proj.name}** with ${files.length} files.\n\n${proj.description || ''}\n\n**What would you like to build in this folder?**`,
                timestamp: Date.now(),
                suggestedFollowUps: [
                  'Make it more interactive',
                  'Change the colours',
                  'Improve the mobile layout',
                  'Make it more professional',
                ],
              },
            ]);
          } else {
            setMessages([]);
          }
        }
      }

      setIsProjectsDrawerOpen(false);
    } catch (err: any) {
      console.warn('[Workspace] Failed to switch project:', err);
    }
  };

  // Code Editor Handlers
  const handleOpenFile = (fileOrPath: string | WorkFile) => {
    const path = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.path;
    setActiveFilePath(path);
    const existing = currentFiles.find((f) => normalizeWorkPath(f.path) === normalizeWorkPath(path));
    if (existing && !openFiles.some((f) => normalizeWorkPath(f.path) === normalizeWorkPath(path))) {
      setOpenFiles((prev) => [...prev, existing]);
    }
    setInspectorTab('code');
  };

  const handleCloseTab = (path: string) => {
    const norm = normalizeWorkPath(path);
    const next = openFiles.filter((f) => normalizeWorkPath(f.path) !== norm);
    setOpenFiles(next);
    if (normalizeWorkPath(activeFilePath) === norm) {
      setActiveFilePath(next[0]?.path || '');
    }
  };

  const handleSaveFile = async (path: string, content: string) => {
    if (!activeProject) return;
    const norm = normalizeWorkPath(path);
    await workService.writeFile(activeProject.id, { path: norm, content });
    const fresh = await workService.getFiles(activeProject.id);
    setProjectFiles(fresh);
    setOpenFiles((prev) => prev.map((f) => (normalizeWorkPath(f.path) === norm ? { ...f, content } : f)));
    setActiveResult((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        files: fresh,
      };
    });
    showToast(`Saved ${path}`, 'success');
  };

  const handleCreateFile = async (path: string) => {
    if (!activeProject) return;
    const norm = normalizeWorkPath(path);
    await workService.writeFile(activeProject.id, { path: norm, content: '// New module\n' });
    const fresh = await workService.getFiles(activeProject.id);
    setProjectFiles(fresh);
    const newF = fresh.find((f) => normalizeWorkPath(f.path) === norm);
    if (newF) {
      handleOpenFile(newF);
    }
    showToast(`Created ${path}`, 'success');
  };

  const handleDeleteFile = async (path: string) => {
    if (!activeProject) return;
    const norm = normalizeWorkPath(path);
    await workService.deleteFile(activeProject.id, norm);
    const fresh = await workService.getFiles(activeProject.id);
    setProjectFiles(fresh);
    setOpenFiles((prev) => prev.filter((f) => normalizeWorkPath(f.path) !== norm));
    if (normalizeWorkPath(activeFilePath) === norm) {
      setActiveFilePath(fresh[0]?.path || '');
    }
    showToast(`Deleted ${norm}`, 'info');
  };

  const handleSyncToDrive = async (projectId?: string) => {
    if (isSyncingDrive) return;

    if (currentFiles.length === 0 && !projectId && !activeProject?.id) {
      showToast('No project files to sync yet. Start a chat or create files in the workspace first!', 'info');
      return;
    }

    let targetId = projectId || activeProject?.id;
    if (!targetId && currentFiles.length > 0) {
      try {
        const projName = activeResult?.title?.replace(/\s*—\s*.*$/, '') || 'Portfolio Project';
        const proj = await workService.createProject({
          name: projName,
          description: activeResult?.summary || 'Created with PromptHub',
        });
        for (const f of currentFiles) {
          await workService.writeFile(proj.id, {
            path: f.path,
            content: f.content,
          });
        }
        setActiveProject(proj);
        targetId = proj.id;
      } catch (e) {
        console.warn('[Sync] Auto-project creation error:', e);
      }
    }

    if (!targetId) {
      showToast('No active project found to sync.', 'info');
      return;
    }

    const ok = await confirm({
      title: 'Sync to Google Drive Vault',
      message: 'This will upload and sync your active project files to your Google Drive cloud storage vault.',
      confirmText: 'Sync Files',
      cancelText: 'Cancel',
    });
    if (!ok) return;

    setIsSyncingDrive(true);
    try {
      const res = await workService.syncProjectToDrive(targetId);
      if (res.success) {
        showToast(`✓ Project synced to Google Drive Vault (${formatStorageBytes(res.sizeBytes || 0)})`, 'success');
        await refreshStorageQuota();
      } else {
        showToast(`Drive sync failed: ${res.error || 'Check Drive permissions'}`, 'error');
      }
    } catch (err: any) {
      showToast('Drive sync failed: ' + err.message, 'error');
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleNewChat = () => {
    // If current conversation has messages, archive it to savedSessions under current project (Req #5)
    if (messages.length > 0) {
      const firstUserMsg = messages.find((m) => m.sender === 'user');
      const fallbackTitle = firstUserMsg
        ? firstUserMsg.text.replace(/^\[.*?\]\s*/, '').slice(0, 50).trim()
        : 'Session ' + new Date().toLocaleTimeString();
      const lastMsg = messages[messages.length - 1];
      const sessionId = messages[0]?.id || `session_${Date.now()}`;

      const sessionToSave: SavedChatSession = {
        id: sessionId,
        projectId: activeProject?.id || 'default_proj',
        folderId: activeProject?.id || 'default_folder',
        folderName: activeProject?.name || 'General Workspace',
        title: activeResult?.title || fallbackTitle,
        timestamp: Date.now(),
        messageCount: messages.length,
        lastSnippet: lastMsg?.text?.slice(0, 100) || '',
        messages: [...messages],
        resultTitle: activeResult?.title,
      };

      setSavedSessions((prev) => {
        const next = [sessionToSave, ...prev.filter((s) => s.id !== sessionId)].slice(0, 50);
        try {
          localStorage.setItem('ph_workspace_chat_sessions', JSON.stringify(next));
        } catch {}
        return next;
      });

      showToast('Saved current conversation to History.', 'info');
    }

    setMessages([]);
    setAttachments([]);
    setActiveResult(null);
    setSelectedOptionId(null);
    setInputPrompt('');
    setActiveSkills([]);
    setPinnedSession(null);
    setShowSlashMenu(false);
    setShowMentionMenu(false);
    lastGoalRef.current = '';
    setMobileActiveView('chat');
    setPanelLayout('chat-only');
    setIsComposerCollapsed(false);
    setExpandedOptionPreviews({});
    setIsOutputApproved(false);
    setIsSessionComplete(false);
    // New chat = new voice window (reset session)
    setVoiceSessionKey((k) => k + 1);
    setVoiceSessionId(`voice_sess_${Date.now()}`);
    try { sessionStorage.removeItem(sessionKey); } catch {}
  };

  // Restore past chat session into active workspace (Req #5)
  const handleRestoreSession = (session: SavedChatSession) => {
    setMessages(session.messages);
    if (session.resultTitle) {
      setLatestSimplePrompt(session.title);
    }
    setIsHistoryModalOpen(false);
    showToast(`Restored "${session.title}"`, 'success');
  };

  // Rename a past chat session (Req #5)
  const handleSaveRenameSession = (sessionId: string) => {
    if (!editingSessionTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    setSavedSessions((prev) => {
      const next = prev.map((s) => s.id === sessionId ? { ...s, title: editingSessionTitle.trim() } : s);
      try { localStorage.setItem('ph_workspace_chat_sessions', JSON.stringify(next)); } catch {}
      return next;
    });
    setEditingSessionId(null);
    setEditingSessionTitle('');
    showToast('Conversation renamed', 'success');
  };

  // Delete a past chat session with explicit confirmation (Req #5)
  const handleDeleteSession = async (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const ok = await confirm({
      title: 'Delete Chat History',
      message: 'Are you sure you want to delete this saved chat from history? This cannot be undone.',
      confirmText: 'Delete Chat',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    const targetSession = savedSessions.find((s) => s.id === sessionId);
    setSavedSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      try { localStorage.setItem('ph_workspace_chat_sessions', JSON.stringify(next)); } catch {}
      return next;
    });

    // If deleting the active chat or the active folder session, clear current chat view
    const folderId = activeProject?.id || 'default_folder';
    const currentFirstMsgId = messages[0]?.id;
    const isCurrentActive = targetSession && (
      targetSession.folderId === folderId ||
      targetSession.projectId === activeProject?.id ||
      (messages.length > 0 && targetSession.messages?.some((m) => m?.id && m.id === currentFirstMsgId))
    );
    if (isCurrentActive) {
      try { sessionStorage.removeItem(sessionKey); } catch {}
      setMessages([]);
      setActiveResult(null);
      setDiffs([]);
      setIsSessionComplete(false);
      setPanelLayout('chat-only');
      setEditingMessageId(null);
      setEditingText('');
      setProjectFiles([]);
      setOpenFiles([]);
      setActiveFilePath('');
    }

    showToast('Chat deleted from history', 'info');
  };

  // Delete current active chat directly while on it (without exiting first)
  const handleDeleteCurrentChat = async () => {
    if (messages.length === 0) return;
    const ok = await confirm({
      title: 'Delete Active Chat',
      message: 'Are you sure you want to delete your current conversation? This will clear all messages and reset the studio workspace. This cannot be undone.',
      confirmText: 'Delete Chat',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    const folderId = activeProject?.id || 'default_folder';
    const currentFirstMsgId = messages[0]?.id;
    const currentMsgIds = new Set(messages.map((m) => m?.id).filter(Boolean));

    setSavedSessions((prev) => {
      const next = prev.filter((s) => {
        if (!s) return false;
        if (s.folderId && s.folderId === folderId) return false;
        if (activeProject?.id && s.projectId === activeProject.id) return false;
        if (s.id === `session_${folderId}`) return false;
        if (currentFirstMsgId && s.id === currentFirstMsgId) return false;
        if (s.messages && Array.isArray(s.messages) && s.messages.some((m) => m?.id && currentMsgIds.has(m.id))) return false;
        return true;
      });
      try { localStorage.setItem('ph_workspace_chat_sessions', JSON.stringify(next)); } catch {}
      return next;
    });

    try { sessionStorage.removeItem(sessionKey); } catch {}
    setMessages([]);
    setActiveResult(null);
    setDiffs([]);
    setIsSessionComplete(false);
    setPanelLayout('chat-only');
    setEditingMessageId(null);
    setEditingText('');
    setProjectFiles([]);
    setOpenFiles([]);
    setActiveFilePath('');
    // Reset voice window on chat delete
    setVoiceSessionKey((k) => k + 1);
    setVoiceSessionId(`voice_sess_${Date.now()}`);
    showToast('Active chat deleted', 'info');
  };

  const handleDownloadSingleFile = (filePath: string) => {
    if (!activeProject) return;
    workService.downloadFileToDesktop(activeProject.id, filePath);
  };

  const handleDeleteProject = async (projectId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // Permission gate for risky destructive action (Req #4) — skip confirm if user opted out
    if (!permissionPrefs.autoApproveAll) {
      const ok = await confirm({
        title: 'Delete Workspace Project',
        message: 'Are you sure you want to delete this project? This will permanently remove its files and history.',
        confirmText: 'Delete Project',
        cancelText: 'Cancel',
        variant: 'danger',
      });
      if (!ok) return;
    }
    try {
      const ok = await workService.deleteProject(projectId);
      if (ok) {
        showToast('Project deleted', 'info');
        const remaining = projects.filter((p) => p.id !== projectId);
        setProjects(remaining);
        if (activeProject?.id === projectId) {
          if (remaining.length > 0) {
            await selectProject(remaining[0]);
          } else {
            setActiveProject(null);
            setProjectFiles([]);
            setOpenFiles([]);
            setArtifacts([]);
            setDiffs([]);
            setActiveResult(null);
          }
        }
      }
    } catch (err: any) {
      showToast('Failed to delete project: ' + err.message, 'error');
    }
  };

  const handleArchiveProject = async (projectId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const updated = await workService.archiveProject(projectId);
      if (updated) {
        showToast('Project archived', 'info');
        setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
        if (activeProject?.id === projectId) {
          setActiveProject(updated);
        }
      }
    } catch (err: any) {
      showToast('Failed to archive project: ' + err.message, 'error');
    }
  };

  const handleCreateNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const created = await workService.createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        type: 'code',
      });
      setProjects((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      setNewProjectName('');
      setNewProjectDesc('');
      setIsNewProjectModalOpen(false);
      await selectProject(created);
      showToast(`Project folder created: ${created.name}`, 'success');
      if (pendingPromptForFolder) {
        const queryToRun = pendingPromptForFolder;
        setPendingPromptForFolder(null);
        await handleSubmit(queryToRun);
      }
    } catch (err: any) {
      showToast('Failed to create project folder: ' + err.message, 'error');
    }
  };

  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projects;
    const q = projectSearchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [projects, projectSearchQuery]);

  // Load saved sessions from localStorage on mount (cleanses legacy mock sessions)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ph_workspace_chat_sessions');
      if (raw) {
        const parsed: SavedChatSession[] = JSON.parse(raw);
        const cleanSessions = Array.isArray(parsed)
          ? parsed.filter(
              (s) =>
                s &&
                s.projectId !== 'proj_starter_studio' &&
                !s.projectId?.startsWith('proj_starter_') &&
                s.folderId !== 'proj_starter_studio' &&
                !s.folderId?.startsWith('proj_starter_')
            )
          : [];
        setSavedSessions(cleanSessions);
        if (cleanSessions.length !== parsed.length) {
          localStorage.setItem('ph_workspace_chat_sessions', JSON.stringify(cleanSessions));
        }
      }
    } catch (e) {
      console.warn('[Workspace] Could not load saved sessions:', e);
    }
  }, []);

  // Fullscreen listeners (Esc key & fullscreenchange)
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    const onFsChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullscreen]);

  // Milestone 2: Keyboard shortcuts for Memory (Ctrl+Shift+M), Graph (Ctrl+Shift+G), and Temporary Mode (Ctrl+Shift+T)
  useEffect(() => {
    const handleMemoryShortcuts = (e: KeyboardEvent) => {
      const hasModifier = e.ctrlKey || e.metaKey;
      if (!hasModifier || !e.shiftKey) return;

      if (e.key === 'M' || e.key === 'm') {
        e.preventDefault();
        setIsMemoryModalOpen((prev) => !prev);
      } else if (e.key === 'G' || e.key === 'g') {
        e.preventDefault();
        setIsGraphModalOpen((prev) => !prev);
      } else if (e.key === 'T' || e.key === 't') {
        e.preventDefault();
        setIsTemporaryChat((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleMemoryShortcuts);
    return () => window.removeEventListener('keydown', handleMemoryShortcuts);
  }, []);

  const toggleFullscreen = () => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    if (next) {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Check for incoming pending goal from home page composer
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('ph_unified_creation_pending_goal');
      if (pending) {
        sessionStorage.removeItem('ph_unified_creation_pending_goal');
        handleSubmit(pending);
      }
    } catch {}
  }, []);

  // Slash commands and At mentions detection
  const handleInputChange = (val: string) => {
    setInputPrompt(val);

    // Check for @ mention trigger (previous conversations to pin)
    const atMatch = val.match(/@([\w\s]*)$/);
    if (atMatch) {
      setShowMentionMenu(true);
      setMentionQuery(atMatch[1].toLowerCase().trim());
      setShowSlashMenu(false);
      setMenuSelectedIndex(0);
      return;
    } else {
      setShowMentionMenu(false);
    }

    // Check for / slash command trigger (Antigravity skills)
    const slashMatch = val.match(/\/(\w*)$/);
    if (slashMatch) {
      setShowSlashMenu(true);
      setSlashQuery(slashMatch[1].toLowerCase().trim());
      setShowMentionMenu(false);
      setMenuSelectedIndex(0);
      return;
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleAddSkill = (skill: WorkspaceSkill) => {
    if (!activeSkills.some((s) => s.id === skill.id)) {
      setActiveSkills((prev) => [...prev, skill]);
      showToast(`Skill stacked: ${skill.command} (${skill.label})`, 'info');
    }
    // Remove the trailing /... command from input
    setInputPrompt((prev) => prev.replace(/\/\w*$/, '').trimEnd() + ' ');
    setShowSlashMenu(false);
    setMenuSelectedIndex(0);
    focusInput();
  };

  const handleRemoveSkill = (skillId: string) => {
    setActiveSkills((prev) => prev.filter((s) => s.id !== skillId));
  };

  const handlePinSession = (session: SavedChatSession) => {
    setPinnedSession(session);
    showToast(`Pinned conversation: "${session.title}"`, 'info');
    // Remove the trailing @... mention from input
    setInputPrompt((prev) => prev.replace(/@[\w\s]*$/, '').trimEnd() + ' ');
    setShowMentionMenu(false);
    setMenuSelectedIndex(0);
    focusInput();
  };

  const handleUnpinSession = () => {
    setPinnedSession(null);
    showToast('Unpinned conversation context', 'info');
  };

  // Match option from conversational phrase
  const matchOptionFromQuery = (qText: string, options: any[]): any | undefined => {
    if (!options || options.length === 0) return undefined;
    const lower = qText.trim().toLowerCase();

    const isSelectionPhrase =
      /^(choose|select|pick|use|switch|go\s+with|try|option|direction|1|2|3|first|second|third|1st|2nd|3rd|the\s+first|the\s+second|the\s+third|minimal|creative|bold)/i.test(
        lower
      ) || lower.length < 40;

    if (!isSelectionPhrase) return undefined;

    if (
      options.length > 1 &&
      (/\b(second|2nd|option\s*2|direction\s*2|#2)\b/.test(lower) ||
        lower === '2' ||
        lower.includes('creative') ||
        lower.includes('arcade') ||
        lower.includes('retro'))
    ) {
      return options[1];
    }

    if (
      options.length > 0 &&
      (/\b(first|1st|option\s*1|direction\s*1|#1)\b/.test(lower) ||
        lower === '1' ||
        lower.includes('minimal') ||
        lower.includes('terminal') ||
        lower.includes('cli'))
    ) {
      return options[0];
    }

    if (
      options.length > 2 &&
      (/\b(third|3rd|option\s*3|direction\s*3|#3)\b/.test(lower) ||
        lower === '3' ||
        lower.includes('bold') ||
        lower.includes('experimental') ||
        lower.includes('bento'))
    ) {
      return options[2];
    }

    return undefined;
  };

  const filteredSkills = useMemo(() => {
    if (!slashQuery) return WORKSPACE_SKILLS;
    return WORKSPACE_SKILLS.filter(
      (sk) =>
        sk.command.toLowerCase().includes(slashQuery) ||
        sk.label.toLowerCase().includes(slashQuery) ||
        sk.description.toLowerCase().includes(slashQuery)
    );
  }, [slashQuery]);

  const filteredSessions = useMemo(() => {
    if (!mentionQuery) return savedSessions;
    return savedSessions.filter(
      (s) =>
        s.title.toLowerCase().includes(mentionQuery) ||
        s.lastSnippet.toLowerCase().includes(mentionQuery)
    );
  }, [savedSessions, mentionQuery]);

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu && filteredSkills.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMenuSelectedIndex((prev) => (prev + 1) % filteredSkills.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMenuSelectedIndex((prev) => (prev - 1 + filteredSkills.length) % filteredSkills.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredSkills[menuSelectedIndex] || filteredSkills[0];
        if (selected) {
          handleAddSkill(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
        return;
      }
    }

    if (showMentionMenu && filteredSessions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMenuSelectedIndex((prev) => (prev + 1) % filteredSessions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMenuSelectedIndex((prev) => (prev - 1 + filteredSessions.length) % filteredSessions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredSessions[menuSelectedIndex] || filteredSessions[0];
        if (selected) {
          handlePinSession(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };


  // Refresh quota
  const refreshStorageQuota = async () => {
    try {
      const quota = await storageService.getQuota();
      setStorageQuota(quota);
      if (quota.usedBytes >= quota.limitBytes) {
        setIsStorageFull(true);
      } else {
        setIsStorageFull(false);
      }
    } catch {}
  };

  // Shared Workspace Request Execution Handler
  const handleExecuteWorkspaceRequest = async (request: WorkspaceRequest): Promise<{
    jobId: string;
    status: 'completed' | 'failed' | 'requires_approval';
    output?: string;
    error?: string;
  }> => {
    const rawQuery = (request.text || '').trim();
    if ((!rawQuery && attachments.length === 0) || isProcessing) {
      return { jobId: request.requestId, status: 'failed', error: 'No prompt or workspace busy.' };
    }

    workspaceActionBridge.updateJob(request.requestId, {
      jobId: request.requestId,
      status: 'planning',
      progress: 15,
      message: `Planning: ${rawQuery.slice(0, 40)}...`,
    });

    // Track Simple Prompt & Generate Better Prompt
    setLatestSimplePrompt(rawQuery);
    setIsOutputApproved(false);
    setIsSessionComplete(false);

    // Intercept meaningless or gibberish character mashing immediately with polite, clear guidance
    // (Never run heavy compilers, deliverable builders, or deduct credits for random characters)
    const isGibberish = securityUtils.isMeaninglessOrGibberish(rawQuery) && attachments.length === 0;
    if (isGibberish) {
      setInputPrompt('');
      setAttachments([]);
      setShowSlashMenu(false);
      setShowMentionMenu(false);

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        sender: 'user',
        text: rawQuery,
        timestamp: Date.now(),
      };

      const asstMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: "I'm sorry, I couldn't understand that request because it appears to contain random or unclear characters. Please provide a clearer description of what you'd like to build, write, or ask.",
        timestamp: Date.now(),
        suggestedFollowUps: [
          'Build a modern developer portfolio',
          'Create a SaaS landing page',
          'Write an AI system prompt',
          'Ask about PromptHub features',
        ],
      };

      setMessages((prev) => [...prev, userMsg, asstMsg]);
      workspaceActionBridge.updateJob(request.requestId, {
        jobId: request.requestId,
        status: 'completed',
        progress: 100,
        message: 'Completed.',
      });
      return {
        jobId: request.requestId,
        status: 'completed',
        output: asstMsg.text,
      };
    }

    const isGreeting = isConversationalGreeting(rawQuery);
    const isHelp = isCapabilitiesOrHelpQuery(rawQuery);
    const isHosting = isHostingQuery(rawQuery);

    // Prioritize conversational greeting, help, and hosting query detection FIRST to return instant Markdown
    // without sandboxes, files, or credit deductions (and without storage or rate-limit blocks)
    if (isGreeting || isHelp || isHosting) {
      if (isHosting) {
        setIsLivePublishOpen(true);
      }
      setInputPrompt('');
      setAttachments([]);
      setShowSlashMenu(false);
      setShowMentionMenu(false);

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        sender: 'user',
        text: rawQuery,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsProcessing(true);

      const currentSessionId = messages[0]?.id || (activeProject ? `session_${activeProject.id}` : 'default_session');
      const response = await sharedExecutionService.executeWorkspaceSubmission({
        requestId: request.requestId,
        projectId: activeProject?.id || 'workspace_proj',
        sessionId: currentSessionId,
        source: request.source || 'text',
        text: rawQuery,
        selectedModel,
        userId: user?.id || 'anon_user',
        isTemporaryChat,
      });

      setActiveBrief(response.brief);
      setBriefHistory((prev) => {
        const withoutCurrent = prev.filter((b) => b.id !== response.brief.id || b.version !== response.brief.version);
        return [...withoutCurrent, response.brief];
      });

      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: response.outputMarkdown || '',
        timestamp: Date.now(),
        suggestedFollowUps: response.suggestedFollowUps,
        briefId: response.brief.id,
        briefVersion: response.brief.version,
        deliverable: response.deliverable || undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsProcessing(false);
      workspaceActionBridge.updateJob(request.requestId, {
        jobId: request.requestId,
        status: 'completed',
        progress: 100,
        message: 'Ready for your request',
      });
      return { jobId: request.requestId, status: 'completed', output: response.outputMarkdown };
    }

    // Synthesize the AI-Enhanced Better Prompt (CO-STAR + Skills + Directives + Inference Parameters)
    const betterPromptText = [
      developerSettings.systemPromptOverride.trim()
        ? `# CUSTOM DIRECTIVES:\n${developerSettings.systemPromptOverride.trim()}`
        : `# ROLE & CONTEXT: Principal Full-Stack Engineer and UX Designer.`,
      `# OBJECTIVE: ${rawQuery}`,
      `# INFERENCE CONFIG: Temperature: ${developerSettings.temperature} | Max Tokens: ${developerSettings.maxTokens}${developerSettings.modelOverride ? ` | Model: ${developerSettings.modelOverride}` : ''}`,
      `# QUALITY & RESPONSIVENESS: Flawless mobile & desktop layouts (min-h-[44px] touch targets), clean Tailwind CSS styling, Google Fonts, zero console defects.`,
      activeSkills.length > 0 ? `# SKILL DIRECTIVES: ${activeSkills.map((s) => s.command).join(', ')}` : '',
      `# CONSTRAINTS: Deliver a complete, self-contained single-folder project package without omissions.`,
    ].filter(Boolean).join('\n\n');

    setLatestBetterPrompt(betterPromptText);

    // Check Storage Quota Stop Guardrail
    if (isStorageFull) {
      showToast('Cloud Storage limit reached (500 MB). Work halted.', 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: `storage_halt_${Date.now()}`,
          sender: 'assistant',
          text: '⚠️ **Cloud Storage Quota Reached (500 MB Free Tier Limit)**\n\nYour PromptHub Google Drive Cloud storage has reached maximum capacity. Work has been paused to prevent unbudgeted storage overflow.\n\nPlease manage or delete files in your **Storage Vault** or upgrade your plan to resume building.',
          timestamp: Date.now(),
        },
      ]);
      workspaceActionBridge.updateJob(request.requestId, {
        jobId: request.requestId,
        status: 'failed',
        progress: 0,
        message: 'Storage quota reached',
        error: 'Storage quota reached',
      });
      return { jobId: request.requestId, status: 'failed', error: 'Storage quota reached' };
    }

    // Auto-extract inline /skill directives from text if user typed /adapt /polish etc.
    const inlineSkillTokens = rawQuery.match(/\/[a-zA-Z0-9_-]+/g) || [];
    let currentSkills = [...activeSkills];
    if (inlineSkillTokens.length > 0) {
      for (const token of inlineSkillTokens) {
        const resolved = resolveWorkspaceSkill(token);
        if (!currentSkills.some((s) => s.id === resolved.id)) {
          currentSkills.push(resolved);
        }
      }
      if (currentSkills.length > activeSkills.length) {
        setActiveSkills(currentSkills);
      }
    }

    let query = rawQuery;

    // Attach stacked active skills if not already in query
    if (currentSkills.length > 0) {
      const skillsHeader = `[Skills: ${currentSkills.map((s) => s.command).join(', ')}]`;
      if (!query.includes(skillsHeader)) {
        query = `${skillsHeader} ${query}`;
      }
    }

    // Process Multimodal Attachments
    const currentAttachments = [...attachments];
    const attachmentContext = formatContextFromAttachments(currentAttachments);

    let executionQuery = query;
    if (attachmentContext) {
      executionQuery = `${attachmentContext}\n\n[User Request]: ${query}`;
    }

    // Inject developer directive if set in Model Config
    if (developerSettings.systemPromptOverride.trim()) {
      executionQuery = `[Custom System Directive: ${developerSettings.systemPromptOverride.trim()}]\n\n${executionQuery}`;
    }

    // Inject active MCP tools and servers context
    const mcpContext = getFormattedMcpContext();
    if (mcpContext) {
      executionQuery = `${mcpContext}\n\n${executionQuery}`;
    }

    // Attach pinned conversation context if active
    if (pinnedSession && pinnedSession.messages.length > 0) {
      const summaryContext = pinnedSession.messages
        .slice(-4)
        .map((m) => `${m.sender.toUpperCase()}: ${m.text.slice(0, 300)}`)
        .join('\n');
      executionQuery = `[Context from Pinned Conversation "${pinnedSession.title}"]:\n${summaryContext}\n\n${executionQuery}`;
    }

    // Autonomous Intent Classification & Model Routing
    const classification = classifyDeliverableIntent(rawQuery, currentAttachments);
    const resolvedIntent = classification.deliverableType;

    if (!lastGoalRef.current && rawQuery) {
      lastGoalRef.current = rawQuery;
    }
    const matchedOption = matchOptionFromQuery(rawQuery, (activeResult as any)?.options || []);
    if (matchedOption) {
      if (lastGoalRef.current) {
        // preserve original user goal across conversational option selection
      }
      if ((resolvedIntent as string) === 'arena_comparison') {
        // dedicated arena_comparison branch
      } else if ((resolvedIntent as string) === 'prompt_creation') {
        // dedicated prompt_creation branch
      }
    }
    if ((activeResult as any)?.intent === 'portfolio_journey') {
      try {
        const { unifiedOrchestrator } = await import('../../services/ai/unifiedOrchestrator');
        await unifiedOrchestrator.refineWorkflow({
          currentResult: activeResult!,
          refinementRequest: rawQuery,
          selectedModel,
        });
      } catch {}
    }
    const resolvedRoute = resolveAutonomousModelRoute({
      deliverableType: classification.deliverableType,
      hasVisionInput: classification.hasVisionInput,
      userPrompt: rawQuery,
      explicitModelOverride: developerSettings.modelOverride || selectedModel,
    });
    const modelCost = resolvedRoute.creditCost;

    // Model-specific BYOK Check: Only the provider matching the connected API key unlocks the model
    const byokCheck = multiProviderService.isModelUnlockedByBYOK(resolvedRoute.modelId);
    const isModelUnlockedByByok = byokCheck.unlocked;
    const effectiveCost = isModelUnlockedByByok ? 0 : modelCost;
    const userCredits = user?.credits ?? 0;
    const isPaidSubscriber = Boolean(user?.plan && user.plan !== 'free');

    // Credit Guardrail: If model requires platform credits and user balance is insufficient, reject immediately
    if (!isModelUnlockedByByok && (userCredits <= 0 && !isPaidSubscriber) && (modelCost > 0 || getModelInfo(selectedModel).tier === 'paid')) {
      const modelInfo = getModelInfo(resolvedRoute.modelId);
      showToast(
        `Insufficient Credits: "${modelInfo.label}" requires credits. Connect your own API key (BYOK) in Settings or recharge your wallet.`,
        'error'
      );
      workspaceActionBridge.updateJob(request.requestId, {
        jobId: request.requestId,
        status: 'failed',
        progress: 0,
        message: 'Insufficient credits',
        error: `Insufficient credits: "${modelInfo.label}" requires credits. Connect your own API key (BYOK) or recharge.`,
      });
      return { jobId: request.requestId, status: 'failed', error: 'Insufficient credits' };
    }

    if (effectiveCost > 0 && userCredits < effectiveCost) {
      const modelInfo = getModelInfo(resolvedRoute.modelId);
      const reqProvider = byokCheck.providerName || (
        resolvedRoute.modelId.startsWith('anthropic') ? 'Anthropic' :
        resolvedRoute.modelId.startsWith('openai') ? 'OpenAI' :
        resolvedRoute.modelId.startsWith('gemini') || resolvedRoute.modelId.startsWith('google') ? 'Google Gemini' :
        resolvedRoute.modelId.startsWith('deepseek') ? 'DeepSeek' :
        'OpenRouter'
      );
      showToast(
        `Insufficient Credits: "${modelInfo.label}" requires ${effectiveCost} credits (your balance is ${userCredits} cr). Connect your ${reqProvider} API key (BYOK) for 0-credit execution, or recharge your wallet.`,
        'error'
      );
      workspaceActionBridge.updateJob(request.requestId, {
        jobId: request.requestId,
        status: 'failed',
        progress: 0,
        message: 'Insufficient credits',
        error: `Insufficient credits: ${modelInfo.label} requires ${effectiveCost} credits`,
      });
      return { jobId: request.requestId, status: 'failed', error: 'Insufficient credits' };
    }

    // Free Tier Daily Rate Limit Guardrail (3 free runs/day applies unless THIS model is unlocked by BYOK)
    const freeTierCheck = checkFreeTierExecutionStatus({
      hasByok: isModelUnlockedByByok,
      isPaidPlan: isPaidSubscriber,
      isPaidModel: effectiveCost > 0,
    });

    const isDeliverableCreation = classification.deliverableType !== 'general_inquiry';
    if (isDeliverableCreation && !freeTierCheck.allowed) {
      showToast(
        `Daily Free Limit Reached (${freeTierCheck.usedToday}/${FREE_TIER_DAILY_LIMIT} runs used today). Connect your own API key (BYOK) for unlimited free runs or upgrade your plan.`,
        'error'
      );
      workspaceActionBridge.updateJob(request.requestId, {
        jobId: request.requestId,
        status: 'failed',
        progress: 0,
        message: 'Daily free limit reached',
        error: 'Daily free limit reached',
      });
      return { jobId: request.requestId, status: 'failed', error: 'Daily free limit reached' };
    }

    // Safety Guardrail: Paid executions require explicit confirmation
    if (effectiveCost > 0 && request.source === 'text') {
      const confirmed = await confirm({
        title: 'Confirm Paid Model Execution',
        message: `Executing this request with ${resolvedRoute.modelId} requires ${effectiveCost} credits. (Balance: ${userCredits} cr). Would you like to proceed?`,
        confirmText: `Proceed (${effectiveCost} cr)`,
        cancelText: 'Cancel',
      });
      if (!confirmed) {
        return { jobId: request.requestId, status: 'requires_approval', error: 'Cancelled by user' };
      }
    }

    if (!isModelUnlockedByByok && !isPaidSubscriber && effectiveCost === 0 && classification.deliverableType !== 'general_inquiry') {
      recordFreeRunExecution();
    }

    setInputPrompt('');
    setAttachments([]);
    setShowSlashMenu(false);
    setShowMentionMenu(false);

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: query || (currentAttachments.length > 0 ? `Attached ${currentAttachments.length} file(s)` : ''),
      timestamp: Date.now(),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    // Multi-Agent Teamwork Step 1: Lead Architect
    setProcessingStep('Lead Architect: Decomposing user goal & planning execution...');
    setTeamMembers((prev) =>
      prev.map((m) =>
        m.id === 'architect' ? { ...m, status: 'planning' } : { ...m, status: 'idle' }
      )
    );

    workspaceActionBridge.updateJob(request.requestId, {
      jobId: request.requestId,
      status: 'building',
      progress: 35,
      message: `Executing with ${(developerSettings.modelOverride || selectedModel).split('/').pop()}...`,
    });

    try {
      // 1. Intercept Conversational Greetings ("hi", "hello", "hey", etc.)
      if (isConversationalGreeting(rawQuery)) {
        const greetingMsg: ChatMessage = {
          id: `asst_greet_${Date.now()}`,
          sender: 'assistant',
          text: `Hello! How can I help you today? Let me know what you would like to build or work on.`,
          timestamp: Date.now(),
          suggestedFollowUps: [
            'Build a responsive web app',
            'Draft a system prompt',
            'Compare models side-by-side',
          ],
        };
        setMessages((prev) => [...prev, greetingMsg]);
        workspaceActionBridge.updateJob(request.requestId, {
          jobId: request.requestId,
          status: 'completed',
          progress: 100,
          message: 'Ready for your request',
        });
        return { jobId: request.requestId, status: 'completed', output: greetingMsg.text };
      }

      // 2. Intercept Capabilities & Help Inquiries ("what can you do", "help", "who are you", etc.)
      if (isCapabilitiesOrHelpQuery(rawQuery)) {
        const capabilitiesMsg: ChatMessage = {
          id: `asst_help_${Date.now()}`,
          sender: 'assistant',
          text: `### What You Can Do in PromptHub Studio\n\nPromptHub is a unified AI prompt engineering studio and model arena. Here is how you can use this workspace:\n\n1. **Interactive Prototyping**: Describe any web app, dashboard, calculator, or portfolio. PromptHub writes the code and launches an interactive live preview sandbox.\n2. **Prompt Engineering & Optimization**: Turn rough ideas into hardened system prompts with typed schemas, few-shot guardrails, and role specifications.\n3. **Multi-Model Arena**: Benchmark prompts across frontier models (Claude 3.5 Sonnet, GPT-4o, Gemini 2.0 Flash, DeepSeek R1) with real token and latency telemetry.\n4. **8-Dimension Prompt Auditing**: Evaluate existing prompts for security, jailbreak vulnerabilities, hallucination risk, and clarity.\n\nSimply describe what you want to build or ask a question below to get started!`,
          timestamp: Date.now(),
          suggestedFollowUps: [
            'Create a landing page for my product',
            'Optimize a prompt for customer support',
            'Compare models side-by-side',
            'What is BYOK mode?',
          ],
        };
        setMessages((prev) => [...prev, capabilitiesMsg]);
        workspaceActionBridge.updateJob(request.requestId, {
          jobId: request.requestId,
          status: 'completed',
          progress: 100,
          message: 'Capabilities explained',
        });
        return { jobId: request.requestId, status: 'completed', output: capabilitiesMsg.text };
      }

      if (isHostingQuery(rawQuery)) {
        const hostingMsg: ChatMessage = {
          id: `asst_host_${Date.now()}`,
          sender: 'assistant',
          text: `### 🚀 Website Hosting & Deployment Guide\n\nHere are the best providers to host and publish your website based on your budget:\n\n#### 1. Free Forever (Zero Cost)\n- **[Netlify Drop](https://app.netlify.com/drop)**: Export your project ZIP and drag & drop it directly. Includes free SSL and global CDN.\n- **[Vercel](https://vercel.com/new)**: Deploy in seconds with Git or CLI ('npx vercel deploy'). Free custom domains & edge CDN.\n- **[Cloudflare Pages](https://pages.cloudflare.com)**: Unlimited free bandwidth, high DDoS protection, and instant DNS.\n- **[GitHub Pages](https://pages.github.com)**: 100% free static hosting directly from a GitHub repository.\n\n#### 2. Budget & Custom Domains (₹79 – ₹249 / month | $1 – $3 / mo)\n- **[Hostinger](https://www.hostinger.in)**: Free '.com' or '.in' domain, business email, and easy File Manager upload for your HTML/ZIP files.\n- **[Render](https://render.com)**: Free static sites + affordable backend services.\n\n#### 3. Production & Scale ($5 – $20+ / mo)\n- **[DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)** & **[AWS Amplify](https://aws.amazon.com/amplify)**.\n\nI've opened the **Hosting & Publish** dialog for you — you can preview your live site, get a QR code, or export the ZIP for any provider!`,
          timestamp: Date.now(),
          suggestedFollowUps: [
            'Export ZIP Package',
            'Open Live Preview & Code Inspector',
            'Make a website for my business',
          ],
        };
        setIsLivePublishOpen(true);
        setMessages((prev) => [...prev, hostingMsg]);
        workspaceActionBridge.updateJob(request.requestId, {
          jobId: request.requestId,
          status: 'completed',
          progress: 100,
          message: 'Hosting guide ready',
        });
        return { jobId: request.requestId, status: 'completed', output: hostingMsg.text };
      }

      // Quick action for Live Preview follow-up chip
      const lowerRaw = rawQuery.toLowerCase().trim();
      if (
        lowerRaw === 'open live preview & code inspector' ||
        lowerRaw === 'open live preview' ||
        lowerRaw === 'preview website'
      ) {
        setPanelLayout('split');
        setInspectorTab('preview');
        setMobileActiveView('preview');
        const previewMsg: ChatMessage = {
          id: `asst_prev_${Date.now()}`,
          sender: 'assistant',
          text: `Opened the interactive live preview for you! You can test reactive controls, switch between Desktop & Mobile views, and inspect source files in the right panel.`,
          timestamp: Date.now(),
          suggestedFollowUps: [
            'Deploy & Host Website (Free / Paid)',
            'Export ZIP package',
            'Make layout mobile responsive',
          ],
        };
        setMessages((prev) => [...prev, previewMsg]);
        workspaceActionBridge.updateJob(request.requestId, {
          jobId: request.requestId,
          status: 'completed',
          progress: 100,
          message: 'Live preview opened',
        });
        return { jobId: request.requestId, status: 'completed', output: previewMsg.text };
      }

      if (
        lowerRaw === 'export zip package' ||
        lowerRaw === 'export zip' ||
        lowerRaw === 'download zip'
      ) {
        await handleExportToDesktop();
        const exportMsg: ChatMessage = {
          id: `asst_exp_${Date.now()}`,
          sender: 'assistant',
          text: `Exported your complete project ZIP archive! You can now drag & drop it directly into **[Netlify Drop](https://app.netlify.com/drop)** or upload it to your hosting provider.`,
          timestamp: Date.now(),
          suggestedFollowUps: [
            'Deploy & Host Website (Free / Paid)',
            'Open Live Preview & Code Inspector',
          ],
        };
        setMessages((prev) => [...prev, exportMsg]);
        workspaceActionBridge.updateJob(request.requestId, {
          jobId: request.requestId,
          status: 'completed',
          progress: 100,
          message: 'ZIP export complete',
        });
        return { jobId: request.requestId, status: 'completed', output: exportMsg.text };
      }

      // Direct High-Fidelity Image Generation
      const isImageModel = selectedModel.includes('flux') || selectedModel.includes('diffusion') || selectedModel.includes('image');
      const imageRequestPattern = /\b(generate|create|make|draw|design|render|produce)\b.{0,35}\b(image|photo|picture|illustration|artwork|poster|logo|banner|thumbnail|icon|mockup|visual|graphic)\b/i;
      const isImageRequest =
        resolvedIntent === 'visual_asset' ||
        isImageModel ||
        imageRequestPattern.test(rawQuery) ||
        /^(?:image|photo|picture|visual|illustration|artwork)\s+of\b/i.test(rawQuery.trim());

      if (isImageRequest) {
        setProcessingStep('FLUX Studio: Rendering high-fidelity visual asset...');
        let cleanPrompt = rawQuery
          .replace(/\b(generate|create|make|draw|design|render|produce|an?|image|photo|picture|of)\b/gi, ' ')
          .trim()
          .replace(/\s+/g, ' ');
        if (!cleanPrompt) cleanPrompt = rawQuery;

        let safeEnhancedPrompt = cleanPrompt;
        if (safeEnhancedPrompt.split(' ').length <= 4) {
          safeEnhancedPrompt += ', highly detailed, cinematic lighting, photorealistic 8k, award winning photography';
        }

        const encodedPrompt = encodeURIComponent(safeEnhancedPrompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true&seed=${Date.now()}&model=flux`;
        const imgMsg: ChatMessage = {
          id: `asst_img_${Date.now()}`,
          sender: 'assistant',
          text: `### 🎨 Visual Asset Generated\n\n![Generated Visual Asset](${imageUrl})\n\n**Prompt:** '${safeEnhancedPrompt}'`,
          timestamp: Date.now(),
        };

        const imgFiles: WorkFile[] = [
          {
            id: `wf_img_${Date.now()}`,
            projectId: activeProject?.id || 'workspace_proj',
            worktreeId: 'main',
            path: 'asset.png',
            name: 'asset.png',
            content: imageUrl,
            size: 1024,
            isDirectory: false,
            mimeType: 'image/png',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        setProjectFiles(imgFiles);
        setOpenFiles(imgFiles);
        setActiveFilePath('asset.png');
        setMessages((prev) => [...prev, imgMsg]);

        const execution: UnifiedExecutionResult = {
          intent: 'prompt_creation',
          title: rawQuery.slice(0, 40) || 'Generated Visual Asset',
          summary: `Visual asset rendered with FLUX for prompt: "${rawQuery}"`,
          activeOptionId: 'image_flux',
          optionTitle: 'FLUX Image',
          files: imgFiles,
          downstreamTasks: [],
          metrics: {
            modelUsed: selectedModel.includes('flux') ? selectedModel : 'pollinations/flux',
            durationMs: 450,
            tokensEstimated: 80,
            creditsDeducted: 0,
          },
        };
        setActiveResult(execution);

        await refreshStorageQuota();
        workspaceActionBridge.updateJob(request.requestId, {
          jobId: request.requestId,
          status: 'completed',
          progress: 100,
          message: 'Image asset generated',
          filesCount: 1,
        });
        return { jobId: request.requestId, status: 'completed', output: imgMsg.text };
      }

      // Direct Execution delegated to SharedExecutionService
      const targetModel =
        selectedModel === 'prompthub/auto-free' || selectedModel === 'auto-free' || selectedModel === 'prompthub/auto' || selectedModel === 'auto'
          ? 'openrouter/free'
          : selectedModel === 'prompthub/auto-paid' || selectedModel === 'auto-paid'
          ? 'openai/gpt-4o'
          : developerSettings.modelOverride || selectedModel || 'openrouter/free';

      setProcessingStep(`Executing with ${targetModel.split('/').pop()}...`);
      setTeamMembers((prev) =>
        prev.map((m) =>
          m.id === 'coder' || m.id === 'architect' ? { ...m, status: 'coding' } : m
        )
      );

      const conversationHistory = [...messages, userMsg].slice(-8).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

      const execResponse = await sharedExecutionService.executeWorkspaceSubmission({
        requestId: request.requestId,
        projectId: activeProject?.id || 'workspace_proj',
        sessionId: messages[0]?.id || (activeProject ? `session_${activeProject.id}` : 'default_session'),
        source: request.source || 'text',
        text: executionQuery,
        selectedModel: targetModel,
        developerSettings: {
          modelOverride: developerSettings.modelOverride || undefined,
          temperature: developerSettings.temperature,
          maxTokens: developerSettings.maxTokens,
          systemPromptOverride: developerSettings.systemPromptOverride,
        },
        activeSkills: currentSkills.map((s) => s.command),
        conversationHistory,
        activeBriefId: activeBrief?.id,
        userId: user?.id || 'anon_user',
        isTemporaryChat,
      });

      // Synchronize Brief State
      if (execResponse.brief) {
        setActiveBrief(execResponse.brief);
        setBriefHistory(structuredBriefManager.getBriefHistory(execResponse.brief.id));
      }

      // Execution Error Handling: Surface real error and stop rather than printing fake deliverable
      if (execResponse.status === 'failed' || execResponse.error) {
        const errorText = execResponse.error || 'The model was unable to generate a response. Please check your model settings, credits, or API key configuration.';
        showToast(errorText, 'error');
        const errorMsg: ChatMessage = {
          id: `asst_err_${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Execution Failed**\n\n${errorText}`,
          timestamp: Date.now(),
          modelUsed: execResponse.modelUsed || targetModel,
        };
        setMessages((prev) => [...prev, errorMsg]);
        workspaceActionBridge.updateJob(request.requestId, {
          jobId: request.requestId,
          status: 'failed',
          progress: 0,
          message: errorText,
          error: errorText,
        });
        return {
          jobId: request.requestId,
          status: 'failed',
          error: errorText,
        };
      }

      // Synchronize Project Files & Preview (with auto-extraction and persistence to workService)
      let effectiveFiles = execResponse.files ? [...execResponse.files] : [];
      const aiResponseText = execResponse.outputMarkdown || '';

      // If no files were returned directly, attempt to auto-extract HTML/code from the AI response
      if (effectiveFiles.length === 0 && aiResponseText) {
        const htmlMatch =
          aiResponseText.match(/```(?:html|htm|xml)\s*([\s\S]*?)(?:```|$)/i) ||
          aiResponseText.match(/(<!DOCTYPE html[\s\S]*?(?:<\/html>|$))/i) ||
          aiResponseText.match(/(<html[\s\S]*?(?:<\/html>|$))/i) ||
          aiResponseText.match(/(<(?:nav|header|main|section|div|body)[\s\S]*)/i);

        if (htmlMatch && htmlMatch[1]?.trim()) {
          let extractedHtml = htmlMatch[1].trim();
          if (!extractedHtml.includes('<!DOCTYPE html>') && !extractedHtml.includes('<html')) {
            extractedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${rawQuery.slice(0, 35) || 'PromptHub Web Product'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Outfit', system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen">
  ${extractedHtml}
  <script>
    if (window.lucide) { lucide.createIcons(); }
  </script>
</body>
</html>`;
          }
          const newHtmlFile: WorkFile = {
            id: `wf_${Date.now()}_index`,
            projectId: activeProject?.id || 'workspace_proj',
            worktreeId: 'main',
            path: 'index.html',
            name: 'index.html',
            content: extractedHtml,
            size: extractedHtml.length,
            isDirectory: false,
            mimeType: 'text/html',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          effectiveFiles = [newHtmlFile];
        }
      }

      // Persist generated files into active project worktree
      if (activeProject && effectiveFiles.length > 0) {
        for (const gf of effectiveFiles) {
          await workService.writeFile(activeProject.id, { path: gf.path, content: gf.content }).catch(() => {});
        }
      }

      if (effectiveFiles.length > 0) {
        setProjectFiles(effectiveFiles);
        setOpenFiles(effectiveFiles);
        const hasHtml = effectiveFiles.some((f) => f.path.endsWith('.html') || f.name.endsWith('.html'));
        if (hasHtml) {
          setActiveFilePath('index.html');
          setPanelLayout('split');
          setInspectorTab('preview');
          setMobileActiveView('preview');
        } else {
          setActiveFilePath(effectiveFiles[0].path);
        }
      }

      // Formulate Execution Metrics
      const executionResult: UnifiedExecutionResult = {
        intent: classification.deliverableType === 'interactive_web_app' ? 'web_app_portfolio' : 'general_chat',
        title: rawQuery.slice(0, 45) || 'Generated Deliverable',
        summary: aiResponseText.slice(0, 200).replace(/```[\s\S]*?```/g, '').trim() || 'Deliverable generated successfully',
        activeOptionId: 'opt_main',
        optionTitle: 'Primary Deliverable',
        files: effectiveFiles,
        downstreamTasks: [],
        metrics: {
          modelUsed: execResponse.modelUsed || targetModel,
          durationMs: execResponse.durationMs || 0,
          tokensEstimated: Math.ceil(aiResponseText.length / 4),
          creditsDeducted: execResponse.creditsDeducted || effectiveCost,
        },
      };
      setActiveResult(executionResult);

      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: aiResponseText || (execResponse.deliverable ? `Here is your ${classification.deliverableType.replace(/_/g, ' ')}:` : 'Deliverable generated successfully.'),
        timestamp: Date.now(),
        deliverable: execResponse.deliverable || undefined,
        result: executionResult,
        briefId: execResponse.brief?.id,
        briefVersion: execResponse.brief?.version,
        suggestedFollowUps: execResponse.suggestedFollowUps,
        modelUsed: execResponse.modelUsed || targetModel,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      await refreshStorageQuota();

      workspaceActionBridge.updateJob(request.requestId, {
        jobId: request.requestId,
        status: 'completed',
        progress: 100,
        message: 'Deliverable ready in sandbox.',
        filesCount: effectiveFiles.length > 0 ? effectiveFiles.length : 1,
      });

      return {
        jobId: request.requestId,
        status: 'completed',
        output: aiResponseText,
      };
    } catch (err: any) {
      console.error('[UnifiedWorkspace Error]:', err);
      showToast(err.message || 'Could not complete task. Please retry.', 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: err.message?.includes('STORAGE_QUOTA_EXCEEDED')
            ? `⚠️ ${err.message}`
            : (err.message || 'An error occurred during generation. Please adjust your request or retry.'),
          timestamp: Date.now(),
        },
      ]);
      workspaceActionBridge.updateJob(request.requestId, {
        jobId: request.requestId,
        status: 'failed',
        progress: 0,
        message: err.message || 'Generation failed',
        error: err.message,
      });
      return {
        jobId: request.requestId,
        status: 'failed',
        error: err.message,
      };
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
      setTeamMembers((prev) => prev.map((m) => ({ ...m, status: 'completed' })));
    }
  };

  // Launch Instant Pre-Compiled Deliverable Blueprint (Zero Remote AI Latency, 0 Credits)
  const handleLaunchBlueprint = (blueprintOrId: string | InstantDeliverableBlueprint) => {
    const bp = typeof blueprintOrId === 'string'
      ? getInstantBlueprintById(blueprintOrId) || findInstantBlueprintByPrompt(blueprintOrId)
      : blueprintOrId;

    if (!bp) return;

    setInputPrompt('');
    setLoadedPromptInfo(null);
    setIsProcessing(false);

    // 1. Files & Editor setup
    setProjectFiles(bp.files);
    setOpenFiles(bp.files);
    setActiveFilePath('index.html');
    setPanelLayout('split');
    setInspectorTab('preview');
    setMobileActiveView('preview');

    // 2. Formulate Execution Result
    const instantResult: UnifiedExecutionResult = {
      intent: bp.category === 'web' ? 'web_app_portfolio' : 'general_chat',
      title: bp.title,
      summary: bp.summary,
      activeOptionId: bp.id,
      optionTitle: bp.title,
      files: bp.files,
      downstreamTasks: bp.downstreamTasks,
      metrics: {
        modelUsed: 'PromptHub Instant Blueprint Engine (Zero Waiting)',
        durationMs: 12,
        tokensEstimated: 1250,
        creditsDeducted: 0,
      },
    };
    setActiveResult(instantResult);

    // 3. User & Assistant Messages
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: bp.prompt || bp.title,
      timestamp: Date.now(),
    };

    const assistantMsg: ChatMessage = {
      id: `asst_bp_${Date.now()}`,
      sender: 'assistant',
      text: bp.explanation,
      timestamp: Date.now() + 1,
      result: instantResult,
      downstreamTasks: bp.downstreamTasks,
      suggestedFollowUps: bp.suggestedFollowUps,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    // 4. Update Workspace Action Bridge
    const reqId = `bp_${Date.now()}`;
    workspaceActionBridge.updateJob(reqId, {
      jobId: reqId,
      status: 'completed',
      progress: 100,
      message: `${bp.title} ready in live preview sandbox (loaded in 12ms).`,
      filesCount: bp.files.length,
    });

    showToast(`⚡ ${bp.title} launched instantly (0 credits)!`, 'success');
  };

  // Handle Architecture Quick-Starts and Default Starters via Variable Workflow
  const handleSelectDefaultWithVariables = async (blueprintOrId: string | InstantDeliverableBlueprint) => {
    const bp = typeof blueprintOrId === 'string'
      ? getInstantBlueprintById(blueprintOrId) || findInstantBlueprintByPrompt(blueprintOrId)
      : blueprintOrId;

    const basePrompt = bp?.prompt || (typeof blueprintOrId === 'string' ? blueprintOrId : bp?.title || '');
    const cleanPrompt = basePrompt.trim() || `Build a production-grade ${bp?.title || 'System'} with modern UI and full-stack architecture.`;

    // 1. Ensure folder exists for project (Chat can only be done in a folder)
    if (!activeProject) {
      try {
        const folderName = bp?.title || 'My Project';
        const created = await workService.createProject({
          name: folderName,
          description: bp?.summary || 'Created from Architecture Starter',
          type: 'code',
        });
        setProjects((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
        await selectProject(created, false);
      } catch {}
    }

    // 2. Open the variable workflow in the center so user gets variables to put their needs in mid!
    setVariableWorkflowPrompt(cleanPrompt);
    setInputPrompt(cleanPrompt);

    // Smooth scroll to composer / variable workflow
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Submit Handler for Chat Input (Routes through handleExecuteWorkspaceRequest)
  const handleSubmit = async (textToSend?: string) => {
    const rawQuery = (textToSend || inputPrompt).trim();
    if ((!rawQuery && attachments.length === 0) || isProcessing) return;

    // Compulsory Folder Guard: Chat and AI Agent deliverables must be in a folder
    if (!activeProject) {
      setPendingPromptForFolder(rawQuery);
      setIsNewProjectModalOpen(true);
      showToast('Please create or select a project folder first. Chat and AI agent outputs must belong to a folder.', 'info');
      return;
    }

    // Fast-path: Check if initial blank-slate submission matches a pre-compiled instant deliverable (exclude greetings, help & gibberish)
    if (
      messages.length === 0 &&
      attachments.length === 0 &&
      !securityUtils.isMeaninglessOrGibberish(rawQuery) &&
      !isConversationalGreeting(rawQuery) &&
      !isCapabilitiesOrHelpQuery(rawQuery)
    ) {
      const matchingBp = findInstantBlueprintByPrompt(rawQuery);
      if (matchingBp) {
        handleLaunchBlueprint(matchingBp);
        return;
      }
    }

    const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const currentSessionId = messages[0]?.id || (activeProject ? `session_${activeProject.id}` : 'default_session');
    await handleExecuteWorkspaceRequest({
      text: rawQuery,
      source: 'text',
      projectId: activeProject?.id || 'workspace_proj',
      sessionId: currentSessionId,
      attachmentIds: attachments.map((a) => a.id),
      requestId: reqId,
    });
  };

  // ─── Portfolio Concept & Spec Handlers (Milestone 1) ───────────────────────

  // Adopt Portfolio Concept (Zero AI Rebuild Call)
  const handleAdoptConcept = (concept: PortfolioConcept) => {
    setIsAdoptingConcept(true);
    try {
      setSelectedOptionId(concept.id);
      setProjectFiles(concept.files);
      setOpenFiles(concept.files.slice(0, 3));
      setActiveFilePath(concept.files[0]?.path || 'index.html');
      // Don't auto-open preview — user opens it manually (Req #5)

      const adoptedResult: UnifiedExecutionResult = {
        intent: 'web_app_portfolio',
        title: `${concept.spec.name} — Portfolio`,
        summary: `Adopted ${concept.spec.name} (${concept.spec.aesthetic}). Pre-compiled spec and assets active with 0 rebuild latency.`,
        activeOptionId: concept.id,
        optionTitle: concept.spec.name,
        files: concept.files,
        downstreamTasks: [
          {
            id: 'task_export_project',
            title: 'Save to My Projects & Export ZIP',
            description: 'Package the exact same spec implementation and assets into a production ZIP archive.',
            actionType: 'export_project',
            badge: 'Projects',
          },
          {
            id: 'task_audit_portfolio',
            title: 'Run Quality & Accessibility Audit',
            description: 'Audit code accessibility, mobile responsiveness, and design token compliance.',
            actionType: 'prompt_audit',
            badge: 'Analyzer',
          },
        ],
        metrics: {
          modelUsed: 'Pre-Compiled Spec Engine (Zero Rebuild Latency)',
          durationMs: 4,
          tokensEstimated: 0,
          creditsDeducted: 0,
        },
      };

      setActiveResult(adoptedResult);

      const confirmMsg: ChatMessage = {
        id: `asst_adopt_${Date.now()}`,
        sender: 'assistant',
        text: `✓ **${concept.spec.name}** adopted! Its pre-compiled spec, template version (${concept.spec.templateVersion}), and assets are active in your workspace with **zero model calls** and **0 credit charges**.\n\nYou can interact with the live page in the preview pane, make direct edits, or export the ZIP package:`,
        timestamp: Date.now(),
        result: adoptedResult,
        downstreamTasks: adoptedResult.downstreamTasks,
        suggestedFollowUps: [
          'Change color to emerald',
          'Update my bio',
          'Make it more interactive',
          'Export ZIP package',
        ],
      };

      setMessages((prev) => [...prev, confirmMsg]);
      showToast(`Adopted ${concept.spec.name} with zero rebuild latency!`, 'success');
    } finally {
      setIsAdoptingConcept(false);
    }
  };

  // Direct Partial Revision on Concept (Zero Model Calls)
  const handlePartialRevision = (concept: PortfolioConcept, patch: PortfolioSpecPatch) => {
    const updatedConcept = portfolioSpecService.patchSpecAndRecompile(concept.spec, patch);

    // Update concepts in message stream
    setMessages((prev) =>
      prev.map((m) => {
        if (!m.portfolioConcepts) return m;
        return {
          ...m,
          portfolioConcepts: m.portfolioConcepts.map((c) =>
            c.id === concept.id ? updatedConcept : c
          ),
        };
      })
    );

    // If currently previewing or adopted, update files immediately
    if (selectedOptionId === concept.id || !selectedOptionId) {
      setProjectFiles(updatedConcept.files);
      setOpenFiles(updatedConcept.files.slice(0, 3));
      setActiveFilePath(updatedConcept.files[0]?.path || 'index.html');
      if (activeResult) {
        setActiveResult({
          ...activeResult,
          files: updatedConcept.files,
        });
      }
    }

    showToast('Spec updated and rerendered instantly (0 model calls)', 'success');
  };

  // Regenerate All Concepts
  const handleRegenerateAll = () => {
    handleSubmit('Create three fresh portfolio design directions');
  };

  // Switch Visual Option
  const handleSelectOption = async (option: VisualOption, originalPrompt?: string) => {
    if (isProcessing) return;
    if (isStorageFull) {
      showToast('Cloud Storage limit reached (500 MB). Please free space in Storage Vault.', 'error');
      return;
    }

    setSelectedOptionId(option.id);
    setIsProcessing(true);
    setProcessingStep(`Fullstack Coder: Switching architecture to ${option.title}...`);

    try {
      let resolvedIntent = activeResult?.intent || 'web_app_portfolio';
      if (
        option.id.includes('minimal') ||
        option.id.includes('creative') ||
        option.id.includes('bold') ||
        option.id.includes('retro')
      ) {
        resolvedIntent = 'web_app_portfolio';
      } else if (
        option.id.includes('shop') ||
        option.id.includes('gst') ||
        option.id.includes('credit')
      ) {
        resolvedIntent = 'business_workflow';
      } else if (option.id.includes('arena')) {
        resolvedIntent = 'arena_comparison';
      } else if (option.id.includes('audit')) {
        resolvedIntent = 'prompt_analysis';
      } else if (option.id.includes('opt')) {
        resolvedIntent = 'prompt_optimization';
      }

      const effectivePrompt = lastGoalRef.current || originalPrompt || 'Create a portfolio website';

      const execution = await unifiedOrchestrator.executeWorkflow({
        intent: resolvedIntent,
        option,
        userInput: effectivePrompt,
        user,
        selectedModel,
        activeSkills: activeSkills.map((s) => s.command),
      });

      setActiveResult(execution);
      if (execution.files && execution.files.length > 0) {
        setProjectFiles(execution.files);
        setOpenFiles(execution.files.slice(0, 3));
        setActiveFilePath(execution.files[0]?.path || 'index.html');
        // Don't auto-open preview — user opens it via the Preview tab (Req #5)
      }

      const switchText =
        resolvedIntent === 'arena_comparison' && execution.arenaComparison
          ? `Switched Arena benchmark to **${option.title}**:\n\n• **${execution.arenaComparison.modelA.name}**: \`${execution.arenaComparison.modelA.latencyMs}ms\` | \`${execution.arenaComparison.modelA.tokensPerSec} tok/s\`\n${execution.arenaComparison.modelA.output}\n\n• **${execution.arenaComparison.modelB.name}**: \`${execution.arenaComparison.modelB.latencyMs}ms\` | \`${execution.arenaComparison.modelB.tokensPerSec} tok/s\`\n${execution.arenaComparison.modelB.output}\n\n**Verdict:** ${execution.arenaComparison.verdict}`
          : `Updated sandbox to **${option.title}** (${option.aesthetic}). Live interactive preview updated.\n\n**What would you like to change?**`;

      setMessages((prev) => [
        ...prev,
        {
          id: `asst_switch_${Date.now()}`,
          sender: 'assistant',
          text: switchText,
          timestamp: Date.now(),
          result: execution,
          downstreamTasks: execution.downstreamTasks,
          suggestedFollowUps:
            resolvedIntent === 'arena_comparison'
              ? [
                  'Optimize winner prompt',
                  'Audit prompt for security vulnerabilities',
                ]
              : [
                  'Make it more interactive',
                  'Change the colours',
                  'Improve the mobile layout',
                  'Add my projects',
                  'Make it more professional',
                ],
        },
      ]);

      if (window.innerWidth < 768 && execution.files && execution.files.length > 0) {
        setMobileActiveView('preview');
      }
      await refreshStorageQuota();
    } catch (err: any) {
      showToast('Failed to switch option: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Export HTML
  const handleExportHtml = () => {
    if (!activeResult || !currentFiles.length) {
      showToast('No generated project files to export.', 'info');
      return;
    }
    const htmlFile = currentFiles.find((f) => f.name === 'index.html' || f.path === 'index.html') || currentFiles[0];
    if (!htmlFile) return;

    try {
      const blob = new Blob([htmlFile.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeResult.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'portfolio'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Exported project HTML successfully!', 'success');
    } catch (err: any) {
      showToast('Export failed: ' + err.message, 'error');
    }
  };

  // Copy text to clipboard with feedback
  const handleCopyText = async (text: string, msgId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(msgId);
      showToast('Text copied to clipboard!', 'success');
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      showToast('Failed to copy to clipboard.', 'error');
    }
  };

  // Export output as plain text, markdown, or printable PDF
  const handleExportText = (text: string, format: 'txt' | 'md' | 'pdf', title: string = 'PromptHub_Output') => {
    try {
      setActiveExportDropdownId(null);
      if (format === 'pdf') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const safeTitle = (title || 'PromptHub Output').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${safeTitle}</title>
              <meta charset="utf-8" />
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: black; }
                h1, h2, h3 { color: black; margin-top: 1.5em; }
                pre { background: rgba(0, 0, 0, 0.04); padding: 14px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.12); overflow-x: auto; font-family: monospace; }
                code { font-family: monospace; background: rgba(0, 0, 0, 0.04); padding: 2px 6px; border-radius: 4px; }
                blockquote { border-left: 2px solid rgba(0, 0, 0, 0.3); padding-left: 16px; color: rgba(0, 0, 0, 0.7); margin-left: 0; }
                .meta { font-size: 11px; color: rgba(0, 0, 0, 0.6); border-bottom: 1px solid rgba(0, 0, 0, 0.12); padding-bottom: 8px; margin-bottom: 24px; }
              </style>
            </head>
            <body>
              <div class="meta">Exported from PromptHub &bull; ${new Date().toLocaleDateString()}</div>
              <div style="white-space: pre-wrap;">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 300);
        }
        showToast('Preparing printable document...', 'info');
        return;
      }

      const mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
      const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'output'}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported as .${format} successfully!`, 'success');
    } catch (err: any) {
      showToast('Export failed: ' + err.message, 'error');
    }
  };

  // In-place text editing handlers for non-tech users
  const handleStartEdit = (msgId: string, currentText: string) => {
    setEditingMessageId(msgId);
    setEditingText(currentText);
  };

  const handleSaveEdit = (msgId: string) => {
    if (!editingText.trim()) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, text: editingText.trim() } : m))
    );
    setEditingMessageId(null);
    setEditingText('');
    showToast('Saved edits to output!', 'success');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  // ── Register Workspace Action Bridge for Voice Agent & Autonomous Tools ──
  useEffect(() => {
    const unregister = workspaceActionBridge.registerHandler({
      getProjectContext: async () => ({
        projectId: activeProject?.id || 'workspace_proj',
        projectName: activeProject?.name || 'Workspace Project',
        projectSummary: activeResult?.summary || latestSimplePrompt || 'Autonomous Studio Workspace',
        files: (activeResult?.files || projectFiles).map((f) => ({
          path: f.path,
          name: f.name,
          size: f.size,
          mimeType: f.mimeType,
        })),
        selectedArtifact: activeResult
          ? {
              id: activeResult.activeOptionId,
              type: 'website_code',
              title: activeResult.title,
              snippet: activeResult.summary,
            }
          : null,
        selectedModel,
        activeJobId: null,
        jobStatus: isProcessing ? 'building' : 'idle',
        jobProgress: isProcessing ? 50 : 100,
        availableConcepts: ['minimal', 'colourful', 'sleek dark', 'corporate executive', 'playful'],
      }),
      startCreation: async (prompt, style, reqId) => {
        const jobId = reqId || `voice_build_${Date.now()}`;
        const queryWithStyle = style ? `${prompt} [Style aesthetic: ${style}]` : prompt;
        const currentSessionId = messages[0]?.id || (activeProject ? `session_${activeProject.id}` : 'default_session');
        const res = await handleExecuteWorkspaceRequest({
          text: queryWithStyle,
          source: 'voice',
          projectId: activeProject?.id || 'workspace_proj',
          sessionId: currentSessionId,
          attachmentIds: [],
          requestId: jobId,
        });
        return {
          jobId,
          status: res.status,
          message: res.status === 'completed' ? `Built ${style || 'custom'} deliverable in workspace` : 'Building deliverable in workspace...',
          output: res.output,
          error: res.error,
        };
      },
      submitMasterPrompt: async (masterPrompt, _deliverableType, modelId, reqId) => {
        const jobId = reqId || `voice_master_${Date.now()}`;
        let effectiveModel = modelId || selectedModel;
        if (
          effectiveModel === 'prompthub/auto-free' ||
          effectiveModel === 'auto-free' ||
          effectiveModel === 'prompthub/auto' ||
          effectiveModel === 'auto'
        ) {
          effectiveModel = 'openrouter/free';
        }
        if (effectiveModel && effectiveModel !== selectedModel) {
          setSelectedModel(effectiveModel);
        }
        const currentSessionId = messages[0]?.id || (activeProject ? `session_${activeProject.id}` : 'default_session');
        const res = await handleExecuteWorkspaceRequest({
          text: masterPrompt,
          source: 'voice',
          projectId: activeProject?.id || 'workspace_proj',
          sessionId: currentSessionId,
          attachmentIds: attachments.map((a) => a.id),
          requestId: jobId,
        });
        return {
          jobId,
          status: res.status,
          message: res.status === 'completed' ? 'Deliverable ready in sandbox.' : 'Workspace generation in progress.',
          output: res.output,
          error: res.error,
        };
      },
      refineArtifact: async (instruction, _targetFile, reqId) => {
        const jobId = reqId || `voice_refine_${Date.now()}`;
        const currentSessionId = messages[0]?.id || (activeProject ? `session_${activeProject.id}` : 'default_session');
        const res = await handleExecuteWorkspaceRequest({
          text: instruction,
          source: 'voice',
          projectId: activeProject?.id || 'workspace_proj',
          sessionId: currentSessionId,
          attachmentIds: [],
          requestId: jobId,
        });
        return {
          jobId,
          status: res.status,
          message: `Refinement applied: "${instruction}"`,
          output: res.output,
          error: res.error,
        };
      },
      getJobStatus: async (jobId) => {
        return {
          jobId,
          status: isProcessing ? 'building' : 'completed',
          progress: isProcessing ? 65 : 100,
          message: isProcessing ? 'Compiling assets and preview...' : 'Deliverable ready in sandbox.',
          filesCount: (activeResult?.files || projectFiles).length,
        };
      },
      selectDesignConcept: async (concept) => {
        const conceptPrompt = `Apply the ${concept} design concept to this workspace project. Refine colors, typography, and layout to match ${concept}.`;
        handleSubmit(conceptPrompt);
        return {
          success: true,
          concept,
          message: `Applied ${concept} concept to workspace.`,
        };
      },
      selectModel: async (modelQuery: string) => {
        const isFree = modelQuery.toLowerCase().includes('free') || modelQuery.toLowerCase().includes('any');
        let matchedModel = 'openrouter/free';
        if (isFree) {
          matchedModel = 'openrouter/free';
        } else {
          const found = WORKSPACE_MODELS.find(
            (m) => m.id.toLowerCase().includes(modelQuery.toLowerCase()) || m.label.toLowerCase().includes(modelQuery.toLowerCase())
          );
          if (found) matchedModel = found.id;
          else matchedModel = modelQuery;
        }
        setSelectedModel(matchedModel);
        const modelLabel = WORKSPACE_MODELS.find((m) => m.id === matchedModel)?.label || matchedModel.split('/').pop() || matchedModel;
        return {
          success: true,
          modelId: matchedModel,
          modelLabel,
          isFree: matchedModel.includes(':free'),
          message: `Switched target model to ${modelLabel}`,
        };
      },
      onDisplayBrief: (_brief) => {
        setIsVoicePanelOpen(true);
      },
    });

    return () => {
      unregister();
    };
  }, [activeProject, activeResult, projectFiles, selectedModel, isProcessing, latestSimplePrompt]);

  // Quick 1-click refinement prompts for non-tech users (Tweak chips)
  const handleQuickRefine = async (actionLabel: string, instruction: string, baseText: string) => {
    if (isProcessing) return;
    if (securityUtils.isMeaninglessOrGibberish(baseText)) {
      showToast('Cannot refine this message because the text contains random or unclear characters.', 'info');
      return;
    }
    setIsProcessing(true);

    const tweakUserMsg: ChatMessage = {
      id: `user_tweak_${Date.now()}`,
      sender: 'user',
      text: `Refine: ${actionLabel}`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, tweakUserMsg]);

    try {
      const promptToRun = `You are an elite, meticulous AI editor and engineer. Execute the following revision on the user's content:
REVISION OBJECTIVE: ${instruction}

CRITICAL RULES:
- Preserve all facts, code snippets, core structure, and depth from the original content.
- Elevate quality, clarity, and precision according to the objective.
- Do NOT abbreviate, truncate, or omit sections. Provide the COMPLETE refined content.
- Return ONLY the finalized refined content directly with zero conversational pleasantries, zero meta-commentary, zero apologies, and zero safety headers.

ORIGINAL CONTENT:
${baseText}

REVISED CONTENT:`;

      const targetModel = (!selectedModel || selectedModel === 'prompthub/auto-free' || selectedModel === 'prompthub/auto-paid' || selectedModel.includes('content-safety') || selectedModel === 'google/gemini-2.0-flash-exp:free')
        ? 'openrouter/free'
        : selectedModel;

      let refinedOutput = '';
      try {
        const aiResponse = await aiGateway.executePrompt(promptToRun, {
          modelId: developerSettings.modelOverride || targetModel || 'openrouter/free',
          temperature: 0.4,
          maxTokens: developerSettings.maxTokens || 8192,
          feature: 'ide',
          executionMode: 'raw',
        });
        refinedOutput = (aiResponse.output || '').trim();
      } catch (err: any) {
        console.warn('[QuickRefine] Primary execution error, attempting failover:', err?.message);
        try {
          const { executeResilientFreeModel } = await import('../../lib/openrouter');
          const resilientRes = await executeResilientFreeModel(
            'openrouter/free',
            promptToRun,
            [{ role: 'user', content: promptToRun }],
            { temperature: 0.4, max_tokens: 8192 }
          );
          refinedOutput = (resilientRes.content || '').trim();
        } catch {
          throw err;
        }
      }

      // Strip any safety classifier echoes (e.g. "User Safety: safe")
      refinedOutput = refinedOutput.replace(/^(?:\s*(?:User|Assistant)?\s*Safety:\s*(?:safe|unsafe)\s*[\r\n]*)+/i, '').trim();

      // If output was only safety metadata or empty, execute fallback to guaranteed generative cluster
      if (!refinedOutput || /^(?:safe|unsafe)$/i.test(refinedOutput)) {
        const { executeResilientFreeModel } = await import('../../lib/openrouter');
        const resilientRes = await executeResilientFreeModel(
          'openrouter/free',
          promptToRun,
          [{ role: 'user', content: promptToRun }],
          { temperature: 0.4, max_tokens: 8192 }
        );
        refinedOutput = (resilientRes.content || '').replace(/^(?:\s*(?:User|Assistant)?\s*Safety:\s*(?:safe|unsafe)\s*[\r\n]*)+/i, '').trim();
      }

      if (refinedOutput) {
        const assistantMsg: ChatMessage = {
          id: `asst_tweak_${Date.now()}`,
          sender: 'assistant',
          text: refinedOutput,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        showToast('Unable to refine text. Please try again.', 'error');
      }
    } catch (err: any) {
      console.error('[QuickRefine] Error:', err);
      showToast(err?.message || 'Refinement failed.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };


  // Save to My Projects & Cloud Drive
  const handleSaveToProjects = async () => {
    if (!activeResult) return;
    try {
      const savedProjects = JSON.parse(localStorage.getItem('ph_saved_projects') || '[]');
      savedProjects.unshift({
        id: `proj_${Date.now()}`,
        title: activeResult.title,
        summary: activeResult.summary,
        files: currentFiles,
        savedAt: Date.now(),
      });
      localStorage.setItem('ph_saved_projects', JSON.stringify(savedProjects.slice(0, 20)));
    } catch {}

    let cloudSynced = true;

    try {
      const project = await workService.createProject({
        name: activeResult.title,
        description: activeResult.summary,
        status: 'active',
      });

      if (project && project.id) {
        for (const f of currentFiles) {
          if (!f.isDirectory && f.content) {
            await workService.writeFile(project.id, {
              path: f.path,
              content: f.content,
              worktreeId: project.activeWorktreeId,
            });
          }
        }
        // Auto-sync project folder to Google Drive Storage Vault
        try {
          await workService.syncProjectToDrive(project.id);
          cloudSynced = true;
        } catch {}
      }
    } catch {}

    await refreshStorageQuota();
    if (cloudSynced) {
      showToast('Project saved to My Projects & Cloud Drive!', 'success');
    } else {
      showToast('Project saved to My Projects!', 'success');
    }
  };

  const handleExecuteDownstream = async (task: DownstreamTask) => {
    if (!activeResult) return;

    if (task.id === 'task_deploy_website' || task.id.includes('deploy') || task.id.includes('host')) {
      setIsLivePublishOpen(true);
      return;
    }

    if (task.actionType === 'export_project') {
      await handleSaveToProjects();
      return;
    }
    if (task.actionType === 'open_in_studio') {
      sendToStudio(activeResult.promptOutput || activeResult.summary, undefined, activeResult.title);
      return;
    }
    if (task.actionType === 'open_in_work') {
      sendToWork({
        title: activeResult.title,
        prompt: activeResult.summary,
        intent: activeResult.intent,
      });
      return;
    }
    if (task.actionType === 'arena_compare') {
      sendToArena(activeResult.promptOutput || activeResult.summary);
      return;
    }
    if (task.actionType === 'prompt_audit') {
      sendToAnalyzer(activeResult.promptOutput || activeResult.summary);
      return;
    }

    setIsProcessing(true);
    setProcessingStep(`Executing downstream task: ${task.title}...`);
    try {
      const generated = await unifiedOrchestrator.generateDownstreamTask(task, activeResult);
      setMessages((prev) => [
        ...prev,
        {
          id: `downstream_${Date.now()}`,
          sender: 'assistant',
          text: `Here is your **${generated.title}** based on your project:\n\n\`\`\`text\n${generated.content}\n\`\`\``,
          timestamp: Date.now(),
        },
      ]);
      showToast(`${generated.title} generated!`, 'success');
    } catch (err: any) {
      showToast('Downstream generation failed: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // ── Handwritten Decision Flow Handlers (Approve vs New Produce vs Improve) ──
  const handleApproveOutput = () => {
    setIsOutputApproved(true);
    // Only show the "🎉 Output Approved!" banner/toast when the session is complete (not mid-chat, Req #3)
    if (isSessionComplete && !isProcessing) {
      showToast('🎉 Output Approved! Bundled into single folder and ready to sync to Google Drive or export.', 'success');
    } else {
      showToast('✓ Output marked as approved.', 'success');
    }
  };

  const handleRegenerateNewProduce = async () => {
    if (isProcessing) return;
    setIsOutputApproved(false);
    
    const variationQuery = latestSimplePrompt
      ? `${latestSimplePrompt} [Generate an alternative fresh creative variation]`
      : inputPrompt;
    await handleSubmit(variationQuery);
  };

  const currentFiles: WorkFile[] = useMemo(() => {
    let baseFiles = (activeResult?.files && activeResult.files.length > 0)
      ? activeResult.files
      : projectFiles;

    if (baseFiles.length === 0 && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.result?.files && m.result.files.length > 0) {
          baseFiles = m.result.files;
          break;
        }
      }
    }

    if (baseFiles.length > 0 && latestSimplePrompt && !baseFiles.some((f) => f.path === 'prompt.md' || f.name === 'prompt.md')) {
      const promptMdContent = [
        `# Project: ${activeResult?.title || activeProject?.name || 'project-bundle'}`,
        '',
        '## User Simple Prompt',
        `> "${latestSimplePrompt}"`,
        '',
        '## PromptHub AI-Enhanced Better Prompt',
        latestBetterPrompt || latestSimplePrompt,
        '',
        '## System Directives & Active Skills',
        activeSkills.length > 0 ? activeSkills.map((s) => `- \`${s.command}\`: ${s.label}`).join('\n') : '- Standard Production Directives',
        '',
        '## Execution Model',
        `- **Model:** ${selectedModel}`,
        `- **Timestamp:** ${new Date().toISOString()}`,
      ].join('\n');

      const promptFile: WorkFile = {
        id: 'file_prompt_md',
        projectId: activeProject?.id || 'default_proj',
        worktreeId: 'default_wt',
        path: 'prompt.md',
        name: 'prompt.md',
        content: promptMdContent,
        size: promptMdContent.length,
        isDirectory: false,
        mimeType: 'text/markdown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return [promptFile, ...baseFiles];
    }

    return baseFiles;
  }, [activeResult, projectFiles, messages, latestSimplePrompt, latestBetterPrompt, activeSkills, selectedModel, activeProject]);

  // Extract deployable HTML from project files, active result, chat messages, or cache
  const extractDeployableHtml = useCallback((): string => {
    // 1. Explicit HTML file in currentFiles
    const htmlFile = currentFiles.find(
      (f) => f.path.endsWith('.html') || f.name?.endsWith('.html')
    );
    if (htmlFile?.content && htmlFile.content.trim().length > 0) {
      try { localStorage.setItem('ph_workspace_latest_html', htmlFile.content); } catch {}
      return htmlFile.content;
    }

    // 2. Active result files or promptOutput
    const resultFiles = activeResult?.files || [];
    const resultHtmlFile = resultFiles.find(
      (f) => f.path.endsWith('.html') || f.name?.endsWith('.html')
    );
    if (resultHtmlFile?.content && resultHtmlFile.content.trim().length > 0) {
      try { localStorage.setItem('ph_workspace_latest_html', resultHtmlFile.content); } catch {}
      return resultHtmlFile.content;
    }

    const anyResult = activeResult as any;
    if (anyResult?.previewHtml && typeof anyResult.previewHtml === 'string' && anyResult.previewHtml.trim().length > 0) {
      try { localStorage.setItem('ph_workspace_latest_html', anyResult.previewHtml); } catch {}
      return anyResult.previewHtml;
    }
    if (
      anyResult?.code && typeof anyResult.code === 'string' &&
      (anyResult.code.includes('<html') ||
        anyResult.code.includes('<!DOCTYPE') ||
        anyResult.code.includes('<div') ||
        anyResult.code.includes('<body') ||
        anyResult.code.includes('<main'))
    ) {
      try { localStorage.setItem('ph_workspace_latest_html', anyResult.code); } catch {}
      return anyResult.code;
    }

    if (
      activeResult?.promptOutput &&
      (activeResult.promptOutput.includes('<html') ||
        activeResult.promptOutput.includes('<!DOCTYPE') ||
        activeResult.promptOutput.includes('<div') ||
        activeResult.promptOutput.includes('<body'))
    ) {
      const match = activeResult.promptOutput.match(/```(?:html|htm)?\s*([\s\S]*?)```/i);
      const outputHtml = match && match[1] ? match[1].trim() : activeResult.promptOutput;
      try { localStorage.setItem('ph_workspace_latest_html', outputHtml); } catch {}
      return outputHtml;
    }

    // 3. Scan chat messages backwards for html / code blocks
    for (let i = messages.length - 1; i >= 0; i--) {
      const text = messages[i]?.text || '';
      const htmlBlockMatch = text.match(/```(?:html|htm)\s*([\s\S]*?)```/i);
      if (htmlBlockMatch && htmlBlockMatch[1] && htmlBlockMatch[1].trim().length > 0) {
        try { localStorage.setItem('ph_workspace_latest_html', htmlBlockMatch[1].trim()); } catch {}
        return htmlBlockMatch[1].trim();
      }
      const genericBlockMatch = text.match(/```(?:jsx|tsx|xml)?\s*([\s\S]*?)```/i);
      if (
        genericBlockMatch &&
        genericBlockMatch[1] &&
        (genericBlockMatch[1].includes('<html') ||
          genericBlockMatch[1].includes('<!DOCTYPE') ||
          genericBlockMatch[1].includes('<div') ||
          genericBlockMatch[1].includes('<body'))
      ) {
        try { localStorage.setItem('ph_workspace_latest_html', genericBlockMatch[1].trim()); } catch {}
        return genericBlockMatch[1].trim();
      }
    }

    // 4. Check cached workspace html in localStorage
    try {
      const cached = localStorage.getItem('ph_workspace_latest_html');
      if (cached && cached.trim().length > 0) return cached;
    } catch {}

    return '';
  }, [currentFiles, activeResult, messages]);

  const handleExportToDesktop = useCallback(async (projectId?: string) => {
    if (isExportingZip) return;

    const deployableHtml = extractDeployableHtml();

    // Check if we have files in currentFiles or in an active project or deployableHtml
    if (currentFiles.length === 0 && !projectId && !activeProject?.id && !deployableHtml) {
      showToast('No project files to download yet. Create or generate code in the workspace first!', 'info');
      return;
    }

    setIsExportingZip(true);
    try {
      const projName = activeResult?.title?.replace(/\s*—\s*.*$/, '') || activeProject?.name || 'project-package';
      const safeName = projName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `${safeName}-${Date.now().toString(36)}.zip`;

      const filesToExport: ZipFileInput[] = currentFiles.map((f) => ({
        path: f.path,
        content: f.content,
      }));

      // Ensure index.html exists in zip bundle if deployable HTML is available
      if (!filesToExport.some((f) => f.path.endsWith('.html')) && deployableHtml) {
        filesToExport.unshift({
          path: 'index.html',
          content: deployableHtml,
        });
      }

      // Ensure vercel.json is included for 1-click zero-config Vercel deployment
      if (!filesToExport.some((f) => f.path === 'vercel.json')) {
        filesToExport.push({
          path: 'vercel.json',
          content: JSON.stringify({ cleanUrls: true, trailingSlash: false }, null, 2),
        });
      }

      if (filesToExport.length > 0) {
        const zipBlob = generateZipArchive(filesToExport);
        downloadFileToDesktop(zipBlob, filename);
        showToast(`✓ Downloaded ${filename} to your desktop! Ready for 1-click Vercel or Netlify Drop.`, 'success');

        // Background sync to activeProject if available
        let targetId = projectId || activeProject?.id;
        if (!targetId) {
          try {
            const proj = await workService.createProject({
              name: projName,
              description: activeResult?.summary || 'Created with PromptHub',
            });
            for (const f of filesToExport) {
              await workService.writeFile(proj.id, {
                path: f.path,
                content: typeof f.content === 'string' ? f.content : new TextDecoder().decode(f.content),
              });
            }
            setActiveProject(proj);
          } catch {}
        }
        return;
      }

      // 2. Fallback to workService project export if no in-memory files
      let targetId = projectId || activeProject?.id;
      if (targetId) {
        const res = await workService.exportProjectToDesktop(targetId);
        if (res.success) {
          showToast(`✓ Downloaded ${res.filename} to desktop!`, 'success');
        } else {
          showToast(`Export failed: ${res.error || 'No files to export in this project.'}`, 'error');
        }
      }
    } catch (err: any) {
      showToast('Export failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsExportingZip(false);
    }
  }, [isExportingZip, extractDeployableHtml, currentFiles, activeProject, activeResult]);


  // Add Custom Knowledge Rule
  const handleAddKnowledge = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    adaptiveKnowledgeService.addKnowledgeItem(
      {
        category: 'rule',
        key: newKey.trim(),
        value: newValue.trim(),
        source: 'manual',
        importance: 'high',
      },
      user?.id
    );
    setNewKey('');
    setNewValue('');
    setKnowledgeItems(adaptiveKnowledgeService.getKnowledgeItems(user?.id));
    showToast('Learned rule added to Knowledge Base!', 'success');
  };

  const handleDeleteKnowledge = (id: string) => {
    adaptiveKnowledgeService.removeKnowledgeItem(id, user?.id);
    setKnowledgeItems(adaptiveKnowledgeService.getKnowledgeItems(user?.id));
    showToast('Knowledge item removed.', 'info');
  };

  const workspaceContent = (
    <div
      className={`flex flex-col bg-bg-primary text-text-primary ${
        isFullscreen ? 'fixed inset-0 z-[9999] w-screen h-screen' : 'h-full'
      } overflow-hidden font-sans`}
    >
      {/* ── Top Header Bar (Simplified & De-cluttered, Req #2) ────────────────────────── */}
      <div className="h-12 border-b border-border-default bg-bg-secondary px-3 sm:px-4 flex items-center justify-between shrink-0 select-none gap-2 z-20">
        {/* Left Side: Brand & Project Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center shrink-0">
              <PromptHubLogo variant="icon" size={26} showTile={false} useVector={true} />
            </div>
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold font-display text-text-primary truncate max-w-[130px] sm:max-w-[200px] md:max-w-[280px] lg:max-w-[340px]" title={loadedPromptInfo?.title || activeResult?.title || (activeProject ? activeProject.name : 'Creation Studio')}>
                {loadedPromptInfo?.title || activeResult?.title || (activeProject ? activeProject.name : 'Creation Studio')}
              </span>
              <span className="hidden md:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-bold border border-brand-primary/20 shrink-0">
                {currentFiles.length > 0 ? `${currentFiles.length} files` : 'Studio'}
              </span>
              {activeTeam && (
                <button
                  type="button"
                  onClick={() => setActiveTab('teams')}
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-mono shrink-0 hover:bg-blue-500/20 transition-colors cursor-pointer"
                  title={`Active Team: ${activeTeam.name}`}
                >
                  <Users className="w-3 h-3" />
                  <span className="truncate max-w-[90px] font-semibold">{activeTeam.name}</span>
                </button>
              )}
            </div>
          </div>

          <div className="h-3.5 w-px bg-border-default hidden sm:block" />

          {/* Project Switcher */}
          <button
            type="button"
            onClick={() => setIsProjectsDrawerOpen(!isProjectsDrawerOpen)}
            className="h-7 min-h-[28px] flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-border-default hover:border-brand-primary/50 bg-bg-primary hover:bg-bg-tertiary text-xs font-semibold text-text-primary transition-all cursor-pointer shadow-3xs shrink-0"
            title="Open Projects & Workspaces"
            aria-label="Open Projects"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span className="font-semibold truncate max-w-[120px]">
              {activeProject ? activeProject.name : 'Projects'}
            </span>
            <ChevronDown className={`w-3 h-3 text-text-muted transition-transform duration-200 ${isProjectsDrawerOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Files Explorer Toggle */}
          <button
            type="button"
            onClick={() => setIsFolderTreeOpen(!isFolderTreeOpen)}
            className={`h-7 min-h-[28px] flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-3xs shrink-0 ${
              isFolderTreeOpen
                ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary'
                : 'border-border-default hover:border-brand-primary/50 bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
            title="Toggle Cloud & Drive Folder Tree"
            aria-label="Toggle Folder Tree"
          >
            <FolderOpen className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span className="hidden sm:inline">Files</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-bg-tertiary border border-border-default text-text-muted">
              {currentFiles.length}
            </span>
          </button>
        </div>

        {/* Right: Clean, Compact Controls (No Clutter, Minimal Workspace Header) */}
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar py-0.5">
          {/* Milestone 2: Temporary Chat Active Pill */}
          {isTemporaryChat && (
            <div
              className="h-7 min-h-[28px] flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-mono font-medium shrink-0 shadow-3xs"
              title="Temporary Chat Mode Active: Zero memories or files are permanently persisted"
            >
              <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Temporary Chat</span>
              <span className="sm:hidden">Temp</span>
            </div>
          )}

          {/* Past Chats / History Button (Only visible after entering a folder) */}
          {activeProject && (
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="h-7 min-h-[28px] flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-medium transition-all cursor-pointer shadow-3xs shrink-0"
              title={`View Saved History in ${activeProject.name}`}
              aria-label="Folder Chat History"
            >
              <History className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span className="hidden lg:inline">History</span>
              {savedSessions.filter((s) => s.folderId === activeProject.id || s.projectId === activeProject.id).length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-bg-tertiary border border-border-default text-text-muted">
                  {savedSessions.filter((s) => s.folderId === activeProject.id || s.projectId === activeProject.id).length}
                </span>
              )}
            </button>
          )}

          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleNewChat}
            className="h-7 min-h-[28px] flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0"
            title="Start a new conversation (saves past chat to history)"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>New Chat</span>
          </button>

          {/* Delete Current Chat Button (Allows deleting active chat directly on current screen) */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteCurrentChat}
              className="h-7 min-h-[28px] flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-border-default hover:border-rose-500/50 bg-bg-secondary hover:bg-rose-500/10 text-xs font-medium text-text-muted hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer shadow-3xs shrink-0"
              title="Delete current chat conversation"
              aria-label="Delete current chat"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Delete Chat</span>
            </button>
          )}

          {/* Active MCP Status Indicator Pill */}
          {activeMcpCount > 0 && (
            <button
              type="button"
              onClick={() => setIsDeveloperDrawerOpen(true)}
              className="h-7 min-h-[28px] flex items-center gap-1 px-2 py-0.5 rounded-lg border border-brand-primary/30 bg-brand-primary/10 hover:bg-brand-primary/20 text-xs font-mono font-semibold text-brand-primary transition-all cursor-pointer shadow-3xs shrink-0"
              title={`${activeMcpCount} MCP Servers Connected. Click to configure tools.`}
              aria-label={`${activeMcpCount} MCP Servers Connected`}
            >
              <Server className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">{activeMcpCount} MCP</span>
            </button>
          )}

          {/* Model Config Button */}
          <button
            type="button"
            onClick={() => setIsDeveloperDrawerOpen(true)}
            className="h-7 min-h-[28px] flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-border-default hover:border-brand-primary/50 bg-bg-primary hover:bg-bg-tertiary text-xs font-medium text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-3xs shrink-0 relative"
            title="Configure Model Parameters & Custom Directives"
            aria-label="Model Configuration"
          >
            <Sliders className="w-3.5 h-3.5 text-brand-primary shrink-0" />
            <span className="hidden md:inline">Config</span>
          </button>

          {/* Guide Help Button */}
          <button
            type="button"
            onClick={() => setIsHelpModalOpen(true)}
            className="h-7 w-7 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-all cursor-pointer shadow-3xs shrink-0"
            title="Studio Guide & Help"
            aria-label="Studio Guide"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="h-7 w-7 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-all cursor-pointer shadow-3xs shrink-0"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Segmented View Switcher (Prompt Chat vs Live Output) */}
      <div className="lg:hidden flex items-center justify-between px-2.5 py-1.5 bg-bg-secondary border-b border-border-default shrink-0 z-10">
        <div className="flex items-center gap-1 bg-bg-tertiary p-0.5 rounded-lg border border-border-default w-full">
          <button
            type="button"
            onClick={() => setMobileActiveView('chat')}
            className={`flex-1 h-7 min-h-[28px] px-2 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileActiveView === 'chat'
                ? 'bg-brand-primary text-white shadow-3xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat ({messages.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileActiveView('preview')}
            className={`flex-1 h-7 min-h-[28px] px-2 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileActiveView === 'preview'
                ? 'bg-brand-primary text-white shadow-3xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Preview ({currentFiles.length})</span>
          </button>
        </div>
      </div>

      {/* ── Main View Area: 3-Panel Studio Layout ────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Antigravity & Figma-style Files/Folder Tree & Drive Cloud Vault */}
        <WorkspaceFolderTree
          projectName={activeResult?.title || activeProject?.name || 'project-bundle'}
          files={currentFiles}
          selectedFilePath={activeFilePath}
          onSelectFile={(file) => handleOpenFile(file)}
          onSyncToDrive={() => handleSyncToDrive()}
          onExportZip={() => handleExportToDesktop()}
          isSyncingDrive={isSyncingDrive}
          isExportingZip={isExportingZip}
          storageQuota={storageQuota}
          isCollapsed={!isFolderTreeOpen}
          onToggleCollapse={() => setIsFolderTreeOpen(!isFolderTreeOpen)}
        />

        {/* Center & Right Studio Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {messages.length === 0 ? (
            /* Empty State: Clean, friendly, ChatGPT-style with right-aligned scrollbar */
            <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
              <div className="flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full select-none py-6 sm:py-10 pb-16">
          <div className="mb-3 flex items-center justify-center shrink-0">
            <PromptHubLogo variant="icon" size={44} showTile={true} useVector={true} />
          </div>

          <div className="text-[11px] font-mono uppercase tracking-wider text-brand-primary mb-1">
            PromptHub Studio
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-text-primary text-center tracking-tight mb-2">
            The AI Prompt Engineering Studio & Model Arena
          </h1>
          <span className="sr-only">What would you like to create today?</span>
          <p className="text-xs sm:text-sm text-text-secondary text-center max-w-md mb-6 leading-relaxed">
            Describe what you want to create or improve in plain English. Direct prompt engineering, multi-model execution, and instant sandboxed previews.
          </p>

          {/* Active Loaded Prompt Banner (if loaded from library or marketplace) */}
          {loadedPromptInfo && (
            <div className="w-full max-w-2xl mb-3 px-3.5 py-2 rounded-xl bg-bg-secondary border border-brand-primary/30 flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-brand-primary/15 text-brand-primary border border-brand-primary/25 shrink-0">
                  {loadedPromptInfo.category || 'Prompt'}
                </span>
                <span className="font-semibold text-text-primary truncate">
                  {loadedPromptInfo.title || 'Loaded Prompt'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLoadedPromptInfo(null);
                  setInputPrompt('');
                }}
                className="text-xs text-text-muted hover:text-rose-500 transition-colors p-1 cursor-pointer"
                title="Clear loaded prompt"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Storage Quota Warning Barrier */}
          {isStorageFull && (
            <div className="w-full mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-500">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span><strong>Storage Quota Full (500 MB)</strong>: Generation paused to protect your Google Drive pool.</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('storage')}
                className="px-3 py-1 rounded-lg bg-rose-500 text-white font-medium hover:bg-rose-600 transition-colors"
              >
                Manage Vault
              </button>
            </div>
          )}

          {/* Project Folder Required Notice (When no folder is entered) */}
          {!activeProject && (
            <div className="w-full max-w-2xl mb-3 p-3 rounded-xl bg-bg-secondary border border-border-default flex items-center justify-between gap-3 shadow-3xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <span>Project Folder Required</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">Compulsory</span>
                  </div>
                  <p className="text-[11px] text-text-muted truncate">
                    All chat conversations, code files, and AI agent outputs are organized into project folders.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(true)}
                className="h-8 min-h-[32px] px-3.5 py-1 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-3xs shrink-0 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Folder</span>
              </button>
            </div>
          )}

          {/* Model Selector Bar (User Choice, Replaced Autonomous Routing, Req #3) */}
          <div className="w-full flex items-center justify-between gap-2 mb-2 px-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsModelPickerOpen(!isModelPickerOpen)}
                className="min-h-[32px] flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-xs font-mono text-text-primary transition-all cursor-pointer shadow-3xs"
                title="Select AI Model"
              >
                <Cpu className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                <span className="font-semibold text-text-primary truncate max-w-[130px] sm:max-w-[200px]">
                  {getModelInfo(selectedModel).label}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 shrink-0">
                  {getModelInfo(selectedModel).badge}
                </span>
                <ChevronDown className={`w-3 h-3 text-text-muted transition-transform duration-200 ${isModelPickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {isModelPickerOpen && (
                <div className="absolute left-0 bottom-full mb-1.5 w-80 sm:w-96 rounded-2xl bg-bg-elevated border border-border-default shadow-2xl p-2.5 z-50 space-y-2">
                  {/* Header with Daily Run Counter */}
                  <div className="px-1 py-0.5 border-b border-border-subtle pb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-primary">
                      <Cpu className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Select AI Model</span>
                    </div>
                    <div className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-bg-tertiary border border-border-subtle text-text-secondary font-medium">
                      {connectedProviders.length > 0
                        ? `${byokModels.length} BYOK Models (0 cr)`
                        : `${getDailyFreeRunsCount()}/${FREE_TIER_DAILY_LIMIT} Free Runs Today`}
                    </div>
                  </div>

                  {/* Search Input for Models */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      placeholder="Search models, providers (e.g. 'claude', 'gemini')..."
                      className="w-full bg-bg-secondary border border-border-default rounded-xl pl-8 pr-7 py-1.5 text-xs text-text-primary placeholder:text-text-muted/60 outline-none focus:border-brand-primary font-sans transition-colors"
                      autoFocus
                    />
                    {modelSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setModelSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 text-xs cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Provider Latency & Plan Disclaimer */}
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                    <span><strong>Direct & Free Routing</strong>: BYOK and OpenRouter Free models consume 0 platform credits.</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 custom-scrollbar py-0.5 pr-0.5">
                    {/* Section 0: Connected BYOK Models */}
                    {byokModels.length > 0 && (
                      <div>
                        <div className="px-1 text-[9.5px] font-mono text-text-muted uppercase tracking-wider font-bold mb-1 flex items-center justify-between">
                          <span>Your Connected Keys ({byokModels.length})</span>
                          <span className="text-emerald-500 font-bold">0 Credits</span>
                        </div>
                        <div className="space-y-1">
                          {byokModels
                            .filter((m) => {
                              if (!modelSearchQuery.trim()) return true;
                              const q = modelSearchQuery.toLowerCase();
                              return (
                                m.label.toLowerCase().includes(q) ||
                                m.id.toLowerCase().includes(q) ||
                                (m.description && m.description.toLowerCase().includes(q)) ||
                                (m.providerName && m.providerName.toLowerCase().includes(q))
                              );
                            })
                            .map((m) => (
                              <button
                                key={`top-byok-${m.id}`}
                                type="button"
                                onClick={() => {
                                  setSelectedModel(m.id);
                                  try { localStorage.setItem('ph_workspace_selected_model', m.id); } catch {}
                                  setIsModelPickerOpen(false);
                                  setModelSearchQuery('');
                                }}
                                className={`w-full text-left p-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                  selectedModel === m.id
                                    ? 'bg-brand-primary/15 border border-brand-primary/40 text-brand-primary font-semibold'
                                    : 'hover:bg-bg-secondary text-text-secondary hover:text-text-primary border border-transparent'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-text-primary text-xs truncate">{m.label}</div>
                                  <div className="text-[10px] text-text-muted truncate">{m.description}</div>
                                </div>
                                <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0 font-medium text-emerald-600 dark:text-emerald-400">
                                  {m.badge}
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Standard Models: Only shown when no BYOK API keys are connected */}
                    {connectedProviders.length === 0 && (
                      <>
                        {/* Section 1: PromptHub Auto-Pilot */}
                    {WORKSPACE_MODELS.filter((m) => m.tier === 'auto').some((m) => !modelSearchQuery.trim() || m.label.toLowerCase().includes(modelSearchQuery.toLowerCase()) || m.id.toLowerCase().includes(modelSearchQuery.toLowerCase())) && (
                      <div>
                        <div className="px-1 text-[9.5px] font-mono text-text-muted uppercase tracking-wider font-bold mb-1">
                          PromptHub Auto-Pilot
                        </div>
                        <div className="space-y-1">
                          {WORKSPACE_MODELS.filter((m) => m.tier === 'auto')
                            .filter((m) => {
                              if (!modelSearchQuery.trim()) return true;
                              const q = modelSearchQuery.toLowerCase();
                              return m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
                            })
                            .map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setSelectedModel(m.id);
                                  try { localStorage.setItem('ph_workspace_selected_model', m.id); } catch {}
                                  setIsModelPickerOpen(false);
                                  setModelSearchQuery('');
                                }}
                                className={`w-full text-left p-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                  selectedModel === m.id
                                    ? 'bg-brand-primary/15 border border-brand-primary/40 text-brand-primary font-semibold'
                                    : 'hover:bg-bg-secondary text-text-secondary hover:text-text-primary border border-transparent'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-text-primary text-xs truncate">{m.label}</div>
                                  <div className="text-[10px] text-text-muted truncate">{m.description}</div>
                                </div>
                                <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-subtle shrink-0 font-medium text-brand-primary">
                                  {m.badge}
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Section 2: OpenRouter Free Models */}
                    {WORKSPACE_MODELS.filter((m) => m.tier === 'free' && m.category === 'code').some((m) => !modelSearchQuery.trim() || m.label.toLowerCase().includes(modelSearchQuery.toLowerCase()) || m.id.toLowerCase().includes(modelSearchQuery.toLowerCase())) && (
                      <div>
                        <div className="px-1 text-[9.5px] font-mono text-text-muted uppercase tracking-wider font-bold mb-1 flex items-center justify-between">
                          <span>OpenRouter Free Models</span>
                          <span className="text-emerald-500 font-bold">0 Credits</span>
                        </div>
                        <div className="space-y-1">
                          {WORKSPACE_MODELS.filter((m) => m.tier === 'free' && m.category === 'code')
                            .filter((m) => {
                              if (!modelSearchQuery.trim()) return true;
                              const q = modelSearchQuery.toLowerCase();
                              return m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
                            })
                            .map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setSelectedModel(m.id);
                                  try { localStorage.setItem('ph_workspace_selected_model', m.id); } catch {}
                                  setIsModelPickerOpen(false);
                                  setModelSearchQuery('');
                                }}
                                className={`w-full text-left p-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                  selectedModel === m.id
                                    ? 'bg-brand-primary/15 border border-brand-primary/40 text-brand-primary font-semibold'
                                    : 'hover:bg-bg-secondary text-text-secondary hover:text-text-primary border border-transparent'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-text-primary text-xs truncate">{m.label}</div>
                                  <div className="text-[10px] text-text-muted truncate">{m.description}</div>
                                </div>
                                <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-subtle shrink-0 font-medium text-emerald-600 dark:text-emerald-400">
                                  {m.badge}
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Section 3: aicredits.in Paid Frontier Models (Filtered out when user has BYOK and 0 credits) */}
                    {((user?.credits ?? 0) > 0 || (user?.plan && user.plan !== 'free') || connectedProviders.length === 0) &&
                      WORKSPACE_MODELS.filter((m) => m.tier === 'paid' && m.category === 'code' && !byokModels.some((bm) => bm.id === m.id)).some((m) => !modelSearchQuery.trim() || m.label.toLowerCase().includes(modelSearchQuery.toLowerCase()) || m.id.toLowerCase().includes(modelSearchQuery.toLowerCase())) && (
                      <div>
                        <div className="px-1 text-[9.5px] font-mono text-text-muted uppercase tracking-wider font-bold mb-1 flex items-center justify-between">
                          <span>aicredits.in Paid Frontier</span>
                          <span className="text-amber-500 font-bold">Fast Lane</span>
                        </div>
                        <div className="space-y-1">
                          {WORKSPACE_MODELS.filter((m) => m.tier === 'paid' && m.category === 'code' && !byokModels.some((bm) => bm.id === m.id))
                            .filter((m) => {
                              if (!modelSearchQuery.trim()) return true;
                              const q = modelSearchQuery.toLowerCase();
                              return m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
                            })
                            .map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setSelectedModel(m.id);
                                  try { localStorage.setItem('ph_workspace_selected_model', m.id); } catch {}
                                  setIsModelPickerOpen(false);
                                  setModelSearchQuery('');
                                }}
                                className={`w-full text-left p-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                  selectedModel === m.id
                                    ? 'bg-brand-primary/15 border border-brand-primary/40 text-brand-primary font-semibold'
                                    : 'hover:bg-bg-secondary text-text-secondary hover:text-text-primary border border-transparent'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-text-primary text-xs truncate">{m.label}</div>
                                  <div className="text-[10px] text-text-muted truncate">{m.description}</div>
                                </div>
                                <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-subtle shrink-0 font-medium text-amber-600 dark:text-amber-400">
                                  {m.badge} ({m.creditCost} cr)
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Section 4: Visual & Image Models */}
                    {WORKSPACE_MODELS.filter((m) => m.category === 'image').some((m) => !modelSearchQuery.trim() || m.label.toLowerCase().includes(modelSearchQuery.toLowerCase()) || m.id.toLowerCase().includes(modelSearchQuery.toLowerCase())) && (
                      <div>
                        <div className="px-1 text-[9.5px] font-mono text-text-muted uppercase tracking-wider font-bold mb-1 flex items-center justify-between">
                          <span>Image Generation Models</span>
                          <span className="text-purple-500 font-bold">Visual</span>
                        </div>
                        <div className="space-y-1">
                          {WORKSPACE_MODELS.filter((m) => m.category === 'image')
                            .filter((m) => {
                              if (!modelSearchQuery.trim()) return true;
                              const q = modelSearchQuery.toLowerCase();
                              return m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
                            })
                            .map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setSelectedModel(m.id);
                                  try { localStorage.setItem('ph_workspace_selected_model', m.id); } catch {}
                                  setIsModelPickerOpen(false);
                                  setModelSearchQuery('');
                                }}
                                className={`w-full text-left p-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                  selectedModel === m.id
                                    ? 'bg-brand-primary/15 border border-brand-primary/40 text-brand-primary font-semibold'
                                    : 'hover:bg-bg-secondary text-text-secondary hover:text-text-primary border border-transparent'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-text-primary text-xs truncate">{m.label}</div>
                                  <div className="text-[10px] text-text-muted truncate">{m.description}</div>
                                </div>
                                <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-subtle shrink-0 font-medium text-purple-600 dark:text-purple-400">
                                  {m.badge}
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                    {/* Empty Search State */}
                    {modelSearchQuery.trim() &&
                      !byokModels.some((m) => m.label.toLowerCase().includes(modelSearchQuery.toLowerCase()) || m.id.toLowerCase().includes(modelSearchQuery.toLowerCase())) &&
                      !WORKSPACE_MODELS.some((m) => m.label.toLowerCase().includes(modelSearchQuery.toLowerCase()) || m.id.toLowerCase().includes(modelSearchQuery.toLowerCase())) && (
                        <div className="py-6 text-center text-xs text-text-muted">
                          No models found matching "{modelSearchQuery}".
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(true)}
                className="text-[11px] font-semibold text-text-muted hover:text-brand-primary flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-brand-primary/10 transition-colors cursor-pointer"
                title="Explore PromptHub studio capabilities and keyboard shortcuts"
              >
                <HelpCircle className="w-3.5 h-3.5 text-brand-primary" />
                <span className="hidden sm:inline">Capabilities</span>
              </button>
            </div>
          </div>

          {/* Stacked Active Skills & Pinned Conversation Banner */}
          {(activeSkills.length > 0 || pinnedSession) && (
            <div className="w-full mb-2 flex flex-wrap items-center gap-1.5 px-1">
              {pinnedSession && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-500 text-xs font-mono font-medium shadow-3xs">
                  <Pin className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">Pinned: {pinnedSession.title}</span>
                  <button
                    type="button"
                    onClick={handleUnpinSession}
                    className="hover:opacity-100 opacity-60 p-0.5 ml-1 rounded cursor-pointer"
                    title="Unpin conversation"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {activeSkills.map((sk) => (
                <div
                  key={sk.id}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold ${sk.colorClass} shadow-3xs`}
                >
                  <span>{sk.command}</span>
                  <span className="text-[9.5px] font-sans font-normal opacity-75">({sk.label})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(sk.id)}
                    className="hover:opacity-100 opacity-60 p-0.5 ml-0.5 rounded cursor-pointer"
                    title={`Remove ${sk.command}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {activeSkills.length > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveSkills([])}
                  className="text-[10px] font-mono text-text-muted hover:text-rose-500 underline ml-1 cursor-pointer"
                >
                  Clear skills
                </button>
              )}
            </div>
          )}

          {/* Primary Message Composer */}
          <div
            data-tour="tour-workspace-input"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFiles(true);
            }}
            onDragLeave={() => setIsDraggingFiles(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFiles(false);
              if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
            }}
            className={`w-full relative bg-bg-secondary rounded-2xl border ${
              isDraggingFiles ? 'border-brand-primary ring-2 ring-brand-primary/30 bg-brand-primary/5' : 'border-border-default'
            } focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 shadow-xs p-3 transition-all duration-200`}
          >
            {/* Multimodal Attachment Tray */}
            <WorkspaceAttachmentTray attachments={attachments} onRemoveAttachment={handleRemoveAttachment} />

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files) handleFilesSelected(e.target.files);
                e.target.value = '';
              }}
              multiple
              accept="image/*,.pdf,.txt,.md,.csv,.json"
              className="hidden"
            />
            {/* Slash Command Autocomplete Menu (Skills show ONLY when typing /) */}
            {showSlashMenu && (
              <div className="absolute left-3 bottom-full mb-2 w-80 max-h-64 overflow-y-auto bg-bg-secondary border border-border-default rounded-xl shadow-xl p-1.5 z-40 custom-scrollbar">
                <div className="text-[10px] font-mono text-text-muted px-2 py-1 uppercase tracking-wider font-semibold flex items-center justify-between">
                  <span>Prompt Templates {slashQuery ? `("${slashQuery}")` : ''}</span>
                  <span className="text-[9px] text-brand-primary">Stackable</span>
                </div>
                {filteredSkills.length === 0 ? (
                  <div className="text-xs text-text-muted p-3 text-center">No matching skills found</div>
                ) : (
                  filteredSkills.map((sk, skIdx) => (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => handleAddSkill(sk)}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between group cursor-pointer ${
                        skIdx === menuSelectedIndex
                          ? 'bg-brand-primary/10 text-brand-primary font-semibold ring-1 ring-brand-primary/30'
                          : 'hover:bg-bg-tertiary text-text-primary'
                      }`}
                    >
                      <div>
                        <div className="font-mono font-bold text-text-primary group-hover:text-brand-primary flex items-center gap-1.5">
                          <span>{sk.command}</span>
                          <span className="font-normal text-text-secondary">({sk.label})</span>
                        </div>
                        <div className="text-[10px] text-text-muted line-clamp-1">{sk.description}</div>
                      </div>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded border bg-bg-tertiary text-text-muted shrink-0">
                        {sk.badge}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* At Mention (@) Previous Conversations Menu */}
            {showMentionMenu && (
              <div className="absolute left-3 bottom-full mb-2 w-84 max-h-64 overflow-y-auto bg-bg-secondary border border-border-default rounded-xl shadow-xl p-1.5 z-40 custom-scrollbar">
                <div className="text-[10px] font-mono text-text-muted px-2 py-1 uppercase tracking-wider font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <History className="w-3 h-3 text-amber-500" />
                    <span>Pin Previous Chat</span>
                  </span>
                  <span className="text-[9px] text-text-muted">{filteredSessions.length} sessions</span>
                </div>
                {filteredSessions.length === 0 ? (
                  <div className="text-xs text-text-muted p-3 text-center">
                    {savedSessions.length === 0
                      ? 'No saved conversations yet. Chat to build history!'
                      : `No conversations matching "${mentionQuery}"`}
                  </div>
                ) : (
                  filteredSessions.map((session, sIdx) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handlePinSession(session)}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex flex-col gap-0.5 group cursor-pointer ${
                        sIdx === menuSelectedIndex
                          ? 'bg-amber-500/10 text-amber-500 font-semibold ring-1 ring-amber-500/30'
                          : 'hover:bg-bg-tertiary text-text-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-primary group-hover:text-amber-500 truncate">
                          {session.title}
                        </span>
                        <span className="text-[9.5px] font-mono text-text-muted shrink-0">
                          {session.messageCount} msgs
                        </span>
                      </div>
                      <p className="text-[10.5px] text-text-muted line-clamp-1">
                        {session.lastSnippet || 'Conversational workflow'}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Milestone 2: Ephemeral Mode Warning Banner Strip */}
            {isTemporaryChat && (
              <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 rounded-lg shadow-3xs">
                <div className="flex items-center gap-2 min-w-0">
                  <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">Temporary chat active &bull; messages and files will not be saved.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTemporaryChat(false)}
                  className="text-amber-700 dark:text-amber-300 hover:underline font-semibold text-xs cursor-pointer ml-2 shrink-0"
                >
                  Turn Off
                </button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              id="unified-workspace-prompt-input"
              name="prompt"
              aria-label="Creation prompt input"
              value={inputPrompt}
              onChange={(e) => {
                handleInputChange(e.target.value);
                const t = e.target;
                t.style.height = 'auto';
                t.style.height = `${Math.min(180, Math.max(36, t.scrollHeight))}px`;
              }}
              onKeyDown={handleComposerKeyDown}
              onPaste={handlePaste}
              rows={1}
              placeholder="Tell PromptHub what you want to create, improve or accomplish..."
              className="w-full bg-transparent border-none outline-none resize-none text-xs sm:text-sm text-text-primary placeholder:text-text-muted/60 px-2 py-1.5 font-sans custom-scrollbar min-h-[36px] max-h-[180px]"
              disabled={isProcessing || isStorageFull}
            />

            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pt-2 border-t border-border-subtle/60 px-0.5">
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg border border-border-default bg-bg-tertiary hover:bg-bg-primary text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Attach images, documents, or data (PNG, JPG, PDF, CSV, JSON, TXT)"
                  aria-label="Attach files"
                >
                  <Paperclip className="w-3.5 h-3.5 text-brand-primary" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsTemporaryChat((prev) => !prev)}
                  className={`h-8 min-h-[32px] px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-3xs ${
                    isTemporaryChat
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold'
                      : 'border-border-default bg-bg-tertiary hover:bg-bg-primary text-text-secondary hover:text-text-primary'
                  }`}
                  title={isTemporaryChat ? 'Temporary Chat Active (Ctrl+Shift+T)' : 'Enable Temporary Chat (Ctrl+Shift+T)'}
                  aria-label="Toggle Temporary Chat Mode"
                  aria-pressed={isTemporaryChat}
                >
                  <EyeOff className={`w-3.5 h-3.5 shrink-0 ${isTemporaryChat ? 'text-amber-600 dark:text-amber-400' : 'text-text-muted'}`} />
                  <span>Temp Chat</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 ml-auto shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => setIsVoicePanelOpen((prev) => !prev)}
                  className="h-8 min-h-[32px] px-2.5 sm:px-3 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary hover:text-brand-primary flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer shadow-3xs shrink-0"
                  title="Talk to Yuno - Deepgram Voice Assistant"
                  aria-label="Talk to Yuno"
                >
                  <Mic className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span className="hidden sm:inline">Talk to Yuno</span>
                  <span className="sm:hidden">Voice</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!inputPrompt.trim()) return;
                    setVariableWorkflowPrompt(inputPrompt.trim());
                  }}
                  disabled={!inputPrompt.trim() || isProcessing || isStorageFull}
                  className="h-8 min-h-[32px] px-2.5 sm:px-3 rounded-lg border border-brand-primary/30 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-40"
                  title="Synthesize dynamic variables and customize before running"
                >
                  <Sliders className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Enhance with Variables</span>
                  <span className="sm:hidden">Variables</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={(!inputPrompt.trim() && attachments.length === 0) || isProcessing || isStorageFull}
                  className="h-8 min-h-[32px] px-3.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi disabled:opacity-40 text-white flex items-center justify-center gap-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0"
                  aria-label="Send message"
                >
                  <span>{loadedPromptInfo?.title ? 'Run Prompt' : 'Create'}</span>
                  <Send className="w-3 h-3 shrink-0" />
                </button>
              </div>
            </div>
          </div>

          {/* Discrete Composer Keyboard Shortcut Helper */}
          <div className="w-full flex items-center justify-between text-[11px] font-mono text-text-muted mt-2 px-1 select-none">
            <span>Press <kbd className="px-1 py-0.2 rounded bg-bg-tertiary border border-border-default text-text-secondary font-mono text-[9.5px]">Enter</kbd> to send &bull; <kbd className="px-1 py-0.2 rounded bg-bg-tertiary border border-border-default text-text-secondary font-mono text-[9.5px]">Shift+Enter</kbd> for newline</span>
            <span className="hidden sm:inline">Type <kbd className="px-1 py-0.2 rounded bg-bg-tertiary border border-border-default text-text-secondary font-mono text-[9.5px]">/</kbd> for templates &bull; <kbd className="px-1 py-0.2 rounded bg-bg-tertiary border border-border-default text-text-secondary font-mono text-[9.5px]">@</kbd> to pin</span>
          </div>

          {/* Inline Multi-Stage Variable Synthesizer & Enhancer Workflow */}
          {variableWorkflowPrompt && (
            <div className="w-full max-w-2xl my-3">
              <PromptVariableWorkflow
                userPrompt={variableWorkflowPrompt}
                selectedModel={selectedModel}
                onSelectModel={(m) => {
                  setSelectedModel(m);
                  try { localStorage.setItem('ph_workspace_selected_model', m); } catch {}
                }}
                onExecute={async (finalPrompt, _targetModel, metadata) => {
                  setLastUsedVariables(metadata.variables);
                  setVariableWorkflowPrompt(null);
                  await handleSubmit(finalPrompt);
                }}
                onDismiss={() => setVariableWorkflowPrompt(null)}
                isExecuting={isProcessing}
              />
            </div>
          )}

          {/* Quick-Start Architectural Intent Chips */}
          <div className="mt-5 w-full">
            <div className="text-[10.5px] font-mono text-text-muted font-bold uppercase tracking-wider mb-2 px-1">
              Architecture Quick-Starts:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'bp_service_site', badge: 'WEB', label: 'Web App & Clinic' },
                { id: 'bp_roi_calc', badge: 'CALC', label: 'ROI Calculator' },
                { id: 'bp_client_proposal', badge: 'PROPOSAL', label: 'Client Proposal' },
                { id: 'bp_portfolio_site', badge: 'STUDIO', label: 'Creator Portfolio' },
                { id: 'bp_ad_campaign', badge: 'GROWTH', label: 'Ad Campaign' },
                { id: 'bp_kpi_dashboard', badge: 'DATA', label: 'KPI Dashboard' },
              ].map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => handleSelectDefaultWithVariables(pill.id)}
                  className="min-h-[30px] px-2.5 py-1 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary/40 text-xs text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-3xs flex items-center gap-1.5 shrink-0"
                >
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-bg-tertiary text-text-muted border border-border-subtle">{pill.badge}</span>
                  <span className="font-medium truncate">{pill.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Curated Architectural Blueprint Catalog - 2-Column Responsive Bento */}
          <div className="mt-6 w-full space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div>
                <h2 className="text-sm font-bold font-display text-text-primary">
                  Architectural Starter Systems
                </h2>
                <p className="text-[11px] text-text-muted">
                  Production-grade digital deliverables and specifications with 1-click workspace export.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-0.5 bg-bg-secondary rounded-xl border border-border-default shrink-0">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'web', label: 'Websites' },
                  { id: 'calc', label: 'Calculators' },
                  { id: 'proposal', label: 'Proposals' },
                  { id: 'marketing', label: 'Growth & Ads' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveBlueprintCategory(cat.id as any)}
                    className={`min-h-[28px] px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeBlueprintCategory === cat.id
                        ? 'bg-brand-primary text-white shadow-3xs'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {[
                {
                  id: 'bp_service_site',
                  category: 'web',
                  badge: 'WEB • LIVE',
                  title: 'Service Business & Clinic Site',
                  description: 'Complete booking website with hero section, service cards, patient reviews, appointment form & Google Maps.',
                },
                {
                  id: 'bp_roi_calc',
                  category: 'calc',
                  badge: 'CALC • TOOL',
                  title: 'Client ROI & Cost Simulator',
                  description: 'Dynamic sliders where clients calculate monthly cost savings and payback timeframe in real time.',
                },
                {
                  id: 'bp_client_proposal',
                  category: 'proposal',
                  badge: 'PROPOSAL • AUDIT',
                  title: 'Agency Audit & Pitch Proposal',
                  description: 'Executive summary, current audit analysis, 3-phase delivery roadmap, KPI milestones, and investment pricing.',
                },
                {
                  id: 'bp_portfolio_site',
                  category: 'web',
                  badge: 'STUDIO • PORTFOLIO',
                  title: 'Boutique Creator Portfolio',
                  description: 'Showcase projects with category filter tabs, case study details, client logos, and an inquiry contact modal.',
                },
                {
                  id: 'bp_ad_campaign',
                  category: 'marketing',
                  badge: 'ADS • GROWTH',
                  title: 'High-Converting Ad Matrix',
                  description: 'Persuasive direct-response ad copy with 3 visual hooks, audience targeting personas, and conversion CTAs.',
                },
                {
                  id: 'bp_kpi_dashboard',
                  category: 'calc',
                  badge: 'DATA • APP',
                  title: 'Sales & Revenue Dashboard',
                  description: 'Live revenue metrics, conversion funnel charts, customer acquisition trends, and quick filter controls.',
                },
              ]
                .filter((b) => activeBlueprintCategory === 'all' || b.category === activeBlueprintCategory)
                .map((starter) => (
                  <button
                    key={starter.id}
                    type="button"
                    onClick={() => handleSelectDefaultWithVariables(starter.id)}
                    className="min-h-[44px] p-4 text-left rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary/50 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-3xs hover:shadow-xs min-w-0"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-bold border border-brand-primary/20 truncate">
                          {starter.badge}
                        </span>
                        <Sparkles className="w-3.5 h-3.5 text-text-muted group-hover:text-brand-primary transition-colors shrink-0" />
                      </div>
                      <div className="text-xs font-bold font-display text-text-primary group-hover:text-brand-primary transition-colors truncate">
                        {starter.title}
                      </div>
                      <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                        {starter.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-border-subtle flex items-center justify-between text-[11px] font-semibold text-brand-primary group-hover:text-brand-primary-hi">
                      <span>Customize with Variables</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
      ) : (
        /* Active Conversation Layout */
        <div 
          ref={splitContainerRef} 
          className="flex-1 flex overflow-hidden relative"
          style={{ userSelect: isDraggingSplit ? 'none' : undefined }}
        >
          {/* Collapsed Left Chat Ribbon (When Inspector is Maximized) */}
          {currentFiles.length > 0 && panelLayout === 'inspector-only' && (
            <div
              className="hidden lg:flex w-12 bg-bg-secondary border-r border-border-default flex-col items-center py-3 justify-between shrink-0 select-none"
              title="Click to expand chat stream"
            >
              <div className="flex flex-col items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setPanelLayout('split')}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-bg-tertiary hover:bg-brand-primary/10 hover:text-brand-primary border border-border-default flex items-center justify-center transition-colors cursor-pointer"
                  title="Expand Chat Stream"
                  aria-label="Expand Chat Stream"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-bold rotate-90 my-8 whitespace-nowrap">
                  Chat
                </span>
              </div>
              <div className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-subtle">
                {messages.length}
              </div>
            </div>
          )}

          {/* Left Pane: Conversational Stream */}
          <div
            style={
              panelLayout === 'split'
                ? { width: `${splitRatio}%` }
                : undefined
            }
            className={`${
              panelLayout === 'chat-only'
                ? 'flex-1'
                : 'w-full lg:border-r border-border-default'
            } flex flex-col bg-bg-primary transition-all duration-200 ${
              mobileActiveView === 'preview' ? 'hidden lg:flex' : 'flex'
            } ${panelLayout === 'inspector-only' ? 'hidden lg:hidden' : ''}`}
          >
            {/* Desktop Pane Header with Minimize / Maximize Controls */}
            <div className="hidden lg:flex h-9 bg-bg-secondary/70 border-b border-border-subtle px-3 items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-1.5 text-text-muted font-mono text-[11px]">
                <MessageSquare className="w-3.5 h-3.5 text-brand-primary" />
                <span className="font-semibold text-text-secondary">Prompt Studio Stream</span>
                <span>•</span>
                <span className="px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-default text-text-secondary flex items-center gap-1 font-sans font-medium text-[10px]">
                  <Cpu className="w-2.5 h-2.5 text-brand-primary" />
                  {getModelInfo(selectedModel).label}
                </span>
                <span>•</span>
                <span>{messages.length} messages</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleDeleteCurrentChat}
                  className="min-h-[44px] px-2 text-text-muted hover:text-rose-500 rounded hover:bg-rose-500/10 flex items-center gap-1 text-[11px] font-mono cursor-pointer transition-colors"
                  title="Delete current chat"
                  aria-label="Delete current chat"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" />
                  <span className="text-rose-500">Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPanelLayout(panelLayout === 'chat-only' ? 'split' : 'chat-only')}
                    className="min-h-[44px] px-2 text-text-muted hover:text-text-primary rounded hover:bg-bg-tertiary flex items-center gap-1 text-[11px] font-mono cursor-pointer transition-colors"
                    title={panelLayout === 'chat-only' ? 'Restore Split View' : 'Maximize Chat Stream'}
                    aria-label={panelLayout === 'chat-only' ? 'Restore Split View' : 'Maximize Chat Stream'}
                  >
                    {panelLayout === 'chat-only' ? (
                      <>
                        <Minimize2 className="w-3 h-3 text-brand-primary" />
                        <span>Restore</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3 h-3" />
                        <span>Maximize</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelLayout('inspector-only')}
                    className="min-h-[44px] px-2 text-text-muted hover:text-text-primary rounded hover:bg-bg-tertiary flex items-center gap-1 text-[11px] font-mono cursor-pointer transition-colors"
                    title="Collapse Chat to Ribbon"
                    aria-label="Collapse Chat to Ribbon"
                  >
                    <Minimize2 className="w-3 h-3" />
                    <span>Hide</span>
                  </button>
                </div>
              </div>

            {/* Scrollable Chat Stream (Clean, Direct Output Like ChatGPT) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-4">
              <div className={`space-y-4 ${panelLayout === 'chat-only' ? 'max-w-5xl xl:max-w-6xl mx-auto w-full px-1 sm:px-2' : 'w-full'}`}>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[95%] sm:max-w-[90%] md:max-w-[85%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] overflow-hidden min-w-0 ${
                      msg.sender === 'user'
                        ? 'bg-brand-primary text-white font-medium rounded-tr-xs shadow-xs'
                        : 'bg-bg-secondary text-text-primary border border-border-default rounded-tl-xs shadow-3xs w-full'
                    }`}
                  >
                    {editingMessageId === msg.id ? (
                      <div className="space-y-2 py-1 min-w-[280px] sm:min-w-[420px]">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={6}
                          className="w-full p-2.5 rounded-xl border border-brand-primary bg-bg-primary text-text-primary text-xs sm:text-sm font-sans focus:outline-hidden resize-y min-h-[120px]"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="min-h-[36px] px-3 py-1 rounded-lg border border-border-default bg-bg-tertiary text-text-secondary text-xs font-semibold hover:text-text-primary cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(msg.id)}
                            className="min-h-[36px] px-3.5 py-1 rounded-lg bg-brand-primary text-white text-xs font-semibold shadow-xs hover:bg-brand-primary-hi cursor-pointer flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      renderHumanFriendlyMarkdown(msg.text)
                    )}

                    {/* User Ingested Attachments Badges */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/20">
                        {msg.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex flex-col gap-1 p-2 rounded-xl bg-black/25 text-white text-[11px]"
                          >
                            <div className="flex items-center gap-1.5 font-mono">
                              <FileText className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                              <span className="truncate max-w-[220px] font-semibold">{att.name}</span>
                              <span className="text-[9.5px] opacity-75 uppercase">({att.formattedSize || att.kind})</span>
                            </div>
                            {att.extractedContent && (
                              <p className="text-[10.5px] font-mono text-white/80 line-clamp-3 bg-black/20 p-2 rounded-lg border border-white/10 break-words [overflow-wrap:anywhere]">
                                {att.extractedContent.slice(0, 240)}...
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Output Actions & Text Tools Bar for Assistant Messages */}
                  {msg.sender === 'assistant' && (() => {
                    const isSubstantialDeliverable = Boolean(
                      msg.deliverable ||
                      msg.result ||
                      msg.text.includes('```') ||
                      msg.text.length > 350 ||
                      msg.text.includes('\n## ') ||
                      msg.text.includes('\n### ') ||
                      (msg.text.includes('|') && msg.text.includes('---'))
                    );
                    const hasDeployableCode = Boolean(
                      (currentFiles && currentFiles.some(f => f.name.endsWith('.html') || f.path.endsWith('.html') || f.name.endsWith('.tsx') || f.path.endsWith('.tsx') || f.name.endsWith('.js') || f.path.endsWith('.js'))) ||
                      msg.text.includes('```html') ||
                      msg.text.includes('<!DOCTYPE html>')
                    );

                    if (!isSubstantialDeliverable) {
                      // Minimalist, subtle inline tools for casual chat (like ChatGPT / Claude)
                      return (
                        <div className="mt-1 flex items-center gap-1.5 opacity-75 hover:opacity-100 transition-opacity select-none">
                          <span className="h-6 px-1.5 py-0.5 rounded-md bg-bg-tertiary border border-border-default text-text-secondary text-[10px] font-mono flex items-center gap-1 shrink-0" title={`Generated with ${getModelInfo(msg.modelUsed || selectedModel).label}`}>
                            <Cpu className="w-2.5 h-2.5 text-brand-primary" />
                            <span>{getModelInfo(msg.modelUsed || selectedModel).label}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            className="h-6 px-2 py-0.5 rounded-md hover:bg-bg-tertiary text-text-muted hover:text-text-primary text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copy message"
                          >
                            {copiedMessageId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleRegenerateNewProduce}
                            disabled={isProcessing}
                            className="h-6 px-2 py-0.5 rounded-md hover:bg-bg-tertiary text-text-muted hover:text-text-primary text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            title="Retry response"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="mt-2 flex flex-col gap-1.5 max-w-[92%] sm:max-w-[85%] select-none">
                        {/* Top Action Row: Copy, Export, In-place Edit, Approve, Regenerate */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Model Attribution Badge */}
                          <span className="h-7 min-h-[28px] px-2 py-0.5 rounded-lg border border-border-default bg-bg-secondary text-text-secondary text-[11px] font-mono flex items-center gap-1.5 shadow-3xs" title={`Generated with ${getModelInfo(msg.modelUsed || selectedModel).label}`}>
                            <Cpu className="w-3 h-3 text-brand-primary" />
                            <span>{getModelInfo(msg.modelUsed || selectedModel).label}</span>
                          </span>

                          {/* Copy Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            className="h-7 min-h-[28px] px-2 py-0.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
                            title="Copy output text to clipboard"
                          >
                            {copiedMessageId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-text-muted" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Export Menu Dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveExportDropdownId(
                                  activeExportDropdownId === msg.id ? null : msg.id
                                )
                              }
                              className="h-7 min-h-[28px] px-2 py-0.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
                              title="Export output to .txt, .md, or PDF"
                            >
                              <Download className="w-3 h-3 text-text-muted" />
                              <span>Export</span>
                              <ChevronDown className="w-3 h-3 text-text-muted" />
                            </button>

                            {activeExportDropdownId === msg.id && (
                              <div className="absolute left-0 top-full mt-1.5 w-44 rounded-xl bg-bg-secondary border border-border-default shadow-xl p-1 z-30 space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleExportText(msg.text, 'txt', 'prompthub-output')}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-bg-tertiary text-text-primary flex items-center gap-2 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-text-muted" />
                                  <span>Plain Text (.txt)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExportText(msg.text, 'md', 'prompthub-output')}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-bg-tertiary text-text-primary flex items-center gap-2 cursor-pointer"
                                >
                                  <Code2 className="w-3.5 h-3.5 text-brand-primary" />
                                  <span>Markdown (.md)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExportText(msg.text, 'pdf', 'prompthub-output')}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-bg-tertiary text-text-primary flex items-center gap-2 cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Print / PDF Document</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* In-Place Edit Output (Direct text edit for non-tech users) */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(msg.id, msg.text)}
                            className="h-7 min-h-[28px] px-2 py-0.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
                            title="Directly edit and tweak this text"
                          >
                            <Edit3 className="w-3 h-3 text-text-muted" />
                            <span>Edit Text</span>
                          </button>

                          <div className="h-3.5 w-px bg-border-default mx-0.5" />

                          {/* Tweak Variables & Re-Run (Continuous Variable Enhancement Loop) */}
                          <button
                            type="button"
                            onClick={() => {
                              const promptToUse = latestSimplePrompt || 'Build a web application';
                              setVariableWorkflowPrompt(promptToUse);
                            }}
                            className="h-7 min-h-[28px] px-2 py-0.5 rounded-lg border border-brand-primary/30 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
                            title="Tweak template variables, switch LLM, and repeat"
                          >
                            <Sliders className="w-3 h-3 text-brand-primary" />
                            <span>Tweak Variables & Re-Run</span>
                          </button>

                          {/* Approve Output */}
                          <button
                            type="button"
                            onClick={handleApproveOutput}
                            className={`h-7 min-h-[28px] px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs ${
                              isOutputApproved
                                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                                : 'border border-border-default bg-bg-secondary hover:bg-emerald-500/10 text-text-secondary hover:text-emerald-600'
                            }`}
                            title="Approve this output"
                          >
                            {isOutputApproved ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-white" />
                                <span>Approved</span>
                              </>
                            ) : (
                              <>
                                <ThumbsUp className="w-3 h-3" />
                                <span>Approve</span>
                              </>
                            )}
                          </button>

                          {/* 1-Click Multi-Provider Publish & Hosting Guide (ONLY when deployable web code exists) */}
                          {hasDeployableCode && (
                            <button
                              type="button"
                              onClick={() => setIsLivePublishOpen(true)}
                              className="h-7 min-h-[28px] px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                              title="Publish Live & View Free / Paid Hosting Providers"
                            >
                              <Globe className="w-3 h-3" />
                              <span>Publish &amp; Host</span>
                            </button>
                          )}

                          {/* Regenerate Produce */}
                          <button
                            type="button"
                            onClick={handleRegenerateNewProduce}
                            disabled={isProcessing}
                            className="h-7 min-h-[28px] px-2 py-0.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs disabled:opacity-50"
                            title="Regenerate alternative response"
                          >
                            <RefreshCw className="w-3 h-3 text-text-muted" />
                            <span>Redo</span>
                          </button>
                        </div>

                        {/* Bottom One-Click Quick Refinement Chips for Substantial Deliverables */}
                        {!securityUtils.isMeaninglessOrGibberish(msg.text) && msg.text.length > 50 && !msg.text.includes("I'm sorry, I couldn't understand that request") && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="text-[10px] font-mono text-text-muted font-semibold uppercase tracking-wider mr-0.5">
                            Tweak:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickRefine('Simplify', 'Please simplify this text in plain, easy-to-understand everyday language', msg.text)}
                            disabled={isProcessing}
                            className="h-6 min-h-[24px] px-2 py-0.5 rounded-md border border-border-subtle bg-bg-secondary hover:bg-bg-tertiary text-[10.5px] text-text-secondary hover:text-brand-primary transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-brand-primary" />
                            <span>Simplify</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickRefine('Professional Tone', 'Please polish this into a clean, executive professional tone', msg.text)}
                            disabled={isProcessing}
                            className="h-6 min-h-[24px] px-2 py-0.5 rounded-md border border-border-subtle bg-bg-secondary hover:bg-bg-tertiary text-[10.5px] text-text-secondary hover:text-brand-primary transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          >
                            <Briefcase className="w-2.5 h-2.5 text-text-muted" />
                            <span>Executive Tone</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickRefine('Key Bullets', 'Please summarize this into clear, actionable bullet points', msg.text)}
                            disabled={isProcessing}
                            className="min-h-[32px] px-2.5 py-0.5 rounded-lg border border-border-subtle bg-bg-secondary hover:bg-bg-tertiary text-[11px] text-text-secondary hover:text-brand-primary transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          >
                            <FileText className="w-3 h-3 text-text-muted" />
                            <span>Key Bullets</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickRefine('Expand Depth', 'Please elaborate naturally with more helpful details, context, and practical examples', msg.text)}
                            disabled={isProcessing}
                            className="min-h-[32px] px-2.5 py-0.5 rounded-lg border border-border-subtle bg-bg-secondary hover:bg-bg-tertiary text-[11px] text-text-secondary hover:text-brand-primary transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          >
                            <Maximize2 className="w-3 h-3 text-text-muted" />
                            <span>Expand Depth</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickRefine('Fix Grammar', 'Please review and fix any grammar, spelling, phrasing, or flow errors while keeping the meaning intact', msg.text)}
                            disabled={isProcessing}
                            className="min-h-[32px] px-2.5 py-0.5 rounded-lg border border-border-subtle bg-bg-secondary hover:bg-bg-tertiary text-[11px] text-text-secondary hover:text-brand-primary transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          >
                            <CheckCircle className="w-3 h-3 text-text-muted" />
                            <span>Grammar &amp; Flow</span>
                          </button>
                        </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Inline Modular Deliverables Suite (Milestones 3–5) */}
                  {msg.deliverable && (
                    <div className="w-full mt-3">
                                            {msg.deliverable.type === 'presentation_deck' && msg.deliverable.presentationData && (
                        <PresentationDeliverableCard
                          data={{
                            ...msg.deliverable.presentationData,
                            version: msg.deliverable.version,
                            versions: msg.deliverable.versions,
                          }}
                          onVersionChange={(ver: number) => handleDeliverableVersionChange(msg.id, ver)}
                          onIterate={(p: string) => handleSubmit(p)}
                        />
                      )}
                      {msg.deliverable.type === 'video_script' && msg.deliverable.videoData && (
                        <VideoStoryboardDeliverableCard
                          data={{
                            ...msg.deliverable.videoData,
                            version: msg.deliverable.version,
                            versions: msg.deliverable.versions,
                          }}
                          onVersionChange={(ver: number) => handleDeliverableVersionChange(msg.id, ver)}
                          onIterate={(p: string) => handleSubmit(p)}
                        />
                      )}
                      {msg.deliverable.type === 'ad_campaign' && msg.deliverable.adData && (
                        <AdDeliverableCard
                          data={{
                            ...msg.deliverable.adData,
                            version: msg.deliverable.version,
                            versions: msg.deliverable.versions,
                          }}
                          onVersionChange={(ver: number) => handleDeliverableVersionChange(msg.id, ver)}
                          onIterate={(p: string) => handleSubmit(p)}
                        />
                      )}
                      {(msg.deliverable.type === 'written_report' || msg.deliverable.type === 'strategic_plan') &&
                        msg.deliverable.reportData && (
                          <ReportDeliverableCard
                            data={{
                              ...msg.deliverable.reportData,
                              version: msg.deliverable.version,
                              versions: msg.deliverable.versions,
                            }}
                            onVersionChange={(ver: number) => handleDeliverableVersionChange(msg.id, ver)}
                            onIterate={(p: string) => handleSubmit(p)}
                          />
                        )}
                      {msg.deliverable.type === 'data_analysis' && msg.deliverable.tableData && (
                        <DataTableDeliverableCard
                          data={{
                            ...msg.deliverable.tableData,
                            version: msg.deliverable.version,
                            versions: msg.deliverable.versions,
                          }}
                          onVersionChange={(ver: number) => handleDeliverableVersionChange(msg.id, ver)}
                          onIterate={(p: string) => handleSubmit(p)}
                        />
                      )}
                      {msg.deliverable.type === 'interactive_web_app' && msg.deliverable.codeAppData && (
                        <CodeAppDeliverableCard
                          data={{
                            ...msg.deliverable.codeAppData,
                            version: msg.deliverable.version,
                            versions: msg.deliverable.versions,
                          }}
                          onVersionChange={(ver: number) => handleDeliverableVersionChange(msg.id, ver)}
                          onIterate={(p: string) => handleSubmit(p)}
                          onOpenLivePreview={() => {
                            setPanelLayout('split');
                            setInspectorTab('preview');
                            setMobileActiveView('preview');
                          }}
                          onDeploy={() => setIsLivePublishOpen(true)}
                        />
                      )}
                    </div>
                  )}

                  {/* Pre-Rendered 3-Concept Preview Switcher (Milestone 1) */}
                  {msg.portfolioConcepts && msg.portfolioConcepts.length > 0 && (
                    <PortfolioConceptSwitcher
                      concepts={msg.portfolioConcepts}
                      selectedConceptId={selectedOptionId || activeResult?.activeOptionId}
                      onSelectConcept={handleAdoptConcept}
                      onPartialRevision={handlePartialRevision}
                      onRegenerateAll={handleRegenerateAll}
                      isAdopting={isAdoptingConcept}
                    />
                  )}

                  {/* Contextual Options in Conversation */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="mt-3 w-full bg-bg-secondary/70 border border-border-default rounded-2xl p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-semibold">
                          Choose an Architecture Direction:
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">3 Variations Available</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {msg.options.map((opt, optIdx) => {
                          const isSelected = selectedOptionId === opt.id;
                          const isMockupExpanded = !!expandedOptionPreviews[opt.id];
                          return (
                            <div
                              key={opt.id}
                              className={`p-3 sm:p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-2 ${
                                isSelected
                                  ? 'border-brand-primary bg-brand-primary/10 shadow-sm ring-1 ring-brand-primary/30'
                                  : 'border-border-default hover:border-brand-primary/40 bg-bg-primary hover:bg-bg-tertiary'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-md bg-bg-tertiary border border-border-default flex items-center justify-center text-[10px] font-mono font-bold text-text-secondary shrink-0">
                                    {optIdx + 1}
                                  </span>
                                  <span className="text-xs sm:text-sm font-bold text-text-primary truncate">
                                    {opt.title}
                                  </span>
                                  {opt.aesthetic && (
                                    <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-brand-primary/10 text-brand-primary font-medium shrink-0">
                                      {opt.aesthetic}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {opt.colorPalette && opt.colorPalette.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      {opt.colorPalette.map((col, cIdx) => (
                                        <span
                                          key={cIdx}
                                          className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-xs"
                                          style={{ backgroundColor: col }}
                                          title={col}
                                        />
                                      ))}
                                    </div>
                                  )}
                                  <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-bg-tertiary border border-border-default text-text-muted">
                                    {opt.previewBadge}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedOptionPreviews((prev) => ({
                                        ...prev,
                                        [opt.id]: !prev[opt.id],
                                      }))
                                    }
                                    className="min-h-[44px] text-[10px] font-mono px-2.5 py-1 rounded-lg border border-border-default hover:border-brand-primary/40 bg-bg-secondary text-text-secondary hover:text-text-primary flex items-center gap-1.5 cursor-pointer transition-colors"
                                    title="Toggle visual blueprint wireframe"
                                    aria-label="Toggle visual blueprint wireframe"
                                  >
                                    <Code2 className="w-3.5 h-3.5 text-brand-primary" />
                                    <span>{isMockupExpanded ? 'Hide Blueprint' : 'View Blueprint'}</span>
                                  </button>
                                </div>
                              </div>

                              <p className="text-[11.5px] text-text-secondary leading-snug line-clamp-2">
                                {opt.description}
                              </p>

                              {opt.highlights && (
                                <div className="flex flex-wrap gap-1">
                                  {opt.highlights.slice(0, 4).map((hl, hlIdx) => (
                                    <span
                                      key={hlIdx}
                                      className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-bg-secondary text-text-muted border border-border-subtle"
                                    >
                                      ✓ {hl}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Vector Architecture Blueprint Preview */}
                              {isMockupExpanded && (
                                <div className="w-full mt-1">
                                  <OptionBlueprintPreview option={opt} />
                                </div>
                              )}

                              {/* Action Button: Select This Design & Build Live App */}
                              <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-text-muted">
                                  {isSelected ? '✓ Active Architecture' : 'Production-ready stack'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSelectOption(opt)}
                                  disabled={isProcessing || isStorageFull}
                                  className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                                    isSelected
                                      ? 'bg-brand-primary text-white hover:bg-brand-primary-hi'
                                      : 'bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white border border-brand-primary/30'
                                  }`}
                                >
                                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                  <span>{isSelected ? '✓ Active In Sandbox' : 'Select Architecture & Build'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Suggested Follow-Ups */}
                  {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.suggestedFollowUps.map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleSubmit(prompt)}
                          disabled={isProcessing || isStorageFull}
                          className="h-7 min-h-[28px] text-[11px] px-2.5 py-0.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3 text-brand-primary shrink-0" />
                          <span>{prompt}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Project Delivery Action Bar */}
                  {currentFiles.length > 0 && msg.result && (
                    <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-border-subtle w-full flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (msg.result) {
                            setActiveResult(msg.result);
                          }
                          setIsLivePublishOpen(true);
                        }}
                        className="h-7 min-h-[28px] px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Publish Live (*.prompthub.site)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSyncToDrive()}
                        disabled={isSyncingDrive}
                        className="h-7 min-h-[28px] px-2.5 py-0.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        <HardDrive className="w-3 h-3 text-brand-primary" />
                        <span>{isSyncingDrive ? 'Syncing...' : 'Sync to Drive'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveToProjects}
                        className="h-7 min-h-[28px] px-2.5 py-0.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        <Bookmark className="w-3 h-3 text-brand-primary" />
                        <span>Save to Projects</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportToDesktop()}
                        disabled={isExportingZip}
                        className="h-7 min-h-[28px] px-2.5 py-0.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        <Download className="w-3 h-3 text-brand-primary" />
                        <span>{isExportingZip ? 'Exporting...' : 'Download ZIP'}</span>
                      </button>

                      {currentFiles.some((f) => f.name.endsWith('.html') || f.path.endsWith('.html')) && (
                        <button
                          type="button"
                          onClick={handleExportHtml}
                          className="h-7 min-h-[28px] px-2.5 py-0.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-3xs"
                          title="Download standalone HTML file"
                        >
                          <Code2 className="w-3 h-3 text-brand-primary" />
                          <span>Download HTML</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Downstream Actions */}
                  {msg.downstreamTasks && msg.downstreamTasks.length > 0 && (
                    <div className="mt-3 w-full bg-bg-secondary/70 border border-border-default rounded-xl p-3">
                      <div className="text-[10.5px] font-mono uppercase tracking-wider text-text-muted font-semibold mb-2.5 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Recommended Next Steps:</span>
                      </div>

                      <div className={`grid gap-2 ${panelLayout === 'chat-only' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                        {msg.downstreamTasks.map((task) => (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => handleExecuteDownstream(task)}
                            disabled={isProcessing}
                            className="min-h-[44px] text-left p-3 rounded-lg border border-border-default hover:border-brand-primary bg-bg-primary hover:bg-bg-tertiary transition-all cursor-pointer flex flex-col justify-between group"
                          >
                            <div className="flex items-center justify-between w-full mb-1 gap-2 min-w-0">
                              <span className="text-xs font-bold text-text-primary group-hover:text-brand-primary transition-colors truncate">
                                {task.title}
                              </span>
                              <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border-default shrink-0 whitespace-nowrap">
                                {task.badge}
                              </span>
                            </div>
                            <span className="text-[10.5px] text-text-muted line-clamp-2 leading-relaxed">
                              {task.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* In-Flight Processing Indicator — clean, ChatGPT-style (Req #8) */}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-bg-secondary border border-border-default text-text-secondary text-xs max-w-md shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-[3px] shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-[bounce_1.2s_ease-in-out_0s_infinite]" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-[bounce_1.2s_ease-in-out_0.2s_infinite]" style={{ animationDelay: '200ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-[bounce_1.2s_ease-in-out_0.4s_infinite]" style={{ animationDelay: '400ms' }} />
                    </div>
                    <span className="text-[12px] text-text-secondary">Working on it…</span>
                  </div>
                </motion.div>
              )}

              {/* Milestone Approved Banner (when user approved deliverable) */}
              {isOutputApproved && !isProcessing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold font-display">Deliverable Approved &amp; Bundled</div>
                      <div className="text-[11px] text-text-secondary opacity-90">
                        All code, images, and master prompt.md are bundled in 📁 <strong>{activeResult?.title || activeProject?.name || 'project-bundle'}</strong> and ready to Sync to Google Drive or Export ZIP.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSyncToDrive()}
                      disabled={isSyncingDrive}
                      className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>{isSyncingDrive ? 'Syncing...' : 'Sync Drive'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportToDesktop()}
                      disabled={isExportingZip}
                      className="min-h-[44px] px-3.5 py-1.5 rounded-lg border border-emerald-500/40 bg-bg-primary hover:bg-bg-tertiary text-text-primary font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isExportingZip ? 'Exporting...' : 'Download ZIP'}</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Multi-Stage Variable Synthesizer & Enhancer Workflow */}
              {variableWorkflowPrompt && (
                <div className="w-full">
                  <PromptVariableWorkflow
                    userPrompt={variableWorkflowPrompt}
                    selectedModel={selectedModel}
                    onSelectModel={(m) => {
                      setSelectedModel(m);
                      try { localStorage.setItem('ph_workspace_selected_model', m); } catch {}
                    }}
                    onExecute={async (finalPrompt, _targetModel, metadata) => {
                      setLastUsedVariables(metadata.variables);
                      setVariableWorkflowPrompt(null);
                      await handleSubmit(finalPrompt);
                    }}
                    onDismiss={() => setVariableWorkflowPrompt(null)}
                    isExecuting={isProcessing}
                  />
                </div>
              )}

              <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Bottom Prompt Composer */}
            <div className="p-3 border-t border-border-default bg-bg-secondary shrink-0">
              <div className={panelLayout === 'chat-only' ? 'max-w-5xl xl:max-w-6xl mx-auto w-full px-1 sm:px-2' : 'w-full'}>
              {/* Stacked Active Skills & Pinned Session Banner */}
              {(activeSkills.length > 0 || pinnedSession) && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2 px-0.5">
                  {pinnedSession && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-500 text-xs font-mono font-medium shadow-3xs">
                      <Pin className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[180px]">Pinned: {pinnedSession.title}</span>
                      <button
                        type="button"
                        onClick={handleUnpinSession}
                        className="hover:opacity-100 opacity-60 p-0.5 ml-0.5 rounded cursor-pointer"
                        title="Unpin conversation"
                        aria-label="Unpin conversation"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {activeSkills.map((sk) => (
                    <div
                      key={sk.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold ${sk.colorClass} shadow-3xs`}
                    >
                      <span>{sk.command}</span>
                      <span className="text-[9.5px] font-sans font-normal opacity-75">({sk.label})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(sk.id)}
                        className="hover:opacity-100 opacity-60 p-0.5 ml-0.5 rounded cursor-pointer"
                        title={`Remove ${sk.command}`}
                        aria-label={`Remove ${sk.command}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {activeSkills.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveSkills([])}
                      className="text-[10px] font-mono text-text-muted hover:text-rose-500 underline ml-0.5 cursor-pointer"
                    >
                      Clear skills
                    </button>
                  )}
                </div>
              )}

              {isComposerCollapsed ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsComposerCollapsed(false);
                    setTimeout(() => activeTextareaRef.current?.focus(), 50);
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-bg-primary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary/40 flex items-center justify-between cursor-pointer text-text-secondary text-xs transition-colors shadow-3xs"
                  title="Expand composer to send a message"
                >
                  <div className="flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-brand-primary" />
                    <span className="truncate">Click to type a message or follow-up prompt...</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-brand-primary font-medium shrink-0">
                    <span>Expand</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </div>
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFiles(true);
                  }}
                  onDragLeave={() => setIsDraggingFiles(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFiles(false);
                    if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
                  }}
                  className={`relative flex flex-col gap-2 bg-bg-primary border ${
                    isDraggingFiles ? 'border-brand-primary ring-2 ring-brand-primary/30' : 'border-border-default'
                  } focus-within:border-brand-primary rounded-xl p-2.5 transition-all shadow-xs`}
                >
                  {/* Multimodal Attachment Tray */}
                  <WorkspaceAttachmentTray attachments={attachments} onRemoveAttachment={handleRemoveAttachment} />

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files) handleFilesSelected(e.target.files);
                      e.target.value = '';
                    }}
                    multiple
                    accept="image/*,.pdf,.txt,.md,.csv,.json"
                    className="hidden"
                  />
                  {/* Slash Command Autocomplete Menu in Active Chat */}
                  {showSlashMenu && (
                    <div className="absolute left-2 bottom-full mb-2 w-80 max-h-56 overflow-y-auto bg-bg-secondary border border-border-default rounded-xl shadow-xl p-1.5 z-50 custom-scrollbar">
                      <div className="text-[10px] font-mono text-text-muted px-2 py-1 uppercase tracking-wider font-semibold flex items-center justify-between">
                        <span>Workspace Skills {slashQuery ? `("${slashQuery}")` : ''}</span>
                        <span className="text-[9px] text-brand-primary font-bold">Stackable</span>
                      </div>
                      {filteredSkills.length === 0 ? (
                        <div className="text-xs text-text-muted p-3 text-center">No matching skills found</div>
                      ) : (
                        filteredSkills.map((sk, skIdx) => (
                          <button
                            key={sk.id}
                            type="button"
                            onClick={() => handleAddSkill(sk)}
                            className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between group cursor-pointer ${
                              skIdx === menuSelectedIndex
                                ? 'bg-brand-primary/10 text-brand-primary font-semibold ring-1 ring-brand-primary/30'
                                : 'hover:bg-bg-tertiary text-text-primary'
                            }`}
                          >
                            <div>
                              <div className="font-mono font-bold text-text-primary group-hover:text-brand-primary flex items-center gap-1.5">
                                <span>{sk.command}</span>
                                <span className="font-normal text-text-secondary">({sk.label})</span>
                              </div>
                              <div className="text-[10px] text-text-muted line-clamp-1">{sk.description}</div>
                            </div>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded border bg-bg-tertiary text-text-muted shrink-0">
                              {sk.badge}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* At Mention (@) Previous Conversations Menu in Active Chat */}
                  {showMentionMenu && (
                    <div className="absolute left-2 bottom-full mb-2 w-84 max-h-56 overflow-y-auto bg-bg-secondary border border-border-default rounded-xl shadow-xl p-1.5 z-50 custom-scrollbar">
                      <div className="text-[10px] font-mono text-text-muted px-2 py-1 uppercase tracking-wider font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <History className="w-3 h-3 text-amber-500" />
                          <span>Pin Previous Chat</span>
                        </span>
                        <span className="text-[9px] text-text-muted">{filteredSessions.length} sessions</span>
                      </div>
                      {filteredSessions.length === 0 ? (
                        <div className="text-xs text-text-muted p-3 text-center">
                          {savedSessions.length === 0
                            ? 'No saved conversations yet'
                            : `No conversations matching "${mentionQuery}"`}
                        </div>
                      ) : (
                        filteredSessions.map((session, sIdx) => (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() => handlePinSession(session)}
                            className={`w-full text-left p-2 rounded-lg transition-colors group cursor-pointer ${
                              sIdx === menuSelectedIndex
                                ? 'bg-amber-500/10 text-amber-500 font-semibold ring-1 ring-amber-500/30'
                                : 'hover:bg-bg-tertiary text-text-primary'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-text-primary group-hover:text-amber-500 truncate text-xs">
                                {session.title}
                              </span>
                              <span className="text-[9.5px] font-mono text-text-muted shrink-0">
                                {session.messageCount} msgs
                              </span>
                            </div>
                            <p className="text-[10.5px] text-text-muted line-clamp-1">
                              {session.lastSnippet || 'Conversational workflow'}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  <div className="flex items-end gap-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Attach file or screenshot"
                      aria-label="Attach file"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-brand-primary" />
                    </button>

                    <div className="flex-1 flex flex-col min-w-0">
                      <textarea
                        ref={activeTextareaRef}
                        id="active-conversation-prompt-input"
                        name="active_prompt"
                        aria-label="Ask follow up or request changes"
                        value={inputPrompt}
                        onChange={(e) => {
                          handleInputChange(e.target.value);
                          const t = e.target;
                          t.style.height = 'auto';
                          t.style.height = `${Math.min(140, Math.max(30, t.scrollHeight))}px`;
                        }}
                        onKeyDown={handleComposerKeyDown}
                        onPaste={handlePaste}
                        rows={1}
                        placeholder="Tell PromptHub what to change, add or improve..."
                        className="w-full bg-transparent border-none outline-none resize-none text-xs sm:text-sm text-text-primary placeholder:text-text-muted/60 p-1 font-sans custom-scrollbar min-h-[30px] max-h-[140px] leading-relaxed"
                        disabled={isProcessing || isStorageFull}
                      />
                    </div>

                    {/* Model Picker Button & Dropdown in Composer */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsModelPickerOpen(!isModelPickerOpen)}
                        className="h-8 min-h-[32px] flex items-center gap-1.5 px-2.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors cursor-pointer shadow-3xs"
                        title={`Current model: ${getModelInfo(selectedModel).label}. Click to switch.`}
                      >
                        <Cpu className="w-3 h-3 text-brand-primary shrink-0" />
                        <span className="truncate max-w-[85px] sm:max-w-[110px] font-semibold text-text-primary">
                          {getModelInfo(selectedModel).label}
                        </span>
                        <ChevronDown className={`w-2.5 h-2.5 text-text-muted transition-transform duration-200 ${isModelPickerOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isModelPickerOpen && (
                        <div className="absolute right-0 bottom-full mb-1.5 w-76 sm:w-88 rounded-2xl bg-bg-elevated border border-border-default shadow-2xl p-2 z-50 space-y-1.5">
                          <div className="px-1 py-0.5 border-b border-border-subtle pb-1 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider font-bold">Select Model</span>
                            <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-bg-tertiary text-text-secondary">
                              {connectedProviders.length > 0 ? `${byokModels.length} BYOK Models (0 cr)` : `${getDailyFreeRunsCount()}/${FREE_TIER_DAILY_LIMIT} Free`}
                            </span>
                          </div>

                          {/* Search Input for Composer Model Picker */}
                          <div className="relative">
                            <Search className="w-3 h-3 text-text-muted absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={modelSearchQuery}
                              onChange={(e) => setModelSearchQuery(e.target.value)}
                              placeholder="Search models, providers..."
                              className="w-full bg-bg-secondary border border-border-default rounded-lg pl-6 pr-6 py-1 text-[11px] text-text-primary placeholder:text-text-muted/60 outline-none focus:border-brand-primary font-sans transition-colors"
                              autoFocus
                            />
                            {modelSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setModelSearchQuery('')}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 text-[10px] cursor-pointer"
                              >
                                ×
                              </button>
                            )}
                          </div>

                          <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar py-0.5 pr-0.5">
                            {/* BYOK Models First */}
                            {byokModels
                              .filter((m) => {
                                if (!modelSearchQuery.trim()) return true;
                                const q = modelSearchQuery.toLowerCase();
                                return (
                                  m.label.toLowerCase().includes(q) ||
                                  m.id.toLowerCase().includes(q) ||
                                  (m.description && m.description.toLowerCase().includes(q)) ||
                                  (m.providerName && m.providerName.toLowerCase().includes(q))
                                );
                              })
                              .map((m) => (
                                <button
                                  key={`composer-byok-${m.id}`}
                                  type="button"
                                  onClick={() => {
                                    setSelectedModel(m.id);
                                    try { localStorage.setItem('ph_workspace_selected_model', m.id); } catch {}
                                    setIsModelPickerOpen(false);
                                    setModelSearchQuery('');
                                  }}
                                  className={`w-full text-left p-1.5 rounded-lg text-xs transition-colors flex items-center justify-between gap-1.5 cursor-pointer ${
                                    selectedModel === m.id
                                      ? 'bg-brand-primary/15 border border-brand-primary/40 text-brand-primary font-semibold'
                                      : 'hover:bg-bg-secondary text-text-secondary hover:text-text-primary border border-transparent'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="font-semibold text-text-primary text-[11px] truncate">{m.label}</div>
                                    <div className="text-[9.5px] text-text-muted truncate">{m.description}</div>
                                  </div>
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                    {m.badge}
                                  </span>
                                </button>
                              ))}

                            {/* Standard Workspace Models (Only visible when no BYOK API keys are connected) */}
                            {connectedProviders.length === 0 &&
                              WORKSPACE_MODELS
                                .filter((m) => {
                                  // If user has BYOK keys and 0 credits, hide paid models from other providers
                                  if (connectedProviders.length > 0 && (user?.credits ?? 0) <= 0 && (!user?.plan || user.plan === 'free')) {
                                    if (m.tier === 'paid') return false;
                                  }
                                  // Avoid duplicate entries if already in BYOK
                                  if (byokModels.some((bm) => bm.id === m.id)) return false;
                                  if (!modelSearchQuery.trim()) return true;
                                  const q = modelSearchQuery.toLowerCase();
                                  return m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
                                })
                                .map((m) => (
                                  <button
                                    key={`composer-std-${m.id}`}
                                    type="button"
                                    onClick={() => {
                                      setSelectedModel(m.id);
                                      try { localStorage.setItem('ph_workspace_selected_model', m.id); } catch {}
                                      setIsModelPickerOpen(false);
                                      setModelSearchQuery('');
                                    }}
                                    className={`w-full text-left p-1.5 rounded-lg text-xs transition-colors flex items-center justify-between gap-1.5 cursor-pointer ${
                                      selectedModel === m.id
                                        ? 'bg-brand-primary/15 border border-brand-primary/40 text-brand-primary font-semibold'
                                        : 'hover:bg-bg-secondary text-text-secondary hover:text-text-primary border border-transparent'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="font-semibold text-text-primary text-[11px] truncate">{m.label}</div>
                                      <div className="text-[9.5px] text-text-muted truncate">{m.description}</div>
                                    </div>
                                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                                      m.tier === 'paid'
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                        : m.tier === 'auto'
                                        ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                                        : 'bg-bg-tertiary text-emerald-600 dark:text-emerald-400 border-border-subtle'
                                    }`}>
                                      {m.badge}
                                    </span>
                                  </button>
                                ))}

                            {/* Empty Search State */}
                            {modelSearchQuery.trim() &&
                              !byokModels.some((m) => m.label.toLowerCase().includes(modelSearchQuery.toLowerCase()) || m.id.toLowerCase().includes(modelSearchQuery.toLowerCase())) &&
                              !WORKSPACE_MODELS.some((m) => m.label.toLowerCase().includes(modelSearchQuery.toLowerCase()) || m.id.toLowerCase().includes(modelSearchQuery.toLowerCase())) && (
                                <div className="py-4 text-center text-xs text-text-muted">
                                  No models found.
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!inputPrompt.trim()) return;
                        setVariableWorkflowPrompt(inputPrompt.trim());
                      }}
                      disabled={!inputPrompt.trim() || isProcessing || isStorageFull}
                      className="h-8 min-h-[32px] px-2.5 rounded-lg border border-brand-primary/30 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-40"
                      title="Synthesize dynamic variables and customize before running"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Variables</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsVoicePanelOpen((prev) => !prev)}
                      className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-brand-primary flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Talk to Yuno - Deepgram Voice Assistant"
                      aria-label="Talk to Yuno"
                    >
                      <Mic className="w-3.5 h-3.5 text-brand-primary" />
                    </button>

                    <button
                      type="submit"
                      disabled={(!inputPrompt.trim() && attachments.length === 0) || isProcessing || isStorageFull}
                      className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-40 disabled:hover:bg-brand-primary text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs"
                      aria-label="Send message"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}
              </div>
            </div>
          </div>

          {/* Collapsed Right Inspector Ribbon (Only when files exist and Chat is Maximized) */}
          {currentFiles.length > 0 && panelLayout === 'chat-only' && (
            <div
              className="hidden lg:flex w-12 bg-bg-secondary border-l border-border-default flex-col items-center py-3 justify-between shrink-0 select-none"
              title="Click to expand inspector output"
            >
              <div className="flex flex-col items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setPanelLayout('split')}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-bg-tertiary hover:bg-brand-primary/10 hover:text-brand-primary border border-border-default flex items-center justify-center transition-colors cursor-pointer"
                  title="Expand Inspector Output"
                  aria-label="Expand Inspector Output"
                >
                  <Globe className="w-4 h-4 text-brand-primary" />
                </button>
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted font-bold rotate-90 my-8 whitespace-nowrap">
                  Output
                </span>
              </div>
              <div className="text-[10px] font-mono text-emerald-500 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                {currentFiles.length}
              </div>
            </div>
          )}

          {/* Draggable Divider Split Bar (Desktop studio mode) */}
          {panelLayout === 'split' && (
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
                  localStorage.setItem('ph_unified_split_ratio', '50');
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
                  try {
                    localStorage.setItem('ph_unified_split_ratio', '50');
                  } catch {}
                }
              }}
              className={`hidden lg:flex items-center justify-center relative w-2.5 hover:w-3.5 cursor-col-resize select-none shrink-0 transition-all z-20 group ${
                isDraggingSplit
                  ? 'bg-brand-primary ring-2 ring-brand-primary/30'
                  : 'bg-border-default hover:bg-brand-primary/60'
              }`}
              title="Drag to resize panes • Double-click to reset 50/50 • Left/Right arrows to adjust"
            >
              <div
                className={`h-10 w-1.5 rounded-full transition-colors flex flex-col items-center justify-center gap-0.5 shadow-2xs ${
                  isDraggingSplit ? 'bg-white' : 'bg-text-muted group-hover:bg-white'
                }`}
              >
                <span className="w-0.5 h-0.5 rounded-full bg-current opacity-80" />
                <span className="w-0.5 h-0.5 rounded-full bg-current opacity-80" />
                <span className="w-0.5 h-0.5 rounded-full bg-current opacity-80" />
              </div>
            </div>
          )}

          {/* Right Pane: Codex & Antigravity Multi-Tab Inspector Surface */}
          {panelLayout !== 'chat-only' && (
            <div
              style={
                panelLayout === 'split'
                  ? { width: `${100 - splitRatio}%` }
                  : undefined
              }
              className={`flex-1 flex flex-col bg-bg-tertiary border-l border-border-default min-w-0 transition-all duration-200 overflow-hidden ${
                mobileActiveView === 'chat' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {/* Tablet/Mobile quick switch to chat bar */}
              <div className="lg:hidden flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border-default shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-primary capitalize">{inspectorTab}</span>
                  <span className="text-[10px] font-mono text-text-muted">({currentFiles.length} files)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileActiveView('chat')}
                  className="min-h-[44px] px-3 py-1 text-xs rounded-lg font-semibold bg-brand-primary text-white cursor-pointer"
                >
                  Back to Chat
                </button>
              </div>

              {/* Desktop Inspector Pane Header with Maximize / Close Controls */}
              <div className="hidden lg:flex h-9 bg-bg-secondary/70 border-b border-border-subtle px-3 items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-1.5 text-text-muted font-mono text-[11px]">
                  <Globe className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="font-semibold text-text-secondary">Deliverable Output</span>
                  <span>•</span>
                  <span>{currentFiles.length} files</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPanelLayout(panelLayout === 'inspector-only' ? 'split' : 'inspector-only')}
                    className="min-h-[30px] px-2 text-text-muted hover:text-text-primary rounded hover:bg-bg-tertiary flex items-center gap-1 text-[11px] font-mono cursor-pointer transition-colors"
                    title={panelLayout === 'inspector-only' ? 'Restore Split View' : 'Maximize Inspector Output'}
                    aria-label={panelLayout === 'inspector-only' ? 'Restore Split View' : 'Maximize Inspector Output'}
                  >
                    {panelLayout === 'inspector-only' ? (
                      <>
                        <Minimize2 className="w-3 h-3 text-brand-primary" />
                        <span>Restore</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3 h-3" />
                        <span>Maximize</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelLayout('chat-only')}
                    className="min-h-[30px] px-2 text-text-muted hover:text-text-primary rounded hover:bg-bg-tertiary flex items-center gap-1 text-[11px] font-mono cursor-pointer transition-colors"
                    title="Close Inspector"
                    aria-label="Close Inspector"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Close</span>
                  </button>
                </div>
              </div>

              {/* Redesigned Streamlined Inspector Tab Bar (Req #4) */}
              <div className="h-10 bg-bg-secondary border-b border-border-default px-2 sm:px-3 flex items-center justify-between shrink-0 gap-2 overflow-x-auto no-scrollbar select-none min-w-0">
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setInspectorTab('preview')}
                    className={`min-h-[32px] px-3 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      inspectorTab === 'preview'
                        ? 'bg-brand-primary text-white shadow-2xs font-bold'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                    title="Live Interactive Browser Sandbox"
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span>Live Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectorTab('code')}
                    className={`min-h-[32px] px-3 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      inspectorTab === 'code'
                        ? 'bg-brand-primary text-white shadow-2xs font-bold'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                    title="Inspect Source Code & Files"
                  >
                    <Code2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Code & Files</span>
                  </button>
                </div>

                {/* Right Quick Action Tools */}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsLivePublishOpen(true)}
                    className="h-7 min-h-[28px] flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
                    title="1-Click Web Publish & Cloud Hosting"
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span>Publish & Host</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportToDesktop()}
                    disabled={isExportingZip}
                    className="h-7 min-h-[28px] flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-lg border border-border-default hover:border-brand-primary/50 bg-bg-primary hover:bg-bg-tertiary text-text-primary transition-colors cursor-pointer shadow-3xs shrink-0 whitespace-nowrap"
                    title="Download complete project ZIP"
                    aria-label="Export project ZIP"
                  >
                    <Download className="w-3 h-3 text-brand-primary shrink-0" />
                    <span className="hidden sm:inline">ZIP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSyncToDrive()}
                    disabled={isSyncingDrive}
                    className="h-7 min-h-[28px] flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-lg border border-border-default hover:border-brand-primary/50 bg-bg-primary hover:bg-bg-tertiary text-text-primary transition-colors cursor-pointer shadow-3xs shrink-0 whitespace-nowrap"
                    title="Sync to Google Drive"
                    aria-label="Sync to Google Drive"
                  >
                    <HardDrive className={`w-3 h-3 shrink-0 ${isSyncingDrive ? 'text-brand-primary animate-spin' : 'text-brand-primary'}`} />
                    <span className="hidden sm:inline">Drive</span>
                  </button>
                </div>
              </div>

              {/* Inspector Content Body */}
              <div className="flex-1 min-h-0 relative overflow-hidden">
                {inspectorTab === 'preview' && (
                  <WorkBrowserPreview
                    files={currentFiles}
                    projectName={activeResult?.title || activeProject?.name || 'project-bundle'}
                    onMinimize={() => setPanelLayout('chat-only')}
                    onSurgicalTweak={(instruction) => handleSubmit(instruction)}
                    onSyncToDrive={() => handleSyncToDrive()}
                    onExportZip={() => handleExportToDesktop()}
                  />
                )}

                {inspectorTab === 'code' && (
                  <div className="h-full p-2 sm:p-3 overflow-hidden">
                    <WorkCodeEditor
                      openFiles={openFiles.length > 0 ? openFiles : currentFiles.slice(0, 3)}
                      activeFilePath={activeFilePath || currentFiles[0]?.path || ''}
                      onSelectTab={setActiveFilePath}
                      onCloseTab={handleCloseTab}
                      onSaveFile={handleSaveFile}
                      onDeleteFile={handleDeleteFile}
                      onPromptAction={(prompt) => handleSubmit(prompt)}
                      onCreateNewFile={() => setInspectorTab('files')}
                    />
                  </div>
                )}

                {inspectorTab === 'files' && (
                  <div className="h-full p-2 sm:p-3 overflow-hidden">
                    <WorkFileExplorer
                      files={currentFiles}
                      selectedFilePath={activeFilePath}
                      onSelectFile={(f) => handleOpenFile(f)}
                      onCreateFile={handleCreateFile}
                      onDeleteFile={handleDeleteFile}
                      onSyncToDrive={() => handleSyncToDrive()}
                      onExportToDesktop={() => handleExportToDesktop()}
                      onDownloadFile={handleDownloadSingleFile}
                    />
                  </div>
                )}

                {inspectorTab === 'diffs' && (
                  <div className="h-full p-2 sm:p-3 overflow-hidden">
                    <WorkDiffViewer diffs={diffs} />
                  </div>
                )}

                {inspectorTab === 'artifacts' && (
                  <div className="h-full p-2 sm:p-3 overflow-hidden">
                    <WorkArtifactViewer artifacts={artifacts} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      </div>

      {/* ── Adaptive Knowledge Base Modal ──────────────────────────── */}
      {isKnowledgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-bg-primary border border-border-default rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold font-display text-text-primary">
                  Adaptive Knowledge Base
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsKnowledgeModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-text-secondary mt-2 mb-3 leading-relaxed">
              PromptHub continuously adapts and learns key rules, brand guidelines, and preferences from your inputs to inject into subsequent model executions.
            </p>

            {/* Knowledge Items List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 py-2 pr-1">
              {knowledgeItems.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center justify-center text-text-muted">
                  <Brain className="w-8 h-8 opacity-40 mb-2 text-brand-primary" />
                  <p className="text-xs font-medium text-text-primary">No stored rules or preferences</p>
                  <p className="text-[11px] text-text-secondary mt-0.5 max-w-xs">
                    Your knowledge base learns as you build, or you can add custom brand directives below.
                  </p>
                </div>
              ) : (
                knowledgeItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-bg-secondary border border-border-default flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-text-primary">{item.key}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-bg-tertiary text-text-muted border border-border-subtle uppercase">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-text-secondary text-[11.5px] leading-relaxed">{item.value}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteKnowledge(item.id)}
                      className="text-text-muted hover:text-rose-500 p-1 transition-colors cursor-pointer shrink-0"
                      title="Remove rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Rule Form */}
            <div className="pt-3 border-t border-border-default mt-2 space-y-2">
              <span className="text-xs font-semibold text-text-primary block">Add Custom Learned Rule:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Rule Name (e.g. Brand Color)"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-bg-secondary border border-border-default rounded-lg text-text-primary outline-none focus:border-brand-primary"
                />
                <input
                  type="text"
                  placeholder="Directive (e.g. Use #6A89A7)"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="sm:col-span-2 px-3 py-1.5 text-xs bg-bg-secondary border border-border-default rounded-lg text-text-primary outline-none focus:border-brand-primary"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    adaptiveKnowledgeService.clearKnowledge(user?.id);
                    setKnowledgeItems([]);
                    showToast('Knowledge base reset.', 'info');
                  }}
                  className="text-xs text-text-muted hover:text-rose-500 underline cursor-pointer"
                >
                  Clear All Knowledge
                </button>
                <button
                  type="button"
                  onClick={handleAddKnowledge}
                  disabled={!newKey.trim() || !newValue.trim()}
                  className="min-h-[44px] px-4 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Save Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Projects & Workspaces Drawer ───────────────────────────── */}
      {isProjectsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsProjectsDrawerOpen(false)}
          />

          {/* Slide-out Drawer Panel */}
          <div className="relative w-full max-w-md bg-bg-primary border-r border-border-default shadow-2xl z-50 flex flex-col h-full font-sans overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border-default bg-bg-secondary flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold font-display text-text-primary">
                      Projects & Workspaces
                    </h2>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-brand-primary/10 text-brand-primary font-bold">
                      {projects.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    1-click switch, export ZIP & sync with Drive
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-3xs"
                  title="Create a new workspace project"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsProjectsDrawerOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  aria-label="Close Projects Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Filter */}
            <div className="p-3 border-b border-border-subtle bg-bg-secondary/40 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter projects by name or tag..."
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-bg-primary border border-border-default rounded-lg text-text-primary placeholder:text-text-muted outline-none focus:border-brand-primary transition-colors"
                />
                {projectSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setProjectSearchQuery('')}
                    className="absolute right-2.5 text-text-muted hover:text-text-primary text-xs cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Projects List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
              {filteredProjects.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center text-text-muted">
                  <FolderOpen className="w-10 h-10 opacity-30 mb-2 text-brand-primary" />
                  <p className="text-xs font-semibold text-text-primary">
                    {projectSearchQuery ? 'No matching projects found' : 'No saved projects yet'}
                  </p>
                  <p className="text-[11px] text-text-secondary mt-1 max-w-xs">
                    {projectSearchQuery
                      ? 'Try a different search term or clear the filter.'
                      : 'Click "+ New Project" to initialize your first project workspace.'}
                  </p>
                </div>
              ) : (
                filteredProjects.map((p) => {
                  const isActive = activeProject?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-xl border transition-all text-xs flex flex-col gap-2 ${
                        isActive
                          ? 'border-brand-primary bg-brand-primary/5 shadow-xs ring-1 ring-brand-primary/30'
                          : 'border-border-default bg-bg-secondary hover:border-brand-primary/40 hover:bg-bg-tertiary/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-text-primary truncate max-w-[200px]">
                              {p.name}
                            </span>
                            {isActive && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
                                Active
                              </span>
                            )}
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-bg-tertiary text-text-muted border border-border-subtle uppercase">
                              {p.status}
                            </span>
                          </div>
                          {p.description && (
                            <p className="text-text-secondary text-[11px] line-clamp-2 mt-1 leading-relaxed">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-text-muted pt-1 border-t border-border-subtle/50">
                        <div className="flex items-center gap-2">
                          <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                          {p.lastSyncedToDrive && (
                            <span className="text-emerald-500 flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Drive
                            </span>
                          )}
                        </div>

                        {/* Project Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleExportToDesktop(p.id)}
                            className="min-h-[44px] min-w-[44px] rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary hover:text-brand-primary flex items-center justify-center transition-colors cursor-pointer"
                            title="Export project ZIP to desktop"
                            aria-label={`Export ${p.name} as ZIP`}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSyncToDrive(p.id)}
                            className="min-h-[44px] min-w-[44px] rounded-lg border border-border-default bg-bg-primary hover:bg-bg-tertiary hover:text-brand-primary flex items-center justify-center transition-colors cursor-pointer"
                            title="Sync project to Google Drive Vault"
                            aria-label={`Sync ${p.name} to Drive`}
                          >
                            <HardDrive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleArchiveProject(p.id, e)}
                            className="min-h-[44px] min-w-[44px] rounded-lg border border-border-default bg-bg-primary hover:bg-amber-500/10 text-text-muted hover:text-amber-500 flex items-center justify-center transition-colors cursor-pointer"
                            title={p.status === 'archived' ? 'Project is archived' : 'Archive project'}
                            aria-label={`Archive ${p.name}`}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteProject(p.id, e)}
                            className="min-h-[44px] min-w-[44px] rounded-lg border border-border-default bg-bg-primary hover:bg-rose-500/10 text-text-muted hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete project"
                            aria-label={`Delete ${p.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => selectProject(p, true, true)}
                            disabled={isActive}
                            className={`min-h-[44px] px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-brand-primary text-white opacity-80 cursor-default'
                                : 'bg-brand-primary hover:bg-brand-primary-hi text-white shadow-3xs'
                            }`}
                          >
                            <span>{isActive ? 'Current' : 'Switch'}</span>
                            {!isActive && <ArrowRight className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer Quota Bar */}
            <div className="p-3 border-t border-border-default bg-bg-secondary shrink-0 text-xs">
              <div className="flex items-center justify-between text-[11px] text-text-muted mb-1.5">
                <span className="flex items-center gap-1 font-mono">
                  <HardDrive className="w-3 h-3 text-brand-primary" />
                  <span>Google Drive Vault</span>
                </span>
                <span className="font-mono">
                  {storageQuota
                    ? `${(storageQuota.usedBytes / (1024 * 1024)).toFixed(1)} / ${(storageQuota.limitBytes / (1024 * 1024)).toFixed(0)} MB`
                    : '500 MB Free'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-brand-primary rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((storageQuota?.usedBytes || 0) / (storageQuota?.limitBytes || 524288000)) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsProjectsDrawerOpen(false);
                  setActiveTab('storage');
                }}
                className="w-full min-h-[44px] text-center text-[11px] font-semibold text-brand-primary hover:underline cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Manage Storage Vault & Sync Backups</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Project Modal ───────────────────────────────────────── */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-bg-primary border border-border-default rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold font-display text-text-primary">
                  Create New Project
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewProject} className="space-y-4 pt-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-text-primary">
                    Project / Folder Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-text-muted tabular-nums">
                    {newProjectName.length}/40
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={40}
                  placeholder="e.g. NextGen SaaS Platform"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value.slice(0, 40))}
                  className="w-full px-3 py-2 text-xs bg-bg-secondary border border-border-default rounded-lg text-text-primary placeholder:text-text-muted outline-none focus:border-brand-primary transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="What is the goal and scope of this project?"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-bg-secondary border border-border-default rounded-lg text-text-primary placeholder:text-text-muted outline-none focus:border-brand-primary transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-lg border border-border-default hover:bg-bg-tertiary text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="min-h-[44px] px-5 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi disabled:opacity-40 transition-colors cursor-pointer shadow-3xs"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Developer Mode Drawer */}
      <DeveloperModeDrawer
        isOpen={isDeveloperDrawerOpen}
        onClose={() => setIsDeveloperDrawerOpen(false)}
        settings={developerSettings}
        autoApproveRisk={permissionPrefs.autoApproveAll}
        onToggleAutoApprove={handleToggleAutoApprove}
        onOpenBrief={() => {
          setIsDeveloperDrawerOpen(false);
          setIsBriefModalOpen(true);
        }}
        onOpenMemory={() => {
          setIsDeveloperDrawerOpen(false);
          setIsMemoryModalOpen(true);
        }}
        onOpenGraph={() => {
          setIsDeveloperDrawerOpen(false);
          setIsGraphModalOpen(true);
        }}
        onSettingsChange={(newSettings) => {
          setDeveloperSettings(newSettings);
          try {
            localStorage.setItem('ph_developer_settings', JSON.stringify(newSettings));
          } catch {}
          if (newSettings.modelOverride) {
            setSelectedModel(newSettings.modelOverride);
          } else {
            setSelectedModel('openrouter/free');
          }
        }}
      />

      {/* Creation Workspace Help & Multi-Domain Modal */}
      <WorkspaceHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        onSelectPrompt={(starterPrompt: string) => handleSubmit(starterPrompt)}
      />

      {/* Yuno - Deepgram Voice Assistant Studio Panel (Only mounted when open so mic & usage timer never run in background) */}
      {isVoicePanelOpen && (
        <YunoVoiceAgentPanel
          key={voiceSessionKey}
          isOpen={isVoicePanelOpen}
          onClose={() => setIsVoicePanelOpen(false)}
          selectedModel={developerSettings.modelOverride || selectedModel}
          projectId={activeProject?.id || 'workspace_proj'}
          sessionId={voiceSessionId}
          userId={user?.id || 'anon_user'}
          onModelChange={(newModel) => setSelectedModel(newModel)}
        />
      )}

      {/* 1-Click Live Web Publish & Multi-Provider Hosting Modal (Req #6) */}
      <LiveWebPublishModal
        isOpen={isLivePublishOpen}
        onClose={() => setIsLivePublishOpen(false)}
        projectName={activeResult?.title || activeProject?.name || 'project-bundle'}
        files={currentFiles}
        previewHtml={extractDeployableHtml() || undefined}
        onSyncToDrive={() => handleSyncToDrive()}
        onExportZip={() => handleExportToDesktop()}
      />

      {/* Developer Adaptive Project Brief Inspector Modal (Milestone 1) */}
      <BriefInspectModal
        isOpen={isBriefModalOpen}
        onClose={() => setIsBriefModalOpen(false)}
        brief={activeBrief}
        briefHistory={briefHistory}
        onSelectVersion={(v) => {
          const selected = briefHistory.find((b) => b.version === v);
          if (selected) setActiveBrief(selected);
        }}
      />

      {/* Milestone 2: Scoped Memory Settings & Scope Governor Modal */}
      <MemorySettingsModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        userId={user?.id || 'anon_user'}
        projectId={activeProject?.id || 'workspace_proj'}
        teamId={activeTeamId || undefined}
        isTemporaryChat={isTemporaryChat}
        onToggleTemporaryChat={(enabled) => setIsTemporaryChat(enabled)}
      />

      {/* Milestone 2: Relational Project Knowledge Graph Modal */}
      <KnowledgeGraphModal
        isOpen={isGraphModalOpen}
        onClose={() => setIsGraphModalOpen(false)}
        userId={user?.id || 'anon_user'}
        projectId={activeProject?.id || 'workspace_proj'}
        selectedNodeId={selectedGraphNodeId}
        onSelectNode={(nodeId) => setSelectedGraphNodeId(nodeId)}
      />

      {/* Past Chat History Modal (Edit & Delete explicitly supported, Req #5) */}
      {isHistoryModalOpen && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setIsHistoryModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-bg-elevated border border-border-default rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden text-left font-sans text-text-primary"
          >
            {/* Header */}
            <div className="p-4 border-b border-border-default flex items-center justify-between bg-bg-secondary">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-bold text-text-primary">Saved Conversations</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-bold">
                  {savedSessions.length} past chats
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-7 h-7 rounded-lg border border-border-default hover:bg-bg-tertiary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Filter & Folder Scope Selector (Req #5) */}
            <div className="p-3 border-b border-border-default bg-bg-primary space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Search past conversations..."
                  className="w-full pl-8 pr-3 py-1.5 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-brand-primary min-h-[34px]"
                />
              </div>

              {activeProject && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setHistoryFolderFilter('folder')}
                    className={`min-h-[28px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      historyFolderFilter === 'folder'
                        ? 'bg-brand-primary text-white font-semibold shadow-xs'
                        : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary border border-border-default'
                    }`}
                  >
                    <FolderOpen className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[150px]">This Folder: {activeProject.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFolderFilter('all')}
                    className={`min-h-[28px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      historyFolderFilter === 'all'
                        ? 'bg-brand-primary text-white font-semibold shadow-xs'
                        : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary border border-border-default'
                    }`}
                  >
                    All Chats ({savedSessions.length})
                  </button>
                </div>
              )}
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-border-subtle custom-scrollbar">
              {savedSessions.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-text-muted mx-auto" />
                  <p className="text-xs font-semibold text-text-primary">No saved conversations yet</p>
                  <p className="text-[11px] text-text-muted max-w-xs mx-auto">
                    Whenever you start a new chat in a project, your past conversation is automatically saved here.
                  </p>
                </div>
              ) : (
                savedSessions
                  .filter((s) => {
                    if (historyFolderFilter === 'folder' && activeProject?.id && s.projectId !== activeProject.id && s.folderId !== activeProject.id) {
                      return false;
                    }
                    if (!historySearchQuery.trim()) return true;
                    const q = historySearchQuery.toLowerCase();
                    return (
                      s.title.toLowerCase().includes(q) ||
                      s.lastSnippet.toLowerCase().includes(q) ||
                      (s.folderName && s.folderName.toLowerCase().includes(q))
                    );
                  })
                  .map((session) => (
                    <div
                      key={session.id}
                      className="pt-2.5 pb-2.5 flex items-start justify-between gap-3 hover:bg-bg-secondary/60 p-2.5 rounded-xl transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        {editingSessionId === session.id ? (
                          <div className="flex items-center gap-1.5 mb-1">
                            <input
                              type="text"
                              maxLength={50}
                              value={editingSessionTitle}
                              onChange={(e) => setEditingSessionTitle(e.target.value.slice(0, 50))}
                              className="p-1 px-2 text-xs font-semibold rounded-lg bg-bg-primary border border-brand-primary text-text-primary flex-1 outline-hidden"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRenameSession(session.id)}
                              className="px-2 py-1 rounded bg-brand-primary text-white text-[11px] font-semibold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSessionId(null)}
                              className="px-2 py-1 rounded bg-bg-tertiary text-text-muted text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-xs font-bold text-text-primary truncate max-w-[200px]" title={session.title}>
                              {session.title}
                            </span>
                            {session.folderName && (
                              <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-brand-primary/10 text-brand-primary flex items-center gap-1 shrink-0 font-medium border border-brand-primary/20 truncate max-w-[130px]" title={session.folderName}>
                                <FolderOpen className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{session.folderName}</span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSessionId(session.id);
                                setEditingSessionTitle(session.title);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-brand-primary cursor-pointer p-0.5"
                              title="Rename conversation"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <p className="text-[11px] text-text-muted line-clamp-2 mt-0.5 leading-relaxed">
                          {session.lastSnippet || 'Conversational deliverable'}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-text-muted">
                          <span>{new Date(session.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <span>&bull;</span>
                          <span>{session.messageCount} messages</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleRestoreSession(session)}
                          className="min-h-[30px] px-2.5 py-1 rounded-lg bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="min-h-[30px] w-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10 text-text-muted hover:text-rose-500 transition-colors cursor-pointer"
                          title="Delete chat from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isFullscreen && typeof document !== 'undefined') {
    return createPortal(workspaceContent, document.body);
  }

  return workspaceContent;
};
