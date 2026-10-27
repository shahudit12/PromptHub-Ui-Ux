import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Scale, 
  DollarSign, 
  ShoppingBag, 
  RotateCcw, 
  Users, 
  AlertTriangle, 
  Lock, 
  Clock, 
  Search, 
  Landmark,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  Building,
  CheckCircle2,
  FileCheck2,
  Cookie,
  Sliders,
  Trash2,
  CreditCard,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cookieConsentService, type CookiePreferences } from '../services/cookieConsentService';

export type LegalDocType = 
  | 'terms'
  | 'promo-terms'
  | 'privacy'
  | 'cookies'
  | 'marketplace'
  | 'seller'
  | 'buyer'
  | 'refunds'
  | 'community'
  | 'copyright'
  | 'moderation'
  | 'aup'
  | 'kyc'
  | 'payouts';

interface LegalDocMeta {
  id: LegalDocType;
  title: string;
  category: 'Platform' | 'Marketplace' | 'Compliance' | 'Community';
  lastUpdated: string;
  summary: string;
  canonicalUrl: string;
  icon: React.ComponentType<any>;
}

const LEGAL_DOCS: LegalDocMeta[] = [
  {
    id: 'terms',
    title: 'Terms of Service',
    category: 'Platform',
    lastUpdated: 'February 2026',
    summary: 'Core contractual agreement governing access, active development disclaimers, finality of decisions, BYOK keys, commercial licenses, and dispute resolution.',
    canonicalUrl: 'https://prompthub.cloud/terms',
    icon: FileText,
  },
  {
    id: 'privacy',
    title: 'Privacy Policy & DPDP Statutory Notice',
    category: 'Compliance',
    lastUpdated: 'February 2026',
    summary: 'Statutory data protection disclosure adhering to DPDP Act 2023, MeitY DPDP Rules 2025, GDPR, CCPA, zero-retention BYOK vaulting, Mixpanel product telemetry, and 500 MB cloud drive quotas.',
    canonicalUrl: 'https://prompthub.cloud/privacy',
    icon: Lock,
  },
  {
    id: 'cookies',
    title: 'Cookie Policy & Consent Center',
    category: 'Compliance',
    lastUpdated: 'February 2026',
    summary: 'Statutory transparency regarding browser local storage keys, session security tokens, telemetry, and interactive consent controls.',
    canonicalUrl: 'https://prompthub.cloud/cookies',
    icon: Cookie,
  },
  {
    id: 'marketplace',
    title: 'Marketplace Terms & Digital Licensing',
    category: 'Marketplace',
    lastUpdated: 'February 2026',
    summary: 'Rules governing catalog listings, digital software assets, multi-currency processing, and commercial intellectual property grants.',
    canonicalUrl: 'https://prompthub.cloud/legal?doc=marketplace',
    icon: ShoppingBag,
  },
  {
    id: 'seller',
    title: 'Seller Terms & Revenue Share Policy',
    category: 'Marketplace',
    lastUpdated: 'February 2026',
    summary: 'Platform commission breakdown (20%), creator originality warranties, and Section 194-O statutory TDS tax deductions.',
    canonicalUrl: 'https://prompthub.cloud/legal?doc=seller',
    icon: DollarSign,
  },
  {
    id: 'buyer',
    title: 'Buyer Terms & Commercial License Scope',
    category: 'Marketplace',
    lastUpdated: 'February 2026',
    summary: 'Perpetual worldwide commercial license grant, enterprise integration rights, and restrictions on standalone asset resale.',
    canonicalUrl: 'https://prompthub.cloud/legal?doc=buyer',
    icon: Scale,
  },
  {
    id: 'payouts',
    title: 'Payout & Settlement Escrow Policy',
    category: 'Marketplace',
    lastUpdated: 'February 2026',
    summary: 'The 7-business-day settlement window countdown (v1_7_business_days), Razorpay Route & Stripe Connect rails, and double-entry ledgers.',
    canonicalUrl: 'https://prompthub.cloud/legal?doc=payouts',
    icon: Clock,
  },
  {
    id: 'refunds',
    title: 'Refund & Compensating Ledger Policy',
    category: 'Marketplace',
    lastUpdated: 'February 2026',
    summary: 'Strict digital goods non-tangible policy, technical defect exception criteria, and automated compensating double-entry reversals.',
    canonicalUrl: 'https://prompthub.cloud/legal?doc=refunds',
    icon: RotateCcw,
  },
  {
    id: 'aup',
    title: 'Acceptable Use Policy (AUP)',
    category: 'Platform',
    lastUpdated: 'February 2026',
    summary: 'Zero-tolerance prohibition on malware, exploits, CSAM, prompt injections, automated safety bypasses, and API rate abuse.',
    canonicalUrl: 'https://prompthub.cloud/legal?doc=aup',
    icon: FileText,
  },
  {
    id: 'kyc',
    title: 'Seller KYC & Statutory Verification',
    category: 'Compliance',
    lastUpdated: 'February 2026',
    summary: 'Identity verification requirements, PAN/GST statutory declarations in India, and international W-8/W-9 tax forms.',
    canonicalUrl: 'https://prompthub.cloud/legal?doc=kyc',
    icon: Landmark,
  },
  {
    id: 'copyright',
    title: 'Copyright & DMCA Takedown Policy',
    category: 'Compliance',
    lastUpdated: 'February 2026',
    summary: 'DMCA 17 U.S.C. § 512 notice and takedown framework, counter-notice protocols, and two-strike repeat infringer termination.',
    canonicalUrl: 'https://prompthub.cloud/legal?doc=copyright',
    icon: ShieldCheck,
  },
  {
    id: 'moderation',
    title: 'Content Moderation & Guardrails',
    category: 'Compliance',
    lastUpdated: 'February 2026',
    summary: 'Automated guardrail scanning, secret leak detection, toxic content filtering, administrative reviews, and 72-hour appeal SLAs.',
    canonicalUrl: 'https://prompthub.cloud/legal?doc=moderation',
    icon: AlertTriangle,
  },
  {
    id: 'community',
    title: 'Community Guidelines & Attribution',
    category: 'Community',
    lastUpdated: 'February 2026',
    summary: 'Developer code of conduct, immutable upstream creator attribution on forked prompts, and anti-spam quality thresholds.',
    canonicalUrl: 'https://prompthub.cloud/legal?doc=community',
    icon: Users,
  },
];

export const LegalView: React.FC<{ initialDoc?: LegalDocType }> = ({ initialDoc = 'terms' }) => {
  const { setActiveTab } = useApp();
  const [selectedDoc, setSelectedDoc] = useState<LegalDocType>(initialDoc);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [cookiePrefs, setCookiePrefs] = useState<CookiePreferences>(() => cookieConsentService.getPreferences());
  const [cookieSavedToast, setCookieSavedToast] = useState(false);

  useEffect(() => {
    if (initialDoc && LEGAL_DOCS.some(d => d.id === initialDoc)) {
      setSelectedDoc(initialDoc);
    }
  }, [initialDoc]);

  useEffect(() => {
    return cookieConsentService.subscribe((prefs) => {
      setCookiePrefs(prefs);
    });
  }, []);

  const handleToggleCookie = (category: keyof CookiePreferences) => {
    if (category === 'necessary' || category === 'timestamp' || category === 'version') return;
    setCookiePrefs(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSaveCookiePrefs = () => {
    cookieConsentService.savePreferences(cookiePrefs);
    setCookieSavedToast(true);
    setTimeout(() => setCookieSavedToast(false), 2500);
  };

  const handleAcceptAllCookies = () => {
    const updated = cookieConsentService.acceptAll();
    setCookiePrefs(updated);
    setCookieSavedToast(true);
    setTimeout(() => setCookieSavedToast(false), 2500);
  };

  const handleRejectNonEssentialCookies = () => {
    const updated = cookieConsentService.rejectNonEssential();
    setCookiePrefs(updated);
    setCookieSavedToast(true);
    setTimeout(() => setCookieSavedToast(false), 2500);
  };

  // Sync window URL search param when switching docs if on /legal
  const handleSelectDoc = (id: LegalDocType) => {
    setSelectedDoc(id);
    if (typeof window !== 'undefined') {
      try {
        if (id === 'terms') {
          window.history.replaceState(null, '', '/terms');
        } else if (id === 'privacy') {
          window.history.replaceState(null, '', '/privacy');
        } else if (id === 'cookies') {
          window.history.replaceState(null, '', '/cookies');
        } else {
          window.history.replaceState(null, '', `/legal?doc=${id}`);
        }
      } catch {}
    }
  };

  const filteredDocs = useMemo(() => {
    return LEGAL_DOCS.filter(d =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const currentDoc = useMemo(() => {
    return LEGAL_DOCS.find(d => d.id === selectedDoc) || LEGAL_DOCS[0];
  }, [selectedDoc]);

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentDoc.canonicalUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-bg-primary text-left font-sans select-text">
      {/* ─── MOBILE POLICY SELECTOR (<md) ─── */}
      <div className="md:hidden p-3 border-b border-border-default bg-bg-secondary shrink-0 flex items-center justify-between gap-2.5">
        <div className="flex-1 min-w-0">
          <label htmlFor="mobile-legal-select" className="text-[10px] font-mono uppercase font-bold text-text-muted mb-1 block">
            Legal Document ({LEGAL_DOCS.length} Frameworks)
          </label>
          <select
            id="mobile-legal-select"
            value={selectedDoc}
            onChange={(e) => handleSelectDoc(e.target.value as any)}
            className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-bg-tertiary border border-border-default text-xs font-semibold text-text-primary focus:outline-none focus:border-brand-primary cursor-pointer"
          >
            {LEGAL_DOCS.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.title} ({doc.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── DESKTOP SIDEBAR NAVIGATION (md+) ─── */}
      <aside aria-label="Legal documents directory" className="hidden md:flex md:w-80 border-r border-border-default bg-bg-secondary flex-col shrink-0 h-full">
        <div className="p-4 border-b border-border-default space-y-3 bg-bg-secondary">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-primary-light flex items-center justify-center text-brand-primary border border-brand-primary/20 shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-display text-text-primary tracking-tight">Legal &amp; Policy Studio</h3>
              <p className="text-[11px] text-text-secondary">Official agreements, terms &amp; notices.</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policies or terms..."
              className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredDocs.map(doc => {
            const Icon = doc.icon;
            const isSelected = selectedDoc === doc.id;
            return (
              <button
                key={doc.id}
                onClick={() => handleSelectDoc(doc.id)}
                className={`w-full p-2.5 rounded-lg text-left transition-all flex items-start gap-2.5 cursor-pointer min-h-[44px] ${
                  isSelected
                    ? 'bg-bg-secondary border border-brand-primary/30 text-text-primary shadow-xs font-semibold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-brand-primary' : 'text-text-muted'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold truncate text-text-primary">{doc.title}</span>
                    <span className="text-[9px] font-mono uppercase text-text-muted px-1.5 py-0.5 rounded bg-bg-tertiary border border-border-default shrink-0">
                      {doc.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted line-clamp-1 leading-snug mt-0.5">{doc.summary}</p>
                </div>
              </button>
            );
          })}
          {filteredDocs.length === 0 && (
            <div className="p-6 text-center text-xs text-text-muted">
              No matching legal policies found for "{searchQuery}".
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border-default bg-bg-tertiary/60 text-[11px] text-text-secondary flex items-center justify-between">
          <span className="font-mono text-[10px]">12 Active Frameworks</span>
          <span className="text-brand-primary font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-brand-primary" /> Verified Legal
          </span>
        </div>
      </aside>

      {/* ─── MAIN DOCUMENT VIEWER ─── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-bg-primary">
        {/* Top Control Action Bar */}
        <div className="px-6 py-3 border-b border-border-default bg-bg-secondary flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-brand-primary-light text-brand-primary px-2.5 py-1 rounded border border-brand-primary/20 shrink-0">
              {currentDoc.category}
            </span>
            <span className="text-xs font-mono text-text-muted truncate">
              Canonical: <span className="text-text-primary font-semibold select-all">{currentDoc.canonicalUrl}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-xs font-medium text-text-primary transition-colors cursor-pointer min-h-[36px] shadow-xs"
              title="Copy official link"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied URL</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-text-muted" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Policy Body */}
        <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-bg-primary">
          <article className="max-w-4xl mx-auto space-y-8">
            {/* Document Header Hero */}
            <header className="border-b border-border-default pb-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-brand-primary" />
                  <span className="text-xs font-mono text-text-secondary font-semibold uppercase tracking-wider">
                    PromptHub Official Legal Repository
                  </span>
                </div>
                <div className="text-xs text-text-muted font-mono bg-bg-tertiary px-2.5 py-1 rounded border border-border-default">
                  Last Amended: {currentDoc.lastUpdated}
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-text-primary tracking-tight">
                {currentDoc.title}
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed pt-1">
                {currentDoc.summary}
              </p>

              {/* Direct Canonical Link Callout Banner */}
              <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2 text-text-secondary font-mono text-[11px]">
                  <ExternalLink className="w-4 h-4 text-brand-primary shrink-0" />
                  <span>Public URL:</span>
                  <a 
                    href={currentDoc.canonicalUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-brand-primary font-bold hover:underline break-all"
                  >
                    {currentDoc.canonicalUrl}
                  </a>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="text-[11px] font-mono font-semibold text-brand-primary hover:text-brand-primary-hi underline cursor-pointer shrink-0"
                >
                  {copiedUrl ? 'Copied to Clipboard!' : '1-Click Copy Canonical Link'}
                </button>
              </div>
            </header>

            {/* ══════════════════════════════════════════════════════════════
                POLICY CONTENT RENDERER
            ══════════════════════════════════════════════════════════════ */}
            <div className="text-text-secondary space-y-8 leading-relaxed text-xs sm:text-sm">
              
              {/* Universal Master Zero-Liability & Sole User Responsibility Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-text-primary text-xs sm:text-sm space-y-3 shadow-xs">
                <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400 font-bold font-display text-sm sm:text-base uppercase tracking-wide">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Master Legal Disclaimer — Zero Platform Liability &amp; 100% Absolute User Responsibility</span>
                </div>
                <p className="text-text-primary font-semibold leading-relaxed">
                  <strong>PROMPTHUB, ITS CREATOR(S), DEVELOPER(S), OPERATOR(S), AFFILIATES, AND CONTRIBUTORS BEAR ZERO LIABILITY WHATSOEVER UNDER ANY LEGAL THEORY.</strong> All services, AI inference routing, prompt engineering IDE features, deterministic analysis rubrics, cloud storage integrations, payment processing, and community tools are provided strictly <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> without express, implied, or statutory warranties of any kind.
                </p>
                <div className="space-y-1.5 text-text-secondary leading-relaxed pt-1 border-t border-amber-500/20 text-xs">
                  <p>
                    <strong>THE USER BEARS 100% EXCLUSIVE, UNCONDITIONAL RESPONSIBILITY AND LIABILITY FOR:</strong>
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Prompt Inputs &amp; Uploads:</strong> All text, code, images, photos, audio dictations, files, and data submitted or published to PromptHub. You represent and warrant that you possess all rights to submit such content and that it violates no third-party rights or laws.</li>
                    <li><strong>AI Model Outputs &amp; Hallucinations:</strong> All responses, generated software code, images, advice, or suggestions generated by frontier foundation models (OpenRouter, OpenAI, Anthropic, Google Gemini, Groq, DeepSeek, Mistral, xAI, etc.). You must independently audit, verify, and validate all AI output before production, commercial, medical, financial, or legal utilization.</li>
                    <li><strong>Third-Party API Usage &amp; BYOK Billing:</strong> All financial charges, token consumptions, rate limits, overage fees, account bans, or terms-of-service violations incurred with third-party providers when connecting your personal or corporate API keys.</li>
                    <li><strong>Regulatory &amp; Legal Compliance:</strong> Complete compliance with all applicable local, state, national, and international laws, intellectual property rights, export controls, and privacy frameworks (including DPDP Act 2023 and GDPR).</li>
                  </ul>
                  <p className="pt-1 font-medium text-text-primary">
                    <strong>IF ANYTHING HAPPENS, BREAKS, OR FAILS, YOU ARE 100% SOLELY RESPONSIBLE.</strong> By using this platform, you explicitly agree to fully indemnify, defend, and hold harmless PromptHub and its developers from any claims, suits, losses, liabilities, costs, or damages.
                  </p>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  1. TERMS OF SERVICE
              ───────────────────────────────────────────────────────────── */}
              {selectedDoc === 'terms' && (
                <div className="space-y-8">
                  <div className="p-4 rounded-xl bg-brand-primary-light/40 border border-brand-primary/20 text-text-primary text-xs space-y-2">
                    <div className="flex items-center gap-2 text-brand-primary font-bold font-display text-sm">
                      <AlertTriangle className="w-4 h-4 text-brand-primary shrink-0" />
                      <span>Developer Studio Agreement &amp; Active Beta Notice</span>
                    </div>
                    <p className="text-text-secondary leading-relaxed">
                      These Terms of Service constitute a legally binding contract between you and PromptHub.cloud ("PromptHub", "we", "us", or "our"). <strong>PromptHub is currently under active, continuous software development in public beta.</strong> All operational and administrative determinations made by the PromptHub team are final and binding.
                    </p>
                  </div>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">01</span>
                      Acceptance of Terms &amp; Binding Legal Scope
                    </h2>
                    <p>
                      By creating an account, authenticating via OAuth (Google or GitHub), connecting third-party AI provider API credentials, purchasing prompt templates, uploading files to storage, or executing model benchmarks, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service, our Privacy Policy, and our Cookie Policy. If you do not agree, you must immediately cease all access and utilization of the Platform. You explicitly agree that your use of this service is at your own sole risk and that you bear 100% responsibility for all results and consequences.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">02</span>
                      Eligibility, Registration &amp; Account Integrity
                    </h2>
                    <p>
                      You must be at least 18 years of age or the age of legal majority in your jurisdiction to establish an account on PromptHub. You represent and warrant that all registration details provided (including email address, full legal name, and username) are accurate and truthful. You are solely responsible for safeguarding your session tokens, passwords, and multi-factor credentials, and for all activities initiated under your developer identity.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">03</span>
                      Active Platform Development &amp; Rapid Feature Evolution
                    </h2>
                    <p>
                      You expressly acknowledge and agree that <strong>PromptHub is in active, rapid continuous engineering development and public beta</strong>. Features, user interfaces, AI inference model routing pipelines, credit consumption formulas, prompt optimization algorithms, variable parsers, storage integrations, and API capabilities are subject to ongoing iterations, modifications, experimental rollouts, refactoring, and deprecations at any time without prior notice. PromptHub makes no guarantees regarding backward compatibility or uninterrupted availability of experimental or pre-release features.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">04</span>
                      Proportionate Operational Discretion &amp; Platform Protection
                    </h2>
                    <p>
                      PromptHub exercises reasonable and proportionate operational discretion to enforce these Terms, protect users and the platform, investigate abuse, maintain community safety, and take necessary moderation action.
                    </p>
                    <p>
                      Nothing in these Terms limits or excludes statutory consumer protections or legal remedies that cannot lawfully be excluded under applicable governing law.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">05</span>
                      Studio Platform License &amp; Permitted Developer Use
                    </h2>
                    <p>
                      Subject to your compliance with these Terms, PromptHub grants you a limited, non-exclusive, non-transferable, revocable license to access the Platform for prompt engineering, syntax analysis, variable templating, automated multi-model testing, collaborative workspace sharing, and commercial asset monetization in accordance with your subscription tier.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">06</span>
                      Bring Your Own Key (BYOK) &amp; Third-Party API Billing
                    </h2>
                    <p>
                      PromptHub features a client-vaulted BYOK architecture for major foundation model providers (including OpenAI, Anthropic, Google Gemini, Groq, DeepSeek, Mistral, xAI, Cohere, Together AI, and OpenRouter). When you supply your personal API keys or endpoints:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
                      <li>Keys are held ephemerally in browser session memory (sessionStorage) or encrypted local storage during your active browser session.</li>
                      <li>Prompt execution requests route directly or ephemerally through high-performance proxy gateways without plain-text persistence on our database servers.</li>
                      <li><strong>You remain 100% exclusively responsible</strong> for all financial charges, token consumptions, rate limits, overage fees, upstream account bans, and compliance obligations incurred on your third-party provider accounts or local infrastructure.</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">07</span>
                      Intellectual Property Ownership &amp; User-Generated Prompts
                    </h2>
                    <p>
                      You retain full intellectual property ownership, copyright, and all associated rights in original prompts, system instructions, dataset schemas, and agent workflows authored by you in private workspaces. PromptHub claims no ownership rights over your private prompt engineering IP.
                    </p>
                    <p>
                      By publishing prompts to the public PromptHub Community Catalog, you grant PromptHub and other developers a worldwide, non-exclusive, royalty-free license to view, test, and fork your prompt template with attribution preserved in metadata.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">08</span>
                      Marketplace Commercial Transactions &amp; Licensing
                    </h2>
                    <p>
                      PromptHub operates a commercial marketplace facilitating peer-to-developer digital software transactions. PromptHub acts solely as an online marketplace intermediary. When you list or purchase assets:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
                      <li>Purchases grant buyers a perpetual, non-exclusive, worldwide commercial license to incorporate the prompt template into proprietary applications and production software.</li>
                      <li>Buyers may not resell, sub-license, publicly distribute, or scrape raw templates into competing marketplaces.</li>
                      <li>PromptHub retains a configured platform commission (defaulting to 20.00% of gross transaction value) plus payment processing fees.</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">09</span>
                      AI Foundation Model Non-Determinism &amp; Output Disclaimers
                    </h2>
                    <p>
                      You expressly acknowledge that artificial intelligence foundation models (LLMs) operate probabilistically. PromptHub, its developers, and marketplace sellers do not guarantee or warrant that a given prompt will yield identical, deterministic, safe, accurate, or hallucination-free output across different model versions, inference providers, temperature parameters, or future model weight updates released by upstream AI vendors. You are solely responsible for verifying and validating all AI outputs prior to deployment or commercial utilization.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">10</span>
                      Acceptable Use &amp; Prohibited Conduct
                    </h2>
                    <p>
                      You agree not to use the Platform, its API endpoints, or its prompt execution engine to:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
                      <li>Generate malware, automated exploit payloads, cyberattack scripts, or ransomware.</li>
                      <li>Design adversarial jailbreaks or safety bypasses intended to circumvent provider safety classifiers.</li>
                      <li>Scrape, index, or harvest developer listings or private templates via automated bots or crawlers without express permission.</li>
                      <li>Launch denial-of-service (DoS) attacks, flood API gateways, or circumvent client-side rate limiters.</li>
                      <li>Publish deceptive, defamatory, fraudulent, or infringing third-party intellectual property.</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">11</span>
                      API Consumption, Token Quotas &amp; Telemetry
                    </h2>
                    <p>
                      Free tier accounts and subscription plans are subject to computational rate limits and token execution quotas. PromptHub reserves the right to throttle or temporarily suspend access if anomalous traffic patterns or abusive automation loops are detected by automated security monitoring.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">12</span>
                      Payment Processing, Subscriptions &amp; Invoicing
                    </h2>
                    <p>
                      All monetary transactions are processed through PCI-DSS Level 1 certified payment gateways (Stripe and Razorpay). Prices are listed in USD or INR. Subscription fees are billed in advance on a recurring monthly or annual basis and are non-refundable except where required by applicable statutory consumer protection law.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">13</span>
                      Credit Wallet, Micro-Top-Ups &amp; Permanent Balance Policy
                    </h2>
                    <p>
                      PromptHub operates on a transparent, developer-first AI credit economy:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
                      <li><strong>Micro-Top-Up Flexibility:</strong> Users may recharge their wallet with flexible micro-top-up amounts (starting from ₹10) or purchase monthly subscription plans.</li>
                      <li><strong>Permanent Validity:</strong> Purchased paid credits (via top-ups or plans) have lifetime validity and never expire.</li>
                      <li><strong>Immutable Financial Ledger:</strong> Every balance alteration is recorded in an append-only, double-entry cryptographic ledger in PostgreSQL.</li>
                      <li><strong>Zero Execution Markup:</strong> Managed model executions are deducted strictly according to transparent token usage and provider catalog rates.</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">14</span>
                      Third-Party Providers &amp; Infrastructure Boundaries
                    </h2>
                    <p>
                      The Platform relies on external cloud infrastructure (Supabase, Cloudflare, AWS, Google Drive, OpenRouter, AICredits.in) and AI inference partners. PromptHub and its developers do not control external service outages, latency spikes, or upstream provider policy alterations and shall not be liable for disruptions or losses arising from third-party vendor downtime.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">15</span>
                      Subscription Cancellation, Account Deletion &amp; Data Erasure
                    </h2>
                    <p>
                      PromptHub provides full self-service autonomy for your account lifecycle and billing status:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
                      <li><strong>Self-Service Subscription Cancellation:</strong> You may cancel any active paid subscription tier at any time by navigating to <em>Account Settings &rarr; Subscription Management</em> and clicking <strong>"Cancel Subscription"</strong>. Cancellation takes effect immediately, recurring billing is halted, and your account reverts to the Free Tier. All purchased wallet credits (paidCredits) possess lifetime validity and remain permanently accessible.</li>
                      <li><strong>Permanent Self-Service Account Deletion:</strong> You may permanently and irreversibly erase your account and all associated personal data at any time by navigating to <em>Account Settings &rarr; Danger Zone</em> and clicking <strong>"Delete Account"</strong>. Executing account deletion immediately wipes your developer profile, private prompt templates, draft workspaces, custom collections, and local/session BYOK encryption keys from our servers and your browser storage. This action is final and cannot be reversed.</li>
                      <li><strong>Administrative Termination for Cause:</strong> PromptHub reserves the right to suspend or permanently ban accounts without prior notice if you breach these Terms, deploy malicious cyber payloads, reverse-engineer proprietary security features, or circumvent rate-limiting mechanisms.</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">16</span>
                      Disclaimers of Warranties ("As-Is" &amp; "As-Available")
                    </h2>
                    <p className="font-mono text-xs text-text-secondary leading-relaxed bg-bg-secondary p-3.5 rounded-lg border border-border-default uppercase">
                      THE PLATFORM, PROMPT IDE WORKBENCH, 8-DIMENSION ANALYZER ENGINE, KNOWLEDGE GRAPH, GOOGLE DRIVE STORAGE VAULT, MULTI-MODEL ROUTING PIPELINES, MARKETPLACE CATALOG, AND ALL ASSOCIATED SERVICES ARE PROVIDED ON A STRICT "AS IS" AND "AS AVAILABLE" BASIS, WITH ALL FAULTS AND DEFECTS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, ACCURACY, AND NON-INFRINGEMENT.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">17</span>
                      Absolute Developer Immunity &amp; Total Exclusion of Liability
                    </h2>
                    <div className="p-4 sm:p-5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 text-text-primary text-xs space-y-3">
                      <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold font-display text-sm uppercase tracking-wide">
                        <AlertTriangle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
                        <span>The Developer Is Not Responsible For Anything — Complete Liability Disclaimer</span>
                      </div>
                      <p className="font-bold uppercase text-[11px] text-rose-900 dark:text-rose-200 leading-relaxed">
                        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE DEVELOPER(S), AUTHORS, ARCHITECTS, CONTRIBUTORS, FOUNDERS, MAINTAINERS, AND AFFILIATES OF PROMPTHUB BEAR ZERO LEGAL, FINANCIAL, OPERATIONAL, OR COMPLIANCE LIABILITY OR RESPONSIBILITY WHATSOEVER FOR ANY DIRECT, INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, PUNITIVE, OR EXEMPLARY DAMAGES, COSTS, CLAIMS, LOSSES, OR EXPENSES ARISING OUT OF OR IN ANY WAY CONNECTED WITH:
                      </p>
                      <ul className="list-disc pl-5 space-y-2 text-rose-900 dark:text-rose-200 text-[11px] leading-relaxed">
                        <li><strong>AI Model Outputs &amp; Hallucinations:</strong> Any output, code, responses, factual errors, hallucinations, security vulnerabilities, or harmful payloads generated by any third-party foundation model (including OpenAI, Anthropic, Google Gemini, Groq, DeepSeek, Mistral, xAI, or OpenRouter).</li>
                        <li><strong>BYOK &amp; Third-Party API Charges:</strong> Any financial charges, token consumptions, rate-limit bans, or billing overages incurred on your personal or corporate API provider accounts when using Bring Your Own Key (BYOK) features.</li>
                        <li><strong>Software Code Implementation &amp; Production Outages:</strong> Any data loss, application downtime, system failure, security breach, or operational disruption resulting from implementing or running code, prompts, system instructions, or scripts generated or analyzed on this platform.</li>
                        <li><strong>Marketplace Transactions &amp; Creator Assets:</strong> Any claims regarding prompt effectiveness, intellectual property originality, third-party copyright claims, or performance of templates listed or purchased on the PromptHub Marketplace.</li>
                        <li><strong>Storage, Google Drive &amp; Data Loss:</strong> Any loss, corruption, deletion, or synchronization failure of prompts, workspaces, assets, or files stored in the Google Drive storage layer or database vaults.</li>
                        <li><strong>Third-Party Outages &amp; Cloud Provider Failures:</strong> Any interruption, latency, data loss, or unavailability caused by Supabase, Cloudflare, AWS, Google Drive, Razorpay, or upstream AI inference hosts.</li>
                      </ul>
                      <p className="font-bold text-[11px] text-rose-900 dark:text-rose-200 pt-1">
                        YOU EXPRESSLY ACKNOWLEDGE AND AGREE THAT YOUR USE OF PROMPTHUB AND ANY GENERATED PROMPT ASSETS IS CONDUCTED ENTIRELY AT YOUR OWN SOLE AND EXCLUSIVE RISK. IF ANYTHING HAPPENS, YOU ASSUME 100% FULL AND EXCLUSIVE RESPONSIBILITY AND LIABILITY.
                      </p>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">18</span>
                      Limitation of Monetary Damages
                    </h2>
                    <p className="font-mono text-xs text-text-secondary leading-relaxed bg-bg-secondary p-3.5 rounded-lg border border-border-default uppercase">
                      IN NO EVENT SHALL PROMPTHUB'S OR THE DEVELOPER'S TOTAL AGGREGATE LIABILITY ARISING FROM ALL CLAIMS UNDER THESE TERMS EXCEED THE EXACT AMOUNT PAID BY YOU TO PROMPTHUB IN THE THIRTY (30) DAYS IMMEDIATELY PRECEDING THE CLAIM, OR $25.00 USD, WHICHEVER IS LESS.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">19</span>
                      Comprehensive User Indemnification
                    </h2>
                    <p>
                      You agree to fully defend, indemnify, and hold harmless the developers, creators, maintainers, authors, and operators of PromptHub against any and all claims, demands, liabilities, lawsuits, judgments, damages, penalties, and legal expenses (including attorney fees) arising from: (a) your use or misuse of the platform; (b) any prompts, assets, code, or data submitted or published by you; (c) any violation of third-party rights, intellectual property, or laws; or (d) any breach of these Terms.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">20</span>
                      Google Drive Storage &amp; Backup Layer Disclaimers
                    </h2>
                    <p>
                      The Google Drive storage integration, cloud file backup, and prompt export tools are provided as convenience developer utilities. PromptHub does not guarantee permanent persistence, uptime, or uncorrupted recovery of files stored in connected storage backends. You are solely responsible for maintaining external, redundant backups of all critical prompt engineering intellectual property, dataset files, and credentials.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">21</span>
                      Dispute Resolution &amp; Mandatory Arbitration
                    </h2>
                    <p>
                      Any dispute or claim arising out of these Terms shall first be submitted to good-faith informal negotiations for a period of at least thirty (30) days. If unresolved, disputes shall be finally settled through binding individual arbitration under the Arbitration and Conciliation Act, 1996, conducted in English. You waive any right to participate in class actions or representative proceedings.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">22</span>
                      Governing Law &amp; Jurisdiction
                    </h2>
                    <p>
                      These Terms are governed by and construed in accordance with the laws of the Republic of India. Subject to the arbitration provisions above, you consent to the exclusive jurisdiction and venue of the courts located in New Delhi, India.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">23</span>
                      Modifications to Terms &amp; Unsolicited Suggestions
                    </h2>
                    <p>
                      We may revise these Terms periodically to reflect product evolutions or statutory mandates. Continued use after revisions constitutes full acceptance. Any feedback, architectural suggestions, optimization algorithms, UI critiques, or bug reports submitted by you to PromptHub become the sole, exclusive, and royalty-free intellectual property of PromptHub without compensation or accounting obligations.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">24</span>
                      Contact &amp; Legal Notices
                    </h2>
                    <p>
                      For contractual queries, notices, or licensing permissions, please contact our legal counsel at <a href="mailto:prompthub.cloud@gmail.com" className="text-brand-primary font-mono font-bold hover:underline">prompthub.cloud@gmail.com</a>.
                    </p>
                  </section>

                  <section className="space-y-4 p-5 rounded-2xl bg-bg-secondary border border-border-default shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20 font-bold">25</span>
                      <h2 className="text-base font-bold font-display text-text-primary">
                        Subscription Cancellation &amp; Account Deletion Policy
                      </h2>
                    </div>
                    <div className="space-y-3 text-xs sm:text-sm text-text-secondary leading-relaxed">
                      <p>
                        <strong>Unconditional Subscription Cancellation:</strong> You maintain the absolute, unconditional right to cancel active paid subscriptions at any time without fees, penalties, or questions asked. When you cancel, your paid subscription benefits remain active through the end of your prepaid billing period, after which your account automatically reverts to the Free Explorer tier with zero recurring charges.
                      </p>
                      <p>
                        <strong>Permanent Account Erasure:</strong> You possess the absolute right to permanently delete your PromptHub account and wipe all associated personal data from our production databases. Deletion immediately purges your profile, authentication credentials, private prompt repositories, drafts, and client credential vault.
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('settings')}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Manage / Cancel Subscription</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('settings')}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Account &amp; Data</span>
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  2. PRIVACY POLICY & DPDP NOTICE
              ───────────────────────────────────────────────────────────── */}
              {selectedDoc === 'privacy' && (
                <div className="space-y-8">
                  <div className="p-4 rounded-xl bg-brand-primary-light/40 border border-brand-primary/20 text-text-primary text-xs space-y-1">
                    <strong className="block font-bold font-display text-sm text-brand-primary">
                      Statutory Privacy &amp; Data Fiduciary Disclosure
                    </strong>
                    <p className="text-text-secondary leading-relaxed">
                      PromptHub aligns its data protection practices with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act 2023)</strong> and the <strong>Digital Personal Data Protection Rules, 2025</strong> (issued on November 13, 2025 and published in the Gazette of India on November 14, 2025 by MeitY, reflecting phased commencement timelines), alongside principles of the EU <strong>General Data Protection Regulation (GDPR)</strong> where legitimately applicable.
                    </p>
                  </div>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">01</span>
                      Statutory Framework &amp; Data Fiduciary Identity
                    </h2>
                    <p>
                      PromptHub ("PromptHub.cloud") acts as the <strong>Data Fiduciary</strong> (under Indian law) and <strong>Data Controller</strong> (under EU GDPR) for personal data collected through your use of the developer workbench, account systems, marketplace rails, and analytical tools.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">02</span>
                      Categories of Personal Data Collected
                    </h2>
                    <p>We process only data strictly necessary for providing developer studio functionality:</p>
                    <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
                      <li><strong>Account Identifiers:</strong> Email address, full legal name, public developer username, avatar image, and OAuth provider tokens (Google / GitHub) authenticated directly via Supabase Auth. PromptHub maintains a transparent zero-promotional-credit policy: all designated free-tier AI models are accessible at 0 credits forever; execution of paid frontier foundation models requires purchasing developer credits or supplying personal BYOK API keys.</li>
                      <li><strong>Seller KYC Identifiers:</strong> Payout destination identifiers and tax records (where required by applicable statutory regulations for marketplace creator settlements).</li>
                      <li><strong>Billing &amp; Transaction Telemetry:</strong> Order IDs, purchase ledgers, transaction identifiers, and top-up verification records. PromptHub never receives or stores raw payment card numbers, CVVs, or UPI PINs; all monetary transactions are tokenized by PCI-DSS Level 1 certified gateways (Razorpay and Stripe).</li>
                      <li><strong>Technical &amp; Session Telemetry:</strong> IP addresses, browser user-agents, error logs (via privacy-scrubbed Sentry), and product feature telemetry (via Mixpanel with client-side IP scrubbing, zero prompt content capture, and opaque internal UUID distinct identifiers).</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">03</span>
                      Zero-Server-Retention BYOK Prompt &amp; Session Architecture
                    </h2>
                    <div className="p-3.5 rounded-lg bg-bg-secondary border border-border-default space-y-2">
                      <p className="font-semibold text-text-primary">
                        Privacy by Design: Your Prompt Workspaces &amp; API Keys
                      </p>
                      <p className="text-text-muted">
                        PromptHub enforces ephemeral in-memory session storage for BYOK execution. Provider API keys are held in browser sessionStorage during active tab sessions and route directly to model endpoints. Keys and private prompt payloads are <strong>never</strong> persisted on PromptHub database servers in plain text, nor used to train foundation models.
                      </p>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">04</span>
                      Lawful Basis &amp; Purposes of Processing
                    </h2>
                    <p>We collect and process personal data exclusively under the following lawful bases:</p>
                    <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
                      <li><strong>Contractual Necessity:</strong> To authenticate developers, provision IDE instances, route AI completions, and deliver purchased marketplace prompt templates.</li>
                      <li><strong>Statutory Compliance:</strong> To satisfy Section 194-O TDS tax withholding and reporting under the Indian Income-tax Act, 1961, and global tax compliance (IRS W-8/W-9).</li>
                      <li><strong>Legitimate Interests:</strong> To detect credential stuffing attacks, mitigate API fraud, prevent spam in community galleries, and optimize system latency.</li>
                      <li><strong>Explicit Consent:</strong> For developer newsletters, product announcements, and optional telemetry surveys (which can be revoked anytime).</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">05</span>
                      Consent Management &amp; Consent Revocation
                    </h2>
                    <p>
                      In compliance with DPDP Rules 2025, consent notices are presented in unambiguous language with clear itemization of specified purposes. You have the statutory right to withdraw consent at any time via Account Settings or by emailing our Data Protection Officer. Withdrawal of consent does not affect the legality of processing completed prior to revocation.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">06</span>
                      Cookies, Local Storage &amp; Triple-Tier Storage Vaults
                    </h2>
                    <p>
                      PromptHub uses strictly necessary browser local storage items and session cookies to maintain your login credentials, theme preferences, and IDE editor configuration. We do not deploy third-party cross-site advertising cookies or invasive ad pixels.
                    </p>
                    <p className="text-text-secondary">
                      For Work studio development, files and snapshots are stored across client-controlled tiers: local browser IndexedDB, user desktop PKZIP archive downloads, and user-connected Google Drive cloud vault storage (strictly capped at 500 MB for Free tier accounts). Your private workspace files remain under your sole custody.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">07</span>
                      Sub-Processors &amp; Third-Party Infrastructure
                    </h2>
                    <p>PromptHub engages trusted sub-processors subject to strict data protection commitments:</p>
                    <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
                      <li><strong>Supabase / AWS:</strong> Cloud database hosting, Supabase Auth identity infrastructure, and Row Level Security (RLS) policies.</li>
                      <li><strong>Mixpanel Inc.:</strong> Product analytics, activation funnels, tab telemetry, and feature adoption measurement. Mixpanel events are strictly pseudonymized using internal account UUIDs as distinct identifiers, client-side IP scrubbing is activated, and no prompt contents or financial credentials are ever transmitted.</li>
                      <li><strong>Stripe &amp; Razorpay:</strong> Checkout tokenization, digital orders, and automated creator payout routing adapters.</li>
                      <li><strong>Sentry:</strong> Diagnostic crash and runtime error tracking with automated PII and prompt scrubbing.</li>
                      <li><strong>Cloudflare:</strong> Edge CDN routing, DDoS shielding, and SSL/TLS termination.</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">08</span>
                      Third-Party AI Foundation Model Data-Processing Disclosures
                    </h2>
                    <p>
                      When you execute prompts using BYOK credentials or platform AI features, your prompt input is transmitted ephemerally to the selected model provider. PromptHub does not control external provider model-training policies. Upstream retention, safety screening, and data handling are governed strictly by each provider's independent privacy policy:
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-border-default bg-bg-secondary">
                      <table className="w-full text-left text-xs border-collapse font-mono">
                        <thead>
                          <tr className="bg-bg-secondary border-b border-border-default text-text-primary font-bold">
                            <th className="p-2.5">AI Provider</th>
                            <th className="p-2.5">Integration Type</th>
                            <th className="p-2.5">Data Transmission Scope</th>
                            <th className="p-2.5">Provider Policy Reference</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default text-text-secondary">
                          <tr>
                            <td className="p-2.5 font-semibold text-text-primary">OpenRouter</td>
                            <td className="p-2.5">BYOK Gateway</td>
                            <td className="p-2.5">Routes prompts to 200+ foundation models via unified API.</td>
                            <td className="p-2.5"><a href="https://openrouter.ai/privacy" target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">openrouter.ai/privacy</a></td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-semibold text-text-primary">OpenAI</td>
                            <td className="p-2.5">Direct BYOK API</td>
                            <td className="p-2.5">Direct execution against GPT-4o, o1, and o3-mini endpoints.</td>
                            <td className="p-2.5"><a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">openai.com/privacy</a></td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-semibold text-text-primary">Anthropic</td>
                            <td className="p-2.5">Direct BYOK API</td>
                            <td className="p-2.5">Direct execution against Claude 3.5 and Claude 3.7 Sonnet.</td>
                            <td className="p-2.5"><a href="https://www.anthropic.com/privacy" target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">anthropic.com/privacy</a></td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-semibold text-text-primary">Google Gemini</td>
                            <td className="p-2.5">Direct BYOK API</td>
                            <td className="p-2.5">Direct execution against Gemini 2.5 Flash and Pro models.</td>
                            <td className="p-2.5"><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">policies.google.com/privacy</a></td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-semibold text-text-primary">Groq &amp; Mistral</td>
                            <td className="p-2.5">Direct BYOK API</td>
                            <td className="p-2.5">High-speed inference for Llama 3.3 and open weights models.</td>
                            <td className="p-2.5"><a href="https://groq.com/privacy-policy" target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">groq.com/privacy</a></td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-semibold text-text-primary">AICredits.in &amp; OpenRouter</td>
                            <td className="p-2.5">Platform Orchestration</td>
                            <td className="p-2.5">Managed high-performance model routing via server-side Edge Functions.</td>
                            <td className="p-2.5"><a href="https://aicredits.in" target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">aicredits.in</a></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">09</span>
                      Cross-Border International Data Transfers
                    </h2>
                    <p>
                      Where personal data is transferred across jurisdictions, PromptHub relies on standard data protection safeguards, encryption in transit, and verification that recipient territories comply with applicable statutory transfer provisions under the DPDP Act 2023.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">10</span>
                      Data Retention &amp; Deletion Schedules
                    </h2>
                    <p>
                      Personal identifiers and private prompt workspaces are retained while your account remains active. Upon initiating account deletion, all personal data is scheduled for permanent deletion or anonymization within thirty (30) days, subject to temporary backup purge cycles and statutory financial record-keeping mandates.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">11</span>
                      Technical &amp; Organizational Security Safeguards
                    </h2>
                    <p>
                      PromptHub uses HTTPS/TLS for supported web and API communications, enforces Row Level Security (RLS) policies on database tables scoped to authenticated users, and applies input sanitization to mitigate injection attacks.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">12</span>
                      Data Principal / Subject Rights, Account Deletion &amp; Redressal
                    </h2>
                    <p>Under the DPDP Act 2023, GDPR, and CCPA, you hold enforceable statutory rights:</p>
                    <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
                      <li><strong>Right to Access:</strong> Request a summary of personal data processed and sub-processors with whom data was shared.</li>
                      <li><strong>Right to Correction &amp; Erasure (Self-Service Account Deletion):</strong> You may exercise your statutory Right to Erasure at any time directly through the platform. Navigating to <strong>Account Settings &gt; Danger Zone: Account Deletion</strong> allows you to permanently and irreversibly delete your account, developer profile, private prompt engineering workspaces, and ephemeral session records. Upon execution, local credential vaults are wiped immediately, and all server records are purged or anonymized.</li>
                      <li><strong>Self-Service Subscription Cancellation:</strong> Active recurring subscriptions can be self-service cancelled at any time via <strong>Account Settings &gt; Subscription &amp; Plan Management</strong>, reverting your account to the Free tier at the close of the current billing cycle while retaining all lifetime unspent wallet balances.</li>
                      <li><strong>Right to Grievance Redressal:</strong> Submit inquiries directly to our designated Grievance Officer.</li>
                      <li><strong>Right to Nominate:</strong> Nominate another individual to exercise data rights in the event of death or incapacity.</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">13</span>
                      Children's &amp; Minor's Data Protection
                    </h2>
                    <p>
                      PromptHub is strictly intended for software engineers and creators aged 18 and older. We do not knowingly collect, process, or profile personal data of minors. Accounts determined to belong to individuals under 18 will be deleted immediately.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">14</span>
                      6-Hour Incident Notification Protocol
                    </h2>
                    <p>
                      In the event of a confirmed personal data security breach, PromptHub will notify the Indian Computer Emergency Response Team (CERT-In) and the Data Protection Board of India, as well as affected users, in accordance with applicable statutory timelines and remediation guidelines.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">15</span>
                      Designated Grievance Officer &amp; DPO Contact Details
                    </h2>
                    <div className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-text-primary font-bold">
                        <Building className="w-4 h-4 text-brand-primary" />
                        <span>Data Protection &amp; Grievance Redressal Office</span>
                      </div>
                      <p className="text-text-secondary">
                        For any privacy requests, consent revocations, or grievance filings under DPDP Rules 2025 / GDPR:
                      </p>
                      <div className="font-mono text-[11px] space-y-1 text-text-muted">
                        <div>Email: <a href="mailto:prompthub.cloud@gmail.com" className="text-brand-primary font-bold hover:underline">prompthub.cloud@gmail.com</a></div>
                        <div>Response SLA: Within 7 business days</div>
                        <div>Location: PromptHub Developer Operations, Anand, India</div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 p-5 rounded-2xl bg-bg-secondary border border-border-default shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20 font-bold">16</span>
                      <h2 className="text-base font-bold font-display text-text-primary">
                        Statutory Right to Erasure (Account Deletion) &amp; Subscription Termination
                      </h2>
                    </div>
                    <div className="space-y-3 text-xs sm:text-sm text-text-secondary leading-relaxed">
                      <p>
                        Under Section 12 of the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> and Article 17 of the <strong>GDPR (Right to Erasure / Right to Be Forgotten)</strong>, you are legally entitled to request and execute the permanent erasure of all personal data held by PromptHub.
                      </p>
                      <p>
                        We provide an autonomous self-service mechanism in your Workspace Settings that allows you to instantly trigger irreversible account deletion and purge your stored credentials, profile information, and private prompts. You may also cancel your active subscription with zero friction.
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('settings')}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Account (Execute Erasure)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('settings')}
                          className="min-h-[44px] px-4 py-2 rounded-xl border border-border-default bg-bg-primary hover:bg-bg-tertiary text-text-primary text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 text-brand-primary" />
                          <span>Cancel Subscription / Manage Tier</span>
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  3. COOKIE POLICY & INTERACTIVE PREFERENCES CENTER
              ───────────────────────────────────────────────────────────── */}
              {selectedDoc === 'cookies' && (
                <div className="space-y-8">
                  {/* Interactive Preferences Center Card */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-bg-secondary border border-border-default shadow-xs space-y-5 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-default">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary-light text-brand-primary flex items-center justify-center border border-brand-primary/20 shrink-0">
                          <Sliders className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                            <span>Interactive Cookie &amp; Storage Preferences</span>
                            {cookieSavedToast && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-in fade-in">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Saved to Browser</span>
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-text-secondary">
                            Customize how PromptHub uses browser cookies and local storage items on your device.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={handleAcceptAllCookies}
                          className="px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs min-h-[36px]"
                        >
                          Accept All
                        </button>
                        <button
                          type="button"
                          onClick={handleRejectNonEssentialCookies}
                          className="px-3 py-1.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer min-h-[36px]"
                        >
                          Reject Optional
                        </button>
                      </div>
                    </div>

                    {/* Category Switches */}
                    <div className="grid grid-cols-1 gap-3.5">
                      {/* 1. Strictly Necessary */}
                      <div className="p-4 rounded-xl bg-bg-secondary border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-primary">1. Strictly Necessary Local Storage &amp; Cookies</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-semibold border border-emerald-300">
                              Always Active (Required)
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            Essential for authenticating developer sessions (Supabase JWT), CSRF token verification, CAPTCHA bot mitigation, and platform security. The website cannot function without these items.
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-text-muted">Locked ON</span>
                        </div>
                      </div>

                      {/* 2. Functional & Studio Preferences */}
                      <div className="p-4 rounded-xl bg-bg-secondary border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-primary">2. Studio &amp; Workspace Preferences</span>
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono font-semibold border border-blue-300">
                              Functional
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            Remembers your active prompt workspaces, theme choices (Dark/Light), code editor font scale, model selection defaults, and sidebar docking configurations between sessions.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleCookie('functional')}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            cookiePrefs.functional ? 'bg-brand-primary' : 'bg-gray-300'
                          }`}
                          aria-label="Toggle Functional Cookies"
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-bg-secondary shadow-sm ring-0 transition duration-200 ease-in-out ${
                              cookiePrefs.functional ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* 3. Analytics & Diagnostics */}
                      <div className="p-4 rounded-xl bg-bg-secondary border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-primary">3. Analytics &amp; Diagnostic Telemetry</span>
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-mono font-semibold border border-purple-300">
                              Performance
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            Helps us identify crash reports, unhandled exceptions, and API execution latencies via privacy-scrubbed Sentry error monitoring and anonymized PostHog feature metrics. Zero PII or private prompt payloads are captured.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleCookie('analytics')}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            cookiePrefs.analytics ? 'bg-brand-primary' : 'bg-gray-300'
                          }`}
                          aria-label="Toggle Analytics Telemetry"
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-bg-secondary shadow-sm ring-0 transition duration-200 ease-in-out ${
                              cookiePrefs.analytics ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* 4. Marketing & Release Updates */}
                      <div className="p-4 rounded-xl bg-bg-secondary border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-primary">4. Feature Announcements &amp; Community Spotlight</span>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-mono font-semibold border border-amber-300">
                              Product Updates
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            Enables banner notifications regarding new foundation model integrations, marketplace featured prompts, developer bounties, and community creator spotlights.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleCookie('marketing')}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            cookiePrefs.marketing ? 'bg-brand-primary' : 'bg-gray-300'
                          }`}
                          aria-label="Toggle Marketing Notifications"
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-bg-secondary shadow-sm ring-0 transition duration-200 ease-in-out ${
                              cookiePrefs.marketing ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Save Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-default text-xs">
                      <span className="text-[11px] text-text-muted font-mono">
                        {cookiePrefs.timestamp 
                          ? `Last updated: ${new Date(cookiePrefs.timestamp).toLocaleString()}`
                          : 'Preferences will be stored locally in your browser.'}
                      </span>
                      <button
                        type="button"
                        onClick={handleSaveCookiePrefs}
                        className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs min-h-[38px] flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save My Preferences</span>
                      </button>
                    </div>
                  </div>

                  {/* Statutory Cookie Policy Documentation */}
                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">01</span>
                      What Are Cookies and Local Storage Objects?
                    </h2>
                    <p>
                      Cookies and HTML5 Web Storage (such as LocalStorage and SessionStorage) are small alphanumeric data files placed on your computer or mobile device when you access web services. These technologies allow the Platform to distinguish your session from other developers, maintain secure cryptographic tokens, preserve active prompt IDE tabs, and retain your visual studio preferences across page reloads.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">02</span>
                      Statutory Basis for Storage Under DPDP Act 2023 &amp; GDPR
                    </h2>
                    <p>
                      In compliance with the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> and the <strong>EU General Data Protection Regulation (GDPR)</strong>, PromptHub relies on two distinct legal grounds for utilizing client-side storage:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
                      <li><strong>Strict Technical Necessity:</strong> Storage items strictly required to provide the service requested by the user (such as authentication tokens and security certificates) are deployed without prior consent.</li>
                      <li><strong>Explicit Consent:</strong> Storage items associated with workspace personalization, analytics telemetry, and product update notifications are deployed solely with your affirmative consent, which may be customized or revoked at any time via the preference center above.</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">03</span>
                      Storage Audit Table &amp; Technical Key Breakdown
                    </h2>
                    <div className="overflow-x-auto rounded-xl border border-border-default bg-bg-secondary">
                      <table className="w-full text-left text-xs border-collapse font-mono">
                        <thead>
                          <tr className="bg-bg-secondary border-b border-border-default text-text-primary font-bold">
                            <th className="p-3">Key Name</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Storage Type</th>
                            <th className="p-3">Purpose &amp; Technical Scope</th>
                            <th className="p-3">Retention</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default text-text-secondary">
                          <tr>
                            <td className="p-3 font-semibold text-brand-primary">sb-*-auth-token</td>
                            <td className="p-3"><span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">Necessary</span></td>
                            <td className="p-3">LocalStorage</td>
                            <td className="p-3">Supabase JWT session token for authenticated developer access.</td>
                            <td className="p-3">Session / 30 Days</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold text-text-primary">prompthub_cookie_preferences_v1</td>
                            <td className="p-3"><span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">Necessary</span></td>
                            <td className="p-3">LocalStorage</td>
                            <td className="p-3">Stores your affirmative cookie and privacy category selections.</td>
                            <td className="p-3">1 Year</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold text-text-primary">theme</td>
                            <td className="p-3"><span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px]">Functional</span></td>
                            <td className="p-3">LocalStorage</td>
                            <td className="p-3">Maintains chosen UI theme mode (Dark Studio / Warm Ivory Light).</td>
                            <td className="p-3">Persistent</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold text-text-primary">prompthub_model_catalog_v2</td>
                            <td className="p-3"><span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px]">Functional</span></td>
                            <td className="p-3">LocalStorage</td>
                            <td className="p-3">Caches the AI model catalog and capability pricing metadata for fast offline IDE rendering.</td>
                            <td className="p-3">24 Hours</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold text-text-primary">[provider]_api_key</td>
                            <td className="p-3"><span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px]">Functional</span></td>
                            <td className="p-3">SessionStorage</td>
                            <td className="p-3">Stored in browser sessionStorage and normally removed when the relevant browsing session ends.</td>
                            <td className="p-3">Session Only</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold text-text-primary">sentry_session</td>
                            <td className="p-3"><span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px]">Analytics</span></td>
                            <td className="p-3">SessionStorage</td>
                            <td className="p-3">Anonymized client-side crash and error telemetry (IP addresses scrubbed).</td>
                            <td className="p-3">Session</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold text-text-primary">ph_* (PostHog)</td>
                            <td className="p-3"><span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px]">Analytics</span></td>
                            <td className="p-3">LocalStorage</td>
                            <td className="p-3">Privacy-preserving feature usage metrics with zero prompt PII collection.</td>
                            <td className="p-3">1 Year</td>
                          </tr>
                          <tr>
                            <td className="p-3 font-semibold text-text-primary">prompthub_checkout_state</td>
                            <td className="p-3"><span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">Necessary</span></td>
                            <td className="p-3">SessionStorage</td>
                            <td className="p-3">Ephemeral order reference to verify credit wallet top-up callback safely upon return from payment gateway.</td>
                            <td className="p-3">Session</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">04</span>
                      Zero Third-Party Ad-Trackers &amp; Data Sale Guarantee
                    </h2>
                    <p>
                      PromptHub maintains a strict anti-surveillance engineering philosophy. We do not deploy third-party advertising tracking pixels (such as Meta Pixel or Google Ads Remarketing), do not conduct cross-site fingerprinting, and never sell, trade, or monetize developer telemetry with data brokers.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">05</span>
                      Managing and Disabling Cookies in Web Browsers
                    </h2>
                    <p>
                      In addition to the interactive preference manager above, you can configure your web browser to block or alert you about cookies:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
                      <li><strong>Google Chrome:</strong> Settings &rarr; Privacy and security &rarr; Third-party cookies.</li>
                      <li><strong>Mozilla Firefox:</strong> Settings &rarr; Privacy &amp; Security &rarr; Enhanced Tracking Protection.</li>
                      <li><strong>Apple Safari:</strong> Preferences &rarr; Privacy &rarr; Prevent cross-site tracking.</li>
                      <li><strong>Microsoft Edge:</strong> Settings &rarr; Cookies and site permissions.</li>
                    </ul>
                    <p className="text-text-muted text-[11px] pt-1">
                      <em>Note: Blocking strictly necessary local storage items in your browser settings will prevent account authentication and cloud workspace synchronization.</em>
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">06</span>
                      Client-Side Device Security &amp; Local Storage Disclaimer
                    </h2>
                    <p>
                      You are solely responsible for maintaining the physical, network, and operational security of your local device, operating system, browser profiles, and extensions. PromptHub and its developers bear zero liability for any local credential compromise, unauthorized token exfiltration, malicious browser extensions, or device-level attacks. All local storage items and cached credentials are used at your own risk.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">07</span>
                      Contact the Privacy &amp; Data Protection Office
                    </h2>
                    <p>
                      If you have inquiries regarding our cookie architecture or wish to submit a data principal rights request under DPDP Rules 2025, contact us at <a href="mailto:prompthub.cloud@gmail.com" className="text-brand-primary font-bold hover:underline">prompthub.cloud@gmail.com</a>.
                    </p>
                  </section>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  4. MARKETPLACE TERMS
              ───────────────────────────────────────────────────────────── */}
              {selectedDoc === 'marketplace' && (
                <div className="space-y-8">
                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">01</span>
                      Marketplace Scope &amp; Digital Software Catalog
                    </h2>
                    <p>
                      The PromptHub Marketplace provides an online commercial catalog for developers and creators to publish, license, monetize, and acquire curated AI prompts, system architectures, LLM chain workflows, and evaluation datasets. PromptHub operates as an intermediary platform facilitating digital software transactions.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">02</span>
                      Listing Verification &amp; Quality Thresholds
                    </h2>
                    <p>
                      All marketplace assets must undergo automated schema validation, prompt injection scanning, and variable syntax testing before being published to the live catalog. Listings must provide clear usage documentation, supported model tags, sample outputs, and configuration guidelines.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">03</span>
                      Multi-Currency Pricing &amp; Checkout Flow
                    </h2>
                    <p>
                      Asset listings are denominated in USD or INR. Buyers receive instant digital access and repository fork rights upon successful payment confirmation. All transactions are logged with immutable cryptographic invoice hashes.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">04</span>
                      Prohibited Listings &amp; Immediate Delisting
                    </h2>
                    <p>
                      PromptHub strictly prohibits listings that incorporate stolen proprietary datasets, leaked corporate system prompts, malicious code injection payloads, jailbreak bypass scripts, or non-consensual personal data. Violations result in immediate catalog delisting and escrow forfeiture.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">05</span>
                      Buyer License Scope &amp; Digital Access Framework
                    </h2>
                    <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
                      <li><strong>Permitted Use:</strong> Buyers obtain a non-exclusive license to use, adapt, and incorporate the prompt template into proprietary applications, client projects, and internal workflows.</li>
                      <li><strong>Redistribution Prohibition:</strong> Buyers may not resell, sub-license, scrape, or redistribute the raw prompt template as a standalone item on competing marketplaces.</li>
                      <li><strong>Refund Revocation:</strong> In the event a refund is approved and issued, all commercial license rights terminate immediately.</li>
                      <li><strong>Catalog Persistence:</strong> In the event a seller leaves the platform or delists an item, past valid buyers retain library access to their purchased assets where technically feasible.</li>
                    </ul>
                  </section>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  4. SELLER TERMS & REVENUE SHARE
              ───────────────────────────────────────────────────────────── */}
              {selectedDoc === 'seller' && (
                <div className="space-y-8">
                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">01</span>
                      Platform Commission &amp; Net Revenue Calculation
                    </h2>
                    <p>
                      PromptHub retains a target platform commission defaulting to approximately <strong>20.00%</strong> of the gross transaction value. The remaining ~80.00% (less payment gateway pass-through fees and applicable statutory tax withholdings) is credited to the seller's escrow balance.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">02</span>
                      Originality Warranty &amp; Copyright Indemnity
                    </h2>
                    <p>
                      By publishing a monetized asset, you represent and warrant that you are the original creator of the prompt template or possess all necessary commercial redistribution rights. You agree to indemnify and hold PromptHub harmless against any third-party copyright claims or damages.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">03</span>
                      Tax Compliance &amp; Statutory Withholdings
                    </h2>
                    <p>
                      Marketplace transactions and seller payouts may be subject to statutory tax withholding (such as Section 194-O TDS in India where legally applicable) and payment processor fees. Sellers remain responsible for reporting income taxes to their respective tax authorities.
                    </p>
                  </section>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  5. BUYER TERMS & LICENSE SCOPE
              ───────────────────────────────────────────────────────────── */}
              {selectedDoc === 'buyer' && (
                <div className="space-y-8">
                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">01</span>
                      Perpetual Commercial License Grant
                    </h2>
                    <p>
                      Upon completing a purchase, the buyer receives a perpetual, worldwide, non-exclusive commercial license to use, adapt, modify, and embed the purchased prompt template into personal, internal, and commercial production software applications.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">02</span>
                      Restrictions on Direct Standalone Redistribution
                    </h2>
                    <p>
                      Buyers may not resell, sub-license, publicly publish, or distribute the raw prompt template as a standalone asset, nor include it in competing prompt marketplaces or public GitHub repositories.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">03</span>
                      No Foundation Model Output Warranties
                    </h2>
                    <p>
                      PromptHub and marketplace sellers cannot guarantee identical output quality or formatting across future third-party model releases, parameter adjustments, or temperature variations.
                    </p>
                  </section>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  6. PAYOUTS & SETTLEMENT ESCROW
              ───────────────────────────────────────────────────────────── */}
              {selectedDoc === 'payouts' && (
                <div className="space-y-8">
                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">01</span>
                      The 7-Business-Day Settlement Window (v1_7_business_days)
                    </h2>
                    <p>
                      To prevent digital fraud, chargeback abuse, and intellectual property disputes, all marketplace earnings enter a strict <strong>7-business-day settlement escrow</strong>. Official banking holidays and weekends (Saturday &amp; Sunday) are excluded from the countdown.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">02</span>
                      Payout Thresholds &amp; Banking Rails
                    </h2>
                    <p>
                      Settled earnings above the minimum threshold ($20.00 USD / ₹1,500 INR) are automatically dispatched to verified bank accounts via <strong>Razorpay Route</strong> (for India UPI / IMPS) and <strong>Stripe Connect</strong> (for international accounts).
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">03</span>
                      Double-Entry Immutable Escrow Ledgers
                    </h2>
                    <p>
                      All gross earnings, platform commission withholdings, TDS deductions, and bank payouts are recorded on an immutable double-entry ledger ensuring 100% financial reconciliation and auditability.
                    </p>
                  </section>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  7. REFUNDS & DISPUTES
              ───────────────────────────────────────────────────────────── */}
              {selectedDoc === 'refunds' && (
                <div className="space-y-8">
                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">01</span>
                      Digital Goods Non-Tangible Policy
                    </h2>
                    <p>
                      Because digital prompt templates, agent system instructions, and schemas provide immediate code access upon purchase, sales are generally final and non-refundable once unlocked.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">02</span>
                      Technical Defect Exception Criteria
                    </h2>
                    <p>
                      Refunds are granted within forty-eight (48) hours of purchase only if the prompt asset exhibits verifiable technical failure (e.g. fatal syntax errors, missing variables, or non-executable code) and the seller fails to remediate the defect within twenty-four (24) hours of notice.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">03</span>
                      Double-Entry Compensating Ledger Reversals
                    </h2>
                    <p>
                      Approved refunds trigger automated compensating double-entry reversals across seller escrow balances, platform fees, and statutory tax ledgers before funds are returned to the original payment method.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">04</span>
                      Zero Promotional Credits Policy &amp; Paid Balance Protection
                    </h2>
                    <p>
                      PromptHub enforces a strict <strong>zero promotional credit policy</strong>: no free promotional credits, signup bonuses, or complimentary platform balances are granted. All designated free-tier AI models remain 100% free forever at 0 credits.
                    </p>
                    <p className="text-xs text-text-secondary">
                      Non-free and frontier foundation models require purchased credits via wallet recharge or personal BYOK API credentials. Paid credit balances never expire and remain available indefinitely for model execution and prompt purchases.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">05</span>
                      Protection of Paid Balances &amp; Statutory Inquiries
                    </h2>
                    <p>
                      Paid credit packages and subscription top-ups are permanently protected and never expire. In the event of payment debit anomalies where funds were deducted without credit grant, our finance support team investigates and resolves disputes within <strong>up to 7 working days</strong> upon receipt of transaction details at <a href="mailto:prompthub.cloud@gmail.com" className="text-brand-primary font-bold hover:underline">prompthub.cloud@gmail.com</a> or <span className="font-mono font-bold text-text-primary">+91 9409185557</span>.
                    </p>
                  </section>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  8. ACCEPTABLE USE POLICY (AUP)
              ───────────────────────────────────────────────────────────── */}
              {selectedDoc === 'aup' && (
                <div className="space-y-8">
                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">01</span>
                      Prohibited AI Generation Categories
                    </h2>
                    <p>
                      PromptHub maintains a zero-tolerance policy against designing, optimizing, or deploying prompts intended to produce:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
                      <li>Child sexual abuse material (CSAM) or non-consensual explicit sexual imagery.</li>
                      <li>Malware, exploits, keyloggers, botnets, or ransomware generation.</li>
                      <li>Instructions for violent crime, terrorism, or manufacture of illegal weapons.</li>
                      <li>Mass automated disinformation or political election manipulation campaigns.</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">02</span>
                      System Infrastructure &amp; API Integrity
                    </h2>
                    <p>
                      Users are strictly prohibited from bypassing client rate limiters, conducting automated scraping of private listings, credential brute-forcing, or overloading shared compute sandboxes.
                    </p>
                  </section>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  9. SELLER KYC & VERIFICATION
              ───────────────────────────────────────────────────────────── */}
              {selectedDoc === 'kyc' && (
                <div className="space-y-8">
                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">01</span>
                      Statutory KYC Verification Requirements
                    </h2>
                    <p>
                      Prior to receiving marketplace payouts, sellers must complete identity verification. In India, this requires PAN validation, matching bank account details, and optional GSTIN. International creators must complete Stripe Connect identity verification.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">02</span>
                      Provider as System of Record &amp; Data Minimization
                    </h2>
                    <p>
                      PromptHub minimizes the storage of sensitive financial credentials by leveraging certified payment partners (Razorpay and Stripe) as the primary system of record for identity documentation.
                    </p>
                  </section>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  10. COPYRIGHT & NOTICE-AND-TAKEDOWN
              ───────────────────────────────────────────────────────────── */}
              {selectedDoc === 'copyright' && (
                <div className="space-y-8">
                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">01</span>
                      Jurisdiction-Neutral Copyright Notice &amp; Takedown Procedure
                    </h2>
                    <p>
                      PromptHub respects the intellectual property rights of creators and maintains a jurisdiction-neutral notice-and-takedown procedure compatible with Indian copyright standards and international DMCA-style procedures. Copyright owners or authorized agents may submit takedown notices containing identification of the copyrighted work, exact catalog URLs, contact details, and a statement of good-faith belief to <a href="mailto:prompthub.cloud@gmail.com" className="text-brand-primary font-bold hover:underline">prompthub.cloud@gmail.com</a>.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">02</span>
                      Repeat Infringer Policy
                    </h2>
                    <p>
                      PromptHub enforces a proportionate infringement enforcement policy. Accounts subjected to substantiated, repeated copyright infringement claims will have their listings removed and may face account termination.
                    </p>
                  </section>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  11. CONTENT MODERATION
              ───────────────────────────────────────────────────────────── */}
              {selectedDoc === 'moderation' && (
                <div className="space-y-8">
                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">01</span>
                      Automated Guardrails &amp; Human Review
                    </h2>
                    <p>
                      All community and marketplace prompt submissions are scanned by automated regex filters and security classifiers to detect exposed API keys, private credentials, and harmful payloads before catalog indexing.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">02</span>
                      Appeals Process &amp; 72-Hour Response SLA
                    </h2>
                    <p>
                      Creators whose assets have been unlisted or flagged may submit a formal appeal through the Support Portal. Moderation teams will review and respond within seventy-two (72) business hours.
                    </p>
                  </section>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  12. COMMUNITY GUIDELINES
              ───────────────────────────────────────────────────────────── */}
              {selectedDoc === 'community' && (
                <div className="space-y-8">
                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">01</span>
                      Developer Code of Conduct &amp; Collaboration
                    </h2>
                    <p>
                      PromptHub is a professional engineering community. Harassment, hateful speech, discriminatory remarks, spamming, and manipulative review voting are strictly prohibited.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
                      <span className="font-mono text-brand-primary text-xs px-2 py-0.5 rounded bg-brand-primary-light border border-brand-primary/20">02</span>
                      Forking Tree &amp; Attribution Integrity
                    </h2>
                    <p>
                      When forking or iterating on public community prompts, original creator attribution is automatically preserved in prompt metadata. Tampering with or stripping upstream creator credits violates community standards.
                    </p>
                  </section>
                </div>
              )}

            </div>

            {/* Document Footer Disclaimer */}
            <footer className="mt-12 pt-6 border-t border-border-default space-y-3 text-xs text-text-muted">
              <div className="p-4 rounded-xl bg-bg-secondary border border-border-default space-y-2">
                <div className="flex items-center gap-2 text-text-primary font-semibold">
                  <HelpCircle className="w-4 h-4 text-brand-primary" />
                  <span>Statutory Legal &amp; Compliance Information</span>
                </div>
                <p className="leading-relaxed">
                  These policy documents are tailored to the technical architecture of PromptHub.cloud and are subject to periodic review by qualified legal and tax counsel in respective operating jurisdictions. For official inquiries, contact <a href="mailto:prompthub.cloud@gmail.com" className="text-brand-primary font-bold hover:underline">prompthub.cloud@gmail.com</a>.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] pt-2">
                <span>&copy; {new Date().getFullYear()} PromptHub.cloud. All rights reserved.</span>
                <div className="flex items-center gap-3">
                  <a href="https://prompthub.cloud/terms" className="hover:text-text-primary underline">Terms</a>
                  <span>&bull;</span>
                  <a href="https://prompthub.cloud/privacy" className="hover:text-text-primary underline">Privacy</a>
                  <span>&bull;</span>
                  <a href="mailto:prompthub.cloud@gmail.com" className="hover:text-text-primary underline">Support</a>
                </div>
              </div>
            </footer>
          </article>
        </div>
      </main>
    </div>
  );
};

export default LegalView;
