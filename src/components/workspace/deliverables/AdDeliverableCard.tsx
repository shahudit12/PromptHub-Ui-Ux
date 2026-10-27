import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Download,
  ExternalLink,
  Tag,
  FileText,
  Target,
  Image as ImageIcon,
  CheckCircle2,
  Share2,
  RefreshCw,
} from 'lucide-react';
import { DeliverableVersionPills, type DeliverableVersion } from './DeliverableVersionPills';

export interface AdHeadlineVariant {
  id: string;
  type: 'punchy' | 'benefit' | 'curiosity' | 'urgency' | 'social_proof';
  text: string;
}

export interface AdCopyVariant {
  id: string;
  type: 'short' | 'medium' | 'storytelling';
  label: string;
  text: string;
  wordCount?: number;
}

export interface AdTargetingStrategy {
  targetAudience: string;
  demographics: string[];
  interests: string[];
  platforms: string[];
  placementHooks: string[];
  hashtags: string[];
}

export interface AdDeliverableData {
  brandName: string;
  brandTagline?: string;
  brandLogoUrl?: string;
  headline: string;
  primaryCopy: string;
  discountTag?: string;
  ctaText: string;
  ctaUrl?: string;
  imageUrl?: string;
  aspectRatio?: '1:1' | '16:9';
  headlineVariants?: AdHeadlineVariant[];
  copyVariants?: AdCopyVariant[];
  targeting?: AdTargetingStrategy;
  version?: number;
  versions?: DeliverableVersion[];
}

export interface AdDeliverableCardProps {
  data?: Partial<AdDeliverableData>;
  onIterate?: (prompt: string) => void;
  onVersionChange?: (version: number) => void;
  onExportCreative?: (data: AdDeliverableData) => void;
  className?: string;
}

const DEFAULT_AD_DATA: AdDeliverableData = {
  brandName: 'AuraBrew Coffee Co.',
  brandTagline: 'Cold brew slow-steeped to botanical perfection',
  headline: 'Zero Sugar. Pure Energy. Brewed for Deep Focus.',
  primaryCopy:
    'Experience organic single-origin Ethiopian beans infused with nootropic lion’s mane and Madagascar vanilla. Crisp, silky smooth, and delivered fresh to your door in climate-neutral glass flasks.',
  discountTag: 'FIRST20 • 20% OFF FIRST SUBSCRIPTION',
  ctaText: 'Claim 20% Off Box',
  ctaUrl: 'https://aurabrew.example.com/starter',
  imageUrl:
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
  aspectRatio: '1:1',
  version: 1,
  versions: [
    {
      version: 1,
      label: 'v1',
      summary: 'Initial high-converting social creative',
      timestamp: Date.now() - 3600000,
    },
    {
      version: 2,
      label: 'v2',
      summary: 'Punchier headline + 20% discount tag',
      timestamp: Date.now() - 1800000,
    },
    {
      version: 3,
      label: 'v3',
      summary: 'Targeting expanded for B2B remote tech teams',
      timestamp: Date.now() - 300000,
    },
  ],
  headlineVariants: [
    {
      id: 'h1',
      type: 'punchy',
      text: 'Zero Sugar. Pure Energy. Brewed for Deep Focus.',
    },
    {
      id: 'h2',
      type: 'benefit',
      text: 'Eliminate Afternoon Brain Fog with Pure Single-Origin Cold Brew.',
    },
    {
      id: 'h3',
      type: 'curiosity',
      text: 'Why Silicon Valley Engineers Are Replacing Energy Drinks With This.',
    },
    {
      id: 'h4',
      type: 'urgency',
      text: 'Summer Harvest Reserve: Only 500 Subscriptions Released.',
    },
    {
      id: 'h5',
      type: 'social_proof',
      text: 'Rated 4.9/5 by 12,000+ Founders, Coders, and Night Owls.',
    },
  ],
  copyVariants: [
    {
      id: 'c1',
      type: 'short',
      label: 'Short (High-CTR Feed)',
      text: 'Slow-steeped organic cold brew with natural nootropics. Zero crash. Claim your starter pack with 20% off today.',
      wordCount: 18,
    },
    {
      id: 'c2',
      type: 'medium',
      label: 'Medium (Value-Driven)',
      text: 'Most iced coffees give you a 45-minute spike followed by brain fog. AuraBrew is slow-steeped for 24 hours with Lion’s Mane mushroom and organic Ethiopian beans for 6+ hours of calm, jitter-free productivity. Free shipping on every subscription.',
      wordCount: 42,
    },
    {
      id: 'c3',
      type: 'storytelling',
      label: 'Storytelling (Founder / Editorial)',
      text: 'We spent two years testing cold extraction temperatures to eliminate bitterness without adding a single gram of sugar. The result is a silky, chocolatey reserve cold brew that keeps you locked in on your best work without jitters or acidity.',
      wordCount: 41,
    },
  ],
  targeting: {
    targetAudience: 'Productivity-focused knowledge workers, developers, entrepreneurs, and fitness enthusiasts.',
    demographics: ['Age: 22–45', 'Gender: All', 'Location: Metro US & Canada (Tech Hubs)'],
    interests: [
      'Specialty Coffee',
      'Biohacking & Nootropics',
      'Remote Work Tech',
      'Mindfulness & Productivity',
    ],
    platforms: ['Instagram Feed & Stories', 'LinkedIn Sponsored Content', 'Meta Reels', 'X (Twitter) Feed'],
    placementHooks: [
      'Hook 1: "Stop drinking 300-calorie sugar lattes before standup."',
      'Hook 2: "The cold brew built for 4-hour uninterrupted coding sprints."',
      'Hook 3: "Unboxing the smoothest dark roast reserve you will ever taste."',
    ],
    hashtags: ['#ColdBrew', '#DeepWork', '#CleanEnergy', '#SpecialtyCoffee', '#Biohacking'],
  },
};

const QUICK_REVISION_CHIPS = [
  'Make headline punchier',
  'Add 20% discount offer',
  'Change CTA to Learn More',
  'Shorten primary copy for TikTok',
  'Target remote tech teams & founders',
  'Add social proof review quote',
];

export const AdDeliverableCard: React.FC<AdDeliverableCardProps> = ({
  data = {},
  onIterate,
  onVersionChange,
  onExportCreative,
  className = '',
}) => {
  const mergedData: AdDeliverableData = {
    ...DEFAULT_AD_DATA,
    ...data,
  };

  const [activeTab, setActiveTab] = useState<'mockup' | 'headlines' | 'copy' | 'targeting'>('mockup');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9'>(mergedData.aspectRatio || '1:1');
  const [activeVersion, setActiveVersion] = useState<number>(mergedData.version || 3);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedHeadline, setSelectedHeadline] = useState<string>(mergedData.headline);
  const [selectedCopy, setSelectedCopy] = useState<string>(mergedData.primaryCopy);
  const [ctaClickFeedback, setCtaClickFeedback] = useState<boolean>(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleCopyAll = () => {
    const formatted = `=== ${mergedData.brandName.toUpperCase()} SOCIAL AD CAMPAIGN ===

--- ACTIVE HEADLINE ---
${selectedHeadline}

--- HEADLINE VARIATIONS ---
${(mergedData.headlineVariants || []).map((h, i) => `${i + 1}. [${h.type.toUpperCase()}] ${h.text}`).join('\n')}

--- PRIMARY COPY ---
${selectedCopy}

--- COPY VARIATIONS ---
${(mergedData.copyVariants || [])
  .map((c) => `[${c.label} (${c.wordCount} words)]:\n${c.text}`)
  .join('\n\n')}

--- OFFER & CTA ---
Discount Tag: ${mergedData.discountTag || 'None'}
Call to Action: ${mergedData.ctaText}
Destination: ${mergedData.ctaUrl || 'N/A'}

--- TARGETING & PLACEMENT ---
Audience: ${mergedData.targeting?.targetAudience || 'General'}
Demographics: ${(mergedData.targeting?.demographics || []).join(' | ')}
Interests: ${(mergedData.targeting?.interests || []).join(', ')}
Platforms: ${(mergedData.targeting?.platforms || []).join(', ')}
Creative Hooks:\n${(mergedData.targeting?.placementHooks || []).join('\n')}
Hashtags: ${(mergedData.targeting?.hashtags || []).join(' ')}
`;

    copyToClipboard(formatted, 'copy_all');
  };

  const handleDownloadCreative = () => {
    if (onExportCreative) {
      onExportCreative(mergedData);
      return;
    }

    // Generate downloadable self-contained HTML creative mockup
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${mergedData.brandName} - Social Ad Creative</title>
  <style>
    body { font-family: Outfit, -apple-system, sans-serif; background: #000; color: #fff; margin: 0; padding: 40px; display: flex; justify-content: center; }
    .ad-card { width: 540px; background: #0B1118; border: 1px solid #1C2B3A; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
    .header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1C2B3A; }
    .brand-title { font-weight: 700; font-size: 16px; color: #FFF; font-family: Outfit, sans-serif; }
    .sponsored { font-size: 11px; color: #41A2D9; font-family: "JetBrains Mono", monospace; }
    .image-container { width: 100%; aspect-ratio: ${aspectRatio === '1:1' ? '1 / 1' : '16 / 9'}; object-fit: cover; display: block; background: #131D27; }
    .body { padding: 24px; }
    .tag { display: inline-block; background: rgba(65, 162, 217, 0.15); color: #41A2D9; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px; margin-bottom: 12px; font-family: "JetBrains Mono", monospace; }
    .headline { font-size: 20px; font-weight: 800; line-height: 1.3; margin: 0 0 12px; color: #FFF; font-family: Outfit, sans-serif; }
    .copy { font-size: 14px; line-height: 1.6; color: #C5D7E8; margin-bottom: 20px; }
    .cta-btn { display: block; text-align: center; background: #0B60B0; color: #FFF; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; }
  </style>
</head>
<body>
  <div class="ad-card">
    <div class="header">
      <div>
        <div class="brand-title">${mergedData.brandName}</div>
        <div class="sponsored">Sponsored • Verified Creative</div>
      </div>
    </div>
    <img src="${mergedData.imageUrl || ''}" class="image-container" alt="${mergedData.brandName} Creative" />
    <div class="body">
      ${mergedData.discountTag ? `<div class="tag">${mergedData.discountTag}</div>` : ''}
      <h1 class="headline">${selectedHeadline}</h1>
      <p class="copy">${selectedCopy}</p>
      <a href="${mergedData.ctaUrl || '#'}" class="cta-btn">${mergedData.ctaText} →</a>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${mergedData.brandName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-ad-creative.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    copyToClipboard('Downloaded creative mockup asset!', 'download_feedback');
  };

  const handleVersionSelect = (v: number) => {
    setActiveVersion(v);
    if (onVersionChange) {
      onVersionChange(v);
    }
  };

  return (
    <div
      className={`w-full rounded-2xl bg-bg-secondary border border-border-default shadow-md overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
    >
      {/* ─── Header: Deliverable Type Badge & Version Switcher ─── */}
      <div className="p-4 sm:p-5 border-b border-border-subtle bg-bg-tertiary/40 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
              <Share2 className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold font-display text-text-primary">
                  Social Ad & Marketing Campaign
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-bold">
                  DELIVERABLE
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Synthesized for multi-platform paid acquisition (Meta, IG, X, LinkedIn)
              </p>
            </div>
          </div>

          {/* Action buttons: Copy All & Download */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAll}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-medium border border-border-default hover:border-brand-primary/40 bg-bg-secondary hover:bg-bg-tertiary text-text-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-3xs"
              title="Copy all headlines, body copy, and targeting specs"
              aria-label="Copy All Copy"
            >
              {copiedKey === 'copy_all' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-brand-primary" />
                  <span className="font-semibold text-brand-primary">Copied All!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-text-muted" />
                  <span className="hidden sm:inline">Copy All Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadCreative}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-brand-primary hover:bg-brand-primary-hi text-white transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Download responsive creative mockup as HTML package"
              aria-label="Download Creative"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Download Creative</span>
            </button>
          </div>
        </div>

        {/* Version Pills */}
        <DeliverableVersionPills
          versions={mergedData.versions || [1, 2, 3]}
          activeVersion={activeVersion}
          onSelectVersion={handleVersionSelect}
          title="Ad Iterations"
        />
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="px-4 sm:px-5 border-b border-border-subtle bg-bg-primary/30 flex items-center gap-1 overflow-x-auto py-1">
        <button
          type="button"
          onClick={() => setActiveTab('mockup')}
          className={`min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg text-xs font-semibold font-mono flex items-center gap-2 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
            activeTab === 'mockup'
              ? 'bg-bg-secondary text-brand-primary shadow-xs border border-border-default font-bold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60'
          }`}
          aria-label="View Visual Mockup Tab"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Mockup Frame</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('headlines')}
          className={`min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg text-xs font-semibold font-mono flex items-center gap-2 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
            activeTab === 'headlines'
              ? 'bg-bg-secondary text-brand-primary shadow-xs border border-border-default font-bold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60'
          }`}
          aria-label="View Headline Variations Tab"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Headlines ({mergedData.headlineVariants?.length || 5})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('copy')}
          className={`min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg text-xs font-semibold font-mono flex items-center gap-2 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
            activeTab === 'copy'
              ? 'bg-bg-secondary text-brand-primary shadow-xs border border-border-default font-bold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60'
          }`}
          aria-label="View Primary Copy Variations Tab"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Primary Copy</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('targeting')}
          className={`min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg text-xs font-semibold font-mono flex items-center gap-2 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
            activeTab === 'targeting'
              ? 'bg-bg-secondary text-brand-primary shadow-xs border border-border-default font-bold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60'
          }`}
          aria-label="View Targeting Strategy Tab"
        >
          <Target className="w-3.5 h-3.5" />
          <span>Targeting Strategy</span>
        </button>
      </div>

      {/* ─── Main Content Views ─── */}
      <div className="p-4 sm:p-6">
        {/* TAB 1: Visual Ad Mockup Frame */}
        {activeTab === 'mockup' && (
          <div className="flex flex-col lg:flex-row items-start gap-6">
            {/* Left: The Mockup Card */}
            <div className="w-full lg:max-w-md mx-auto rounded-2xl bg-bg-tertiary/80 border border-border-default overflow-hidden shadow-lg transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
              {/* Mockup Top Sponsor Bar */}
              <div className="px-4 py-3 bg-bg-secondary border-b border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-xs uppercase shadow-xs">
                    {mergedData.brandName.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-text-primary">{mergedData.brandName}</span>
                      <CheckCircle2 className="w-3 h-3 text-brand-primary" aria-label="Verified Brand" />
                    </div>
                    <span className="text-[10px] text-text-muted font-mono">Sponsored • High Engagement</span>
                  </div>
                </div>

                {/* Aspect Ratio Switcher */}
                <div className="flex items-center gap-1 bg-bg-tertiary p-0.5 rounded-lg border border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('1:1')}
                    className={`min-h-[44px] min-w-[44px] px-2 py-1 text-[11px] font-mono rounded font-medium transition-colors cursor-pointer ${
                      aspectRatio === '1:1'
                        ? 'bg-brand-primary text-white font-bold'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                    title="1:1 Square (Instagram / Facebook Feed)"
                    aria-label="1:1 Square Aspect Ratio"
                  >
                    1:1
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`min-h-[44px] min-w-[44px] px-2 py-1 text-[11px] font-mono rounded font-medium transition-colors cursor-pointer ${
                      aspectRatio === '16:9'
                        ? 'bg-brand-primary text-white font-bold'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                    title="16:9 Landscape (Display / Twitter)"
                    aria-label="16:9 Landscape Aspect Ratio"
                  >
                    16:9
                  </button>
                </div>
              </div>

              {/* Creative Visual Asset Area */}
              <div
                className={`relative w-full bg-bg-primary overflow-hidden ${
                  aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video'
                }`}
              >
                {mergedData.imageUrl ? (
                  <img
                    src={mergedData.imageUrl}
                    alt={mergedData.brandName}
                    className="w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-102"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-bg-secondary">
                    <ImageIcon className="w-12 h-12 text-brand-primary mb-2 opacity-60" />
                    <span className="text-xs font-mono text-text-muted">AI Synthesized Product Asset</span>
                  </div>
                )}

                {/* Offer floating badge */}
                {mergedData.discountTag && (
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-brand-primary text-white font-mono font-bold text-[11px] shadow-md border border-white/20 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>{mergedData.discountTag}</span>
                  </div>
                )}
              </div>

              {/* Ad Content Body */}
              <div className="p-4 sm:p-5 bg-bg-secondary flex flex-col gap-3">
                {/* Headline */}
                <h4 className="text-base sm:text-lg font-display font-bold text-text-primary leading-snug">
                  {selectedHeadline}
                </h4>

                {/* Primary copy */}
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {selectedCopy}
                </p>

                {/* Interactive CTA Button */}
                <button
                  type="button"
                  onClick={() => {
                    setCtaClickFeedback(true);
                    setTimeout(() => setCtaClickFeedback(false), 2000);
                  }}
                  className="min-h-[44px] min-w-[44px] w-full px-5 py-3 rounded-xl font-bold font-sans text-sm bg-brand-primary hover:bg-brand-primary-hi text-white shadow-xs transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center gap-2 cursor-pointer"
                  aria-label={`${mergedData.ctaText} button`}
                >
                  {ctaClickFeedback ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Action Triggered (Demo Link)</span>
                    </>
                  ) : (
                    <>
                      <span>{mergedData.ctaText}</span>
                      <ExternalLink className="w-4 h-4 text-white shrink-0" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Active Specs & Fast Customizer */}
            <div className="flex-1 w-full space-y-4">
              <div className="p-4 rounded-xl bg-bg-tertiary/50 border border-border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                    Active Creative Parameters
                  </h4>
                  <span className="text-[10px] font-mono text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">
                    Ready to Deploy
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-bg-secondary border border-border-subtle">
                    <span className="text-text-muted font-mono shrink-0">Headline:</span>
                    <span className="font-semibold text-text-primary text-right truncate">
                      {selectedHeadline}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-bg-secondary border border-border-subtle">
                    <span className="text-text-muted font-mono shrink-0">Discount Offer:</span>
                    <span className="font-mono font-bold text-brand-accent text-right">
                      {mergedData.discountTag || 'None'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2 p-2 rounded-lg bg-bg-secondary border border-border-subtle">
                    <span className="text-text-muted font-mono shrink-0">CTA Target:</span>
                    <span className="font-mono text-text-secondary text-right truncate">
                      {mergedData.ctaText} ({mergedData.ctaUrl || '#'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Headline Quick Pick List */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-medium text-text-muted">
                  Quick Swap Headline in Mockup:
                </span>
                <div className="space-y-1.5">
                  {(mergedData.headlineVariants || []).map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setSelectedHeadline(h.text)}
                      className={`min-h-[44px] min-w-[44px] w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-between gap-2 border cursor-pointer ${
                        selectedHeadline === h.text
                          ? 'bg-brand-primary/10 border-brand-primary text-brand-primary font-semibold'
                          : 'bg-bg-secondary border-border-default hover:border-brand-primary/30 text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <span className="truncate">{h.text}</span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted shrink-0">
                        {h.type}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Headline Variations */}
        {activeTab === 'headlines' && (
          <div className="space-y-3">
            <p className="text-xs text-text-secondary leading-relaxed">
              Tested headline angles crafted for click-through rate across varied audience states of awareness:
            </p>

            <div className="space-y-2.5">
              {(mergedData.headlineVariants || []).map((h, i) => (
                <div
                  key={h.id}
                  className="p-3.5 sm:p-4 rounded-xl bg-bg-tertiary/60 border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand-primary/40 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary">
                        Angle {i + 1} • {h.type}
                      </span>
                      {selectedHeadline === h.text && (
                        <span className="text-[10px] font-mono text-emerald-500 font-bold">
                          [Active in Mockup]
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-display font-semibold text-text-primary">
                      {h.text}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedHeadline(h.text)}
                      className="min-h-[44px] min-w-[44px] px-3 py-1.5 text-xs font-mono rounded-lg border border-border-default hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                      title="Apply this headline to the mockup card"
                    >
                      Use in Mockup
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(h.text, `h_${h.id}`)}
                      className="min-h-[44px] min-w-[44px] px-3 py-1.5 text-xs font-mono rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs"
                      title="Copy headline text to clipboard"
                    >
                      {copiedKey === `h_${h.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-brand-primary" />
                          <span className="font-semibold text-brand-primary">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-text-muted" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Primary Copy Variants */}
        {activeTab === 'copy' && (
          <div className="space-y-4">
            <p className="text-xs text-text-secondary leading-relaxed">
              Multi-length body copies designed for short-form video ads, feed posts, and editorial carousels:
            </p>

            <div className="space-y-3">
              {(mergedData.copyVariants || []).map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-bg-tertiary/60 border border-border-default space-y-2.5 hover:border-brand-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-text-primary">{c.label}</span>
                      <span className="text-[10px] font-mono text-text-muted">
                        ~{c.wordCount || c.text.split(' ').length} words
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCopy(c.text)}
                        className="min-h-[44px] min-w-[44px] px-3 py-1.5 text-xs font-mono rounded-lg border border-border-default hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                      >
                        Use in Mockup
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(c.text, `c_${c.id}`)}
                        className="min-h-[44px] min-w-[44px] px-3 py-1.5 text-xs font-mono rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer shadow-3xs"
                      >
                        {copiedKey === `c_${c.id}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-brand-primary" />
                            <span className="font-semibold text-brand-primary">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-text-muted" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed bg-bg-secondary p-3 rounded-lg border border-border-subtle">
                    {c.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Targeting & Strategy */}
        {activeTab === 'targeting' && mergedData.targeting && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-bg-tertiary/60 border border-border-default space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                  Audience Profile & Psychographics
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(mergedData.targeting, null, 2),
                      'targeting_json'
                    )
                  }
                  className="min-h-[44px] min-w-[44px] px-3 py-1.5 text-xs font-mono rounded-lg bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'targeting_json' ? (
                    <Check className="w-3.5 h-3.5 text-brand-primary" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-text-muted" />
                  )}
                  <span>Copy Strategy</span>
                </button>
              </div>

              <p className="text-xs sm:text-sm text-text-primary leading-relaxed font-medium">
                {mergedData.targeting.targetAudience}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-bg-secondary border border-border-subtle space-y-1.5">
                  <span className="text-[11px] font-mono text-text-muted font-semibold block">
                    Demographics
                  </span>
                  <ul className="text-xs text-text-secondary space-y-1">
                    {mergedData.targeting.demographics.map((d, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-bg-secondary border border-border-subtle space-y-1.5">
                  <span className="text-[11px] font-mono text-text-muted font-semibold block">
                    Target Interests & Keywords
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {mergedData.targeting.interests.map((interest, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-bg-tertiary border border-border-subtle text-text-secondary"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-bg-secondary border border-border-subtle space-y-1.5">
                <span className="text-[11px] font-mono text-text-muted font-semibold block">
                  Recommended Creative Hooks
                </span>
                <div className="space-y-1">
                  {mergedData.targeting.placementHooks.map((hook, i) => (
                    <div key={i} className="text-xs font-mono text-text-secondary p-1.5 rounded bg-bg-tertiary/40">
                      {hook}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {mergedData.targeting.hashtags.map((tag, i) => (
                  <span key={i} className="text-xs font-mono text-brand-primary">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Quick Iteration Revision Chips ─── */}
      <div className="p-4 sm:p-5 border-t border-border-subtle bg-bg-tertiary/30">
        <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted mb-2.5">
          <RefreshCw className="w-3.5 h-3.5 text-brand-primary shrink-0" />
          <span>Quick Iteration Revisions:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_REVISION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                if (onIterate) {
                  onIterate(chip);
                } else {
                  copyToClipboard(`Iterate ad deliverable: "${chip}"`, `chip_${chip}`);
                }
              }}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-mono bg-bg-secondary hover:bg-bg-tertiary border border-border-default hover:border-brand-primary/40 text-text-secondary hover:text-text-primary transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer shadow-3xs"
              title={`Request AI revision: "${chip}"`}
              aria-label={`Revise: ${chip}`}
            >
              <Sparkles className="w-3 h-3 text-brand-accent shrink-0" />
              <span>{chip}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
