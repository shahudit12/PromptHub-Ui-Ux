import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, 
  Lock, 
  ArrowRight, 
  Home, 
  LayoutDashboard, 
  Crown, 
  LogIn, 
  HelpCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AccessDeniedView: React.FC<{ 
  requiredRole?: string; 
  featureName?: string;
  description?: string;
}> = ({
  requiredRole = 'Administrator',
  featureName = 'Restricted Workspace Module',
  description = 'You do not have the required authorization or security clearance to view this module.',
}) => {
  const { user, isLoggedIn, setActiveTab, setShowAuthModal } = useApp();

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-bg-primary text-text-primary px-4 py-8 md:py-16 selection:bg-brand-primary-light selection:text-brand-primary">
      <div className="max-w-xl mx-auto w-full flex-1 flex flex-col justify-center items-center text-center">
        
        {/* Security Shield Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 flex items-center justify-center"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm flex items-center justify-center text-rose-700">
              <ShieldAlert className="w-10 h-10 stroke-[1.5]" />
            </div>
            <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-rose-700 text-white font-mono text-xs font-bold shadow-xs">
              403
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100/60 border border-rose-200 text-rose-800 text-xs font-mono font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>HTTP 403 Forbidden</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-text-primary tracking-tight">
            Access Denied
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
            {description}
          </p>
        </motion.div>

        {/* Role Diagnostic Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-5 text-left mb-6 shadow-xs font-mono text-xs space-y-2.5"
        >
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <span className="text-text-muted">Target Resource:</span>
            <span className="text-text-primary font-bold">{featureName}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <span className="text-text-muted">Required Clearance:</span>
            <span className="text-brand-primary font-bold">{requiredRole}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-text-muted">Current Session:</span>
            <span className="text-text-secondary font-semibold">
              {isLoggedIn ? `${user?.name || 'User'} (${user?.role || 'Member'})` : 'Unauthenticated Guest'}
            </span>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-md mb-8"
        >
          {!isLoggedIn ? (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex-1 btn-primary min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Credentials</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex-1 btn-primary min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('home')}
            className="flex-1 btn-secondary min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </button>
        </motion.div>

        {/* Upgrade / Support Footnote */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="p-4 rounded-xl bg-bg-secondary border border-border-default text-left w-full space-y-2 text-xs"
        >
          <div className="flex items-center gap-2 text-text-primary font-bold">
            <Crown className="w-4 h-4 text-brand-amber" />
            <span>Need Elevated Permissions?</span>
          </div>
          <p className="text-text-secondary leading-relaxed">
            If you are an enterprise team member needing access to organization prompts or an administrator whose credentials were recently rotated, please request an invitation from your team lead or reach out to developer support.
          </p>
          <div className="pt-1 flex items-center gap-4 text-xs font-semibold">
            <button 
              onClick={() => setActiveTab('pricing')} 
              className="text-brand-primary hover:underline flex items-center gap-1 cursor-pointer py-1 min-h-[36px]"
            >
              <span>Explore Pro &amp; Team Plans</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span>•</span>
            <button 
              onClick={() => setActiveTab('support')} 
              className="text-text-muted hover:text-text-primary flex items-center gap-1 cursor-pointer py-1 min-h-[36px]"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Contact Support</span>
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default AccessDeniedView;