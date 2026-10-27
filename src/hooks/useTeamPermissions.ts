/**
 * src/hooks/useTeamPermissions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * React Hook providing permission checks and capability flags for the active team.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo } from 'react';
import type { Team, TeamMember, TeamMemberRole } from '../db/schema';
import {
  canTeamAction,
  getAllowedInviteRoles,
  getAllowedAssignableRoles,
  canRemoveMember as checkCanRemoveMember,
  normalizeTeamRole,
  type TeamAction,
} from '../utils/teamPermissions';

export interface TeamPermissionsHook {
  userRole: TeamMemberRole | null;
  isOwner: boolean;
  isEditor: boolean;
  isAdmin: boolean;
  isViewer: boolean;
  can: (action: TeamAction, targetRole?: TeamMemberRole | string) => boolean;
  canCreatePrompt: boolean;
  canEditPrompt: boolean;
  canDeletePrompt: boolean;
  canCreateCollection: boolean;
  canEditCollection: boolean;
  canDeleteCollection: boolean;
  canUsePrompt: boolean;
  canUseIDE: boolean;
  canInviteAny: boolean;
  canInviteRole: (role: TeamMemberRole | string) => boolean;
  allowedInviteRoles: TeamMemberRole[];
  getAllowedRolesForMember: (targetMember: TeamMember) => TeamMemberRole[];
  canRemoveMember: (targetMember: TeamMember) => boolean;
}

export function useTeamPermissions(
  team: Team | undefined | null,
  currentUserId: string | undefined | null
): TeamPermissionsHook {
  const userRole = useMemo<TeamMemberRole | null>(() => {
    if (!team || !currentUserId) return null;

    // Check workspace owner first
    if (team.ownerId === currentUserId) return 'owner';

    // Check members roster
    const member = (team.members || []).find(m => m.userId === currentUserId);
    if (member && member.role) {
      return normalizeTeamRole(member.role);
    }

    return null;
  }, [team, currentUserId]);

  const isOwner = userRole === 'owner';
  const isEditor = userRole === 'editor';
  const isAdmin = userRole === 'admin';
  const isViewer = userRole === 'viewer';

  const can = useMemo(() => {
    return (action: TeamAction, targetRole?: TeamMemberRole | string) => {
      return canTeamAction(userRole, action, targetRole);
    };
  }, [userRole]);

  const allowedInviteRoles = useMemo(() => {
    return getAllowedInviteRoles(userRole);
  }, [userRole]);

  const canCreatePrompt = can('CREATE_PROMPT');
  const canEditPrompt = can('EDIT_PROMPT');
  const canDeletePrompt = can('DELETE_PROMPT');
  const canCreateCollection = can('CREATE_COLLECTION');
  const canEditCollection = can('EDIT_COLLECTION');
  const canDeleteCollection = can('DELETE_COLLECTION');
  const canUsePrompt = can('USE_PROMPT');
  const canUseIDE = can('USE_IDE');
  const canInviteAny = allowedInviteRoles.length > 0;

  const canInviteRole = useMemo(() => {
    return (role: TeamMemberRole | string) => {
      const norm = normalizeTeamRole(role);
      return norm ? allowedInviteRoles.includes(norm) : false;
    };
  }, [allowedInviteRoles]);

  const getAllowedRolesForMember = useMemo(() => {
    return (targetMember: TeamMember): TeamMemberRole[] => {
      if (!userRole) return [];
      const isTargetOwner = targetMember.userId === team?.ownerId;
      const targetRole = isTargetOwner ? 'owner' : (targetMember.role || 'viewer');
      return getAllowedAssignableRoles(userRole, targetRole);
    };
  }, [userRole, team?.ownerId]);

  const canRemoveMember = useMemo(() => {
    return (targetMember: TeamMember): boolean => {
      if (!userRole) return false;
      const isSelf = targetMember.userId === currentUserId;
      const isTargetOwner = targetMember.userId === team?.ownerId;
      const targetRole = isTargetOwner ? 'owner' : (targetMember.role || 'viewer');
      return checkCanRemoveMember(userRole, targetRole, isSelf);
    };
  }, [userRole, currentUserId, team?.ownerId]);

  return {
    userRole,
    isOwner,
    isEditor,
    isAdmin,
    isViewer,
    can,
    canCreatePrompt,
    canEditPrompt,
    canDeletePrompt,
    canCreateCollection,
    canEditCollection,
    canDeleteCollection,
    canUsePrompt,
    canUseIDE,
    canInviteAny,
    canInviteRole,
    allowedInviteRoles,
    getAllowedRolesForMember,
    canRemoveMember,
  };
}
