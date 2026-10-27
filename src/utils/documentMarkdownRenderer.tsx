import React, { useState } from 'react';
import { Download, Copy, Check, ExternalLink, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface RenderOptions {
  enableImageDownload?: boolean;
  onImageError?: (url: string) => void;
  className?: string;
}

/**
 * Parses inline markdown:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Inline code: `code`
 * - Links: [label](url)
 */
function parseInlineMarkdown(text: string, keyPrefix = 'inline'): React.ReactNode[] {
  if (!text) return [];

  // Match inline tokens: code, bold, italic, link
  // Order matters: code first, then bold, then links, then italic
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)]+\)|\*[^*]+\*|_[^_]+_)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  let idx = 0;
  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`${keyPrefix}_t_${idx++}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      const code = token.slice(1, -1);
      parts.push(
        <code
          key={`${keyPrefix}_c_${idx++}`}
          className="px-1.5 py-0.5 rounded font-mono text-[11px] bg-bg-tertiary border border-border-default text-brand-primary dark:text-[#41A2D9] font-medium"
        >
          {code}
        </code>
      );
    } else if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      const inner = token.slice(2, -2);
      parts.push(
        <strong key={`${keyPrefix}_b_${idx++}`} className="font-bold text-text-primary">
          {parseInlineMarkdown(inner, `${keyPrefix}_b_${idx}`)}
        </strong>
      );
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const linkMatch = token.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        const [, label, url] = linkMatch;
        parts.push(
          <a
            key={`${keyPrefix}_l_${idx++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary dark:text-[#41A2D9] hover:underline font-semibold inline-flex items-center gap-0.5 cursor-pointer"
          >
            <span>{label}</span>
            <ExternalLink className="w-2.5 h-2.5 inline ml-0.5 opacity-70" />
          </a>
        );
      } else {
        parts.push(<span key={`${keyPrefix}_raw_${idx++}`}>{token}</span>);
      }
    } else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      const inner = token.slice(1, -1);
      parts.push(
        <em key={`${keyPrefix}_i_${idx++}`} className="italic text-text-secondary">
          {parseInlineMarkdown(inner, `${keyPrefix}_i_${idx}`)}
        </em>
      );
    } else {
      parts.push(<span key={`${keyPrefix}_raw_${idx++}`}>{token}</span>);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={`${keyPrefix}_t_end`}>
        {text.substring(lastIndex)}
      </span>
    );
  }

  return parts;
}

/**
 * Interactive Code Block with 1-click Copy
 */
const CodeBlock: React.FC<{ language?: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const lines = code ? code.split('\n') : [];
  const totalLines = lines.length;
  const isCollapsible = totalLines > 10;
  const displayedCode = isCollapsible && !isExpanded ? lines.slice(0, 10).join('\n') : code;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const isWebCode = language && ['html', 'htm', 'jsx', 'tsx'].includes(language.toLowerCase());

  const handleOpenSandbox = () => {
    try {
      localStorage.setItem('ph_workspace_latest_html', code);
      window.open('/preview?id=sandbox', '_blank', 'noopener,noreferrer');
    } catch {}
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border-default bg-bg-secondary shadow-2xs font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-tertiary border-b border-border-default text-[10px] text-text-muted">
        <div className="flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-brand-primary dark:text-[#41A2D9]">
            {language || 'code'}
          </span>
          <span className="text-[9.5px] font-mono text-text-muted bg-bg-primary px-1.5 py-0.2 rounded border border-border-default">
            {totalLines} {totalLines === 1 ? 'line' : 'lines'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isWebCode && (
            <button
              type="button"
              onClick={handleOpenSandbox}
              className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-bg-primary text-text-secondary hover:text-brand-primary transition-colors cursor-pointer text-[10px]"
              title="Open full interactive preview"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Preview</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Copy code block"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <div className="relative">
        <pre className={`p-3 overflow-x-auto text-text-primary leading-relaxed whitespace-pre font-mono text-[11px] selection:bg-brand-primary/20 ${isExpanded ? 'max-h-[500px] overflow-y-auto custom-scrollbar' : ''}`}>
          <code>{displayedCode}</code>
        </pre>
        {isCollapsible && !isExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-bg-secondary via-bg-secondary/70 to-transparent pointer-events-none" />
        )}
      </div>
      {isCollapsible && (
        <div className="px-3 py-1.5 bg-bg-tertiary/70 border-t border-border-default flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 font-sans font-semibold text-brand-primary hover:text-brand-primary-hi transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show less</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Show full code ({totalLines - 10} more lines)</span>
              </>
            )}
          </button>
          <span className="text-[10px] text-text-muted font-sans">
            {isExpanded ? `Showing all ${totalLines} lines` : `Showing 10 of ${totalLines} lines`}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * High-res Image preview with 1-click download and fallback
 */
const MarkdownImage: React.FC<{ alt: string; src: string }> = ({ alt, src }) => {
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleError = () => {
    // If pollinations flux refused, fallback to safe Unsplash query
    if (!hasError) {
      setHasError(true);
      setCurrentSrc(`https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=1200&q=80`);
    }
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-border-default bg-bg-secondary shadow-md max-w-xl group">
      <div className="relative bg-black/5 overflow-hidden">
        <img
          src={currentSrc}
          alt={alt}
          className="w-full max-h-[460px] object-cover transition-transform duration-300 group-hover:scale-[1.01]"
          loading="lazy"
          onError={handleError}
        />
        {hasError && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>High-Res Wildlife Fallback</span>
          </div>
        )}
      </div>
      <div className="p-2.5 sm:p-3 bg-bg-secondary border-t border-border-subtle flex items-center justify-between gap-2 text-xs">
        <span className="text-text-secondary truncate font-medium text-[11px] max-w-[240px]">
          {alt || 'Generated Visual Asset'}
        </span>
        <a
          href={currentSrc}
          target="_blank"
          rel="noopener noreferrer"
          download="generated-visual.png"
          className="min-h-[36px] px-3 py-1 rounded-xl bg-brand-primary hover:bg-[#084C8D] dark:bg-[#41A2D9] dark:hover:bg-[#64B6E3] text-white dark:text-[#000000] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </a>
      </div>
    </div>
  );
};

/**
 * Main human-friendly document markdown renderer.
 * Formats raw markdown into an executive-ready, human-readable document.
 */
export function renderHumanFriendlyMarkdown(content: string, options?: RenderOptions): React.ReactNode {
  if (!content) return null;

  // 1. Separate code blocks from normal text
  const rawParts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={`space-y-2 text-left font-sans text-xs sm:text-sm text-text-primary leading-relaxed break-words [overflow-wrap:anywhere] max-w-full overflow-hidden ${options?.className || ''}`}>
      {rawParts.map((part, pIdx) => {
        // Handle fenced code block
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineBreak = part.indexOf('\n');
          const language = firstLineBreak !== -1 ? part.slice(3, firstLineBreak).trim() : '';
          const code = firstLineBreak !== -1 ? part.slice(firstLineBreak + 1, -3) : part.slice(3, -3);
          return <CodeBlock key={`block_code_${pIdx}`} language={language} code={code} />;
        }

        // Process markdown lines inside normal text
        const lines = part.split(/\r?\n/);
        const elements: React.ReactNode[] = [];
        let inList = false;
        let listItems: React.ReactNode[] = [];
        let isNumberedList = false;

        const flushList = () => {
          if (listItems.length > 0) {
            elements.push(
              isNumberedList ? (
                <ol key={`ol_${elements.length}`} className="my-2 space-y-1 pl-1 list-none">
                  {listItems}
                </ol>
              ) : (
                <ul key={`ul_${elements.length}`} className="my-2 space-y-1 pl-1 list-none">
                  {listItems}
                </ul>
              )
            );
            listItems = [];
            inList = false;
          }
        };

        for (let lIdx = 0; lIdx < lines.length; lIdx++) {
          const line = lines[lIdx];
          const trimmed = line.trim();

          // Check for Image markdown: ![alt](url)
          const imgMatch = trimmed.match(/^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
          if (imgMatch) {
            flushList();
            elements.push(
              <MarkdownImage key={`img_${pIdx}_${lIdx}`} alt={imgMatch[1]} src={imgMatch[2]} />
            );
            continue;
          }

          // Check for Markdown Table: | col1 | col2 |
          if (trimmed.startsWith('|') && trimmed.endsWith('|') && lIdx + 1 < lines.length && lines[lIdx + 1].trim().startsWith('|') && lines[lIdx + 1].includes('---')) {
            flushList();
            const headerCells = trimmed.slice(1, -1).split('|').map((c) => c.trim());
            lIdx++; // skip header divider line (|---|---|)
            const tableRows: string[][] = [];
            while (lIdx + 1 < lines.length && lines[lIdx + 1].trim().startsWith('|') && lines[lIdx + 1].trim().endsWith('|')) {
              lIdx++;
              const rowCells = lines[lIdx].trim().slice(1, -1).split('|').map((c) => c.trim());
              tableRows.push(rowCells);
            }

            elements.push(
              <div key={`tbl_${pIdx}_${lIdx}`} className="my-3 overflow-x-auto max-w-full rounded-xl border border-border-default bg-bg-secondary/40 shadow-3xs custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse min-w-[280px]">
                  <thead className="bg-bg-tertiary border-b border-border-default font-semibold text-text-primary">
                    <tr>
                      {headerCells.map((h, hIdx) => (
                        <th key={hIdx} className="px-3.5 py-2 border-r border-border-subtle last:border-r-0 font-display text-[11px] uppercase tracking-wider text-text-secondary">
                          {parseInlineMarkdown(h, `th_${hIdx}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {tableRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-bg-tertiary/40 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3.5 py-2 border-r border-border-subtle last:border-r-0 text-text-primary text-xs leading-relaxed">
                            {parseInlineMarkdown(cell, `td_${rIdx}_${cIdx}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            continue;
          }

          // Check for Headers
          if (trimmed.startsWith('# ')) {
            flushList();
            elements.push(
              <h1 key={`h1_${pIdx}_${lIdx}`} className="text-base sm:text-lg font-bold font-display text-text-primary mt-4 mb-2 tracking-tight">
                {parseInlineMarkdown(trimmed.replace(/^#\s+/, ''), `h1_${lIdx}`)}
              </h1>
            );
            continue;
          }
          if (trimmed.startsWith('## ')) {
            flushList();
            elements.push(
              <h2 key={`h2_${pIdx}_${lIdx}`} className="text-sm sm:text-base font-bold font-display text-text-primary mt-3.5 mb-1.5 tracking-tight border-b border-border-subtle pb-1">
                {parseInlineMarkdown(trimmed.replace(/^##\s+/, ''), `h2_${lIdx}`)}
              </h2>
            );
            continue;
          }
          if (trimmed.startsWith('### ')) {
            flushList();
            elements.push(
              <h3 key={`h3_${pIdx}_${lIdx}`} className="text-xs sm:text-sm font-bold text-text-primary mt-3 mb-1">
                {parseInlineMarkdown(trimmed.replace(/^###\s+/, ''), `h3_${lIdx}`)}
              </h3>
            );
            continue;
          }

          // Check for Blockquote
          if (trimmed.startsWith('> ')) {
            flushList();
            elements.push(
              <blockquote key={`bq_${pIdx}_${lIdx}`} className="p-3 my-2 bg-bg-secondary/60 border border-border-default rounded-xl text-xs italic text-text-secondary leading-relaxed">
                {parseInlineMarkdown(trimmed.replace(/^>\s+/, ''), `bq_${lIdx}`)}
              </blockquote>
            );
            continue;
          }

          // Check for Unordered List items (- or * or •)
          const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
          if (bulletMatch) {
            if (!inList || isNumberedList) {
              flushList();
              inList = true;
              isNumberedList = false;
            }
            listItems.push(
              <li key={`li_${pIdx}_${lIdx}`} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed text-text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary dark:bg-[#41A2D9] mt-2 shrink-0" />
                <span className="flex-1">{parseInlineMarkdown(bulletMatch[1], `li_b_${lIdx}`)}</span>
              </li>
            );
            continue;
          }

          // Check for Numbered List items (1. 2. etc.)
          const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (numberedMatch) {
            if (!inList || !isNumberedList) {
              flushList();
              inList = true;
              isNumberedList = true;
            }
            listItems.push(
              <li key={`li_num_${pIdx}_${lIdx}`} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed text-text-primary">
                <span className="font-mono text-xs font-bold text-brand-primary dark:text-[#41A2D9] min-w-[16px] text-right mt-0.5">
                  {numberedMatch[1]}.
                </span>
                <span className="flex-1">{parseInlineMarkdown(numberedMatch[2], `li_n_${lIdx}`)}</span>
              </li>
            );
            continue;
          }

          // Empty line
          if (!trimmed) {
            flushList();
            continue;
          }

          // Normal Paragraph
          flushList();
          elements.push(
            <p key={`p_${pIdx}_${lIdx}`} className="my-1.5 leading-relaxed text-xs sm:text-sm text-text-primary break-words [overflow-wrap:anywhere] max-w-full">
              {parseInlineMarkdown(trimmed, `p_${lIdx}`)}
            </p>
          );
        }

        flushList();

        return (
          <React.Fragment key={`part_${pIdx}`}>
            {elements}
          </React.Fragment>
        );
      })}
    </div>
  );
}
