import { randomUUID } from 'node:crypto';
import { prisma, testPrismaConnection } from '../database/prisma.js';
import { AuthRepository } from './auth.repository.js';
import { AppError } from '../utils/response.js';

export interface TeamMemberEntity {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: 'owner' | 'lead' | 'analyst' | 'viewer';
  joinedAt: Date;
}

export interface TeamEntity {
  id: string;
  name: string;
  description?: string | null;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  members: TeamMemberEntity[];
  createdAt: Date;
  updatedAt: Date;
}

// In-memory persistent fallback store for development, staging without DB, and unit tests
const localTeams = new Map<string, TeamEntity>([
  [
    'team_default_gov',
    {
      id: 'team_default_gov',
      name: 'فريق التخطيط الإقليمي الموحد - وزارة التخطيط',
      description: 'مساحة العمل التعاونية المركزية لمحللي التنمية الإقليمية ومتابعة مؤشرات المحافظات.',
      creatorId: 'usr_admin',
      creatorName: 'م. خالد عبد الرحمن',
      creatorEmail: 'admin@decidix.gov',
      members: [
        {
          id: 'mem_1',
          teamId: 'team_default_gov',
          userId: 'usr_admin',
          userName: 'م. خالد عبد الرحمن',
          userEmail: 'admin@decidix.gov',
          role: 'owner',
          joinedAt: new Date('2026-01-15T10:00:00Z'),
        },
        {
          id: 'mem_2',
          teamId: 'team_default_gov',
          userId: 'usr_analyst_1',
          userName: 'د. سارة المنشاوي',
          userEmail: 'analyst@decidix.gov',
          role: 'analyst',
          joinedAt: new Date('2026-02-01T12:00:00Z'),
        },
      ],
      createdAt: new Date('2026-01-15T10:00:00Z'),
      updatedAt: new Date('2026-02-01T12:00:00Z'),
    },
  ],
]);

export class TeamRepository {
  /**
   * Find all teams where user is either the creator or a member
   */
  static async findUserTeams(userId: string): Promise<TeamEntity[]> {
    const isDbReady = await testPrismaConnection();

    if (isDbReady) {
      try {
        // If a Team model exists in Prisma schema, query it; otherwise fall back to memory
        if ((prisma as any).team) {
          const teams = await (prisma as any).team.findMany({
            where: {
              OR: [
                { creatorId: userId },
                { members: { some: { userId } } },
              ],
            },
            include: { members: true },
            orderBy: { createdAt: 'desc' },
          });
          return teams;
        }
      } catch {
        // Fall back gracefully to memory
      }
    }

    const matchingTeams: TeamEntity[] = [];
    for (const team of localTeams.values()) {
      const isCreator = team.creatorId === userId;
      const isMember = team.members.some((m) => m.userId === userId || m.userEmail === userId);
      if (isCreator || isMember) {
        matchingTeams.push(JSON.parse(JSON.stringify(team)));
      }
    }
    return matchingTeams;
  }

  /**
   * Find a team by its ID
   */
  static async findById(teamId: string): Promise<TeamEntity | null> {
    const isDbReady = await testPrismaConnection();

    if (isDbReady) {
      try {
        if ((prisma as any).team) {
          const team = await (prisma as any).team.findUnique({
            where: { id: teamId },
            include: { members: true },
          });
          if (team) return team;
        }
      } catch {
        // Fall back gracefully
      }
    }

    const team = localTeams.get(teamId);
    return team ? JSON.parse(JSON.stringify(team)) : null;
  }

  /**
   * Create a new team and add creator as owner
   */
  static async createTeam(input: {
    name: string;
    description?: string;
    creatorId: string;
    creatorName?: string;
    creatorEmail?: string;
  }): Promise<TeamEntity> {
    const teamId = `team_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date();

    let creatorName = input.creatorName;
    let creatorEmail = input.creatorEmail;

    // Attempt to lookup creator user details if missing
    if (!creatorName || !creatorEmail) {
      try {
        const creatorUser = await AuthRepository.findById(input.creatorId);
        if (creatorUser) {
          creatorName = creatorName || creatorUser.name || creatorUser.arabic_name || 'Team Owner';
          creatorEmail = creatorEmail || creatorUser.email;
        }
      } catch {
        // Non-blocking
      }
    }

    creatorName = creatorName || 'Team Owner';
    creatorEmail = creatorEmail || `${input.creatorId}@decidix.gov`;

    const ownerMember: TeamMemberEntity = {
      id: `mem_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      teamId,
      userId: input.creatorId,
      userName: creatorName,
      userEmail: creatorEmail,
      role: 'owner',
      joinedAt: now,
    };

    const newTeam: TeamEntity = {
      id: teamId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      creatorId: input.creatorId,
      creatorName,
      creatorEmail,
      members: [ownerMember],
      createdAt: now,
      updatedAt: now,
    };

    const isDbReady = await testPrismaConnection();
    if (isDbReady) {
      try {
        if ((prisma as any).team) {
          const created = await (prisma as any).team.create({
            data: {
              id: newTeam.id,
              name: newTeam.name,
              description: newTeam.description,
              creatorId: newTeam.creatorId,
              creatorName: newTeam.creatorName,
              creatorEmail: newTeam.creatorEmail,
              members: {
                create: {
                  id: ownerMember.id,
                  userId: ownerMember.userId,
                  userName: ownerMember.userName,
                  userEmail: ownerMember.userEmail,
                  role: ownerMember.role,
                },
              },
            },
            include: { members: true },
          });
          return created;
        }
      } catch {
        // Fall back to memory
      }
    }

    localTeams.set(teamId, newTeam);
    return JSON.parse(JSON.stringify(newTeam));
  }

  /**
   * Add a member to an existing team
   */
  static async addMember(
    teamId: string,
    memberInput: {
      userIdOrEmail: string;
      role?: 'owner' | 'lead' | 'analyst' | 'viewer';
    }
  ): Promise<TeamMemberEntity> {
    const team = await this.findById(teamId);
    if (!team) {
      throw AppError.notFound('Team not found', 'TEAM_NOT_FOUND');
    }

    const query = memberInput.userIdOrEmail.trim().toLowerCase();
    let targetUser = await AuthRepository.findById(query).catch(() => null);
    if (!targetUser) {
      targetUser = await AuthRepository.findByEmail(query).catch(() => null);
    }

    const targetUserId = targetUser ? targetUser.id : memberInput.userIdOrEmail.trim();
    const targetUserName = targetUser
      ? (targetUser.name || targetUser.arabic_name || targetUser.email.split('@')[0])
      : (memberInput.userIdOrEmail.includes('@')
          ? memberInput.userIdOrEmail.split('@')[0]
          : `زميل (${memberInput.userIdOrEmail.slice(0, 8)})`);
    const targetUserEmail = targetUser
      ? targetUser.email
      : (memberInput.userIdOrEmail.includes('@')
          ? memberInput.userIdOrEmail
          : `${memberInput.userIdOrEmail}@workspace.decidix.gov`);

    // Check if already a member
    const existing = team.members.find(
      (m) => m.userId.toLowerCase() === targetUserId.toLowerCase() || m.userEmail.toLowerCase() === targetUserEmail.toLowerCase()
    );
    if (existing) {
      throw AppError.badRequest('User is already a member of this team', 'MEMBER_ALREADY_EXISTS');
    }

    const newMember: TeamMemberEntity = {
      id: `mem_${randomUUID().replace(/-/g, '').slice(0, 8)}`,
      teamId,
      userId: targetUserId,
      userName: targetUserName,
      userEmail: targetUserEmail,
      role: memberInput.role || 'analyst',
      joinedAt: new Date(),
    };

    const isDbReady = await testPrismaConnection();
    if (isDbReady) {
      try {
        if ((prisma as any).teamMember) {
          const created = await (prisma as any).teamMember.create({
            data: {
              id: newMember.id,
              teamId: newMember.teamId,
              userId: newMember.userId,
              userName: newMember.userName,
              userEmail: newMember.userEmail,
              role: newMember.role,
            },
          });
          return created;
        }
      } catch {
        // Fall back to memory
      }
    }

    const inMem = localTeams.get(teamId);
    if (inMem) {
      inMem.members.push(newMember);
      inMem.updatedAt = new Date();
    }

    return newMember;
  }

  /**
   * Remove a member from a team
   */
  static async removeMember(teamId: string, targetUserId: string): Promise<boolean> {
    const team = await this.findById(teamId);
    if (!team) {
      throw AppError.notFound('Team not found', 'TEAM_NOT_FOUND');
    }

    const isDbReady = await testPrismaConnection();
    if (isDbReady) {
      try {
        if ((prisma as any).teamMember) {
          await (prisma as any).teamMember.deleteMany({
            where: {
              teamId,
              userId: targetUserId,
            },
          });
          return true;
        }
      } catch {
        // Fall back to memory
      }
    }

    const inMem = localTeams.get(teamId);
    if (inMem) {
      inMem.members = inMem.members.filter((m) => m.userId !== targetUserId && m.id !== targetUserId);
      inMem.updatedAt = new Date();
      return true;
    }

    return false;
  }
}
