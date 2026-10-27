import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { normalizeError } from '../utils/errorMessages';
import { getUserPlanTier } from '../config/billingConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Plus, 
  UserMinus, 
  Crown, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  Copy,
  Clock,
  Link2,
  Share2,
  CheckCircle2,
  Code2,
  Briefcase,
  Video,
  Globe,
  Sparkles
} from 'lucide-react';
import { PromptTeamIcon } from '../components/icons/PromptHubIcons';
import { TeamInviteService } from '../services/teamInviteService';
import type { TeamInvitation } from '../db/schema';
import { useTeamPermissions } from '../hooks/useTeamPermissions';
import type { TeamMemberRole } from '../utils/teamPermissions';

const COLLABORATION_TRACKS = [
  {
    role: 'Editor / Writer',
    icon: Edit2,
    color: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    description: 'Refines prompts for clarity, tone calibration, system instructions, and user documentation.',
  },
  {
    role: 'Coder / Developer',
    icon: Code2,
    color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    description: 'Implements API schemas, JSON output validation, function calling parameters, and agent tools.',
  },
  {
    role: 'Business / Marketing',
    icon: Briefcase,
    color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20',
    description: 'Crafts conversion copy, marketing campaigns, value propositions, and sales outreach sequences.',
  },
  {
    role: 'Video / Multimedia',
    icon: Video,
    color: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
    description: 'Builds storyboard descriptions, visual scenes, audio synthesis prompts, and multi-modal vision inputs.',
  },
  {
    role: 'Community / Lead',
    icon: Globe,
    color: 'text-teal-600 bg-teal-500/10 border-teal-500/20',
    description: 'Reviews prompt benchmarks in the Arena, curates public packs, and manages team knowledge vault.',
  },
];

export const TeamsView: React.FC = () => {
  const {
    user,
    teams,
    activeTeamId,
    setActiveTeamId,
    createTeam,
    updateTeam,
    deleteTeam,
    createTeamInviteLink,
    fetchPendingInvitations,
    revokeTeamInvite,
    removeTeamMember,
    updateTeamMemberRole,
    showToast,
    setActiveTab
  } = useApp();

  const userTier = getUserPlanTier(user);
  const myOwnedTeamsCount = teams.filter(t => t.ownerId === user?.id).length;
  const isTeamLimitReached = Boolean(user && user.role !== 'Admin' && myOwnedTeamsCount >= userTier.teamSlots);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  
  const [confirmRemoveMemberId, setConfirmRemoveMemberId] = useState<string | null>(null);
  const [confirmDeleteWorkspace, setConfirmDeleteWorkspace] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [teamName, setTeamName] = useState('');
  
  const [inviteRole, setInviteRole] = useState<TeamMemberRole>('editor');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [lastGeneratedLink, setLastGeneratedLink] = useState<string | null>(null);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => activeTeamId || teams[0]?.id || null);

  const activeTeam = teams.find(t => t.id === selectedTeamId) || teams[0];
  const memberCount = (activeTeam?.members || []).length;
  const isTeamFull = memberCount >= 4;

  // Active Invite Confirmation Modal
  // Field of Work & Essential Setup State
  const [fieldOfWork, setFieldOfWork] = useState(activeTeam?.fieldOfWork || '');
  const [primaryStack, setPrimaryStack] = useState(activeTeam?.primaryStack || '');
  const [workspacePurpose, setWorkspacePurpose] = useState(activeTeam?.description || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (activeTeam) {
      setFieldOfWork(activeTeam.fieldOfWork || '');
      setPrimaryStack(activeTeam.primaryStack || '');
      setWorkspacePurpose(activeTeam.description || '');
    }
  }, [activeTeam?.id, activeTeam?.fieldOfWork, activeTeam?.primaryStack, activeTeam?.description]);

  const handleSaveWorkspaceProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam) return;
    setIsSavingProfile(true);
    try {
      await updateTeam(activeTeam.id, {
        fieldOfWork: fieldOfWork.trim(),
        primaryStack: primaryStack.trim(),
        description: workspacePurpose.trim(),
      });
      showToast('Workspace profile and field of work updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update workspace profile.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [inviteSuccessModal, setInviteSuccessModal] = useState<{
    isOpen: boolean;
    inviteLink: string;
    role: string;
    teamName: string;
  } | null>(null);

  // Pending Invitations Roster
  const [pendingInvites, setPendingInvites] = useState<TeamInvitation[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const {
    allowedInviteRoles,
    getAllowedRolesForMember,
    canRemoveMember: checkCanRemoveMember,
  } = useTeamPermissions(activeTeam, user?.id);

  // Strictly eliminate 'owner' from allowed invite roles - ownership cannot be shared via invite links
  const sanitizedAllowedInviteRoles = allowedInviteRoles.filter(r => r !== 'owner');

  // Filter out any legacy owner invites from display
  const nonOwnerPendingInvites = pendingInvites.filter(i => (i.role || '').toLowerCase() !== 'owner');

  // Automatically keep inviteRole synchronized with allowedInviteRoles (defaulting to editor)
  useEffect(() => {
    if (sanitizedAllowedInviteRoles.length > 0 && !sanitizedAllowedInviteRoles.includes(inviteRole as any)) {
      setInviteRole(sanitizedAllowedInviteRoles[0] as TeamMemberRole);
    }
  }, [sanitizedAllowedInviteRoles, inviteRole]);

  const loadPendingInvites = useCallback(async (teamId: string) => {
    if (!teamId || !fetchPendingInvitations) return;
    setLoadingPending(true);
    try {
      const invites = await fetchPendingInvitations(teamId);
      setPendingInvites(invites || []);
    } catch {
      setPendingInvites([]);
    } finally {
      setLoadingPending(false);
    }
  }, [fetchPendingInvitations]);

  useEffect(() => {
    if (activeTeam?.id) {
      if (selectedTeamId !== activeTeam.id) {
        setSelectedTeamId(activeTeam.id);
      }
      loadPendingInvites(activeTeam.id);
    }
  }, [activeTeam?.id, selectedTeamId, loadPendingInvites]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = teamName.trim();
    if (!cleanName) return;

    if (cleanName.length < 2 || cleanName.length > 50) {
      showToast('Team workspace name must be between 2 and 50 characters.', 'error');
      return;
    }

    if (isTeamLimitReached) {
      showToast(`Your ${userTier.name} plan includes up to ${userTier.teamSlots} team workspace${userTier.teamSlots > 1 ? 's' : ''}. Upgrade to Starter (3), Pro (7), or Growth (15) to create more.`, 'info');
      setActiveTab('pricing');
      return;
    }

    try {
      const created = await createTeam(cleanName);
      setSelectedTeamId(created.id);
      setTeamName('');
      setShowCreateForm(false);
      showToast('Team workspace created successfully!', 'success');
    } catch (err: any) {
      const { userMessage } = normalizeError(err);
      showToast(userMessage, 'error');
    }
  };

  const handleGenerateLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTeamId || !activeTeam) return;

    if (isTeamFull) {
      showToast('This workspace has reached the maximum capacity of 4 members. You cannot invite more members.', 'error');
      return;
    }

    if ((inviteRole as string).toLowerCase() === 'owner') {
      showToast('Creating invite links for Owner is disabled. You can only invite Admins, Editors, or Viewers.', 'error');
      return;
    }

    setIsGeneratingLink(true);
    try {
      const result = await createTeamInviteLink(selectedTeamId, inviteRole);

      if (result && result.inviteLink) {
        setLastGeneratedLink(result.inviteLink);
        setInviteSuccessModal({
          isOpen: true,
          inviteLink: result.inviteLink,
          role: result.role,
          teamName: activeTeam.name,
        });

        // Automatically copy to clipboard for convenience
        await TeamInviteService.copyInviteLinkToClipboard(result.inviteLink);
        setCopiedToken('just-generated');
        setTimeout(() => setCopiedToken(null), 3000);
      }

      await loadPendingInvites(selectedTeamId);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate invitation link.', 'error');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async (link: string, tokenId: string) => {
    const success = await TeamInviteService.copyInviteLinkToClipboard(link);
    if (success) {
      setCopiedToken(tokenId);
      showToast('Invitation link copied to clipboard!', 'success');
      setTimeout(() => setCopiedToken(null), 2500);
    } else {
      showToast('Failed to copy link automatically. Please copy manually.', 'error');
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!selectedTeamId || !revokeTeamInvite) return;
    try {
      await revokeTeamInvite(inviteId, selectedTeamId);
      setConfirmRevokeId(null);
      await loadPendingInvites(selectedTeamId);
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke invite.', 'error');
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string, name: string) => {
    if (!removeTeamMember) return;
    try {
      await removeTeamMember(teamId, userId);
      setConfirmRemoveMemberId(null);
      showToast(`${name} has been removed from the workspace.`, 'info');
    } catch (err: any) {
      const { userMessage } = normalizeError(err);
      showToast(userMessage, 'error');
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameValue.trim() || !selectedTeamId) return;
    try {
      await updateTeam(selectedTeamId, { name: renameValue.trim() });
      setIsRenaming(false);
      showToast('Workspace renamed successfully!', 'success');
    } catch (err: any) {
      const { userMessage } = normalizeError(err);
      showToast(userMessage, 'error');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!selectedTeamId || !activeTeam) return;
    try {
      await deleteTeam(selectedTeamId);
      const remainingTeams = teams.filter(t => t.id !== selectedTeamId);
      setSelectedTeamId(remainingTeams[0]?.id || null);
      setIsRenaming(false);
      setConfirmDeleteWorkspace(false);
      showToast('Workspace deleted.', 'info');
    } catch (err: any) {
      const { userMessage } = normalizeError(err);
      showToast(userMessage, 'error');
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-bg-primary text-text-primary text-left select-text">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-default" data-tour="tour-team-header">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-text-primary tracking-tight flex items-center gap-2">
            <PromptTeamIcon size={24} variant="solid" className="text-brand-primary" />
            <span>Teams &amp; Workspaces</span>
          </h2>
          <p className="text-text-secondary text-xs mt-0.5">
            Collaborate on prompt engineering collections, review team audit logs, and manage workspace permissions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="text-[11px] font-mono text-text-muted px-2.5 py-1.5 bg-bg-secondary rounded-lg border border-border-default">
            {user?.role === 'Admin' ? 'Unlimited Workspaces' : `${myOwnedTeamsCount} / ${userTier.teamSlots} Workspaces (${userTier.name})`}
          </span>

          <button
            onClick={() => {
              if (isTeamLimitReached) {
                showToast(`Your ${userTier.name} plan includes up to ${userTier.teamSlots} team workspace${userTier.teamSlots > 1 ? 's' : ''}. Upgrade to Starter (3), Pro (7), or Growth (15) to create more.`, 'info');
                setActiveTab('pricing');
                return;
              }
              setShowCreateForm(prev => !prev);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto min-h-[44px] ${
              isTeamLimitReached
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-brand-primary hover:bg-brand-primary-hi text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isTeamLimitReached ? 'Upgrade for More' : 'Create Workspace'}</span>
          </button>
        </div>
      </div>

      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-secondary rounded-xl p-4 border border-border-default shadow-sm max-w-md space-y-3"
        >
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-text-primary">New Team Workspace</h4>
            <span className="text-[10px] text-text-muted font-mono tabular-nums">{teamName.length}/50</span>
          </div>
          <form onSubmit={handleCreateTeam} className="flex gap-2">
            <input
              type="text"
              required
              maxLength={50}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value.slice(0, 50))}
              placeholder="e.g. Core Engineering Team"
              className="flex-1 bg-white dark:bg-bg-tertiary border border-border-default hover:border-border-hover rounded-lg px-3 py-1.5 text-xs text-text-primary focus:border-brand-primary focus:outline-none min-h-[38px] shadow-2xs"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold cursor-pointer shadow-xs min-h-[38px]"
            >
              Create
            </button>
          </form>
        </motion.div>
      )}

      {/* Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Workspaces Selector list */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">My Workspaces ({teams.length})</h4>
          <div className="space-y-2">
            {teams.length === 0 ? (
              <div className="text-xs text-text-muted text-center py-8 border border-border-default border-dashed rounded-xl bg-bg-secondary">
                No active workspaces yet. Create one above.
              </div>
            ) : (
              teams.map(t => {
                const isActive = t.id === selectedTeamId;
                const tMemberCount = (t.members || []).length;
                return (
                  <div
                    key={t.id}
                    onClick={() => { 
                      setSelectedTeamId(t.id); 
                      setActiveTeamId(t.id);
                      setIsRenaming(false); 
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isActive 
                        ? 'bg-brand-primary-light border-brand-primary ring-1 ring-brand-primary/20' 
                        : 'bg-bg-secondary border-border-default hover:border-border-hover shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <PromptTeamIcon size={16} variant={isActive ? 'solid' : 'outline'} className={`shrink-0 ${isActive ? 'text-brand-primary' : 'text-text-muted'}`} />
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-text-primary truncate">
                          {t.name}
                        </h5>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-text-muted font-mono">
                            {tMemberCount}/4 members {tMemberCount >= 4 ? '· Full' : ''}
                          </span>
                          {t.fieldOfWork && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-primary/10 text-brand-primary font-medium border border-brand-primary/20 truncate max-w-[110px]">
                              {t.fieldOfWork}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Active Workspace Workspace details */}
        <div className="lg:col-span-2 space-y-4">
          {activeTeam ? (
            <div className="space-y-4">
              {/* Workspace Header Panel */}
              <div className="p-4 rounded-xl bg-bg-secondary border border-border-default shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  {isRenaming ? (
                    <form onSubmit={handleRenameSubmit} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        placeholder="Workspace name..."
                        className="bg-bg-tertiary border border-border-default rounded-lg px-2.5 py-1 text-xs text-text-primary focus:border-brand-primary focus:outline-none"
                      />
                      <button type="submit" className="p-1 text-brand-primary hover:bg-brand-primary/10 rounded cursor-pointer">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setIsRenaming(false)} className="p-1 text-text-muted hover:bg-bg-tertiary rounded cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-text-primary">{activeTeam.name}</h3>
                      {user && activeTeam.ownerId === user.id && (
                        <button
                          onClick={() => { setRenameValue(activeTeam.name); setIsRenaming(true); }}
                          className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-0.5"
                          title="Rename workspace"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-text-secondary mt-0.5">
                    Created on {new Date(activeTeam.createdAt || Date.now()).toLocaleDateString()} · {memberCount}/4 members {isTeamFull ? '(Full)' : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Primary CTA: Work Together in Workspace */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTeamId(activeTeam.id);
                      setActiveTab('workspace');
                      showToast(`Opening Workspace for ${activeTeam.name}`, 'success');
                    }}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[44px]"
                    title="Open collaborative Workspace"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Work Together in Workspace</span>
                  </button>

                  {user && activeTeam.ownerId === user.id && (
                    <div>
                      {confirmDeleteWorkspace ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-rose-600 font-semibold">Delete workspace?</span>
                          <button
                            onClick={handleDeleteWorkspace}
                            className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-semibold cursor-pointer min-h-[44px]"
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteWorkspace(false)}
                            className="px-2 py-1 bg-bg-tertiary border border-border-default text-text-secondary rounded text-[10px] font-semibold cursor-pointer min-h-[44px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteWorkspace(true)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border-default hover:bg-rose-50 text-text-muted hover:text-rose-600 text-xs font-medium transition-colors cursor-pointer min-h-[44px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Share Link & Member Roster Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Share Invite Link Box */}
                <div className="bg-bg-secondary rounded-2xl p-5 border border-border-default shadow-xs space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">Share Invite Link</h4>
                        <p className="text-[10px] text-text-muted">Invite team members with a 1-click link</p>
                      </div>
                    </div>
                  </div>

                  {allowedInviteRoles.length === 0 ? (
                    <div className="p-4 rounded-xl bg-bg-tertiary/60 border border-border-default space-y-2 text-center">
                      <Shield className="w-5 h-5 text-text-muted mx-auto" />
                      <p className="text-xs font-semibold text-text-primary">Read-Only Workspace Access</p>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        As a <span className="font-semibold text-text-primary uppercase">Viewer</span>, you have permission to view team prompts and run them in the IDE. Only Owners, Editors, and Admins can generate invitations.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {isTeamFull && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                            <Users className="w-4 h-4" />
                            <span>Team Full (4/4 Members)</span>
                          </div>
                          <p className="text-[11px] text-text-muted leading-relaxed">
                            This workspace has reached the maximum capacity of 4 members. You cannot invite additional members unless someone leaves or is removed.
                          </p>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                          Member Role &amp; Access Level
                        </label>
                        <select
                          value={inviteRole}
                          disabled={isTeamFull}
                          onChange={(e) => setInviteRole(e.target.value as any)}
                          className="w-full bg-white dark:bg-bg-tertiary border border-border-default hover:border-border-hover rounded-xl px-3 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer font-mono shadow-2xs min-h-[40px] disabled:opacity-50"
                        >
                          {sanitizedAllowedInviteRoles.map(r => {
                            let label = 'Viewer — Read & execute prompts in IDE';
                            if (r === 'editor') label = 'Editor — Create, edit & manage team prompts';
                            if (r === 'admin') label = 'Admin — Manage prompts & team members';
                            return (
                              <option key={r} value={r}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <button
                        type="button"
                        data-tour="tour-team-invite"
                        onClick={() => handleGenerateLink()}
                        disabled={isGeneratingLink || isTeamFull}
                        className="min-h-[44px] w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hi disabled:opacity-60 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        {isGeneratingLink ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Generating Secure Link...</span>
                          </>
                        ) : isTeamFull ? (
                          <>
                            <Users className="w-4 h-4" />
                            <span>Team Full (4/4 Members)</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="w-4 h-4" />
                            <span>Generate &amp; Copy Invite Link</span>
                          </>
                        )}
                      </button>

                    {lastGeneratedLink && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-bg-tertiary border border-border-default space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-semibold text-text-muted uppercase">Latest Invite Link</span>
                          <span className="text-[9px] font-mono text-brand-primary dark:text-[#41A2D9] bg-brand-primary/10 px-1.5 py-0.2 rounded border border-brand-primary/20">
                            Active (7 Days)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={lastGeneratedLink}
                            className="flex-1 bg-bg-primary border border-border-default rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-text-primary select-all focus:outline-none"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyLink(lastGeneratedLink, 'latest')}
                            className="px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold shadow-xs hover:bg-brand-primary-hi transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            {copiedToken === 'latest' || copiedToken === 'just-generated' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-text-muted leading-tight">
                          Share this link via Slack, WhatsApp, or Discord. Anyone who opens it can instantly accept and join.
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

                {/* Member Roster */}
                <div className="bg-bg-secondary rounded-2xl p-5 border border-border-default shadow-xs space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-bg-tertiary border border-border-default flex items-center justify-center text-text-secondary">
                        <Users className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-text-primary">Workspace Members</h4>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-default">
                      {memberCount}/4 {isTeamFull ? 'members (Full)' : memberCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  <div className="divide-y divide-border-default space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {(activeTeam.members || []).map((member, idx) => {
                      const isOwner = member.userId === activeTeam.ownerId;
                      const isCurrentUser = member.userId === user?.id || (member.name === 'Workspace Owner' && isOwner);
                      const displayName = (isCurrentUser && user?.name)
                        ? user.name
                        : (member.name && member.name !== 'Workspace Owner')
                          ? member.name
                          : (user?.name || user?.email?.split('@')[0] || 'Workspace Member');
                      const displayEmail = (isCurrentUser && user?.email)
                        ? user.email
                        : member.email || (isOwner ? (user?.email || 'Workspace Owner') : 'Workspace Member');
                      const displayAvatar = (isCurrentUser && user?.avatarUrl)
                        ? user.avatarUrl
                        : member.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(displayName)}`;

                      return (
                      <div key={member.userId || idx} className={`flex items-center justify-between pb-2.5 ${idx > 0 ? 'pt-2.5' : ''}`}>
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                          <img 
                            src={displayAvatar} 
                            alt={displayName} 
                            className="w-7 h-7 rounded-full object-cover border border-border-default bg-bg-tertiary shrink-0" 
                          />
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-semibold text-text-primary truncate">{displayName}</h5>
                            <span className="text-[10px] text-text-muted truncate block">{displayEmail}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {(() => {
                            const isTargetOwner = member.userId === activeTeam.ownerId;
                            const memberRole = (isTargetOwner ? 'owner' : (member.role || 'viewer')).toLowerCase();
                            const allowedRoles = getAllowedRolesForMember(member);
                            const canRemove = checkCanRemoveMember(member);

                            return (
                              <>
                                {allowedRoles.length > 0 ? (
                                  <select
                                    value={memberRole}
                                    onChange={async (e) => {
                                      try {
                                        await updateTeamMemberRole(activeTeam.id, member.userId, e.target.value.toLowerCase() as any);
                                        showToast(`Role updated to ${e.target.value.toUpperCase()}`, 'success');
                                      } catch (err: any) {
                                        showToast(err.message || 'Failed to update member role.', 'error');
                                      }
                                    }}
                                    className="text-[10px] font-mono font-semibold bg-bg-tertiary border border-border-default px-2 py-1 rounded-lg text-text-primary focus:outline-none cursor-pointer"
                                    aria-label={`Change role for ${member.name}`}
                                  >
                                    {!allowedRoles.includes(memberRole as any) && (
                                      <option value={memberRole}>
                                        {memberRole.charAt(0).toUpperCase() + memberRole.slice(1)}
                                      </option>
                                    )}
                                    {allowedRoles.map(r => (
                                      <option key={r} value={r}>
                                        {r.charAt(0).toUpperCase() + r.slice(1)}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-[10px] font-mono bg-bg-tertiary border border-border-default px-2 py-0.5 rounded-lg text-text-secondary flex items-center gap-1">
                                    {isTargetOwner ? (
                                      <Crown className="w-3 h-3 text-amber-500" />
                                    ) : (
                                      <Shield className="w-3 h-3 text-brand-primary" />
                                    )}
                                    <span>
                                      {isTargetOwner
                                        ? 'Owner'
                                        : (member.role?.charAt(0).toUpperCase() + member.role?.slice(1).toLowerCase())}
                                    </span>
                                  </span>
                                )}

                                {canRemove && selectedTeamId && (
                                  <div className="flex items-center gap-1">
                                    {confirmRemoveMemberId === member.userId ? (
                                      <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-1.5 py-0.5 rounded-lg">
                                        <span className="text-[9px] text-rose-600 dark:text-rose-400 font-semibold">Remove?</span>
                                        <button
                                          onClick={() => handleRemoveMember(selectedTeamId, member.userId, member.name)}
                                          className="px-1.5 py-0.5 bg-rose-600 text-white text-[8px] font-bold rounded cursor-pointer"
                                        >
                                          Yes
                                        </button>
                                        <button
                                          onClick={() => setConfirmRemoveMemberId(null)}
                                          className="px-1.5 py-0.5 bg-bg-tertiary text-text-secondary text-[8px] font-bold rounded cursor-pointer"
                                        >
                                          No
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setConfirmRemoveMemberId(member.userId)}
                                        className="p-1.5 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                        title="Remove member"
                                        aria-label={`Remove ${member.name}`}
                                      >
                                        <UserMinus className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              </div>

              {/* Workspace Profile & Field of Work Configuration Card */}
              <div className="bg-bg-secondary rounded-2xl p-5 border border-border-default shadow-xs space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-primary">Workspace Profile &amp; Field of Work</h4>
                      <p className="text-[10px] text-text-muted">Define your primary engineering domain, tech stack, and workspace purpose</p>
                    </div>
                  </div>
                  {activeTeam.fieldOfWork && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-semibold border border-brand-primary/20">
                      {activeTeam.fieldOfWork}
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveWorkspaceProfile} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                        Field of Work / Primary Domain
                      </label>
                      <select
                        value={fieldOfWork}
                        onChange={(e) => setFieldOfWork(e.target.value)}
                        className="w-full bg-white dark:bg-bg-tertiary border border-border-default hover:border-border-hover rounded-xl px-3 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none cursor-pointer min-h-[40px] shadow-2xs font-medium"
                      >
                        <option value="">Select Field of Work...</option>
                        <option value="Full-Stack Web Development">Full-Stack Web Development</option>
                        <option value="AI Prompt Engineering & LLMs">AI Prompt Engineering &amp; LLMs</option>
                        <option value="UI/UX & Frontend Architecture">UI/UX &amp; Frontend Architecture</option>
                        <option value="Data Science & Machine Learning">Data Science &amp; Machine Learning</option>
                        <option value="Mobile App Development">Mobile App Development (iOS &amp; Android)</option>
                        <option value="DevOps & Cloud Infrastructure">DevOps &amp; Cloud Infrastructure</option>
                        <option value="Product & Content Strategy">Product &amp; Content Strategy</option>
                        <option value="Security & Technical Auditing">Security &amp; Technical Auditing</option>
                        <option value="Agency & Client Studio">Agency &amp; Client Studio</option>
                        <option value="Custom Domain">Custom / Specialized Field</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                        Primary Tech Stack &amp; Tools
                      </label>
                      <input
                        type="text"
                        value={primaryStack}
                        onChange={(e) => setPrimaryStack(e.target.value)}
                        placeholder="e.g. React, TypeScript, Tailwind, Python, Vite"
                        className="w-full bg-white dark:bg-bg-tertiary border border-border-default hover:border-border-hover rounded-xl px-3 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none min-h-[40px] shadow-2xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                      Workspace Purpose &amp; Mission
                    </label>
                    <input
                      type="text"
                      value={workspacePurpose}
                      onChange={(e) => setWorkspacePurpose(e.target.value)}
                      placeholder="e.g. Collaborative prompt development and client website prototyping"
                      className="w-full bg-white dark:bg-bg-tertiary border border-border-default hover:border-border-hover rounded-xl px-3 py-2 text-xs text-text-primary focus:border-brand-primary focus:outline-none min-h-[40px] shadow-2xs"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi disabled:opacity-60 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSavingProfile ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Workspace Profile</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Pending Invitations Links Section */}
              <div className="bg-bg-secondary rounded-2xl p-5 border border-border-default shadow-xs space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                      <Link2 className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-text-primary">Active Shareable Invite Links</h4>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-default">
                    {loadingPending ? 'Loading...' : `${nonOwnerPendingInvites.length} active`}
                  </span>
                </div>

                {nonOwnerPendingInvites.length === 0 ? (
                  <div className="py-6 px-4 text-center rounded-xl bg-bg-tertiary/40 border border-border-default border-dashed space-y-1">
                    <p className="text-xs text-text-secondary">No active invite links.</p>
                    <p className="text-[10px] text-text-muted">
                      When you generate shareable links for teammates, they will appear here with 1-click copy and revoke options.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-default space-y-2">
                    {nonOwnerPendingInvites.map((invite) => {
                      const inviteLink = `${window.location.origin || 'https://prompthub.cloud'}/team-accept?token=${invite.token}`;

                      return (
                        <div key={invite.token || invite.id} className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-semibold text-text-primary">
                                Link for {invite.role.toUpperCase()}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-brand-primary/10 text-brand-primary dark:text-[#41A2D9] border border-brand-primary/20">
                                Active
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-text-muted">
                              <Clock className="w-3 h-3 text-text-muted" />
                              <span>Valid for 7 days</span>
                              <span>·</span>
                              <span>Created {new Date(invite.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <button
                              onClick={() => handleCopyLink(inviteLink, invite.token)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-bg-hover text-text-primary border border-border-default text-xs font-medium transition-colors cursor-pointer"
                              title="Copy invitation link"
                            >
                              {copiedToken === invite.token ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-600 font-semibold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Link</span>
                                </>
                              )}
                            </button>

                            {confirmRevokeId === invite.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2 py-1 rounded-lg">
                                <span className="text-[9px] text-rose-600 dark:text-rose-400 font-semibold">Revoke?</span>
                                <button
                                  onClick={() => handleRevokeInvite(invite.id || invite.token)}
                                  className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-bold rounded cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setConfirmRevokeId(null)}
                                  className="px-1.5 py-0.5 bg-bg-tertiary text-text-secondary text-[9px] font-bold rounded cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmRevokeId(invite.id)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Revoke invitation link"
                                aria-label="Revoke invitation link"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Team Collaborative Workspace Section */}
              <div className="bg-gradient-to-br from-bg-secondary via-bg-tertiary/60 to-brand-primary/5 rounded-2xl p-5 border border-brand-primary/20 shadow-xs space-y-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                        <span>Team Collaborative Workspace</span>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                          MAX 4 MEMBERS
                        </span>
                      </h4>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Work together with your {memberCount}/4 team members on shared multi-agent pipelines, Git branches, and code editors.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTeamId(activeTeam.id);
                      setActiveTab('workspace');
                      showToast(`Entering Workspace for ${activeTeam.name}`, 'success');
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold shadow-md shadow-brand-primary/20 transition-all cursor-pointer min-h-[44px] shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Launch Team Workspace</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border-default">
                  <div className="p-3 rounded-xl bg-bg-primary/60 border border-border-default space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-text-primary">
                      <Code2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Shared Code Repository</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Collaborate on centralized code files, unit tests, and prompts scoped to {activeTeam.name}.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-bg-primary/60 border border-border-default space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-text-primary">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Multi-Agent Swarm</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Orchestrate Planner, Coder, Reviewer, and Tester subagents that execute alongside your team.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-bg-primary/60 border border-border-default space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-text-primary">
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      <span>4-Member Worktrees</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Branch, diff, and review code concurrently without file lock contention or overwriting work.
                    </p>
                  </div>
                </div>
              </div>

              {/* Team Collaboration Tracks (Frontend.pdf Page 5 Spec) */}
              <div className="bg-bg-secondary rounded-2xl p-5 border border-border-default shadow-xs space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-primary">Team Domain Responsibilities</h4>
                      <p className="text-[10px] text-text-muted">Specialized tracks for multi-disciplinary prompt engineering</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full border border-border-default">
                    5 Specializations
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {COLLABORATION_TRACKS.map((track) => {
                    const Icon = track.icon;
                    return (
                      <div
                        key={track.role}
                        className="p-3 rounded-xl border border-border-default bg-bg-primary/50 flex flex-col justify-between gap-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${track.color} shrink-0`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-bold text-text-primary truncate">
                            {track.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-secondary leading-relaxed">
                          {track.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Audit Logs */}
              <div className="bg-bg-secondary rounded-2xl p-5 border border-border-default shadow-xs space-y-3 text-left">
                <h4 className="text-xs font-bold text-text-primary">Workspace Audit Logs</h4>
                <div className="divide-y divide-border-default max-h-[180px] overflow-y-auto">
                  {(activeTeam.auditLogs || []).length === 0 ? (
                    <div className="py-4 text-center text-xs text-text-muted">
                      No audit activity recorded yet.
                    </div>
                  ) : (
                    activeTeam.auditLogs.map(log => (
                      <div key={log.id} className="py-2 flex justify-between items-center text-xs">
                        <div className="flex gap-1.5">
                          <span className="font-semibold text-text-primary">{log.performedBy}</span>
                          <span className="text-text-secondary">{log.action}</span>
                        </div>
                        <span className="text-[10px] text-text-muted font-mono">
                          {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 border border-border-default border-dashed rounded-2xl bg-bg-secondary space-y-3">
              <PromptTeamIcon size={40} variant="outline" className="text-text-muted mx-auto" />
              <h4 className="text-sm font-bold text-text-primary font-display">No Team Workspace Selected</h4>
              <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed">
                Click a workspace from the list on the left to see members, active invite links, and audit history.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Invitation Ready Modal */}
      {typeof document !== 'undefined' && inviteSuccessModal && inviteSuccessModal.isOpen && createPortal(
        <AnimatePresence>
          <div
            className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setInviteSuccessModal(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-bg-secondary border border-border-default rounded-2xl shadow-2xl p-6 space-y-5 text-left relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setInviteSuccessModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary font-display">
                    Shareable Invitation Link Ready
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Collaborate in <strong className="text-text-primary">{inviteSuccessModal.teamName}</strong> with <strong className="text-text-primary">{inviteSuccessModal.role.toUpperCase()}</strong> permissions.
                  </p>
                </div>
              </div>

              {/* Success Banner */}
              <div className="p-3.5 rounded-xl border bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs">
                    Link created & copied to your clipboard!
                  </p>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    Share this link directly in Slack, Discord, WhatsApp, or email. The recipient can click to join instantly.
                  </p>
                </div>
              </div>

              {/* Shareable Link Box */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                  Shareable Invitation Link (Valid for 7 Days)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteSuccessModal.inviteLink}
                    className="flex-1 bg-bg-tertiary border border-border-default rounded-xl px-3 py-2.5 text-xs font-mono text-text-primary select-all focus:outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => handleCopyLink(inviteSuccessModal.inviteLink, 'modal')}
                    className="min-h-[40px] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    {copiedToken === 'modal' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end pt-2 border-t border-border-default">
                <button
                  onClick={() => setInviteSuccessModal(null)}
                  className="min-h-[40px] px-6 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hi text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
      </div>
    </div>
  );
};

export default TeamsView;
