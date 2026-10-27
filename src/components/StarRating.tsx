import React, { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';

interface StarRatingProps {
  promptId: string;
  currentRating: number; // 0–5 average
  ratingCount: number;
  userRating: number; // 0 if not rated
  onRate: (rating: number) => void;
  canRate: boolean;
  lockReason?: string;
  size?: 'sm' | 'md';
  showCount?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  currentRating,
  ratingCount,
  userRating,
  onRate,
  canRate,
  lockReason,
  size = 'sm',
  showCount = true,
}) => {
  const [hovered, setHovered] = useState<number>(0);
  const [tooltip, setTooltip] = useState(false);
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5';
  
  // Use hovered value if hovering; otherwise use effective rating (only if ratings exist)
  const effectiveRating = ratingCount > 0 ? currentRating : 0;
  const activeValue = hovered > 0 ? hovered : effectiveRating;

  const isAlreadyReviewed = userRating > 0;
  const canUserInteract = canRate && !isAlreadyReviewed;

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>, star: number) => {
    if (!canUserInteract) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    setHovered(isLeftHalf ? star - 0.5 : star);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, star: number) => {
    if (!canUserInteract) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    const ratingToSubmit = isLeftHalf ? star - 0.5 : star;
    onRate(ratingToSubmit);
  };

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex items-center gap-0.5 relative"
        onMouseLeave={() => {
          setHovered(0);
          setTooltip(false);
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          // Determine fill level: full, half, or empty
          const isFull = activeValue >= star;
          const isHalf = !isFull && activeValue >= star - 0.75;

          return (
            <button
              key={star}
              type="button"
              disabled={!canRate}
              onClick={(e) => handleClick(e, star)}
              onMouseMove={(e) => handleMouseMove(e, star)}
              onMouseEnter={() => {
                if (!canUserInteract) setTooltip(true);
              }}
              className={[
                'relative transition-transform duration-100 focus:outline-none flex items-center justify-center p-0.5',
                canUserInteract ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-75',
              ].join(' ')}
              style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              {/* Background empty star */}
              <Star
                className={[starSize, 'transition-colors duration-100'].join(' ')}
                fill="none"
                stroke={isFull || isHalf ? 'var(--brand-primary)' : 'var(--brand-muted)'}
                strokeWidth={1.5}
              />

              {/* Full star overlay */}
              {isFull && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Star
                    className={starSize}
                    fill="var(--brand-primary)"
                    stroke="var(--brand-primary)"
                    strokeWidth={1.5}
                  />
                </div>
              )}

              {/* Half star overlay */}
              {isHalf && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <StarHalf
                    className={starSize}
                    fill="var(--brand-primary)"
                    stroke="var(--brand-primary)"
                    strokeWidth={1.5}
                  />
                </div>
              )}
            </button>
          );
        })}

        {/* Lock tooltip */}
        {tooltip && (lockReason || isAlreadyReviewed) && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap bg-surface-inverse text-text-primary shadow-lg border border-border-default pointer-events-none"
          >
            {isAlreadyReviewed ? 'You have already reviewed this prompt. You cannot review twice.' : lockReason}
          </div>
        )}
      </div>

      {showCount && (
        <span className="text-xs text-text-muted font-mono tabular-nums">
          {ratingCount > 0 && currentRating > 0 ? currentRating.toFixed(1) : '–'}
          {ratingCount > 0 && (
            <span className="text-text-muted/60 ml-0.5">({ratingCount})</span>
          )}
        </span>
      )}

      {/* User rated indicator */}
      {userRating > 0 && (
        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
          Reviewed ({userRating % 1 === 0 ? userRating : userRating.toFixed(1)}★) • 1 review per user
        </span>
      )}
    </div>
  );
};
