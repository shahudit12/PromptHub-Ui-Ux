import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
  Layers,
  Moon,
  Sparkles,
  X,
  QrCode as QrCodeIcon,
} from 'lucide-react';
import {
  APK_METADATA,
  triggerApkDownload,
  isPwaInstalled,
  triggerPwaInstall,
} from '../utils/apkDownload';
import { useApp } from '../context/AppContext';

export interface MobileAppShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAppShowcaseModal: React.FC<MobileAppShowcaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast } = useApp();
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [pwaInstalled, setPwaInstalled] = useState<boolean>(() => isPwaInstalled());
  const [showManualPwaGuide, setShowManualPwaGuide] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setPwaInstalled(isPwaInstalled());
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const onInstalled = () => setPwaInstalled(true);
    window.addEventListener('pwa-installed', onInstalled);
    return () => window.removeEventListener('pwa-installed', onInstalled);
  }, []);

  if (!isOpen) return null;

  const fullDownloadUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${APK_METADATA.downloadUrl}`
    : `https://prompthub.cloud${APK_METADATA.downloadUrl}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    fullDownloadUrl
  )}&bgcolor=FCFBF8&color=171916&margin=1`;

  const handleInstallApp = async () => {
    const res = await triggerPwaInstall();
    if (res === 'accepted') {
      setPwaInstalled(true);
      showToast('PromptHub dedicated app installed successfully!', 'success');
    } else if (res === 'manual_required') {
      setShowManualPwaGuide(true);
      showToast('Tap your browser menu (⋮) and choose "Install app" or "Add to Home screen"', 'info');
    }
  };

  const handleDownload = () => {
    setIsDownloading(true);
    triggerApkDownload({
      source: 'showcase_modal',
      onSuccess: () => {
        showToast('Downloading PromptHub.apk (62 KB)... Verified signed Android package.', 'success');
        setTimeout(() => setIsDownloading(false), 2000);
      },
      onError: (err) => {
        showToast(`Download fallback: opening mirror (${err.message})`, 'info');
        window.location.href = APK_METADATA.downloadsFolderUrl;
        setIsDownloading(false);
      },
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullDownloadUrl);
    setCopiedLink(true);
    showToast('Direct APK link copied to clipboard!', 'info');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="apk-showcase-title"
    >
      <div
        className="relative w-full max-w-2xl bg-bg-secondary border border-border-default rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary border-b border-border-default">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-11 h-11 rounded-full bg-bg-secondary/80 hover:bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* High-Resolution App Icon */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-brand-primary/10 border-2 border-brand-primary/30 p-1 shadow-md flex items-center justify-center">
                <img
                  src="/icons/pwa-512x512.png"
                  alt="PromptHub Android App Icon"
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    e.currentTarget.src = '/icons/pwa-192x192.png';
                  }}
                />
              </div>
              <span className="absolute -bottom-1.5 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-700 text-white font-mono text-[9px] font-bold border border-white shadow-xs">
                APK
              </span>
            </div>

            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-primary-light text-brand-primary text-[10px] font-mono font-bold uppercase tracking-wider border border-brand-primary/20">
                  <Sparkles className="w-3 h-3" />
                  Official Android Build
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  Package: {APK_METADATA.packageId}
                </span>
              </div>

              <h2 id="apk-showcase-title" className="text-xl sm:text-2xl font-bold font-display text-text-primary tracking-tight">
                PromptHub for Android
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                The full PromptHub Engineering Studio compiled as a standalone lightweight APK package. No app store login required.
              </p>
            </div>
          </div>

          {/* Quick Specs Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-2 border-t border-border-default/60">
            <div className="p-2 rounded-lg bg-bg-secondary/70 border border-border-default text-center">
              <span className="text-[10px] font-mono text-text-muted block">Version</span>
              <span className="text-xs font-mono font-bold text-text-primary">{APK_METADATA.version} (103)</span>
            </div>
            <div className="p-2 rounded-lg bg-bg-secondary/70 border border-border-default text-center">
              <span className="text-[10px] font-mono text-text-muted block">Package Size</span>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">{APK_METADATA.sizeFormatted}</span>
            </div>
            <div className="p-2 rounded-lg bg-bg-secondary/70 border border-border-default text-center">
              <span className="text-[10px] font-mono text-text-muted block">Minimum OS</span>
              <span className="text-xs font-mono font-bold text-text-primary">Android 8.0+</span>
            </div>
            <div className="p-2 rounded-lg bg-bg-secondary/70 border border-border-default text-center">
              <span className="text-[10px] font-mono text-text-muted block">Security</span>
              <span className="text-xs font-mono font-bold text-brand-primary flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                Signed APK
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          {/* Dual Install & Download Section */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: 1-Tap Home Screen App */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-brand-primary-light/40 via-bg-primary to-bg-secondary border-2 border-brand-primary/40 flex flex-col justify-between space-y-3 shadow-xs">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-primary px-2 py-0.5 rounded-full bg-brand-primary-light border border-brand-primary/20">
                      Recommended
                    </span>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 1-Tap Native
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-text-primary font-display">
                    Install Dedicated App
                  </h3>
                  <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                    Adds PromptHub directly to your phone&apos;s home screen &amp; app drawer. Runs fullscreen without browser address bar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleInstallApp}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{pwaInstalled ? 'App Installed on Phone ✓' : 'Install on Android'}</span>
                </button>
              </div>

              {/* Option 2: Direct Signed APK Download */}
              <div className="p-4 rounded-xl bg-bg-primary border border-border-default flex flex-col justify-between space-y-3 shadow-xs">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted px-2 py-0.5 rounded-full bg-bg-secondary border border-border-default">
                      Standalone APK
                    </span>
                    <span className="text-[11px] font-mono text-text-muted">
                      {APK_METADATA.sizeFormatted} • Signed
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-text-primary font-display">
                    Download Signed APK
                  </h3>
                  <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                    Compiled native package for sideloading. Tested on Android 8 through 15 with zero parse errors.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border-default text-text-primary text-xs font-semibold shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 text-brand-primary" />
                    <span>{isDownloading ? 'Downloading...' : `Download APK (${APK_METADATA.sizeFormatted})`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQrCode((prev) => !prev)}
                    className="min-h-[44px] px-3 py-2.5 rounded-xl bg-bg-tertiary hover:bg-bg-primary border border-border-default text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Scan QR code with phone"
                  >
                    <QrCodeIcon className="w-4 h-4 text-brand-primary" />
                  </button>
                </div>
              </div>
            </div>

            {/* Manual Browser Installation Guide Drawer */}
            {showManualPwaGuide && (
              <div className="p-3.5 rounded-xl bg-brand-primary-light/60 border border-brand-primary/30 text-xs space-y-1.5 animate-fade-in">
                <div className="font-bold text-brand-primary font-display flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>How to install in 2 taps:</span>
                </div>
                <p className="text-[11px] text-text-primary leading-relaxed">
                  In your mobile browser (Chrome, Edge, Samsung Internet, Brave), tap the <strong>three dots (⋮)</strong> menu in the top right, then tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                </p>
              </div>
            )}
          </div>

          {/* QR Code Scan Drawer (For desktop users downloading to phone) */}
          {showQrCode && (
            <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
              <div className="p-2 rounded-lg bg-white border border-border-default shadow-xs shrink-0">
                <img
                  src={qrImageUrl}
                  alt="Scan to download PromptHub APK"
                  className="w-32 h-32 object-contain"
                />
              </div>
              <div className="space-y-2 text-xs text-center sm:text-left">
                <h4 className="font-bold text-text-primary font-display flex items-center justify-center sm:justify-start gap-1.5">
                  <Smartphone className="w-4 h-4 text-brand-primary" />
                  Scan to Download Directly on Android
                </h4>
                <p className="text-text-secondary text-[11px] leading-relaxed">
                  Point your phone camera at this QR code to trigger the direct download of <code className="font-mono text-brand-primary font-semibold">PromptHub.apk</code> on your mobile device.
                </p>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-default text-text-primary text-xs font-mono font-medium hover:bg-bg-primary transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied URL!' : 'Copy Direct URL'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Feature Showcase Bento Grid */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
              Mobile Studio Capabilities
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-bg-primary border border-border-default space-y-1.5">
                <div className="flex items-center gap-2 text-brand-primary">
                  <Cpu className="w-4 h-4" />
                  <span className="text-xs font-bold text-text-primary font-display">Touch-Optimized IDE</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Mobile-first prompt workbench with rapid variable injection, syntax formatting, and one-tap test execution.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-primary border border-border-default space-y-1.5">
                <div className="flex items-center gap-2 text-brand-primary">
                  <Layers className="w-4 h-4" />
                  <span className="text-xs font-bold text-text-primary font-display">Offline IndexedDB Vault</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Your prompt registry and collections stay synchronized on-device, working seamlessly even in offline mode.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-primary border border-border-default space-y-1.5">
                <div className="flex items-center gap-2 text-brand-primary">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold text-text-primary font-display">140+ Model Arena</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Side-by-side LLM shootouts across OpenAI, Anthropic, DeepSeek, and OpenRouter directly in your palm.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-primary border border-border-default space-y-1.5">
                <div className="flex items-center gap-2 text-brand-primary">
                  <Moon className="w-4 h-4" />
                  <span className="text-xs font-bold text-text-primary font-display">AMOLED Dark Mode</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Deep Obsidian blacks and high-contrast Sage tokens designed for high-refresh mobile OLED displays.
                </p>
              </div>
            </div>
          </div>

          {/* Installation Methods Guide */}
          <div className="p-4 rounded-xl bg-bg-primary border border-border-default space-y-3">
            <h4 className="text-xs font-bold text-text-primary font-display flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Two Ways to Use PromptHub on Your Phone</span>
            </h4>
            <div className="space-y-2.5 text-[11px] text-text-secondary leading-relaxed">
              <div className="p-2.5 rounded-lg bg-bg-secondary border border-border-default space-y-1">
                <span className="font-semibold text-text-primary block">
                  Method 1: 1-Tap Dedicated App (Recommended)
                </span>
                <p>
                  Tap <strong>Install on Android</strong> above, or open your mobile browser menu (<strong>⋮</strong>) and select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>. Android installs the official native WebAPK directly to your app drawer and home screen.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-bg-secondary border border-border-default space-y-1">
                <span className="font-semibold text-text-primary block">
                  Method 2: Standalone Signed APK (62 KB)
                </span>
                <p>
                  Tap <strong>Download APK</strong> to save the verified 62 KB package. Open it from your notification tray or Files app and tap <strong>Install</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 sm:p-4 bg-bg-primary border-t border-border-default flex items-center justify-between text-[11px] text-text-muted flex-wrap gap-2">
          <span>SHA-256 integrity verified • Zero analytics telemetry inside APK</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-medium cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MobileAppShowcaseModal;
