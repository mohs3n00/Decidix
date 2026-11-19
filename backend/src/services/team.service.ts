import { TeamRepository, TeamEntity, TeamMemberEntity } from '../repositories/team.repository.js';
import { AppError } from '../utils/response.js';

export class TeamService {
  /**
   * List all teams the user belongs to
   */
  static async listUserTeams(userId: string): Promise<TeamEntity[]> {
    return TeamRepository.findUserTeams(userId);
  }

  /**
   * Get team details by ID with membership authorization check
   */
  static async getTeamById(teamId: string, userId: string): Promise<TeamEntity> {
    const team = await TeamRepository.findById(teamId);
    if (!team) {
      throw AppError.notFound('Team not found', 'TEAM_NOT_FOUND');
    }

    const isMember = team.creatorId === userId || team.members.some((m) => m.userId === userId || m.userEmail === userId);
    if (!isMember) {
      throw AppError.forbidden('You do not have access to this team workspace', 'TEAM_ACCESS_DENIED');
    }

    return team;
  }

  /**
   * Create a new institutional team
   */
  static async createTeam(
    creatorId: string,
    input: {
      name: string;
      description?: string;
    }
  ): Promise<TeamEntity> {
    if (!input.name || input.name.trim().length === 0) {
      throw AppError.badRequest('Team name is required', 'TEAM_NAME_REQUIRED');
    }

    return TeamRepository.createTeam({
      name: input.name,
      description: input.description,
      creatorId,
    });
  }

  /**
   * Add a new member to a team (by userId or email)
   */
  static async addMember(
    teamId: string,
    requesterId: string,
    input: {
      userIdOrEmail: string;
      role?: 'owner' | 'lead' | 'analyst' | 'viewer';
    }
  ): Promise<TeamMemberEntity> {
    const team = await TeamRepository.findById(teamId);
    if (!team) {
      throw AppError.notFound('Team not found', 'TEAM_NOT_FOUND');
    }

    // Requester must be creator or have role 'owner' or 'lead'
    const requesterMember = team.members.find((m) => m.userId === requesterId);
    const isOwnerOrLead =
      team.creatorId === requesterId ||
      (requesterMember && (requesterMember.role === 'owner' || requesterMember.role === 'lead'));

    if (!isOwnerOrLead) {
      throw AppError.forbidden('Only team owners and leads can invite new members', 'TEAM_INVITE_FORBIDDEN');
    }

    return TeamRepository.addMember(teamId, input);
  }

  /**
   * Remove a member from a team
   */
  static async removeMember(teamId: string, requesterId: string, targetUserId: string): Promise<{ success: boolean }> {
    const team = await TeamRepository.findById(teamId);
    if (!team) {
      throw AppError.notFound('Team not found', 'TEAM_NOT_FOUND');
    }

    // Target cannot remove owner
    if (team.creatorId === targetUserId) {
      throw AppError.badRequest('Team owner cannot be removed', 'CANNOT_REMOVE_OWNER');
    }

    // Requester must be owner/lead OR target themselves leaving the team
    const requesterMember = team.members.find((m) => m.userId === requesterId);
    const isOwnerOrLead =
      team.creatorId === requesterId ||
      (requesterMember && (requesterMember.role === 'owner' || requesterMember.role === 'lead'));
    const isSelfLeaving = requesterId === targetUserId;

    if (!isOwnerOrLead && !isSelfLeaving) {
      throw AppError.forbidden('You do not have permission to remove this member', 'TEAM_REMOVE_FORBIDDEN');
    }

    const removed = await TeamRepository.removeMember(teamId, targetUserId);
    return { success: removed };
  }
}
