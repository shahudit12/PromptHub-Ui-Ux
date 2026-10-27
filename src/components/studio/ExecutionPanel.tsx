import React, { useState, useRef, useMemo } from 'react';
import { 
  RefreshCw, 
  Clock, 
  Coins, 
  Hash, 
  Copy, 
  Check, 
  Terminal, 
  Loader2, 
  Square, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2,
  Zap,
  Sparkles,
  ArrowRight,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Download,
  RotateCw,
  AlertTriangle
} from 'lucide-react';
import { ThoughtChain } from '../ai/ThoughtChain';
import { formatModelDisplayName, formatModelShortName, getPlatformModifierKey } from '../../utils/modelFormatting';
import { VoiceGateway } from '../../services/voice/voiceGateway';
import { securityUtils } from '../../utils/security';
import { useApp } from '../../context/AppContext';
import { isPaidUser } from '../../utils/isPaidUser';

export interface ExecutionPanelProps {
  output: string;
  reasoning?: string;
  isExecuting: boolean;
  selectedModel: string;
  latencyMs: number;
  /**
   * Provider-reported total tokens, or null when the provider reported none.
   * Never an estimate — the caller must not substitute a character count.
   */
  tokensCount: number | null;
  /**
   * Catalog-derived cost for the run, or null when the provider reported no token
   * usage so no cost could be computed.
   */
  estimatedCost: number | null;
  provider?: string;
  fineTunedPrompt?: string;
  taskClassification?: {
    domain: string;
    label: string;
    recommendedFramework: string;
  };
  isTruncated?: boolean;
  onContinue?: () => void;
  onApplyFineTunedPrompt?: (promptText: string) => void;
  onOpenInAnalyzer?: (promptText: string) => void;
  onRetry: () => void;
  onStop?: () => void;
  onUpgrade?: () => void;
  layoutMode?: 'split' | 'editor' | 'output';
  onToggleLayout?: () => void;
}

/**
 * Enriches raw HTML deliverable emitted by AI models to guarantee:
 * 1. Single-file HTML5 shell if model emitted a snippet or omitted tags.
 * 2. Tailwind CSS CDN script injection if not already present.
 * 3. Lucide Icons CDN script and auto-initialization script.
 * 4. Google Fonts (Inter, Outfit, JetBrains Mono) with modern typography reset.
 * 5. Replacement of broken/stale placeholder links (e.g., via.placeholder.com) with Unsplash.
 */
export function enrichDeliverableHtml(rawHtml: string): string {
  if (!rawHtml || !rawHtml.trim()) return rawHtml;

  let processed = rawHtml.trim();

  // 0. Strip triple-quotes or markdown fences if present around the raw HTML
  processed = processed.replace(/^"""(?:html)?\s*/i, '').replace(/"""\s*$/i, '');
  if (/^```(?:html)?\s*\n/i.test(processed)) {
    processed = processed.replace(/^```(?:html)?\s*\n/i, '');
    processed = processed.replace(/\n```\s*$/i, '');
  }
  processed = processed.trim();

  // 1. Replace broken or deprecated placeholder services with reliable Unsplash assets
  processed = processed.replace(
    /https?:\/\/via\.placeholder\.com\/(\d+)x?(\d+)?(?:\/[a-zA-Z0-9]+)?(?:\?text=[^"'\s]*)?/gi,
    (_match, w, h) => {
      const width = w || '800';
      const height = h || '600';
      return `https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
    }
  );

  // 2. Determine if it's already a full HTML document
  const hasHtmlTag = /<html[\s>]/i.test(processed);
  const hasHeadTag = /<head[\s>]/i.test(processed);
  const hasBodyTag = /<body[\s>]/i.test(processed);

  // 3. Prepare CDN scripts & fonts & resilient modern base styling
  const tailwindCdn = '<script src="https://cdn.tailwindcss.com"></script>';
  const lucideCdn = '<script src="https://unpkg.com/lucide@latest"></script>';
  const resilientStylesAndConfig = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    background-color: #1F2A34;
    color: #F8FBFE;
    margin: 0;
  }
  code, pre, .font-mono { font-family: 'JetBrains Mono', monospace; }
  a {
    color: #88BDF2;
    text-decoration: none;
    transition: color 0.15s ease;
  }
  a:hover {
    color: #BDDDFC;
    text-decoration: underline;
  }
  button { font-family: inherit; cursor: pointer; }
  img { max-width: 100%; height: auto; }
</style>
<script>
  window.tailwind = window.tailwind || {};
  window.tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          brand: {
            DEFAULT: '#6366F1',
            primary: '#6366F1',
            secondary: '#10B981',
            dark: '#0B0F17'
          }
        }
      }
    }
  };
  window.addEventListener('DOMContentLoaded', function() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  });
  setTimeout(function() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }, 400);
</script>`.trim();

  // Helper to ensure truncated documents are closed cleanly and resiliently
  const ensureClosedTags = (htmlContent: string): string => {
    let closed = htmlContent;
    // Heal unclosed script or style blocks if cut off mid-stream
    const openScripts = (closed.match(/<script[\s>]/gi) || []).length;
    const closeScripts = (closed.match(/<\/script>/gi) || []).length;
    if (openScripts > closeScripts) {
      closed += '\n</script>';
    }

    const openStyles = (closed.match(/<style[\s>]/gi) || []).length;
    const closeStyles = (closed.match(/<\/style>/gi) || []).length;
    if (openStyles > closeStyles) {
      closed += '\n</style>';
    }

    // Heal unclosed structural containers
    const openDivs = (closed.match(/<div[\s>]/gi) || []).length;
    const closeDivs = (closed.match(/<\/div>/gi) || []).length;
    if (openDivs > closeDivs) {
      closed += '</div>'.repeat(Math.min(openDivs - closeDivs, 10));
    }

    if (hasBodyTag && !/<\/body>/i.test(closed)) {
      closed += '\n</body>';
    }
    if (hasHtmlTag && !/<\/html>/i.test(closed)) {
      closed += '\n</html>';
    }
    return closed;
  };

  // If already a complete HTML document with <head>, inject CDN tags and resilient styles before </head>
  if (hasHeadTag) {
    let headAdditions = '';
    if (!processed.includes('cdn.tailwindcss.com') && !processed.includes('tailwindcss')) {
      headAdditions += `\n  ${tailwindCdn}`;
    }
    if (!processed.includes('unpkg.com/lucide') && !processed.includes('lucide.createIcons')) {
      headAdditions += `\n  ${lucideCdn}`;
    }
    if (!processed.includes('fonts.googleapis.com')) {
      headAdditions += `\n  ${resilientStylesAndConfig}`;
    } else {
      // Still inject the resilient CSS reset if not already included
      headAdditions += `\n  <style>a { color: #88BDF2; text-decoration: none; } a:hover { color: #BDDDFC; text-decoration: underline; }</style>`;
    }
    if (headAdditions) {
      processed = processed.replace(/<\/head>/i, `${headAdditions}\n</head>`);
    }
    return ensureClosedTags(processed);
  }

  // If has <html> or <body> but no <head>
  if (hasHtmlTag || hasBodyTag) {
    const headBlock = `\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  ${tailwindCdn}\n  ${lucideCdn}\n  ${resilientStylesAndConfig}\n</head>\n`;
    if (hasHtmlTag) {
      return ensureClosedTags(processed.replace(/<html([^>]*)>/i, `<html$1>${headBlock}`));
    }
    return ensureClosedTags(`<!DOCTYPE html>\n<html lang="en">\n${headBlock}\n${processed}\n</html>`);
  }

  // Otherwise, it's a bare HTML fragment or snippet (e.g. just <div>...</div>)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PromptHub Deliverable</title>
  ${tailwindCdn}
  ${lucideCdn}
  ${resilientStylesAndConfig}
</head>
<body class="bg-[#1F2A34] text-[#F8FBFE] min-h-screen p-4 sm:p-6 antialiased">
  ${processed}
</body>
</html>`;
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  output,
  reasoning,
  isExecuting,
  selectedModel,
  latencyMs,
  tokensCount,
  estimatedCost,
  provider,
  fineTunedPrompt,
  taskClassification,
  isTruncated,
  onContinue,
  onApplyFineTunedPrompt,
  onOpenInAnalyzer,
  onRetry,
  onStop,
  onUpgrade,
  layoutMode = 'split',
  onToggleLayout,
}) => {
  const { setActiveTab: setAppTab, user } = useApp();
  const isPaid = isPaidUser(user);

  const handleUpgradeClick = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      setAppTab('pricing');
    }
  };

  const [activeTab, setActiveTab] = useState<'deliverable' | 'finetuned' | 'preview'>('deliverable');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewKey, setPreviewKey] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [copiedFineTuned, setCopiedFineTuned] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const modifierKey = getPlatformModifierKey();
  const friendlyName = formatModelShortName(selectedModel, 24);
  const fullModelName = formatModelDisplayName(selectedModel);

  // Extract HTML deliverable from output for Live Sandboxed Preview
  const extractedHtml = useMemo(() => {
    if (!output) return null;
    // 1. Check for complete ```html / ```xml code block
    const blockMatch = output.match(/```(?:html|htm|xml)\n?([\s\S]*?)```/i);
    if (blockMatch && blockMatch[1]?.trim()) {
      return blockMatch[1].trim();
    }
    // 2. Check for unclosed ```html block (in-flight or truncated)
    const unclosedMatch = output.match(/```(?:html|htm|xml)\n?([\s\S]*)$/i);
    if (
      unclosedMatch &&
      unclosedMatch[1]?.trim() &&
      (unclosedMatch[1].includes('<html') ||
        unclosedMatch[1].includes('<!DOCTYPE') ||
        unclosedMatch[1].includes('<div') ||
        unclosedMatch[1].includes('<body'))
    ) {
      return unclosedMatch[1].trim();
    }
    // 3. Check for <!DOCTYPE html> document anywhere in text
    const docMatch = output.match(/(<!DOCTYPE html[\s\S]*?(?:<\/html>|$))/i);
    if (docMatch && docMatch[1]?.trim()) {
      return docMatch[1].trim();
    }
    // 4. Check for <html tag anywhere in text
    const tagMatch = output.match(/(<html[\s\S]*?(?:<\/html>|$))/i);
    if (tagMatch && tagMatch[1]?.trim()) {
      return tagMatch[1].trim();
    }
    return null;
  }, [output]);

  // Memoize enriched HTML for iframe preview, export, and tab opening
  const previewHtml = useMemo(() => {
    return extractedHtml ? enrichDeliverableHtml(extractedHtml) : null;
  }, [extractedHtml]);

  // Detect if output cut off prematurely due to token budget or unclosed fences
  const isLikelyTruncated = useMemo(() => {
    if (isExecuting) return false;
    if (isTruncated) return true;
    if (!output || output.length < 200) return false;
    const fenceCount = (output.match(/```/g) || []).length;
    if (fenceCount % 2 !== 0) return true;
    const trimmed = output.trim();
    if (trimmed.endsWith('...') || trimmed.endsWith('…')) return true;
    // Check if ending inside an unclosed HTML tag like `<p class="...` or `<div`
    if (/<[a-zA-Z0-9_-]+(?:\s+[^>]*)?$/.test(trimmed)) return true;
    return false;
  }, [output, isExecuting, isTruncated]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInNewTab = () => {
    const htmlToRender = previewHtml || extractedHtml;
    if (!htmlToRender) return;
    const blob = new Blob([htmlToRender], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleDownloadHtml = () => {
    const htmlToRender = previewHtml || extractedHtml;
    if (!htmlToRender) return;
    const blob = new Blob([htmlToRender], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompthub-deliverable.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleSpeak = async () => {
    if (isSpeaking) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      return;
    }

    if (!output.trim()) return;
    setIsSpeaking(true);

    try {
      const speechRes = await VoiceGateway.synthesize(output.slice(0, 1000));
      if (speechRes.audioUrl) {
        const audio = new Audio(speechRes.audioUrl);
        audioPlayerRef.current = audio;
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch {
      setIsSpeaking(false);
    }
  };

  const isAICredits = provider?.toLowerCase().includes('aicredits') || provider?.toLowerCase().includes('premium');
  const isBYOK = provider?.toLowerCase().includes('byok') || provider?.toLowerCase().includes('direct') || provider?.toLowerCase().includes('gateway');

  // Format and sanitize output with preserved code block formatting and syntax badges
  const renderedOutputHtml = useMemo(() => {
    if (!output) return '';

    // Auto-heal unclosed markdown code fences if odd count so formatting never collapses into raw escaped tags
    let safeOutput = output;
    const fenceCount = (safeOutput.match(/```/g) || []).length;
    if (fenceCount % 2 !== 0) {
      safeOutput += '\n```';
    }

    const codeBlocks: string[] = [];
    let processed = safeOutput.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const langLabel = lang
        ? `<div class="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-text-muted pb-1 mb-2 border-b border-border-default/40 font-semibold select-none"><span>${lang}</span></div>`
        : '';
      const blockHtml = `<pre class="bg-bg-primary/90 p-3.5 sm:p-4 rounded-xl my-3 font-mono text-xs overflow-x-auto border border-border-default/80 text-text-primary leading-relaxed shadow-3xs select-text"><code>${langLabel}${escapedCode}</code></pre>`;
      codeBlocks.push(blockHtml);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    processed = processed
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    processed = processed.replace(
      /`([^`\n]+)`/g,
      '<code class="bg-bg-tertiary px-1.5 py-0.5 rounded font-mono text-xs text-brand-primary border border-border-default font-medium">$1</code>'
    );

    processed = processed.replace(/\n/g, '<br />');

    codeBlocks.forEach((block, idx) => {
      processed = processed.replace(`__CODE_BLOCK_${idx}__`, block);
    });

    return securityUtils.sanitizeHtml(processed);
  }, [output]);

  // Compute live output stats
  const outputStats = useMemo(() => {
    if (!output) return null;
    const chars = output.length;
    const words = output.trim().split(/\s+/).filter(Boolean).length;
    const lines = output.split('\n').length;
    return { chars, words, lines };
  }, [output]);

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-bg-secondary overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 h-11 min-h-[44px] border-b border-border-default bg-bg-secondary shrink-0 select-none min-w-0 overflow-hidden">
        {/* Left Tabs & Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
          <div className="flex bg-bg-tertiary p-0.5 rounded-lg border border-border-default select-none shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => setActiveTab('deliverable')}
              className={`px-2.5 py-1 rounded text-xs font-semibold font-sans transition-all cursor-pointer min-h-[44px] sm:min-h-[30px] flex items-center gap-1.5 shrink-0 ${
                activeTab === 'deliverable'
                  ? 'bg-bg-secondary text-text-primary shadow-xs font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span className="whitespace-nowrap">Deliverable Output</span>
            </button>

            {/* Live Interactive Preview Tab (Visible whenever HTML deliverable is detected) */}
            {extractedHtml && (
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1 rounded text-xs font-semibold font-sans transition-all cursor-pointer min-h-[44px] sm:min-h-[30px] flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'preview'
                    ? 'bg-bg-secondary text-brand-primary shadow-xs font-bold'
                    : 'text-text-muted hover:text-brand-primary'
                }`}
                title="Launch Sandboxed Interactive Web App Preview"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="whitespace-nowrap">Live Preview</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            )}

            {fineTunedPrompt && (
              <button
                type="button"
                onClick={() => setActiveTab('finetuned')}
                className={`px-2.5 py-1 rounded text-xs font-semibold font-sans transition-all cursor-pointer min-h-[44px] sm:min-h-[30px] flex items-center gap-1.5 shrink-0 min-w-0 ${
                  activeTab === 'finetuned'
                    ? 'bg-bg-secondary text-text-primary shadow-xs font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title={`Fine-Tuned Prompt (${taskClassification?.recommendedFramework || 'DeliverableContract'})`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="whitespace-nowrap">Fine-Tuned Prompt</span>
                <span
                  className="hidden sm:inline-block text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-brand-primary/10 text-brand-primary max-w-[70px] md:max-w-[90px] xl:max-w-[110px] truncate align-middle shrink-0"
                  title={`Framework: ${taskClassification?.recommendedFramework || 'CO-STAR'}`}
                >
                  {taskClassification?.recommendedFramework || 'CO-STAR'}
                </span>
              </button>
            )}
          </div>

          {/* Active Model Name Pill (Visible on wide screens or when pane is maximized) */}
          <span
            className={`${layoutMode === 'output' ? 'inline' : 'hidden 2xl:inline'} text-[10px] font-mono px-2 py-0.5 rounded-md bg-brand-primary-light text-brand-primary font-medium truncate max-w-[130px] shrink-0`}
            title={`Active Model: ${fullModelName} (${selectedModel})`}
          >
            {friendlyName}
          </span>

          {/* Execution Route Badge */}
          {provider && (
            <span
              className={`text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded-md border font-medium flex items-center gap-1 shrink-0 ${
                isAICredits
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                  : isBYOK
                  ? 'bg-brand-primary/10 text-brand-primary dark:text-[#80DEEA] border-brand-primary/20'
                  : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
              }`}
              title={`Execution route: ${provider}`}
            >
              <span>{isAICredits ? '💎' : isBYOK ? '🔑' : '🆓'}</span>
              <span className={`${layoutMode === 'output' ? 'inline' : 'hidden xl:inline'}`}>
                {isAICredits ? 'Credits' : isBYOK ? 'BYOK' : 'Free'}
              </span>
            </span>
          )}
        </div>

        {/* Telemetry Chips & Responsive Layout Maximizer (Pinned Right) */}
        <div data-tour="tour-execution-metrics" className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-mono text-text-muted shrink-0 ml-auto pl-1.5 bg-bg-secondary z-10">
          {latencyMs > 0 && (
            <span className="flex items-center gap-1 whitespace-nowrap shrink-0 px-1.5 py-0.5 rounded bg-bg-tertiary/60 border border-border-default/60" title="Execution Latency">
              <Clock className="w-3 h-3 text-text-muted shrink-0" />
              <span>{(latencyMs / 1000).toFixed(2)}s</span>
            </span>
          )}
          {tokensCount !== null && tokensCount > 0 && (
            <span className="hidden md:flex items-center gap-1 whitespace-nowrap shrink-0 px-1.5 py-0.5 rounded bg-bg-tertiary/60 border border-border-default/60" title="Provider-reported token usage">
              <Hash className="w-3 h-3 text-text-muted shrink-0" />
              <span>{tokensCount.toLocaleString()} tok</span>
            </span>
          )}
          {estimatedCost !== null && estimatedCost > 0 && (
            <span className="flex items-center gap-1 text-brand-primary dark:text-[#80DEEA] font-semibold whitespace-nowrap shrink-0 px-1.5 py-0.5 rounded bg-brand-primary/5 border border-brand-primary/20" title="Incurred Cost">
              <Coins className="w-3 h-3 text-brand-primary dark:text-[#80DEEA] shrink-0" />
              <span>${estimatedCost < 0.01 ? estimatedCost.toFixed(4) : estimatedCost.toFixed(2)}</span>
            </span>
          )}
          {onToggleLayout && (
            <button
              type="button"
              onClick={onToggleLayout}
              className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center shrink-0 ml-0.5"
              title={layoutMode === 'output' ? 'Restore split view' : 'Maximize output view'}
              aria-label={layoutMode === 'output' ? 'Restore split view' : 'Maximize output view'}
            >
              {layoutMode === 'output' ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Output Content Area */}
      <div data-tour="tour-execution-output" className="flex-1 overflow-hidden flex flex-col min-h-0 bg-bg-secondary select-text">
        {activeTab === 'preview' && extractedHtml ? (
          /* ── LIVE INTERACTIVE PREVIEW TAB VIEW ── */
          <div className="flex flex-col flex-1 h-full min-h-0 bg-bg-primary">
            {/* Preview Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-bg-tertiary border-b border-border-default text-xs shrink-0 select-none min-h-[44px]">
              {/* Responsive Viewport Switchers */}
              <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-border-default">
                <button
                  type="button"
                  onClick={() => setViewportMode('desktop')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer min-h-[36px] sm:min-h-[28px] ${
                    viewportMode === 'desktop'
                      ? 'bg-bg-primary text-text-primary font-bold shadow-2xs'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  title="Desktop Viewport (100% width)"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewportMode('tablet')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer min-h-[36px] sm:min-h-[28px] ${
                    viewportMode === 'tablet'
                      ? 'bg-bg-primary text-text-primary font-bold shadow-2xs'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  title="Tablet Viewport (768px width)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tablet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewportMode('mobile')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer min-h-[36px] sm:min-h-[28px] ${
                    viewportMode === 'mobile'
                      ? 'bg-bg-primary text-text-primary font-bold shadow-2xs'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                  title="Mobile Viewport (375px width)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mobile</span>
                </button>
              </div>

              {/* Preview Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewKey((k) => k + 1)}
                  className="p-1.5 rounded-lg bg-bg-secondary hover:bg-bg-primary border border-border-default text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[36px] sm:min-h-[28px] flex items-center gap-1 px-2 font-medium"
                  title="Reload Live Preview"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Reload</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="p-1.5 rounded-lg bg-bg-secondary hover:bg-bg-primary border border-border-default text-text-muted hover:text-text-primary transition-colors cursor-pointer min-h-[36px] sm:min-h-[28px] flex items-center gap-1 px-2 font-medium"
                  title="Download HTML file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Export HTML</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="p-1.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/30 transition-colors cursor-pointer min-h-[36px] sm:min-h-[28px] flex items-center gap-1 px-2.5 font-bold"
                  title="Open in Full Browser Window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Tab</span>
                </button>
              </div>
            </div>

            {/* Sandboxed Iframe Container */}
            <div className="flex-1 flex justify-center items-center bg-[#090D14] p-2 sm:p-4 overflow-auto min-h-0">
              <div
                className={`h-full transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border border-border-default/60 bg-white flex flex-col ${
                  viewportMode === 'desktop'
                    ? 'w-full'
                    : viewportMode === 'tablet'
                    ? 'w-[768px] max-w-full'
                    : 'w-[375px] max-w-full'
                }`}
              >
                <iframe
                  key={previewKey}
                  srcDoc={previewHtml || extractedHtml}
                  title="PromptHub Studio Deliverable Preview"
                  sandbox="allow-scripts allow-modals allow-same-origin"
                  className="w-full h-full border-0 bg-white flex-1"
                />
              </div>
            </div>
          </div>
        ) : activeTab === 'finetuned' && fineTunedPrompt ? (
          /* ── FINE-TUNED PROMPT TAB VIEW ── */
          <div className="p-4 sm:p-6 space-y-4 flex flex-col h-full overflow-y-auto">
            {/* Header / Info Pill */}
            <div className="p-3.5 rounded-xl bg-bg-tertiary border border-border-default space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-bold text-text-primary font-mono">
                    Autonomous Multi-Agent Synthesis
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-primary-light text-brand-primary font-semibold">
                    {taskClassification?.label || 'General Task'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-semibold">
                    Framework: {taskClassification?.recommendedFramework || 'DeliverableContract'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-text-muted">
                  Anti-Conversational Direct Execution
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                This production-engineered prompt template was synthesized in the backend to ensure models deliver complete, high-fidelity deliverables immediately without asking questions or providing vague outlines.
              </p>
            </div>

            {/* Prompt Code Block */}
            <div className="flex-1 min-h-[200px] flex flex-col bg-bg-primary border border-border-default rounded-xl overflow-hidden shadow-xs">
              <div className="flex items-center justify-between px-3 py-2 bg-bg-tertiary border-b border-border-default">
                <span className="text-[11px] font-mono text-text-muted font-medium">Fine-Tuned Production Template</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(fineTunedPrompt);
                    setCopiedFineTuned(true);
                    setTimeout(() => setCopiedFineTuned(false), 2000);
                  }}
                  className="flex items-center gap-1 text-[11px] font-mono text-text-secondary hover:text-brand-primary cursor-pointer transition-colors min-h-[34px] px-2"
                >
                  {copiedFineTuned ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFineTuned ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="flex-1 p-3.5 text-xs font-mono text-text-primary whitespace-pre-wrap leading-relaxed overflow-y-auto select-text">
                {fineTunedPrompt}
              </pre>
            </div>

            {/* Action Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {onApplyFineTunedPrompt && (
                <button
                  type="button"
                  onClick={() => onApplyFineTunedPrompt(fineTunedPrompt)}
                  className="flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[44px]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply to Studio Editor</span>
                </button>
              )}
              {onOpenInAnalyzer && (
                <button
                  type="button"
                  onClick={() => onOpenInAnalyzer(fineTunedPrompt)}
                  className="flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-text-primary text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Analyze in Prompt Audit &rarr;</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── DELIVERABLE OUTPUT TAB VIEW ── */
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 min-h-0 select-text">
            {/* Reasoning Trace (DeepSeek-R1 / o1 / o3-mini) */}
            {reasoning && (
              <ThoughtChain
                thinkingText={reasoning}
                isThinking={isExecuting}
                durationSeconds={latencyMs / 1000}
              />
            )}

            {/* Truncation Alert & "Continue Generating" Banner */}
            {isLikelyTruncated && onContinue && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold leading-tight">Output truncated at maximum token limit</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-tight mt-0.5">
                      Click below to generate the remaining code from the exact cutoff point.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={isExecuting}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px] sm:min-h-[34px] shrink-0"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ Continue Generating</span>
                </button>
              </div>
            )}

            {/* Quick Link to Live Preview if HTML is detected */}
            {extractedHtml && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold">Interactive Web Deliverable Ready</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 hover:underline min-h-[34px] px-2 cursor-pointer"
                >
                  <span>Launch Live Preview &rarr;</span>
                </button>
              </div>
            )}

            {/* Deliverable Badge (When fine-tuned prompt was used) */}
            {output && fineTunedPrompt && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs min-w-0">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium min-w-0 flex-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate" title={`Autonomous Deliverable Completed (${taskClassification?.label || 'Production'})`}>
                    Autonomous Deliverable Completed{' '}
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-normal">
                      ({taskClassification?.label || 'Production'})
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('finetuned')}
                  className="shrink-0 text-[11px] font-mono text-brand-primary hover:underline cursor-pointer flex items-center gap-1 self-end sm:self-auto min-h-[44px] sm:min-h-[28px]"
                >
                  <span className="whitespace-nowrap">View Fine-Tuned Prompt</span>
                  <ArrowRight className="w-3 h-3 shrink-0" />
                </button>
              </div>
            )}

            {/* Output Stream or Loading State */}
            {output ? (
              <div className="w-full h-full flex flex-col">
                {isExecuting && (
                  <div className="mb-3 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs font-sans shadow-2xs">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 min-w-0">
                      <Zap className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                      <span className="text-xs">
                        Generating output... <strong>For fast output, please upgrade your plan.</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleUpgradeClick}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hi transition-all cursor-pointer min-h-[44px] sm:min-h-[30px] shrink-0"
                      style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Upgrade Plan</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div
                  data-execution-output="true"
                  className="w-full text-sm sm:text-[15px] leading-relaxed text-text-primary break-words font-sans selection:bg-brand-primary-light selection:text-brand-primary"
                  dangerouslySetInnerHTML={{ __html: renderedOutputHtml }}
                />
                {isExecuting && (
                  <span className="inline-block w-2 h-4 ml-1 bg-brand-primary animate-pulse align-middle" />
                )}
              </div>
            ) : isExecuting ? (
              <div className="flex flex-col items-center justify-center min-h-[240px] text-text-muted text-xs font-mono space-y-3.5 my-auto select-none">
                <Loader2 className="w-7 h-7 animate-spin text-brand-primary" />
                <p className="font-medium text-text-primary text-sm font-sans">Generating deliverable with {friendlyName}...</p>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-text-muted">Elapsed: {(latencyMs / 1000).toFixed(1)}s</span>
                  {onStop && (
                    <button
                      type="button"
                      onClick={onStop}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px] sm:min-h-[32px]"
                      title="Stop AI Generation"
                    >
                      <Square className="w-2.5 h-2.5 fill-current" /> Stop
                    </button>
                  )}
                </div>

                {/* For fast output, please upgrade your plan */}
                <div className="flex flex-col items-center gap-2 max-w-sm w-full mx-auto text-center bg-amber-500/10 dark:bg-amber-500/10 px-4 py-3.5 rounded-xl border border-amber-500/25 shadow-xs transition-all duration-200 mt-2">
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold text-xs font-sans">
                    <Zap className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                    <span>For fast output, please upgrade your plan</span>
                  </div>
                  <p className="text-[11px] text-text-muted font-sans leading-relaxed">
                    {isPaid
                      ? 'Free community router models experience upstream queue delays. Switch to dedicated frontier models like Gemini 2.0 Flash or upgrade your tier for instantaneous throughput.'
                      : 'Free community models experience upstream queue delays. Upgrade your plan for instant sub-second output with dedicated frontier models.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleUpgradeClick}
                    className="mt-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-all duration-150 cursor-pointer min-h-[44px] sm:min-h-[34px]"
                    style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isPaid ? 'Explore Upgrades & Top-Up' : 'Upgrade Plan for Fast Output'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-text-muted text-xs text-center border border-dashed border-border-default/60 rounded-xl p-6 bg-bg-primary/30 select-none">
                <Terminal className="w-8 h-8 text-text-muted opacity-40 mb-2" />
                <p className="font-medium text-text-primary">No Execution Output Yet</p>
                <p className="text-[11px] text-text-muted mt-1 max-w-xs leading-relaxed">
                  Press <span className="text-text-secondary font-medium">"Run"</span> or <kbd className="px-1.5 py-0.5 bg-bg-secondary border border-border-default rounded font-mono text-[10px] text-text-primary">{modifierKey} + Enter</kbd> to execute prompt template.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Panel Footer Actions & Stats */}
      <div className="p-2 sm:p-2.5 px-3 sm:px-4 border-t border-border-default bg-bg-secondary flex items-center justify-between shrink-0 min-h-[52px] select-none gap-2">
        {output ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={onRetry}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[34px] shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
                <span>Rerun</span>
              </button>

              {outputStats && (
                <span className="hidden sm:inline text-[10.5px] font-mono text-text-muted truncate">
                  ~{outputStats.words} words · {outputStats.lines} lines · {outputStats.chars} chars
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={handleToggleSpeak}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[34px]"
                title="Read output aloud using AI Voice"
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                    <span className="hidden xs:inline">Stop Audio</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-brand-primary" />
                    <span className="hidden xs:inline">Listen</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[34px]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Output'}</span>
              </button>
            </div>
          </>
        ) : isExecuting ? (
          <div className="flex items-center justify-between w-full text-[11px] font-sans text-amber-700 dark:text-amber-300 gap-2 min-w-0">
            <span className="flex items-center gap-1.5 font-medium truncate min-w-0">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
              <span className="truncate">Generating output...</span>
            </span>
            <button
              type="button"
              onClick={handleUpgradeClick}
              className="text-brand-primary hover:underline font-semibold cursor-pointer whitespace-nowrap min-h-[44px] sm:min-h-[24px] flex items-center shrink-0 ml-auto"
            >
              Upgrade &rarr;
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full text-[11px] font-mono text-text-muted gap-2 min-w-0">
            <span className="shrink-0 flex items-center gap-1.5 font-sans font-medium text-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Ready for execution</span>
            </span>
            <span className="truncate text-right max-w-[200px]" title={`Target: ${friendlyName}`}>
              Target: <span className="text-text-primary font-mono">{friendlyName}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
