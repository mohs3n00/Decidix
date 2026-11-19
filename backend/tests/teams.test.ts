import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Express } from 'express';

describe('Decidix Multi-Tenant Collaborative Teams Suite', () => {
  let app: Express;
  let ownerToken: string;
  let ownerId: string;
  let colleagueToken: string;
  let colleagueId: string;
  let outsiderToken: string;

  beforeAll(async () => {
    app = createApp();

    // Register team owner
    const ownerEmail = `team_owner_${Date.now()}@decidix.gov`;
    const ownerRes = await request(app)
      .post('/v1/auth/register')
      .send({ name: 'د. طارق السعيد', email: ownerEmail, password: 'SecurePassword123!' });
    ownerToken = ownerRes.body.data.token;
    ownerId = ownerRes.body.data.user.id;

    // Register colleague to invite
    const colleagueEmail = `colleague_${Date.now()}@decidix.gov`;
    const colleagueRes = await request(app)
      .post('/v1/auth/register')
      .send({ name: 'م. ندى إبراهيم', email: colleagueEmail, password: 'SecurePassword123!' });
    colleagueToken = colleagueRes.body.data.token;
    colleagueId = colleagueRes.body.data.user.id;

    // Register outsider user
    const outsiderEmail = `outsider_${Date.now()}@decidix.gov`;
    const outsiderRes = await request(app)
      .post('/v1/auth/register')
      .send({ name: 'مستخدم مستقل', email: outsiderEmail, password: 'SecurePassword123!' });
    outsiderToken = outsiderRes.body.data.token;
  });

  it('rejects unauthenticated access to /v1/teams with 401', async () => {
    const res = await request(app).get('/v1/teams');
    expect(res.status).toBe(401);
  });

  it('allows authenticated user to list their teams', async () => {
    const res = await request(app)
      .get('/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('creates a new institutional team and sets creator as owner', async () => {
    const res = await request(app)
      .post('/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'فريق التخطيط العمراني - الإسكندرية',
        description: 'متابعة وتخطيط المشروعات التنموية الحضرية لإقليم الإسكندرية',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toMatch(/^team_/);
    expect(res.body.data.name).toBe('فريق التخطيط العمراني - الإسكندرية');
    expect(res.body.data.creatorId).toBe(ownerId);
    expect(res.body.data.members).toHaveLength(1);
    expect(res.body.data.members[0].userId).toBe(ownerId);
    expect(res.body.data.members[0].role).toBe('owner');
  });

  it('rejects team creation with empty or missing name with 422/400', async () => {
    const res = await request(app)
      .post('/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: ' ',
      });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('allows owner to add a member via userId', async () => {
    // 1. Create team first
    const createRes = await request(app)
      .post('/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'فريق دراسات الدلتا',
        description: 'تحليل المؤشرات التنموية لمحافظات الدلتا',
      });
    const teamId = createRes.body.data.id;

    // 2. Add colleague by userId
    const addRes = await request(app)
      .post(`/v1/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userIdOrEmail: colleagueId,
        role: 'analyst',
      });

    expect(addRes.status).toBe(200);
    expect(addRes.body.data.userId).toBe(colleagueId);
    expect(addRes.body.data.role).toBe('analyst');

    // 3. Inspect team details
    const getRes = await request(app)
      .get(`/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.members).toHaveLength(2);

    // 4. Colleague can also view the team now
    const colleagueViewRes = await request(app)
      .get(`/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${colleagueToken}`);
    expect(colleagueViewRes.status).toBe(200);
    expect(colleagueViewRes.body.data.name).toBe('فريق دراسات الدلتا');
  });

  it('prevents non-members from viewing private team details with 403', async () => {
    const createRes = await request(app)
      .post('/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'فريق تنمية الصعيد السري',
      });
    const teamId = createRes.body.data.id;

    const res = await request(app)
      .get(`/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TEAM_ACCESS_DENIED');
  });

  it('rejects duplicate member additions with 400', async () => {
    const createRes = await request(app)
      .post('/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'فريق القاهرة الجديدة',
      });
    const teamId = createRes.body.data.id;

    // Add once
    await request(app)
      .post(`/v1/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userIdOrEmail: colleagueId });

    // Add twice
    const dupRes = await request(app)
      .post(`/v1/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userIdOrEmail: colleagueId });

    expect(dupRes.status).toBe(400);
    expect(dupRes.body.error.code).toBe('MEMBER_ALREADY_EXISTS');
  });

  it('allows owner to remove a member, and prevents removal of owner', async () => {
    const createRes = await request(app)
      .post('/v1/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'فريق الرصد الميداني',
      });
    const teamId = createRes.body.data.id;

    // Add colleague
    await request(app)
      .post(`/v1/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userIdOrEmail: colleagueId });

    // Attempt to remove owner -> should fail 400
    const removeOwnerRes = await request(app)
      .delete(`/v1/teams/${teamId}/members/${ownerId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(removeOwnerRes.status).toBe(400);
    expect(removeOwnerRes.body.error.code).toBe('CANNOT_REMOVE_OWNER');

    // Remove colleague -> should succeed 200
    const removeColleagueRes = await request(app)
      .delete(`/v1/teams/${teamId}/members/${colleagueId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(removeColleagueRes.status).toBe(200);
    expect(removeColleagueRes.body.data.success).toBe(true);
  });
});
