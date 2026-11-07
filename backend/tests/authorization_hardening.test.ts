import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { DatasetService } from '../src/services/dataset.service.js';
import { AuthRepository } from '../src/repositories/auth.repository.js';
import express, { Express } from 'express';

describe('Authorization hardening', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
    vi.spyOn(DatasetService, 'list').mockResolvedValue([] as never);
    vi.spyOn(AuthRepository, 'listUsers').mockResolvedValue([] as never);
  });

  it('rejects anonymous access to the admin user listing', async () => {
    const res = await request(app).get('/v1/admin/users');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_REQUIRED');
  });

  it('rejects anonymous dataset ingestion', async () => {
    const res = await request(app)
      .post('/v1/datasets/uploads/initiate')
      .send({});
    expect(res.status).toBe(401);
  });

  it('rejects anonymous recommendation mutations', async () => {
    const res = await request(app)
      .post('/v1/intelligence/recommendations/rec_1/accept')
      .send({});
    expect(res.status).toBe(401);
  });

  it('rejects anonymous profile access', async () => {
    const res = await request(app).get('/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_REQUIRED');
  });

  it('gives a self-registered account viewer role and no admin access', async () => {
    const email = `viewer_${Date.now()}@example.com`;
    const registered = await request(app)
      .post('/v1/auth/register')
      .send({ name: 'Viewer', email, password: 'password123' });

    expect(registered.status).toBe(201);
    expect(registered.body.data.user.role).toBe('viewer');
    expect(registered.body.data.user.email_verified).toBe(false);

    const token = registered.body.data.token as string;
    const admin = await request(app)
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(admin.status).toBe(403);
    expect(['ROLE_NOT_AUTHORIZED', 'EMAIL_NOT_VERIFIED']).toContain(admin.body.error.code);
  });

  it('rejects a token signed with a different secret', async () => {
    const forged = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'eyJpZCI6InVzcl9hZG1pbiIsInJvbGUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZGVjaWRpeC5nb3YifQ',
      'not-a-valid-signature',
    ].join('.');

    const res = await request(app)
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  describe('Comprehensive RBAC Matrix: ADMIN vs ANALYST vs VIEWER', () => {
    it('verifies that VIEWER cannot access dataset management or admin routes', async () => {
      const viewerToken = AuthService.signAccessToken({
        id: 'usr_viewer_test',
        email: 'viewer_matrix@decidix.org',
        role: 'viewer',
        name: 'Viewer User',
        email_verified: true,
      });

      // Cannot access datasets
      const dsRes = await request(app)
        .get('/v1/datasets')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(dsRes.status).toBe(403);
      expect(dsRes.body.error.code).toBe('ROLE_NOT_AUTHORIZED');

      // Cannot access admin
      const adminRes = await request(app)
        .get('/v1/admin/users')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(adminRes.status).toBe(403);
      expect(adminRes.body.error.code).toBe('ROLE_NOT_AUTHORIZED');
    });

    it('verifies that ANALYST can access datasets but CANNOT access admin routes', async () => {
      const analystToken = AuthService.signAccessToken({
        id: 'usr_analyst_test',
        email: 'analyst_matrix@decidix.org',
        role: 'analyst',
        name: 'Analyst User',
        email_verified: true,
      });

      // CAN access datasets
      const dsRes = await request(app)
        .get('/v1/datasets')
        .set('Authorization', `Bearer ${analystToken}`);
      expect(dsRes.status).toBe(200);

      // CANNOT access admin
      const adminRes = await request(app)
        .get('/v1/admin/users')
        .set('Authorization', `Bearer ${analystToken}`);
      expect(adminRes.status).toBe(403);
      expect(adminRes.body.error.code).toBe('ROLE_NOT_AUTHORIZED');
    });

    it('verifies that ADMIN can access both datasets and admin routes', async () => {
      const adminToken = AuthService.signAccessToken({
        id: 'usr_admin_test',
        email: 'admin_matrix@decidix.org',
        role: 'admin',
        name: 'Admin User',
        email_verified: true,
      });

      // CAN access datasets
      const dsRes = await request(app)
        .get('/v1/datasets')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(dsRes.status).toBe(200);

      // CAN access admin
      const adminRes = await request(app)
        .get('/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
    });

    it('blocks unverified accounts even with privileged roles from accessing datasets', async () => {
      const unverifiedAdminToken = AuthService.signAccessToken({
        id: 'usr_unverified_admin',
        email: 'unverified_admin@decidix.org',
        role: 'admin',
        name: 'Unverified Admin',
        email_verified: false,
      });

      const res = await request(app)
        .get('/v1/datasets')
        .set('Authorization', `Bearer ${unverifiedAdminToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });
  });
});
