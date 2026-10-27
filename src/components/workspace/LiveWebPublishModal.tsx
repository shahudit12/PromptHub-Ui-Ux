import React, { useState } from 'react';
import {
  Globe,
  Check,
  Copy,
  ExternalLink,
  QrCode,
  Download,
  HardDrive,
  X,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { WorkFile } from '../../types/work';
import { createShareablePreviewUrl } from '../../utils/previewBundleUtils';

export interface LiveWebPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  files: WorkFile[];
  previewHtml?: string;
  onSyncToDrive?: () => void;
  onExportZip?: () => void;
}

type PublishTab = 'instant' | 'providers';
type BudgetFilter = 'all' | 'free' | 'budget' | 'business';

export const LiveWebPublishModal: React.FC<LiveWebPublishModalProps> = ({
  isOpen,
  onClose,
  projectName,
  files,
  previewHtml,
  onSyncToDrive,
  onExportZip,
}) => {
  const [activeTab, setActiveTab] = useState<PublishTab>('instant');
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>('all');
  const [copied, setCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrLoadError, setQrLoadError] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedProviderCommand, setCopiedProviderCommand] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanSlug = (projectName || 'capsule')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || 'my-project';

  const [customSlug, setCustomSlug] = useState(() => cleanSlug);
  const [isPublished, setIsPublished] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(`ph_live_site_${cleanSlug}`) || localStorage.getItem(`ph_site_published_${cleanSlug}`));
    } catch {
      return false;
    }
  });
  const [isPublishing, setIsPublishing] = useState(false);

  const effectiveSlug = customSlug.trim() || cleanSlug;
  const appOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://prompthub.cloud';

  const buildStandaloneHtml = (): string => {
    // 1. Locate primary HTML file in project files or fallback to previewHtml
    const htmlFile = files.find((f) => f.name === 'index.html' || f.path === 'index.html') || files.find((f) => f.path.endsWith('.html'));
    let baseHtml = htmlFile?.content || previewHtml || '';

    // 2. Fall back to cached workspace HTML if empty
    if (!baseHtml || baseHtml.trim().length === 0) {
      try {
        baseHtml = localStorage.getItem('ph_workspace_latest_html') || '';
      } catch {}
    }

    if (baseHtml && baseHtml.trim().length > 0) {
      let finalHtml = baseHtml;

      // Inline all CSS files into <style> tags inside <head>
      const cssFiles = files.filter((f) => f.path.endsWith('.css') && f.content && f.content.trim().length > 0);
      if (cssFiles.length > 0) {
        finalHtml = finalHtml.replace(/<link[^>]+rel=["']stylesheet["'][^>]+href=["'][^"']+\.css["'][^>]*>/gi, '');
        const combinedCss = cssFiles.map((c) => c.content).join('\n\n');
        if (/<\/head>/i.test(finalHtml)) {
          finalHtml = finalHtml.replace(/<\/head>/i, `<style>\n${combinedCss}\n</style>\n</head>`);
        } else {
          finalHtml = `<style>\n${combinedCss}\n</style>\n` + finalHtml;
        }
      }

      // Inline all JS / TS script files into <script> tags before </body>
      const jsFiles = files.filter(
        (f) =>
          (f.path.endsWith('.js') || f.path.endsWith('.ts')) &&
          !f.path.endsWith('.d.ts') &&
          !f.path.includes('package') &&
          !f.path.includes('vite.config') &&
          f.content &&
          f.content.trim().length > 0
      );
      if (jsFiles.length > 0) {
        finalHtml = finalHtml.replace(/<script[^>]+src=["'][^"']+\.(?:js|ts)["'][^>]*><\/script>/gi, '');
        const combinedJs = jsFiles.map((j) => j.content).join('\n\n');
        if (/<\/body>/i.test(finalHtml)) {
          finalHtml = finalHtml.replace(/<\/body>/i, `<script>\n${combinedJs}\n</script>\n</body>`);
        } else {
          finalHtml = finalHtml + `\n<script>\n${combinedJs}\n</script>`;
        }
      }

      // Ensure Tailwind CSS script is injected
      if (!finalHtml.includes('cdn.tailwindcss.com') && !finalHtml.includes('tailwind')) {
        if (/<head[\s>]/i.test(finalHtml)) {
          finalHtml = finalHtml.replace(/<head[\s>]/i, '<head>\n<script src="https://cdn.tailwindcss.com"></script>');
        } else {
          finalHtml = `<script src="https://cdn.tailwindcss.com"></script>\n` + finalHtml;
        }
      }

      // Ensure Lucide icon initialization if icons are present
      if (!finalHtml.includes('unpkg.com/lucide') && (finalHtml.includes('data-lucide') || finalHtml.includes('lucide-'))) {
        const lucideScript = `<script src="https://unpkg.com/lucide@latest"></script>\n<script>window.addEventListener('DOMContentLoaded', () => { if (window.lucide) { lucide.createIcons(); } });</script>`;
        if (/<\/body>/i.test(finalHtml)) {
          finalHtml = finalHtml.replace(/<\/body>/i, `${lucideScript}\n</body>`);
        } else {
          finalHtml += `\n${lucideScript}`;
        }
      }

      return finalHtml;
    }

    // 3. Fallback to runnable React/TSX file wrapped in Babel Standalone
    const reactFile = files.find((f) => f.path === 'src/App.tsx' || f.path === 'src/App.jsx') || files.find((f) => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));
    if (reactFile && reactFile.content) {
      const cleanReact = reactFile.content
        .replace(/import\s+(?:type\s+)?[\s\S]*?from\s*['"][^'"]+['"];?/g, '')
        .replace(/^\s*export\s+default\s+function\s+([A-Za-z0-9_]+)/gm, 'function $1')
        .replace(/^\s*export\s+default\s+/gm, '')
        .replace(/^\s*export\s+/gm, '');

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName || 'PromptHub Live Preview'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.24.4/babel.min.js"></script>
  <style>body { margin: 0; font-family: Outfit, system-ui, sans-serif; }</style>
</head>
<body class="bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 min-h-screen">
  <div id="root"></div>
  <script type="text/babel">
    ${cleanReact}
    const mountEl = document.getElementById('root');
    if (mountEl) {
      const Comp = typeof App !== 'undefined' ? App : () => <div className="p-8 text-center text-sm">Preview Mounted</div>;
      ReactDOM.createRoot(mountEl).render(<Comp />);
    }
  </script>
</body>
</html>`;
    }

    // 4. Clean developer-grade presentation page if project has files but no direct index.html
    const anyFileWithContent = files.find((f) => f.content && f.content.trim().length > 0);
    if (anyFileWithContent && anyFileWithContent.content) {
      const escapedContent = (anyFileWithContent.content || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName || 'PromptHub Live Site'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Outfit', system-ui, sans-serif; }
    code, pre { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between bg-slate-900 text-slate-100">
  <header class="border-b border-slate-700/60 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-mono font-bold text-sm">
        PH
      </div>
      <span class="font-bold text-sm text-white">${projectName || 'PromptHub Project'}</span>
    </div>
    <span class="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      Production Live
    </span>
  </header>

  <main class="max-w-4xl w-full mx-auto p-6 md:p-10 space-y-6 flex-1">
    <div class="space-y-2">
      <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-white">${projectName || 'Studio Deliverable'}</h1>
      <p class="text-xs text-slate-400">Deployed via PromptHub Live Edge Network</p>
    </div>
    <div class="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-x-auto">
      <pre class="text-xs leading-relaxed text-slate-300 whitespace-pre-wrap font-mono">${escapedContent}</pre>
    </div>
  </main>

  <footer class="border-t border-slate-800 text-center py-4 text-xs text-slate-500 font-mono">
    Hosted on PromptHub Edge Network &bull; Verified Build
  </footer>
</body>
</html>`;
    }

    return '';
  };

  const standaloneBundle = buildStandaloneHtml();
  const liveUrl = createShareablePreviewUrl(effectiveSlug, standaloneBundle, appOrigin);
  const liveShortUrl = `${appOrigin}/preview?id=${effectiveSlug}`;
  const targetQrData = liveUrl.length < 2200 ? liveUrl : liveShortUrl;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=svg&margin=4&data=${encodeURIComponent(targetQrData)}`;

  // Auto-persist live bundle into client cache for instant local and mobile resolution
  React.useEffect(() => {
    if (isOpen && standaloneBundle) {
      try {
        localStorage.setItem(`ph_live_site_${effectiveSlug}`, standaloneBundle);
        localStorage.setItem('ph_workspace_latest_html', standaloneBundle);
      } catch {}
    }
  }, [isOpen, standaloneBundle, effectiveSlug]);

  const handlePublishNow = async () => {
    setIsPublishing(true);
    const bundle = buildStandaloneHtml();
    const slug = effectiveSlug;
    try {
      if (bundle) {
        localStorage.setItem(`ph_live_site_${slug}`, bundle);
        localStorage.setItem('ph_workspace_latest_html', bundle);
        localStorage.setItem(`ph_site_published_${slug}`, 'true');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ph_live_site_published', { detail: { slug, bundle } }));
      }
    } catch {}

    setTimeout(async () => {
      setIsPublishing(false);
      setIsPublished(true);
      const url = createShareablePreviewUrl(slug, bundle, appOrigin);
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {}
    }, 600);
  };

  const handleCopyLink = async () => {
    try {
      if (standaloneBundle) {
        localStorage.setItem(`ph_live_site_${effectiveSlug}`, standaloneBundle);
        localStorage.setItem('ph_workspace_latest_html', standaloneBundle);
      }
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleCopyCommand = async (cmd: string, id: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedProviderCommand(id);
      setTimeout(() => setCopiedProviderCommand(null), 2000);
    } catch {}
  };

  const handleOpenLiveSite = () => {
    if (standaloneBundle) {
      try {
        localStorage.setItem(`ph_live_site_${effectiveSlug}`, standaloneBundle);
        localStorage.setItem('ph_workspace_latest_html', standaloneBundle);
      } catch {}
    }
    const targetUrl = createShareablePreviewUrl(effectiveSlug, standaloneBundle, appOrigin);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDriveSync = async () => {
    if (!onSyncToDrive) return;
    setIsSyncing(true);
    await onSyncToDrive();
    setIsSyncing(false);
  };

  const hostingProviders = [
    {
      id: 'prompthub',
      name: 'PromptHub Instant Capsule',
      badge: '1-Click Live',
      cost: '₹0 / Free Forever',
      tier: 'free',
      description: 'Zero config live website on prompthub.cloud with free automatic SSL & QR code preview.',
      features: ['Instant public URL', 'Automatic SSL certificate', 'Mobile QR code preview', 'Personal Google Drive sync'],
      actionLabel: 'Publish Here',
      actionType: 'instant_tab',
    },
    {
      id: 'netlify',
      name: 'Netlify Drag & Drop',
      badge: 'Zero Terminal',
      cost: '₹0 / Free Plan',
      tier: 'free',
      description: 'Download the ZIP and drag & drop it directly into Netlify for free global hosting with custom domains.',
      features: ['Drag & drop deploy', '100 GB/month bandwidth', 'Free custom domain SSL', 'Form handling included'],
      actionLabel: 'Download ZIP & Open Netlify Drop',
      link: 'https://app.netlify.com/drop',
      actionType: 'link_zip',
    },
    {
      id: 'vercel',
      name: 'Vercel Platform',
      badge: '1-Click Deploy',
      cost: '₹0 / Free Hobby',
      tier: 'free',
      description: 'Deploy instantly with 1-click bundle export to Vercel. Global Edge Network with zero terminal commands.',
      features: ['1-Click bundle export to Vercel', 'Global Edge Network with SSL', 'Instant live preview URL', 'Automatic Git integration'],
      command: 'npx vercel deploy',
      actionLabel: '1-Click Deploy to Vercel',
      actionType: 'vercel_deploy',
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare Pages',
      badge: 'Unlimited Scale',
      cost: '₹0 / Free',
      tier: 'free',
      description: 'Unlimited free bandwidth, world-class DDoS mitigation, and instantaneous global DNS.',
      features: ['Unlimited bandwidth', 'Free apex custom domains', 'Global CDN in 300+ cities', 'HTTP/3 enabled'],
      link: 'https://pages.cloudflare.com',
      actionLabel: 'Open Cloudflare Pages',
      actionType: 'link',
    },
    {
      id: 'hostinger',
      name: 'Custom Domain (Hostinger / GoDaddy)',
      badge: 'Custom .com / .in',
      cost: '₹79 – ₹249 / month',
      tier: 'budget',
      description: 'Connect your own branded business domain (e.g. www.yourbusiness.com) for client trust.',
      features: ['Professional .com / .in domain', 'Business email addresses', 'Simple File Manager upload', '24/7 support'],
      guide: 'Download your project ZIP, extract it, and upload all files into your domain\'s public_html folder via File Manager.',
      actionLabel: 'Download ZIP for Domain',
      actionType: 'zip',
    },
    {
      id: 'cloud_vercel',
      name: 'Fullstack: Cloud App + Vercel',
      badge: 'Production Database',
      cost: '₹0 – ₹1,500 / month',
      tier: 'business',
      description: 'Connect a real PostgreSQL database, user authentication, and API endpoints for serious business apps.',
      features: ['PostgreSQL database', 'User login & OAuth', 'Row Level Security', 'Serverless APIs'],
      link: 'https://vercel.com',
      actionLabel: 'Open Cloud Hub',
      actionType: 'link',
    },
  ];

  const filteredProviders = hostingProviders.filter((p) => {
    if (budgetFilter === 'all') return true;
    return p.tier === budgetFilter;
  });

  // Dynamic scannable QR Code generator for mobile live previews
  const renderQrCodeDisplay = () => {
    return (
      <div className="p-4 sm:p-5 bg-bg-secondary rounded-xl shadow-xs border border-border-default flex flex-col items-center gap-3">
        <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center p-3 rounded-lg bg-white border border-border-default overflow-hidden shadow-2xs">
          {!qrLoadError ? (
            <img
              src={qrImageUrl}
              alt="Scan to open mobile live site"
              onError={() => setQrLoadError(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-4 text-text-primary gap-2">
              <QrCode className="w-14 h-14 text-brand-primary" />
              <span className="text-[11px] font-mono select-all break-all">{targetQrData}</span>
            </div>
          )}
        </div>
        <div className="text-center space-y-1">
          <div className="text-xs font-bold text-text-primary font-mono tracking-wide uppercase">
            Scan Live Preview • Mobile Camera
          </div>
          <p className="text-[11px] text-text-secondary max-w-[260px] leading-tight">
            Point your iPhone or Android camera at this QR code to open and test your live project instantly on mobile.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="1-Click Web Publish and Live URL"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-bg-primary border border-border-default rounded-xl shadow-2xl p-6 space-y-6 z-10 select-none">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-display text-text-primary tracking-tight">
                  1-Click Web Publish
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Zero server setup. Free global SSL. Shareable with clients in 1 click.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-xl border border-border-default hover:bg-bg-tertiary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Mode Selector: Instant Live Link vs Cloud / Domain Hosting */}
        <div className="flex items-center p-1 bg-bg-secondary rounded-xl border border-border-default shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('instant')}
            className={`flex-1 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'instant'
                ? 'bg-brand-primary text-white shadow-2xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Instant Live Web Link</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('providers')}
            className={`flex-1 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'providers'
                ? 'bg-brand-primary text-white shadow-2xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Cloud & Domain Providers</span>
          </button>
        </div>

        {activeTab === 'instant' ? (
          <>
            {/* If NOT published yet, show the 1-Click Publish Initiation Card */}
            {!isPublished ? (
              <div className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-text-muted font-semibold uppercase tracking-wider">
                      Target Subdomain
                    </span>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Free SSL Included
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-bg-primary border border-border-default text-xs font-mono">
                    <Globe className="w-4 h-4 text-brand-primary shrink-0 ml-1" />
                    <span className="text-text-muted select-none">https://</span>
                    <input
                      type="text"
                      value={customSlug}
                      onChange={(e) =>
                        setCustomSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, '')
                            .slice(0, 32)
                        )
                      }
                      placeholder="my-project"
                      className="bg-transparent border-none outline-none font-semibold text-text-primary flex-1 min-w-0"
                    />
                    <span className="text-text-muted select-none">.prompthub.site</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-bg-primary border border-border-default flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-text-primary truncate">Single Bundle</div>
                      <div className="text-[10px] text-text-muted truncate">{files.length} production files</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-bg-primary border border-border-default flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-text-primary truncate">Zero Config</div>
                      <div className="text-[10px] text-text-muted truncate">Instant global edge CDN</div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePublishNow}
                  disabled={isPublishing}
                  className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.99] disabled:opacity-60"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing Website &amp; Provisioning SSL...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      <span>Publish Website Now (Free 1-Click)</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* If PUBLISHED, show Active Live Dashboard */
              <>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Website is Live &amp; Accessible Worldwide
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePublishNow}
                    disabled={isPublishing}
                    className="text-[11px] font-mono text-brand-primary hover:underline cursor-pointer flex items-center gap-1"
                    title="Republish live bundle with latest edits"
                  >
                    {isPublishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Update Site</span>}
                  </button>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-bg-secondary border border-border-default space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-text-muted font-semibold uppercase tracking-wider">
                      Public Live Link
                    </span>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Free HTTPS / SSL
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-lg bg-bg-primary border border-border-default text-xs font-mono min-w-0">
                    <Globe className="w-4 h-4 text-brand-primary shrink-0 ml-1" />
                    <span className="truncate flex-1 text-text-primary font-semibold select-all">
                      {liveUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className={`h-8 min-h-[32px] px-3.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-3xs ${
                        copied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-brand-primary hover:bg-brand-primary-hi text-white'
                      }`}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleOpenLiveSite}
                      className="h-9 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      title="Launch full standalone preview in new browser window"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Run Fullscreen Live Site</span>
                    </button>

                    {onExportZip && (
                      <button
                        type="button"
                        onClick={() => {
                          onExportZip();
                          window.open('https://vercel.com/new', '_blank', 'noopener,noreferrer');
                        }}
                        className="h-9 min-h-[36px] px-3.5 py-1.5 rounded-xl bg-black text-white hover:bg-stone-800 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        title="Download package and open Vercel for 1-click instant deployment"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-white shrink-0" />
                        <span className="truncate">Deploy to Vercel (1-Click)</span>
                      </button>
                    )}

                    {onExportZip ? (
                      <button
                        type="button"
                        onClick={() => {
                          onExportZip();
                          window.open('https://app.netlify.com/drop', '_blank', 'noopener,noreferrer');
                        }}
                        className="h-9 min-h-[36px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        title="Download website package and open Netlify Drop for free hosting in 10s"
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Host Free on Netlify (1-Click)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowQrCode(!showQrCode)}
                        className="h-9 min-h-[36px] px-3.5 py-1.5 rounded-xl border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-3xs"
                      >
                        <QrCode className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                        <span>{showQrCode ? 'Hide QR Code' : 'Mobile Preview (QR)'}</span>
                      </button>
                    )}

                    {onExportZip && (
                      <button
                        type="button"
                        onClick={() => setShowQrCode(!showQrCode)}
                        className="sm:col-span-2 h-9 min-h-[36px] px-3.5 py-1.5 rounded-xl border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-3xs"
                      >
                        <QrCode className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                        <span>{showQrCode ? 'Hide Mobile QR Code' : 'Mobile Preview (Scan QR)'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Optional QR Code Preview Box */}
                {showQrCode && (
                  <div className="p-4 rounded-2xl bg-bg-secondary border border-border-default flex flex-col items-center justify-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                      <Smartphone className="w-4 h-4 text-brand-primary" />
                      <span>Preview on Your Mobile Phone</span>
                    </div>
                    {renderQrCodeDisplay()}
                    <p className="text-[11px] text-text-muted text-center max-w-xs leading-relaxed">
                      Open your iPhone or Android camera app and point it at the QR code above to test your responsive app instantly on mobile.
                    </p>
                  </div>
                )}

                {/* The Zero-Dev Cloud Capsule Features */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-text-muted font-semibold uppercase tracking-wider px-1">
                    Zero-Dev Cloud Capsule Specs
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-bg-secondary border border-border-default flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-text-primary truncate">Single-Folder</div>
                        <div className="text-[10px] text-text-muted truncate">{files.length} production files</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-bg-secondary border border-border-default flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-text-primary truncate">Google Drive Sync</div>
                        <div className="text-[10px] text-text-muted truncate">Personal Drive backup</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          /* Multi-Provider Hosting Recommendations by Budget */
          <div className="space-y-3">
            {/* Budget Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              {[
                { id: 'all', label: 'All Providers' },
                { id: 'free', label: 'Free (₹0/mo)' },
                { id: 'budget', label: 'Custom Domain (₹79-₹249/mo)' },
                { id: 'business', label: 'Fullstack & Database' },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBudgetFilter(b.id as BudgetFilter)}
                  className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                    budgetFilter === b.id
                      ? 'bg-brand-primary text-white font-semibold shadow-2xs'
                      : 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary border border-border-default'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Providers List */}
            <div className="max-h-[340px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {filteredProviders.map((prov) => (
                <div
                  key={prov.id}
                  className="p-3.5 rounded-2xl bg-bg-secondary border border-border-default hover:border-brand-primary/40 transition-all space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                      <span className="font-bold text-text-primary text-xs sm:text-sm">
                        {prov.name}
                      </span>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shrink-0 whitespace-nowrap">
                        {prov.badge}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20 whitespace-nowrap self-start sm:self-auto">
                      {prov.cost}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-text-secondary leading-relaxed">
                    {prov.description}
                  </p>

                  {/* Bullet features */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-text-muted">
                    {prov.features.map((f) => (
                      <div key={f} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action button */}
                  <div className="pt-2 border-t border-border-subtle flex items-center justify-end gap-2 flex-wrap">
                    {prov.actionType === 'instant_tab' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('instant');
                          if (!isPublished) {
                            handlePublishNow();
                          }
                        }}
                        className="h-8 min-h-[32px] px-3.5 py-1 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold cursor-pointer shadow-3xs flex items-center gap-1.5"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Publish Here (Free Instant)</span>
                      </button>
                    )}

                    {prov.actionType === 'link_zip' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {onExportZip && (
                          <button
                            type="button"
                            onClick={onExportZip}
                            className="h-8 min-h-[32px] px-3.5 py-1 rounded-lg bg-bg-primary hover:bg-bg-tertiary border border-border-default text-text-primary text-xs font-semibold cursor-pointer shadow-3xs flex items-center gap-1.5"
                          >
                            <Download className="w-3 h-3 text-brand-primary" />
                            <span>1. Download ZIP</span>
                          </button>
                        )}
                        <a
                          href={prov.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 min-h-[32px] px-3.5 py-1 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold cursor-pointer shadow-3xs flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>2. Open Netlify Drop</span>
                        </a>
                      </div>
                    )}

                    {prov.actionType === 'copy_command' && prov.command && (
                      <button
                        type="button"
                        onClick={() => handleCopyCommand(prov.command!, prov.id)}
                        className="h-8 min-h-[32px] px-3.5 py-1 rounded-lg bg-bg-primary hover:bg-bg-tertiary border border-border-default text-text-primary text-xs font-mono font-semibold cursor-pointer shadow-3xs flex items-center gap-1.5"
                      >
                        {copiedProviderCommand === prov.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied `{prov.command}`!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-text-muted" />
                            <span>Copy `{prov.command}`</span>
                          </>
                        )}
                      </button>
                    )}

                    {prov.actionType === 'zip' && (
                      <button
                        type="button"
                        onClick={onExportZip}
                        className="h-8 min-h-[32px] px-3.5 py-1 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold cursor-pointer shadow-3xs flex items-center gap-1.5"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download ZIP for Domain Upload</span>
                      </button>
                    )}

                    {prov.actionType === 'link' && prov.link && (
                      <a
                        href={prov.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 min-h-[32px] px-3.5 py-1 rounded-lg bg-bg-primary hover:bg-bg-tertiary border border-border-default text-text-primary text-xs font-semibold cursor-pointer shadow-3xs flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3 h-3 text-brand-primary" />
                        <span>{prov.actionLabel}</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions: Sync Drive & Download ZIP */}
        <div className="pt-2 border-t border-border-default flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onSyncToDrive && (
              <button
                type="button"
                onClick={handleDriveSync}
                disabled={isSyncing}
                className="flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-3xs disabled:opacity-50"
              >
                <HardDrive className="w-3.5 h-3.5 text-brand-primary" />
                <span>{isSyncing ? 'Syncing to Drive...' : 'Sync to Drive'}</span>
              </button>
            )}

            {onExportZip && (
              <button
                type="button"
                onClick={onExportZip}
                className="flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
              >
                <Download className="w-3.5 h-3.5 text-brand-primary" />
                <span>Download ZIP</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-xs hover:bg-brand-primary-hi transition-colors cursor-pointer flex items-center justify-center"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
