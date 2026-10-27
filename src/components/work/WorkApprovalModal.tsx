import React from 'react';
import { createPortal } from 'react-dom';
import { 
  ShieldAlert, 
  Check, 
  X, 
  AlertTriangle
} from 'lucide-react';
import type { WorkApproval } from '../../types/work';

interface WorkApprovalModalProps {
  isOpen: boolean;
  approval: WorkApproval | null;
  onApprove: (approvalId: string) => void;
  onDeny: (approvalId: string) => void;
  onClose?: () => void;
}

export const WorkApprovalModal: React.FC<WorkApprovalModalProps> = ({
  isOpen,
  approval,
  onApprove,
  onDeny,
  onClose,
}) => {
  if (!isOpen || !approval) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div 
        className="w-full max-w-lg bg-bg-secondary border border-border-default rounded-xl shadow-xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold">
                Approval Required
              </span>
              <span className="text-xs text-text-muted font-mono">{approval.actionType}</span>
            </div>
            <h2 id="approval-title" className="text-base font-semibold text-text-primary tracking-tight">
              {approval.title}
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5">
          <p className="text-xs text-text-secondary leading-relaxed">
            {approval.description}
          </p>

          {/* Details / Payload inspector */}
          {approval.details && Object.keys(approval.details).length > 0 && (
            <div className="p-3 bg-bg-primary rounded-lg border border-border-subtle text-xs font-mono">
              <div className="text-[10px] text-text-muted uppercase mb-1 font-sans font-semibold">
                Action Payload Details
              </div>
              <pre className="text-text-primary overflow-x-auto whitespace-pre-wrap text-[11px] leading-relaxed">
                {JSON.stringify(approval.details, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-lg text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>This action requires explicit human permission before the agent can proceed.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-bg-tertiary/40 border-t border-border-subtle flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              onDeny(approval.id);
              onClose?.();
            }}
            className="min-h-[44px] px-4 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Deny Action</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onApprove(approval.id);
              onClose?.();
            }}
            className="min-h-[44px] px-4 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Approve &amp; Continue</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
