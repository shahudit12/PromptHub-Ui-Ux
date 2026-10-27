import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Users, UserCheck, Loader2 } from 'lucide-react';
import { followService, type FollowerProfile } from '../services/followService';
import { FollowButton } from './FollowButton';
import { CommunityBadges } from './CommunityBadges';
import { useApp } from '../context/AppContext';

export interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  initialTab?: 'followers' | 'following';
  onSelectCreator?: (creatorId: string) => void;
}

export const FollowersModal: React.FC<FollowersModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName = 'User',
  initialTab = 'followers',
  onSelectCreator,
}) => {
  const { user: currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [followers, setFollowers] = useState<FollowerProfile[]>([]);
  const [following, setFollowing] = useState<FollowerProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync tab when initialTab changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Load followers and following whenever modal opens or userId changes
  useEffect(() => {
    if (!isOpen || !userId) return;

    let isMounted = true;
    setLoading(true);

    Promise.all([
      followService.fetchFollowers(userId, currentUser?.id),
      followService.fetchFollowing(userId, currentUser?.id),
    ])
      .then(([followersData, followingData]) => {
        if (isMounted) {
          setFollowers(followersData);
          setFollowing(followingData);
        }
      })
      .catch((err) => {
        console.warn('[FollowersModal] Error fetching social list:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId, currentUser?.id]);

  // Filter list based on search query
  const currentList = activeTab === 'followers' ? followers : following;
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentList;
    return currentList.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        item.bio?.toLowerCase().includes(q)
    );
  }, [currentList, searchQuery]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-bg-elevated border border-border-default rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden text-left font-sans text-text-primary"
        >
          {/* Header & Tabs */}
          <div className="border-b border-border-default p-4 pb-0 bg-bg-secondary">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">
                  @{userName}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[32px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-border-default">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('followers');
                  setSearchQuery('');
                }}
                className={`flex-1 pb-2.5 text-xs font-bold transition-all cursor-pointer relative ${
                  activeTab === 'followers'
                    ? 'text-brand-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Followers ({followers.length})</span>
                </span>
                {activeTab === 'followers' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('following');
                  setSearchQuery('');
                }}
                className={`flex-1 pb-2.5 text-xs font-bold transition-all cursor-pointer relative ${
                  activeTab === 'following'
                    ? 'text-brand-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Following ({following.length})</span>
                </span>
                {activeTab === 'following' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-border-default bg-bg-secondary/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-8 pr-8 py-1.5 bg-bg-primary border border-border-default rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary min-h-[36px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Content List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-border-subtle bg-bg-elevated">
            {loading ? (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-brand-primary mx-auto" />
                <p className="text-xs text-text-muted font-medium">Loading {activeTab}...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Users className="w-8 h-8 text-text-muted mx-auto" />
                <p className="text-xs font-semibold text-text-primary">
                  {searchQuery ? 'No matching users found' : `No ${activeTab} yet`}
                </p>
                <p className="text-[11px] text-text-secondary max-w-xs mx-auto leading-relaxed">
                  {searchQuery
                    ? 'Try searching by a different name or @username.'
                    : activeTab === 'followers'
                    ? 'When other creators follow this profile, they will show up here.'
                    : 'Explore the community feed and leaderboards to discover top prompt engineers.'}
                </p>
              </div>
            ) : (
              filteredList.map((creator) => (
                <div
                  key={creator.id}
                  className="pt-2.5 pb-2.5 flex items-center justify-between gap-3 hover:bg-bg-secondary px-2 rounded-xl transition-colors"
                >
                  <div
                    onClick={() => {
                      if (onSelectCreator) {
                        onSelectCreator(creator.id);
                      }
                    }}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                  >
                    <img
                      src={creator.avatarUrl}
                      alt={creator.name}
                      className="w-10 h-10 rounded-xl object-cover border border-border-default shrink-0 group-hover:border-brand-primary transition-colors"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-text-primary truncate group-hover:text-brand-primary transition-colors">
                          {creator.name}
                        </span>
                        <CommunityBadges badges={creator.badges} size="xs" />
                      </div>
                      <div className="text-[11px] text-text-muted font-mono truncate">
                        @{creator.username}
                      </div>
                      {creator.bio && (
                        <p className="text-[11px] text-text-secondary line-clamp-1 mt-0.5 break-words break-all [overflow-wrap:anywhere]">
                          {creator.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Follow Button */}
                  <FollowButton
                    targetUserId={creator.id}
                    targetUserName={creator.username}
                    targetAvatarUrl={creator.avatarUrl}
                    size="xs"
                    followsYou={creator.followsViewer}
                  />
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
