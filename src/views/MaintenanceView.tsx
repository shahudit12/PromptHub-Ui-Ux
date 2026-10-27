import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  CheckCircle2, 
  RefreshCw, 
  Home, 
  Activity, 
  Clock, 
  HelpCircle,
  Server
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const MaintenanceView: React.FC = () => {
  const { setActiveTab } = useApp();
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>('Just now');

  const handleRefreshStatus = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setLastChecked(new Date().toLocaleTimeString());
    }, 1200);
  };

  const subsystems = [
    { name: 'Multi-Model AI Gateway', status: 'Operational', latency: '38ms', description: 'OpenRouter, Anthropic, OpenAI, Gemini proxy routing' },
    { name: 'Core PostgreSQL Database', status: 'Operational', latency: '24ms', description: 'Supabase Row Level Security & ledger transactions' },
    { name: 'Ephemeral BYOK Vault', status: 'Operational', latency: '12ms', description: 'In-memory client session encryption & zero retention' },
    { name: 'Razorpay Payment Gateway', status: 'Operational', latency: '45ms', description: 'UPI, Cards, and Netbanking settlement rails' },
    { name: 'Prompt Version Control Engine', status: 'Operational', latency: '19ms', description: 'Git-style line diffing & snapshot generation' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-bg-primary text-text-primary px-4 py-8 md:py-16 selection:bg-brand-primary-light selection:text-brand-primary">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center items-center text-center">
        
        {/* Maintenance Icon Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 flex items-center justify-center"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm flex items-center justify-center text-amber-700">
              <Wrench className="w-10 h-10 stroke-[1.5]" />
            </div>
            <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-amber-600 text-white font-mono text-xs font-bold shadow-xs">
              503
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-2 mb-6"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/60 border border-emerald-200 text-emerald-800 text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>All Core Subsystems Operational</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-text-primary tracking-tight">
            System Status &amp; Maintenance
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
            PromptHub infrastructure undergoes automated rolling zero-downtime deployments. You can monitor live telemetry across our global service mesh below.
          </p>
        </motion.div>

        {/* Subsystems Health Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5 text-left mb-6 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-primary" />
              <span className="text-xs font-bold font-display text-text-primary">Subsystem Live Telemetry</span>
            </div>
            <span className="font-mono text-[11px] text-text-muted">Last checked: {lastChecked}</span>
          </div>

          <div className="space-y-2.5">
            {subsystems.map((sub, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-bg-tertiary/50 border border-border-subtle gap-2 text-xs">
                <div>
                  <div className="font-semibold text-text-primary flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-text-muted" />
                    <span>{sub.name}</span>
                  </div>
                  <span className="text-[11px] text-text-secondary">{sub.description}</span>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 font-mono text-[11px]">
                  <span className="text-text-muted">lat: {sub.latency}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    {sub.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Action Controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-md mb-8"
        >
          <button
            onClick={handleRefreshStatus}
            disabled={checking}
            className="flex-1 btn-primary min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Polling Metrics...' : 'Refresh Status'}</span>
          </button>
          <button
            onClick={() => setActiveTab('home')}
            className="flex-1 btn-secondary min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Studio</span>
          </button>
        </motion.div>

        {/* Status SLA Note */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center gap-4 text-xs text-text-muted"
        >
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-brand-primary" />
            <span>99.95% Historical Uptime SLA</span>
          </div>
          <span>•</span>
          <button
            onClick={() => setActiveTab('support')}
            className="text-brand-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer py-1 min-h-[36px]"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Submit Maintenance Inquiry</span>
          </button>
        </motion.div>

      </div>
    </div>
  );
};

export default MaintenanceView;