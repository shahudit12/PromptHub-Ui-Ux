import React, { useEffect } from 'react';
import { ShieldCheck, CreditCard, Check } from 'lucide-react';
import type { PaymentGateway } from '../../services/payment/payuClient';

interface PaymentGatewaySelectorProps {
  selectedGateway?: PaymentGateway;
  onSelectGateway?: (gateway: PaymentGateway) => void;
  className?: string;
  disabled?: boolean;
}

export const PaymentGatewaySelector: React.FC<PaymentGatewaySelectorProps> = ({
  selectedGateway = 'razorpay',
  onSelectGateway,
  className = '',
  disabled = false,
}) => {
  useEffect(() => {
    if (selectedGateway !== 'razorpay' && onSelectGateway) {
      onSelectGateway('razorpay');
    }
  }, [selectedGateway, onSelectGateway]);

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-text-primary tracking-tight flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-brand-primary" />
          <span>Payment Gateway</span>
        </label>
        <span className="text-[11px] text-text-muted flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          100% Encrypted &amp; RBI Compliant
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {/* Razorpay Verified Standard Gateway */}
        <div
          className={`relative min-h-[48px] p-3 rounded-xl border text-left transition-all duration-200 flex items-start gap-3 select-none border-brand-primary bg-brand-primary/5 shadow-xs ring-1 ring-brand-primary/30 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          aria-label="Razorpay Payment Gateway"
        >
          <div className="w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 border-brand-primary bg-brand-primary text-white">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                Razorpay
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 border border-sky-500/20 font-medium">
                  Verified In-App Gateway
                </span>
              </span>
            </div>
            <p className="text-[11px] text-text-muted leading-tight truncate">
              Instant UPI (GPay, PhonePe, Paytm, QR), RuPay, Credit/Debit Cards &amp; NetBanking
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
