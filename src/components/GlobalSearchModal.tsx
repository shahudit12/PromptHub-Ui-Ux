import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Settings,
  Plus,
  Sun,
  Moon,
  Bell,
  Bot,
  Trophy,
  X
} from 'lucide-react';
import {
  PromptSearchIcon,
  PromptStudioIcon,
  PromptMarketplaceIcon,
  PromptDashboardIcon,
  PromptCommunityIcon,
  PromptNewsIcon,
  PromptStorageIcon,
  PromptLibraryIcon,
  PromptKeyIcon,
} from './icons/PromptHubIcons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import type { TabType } from '../context/AppContext';
import { securityUtils } from '../utils/security';
import { PromptCameraMicControls } from './common/PromptCameraMicControls';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { prompts, setActivePromptId, setActiveTab } = useApp();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = resolvedTheme === 'dark';

  const navActions: Array<{ id: string; label: string; tab: TabType; icon: React.ComponentType<any>; category: string; description: string }> = [
    { id: 'nav-new', label: 'Create New Prompt', tab: 'create-prompt', icon: Plus, category: 'Action', description: 'Publish a new prompt asset' },
    { id: 'nav-workspace', label: 'Creation Workspace', tab: 'workspace', icon: PromptStudioIcon, category: 'Studio', description: 'Interactive prompt creator, multi-model testing & workspace' },
    { id: 'nav-work', label: 'PromptHub Workspace', tab: 'workspace', icon: Bot, category: 'Studio', description: 'Autonomous developer agents & multi-agent workspace' },
    { id: 'nav-agents', label: 'AI Agents Studio', tab: 'agents', icon: Bot, category: 'Studio', description: 'Agent workspaces, autonomous prompts & tools' },
    { id: 'nav-marketplace', label: 'Prompt Marketplace', tab: 'marketplace', icon: PromptMarketplaceIcon, category: 'Ecosystem', description: 'Commercial enterprise prompt licenses' },
    { id: 'nav-dashboard', label: 'Developer Dashboard', tab: 'dashboard', icon: PromptDashboardIcon, category: 'Navigation', description: 'Overview & recent prompt telemetry' },
    { id: 'nav-notifications', label: 'Notification Center & Alerts', tab: 'notifications', icon: Bell, category: 'Studio', description: 'Live alerts, prompt saves, and studio notifications' },
    { id: 'nav-community', label: 'Community Registry', tab: 'community', icon: PromptCommunityIcon, category: 'Navigation', description: 'Browse and fork community prompts' },
    { id: 'nav-leaderboard', label: 'Leaderboard & Rankings', tab: 'leaderboard', icon: Trophy, category: 'Community', description: 'Top prompt engineers & trending creators' },
    { id: 'nav-news', label: 'AI News & Insights', tab: 'news', icon: PromptNewsIcon, category: 'Ecosystem', description: 'Latest research, model drops & releases' },
    { id: 'nav-storage', label: 'Storage Vault', tab: 'storage', icon: PromptStorageIcon, category: 'Navigation', description: 'Manage uploaded files, datasets & media assets' },
    { id: 'nav-collections', label: 'Collections & Folders', tab: 'collections', icon: PromptLibraryIcon, category: 'Navigation', description: 'Organize prompts into workspaces' },
    { id: 'nav-creds', label: 'API Credentials & Gateway', tab: 'credentials', icon: PromptKeyIcon, category: 'Settings', description: 'Manage OpenRouter & BYOK keys' },
    { id: 'nav-settings', label: 'Account & Workspace Settings', tab: 'settings', icon: Settings, category: 'Settings', description: 'Preferences, security, and exports' },
  ];

  const sanitizedQuery = securityUtils.sanitizeText(query).toLowerCase();

  const filteredNavActions = navActions.filter(a =>
    a.label.toLowerCase().includes(sanitizedQuery) ||
    a.description.toLowerCase().includes(sanitizedQuery) ||
    a.category.toLowerCase().includes(sanitizedQuery)
  );

  const themeActionMatches = !sanitizedQuery || 'theme'.includes(sanitizedQuery) || 'dark'.includes(sanitizedQuery) || 'light'.includes(sanitizedQuery) || 'mode'.includes(sanitizedQuery);

  const publicPrompts = prompts.filter(p => p.visibility === 'public');
  const filteredPrompts = sanitizedQuery
    ? publicPrompts.filter(p =>
        p.title.toLowerCase().includes(sanitizedQuery) ||
        (p.description || '').toLowerCase().includes(sanitizedQuery) ||
        (p.tags || []).some(t => t.toLowerCase().includes(sanitizedQuery)) ||
        (p.authorName || '').toLowerCase().includes(sanitizedQuery)
      ).slice(0, 6)
    : publicPrompts.slice(0, 4);

  const allItems = [
    ...(themeActionMatches ? [{
      type: 'action' as const,
      id: 'action-theme-toggle',
      title: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      description: isDark ? 'Switch to warm ivory daylight palette' : 'Switch to Obsidian Studio dark palette',
      icon: isDark ? Sun : Moon,
      badge: 'Theme',
      onExecute: () => { toggleTheme(); onClose(); }
    }] : []),
    ...filteredNavActions.map(a => ({ 
      type: 'action' as const, 
      id: a.id, 
      title: a.label, 
      description: a.description, 
      icon: a.icon, 
      badge: a.category, 
      onExecute: () => { setActiveTab(a.tab); onClose(); } 
    })),
    ...filteredPrompts.map(p => ({ 
      type: 'prompt' as const, 
      id: p.id, 
      title: p.title, 
      description: p.description, 
      icon: PromptStudioIcon, 
      badge: p.category, 
      onExecute: () => { setActivePromptId(p.id); setActiveTab('workspace'); onClose(); } 
    })),
  ];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global escape key listener so modal reliably closes even if search input lost focus
  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % (allItems.length || 1));
    } else if (e.key === 'Enter' && allItems[selectedIndex]) {
      e.preventDefault();
      allItems[selectedIndex].onExecute();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[750] flex items-center sm:items-start justify-center pt-3 sm:pt-20 px-3 sm:px-4 select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl bg-bg-secondary border border-border-default rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85dvh] sm:max-h-[80vh]"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3.5 border-b border-border-default bg-bg-primary/50">
              <PromptSearchIcon className="w-5 h-5 text-text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                name="globalSearch"
                aria-label="Search studio tools, commands, or community prompts"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search studio tools, commands, or community prompts..."
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none min-h-[44px]"
              />
              <PromptCameraMicControls
                variant="inline"
                onImageAttached={(_url) => setQuery('Image Analysis & Vision Prompts')}
                onTranscriptReady={(text) => setQuery(text)}
                cameraTooltip="Search vision & image prompts"
                micTooltip="Dictate search query"
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-text-muted bg-bg-tertiary border border-border-default rounded">
                ESC
              </kbd>
              <button
                type="button"
                onClick={onClose}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                aria-label="Close search modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Results List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {allItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  No matching tools or prompts found.
                </div>
              ) : (
                allItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={item.onExecute}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all min-h-[44px] ${
                        isSelected
                          ? 'bg-brand-primary-light text-text-primary ring-1 ring-brand-primary/20 shadow-2xs'
                          : 'text-text-secondary hover:bg-bg-tertiary/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg ${
                            isSelected
                              ? 'bg-brand-primary text-white'
                              : 'bg-bg-primary text-text-muted border border-border-default'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-text-primary truncate">{item.title}</p>
                          {item.description && (
                            <p className="text-[11px] text-text-muted truncate">{item.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted border border-border-default">
                          {item.badge}
                        </span>
                        {isSelected && <ArrowRight className="w-4 h-4 text-brand-primary" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border-default bg-bg-primary/50 flex items-center justify-between text-[11px] font-mono text-text-muted">
              <div className="flex items-center gap-3">
                <span><kbd className="px-1.5 py-0.5 bg-bg-secondary border border-border-default rounded">↑</kbd> <kbd className="px-1.5 py-0.5 bg-bg-secondary border border-border-default rounded">↓</kbd> Navigate</span>
                <span><kbd className="px-1.5 py-0.5 bg-bg-secondary border border-border-default rounded">↵</kbd> Select</span>
              </div>
              <span>PromptHub Studio</span>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>,
      document.body
    );
  };

export default GlobalSearchModal;
