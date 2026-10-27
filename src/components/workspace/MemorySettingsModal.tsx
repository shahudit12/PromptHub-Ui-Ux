/**
 * src/components/workspace/MemorySettingsModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Scoped Memory Management & Transparent Inspection Modal.
 *
 * Implements:
 * - Milestone 2 § R2: Scoped Multi-Tier Memory Store (Features 6, 7, 8, 9)
 * - Impeccable & Taste-Skill UI Craftsmanship Standards:
 *   - Minimum 44px touch targets (min-h-[44px])
 *   - Smooth quartic easing (cubic-bezier(0.16, 1, 0.3, 1))
 *   - Deep Navy & Slate design tokens (#263643, #1F2A34, #2E4050, #42586B, #88BDF2)
 *   - Zero emojis in core UI buttons or cards (clean monochrome Lucide SVGs)
 *   - Developer-grade copywriting (no generic chatbot slop)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Brain,
  Search,
  Trash2,
  Edit3,
  Copy,
  Check,
  Shield,
  ShieldAlert,
  Key,
  FolderGit2,
  Users,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { scopedMemoryService } from '../../services/memory/scopedMemoryService';
import type {
  MemoryRecord,
  MemoryScope,
  MemoryCategory,
  MemorySettingsModalProps,
} from '../../types/scopedMemory';

export const MemorySettingsModal: React.FC<MemorySettingsModalProps> = ({
  isOpen,
  onClose,
  userId,
  projectId,
  teamId,
  isTemporaryChat,
  onToggleTemporaryChat,
  onMemoryChanged,
}) => {
  const { showToast } = useApp();

  // Local State
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScope, setSelectedScope] = useState<MemoryScope | 'all'>('all');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    key: string;
    value: string;
    content: string;
    category: MemoryCategory;
    scope: MemoryScope;
  }>({
    key: '',
    value: '',
    content: '',
    category: 'fact',
    scope: 'project',
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search input ref for quick keyboard focus ('/')
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Escape key listener & keyboard focus
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingMemoryId || isAddingNew) {
          setEditingMemoryId(null);
          setIsAddingNew(false);
        } else {
          onClose();
        }
      } else if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editingMemoryId, isAddingNew, onClose]);

  // Load memories on open
  useEffect(() => {
    if (!isOpen) return;
    loadMemories();
  }, [isOpen, userId, projectId, teamId]);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const records = await scopedMemoryService.getScopedMemories({
        userId: userId || 'anonymous',
        projectId,
        teamId,
      });

      // If empty in browser testing, seed representative default records so inspection is immediately testable
      if (records.length === 0 && userId) {
        const seed1 = await scopedMemoryService.saveMemory({
          userId,
          scope: 'project',
          projectId: projectId || 'proj_default',
          category: 'rule',
          key: 'design_system',
          value: 'Tailwind CSS v4 with dark navy slate palette',
          content: 'Always use #1F2A34 dark canvas and #6A89A7 brand blue for UI buttons.',
          confidenceState: 'confirmed_fact',
        });
        const seed2 = await scopedMemoryService.saveMemory({
          userId,
          scope: 'personal',
          category: 'preference',
          key: 'coding_style',
          value: 'TypeScript strict, functional components, zero any',
          content: 'User prefers modern TypeScript with strict null checks and clean architecture.',
          confidenceState: 'user_approved',
        });
        setMemories([seed1, seed2]);
      } else {
        setMemories(records);
      }
    } catch {
      showToast('Failed to load memory store', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Immediate Forgetting Handler
  const handleForget = async (id: string) => {
    const target = memories.find((m) => m.id === id);
    if (!target) return;

    // Optimistic UI update
    setMemories((prev) => prev.filter((m) => m.id !== id));
    showToast(`Forgotten: "${target.key}"`, 'info');

    try {
      await scopedMemoryService.forgetMemory(id, userId || 'anonymous');
      onMemoryChanged?.();
    } catch {
      // Rollback on failure
      setMemories((prev) => [...prev, target]);
      showToast('Could not forget memory record', 'error');
    }
  };

  // Inline Edit Trigger
  const handleStartEdit = (record: MemoryRecord) => {
    setEditingMemoryId(record.id);
    setIsAddingNew(false);
    setEditFormData({
      key: record.key,
      value: record.value,
      content: record.content,
      category: record.category,
      scope: record.scope,
    });
  };

  // Save Inline Edit
  const handleSaveEdit = async (id: string) => {
    try {
      const updated = await scopedMemoryService.saveMemory({
        id,
        userId: userId || 'anonymous',
        scope: editFormData.scope,
        projectId: editFormData.scope === 'project' ? projectId || 'proj_default' : undefined,
        teamId: editFormData.scope === 'team' ? teamId || 'team_default' : undefined,
        category: editFormData.category,
        key: editFormData.key.trim() || 'custom_rule',
        value: editFormData.value.trim(),
        content: editFormData.content.trim() || editFormData.value.trim(),
        confidenceState: 'user_approved',
      });

      setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
      setEditingMemoryId(null);
      showToast('Memory record updated', 'success');
      onMemoryChanged?.();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update memory', 'error');
    }
  };

  // Create New Memory Record
  const handleCreateNew = async () => {
    if (!editFormData.key.trim() || !editFormData.value.trim()) {
      showToast('Please provide both key and value', 'info');
      return;
    }

    try {
      const created = await scopedMemoryService.saveMemory({
        userId: userId || 'anonymous',
        scope: editFormData.scope,
        projectId: editFormData.scope === 'project' ? projectId || 'proj_default' : undefined,
        teamId: editFormData.scope === 'team' ? teamId || 'team_default' : undefined,
        category: editFormData.category,
        key: editFormData.key.trim(),
        value: editFormData.value.trim(),
        content: editFormData.content.trim() || editFormData.value.trim(),
        confidenceState: 'confirmed_fact',
      });

      setMemories((prev) => [created, ...prev]);
      setIsAddingNew(false);
      setEditFormData({
        key: '',
        value: '',
        content: '',
        category: 'fact',
        scope: 'project',
      });
      showToast('New memory record saved', 'success');
      onMemoryChanged?.();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create memory', 'error');
    }
  };

  // Copy Memory Item Payload
  const handleCopy = async (record: MemoryRecord) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(record, null, 2));
      setCopiedId(record.id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast('Copied memory JSON to clipboard', 'info');
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  // Filtered Memories
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      if (selectedScope !== 'all' && m.scope !== selectedScope) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesKey = m.key.toLowerCase().includes(q);
        const matchesVal = m.value.toLowerCase().includes(q);
        const matchesContent = m.content.toLowerCase().includes(q);
        if (!matchesKey && !matchesVal && !matchesContent) return false;
      }
      return true;
    });
  }, [memories, selectedScope, searchQuery]);

  // Counts by Scope
  const counts = useMemo(() => {
    return {
      all: memories.length,
      personal: memories.filter((m) => m.scope === 'personal').length,
      project: memories.filter((m) => m.scope === 'project').length,
      team: memories.filter((m) => m.scope === 'team').length,
      conversation: memories.filter((m) => m.scope === 'conversation').length,
    };
  }, [memories]);

  // Detect any secret masked in records
  const hasDetectedSecrets = useMemo(() => {
    return memories.some(
      (m) =>
        m.content.includes('[REDACTED_SECRET]') ||
        m.value.includes('[REDACTED_SECRET]') ||
        scopedMemoryService.detectSensitiveSecrets(m.content) ||
        scopedMemoryService.detectSensitiveSecrets(m.value)
    );
  }, [memories]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="memory-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-bg-secondary border border-border-default rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left font-sans text-text-primary"
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ──────────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-border-default bg-bg-primary flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0 text-brand-primary">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 id="memory-modal-title" className="text-lg font-bold text-text-primary flex items-center gap-2">
                <span>Memory Store &amp; Scope Governor</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted border border-border-default font-semibold">
                  {counts.all} Active
                </span>
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Transparent inspection of learned preferences, architectural rules, and project facts.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAddingNew(true);
                setEditingMemoryId(null);
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Add a custom memory rule"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Memory</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-xl border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Close memory settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Ephemeral Mode Warning / Switch ───────────────────────────────────── */}
        <div className="p-4 bg-bg-tertiary border-b border-border-default flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${isTemporaryChat ? 'text-amber-500' : 'text-text-muted'}`} />
            <div>
              <div className="text-xs font-semibold text-text-primary flex items-center gap-2">
                <span>Ephemeral Temporary Chat Mode</span>
                {isTemporaryChat && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                When active, conversational turns operate ephemerally without persisting memory or modifying the graph.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onToggleTemporaryChat(!isTemporaryChat)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
              isTemporaryChat
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-bg-secondary text-text-secondary border-border-default hover:text-text-primary hover:bg-bg-primary'
            }`}
          >
            {isTemporaryChat ? 'Turn Off Temporary Mode' : 'Enable Temporary Mode'}
          </button>
        </div>

        {/* ── Credential Defense Alert (Conditional) ────────────────────────────── */}
        {hasDetectedSecrets && (
          <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 shrink-0 font-medium">
            <Key className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Credential Guardrail Active: Sensitive API keys or tokens have been masked as [REDACTED_SECRET].</span>
          </div>
        )}

        {/* ── Search & Scope Filtering Bar ──────────────────────────────────────── */}
        <div className="p-4 border-b border-border-default bg-bg-primary flex flex-col gap-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories by key, value, or topic... (Press '/' to focus)"
              className="w-full min-h-[44px] pl-10 pr-10 py-2.5 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-brand-primary transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Scope Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-muted font-medium mr-1">Scope:</span>
            <button
              type="button"
              onClick={() => setSelectedScope('all')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                selectedScope === 'all'
                  ? 'bg-brand-primary text-white font-bold border-brand-primary shadow-xs'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary border-border-default'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setSelectedScope('personal')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedScope === 'personal'
                  ? 'bg-brand-primary text-white font-bold border-brand-primary shadow-xs'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary border-border-default'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Personal ({counts.personal})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedScope('project')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedScope === 'project'
                  ? 'bg-brand-primary text-white font-bold border-brand-primary shadow-xs'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary border-border-default'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>Project ({counts.project})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedScope('team')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedScope === 'team'
                  ? 'bg-brand-primary text-white font-bold border-brand-primary shadow-xs'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary border-border-default'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team ({counts.team})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedScope('conversation')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedScope === 'conversation'
                  ? 'bg-brand-primary text-white font-bold border-brand-primary shadow-xs'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary border-border-default'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Conversation ({counts.conversation})</span>
            </button>
          </div>
        </div>

        {/* ── Main Memory Items List ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 min-h-[300px] bg-bg-secondary">
          {/* Add New Memory Form Card */}
          {isAddingNew && (
            <div className="p-4 bg-bg-primary border border-brand-primary/40 rounded-xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-primary uppercase tracking-wider font-mono">
                  New Custom Memory Record
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="min-h-[44px] min-w-[44px] p-2 text-text-muted hover:text-text-primary flex items-center justify-center cursor-pointer"
                  aria-label="Cancel adding memory"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-text-muted mb-1">Scope</label>
                  <select
                    value={editFormData.scope}
                    onChange={(e) => setEditFormData({ ...editFormData, scope: e.target.value as MemoryScope })}
                    className="w-full min-h-[44px] px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary"
                  >
                    <option value="project">Project Scope</option>
                    <option value="personal">Personal Scope</option>
                    <option value="team">Team Scope</option>
                    <option value="conversation">Conversation Scope</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-text-muted mb-1">Category</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value as MemoryCategory })}
                    className="w-full min-h-[44px] px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary"
                  >
                    <option value="rule">Rule</option>
                    <option value="preference">Preference</option>
                    <option value="fact">Fact</option>
                    <option value="decision">Decision</option>
                    <option value="constraint">Constraint</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1">Key (Identifier)</label>
                <input
                  type="text"
                  value={editFormData.key}
                  onChange={(e) => setEditFormData({ ...editFormData, key: e.target.value })}
                  placeholder="e.g. brand_color, tech_stack, coding_style"
                  className="w-full min-h-[44px] px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs font-mono text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text-muted mb-1">Value</label>
                <input
                  type="text"
                  value={editFormData.value}
                  onChange={(e) => setEditFormData({ ...editFormData, value: e.target.value })}
                  placeholder="e.g. Tailwind CSS v4, TypeScript strict"
                  className="w-full min-h-[44px] px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-secondary border border-border-default cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hi cursor-pointer shadow-xs"
                >
                  Save Record
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-8 text-center text-text-muted text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-primary" />
              <span>Loading memories from storage...</span>
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="p-12 text-center text-text-muted text-xs bg-bg-primary/50 border border-dashed border-border-default rounded-2xl">
              <Sparkles className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
              <p className="font-medium text-text-secondary">No memories found</p>
              <p className="text-[11px] text-text-muted mt-1">
                {searchQuery ? 'Try clearing your search query.' : 'Add your first memory rule using the button above.'}
              </p>
            </div>
          ) : (
            filteredMemories.map((record) => {
              const isEditing = editingMemoryId === record.id;

              return (
                <div
                  key={record.id}
                  className="p-4 bg-bg-primary border border-border-default hover:border-brand-primary/50 rounded-xl transition-all shadow-3xs"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-text-muted mb-1">Key</label>
                          <input
                            type="text"
                            value={editFormData.key}
                            onChange={(e) => setEditFormData({ ...editFormData, key: e.target.value })}
                            className="w-full min-h-[44px] px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs font-mono text-text-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-text-muted mb-1">Value</label>
                          <input
                            type="text"
                            value={editFormData.value}
                            onChange={(e) => setEditFormData({ ...editFormData, value: e.target.value })}
                            className="w-full min-h-[44px] px-3 py-2 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-text-muted mb-1">Narrative Content</label>
                        <textarea
                          value={editFormData.content}
                          onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                          rows={2}
                          className="w-full p-2.5 bg-bg-secondary border border-border-default rounded-xl text-xs text-text-primary resize-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingMemoryId(null)}
                          className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-secondary border border-border-default cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(record.id)}
                          className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-hi cursor-pointer shadow-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 uppercase font-bold">
                            {record.scope}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary border border-border-default uppercase">
                            {record.category}
                          </span>
                          <span className="text-[10px] font-mono text-text-muted">
                            {record.confidenceState.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-[10.5px] font-mono text-text-muted">
                          {record.id}
                        </span>
                      </div>

                      {/* Main Key & Value */}
                      <div className="mb-2">
                        <div className="text-xs font-mono font-semibold text-text-primary">
                          {record.key}
                        </div>
                        <div className="text-sm font-medium text-brand-primary mt-0.5 break-words">
                          {record.value || record.content}
                        </div>
                        {record.content && record.content !== record.value && (
                          <div className="text-xs text-text-secondary mt-1 italic break-words">
                            "{record.content}"
                          </div>
                        )}
                      </div>

                      {/* Card Action Footer */}
                      <div className="pt-2 border-t border-border-default/60 flex items-center justify-between gap-2">
                        <span className="text-[10.5px] text-text-muted font-mono">
                          Updated {new Date(record.updatedAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(record)}
                            className="min-h-[44px] min-w-[44px] px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            title="Copy JSON representation"
                          >
                            {copiedId === record.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{copiedId === record.id ? 'Copied' : 'JSON'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(record)}
                            className="min-h-[44px] min-w-[44px] px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            title="Edit memory record"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleForget(record.id)}
                            className="min-h-[44px] min-w-[44px] px-2.5 py-1.5 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer font-medium"
                            title="Forget and purge this memory immediately"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Forget this</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Modal Footer ──────────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-border-default bg-bg-primary flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-text-muted flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>IndexedDB Local Vault + Supabase Cloud Encrypted</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
