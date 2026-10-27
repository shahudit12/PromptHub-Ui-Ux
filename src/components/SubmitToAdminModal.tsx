import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle2, Send, Award } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Prompt } from '../db/schema';
import { securityUtils } from '../utils/security';

export interface SubmitToAdminModalProps {
  isOpen: boolean;
  prompt: Prompt | null;
  onClose: () => void;
}

export const SubmitToAdminModal: React.FC<SubmitToAdminModalProps> = ({ isOpen, prompt, onClose }) => {
  const { showToast, submitPromptToAdmin, user, isLoggedIn, setShowAuthModal } = useApp();

  const [topic, setTopic] = useState<string>(prompt?.category || 'Development');
  const [model, setModel] = useState<string>(prompt?.model || 'openai/gpt-4o');
  const [title, setTitle] = useState<string>(prompt?.title || '');
  const [description, setDescription] = useState<string>(prompt?.description || '');
  const [content, setContent] = useState<string>(prompt?.rawContent || '');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (prompt) {
      setTopic(prompt.category || 'Development');
      setModel(prompt.model || 'openai/gpt-4o');
      setTitle(prompt.title || '');
      setDescription(prompt.description || '');
      setContent(prompt.rawContent || '');
    }
  }, [prompt]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn || !user) {
      showToast('Please sign in or create an account to submit prompts and earn 15-day Pro access.', 'info');
      setShowAuthModal(true);
      return;
    }

    if (!title.trim() || !content.trim()) {
      showToast('Please enter a prompt title and prompt content before submitting to admin!', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const submissionPrompt: Prompt = prompt || {
        id: securityUtils.generateUUID(),
        title: title.trim(),
        description: description.trim(),
        rawContent: content.trim(),
        category: topic as any,
        model: model as any,
        tags: ['community-submission'],
        authorId: user.id,
        authorName: user.name || user.username || 'Creator',
        authorAvatar: user.avatarUrl || '',
        isPremium: false,
        visibility: 'private',
        variables: [],
        likesCount: 0,
        copiesCount: 0,
        forksCount: 0,
        viewsCount: 0,
        assetType: 'prompt',
        difficulty: 'Intermediate',
        license: 'MIT',
        status: 'active',
        versionCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await submitPromptToAdmin(submissionPrompt, note);
      setSubmitted(true);
      showToast(`Prompt "${title || prompt?.title}" submitted to Admin! If approved, you get 15 Days Pro Access!`, 'success');
    } catch (err: any) {
      showToast('Failed to submit prompt to Admin: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setNote('');
    onClose();
  };

  const TOPICS = ['Development', 'Writing', 'Marketing', 'Research', 'Creative', 'Business', 'Education', 'AI Engineering'];

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[700] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-lg bg-bg-secondary border border-border-default rounded-xl p-6 shadow-2xl relative my-auto text-left max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={handleResetAndClose}
            className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          {!submitted ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Submit Prompt to Admin</h3>
                  <p className="text-xs text-text-secondary">
                    Submit a high-quality prompt for platform review &amp; curation.
                  </p>
                </div>
              </div>

              {/* Reward Banner */}
              <div className="p-3 rounded-lg bg-brand-primary-light border border-brand-primary/20 flex items-center gap-2.5 text-xs text-brand-primary">
                <Sparkles className="w-4 h-4 shrink-0" />
                <div>
                  <strong>Pro Access Reward:</strong> If approved by Admin, your account will be awarded{' '}
                  <strong>15 Days of Pro Access</strong>!
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                      Category Topic
                    </label>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer font-mono"
                    >
                      {TOPICS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                      Target AI Model
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. openai/gpt-4o"
                      className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                    Prompt Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Next.js 15 Full-Stack Component Architect"
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                    Description &amp; Use Case
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain what this prompt accomplishes..."
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg p-2.5 text-xs text-text-primary focus:border-brand-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                    Prompt Instructions / System Payload
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste the full prompt system instruction here..."
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg p-2.5 text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-border-default">
                  <button
                    type="button"
                    onClick={handleResetAndClose}
                    className="px-3.5 py-1.5 rounded-lg border border-border-default text-xs font-medium text-text-secondary hover:bg-bg-tertiary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting...' : 'Submit to Admin'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-text-primary">Prompt Submitted for Review</h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                Your prompt has been submitted to the Admin curation queue. Once approved, 15 days of Pro access will be granted to your account!
              </p>
              <button
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default SubmitToAdminModal;
