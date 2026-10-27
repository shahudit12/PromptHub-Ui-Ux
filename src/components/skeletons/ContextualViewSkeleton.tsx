import React from 'react';
import type { TabType } from '../../context/AppContext';
import { MarketplaceSkeleton } from './MarketplaceSkeleton';
import { StorageVaultSkeleton } from './StorageVaultSkeleton';
import { NewsFeedSkeleton } from './NewsFeedSkeleton';
import { DashboardSkeleton } from './DashboardSkeleton';
import { LeaderboardSkeleton } from './LeaderboardSkeleton';
import { PricingSkeleton } from './PricingSkeleton';
import { SettingsSkeleton } from './SettingsSkeleton';
import { StudioLoadingSkeleton } from '../common/StudioLoadingSkeleton';
import { HeroLandingSkeleton } from './HeroLandingSkeleton';

export interface ContextualViewSkeletonProps {
  tab?: TabType | string;
}

export const ContextualViewSkeleton: React.FC<ContextualViewSkeletonProps> = React.memo(({ tab = 'home' }) => {
  switch (tab) {
    case 'home':
      return <HeroLandingSkeleton />;
    case 'marketplace':
      return <MarketplaceSkeleton label="Marketplace prompts" />;
    case 'community':
      return <MarketplaceSkeleton label="Community prompts" />;
    case 'library':
      return <MarketplaceSkeleton label="Library prompts" />;
    case 'collections':
      return <MarketplaceSkeleton label="Saved collections" />;
    case 'explore':
      return <MarketplaceSkeleton label="prompts" />;

    case 'storage':
    case 'vault':
      return <StorageVaultSkeleton />;

    case 'news':
      return <NewsFeedSkeleton />;

    case 'dashboard':
      return <DashboardSkeleton />;

    case 'leaderboard':
      return <LeaderboardSkeleton />;

    case 'pricing':
    case 'recharge':
    case 'wallet':
      return <PricingSkeleton />;

    case 'settings':
    case 'profile':
    case 'credentials':
    case 'admin':
    case 'notifications':
    case 'teams':
    case 'team-accept':
      return <SettingsSkeleton />;

    case 'workspace':
    case 'arena':
    case 'analyzer':
    case 'create-prompt':
    case 'models-guide':
    case 'models':
    default:
      return <StudioLoadingSkeleton />;
  }
});

export default ContextualViewSkeleton;
