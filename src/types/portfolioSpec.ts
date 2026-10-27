/**
 * src/types/portfolioSpec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Schema-validated Portfolio Design Specification and Concept Types.
 * Implements the deterministic spec-driven rendering architecture:
 *  - Three distinct pre-rendered concepts (Minimal CLI, Modern Bento, Retro Arcade)
 *  - Atomic selection (zero AI rebuild model calls)
 *  - Direct spec patching for instant zero-model re-renders
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { WorkFile } from './work';

export type PortfolioTemplateId = 'minimal_cli' | 'modern_bento' | 'retro_arcade';

export interface PortfolioPalette {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  border: string;
}

export interface PortfolioTypography {
  fontHeading: string;
  fontBody: string;
  fontMono: string;
}

export interface PortfolioProfile {
  name: string;
  title: string;
  bio: string;
  avatarUrl?: string;
  location?: string;
  statusBadge?: string;
}

export interface PortfolioSkill {
  name: string;
  category?: 'frontend' | 'backend' | 'ai' | 'tools' | 'core';
  level?: number; // 0 - 100
  icon?: string;
}

export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  tags: string[];
  liveUrl?: string;
  repoUrl?: string;
  stars?: number;
  featured?: boolean;
  metrics?: string;
}

export interface PortfolioSocialLink {
  platform: 'github' | 'linkedin' | 'twitter' | 'website' | 'email';
  url: string;
  label: string;
}

export interface PortfolioContact {
  email: string;
  ctaText: string;
  availableForHire: boolean;
}

export interface PortfolioInteractiveFeatures {
  hasTerminal?: boolean;
  hasAudioSynth?: boolean;
  hasMiniGame?: boolean;
  hasCaseStudies?: boolean;
  hasCrtOverlay?: boolean;
}

export interface PortfolioDesignSpec {
  id: string;
  name: string;
  templateId: PortfolioTemplateId;
  templateVersion: string;
  aesthetic: string;
  description: string;
  palette: PortfolioPalette;
  typography: PortfolioTypography;
  profile: PortfolioProfile;
  skills: PortfolioSkill[];
  projects: PortfolioProject[];
  socialLinks: PortfolioSocialLink[];
  contact: PortfolioContact;
  interactiveFeatures: PortfolioInteractiveFeatures;
  referenceIds?: string[];
  derivationNotice?: string;
  customTokens?: Record<string, string | number | boolean>;
}

export interface PortfolioConcept {
  id: string;
  spec: PortfolioDesignSpec;
  files: WorkFile[];
  previewHtml: string;
  badge: string;
  highlights: string[];
}

export type PortfolioSpecPatch = Partial<{
  palette: Partial<PortfolioPalette>;
  profile: Partial<PortfolioProfile>;
  skills: PortfolioSkill[];
  projects: PortfolioProject[];
  contact: Partial<PortfolioContact>;
  interactiveFeatures: Partial<PortfolioInteractiveFeatures>;
}>;
