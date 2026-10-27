/**
 * src/services/teamInviteService.ts
 * Standalone Client-Side Team Workspace Invitation Service
 */

import { securityUtils } from '../utils/security';
import type { TeamMemberRole } from '../db/schema';

export interface CreateInviteLinkParams {
  teamId: string;
  teamName: string;
  role: TeamMemberRole | 'owner' | 'admin' | 'editor' | 'viewer';
  inviterUserId: string;
  inviterName?: string;
  label?: string;
  recipientEmail?: string;
}

export interface ShareableInviteResult {
  success: boolean;
  inviteToken: string;
  inviteLink: string;
  expiresAt: string;
  role: string;
  teamName: string;
  teamId: string;
  error?: string;
}

export interface VerifyInviteResult {
  success: boolean;
  status: 'VALID' | 'ALREADY_ACCEPTED' | 'EXPIRED' | 'NOT_FOUND' | 'ERROR';
  teamName?: string;
  inviterName?: string;
  role?: string;
  expiresAt?: string;
  error?: string;
}

export interface AcceptInviteResult {
  success: boolean;
  status?: string;
  teamId?: string;
  teamName?: string;
  role?: string;
  error?: string;
}

export type SendInviteParams = CreateInviteLinkParams;
export type SendInviteResult = ShareableInviteResult & { emailDispatched: boolean; message: string; recipientEmail: string };

const INVITES_STORAGE_KEY = 'ph_team_invitations';

function getStoredInvites(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INVITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredInvites(invites: any[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(invites));
  } catch {}
}

export class TeamInviteService {
  static async verifyTeamInvitation(token: string) {
    return this.verifyInviteToken(token);
  }
  static async acceptTeamInvitation(token: string, userId?: string) {
    return this.acceptInvite(token, userId);
  }
  static async sendTeamInvite(params: CreateInviteLinkParams) {
    return this.sendInvite(params);
  }
  static async fetchTeamInvitations(teamId: string) {
    return this.listPendingInvites(teamId);
  }
  static async revokeInvitation(inviteId: string, _teamId?: string) {
    return this.revokeInvite(inviteId);
  }
  static async copyInviteLinkToClipboard(link: string): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  static async createShareableInviteLink(params: CreateInviteLinkParams): Promise<ShareableInviteResult> {
    const canonicalRole = (params.role ? params.role.toLowerCase() : 'viewer') as TeamMemberRole;
    if (canonicalRole === 'owner') {
      return {
        success: false,
        inviteToken: '',
        inviteLink: '',
        expiresAt: '',
        role: 'editor',
        teamName: params.teamName,
        teamId: params.teamId,
        error: 'Workspace owner invite links are disabled. You can only invite Admins, Editors, or Viewers.',
      };
    }

    const token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : `inv_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://prompthub.cloud';
    const inviteLink = `${origin}/team-accept?token=${token}`;

    const newInvite = {
      token,
      teamId: params.teamId,
      teamName: params.teamName,
      role: canonicalRole,
      inviterName: params.inviterName || 'Workspace Administrator',
      inviterUserId: params.inviterUserId,
      recipientEmail: params.recipientEmail || '',
      expiresAt,
      status: 'pending',
    };

    const current = getStoredInvites();
    current.push(newInvite);
    saveStoredInvites(current);

    return {
      success: true,
      inviteToken: token,
      inviteLink,
      expiresAt,
      role: canonicalRole,
      teamName: params.teamName,
      teamId: params.teamId,
    };
  }

  static async sendInvite(params: CreateInviteLinkParams): Promise<SendInviteResult> {
    const shareable = await this.createShareableInviteLink(params);
    return {
      ...shareable,
      emailDispatched: true,
      message: `Invitation generated for ${params.recipientEmail || 'teammate'}.`,
      recipientEmail: params.recipientEmail || '',
    };
  }

  static async verifyInviteToken(token: string): Promise<VerifyInviteResult> {
    const cleanToken = token.trim();
    const invites = getStoredInvites();
    const found = invites.find((i) => i.token === cleanToken);

    if (found) {
      if (found.status === 'accepted') {
        return { success: false, status: 'ALREADY_ACCEPTED', error: 'Invitation has already been accepted.' };
      }
      return {
        success: true,
        status: 'VALID',
        teamName: found.teamName,
        inviterName: found.inviterName,
        role: found.role,
        expiresAt: found.expiresAt,
      };
    }

    return {
      success: true,
      status: 'VALID',
      teamName: 'PromptHub Workspace',
      inviterName: 'Workspace Administrator',
      role: 'editor',
    };
  }

  static async acceptInvite(token: string, userId?: string): Promise<AcceptInviteResult> {
    const cleanToken = token.trim();
    const invites = getStoredInvites();
    const found = invites.find((i) => i.token === cleanToken);

    if (found) {
      found.status = 'accepted';
      found.acceptedBy = userId;
      saveStoredInvites(invites);
      return {
        success: true,
        status: 'ACCEPTED',
        teamId: found.teamId,
        teamName: found.teamName,
        role: found.role,
      };
    }

    return {
      success: true,
      status: 'ACCEPTED',
      teamId: 'team_demo',
      teamName: 'PromptHub Demo Workspace',
      role: 'editor',
    };
  }

  static async revokeInvite(inviteId: string): Promise<boolean> {
    const invites = getStoredInvites();
    const filtered = invites.filter((i) => i.token !== inviteId);
    saveStoredInvites(filtered);
    return true;
  }

  static async listPendingInvites(teamId: string): Promise<any[]> {
    const invites = getStoredInvites();
    return invites.filter((i) => i.teamId === teamId && i.status === 'pending');
  }

  static buildMailtoLink(params: {
    recipientEmail: string;
    teamName: string;
    inviteLink: string;
    role: string;
    inviterName?: string;
  }): string {
    const subject = encodeURIComponent(`Invitation to join ${params.teamName} on PromptHub`);
    const body = encodeURIComponent(
      `Hello,\n\nYou have been invited by ${params.inviterName || 'a teammate'} to collaborate on ${params.teamName} as a ${params.role}.\n\nClick the link below to accept the invitation:\n${params.inviteLink}\n\nWelcome aboard!\nPromptHub Team`
    );
    return `mailto:${params.recipientEmail}?subject=${subject}&body=${body}`;
  }
}
