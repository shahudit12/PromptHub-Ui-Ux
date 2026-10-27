import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertOctagon, 
  RotateCcw, 
  CreditCard, 
  HelpCircle, 
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const PaymentFailedView: React.FC = () => {
  const { setActiveTab, openRechargeModal } = useApp();

  // Parse error and order diagnostics from URL if available
  const diagnostics = useMemo(() => {
    if (typeof window === 'undefined') {
      return { orderId: 'ORD_PENDING', reason: 'Gateway verification timeout or user cancellation', code: 'PAYMENT_CANCELLED' };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      orderId: params.get('order_id') || params.get('orderId') || params.get('reference') || 'RZP_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      reason: params.get('error') || params.get('reason') || 'Transaction was declined by issuing bank or cancelled in checkout modal.',
      code: params.get('code') || params.get('error_code') || 'BAD_REQUEST_OR_TIMEOUT',
      amount: params.get('amount') ? `₹${params.get('amount')}` : null,
    };
  }, []);

  const commonReasons = [
    {
      title: 'Bank OTP / 3DS Verification Timeout',
      desc: 'The SMS/Banking OTP was not entered within the mandatory 3-minute regulatory timeout window.',
    },
    {
      title: 'UPI App Authorization Expired',
      desc: 'The UPI payment collect request expired in your banking app (GPay, PhonePe, Paytm, or BHIM).',
    },
    {
      title: 'Card Limit or International Security Decline',
      desc: 'Online / e-commerce transactions might be temporarily disabled on your debit/credit card in your bank app.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-bg-primary text-text-primary px-4 py-8 md:py-16 selection:bg-brand-primary-light selection:text-brand-primary">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center items-center text-center">
        
        {/* Warning Icon Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 flex items-center justify-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm flex items-center justify-center text-rose-600">
            <AlertOctagon className="w-10 h-10 stroke-[1.5]" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-2 mb-6"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100/60 border border-rose-200 text-rose-700 text-xs font-mono font-medium">
            <span>Status: Payment Incomplete</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-text-primary tracking-tight">
            Transaction Could Not Be Completed
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
            Your payment attempt was not finalized. No credits were deducted, and if your bank debited any amount, it will be automatically refunded within 3–5 business days.
          </p>
        </motion.div>

        {/* Diagnostic Order Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5 text-left mb-6 shadow-xs font-mono text-xs space-y-2.5"
        >
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <span className="text-text-muted">Transaction ID:</span>
            <span className="text-text-primary font-bold">{diagnostics.orderId}</span>
          </div>
          {diagnostics.amount && (
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <span className="text-text-muted">Attempted Amount:</span>
              <span className="text-text-primary font-bold">{diagnostics.amount}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <span className="text-text-muted">Gateway Status:</span>
            <span className="text-rose-600 font-semibold">{diagnostics.code}</span>
          </div>
          <div className="pt-1">
            <span className="text-text-muted block mb-1">Gateway Diagnostic Message:</span>
            <span className="text-text-secondary font-sans text-xs block bg-bg-tertiary p-2 rounded-lg border border-border-subtle">
              {diagnostics.reason}
            </span>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-md mb-8"
        >
          <button
            onClick={() => {
              if (openRechargeModal) {
                openRechargeModal(100);
              } else {
                setActiveTab('pricing');
              }
            }}
            className="flex-1 btn-primary min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Transaction</span>
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className="flex-1 btn-secondary min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>View All Plans</span>
          </button>
        </motion.div>

        {/* Common Reasons Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-bg-secondary border border-border-default rounded-xl p-5 text-left mb-6 shadow-2xs space-y-3"
        >
          <h3 className="text-xs font-bold font-display uppercase tracking-wider text-text-muted">
            Troubleshooting &amp; Common Failure Causes
          </h3>
          <div className="space-y-3">
            {commonReasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 shrink-0" />
                <div>
                  <strong className="text-text-primary block">{r.title}</strong>
                  <span className="text-text-secondary text-[11px] leading-relaxed">{r.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Support & Guarantee Footer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-4 text-xs text-text-muted font-sans"
        >
          <div className="flex items-center gap-1.5 text-text-secondary">
            <ShieldCheck className="w-4 h-4 text-brand-primary" />
            <span>Double-entry ledger integrity guaranteed</span>
          </div>
          <span>•</span>
          <button
            onClick={() => setActiveTab('support')}
            className="text-brand-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer py-1.5 min-h-[36px]"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Contact Billing Support</span>
          </button>
        </motion.div>

      </div>
    </div>
  );
};

export default PaymentFailedView;