import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Key, Zap, AlertTriangle } from 'lucide-react';
import { multiProviderService } from '../services/ai/multiProviderService';

export interface AICreditBadgeProps {
  className?: string;
  onClick?: () => void;
}

export const AICreditBadge: React.FC<AICreditBadgeProps> = React.memo(({ className = '', onClick }) => {
  const { user, isLoggedIn, openRechargeModal, updateUser } = useApp();
  const [connectedCount, setConnectedCount] = useState<number>(() => {
    return multiProviderService.getConnectedProviders().length;
  });

  useEffect(() => {
    const handleUpdate = () => {
      const count = multiProviderService.getConnectedProviders().length;
      setConnectedCount(count);
      if (count === 0 && user?.hasBYOK) {
        updateUser({ hasBYOK: false, byokProvider: undefined });
      }
    };
    handleUpdate();
    window.addEventListener('ph_byok_keys_updated', handleUpdate);
    window.addEventListener('ph_wallet_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('ph_byok_keys_updated', handleUpdate);
      window.removeEventListener('ph_wallet_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [user?.hasBYOK, updateUser]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      openRechargeModal();
    }
  };

  // BYOK mode active STRICTLY if provider keys are actively connected on this device
  const hasBYOKKey = connectedCount > 0;

  if (!isLoggedIn) {
    return null;
  }

  if (hasBYOKKey) {
    return (
      <button 
        onClick={handleClick}
        type="button"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-primary-light border border-brand-primary/20 text-brand-primary dark:text-[#41A2D9] text-xs font-semibold font-mono select-none cursor-pointer hover:bg-brand-primary/10 transition-colors ${className}`}
        title="PromptHub BYOK Active — Unlimited execution with your provider key (Click to manage wallet)"
      >
        <Key className="w-3.5 h-3.5 text-brand-primary dark:text-[#41A2D9]" />
        <span>BYOK Active</span>
      </button>
    );
  }

  const credits = user?.credits ?? 0;
  const isLow = credits <= 5 && credits > 0;
  const isZero = credits <= 0;

  const bgStyle = isZero
    ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
    : isLow
    ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
    : 'bg-bg-tertiary border-border-default text-text-primary hover:bg-border-subtle';

  return (
    <button 
      onClick={handleClick}
      type="button"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium font-mono select-none cursor-pointer transition-colors shadow-xs ${bgStyle} ${className}`}
      title={isZero ? 'Click to recharge credits via Razorpay' : 'Click to recharge or manage credit wallet'}
    >
      {isZero ? (
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
      ) : (
        <Zap className="w-3.5 h-3.5 text-brand-primary" />
      )}
      <span>{isZero ? '0 Credits' : `${credits} Credits`}</span>
    </button>
  );
});

export default AICreditBadge;
