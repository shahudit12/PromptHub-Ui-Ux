/**
 * React Hook for automatic Section Dwell-Time Tracking
 * Integrates into App.tsx to track view route changes effortlessly.
 */

import { useEffect } from 'react';
import { dwellAnalyticsService } from '../services/dwellAnalyticsService';
import type { TabType } from '../context/AppContext';

export function useSectionTracker(activeTab: TabType) {
  useEffect(() => {
    // Initialize event listeners once
    dwellAnalyticsService.init();
  }, []);

  useEffect(() => {
    if (activeTab) {
      dwellAnalyticsService.trackSectionEnter(activeTab);
    }
  }, [activeTab]);
}
