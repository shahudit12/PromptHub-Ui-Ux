import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  variant?: 'solid' | 'outline';
  className?: string;
}

/**
 * PromptHub Home Icon
 * Inspired by WhatsApp Image 2026-10-18 at 22.56.13.jpeg & 22.56.15.jpeg
 * Gable roof with clean proportioned doorway and smooth vertices.
 */
export const PromptHomeIcon: React.FC<IconProps> = ({
  size = 18,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const isSolid = variant === 'solid';

  if (isSolid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.293 2.707a1 1 0 011.414 0l7.5 7.5A1 1 0 0119.5 12H19v7.5A1.5 1.5 0 0117.5 21h-3A1.5 1.5 0 0113 19.5V15a1 1 0 00-1-1h0a1 1 0 00-1 1v4.5A1.5 1.5 0 019.5 21h-3A1.5 1.5 0 015 19.5V12h-.5a1 1 0 01-.707-1.707l7.5-7.5z"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M3 10.5L12 3l9 7.5V19.5a1.5 1.5 0 01-1.5 1.5h-4a1 1 0 01-1-1V14a1 1 0 00-1-1h-3a1 1 0 00-1 1v6a1 1 0 01-1 1H4.5A1.5 1.5 0 013 19.5V10.5z" />
    </svg>
  );
};

/**
 * Prompt Studio / Workspace Icon (Quill & Open Book)
 * Inspired by WhatsApp Image 2026-10-18 at 22.56.13 (1).jpeg
 * Elegant authoring metaphor: Open book base with feather quill pen.
 */
export const PromptStudioIcon: React.FC<IconProps> = ({
  size = 18,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const isSolid = variant === 'solid';

  if (isSolid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-hidden="true"
        {...props}
      >
        {/* Book Left Page & Base */}
        <path
          d="M4 6.5C4 6.5 7 5.5 11 7v13c-4-1.2-7-0.5-7-0.5V6.5z"
          fill="currentColor"
          opacity="0.25"
        />
        <path
          d="M4 6.5C4 6.5 7 5.5 11 7v13c-4-1.2-7-0.5-7-0.5V6.5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Open Book Bottom Curve */}
        <path
          d="M4 19.5C8 18 12 19 16 19.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Feather Quill Pen (Solid Fill) */}
        <path
          d="M12.5 18.5l1.5-4c.8-2.2 2.8-6.5 7-8.5 0 0-.5 3.5-1.5 5.5s-3 4-5.5 5.5l-1.5 1.5z"
          fill="currentColor"
        />
        {/* Quill Shaft line */}
        <path
          d="M12.5 18.5L20 7"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Book spine & page outline */}
      <path d="M4 6.5C4 6.5 7 5.5 11 7v13c-4-1.2-7-0.5-7-0.5V6.5z" />
      <path d="M4 19.5C8 18 12 19 16 19.5" />
      {/* Feather Quill Pen (Clean Outline) */}
      <path d="M12.5 18.5l1.5-4c.8-2.2 2.8-6.5 7-8.5 0 0-.5 3.5-1.5 5.5s-3 4-5.5 5.5l-1.5 1.5z" />
      <path d="M12.5 18.5L20 7" />
    </svg>
  );
};

/**
 * Marketplace Shopping Bag Icon
 * Inspired by WhatsApp Image 2026-10-18 at 22.56.14 (1).jpeg
 * Contemporary boutique tote with arched handle and twin rivet eyelets.
 */
export const PromptMarketplaceIcon: React.FC<IconProps> = ({
  size = 18,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const isSolid = variant === 'solid';

  if (isSolid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        {/* Handle */}
        <path
          d="M8.5 9V6.5a3.5 3.5 0 017 0V9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Solid Bag Body with Eyelet Cutouts */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.2 9a1.5 1.5 0 00-1.48 1.74l1.4 8.5A2 2 0 008.1 21h7.8a2 2 0 001.98-1.76l1.4-8.5A1.5 1.5 0 0017.8 9H6.2zm2.8 3.5a1 1 0 11-2 0 1 1 0 012 0zm8 0a1 1 0 11-2 0 1 1 0 012 0z"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Handle */}
      <path d="M8.5 9V6.5a3.5 3.5 0 017 0V9" />
      {/* Bag Outline */}
      <path d="M6.2 9h11.6a1.5 1.5 0 011.48 1.74l-1.4 8.5A2 2 0 0115.9 21H8.1a2 2 0 01-1.98-1.76l-1.4-8.5A1.5 1.5 0 016.2 9z" />
      {/* Twin Rivet Eyelets */}
      <circle cx="8.5" cy="12.5" r="1" />
      <circle cx="15.5" cy="12.5" r="1" />
    </svg>
  );
};

/**
 * Library / Bookmark Journal Icon
 * Inspired by WhatsApp Image 2026-10-18 at 22.56.14 (2).jpeg
 * Rounded notebook cover with hanging chevron ribbon bookmark.
 */
export const PromptLibraryIcon: React.FC<IconProps> = ({
  size = 18,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const isSolid = variant === 'solid';

  if (isSolid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M5 6a3 3 0 013-3h8a3 3 0 013 3v12a3 3 0 01-3 3H8a3 3 0 01-3-3V6zm4-1a1 1 0 00-1 1v7l2.5-1.8 2.5 1.8V6a1 1 0 00-1-1H9z"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Notebook Outer Rect */}
      <rect x="5" y="3" width="14" height="18" rx="3" />
      {/* Bookmark Ribbon */}
      <path d="M8.5 3v9l2.75-2 2.75 2V3" />
    </svg>
  );
};

/**
 * Teams & Collaborator Group Icon
 * 3-person silhouette: Prominent center figure with two flanking collaborators.
 */
export const PromptTeamIcon: React.FC<IconProps> = ({
  size = 18,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const isSolid = variant === 'solid';

  if (isSolid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        {/* Center Leader */}
        <circle cx="12" cy="7" r="3" />
        <path d="M7 19.5c0-2.8 2.2-5 5-5s5 2.2 5 5v.5H7v-.5z" />
        {/* Left Teammate */}
        <circle cx="5.5" cy="9.5" r="2.3" />
        <path d="M2 19.5c0-2.2 1.8-4 4-4 .6 0 1.2.1 1.7.4-.5.9-.7 1.9-.7 3.1v1H2v-.5z" />
        {/* Right Teammate */}
        <circle cx="18.5" cy="9.5" r="2.3" />
        <path d="M17 19c0-1.2-.2-2.2-.7-3.1.5-.3 1.1-.4 1.7-.4 2.2 0 4 1.8 4 4v.5h-5V19z" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Center User */}
      <circle cx="12" cy="7" r="3" />
      <path d="M7 19.5c0-2.8 2.2-5 5-5s5 2.2 5 5" />
      {/* Left User */}
      <circle cx="5.5" cy="9.5" r="2.2" />
      <path d="M2 19.5c0-2.2 1.8-4 4-4 .7 0 1.3.2 1.8.5" />
      {/* Right User */}
      <circle cx="18.5" cy="9.5" r="2.2" />
      <path d="M16.2 16c.5-.3 1.1-.5 1.8-.5 2.2 0 4 1.8 4 4" />
    </svg>
  );
};

export const PromptTeamsIcon = PromptTeamIcon;

/**
 * Official PromptHub Community Network Topology Icon
 * Grounded in media_1792441020670_9459606e.png prototype:
 * 1 central hub coordinator node radiating to 7 peripheral satellite nodes.
 * Supports authentic 'solid' and 'outline' variants matching theme specifications.
 */
export const PromptCommunityIcon: React.FC<IconProps> = ({
  size = 18,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const isSolid = variant === 'solid';

  if (isSolid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        {/* Connector Spoke Lines (rendered beneath filled node circles) */}
        <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <line x1="12" y1="12" x2="19" y2="3.5" />
          <line x1="12" y1="12" x2="8" y2="5.5" />
          <line x1="12" y1="12" x2="4" y2="12.5" />
          <line x1="12" y1="12" x2="20" y2="12" />
          <line x1="12" y1="12" x2="12.5" y2="18.5" />
          <line x1="12" y1="12" x2="5" y2="21.5" />
          <line x1="12" y1="12" x2="20.5" y2="20" />
        </g>
        {/* Central Hub Node */}
        <circle cx="12" cy="12" r="2.4" />
        {/* 7 Satellite Nodes */}
        <circle cx="19" cy="3.5" r="1.7" />
        <circle cx="8" cy="5.5" r="1.6" />
        <circle cx="4" cy="12.5" r="1.6" />
        <circle cx="20" cy="12" r="1.6" />
        <circle cx="12.5" cy="18.5" r="1.6" />
        <circle cx="5" cy="21.5" r="1.7" />
        <circle cx="20.5" cy="20" r="1.7" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Connector Spoke Lines (cleanly truncated at ring boundaries) */}
      <line x1="13.53" y1="10.15" x2="17.92" y2="4.81" />
      <line x1="10.74" y1="9.96" x2="8.84" y2="6.86" />
      <line x1="9.60" y1="12.15" x2="5.60" y2="12.40" />
      <line x1="14.40" y1="12.00" x2="18.40" y2="12.00" />
      <line x1="12.18" y1="14.39" x2="12.38" y2="16.90" />
      <line x1="10.58" y1="13.93" x2="6.01" y2="20.13" />
      <line x1="13.75" y1="13.64" x2="19.26" y2="18.83" />
      {/* Central Hub Ring */}
      <circle cx="12" cy="12" r="2.2" />
      {/* 7 Satellite Rings */}
      <circle cx="19" cy="3.5" r="1.6" />
      <circle cx="8" cy="5.5" r="1.5" />
      <circle cx="4" cy="12.5" r="1.5" />
      <circle cx="20" cy="12" r="1.5" />
      <circle cx="12.5" cy="18.5" r="1.5" />
      <circle cx="5" cy="21.5" r="1.6" />
      <circle cx="20.5" cy="20" r="1.6" />
    </svg>
  );
};

/**
 * Neural Network / Models Hub Icon
 * Inspired by WhatsApp Image 2026-10-18 at 22.56.14.jpeg
 * Central node connected to 6 radiating satellite nodes representing AI model clusters.
 */
export const PromptModelsHubIcon: React.FC<IconProps> = ({
  size = 18,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const isSolid = variant === 'solid';

  if (isSolid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        {/* Connector lines */}
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="12" y1="12" x2="6" y2="7" />
          <line x1="12" y1="12" x2="18" y2="6" />
          <line x1="12" y1="12" x2="19" y2="13" />
          <line x1="12" y1="12" x2="17" y2="19" />
          <line x1="12" y1="12" x2="7" y2="18" />
          <line x1="12" y1="12" x2="4.5" y2="12" />
        </g>
        {/* Center Node */}
        <circle cx="12" cy="12" r="2.6" />
        {/* Satellites */}
        <circle cx="6" cy="7" r="1.8" />
        <circle cx="18" cy="6" r="1.8" />
        <circle cx="19" cy="13" r="1.8" />
        <circle cx="17" cy="19" r="1.8" />
        <circle cx="7" cy="18" r="1.8" />
        <circle cx="4.5" cy="12" r="1.8" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Connector lines */}
      <line x1="12" y1="12" x2="6" y2="7" />
      <line x1="12" y1="12" x2="18" y2="6" />
      <line x1="12" y1="12" x2="19" y2="13" />
      <line x1="12" y1="12" x2="17" y2="19" />
      <line x1="12" y1="12" x2="7" y2="18" />
      <line x1="12" y1="12" x2="4.5" y2="12" />
      {/* Center Node */}
      <circle cx="12" cy="12" r="2.2" />
      {/* Satellites */}
      <circle cx="6" cy="7" r="1.5" />
      <circle cx="18" cy="6" r="1.5" />
      <circle cx="19" cy="13" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="4.5" cy="12" r="1.5" />
    </svg>
  );
};

/**
 * Drive Storage / Vault Icon
 * Modern high-utility storage icon: Tiered drive bays with activity LED indicators.
 */
export const PromptStorageIcon: React.FC<IconProps> = ({
  size = 18,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const isSolid = variant === 'solid';

  if (isSolid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <path d="M4 4.5A1.5 1.5 0 015.5 3h13A1.5 1.5 0 0120 4.5v5A1.5 1.5 0 0118.5 11h-13A1.5 1.5 0 014 9.5v-5zm13 2.5a1 1 0 100 2 1 1 0 000-2z" />
        <path d="M4 14.5A1.5 1.5 0 015.5 13h13a1.5 1.5 0 011.5 1.5v5a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19.5v-5zm13 2.5a1 1 0 100 2 1 1 0 000-2z" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3.5" width="18" height="7" rx="2" />
      <circle cx="17.5" cy="7" r="1" fill="currentColor" />
      <rect x="3" y="13.5" width="18" height="7" rx="2" />
      <circle cx="17.5" cy="17" r="1" fill="currentColor" />
    </svg>
  );
};

/**
 * Universal Search Magnifier Icon
 * Clean 45-degree angled lens inspired by Google & OpenAI.
 */
export const PromptSearchIcon: React.FC<IconProps> = ({
  size = 16,
  className = '',
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
};

/**
 * Prompt Analyzer Diagnostic Gauge / Scanner Icon
 * Modern radar diagnostic lens inspired by Google Lighthouse & audit tools.
 */
export const PromptAnalyzerIcon: React.FC<IconProps> = ({
  size = 18,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const isSolid = variant === 'solid';

  if (isSolid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm1 4a1 1 0 10-2 0v5.172l-2.414 2.414a1 1 0 001.414 1.414L13 11.828V6z"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
      <path d="M16 3.13a9 9 0 014 4" />
    </svg>
  );
};

/**
 * Model Arena Duel Icon
 * Crossed blades / side-by-side benchmark comparison.
 */
export const PromptArenaIcon: React.FC<IconProps> = ({
  size = 18,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const isSolid = variant === 'solid';

  if (isSolid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <path d="M14.5 3.5l6 6-8.5 8.5-4-1-1-4 7.5-9.5zm-5 13l-4 4-2-2 4-4 2 2zm-6-13l6 6-1 4-4-1-2.5-7.5 1.5-1.5z" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M14.5 3.5l6 6-9 9-4.5-1-1-4.5 8.5-9.5z" />
      <path d="M3.5 14.5l6-6" />
      <path d="M2.5 21.5l3-3" />
      <path d="M18.5 5.5l-6 6" />
    </svg>
  );
};

/**
 * API Key / BYOK Vault Icon
 * High-security physical/digital key with precision ward notches.
 */
export const PromptKeyIcon: React.FC<IconProps> = ({
  size = 18,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const isSolid = variant === 'solid';

  if (isSolid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <g transform="translate(12, 12) rotate(45) translate(-12, -12)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="
              M 8 7.2
              A 4.8 4.8 0 1 0 12.67 13.1
              L 14.8 13.1
              L 14.8 14.4
              A 0.5 0.5 0 0 0 15.3 14.9
              L 15.9 14.9
              A 0.5 0.5 0 0 0 16.4 14.4
              L 16.4 13.1
              L 17.3 13.1
              L 17.3 14.8
              A 0.5 0.5 0 0 0 17.8 15.3
              L 18.6 15.3
              A 0.5 0.5 0 0 0 19.1 14.8
              L 19.1 13.1
              L 20.2 13.1
              A 0.6 0.6 0 0 0 20.8 12.5
              L 20.8 11.5
              A 0.6 0.6 0 0 0 20.2 10.9
              L 12.67 10.9
              A 4.8 4.8 0 0 0 8 7.2
              Z
              M 8 9.6
              A 2.4 2.4 0 1 1 8 14.4
              A 2.4 2.4 0 1 1 8 9.6
              Z
            "
          />
        </g>
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g transform="translate(12, 12) rotate(45) translate(-12, -12)">
        {/* Outer Ring */}
        <circle cx="8" cy="12" r="4.8" />
        {/* Inner Hole */}
        <circle cx="8" cy="12" r="2.4" />
        {/* Shaft & Wards Outline */}
        <path d="M 12.67 10.9 L 20.2 10.9 A 0.6 0.6 0 0 1 20.8 11.5 L 20.8 12.5 A 0.6 0.6 0 0 1 20.2 13.1 L 19.1 13.1 L 19.1 14.8 A 0.5 0.5 0 0 1 18.6 15.3 L 17.8 15.3 A 0.5 0.5 0 0 1 17.3 14.8 L 17.3 13.1 L 16.4 13.1 L 16.4 14.4 A 0.5 0.5 0 0 1 15.9 14.9 L 15.3 14.9 A 0.5 0.5 0 0 1 14.8 14.4 L 14.8 13.1 L 12.67 13.1" />
      </g>
    </svg>
  );
};

/**
 * AI News / Feed Icon
 * Crisp newspaper sheet with headline and text lines.
 */
export const PromptNewsIcon: React.FC<IconProps> = ({
  size = 18,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const isSolid = variant === 'solid';

  if (isSolid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4 4a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm4 4a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H9a1 1 0 01-1-1z"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M4 4a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </svg>
  );
};

/**
 * Developer Mode Terminal Icon
 * Sleek modern prompt box with `>_` terminal indicator.
 */
export const PromptTerminalIcon: React.FC<IconProps> = ({
  size = 18,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const isSolid = variant === 'solid';

  if (isSolid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm4.7 3.3a1 1 0 00-1.4 1.4L8.58 12l-2.3 2.3a1 1 0 101.42 1.4l3-3a1 1 0 000-1.4l-3-3zm5.3 6.7a1 1 0 100 2h4a1 1 0 100-2h-4z"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M7.5 9l3 3-3 3" />
      <path d="M12.5 15h4" />
    </svg>
  );
};

/**
 * Dashboard Grid Icon
 * 4-tile modular analytics view (Linear & GitHub style).
 */
export const PromptDashboardIcon: React.FC<IconProps> = ({
  size = 18,
  variant = 'outline',
  className = '',
  ...props
}) => {
  const isSolid = variant === 'solid';

  if (isSolid) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  );
};
