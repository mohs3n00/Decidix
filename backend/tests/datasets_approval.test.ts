import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Express } from 'express';

describe('Datasets Approval & System Registry Suite', () => {
  let app: Express;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    app = createApp();

    // Register an admin user
    const adminEmail = `admin_${Date.now()}@decidix.gov`;
    const adminRes = await request(app)
      .post('/v1/auth/register')
      .send({ name: 'مسؤول المنظومة', email: adminEmail, password: 'AdminPassword123!', role: 'admin' });
    adminToken = adminRes.body.data.token;

    // Register a regular user (role: viewer)
    const userEmail = `citizen_${Date.now()}@decidix.gov`;
    const userRes = await request(app)
      .post('/v1/auth/register')
      .send({ name: 'مواطن باحث', email: userEmail, password: 'Password123!' });
    userToken = userRes.body.data.token;
  });

  it('allows all authenticated users to list datasets via GET /v1/datasets', async () => {
    const res = await request(app)
      .get('/v1/datasets')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  it('rejects dataset approval by non-admin users with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/v1/datasets/sample_dataset_1/approve')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('allows admin to approve a dataset via POST /v1/datasets/:id/approve', async () => {
    const res = await request(app)
      .post('/v1/datasets/sample_dataset_1/approve')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });

  it('rejects dataset rejection by non-admin users with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/v1/datasets/sample_dataset_2/reject')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reason: 'بيانات غير مكتملة' });
    expect(res.status).toBe(403);
  });

  it('allows admin to reject a dataset via POST /v1/datasets/:id/reject with reason', async () => {
    const res = await request(app)
      .post('/v1/datasets/sample_dataset_2/reject')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'ملف لا يطابق النموذج الإحصائي المعتمد' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
    expect(res.body.data.reason).toBe('ملف لا يطابق النموذج الإحصائي المعتمد');
  });

  it('supports dataset_context in assistant chat endpoint', async () => {
    const res = await request(app)
      .post('/v1/intelligence/assistant/chat')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        message: 'ما هو المؤشر الوطني في هذه المجموعة؟',
        language: 'ar',
        dataset_context: {
          name: 'بيانات التنمية الريفية 2024',
          nationalIndex: 72.8,
          recordsCount: 450,
          sectorScores: { health: 75, education: 80, economy: 68, infrastructure: 71 },
          topGovernorates: ['البحيرة', 'الشرقية'],
          lowestGovernorates: ['مطروح'],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.reply.text).toBeDefined();
  });
});
