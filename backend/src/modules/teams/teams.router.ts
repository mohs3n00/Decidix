import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validator.js';
import { sendSuccess } from '../../utils/response.js';
import { TeamService } from '../../services/team.service.js';

export const teamsRouter = Router();

function handle(handler: (req: Request) => Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await handler(req));
    } catch (error) {
      next(error);
    }
  };
}

const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

const addMemberSchema = z.object({
  userIdOrEmail: z.string().min(2).max(255),
  role: z.enum(['owner', 'lead', 'analyst', 'viewer']).optional(),
});

/**
 * 1. GET /v1/teams - List all teams current user is member of
 */
teamsRouter.get(
  '/',
  requireAuth,
  handle((req) => TeamService.listUserTeams(req.user!.id))
);

/**
 * 2. POST /v1/teams - Create a new team
 */
teamsRouter.post(
  '/',
  requireAuth,
  validateRequest({ body: createTeamSchema }),
  handle((req) =>
    TeamService.createTeam(req.user!.id, {
      name: req.body.name,
      description: req.body.description,
    })
  )
);

/**
 * 3. GET /v1/teams/:id - Get team details
 */
teamsRouter.get(
  '/:id',
  requireAuth,
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  handle((req) => TeamService.getTeamById(req.params.id, req.user!.id))
);

/**
 * 4. POST /v1/teams/:id/members - Invite a member by userId or email
 */
teamsRouter.post(
  '/:id/members',
  requireAuth,
  validateRequest({
    params: z.object({ id: z.string().min(1) }),
    body: addMemberSchema,
  }),
  handle((req) =>
    TeamService.addMember(req.params.id, req.user!.id, {
      userIdOrEmail: req.body.userIdOrEmail,
      role: req.body.role,
    })
  )
);

/**
 * 5. DELETE /v1/teams/:id/members/:userId - Remove a member or leave team
 */
teamsRouter.delete(
  '/:id/members/:userId',
  requireAuth,
  validateRequest({
    params: z.object({
      id: z.string().min(1),
      userId: z.string().min(1),
    }),
  }),
  handle((req) => TeamService.removeMember(req.params.id, req.user!.id, req.params.userId))
);
