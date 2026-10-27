import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, UserCheck, UserX, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface FollowButtonProps {
  targetUserId: string;
  targetUserName?: string;
  targetAvatarUrl?: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'default' | 'outline' | 'pill';
  onFollowChange?: (isFollowing: boolean) => void;
  showFollowsYouBadge?: boolean;
  followsYou?: boolean;
  className?: string;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  targetUserId,
  targetUserName,
  targetAvatarUrl: _targetAvatarUrl,
  size = 'sm',
  variant = 'default',
  onFollowChange,
  showFollowsYouBadge = false,
  followsYou = false,
  className = '',
}) => {
  const { user, isLoggedIn, setShowAuthModal, toggleFollow, showToast } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if viewing self
  const isSelf = user?.id === targetUserId;
  if (isSelf) {
    return null;
  }

  const isFollowing = Boolean(user?.following?.includes(targetUserId));

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isLoggedIn || !user) {
      setShowAuthModal(true);
      showToast('Please sign in to follow creators.', 'info');
      return;
    }

    setIsLoading(true);
    try {
      toggleFollow(targetUserId);
      const nextState = !isFollowing;
      if (onFollowChange) {
        onFollowChange(nextState);
      }
    } catch {
      showToast('Failed to update follow status.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Size styling classes
  const sizeClasses = {
    xs: 'px-2.5 py-1 text-[11px] min-h-[30px] rounded-md gap-1',
    sm: 'px-3.5 py-1.5 text-xs min-h-[36px] rounded-lg gap-1.5',
    md: 'px-4 py-2 text-xs font-semibold min-h-[44px] rounded-xl gap-2',
  }[size];

  // Visual styling variants
  let buttonStyle = '';
  if (isFollowing) {
    if (isHovered) {
      // Hovering over Following -> "Unfollow" (Instagram style)
      buttonStyle = 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60';
    } else {
      // Resting Following
      buttonStyle = 'bg-bg-secondary text-text-secondary border border-border-default hover:bg-bg-tertiary';
    }
  } else {
    // Not Following -> Active Follow CTA
    if (variant === 'outline') {
      buttonStyle = 'border-2 border-brand-primary text-brand-primary hover:bg-brand-primary-light font-bold';
    } else {
      buttonStyle = 'bg-brand-primary text-white hover:bg-brand-primary-hover shadow-2xs font-semibold';
    }
  }

  const roundedClass = variant === 'pill' ? 'rounded-full' : '';

  return (
    <div className="inline-flex items-center gap-1.5">
      {showFollowsYouBadge && followsYou && !isFollowing && (
        <span className="text-[10px] font-mono text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-default">
          Follows you
        </span>
      )}

      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isLoading}
        aria-label={isFollowing ? `Unfollow ${targetUserName || 'creator'}` : `Follow ${targetUserName || 'creator'}`}
        className={`inline-flex items-center justify-center font-sans font-medium transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:ring-offset-1 ${sizeClasses} ${buttonStyle} ${roundedClass} ${className}`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isFollowing ? (
          isHovered ? (
            <>
              <UserX className="w-3.5 h-3.5 text-rose-600" />
              <span>Unfollow</span>
            </>
          ) : (
            <>
              <UserCheck className="w-3.5 h-3.5 text-brand-primary" />
              <span>Following</span>
            </>
          )
        ) : followsYou ? (
          <>
            <UserPlus className="w-3.5 h-3.5" />
            <span>Follow Back</span>
          </>
        ) : (
          <>
            <UserPlus className="w-3.5 h-3.5" />
            <span>Follow</span>
          </>
        )}
      </motion.button>
    </div>
  );
};
