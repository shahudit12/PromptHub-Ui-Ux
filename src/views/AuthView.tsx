import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  KeyRound,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import {
  trackSignupCompleted,
  trackLoginSuccess,
} from '../lib/posthogEvents';
import {
  trackSignUpCompleted as trackMixpanelSignUpCompleted,
  trackLoginSuccess as trackMixpanelLoginSuccess,
} from '../lib/mixpanelEvents';
import { AuthService, deriveUsernameFromName } from '../services/authService';
import { googleAuthService } from '../services/googleAuthService';
import { formatAuthError } from '../utils/authErrors';
import { securityUtils } from '../utils/security';
import { useApp } from '../context/AppContext';
import { PromptHubLogo } from '../components/PromptHubLogo';
import { CaptchaChallenge, type CaptchaChallengeHandle } from '../components/auth/CaptchaChallenge';

interface AuthViewProps {
  onSuccess: (userData: { id?: string; name: string; email: string; avatarUrl: string; username: string; role?: 'Admin' | 'User'; hasCompletedProfileSetup?: boolean }) => void;
  /** When set to 'reset', shows the new-password form immediately (used after a password recovery link is clicked). */
  initialMode?: AuthMode;
  /** Called after the user successfully updates their password in recovery mode. */
  onPasswordResetComplete?: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'verify' | 'reset';

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, initialMode, onPasswordResetComplete }) => {
  const { isLoggedIn, user, setActiveTab } = useApp();
  const [mode, setMode] = useState<AuthMode>(initialMode || 'login');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // CAPTCHA Verification State
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaChallengeHandle | null>(null);

  // Google Identity Services Native Button
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [isGsiRendered, setIsGsiRendered] = useState(false);

  // Legal Agreement Checkbox State
  const [agreeTerms, setAgreeTerms] = useState(false);


  // If already authenticated and not in recovery mode, auto-redirect to dashboard/workspace
  useEffect(() => {
    if (isLoggedIn && user && mode !== 'reset') {
      onSuccess(user);
    }
  }, [isLoggedIn, user, mode, onSuccess]);

  // Sync mode if initialMode prop changes (e.g. from password recovery trigger)
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Listen for external auth mode switch triggers (e.g. promotional claim buttons)
  useEffect(() => {
    const handleSwitch = (e: Event) => {
      const custom = (e as CustomEvent).detail;
      if (custom?.mode) {
        setMode(custom.mode);
        setError(null);
        setSuccessMsg(null);
      }
    };
    window.addEventListener('ph_switch_auth_mode', handleSwitch);
    return () => window.removeEventListener('ph_switch_auth_mode', handleSwitch);
  }, []);

  // Detect URL path or query params for direct mode routing (/reset-password, /verify-email, /forgot-password)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname.toLowerCase();
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    const queryMode = searchParams.get('mode');

    if (queryMode === 'reset' || pathname.includes('reset-password') || hash.includes('reset')) {
      setMode('reset');
    } else if (queryMode === 'forgot' || pathname.includes('forgot-password') || hash.includes('forgot')) {
      setMode('forgot');
    } else if (queryMode === 'verify' || pathname.includes('verify-email') || pathname.includes('verify') || hash.includes('verify')) {
      setMode('verify');
    }

    // Pre-fill email if passed in query
    const queryEmail = searchParams.get('email');
    if (queryEmail) {
      setEmail(decodeURIComponent(queryEmail));
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Detect URL OAuth errors or hash errors on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

    const urlError = searchParams.get('error') || hashParams.get('error');
    const urlErrorDesc = searchParams.get('error_description') || hashParams.get('error_description');

    if (urlError || urlErrorDesc) {
      if (urlErrorDesc?.includes('exchange external code') || urlErrorDesc?.includes('Unable to exchange')) {
        setError('Google Sign-In configuration mismatch. Please verify the Web Client ID and Redirect URI in Google Cloud Console.');
      } else if (urlErrorDesc) {
        setError(decodeURIComponent(urlErrorDesc.replace(/\+/g, ' ')));
      } else if (urlError) {
        setError(`Authentication Error: ${urlError}`);
      }
    }
  }, []);

  // ─── Google Identity Services (GIS) Native Button Renderer ─────────────────
  useEffect(() => {
    if (mode !== 'login' && mode !== 'register') return;

    let mounted = true;
    const initGsi = async () => {
      const clientId = googleAuthService.getGoogleClientId();
      if (!clientId) return;

      const loaded = await googleAuthService.loadGoogleScript();
      if (!loaded || !window.google?.accounts?.id || !googleButtonRef.current || !mounted) return;

      try {
        const { rawNonce, hashedNonce } = await googleAuthService.createNoncePair();

        window.google.accounts.id.initialize({
          client_id: clientId,
          nonce: hashedNonce,
          callback: async (response: any) => {
            if (response.credential) {
              setOauthLoading('google');
              try {
                const { data, error: idTokenErr } = await googleAuthService.signInWithGoogleIdToken(
                  response.credential,
                  rawNonce
                );
                if (idTokenErr) {
                  setError(formatAuthError(idTokenErr));
                  setOauthLoading(null);
                } else if (data?.user) {
                  trackLoginSuccess({ provider: 'google', email_verified: true });
                  trackMixpanelLoginSuccess({ loginMethod: 'google' });
                  const userProfile = await AuthService.loadUserProfile(data.user.id, data.user);
                  if (userProfile) {
                    onSuccess(userProfile);
                  } else {
                    const googleName = (
                      data.user.user_metadata?.full_name ||
                      data.user.user_metadata?.name ||
                      data.user.email?.split('@')[0] ||
                      'User'
                    ).trim();
                    const derivedUsername = deriveUsernameFromName(googleName, data.user.email);
                    onSuccess({
                      id: data.user.id,
                      name: googleName,
                      email: data.user.email || '',
                      avatarUrl: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || '',
                      username: derivedUsername,
                      role: 'User',
                      hasCompletedProfileSetup: true,
                    });
                  }
                }
              } catch (innerErr: any) {
                setError(formatAuthError(innerErr));
                setOauthLoading(null);
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleButtonRef.current) {
          googleButtonRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'continue_with',
            logo_alignment: 'left',
            width: googleButtonRef.current.offsetWidth || 350,
          });
          setIsGsiRendered(true);
        }
      } catch {
        setIsGsiRendered(false);
      }
    };

    initGsi();

    return () => {
      mounted = false;
    };
  }, [mode, onSuccess]);

  // ─── OAuth Handlers ───────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    if (oauthLoading || loading) return;
    const rl = securityUtils.rateLimit('oauth_google', 1500);
    if (!rl.allowed) {
      setError(rl.error || 'Too many requests. Please wait a moment before trying again.');
      return;
    }
    setError(null);
    setOauthLoading('google');

    try {
      const { error: oauthErr } = await AuthService.signInWithProvider('google');
      if (oauthErr) {
        setError(formatAuthError(oauthErr));
        setOauthLoading(null);
      }
    } catch (err: any) {
      setError(formatAuthError(err));
      setOauthLoading(null);
    }
  };

  const handleGitHubSignIn = async () => {
    if (oauthLoading || loading) return;
    const rl = securityUtils.rateLimit('oauth_github', 1500);
    if (!rl.allowed) {
      setError(rl.error || 'Too many requests. Please wait a moment before trying again.');
      return;
    }
    setError(null);
    setOauthLoading('github');
    try {
      const { error } = await AuthService.signInWithProvider('github');
      if (error) {
        setError(formatAuthError(error));
        setOauthLoading(null);
      }
    } catch (err: any) {
      setError(formatAuthError(err));
      setOauthLoading(null);
    }
  };

  // ─── Email Sign In ────────────────────────────────────────────────────────
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || oauthLoading) return;
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }

    const rl = securityUtils.rateLimit(`login_${cleanEmail}`, 1500);
    if (!rl.allowed) {
      setError(rl.error || 'Too many login attempts. Please wait a moment.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await AuthService.signIn(cleanEmail, password, captchaToken);
      if (error) {
        const formatted = formatAuthError(error);
        setError(formatted);
        // Reset CAPTCHA so user can solve a fresh challenge on retry
        captchaRef.current?.reset();
        setCaptchaToken(null);
        if (
          formatted.toLowerCase().includes('verify your email') ||
          formatted.toLowerCase().includes('not confirmed') ||
          formatted.toLowerCase().includes('not been confirmed') ||
          (error as any)?.code === 'email_not_confirmed'
        ) {
          setMode('verify');
        }
        return;
      }

      if (data?.user) {
        trackLoginSuccess({ provider: 'email', email_verified: true });
        trackMixpanelLoginSuccess({ loginMethod: 'email' });
        const userProfile = await AuthService.loadUserProfile(data.user.id, data.user);
        if (userProfile) {
          onSuccess(userProfile);
        } else {
          const authName = (
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            cleanEmail.split('@')[0] ||
            'User'
          ).trim();
          const derivedUsername = deriveUsernameFromName(authName, cleanEmail);
          onSuccess({
            id: data.user.id,
            name: authName,
            email: cleanEmail,
            avatarUrl: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || '',
            username: derivedUsername,
            role: 'User',
            hasCompletedProfileSetup: true
          });
        }
      }
    } catch (err: any) {
      setError(formatAuthError(err));
      captchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  // ─── Email Sign Up ────────────────────────────────────────────────────────
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || oauthLoading) return;
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail || !password) {
      setError('Please complete all required fields.');
      return;
    }

    if (cleanName.length < 2 || cleanName.length > 50) {
      setError('Full name must be between 2 and 50 characters.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!agreeTerms) {
      setError('Please review and check the agreement box for PromptHub\'s Terms of Service and Privacy Policy.');
      return;
    }

    const rl = securityUtils.rateLimit(`signup_${cleanEmail}`, 3000);
    if (!rl.allowed) {
      setError(rl.error || 'Too many signup attempts. Please wait a moment.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await AuthService.signUp(cleanEmail, password, { full_name: cleanName }, captchaToken);
      if (error) {
        setError(formatAuthError(error));
        captchaRef.current?.reset();
        setCaptchaToken(null);
        return;
      }

      if (data?.user) {
        trackSignupCompleted({ provider: 'email', email_verified: false, account_type: 'Free' });
        trackMixpanelSignUpCompleted({ signUpMethod: 'email' });
        if (data.session) {
          const derivedUsername = deriveUsernameFromName(cleanName, cleanEmail);
          onSuccess({
            id: data.user.id,
            name: cleanName,
            email: cleanEmail,
            avatarUrl: '',
            username: derivedUsername,
            role: 'User',
            hasCompletedProfileSetup: true
          });
        } else {
          setSuccessMsg('Confirmation code sent to your email. Please verify below.');
          setMode('verify');
          setCaptchaToken(null);
        }
      }
    } catch (err: any) {
      setError(formatAuthError(err));
      captchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  // ─── Forgot Password ──────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your account email.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error } = await AuthService.resetPassword(cleanEmail, captchaToken);
      if (error) {
        setError(formatAuthError(error));
        captchaRef.current?.reset();
        setCaptchaToken(null);
      } else {
        setSuccessMsg('Password reset instructions sent! Check your inbox.');
        captchaRef.current?.reset();
        setCaptchaToken(null);
      }
    } catch (err: any) {
      setError(formatAuthError(err));
      captchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };


  // ─── Verify OTP ───────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const cleanEmail = email.trim();
    const cleanToken = otpCode.trim();

    if (!cleanEmail || !cleanToken) {
      setError('Please enter the 6-digit code sent to your email.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await AuthService.verifyEmailOtp(cleanEmail, cleanToken);
      if (error) {
        setError(formatAuthError(error));
      } else if (data?.user) {
        trackLoginSuccess({ provider: 'email', email_verified: true });
        trackMixpanelLoginSuccess({ loginMethod: 'email' });
        const userProfile = await AuthService.loadUserProfile(data.user.id, data.user);
        if (userProfile) {
          onSuccess(userProfile);
        } else {
          const authName = (
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            cleanEmail.split('@')[0] ||
            'User'
          ).trim();
          const derivedUsername = deriveUsernameFromName(authName, cleanEmail);
          onSuccess({
            id: data.user.id,
            name: authName,
            email: cleanEmail,
            avatarUrl: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || '',
            username: derivedUsername,
            role: 'User',
            hasCompletedProfileSetup: true
          });
        }
      }
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // ─── Reset Password ───────────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error } = await AuthService.updatePassword(password);
      if (error) {
        setError(formatAuthError(error));
      } else {
        setSuccessMsg('Password updated successfully!');
        if (onPasswordResetComplete) {
          onPasswordResetComplete();
        } else {
          setMode('login');
        }
      }
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address to resend the confirmation code.');
      return;
    }
    setResendCooldown(60);
    setError(null);
    setSuccessMsg(null);
    try {
      const { error } = await AuthService.resendConfirmationEmail(cleanEmail, captchaToken);
      if (error) {
        setError(formatAuthError(error));
        captchaRef.current?.reset();
        setCaptchaToken(null);
      } else {
        setSuccessMsg('Confirmation email sent! Please check your inbox (and spam/junk folder).');
      }
    } catch (err: any) {
      setError(formatAuthError(err));
      captchaRef.current?.reset();
      setCaptchaToken(null);
    }
  };


  return (
    <div className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-8 py-6 sm:py-12 bg-bg-primary overflow-y-auto min-h-[calc(100vh-4rem)] relative font-sans text-text-primary">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-[420px] bg-bg-secondary border border-border-default rounded-xl p-6 sm:p-8 shadow-md relative overflow-hidden my-auto text-left"
      >
        {/* Back Button for sub-modes */}
        {(mode === 'forgot' || mode === 'verify' || mode === 'reset') && (
          <button 
            type="button"
            onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); setCaptchaToken(null); captchaRef.current?.reset(); }}
            className="mb-3 text-xs text-text-muted hover:text-text-primary flex items-center gap-1.5 transition-colors cursor-pointer min-h-[36px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
        )}


        {/* Header Branding */}
        <div className="text-center mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="inline-flex items-center justify-center mx-auto mb-3 cursor-pointer hover:opacity-85 transition-opacity min-h-[44px] min-w-[44px] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
            title="Return to PromptHub Home"
            aria-label="Return to PromptHub Home"
          >
            <PromptHubLogo variant="compact" size={44} />
          </button>
          <h1 className="text-xl font-bold font-display text-text-primary tracking-tight">
            {mode === 'login' && 'Sign in to PromptHub'}
            {mode === 'register' && 'Create your PromptHub account'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'verify' && 'Verify your email'}
            {mode === 'reset' && 'Set new password'}
          </h1>
          <p className="text-xs text-text-secondary mt-0.5 leading-relaxed max-w-sm mx-auto">
            {mode === 'login' && 'Access your prompt workspace and multi-model tools'}
            {mode === 'register' && 'Join developers building production AI workflows'}
            {mode === 'forgot' && 'Enter your email to receive recovery instructions'}
            {mode === 'verify' && 'Enter the 6-digit code or click the confirmation link sent to your email'}
            {mode === 'reset' && 'Enter your new password to restore access'}
          </p>
        </div>


        {/* OAuth Buttons (Only shown for Login & Register modes) */}
        {(mode === 'login' || mode === 'register') && (
          <div className="space-y-2 mb-4">
            {/* Google Sign-In — uses Google Identity Services popup (shows PromptHub branding) */}
            <div className="w-full flex justify-center min-h-[44px] relative overflow-hidden rounded-lg">
              {/* GIS native button: renders when Google script loads — shows PromptHub app name */}
              <div ref={googleButtonRef} className={`w-full flex justify-center ${isGsiRendered ? 'block' : 'hidden'}`} />

              {/* Fallback button while GIS script loads */}
              {!isGsiRendered && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading || oauthLoading !== null}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-3 bg-white dark:bg-bg-tertiary hover:bg-bg-primary dark:hover:bg-bg-elevated border border-border-default hover:border-border-hover rounded-lg text-xs font-semibold text-text-primary transition-colors cursor-pointer disabled:opacity-50 min-h-[44px] shadow-2xs"
                >
                  {oauthLoading === 'google' ? (
                    <div className="w-3.5 h-3.5 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleGitHubSignIn}
              disabled={loading || oauthLoading !== null}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-3 bg-white dark:bg-bg-tertiary hover:bg-bg-primary dark:hover:bg-bg-elevated border border-border-default hover:border-border-hover rounded-lg text-xs font-semibold text-text-primary transition-colors cursor-pointer disabled:opacity-50 min-h-[44px] shadow-2xs"
            >
              {oauthLoading === 'github' ? (
                <div className="w-3.5 h-3.5 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 shrink-0 fill-current text-text-primary" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                  <span>Continue with GitHub</span>
                </>
              )}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border-default" />
              <span className="flex-shrink mx-2 text-text-muted text-[10px] uppercase font-mono font-semibold">
                or email
              </span>
              <div className="flex-grow border-t border-border-default" />
            </div>
          </div>
        )}

        {/* Error / Success Notifications */}
        {error && (
          <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg text-xs flex flex-col gap-1.5 text-left">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
            {error.includes('Google') && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="mt-0.5 self-start px-2.5 py-1 bg-bg-secondary border border-rose-300 text-rose-900 rounded-md text-[11px] font-semibold hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <span>Continue with Google</span>
              </button>
            )}
            {(error.includes('authentication server') || error.includes('network') || error.includes('connect to authentication') || error.includes('firewall')) && (
              <div className="flex flex-wrap items-center gap-2 mt-1 pt-1.5 border-t border-rose-200/80">
                <button
                  type="button"
                  onClick={(e) => {
                    if (mode === 'login') handleEmailLogin(e);
                    else if (mode === 'register') handleEmailSignup(e);
                  }}
                  className="px-3 py-2 bg-brand-primary text-white rounded-md text-xs font-semibold hover:bg-brand-primary-hover flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors min-h-[44px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Connection</span>
                </button>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mb-3 bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg text-xs flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ─── 1. LOGIN MODE ─── */}
          {mode === 'login' && (
            <motion.form 
              key="mode-login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleEmailLogin} 
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-white dark:bg-bg-tertiary border border-border-default hover:border-border-hover focus:border-brand-primary focus:bg-white dark:focus:bg-bg-tertiary rounded-lg pl-9 pr-3 py-2 text-base sm:text-xs text-text-primary placeholder:text-text-muted focus:outline-none transition-colors shadow-2xs min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Password</label>
                  <button 
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); setCaptchaToken(null); captchaRef.current?.reset(); }}
                    className="text-[10px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  >
                    Forgot?
                  </button>

                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white dark:bg-bg-tertiary border border-border-default hover:border-border-hover focus:border-brand-primary focus:bg-white dark:focus:bg-bg-tertiary rounded-lg pl-9 pr-10 py-2 text-base sm:text-xs text-text-primary placeholder:text-text-muted focus:outline-none font-mono transition-colors shadow-2xs min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Attack Protection CAPTCHA Challenge */}
              <CaptchaChallenge
                ref={captchaRef}
                action="login"
                showOverlayBadge={false}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
              />

              <button
                type="submit"
                disabled={loading || oauthLoading !== null}
                className="w-full py-2.5 bg-surface-inverse hover:bg-surface-inverse-hi disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-1 min-h-[44px]"
              >
                {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign In'}
              </button>

              <div className="text-center pt-2 text-xs text-text-muted space-y-2">
                <div>
                  <span>Don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(null); setSuccessMsg(null); setCaptchaToken(null); }}
                    className="font-semibold text-text-primary hover:underline cursor-pointer"
                  >
                    Register
                  </button>
                </div>
                <p className="text-[11px] text-text-muted text-center leading-relaxed pt-1 border-t border-border-default/60">
                  Protected by developer encryption. Review our{' '}
                  <a
                    href="https://prompthub.cloud/terms"
                    onClick={(e) => {
                      if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        setActiveTab('terms');
                      }
                    }}
                    className="font-medium text-text-secondary hover:text-brand-primary underline cursor-pointer"
                  >
                    Terms of Service
                  </a>,{' '}
                  <a
                    href="https://prompthub.cloud/privacy"
                    onClick={(e) => {
                      if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        setActiveTab('privacy');
                      }
                    }}
                    className="font-medium text-text-secondary hover:text-brand-primary underline cursor-pointer"
                  >
                    Privacy Policy
                  </a>{' '}
                  &amp;{' '}
                  <a
                    href="https://prompthub.cloud/cookies"
                    onClick={(e) => {
                      if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        setActiveTab('cookies');
                      }
                    }}
                    className="font-medium text-text-secondary hover:text-brand-primary underline cursor-pointer"
                  >
                    Cookie Policy
                  </a>.
                </p>
              </div>
            </motion.form>
          )}

          {/* ─── 2. REGISTER MODE ─── */}
          {mode === 'register' && (
            <motion.form 
              key="mode-register"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleEmailSignup} 
              className="space-y-3"
            >
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Full Name</label>
                  <span className="text-[10px] text-text-muted font-mono tabular-nums">{fullName.length}/50</span>
                </div>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input 
                    type="text" 
                    required 
                    maxLength={50}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.slice(0, 50))}
                    placeholder="Jane Doe"
                    className="w-full bg-white dark:bg-bg-tertiary border border-border-default hover:border-border-hover focus:border-brand-primary focus:bg-white dark:focus:bg-bg-tertiary rounded-lg pl-9 pr-3 py-2 text-base sm:text-xs text-text-primary placeholder:text-text-muted focus:outline-none transition-colors shadow-2xs min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input 
                    type="email" 
                    required 
                    maxLength={100}
                    value={email}
                    onChange={(e) => setEmail(e.target.value.slice(0, 100))}
                    placeholder="jane@company.com"
                    className="w-full bg-white dark:bg-bg-tertiary border border-border-default hover:border-border-hover focus:border-brand-primary focus:bg-white dark:focus:bg-bg-tertiary rounded-lg pl-9 pr-3 py-2 text-base sm:text-xs text-text-primary placeholder:text-text-muted focus:outline-none transition-colors shadow-2xs min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value.slice(0, 128))}
                    placeholder="•••••••••••• (min 8 characters)"
                    className="w-full bg-white dark:bg-bg-tertiary border border-border-default hover:border-border-hover focus:border-brand-primary focus:bg-white dark:focus:bg-bg-tertiary rounded-lg pl-9 pr-10 py-2 text-base sm:text-xs text-text-primary placeholder:text-text-muted focus:outline-none font-mono transition-colors shadow-2xs min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Confirm Password</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    maxLength={128}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value.slice(0, 128))}
                    placeholder="••••••••••••"
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-9 pr-3 py-2 text-base sm:text-xs text-text-primary focus:border-brand-primary focus:outline-none font-mono min-h-[44px]"
                  />
                </div>
              </div>

              {/* Attack Protection CAPTCHA Challenge */}
              <CaptchaChallenge
                ref={captchaRef}
                action="register"
                showOverlayBadge={false}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
              />

              {/* Mandatory Legal Terms & Policy Agreement Checkbox */}
              <div className="p-3 rounded-xl bg-white dark:bg-bg-tertiary border border-border-default flex items-start gap-2.5 text-left select-none shadow-2xs">
                <input
                  type="checkbox"
                  id="agree-terms-checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border-default text-brand-primary focus:ring-brand-primary shrink-0 cursor-pointer accent-brand-primary"
                />
                <label htmlFor="agree-terms-checkbox" className="text-[11px] text-text-secondary leading-snug cursor-pointer">
                  I agree to PromptHub's{' '}
                  <a
                    href="https://prompthub.cloud/terms"
                    onClick={(e) => {
                      if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        setActiveTab('terms');
                      }
                    }}
                    className="font-semibold text-text-primary underline hover:text-brand-primary"
                  >
                    Terms of Service
                  </a>{' '}
                  (including public beta development terms &amp; team finality of decisions),{' '}
                  <a
                    href="https://prompthub.cloud/privacy"
                    onClick={(e) => {
                      if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        setActiveTab('privacy');
                      }
                    }}
                    className="font-semibold text-text-primary underline hover:text-brand-primary"
                  >
                    Privacy Policy
                  </a>, and{' '}
                  <a
                    href="https://prompthub.cloud/cookies"
                    onClick={(e) => {
                      if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        setActiveTab('cookies');
                      }
                    }}
                    className="font-semibold text-text-primary underline hover:text-brand-primary"
                  >
                    Cookie Policy
                  </a>.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || oauthLoading !== null}
                className="w-full py-2.5 bg-surface-inverse hover:bg-surface-inverse-hi disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-1 min-h-[44px]"
              >
                {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Account'}
              </button>

              <div className="text-center pt-2 text-xs text-text-muted space-y-2">
                <div>
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); setCaptchaToken(null); }}
                    className="font-semibold text-text-primary hover:underline cursor-pointer min-h-[36px]"
                  >
                    Sign in
                  </button>
                </div>
                <p className="text-[11px] text-text-muted text-center leading-relaxed pt-1 border-t border-border-default/60">
                  By registering, you agree to PromptHub's{' '}
                  <a
                    href="https://prompthub.cloud/terms"
                    onClick={(e) => {
                      if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        setActiveTab('terms');
                      }
                    }}
                    className="font-medium text-text-secondary hover:text-brand-primary underline cursor-pointer"
                  >
                    Terms of Service
                  </a>{' '}
                  and acknowledge our{' '}
                  <a
                    href="https://prompthub.cloud/privacy"
                    onClick={(e) => {
                      if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        setActiveTab('privacy');
                      }
                    }}
                    className="font-medium text-text-secondary hover:text-brand-primary underline cursor-pointer"
                  >
                    Privacy Policy
                  </a>.
                </p>
              </div>
            </motion.form>
          )}

          {/* ─── 3. FORGOT PASSWORD MODE ─── */}
          {mode === 'forgot' && (
            <motion.form 
              key="mode-forgot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleForgotPassword} 
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-white dark:bg-bg-tertiary border border-border-default hover:border-border-hover focus:border-brand-primary focus:bg-white dark:focus:bg-bg-tertiary rounded-lg pl-9 pr-3 py-2 text-base sm:text-xs text-text-primary placeholder:text-text-muted focus:outline-none transition-colors shadow-2xs min-h-[44px]"
                  />
                </div>
              </div>

              {/* Attack Protection CAPTCHA Challenge */}
              <CaptchaChallenge
                ref={captchaRef}
                action="forgot_password"
                showOverlayBadge={false}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-surface-inverse hover:bg-surface-inverse-hi disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-1 min-h-[44px]"
              >
                {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send Recovery Link'}
              </button>
            </motion.form>
          )}


          {/* ─── 4. VERIFY EMAIL OTP MODE ─── */}
          {mode === 'verify' && (
            <motion.form 
              key="mode-verify"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleVerifyOtp} 
              className="space-y-3"
            >
              {/* Sent-to email badge with change link */}
              <div className="p-2.5 rounded-lg bg-white dark:bg-bg-tertiary border border-border-default flex items-center justify-between text-xs shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <span className="font-mono text-text-primary truncate">{email || 'your email'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                  className="text-[11px] font-semibold text-brand-primary hover:underline cursor-pointer shrink-0 ml-2 min-h-[36px]"
                >
                  Change
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">6-Digit Confirmation Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input 
                    type="text" 
                    required 
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    className="w-full bg-white dark:bg-bg-tertiary border border-border-default hover:border-border-hover focus:border-brand-primary focus:bg-white dark:focus:bg-bg-tertiary rounded-lg pl-9 pr-3 py-2 text-center text-lg sm:text-sm font-mono tracking-widest text-text-primary placeholder:text-text-muted focus:outline-none transition-colors shadow-2xs min-h-[48px]"
                  />
                </div>
              </div>

              {/* Attack Protection CAPTCHA Challenge */}
              <CaptchaChallenge
                ref={captchaRef}
                action="verify_otp"
                showOverlayBadge={false}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
              />

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-2.5 bg-surface-inverse hover:bg-surface-inverse-hi disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-1 min-h-[44px]"
              >
                {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Verify Code & Enter'}
              </button>

              <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendCooldown > 0}
                  className="text-text-muted hover:text-text-primary disabled:opacity-50 cursor-pointer flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend confirmation code'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                  className="text-text-muted hover:text-text-primary cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-bg-tertiary border border-border-default text-[11px] text-text-muted leading-relaxed text-left">
                <span>Check your spam or junk folder. You can also sign in with </span>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="font-semibold text-brand-primary hover:underline cursor-pointer"
                >
                  Google
                </button>
                <span> using the same email address.</span>
              </div>
            </motion.form>
          )}

          {/* ─── 5. RESET PASSWORD MODE ─── */}
          {mode === 'reset' && (
            <motion.form 
              key="mode-reset"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleResetPassword} 
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••••••• (min 8 characters)"
                    className="w-full bg-white dark:bg-bg-tertiary border border-border-default hover:border-border-hover focus:border-brand-primary focus:bg-white dark:focus:bg-bg-tertiary rounded-lg pl-9 pr-10 py-2 text-base sm:text-xs text-text-primary placeholder:text-text-muted focus:outline-none font-mono transition-colors shadow-2xs min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Confirm New Password</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-9 pr-3 py-2 text-base sm:text-xs text-text-primary focus:border-brand-primary focus:outline-none font-mono min-h-[44px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-surface-inverse hover:bg-surface-inverse-hi disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-1 min-h-[44px]"
              >
                {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Update Password'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AuthView;
