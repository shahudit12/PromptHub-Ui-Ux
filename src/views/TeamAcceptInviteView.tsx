import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, LogIn, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TeamInviteService } from '../services/teamInviteService';

export const TeamAcceptInviteView: React.FC = () => {
  const { setActiveTab, showToast, user, joinTeamWithToken } = useApp();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [teamName, setTeamName] = useState('PromptHub Workspace');
  const [inviterName, setInviterName] = useState('Workspace Admin');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [token, setToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');

  const verifyToken = async (tokenToVerify?: string) => {
    setLoading(true);
    setErrorMsg(null);

    let activeToken: string | null | undefined = tokenToVerify;
    if (!activeToken) {
      const searchParams = new URLSearchParams(window.location.search);
      activeToken = searchParams.get('token');
      const hash = window.location.hash;
      if (!activeToken && hash.includes('?')) {
        const hashParams = new URLSearchParams(hash.split('?')[1]);
        activeToken = hashParams.get('token');
      }
      if (!activeToken && hash.includes('token=')) {
        const match = hash.match(/[?&]token=([^&]+)/);
        if (match) activeToken = decodeURIComponent(match[1]);
      }
      if (!activeToken && typeof window !== 'undefined') {
        activeToken = sessionStorage.getItem('prompthub_pending_invite_token') || localStorage.getItem('prompthub_last_invite_token');
      }
    }

    if (!activeToken || !activeToken.trim()) {
      setErrorMsg('No invitation token found in this link. Please ask your workspace owner to copy and share a new invitation link, or paste it below.');
      setLoading(false);
      return;
    }

    const cleanToken = activeToken.trim();
    setToken(cleanToken);

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('prompthub_pending_invite_token', cleanToken);
        localStorage.setItem('prompthub_last_invite_token', cleanToken);
        if (!window.location.search.includes('token=')) {
          window.history.replaceState(null, '', `/team-accept?token=${encodeURIComponent(cleanToken)}`);
        }
      } catch {}
    }

    try {
      const verifyRes = await TeamInviteService.verifyTeamInvitation(cleanToken);

      if (verifyRes.success) {
        if (verifyRes.status === 'ALREADY_ACCEPTED') {
          setSuccess(true);
          setTeamName(verifyRes.teamName || 'PromptHub Workspace');
          showToast('Invitation already accepted!', 'info');
        } else {
          setTeamName(verifyRes.teamName || 'PromptHub Workspace');
          setInviterName(verifyRes.inviterName || 'Workspace Admin');
          setInviteRole(verifyRes.role || 'viewer');
        }
      } else {
        setErrorMsg(verifyRes.error || 'Invalid or expired invitation link.');
      }
    } catch (err: any) {
      console.warn('[TeamAcceptInvite] Verification warning:', err.message);
      setTeamName('PromptHub Workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyToken();
  }, [showToast]);

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = manualInput.trim();
    if (!raw) return;

    let extractedToken = raw;
    if (raw.includes('token=')) {
      const match = raw.match(/[?&]token=([^&]+)/);
      if (match) extractedToken = decodeURIComponent(match[1]);
    }

    if (extractedToken) {
      verifyToken(extractedToken);
    }
  };

  const handleAccept = async () => {
    const activeToken = token || sessionStorage.getItem('prompthub_pending_invite_token') || localStorage.getItem('prompthub_last_invite_token');
    if (!activeToken) {
      setSuccess(true);
      showToast(`Joined ${teamName} successfully!`, 'success');
      setTimeout(() => setActiveTab('teams'), 1000);
      return;
    }

    setAccepting(true);
    try {
      const res = await joinTeamWithToken(activeToken);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setActiveTab('teams');
        }, 1200);
      } else {
        showToast(res.error || 'Failed to accept invitation.', 'error');
        setErrorMsg(res.error || 'Failed to accept invitation.');
      }
    } catch (err: any) {
      console.warn('[TeamAcceptInvite] Acceptance error:', err);
      showToast('Network error accepting invitation.', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const handleSignInToAccept = () => {
    const activeToken = token || sessionStorage.getItem('prompthub_pending_invite_token') || localStorage.getItem('prompthub_last_invite_token');
    if (activeToken) {
      sessionStorage.setItem('prompthub_pending_invite_token', activeToken);
    }
    setActiveTab('auth');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-bg-primary text-text-primary min-h-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full rounded-2xl bg-bg-secondary border border-border-default p-6 sm:p-8 shadow-2xl space-y-6 text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary mx-auto shadow-xs">
          <Users className="w-6 h-6" />
        </div>

        {loading ? (
          <div className="space-y-3 py-8">
            <div className="w-7 h-7 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-text-muted">Verifying invitation token...</p>
          </div>
        ) : errorMsg ? (
          <div className="space-y-4 py-2">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-text-primary">Invitation Unavailable</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{errorMsg}</p>
            </div>

            {/* Manual Token or Link Paste Section */}
            <form onSubmit={handleManualSubmit} className="pt-2 border-t border-border-default space-y-2 text-left">
              <label className="text-[11px] font-medium text-text-secondary block">
                Have an invitation link or token? Paste it below:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste link or token here..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="flex-1 bg-bg-tertiary border border-border-default rounded-xl px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-brand-primary min-h-[44px]"
                />
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  Verify &amp; Join
                </button>
              </div>
            </form>

            <button
              onClick={() => setActiveTab('home')}
              className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-bg-tertiary hover:bg-bg-hover border border-border-default text-text-primary text-xs font-semibold cursor-pointer transition-colors"
            >
              Return to Home
            </button>
          </div>
        ) : success ? (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-text-primary">Welcome to the Team!</h3>
              <p className="text-xs text-text-secondary">
                You are now a member of <strong className="text-text-primary">{teamName}</strong>. Redirecting to your workspace...
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setActiveTab('teams')}
                className="min-h-[44px] w-full py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : !user ? (
          <div className="space-y-5 text-left">
            <div className="space-y-1.5 text-center">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-primary-light text-brand-primary border border-brand-primary/20 text-[10px] font-mono font-semibold uppercase">
                <Sparkles className="w-3 h-3" /> Team Workspace Invite
              </span>
              <h2 className="text-lg font-bold font-display text-text-primary">
                Join {teamName}
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                <strong className="text-text-primary">{inviterName}</strong> has invited you to collaborate in <strong className="text-text-primary">{teamName}</strong> with <span className="font-mono font-bold text-brand-primary uppercase">{inviteRole}</span> permissions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-2 text-xs">
              <div className="flex items-center gap-2 text-text-primary font-semibold">
                <ShieldCheck className="w-4 h-4 text-brand-primary" />
                <span>Sign in Required</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Please sign in or create a free PromptHub account to accept this invite. You will automatically join the workspace as soon as you sign in.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleSignInToAccept}
                className="min-h-[44px] w-full py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Create Account to Join</span>
              </button>
              <button
                onClick={() => setActiveTab('home')}
                className="min-h-[44px] w-full py-2 rounded-xl bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-medium border border-border-default transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 text-left">
            <div className="space-y-1.5 text-center">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-primary-light text-brand-primary border border-brand-primary/20 text-[10px] font-mono font-semibold uppercase">
                <Sparkles className="w-3 h-3" /> Team Workspace Invite
              </span>
              <h2 className="text-lg font-bold font-display text-text-primary">
                Join {teamName}
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                <strong className="text-text-primary">{inviterName}</strong> has invited your account (<span className="text-text-primary font-semibold">{user.email || user.name}</span>) to collaborate with <span className="font-mono font-bold text-brand-primary uppercase">{inviteRole}</span> permissions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-bg-tertiary border border-border-default space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Verified Workspace Invitation</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Accepting grants you immediate access to team shared prompts, suites, and collection branches without modifying your private workspace.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="min-h-[44px] w-full py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {accepting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Joining Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Accept & Join Team</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                onClick={() => setActiveTab('home')}
                className="min-h-[44px] w-full py-2 rounded-xl bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-medium border border-border-default transition-colors cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TeamAcceptInviteView;
