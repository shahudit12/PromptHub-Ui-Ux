/**
 * src/services/followService.ts
 * Standalone Social Follow & Relationship Engine for PromptHub Frontend
 */

import type { BadgeType } from '../db/schema';

export interface FollowerProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  bio: string;
  role?: string;
  badges?: BadgeType[];
  isFollowing: boolean;
  followsViewer: boolean;
  followedAt?: string;
  followersCount?: number;
  followingCount?: number;
  promptCount?: number;
}

export interface CreatorPublicProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  bio: string;
  role: string;
  badges: BadgeType[];
  followersCount: number;
  followingCount: number;
  promptCount: number;
  totalViews: number;
  totalLikes: number;
  isFollowing: boolean;
  followsViewer: boolean;
  joinDate: string;
  socialLinks?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    website?: string;
  };
}

export const DEFAULT_COMMUNITY_CREATORS: FollowerProfile[] = [
  {
    id: 'creator-alex-chen',
    name: 'Alex Chen',
    username: 'alexc_ai',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    bio: 'Staff AI Prompt Engineer @ Antigravity. Architect of full-stack LLM pipelines & CO-STAR.',
    role: 'Creator',
    badges: ['top_creator', 'early_pioneer'],
    isFollowing: true,
    followsViewer: true,
    followersCount: 1420,
    followingCount: 312,
    promptCount: 28,
  },
  {
    id: 'creator-sarah-jenkins',
    name: 'Sarah Jenkins',
    username: 'sarah_promptsmith',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    bio: 'Product Designer & Prompt Crafter. Building UX heuristics & clean editorial interfaces.',
    role: 'Creator',
    badges: ['prompt_master', 'pro_member'],
    isFollowing: true,
    followsViewer: false,
    followersCount: 890,
    followingCount: 140,
    promptCount: 19,
  },
  {
    id: 'creator-marcus-vance',
    name: 'Marcus Vance',
    username: 'marcus_v',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    bio: 'Autonomous Agent Specialist & LangChain core contributor. System prompts enthusiast.',
    role: 'Creator',
    badges: ['top_creator'],
    isFollowing: false,
    followsViewer: false,
    followersCount: 2310,
    followingCount: 420,
    promptCount: 42,
  },
  {
    id: 'creator-elena-rostova',
    name: 'Elena Rostova',
    username: 'elena_ai',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    bio: 'Computational Linguist & Prompt Security Researcher. Red-teaming & injection defense.',
    role: 'Creator',
    badges: ['top_creator'],
    isFollowing: false,
    followsViewer: true,
    followersCount: 1105,
    followingCount: 205,
    promptCount: 15,
  },
];

export const followService = {
  getCachedProfile(userId: string): CreatorPublicProfile | null {
    try {
      const raw = localStorage.getItem(`ph_creator_profile_${userId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setCachedProfile(profile: CreatorPublicProfile): void {
    try {
      localStorage.setItem(`ph_creator_profile_${profile.id}`, JSON.stringify(profile));
    } catch {}
  },

  async toggleFollow(
    targetUserId: string,
    currentUserId: string
  ): Promise<{ isFollowing: boolean; error?: string }> {
    if (!targetUserId || !currentUserId) {
      return { isFollowing: false, error: 'Invalid user IDs provided.' };
    }

    if (targetUserId === currentUserId) {
      return { isFollowing: false, error: 'You cannot follow yourself.' };
    }

    const key = `prompthub_following_${currentUserId}`;
    let following: string[] = [];
    try {
      const stored = localStorage.getItem(key);
      if (stored) following = JSON.parse(stored);
    } catch {}

    const isFollowing = following.includes(targetUserId);
    const updated = isFollowing
      ? following.filter((id) => id !== targetUserId)
      : [...following, targetUserId];

    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {}

    if (typeof window !== 'undefined') {
      const detail = { followerId: currentUserId, targetUserId, isFollowing: !isFollowing };
      window.dispatchEvent(new CustomEvent('prompthub:follow-updated', { detail }));
      window.dispatchEvent(new CustomEvent('ph_follow_changed', { detail }));
    }

    return { isFollowing: !isFollowing };
  },

  async fetchFollowers(userId: string, viewerId?: string): Promise<FollowerProfile[]> {
    return DEFAULT_COMMUNITY_CREATORS.filter((c) => c.id !== userId);
  },

  async fetchCreatorProfile(userId: string, viewerId?: string): Promise<CreatorPublicProfile | null> {
    return this.fetchCreatorPublicProfile(userId, viewerId);
  },

  async fetchUserFollowingIds(userId: string): Promise<string[]> {
    try {
      const stored = localStorage.getItem(`prompthub_following_${userId}`);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) return arr;
      }
    } catch {}
    return ['creator-alex-chen', 'creator-maya-lin'];
  },

  async fetchFollowing(userId: string, viewerId?: string): Promise<FollowerProfile[]> {
    let localFollowingIds: string[] = [];
    try {
      const stored = localStorage.getItem(`prompthub_following_${userId}`);
      if (stored) localFollowingIds = JSON.parse(stored);
    } catch {}

    if (localFollowingIds.length > 0) {
      return DEFAULT_COMMUNITY_CREATORS.filter((c) => localFollowingIds.includes(c.id));
    }
    return DEFAULT_COMMUNITY_CREATORS.slice(0, 2);
  },

  async fetchCreatorPublicProfile(
    userId: string,
    viewerId?: string
  ): Promise<CreatorPublicProfile | null> {
    const cached = this.getCachedProfile(userId);
    if (cached) return cached;

    const mock = DEFAULT_COMMUNITY_CREATORS.find((c) => c.id === userId);
    if (mock) {
      const profile: CreatorPublicProfile = {
        id: mock.id,
        name: mock.name,
        username: mock.username,
        avatarUrl: mock.avatarUrl,
        bio: mock.bio,
        role: mock.role || 'Creator',
        badges: mock.badges || ['top_creator'],
        followersCount: mock.followersCount || 120,
        followingCount: mock.followingCount || 45,
        promptCount: mock.promptCount || 8,
        totalViews: 4500,
        totalLikes: 380,
        isFollowing: mock.isFollowing,
        followsViewer: mock.followsViewer,
        joinDate: '2024-01-15T00:00:00.000Z',
        socialLinks: {
          twitter: `https://twitter.com/${mock.username}`,
          github: `https://github.com/${mock.username}`,
        },
      };
      this.setCachedProfile(profile);
      return profile;
    }

    return null;
  },

  async getFollowCounts(userId: string): Promise<{ followersCount: number; followingCount: number }> {
    let followingCount = 2;
    try {
      const stored = localStorage.getItem(`prompthub_following_${userId}`);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) followingCount = arr.length;
      }
    } catch {}

    return {
      followersCount: 1420,
      followingCount,
    };
  },

  async isFollowingUser(followerId: string, targetUserId: string): Promise<boolean> {
    try {
      const stored = localStorage.getItem(`prompthub_following_${followerId}`);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) return arr.includes(targetUserId);
      }
    } catch {}
    return false;
  },
};
