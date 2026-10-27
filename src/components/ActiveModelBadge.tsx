import React, { useMemo } from 'react';
import { Sparkles, Key, Cpu, ChevronRight } from 'lucide-react';
import { smartModelResolver, type AIFeatureId, type SelectionMode } from '../services/ai/smartModelResolver';
import { modelCatalogService } from '../services/modelCatalogService';

interface ActiveModelBadgeProps {
  modelId: string;
  feature?: AIFeatureId;
  selectionMode?: SelectionMode;
  onClick?: () => void;
  className?: string;
}

export const ActiveModelBadge: React.FC<ActiveModelBadgeProps> = ({
  modelId,
  feature = 'ide',
  selectionMode = 'automatic',
  onClick,
  className = '',
}) => {
  const resolved = useMemo(() => {
    const res = smartModelResolver.resolveSmartDefaultModel(feature, {
      explicitModelId: modelId,
      selectionMode,
    });
    if (res.status === 'resolved') {
      return res.model;
    }
    const catalog = modelCatalogService.getCachedCatalog();
    const match = catalog.find(m => m.id === modelId || m.canonicalId === modelId);
    return {
      providerId: match?.providerId || 'openai',
      modelId,
      canonicalId: match?.canonicalId || modelId,
      name: match?.name || modelId,
      source: (match?.isFree ? 'prompthub-free' : 'recommended') as any,
      selectionReason: 'Active Model',
      executable: true,
      selectionMode,
      isFreeForUser: Boolean(match?.isFree),
      isPlatformCreditDeducted: !match?.isFree,
      capabilityMatchScore: 80,
      contextLength: match?.contextLength || 128000,
      badgeText: match?.isFree ? 'Free AI' : 'Active Model',
      badgeColor: match?.isFree ? 'teal' : 'zinc',
    };
  }, [modelId, feature, selectionMode]);

  const isBYOK = resolved.source === 'user-configured';
  const isFree = resolved.isFreeForUser || resolved.source === 'prompthub-free';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-all select-none group border border-border-default bg-bg-tertiary hover:bg-bg-secondary hover:border-border-hover min-h-[38px] max-w-full overflow-hidden text-left cursor-pointer ${className}`}
      title={`${resolved.name} • ${resolved.selectionReason} • Click to change`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isBYOK ? (
          <Key className="w-3.5 h-3.5 text-brand-primary dark:text-[#41A2D9] shrink-0" />
        ) : isFree ? (
          <Sparkles className="w-3.5 h-3.5 text-brand-primary dark:text-[#41A2D9] shrink-0" />
        ) : (
          <Cpu className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary shrink-0" />
        )}
        <span className="font-semibold text-text-primary truncate text-xs" title={resolved.name}>
          {resolved.name}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isBYOK ? (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border border-brand-primary/20 whitespace-nowrap">
            BYOK
          </span>
        ) : isFree ? (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border border-brand-primary/20 whitespace-nowrap">
            Free AI
          </span>
        ) : (
          <span className="text-[10px] font-mono font-medium text-text-muted whitespace-nowrap hidden xs:inline">
            Platform AI
          </span>
        )}

        {onClick && (
          <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
        )}
      </div>
    </button>
  );
};
export default ActiveModelBadge;
