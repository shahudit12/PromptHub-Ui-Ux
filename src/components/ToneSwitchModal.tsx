import React from 'react';
import type { TonePreference } from '../db/schema';

export interface ToneSwitchModalProps {
  isOpen?: boolean;
  targetTone?: TonePreference | null;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Gen Z mode has been completely decommissioned.
 * Modal returns null and is permanently disabled.
 */
export const ToneSwitchModal: React.FC<ToneSwitchModalProps> = () => null;

export default ToneSwitchModal;
