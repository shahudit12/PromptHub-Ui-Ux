import React, { useState } from 'react';
import { Image as ImageIcon, Eye, X, ZoomIn, FileCode } from 'lucide-react';
import { getPromptDisplayImages } from '../../utils/imageUrlResolver';

export interface PromptImagePreviewProps {
  prompt?: any;
  inputImageUrl?: string;
  outputImageUrl?: string;
  coverUrl?: string;
  title?: string;
  aspectRatio?: 'video' | 'wide' | 'auto';
  size?: 'compact' | 'medium' | 'large';
  className?: string;
  interactive?: boolean;
  showPlaceholderWhenEmpty?: boolean;
  onImageClick?: (e: React.MouseEvent, url: string) => void;
}

export const PromptImagePreview: React.FC<PromptImagePreviewProps> = ({
  prompt,
  inputImageUrl: propInputImg,
  outputImageUrl: propOutputImg,
  coverUrl: propCoverImg,
  title: propTitle,
  aspectRatio: _aspectRatio = 'video',
  size = 'compact',
  className = '',
  interactive = false,
  showPlaceholderWhenEmpty = false,
  onImageClick,
}) => {
  const images = getPromptDisplayImages(prompt);

  const inputImg = propInputImg || images.inputImageUrl;
  const outputImg = propOutputImg || images.outputImageUrl;
  const coverImg = propCoverImg || images.coverUrl;
  const title = propTitle || prompt?.title || 'Prompt';

  const hasBeforeAfter = Boolean(inputImg && outputImg);
  const singleImg = outputImg || coverImg || inputImg;

  const [inputError, setInputError] = useState(false);
  const [outputError, setOutputError] = useState(false);
  const [singleError, setSingleError] = useState(false);
  const [activeModalUrl, setActiveModalUrl] = useState<string | null>(null);

  const handlePreviewClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (onImageClick) {
      onImageClick(e, url);
    } else if (interactive) {
      setActiveModalUrl(url);
    }
  };

  const containerHeightClass =
    size === 'compact'
      ? 'h-36 sm:h-40 w-full'
      : size === 'medium'
      ? 'h-48 sm:h-56 w-full'
      : 'h-64 sm:h-80 w-full';

  // If no images at all are provided
  if (!inputImg && !outputImg && !coverImg) {
    if (!showPlaceholderWhenEmpty) {
      return null;
    }

    const snippetText = prompt?.rawContent || prompt?.content || prompt?.description || 'Text-based AI prompt ready to run';
    const cleanSnippet = snippetText.replace(/^\[.*?\]\s*/, '').replace(/```[\s\S]*?```/g, '').trim();
    const modelBadge = prompt?.model || prompt?.category || 'PROMPT';
    const wordCount = (prompt?.rawContent || prompt?.content || '').split(/\s+/).filter(Boolean).length || 0;

    return (
      <div
        className={`w-full ${containerHeightClass} rounded-xl overflow-hidden bg-bg-tertiary/70 border border-border-default/70 p-3 flex flex-col justify-between select-none transition-all group/card relative shrink-0 ${className}`}
      >
        <div className="flex items-center justify-between gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-5 h-5 rounded-md bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
              <FileCode className="w-3 h-3" />
            </span>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-secondary truncate max-w-[130px]">
              {modelBadge}
            </span>
          </div>
          <span className="text-[9px] font-mono font-semibold text-text-muted px-1.5 py-0.5 rounded bg-bg-primary/90 border border-border-subtle shrink-0">
            Text Prompt
          </span>
        </div>

        <p className="text-[11px] font-mono text-text-secondary line-clamp-3 leading-relaxed opacity-90 my-auto break-words [overflow-wrap:anywhere]">
          {cleanSnippet}
        </p>

        <div className="flex items-center justify-between text-[9px] font-mono text-text-muted pt-1 border-t border-border-subtle/50 shrink-0">
          <span>{wordCount > 0 ? `${wordCount} words` : 'Configured'}</span>
          <span className="text-brand-primary font-medium opacity-80">System Template</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`w-full ${containerHeightClass} rounded-xl overflow-hidden bg-bg-tertiary border border-border-default/70 shadow-xs relative select-none transition-all shrink-0 ${className}`}
      >
        {hasBeforeAfter ? (
          <div className="grid grid-cols-2 gap-1 p-1 h-full w-full">
            {/* Input / Before Image */}
            <div
              className={`relative h-full w-full rounded-lg overflow-hidden bg-bg-primary/80 border border-border-default/40 group ${
                interactive ? 'cursor-zoom-in' : ''
              }`}
              onClick={(e) => inputImg && handlePreviewClick(e, inputImg)}
            >
              {!inputError && inputImg ? (
                <img
                  src={inputImg}
                  alt={`${title} - Input Before`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={() => setInputError(true)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-text-muted gap-1 bg-bg-tertiary/50">
                  <ImageIcon className="w-4 h-4 opacity-40 text-brand-primary" />
                  <span className="text-[9px] font-mono opacity-60">Input Sample</span>
                </div>
              )}
              <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/75 text-[9px] font-mono font-medium text-white shadow-xs backdrop-blur-xs flex items-center gap-1 border border-white/10">
                Input
              </span>
              {interactive && !inputError && (
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <ZoomIn className="w-4 h-4 text-white drop-shadow-md" />
                </div>
              )}
            </div>

            {/* Output / After Image */}
            <div
              className={`relative h-full w-full rounded-lg overflow-hidden bg-bg-primary/80 border border-border-default/40 group ${
                interactive ? 'cursor-zoom-in' : ''
              }`}
              onClick={(e) => outputImg && handlePreviewClick(e, outputImg)}
            >
              {!outputError && outputImg ? (
                <img
                  src={outputImg}
                  alt={`${title} - Output After`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={() => setOutputError(true)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-text-muted gap-1 bg-bg-tertiary/50">
                  <ImageIcon className="w-4 h-4 opacity-40 text-brand-primary" />
                  <span className="text-[9px] font-mono opacity-60">Output Sample</span>
                </div>
              )}
              <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-brand-primary/90 text-[9px] font-mono font-semibold text-white shadow-xs backdrop-blur-xs flex items-center gap-1 border border-white/15">
                Output
              </span>
              {interactive && !outputError && (
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <ZoomIn className="w-4 h-4 text-white drop-shadow-md" />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Single Image Display */
          <div
            className={`relative h-full w-full overflow-hidden group ${
              interactive ? 'cursor-zoom-in' : ''
            }`}
            onClick={(e) => singleImg && handlePreviewClick(e, singleImg)}
          >
            {!singleError && singleImg ? (
              <img
                src={singleImg}
                alt={`${title} Preview`}
                loading="lazy"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={() => setSingleError(true)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-3 text-text-muted gap-1.5 bg-bg-tertiary/60">
                <ImageIcon className="w-6 h-6 opacity-40 text-brand-primary" />
                <span className="text-[10px] font-mono text-text-secondary">AI Visual Preview</span>
              </div>
            )}

            {outputImg && !singleError && (
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-brand-primary/90 text-[9.5px] font-mono font-semibold text-white shadow-xs backdrop-blur-xs border border-white/15">
                Output
              </span>
            )}
            {!outputImg && inputImg && !singleError && (
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-[9.5px] font-mono font-medium text-white shadow-xs backdrop-blur-xs border border-white/10">
                Input
              </span>
            )}

            {interactive && !singleError && (
              <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                <Eye className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive High-Res Zoom Modal */}
      {activeModalUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview inspection"
          onClick={() => setActiveModalUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-bg-secondary rounded-2xl border border-border-default/80 overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-default bg-bg-tertiary/60">
              <span className="text-xs font-mono font-bold text-text-primary truncate max-w-sm">
                {title}
              </span>
              <button
                type="button"
                onClick={() => setActiveModalUrl(null)}
                className="min-h-[44px] min-w-[44px] p-2 text-text-muted hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                title="Close preview (Esc)"
                aria-label="Close image preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[80vh] flex items-center justify-center bg-black/30">
              <img
                src={activeModalUrl}
                alt={title}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
