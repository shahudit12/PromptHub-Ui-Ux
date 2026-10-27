import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Scale,
  ExternalLink 
} from 'lucide-react';

export interface ProfileHealthCardProps {
  strikesCount?: number;
  maxStrikes?: number;
  status?: 'good' | 'warning' | 'suspended';
  onOpenGuidelines?: () => void;
}

export const ProfileHealthCard: React.FC<ProfileHealthCardProps> = ({
  strikesCount = 0,
  maxStrikes = 3,
  onOpenGuidelines,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const strikes = Math.min(strikesCount, maxStrikes);
  const remaining = maxStrikes - strikes;

  return (
    <div className="bg-bg-secondary rounded-xl border border-border-default p-5 shadow-xs space-y-4 text-left">
      {/* Top Banner Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
            strikes === 0
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              : strikes === 1
              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              : 'bg-red-500/10 text-red-600 border-red-500/20'
          }`}>
            {strikes === 0 ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-text-primary">Account Standing &amp; Policy Health</h4>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                strikes === 0
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : strikes === 1
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30'
              }`}>
                {strikes === 0 ? 'Good Standing' : `${strikes}/${maxStrikes} Strikes Active`}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {strikes === 0
                ? 'Your account has 0 strikes and full platform publishing & monetization privileges.'
                : `You have ${strikes} policy strike. ${remaining} more strike(s) will result in account restriction.`}
            </p>
          </div>
        </div>

        {/* Strike Meter Chips */}
        <div className="flex items-center gap-1.5 shrink-0">
          {[1, 2, 3].map((num) => {
            const isStrikeActive = num <= strikes;
            return (
              <div
                key={num}
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold border transition-colors ${
                  isStrikeActive
                    ? 'bg-red-500 text-white border-red-600 shadow-2xs'
                    : 'bg-bg-tertiary text-text-muted border-border-default'
                }`}
                title={isStrikeActive ? `Active Strike #${num}` : `Strike slot #${num} (Clean)`}
              >
                {num}
              </div>
            );
          })}
        </div>
      </div>

      {/* Guidelines Policy Accordion Toggle */}
      <div className="border-t border-border-default pt-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer min-h-[44px]"
        >
          <span className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-brand-primary" />
            <span>Community Guidelines &amp; Anti-Abuse Standards</span>
          </span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isExpanded && (
          <div className="mt-3 p-3.5 rounded-xl bg-bg-primary border border-border-default text-xs space-y-2.5 leading-relaxed text-text-secondary">
            <p className="text-text-primary font-medium">
              To keep PromptHub safe for all builders and creators, we enforce a strict 3-strike policy:
            </p>
            <ul className="space-y-1.5 list-disc pl-4 text-text-secondary">
              <li><strong>Malicious Code or Jailbreaks:</strong> Prompts generating exploits, spyware, or harmful bypasses are strictly prohibited.</li>
              <li><strong>Copyright &amp; Impersonation:</strong> Do not list templates infringing trademarks or proprietary IP without ownership.</li>
              <li><strong>Marketplace Authenticity:</strong> Misleading listings, fake execution benchmarks, or deceptive pricing lead to immediate delisting.</li>
            </ul>
            <p className="text-[11px] font-mono text-text-muted pt-1">
              Active strikes automatically expire after 90 days of clean community participation.
            </p>
            {onOpenGuidelines && (
              <div className="pt-2 border-t border-border-default">
                <button
                  type="button"
                  onClick={onOpenGuidelines}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                >
                  <span>Review Official Platform Terms &amp; Guidelines</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
