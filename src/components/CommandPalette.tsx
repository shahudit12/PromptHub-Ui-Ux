import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Folder, 
  Terminal, 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  Settings, 
  X, 
  ChevronRight,
  Plus,
  Sparkles,
  Bot,
  Sun,
  Moon,
  Bell
} from 'lucide-react';
import { PromptCommunityIcon, PromptKeyIcon } from './icons/PromptHubIcons';
import type { TabType } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { securityUtils } from '../utils/security';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabType) => void;
  prompts: Array<{ id: string; title: string; category: string }>;
  onSelectPrompt: (id: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  prompts,
  onSelectPrompt,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const sanitizedQuery = securityUtils.sanitizeText(query).toLowerCase();

  const navActions: Array<{ label: string; icon: React.ComponentType<any>; category: string; action: () => void }> = [
    { label: isDark ? 'Switch to Light Theme (☀️)' : 'Switch to Dark Theme (🌙)', icon: isDark ? Sun : Moon, category: 'Appearance', action: () => toggleTheme() },
    { label: 'PromptHub Specialized AI Agents (15 Specialized Agents)', icon: Bot, category: 'Studio', action: () => onSelectTab('workspace') },
    { label: 'Knowledge Graph (Obsidian-Style Connected View)', icon: Terminal, category: 'Studio', action: () => onSelectTab('graph' as any) },
    { label: 'Create New Prompt', icon: Plus, category: 'Action', action: () => onSelectTab('create-prompt') },
    { label: 'Creation Workspace', icon: Sparkles, category: 'Studio', action: () => onSelectTab('workspace') },
    { label: 'Developer Dashboard', icon: LayoutDashboard, category: 'Studio', action: () => onSelectTab('dashboard') },
    { label: 'Notification Center & Alerts', icon: Bell, category: 'Studio', action: () => onSelectTab('notifications') },
    { label: 'Community Feed & Explore', icon: PromptCommunityIcon, category: 'Navigation', action: () => onSelectTab('community') },
    { label: 'Collections & Folders', icon: Folder, category: 'Navigation', action: () => onSelectTab('collections') },
    { label: 'Marketplace & Packs', icon: ShoppingBag, category: 'Navigation', action: () => onSelectTab('marketplace') },
    { label: 'Teams & Workspaces', icon: Users, category: 'Teams', action: () => onSelectTab('teams') },
    { label: 'API Credentials & Gateway', icon: PromptKeyIcon, category: 'Settings', action: () => onSelectTab('credentials') },
    { label: 'Account Settings', icon: Settings, category: 'Settings', action: () => onSelectTab('settings') },
  ];

  const filteredActions = navActions.filter((a) =>
    a.label.toLowerCase().includes(sanitizedQuery) ||
    a.category.toLowerCase().includes(sanitizedQuery)
  );

  const filteredPrompts = prompts
    .filter((p) => p.title.toLowerCase().includes(sanitizedQuery))
    .slice(0, 6);

  const allItems = [
    ...filteredActions.map((a) => ({ type: 'action' as const, ...a })),
    ...filteredPrompts.map((p) => ({
      type: 'prompt' as const,
      label: p.title,
      category: p.category || 'Prompt',
      icon: Terminal,
      action: () => onSelectPrompt(p.id),
    })),
  ];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = allItems[selectedIndex];
      if (item) {
        item.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[750] flex items-start justify-center pt-16 sm:pt-20 px-4 bg-black/70 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0"
          onClick={onClose}
        />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl bg-bg-secondary border border-border-default rounded-xl shadow-xl overflow-hidden z-10"
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-3 border-b border-border-default bg-bg-tertiary">
              <Search className="w-5 h-5 text-brand-primary mr-3 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search prompts..."
                className="w-full bg-transparent text-text-primary placeholder:text-text-muted focus:outline-none text-sm font-medium font-sans"
              />
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded border border-border-default bg-bg-secondary text-[10px] font-mono text-text-muted">ESC</span>
                <button
                  onClick={onClose}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-border-subtle transition-colors cursor-pointer"
                  aria-label="Close command palette"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List Results */}
            <div className="max-h-96 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {allItems.length === 0 ? (
                <div className="p-8 text-center text-text-muted font-medium text-xs space-y-1">
                  <p className="text-text-primary font-semibold">No matching commands or prompts found.</p>
                  <p className="text-[11px]">Try typing keywords like "Workspace", "Marketplace", or prompt titles</p>
                </div>
              ) : (
                allItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={`${item.type}-${idx}-${item.label}`}
                      onClick={() => {
                        item.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all text-left cursor-pointer border ${
                        isSelected
                          ? 'bg-brand-primary-light text-brand-primary border-brand-primary/20 shadow-xs'
                          : 'text-text-secondary hover:bg-bg-tertiary border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected 
                            ? 'bg-brand-primary text-white border border-brand-primary/20' 
                            : 'bg-bg-tertiary text-text-muted border border-border-default'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className={`font-semibold text-xs block truncate font-sans ${isSelected ? 'text-brand-primary' : 'text-text-primary'}`}>{item.label}</span>
                          <span className="text-[10px] text-text-muted font-mono uppercase">{item.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-bg-tertiary border border-border-default text-text-secondary">
                          {item.type}
                        </span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-brand-primary translate-x-0.5' : 'text-text-muted'}`} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Keyboard Footer */}
            <div className="px-4 py-2.5 bg-bg-tertiary border-t border-border-default flex items-center justify-between text-[11px] text-text-muted font-mono">
              <div className="flex items-center gap-2">
                <span>Navigate:</span>
                <span className="px-1.5 py-0.5 rounded border border-border-default bg-bg-secondary text-[10px]">↑</span>
                <span className="px-1.5 py-0.5 rounded border border-border-default bg-bg-secondary text-[10px]">↓</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded border border-border-default bg-bg-secondary text-[10px]">↵</span>
                  <span>Select</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded border border-border-default bg-bg-secondary text-[10px]">ESC</span>
                  <span>Close</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>,
      document.body
    );
  };

export default CommandPalette;
