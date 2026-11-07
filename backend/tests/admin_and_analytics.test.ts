import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { AdminService } from '../src/services/admin.service.js';
import { AnalyticsService } from '../src/services/analytics.service.js';

function createToken(role = 'admin', id = 'usr_admin_1'): string {
  return jwt.sign(
    {
      id,
      email: `${role}@decidix.gov`,
      name: `${role} User`,
      role,
    },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Admin Dashboard & Platform Analytics Suite', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('RBAC & Role Guards', () => {
    it('rejects unauthenticated requests to /v1/admin/dashboard with 401', async () => {
      const res = await request(app).get('/v1/admin/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_REQUIRED');
    });

    it('rejects viewer role from accessing /v1/admin/dashboard with 403', async () => {
      const token = createToken('viewer');
      const res = await request(app)
        .get('/v1/admin/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ROLE_NOT_AUTHORIZED');
    });

    it('rejects analyst role from accessing /v1/admin/dashboard with 403', async () => {
      const token = createToken('analyst');
      const res = await request(app)
        .get('/v1/admin/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ROLE_NOT_AUTHORIZED');
    });

    it('allows admin role to access /v1/admin/dashboard', async () => {
      const token = createToken('admin');
      vi.spyOn(AdminService, 'getDashboard').mockResolvedValueOnce({
        kpis: {
          totalUsers: 10,
          activeUsers: 8,
          suspendedUsers: 2,
          newUsersInPeriod: 3,
          totalDatasets: 5,
          activeDatasets: 2,
          totalStorageBytes: 1048576,
          totalEventsInPeriod: 120,
          notificationsSentInPeriod: 4,
        },
        period: '30d',
        timestamp: new Date().toISOString(),
      });

      const res = await request(app)
        .get('/v1/admin/dashboard?period=30d')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kpis.totalUsers).toBe(10);
      expect(res.body.data.period).toBe('30d');
    });
  });

  describe('User Management Endpoints', () => {
    it('returns paginated users list for admin', async () => {
      const token = createToken('admin');
      vi.spyOn(AdminService, 'listUsers').mockResolvedValueOnce({
        users: [
          {
            id: 'usr_1',
            email: 'user1@decidix.gov',
            name: 'User One',
            arabic_name: 'المستخدم الأول',
            role: 'viewer',
            status: 'active',
            email_verified: true,
            dataset_count: 2,
            total_storage_bytes: 4096,
            last_active_at: null,
            created_at: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      const res = await request(app)
        .get('/v1/admin/users?page=1&limit=20')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('prevents an admin from suspending themselves', async () => {
      const adminId = 'usr_admin_self';
      const token = createToken('admin', adminId);

      const res = await request(app)
        .post(`/v1/admin/users/${adminId}/suspend`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_SUSPEND_SELF');
    });

    it('prevents an admin from deleting themselves', async () => {
      const adminId = 'usr_admin_self';
      const token = createToken('admin', adminId);

      const res = await request(app)
        .delete(`/v1/admin/users/${adminId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_DELETE_SELF');
    });
  });

  describe('Platform Analytics Ingestion', () => {
    it('successfully records an activity event via POST /v1/analytics/track', async () => {
      const spy = vi.spyOn(AnalyticsService, 'trackActivity').mockResolvedValueOnce(undefined);

      const res = await request(app)
        .post('/v1/analytics/track')
        .send({
          module: 'overview',
          event_type: 'view_dashboard',
          metadata: { filter: '7d' },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.tracked).toBe(true);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'overview',
          eventType: 'view_dashboard',
        })
      );
    });

    it('rejects invalid module name with 422 validation error', async () => {
      const res = await request(app)
        .post('/v1/analytics/track')
        .send({
          module: 'unsupported_module',
          event_type: 'click',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('enforces strict allowlisting on telemetry metadata, purging unexpected, sensitive, or nested fields', () => {
      const untrustedInput = {
        // Allowed keys
        screen: 'insights_overview',
        period: '30d',
        count: 5,
        status: 'validated',
        // Blocked / sensitive keys
        prompt: 'What is the maternal mortality in Cairo?',
        response: 'Based on CAPMAS...',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        secret: 'supersecret',
        records: [{ id: 1, val: 99 }],
        // Unexpected / non-allowlisted keys
        unexpected_field: 'should_be_stripped',
        arbitrary_data: 'also_stripped',
        // Nested structures
        nested_object: { prompt: 'nested secret', count: 1 },
        array_field: ['val1', 'val2'],
      };

      const sanitized = AnalyticsService.sanitizeMetadata(untrustedInput);

      expect(sanitized).toEqual({
        screen: 'insights_overview',
        period: '30d',
        count: 5,
        status: 'validated',
      });
      expect(sanitized).not.toHaveProperty('prompt');
      expect(sanitized).not.toHaveProperty('response');
      expect(sanitized).not.toHaveProperty('token');
      expect(sanitized).not.toHaveProperty('secret');
      expect(sanitized).not.toHaveProperty('records');
      expect(sanitized).not.toHaveProperty('unexpected_field');
      expect(sanitized).not.toHaveProperty('arbitrary_data');
      expect(sanitized).not.toHaveProperty('nested_object');
      expect(sanitized).not.toHaveProperty('array_field');
    });
  });
});
