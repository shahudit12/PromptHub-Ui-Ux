import { logger } from '../utils/logger';
import { securityUtils } from '../utils/security';
import { copyToClipboard } from '../utils/clipboard';
import { trackPromptShared } from '../lib/mixpanelEvents';

export interface SocialComment {
  id: string;
  targetId: string;
  targetType: 'prompt' | 'drop';
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorUsername?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
}

const LOCAL_LIKED_DROPS_KEY = 'prompthub_liked_drops';
const LOCAL_COMMENTS_PREFIX = 'prompthub_comments_';
const LOCAL_SHARED_PROMPTS_KEY = 'prompthub_shared_prompts';
const LOCAL_SHARED_DROPS_KEY = 'prompthub_shared_drops';

class SocialService {
  getLocalLikedDrops(): string[] {
    try {
      const stored = localStorage.getItem(LOCAL_LIKED_DROPS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }

  saveLocalLikedDrops(ids: string[]): void {
    try {
      localStorage.setItem(LOCAL_LIKED_DROPS_KEY, JSON.stringify(ids));
    } catch {}
  }

  async getUserDropLikes(userId: string): Promise<string[]> {
    return this.getLocalLikedDrops();
  }

  async toggleDropLike(dropId: string, userId: string, currentCount: number = 0): Promise<{ isLiked: boolean; newCount: number }> {
    const liked = this.getLocalLikedDrops();
    const isLiked = liked.includes(dropId);
    const updated = isLiked ? liked.filter((id) => id !== dropId) : [...liked, dropId];
    this.saveLocalLikedDrops(updated);
    const nextIsLiked = !isLiked;
    const newCount = Math.max(0, currentCount + (nextIsLiked ? 1 : -1));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ph_drop_like_changed', { detail: { dropId, isLiked: nextIsLiked, newCount } }));
    }

    return { isLiked: nextIsLiked, newCount };
  }

  async getComments(targetId: string, targetType: 'prompt' | 'drop'): Promise<SocialComment[]> {
    const key = `${LOCAL_COMMENTS_PREFIX}${targetType}_${targetId}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}

    // Seed default friendly comment if empty
    return [
      {
        id: `c_${targetId}_seed`,
        targetId,
        targetType,
        authorId: 'creator-alex-chen',
        authorName: 'Alex Chen',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        authorUsername: 'alexc_ai',
        content: 'Clean architecture and exceptional system prompt clarity. Running smoothly in our test pipelines!',
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
    ];
  }

  async addComment(params: {
    targetId: string;
    targetType: 'prompt' | 'drop';
    authorId: string;
    authorName: string;
    authorAvatar: string;
    authorUsername?: string;
    content: string;
  }): Promise<SocialComment> {
    const sanitizedContent = securityUtils.sanitizeInput(params.content.trim());
    if (!sanitizedContent) {
      throw new Error('Comment content cannot be empty.');
    }

    const key = `${LOCAL_COMMENTS_PREFIX}${params.targetType}_${params.targetId}`;
    const comments = await this.getComments(params.targetId, params.targetType);

    const newComment: SocialComment = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cmt_${Date.now()}`,
      targetId: params.targetId,
      targetType: params.targetType,
      authorId: params.authorId,
      authorName: params.authorName,
      authorAvatar: params.authorAvatar,
      authorUsername: params.authorUsername,
      content: sanitizedContent,
      createdAt: new Date().toISOString(),
    };

    comments.unshift(newComment);
    try {
      localStorage.setItem(key, JSON.stringify(comments.slice(0, 50)));
    } catch {}

    this.broadcastComment(newComment);
    return newComment;
  }

  async updateComment(params: {
    commentId: string;
    targetId: string;
    targetType: 'prompt' | 'drop';
    authorId: string;
    content: string;
  }): Promise<SocialComment> {
    const sanitizedContent = securityUtils.sanitizeInput(params.content.trim());
    const key = `${LOCAL_COMMENTS_PREFIX}${params.targetType}_${params.targetId}`;
    const comments = await this.getComments(params.targetId, params.targetType);
    const target = comments.find((c) => c.id === params.commentId);

    if (target) {
      target.content = sanitizedContent;
      target.isEdited = true;
      target.updatedAt = new Date().toISOString();
      try {
        localStorage.setItem(key, JSON.stringify(comments));
      } catch {}
      this.broadcastCommentUpdate(target);
      return target;
    }

    throw new Error('Comment not found.');
  }

  async deleteComment(params: {
    commentId: string;
    targetId: string;
    targetType: 'prompt' | 'drop';
    authorId: string;
  }): Promise<boolean> {
    const key = `${LOCAL_COMMENTS_PREFIX}${params.targetType}_${params.targetId}`;
    const comments = await this.getComments(params.targetId, params.targetType);
    const filtered = comments.filter((c) => c.id !== params.commentId);
    try {
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch {}
    this.broadcastCommentDeletion({ commentId: params.commentId, targetId: params.targetId, targetType: params.targetType });
    return true;
  }

  broadcastLike(payload: { promptId: string; likesCount?: number; isLiked: boolean; userId: string; increment?: number }): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prompthub:like-updated', { detail: payload }));
    }
  }

  broadcastComment(comment: SocialComment): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`ph_comment_added_${comment.targetId}`, { detail: comment }));
      window.dispatchEvent(new CustomEvent('ph_social_comment_added', { detail: comment }));
    }
  }

  broadcastCommentUpdate(comment: SocialComment): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`ph_comment_updated_${comment.targetId}`, { detail: comment }));
    }
  }

  broadcastCommentDeletion(params: { commentId: string; targetId: string; targetType: 'prompt' | 'drop' }): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`ph_comment_deleted_${params.targetId}`, { detail: params }));
    }
  }

  getLocalSharedItems(targetType: 'prompt' | 'drop', userId?: string): string[] {
    const key = targetType === 'prompt' ? LOCAL_SHARED_PROMPTS_KEY : LOCAL_SHARED_DROPS_KEY;
    try {
      const raw = localStorage.getItem(`${key}_${userId || 'anonymous'}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  hasUserShared(targetId: string, targetType: 'prompt' | 'drop', userId?: string): boolean {
    if (!targetId) return false;
    return this.getLocalSharedItems(targetType, userId).includes(targetId);
  }

  markUserShared(targetId: string, targetType: 'prompt' | 'drop', userId?: string): void {
    if (!targetId) return;
    const current = this.getLocalSharedItems(targetType, userId);
    if (!current.includes(targetId)) {
      current.push(targetId);
      const key = targetType === 'prompt' ? LOCAL_SHARED_PROMPTS_KEY : LOCAL_SHARED_DROPS_KEY;
      try {
        localStorage.setItem(`${key}_${userId || 'anonymous'}`, JSON.stringify(current));
      } catch {}
    }
  }

  async shareItem(params: {
    targetId: string;
    targetType: 'prompt' | 'drop';
    title: string;
    description?: string;
    text?: string;
    url?: string;
    userId?: string;
  }): Promise<{ shared: boolean; success: boolean; method: 'native' | 'clipboard'; firstShare: boolean; isFirstShare: boolean }> {
    const shareUrl = params.url || (typeof window !== 'undefined' ? window.location.href : 'https://prompthub.cloud');
    const isFirstShare = !this.hasUserShared(params.targetId, params.targetType, params.userId);

    let method: 'native' | 'clipboard' = 'clipboard';
    if (typeof navigator !== 'undefined' && navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: params.title,
          text: params.description,
          url: shareUrl,
        });
        method = 'native';
      } catch {
        await copyToClipboard(shareUrl);
        method = 'clipboard';
      }
    } else {
      await copyToClipboard(shareUrl);
      method = 'clipboard';
    }

    if (isFirstShare) {
      this.markUserShared(params.targetId, params.targetType, params.userId);
    }

    return { shared: true, success: true, method, firstShare: isFirstShare, isFirstShare };
  }
}

export const socialService = new SocialService();
