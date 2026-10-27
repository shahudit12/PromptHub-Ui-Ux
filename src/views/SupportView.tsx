import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Bug, 
  CreditCard, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Send, 
  Copy, 
  Check, 
  LifeBuoy,
  MessageSquare
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppFooter } from '../components/common/AppFooter';
import { showIntercomNewMessage } from '../lib/intercom';

export const SupportView: React.FC = () => {
  const { 
    user, 
    setActiveTab, 
    showToast, 
    setIsBugReportModalOpen 
  } = useApp();

  // Inquiry form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [category, setCategory] = useState<'billing' | 'byok' | 'workspace' | 'teams' | 'bug' | 'other'>('billing');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; category: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // FAQ open states
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('prompthub.cloud@gmail.com');
    setCopiedEmail(true);
    showToast('Support email copied to clipboard!', 'success');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !subject.trim() || !message.trim()) {
      showToast('Please fill in all required inquiry fields.', 'error');
      return;
    }

    setSubmitting(true);
    const ticketId = `PH-SUP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setSubmittedTicket({ id: ticketId, category });
    setSubmitting(false);
    showToast('Support inquiry dispatched successfully!', 'success');
  };

  const faqs = [
    {
      q: 'How does BYOK (Bring Your Own Key) zero-server-retention work?',
      a: 'When you provide your OpenAI, Anthropic, Gemini, Groq, or OpenRouter API keys in PromptHub, they are vaulted exclusively in client-side browser session storage. They are never written to our PostgreSQL database in plaintext and are wiped when your session terminates.',
    },
    {
      q: 'Do purchased wallet credits ever expire?',
      a: 'No. Paid credits purchased through top-ups or subscription plans carry permanent lifetime validity and never expire. Every credit transaction is logged in an immutable, double-entry cryptographic ledger.',
    },
    {
      q: 'What is the refund policy for marketplace prompt purchases?',
      a: 'Due to the instantaneous digital nature of prompt templates and system instructions, purchases are non-refundable once unlocked, except in cases of verified technical delivery failure or duplicate billing.',
    },
    {
      q: 'Can I monetize prompts on the PromptHub Marketplace?',
      a: 'Yes! Any developer can publish prompts to the marketplace and earn revenue. PromptHub takes a transparent 20% platform fee, with creator payouts processed within 7 business days via UPI or bank transfer.',
    },
    {
      q: 'How do Team Workspaces and role permissions work?',
      a: 'Teams allow you to invite colleagues via shareable cryptographic tokens. Members can have Admin, Editor, or Viewer roles to collaborate on shared prompt repositories with revision histories and shared benchmarks.',
    },
    {
      q: 'How do I earn the 15-day free Pro subscription reward?',
      a: 'Whenever you find and submit a valid bug report or reproducible vulnerability through our Bug Report modal, our team grants 15 days of Pro membership and the Bug Hunter badge upon verification.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-bg-primary text-text-primary px-4 py-8 md:py-12 selection:bg-brand-primary-light selection:text-brand-primary font-sans">
      <div className="max-w-4xl mx-auto w-full space-y-10">
        
        {/* Header Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary-light border border-brand-primary/20 text-brand-primary text-xs font-mono font-medium">
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>Developer Support &amp; Knowledge Base</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-text-primary tracking-tight">
            How can we assist you today?
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">
            Get rapid assistance with API keys, payment reconciliations, model routing, or submit a direct ticket to our engineering team.
          </p>
        </div>

        {/* Real-time Intercom Live Chat Banner */}
        <div className="p-4 sm:p-5 rounded-xl bg-bg-secondary border border-brand-primary/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-brand-primary-light text-brand-primary flex items-center justify-center shrink-0 border border-brand-primary/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text-primary">Instant Developer Live Chat &amp; Help Bot</h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active via Intercom Fin Copilot
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Have questions or need live engineering support? Chat directly with our automated Help Bot or engineering team.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const prefill = user
                ? `Hi PromptHub Support Team, I am reaching out from account ${user.username || user.name || user.email} (${user.id}). I need assistance with...`
                : 'Hi PromptHub Team, I need assistance with...';
              showIntercomNewMessage(prefill);
            }}
            className="w-full sm:w-auto px-4 py-2 min-h-[44px] rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open Help Bot</span>
          </button>
        </div>

        {/* 4 Quick Support Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Direct Email */}
          <div className="p-4 rounded-xl bg-bg-secondary border border-border-default hover:border-brand-primary/30 transition-all flex flex-col justify-between shadow-2xs">
            <div>
              <div className="w-9 h-9 rounded-lg bg-brand-primary-light text-brand-primary flex items-center justify-center mb-3">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-text-primary mb-1">Direct Email</h3>
              <p className="text-[11px] text-text-secondary mb-3">Average SLA: &lt; 4 hours for priority developers.</p>
            </div>
            <button
              onClick={handleCopyEmail}
              className="w-full btn-secondary min-h-[36px] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedEmail ? <Check className="w-3.5 h-3.5 text-brand-primary" /> : <Copy className="w-3.5 h-3.5 text-text-muted" />}
              <span>{copiedEmail ? 'Copied!' : 'Copy Email'}</span>
            </button>
          </div>

          {/* 2. Bug Report */}
          <div className="p-4 rounded-xl bg-bg-secondary border border-border-default hover:border-rose-300 dark:hover:border-rose-700/60 transition-all flex flex-col justify-between shadow-2xs">
            <div>
              <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 flex items-center justify-center mb-3 border border-rose-200 dark:border-rose-800/50">
                <Bug className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-text-primary mb-1">Report a Bug</h3>
              <p className="text-[11px] text-text-secondary mb-3">Earn 15-day Pro trial on verified reproducible defects.</p>
            </div>
            <button
              onClick={() => setIsBugReportModalOpen(true)}
              className="w-full btn-secondary min-h-[36px] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <span>Launch Bug Modal</span>
            </button>
          </div>

          {/* 3. Pricing & Billing */}
          <div className="p-4 rounded-xl bg-bg-secondary border border-border-default hover:border-brand-primary/30 transition-all flex flex-col justify-between shadow-2xs">
            <div>
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-brand-primary dark:text-brand-accent flex items-center justify-center mb-3 border border-brand-primary/20 dark:border-brand-accent/30">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-text-primary mb-1">Pricing &amp; Plans</h3>
              <p className="text-[11px] text-text-secondary mb-3">Transparent pay-as-you-go top-ups and subscriptions.</p>
            </div>
            <button
              onClick={() => setActiveTab('pricing')}
              className="w-full btn-secondary min-h-[36px] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Plans</span>
            </button>
          </div>

          {/* 4. Live Status */}
          <div className="p-4 rounded-xl bg-bg-secondary border border-border-default hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all flex flex-col justify-between shadow-2xs">
            <div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3 border border-emerald-200 dark:border-emerald-800/50">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-text-primary mb-1">System Status</h3>
              <p className="text-[11px] text-text-secondary mb-3">Check AI Gateway and PostgreSQL live latency.</p>
            </div>
            <button
              onClick={() => setActiveTab('maintenance')}
              className="w-full btn-secondary min-h-[36px] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Telemetry</span>
            </button>
          </div>
        </div>

        {/* Interactive Support Inquiry Form */}
        <div className="bg-bg-secondary border border-border-default rounded-xl p-5 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display text-text-primary">
                Submit a Support Inquiry
              </h2>
              <p className="text-xs text-text-secondary">
                Our core engineers review developer inquiries continuously.
              </p>
            </div>
            <span className="font-mono text-[11px] text-brand-primary dark:text-brand-accent px-2.5 py-1 rounded-md bg-brand-primary-light dark:bg-brand-primary/20 border border-brand-primary/20 dark:border-brand-accent/30 font-semibold">
              Live Dispatch
            </span>
          </div>

          {submittedTicket ? (
            <div className="p-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-100 font-display">
                Inquiry Ticket Generated
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
                Your ticket <strong className="font-mono text-emerald-950 dark:text-emerald-100 font-bold">{submittedTicket.id}</strong> has been logged in our internal queue. A confirmation email has been dispatched to <strong>{email}</strong>.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedTicket(null);
                    setSubject('');
                    setMessage('');
                  }}
                  className="btn-secondary min-h-[44px] px-4 text-xs font-semibold cursor-pointer"
                >
                  Submit Another Request
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ticketPrefill = `[Ticket ${submittedTicket.id}] Hi PromptHub Team, I just logged support ticket ${submittedTicket.id} regarding category ${submittedTicket.category}. Subject: ${subject || 'Support Request'}`;
                    showIntercomNewMessage(ticketPrefill);
                  }}
                  className="btn-primary min-h-[44px] px-4 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat with Help Bot on this Ticket</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitInquiry} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ada Lovelace"
                    className="w-full px-3 py-2 min-h-[42px] bg-bg-tertiary border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary">Work / Developer Email <span className="text-rose-500">*</span></label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="developer@company.com"
                    className="w-full px-3 py-2 min-h-[42px] bg-bg-tertiary border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary">Topic Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 min-h-[42px] bg-bg-tertiary border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                  >
                    <option value="billing">Billing, Invoices &amp; Credit Wallet</option>
                    <option value="byok">API Keys, BYOK &amp; Model Execution</option>
                    <option value="workspace">Prompt IDE &amp; Analyzer Engine</option>
                    <option value="teams">Team Workspaces &amp; Organization Seats</option>
                    <option value="bug">Bug &amp; Technical Defect</option>
                    <option value="other">General Inquiries &amp; Partnerships</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary">Severity Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 min-h-[42px] bg-bg-tertiary border border-border-default rounded-lg text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                  >
                    <option value="low">Low (General question)</option>
                    <option value="medium">Medium (Standard priority)</option>
                    <option value="high">High (Production feature blocked)</option>
                    <option value="critical">Critical (Payment or security issue)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text-secondary">Subject Line <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of the issue or question..."
                  className="w-full px-3 py-2 min-h-[42px] bg-bg-tertiary border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text-secondary">Detailed Message &amp; Reproduction Context <span className="text-rose-500">*</span></label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Include error codes, prompt names, or exact steps to reproduce..."
                  className="w-full px-3 py-2 min-h-[100px] bg-bg-tertiary border border-border-default rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary resize-y custom-scrollbar"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary min-h-[44px] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
              >
                <Send className={`w-4 h-4 ${submitting ? 'animate-pulse' : ''}`} />
                <span>{submitting ? 'Dispatching Ticket...' : 'Submit Support Inquiry'}</span>
              </button>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-secondary border-t border-border-subtle/40">
                <span className="text-text-muted">Need an immediate automated answer?</span>
                <button
                  type="button"
                  onClick={() => {
                    const topic = category ? category.toUpperCase() : 'GENERAL';
                    const contextText = subject ? `${subject} — ${message || 'Need assistance'}` : (message || `I need assistance regarding ${category}.`);
                    showIntercomNewMessage(`[${topic}] ${contextText}`);
                  }}
                  className="inline-flex items-center gap-1.5 font-semibold text-brand-primary dark:text-brand-accent hover:underline cursor-pointer min-h-[44px]"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ask Intercom Help Bot / Fin Copilot &rarr;</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* FAQ Accordion Section */}
        <div className="space-y-4">
          <div className="text-left space-y-1">
            <h2 className="text-lg font-bold font-display text-text-primary">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-text-secondary">
              Instant answers to common developer questions about PromptHub.
            </p>
          </div>

          <div className="space-y-2">
            {faqs.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-xl bg-bg-secondary border border-border-default overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full min-h-[44px] p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-bg-tertiary/40 transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-semibold text-text-primary font-display">
                      {item.q}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 pb-4 pt-1 text-xs text-text-secondary leading-relaxed border-t border-border-subtle/50"
                      >
                        {item.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Ask Help Bot FAQ Follow-up */}
          <div className="p-4 sm:p-5 rounded-xl bg-bg-secondary border border-border-default flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-text-primary">Didn&apos;t find what you were looking for?</h3>
              <p className="text-[11px] sm:text-xs text-text-secondary mt-0.5">
                Our automated Intercom Help Bot and Fin Copilot have indexed PromptHub knowledge bases for instant answers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => showIntercomNewMessage('Hi PromptHub Team, I have a question not covered in the FAQ: ')}
              className="btn-secondary min-h-[44px] px-4 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5 text-brand-primary" />
              <span>Ask Help Bot</span>
            </button>
          </div>
        </div>

        {/* Bottom Contact Ribbon */}
        <div className="p-4 rounded-xl bg-bg-secondary border border-border-default text-center text-xs text-text-muted space-y-1">
          <p>
            Prefer direct email? Send details directly to{' '}
            <a href="mailto:prompthub.cloud@gmail.com" className="text-brand-primary font-mono font-bold hover:underline">
              prompthub.cloud@gmail.com
            </a>
          </p>
          <p className="text-[11px]">
            Operating from PromptHub Developer Operations. All inquiries are encrypted in transit.
          </p>
        </div>

      </div>

      {/* High-Craft Studio Footer */}
      <AppFooter />
    </div>
  );
};

export default SupportView;