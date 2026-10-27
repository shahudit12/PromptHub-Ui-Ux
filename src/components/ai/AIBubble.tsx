import React, { useState, useMemo } from 'react';
import { Copy, Check, Bot, User, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { securityUtils } from '../../utils/security';
import { ThoughtChain } from './ThoughtChain';

export interface AIBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelName?: string;
  thinkingContent?: string;
  isStreaming?: boolean;
  latencyMs?: number;
  tokensUsed?: number;
  costEst?: number;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  fullWidth?: boolean;
  allowCollapse?: boolean;
}

export const AIBubble: React.FC<AIBubbleProps> = ({
  role,
  content,
  modelName,
  thinkingContent,
  isStreaming = false,
  latencyMs,
  tokensUsed,
  costEst,
  error,
  onRetry,
  className = '',
  fullWidth = false,
  allowCollapse = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const isAssistant = role === 'assistant';
  const isUser = role === 'user';
  const isLongContent = allowCollapse ? (content.length > 650 && !isStreaming) : false;
  const displayContent = isLongContent && !isExpanded ? content.slice(0, 380) + '...' : content;

  // Sanitize content before rendering with preserved code block formatting
  const sanitizedHtml = useMemo(() => {
    const codeBlocks: string[] = [];
    let processed = displayContent.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const langLabel = lang ? `<div class="text-[10px] font-mono uppercase tracking-wider text-text-muted pb-1 mb-1 border-b border-border-default/50 font-bold">${lang}</div>` : '';
      const blockHtml = `<pre class="bg-bg-tertiary/90 p-3 rounded-lg my-2 font-mono text-xs overflow-x-auto border border-border-default text-text-primary leading-relaxed select-text"><code>${langLabel}${escapedCode}</code></pre>`;
      codeBlocks.push(blockHtml);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    processed = processed
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    processed = processed.replace(/`([^`\n]+)`/g, '<code class="bg-bg-tertiary px-1.5 py-0.5 rounded font-mono text-xs text-brand-primary border border-border-default font-medium">$1</code>');

    processed = processed.replace(/\n/g, '<br />');

    codeBlocks.forEach((block, idx) => {
      processed = processed.replace(`__CODE_BLOCK_${idx}__`, block);
    });

    return securityUtils.sanitizeHtml(processed);
  }, [displayContent]);

  return (
    <div
      className={`flex gap-3 text-sm transition-all duration-200 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      } ${className}`}
    >
      {/* Avatar Icon */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
          isUser
            ? 'bg-bg-tertiary border-border-default text-text-primary'
            : 'bg-brand-primary border-brand-primary/20 text-white'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble Container */}
      <div
        className={`flex flex-col gap-1.5 min-w-0 ${
          fullWidth ? 'w-full max-w-none flex-1' : 'max-w-[85%] sm:max-w-[75%]'
        } ${isUser ? 'items-end' : 'items-start'}`}
      >
        {/* Header Badges */}
        <div className="flex items-center gap-2 px-1 text-[11px] text-text-muted">
          <span className="font-semibold text-text-secondary">
            {isUser ? 'You' : modelName || 'PromptHub AI'}
          </span>
          {latencyMs !== undefined && latencyMs > 0 && (
            <span className="font-mono">{(latencyMs / 1000).toFixed(2)}s</span>
          )}
          {tokensUsed !== undefined && tokensUsed > 0 && (
            <span className="font-mono">{tokensUsed} tokens</span>
          )}
          {costEst !== undefined && costEst > 0 && (
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">${costEst.toFixed(4)}</span>
          )}
        </div>

        {/* Optional Thinking / Reasoning Block for Reasoning Models */}
        {isAssistant && thinkingContent && (
          <ThoughtChain
            thinkingText={thinkingContent}
            isThinking={isStreaming && !content}
            className="w-full mb-1"
          />
        )}

        {/* Content Box */}
        <div
          className={`text-sm leading-relaxed transition-all w-full ${
            fullWidth
              ? 'px-0 py-1 border-none bg-transparent text-text-primary'
              : `rounded-2xl px-4 py-3 border ${
                  isUser
                    ? 'bg-brand-primary-light border-brand-primary/20 text-text-primary rounded-tr-sm'
                    : 'bg-bg-secondary border-border-default text-text-primary rounded-tl-sm shadow-xs'
                }`
          }`}
        >
          {error ? (
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <div
              data-ai-bubble-content="true"
              className="text-xs sm:text-sm text-text-primary max-w-none break-words leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          )}

          {isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-1 bg-brand-primary opacity-80 align-middle" />
          )}

          {isLongContent && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2.5 pt-2 border-t border-border-default/60 text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1 cursor-pointer transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Show less</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>View full output ({Math.round(content.length / 5)} words)</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Footer Actions */}
        {content && !error && (
          <div className="flex items-center gap-1.5 px-1 mt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary p-1 rounded hover:bg-bg-tertiary transition-colors cursor-pointer"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary p-1 rounded hover:bg-bg-tertiary transition-colors cursor-pointer ml-1"
                title="Regenerate response"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
