// Organization & Team Data Access Repository — Standalone Client & Local Storage Mode
// Zero database queries, zero external network requests
import type { Team, TeamMember } from '../db/schema';
import { logger } from '../utils/logger';
import { securityUtils } from '../utils/security';

const LOCAL_TEAMS_KEY = 'prompthub_local_teams';

const DEFAULT_MOCK_TEAMS: Team[] = [
  {
    id: 'team-core-engineering',
    name: 'Core Prompt Engineering',
    description: 'Enterprise prompt architecture, evaluation, and design system templates.',
    ownerId: '00000000-0000-4000-a000-000000000001',
    membersCount: 4,
    planTier: 'Growth',
    fieldOfWork: 'Software Engineering',
    primaryStack: 'React 19 + TypeScript',
    industry: 'AI Developer Tooling',
    createdAt: '2025-01-10T00:00:00.000Z',
    collectionIds: [],
    auditLogs: [],
    members: [
      {
        id: 'member-01',
        userId: '00000000-0000-4000-a000-000000000001',
        name: 'Alex Rivera',
        email: 'developer@prompthub.dev',
        role: 'owner',
        avatarUrl: '/admin-avatar.png',
        joinedAt: '2025-01-10T00:00:00.000Z',
      },
      {
        id: 'member-02',
        userId: '00000000-0000-4000-a000-000000000002',
        name: 'Sarah Chen',
        email: 'sarah.chen@prompthub.dev',
        role: 'editor',
        avatarUrl: '/admin-avatar.png',
        joinedAt: '2025-01-15T00:00:00.000Z',
      },
      {
        id: 'member-03',
        userId: '00000000-0000-4000-a000-000000000003',
        name: 'Marcus Vance',
        email: 'marcus.v@prompthub.dev',
        role: 'viewer',
        avatarUrl: '/admin-avatar.png',
        joinedAt: '2025-01-20T00:00:00.000Z',
      },
    ],
  },
];

function getLocalTeams(): Team[] {
  if (typeof window === 'undefined') return DEFAULT_MOCK_TEAMS;
  try {
    const raw = localStorage.getItem(LOCAL_TEAMS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_TEAMS_KEY, JSON.stringify(DEFAULT_MOCK_TEAMS));
      return DEFAULT_MOCK_TEAMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_MOCK_TEAMS;
  } catch {
    return DEFAULT_MOCK_TEAMS;
  }
}

function saveLocalTeams(teams: Team[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_TEAMS_KEY, JSON.stringify(teams));
  } catch {}
}

export class OrgRepository {
  static async getTeams(_userId?: string): Promise<Team[]> {
    return getLocalTeams();
  }

  static async getTeamById(teamId: string): Promise<Team | null> {
    const teams = getLocalTeams();
    return teams.find(t => t.id === teamId) || null;
  }

  static async createTeam(data: {
    name: string;
    description?: string;
    fieldOfWork?: string;
    primaryStack?: string;
    industry?: string;
    ownerId?: string;
    ownerEmail?: string;
    ownerName?: string;
  }): Promise<Team> {
    const teamId = securityUtils.generateUUID();
    const newTeam: Team = {
      id: teamId,
      name: data.name,
      description: data.description || '',
      fieldOfWork: data.fieldOfWork || '',
      primaryStack: data.primaryStack || '',
      industry: data.industry || '',
      ownerId: data.ownerId || '00000000-0000-4000-a000-000000000001',
      membersCount: 1,
      planTier: 'Starter',
      createdAt: new Date().toISOString(),
      collectionIds: [],
      auditLogs: [],
      members: [
        {
          id: `mem_${Date.now()}`,
          userId: data.ownerId || '00000000-0000-4000-a000-000000000001',
          name: data.ownerName || 'Demo Developer',
          email: data.ownerEmail || 'developer@prompthub.dev',
          role: 'owner',
          avatarUrl: '/admin-avatar.png',
          joinedAt: new Date().toISOString(),
        },
      ],
    };

    const teams = getLocalTeams();
    saveLocalTeams([newTeam, ...teams]);
    logger.info(`[OrgRepository] Created team: ${teamId}`);
    return newTeam;
  }

  static async updateTeam(teamId: string, updates: Partial<Team>): Promise<void> {
    const teams = getLocalTeams();
    saveLocalTeams(teams.map(t => (t.id === teamId ? { ...t, ...updates } : t)));
  }

  static async deleteTeam(teamId: string): Promise<void> {
    const teams = getLocalTeams();
    saveLocalTeams(teams.filter(t => t.id !== teamId));
  }

  static async addTeamMember(teamId: string, member: TeamMember): Promise<void> {
    const teams = getLocalTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const members = team.members || [];
    if (!members.some(m => m.userId === member.userId || m.email === member.email)) {
      team.members = [...members, member];
      team.membersCount = team.members.length;
      saveLocalTeams(teams);
    }
  }

  static async updateTeamMemberRole(teamId: string, userId: string, newRole: string): Promise<void> {
    const teams = getLocalTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team || !team.members) return;

    team.members = team.members.map(m =>
      m.userId === userId ? { ...m, role: newRole as TeamMember['role'] } : m
    );
    saveLocalTeams(teams);
  }

  static async removeTeamMember(teamId: string, userId: string): Promise<void> {
    const teams = getLocalTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team || !team.members) return;

    team.members = team.members.filter(m => m.userId !== userId);
    team.membersCount = team.members.length;
    saveLocalTeams(teams);
  }
}
