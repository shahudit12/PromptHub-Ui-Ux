import React, { useState, useEffect, useRef, Component, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MessageSquare, 
  Send, 
  Loader2, 
  LogIn,
  AlertCircle,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useConfirm } from '../hooks/useConfirm';
import { socialService, type SocialComment } from '../services/socialService';
import { UserAvatar } from './UserAvatar';

export interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string | null;
  targetType: 'prompt' | 'drop';
  targetTitle: string;
  onCommentAdded?: (newCount: number) => void;
}

// Resilient inline ErrorBoundary ensuring comments errors never crash the host application
interface ErrorBoundaryProps {
  children: ReactNode;
  onClose: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class CommentsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CommentsModal] Caught rendering exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center space-y-3.5">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-text-primary font-display">
            Unable to display discussion
          </h4>
          <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
            An unexpected error occurred while loading this conversation. Please try again.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hover transition-colors cursor-pointer min-h-[44px]"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={this.props.onClose}
              className="px-4 py-2 rounded-lg bg-bg-tertiary text-text-secondary text-xs font-semibold hover:bg-border-subtle transition-colors cursor-pointer min-h-[44px]"
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetType,
  targetTitle,
  onCommentAdded,
}) => {
  const { user, isLoggedIn, setShowAuthModal, showToast } = useApp();
  const confirm = useConfirm();
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const onCommentAddedRef = useRef(onCommentAdded);
  onCommentAddedRef.current = onCommentAdded;

  // 1. Data fetching & Supabase Realtime channel subscription (All hooks unconditionally at top)
  useEffect(() => {
    if (!isOpen || !targetId) {
      setComments([]);
      setIsLoading(false);
      setEditingCommentId(null);
      setEditText('');
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    socialService.getComments(targetId, targetType)
      .then((data) => {
        if (isMounted) {
          setComments(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[CommentsModal] Load error:', err);
        if (isMounted) {
          setComments([]);
          setIsLoading(false);
        }
      });

    // Local in-window event listeners for instant multi-modal and fast response
    const handleLocalUpdated = (e: any) => {
      const comment = e.detail?.comment;
      if (comment && isMounted && (!e.detail.promptId || e.detail.promptId === targetId)) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.id
              ? {
                  ...c,
                  content: comment.content,
                  isEdited: true,
                  updatedAt: comment.updatedAt || new Date().toISOString(),
                }
              : c
          )
        );
      }
    };

    const handleLocalDeleted = (e: any) => {
      const commentId = e.detail?.commentId;
      if (commentId && isMounted && (!e.detail.targetId || e.detail.targetId === targetId)) {
        setComments((prev) => {
          const updated = prev.filter((c) => c.id !== commentId);
          onCommentAddedRef.current?.(updated.length);
          return updated;
        });
      }
    };

    window.addEventListener('ph_prompt_comment_updated', handleLocalUpdated);
    window.addEventListener('ph_prompt_comment_deleted', handleLocalDeleted);

    return () => {
      isMounted = false;
      window.removeEventListener('ph_prompt_comment_updated', handleLocalUpdated);
      window.removeEventListener('ph_prompt_comment_deleted', handleLocalDeleted);
      
    };
  }, [isOpen, targetId, targetType]);

  // 2. Auto-scroll on new comments
  useEffect(() => {
    if (comments.length > 0 && !isLoading) {
      try {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } catch {}
    }
  }, [comments.length, isLoading]);

  // 3. Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // 4. Lock body overflow while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const handleStartEdit = (comment: SocialComment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText('');
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!targetId || !editText.trim() || isSavingEdit || !user?.id) return;
    const newContent = editText.trim();
    const nowIso = new Date().toISOString();
    setIsSavingEdit(true);

    // Optimistic local state update for zero perceived latency
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              content: newContent,
              isEdited: true,
              updatedAt: nowIso,
            }
          : c
      )
    );

    try {
      const updated = await socialService.updateComment({
        commentId,
        targetId,
        targetType,
        authorId: user.id,
        content: newContent,
      });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, ...updated, isEdited: true } : c))
      );
      setEditingCommentId(null);
      setEditText('');
      showToast('Comment updated successfully!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update comment.', 'error');
      // Revert if error
      socialService.getComments(targetId, targetType).then((latest) => {
        setComments(latest);
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!targetId || deletingCommentId || !user?.id) return;
    const ok = await confirm({
      title: 'Delete Comment',
      message: 'Delete your comment? You will be able to write a new one.',
      confirmText: 'Delete Comment',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    setDeletingCommentId(commentId);
    try {
      await socialService.deleteComment({
        commentId,
        targetId,
        targetType,
        authorId: user.id,
      });
      const remaining = comments.filter((c) => c.id !== commentId);
      setComments(remaining);
      onCommentAddedRef.current?.(remaining.length);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ph_prompt_comment_changed', {
            detail: {
              promptId: targetId,
              targetType,
              commentsCount: remaining.length,
              delta: -1,
            },
          })
        );
      }
      showToast('Comment deleted.', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete comment.', 'error');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !inputText.trim() || isSubmitting) return;

    if (!isLoggedIn || !user) {
      setShowAuthModal(true);
      showToast('Please sign in to post comments.', 'info');
      return;
    }

    if (comments.some(c => c.authorId === user.id)) {
      showToast('You have already posted a comment on this prompt (1 comment per account).', 'info');
      return;
    }

    const textToSubmit = inputText.trim();
    setInputText('');
    setIsSubmitting(true);

    try {
      const newComment = await socialService.addComment({
        targetId,
        targetType,
        authorId: user.id,
        content: textToSubmit,
        authorName: user.name || user.username || 'Developer',
        authorAvatar: user.avatarUrl || '',
        authorUsername: user.username,
      });

      const nextComments = [...comments, newComment];
      setComments(nextComments);
      onCommentAddedRef.current?.(nextComments.length);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ph_prompt_comment_changed', {
            detail: {
              promptId: targetId,
              commentsCount: nextComments.length,
              delta: 1,
            },
          })
        );
      }
      showToast('Comment posted!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to post comment.', 'error');
      setInputText(textToSubmit);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRelativeTime = (isoString?: string | null) => {
    if (!isoString) return 'Just now';
    try {
      const past = new Date(isoString).getTime();
      if (isNaN(past)) return 'Just now';
      const now = Date.now();
      const diffMs = now - past;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d`;
      const diffWeeks = Math.floor(diffDays / 7);
      if (diffWeeks < 52) return `${diffWeeks}w`;
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Just now';
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Just now';
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && targetId && (
        <motion.div 
          key="comments-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            key="comments-modal-dialog"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg bg-bg-secondary border border-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col text-left text-text-primary max-h-[85vh] sm:max-h-[640px]"
            onClick={(e) => e.stopPropagation()}
          >
            <CommentsErrorBoundary onClose={onClose}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-bg-primary/60 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary-light flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/20">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-primary px-1.5 py-0.5 rounded bg-brand-primary-light">
                        {targetType === 'drop' ? 'Prompt Drop' : 'Prompt'}
                      </span>
                      <span className="text-xs text-text-muted font-mono">({comments.length})</span>
                    </div>
                    <h3 className="text-sm font-bold text-text-primary font-display truncate mt-0.5">
                      {targetTitle || 'Discussion'}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close comments"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Comments Feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {isLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-text-muted">
                    <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                    <span className="text-xs font-mono">Loading discussion...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 px-4">
                    <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-text-muted">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-text-primary font-display">No comments yet</h4>
                    <p className="text-xs text-text-muted max-w-xs font-sans">
                      Be the first to share your thoughts, tips, or results with the community!
                    </p>
                  </div>
                ) : (
                  comments.map((comment) => {
                    const authorName = (comment?.authorName?.trim() || 'Community Member');
                    const initial = (authorName.charAt(0) || 'U').toUpperCase();
                    const isAuthor = Boolean(user?.id && comment.authorId === user.id);
                    const isEditing = editingCommentId === comment.id;
                    const isAdminComment = Boolean(
                      authorName.toLowerCase() === 'prompthub admin' ||
                      authorName.toLowerCase() === 'admin' ||
                      comment.authorUsername?.toLowerCase() === 'admin' ||
                      comment.authorUsername?.toLowerCase() === 'prompthub_admin' ||
                      comment.authorAvatar?.includes('admin-avatar') ||
                      comment.authorAvatar?.includes('photo-1618005182384-a83a8bd57fbe')
                    );

                    return (
                      <div
                        key={comment.id || Math.random().toString()}
                        className="flex items-start gap-3 group"
                      >
                        <UserAvatar
                          src={comment.authorAvatar}
                          name={authorName || initial}
                          username={comment.authorUsername}
                          isAdmin={isAdminComment}
                          size="sm"
                          shape="circle"
                          className="mt-0.5 shrink-0"
                        />

                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => {
                                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveEdit(comment.id);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelEdit();
                                  }
                                }}
                                maxLength={500}
                                rows={3}
                                autoFocus
                                disabled={isSavingEdit}
                                placeholder="Edit your comment... (Ctrl+Enter to save, Esc to cancel)"
                                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all resize-none font-sans"
                              />
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(comment.id)}
                                    disabled={!editText.trim() || isSavingEdit}
                                    className="px-3.5 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                                  >
                                    {isSavingEdit ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                    <span>Save</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    disabled={isSavingEdit}
                                    className="px-3.5 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Cancel</span>
                                  </button>
                                </div>
                                <span className={`text-[10px] font-mono tabular-nums ${editText.length >= 480 ? 'text-brand-amber font-semibold' : 'text-text-muted'}`}>
                                  {editText.length}/500
                                </span>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Instagram Comment: Username bold + inline comment content */}
                              <div className="text-xs leading-relaxed break-words font-sans">
                                <span className="font-semibold text-text-primary mr-1.5 inline">
                                  {authorName}
                                </span>
                                {isAdminComment && (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 mr-1.5 align-middle">
                                    ADMIN
                                  </span>
                                )}
                                {isAuthor && (
                                  <span className="inline-flex items-center text-[9px] font-mono px-1 py-0.2 rounded bg-brand-primary/10 text-brand-primary mr-1.5 align-middle font-normal">
                                    You
                                  </span>
                                )}
                                <span className="text-text-primary/90 whitespace-pre-wrap">
                                  {comment.content || ''}
                                </span>
                              </div>

                              {/* Instagram Subline: Time • Edited • Edit • Delete */}
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted select-none">
                                <span title={comment.createdAt ? new Date(comment.createdAt).toLocaleString() : undefined} className="font-sans">
                                  {formatRelativeTime(comment.createdAt)}
                                </span>

                                {comment.isEdited && (
                                  <span className="text-[11px] text-text-muted/80 font-normal">
                                    • Edited
                                  </span>
                                )}

                                {isAuthor && (
                                  <div className="flex items-center gap-2.5 ml-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(comment)}
                                      className="text-[11px] font-medium text-text-muted hover:text-brand-primary transition-colors cursor-pointer min-h-[44px] inline-flex items-center"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(comment.id)}
                                      disabled={deletingCommentId === comment.id}
                                      className="text-[11px] font-medium text-text-muted hover:text-rose-500 transition-colors cursor-pointer min-h-[44px] inline-flex items-center disabled:opacity-50"
                                    >
                                      {deletingCommentId === comment.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Comment Input Footer */}
              <div className="p-3 sm:p-4 border-t border-border-default bg-bg-primary/80 shrink-0">
                {!isLoggedIn ? (
                  <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-bg-secondary border border-border-default">
                    <span className="text-xs text-text-muted font-sans pl-2">Sign in to join the conversation</span>
                    <button
                      type="button"
                      onClick={() => setShowAuthModal(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 min-h-[44px]"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </button>
                  </div>
                ) : user && comments.some(c => c.authorId === user.id) ? (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-bg-secondary border border-border-default text-xs text-text-muted">
                    <span className="flex items-center gap-2 font-medium text-text-secondary">
                      <MessageSquare className="w-4 h-4 text-brand-primary shrink-0" />
                      <span>You have posted your comment for this {targetType === 'drop' ? 'drop' : 'prompt'}. (1 comment per account)</span>
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value.slice(0, 500))}
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.code === 'Enter' || e.keyCode === 13)) {
                              e.preventDefault();
                              handleSubmit(e);
                            }
                          }}
                          placeholder="Add a comment or feedback... (Ctrl+Enter to post)"
                          maxLength={500}
                          disabled={isSubmitting}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all min-h-[44px] pr-16"
                        />
                        {inputText.length > 0 && (
                          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono tabular-nums pointer-events-none ${inputText.length >= 480 ? 'text-brand-amber font-semibold' : 'text-text-muted'}`}>
                            {inputText.length}/500
                          </span>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={!inputText.trim() || isSubmitting}
                        className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                        aria-label="Send comment"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </CommentsErrorBoundary>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CommentsModal;
