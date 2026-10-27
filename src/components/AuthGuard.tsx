import React from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Shield, ArrowRight, UserCheck, Key, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthGuardProps {
  children: React.ReactNode;
  featureName?: string;
  description?: string;
  adminOnly?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  featureName = 'this feature',
  description = 'Sign in to your PromptHub account to unlock unlimited prompt editing, AI model executions, version history, and private collections.',
  adminOnly = false,
}) => {
  const { isLoggedIn, user, isAuthLoading, setActiveTab, activeTab } = useApp();

  // If auth session is still resolving, show subtle loader instead of locked gate
  if (isAuthLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[400px]">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If user is logged in and not admin-only, grant access
  if (isLoggedIn && !adminOnly) {
    return <>{children}</>;
  }

  // If admin-only, verify Admin role
  if (isLoggedIn && adminOnly) {
    if (user?.role === 'Admin') {
      return <>{children}</>;
    }
    // Logged in but not an Admin
    return (
      <div className="flex-1 flex items-center justify-center p-6 h-full min-h-[500px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-bg-secondary border border-rose-200 rounded-xl p-8 text-center shadow-lg relative overflow-hidden"
        >
          <div className="w-12 h-12 mx-auto rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-700">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-text-primary font-display mb-2">
            Administrator Access Required
          </h2>
          <p className="text-text-secondary text-xs mb-6 leading-relaxed">
            This module is restricted to PromptHub system administrators only. Your current role is <span className="font-semibold text-text-primary">{user?.role || 'User'}</span>.
          </p>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="w-full btn-secondary text-xs font-semibold cursor-pointer min-h-[44px] sm:min-h-[40px]"
          >
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // Not logged in: Show Login Lock Gate
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 h-full min-h-[500px] relative overflow-y-auto bg-bg-primary">
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-lg w-full bg-bg-secondary border border-border-default rounded-xl p-6 sm:p-8 text-center shadow-lg relative z-10"
      >
        {/* Lock Badge */}
        <div className="w-12 h-12 rounded-xl bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary mx-auto mb-4 shadow-xs">
          <Lock className="w-6 h-6" />
        </div>

        {/* Headline */}
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary font-display tracking-tight mb-2">
          Sign In to Access {featureName}
        </h2>

        <p className="text-text-secondary text-xs leading-relaxed mb-6">
          {description}
        </p>

        {/* Value Perks List */}
        <div className="bg-bg-tertiary border border-border-default rounded-lg p-4 mb-6 text-left space-y-2.5">
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <div className="w-5 h-5 rounded-md bg-brand-primary-light text-brand-primary flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span><strong className="text-text-primary font-semibold">Universal AI Studio Access</strong> with unlimited prompt management</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <div className="w-5 h-5 rounded-md bg-brand-primary-light text-brand-primary flex items-center justify-center shrink-0">
              <Key className="w-3.5 h-3.5" />
            </div>
            <span><strong className="text-text-primary font-semibold">Direct BYOK Support</strong> across 10 top AI providers</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <span><strong className="text-text-primary font-semibold">Git-Style Version Snapshots</strong> & line diff viewer</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && activeTab && activeTab !== 'auth' && activeTab !== 'home') {
                sessionStorage.setItem('prompthub_pre_auth_tab', activeTab);
              }
              setActiveTab('auth');
            }}
            className="flex-1 btn-primary text-xs font-semibold flex items-center justify-center gap-2 group cursor-pointer min-h-[44px] sm:min-h-[40px]"
          >
            <span>Sign In or Create Account</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => setActiveTab('home')}
            className="btn-secondary text-xs font-semibold cursor-pointer min-h-[44px] sm:min-h-[40px]"
          >
            Explore Home
          </button>
        </div>
      </motion.div>
    </div>
  );
};
