import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Settings, 
  FolderHeart, 
  History, 
  Eye, 
  Heart, 
  Download, 
  Calendar,
  Layers,
  Save,
  User,
  Camera,
  Share2,
  Loader2,
  Copy,
  Check,
  Globe,
  ExternalLink,
  CreditCard,
  Trash2,
  AlertTriangle,
  X,
  Wallet,
  Terminal,
  Sun,
  Moon,
  Laptop,
  ChevronRight,
  Sparkles,
  Star,
  Play,
  Users,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import { CommunityBadges } from '../components/CommunityBadges';
import { ImageCropModal } from '../components/ImageCropModal';
import { ProfileHealthCard } from '../components/ProfileHealthCard';
import { avatarUploadService } from '../services/avatarUploadService';
import { resolveUserBadges } from '../services/badgeService';
import { securityUtils } from '../utils/security';
import { FollowersModal } from '../components/FollowersModal';
import { CreatorProfileModal } from '../components/CreatorProfileModal';
import { FollowButton } from '../components/FollowButton';
import { followService, type FollowerProfile } from '../services/followService';
import { UserAvatar } from '../components/UserAvatar';
import { ProfileDashboardWidget } from '../components/ProfileDashboardWidget';
import { ProfileBillingTab } from '../components/profile/ProfileBillingTab';
import type { Prompt } from '../db/schema';
import { PromptRepository } from '../repositories/promptRepository';
import { identityChangeLimitService } from '../services/identityChangeLimitService';

export const ProfileView: React.FC = () => {
  const { 
    user, 
    prompts, 
    collections, 
    activities, 
    bugReports,
    updateUser, 
    setActiveTab, 
    setActivePromptId,
    showToast,
    setShowAuthModal,
    cancelSubscription,
    deleteAccount,
    likedPromptIds,
    toggleLikePrompt
  } = useApp();
  const { theme, setTheme } = useTheme();

  const [profileTab, setProfileTab] = useState<'published' | 'collections' | 'starred' | 'following' | 'followers' | 'activity' | 'edit' | 'billing'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('prompthub_profile_tab');
        if (saved && ['published', 'collections', 'starred', 'following', 'followers', 'activity', 'edit', 'billing'].includes(saved)) {
          sessionStorage.removeItem('prompthub_profile_tab');
          return saved as any;
        }
      } catch {}
    }
    return 'published';
  });
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following' | null>(null);
  const [viewingCreatorId, setViewingCreatorId] = useState<string | null>(null);
  const [followingList, setFollowingList] = useState<FollowerProfile[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [followersList, setFollowersList] = useState<FollowerProfile[]>([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [isPublicPreviewOpen, setIsPublicPreviewOpen] = useState(false);
  const [copiedProfileUrl, setCopiedProfileUrl] = useState(false);

  // Load followers & following lists when user is available so tabs are instant
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    setIsLoadingFollowers(true);
    setIsLoadingFollowing(true);

    Promise.all([
      followService.fetchFollowers(user.id, user.id),
      followService.fetchFollowing(user.id, user.id),
    ])
      .then(([followersData, followingData]) => {
        if (isMounted) {
          setFollowersList(followersData);
          setFollowingList(followingData);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          setIsLoadingFollowers(false);
          setIsLoadingFollowing(false);
        }
      });

    return () => { isMounted = false; };
  }, [user?.id, profileTab]);

  // Real-time synchronization of follow actions
  useEffect(() => {
    const handleFollowChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { followerId, targetUserId, isFollowing } = detail;

      if (user && followerId === user.id) {
        if (!isFollowing) {
          setFollowingList((prev) => prev.filter((p) => p.id !== targetUserId));
        } else {
          // Re-fetch following list
          followService.fetchFollowing(user.id, user.id).then((data) => {
            setFollowingList(data);
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('prompthub:follow-updated', handleFollowChanged);
    window.addEventListener('ph_follow_changed', handleFollowChanged);
    return () => {
      window.removeEventListener('prompthub:follow-updated', handleFollowChanged);
      window.removeEventListener('ph_follow_changed', handleFollowChanged);
    };
  }, [user?.id]);

  // Subscription Cancellation & Account Deletion States
  const [isCancelSubModalOpen, setIsCancelSubModalOpen] = useState(false);
  const [isCancellingSub, setIsCancellingSub] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleConfirmCancelSub = async () => {
    setIsCancellingSub(true);
    try {
      await cancelSubscription();
      setIsCancelSubModalOpen(false);
    } catch {
      // toast handled in AppContext
    } finally {
      setIsCancellingSub(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText.trim() !== 'DELETE') return;
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      setIsDeleteAccountModalOpen(false);
      // Clean redirect to root upon account deletion
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
    } catch {
      // toast handled in AppContext
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Check URL hash or query params for #edit or ?tab=edit to automatically scroll to edit form
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      if (hash === '#billing' || params.get('tab') === 'billing' || params.get('tab') === 'usage') {
        setProfileTab('billing');
      } else if (hash === '#edit' || hash === '#settings' || params.get('tab') === 'edit' || params.get('tab') === 'settings' || params.get('edit') === 'true') {
        setProfileTab('edit');
        setTimeout(() => {
          const el = document.getElementById('edit-profile-section');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    }
  }, []);
  
  // ─── SessionStorage Draft Persistence (prevents wiping out uncommitted edits across tabs) ───
  const profileDraftKey = user?.id ? `ph_profile_edit_draft_${user.id}` : null;
  const loadProfileDraft = () => {
    if (typeof window === 'undefined' || !profileDraftKey) return null;
    try {
      const stored = sessionStorage.getItem(profileDraftKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const initialProfileDraft = useMemo(() => loadProfileDraft(), [profileDraftKey]);
  const isProfileDirtyRef = useRef<boolean>(Boolean(initialProfileDraft));

  const persistProfileDraftField = useCallback((field: string, val: string) => {
    isProfileDirtyRef.current = true;
    if (typeof window !== 'undefined' && profileDraftKey) {
      try {
        const cur = loadProfileDraft() || {
          name: user?.name || '',
          username: user?.username || '',
          bio: user?.bio || '',
          twitter: user?.socialLinks?.twitter || '',
          github: user?.socialLinks?.github || '',
          linkedin: user?.socialLinks?.linkedin || '',
          website: user?.socialLinks?.website || '',
        };
        cur[field] = val;
        sessionStorage.setItem(profileDraftKey, JSON.stringify(cur));
      } catch {}
    }
  }, [profileDraftKey, user]);

  const clearProfileDraft = useCallback(() => {
    isProfileDirtyRef.current = false;
    if (typeof window !== 'undefined' && profileDraftKey) {
      try {
        sessionStorage.removeItem(profileDraftKey);
      } catch {}
    }
  }, [profileDraftKey]);

  // Edit Profile form inputs initialized with draft fallback
  const [name, setName] = useState(() => initialProfileDraft?.name ?? (user?.name || ''));
  const [username, setUsername] = useState(() => initialProfileDraft?.username ?? (user?.username || ''));
  const [bio, setBio] = useState(() => initialProfileDraft?.bio ?? (user?.bio || ''));
  const [twitter, setTwitter] = useState(() => initialProfileDraft?.twitter ?? (user?.socialLinks?.twitter || ''));
  const [github, setGithub] = useState(() => initialProfileDraft?.github ?? (user?.socialLinks?.github || ''));
  const [linkedin, setLinkedin] = useState(() => initialProfileDraft?.linkedin ?? (user?.socialLinks?.linkedin || ''));
  const [website, setWebsite] = useState(() => initialProfileDraft?.website ?? (user?.socialLinks?.website || ''));
  const [githubError, setGithubError] = useState<string | null>(null);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [twitterError, setTwitterError] = useState<string | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);

  // Identity change quota tracking (max 2 changes per rolling 7 days)
  const nameQuota = useMemo(() => {
    return identityChangeLimitService.checkNameChangeQuota(user?.id);
  }, [user?.id, user?.nameChangeHistory]);

  const usernameQuota = useMemo(() => {
    return identityChangeLimitService.checkUsernameChangeQuota(user?.id);
  }, [user?.id, user?.usernameChangeHistory]);

  const isNameChangeBlocked = Boolean(user && name.trim() !== (user.name || '').trim() && !nameQuota.allowed);
  const isUsernameChangeBlocked = Boolean(user && username.trim().toLowerCase() !== (user.username || '').toLowerCase() && !usernameQuota.allowed);

  // Keep state updated in real-time when user profile loads or changes, unless actively editing
  React.useEffect(() => {
    if (user && !isProfileDirtyRef.current && !(typeof window !== 'undefined' && profileDraftKey && sessionStorage.getItem(profileDraftKey))) {
      setName(user.name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setTwitter(user.socialLinks?.twitter || '');
      setGithub(user.socialLinks?.github || '');
      setLinkedin(user.socialLinks?.linkedin || '');
      setWebsite(user.socialLinks?.website || '');
    }
  }, [user, profileDraftKey]);
  
  // Storage avatar and crop inputs
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropType, setCropType] = useState<'avatar' | 'banner'>('avatar');
  const [cropRawFile, setCropRawFile] = useState<File | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Derive counts
  const userPrompts = prompts.filter(p => p.authorId === user?.id);
  const publishedPrompts = userPrompts.filter(p => p.visibility === 'public');

  // Dynamically resolve badges strictly earned by the user
  const earnedBadges = useMemo(
    () => resolveUserBadges({ user, prompts, bugReports }),
    [user, prompts, bugReports]
  );

  // Compute total aggregates of user's own prompts
  const totalViews = userPrompts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
  const totalLikes = Math.max((user as any)?.totalLikes || 0, userPrompts.reduce((sum, p) => sum + (p.likesCount || 0), 0));
  const totalCopies = userPrompts.reduce((sum, p) => sum + (p.copiesCount || 0), 0);

  const [starredPrompts, setStarredPrompts] = useState<Prompt[]>([]);

  // Resolve starred prompts whenever likedPromptIds or prompts change
  React.useEffect(() => {
    let isMounted = true;
    const ids = likedPromptIds || [];
    if (ids.length === 0) {
      setStarredPrompts([]);
      return;
    }

    const inMemoryMap = new Map(prompts.map(p => [p.id, p]));
    const resolvedFromMemory: Prompt[] = [];
    const missingIds: string[] = [];

    for (const id of ids) {
      if (inMemoryMap.has(id)) {
        resolvedFromMemory.push(inMemoryMap.get(id)!);
      } else {
        missingIds.push(id);
      }
    }

    if (missingIds.length > 0) {
      PromptRepository.getPromptsByIds(missingIds).then((fetchedMissing) => {
        if (!isMounted) return;
        const allStarred = [...resolvedFromMemory, ...fetchedMissing];
        const unique = Array.from(new Map(allStarred.map(p => [p.id, p])).values());
        setStarredPrompts(unique);
      }).catch(() => {
        if (isMounted) setStarredPrompts(resolvedFromMemory);
      });
    } else {
      setStarredPrompts(resolvedFromMemory);
    }

    return () => { isMounted = false; };
  }, [likedPromptIds, prompts]);

  // Real-time synchronization of like and star events in profile view
  React.useEffect(() => {
    const handleLikeChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { promptId, isLiked, likesCount, delta } = detail;

      setStarredPrompts(prev => {
        if (isLiked === false) {
          return prev.filter(p => p.id !== promptId);
        }
        return prev.map(p => {
          if (p.id !== promptId) return p;
          const updatedCount = typeof likesCount === 'number'
            ? likesCount
            : Math.max(0, (p.likesCount || 0) + (delta ?? (isLiked ? 1 : -1)));
          return { ...p, likesCount: updatedCount };
        });
      });
    };

    window.addEventListener('ph_prompt_like_changed', handleLikeChanged);
    return () => window.removeEventListener('ph_prompt_like_changed', handleLikeChanged);
  }, []);

  const totalStarredCount = Math.max(likedPromptIds?.length || 0, starredPrompts.length);

  const handleAvatarFileSelected = (file: File | null) => {
    if (!file) return;
    setCropRawFile(file);
    setCropType('avatar');
    setIsCropOpen(true);
  };

  const handleCropFinished = async (blob: Blob, dataUrl: string) => {
    setCroppedBlob(blob);
    setCroppedPreviewUrl(dataUrl);

    if (!user) return;
    setIsUploading(true);
    showToast('Saving and publishing your new profile photo...', 'info');

    try {
      const uploadRes = await avatarUploadService.uploadAvatar(blob, user.id);
      await updateUser({
        avatarUrl: uploadRes.url,
      });
      setCroppedPreviewUrl(uploadRes.url);
      showToast('Your new profile photo is live! Everyone can now see your updated DP.', 'success');
    } catch (err: any) {
      console.warn('[ProfileView] Avatar upload notice, applying local compressed fallback:', err);
      try {
        const compressed = await avatarUploadService.compressAvatar(blob, 300, 0.85);
        await updateUser({ avatarUrl: compressed.dataUrl });
        setCroppedPreviewUrl(compressed.dataUrl);
        showToast('Your new profile photo is live!', 'success');
      } catch (innerErr: any) {
        showToast('Failed to save profile photo: ' + (innerErr.message || 'Unknown error'), 'error');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const rawUsername = (user?.username || user?.name || 'creator').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const publicShareUrl = typeof window !== 'undefined' ? `${window.location.origin}/u/${encodeURIComponent(rawUsername)}` : `https://prompthub.cloud/u/${rawUsername}`;

  const handleShareProfile = async () => {
    if (!user) return;
    const shareTitle = `${user.name} (@${user.username || 'creator'}) on PromptHub`;
    const shareText = `Check out my AI prompt engineering profile and templates on PromptHub! Follow me:`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: publicShareUrl,
        });
        showToast('Profile shared successfully!', 'success');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(publicShareUrl);
      setCopiedProfileUrl(true);
      showToast(`Profile link copied: ${publicShareUrl}`, 'success');
      setTimeout(() => setCopiedProfileUrl(false), 2000);
    } catch {
      showToast('Profile URL: ' + publicShareUrl, 'info');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const limit = securityUtils.rateLimit('edit_profile', 4000);
    if (!limit.allowed) {
      showToast(limit.error || 'Please wait a moment before editing profile again.', 'error');
      return;
    }

    setIsUploading(true);
    let finalAvatarUrl = croppedPreviewUrl || user?.avatarUrl || '';

    try {
      if (croppedBlob) {
        try {
          const uploadRes = await avatarUploadService.uploadAvatar(croppedBlob, user.id);
          finalAvatarUrl = uploadRes.url;
        } catch {
          const compressed = await avatarUploadService.compressAvatar(croppedBlob, 300, 0.85);
          finalAvatarUrl = compressed.dataUrl;
        }
      }

      const sanitizedName = securityUtils.sanitizeText(name);
      const sanitizedUsername = securityUtils.sanitizeText(username).trim().toLowerCase();
      const sanitizedBio = securityUtils.sanitizeText(bio);

      // Quota validation for name and username
      const isNameChanged = sanitizedName !== (user.name || '').trim();
      const isUsernameChanged = sanitizedUsername !== (user.username || '').toLowerCase();

      if (isNameChanged && !nameQuota.allowed) {
        showToast(nameQuota.message, 'error');
        setIsUploading(false);
        return;
      }

      if (isUsernameChanged && !usernameQuota.allowed) {
        showToast(usernameQuota.message, 'error');
        setIsUploading(false);
        return;
      }

      if (!sanitizedName || sanitizedName.length < 2 || sanitizedName.length > 50) {
        showToast('Display name must be between 2 and 50 characters.', 'error');
        setIsUploading(false);
        return;
      }

      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(sanitizedUsername)) {
        showToast('Username must be 3-30 characters with alphanumeric, underscore, or dash only.', 'error');
        setIsUploading(false);
        return;
      }

      if (sanitizedBio.length > 250) {
        showToast('Bio cannot exceed 250 characters.', 'error');
        setIsUploading(false);
        return;
      }

      if (finalAvatarUrl && !securityUtils.validateImageUrl(finalAvatarUrl)) {
        showToast('Invalid avatar image URL format. Use HTTP, HTTPS, or a valid image data URI.', 'error');
        setIsUploading(false);
        return;
      }

      // Validate GitHub URL if provided
      let cleanGithub = github.trim();
      if (cleanGithub) {
        const gRes = securityUtils.validateGithubUrl(cleanGithub);
        if (!gRes.isValid) {
          setGithubError(gRes.error || 'Invalid GitHub URL');
          showToast(gRes.error || 'Invalid GitHub URL. Must be a valid profile link.', 'error');
          setIsUploading(false);
          return;
        }
        cleanGithub = securityUtils.normalizeUrl(cleanGithub);
        setGithubError(null);
      } else {
        setGithubError(null);
      }

      // Validate LinkedIn URL if provided
      let cleanLinkedin = linkedin.trim();
      if (cleanLinkedin) {
        const lRes = securityUtils.validateLinkedinUrl(cleanLinkedin);
        if (!lRes.isValid) {
          setLinkedinError(lRes.error || 'Invalid LinkedIn URL');
          showToast(lRes.error || 'Invalid LinkedIn URL. Must be a valid profile link.', 'error');
          setIsUploading(false);
          return;
        }
        cleanLinkedin = securityUtils.normalizeUrl(cleanLinkedin);
        setLinkedinError(null);
      } else {
        setLinkedinError(null);
      }

      // Validate Twitter / X URL if provided
      let cleanTwitter = twitter.trim();
      if (cleanTwitter) {
        const tRes = securityUtils.validateTwitterUrl(cleanTwitter);
        if (!tRes.isValid) {
          setTwitterError(tRes.error || 'Invalid Twitter / X URL');
          showToast(tRes.error || 'Invalid Twitter / X URL. Must be a valid profile link.', 'error');
          setIsUploading(false);
          return;
        }
        cleanTwitter = securityUtils.normalizeUrl(cleanTwitter);
        setTwitterError(null);
      } else {
        setTwitterError(null);
      }

      // Validate Website URL if provided
      let cleanWebsite = website.trim();
      if (cleanWebsite) {
        const wRes = securityUtils.validateWebsiteUrl(cleanWebsite);
        if (!wRes.isValid) {
          setWebsiteError(wRes.error || 'Invalid Website URL');
          showToast(wRes.error || 'Invalid Website URL. Must be a valid website address.', 'error');
          setIsUploading(false);
          return;
        }
        cleanWebsite = securityUtils.normalizeUrl(cleanWebsite);
        setWebsiteError(null);
      } else {
        setWebsiteError(null);
      }

      await updateUser({
        name: sanitizedName,
        username: sanitizedUsername,
        bio: sanitizedBio,
        avatarUrl: finalAvatarUrl,
        socialLinks: { 
          twitter: cleanTwitter, 
          github: cleanGithub, 
          linkedin: cleanLinkedin, 
          website: cleanWebsite 
        }
      });
      showToast('Creator profile updated successfully!', 'success');
      clearProfileDraft();
      setProfileTab('published');
    } catch (err: any) {
      showToast('Failed to update profile: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePromptClick = (id: string) => {
    const prompt = prompts.find(p => p.id === id);
    if (prompt) {
      try {
        sessionStorage.setItem('ph_active_prompt_id', prompt.id);
        sessionStorage.setItem('ph_active_prompt_data', JSON.stringify(prompt));
        sessionStorage.setItem('ph_creation_workspace_prompt', prompt.rawContent);
        sessionStorage.setItem('ph_work_pending_task', JSON.stringify({
          title: prompt.title,
          prompt: prompt.rawContent,
          category: prompt.category,
        }));
      } catch {}
    }
    setActivePromptId(id);
    setActiveTab('workspace');
  };

  const publicPrompts = prompts.filter(p => p.visibility === 'public').slice(0, 4);

  if (!user) {
    return (
      <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-bg-primary select-text text-left">
        {/* Guest Banner */}
        <div className="bg-bg-secondary border border-border-default rounded-xl p-4 sm:p-6 shadow-xs mb-5">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-20 h-20 rounded-xl bg-bg-tertiary border border-border-default flex items-center justify-center text-text-muted shrink-0">
              <User className="w-10 h-10" />
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h2 className="text-xl sm:text-2xl font-bold font-display text-text-primary">Guest Developer</h2>
                <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded bg-bg-tertiary border border-border-default text-text-secondary">
                  Anonymous Session
                </span>
              </div>
              <p className="text-xs text-text-secondary max-w-xl leading-relaxed">
                Sign in to customize your creator portfolio, track benchmarks, save API keys, and publish prompt templates to the community.
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  Sign In / Create Account
                </button>
                <button
                  onClick={() => setActiveTab('community')}
                  className="px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-border-subtle text-text-primary text-xs font-medium cursor-pointer border border-border-default transition-colors"
                >
                  Explore Community
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Guest Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Published Prompts', value: '0', icon: Layers, sub: 'Sign in to publish' },
            { label: 'Total Views', value: '0', icon: Eye, sub: 'Public engagement' },
            { label: 'Community Likes', value: '0', icon: Heart, sub: 'Favorites received' },
            { label: 'Forks & Copies', value: '0', icon: Download, sub: 'Asset reuse' },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono font-semibold text-text-muted mb-2">{card.label}</span>
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-2xl font-bold font-mono text-text-primary">{card.value}</h3>
                    <span className="text-[10px] text-text-muted">{card.sub}</span>
                  </div>
                  <Icon className="w-5 h-5 text-text-muted" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Trending Community Prompts */}
        <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-text-primary">Trending Community Templates</h4>
              <p className="text-xs text-text-secondary">Explore top-rated prompts built by the developer community</p>
            </div>
            <button
              onClick={() => setActiveTab('community')}
              className="text-xs font-medium text-brand-primary hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {publicPrompts.map(p => (
              <div
                key={p.id}
                onClick={() => handlePromptClick(p.id)}
                className="p-3.5 rounded-lg bg-bg-tertiary/60 border border-border-default hover:border-border-hover transition-colors cursor-pointer space-y-1.5"
              >
                <div className="flex justify-between items-start gap-2">
                  <h5 className="text-xs font-bold text-text-primary truncate">
                    {p.title}
                  </h5>
                  <span className="text-[10px] font-mono text-text-secondary bg-bg-secondary px-1.5 py-0.2 rounded border border-border-default shrink-0">
                    {p.model}
                  </span>
                </div>
                <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                  {p.description || 'Production prompt template.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-bg-primary select-text text-left">
      {/* ── Dashboard Widget (owner only) ─────────────────────────────────── */}
      <ProfileDashboardWidget 
        user={user} 
        prompts={prompts} 
        onNavigate={(tab) => {
          if (tab === 'followers' || tab === 'following') {
            setProfileTab(tab);
          } else {
            setActiveTab(tab as any);
          }
        }} 
      />

      {/* Header Profile Info Banner */}
      <div className="bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs mb-5 min-w-0 overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-5 min-w-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 min-w-0 flex-1 w-full">
            {/* Interactive Display Picture (DP) */}
            <div className="relative group shrink-0">
              <UserAvatar 
                src={croppedPreviewUrl || user.avatarUrl}
                name={user.name} 
                username={user.username} 
                role={user.role}
                isAdmin={user.role === 'Admin'}
                size="xl" 
                shape="rounded"
                className="!w-20 !h-20 !text-2xl rounded-2xl shadow-xs group-hover:border-brand-primary transition-all"
              />

              {/* Hover Camera Overlay to Change DP */}
              <label
                className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-2xs"
                title="Change Display Picture / Photo"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-brand-primary" />
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-white mb-0.5" />
                    <span className="text-[10px] font-bold font-mono tracking-tight">Edit DP</span>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  disabled={isUploading || isNameChangeBlocked || isUsernameChangeBlocked}
                  onChange={(e) => {
                    handleAvatarFileSelected(e.target.files?.[0] || null);
                    e.target.value = '';
                  }}
                  className="hidden" 
                />
              </label>

              {/* Camera Badge in bottom corner */}
              <label
                className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-brand-primary text-white shadow-md border-2 border-bg-secondary hover:bg-brand-primary-hi transition-colors cursor-pointer"
                title="Upload & Crop new photo"
              >
                <Camera className="w-3.5 h-3.5" />
                <input 
                  type="file" 
                  accept="image/*" 
                  disabled={isUploading}
                  onChange={(e) => {
                    handleAvatarFileSelected(e.target.files?.[0] || null);
                    e.target.value = '';
                  }}
                  className="hidden" 
                />
              </label>
            </div>

            <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left w-full">
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold font-display text-text-primary truncate max-w-full">{user.name}</h2>
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-bg-tertiary border border-border-default text-text-secondary truncate max-w-[240px]">
                    @{user.username || 'user'}
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-primary-light text-brand-primary border border-brand-primary/20 shrink-0">
                    {user.role}
                  </span>
                  <CommunityBadges badges={earnedBadges} size="xs" />
                </div>
                {user.bio && (
                  <p className="text-xs text-text-secondary mt-1.5 max-w-2xl break-words break-all [overflow-wrap:anywhere] leading-relaxed">
                    {user.bio}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-text-muted font-mono">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined {new Date(user.joinDate || Date.now()).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => {
                    setProfileTab('followers');
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default hover:border-brand-primary text-xs font-mono transition-all cursor-pointer min-h-[36px]"
                  title="View all followers"
                >
                  <Users className="w-3.5 h-3.5 text-brand-primary" />
                  <strong className="text-text-primary">{followersList.length || user.followersCount || 0}</strong>
                  <span className="text-text-secondary">followers</span>
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => {
                    setProfileTab('following');
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default hover:border-brand-primary text-xs font-mono transition-all cursor-pointer min-h-[36px]"
                  title="Check whom you are following"
                >
                  <UserCheck className="w-3.5 h-3.5 text-brand-primary" />
                  <strong className="text-text-primary">{followingList.length || user.followingCount || user.following?.length || 0}</strong>
                  <span className="text-text-secondary">following</span>
                </button>
                
                {/* Social Links */}
                {user.socialLinks?.github && (
                  <a href={user.socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-text-primary hover:text-brand-primary transition-colors">
                    GitHub
                  </a>
                )}
                {user.socialLinks?.twitter && (
                  <a href={user.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-text-primary hover:text-brand-primary transition-colors">
                    Twitter
                  </a>
                )}
                {user.socialLinks?.linkedin && (
                  <a href={user.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-text-primary hover:text-brand-primary transition-colors">
                    LinkedIn
                  </a>
                )}
                {user.socialLinks?.website && (
                  <a href={user.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-text-primary hover:text-brand-primary transition-colors">
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-center md:self-start">
            <button
              type="button"
              onClick={() => setIsPublicPreviewOpen(true)}
              className="h-7.5 px-2.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-medium shadow-3xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="Preview how visitors see your public profile"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Preview</span>
            </button>

            <button
              type="button"
              onClick={handleShareProfile}
              className="h-7.5 px-2.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer flex items-center gap-1.5"
              title="Share your public creator profile link"
            >
              <Share2 className="w-3.5 h-3.5 text-brand-primary" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={() => setProfileTab(profileTab === 'edit' ? 'published' : 'edit')}
              className="h-7.5 px-2.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-text-muted" />
              <span>{profileTab === 'edit' ? 'View Profile' : 'Edit Profile'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="h-7.5 px-2.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer flex items-center gap-1.5"
              title="Open Platform & Account Settings"
            >
              <Settings className="w-3.5 h-3.5 text-brand-primary" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Public Profile URL Widget */}
      <div className="bg-bg-secondary border border-border-default rounded-xl p-3 sm:p-3.5 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-lg bg-bg-tertiary border border-border-default flex items-center justify-center text-brand-primary shrink-0">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase font-bold text-text-muted">Your Public Profile URL</div>
            <div className="text-xs font-mono font-semibold text-text-primary truncate" title={publicShareUrl}>
              {typeof window !== 'undefined' ? window.location.origin.replace(/^https?:\/\//, '') : 'prompthub.cloud'}/u/<span className="text-brand-primary font-bold">{rawUsername}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(publicShareUrl);
              setCopiedProfileUrl(true);
              showToast('Public profile link copied!', 'success');
              setTimeout(() => setCopiedProfileUrl(false), 2000);
            }}
            className="flex-1 sm:flex-initial h-7 px-2.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copiedProfileUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-text-muted" />}
            <span>{copiedProfileUrl ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={handleShareProfile}
            className="h-7 px-2.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5 text-brand-primary" />
            <span>Share</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPublicPreviewOpen(true)}
            className="h-7 px-2.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-medium shadow-3xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            title="Preview profile as public visitor"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Created Prompts', value: userPrompts.length, icon: Layers },
          { label: 'Prompt Views', value: totalViews, icon: Eye },
          { label: 'Template Likes', value: totalLikes, icon: Heart },
          { label: 'Output Copies', value: totalCopies, icon: Download }
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-bg-secondary border border-border-default rounded-xl p-4 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] uppercase font-mono font-semibold text-text-muted mb-2">{card.label}</span>
              <div className="flex items-end justify-between">
                <h3 className="text-xl sm:text-2xl font-bold font-mono text-text-primary">{card.value}</h3>
                <Icon className="w-4 h-4 text-text-muted" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Account Standing & Community Guidelines Strike Indicator */}
      <div className="mb-6">
        <ProfileHealthCard
          strikesCount={(user as any)?.strikesCount || 0}
          maxStrikes={3}
          status="good"
          onOpenGuidelines={() => setActiveTab('terms')}
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-bg-tertiary/70 p-1 border border-border-default rounded-lg mb-4 w-full md:w-fit max-w-full select-none overflow-x-auto no-scrollbar scrollbar-none text-xs whitespace-nowrap">
        {[
          { id: 'published', label: `Published (${publishedPrompts.length})`, icon: Layers, isPrimary: true },
          { id: 'starred', label: `Starred (${totalStarredCount})`, icon: Star, isPrimary: true },
          { id: 'collections', label: `Collections (${collections.length})`, icon: FolderHeart, isPrimary: true },
          { id: 'followers', label: `Followers (${followersList.length || user.followersCount || user.followers?.length || 0})`, icon: Users, isPrimary: false },
          { id: 'following', label: `Following (${followingList.length || user.followingCount || user.following?.length || 0})`, icon: UserCheck, isPrimary: false },
          { id: 'activity', label: 'Activity', icon: History, isPrimary: false },
          { id: 'billing', label: 'Billing', icon: Wallet, isPrimary: false },
          { id: 'edit', label: 'Edit Profile', icon: User, isPrimary: false }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = profileTab === tab.id;
          const isPrimary = tab.isPrimary;
          return (
            <button
              key={tab.id}
              onClick={() => setProfileTab(tab.id as any)}
              className={`rounded-md transition-colors cursor-pointer shrink-0 whitespace-nowrap flex items-center ${
                isPrimary
                  ? 'h-7.5 px-2.5 text-xs font-medium gap-1.5'
                  : 'h-6.5 px-2 text-[11px] font-normal gap-1'
              } ${
                isActive 
                  ? 'bg-bg-secondary text-text-primary font-semibold shadow-3xs border border-border-default' 
                  : isPrimary
                  ? 'text-text-secondary hover:text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Icon className={isPrimary ? "w-3.5 h-3.5" : "w-3 h-3 opacity-75"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div>
        {profileTab === 'published' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publishedPrompts.length === 0 ? (
              <div className="col-span-2 text-center py-12 border border-dashed border-border-default rounded-xl text-xs text-text-secondary bg-bg-secondary">
                <Layers className="w-6 h-6 text-text-muted mx-auto mb-2" />
                <p className="mb-2">No public prompts published yet.</p>
                <button
                  onClick={() => setActiveTab('create-prompt')}
                  className="px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Create Prompt
                </button>
              </div>
            ) : (
              publishedPrompts.map(p => (
                <div 
                  key={p.id}
                  onClick={() => handlePromptClick(p.id)}
                  className="bg-bg-secondary rounded-xl p-4 flex flex-col justify-between gap-2.5 border border-border-default hover:border-border-hover shadow-xs cursor-pointer"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-bold text-text-primary truncate">{p.title}</h4>
                      <span className="text-[10px] font-mono text-text-secondary bg-bg-tertiary px-1.5 py-0.2 rounded border border-border-default">{p.model}</span>
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-2 mt-0.5 leading-relaxed">{p.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-muted font-mono border-t border-border-default pt-2">
                    <span className="uppercase">{p.assetType || 'prompt'}</span>
                    <div className="flex items-center gap-3">
                      <span>{p.viewsCount || 0} views</span>
                      <span>{p.likesCount || 0} likes</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {profileTab === 'starred' && (
          <div className="space-y-4">
            {starredPrompts.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border-default rounded-xl text-xs text-text-secondary bg-bg-secondary space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-xs">
                  <Star className="w-6 h-6 fill-amber-500/20 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary mb-1">No Starred Prompts Yet</h4>
                  <p className="text-text-secondary max-w-sm mx-auto leading-relaxed">
                    Star and like prompts across the community and marketplace to curate your personal collection of favorite templates here.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('community')}
                  className="h-7.5 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-medium cursor-pointer shadow-xs inline-flex items-center gap-1.5 transition-colors"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Explore Community Prompts</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {starredPrompts.map(p => {
                  const isPromptLiked = (likedPromptIds || []).includes(p.id);
                  return (
                    <div 
                      key={p.id}
                      className="bg-bg-secondary rounded-xl p-4 flex flex-col justify-between gap-3 border border-border-default hover:border-border-hover shadow-xs transition-all duration-200 group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handlePromptClick(p.id)}
                            className="text-left font-bold text-xs text-text-primary hover:text-brand-primary transition-colors truncate flex-1 cursor-pointer"
                          >
                            {p.title}
                          </button>
                          <span className="text-[10px] font-mono text-text-secondary bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-default shrink-0">
                            {p.model}
                          </span>
                        </div>

                        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                          {p.description || 'Production prompt template.'}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {p.category && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border-default">
                              {p.category}
                            </span>
                          )}
                          {p.authorName && (
                            <span className="text-[10px] font-mono text-text-muted">
                              by {p.authorName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border-default pt-2.5 mt-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleLikePrompt(p.id)}
                            className={`h-7 px-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-mono justify-center ${
                              isPromptLiked
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20'
                                : 'bg-bg-tertiary border-border-default text-text-muted hover:text-text-primary'
                            }`}
                            title={isPromptLiked ? 'Starred / Liked (click to unstar)' : 'Star prompt'}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isPromptLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                            <span>{p.likesCount || 0}</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(p.rawContent || p.description || '');
                                showToast('Prompt content copied to clipboard!', 'success');
                              } catch {
                                showToast('Failed to copy prompt content.', 'error');
                              }
                            }}
                            className="h-7 w-7 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-text-muted hover:text-text-primary transition-colors cursor-pointer flex items-center justify-center"
                            title="Copy prompt text"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handlePromptClick(p.id)}
                          className="h-7 px-2.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-medium shadow-3xs transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Run this prompt in Studio"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Run in Studio</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {profileTab === 'followers' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default">
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-primary" />
                  <span>Your Followers ({followersList.length})</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Community members and prompt engineers who follow your profile, templates, and releases.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFollowersModalTab('followers')}
                className="px-3 py-1.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-xs font-semibold text-text-primary transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto min-h-[36px]"
              >
                <Users className="w-3.5 h-3.5 text-brand-primary" />
                <span>Search & Manage</span>
              </button>
            </div>

            {isLoadingFollowers ? (
              <div className="py-12 text-center space-y-2 border border-border-default rounded-xl bg-bg-secondary">
                <Loader2 className="w-6 h-6 animate-spin text-brand-primary mx-auto" />
                <p className="text-xs text-text-muted">Loading your followers...</p>
              </div>
            ) : followersList.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border-default rounded-xl text-xs text-text-secondary bg-bg-secondary space-y-3">
                <Users className="w-8 h-8 text-text-muted mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-text-primary">No followers yet</h4>
                  <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
                    Share your creator profile and publish high-converting prompts in the marketplace to grow your following.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleShareProfile()}
                  className="h-7.5 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-medium transition-colors cursor-pointer inline-flex items-center justify-center shadow-xs"
                >
                  Share Your Profile Link
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {followersList.map(creator => (
                  <div
                    key={creator.id}
                    className="p-3.5 rounded-xl bg-bg-secondary border border-border-default hover:border-border-hover transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div
                      onClick={() => setViewingCreatorId(creator.id)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                    >
                      <img
                        src={creator.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={creator.name}
                        className="w-10 h-10 rounded-xl object-cover border border-border-default group-hover:border-brand-primary transition-colors shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-text-primary truncate group-hover:text-brand-primary transition-colors">
                            {creator.name}
                          </span>
                          <CommunityBadges badges={creator.badges} size="xs" />
                        </div>
                        <div className="text-[11px] text-text-muted font-mono truncate">
                          @{creator.username}
                        </div>
                        {creator.bio && (
                          <p className="text-[11px] text-text-secondary line-clamp-1 mt-0.5 break-words break-all [overflow-wrap:anywhere]">
                            {creator.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewingCreatorId(creator.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-[11px] font-semibold text-text-primary transition-colors cursor-pointer min-h-[32px]"
                      >
                        Profile
                      </button>
                      <FollowButton
                        targetUserId={creator.id}
                        targetUserName={creator.username}
                        targetAvatarUrl={creator.avatarUrl}
                        size="xs"
                        followsYou={creator.followsViewer}
                        onFollowChange={(isFollowing: boolean) => {
                          setFollowersList(prev => prev.map(c => c.id === creator.id ? { ...c, isFollowing } : c));
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {profileTab === 'following' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default">
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-brand-primary" />
                  <span>Creators You Follow ({followingList.length})</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Prompt engineers and community builders whose prompts, workflows, and benchmarks you track.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFollowersModalTab('following')}
                className="h-7.5 px-2.5 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-xs font-medium text-text-primary transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Users className="w-3.5 h-3.5 text-brand-primary" />
                <span>Search & Manage</span>
              </button>
            </div>

            {isLoadingFollowing ? (
              <div className="py-12 text-center space-y-2 border border-border-default rounded-xl bg-bg-secondary">
                <Loader2 className="w-6 h-6 animate-spin text-brand-primary mx-auto" />
                <p className="text-xs text-text-muted">Loading creators you follow...</p>
              </div>
            ) : followingList.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border-default rounded-xl text-xs text-text-secondary bg-bg-secondary space-y-3">
                <UserCheck className="w-8 h-8 text-text-muted mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-text-primary">Not following any creators yet</h4>
                  <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
                    Discover top creators on the community feed or leaderboard and follow them to stay updated on their latest prompts and workflows.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('community')}
                  className="h-7.5 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-medium transition-colors cursor-pointer inline-flex items-center justify-center shadow-xs"
                >
                  Explore Community Creators
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {followingList.map(creator => (
                  <div
                    key={creator.id}
                    className="p-3.5 rounded-xl bg-bg-secondary border border-border-default hover:border-border-hover transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div
                      onClick={() => setViewingCreatorId(creator.id)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                    >
                      <img
                        src={creator.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                        alt={creator.name}
                        className="w-10 h-10 rounded-xl object-cover border border-border-default group-hover:border-brand-primary transition-colors shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-text-primary truncate group-hover:text-brand-primary transition-colors">
                            {creator.name}
                          </span>
                          <CommunityBadges badges={creator.badges} size="xs" />
                        </div>
                        <div className="text-[11px] text-text-muted font-mono truncate">
                          @{creator.username}
                        </div>
                        {creator.bio && (
                          <p className="text-[11px] text-text-secondary line-clamp-1 mt-0.5 break-words break-all [overflow-wrap:anywhere]">
                            {creator.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewingCreatorId(creator.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-[11px] font-semibold text-text-primary transition-colors cursor-pointer min-h-[32px]"
                      >
                        Profile
                      </button>
                      <FollowButton
                        targetUserId={creator.id}
                        targetUserName={creator.username}
                        targetAvatarUrl={creator.avatarUrl}
                        size="xs"
                        followsYou={creator.followsViewer}
                        onFollowChange={(isFollowing: boolean) => {
                          if (!isFollowing) {
                            setFollowingList(prev => prev.filter(c => c.id !== creator.id));
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {profileTab === 'collections' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {collections.length === 0 ? (
              <div className="col-span-3 text-center py-12 border border-dashed border-border-default rounded-xl text-xs text-text-secondary bg-bg-secondary space-y-3">
                <FolderHeart className="w-6 h-6 text-text-muted mx-auto" />
                <p>No collections defined yet. Group and organize your prompt templates.</p>
                <button
                  onClick={() => setActiveTab('collections')}
                  className="h-7.5 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-medium cursor-pointer shadow-xs inline-flex items-center gap-1.5 transition-colors"
                >
                  <FolderHeart className="w-3.5 h-3.5" />
                  <span>Go to Collections</span>
                </button>
              </div>
            ) : (
              collections.map(col => (
                <div 
                  key={col.id}
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('tab', 'collections');
                    url.searchParams.set('id', col.id);
                    window.history.replaceState({}, '', url.toString());
                    setActiveTab('collections');
                  }}
                  className="p-4 rounded-xl border border-border-default bg-bg-secondary hover:border-border-hover shadow-xs cursor-pointer flex flex-col justify-between gap-3 min-h-[44px]"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <FolderHeart className="w-4 h-4 text-brand-primary" />
                      <span className="text-[10px] font-mono text-text-muted">{col.promptIds.length} items</span>
                    </div>
                    <h4 className="text-xs font-bold text-text-primary truncate">{col.name}</h4>
                    <p className="text-xs text-text-secondary line-clamp-2">{col.description}</p>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">
                    {col.isPrivate ? 'Private' : 'Public'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {profileTab === 'activity' && (
          <div className="max-w-2xl bg-bg-secondary border border-border-default rounded-xl p-5 space-y-3 shadow-xs">
            <h4 className="text-xs font-bold text-text-primary">Recent Platform Activity</h4>
            <div className="space-y-2">
              {activities.length === 0 ? (
                <div className="text-xs text-text-muted text-center py-6">No recent actions recorded.</div>
              ) : (
                activities.map(act => (
                  <div key={act.id} className="flex gap-2.5 text-xs border-b border-border-default pb-2 last:border-0 last:pb-0">
                    <div className="w-2 h-2 rounded-full bg-brand-primary shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-text-primary">{act.description}</p>
                      <span className="text-[10px] text-text-muted font-mono block mt-0.5">
                        {new Date(act.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {profileTab === 'edit' && (
          <div id="edit-profile-section" className="max-w-2xl bg-bg-secondary border border-border-default rounded-xl p-5 shadow-xs scroll-mt-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-default">
              <div>
                <h4 className="text-sm font-bold text-text-primary">Edit Profile</h4>
                <p className="text-xs text-text-muted">Update your public persona, avatar, and social links</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Account Settings</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div className="flex items-center gap-3 pb-3 border-b border-border-default">
                <UserAvatar 
                  src={croppedPreviewUrl || user.avatarUrl}
                  name={user.name} 
                  username={user.username} 
                  role={user.role}
                  isAdmin={user.role === 'Admin'}
                  size="lg" 
                  shape="rounded"
                  className="!w-14 !h-14 rounded-xl border border-border-default"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-border-subtle border border-border-default text-xs font-medium text-text-primary cursor-pointer transition-colors inline-block">
                      {isUploading ? 'Uploading...' : 'Choose & Crop Avatar'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        disabled={isUploading}
                        onChange={(e) => handleAvatarFileSelected(e.target.files?.[0] || null)}
                        className="hidden" 
                      />
                    </label>
                    {croppedPreviewUrl && (
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                        Cropped &amp; Ready
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-text-muted block font-mono">PNG, JPG, or WebP · 1:1 square crop</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Display Name</label>
                    <span className="text-[10px] text-text-muted font-mono tabular-nums">{name.length}/50</span>
                  </div>
                  <input 
                    type="text" 
                    required 
                    maxLength={50}
                    value={name}
                    onChange={(e) => { const v = e.target.value.slice(0, 50); setName(v); persistProfileDraftField('name', v); }}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary focus:border-brand-primary focus:outline-none"
                  />
                  <div className={`text-[10px] font-mono flex items-start gap-1.5 mt-1 px-2 py-1 rounded border ${
                    !nameQuota.allowed
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                      : 'bg-bg-tertiary border-border-default text-text-muted'
                  }`}>
                    <ShieldCheck className="w-3 h-3 shrink-0 mt-0.5 text-brand-primary" />
                    <div>
                      <span className="font-semibold">{nameQuota.allowed ? `Changes left this week: ${nameQuota.remaining}/2` : 'Weekly limit reached'}</span>
                      <p className="text-[9px] opacity-90">{nameQuota.message}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Username</label>
                    <span className="text-[10px] text-text-muted font-mono tabular-nums">{username.length}/30</span>
                  </div>
                  <input 
                    type="text" 
                    required 
                    maxLength={30}
                    value={username}
                    onChange={(e) => { const v = e.target.value.slice(0, 30); setUsername(v); persistProfileDraftField('username', v); }}
                    className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary font-mono focus:border-brand-primary focus:outline-none"
                  />
                  <div className={`text-[10px] font-mono flex items-start gap-1.5 mt-1 px-2 py-1 rounded border ${
                    !usernameQuota.allowed
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                      : 'bg-bg-tertiary border-border-default text-text-muted'
                  }`}>
                    <ShieldCheck className="w-3 h-3 shrink-0 mt-0.5 text-brand-primary" />
                    <div>
                      <span className="font-semibold">{usernameQuota.allowed ? `Changes left this week: ${usernameQuota.remaining}/2` : 'Weekly limit reached'}</span>
                      <p className="text-[9px] opacity-90">{usernameQuota.message}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">Bio</label>
                  <span className={`text-[10px] font-mono tabular-nums ${bio.length >= 240 ? 'text-brand-amber font-semibold' : 'text-text-muted'}`}>{bio.length}/250</span>
                </div>
                <textarea 
                  value={bio}
                  onChange={(e) => { const v = e.target.value.slice(0, 250); setBio(v); persistProfileDraftField('bio', v); }}
                  maxLength={250}
                  rows={2}
                  className="w-full bg-bg-tertiary border border-border-default rounded-lg p-2.5 text-xs text-text-primary focus:border-brand-primary focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center justify-between">
                    <span>GitHub Profile Link</span>
                    {github.trim() && !githubError && securityUtils.validateGithubUrl(github.trim()).isValid && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">✓ Valid</span>
                    )}
                  </label>
                  <input 
                    type="url" 
                    placeholder="https://github.com/username" 
                    value={github}
                    onChange={(e) => {
                      setGithub(e.target.value);
                      if (githubError) setGithubError(null);
                    }}
                    onBlur={() => {
                      if (github.trim()) {
                        const res = securityUtils.validateGithubUrl(github.trim());
                        setGithubError(res.isValid ? null : (res.error || 'Invalid GitHub URL'));
                      } else {
                        setGithubError(null);
                      }
                    }}
                    className={`w-full bg-bg-tertiary border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none font-mono ${
                      githubError ? 'border-rose-500 focus:border-rose-500' : 'border-border-default focus:border-brand-primary'
                    }`}
                  />
                  {githubError && (
                    <p className="text-[11px] text-rose-600 font-mono mt-0.5">{githubError}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center justify-between">
                    <span>Twitter / X Link</span>
                    {twitter.trim() && !twitterError && securityUtils.validateTwitterUrl(twitter.trim()).isValid && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">✓ Valid</span>
                    )}
                  </label>
                  <input 
                    type="url" 
                    placeholder="https://x.com/username" 
                    value={twitter}
                    onChange={(e) => {
                      setTwitter(e.target.value);
                      if (twitterError) setTwitterError(null);
                    }}
                    onBlur={() => {
                      if (twitter.trim()) {
                        const res = securityUtils.validateTwitterUrl(twitter.trim());
                        setTwitterError(res.isValid ? null : (res.error || 'Invalid Twitter/X URL'));
                      } else {
                        setTwitterError(null);
                      }
                    }}
                    className={`w-full bg-bg-tertiary border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none font-mono ${
                      twitterError ? 'border-rose-500 focus:border-rose-500' : 'border-border-default focus:border-brand-primary'
                    }`}
                  />
                  {twitterError && (
                    <p className="text-[11px] text-rose-600 font-mono mt-0.5">{twitterError}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center justify-between">
                    <span>LinkedIn Profile</span>
                    {linkedin.trim() && !linkedinError && securityUtils.validateLinkedinUrl(linkedin.trim()).isValid && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">✓ Valid</span>
                    )}
                  </label>
                  <input 
                    type="url" 
                    placeholder="https://linkedin.com/in/username" 
                    value={linkedin}
                    onChange={(e) => {
                      setLinkedin(e.target.value);
                      if (linkedinError) setLinkedinError(null);
                    }}
                    onBlur={() => {
                      if (linkedin.trim()) {
                        const res = securityUtils.validateLinkedinUrl(linkedin.trim());
                        setLinkedinError(res.isValid ? null : (res.error || 'Invalid LinkedIn URL'));
                      } else {
                        setLinkedinError(null);
                      }
                    }}
                    className={`w-full bg-bg-tertiary border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none font-mono ${
                      linkedinError ? 'border-rose-500 focus:border-rose-500' : 'border-border-default focus:border-brand-primary'
                    }`}
                  />
                  {linkedinError && (
                    <p className="text-[11px] text-rose-600 font-mono mt-0.5">{linkedinError}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono flex items-center justify-between">
                    <span>Personal Website</span>
                    {website.trim() && !websiteError && securityUtils.validateWebsiteUrl(website.trim()).isValid && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">✓ Valid</span>
                    )}
                  </label>
                  <input 
                    type="url" 
                    placeholder="https://yourdomain.com" 
                    value={website}
                    onChange={(e) => {
                      setWebsite(e.target.value);
                      if (websiteError) setWebsiteError(null);
                    }}
                    onBlur={() => {
                      if (website.trim()) {
                        const res = securityUtils.validateWebsiteUrl(website.trim());
                        setWebsiteError(res.isValid ? null : (res.error || 'Invalid Website URL'));
                      } else {
                        setWebsiteError(null);
                      }
                    }}
                    className={`w-full bg-bg-tertiary border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none font-mono ${
                      websiteError ? 'border-rose-500 focus:border-rose-500' : 'border-border-default focus:border-brand-primary'
                    }`}
                  />
                  {websiteError && (
                    <p className="text-[11px] text-rose-600 font-mono mt-0.5">{websiteError}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="h-7.5 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-medium cursor-pointer shadow-3xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isUploading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{isUploading ? 'Saving Profile...' : 'Save Profile'}</span>
              </button>
            </form>

            {/* Subscription & Plan Management */}
            <div className="bg-bg-secondary border border-border-default rounded-xl p-5 space-y-4 shadow-xs mt-6 text-left">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-display text-text-primary">Subscription &amp; Plan</h4>
                    <p className="text-xs text-text-muted">Manage your developer tier and billing status</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border ${
                    user.plan === 'pro' || user.hasPremiumAccess
                      ? 'bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border-brand-primary/30'
                      : 'bg-bg-tertiary text-text-secondary border-border-default'
                  }`}>
                    {user.plan === 'pro' || user.hasPremiumAccess ? 'Pro Member' : 'Free Explorer'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-tertiary/60 border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="font-semibold text-text-primary">
                    {user.plan === 'pro' || user.hasPremiumAccess ? 'Active Subscription' : 'Free Tier Account'}
                  </p>
                  <p className="text-text-muted text-[11px]">
                    {user.plan === 'pro' || user.hasPremiumAccess
                      ? user.proUntil ? `Renews / valid until ${new Date(user.proUntil).toLocaleDateString()}` : 'Active recurring developer plan'
                      : 'Basic model access, pay-as-you-go credit wallet'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {user.plan === 'pro' || user.hasPremiumAccess ? (
                    <button
                      type="button"
                      onClick={() => setIsCancelSubModalOpen(true)}
                      className="h-7.5 px-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Cancel Subscription
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('pricing')}
                      className="h-7.5 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-medium shadow-3xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Upgrade Plan</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Appearance & Theme Settings */}
            <div className="bg-bg-secondary border border-border-default rounded-xl p-5 space-y-4 shadow-xs mt-6 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-display text-text-primary">Appearance &amp; Theme</h4>
                  <p className="text-xs text-text-muted">Customize PromptHub display interface</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { id: 'system', label: 'System', icon: Laptop },
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'dark', label: 'Dark', icon: Moon },
                ].map(mode => {
                  const Icon = mode.icon;
                  const isSelected = theme === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setTheme(mode.id as any)}
                      className={`h-8 py-1.5 px-3 rounded-lg border flex items-center justify-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-primary/10 dark:bg-brand-primary/20 border-brand-primary text-brand-primary dark:text-[#41A2D9] shadow-3xs font-semibold'
                          : 'bg-bg-tertiary/70 border-border-default text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Developer Mode & Studio Controls - Permanently Under Development */}
            <div className="bg-bg-secondary border border-border-default rounded-xl p-5 space-y-4 shadow-xs mt-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold font-display text-text-primary">Developer Mode</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                          UNDER DEVELOPMENT
                        </span>
                      </div>
                      <p className="text-xs text-text-muted">Legacy studio tools undergoing architectural overhaul</p>
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed pt-1">
                    Developer Mode tools (Classic Studio IDE, Prompt Analyzer, and Model Arena) are completely disabled while being re-architected. All prompt creation, AI optimization, and testing workflows are now seamlessly unified in the <strong>Creation Workspace</strong>.
                  </p>
                </div>

                {/* Accessible Disabled Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={false}
                  aria-label="Developer Mode is currently disabled and under development"
                  disabled
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out opacity-50 bg-bg-tertiary border border-border-default items-center p-0.5"
                  title="Developer Mode is currently under development"
                >
                  <span className="sr-only">Developer Mode is disabled</span>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-text-muted/40 shadow-sm translate-x-0"
                  />
                </button>
              </div>

              <div className="pt-3 border-t border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Sparkles className="w-4 h-4 text-brand-primary shrink-0" />
                  <span>Use the Creation Workspace for full prompt testing, live execution, and multi-model completions.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('workspace')}
                  className="h-7.5 px-3 rounded-lg border border-border-default bg-bg-tertiary hover:bg-bg-secondary text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <span>Open Creation Workspace</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Danger Zone: Account Deletion */}
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10 p-5 space-y-3.5 mt-6 text-left">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold font-display text-rose-600 dark:text-rose-400">Danger Zone: Account Deletion</h4>
                    <p className="text-xs text-text-muted">Statutory Right to Erasure under DPDP Act 2023 &amp; GDPR</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmText('');
                    setIsDeleteAccountModalOpen(true);
                  }}
                  className="h-7.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium shadow-3xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account</span>
                </button>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                Permanently erase your account, developer username, private prompts, BYOK keys, and activity history. This action is irreversible and immediate.
              </p>
            </div>
          </div>
        )}

        {profileTab === 'billing' && (
          <ProfileBillingTab />
        )}
      </div>

      {/* Interactive Image Crop Modal */}
      <ImageCropModal
        isOpen={isCropOpen}
        onClose={() => setIsCropOpen(false)}
        imageFile={cropRawFile}
        aspectRatio={cropType === 'avatar' ? 1 : 3}
        title={cropType === 'avatar' ? 'Crop Profile Avatar (1:1)' : 'Crop Header Banner (3:1)'}
        onCropComplete={handleCropFinished}
      />

      {/* Followers & Following Modal */}
      {followersModalTab && (
        <FollowersModal
          isOpen={Boolean(followersModalTab)}
          onClose={() => setFollowersModalTab(null)}
          userId={user.id}
          userName={user.username || user.name}
          initialTab={followersModalTab}
          onSelectCreator={(creatorId) => {
            setFollowersModalTab(null);
            setViewingCreatorId(creatorId);
          }}
        />
      )}

      {/* Public Profile Preview Modal */}
      {isPublicPreviewOpen && (
        <CreatorProfileModal
          isOpen={isPublicPreviewOpen}
          creatorId={user.id}
          onClose={() => setIsPublicPreviewOpen(false)}
        />
      )}

      {/* Other Creator Public Profile Modal */}
      {viewingCreatorId && (
        <CreatorProfileModal
          isOpen={Boolean(viewingCreatorId)}
          creatorId={viewingCreatorId}
          onClose={() => setViewingCreatorId(null)}
        />
      )}

      {/* Cancel Subscription Modal */}
      {typeof document !== 'undefined' && isCancelSubModalOpen && createPortal(
        <div className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-bg-primary border border-border-default rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600">
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

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelSubModalOpen(false)}
                disabled={isCancellingSub}
                className="h-8 px-3 rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-medium transition-colors cursor-pointer"
              >
                Keep My Subscription
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelSub}
                disabled={isCancellingSub}
                className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-[750] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
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
                <li>All cloud files (Google Drive and Supabase Storage) will be permanently destroyed.</li>
                <li>Your client-side BYOK credential vault and offline storage will be completely purged.</li>
                <li>Any unspent promotional and paid wallet credits will be permanently surrendered.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary block">
                To confirm, please type <span className="font-mono text-rose-600 font-bold">DELETE</span> below:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-bg-secondary border border-border-default focus:border-rose-500 focus:outline-none text-xs font-mono text-text-primary"
              />
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
                onClick={handleConfirmDelete}
                disabled={deleteConfirmText.trim() !== 'DELETE' || isDeletingAccount}
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

export default ProfileView;
