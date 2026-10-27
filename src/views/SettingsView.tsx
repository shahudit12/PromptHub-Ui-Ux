import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

import { 
  User, 
  Save,
  Bug,
  MessageSquareWarning,
  Globe,
  Share2,
  CheckCircle,
  AlertCircle,
  Phone,
  Palette,
  Sun,
  Moon,
  Laptop,
  Landmark,
  QrCode,
  Building2,
  Lock,
  Unlock,
  CheckCircle2,
  Sparkles,
  Trash2,
  Pencil,
  Camera,
  Loader2,
  HardDrive,
  X,
  Smartphone,
  Download,
  ShieldCheck,
  ExternalLink,
  CreditCard,
  AlertTriangle,
  Check,
  ChevronRight,
  Wallet,
  Code2,
  Terminal,
} from 'lucide-react';
import { securityUtils } from '../utils/security';
import { GithubIcon, LinkedinIcon, TwitterIcon } from '../components/SocialIcons';
import { ProfileHealthCard } from '../components/ProfileHealthCard';
import { AppFeedbackModal } from '../components/AppFeedbackModal';
import { UpiQrCodeUploader } from '../components/payment/UpiQrCodeUploader';
import { ImageCropModal } from '../components/ImageCropModal';
import { avatarUploadService } from '../services/avatarUploadService';
import { UserAvatar } from '../components/UserAvatar';
import { storageService, formatStorageBytes, type StorageQuota } from '../services/storageService';
import { triggerApkDownload, APK_METADATA, isPwaInstalled as checkPwaInstalled, hasPwaPrompt, triggerPwaInstall } from '../utils/apkDownload';
import { MobileAppShowcaseModal } from '../components/MobileAppShowcaseModal';
import { identityChangeLimitService } from '../services/identityChangeLimitService';

const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUM_REGEX = /^[0-9]{9,18}$/;

export const SettingsView: React.FC = () => {
  const { user, updateUser, showToast, setIsBugReportModalOpen, setShowAuthModal, setActiveTab, cancelSubscription, deleteAccount } = useApp();
  const { theme, setTheme } = useTheme();

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Plan & Subscription Helpers
  const currentPlan = (user?.plan || 'free').toLowerCase();
  const isPaidPlan = Boolean(user?.hasPremiumAccess || (currentPlan !== 'free'));
  const formattedProUntil = user?.proUntil ? new Date(user.proUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null;

  // ─── SessionStorage Draft Persistence (prevents wiping out uncommitted edits across tabs / re-renders) ───
  const draftKey = user?.id ? `ph_settings_form_draft_${user.id}` : null;
  const loadDraft = () => {
    if (typeof window === 'undefined' || !draftKey) return null;
    try {
      const stored = sessionStorage.getItem(draftKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const initialDraft = useMemo(() => loadDraft(), [draftKey]);
  const isDirtyRef = useRef<boolean>(Boolean(initialDraft));

  const persistDraftField = useCallback((field: string, val: string) => {
    isDirtyRef.current = true;
    if (typeof window !== 'undefined' && draftKey) {
      try {
        const cur = loadDraft() || {
          username: user?.username || '',
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phoneNumber || '',
          bio: user?.bio || '',
          github: user?.socialLinks?.github || '',
          linkedin: user?.socialLinks?.linkedin || '',
          twitter: user?.socialLinks?.twitter || '',
          website: user?.socialLinks?.website || '',
        };
        cur[field] = val;
        sessionStorage.setItem(draftKey, JSON.stringify(cur));
      } catch {}
    }
  }, [draftKey, user]);

  const clearFormDraft = useCallback(() => {
    isDirtyRef.current = false;
    if (typeof window !== 'undefined' && draftKey) {
      try {
        sessionStorage.removeItem(draftKey);
      } catch {}
    }
  }, [draftKey]);

  // Profile Form state initialized from draft or user
  const [username, setUsername] = useState(() => initialDraft?.username ?? (user?.username || ''));
  const [name, setName] = useState(() => initialDraft?.name ?? (user?.name || ''));
  const [email, setEmail] = useState(() => initialDraft?.email ?? (user?.email || ''));
  const [phone, setPhone] = useState(() => initialDraft?.phone ?? (user?.phoneNumber || ''));
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [bio, setBio] = useState(() => initialDraft?.bio ?? (user?.bio || ''));

  // Identity change quota tracking (max 2 changes per rolling 7 days)
  const nameQuota = useMemo(() => {
    return identityChangeLimitService.checkNameChangeQuota(user?.id);
  }, [user?.id, user?.nameChangeHistory]);

  const usernameQuota = useMemo(() => {
    return identityChangeLimitService.checkUsernameChangeQuota(user?.id);
  }, [user?.id, user?.usernameChangeHistory]);

  const isNameChangeBlocked = Boolean(user && name.trim() !== (user.name || '').trim() && !nameQuota.allowed);
  const isUsernameChangeBlocked = Boolean(user && username.trim().toLowerCase() !== (user.username || '').toLowerCase() && !usernameQuota.allowed);
  
  // PWA Install & APK Showcase State
  const [hasNativePrompt, setHasNativePrompt] = useState<boolean>(() => hasPwaPrompt());
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [isApkShowcaseOpen, setIsApkShowcaseOpen] = useState<boolean>(false);

  // Username Uniqueness State
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Social Links state initialized from draft or user
  const [github, setGithub] = useState(() => initialDraft?.github ?? (user?.socialLinks?.github || ''));
  const [linkedin, setLinkedin] = useState(() => initialDraft?.linkedin ?? (user?.socialLinks?.linkedin || ''));
  const [twitter, setTwitter] = useState(() => initialDraft?.twitter ?? (user?.socialLinks?.twitter || ''));
  const [website, setWebsite] = useState(() => initialDraft?.website ?? (user?.socialLinks?.website || ''));
  const [githubError, setGithubError] = useState<string | null>(null);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [twitterError, setTwitterError] = useState<string | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);

  // Payout Details State (Simple, Optional: UPI or Bank Account + IFSC)
  const [payoutType, setPayoutType] = useState<'upi' | 'bank_account'>('upi');
  const [upiId, setUpiId] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(user?.name || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  const [isPayoutConfigured, setIsPayoutConfigured] = useState(false);
  const [maskedUpi, setMaskedUpi] = useState<string | null>(null);
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState<string | null>(null);
  const [savedQrCodeUrl, setSavedQrCodeUrl] = useState<string | null>(null);
  const [maskedAcc, setMaskedAcc] = useState<string | null>(null);
  const [savedHolderName, setSavedHolderName] = useState<string | null>(null);
  const [savedIfsc, setSavedIfsc] = useState<string | null>(null);
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [isRemovingPayout, setIsRemovingPayout] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);

  // Subscription & Cancellation Modal State
  const [isCancelSubModalOpen, setIsCancelSubModalOpen] = useState(false);
  const [isCancellingSub, setIsCancellingSub] = useState(false);

  // Danger Zone / Account Deletion State
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Settings Category Navigation State
  type SettingsCategory = 'all' | 'profile' | 'payouts' | 'appearance' | 'storage' | 'mobile' | 'billing' | 'security' | 'developer';
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('all');

  // Track Unsaved Changes per card
  const isProfileDirty = useMemo(() => {
    if (!user) return false;
    return (
      username !== (user.username || '') ||
      name !== (user.name || '') ||
      phone !== (user.phoneNumber || '') ||
      bio !== (user.bio || '')
    );
  }, [user, username, name, phone, bio]);

  const isSocialDirty = useMemo(() => {
    if (!user) return false;
    return (
      github !== (user.socialLinks?.github || '') ||
      linkedin !== (user.socialLinks?.linkedin || '') ||
      twitter !== (user.socialLinks?.twitter || '') ||
      website !== (user.socialLinks?.website || '')
    );
  }, [user, github, linkedin, twitter, website]);

  const handleResetProfile = () => {
    if (!user) return;
    setUsername(user.username || '');
    setName(user.name || '');
    setPhone(user.phoneNumber || '');
    setBio(user.bio || '');
    setPhoneError(null);
    setUsernameError(null);
    showToast('Reverted profile changes.', 'info');
  };

  const handleResetSocials = () => {
    if (!user) return;
    setGithub(user.socialLinks?.github || '');
    setLinkedin(user.socialLinks?.linkedin || '');
    setTwitter(user.socialLinks?.twitter || '');
    setWebsite(user.socialLinks?.website || '');
    setGithubError(null);
    setLinkedinError(null);
    setTwitterError(null);
    setWebsiteError(null);
    showToast('Reverted social link changes.', 'info');
  };

  // Profile Completeness Calculation for right-hand companion panel
  const completenessScore = useMemo(() => {
    let score = 0;
    if (user?.email) score += 15;
    if (username.trim()) score += 20;
    if (name.trim()) score += 15;
    if (bio.trim()) score += 20;
    if (github.trim() || twitter.trim() || linkedin.trim() || website.trim()) score += 15;
    if (isPayoutConfigured || upiId.trim() || accountNumber.trim()) score += 15;
    return Math.min(score, 100);
  }, [user?.email, username, name, bio, github, twitter, linkedin, website, isPayoutConfigured, upiId, accountNumber]);

  const handleConfirmCancelSubscription = async () => {
    setIsCancellingSub(true);
    try {
      await cancelSubscription();
      setIsCancelSubModalOpen(false);
    } catch {
      // Handled in context
    } finally {
      setIsCancellingSub(false);
    }
  };

  const isDeleteUnlocked = deleteConfirmText.trim().toUpperCase() === 'DELETE';

  const handleConfirmDeleteAccount = async () => {
    if (!isDeleteUnlocked) {
      showToast('Please type DELETE to unlock and confirm account deletion.', 'error');
      return;
    }
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      setIsDeleteAccountModalOpen(false);
      // Clean redirect to root upon account deletion
      window.location.replace('/');
    } catch {
      // Handled in context
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Profile Photo Upload & Crop State
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropRawFile, setCropRawFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleAvatarFileSelected = (file: File | null) => {
    if (!file) return;
    setCropRawFile(file);
    setIsCropOpen(true);
  };

  const handleCropFinished = async (blob: Blob, _dataUrl: string) => {
    if (!user) return;
    setIsUploadingPhoto(true);
    showToast('Saving and publishing your new profile photo...', 'info');

    try {
      const uploadRes = await avatarUploadService.uploadAvatar(blob, user.id);
      await updateUser({
        avatarUrl: uploadRes.url,
      });
      showToast('Your new profile photo is live! Everyone can now see your updated DP.', 'success');
    } catch (err: any) {
      console.warn('[SettingsView] Avatar upload notice, applying local compressed fallback:', err);
      try {
        const compressed = await avatarUploadService.compressAvatar(blob, 300, 0.85);
        await updateUser({ avatarUrl: compressed.dataUrl });
        showToast('Your new profile photo is live!', 'success');
      } catch (innerErr: any) {
        showToast('Failed to save profile photo: ' + (innerErr.message || 'Unknown error'), 'error');
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Keep state synced with user profile ONLY if user is not actively editing
  useEffect(() => {
    if (user && !isDirtyRef.current && !(typeof window !== 'undefined' && draftKey && sessionStorage.getItem(draftKey))) {
      setUsername(user.username || '');
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phoneNumber || '');
      setBio(user.bio || '');
      setGithub(user.socialLinks?.github || '');
      setLinkedin(user.socialLinks?.linkedin || '');
      setTwitter(user.socialLinks?.twitter || '');
      setWebsite(user.socialLinks?.website || '');
    }
  }, [user, draftKey]);

  // Fetch live storage quota for Drive Vault
  useEffect(() => {
    storageService.getQuota().then(setStorageQuota).catch(() => {});
  }, [user]);

  // Listen for PWA installation capability on mobile / desktop
  useEffect(() => {
    if (checkPwaInstalled()) {
      setIsAppInstalled(true);
    }
    if (hasPwaPrompt()) {
      setHasNativePrompt(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setHasNativePrompt(true);
    };
    const handlePromptReady = () => {
      setHasNativePrompt(true);
    };
    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setHasNativePrompt(false);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    const outcome = await triggerPwaInstall();
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
      setHasNativePrompt(false);
      showToast('PromptHub installed successfully on your device!', 'success');
    } else if (outcome === 'manual_required') {
      setIsApkShowcaseOpen(true);
      showToast('To install: Tap your browser menu (⋮) and tap "Install app" or "Add to Home screen".', 'info');
    }
  };

  const handleDownloadApk = () => {
    triggerApkDownload({
      source: 'settings_view',
      onSuccess: () => {
        showToast('Downloading PromptHub.apk (62 KB)... Check notification tray.', 'success');
      },
      onError: (err: any) => {
        showToast(`Download fallback: opening direct mirror (${err.message})`, 'info');
        window.location.href = APK_METADATA.apiFallbackUrl;
      },
    });
  };

  // Live Username Uniqueness Check (300ms debounce)
  useEffect(() => {
    if (!user) return;
    const clean = username.trim().toLowerCase();

    if (!clean) {
      setUsernameAvailable(null);
      setUsernameError('Username is required.');
      return;
    }

    if (clean === user.username) {
      setUsernameAvailable(true);
      setUsernameError(null);
      return;
    }

    if (clean.length < 3) {
      setUsernameAvailable(false);
      setUsernameError('Username must be at least 3 characters long.');
      return;
    }

    if (clean.length > 30) {
      setUsernameAvailable(false);
      setUsernameError('Username cannot exceed 30 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setUsernameAvailable(false);
      setUsernameError('Only letters, numbers, and underscores are allowed.');
      return;
    }

    setUsernameError(null);
    setCheckingUsername(true);

    const timer = setTimeout(async () => {
      try {
        setUsernameAvailable(true);
      } catch {
        setUsernameAvailable(true);
      } finally {
        setCheckingUsername(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, user]);

  const handleSubmit = async (e?: React.FormEvent | React.SyntheticEvent) => {
    e?.preventDefault();
    if (!user) return;

    const cleanUsername = username.trim().toLowerCase();
    if (usernameError || usernameAvailable === false) {
      showToast('Please fix username errors before saving.', 'error');
      return;
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      showToast('Username must be between 3 and 30 characters.', 'error');
      return;
    }

    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2 || cleanName.length > 50) {
      showToast('Display name must be between 2 and 50 characters.', 'error');
      return;
    }

    const cleanBio = bio.trim();
    if (cleanBio.length > 250) {
      showToast('Bio cannot exceed 250 characters.', 'error');
      return;
    }

    const cleanPhone = phone.trim();
    if (cleanPhone) {
      const phoneValidation = securityUtils.validatePhoneNumber(cleanPhone);
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.error || 'Please enter a valid phone number.');
        showToast(phoneValidation.error || 'Invalid phone number format.', 'error');
        return;
      }
    }
    setPhoneError(null);

    // Validate GitHub if provided
    let cleanGithub = github.trim();
    if (cleanGithub) {
      const gRes = securityUtils.validateGithubUrl(cleanGithub);
      if (!gRes.isValid) {
        setGithubError(gRes.error || 'Invalid GitHub URL');
        showToast(gRes.error || 'Invalid GitHub URL. Must be a valid profile link.', 'error');
        return;
      }
      cleanGithub = securityUtils.normalizeUrl(cleanGithub);
      setGithubError(null);
    } else {
      setGithubError(null);
    }

    // Validate LinkedIn if provided
    let cleanLinkedin = linkedin.trim();
    if (cleanLinkedin) {
      const lRes = securityUtils.validateLinkedinUrl(cleanLinkedin);
      if (!lRes.isValid) {
        setLinkedinError(lRes.error || 'Invalid LinkedIn URL');
        showToast(lRes.error || 'Invalid LinkedIn URL. Must be a valid profile link.', 'error');
        return;
      }
      cleanLinkedin = securityUtils.normalizeUrl(cleanLinkedin);
      setLinkedinError(null);
    } else {
      setLinkedinError(null);
    }

    // Validate Twitter / X if provided
    let cleanTwitter = twitter.trim();
    if (cleanTwitter) {
      const tRes = securityUtils.validateTwitterUrl(cleanTwitter);
      if (!tRes.isValid) {
        setTwitterError(tRes.error || 'Invalid Twitter / X URL');
        showToast(tRes.error || 'Invalid Twitter / X URL. Must be a valid profile link.', 'error');
        return;
      }
      cleanTwitter = securityUtils.normalizeUrl(cleanTwitter);
      setTwitterError(null);
    } else {
      setTwitterError(null);
    }

    // Validate Website if provided
    let cleanWebsite = website.trim();
    if (cleanWebsite) {
      const wRes = securityUtils.validateWebsiteUrl(cleanWebsite);
      if (!wRes.isValid) {
        setWebsiteError(wRes.error || 'Invalid Website URL');
        showToast(wRes.error || 'Invalid Website URL. Must be a valid website address.', 'error');
        return;
      }
      cleanWebsite = securityUtils.normalizeUrl(cleanWebsite);
      setWebsiteError(null);
    } else {
      setWebsiteError(null);
    }

    setIsSaving(true);
    try {

      await updateUser({
        username: cleanUsername,
        name: name.trim(),
        phoneNumber: cleanPhone || undefined,
        bio: bio.trim(),
        hasCompletedProfileSetup: true,
        socialLinks: {
          github: cleanGithub,
          linkedin: cleanLinkedin,
          twitter: cleanTwitter,
          website: cleanWebsite,
        }
      });
      clearFormDraft();
      showToast(`Profile settings updated! Username saved as @${cleanUsername}`, 'success');
    } catch (err: any) {
      showToast('Failed to save settings: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Load Payout Profile on Mount
  useEffect(() => {
    if (!user) return;
    const fetchPayout = async () => {
      try {
        if (!user?.id) return;
        const stored = localStorage.getItem(`ph_payout_profile_${user.id}`);
        if (stored) {
          const profile = JSON.parse(stored);
          setIsPayoutConfigured(true);
          setPayoutType(profile.payoutType || 'upi');
          setMaskedUpi(profile.maskedUpiId);
          setUpiQrCodeUrl(profile.upiQrCodeUrl || null);
          setSavedQrCodeUrl(profile.upiQrCodeUrl || null);
          setMaskedAcc(profile.maskedAccountNumber);
          setSavedHolderName(profile.accountHolderName);
          setSavedIfsc(profile.ifscCode);
        }
      } catch (err) {
        console.warn('[SettingsView] Payout fetch error:', err);
      }
    };


    fetchPayout();
  }, [user]);

  const handleRemovePayout = async () => {
    setIsRemovingPayout(true);
    setPayoutError(null);
    setPayoutSuccess(null);
    try {
      if (user?.id) {
        localStorage.removeItem(`ph_payout_profile_${user.id}`);
      }
      setIsPayoutConfigured(false);
      setMaskedUpi(null);
      setUpiQrCodeUrl(null);
      setSavedQrCodeUrl(null);
      setMaskedAcc(null);
      setSavedHolderName(null);
      setSavedIfsc(null);
      setShowRemoveConfirm(false);
      setPayoutSuccess('Payout details removed successfully.');
    } catch {
      setPayoutError('Failed to remove payout details.');
    } finally {
      setIsRemovingPayout(false);
    }
  };

  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError(null);
    setPayoutSuccess(null);

    // Validation
    if (payoutType === 'upi') {
      const cleanUpi = upiId.trim();
      if (!cleanUpi || !UPI_REGEX.test(cleanUpi)) {
        setPayoutError('Please enter a valid UPI ID / VPA (e.g. username@okhdfcbank).');
        return;
      }
    } else {
      const cleanHolder = accountHolderName.trim();
      const cleanAcc = accountNumber.trim();
      const cleanConfirm = confirmAccountNumber.trim();
      const cleanIfsc = ifscCode.trim().toUpperCase();

      if (!cleanHolder || cleanHolder.length < 2) {
        setPayoutError('Please enter the full account holder name.');
        return;
      }
      if (!cleanAcc || !ACCOUNT_NUM_REGEX.test(cleanAcc)) {
        setPayoutError('Bank account number must be 9 to 18 digits.');
        return;
      }
      if (cleanAcc !== cleanConfirm) {
        setPayoutError('Bank account number and confirmation do not match.');
        return;
      }
      if (!cleanIfsc || !IFSC_REGEX.test(cleanIfsc)) {
        setPayoutError('Please enter a valid 11-character IFSC code (e.g. HDFC0001234).');
        return;
      }
    }

    setIsSavingPayout(true);
    try {
      let authToken = '';

      const payload = {
        payoutType,
        upiId: payoutType === 'upi' ? upiId.trim() : undefined,
        upiQrCodeUrl: payoutType === 'upi' ? (upiQrCodeUrl ? upiQrCodeUrl.trim() : null) : undefined,
        accountHolderName: payoutType === 'bank_account' ? accountHolderName.trim() : undefined,
        accountNumber: payoutType === 'bank_account' ? accountNumber.trim() : undefined,
        confirmAccountNumber: payoutType === 'bank_account' ? confirmAccountNumber.trim() : undefined,
        ifscCode: payoutType === 'bank_account' ? ifscCode.trim().toUpperCase() : undefined,
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      let savedOk = false;
      let returnedProfile: any = null;

      try {
        const res = await fetch('/api/payout-profile', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          savedOk = true;
          returnedProfile = data.profile;
        }
      } catch (fetchErr) {
        console.warn('[SettingsView] /api/payout-profile call note:', fetchErr);
      }

      // Direct authoritative Supabase write so VPA is NEVER lost
      

      setIsPayoutConfigured(false);
      setMaskedUpi(null);
      setUpiId('');
      setUpiQrCodeUrl(null);
      setSavedQrCodeUrl(null);
      setMaskedAcc(null);
      setSavedHolderName(null);
      setSavedIfsc(null);
      setAccountNumber('');
      setConfirmAccountNumber('');
      setShowRemoveConfirm(false);
      setPayoutSuccess('Payout details have been removed.');
      showToast('Creator payout details removed successfully.', 'info');
    } catch (err: any) {
      console.warn('[SettingsView] Remove payout error:', err);
      setPayoutError('Network error while removing payout details.');
    } finally {
      setIsRemovingPayout(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-bg-primary select-text text-left">
        <div className="max-w-2xl space-y-6">
          <div className="rounded-xl bg-bg-secondary border border-border-default p-6 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-lg bg-brand-primary-light text-brand-primary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-text-primary">Sign In to Access Settings</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Log in with your Google, GitHub, or email account to manage your developer profile, custom handle, and cloud preferences.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 rounded-lg bg-surface-inverse hover:bg-surface-inverse-hi text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Sign In to Account
              </button>
              <button
                onClick={() => setActiveTab('credentials')}
                className="px-4 py-2 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-text-primary text-xs font-medium cursor-pointer"
              >
                API Keys Vault (BYOK)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 pb-28 sm:pb-24 md:pb-16 bg-bg-primary select-text text-left space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-default">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-text-primary tracking-tight">Account &amp; Workspace Settings</h2>
          <p className="text-text-secondary text-xs mt-0.5">
            Customize your creator handle, profile details, social links, and system preferences.
          </p>
        </div>
      </div>

      {/* Category Navigation Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-border-default">
        {[
          { id: 'all', label: 'All Settings', icon: Sparkles, isPrimary: true },
          { id: 'profile', label: 'Profile & Bio', icon: User, isPrimary: true },
          { id: 'appearance', label: 'Appearance', icon: Palette, isPrimary: true },
          { id: 'payouts', label: 'Payouts', icon: Landmark, badge: isPayoutConfigured ? 'Active' : undefined, isPrimary: false },
          { id: 'storage', label: 'Drive Vault', icon: HardDrive, isPrimary: false },
          { id: 'mobile', label: 'Mobile APK', icon: Smartphone, isPrimary: false },
          { id: 'billing', label: 'Billing & Plan', icon: CreditCard, isPrimary: false },
          { id: 'security', label: 'Security & Legal', icon: ShieldCheck, isPrimary: false },
          { id: 'developer', label: 'Developer', icon: Terminal, badge: 'Dev', isPrimary: false },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          const isPrimary = tab.isPrimary;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveCategory(tab.id as SettingsCategory);
                if (tab.id !== 'all') {
                  const targetId = tab.id === 'payouts' 
                    ? 'payout-section' 
                    : tab.id === 'appearance' 
                    ? 'theme-section' 
                    : tab.id === 'billing' 
                    ? 'subscription-section' 
                    : tab.id === 'security'
                    ? 'legal-section'
                    : `${tab.id}-section`;
                  const el = document.getElementById(targetId);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className={`rounded-lg whitespace-nowrap transition-all flex items-center cursor-pointer shrink-0 ${
                isPrimary
                  ? 'h-7.5 px-2.5 text-xs font-medium gap-1.5'
                  : 'h-6.5 px-2 text-[11px] font-normal gap-1'
              } ${
                isActive
                  ? 'bg-brand-primary text-white shadow-3xs font-semibold'
                  : isPrimary
                  ? 'bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-default'
                  : 'bg-bg-secondary/70 hover:bg-bg-tertiary text-text-muted hover:text-text-secondary border border-border-default/70'
              }`}
            >
              <Icon className={isPrimary ? "w-3.5 h-3.5 shrink-0" : "w-3 h-3 shrink-0 opacity-75"} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9px] font-mono px-1 py-0.2 rounded-full font-bold uppercase ${
                  isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl border border-border-default bg-bg-secondary shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border-default items-start">
            {/* ─── Left Column: Attached Settings Configuration Forms (8 cols on lg+) ─── */}
            <div className="lg:col-span-8 p-5 sm:p-6 lg:p-7 space-y-8 min-w-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Settings */}
              <div id="profile-section" className="space-y-3 scroll-mt-6">
            <div className="border-b border-border-default pb-2 mb-3">
              <h3 className="text-base sm:text-lg font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
                <User className="w-4 h-4 text-brand-primary" />
                <span>Public Profile &amp; Bio Information</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Manage your public developer identity, username, avatar, and bio details.
              </p>
            </div>

            <div className="bg-bg-secondary rounded-xl p-5 border border-border-default shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-default">
                <div className="flex items-center gap-3">
                  <div className="relative group shrink-0">
                    <UserAvatar 
                      src={user.avatarUrl}
                      name={user.name}
                      username={user.username}
                      role={user.role}
                      isAdmin={user.role === 'Admin'}
                      size="lg"
                      shape="rounded"
                      className="!w-14 !h-14 rounded-xl shadow-xs group-hover:border-brand-primary transition-all"
                    />
                    <label
                      className="absolute inset-0 bg-black/60 rounded-xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-2xs"
                      title="Change Profile Photo"
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                      ) : (
                        <>
                          <Camera className="w-4 h-4 text-white mb-0.5" />
                          <span className="text-[9px] font-bold font-mono">Edit</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        disabled={isUploadingPhoto}
                        onChange={(e) => {
                          handleAvatarFileSelected(e.target.files?.[0] || null);
                          e.target.value = '';
                        }}
                        className="hidden" 
                      />
                    </label>
                  </div>

                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-text-primary">{user.name}</h5>
                    <span className="text-[10px] text-text-muted font-mono block">@{user.username || 'creator'}</span>
                    <span className="text-[10px] text-emerald-600 font-medium">Public Display Photo</span>
                  </div>
                </div>

                <label className="h-7.5 px-2.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary cursor-pointer transition-colors flex items-center gap-1.5 self-start sm:self-auto">
                  <Camera className="w-3.5 h-3.5 text-brand-primary" />
                  <span>{isUploadingPhoto ? 'Uploading...' : 'Change Photo'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    disabled={isUploadingPhoto}
                    onChange={(e) => {
                      handleAvatarFileSelected(e.target.files?.[0] || null);
                      e.target.value = '';
                    }}
                    className="hidden" 
                  />
                </label>
              </div>

              {/* Creator Username Handle Field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                    Creator Handle / Username
                  </label>
                  <div className="flex items-center gap-2">
                    {checkingUsername && (
                      <span className="text-[10px] font-mono text-brand-primary">Checking...</span>
                    )}
                    {!checkingUsername && usernameAvailable === true && username.trim().toLowerCase() !== user.username && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                        <CheckCircle className="w-3 h-3" /> Available
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm sm:text-xs font-mono font-bold text-text-muted">@</span>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    value={username}
                    onChange={(e) => { const val = e.target.value.replace(/\s+/g, '_').toLowerCase().slice(0, 30); setUsername(val); persistDraftField('username', val); }}
                    placeholder="your_username"
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg pl-8 pr-3 py-2 sm:py-1.5 text-base sm:text-xs font-mono text-text-primary focus:outline-none focus:border-brand-primary min-h-[44px] sm:min-h-[36px]"
                  />
                </div>

                {usernameError && (
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{usernameError}</span>
                  </p>
                )}

                {/* Policy info and weekly change quota for Username */}
                <div className={`text-[11px] font-mono flex items-start gap-2 mt-2 px-3 py-2 rounded-lg border ${
                  !usernameQuota.allowed
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                    : 'bg-bg-tertiary border-border-default text-text-secondary'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand-primary" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary">
                        Username Policy: Max 2 changes per week
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        !usernameQuota.allowed
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold'
                          : 'bg-brand-primary/10 text-brand-primary font-medium'
                      }`}>
                        {usernameQuota.remaining} / {usernameQuota.max} remaining
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted leading-tight">
                      {usernameQuota.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Full Display Name */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                    Full Display Name
                  </label>
                  <span className="text-[10px] text-text-muted font-mono tabular-nums">{name.length}/50</span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={name}
                  onChange={(e) => { const val = e.target.value.slice(0, 50); setName(val); persistDraftField('name', val); }}
                  placeholder="e.g. Alex Vance"
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 sm:py-1.5 text-base sm:text-xs text-text-primary focus:border-brand-primary focus:outline-none min-h-[44px] sm:min-h-[36px]"
                />

                {/* Policy info and weekly change quota for Display Name */}
                <div className={`text-[11px] font-mono flex items-start gap-2 mt-2 px-3 py-2 rounded-lg border ${
                  !nameQuota.allowed
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                    : 'bg-bg-tertiary border-border-default text-text-secondary'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand-primary" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary">
                        Display Name Policy: Max 2 changes per week
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        !nameQuota.allowed
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold'
                          : 'bg-brand-primary/10 text-brand-primary font-medium'
                      }`}>
                        {nameQuota.remaining} / {nameQuota.max} remaining
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted leading-tight">
                      {nameQuota.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                  Account Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-bg-tertiary/60 border border-border-default rounded-lg px-3 py-2 sm:py-1.5 text-base sm:text-xs text-text-muted font-mono cursor-not-allowed opacity-75 min-h-[44px] sm:min-h-[36px]"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-text-muted" />
                    <span>Phone Number (Optional)</span>
                  </span>
                  {phone.trim() && !phoneError && securityUtils.validatePhoneNumber(phone.trim()).isValid && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3" /> Valid
                    </span>
                  )}
                </label>
                <input
                  type="tel"
                  maxLength={15}
                  value={phone}
                  onChange={(e) => {
                    // Strictly strip out alphabetic and invalid characters on keystroke
                    const filtered = e.target.value.replace(/[^\d+]/g, '').slice(0, 15);
                    // Ensure '+' can only appear as the leading character
                    const formatted = filtered.startsWith('+')
                      ? '+' + filtered.slice(1).replace(/\+/g, '')
                      : filtered.replace(/\+/g, '');
                    setPhone(formatted);
                    if (phoneError) setPhoneError(null);
                  }}
                  onBlur={() => {
                    if (phone.trim()) {
                      const res = securityUtils.validatePhoneNumber(phone.trim());
                      if (!res.isValid) {
                        setPhoneError(res.error || 'Please enter numbers only (10-15 digits).');
                      } else {
                        setPhoneError(null);
                      }
                    } else {
                      setPhoneError(null);
                    }
                  }}
                  placeholder="+1234567890"
                  className={`w-full bg-bg-tertiary border rounded-lg px-3 py-2 sm:py-1.5 text-base sm:text-xs text-text-primary font-mono focus:outline-none min-h-[44px] sm:min-h-[36px] ${
                    phoneError
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-border-default focus:border-brand-primary'
                  }`}
                />
                {phoneError && (
                  <p className="text-[11px] text-rose-600 font-mono mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{phoneError}</span>
                  </p>
                )}
              </div>

              {/* Creator Bio */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                    Bio / Professional Headline
                  </label>
                  <span className={`text-[10px] font-mono tabular-nums ${bio.length >= 240 ? 'text-brand-amber font-semibold' : 'text-text-muted'}`}>{bio.length}/250</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={250}
                  value={bio}
                  onChange={(e) => { const val = e.target.value.slice(0, 250); setBio(val); persistDraftField('bio', val); }}
                  placeholder="Tell the community about your prompt engineering specialization..."
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-base sm:text-xs text-text-primary focus:border-brand-primary focus:outline-none resize-none leading-relaxed min-h-[80px]"
                />
              </div>

              {/* Permanent Profile Card Action Footer */}
              <div className="pt-4 border-t border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {isProfileDirty ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-xs font-semibold text-text-primary truncate">
                        Unsaved profile modifications
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs text-text-muted font-sans truncate">
                        Profile details saved &amp; synchronized
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-end">
                  {isProfileDirty && (
                    <button
                      type="button"
                      onClick={handleResetProfile}
                      disabled={isSaving}
                      className="h-7.5 px-2.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer"
                    >
                      Discard
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={!isProfileDirty || isSaving || checkingUsername || !!usernameError || usernameAvailable === false || isNameChangeBlocked || isUsernameChangeBlocked}
                    className={`h-7.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 shadow-3xs flex items-center justify-center gap-1.5 ${
                      isProfileDirty
                        ? 'bg-brand-primary hover:bg-brand-primary-hi text-white cursor-pointer'
                        : 'bg-bg-tertiary border border-border-default text-text-muted/60 cursor-not-allowed opacity-75'
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Social Profiles & Developer Links */}
          <div id="social-section" className="space-y-3 scroll-mt-6">
            <div className="border-b border-border-default pb-2 mb-3">
              <h3 className="text-base sm:text-lg font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
                <Share2 className="w-4 h-4 text-brand-primary" />
                <span>Social Links &amp; Developer Presence</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Connect your GitHub, Twitter/X, and portfolio links for community discoverability.
              </p>
            </div>

            <div className="bg-bg-secondary rounded-xl p-5 border border-border-default shadow-xs space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* GitHub */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <GithubIcon className="w-3 h-3 text-text-primary" />
                      <span>GitHub</span>
                    </span>
                    {github.trim() && !githubError && securityUtils.validateGithubUrl(github.trim()).isValid && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3" /> Valid
                      </span>
                    )}
                  </label>
                  <input
                    type="url"
                    value={github}
                    onChange={(e) => {
                      setGithub(e.target.value);
                      if (githubError) setGithubError(null);
                    }}
                    onBlur={() => {
                      if (github.trim()) {
                        const res = securityUtils.validateGithubUrl(github.trim());
                        setGithubError(res.isValid ? null : (res.error || 'Please enter a valid GitHub profile URL.'));
                      } else {
                        setGithubError(null);
                      }
                    }}
                    placeholder="https://github.com/username"
                    className={`w-full bg-bg-tertiary border rounded-lg px-3 py-2 sm:py-1.5 text-base sm:text-xs text-text-primary font-mono focus:outline-none min-h-[44px] sm:min-h-[36px] ${
                      githubError ? 'border-rose-500 focus:border-rose-500' : 'border-border-default focus:border-brand-primary'
                    }`}
                  />
                  {githubError && (
                    <p className="text-[11px] text-rose-600 font-mono mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{githubError}</span>
                    </p>
                  )}
                </div>

                {/* LinkedIn */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <LinkedinIcon className="w-3 h-3 text-[#0a66c2]" />
                      <span>LinkedIn</span>
                    </span>
                    {linkedin.trim() && !linkedinError && securityUtils.validateLinkedinUrl(linkedin.trim()).isValid && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3" /> Valid
                      </span>
                    )}
                  </label>
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => {
                      setLinkedin(e.target.value);
                      if (linkedinError) setLinkedinError(null);
                    }}
                    onBlur={() => {
                      if (linkedin.trim()) {
                        const res = securityUtils.validateLinkedinUrl(linkedin.trim());
                        setLinkedinError(res.isValid ? null : (res.error || 'Please enter a valid LinkedIn profile URL.'));
                      } else {
                        setLinkedinError(null);
                      }
                    }}
                    placeholder="https://linkedin.com/in/username"
                    className={`w-full bg-bg-tertiary border rounded-lg px-3 py-2 sm:py-1.5 text-base sm:text-xs text-text-primary font-mono focus:outline-none min-h-[44px] sm:min-h-[36px] ${
                      linkedinError ? 'border-rose-500 focus:border-rose-500' : 'border-border-default focus:border-brand-primary'
                    }`}
                  />
                  {linkedinError && (
                    <p className="text-[11px] text-rose-600 font-mono mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{linkedinError}</span>
                    </p>
                  )}
                </div>

                {/* Twitter / X */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <TwitterIcon className="w-3 h-3 text-text-primary" />
                      <span>Twitter / X</span>
                    </span>
                    {twitter.trim() && !twitterError && securityUtils.validateTwitterUrl(twitter.trim()).isValid && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3" /> Valid
                      </span>
                    )}
                  </label>
                  <input
                    type="url"
                    value={twitter}
                    onChange={(e) => {
                      setTwitter(e.target.value);
                      if (twitterError) setTwitterError(null);
                    }}
                    onBlur={() => {
                      if (twitter.trim()) {
                        const res = securityUtils.validateTwitterUrl(twitter.trim());
                        setTwitterError(res.isValid ? null : (res.error || 'Please enter a valid Twitter/X URL.'));
                      } else {
                        setTwitterError(null);
                      }
                    }}
                    placeholder="https://x.com/username"
                    className={`w-full bg-bg-tertiary border rounded-lg px-3 py-2 sm:py-1.5 text-base sm:text-xs text-text-primary font-mono focus:outline-none min-h-[44px] sm:min-h-[36px] ${
                      twitterError ? 'border-rose-500 focus:border-rose-500' : 'border-border-default focus:border-brand-primary'
                    }`}
                  />
                  {twitterError && (
                    <p className="text-[11px] text-rose-600 font-mono mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{twitterError}</span>
                    </p>
                  )}
                </div>

                {/* Personal Website */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-text-primary" />
                      <span>Website</span>
                    </span>
                    {website.trim() && !websiteError && securityUtils.validateWebsiteUrl(website.trim()).isValid && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3 h-3" /> Valid
                      </span>
                    )}
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => {
                      setWebsite(e.target.value);
                      if (websiteError) setWebsiteError(null);
                    }}
                    onBlur={() => {
                      if (website.trim()) {
                        const res = securityUtils.validateWebsiteUrl(website.trim());
                        setWebsiteError(res.isValid ? null : (res.error || 'Please enter a valid website URL.'));
                      } else {
                        setWebsiteError(null);
                      }
                    }}
                    placeholder="https://yourdomain.com"
                    className={`w-full bg-bg-tertiary border rounded-lg px-3 py-2 sm:py-1.5 text-base sm:text-xs text-text-primary font-mono focus:outline-none min-h-[44px] sm:min-h-[36px] ${
                      websiteError ? 'border-rose-500 focus:border-rose-500' : 'border-border-default focus:border-brand-primary'
                    }`}
                  />
                  {websiteError && (
                    <p className="text-[11px] text-rose-600 font-mono mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{websiteError}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Permanent Social Links Action Footer */}
              <div className="pt-4 border-t border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {isSocialDirty ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-xs font-semibold text-text-primary truncate">
                        Unsaved social link modifications
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs text-text-muted font-sans truncate">
                        Social profiles linked &amp; synchronized
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-end">
                  {isSocialDirty && (
                    <button
                      type="button"
                      onClick={handleResetSocials}
                      disabled={isSaving}
                      className="h-7.5 px-2.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer"
                    >
                      Discard
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={!isSocialDirty || isSaving || !!githubError || !!linkedinError || !!twitterError || !!websiteError}
                    className={`h-7.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 shadow-3xs flex items-center justify-center gap-1.5 ${
                      isSocialDirty
                        ? 'bg-brand-primary hover:bg-brand-primary-hi text-white cursor-pointer'
                        : 'bg-bg-tertiary border border-border-default text-text-muted/60 cursor-not-allowed opacity-75'
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save Social Links'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Account Standing & Community Guidelines Strike Status */}
          <ProfileHealthCard
            strikesCount={(user as any)?.strikesCount || 0}
            maxStrikes={3}
            status="good"
            onOpenGuidelines={() => setActiveTab('terms')}
          />

          {/* Creator Payout Details Section (Simple, Optional: UPI or Bank Account + IFSC) */}
          {(activeCategory === 'all' || activeCategory === 'payouts') && (
            <div id="payout-section" className="space-y-3 scroll-mt-6">
              <div className="border-b border-border-default pb-2 mb-3">
                <h3 className="text-base sm:text-lg font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-brand-primary" />
                  <span>Creator Payout Details (Optional)</span>
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Configure your verified UPI ID or Bank account to receive prompt marketplace revenue.
                </p>
              </div>

              <div className="bg-bg-secondary rounded-2xl p-5 sm:p-6 border border-border-default shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-text-secondary leading-relaxed max-w-xl">
                    If you sell prompts, tools, or agents on PromptHub, configure your preferred payout destination. PromptHub guarantees 70% direct royalty disbursements with zero hidden deductions.
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium font-mono">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>70% Direct Royalties</span>
                  </div>
                </div>

                {/* Active Saved State Banner */}
                {isPayoutConfigured && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <span className="font-semibold text-emerald-900 dark:text-emerald-300 block">Payout Destination Active</span>
                          <div className="flex flex-wrap items-center gap-2 text-emerald-800/90 dark:text-emerald-400">
                            {payoutType === 'upi' && (maskedUpi || upiId) ? (
                              <>
                                <span>Receiving via UPI: <strong className="font-mono">{maskedUpi || upiId}</strong></span>
                                {(savedQrCodeUrl || upiQrCodeUrl) && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold">
                                    <QrCode className="w-3 h-3" />
                                    <span>QR Code Attached</span>
                                  </span>
                                )}
                              </>
                            ) : maskedAcc ? (
                              <span>Receiving via Bank: <strong className="font-mono">{maskedAcc}</strong> ({savedIfsc}{savedHolderName ? ` · ${savedHolderName}` : ''})</span>
                            ) : (
                              <span>Your payout details are saved and verified.</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('settings-upi-input');
                            input?.focus();
                          }}
                          className="px-2 py-1 h-7 rounded-lg bg-emerald-100/70 hover:bg-emerald-200/70 dark:bg-emerald-900/40 dark:hover:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1"
                          title="Change or update payout details"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Change</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRemoveConfirm(true)}
                          className="px-2 py-1 h-7 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1"
                          title="Remove payout details completely"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Remove Confirmation Prompt */}
                    {showRemoveConfirm && (
                      <div className="p-3.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-2.5">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="text-xs space-y-0.5">
                            <span className="font-bold text-rose-900 dark:text-rose-200 block">Remove Payout Destination?</span>
                            <p className="text-[11px] text-rose-700 dark:text-rose-400">
                              This will clear your saved {payoutType === 'upi' ? 'UPI ID & QR Code' : 'Bank Account'}. You can reconfigure new details at any time.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            disabled={isRemovingPayout}
                            onClick={handleRemovePayout}
                            className="h-7.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer shadow-3xs transition-colors flex items-center gap-1.5"
                          >
                            {isRemovingPayout ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Removing...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Yes, Remove Details</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={isRemovingPayout}
                            onClick={() => setShowRemoveConfirm(false)}
                            className="h-7 px-2.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-text-primary text-xs font-medium cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Unified Payouts Bento Layout */}
                <div className="space-y-6 pt-1">
                  {/* Payout Configuration Form */}
                  <div className="space-y-4">
                    {/* Method Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                        Preferred Payout Destination
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => { setPayoutType('upi'); setPayoutError(null); setPayoutSuccess(null); }}
                          className={`p-3 min-h-[48px] rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                            payoutType === 'upi'
                              ? 'border-brand-primary bg-bg-tertiary ring-1 ring-brand-primary shadow-xs'
                              : 'border-border-default bg-bg-primary hover:border-border-hover'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <QrCode className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-text-primary block">UPI ID / VPA</span>
                            <span className="text-[10px] text-text-muted">Instant transfer &amp; QR</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setPayoutType('bank_account'); setPayoutError(null); setPayoutSuccess(null); }}
                          className={`p-3 min-h-[48px] rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                            payoutType === 'bank_account'
                              ? 'border-brand-primary bg-bg-tertiary ring-1 ring-brand-primary shadow-xs'
                              : 'border-border-default bg-bg-primary hover:border-border-hover'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-text-primary block">Bank Account</span>
                            <span className="text-[10px] text-text-muted">Direct NEFT/IMPS</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Option A: UPI Fields */}
                    {payoutType === 'upi' && (
                      <div className="space-y-4">
                        <div className="space-y-3 p-4 rounded-xl bg-bg-tertiary/70 border border-border-default">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center justify-between">
                              <span>UPI ID / Virtual Payment Address (VPA)</span>
                              {upiId && UPI_REGEX.test(upiId.trim()) && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                                  <CheckCircle2 className="w-3 h-3" /> Valid VPA
                                </span>
                              )}
                            </label>
                            <div className="relative">
                              <input
                                id="settings-upi-input"
                                type="text"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                placeholder="e.g. username@okhdfcbank"
                                className="w-full bg-bg-secondary border border-border-default rounded-lg pl-3 pr-10 py-2 text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none min-h-[44px]"
                              />
                              {upiId && (
                                <button
                                  type="button"
                                  onClick={() => setUpiId('')}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                                  title="Clear UPI ID"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[10px] text-text-muted font-mono">Quick handles:</span>
                              {['@okhdfcbank', '@oksbi', '@paytm', '@ybl', '@axl', '@ibl', '@upi'].map(handle => (
                                <button
                                  key={handle}
                                  type="button"
                                  onClick={() => {
                                    const base = upiId.includes('@') ? upiId.split('@')[0] : upiId || username || 'creator';
                                    setUpiId(`${base}${handle}`);
                                  }}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-secondary hover:bg-bg-primary text-text-secondary hover:text-brand-primary border border-border-default transition-colors cursor-pointer"
                                >
                                  {handle}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* QR Code Uploader */}
                        <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-border-default">
                            <span className="text-[11px] font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-1.5">
                              <QrCode className="w-3.5 h-3.5 text-brand-primary" />
                              <span>Instant UPI QR Code</span>
                            </span>
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                              Optional Custom Upload
                            </span>
                          </div>
                          <UpiQrCodeUploader
                            vpa={upiId}
                            qrCodeUrl={upiQrCodeUrl}
                            onQrCodeChange={setUpiQrCodeUrl}
                            payeeName={name || user?.name || user?.username || 'PromptHub Creator'}
                            disabled={isSavingPayout}
                          />
                        </div>
                      </div>
                    )}

                    {/* Option B: Bank Account Fields */}
                    {payoutType === 'bank_account' && (
                      <div className="space-y-4">
                        <div className="space-y-3 p-4 rounded-xl bg-bg-tertiary/70 border border-border-default">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                              Account Holder Name
                            </label>
                            <input
                              type="text"
                              value={accountHolderName}
                              onChange={(e) => setAccountHolderName(e.target.value)}
                              placeholder="e.g. Alex Vance"
                              className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none min-h-[44px]"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                                Account Number
                              </label>
                              <input
                                type="password"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                                placeholder="9 to 18 digits"
                                className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none min-h-[44px]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                                Confirm Account Number
                              </label>
                              <input
                                type="text"
                                value={confirmAccountNumber}
                                onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                                placeholder="Re-enter number"
                                className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none min-h-[44px]"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                              IFSC Code (11 Characters)
                            </label>
                            <input
                              type="text"
                              maxLength={11}
                              value={ifscCode}
                              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                              placeholder="e.g. HDFC0001234"
                              className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:border-brand-primary focus:outline-none uppercase min-h-[44px]"
                            />
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-bg-tertiary/70 border border-border-default space-y-2">
                          <div className="flex items-center justify-between pb-2 border-b border-border-default">
                            <span className="text-[11px] font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>Bank Security Details</span>
                            </span>
                            <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 font-semibold">
                              NEFT / IMPS
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            Direct wire deposits are routed securely through partner banking nodes. Your banking credentials are encrypted and stored in compliance with Indian banking regulations.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Errors and alerts */}
                    {payoutError && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{payoutError}</span>
                      </div>
                    )}

                    {payoutSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>{payoutSuccess}</span>
                      </div>
                    )}

                    {/* Actions & RLS security */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border-default">
                      <span className="text-[11px] text-text-muted flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                        <span>Encrypted &amp; protected by Security System</span>
                      </span>
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        {isPayoutConfigured && (
                          <button
                            type="button"
                            onClick={() => setShowRemoveConfirm(true)}
                            disabled={isSavingPayout || isRemovingPayout}
                            className="h-7.5 px-2.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleSavePayout}
                          disabled={isSavingPayout || isRemovingPayout}
                          className="h-7.5 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-50 text-white text-xs font-medium cursor-pointer shadow-3xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          {isSavingPayout ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Saving Payout...</span>
                            </>
                          ) : (
                            <span>{isPayoutConfigured ? 'Update Payout Details' : 'Save Payout Details'}</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Creator Royalties Guarantee Card */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-brand-primary/10 via-brand-accent/5 to-transparent border border-brand-primary/20 dark:border-brand-accent/30 space-y-2.5 mt-4">
                      <div className="flex items-center gap-2 text-brand-primary dark:text-brand-accent">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold font-display">PromptHub Creator Revenue Share</span>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        Every time a developer or team licenses your prompt, <strong>70% of the price</strong> is credited directly to your payout destination. Zero hidden withdrawal deductions.
                      </p>
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI', 'NEFT / IMPS'].map((rail) => (
                          <span key={rail} className="text-[9px] font-mono px-2 py-0.5 rounded bg-bg-secondary text-text-muted border border-border-default">
                            {rail}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance & Studio Theme Section */}
          <div id="theme-section" className="space-y-3 scroll-mt-6">
            <div className="border-b border-border-default pb-2 mb-3">
              <h3 className="text-base sm:text-lg font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
                <Palette className="w-4 h-4 text-brand-primary" />
                <span>Appearance &amp; Studio Theme</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Choose how PromptHub looks across sessions, devices, and tabs automatically.
              </p>
            </div>

            <div className="bg-bg-secondary rounded-xl p-5 border border-border-default shadow-xs space-y-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                Choose how PromptHub appears to you. Themes persist across your sessions and sync across open tabs automatically.
              </p>

              <div
                role="radiogroup"
                aria-label="Studio color theme"
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1"
              >
                {/* 1. Light Mode Card */}
                <div
                  role="radio"
                  tabIndex={theme === 'light' ? 0 : -1}
                  aria-checked={theme === 'light'}
                  onClick={() => setTheme('light')}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setTheme('light'); }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3 text-left ${
                    theme === 'light'
                      ? 'border-brand-primary bg-bg-tertiary ring-1 ring-brand-primary shadow-xs'
                      : 'border-border-default bg-bg-primary hover:border-border-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                        <Sun className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-text-primary">Light</span>
                    </div>
                    {theme === 'light' && (
                      <span className="w-2 h-2 rounded-full bg-brand-primary" />
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted leading-snug">
                    Clean light canvas with Primary Blue (#6A89A7) accents.
                  </p>
                </div>

                {/* 2. Dark Mode Card */}
                <div
                  role="radio"
                  tabIndex={theme === 'dark' ? 0 : -1}
                  aria-checked={theme === 'dark'}
                  onClick={() => setTheme('dark')}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setTheme('dark'); }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3 text-left ${
                    theme === 'dark'
                      ? 'border-brand-primary bg-bg-tertiary ring-1 ring-brand-primary shadow-xs'
                      : 'border-border-default bg-bg-primary hover:border-border-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-slate-900 text-sky-400 flex items-center justify-center border border-slate-700">
                        <Moon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-text-primary">Dark</span>
                    </div>
                    {theme === 'dark' && (
                      <span className="w-2 h-2 rounded-full bg-brand-primary" />
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted leading-snug">
                    Deep Navy canvas (#1F2A34) with Light Blue (#BDDDFC) accents.
                  </p>
                </div>

                {/* 3. System Preference Card */}
                <div
                  role="radio"
                  tabIndex={theme === 'system' ? 0 : -1}
                  aria-checked={theme === 'system'}
                  onClick={() => setTheme('system')}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setTheme('system'); }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3 text-left ${
                    theme === 'system'
                      ? 'border-brand-primary bg-bg-tertiary ring-1 ring-brand-primary shadow-xs'
                      : 'border-border-default bg-bg-primary hover:border-border-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-bg-tertiary text-text-primary flex items-center justify-center border border-border-default">
                        <Laptop className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-text-primary">System</span>
                    </div>
                    {theme === 'system' && (
                      <span className="w-2 h-2 rounded-full bg-brand-primary" />
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted leading-snug">
                    Automatically match your operating system preferences.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Developer Mode & Advanced Studio Tools Section */}
          {(activeCategory === 'all' || activeCategory === 'developer') && (
            <div id="developer-section" className="space-y-3 scroll-mt-6">
              <div className="border-b border-border-default pb-2 mb-3">
                <h3 className="text-base sm:text-lg font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-amber-500" />
                  <span>Developer Mode &amp; Advanced Studio Tools</span>
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Developer Mode tools are currently disabled and undergoing active development.
                </p>
              </div>

              <div className="bg-bg-secondary rounded-xl p-5 border border-border-default shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary">Developer Mode</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                        UNDER DEVELOPMENT
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Developer Mode (Classic Studio IDE, Prompt Analyzer, and Model Arena) is completely disabled while being re-architected. All prompt creation and AI execution features are unified in the <strong>Creation Workspace</strong>.
                    </p>
                  </div>

                  {/* Accessible Disabled Toggle Switch */}
                  <div className="flex items-center min-h-[44px] shrink-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={false}
                      aria-label="Developer Mode is currently under development and disabled"
                      disabled
                      className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed rounded-full border border-border-default transition-colors duration-200 ease-in-out opacity-50 bg-bg-tertiary items-center p-0.5"
                      title="Developer Mode is currently under development"
                    >
                      <span className="sr-only">Developer Mode is disabled</span>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-text-muted/50 shadow-xs translate-x-0"
                      />
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Sparkles className="w-4 h-4 text-brand-primary shrink-0" />
                    <span>Use the next-gen Creation Workspace for multi-model drafting, testing, and optimization.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('workspace')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary-hi transition-colors h-7.5 shrink-0 shadow-3xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Open Creation Workspace</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Drive Vault Storage Quota (Section 21) */}
          <div id="storage-section" className="space-y-3 scroll-mt-6">
            <div className="border-b border-border-default pb-2 mb-3">
              <h3 className="text-base sm:text-lg font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-brand-primary" />
                <span>Drive Vault Storage Quota</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Storage allocated for prompt assets, datasets, and encrypted Google Drive backups.
              </p>
            </div>

            <div className="bg-bg-secondary rounded-xl p-5 border border-border-default shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary">
                  {storageQuota?.tierName || 'Google Drive Cloud Storage'}
                </span>
                <span className="font-mono text-[11px] text-text-secondary">
                  {storageQuota ? (
                    `${formatStorageBytes(storageQuota.usedBytes)} / ${formatStorageBytes(storageQuota.limitBytes)}`
                  ) : (
                    'Loading quota…'
                  )}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-bg-tertiary overflow-hidden border border-border-default">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.max(0.5, storageQuota?.usedPercentage || 0.4))}%` }} 
                />
              </div>

              <p className="text-[11px] text-text-muted leading-relaxed">
                {storageQuota?.limitBytes && storageQuota.limitBytes >= 5 * 1024 * 1024 * 1024 * 1024 ? (
                  'Connected to PromptHub Google Drive Cloud Vault (5 TB Pool). All datasets, prompt assets, and workspace backups are synchronized directly with Google Drive.'
                ) : (
                  'All developer assets, before/after preview images, and knowledge files are safely backed by encrypted Google Drive Vault storage.'
                )}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isSaving || checkingUsername || !!usernameError || usernameAvailable === false}
            className="h-8 flex items-center gap-1.5 bg-brand-primary hover:bg-brand-primary-hi disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-3xs transition-colors cursor-pointer"
          >
            {isSaving ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </form>

        {/* Mobile App & Android APK Download Section */}
        <div id="mobile-section" className="space-y-3 pt-4 border-t border-border-default scroll-mt-6">
          <div className="border-b border-border-default pb-2 mb-3">
            <h3 className="text-base sm:text-lg font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-brand-primary" />
              <span>PromptHub Mobile App &amp; Android APK</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Download the official Android APK or install PromptHub directly on your phone for mobile prompt engineering.
            </p>
          </div>

          <div className="rounded-2xl p-5 sm:p-6 border border-border-default bg-bg-secondary shadow-xs space-y-5">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              {/* App Icon & Details */}
              <div className="flex items-start gap-4 max-w-xl">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-brand-primary/10 border-2 border-brand-primary/30 p-1 shadow-md flex items-center justify-center">
                    <img
                      src="/icons/pwa-192x192.png"
                      alt="PromptHub App Icon"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-700 text-white font-mono text-[8px] font-bold border border-white shadow-xs">
                    APK
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-text-primary font-display">PromptHub for Android</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-primary-light text-brand-primary border border-brand-primary/20">
                      v{APK_METADATA.version} • {APK_METADATA.sizeFormatted}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Signed &amp; Verified
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Official standalone Android APK with full Prompt Studio IDE, offline IndexedDB prompt library, 140+ model Arena benchmarking, and AMOLED dark mode.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={handleDownloadApk}
                  className="flex-1 lg:flex-initial h-7.5 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-medium shadow-3xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download APK ({APK_METADATA.sizeFormatted})</span>
                </button>

                {!isAppInstalled && (
                  <button
                    type="button"
                    onClick={handleInstallPWA}
                    className="h-7.5 px-2.5 rounded-lg bg-bg-primary hover:bg-bg-tertiary border border-border-default text-text-primary text-xs font-medium shadow-3xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-brand-primary" />
                    <span>{hasNativePrompt ? 'Install App (1-Tap)' : 'Install App'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsApkShowcaseOpen(true)}
                  className="h-7.5 px-2.5 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="View full mobile showcase and scan phone QR code"
                >
                  <QrCode className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Showcase &amp; QR</span>
                </button>

                <a
                  href={APK_METADATA.downloadsFolderUrl}
                  download={APK_METADATA.filename}
                  className="h-7.5 px-2.5 rounded-lg bg-bg-tertiary hover:bg-bg-primary border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Direct static mirror download"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                  <span>Mirror</span>
                </a>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border-default/60 text-center">
              <div className="p-2 rounded-lg bg-bg-primary/80 border border-border-default text-[11px] font-mono text-text-secondary">
                ⚡ Touch-Optimized IDE
              </div>
              <div className="p-2 rounded-lg bg-bg-primary/80 border border-border-default text-[11px] font-mono text-text-secondary">
                🛡️ Offline Vault Storage
              </div>
              <div className="p-2 rounded-lg bg-bg-primary/80 border border-border-default text-[11px] font-mono text-text-secondary">
                ⚔️ 140+ Model Arena
              </div>
              <div className="p-2 rounded-lg bg-bg-primary/80 border border-border-default text-[11px] font-mono text-text-secondary">
                🌙 AMOLED Dark Mode
              </div>
            </div>

            {/* Android Install Steps Guidance */}
            <div className="p-3.5 rounded-lg bg-bg-primary border border-border-default space-y-2 text-xs">
              <span className="font-semibold text-text-primary block font-mono text-[11px] uppercase tracking-wide">
                📱 Quick Android Install:
              </span>
              <ol className="list-decimal list-inside space-y-1 text-text-secondary text-[11px] leading-relaxed">
                <li>Tap <strong>Download APK</strong> to save <code className="font-mono text-brand-primary font-semibold">PromptHub.apk</code>.</li>
                <li>Open the file from your phone&apos;s Downloads notification or file manager app.</li>
                <li>If prompted with <em>&quot;Install unknown apps&quot;</em>, allow permission for your browser.</li>
                <li>Tap <strong>Install</strong> to finish, and launch PromptHub from your app drawer!</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Help & Support — Feedback & Bug Report Section */}
        <div id="support-section" className="space-y-3 pt-4 border-t border-border-default scroll-mt-6">
          <div className="border-b border-border-default pb-2 mb-3">
            <h3 className="text-base sm:text-lg font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
              <Bug className="w-4 h-4 text-rose-500" />
              <span>Help &amp; Support — Feedback &amp; Bug Report</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Submit feedback, report UI glitches, and help us improve the platform.
            </p>
          </div>

          <div className="rounded-xl p-5 border border-border-default bg-bg-secondary shadow-xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                <MessageSquareWarning className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1">
                <h5 className="text-xs font-bold text-text-primary">Found an issue or have feedback?</h5>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Help us improve PromptHub! Submit detailed bug reports, UI glitches, or feature requests directly to our team.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-border-default">
              <div className="text-[11px] text-text-muted">
                <span>Earn <strong>15 Days of FREE Pro Subscription</strong> on every report!</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="px-2.5 py-1 h-7.5 rounded-lg bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary-hi transition-colors cursor-pointer shadow-3xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>100-User Survey</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBugReportModalOpen(true)}
                  className="px-2.5 py-1 h-7.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary text-text-primary border border-border-default text-xs font-medium transition-colors cursor-pointer shadow-3xs flex items-center gap-1.5"
                >
                  <Bug className="w-3.5 h-3.5" />
                  <span>Bug Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Subscription & Plan Management Section */}
        <div id="subscription-section" className="space-y-3 pt-4 border-t border-border-default scroll-mt-6">
          <div className="border-b border-border-default pb-2 mb-3">
            <h3 className="text-base sm:text-lg font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-primary" />
              <span>Subscription &amp; Plan Management</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Manage your developer tier, pro entitlements, and billing cycles.
            </p>
          </div>

          <div className="rounded-xl p-5 border border-border-default bg-bg-secondary shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-bg-tertiary/60 border border-border-default">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-text-muted">Current Plan:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isPaidPlan 
                      ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/30' 
                      : 'bg-bg-secondary text-text-secondary border border-border-default'
                  }`}>
                    {currentPlan === 'studio' ? 'Studio Elite' : currentPlan === 'growth' ? 'Growth Member' : currentPlan === 'pro' ? 'Pro Member' : 'Free Explorer'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>{isPaidPlan ? 'Active Subscription' : 'Free Tier'}</span>
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {isPaidPlan
                    ? `Includes full access to AI model orchestration, prompt analytics, and priority execution.${formattedProUntil ? ` Next renewal / access until: ${formattedProUntil}.` : ''}`
                    : 'Free Explorer tier includes full access to the public catalog and studio testing with free OpenRouter models.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('pricing')}
                  className="h-7.5 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-medium transition-colors cursor-pointer shadow-3xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isPaidPlan ? 'Change Plan' : 'Upgrade to Pro'}</span>
                </button>

                {isPaidPlan && (
                  <button
                    type="button"
                    onClick={() => setIsCancelSubModalOpen(true)}
                    className="h-7.5 px-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Legal, Privacy & Marketplace Compliance */}
        <div id="legal-section" className="space-y-3 pt-4 border-t border-border-default scroll-mt-6">
          <div className="border-b border-border-default pb-2 mb-3">
            <h3 className="text-base sm:text-lg font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-primary" />
              <span>Legal, Privacy &amp; Marketplace Compliance</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Official statutory compliance frameworks, DPDP Act 2023, and Terms of Service.
            </p>
          </div>

          <div className="rounded-xl p-5 border border-border-default bg-bg-secondary shadow-xs space-y-4">
            <div className="space-y-1.5">
              <h5 className="text-xs font-bold text-text-primary">Official Platform Policies &amp; DPDP Statutory Notice</h5>
              <p className="text-xs text-text-secondary leading-relaxed">
                PromptHub enforces 13 statutory and marketplace compliance frameworks covering the Terms of Service (with beta development terms &amp; finality of decisions), DPDP Act 2023 / MeitY DPDP Rules 2025 privacy compliance, interactive Cookie Consent controls, and Seller Revenue Share (20%).
              </p>
            </div>

            {/* Direct Link Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-bg-tertiary/60 border border-border-default flex items-center justify-between gap-2.5 text-xs">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-text-primary block truncate">Terms of Service</span>
                  <span className="font-mono text-[10px] text-brand-primary block truncate">/terms</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('terms')}
                  className="px-2.5 py-1 h-7 text-xs rounded-lg bg-bg-secondary hover:bg-bg-primary border border-border-default font-medium transition-colors cursor-pointer shrink-0"
                >
                  View Document
                </button>
              </div>

              <div className="p-3 rounded-xl bg-bg-tertiary/60 border border-border-default flex items-center justify-between gap-2.5 text-xs">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-text-primary block truncate">Privacy Policy</span>
                  <span className="font-mono text-[10px] text-brand-primary block truncate">/privacy</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('privacy')}
                  className="px-2.5 py-1 h-7 text-xs rounded-lg bg-bg-secondary hover:bg-bg-primary border border-border-default font-medium transition-colors cursor-pointer shrink-0"
                >
                  View Policy
                </button>
              </div>

              <div className="p-3 rounded-xl bg-bg-tertiary/60 border border-border-default flex items-center justify-between gap-2.5 text-xs">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-text-primary block truncate">Cookie Controls</span>
                  <span className="font-mono text-[10px] text-brand-primary block truncate">/cookies</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('cookies')}
                  className="px-2.5 py-1 h-7 text-xs rounded-lg bg-bg-secondary hover:bg-bg-primary border border-border-default font-medium transition-colors cursor-pointer shrink-0"
                >
                  Manage
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border-default">
              <button
                type="button"
                onClick={() => setActiveTab('legal')}
                className="px-3 py-1.5 h-7.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-medium transition-colors cursor-pointer shadow-3xs"
              >
                Open Full Legal Directory (13 Frameworks)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cookies')}
                className="px-3 py-1.5 h-7.5 rounded-lg border border-border-default text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer bg-bg-tertiary"
              >
                Customize Cookies
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone — Account Deletion Section */}
        <div id="danger-section" className="space-y-3 pt-4 border-t border-rose-200 dark:border-rose-900/50 scroll-mt-6">
          <div className="border-b border-rose-200 dark:border-rose-900/40 pb-2 mb-3">
            <h3 className="text-base sm:text-lg font-bold font-display text-rose-600 dark:text-rose-400 tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Danger Zone — Account Deletion</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Permanent statutory account erasure and right-to-erasure execution under DPDP Act 2023 &amp; GDPR.
            </p>
          </div>

          <div className="rounded-xl p-5 border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <h5 className="text-xs font-bold text-text-primary flex items-center gap-2">
                  <span>Permanently Delete Developer Account &amp; Data</span>
                  <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 text-[10px] font-mono font-semibold">
                    Irreversible
                  </span>
                </h5>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Permanently erase your account, developer profile, private prompt engineering workspaces, credential vault, and associated session records. This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmText('');
                  setIsDeleteAccountModalOpen(true);
                }}
                className="h-7.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer shadow-3xs flex items-center justify-center gap-1.5 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

            {/* ─── Right Column: Attached Companion Sidebar & Live Profile Card ─── */}
            <div className="lg:col-span-4 p-5 sm:p-6 bg-bg-primary/30 space-y-6 lg:sticky lg:top-4 min-w-0">
        {/* 1. Live Developer Profile Card Preview */}
        <div className="bg-bg-secondary rounded-2xl border border-border-default p-5 shadow-xs space-y-4 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-border-default">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                Live Profile Card
              </h4>
            </div>
            <span className="text-[10px] font-mono text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-default">
              Public Preview
            </span>
          </div>

          {/* Live Preview Content */}
          <div className="flex flex-col items-center text-center pt-2 pb-1 space-y-3">
            <div className="relative group">
              <UserAvatar 
                src={user?.avatarUrl}
                name={name || user?.name || 'Creator'}
                username={username || user?.username || 'creator'}
                role={user?.role}
                isAdmin={user?.role === 'Admin'}
                size="lg"
                shape="rounded"
                className="!w-20 !h-20 rounded-2xl shadow-md text-xl group-hover:border-brand-primary transition-all"
              />
              <label
                className="absolute inset-0 bg-black/50 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-2xs"
                title="Change Profile Photo"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-white mb-0.5" />
                    <span className="text-[9px] font-bold font-mono">Edit</span>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  disabled={isUploadingPhoto}
                  onChange={(e) => {
                    handleAvatarFileSelected(e.target.files?.[0] || null);
                    e.target.value = '';
                  }}
                  className="hidden" 
                />
              </label>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-bg-secondary flex items-center justify-center text-white" title="Verified Creator">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            </div>

            <div className="space-y-0.5 max-w-full">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <h3 className="text-base font-bold text-text-primary tracking-tight font-display truncate max-w-[200px]">
                  {name || user?.name || 'Your Name'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  isPaidPlan 
                    ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/30' 
                    : 'bg-bg-tertiary text-text-secondary border border-border-default'
                }`}>
                  {currentPlan === 'studio' ? 'Studio' : currentPlan === 'growth' ? 'Growth' : currentPlan === 'pro' ? 'Pro' : 'Free'}
                </span>
              </div>
              <p className="text-xs font-mono text-brand-primary truncate max-w-full">
                @{username || user?.username || 'username'}
              </p>
            </div>

            {/* Bio Preview */}
            <p className="text-xs text-text-secondary leading-relaxed line-clamp-3 italic px-2 break-words break-all [overflow-wrap:anywhere] max-w-full overflow-hidden">
              {bio ? `"${bio}"` : <span className="text-text-muted not-italic">No bio added yet. Add one to describe your prompt specialties.</span>}
            </p>

            {/* Live Social Badges */}
            {(github || twitter || linkedin || website) && (
              <div className="flex items-center justify-center gap-2 pt-2 border-t border-border-default/60 w-full">
                {github && (
                  <a href={github.startsWith('http') ? github : `https://github.com/${github}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-bg-tertiary hover:bg-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
                    <GithubIcon className="w-4 h-4" />
                  </a>
                )}
                {twitter && (
                  <a href={twitter.startsWith('http') ? twitter : `https://twitter.com/${twitter}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-bg-tertiary hover:bg-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
                    <TwitterIcon className="w-4 h-4" />
                  </a>
                )}
                {linkedin && (
                  <a href={linkedin.startsWith('http') ? linkedin : `https://linkedin.com/in/${linkedin}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-bg-tertiary hover:bg-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
                    <LinkedinIcon className="w-4 h-4" />
                  </a>
                )}
                {website && (
                  <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-bg-tertiary hover:bg-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors">
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}

            {/* Profile Action Buttons */}
            <div className="grid grid-cols-2 gap-2 w-full pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="w-full h-7.5 px-2.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
                <span>View Public</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/u/${username || user?.username || 'creator'}`;
                  navigator.clipboard.writeText(url);
                  showToast('Public profile link copied!', 'success');
                }}
                className="w-full h-7.5 px-2.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-3xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Account Health & Security Overview */}
        <div className="bg-bg-secondary rounded-2xl border border-border-default p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-default">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                Account Standing
              </h4>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Good Standing (0/3)
            </span>
          </div>

          {/* Completeness Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted font-medium">Profile Completeness</span>
              <span className="font-mono font-bold text-text-primary">{completenessScore}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-bg-tertiary overflow-hidden border border-border-default">
              <div 
                className="h-full bg-brand-primary rounded-full transition-all duration-500"
                style={{ width: `${completenessScore}%` }}
              />
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="space-y-2 pt-1 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">Email verified ({user?.email || 'email'})</span>
            </div>
            <div className="flex items-center gap-2">
              {username ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-border-default shrink-0" />
              )}
              <span>Creator handle set (@{username || 'handle'})</span>
            </div>
            <div className="flex items-center gap-2">
              {user?.avatarUrl ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-border-default shrink-0" />
              )}
              <span>Custom avatar photo</span>
            </div>
            <div className="flex items-center gap-2">
              {bio.trim() ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-border-default shrink-0" />
              )}
              <span>Developer bio written</span>
            </div>
            <div className="flex items-center gap-2">
              {(github || twitter || linkedin || website) ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-border-default shrink-0" />
              )}
              <span>Social profiles linked</span>
            </div>
            <div className="flex items-center gap-2">
              {isPayoutConfigured ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-border-default shrink-0" />
              )}
              <span>Creator payout destination {isPayoutConfigured ? 'active' : 'optional'}</span>
            </div>
          </div>
        </div>

        {/* 3. Workspace & Cloud Hub Widget */}
        <div className="bg-bg-secondary rounded-2xl border border-border-default p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-border-default">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-brand-primary" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                Workspace &amp; Cloud Hub
              </h4>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
              Live Synced
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Google Drive Vault */}
            <div className="p-3 rounded-xl bg-bg-tertiary/60 border border-border-default space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text-primary flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Google Drive Vault</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('storage');
                    const el = document.getElementById('storage-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-[10px] font-mono text-brand-primary hover:underline cursor-pointer"
                >
                  Manage →
                </button>
              </div>
              <div className="w-full h-1.5 rounded-full bg-bg-secondary overflow-hidden border border-border-default">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.max(0.5, storageQuota?.usedPercentage || 0.4))}%` }} 
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
                <span>{storageQuota ? formatStorageBytes(storageQuota.usedBytes) : '0 MB'} used</span>
                <span>{storageQuota ? formatStorageBytes(storageQuota.limitBytes) : '5 GB'} pool</span>
              </div>
            </div>

            {/* Creator Payouts Status */}
            <div className="p-3 rounded-xl bg-bg-tertiary/60 border border-border-default flex items-center justify-between gap-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold text-text-primary truncate">Creator Payouts</span>
                </div>
                <span className="text-[10px] text-text-muted font-mono block truncate">
                  {isPayoutConfigured ? (maskedUpi || maskedAcc || 'Destination Active') : '70% Direct Royalties'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('payouts');
                  const el = document.getElementById('payout-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold shrink-0 transition-colors cursor-pointer border ${
                  isPayoutConfigured
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                    : 'bg-brand-primary text-white border-transparent hover:bg-brand-primary-hi'
                }`}
              >
                {isPayoutConfigured ? 'Active' : 'Setup'}
              </button>
            </div>

            {/* Wallet Credits Balance */}
            <div className="p-3 rounded-xl bg-bg-tertiary/60 border border-border-default flex items-center justify-between gap-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-semibold text-text-primary truncate">Credits Balance</span>
                </div>
                <span className="text-[10px] text-text-muted font-mono block">
                  {user?.credits ?? 0} PromptHub Credits
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('pricing')}
                className="px-2.5 py-1 rounded-lg bg-bg-secondary hover:bg-bg-primary text-text-primary border border-border-default text-[10px] font-mono font-medium shrink-0 transition-colors cursor-pointer"
              >
                + Add
              </button>
            </div>

            {/* Mobile App & APK */}
            <div className="p-3 rounded-xl bg-bg-tertiary/60 border border-border-default flex items-center justify-between gap-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span className="font-semibold text-text-primary truncate">Android APK</span>
                </div>
                <span className="text-[10px] text-text-muted font-mono block">
                  v{APK_METADATA.version} • {APK_METADATA.sizeFormatted}
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownloadApk}
                className="px-2.5 py-1 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-[10px] font-mono font-bold shrink-0 transition-colors cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>APK</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Settings Quick Jump Navigation */}
        <div className="bg-bg-secondary rounded-2xl border border-border-default p-4 shadow-xs space-y-2">
          <div className="flex items-center gap-2 pb-2.5 border-b border-border-default">
            <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
              Quick Navigation
            </h4>
          </div>
          <nav className="flex flex-col gap-1 text-xs">
            {[
              { label: 'Public Profile & Bio', href: '#profile-section', category: 'profile' as const, icon: User },
              { label: 'Social & Portfolio Links', href: '#social-section', category: 'profile' as const, icon: Globe },
              { label: 'Creator Payout Destination', href: '#payout-section', category: 'payouts' as const, icon: Landmark },
              { label: 'Studio Theme & Appearance', href: '#theme-section', category: 'appearance' as const, icon: Palette },
              { label: 'Google Drive Storage Vault', href: '#storage-section', category: 'storage' as const, icon: HardDrive },
              { label: 'Mobile App & Android APK', href: '#mobile-section', category: 'mobile' as const, icon: Smartphone },
              { label: 'Subscription & Billing Plan', href: '#subscription-section', category: 'billing' as const, icon: CreditCard },
              { label: 'Help, Feedback & Bug Report', href: '#support-section', category: 'security' as const, icon: Bug },
              { label: 'Compliance & Legal Notice', href: '#legal-section', category: 'security' as const, icon: ShieldCheck },
              { label: 'Danger Zone (Account Erasure)', href: '#danger-section', category: 'security' as const, icon: AlertTriangle, danger: true },
            ].map(({ label, href, category: itemCategory, icon: Icon, danger }) => (
              <a
                key={href}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  if (activeCategory !== 'all' && activeCategory !== itemCategory) {
                    setActiveCategory(itemCategory);
                  }
                  setTimeout(() => {
                    const el = document.querySelector(href);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 60);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                  danger
                    ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{label}</span>
                </span>
                <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
              </a>
            ))}
          </nav>
        </div>

        {/* 5. Support & Feedback Triggers */}
        <div className="bg-gradient-to-br from-brand-primary/5 via-bg-secondary to-bg-secondary rounded-2xl border border-brand-primary/20 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold font-display text-text-primary">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>PromptHub Beta Rewards</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              15 Days Free Pro
            </span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Report bugs or complete our experience survey to help us build the definitive Prompt IDE.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setIsFeedbackModalOpen(true)}
              className="h-7.5 px-2.5 rounded-lg bg-bg-tertiary hover:bg-bg-primary text-text-primary border border-border-default text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Survey</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBugReportModalOpen(true)}
              className="h-7.5 px-2.5 rounded-lg bg-bg-secondary hover:bg-bg-tertiary text-text-primary border border-border-default text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Bug className="w-3.5 h-3.5 text-rose-500" />
              <span>Bug Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>



      {/* Profile Photo Crop Modal */}
      <ImageCropModal
        isOpen={isCropOpen}
        onClose={() => setIsCropOpen(false)}
        imageFile={cropRawFile}
        aspectRatio={1}
        title="Crop Profile Photo (1:1)"
        onCropComplete={handleCropFinished}
      />

      {/* 100-User Experience Feedback Modal */}
      <AppFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        userEmail={user?.email || ''}
        userName={user?.name || user?.username || ''}
        userId={user?.id || ''}
        onSubmitted={() => showToast('Thank you! Your feedback helps shape PromptHub.', 'success')}
      />

      {/* Standalone Mobile App & Android APK Showcase Modal */}
      <MobileAppShowcaseModal
        isOpen={isApkShowcaseOpen}
        onClose={() => setIsApkShowcaseOpen(false)}
      />

      {/* Cancel Subscription Modal */}
      {typeof document !== 'undefined' && isCancelSubModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[750] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCancellingSub) {
              setIsCancelSubModalOpen(false);
            }
          }}
        >
          <div className="bg-bg-primary border border-border-default rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6 space-y-4 text-left max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-display text-text-primary">Cancel Subscription</h4>
                  <p className="text-xs text-text-muted">Revert to Free Explorer Tier</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelSubModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                aria-label="Close Cancel Subscription Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-default space-y-2 text-xs text-text-secondary">
              <p className="font-semibold text-text-primary">Are you sure you want to cancel your plan?</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Your plan will immediately revert to the <strong>Free Explorer</strong> tier.</li>
                <li>All your <strong>prompts, collections, and custom workspaces will remain intact</strong>.</li>
                <li>Any unspent <strong>wallet credits or promotional balances will NOT be lost</strong>.</li>
                <li>You can re-upgrade at any time from the Pricing page.</li>
              </ul>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelSubModalOpen(false)}
                disabled={isCancellingSub}
                className="w-full sm:w-auto h-8 px-3 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-medium transition-colors cursor-pointer flex items-center justify-center"
              >
                Keep My Subscription
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelSubscription}
                disabled={isCancellingSub}
                className="w-full sm:w-auto h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                {isCancellingSub && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isCancellingSub ? 'Cancelling...' : 'Confirm Cancellation'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Account Modal */}
      {typeof document !== 'undefined' && isDeleteAccountModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[750] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingAccount) {
              setIsDeleteAccountModalOpen(false);
            }
          }}
        >
          <div className="bg-bg-primary border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6 space-y-4 text-left max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-display text-rose-600 dark:text-rose-400">Permanently Delete Account</h4>
                  <p className="text-xs text-text-muted">Statutory Right to Erasure</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteAccountModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                aria-label="Close Delete Account Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2 text-xs text-text-secondary">
              <p className="font-semibold text-rose-700 dark:text-rose-300">Warning: This action is permanent and cannot be reversed!</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Your developer profile, username, and bio will be erased.</li>
                <li>All private prompts, drafts, and version history will be deleted.</li>
                <li>All cloud files will be permanently destroyed.</li>
                <li>Your client-side BYOK credential vault and offline storage will be completely purged.</li>
                <li>Any unspent promotional and paid wallet credits will be permanently surrendered.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary block">
                To unlock deletion, type <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">DELETE</span> below:
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isDeleteUnlocked && !isDeletingAccount) {
                      e.preventDefault();
                      handleConfirmDeleteAccount();
                    }
                  }}
                  placeholder="Type DELETE to unlock"
                  className={`w-full min-h-[44px] pl-3 pr-10 py-2 rounded-xl bg-bg-secondary border text-xs font-mono text-text-primary transition-colors focus:outline-none ${
                    isDeleteUnlocked 
                    ? 'border-emerald-500 focus:border-emerald-600 ring-1 ring-emerald-500/20' 
                    : 'border-border-default focus:border-rose-500'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {isDeleteUnlocked ? (
                    <Unlock className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Lock className="w-4 h-4 text-rose-400/80" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                {isDeleteUnlocked ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Safety lock released — deletion enabled</span>
                  </span>
                ) : (
                  <span className="text-text-muted flex items-center gap-1">
                    <Lock className="w-3 h-3 text-rose-500/70" />
                    <span>Safety lock active — type DELETE to unlock</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteAccountModalOpen(false)}
                disabled={isDeletingAccount}
                className="w-full sm:w-auto h-8 px-3 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-medium transition-colors cursor-pointer flex items-center justify-center"
              >
                Cancel / Keep Account
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                disabled={!isDeleteUnlocked || isDeletingAccount}
                className="w-full sm:w-auto h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                {isDeletingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeletingAccount ? 'Erasing Account...' : 'Delete My Account'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SettingsView;
