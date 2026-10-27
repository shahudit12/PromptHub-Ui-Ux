import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Heart,
  GitBranch,
  Terminal,
  Loader2,
  Copy,
  Check,
  Share2,
  Globe,
  Search,
  Play,
  BookOpen,
  Star,
  Flag,
  Users,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { followService, type CreatorPublicProfile } from '../services/followService';
import { FollowButton } from './FollowButton';
import { FollowersModal } from './FollowersModal';
import { CommunityBadges } from './CommunityBadges';
import { resolveUserBadges } from '../services/badgeService';
import { useApp } from '../context/AppContext';
import { ReportUserModal } from './ReportUserModal';
import type { Prompt } from '../db/schema';
import { PromptRepository } from '../repositories/promptRepository';

export interface CreatorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
}

// Helper to extract YYYY-MM-DD safely across local timezones
const toDateKey = (dateInput: string | Date | number): string => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Authoritative Developer Contribution Calendar Component for PromptHub
const modalProfileCache = new Map<string, CreatorPublicProfile>();

const getInitialProfile = (
  id: string,
  currentUser: any,
  prompts: Prompt[]
): CreatorPublicProfile | null => {
  if (!id) return null;
  const cached = modalProfileCache.get(id) || followService.getCachedProfile(id);
  if (cached) return cached;

  if (currentUser?.id === id) {
    const authorPrompts = prompts.filter(p => p.authorId === id);
    const badges = resolveUserBadges({
      user: {
        id: currentUser.id,
        joinDate: currentUser.joinDate || new Date().toISOString(),
        badges: currentUser.badges || [],
        role: currentUser.role || 'User',
      } as any,
      prompts,
    });
    const synth: CreatorPublicProfile = {
      id: currentUser.id,
      name: currentUser.name || 'Developer',
      username: currentUser.username || 'developer',
      avatarUrl: currentUser.avatarUrl || '',
      bio: currentUser.bio || '',
      role: currentUser.role || 'Creator',
      badges,
      followersCount: currentUser.followersCount || 0,
      followingCount: currentUser.followingCount || currentUser.following?.length || 0,
      promptCount: authorPrompts.length,
      totalViews: authorPrompts.reduce((sum, p) => sum + (p.viewsCount || 0), 0),
      totalLikes: authorPrompts.reduce((sum, p) => sum + (p.likesCount || 0), 0),
      isFollowing: false,
      followsViewer: false,
      joinDate: currentUser.joinDate || new Date().toISOString(),
      socialLinks: currentUser.socialLinks || {},
    };
    modalProfileCache.set(id, synth);
    return synth;
  }

  // Look in known prompts
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const authorPrompts = prompts.filter((p) =>
    isUuid
      ? p.authorId === id
      : (p.authorName || '').toLowerCase().replace(/\s+/g, '_') === id.toLowerCase() ||
        p.authorId === id
  );
  const first = authorPrompts[0];
  if (first) {
    const badges = resolveUserBadges({
      user: {
        id: first.authorId || id,
        joinDate: first.createdAt || new Date().toISOString(),
        badges: [],
        role: 'Creator',
      } as any,
      prompts,
    });
    const synth: CreatorPublicProfile = {
      id: first.authorId || id,
      name: first.authorName || 'Creator',
      username: (first.authorName || 'creator').toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
      avatarUrl: first.authorAvatar || '',
      bio: '',
      role: 'Creator',
      badges,
      followersCount: 0,
      followingCount: 0,
      promptCount: authorPrompts.length,
      totalViews: authorPrompts.reduce((sum, p) => sum + (p.viewsCount || 0), 0),
      totalLikes: authorPrompts.reduce((sum, p) => sum + (p.likesCount || 0), 0),
      isFollowing: Boolean(currentUser?.following?.includes(first.authorId || id)),
      followsViewer: false,
      joinDate: first.createdAt || new Date().toISOString(),
    };
    modalProfileCache.set(id, synth);
    return synth;
  }
  return null;
};

const ContributionHeatmap: React.FC<{ authorPrompts: Prompt[] }> = ({
  authorPrompts,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    displayDate: string;
    count: number;
  } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate 52 weeks (~1 full year) of contribution grid
  const { weeks, monthLabels, totalContributions } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Map prompt creation and update timestamps to YYYY-MM-DD
    const dateCounts = new Map<string, number>();
    for (const p of authorPrompts) {
      const createdRaw = (p as any).created_at || p.createdAt;
      const updatedRaw = (p as any).updated_at || p.updatedAt;

      if (createdRaw) {
        const d = toDateKey(createdRaw);
        if (d) {
          dateCounts.set(d, (dateCounts.get(d) || 0) + 1);
        }
      }
      if (updatedRaw && createdRaw && toDateKey(updatedRaw) !== toDateKey(createdRaw)) {
        const ud = toDateKey(updatedRaw);
        if (ud) {
          dateCounts.set(ud, (dateCounts.get(ud) || 0) + 1);
        }
      }
    }

    // Safety fallback: If prompts exist but dates failed to parse, seed today's key
    if (dateCounts.size === 0 && authorPrompts.length > 0) {
      const todayKey = toDateKey(today);
      dateCounts.set(todayKey, authorPrompts.length);
    }

    const totalWeeks = 52;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (totalWeeks * 7 - 1));
    // Align to Sunday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);
    startDate.setHours(0, 0, 0, 0);

    const result: { date: string; displayDate: string; count: number; level: number }[][] = [];
    let curr = new Date(startDate);
    const months: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    let totalCount = 0;

    for (let w = 0; w < totalWeeks; w++) {
      const week: { date: string; displayDate: string; count: number; level: number }[] = [];
      const firstDayOfWeek = new Date(curr);
      const m = firstDayOfWeek.getMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        const prevM = months[months.length - 1];
        if (!prevM || w - prevM.weekIndex >= 3) {
          months.push({
            month: firstDayOfWeek.toLocaleDateString('en-US', { month: 'short' }),
            weekIndex: w,
          });
        }
      }

      for (let d = 0; d < 7; d++) {
        const dateStr = toDateKey(curr);
        const count = dateCounts.get(dateStr) || 0;
        totalCount += count;
        const displayDate = curr.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        // 5 calibrated intensity levels with high-contrast visible colors
        let level = 0;
        if (count >= 4) level = 4;
        else if (count >= 3) level = 3;
        else if (count >= 2) level = 2;
        else if (count >= 1) level = 1;

        week.push({
          date: dateStr,
          displayDate,
          count,
          level,
        });

        curr.setDate(curr.getDate() + 1);
      }
      result.push(week);
    }

    return {
      weeks: result,
      monthLabels: months,
      totalContributions: totalCount,
    };
  }, [authorPrompts]);

  // Auto-scroll to the current week (far right edge) so recent contributions are immediately visible!
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [weeks]);

  return (
    <div className="flex flex-col gap-2.5 pt-1">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-text-primary flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
          <span>Prompt Activity Calendar</span>
        </h3>
        <span className="text-xs font-mono font-bold text-text-primary">
          {totalContributions} {totalContributions === 1 ? 'contribution' : 'contributions'} in the last year
        </span>
      </div>

      {/* Activity Card */}
      <div className="bg-bg-secondary border border-border-default rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
        {/* Scrollable Grid Container */}
        <div ref={scrollContainerRef} className="overflow-x-auto custom-scrollbar pb-1">
          <div className="min-w-[720px] select-none">
            {/* Month Headers */}
            <div className="relative h-4 mb-1 pl-8 text-[10px] font-mono text-text-muted">
              {monthLabels.map((m, idx) => (
                <span
                  key={idx}
                  className="absolute"
                  style={{ left: `calc(2rem + ${m.weekIndex * 13}px)` }}
                >
                  {m.month}
                </span>
              ))}
            </div>

            {/* Calendar Body: Day Labels + 52 Week Columns */}
            <div className="flex gap-2">
              {/* Day Labels Column */}
              <div className="flex flex-col justify-between py-[1px] w-6 shrink-0 text-[9px] font-mono text-text-muted select-none">
                <span className="h-[10px] leading-[10px]"></span>
                <span className="h-[10px] leading-[10px]">Mon</span>
                <span className="h-[10px] leading-[10px]"></span>
                <span className="h-[10px] leading-[10px]">Wed</span>
                <span className="h-[10px] leading-[10px]"></span>
                <span className="h-[10px] leading-[10px]">Fri</span>
                <span className="h-[10px] leading-[10px]"></span>
              </div>

              {/* 52 Columns */}
              <div className="flex gap-[3px]">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-[3px]">
                    {week.map((day, dIdx) => {
                      const bgClass =
                        day.level === 4
                          ? 'bg-[#216e39] dark:bg-[#39d353] border-[#216e39]/80 dark:border-[#56d364]'
                          : day.level === 3
                          ? 'bg-[#30a14e] dark:bg-[#2ea043] border-[#30a14e]/80 dark:border-[#3fb950]'
                          : day.level === 2
                          ? 'bg-[#40c463] dark:bg-[#238636] border-[#40c463]/80 dark:border-[#2ea043]'
                          : day.level === 1
                          ? 'bg-[#9be9a8] dark:bg-[#196127] border-[#9be9a8]/80 dark:border-[#238636]'
                          : 'bg-[#ebedf0] dark:bg-[#161b22] border-[#ebedf0]/80 dark:border-[#21262d]';

                      return (
                        <div
                          key={dIdx}
                          onMouseEnter={() =>
                            setHoveredCell({
                              date: day.date,
                              displayDate: day.displayDate,
                              count: day.count,
                            })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() =>
                            setHoveredCell({
                              date: day.date,
                              displayDate: day.displayDate,
                              count: day.count,
                            })
                          }
                          title={`${day.count} ${day.count === 1 ? 'contribution' : 'contributions'} on ${day.displayDate}`}
                          className={`w-2.5 h-2.5 rounded-[2px] border transition-transform hover:scale-125 cursor-pointer ${bgClass}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Hover Status + Emerald Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border-subtle/60 text-[11px] font-mono">
          <div className="h-4 text-text-muted flex items-center">
            {hoveredCell ? (
              <span>
                <strong className="text-text-primary">
                  {hoveredCell.count === 0
                    ? 'No contributions'
                    : `${hoveredCell.count} ${hoveredCell.count === 1 ? 'contribution' : 'contributions'}`}
                </strong>{' '}
                on {hoveredCell.displayDate}
              </span>
            ) : (
              <span>Hover over squares to view prompt activity &amp; releases.</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-text-muted self-end sm:self-auto">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#ebedf0] dark:bg-[#161b22] border border-[#ebedf0]/80 dark:border-[#21262d]" title="0 contributions" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#9be9a8] dark:bg-[#196127] border border-[#9be9a8]/80 dark:border-[#238636]" title="1 contribution" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#40c463] dark:bg-[#238636] border border-[#40c463]/80 dark:border-[#2ea043]" title="2 contributions" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#30a14e] dark:bg-[#2ea043] border border-[#30a14e]/80 dark:border-[#3fb950]" title="3 contributions" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#216e39] dark:bg-[#39d353] border border-[#216e39]/80 dark:border-[#56d364]" title="4+ contributions" />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CreatorProfileModal: React.FC<CreatorProfileModalProps> = ({
  isOpen,
  onClose,
  creatorId,
}) => {
  const { user: currentUser, prompts, likedPromptIds, toggleLikePrompt, setActivePromptId, setActiveTab, setShowAuthModal, showToast } = useApp();
  const [profile, setProfile] = useState<CreatorPublicProfile | null>(null);
  const [fetchedCreatorPrompts, setFetchedCreatorPrompts] = useState<Prompt[]>([]);
  const [starredPrompts, setStarredPrompts] = useState<Prompt[]>([]);
  const [creatorLikedPromptIds, setCreatorLikedPromptIds] = useState<string[]>([]);
  const [starredSubTab, setStarredSubTab] = useState<'starred' | 'received'>('starred');
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'prompts' | 'starred'>('overview');
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following' | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [promptSearchQuery, setPromptSearchQuery] = useState('');

  // Dynamically resolve badges strictly earned by this creator
  const resolvedCreatorBadges = useMemo(() => {
    if (!profile) return [];
    return resolveUserBadges({
      user: {
        id: profile.id,
        joinDate: profile.joinDate,
        badges: profile.badges || [],
        role: (profile.role as any) || 'User',
      } as any,
      prompts,
    });
  }, [profile, prompts]);

  // Load creator profile, authentic prompts, and user likes from repository with 0ms instant hydration
  useEffect(() => {
    if (!isOpen || !creatorId) return;

    // Fast synchronous instant hydration: 0ms delay, no spinner
    const initial = getInitialProfile(creatorId, currentUser, prompts);
    if (initial) {
      setProfile(initial);
      setLoading(false);
    } else {
      setLoading(true);
    }

    let isMounted = true;

    // Fetch authentic public prompts authored by this creator
    PromptRepository.getPublicPromptsByCreator(creatorId)
      .then((promptsData) => {
        if (isMounted) {
          setFetchedCreatorPrompts(promptsData);
        }
      })
      .catch((err) => {
        console.warn('[CreatorProfileModal] getPublicPromptsByCreator error:', err);
      });

    // Resolve creator's liked prompt IDs
    if (currentUser?.id === creatorId) {
      setCreatorLikedPromptIds(likedPromptIds || []);
    } else {
      PromptRepository.getUserLikes(creatorId)
        .then((likes) => {
          if (isMounted) setCreatorLikedPromptIds(likes || []);
        })
        .catch(() => {});
    }

    // Background revalidation (SWR) for latest follower counts & server stats
    followService.fetchCreatorProfile(creatorId, currentUser?.id)
      .then((data) => {
        if (isMounted && data) {
          modalProfileCache.set(creatorId, data);
          setProfile((prev) => ({
            ...data,
            // Preserve optimistic follow state if actively toggled
            isFollowing: prev && prev.id === data.id ? prev.isFollowing : data.isFollowing,
            followersCount:
              prev && prev.id === data.id && typeof prev.followersCount === 'number'
                ? prev.followersCount
                : data.followersCount,
          }));
        } else if (isMounted && !initial) {
          // Fallback creation from available prompts
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(creatorId);
          const authorPrompts = prompts.filter((p) =>
            isUuid
              ? p.authorId === creatorId
              : (p.authorName || '').toLowerCase().replace(/\s+/g, '_') === creatorId.toLowerCase() ||
                p.authorId === creatorId
          );
          const first = authorPrompts[0];
          if (first) {
            const fallbackBadges = resolveUserBadges({
              user: {
                id: first.authorId || creatorId,
                joinDate: first.createdAt || new Date().toISOString(),
                badges: [],
                role: 'User',
              } as any,
              prompts,
            });
            const fallbackProfile: CreatorPublicProfile = {
              id: first.authorId || creatorId,
              name: first.authorName || 'Creator',
              username: (first.authorName || 'creator').toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
              avatarUrl: first.authorAvatar || '',
              bio: '',
              role: 'Creator',
              badges: fallbackBadges,
              followersCount: 0,
              followingCount: 0,
              promptCount: authorPrompts.length,
              totalViews: authorPrompts.reduce((sum, p) => sum + (p.viewsCount || 0), 0),
              totalLikes: authorPrompts.reduce((sum, p) => sum + (p.likesCount || 0), 0),
              isFollowing: Boolean(currentUser?.following?.includes(first.authorId || creatorId)),
              followsViewer: false,
              joinDate: first.createdAt || new Date().toISOString(),
            };
            modalProfileCache.set(creatorId, fallbackProfile);
            setProfile(fallbackProfile);
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, creatorId, currentUser?.id, prompts, likedPromptIds]);

  // Real-time synchronization of follow and follower events across all components
  useEffect(() => {
    const handleFollowUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { followerId, targetUserId, isFollowing } = detail;

      setProfile((prev) => {
        if (!prev) return null;
        let next = { ...prev };
        let changed = false;

        // If this creator profile is the target being followed / unfollowed
        if (prev.id === targetUserId) {
          const delta = isFollowing ? 1 : -1;
          const nextCount = Math.max(0, (prev.followersCount || 0) + delta);
          next = {
            ...next,
            followersCount: nextCount,
            isFollowing: followerId === currentUser?.id ? isFollowing : prev.isFollowing,
          };
          changed = true;
        }

        // If this creator profile is the user doing the following
        if (prev.id === followerId) {
          const delta = isFollowing ? 1 : -1;
          const nextCount = Math.max(0, (prev.followingCount || 0) + delta);
          next = {
            ...next,
            followingCount: nextCount,
          };
          changed = true;
        }

        if (changed) {
          modalProfileCache.set(prev.id, next);
          return next;
        }
        return prev;
      });
    };

    window.addEventListener('prompthub:follow-updated', handleFollowUpdated);
    window.addEventListener('ph_follow_changed', handleFollowUpdated);
    return () => {
      window.removeEventListener('prompthub:follow-updated', handleFollowUpdated);
      window.removeEventListener('ph_follow_changed', handleFollowUpdated);
    };
  }, [currentUser?.id]);

  const targetId = profile?.id || creatorId;
  const isOwner = Boolean(currentUser?.id && targetId === currentUser.id);
  const creatorPrompts = useMemo(() => {
    const combined = [...fetchedCreatorPrompts];
    const seen = new Set(combined.map(p => p.id));
    for (const p of prompts) {
      if (
        (p.visibility === 'public' || isOwner) &&
        !seen.has(p.id) &&
        (p.authorId === targetId ||
          (profile?.username && (p.authorName || '').toLowerCase().replace(/\s+/g, '_') === profile.username.toLowerCase()) ||
          (profile?.name && (p.authorName || '').toLowerCase() === profile.name.toLowerCase()))
      ) {
        combined.push(p);
        seen.add(p.id);
      }
    }
    return combined;
  }, [fetchedCreatorPrompts, prompts, targetId, profile?.username, profile?.name, isOwner]);

  // Resolve starred prompts whenever creatorLikedPromptIds or prompts change
  useEffect(() => {
    let isMounted = true;
    const ids = targetId === currentUser?.id ? (likedPromptIds || []) : creatorLikedPromptIds;
    if (ids.length === 0) {
      setStarredPrompts([]);
      return;
    }

    // 1. Resolve from current prompts in memory
    const resolvedFromMemory = prompts.filter(p => ids.includes(p.id));
    const missingIds = ids.filter(id => !prompts.some(p => p.id === id));

    if (missingIds.length > 0) {
      PromptRepository.getPromptsByIds(missingIds).then((fetchedMissing) => {
        if (!isMounted) return;
        const allStarred = [...resolvedFromMemory, ...fetchedMissing];
        const unique = Array.from(new Map(allStarred.map(p => [p.id, p])).values());
        setStarredPrompts(unique);
      }).catch(() => {
        if (isMounted) setStarredPrompts(resolvedFromMemory);
      });
    } else {
      setStarredPrompts(resolvedFromMemory);
    }

    return () => { isMounted = false; };
  }, [creatorLikedPromptIds, likedPromptIds, targetId, currentUser?.id, prompts]);

  // Real-time synchronization of like and star events
  useEffect(() => {
    const handleLikeChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { promptId, isLiked, likesCount, delta, userId } = detail;

      if (targetId === currentUser?.id || (userId && userId === targetId)) {
        setCreatorLikedPromptIds(prev => {
          if (isLiked && !prev.includes(promptId)) return [promptId, ...prev];
          if (!isLiked && prev.includes(promptId)) return prev.filter(id => id !== promptId);
          return prev;
        });
      }

      setFetchedCreatorPrompts(prev => prev.map(p => {
        if (p.id !== promptId) return p;
        const updatedCount = typeof likesCount === 'number'
          ? likesCount
          : Math.max(0, (p.likesCount || 0) + (delta ?? (isLiked ? 1 : -1)));
        return { ...p, likesCount: updatedCount };
      }));

      setStarredPrompts(prev => {
        if (isLiked === false && targetId === currentUser?.id) {
          return prev.filter(p => p.id !== promptId);
        }
        return prev.map(p => {
          if (p.id !== promptId) return p;
          const updatedCount = typeof likesCount === 'number'
            ? likesCount
            : Math.max(0, (p.likesCount || 0) + (delta ?? (isLiked ? 1 : -1)));
          return { ...p, likesCount: updatedCount };
        });
      });
    };

    window.addEventListener('ph_prompt_like_changed', handleLikeChanged);
    return () => window.removeEventListener('ph_prompt_like_changed', handleLikeChanged);
  }, [targetId, currentUser?.id]);

  const totalReceivedLikes = useMemo(() => {
    return Math.max(
      profile?.totalLikes || 0,
      creatorPrompts.reduce((sum, p) => sum + (p.likesCount || 0), 0)
    );
  }, [profile?.totalLikes, creatorPrompts]);

  const totalStarredCount = useMemo(() => {
    const ids = targetId === currentUser?.id ? (likedPromptIds || []) : creatorLikedPromptIds;
    return Math.max(ids.length, starredPrompts.length);
  }, [targetId, currentUser?.id, likedPromptIds, creatorLikedPromptIds, starredPrompts.length]);

  if (!isOpen) return null;

  // Pinned prompts: top 2-3 most liked/viewed
  const pinnedPrompts = [...creatorPrompts]
    .sort((a, b) => ((b.likesCount || 0) + (b.viewsCount || 0)) - ((a.likesCount || 0) + (a.viewsCount || 0)))
    .slice(0, 3);

  const filteredPrompts = creatorPrompts.filter((p) => {
    if (!promptSearchQuery.trim()) return true;
    const q = promptSearchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (p.category || '').toLowerCase().includes(q)
    );
  });

  const rawUsername = profile?.username || (profile?.name || 'creator').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const publicProfileUrl = typeof window !== 'undefined' ? `${window.location.origin}/u/${encodeURIComponent(rawUsername)}` : `https://prompthub.cloud/u/${rawUsername}`;

  const handleCopyProfileUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicProfileUrl);
      setCopiedLink(true);
      showToast('Profile link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast(publicProfileUrl, 'info');
    }
  };

  const handleShareProfile = async () => {
    if (!profile) return;
    const shareTitle = `${profile.name} (@${profile.username}) on PromptHub`;
    const shareText = `Check out ${profile.name}'s AI prompts and templates on PromptHub:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: publicProfileUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    handleCopyProfileUrl();
  };

  const handleOpenPrompt = (prompt: Prompt) => {
    setActivePromptId(prompt.id);
    setActiveTab('workspace');
    onClose();
  };

  const handleCopyPromptContent = (prompt: Prompt, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      setShowAuthModal(true);
      showToast('Please sign in to copy prompts.', 'info');
      return;
    }
    const content = prompt.rawContent || '';
    if (content) {
      navigator.clipboard.writeText(content);
      setCopiedPromptId(prompt.id);
      showToast('Prompt copied to clipboard!', 'success');
      setTimeout(() => setCopiedPromptId(null), 2000);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <AnimatePresence>
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="creator-profile-heading"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl bg-bg-secondary border border-border-default rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-left font-sans text-text-primary"
          >
            {/* Top Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-default bg-bg-tertiary/70 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-brand-primary shrink-0 shadow-xs" />
                <span className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider truncate">
                  {profile ? `Developer Profile / ${profile.username}` : 'Creator Profile'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {profile && (
                  <button
                    type="button"
                    onClick={handleCopyProfileUrl}
                    className="min-h-[34px] px-2.5 rounded-lg hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-colors cursor-pointer text-xs font-mono flex items-center gap-1.5 border border-border-default"
                    title="Copy Profile URL"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline text-[11px]">{copiedLink ? 'Copied' : 'Copy URL'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg hover:bg-bg-secondary text-text-muted hover:text-text-primary transition-colors cursor-pointer border border-border-default"
                  aria-label="Close profile modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Two-Column Studio Layout */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-bg-primary custom-scrollbar">
              {loading || !profile ? (
                <div className="py-24 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-primary mx-auto" />
                  <p className="text-xs text-text-muted font-mono font-medium">Resolving creator profile...</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Left Column: Profile Card & Identity */}
                  <div className="w-full md:w-64 shrink-0 space-y-4">
                    {/* Avatar */}
                    <div className="relative inline-block">
                      <img
                        src={profile.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.username}`}
                        alt={profile.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-border-default shadow-md bg-bg-secondary"
                      />
                      <span
                        className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-brand-primary border-2 border-bg-secondary"
                        title="Active on PromptHub"
                      />
                    </div>

                    {/* Name, Username, Role */}
                    <div className="space-y-1">
                      <h2 id="creator-profile-heading" className="text-xl font-bold font-display text-text-primary tracking-tight leading-tight">
                        {profile.name}
                      </h2>
                      <p className="text-xs font-mono font-semibold text-text-muted">
                        @{profile.username}
                      </p>
                    </div>

                    {/* Bio */}
                    {profile.bio ? (
                      <p className="text-xs text-text-secondary leading-relaxed break-words break-all [overflow-wrap:anywhere]">
                        {profile.bio}
                      </p>
                    ) : null}

                    {/* Follow Action Button */}
                    {currentUser?.id !== profile.id ? (
                      <FollowButton
                        targetUserId={profile.id}
                        targetUserName={profile.username}
                        targetAvatarUrl={profile.avatarUrl}
                        size="md"
                        className="w-full min-h-[44px]"
                        followsYou={profile.followsViewer}
                        onFollowChange={(nextIsFollowing) => {
                          setProfile((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  isFollowing: nextIsFollowing,
                                  followersCount: nextIsFollowing
                                    ? prev.followersCount + 1
                                    : Math.max(prev.followersCount - 1, 0),
                                }
                              : null
                          );
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => {
                          onClose();
                          setActiveTab('settings');
                        }}
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-xs font-semibold text-text-primary transition-colors cursor-pointer"
                      >
                        Edit Profile
                      </button>
                    )}

                    {/* Followers & Following Counts */}
                    <div className="flex items-center gap-3 text-xs text-text-secondary pt-1">
                      <button
                        onClick={() => setFollowersModalTab('followers')}
                        className="flex items-center gap-1 hover:text-brand-primary transition-colors cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5 text-text-muted" />
                        <span className="font-bold font-mono text-text-primary">{profile.followersCount}</span>
                        <span className="text-text-muted">followers</span>
                      </button>
                      <span className="text-text-muted">·</span>
                      <button
                        onClick={() => setFollowersModalTab('following')}
                        className="hover:text-brand-primary transition-colors cursor-pointer"
                      >
                        <span className="font-bold font-mono text-text-primary">{profile.followingCount}</span>
                        <span className="text-text-muted ml-1">following</span>
                      </button>
                    </div>

                    {/* Metadata items */}
                    <div className="space-y-2 pt-2 border-t border-border-default text-xs text-text-secondary">
                      <div className="flex items-center gap-2 text-text-muted font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>Joined {new Date(profile.joinDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
                      </div>

                      {profile.socialLinks?.github && (
                        <a
                          href={profile.socialLinks.github.startsWith('http') ? profile.socialLinks.github : `https://github.com/${profile.socialLinks.github.replace(/^@/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-text-secondary hover:text-brand-primary transition-colors text-xs truncate"
                        >
                          <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                          </svg>
                          <span className="truncate">{profile.socialLinks.github.replace(/^https?:\/\/github.com\//, '@')}</span>
                        </a>
                      )}

                      {profile.socialLinks?.twitter && (
                        <a
                          href={profile.socialLinks.twitter.startsWith('http') ? profile.socialLinks.twitter : `https://twitter.com/${profile.socialLinks.twitter.replace(/^@/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-text-secondary hover:text-brand-primary transition-colors text-xs truncate"
                        >
                          <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          <span className="truncate">{profile.socialLinks.twitter.replace(/^https?:\/\/(twitter|x)\.com\//, '@')}</span>
                        </a>
                      )}

                      {profile.socialLinks?.website && (
                        <a
                          href={profile.socialLinks.website.startsWith('http') ? profile.socialLinks.website : `https://${profile.socialLinks.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-text-secondary hover:text-brand-primary transition-colors text-xs truncate"
                        >
                          <Globe className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{profile.socialLinks.website.replace(/^https?:\/\//, '')}</span>
                        </a>
                      )}
                    </div>

                    {/* Badges Section in Sidebar */}
                    {resolvedCreatorBadges.length > 0 && (
                      <div className="pt-2 border-t border-border-default space-y-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted block">
                          Achievements &amp; Badges
                        </span>
                        <CommunityBadges badges={resolvedCreatorBadges} size="sm" />
                      </div>
                    )}

                    {/* Secondary Actions: Copy Link, Share & Report User */}
                    <div className="pt-3 border-t border-border-default flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyProfileUrl}
                        className="flex-1 min-h-[44px] px-3 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-xs font-semibold text-text-primary transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        title="Copy profile link"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-brand-primary" />}
                        <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleShareProfile}
                        className="flex-1 min-h-[44px] px-3 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-xs font-semibold text-text-primary transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        title="Share profile link"
                      >
                        <Share2 className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Share</span>
                      </button>

                      {currentUser?.id !== profile.id && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentUser) {
                              setShowAuthModal(true);
                              showToast('Please sign in to report users.', 'info');
                              return;
                            }
                            setIsReportModalOpen(true);
                          }}
                          aria-label="Report this user"
                          title="Report user for policy violation"
                          className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-bg-secondary hover:bg-rose-500/10 border border-border-default hover:border-rose-500/30 text-text-muted hover:text-rose-500 transition-colors cursor-pointer flex items-center justify-center gap-1 text-xs shrink-0"
                        >
                          <Flag className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Report</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Profile Subtabs & Content */}
                  <div className="flex-1 min-w-0 space-y-5 w-full">
                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 border-b border-border-default pb-2 overflow-x-auto custom-scrollbar">
                      <button
                        type="button"
                        onClick={() => setActiveSubTab('overview')}
                        className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                          activeSubTab === 'overview'
                            ? 'bg-brand-primary text-white shadow-2xs'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Overview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSubTab('prompts')}
                        className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                          activeSubTab === 'prompts'
                            ? 'bg-brand-primary text-white shadow-2xs'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                        }`}
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Prompts</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-bg-tertiary text-text-secondary border border-border-default">
                          {creatorPrompts.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSubTab('starred')}
                        className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                          activeSubTab === 'starred'
                            ? 'bg-brand-primary text-white shadow-2xs'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500" />
                        <span>Stars &amp; Likes</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-bg-tertiary text-text-secondary border border-border-default">
                          {totalStarredCount > 0 ? totalStarredCount : totalReceivedLikes}
                        </span>
                      </button>
                    </div>

                    {/* Tab 1: Overview */}
                    {activeSubTab === 'overview' && (
                      <div className="flex flex-col gap-6">
                        {/* Pinned Prompts Section */}
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                              <Star className="w-3.5 h-3.5 text-amber-500" />
                              <span>Pinned Prompts</span>
                            </h3>
                            <button
                              onClick={() => setActiveSubTab('prompts')}
                              className="text-[11px] text-brand-primary hover:underline font-medium cursor-pointer"
                            >
                              View all ({creatorPrompts.length})
                            </button>
                          </div>

                          {pinnedPrompts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {pinnedPrompts.map((prompt) => (
                                <div
                                  key={prompt.id}
                                  onClick={() => handleOpenPrompt(prompt)}
                                  className="p-4 rounded-xl bg-bg-secondary border border-border-default hover:border-brand-primary/50 transition-all cursor-pointer group shadow-2xs flex flex-col justify-between"
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className="text-xs font-bold text-text-primary group-hover:text-brand-primary transition-colors line-clamp-1">
                                        {prompt.title}
                                      </h4>
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-bg-tertiary text-text-muted border border-border-subtle shrink-0">
                                        {prompt.category || 'General'}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                                      {prompt.description || 'Custom prompt engineering workflow optimized for production.'}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-border-subtle text-[11px] text-text-muted font-mono">
                                    <div className="flex items-center gap-3">
                                      <span className="flex items-center gap-1">
                                        <Heart className="w-3 h-3 text-rose-500" />
                                        <span>{prompt.likesCount || 0}</span>
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <GitBranch className="w-3 h-3 text-brand-primary" />
                                        <span>{prompt.forksCount || 0}</span>
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3 text-text-muted" />
                                        <span>{prompt.commentsCount || 0}</span>
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyPromptContent(prompt, e)}
                                      className="hover:text-text-primary transition-colors cursor-pointer p-1"
                                      title="Copy raw prompt instructions"
                                    >
                                      {copiedPromptId === prompt.id ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-6 rounded-xl bg-bg-secondary border border-border-default text-center text-xs text-text-muted">
                              No pinned prompts yet.
                            </div>
                          )}
                        </div>

                        {/* Contribution Activity Heatmap */}
                        <ContributionHeatmap
                          authorPrompts={creatorPrompts}
                        />
                      </div>
                    )}

                    {/* Tab 2: Prompts List */}
                    {activeSubTab === 'prompts' && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={promptSearchQuery}
                              onChange={(e) => setPromptSearchQuery(e.target.value)}
                              placeholder="Search prompts by title, tag..."
                              className="w-full bg-bg-secondary border border-border-default rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-text-primary font-mono focus:border-brand-primary focus:outline-none"
                            />
                          </div>
                          <span className="text-xs text-text-muted font-mono self-start sm:self-auto">
                            Showing {filteredPrompts.length} of {creatorPrompts.length} prompts
                          </span>
                        </div>

                        {filteredPrompts.length > 0 ? (
                          <div className="space-y-3">
                            {filteredPrompts.map((prompt) => (
                              <div
                                key={prompt.id}
                                onClick={() => handleOpenPrompt(prompt)}
                                className="p-4 rounded-xl bg-bg-secondary border border-border-default hover:border-brand-primary/50 transition-all cursor-pointer group shadow-2xs space-y-2.5"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h4 className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors">
                                      {prompt.title}
                                    </h4>
                                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                                      {prompt.description || 'Production prompt template with variables and guidance.'}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenPrompt(prompt);
                                    }}
                                    className="min-h-[44px] px-3 rounded-lg bg-bg-tertiary hover:bg-brand-primary hover:text-white border border-border-default text-xs font-semibold text-text-secondary transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                                  >
                                    <Play className="w-3 h-3" />
                                    <span>Run in IDE</span>
                                  </button>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle text-xs text-text-muted font-mono">
                                  <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1 text-rose-500">
                                      <Heart className="w-3 h-3" />
                                      <span>{prompt.likesCount || 0}</span>
                                    </span>
                                    <span className="flex items-center gap-1 text-brand-primary">
                                      <GitBranch className="w-3 h-3" />
                                      <span>{prompt.forksCount || 0}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3" />
                                      <span>{prompt.commentsCount || 0}</span>
                                    </span>
                                    <span>{prompt.copiesCount || 0} copies</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-bg-tertiary text-text-muted border border-border-subtle text-[10px]">
                                      {prompt.category || 'General'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyPromptContent(prompt, e)}
                                      className="hover:text-text-primary transition-colors cursor-pointer p-1"
                                      title="Copy prompt instructions"
                                    >
                                      {copiedPromptId === prompt.id ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 text-center bg-bg-secondary border border-border-default rounded-xl space-y-2">
                            <Terminal className="w-6 h-6 text-text-muted mx-auto" />
                            <h4 className="text-xs font-bold text-text-primary">No prompts match your search</h4>
                            <p className="text-[11px] text-text-secondary">
                              Try clearing filters or searching with different keywords.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 3: Starred / Liked */}
                    {activeSubTab === 'starred' && (
                      <div className="space-y-4">
                        {/* Sub-navigation: Starred Prompts vs Received Accolades */}
                        <div className="flex items-center gap-2 border-b border-border-default pb-2">
                          <button
                            type="button"
                            onClick={() => setStarredSubTab('starred')}
                            className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              starredSubTab === 'starred'
                                ? 'bg-bg-secondary text-brand-primary border border-border-default shadow-xs'
                                : 'text-text-muted hover:text-text-primary'
                            }`}
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>Starred Prompts</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-bg-tertiary text-text-secondary border border-border-subtle">
                              {totalStarredCount}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setStarredSubTab('received')}
                            className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              starredSubTab === 'received'
                                ? 'bg-bg-secondary text-brand-primary border border-border-default shadow-xs'
                                : 'text-text-muted hover:text-text-primary'
                            }`}
                          >
                            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                            <span>Received Accolades</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-bg-tertiary text-text-secondary border border-border-subtle">
                              {totalReceivedLikes}
                            </span>
                          </button>
                        </div>

                        {/* SUB-VIEW 1: Starred Prompts */}
                        {starredSubTab === 'starred' && (
                          <div className="space-y-3">
                            <div className="p-4 rounded-xl bg-bg-secondary border border-border-default flex items-center justify-between shadow-2xs">
                              <div className="flex items-center gap-2.5">
                                <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
                                <div>
                                  <h4 className="text-xs font-bold text-text-primary">
                                    Starred Prompt Templates
                                  </h4>
                                  <p className="text-[11px] text-text-muted">
                                    Favorite and endorsed prompts curated across PromptHub.
                                  </p>
                                </div>
                              </div>
                              <div className="text-lg font-black font-mono text-amber-500">
                                {totalStarredCount}
                              </div>
                            </div>

                            {starredPrompts.length > 0 ? (
                              <div className="space-y-3">
                                {starredPrompts.map((prompt) => (
                                  <div
                                    key={prompt.id}
                                    onClick={() => handleOpenPrompt(prompt)}
                                    className="p-4 rounded-xl bg-bg-secondary border border-border-default hover:border-brand-primary/50 transition-all cursor-pointer group shadow-2xs space-y-2.5"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors">
                                            {prompt.title}
                                          </h4>
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-bg-tertiary text-text-muted border border-border-subtle">
                                            {prompt.model || 'Universal'}
                                          </span>
                                        </div>
                                        <p className="text-xs text-text-secondary mt-1 leading-relaxed line-clamp-2">
                                          {prompt.description || 'Production prompt template with variables and guidance.'}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 self-center">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!currentUser) {
                                              setShowAuthModal(true);
                                              showToast('Please sign in to like prompts.', 'info');
                                              return;
                                            }
                                            if (prompt.authorId === currentUser.id) {
                                              showToast('This is your prompt. Authors cannot like their own prompts.', 'info');
                                              return;
                                            }
                                            toggleLikePrompt(prompt.id, prompt.authorId).catch(() => {});
                                          }}
                                          title={
                                            !currentUser
                                              ? 'Sign in to like prompt'
                                              : prompt.authorId === currentUser.id
                                              ? 'Authors cannot like their own prompts'
                                              : likedPromptIds.includes(prompt.id)
                                              ? 'Unlike prompt'
                                              : 'Like prompt'
                                          }
                                          className={`w-16 min-h-[44px] px-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-mono font-bold tabular-nums shrink-0 ${
                                            likedPromptIds.includes(prompt.id)
                                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20'
                                              : 'bg-bg-tertiary border-border-default text-text-muted hover:text-rose-500 hover:border-rose-500/30'
                                          }`}
                                        >
                                          <Heart className={`w-3.5 h-3.5 ${likedPromptIds.includes(prompt.id) ? 'fill-rose-500 text-rose-500' : 'text-current'}`} />
                                          <span>{prompt.likesCount || 0}</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenPrompt(prompt);
                                          }}
                                          className="w-16 min-h-[44px] px-2 rounded-lg bg-bg-tertiary hover:bg-brand-primary hover:text-white border border-border-default text-xs font-semibold text-text-secondary transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                                        >
                                          <Play className="w-3 h-3" />
                                          <span>Run</span>
                                        </button>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle text-xs text-text-muted font-mono">
                                      <div className="flex items-center gap-3">
                                        <span>by {prompt.authorName || 'PromptHub Creator'}</span>
                                        <span>•</span>
                                        <span>{prompt.forksCount || 0} forks</span>
                                        <span>•</span>
                                        <span>{prompt.copiesCount || 0} copies</span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-bg-tertiary text-text-muted border border-border-subtle text-[10px]">
                                          {prompt.category || 'General'}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => handleCopyPromptContent(prompt, e)}
                                          className="min-h-[44px] min-w-[44px] hover:text-text-primary transition-colors cursor-pointer p-1 flex items-center justify-center"
                                          title="Copy prompt instructions"
                                        >
                                          {copiedPromptId === prompt.id ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-12 text-center bg-bg-secondary border border-dashed border-border-default rounded-xl space-y-3 p-6">
                                <Star className="w-8 h-8 text-amber-500/60 mx-auto" />
                                <div className="space-y-1">
                                  <h4 className="text-xs font-bold text-text-primary">No starred prompts yet</h4>
                                  <p className="text-[11px] text-text-secondary max-w-sm mx-auto">
                                    Click the Heart or Star icon on any prompt across PromptHub to save it to your personal favorites.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    setActiveTab('community');
                                  }}
                                  className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                  <span>Browse Community Prompts</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* SUB-VIEW 2: Received Accolades */}
                        {starredSubTab === 'received' && (
                          <div className="space-y-3">
                            <div className="p-4 rounded-xl bg-bg-secondary border border-border-default flex items-center justify-between shadow-2xs">
                              <div className="flex items-center gap-2.5">
                                <Heart className="w-5 h-5 text-rose-500 fill-rose-500 shrink-0" />
                                <div>
                                  <h4 className="text-xs font-bold text-text-primary">
                                    Community Accolades &amp; Endorsements
                                  </h4>
                                  <p className="text-[11px] text-text-muted">
                                    Total likes and stars received on prompts authored by this creator.
                                  </p>
                                </div>
                              </div>
                              <div className="text-lg font-black font-mono text-rose-500">
                                {totalReceivedLikes}
                              </div>
                            </div>

                            {creatorPrompts.filter(p => (p.likesCount || 0) > 0).length > 0 ? (
                              <div className="space-y-3">
                                {creatorPrompts
                                  .filter(p => (p.likesCount || 0) > 0)
                                  .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
                                  .map((prompt) => (
                                    <div
                                      key={prompt.id}
                                      onClick={() => handleOpenPrompt(prompt)}
                                      className="p-4 rounded-xl bg-bg-secondary border border-border-default hover:border-brand-primary/50 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs"
                                    >
                                      <div className="space-y-1 min-w-0">
                                        <h4 className="text-xs font-bold text-text-primary truncate">
                                          {prompt.title}
                                        </h4>
                                        <p className="text-[11px] text-text-secondary line-clamp-1">
                                          {prompt.description || 'Production prompt template.'}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-xs font-mono text-rose-500 font-bold shrink-0">
                                        <Heart className="w-3.5 h-3.5 fill-rose-500" />
                                        <span>{prompt.likesCount || 0}</span>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="py-12 text-center bg-bg-secondary border border-dashed border-border-default rounded-xl space-y-3 p-6">
                                <Heart className="w-8 h-8 text-rose-500/50 mx-auto" />
                                <div className="space-y-1">
                                  <h4 className="text-xs font-bold text-text-primary">No accolades received yet</h4>
                                  <p className="text-[11px] text-text-secondary max-w-sm mx-auto">
                                    When community members like your published prompt templates, their endorsements will appear here.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    setActiveTab('create-prompt');
                                  }}
                                  className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                                >
                                  <Terminal className="w-3.5 h-3.5" />
                                  <span>Publish a Prompt</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Followers & Following Modal */}
      {followersModalTab && profile && (
        <FollowersModal
          isOpen={Boolean(followersModalTab)}
          onClose={() => setFollowersModalTab(null)}
          userId={profile.id}
          userName={profile.name}
          initialTab={followersModalTab}
        />
      )}

      {/* Report User Modal */}
      {isReportModalOpen && profile && (
        <ReportUserModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          reportedUserId={profile.id}
          reportedUserName={profile.name}
          reportedUserUsername={profile.username}
          reportedUserAvatar={profile.avatarUrl}
        />
      )}
    </>,
    document.body
  );
};
