/**
 * src/utils/teamPermissions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Team Role-Based Access Control (RBAC) Permission Engine.
 *
 * Implements the canonical 4-role model:
 *   1. OWNER  — Full team control, cannot remove Owner.
 *   2. EDITOR — Operational + member management, cannot remove Owner or Editor.
 *   3. ADMIN  — Operational usage + Viewer management only.
 *   4. VIEWER — Read/use-only team access.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type TeamMemberRole = 'owner' | 'editor' | 'admin' | 'viewer';

export type TeamAction =
  | 'VIEW_TEAM'
  | 'USE_PROMPT'
  | 'USE_IDE'
  | 'CREATE_PROMPT'
  | 'EDIT_PROMPT'
  | 'DELETE_PROMPT'
  | 'CREATE_COLLECTION'
  | 'EDIT_COLLECTION'
  | 'DELETE_COLLECTION'
  | 'ANALYZE'
  | 'OPTIMIZE'
  | 'ARENA'
  | 'CHANGE_ROLE'
  | 'INVITE_OWNER'
  | 'INVITE_EDITOR'
  | 'INVITE_ADMIN'
  | 'INVITE_VIEWER'
  | 'INVITE_MEMBER'
  | 'REMOVE_OWNER'
  | 'REMOVE_EDITOR'
  | 'REMOVE_ADMIN'
  | 'REMOVE_VIEWER'
  | 'REMOVE_MEMBER';

export const MAX_TEAM_MEMBERS = 4;

export const CANONICAL_TEAM_ROLES: readonly TeamMemberRole[] = ['owner', 'editor', 'admin', 'viewer'] as const;

/**
 * Normalizes any role string to canonical lowercase TeamMemberRole.
 */
export function normalizeTeamRole(rawRole: string | undefined | null): TeamMemberRole | null {
  if (!rawRole) return null;
  const clean = rawRole.trim().toLowerCase();
  if (clean === 'owner') return 'owner';
  if (clean === 'editor') return 'editor';
  if (clean === 'admin') return 'admin';
  if (clean === 'viewer') return 'viewer';
  // Legacy aliases
  if (clean === 'member' || clean === 'lead' || clean === 'writer') return 'editor';
  return null;
}

/**
 * Evaluates whether a role can perform a specific team action.
 *
 * @param role The caller's role in the workspace
 * @param action The requested action
 * @param targetRole The target role when evaluating role-change, invite, or member removal
 */
export function canTeamAction(
  role: TeamMemberRole | string | undefined | null,
  action: TeamAction,
  targetRole?: TeamMemberRole | string | null
): boolean {
  const normRole = normalizeTeamRole(role);
  if (!normRole) return false;

  const normTarget = normalizeTeamRole(targetRole);

  switch (action) {
    // ── READ / USE OPERATIONS ───────────────────────────────────────────────
    // All 4 roles can view the team, use prompts, and run the IDE
    case 'VIEW_TEAM':
    case 'USE_PROMPT':
    case 'USE_IDE':
    case 'ANALYZE':
    case 'OPTIMIZE':
    case 'ARENA':
      return true;

    // ── MUTATIONS: PROMPTS & COLLECTIONS ────────────────────────────────────
    // Owner, Editor, Admin can create/edit/delete; Viewer CANNOT
    case 'CREATE_PROMPT':
    case 'EDIT_PROMPT':
    case 'DELETE_PROMPT':
    case 'CREATE_COLLECTION':
    case 'EDIT_COLLECTION':
    case 'DELETE_COLLECTION':
      return normRole === 'owner' || normRole === 'editor' || normRole === 'admin';

    // ── INVITATIONS ─────────────────────────────────────────────────────────
    // Strictly disable Owner invite links: Workspace ownership cannot be shared via invite link
    case 'INVITE_OWNER':
      return false;

    case 'INVITE_EDITOR':
      return normRole === 'owner';

    case 'INVITE_ADMIN':
      return normRole === 'owner' || normRole === 'editor';

    case 'INVITE_VIEWER':
      return normRole === 'owner' || normRole === 'editor' || normRole === 'admin';

    case 'INVITE_MEMBER':
      if (normTarget === 'owner') return false;
      if (normTarget === 'editor') return normRole === 'owner';
      if (normTarget === 'admin') return normRole === 'owner' || normRole === 'editor';
      if (normTarget === 'viewer') return normRole === 'owner' || normRole === 'editor' || normRole === 'admin';
      return normRole === 'owner' || normRole === 'editor' || normRole === 'admin';

    // ── MEMBER REMOVAL ──────────────────────────────────────────────────────
    // Protected: NO ONE can remove Owner or Editor
    case 'REMOVE_OWNER':
      return false;

    case 'REMOVE_EDITOR':
      return false;

    // Admin can be removed by Owner and Editor ONLY
    case 'REMOVE_ADMIN':
      return normRole === 'owner' || normRole === 'editor';

    // Viewer can be removed by Owner, Editor, and Admin
    case 'REMOVE_VIEWER':
      return normRole === 'owner' || normRole === 'editor' || normRole === 'admin';

    case 'REMOVE_MEMBER':
      if (normTarget === 'owner') return false;
      if (normTarget === 'editor') return false;
      if (normTarget === 'admin') return normRole === 'owner' || normRole === 'editor';
      if (normTarget === 'viewer') return normRole === 'owner' || normRole === 'editor' || normRole === 'admin';
      return false;

    // ── ROLE CHANGE ─────────────────────────────────────────────────────────
    case 'CHANGE_ROLE':
      if (normRole === 'owner') {
        // Owner cannot demote itself; can assign editor, admin, viewer
        return normTarget === 'editor' || normTarget === 'admin' || normTarget === 'viewer';
      }
      if (normRole === 'editor') {
        // Editor cannot change to owner or editor; can only assign admin or viewer
        return normTarget === 'admin' || normTarget === 'viewer';
      }
      // Admin and Viewer cannot change roles
      return false;

    default:
      return false;
  }
}

/**
 * Returns the list of roles the caller is allowed to invite.
 * Strictly excludes 'owner' - invite links are only allowed for Editor, Admin, and Viewer.
 */
export function getAllowedInviteRoles(callerRole: TeamMemberRole | string | undefined | null): TeamMemberRole[] {
  const normRole = normalizeTeamRole(callerRole);
  if (!normRole) return [];

  if (normRole === 'owner') {
    return ['editor', 'admin', 'viewer'];
  }
  if (normRole === 'editor') {
    return ['admin', 'viewer'];
  }
  if (normRole === 'admin') {
    return ['viewer'];
  }
  return [];
}

/**
 * Returns the list of roles the caller is allowed to assign to a specific member.
 */
export function getAllowedAssignableRoles(
  callerRole: TeamMemberRole | string | undefined | null,
  targetCurrentRole?: TeamMemberRole | string | null
): TeamMemberRole[] {
  const normCaller = normalizeTeamRole(callerRole);
  const normTarget = normalizeTeamRole(targetCurrentRole);
  if (!normCaller || !normTarget) return [];

  // Owner cannot be modified by anyone
  if (normTarget === 'owner') return [];

  if (normCaller === 'owner') {
    // Owner can change any non-owner member into editor, admin, or viewer
    return ['editor', 'admin', 'viewer'];
  }

  if (normCaller === 'editor') {
    // Editor cannot modify another editor or owner
    if (normTarget === 'editor') return [];
    // Editor can only reassign to admin or viewer
    return ['admin', 'viewer'];
  }

  // Admin and Viewer cannot change any roles
  return [];
}

/**
 * Evaluates whether caller can remove a target member.
 */
export function canRemoveMember(
  callerRole: TeamMemberRole | string | undefined | null,
  targetRole: TeamMemberRole | string | null,
  isSelf = false
): boolean {
  const normCaller = normalizeTeamRole(callerRole);
  const normTarget = normalizeTeamRole(targetRole);
  if (!normCaller || !normTarget) return false;

  // Self-removal (leaving team)
  if (isSelf) {
    // Owner cannot leave without transferring ownership
    if (normCaller === 'owner') return false;
    return true;
  }

  // Target is Owner: NO ONE can remove Owner
  if (normTarget === 'owner') return false;

  // Target is Editor: NO ONE can remove Editor (neither Owner nor another Editor nor Admin)
  if (normTarget === 'editor') return false;

  // Target is Admin: Owner and Editor can remove
  if (normTarget === 'admin') {
    return normCaller === 'owner' || normCaller === 'editor';
  }

  // Target is Viewer: Owner, Editor, and Admin can remove
  if (normTarget === 'viewer') {
    return normCaller === 'owner' || normCaller === 'editor' || normCaller === 'admin';
  }

  return false;
}
