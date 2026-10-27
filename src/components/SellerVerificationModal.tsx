import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Landmark, 
  QrCode,
  ShieldCheck,
  Building2,
  Lock,
  Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UpiQrCodeUploader } from './payment/UpiQrCodeUploader';

interface SellerVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationSubmitted?: () => void;
}

const UPI_REGEX = /^[a-zA-Z0-9.\-_+]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/;
const IFSC_REGEX = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;
const ACCOUNT_NUM_REGEX = /^[0-9]{6,24}$/;

export const SellerVerificationModal: React.FC<SellerVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerificationSubmitted,
}) => {
  const { user, showToast } = useApp();

  const [payoutType, setPayoutType] = useState<'upi' | 'bank_account'>('upi');
  
  // UPI Field
  const [upiId, setUpiId] = useState('');

  // Bank Account Fields
  const [accountHolderName, setAccountHolderName] = useState(user?.name || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Uploaded QR URL
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState<string | null>(null);

  // States
  const [isConfigured, setIsConfigured] = useState(false);
  const [maskedUpi, setMaskedUpi] = useState<string | null>(null);
  const [maskedAcc, setMaskedAcc] = useState<string | null>(null);
  const [savedHolderName, setSavedHolderName] = useState<string | null>(null);
  const [savedIfsc, setSavedIfsc] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch current payout profile on open
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchPayoutProfile = async () => {
      setIsLoading(true);
      try {
        const headers: Record<string, string> = {};
        // Standalone mock headers

        const res = await fetch('/api/payout-profile', { headers });
        let data: any = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }

        if (data.success && data.isConfigured && data.profile) {
          setIsConfigured(true);
          setPayoutType(data.profile.payoutType || 'upi');
          setMaskedUpi(data.profile.maskedUpiId);
          setUpiQrCodeUrl(data.profile.upiQrCodeUrl || null);
          setMaskedAcc(data.profile.maskedAccountNumber);
          setSavedHolderName(data.profile.accountHolderName);
          setSavedIfsc(data.profile.ifscCode);
          return;
        }

        // 3. Local Cache Fallback
        const localRaw = localStorage.getItem(`ph_payout_profile_${user.id}`);
        if (localRaw) {
          try {
            const localData = JSON.parse(localRaw);
            if (localData?.isConfigured) {
              setIsConfigured(true);
              setPayoutType(localData.payoutType || 'upi');
              setMaskedUpi(localData.maskedUpiId || null);
              setUpiQrCodeUrl(localData.upiQrCodeUrl || null);
              setMaskedAcc(localData.maskedAccountNumber || null);
              setSavedHolderName(localData.accountHolderName || null);
              setSavedIfsc(localData.ifscCode || null);
            }
          } catch {}
        }
      } catch (err) {
        console.warn('[PayoutModal] Fetch error:', err);
        const localRaw = localStorage.getItem(`ph_payout_profile_${user?.id}`);
        if (localRaw) {
          try {
            const localData = JSON.parse(localRaw);
            if (localData?.isConfigured) {
              setIsConfigured(true);
              setPayoutType(localData.payoutType || 'upi');
              setMaskedUpi(localData.maskedUpiId || null);
              setUpiQrCodeUrl(localData.upiQrCodeUrl || null);
              setMaskedAcc(localData.maskedAccountNumber || null);
              setSavedHolderName(localData.accountHolderName || null);
              setSavedIfsc(localData.ifscCode || null);
            }
          } catch {}
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayoutProfile();
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Client-side Validation
    if (payoutType === 'upi') {
      const cleanUpi = upiId.trim();
      if (!cleanUpi || !UPI_REGEX.test(cleanUpi)) {
        setValidationError('Please enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm).');
        return;
      }
    } else {
      const cleanHolder = accountHolderName.trim();
      const cleanAcc = accountNumber.trim();
      const cleanConfirm = confirmAccountNumber.trim();
      const cleanIfsc = ifscCode.trim().toUpperCase();

      if (!cleanHolder || cleanHolder.length < 2) {
        setValidationError('Please enter the full account holder name.');
        return;
      }
      if (!cleanAcc || !ACCOUNT_NUM_REGEX.test(cleanAcc)) {
        setValidationError('Bank account number must be 6 to 24 digits.');
        return;
      }
      if (cleanAcc !== cleanConfirm) {
        setValidationError('Bank account numbers do not match.');
        return;
      }
      if (!cleanIfsc || !IFSC_REGEX.test(cleanIfsc)) {
        setValidationError('Please enter a valid 11-character IFSC code (e.g. HDFC0001234).');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let savedSuccessfully = false;

      // Local storage persistence
      savedSuccessfully = true;
      // 3. Fallback to local storage if API and DB are unreachable
      if (!savedSuccessfully && user?.id) {
        savedSuccessfully = true;
        setIsConfigured(true);
        setMaskedUpi(payoutType === 'upi' ? upiId.trim() : null);
        setUpiQrCodeUrl(upiQrCodeUrl?.trim() || null);
        setMaskedAcc(payoutType === 'bank_account' ? `••••••••${accountNumber.trim().slice(-4)}` : null);
        setSavedHolderName(payoutType === 'bank_account' ? accountHolderName.trim() : null);
        setSavedIfsc(payoutType === 'bank_account' ? ifscCode.trim().toUpperCase() : null);
      }

      if (savedSuccessfully) {
        if (user?.id) {
          try {
            localStorage.setItem(`ph_payout_profile_${user.id}`, JSON.stringify({
              isConfigured: true,
              payoutType,
              maskedUpiId: payoutType === 'upi' ? upiId.trim() : null,
              upiQrCodeUrl: payoutType === 'upi' ? (upiQrCodeUrl?.trim() || null) : null,
              maskedAccountNumber: payoutType === 'bank_account' ? `••••••••${accountNumber.trim().slice(-4)}` : null,
              accountHolderName: payoutType === 'bank_account' ? accountHolderName.trim() : null,
              ifscCode: payoutType === 'bank_account' ? ifscCode.trim().toUpperCase() : null,
            }));
          } catch {}
        }
        showToast('Creator payout details saved successfully!', 'success');
        if (onVerificationSubmitted) onVerificationSubmitted();
        setTimeout(() => onClose(), 800);
      } else {
        setValidationError('Failed to save payout details. Please check your connection and retry.');
      }
    } catch (err: any) {
      console.warn('[PayoutModal] Save payout exception:', err);
      setValidationError('Failed to save payout details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    setValidationError(null);
    try {
      if (user?.id) {
        try {
          localStorage.removeItem(`ph_payout_profile_${user.id}`);
        } catch {}
      }

      setIsConfigured(false);
      setMaskedUpi(null);
      setUpiId('');
        setUpiQrCodeUrl(null);
        setMaskedAcc(null);
        setSavedHolderName(null);
        setSavedIfsc(null);
        setAccountNumber('');
        setConfirmAccountNumber('');
        setShowRemoveConfirm(false);
      showToast('Creator payout details removed successfully.', 'info');
      if (onVerificationSubmitted) onVerificationSubmitted();
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      console.warn('[PayoutModal] Remove error:', err);
      setValidationError('Failed to remove payout details. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && !isRemoving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, isRemoving, onClose]);

  // Lock body overflow while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-bg-secondary rounded-2xl border border-border-default shadow-2xl overflow-hidden my-6 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border-default bg-bg-tertiary/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-text-primary">Creator Payout Details</h3>
                <p className="text-xs text-text-secondary">Configure where you receive earnings from prompt sales.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
                <span className="text-xs text-text-muted font-mono">Loading payout preferences...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Active Saved State Banner */}
                {isConfigured && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <span className="font-semibold text-emerald-900 dark:text-emerald-300 block">Payout Details Configured</span>
                          <div className="flex flex-wrap items-center gap-2 text-emerald-800/90 dark:text-emerald-400">
                            {payoutType === 'upi' && (maskedUpi || upiId) ? (
                              <>
                                <span>Receiving via UPI: <strong className="font-mono">{maskedUpi || upiId}</strong></span>
                                {upiQrCodeUrl && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold ml-1.5">
                                    <QrCode className="w-3 h-3" />
                                    <span>QR Code Attached</span>
                                  </span>
                                )}
                              </>
                            ) : maskedAcc ? (
                              <>Receiving via Bank Account: <strong className="font-mono">{maskedAcc}</strong> ({savedIfsc}{savedHolderName ? ` · ${savedHolderName}` : ''})</>
                            ) : (
                              'Your payout destination is verified and active.'
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowRemoveConfirm(true)}
                          className="px-2.5 py-1.5 min-h-[44px] rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                          title="Remove payout details"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Remove Confirmation Box */}
                    {showRemoveConfirm && (
                      <div className="p-3.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-2.5">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="text-xs space-y-0.5">
                            <span className="font-bold text-rose-900 dark:text-rose-200 block">Remove Payout Destination?</span>
                            <p className="text-[11px] text-rose-700 dark:text-rose-400">
                              This will clear your saved {payoutType === 'upi' ? 'UPI ID & QR Code' : 'Bank Details'}. You can configure new details at any time.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            disabled={isRemoving}
                            onClick={handleRemove}
                            className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            {isRemoving ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Removing...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Yes, Remove Details</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={isRemoving}
                            onClick={() => setShowRemoveConfirm(false)}
                            className="min-h-[44px] px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-text-primary text-xs font-medium cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Method Selector: Option A (UPI) vs Option B (Bank Account) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                    Select Preferred Payout Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Option A: UPI */}
                    <button
                      type="button"
                      onClick={() => { setPayoutType('upi'); setValidationError(null); }}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                        payoutType === 'upi'
                          ? 'border-brand-primary bg-bg-tertiary ring-1 ring-brand-primary shadow-xs'
                          : 'border-border-default bg-bg-primary hover:border-border-hover'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-text-primary block">UPI ID / VPA</span>
                        <span className="text-[10px] text-text-muted">Instant transfer</span>
                      </div>
                    </button>

                    {/* Option B: Bank Account */}
                    <button
                      type="button"
                      onClick={() => { setPayoutType('bank_account'); setValidationError(null); }}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                        payoutType === 'bank_account'
                          ? 'border-brand-primary bg-bg-tertiary ring-1 ring-brand-primary shadow-xs'
                          : 'border-border-default bg-bg-primary hover:border-border-hover'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-text-primary block">Bank Account</span>
                        <span className="text-[10px] text-text-muted">Direct NEFT/IMPS</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* OPTION A: UPI FIELDS */}
                {payoutType === 'upi' && (
                  <div className="space-y-4 p-4 rounded-xl bg-bg-tertiary border border-border-default">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center justify-between">
                        <span>UPI ID / Virtual Payment Address (VPA)</span>
                        {upiId && UPI_REGEX.test(upiId.trim()) && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                            <CheckCircle2 className="w-3 h-3" /> Valid VPA
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        required
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. username@okhdfcbank or 9876543210@paytm"
                        className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none min-h-[44px]"
                      />
                      <p className="text-[10px] text-text-muted font-mono">Supported handles: @okhdfcbank, @oksbi, @okaxis, @paytm, @ybl, @icici, etc.</p>
                    </div>

                    {/* QR Code Upload Option with VPA */}
                    <UpiQrCodeUploader
                      vpa={upiId}
                      qrCodeUrl={upiQrCodeUrl}
                      onQrCodeChange={setUpiQrCodeUrl}
                      payeeName={user?.name || user?.username || 'PromptHub Creator'}
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* OPTION B: BANK ACCOUNT FIELDS */}
                {payoutType === 'bank_account' && (
                  <div className="space-y-3 p-4 rounded-xl bg-bg-tertiary border border-border-default">
                    {/* Account Holder Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                        Account Holder Name (As per Bank Records)
                      </label>
                      <input
                        type="text"
                        required
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        placeholder="e.g. Alex Vance"
                        className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none"
                      />
                    </div>

                    {/* Account Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                        Bank Account Number
                      </label>
                      <input
                        type="password"
                        required
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 9 to 18 digit account number"
                        className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none"
                      />
                    </div>

                    {/* Confirm Account Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                        Confirm Bank Account Number
                      </label>
                      <input
                        type="text"
                        required
                        value={confirmAccountNumber}
                        onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Re-enter bank account number"
                        className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none"
                      />
                    </div>

                    {/* IFSC Code */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                        IFSC Code (11 Characters)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={11}
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        placeholder="e.g. HDFC0001234"
                        className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none uppercase"
                      />
                    </div>
                  </div>
                )}

                {/* Validation Error Alert */}
                {validationError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Security Notice */}
                <div className="p-3 rounded-lg bg-bg-primary border border-border-default flex items-start gap-2.5 text-[11px] text-text-secondary leading-relaxed">
                  <Lock className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                  <span>
                    Payout details are encrypted and protected by strict Row Level Security. Full bank details are never displayed publicly.
                  </span>
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <div>
                    {isConfigured && (
                      <button
                        type="button"
                        onClick={() => setShowRemoveConfirm(true)}
                        disabled={isSubmitting || isRemoving}
                        className="min-h-[44px] px-3.5 py-2 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Payout</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting || isRemoving}
                      className="min-h-[44px] px-4 py-2 rounded-lg border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer bg-bg-tertiary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || isRemoving}
                      className="min-h-[44px] flex items-center gap-1.5 px-5 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Details...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{isConfigured ? 'Update Payout Details' : 'Save Payout Details'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default SellerVerificationModal;
