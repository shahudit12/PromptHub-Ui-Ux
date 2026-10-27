import React, { useState } from 'react';

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  username?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  shape?: 'rounded' | 'square' | 'circle';
  isAdmin?: boolean;
  role?: string | null;
}

const SIZE_MAP = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-16 h-16 text-lg font-bold',
};

const GRADIENTS = [
  'from-blue-700 to-slate-900',
  'from-indigo-700 to-slate-900',
  'from-amber-700 to-stone-900',
  'from-rose-700 to-zinc-900',
  'from-cyan-700 to-blue-950',
  'from-stone-700 to-neutral-900',
];

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  username,
  size = 'md',
  className = '',
  shape = 'rounded',
  isAdmin,
  role,
}) => {
  const [imageError, setImageError] = useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [src]);

  const rawName = (name || username || '').trim();
  const rawLower = rawName.toLowerCase();
  const rawRole = (role || '').trim().toLowerCase();
  const rawUsername = (username || '').trim().toLowerCase();

  const isOfficialAdmin = Boolean(
    isAdmin ||
    rawRole === 'admin' ||
    rawLower === 'prompthub admin' ||
    rawLower === 'admin' ||
    rawUsername === 'admin' ||
    rawUsername === 'prompthub_admin' ||
    (typeof src === 'string' && (
      src.includes('admin-avatar') ||
      src.includes('photo-1618005182384-a83a8bd57fbe')
    ))
  );

  const displayName = isOfficialAdmin ? (rawName || 'PromptHub Admin') : (rawName || 'Creator');
  const initials = isOfficialAdmin
    ? 'ADM'
    : displayName
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'PH';

  // Deterministic gradient selection based on name hash
  const hash = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradient = isOfficialAdmin 
    ? 'from-[#0B60B0] via-[#41A2D9] to-[#0B1118]' 
    : GRADIENTS[hash % GRADIENTS.length];

  const shapeClass = shape === 'circle' ? 'rounded-full' : shape === 'square' ? 'rounded-md' : 'rounded-xl';
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  // Allow admin and regular users alike to use their custom uploaded/OAuth profile photo
  const resolvedSrc = (src && typeof src === 'string' && !src.includes('photo-1618005182384-a83a8bd57fbe'))
    ? src.trim()
    : null;

  const validSrc = Boolean(resolvedSrc && !imageError);

  const adminRingClass = isOfficialAdmin
    ? 'ring-2 ring-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.45)] dark:shadow-[0_0_16px_rgba(16,185,129,0.55)] border border-emerald-400/80'
    : 'border border-border-default';

  if (validSrc && resolvedSrc) {
    return (
      <img
        src={resolvedSrc}
        alt={isOfficialAdmin ? (rawName || 'PromptHub Administrator') : displayName}
        title={isOfficialAdmin ? `${displayName} (Official Administrator)` : displayName}
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
        className={`${sizeClass} ${shapeClass} object-cover shrink-0 select-none transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${adminRingClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${shapeClass} bg-gradient-to-br ${gradient} text-white font-semibold flex items-center justify-center shrink-0 select-none shadow-2xs font-sans tracking-wide transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${adminRingClass} ${className}`}
      title={isOfficialAdmin ? 'PromptHub Administrator (Official)' : displayName}
    >
      <span className={isOfficialAdmin ? 'font-mono text-[9px] tracking-tighter text-emerald-300 font-extrabold' : ''}>{initials}</span>
    </div>
  );
};

export default UserAvatar;
