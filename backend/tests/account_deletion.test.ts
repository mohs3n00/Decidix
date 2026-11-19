import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { EmailService } from '../src/integrations/email.service.js';
import { Express } from 'express';

describe('Account Deletion & Data Privacy Suite', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  it('rejects anonymous access to DELETE /v1/auth/me with 401', async () => {
    const res = await request(app).delete('/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('allows authenticated user to self-delete their account via DELETE /v1/auth/me', async () => {
    const email = `delete_me_${Date.now()}@decidix.org`;
    const regRes = await request(app)
      .post('/v1/auth/register')
      .send({ name: 'Delete Tester', email, password: 'Password123!' });

    expect(regRes.status).toBe(201);
    const token = regRes.body.data.token;

    // Call DELETE /v1/auth/me
    const delRes = await request(app)
      .delete('/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.data.message).toContain('deleted');

    // Attempting to access protected resource with old token fails or login fails
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email, password: 'Password123!' });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe('ACCOUNT_DELETED');
  });

  it('handles public request-deletion and confirm-deletion flow via email', async () => {
    const email = `delete_email_${Date.now()}@decidix.org`;
    await request(app)
      .post('/v1/auth/register')
      .send({ name: 'Email Deletion User', email, password: 'Password123!' });

    const sendEmailSpy = vi.spyOn(EmailService, 'sendAccountDeletionEmail');

    // Request deletion
    const reqRes = await request(app)
      .post('/v1/auth/request-deletion')
      .send({ email });

    expect(reqRes.status).toBe(200);
    expect(reqRes.body.data.message).toContain('deletion');
    expect(sendEmailSpy).toHaveBeenCalled();

    const sentToken = sendEmailSpy.mock.calls[sendEmailSpy.mock.calls.length - 1][2];
    expect(sentToken).toBeDefined();

    // Confirm deletion
    const confRes = await request(app)
      .post('/v1/auth/confirm-deletion')
      .send({ token: sentToken });

    expect(confRes.status).toBe(200);
    expect(confRes.body.data.message).toContain('deleted');

    // Trying to login fails with ACCOUNT_DELETED
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email, password: 'Password123!' });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe('ACCOUNT_DELETED');
  });
});
