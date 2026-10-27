import React from 'react';

export interface LaunchAnnouncementBannerProps {
  onClaimOffer?: () => void;
  className?: string;
  dismissible?: boolean;
}

/**
 * Free launch promo announcements are permanently discontinued.
 */
export const LaunchAnnouncementBanner: React.FC<LaunchAnnouncementBannerProps> = () => {
  return null;
};

export default LaunchAnnouncementBanner;
