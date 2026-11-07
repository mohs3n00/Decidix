import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { AuthRepository } from '../src/repositories/auth.repository.js';
import { EmailService } from '../src/integrations/email.service.js';
import express, { Express } from 'express';

describe('Email Verification & Password Reset Implementation Suite', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  describe('1. Email Verification Flow', () => {
    it('creates a new unverified user on registration and generates a single-use verification token', async () => {
      const email = `verify_test_${Date.now()}@decidix.org`;
      const sendEmailSpy = vi.spyOn(EmailService, 'sendVerificationEmail');

      const res = await request(app)
        .post('/v1/auth/register')
        .send({ name: 'Verification Candidate', email, password: 'SecurePassword123!' });

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.user.email_verified).toBe(false);

      expect(sendEmailSpy).toHaveBeenCalledWith(
        email,
        'Verification Candidate',
        expect.any(String)
      );

      const sentToken = sendEmailSpy.mock.calls[sendEmailSpy.mock.calls.length - 1][2];
      expect(sentToken).toBeDefined();
      expect(sentToken.length).toBe(64); // 32 bytes hex

      // Database should only store the hash of the token, not the plaintext token
      const tokenHash = AuthService.hashToken(sentToken);
      const dbRecord = await AuthRepository.findEmailVerificationToken(tokenHash);
      expect(dbRecord).not.toBeNull();
      expect(dbRecord!.userId).toBe(res.body.data.user.id);
      expect(dbRecord!.usedAt).toBeNull();
      expect(new Date(dbRecord!.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('successfully verifies email address via POST /v1/auth/verify-email', async () => {
      const email = `verify_confirm_${Date.now()}@decidix.org`;
      const sendEmailSpy = vi.spyOn(EmailService, 'sendVerificationEmail');

      await request(app)
        .post('/v1/auth/register')
        .send({ name: 'Confirm Candidate', email, password: 'SecurePassword123!' });

      const rawToken = sendEmailSpy.mock.calls[sendEmailSpy.mock.calls.length - 1][2];

      const verifyRes = await request(app)
        .post('/v1/auth/verify-email')
        .send({ token: rawToken });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.email_verified).toBe(true);

      // Verify user in repository is now marked verified
      const user = await AuthRepository.findByEmail(email);
      expect(user!.email_verified).toBe(true);
      expect(user!.email_verified_at).toBeDefined();

      // Token must now be marked used
      const tokenHash = AuthService.hashToken(rawToken);
      const dbRecord = await AuthRepository.findEmailVerificationToken(tokenHash);
      expect(dbRecord!.usedAt).not.toBeNull();
    });

    it('renders the interactive HTML landing page via GET /v1/auth/verify-email?token=...', async () => {
      const email = `verify_landing_${Date.now()}@decidix.org`;
      const sendEmailSpy = vi.spyOn(EmailService, 'sendVerificationEmail');

      await request(app)
        .post('/v1/auth/register')
        .send({ name: 'Landing Candidate', email, password: 'SecurePassword123!' });

      const rawToken = sendEmailSpy.mock.calls[sendEmailSpy.mock.calls.length - 1][2];

      const getRes = await request(app).get(`/v1/auth/verify-email?token=${rawToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.headers['content-type']).toContain('text/html');
      expect(getRes.text).toContain('تم تأكيد البريد الإلكتروني بنجاح');
      expect(getRes.text).toContain('decidix://auth/verified');
    });

    it('rejects replaying a previously used verification token (single-use enforcement)', async () => {
      const email = `verify_replay_${Date.now()}@decidix.org`;
      const sendEmailSpy = vi.spyOn(EmailService, 'sendVerificationEmail');

      await request(app)
        .post('/v1/auth/register')
        .send({ name: 'Replay Candidate', email, password: 'SecurePassword123!' });

      const rawToken = sendEmailSpy.mock.calls[sendEmailSpy.mock.calls.length - 1][2];

      // First use -> 200
      await request(app).post('/v1/auth/verify-email').send({ token: rawToken });

      // Second use -> 400 TOKEN_ALREADY_USED
      const replayRes = await request(app).post('/v1/auth/verify-email').send({ token: rawToken });
      expect(replayRes.status).toBe(400);
      expect(replayRes.body.error.code).toBe('TOKEN_ALREADY_USED');
    });

    it('rejects an expired verification token', async () => {
      const email = `verify_expired_${Date.now()}@decidix.org`;
      const user = await AuthRepository.create({
        name: 'Expired Token User',
        email,
        password_hash: 'hash',
        role: 'viewer',
        email_verified: false,
      });

      const rawToken = 'expired_raw_token_test_12345';
      const tokenHash = AuthService.hashToken(rawToken);
      const expiredDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      await AuthRepository.createEmailVerificationToken(user.id, tokenHash, expiredDate);

      const res = await request(app).post('/v1/auth/verify-email').send({ token: rawToken });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('rejects invalid or tampered verification tokens', async () => {
      const res = await request(app).post('/v1/auth/verify-email').send({ token: 'completely_invalid_token' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });

    it('throttles verification resends and protects against user enumeration', async () => {
      const email = `resend_throttle_${Date.now()}@decidix.org`;
      await request(app)
        .post('/v1/auth/register')
        .send({ name: 'Throttle Candidate', email, password: 'SecurePassword123!' });

      // First resend -> throttled because register() just created a token < 60s ago
      const throttledRes = await request(app)
        .post('/v1/auth/resend-verification')
        .send({ email });
      expect(throttledRes.status).toBe(429);
      expect(throttledRes.body.error.code).toBe('RESEND_THROTTLED');

      // Non-existent email -> returns generic 200 without leaking existence
      const unknownRes = await request(app)
        .post('/v1/auth/resend-verification')
        .send({ email: 'non_existent_account@decidix.org' });
      expect(unknownRes.status).toBe(200);
      expect(unknownRes.body.data.message).toContain('If this email belongs to an unverified account');
    });
  });

  describe('2. Password Reset Flow', () => {
    it('requests password reset, hashes token in database, and prevents email enumeration', async () => {
      const email = `reset_candidate_${Date.now()}@decidix.org`;
      const sendResetSpy = vi.spyOn(EmailService, 'sendPasswordResetEmail');

      await AuthRepository.create({
        name: 'Reset Candidate',
        email,
        password_hash: 'initial_hash',
        role: 'viewer',
        email_verified: true,
      });

      const res = await request(app)
        .post('/v1/auth/forgot-password')
        .send({ email });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('If this email is registered');

      expect(sendResetSpy).toHaveBeenCalledWith(email, 'Reset Candidate', expect.any(String));
      const rawToken = sendResetSpy.mock.calls[sendResetSpy.mock.calls.length - 1][2];

      const tokenHash = AuthService.hashToken(rawToken);
      const dbRecord = await AuthRepository.findPasswordResetToken(tokenHash);
      expect(dbRecord).not.toBeNull();
      expect(dbRecord!.usedAt).toBeNull();
    });

    it('returns generic success on unknown email to prevent enumeration', async () => {
      const res = await request(app)
        .post('/v1/auth/forgot-password')
        .send({ email: 'ghost_user_does_not_exist@decidix.org' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('If this email is registered');
    });

    it('renders the password reset HTML page via GET /v1/auth/reset-password?token=...', async () => {
      const res = await request(app).get('/v1/auth/reset-password?token=sample_reset_token');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('إعادة تعيين كلمة المرور');
      expect(res.text).toContain('Reset your Decidix password');
    });

    it('executes password reset, updates password hash, and revokes all user sessions', async () => {
      const email = `reset_session_test_${Date.now()}@decidix.org`;
      const initialPassword = 'OldPassword123!';
      const newPassword = 'BrandNewPassword456!';

      const registerRes = await request(app)
        .post('/v1/auth/register')
        .send({ name: 'Session User', email, password: initialPassword });
      const oldAccessToken = registerRes.body.data.token;
      const oldRefreshToken = registerRes.body.data.refresh_token;

      // Request reset token
      const sendResetSpy = vi.spyOn(EmailService, 'sendPasswordResetEmail');
      // Advance time by 61s for throttle bypass in test
      const resetToken = 'manual_test_reset_token_64chars_long_and_cryptographically_secure';
      const tokenHash = AuthService.hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 3600 * 1000);
      await AuthRepository.createPasswordResetToken(registerRes.body.data.user.id, tokenHash, expiresAt);

      // Execute password reset
      const resetRes = await request(app)
        .post('/v1/auth/reset-password')
        .send({ token: resetToken, password: newPassword });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.data.message).toContain('Password has been reset successfully');

      // Attempt login with old password -> must fail with 401
      const oldLoginRes = await request(app)
        .post('/v1/auth/login')
        .send({ email, password: initialPassword });
      expect(oldLoginRes.status).toBe(401);

      // Attempt login with new password -> succeeds with 200
      const newLoginRes = await request(app)
        .post('/v1/auth/login')
        .send({ email, password: newPassword });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.data.user.email).toBe(email);

      // Attempt refreshing with the old session refresh token -> must fail because sessions were revoked
      const refreshRes = await request(app)
        .post('/v1/auth/refresh')
        .send({ refresh_token: oldRefreshToken });
      expect(refreshRes.status).toBe(401);
    });

    it('rejects weak passwords (<8 chars)', async () => {
      const res = await request(app)
        .post('/v1/auth/reset-password')
        .send({ token: 'some_token', password: 'short' });
      expect(res.status).toBe(422); // Zod schema validation
    });

    it('rejects replaying a previously used reset token', async () => {
      const email = `reset_replay_${Date.now()}@decidix.org`;
      const user = await AuthRepository.create({
        name: 'Replay Reset User',
        email,
        password_hash: 'initial',
        role: 'viewer',
        email_verified: true,
      });

      const resetToken = 'replay_reset_token_test_12345';
      const tokenHash = AuthService.hashToken(resetToken);
      await AuthRepository.createPasswordResetToken(user.id, tokenHash, new Date(Date.now() + 3600 * 1000));

      // First reset -> 200
      const res1 = await request(app)
        .post('/v1/auth/reset-password')
        .send({ token: resetToken, password: 'StrongNewPass123!' });
      expect(res1.status).toBe(200);

      // Replay -> 400 TOKEN_ALREADY_USED
      const res2 = await request(app)
        .post('/v1/auth/reset-password')
        .send({ token: resetToken, password: 'AnotherNewPass456!' });
      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe('TOKEN_ALREADY_USED');
    });
  });

  describe('3. Google Accounts & Email Verification Guarantee', () => {
    it('marks Google user as verified only when ID token explicitly has email_verified: true', async () => {
      const { OAuth2Client } = await import('google-auth-library');
      const uniqueEmail = `verified_google_${Date.now()}@gmail.com`;

      const spy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValueOnce({
        getPayload: () => ({
          sub: `google_sub_${Date.now()}`,
          email: uniqueEmail,
          name: 'Verified Google Citizen',
          picture: 'https://example.com/pic.png',
          aud: process.env.GOOGLE_WEB_CLIENT_ID,
          email_verified: true,
        }),
      } as any);

      const res = await request(app)
        .post('/v1/auth/google')
        .send({ id_token: 'google_verified_token' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email_verified).toBe(true);

      const dbUser = await AuthRepository.findByEmail(uniqueEmail);
      expect(dbUser!.email_verified).toBe(true);
      expect(dbUser!.email_verified_at).toBeDefined();

      spy.mockRestore();
    });
  });
});
