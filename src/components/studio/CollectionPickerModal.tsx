import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderPlus, Folder, Plus, X, Globe, Lock } from 'lucide-react';
import type { Collection } from '../../db/schema';

export interface CollectionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  onSelectCollection: (collectionId: string) => void;
  onCreateCollection: (name: string, description: string, isPrivate: boolean) => void;
}

export const CollectionPickerModal: React.FC<CollectionPickerModalProps> = ({
  isOpen,
  onClose,
  collections,
  onSelectCollection,
  onCreateCollection,
}) => {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateCollection(newName.trim(), newDesc.trim(), isPrivate);
    setNewName('');
    setNewDesc('');
    setIsPrivate(false);
    setIsCreatingNew(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-bg-secondary border border-border-default shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-bg-primary/50">
          <div className="w-10 h-1 rounded-full bg-border-default" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default bg-bg-primary/50">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-brand-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Add Prompt to Collection</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary rounded-lg cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
          {isCreatingNew ? (
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-text-primary block mb-1">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Production Agents, Code Review"
                  required
                  autoFocus
                  className="w-full text-base sm:text-xs px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-text-primary focus:outline-none focus:border-brand-primary min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text-primary block mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What is this collection for?"
                  rows={2}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-bg-primary border border-border-default text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                />
              </div>

              {/* Visibility Choice */}
              <div>
                <label className="text-xs font-medium text-text-primary block mb-1.5">
                  Collection Visibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      !isPrivate
                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold'
                        : 'border-border-default bg-bg-primary text-text-secondary hover:border-border-hover'
                    }`}
                  >
                    <Globe className="w-4 h-4 shrink-0 text-brand-primary" />
                    <div>
                      <div className="text-xs font-bold text-text-primary">Public</div>
                      <div className="text-[10px] text-text-muted">Anyone can view</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isPrivate
                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold'
                        : 'border-border-default bg-bg-primary text-text-secondary hover:border-border-hover'
                    }`}
                  >
                    <Lock className="w-4 h-4 shrink-0 text-text-muted" />
                    <div>
                      <div className="text-xs font-bold text-text-primary">Private</div>
                      <div className="text-[10px] text-text-muted">Only you can view</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary cursor-pointer min-h-[38px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi cursor-pointer min-h-[38px]"
                >
                  Create &amp; Add
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-lg border border-dashed border-border-default text-xs font-medium text-brand-primary hover:bg-brand-primary-light/40 transition-colors cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Collection</span>
              </button>

              {collections.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectCollection(c.id);
                    onClose();
                  }}
                  className="flex items-center justify-between p-3 rounded-lg border border-border-default bg-bg-primary hover:border-brand-primary/40 hover:bg-bg-tertiary/40 cursor-pointer transition-all min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder className="w-4 h-4 text-brand-primary shrink-0" />
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-text-primary truncate">{c.name}</p>
                        {c.isPrivate ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono bg-bg-tertiary border border-border-default text-text-muted">
                            <Lock className="w-2.5 h-2.5" />
                            Private
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono bg-brand-primary/10 border border-brand-primary/20 text-brand-primary dark:text-[#41A2D9]">
                            <Globe className="w-2.5 h-2.5 text-brand-primary dark:text-[#41A2D9]" />
                            Public
                          </span>
                        )}
                      </div>
                      {c.description && (
                        <p className="text-[11px] text-text-muted truncate mt-0.5">{c.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted shrink-0 ml-2">
                    {c.promptIds?.length || 0} prompts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
