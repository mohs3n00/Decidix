import { apiClient } from './apiClient';
import { Team, TeamMember } from '../types';

export const teamService = {
  /**
   * Fetch all teams the logged in user belongs to from the backend
   */
  async getTeams(): Promise<Team[]> {
    try {
      const response = await apiClient.request<Team[]>('/teams', {
        method: 'GET',
      });
      return response.data;
    } catch (err) {
      console.warn('[teamService] Backend /teams endpoint unreachable or unauthenticated, falling back to local state:', err);
      return [];
    }
  },

  /**
   * Get details for a specific team
   */
  async getTeamById(teamId: string): Promise<Team | null> {
    try {
      const response = await apiClient.request<Team>(`/teams/${teamId}`, {
        method: 'GET',
      });
      return response.data;
    } catch (err) {
      console.warn(`[teamService] Failed to fetch team ${teamId}:`, err);
      return null;
    }
  },

  /**
   * Create a new institutional collaborative team on the backend
   */
  async createTeam(name: string, description?: string): Promise<Team> {
    try {
      const response = await apiClient.request<Team>('/teams', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      return response.data;
    } catch (err) {
      console.warn('[teamService] Backend createTeam failed, falling back to local creation:', err);
      throw err;
    }
  },

  /**
   * Add a member to a team using their unique User ID or email
   */
  async addMember(
    teamId: string,
    userIdOrEmail: string,
    role: 'owner' | 'lead' | 'analyst' | 'viewer' = 'analyst'
  ): Promise<TeamMember> {
    try {
      const response = await apiClient.request<TeamMember>(`/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userIdOrEmail, role }),
      });
      return response.data;
    } catch (err) {
      console.warn('[teamService] Backend addMember failed:', err);
      throw err;
    }
  },

  /**
   * Remove a member from a team
   */
  async removeMember(teamId: string, memberUserId: string): Promise<void> {
    try {
      await apiClient.request<{ success: boolean }>(`/teams/${teamId}/members/${memberUserId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('[teamService] Backend removeMember failed:', err);
      throw err;
    }
  },
};
