import React, { useState, useEffect, useRef } from 'react';
import { navigationLoadingService } from '../../services/navigationLoadingService';

export const TopNavigationProgress: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = navigationLoadingService.subscribe((isPending) => {
      if (isPending) {
        // Show after 150ms delay; cancel that delay for fast transitions (<150ms)
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setVisible(true);
        }, 150);
      } else {
        // Cancel pending appearance immediately if resolved within 150ms
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        // Clear immediately on completion, failure, cancellation
        setVisible(false);
      }
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page content"
      aria-busy="true"
      className="fixed top-0 left-0 right-0 h-[2px] z-50 overflow-hidden pointer-events-none bg-blue-100/60 dark:bg-blue-950/40"
    >
      <div 
        className="h-full bg-brand-primary w-full animate-indeterminate-bar" 
      />
    </div>
  );
};

export default TopNavigationProgress;
