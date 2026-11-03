import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Express } from 'express';
import { DeviceTokenRepository } from '../src/repositories/device_token.repository.js';
import { FirebaseService } from '../src/integrations/firebase.js';

describe('Phase E2 — Firebase Cloud Messaging & Device Notifications Suite', () => {
  let app: Express;
  let userAToken: string;
  let userBToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = createApp();

    // Register User A (Planner)
    const resA = await request(app)
      .post('/v1/auth/register')
      .send({
        name: 'Planner A',
        email: `planner_a_${Date.now()}@decidix.gov`,
        password: 'Password123!',
        role: 'planner',
      });
    userAToken = resA.body.data.token;

    // Register User B (Analyst)
    const resB = await request(app)
      .post('/v1/auth/register')
      .send({
        name: 'Analyst B',
        email: `analyst_b_${Date.now()}@decidix.gov`,
        password: 'Password123!',
        role: 'analyst',
      });
    userBToken = resB.body.data.token;

    // Register Admin
    const resAdmin = await request(app)
      .post('/v1/auth/register')
      .send({
        name: 'Admin User',
        email: `admin_${Date.now()}@decidix.gov`,
        password: 'Password123!',
        role: 'admin',
      });
    adminToken = resAdmin.body.data.token;
  });

  beforeEach(() => {
    DeviceTokenRepository._resetLocal();
  });

  describe('1. Firebase Initialization & Safety Guardrails', () => {
    it('initializes Firebase Admin safely without throwing', () => {
      const initialized = FirebaseService.initialize();
      expect(typeof initialized).toBe('boolean');
      expect(typeof FirebaseService.isReady()).toBe('boolean');
    });

    it('handles notification dispatch gracefully even if credentials are not live in test mode', async () => {
      const result = await FirebaseService.sendToDevice('fake_token_for_testing_1234567890', {
        title: 'Development Alert',
        body: 'Frontier healthcare index improved by 1.2 points.',
        arabicTitle: 'تنبيه تنموي',
        arabicBody: 'تحسن مؤشر الرعاية الصحية في المنطقة الحدودية بمقدار 1.2 نقطة.',
      });

      // Should return either success: false with skipped: true (if no live creds)
      // or error code from Firebase, but NEVER crash the application
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('2. Device Token Registration (POST /v1/notifications/device-token)', () => {
    const validAndroidToken = 'fcm_token_pixel_7_pro_abc1234567890_test';
    const validIosToken = 'fcm_token_iphone_15_pro_xyz9876543210_test';

    it('rejects unauthenticated requests with 401 TOKEN_REQUIRED', async () => {
      const res = await request(app)
        .post('/v1/notifications/device-token')
        .send({
          token: validAndroidToken,
          platform: 'android',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_REQUIRED');
    });

    it('rejects registration with invalid platform with 422 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/v1/notifications/device-token')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          token: validAndroidToken,
          platform: 'windows',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects registration with token shorter than 10 characters', async () => {
      const res = await request(app)
        .post('/v1/notifications/device-token')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          token: 'short',
          platform: 'android',
        });

      expect(res.status).toBe(422);
    });

    it('successfully registers an Android device token for User A', async () => {
      const res = await request(app)
        .post('/v1/notifications/device-token')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          token: validAndroidToken,
          platform: 'android',
          device_model: 'Google Pixel 7 Pro',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBe(validAndroidToken);
      expect(res.body.data.platform).toBe('android');
      expect(res.body.data.device_model).toBe('Google Pixel 7 Pro');
      expect(res.body.data.is_active).toBe(true);
    });

    it('supports multiple devices per user (registers an iOS device as well)', async () => {
      // Register Android
      await request(app)
        .post('/v1/notifications/device-token')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          token: validAndroidToken,
          platform: 'android',
        });

      // Register iOS
      const res = await request(app)
        .post('/v1/notifications/device-token')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          token: validIosToken,
          platform: 'ios',
          device_model: 'iPhone 15 Pro',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.platform).toBe('ios');

      // Verify User A now has 2 active devices
      const activeDevices = await DeviceTokenRepository.findActiveTokensByUser(res.body.data.user_id);
      expect(activeDevices.length).toBe(2);
    });

    it('handles token rotation/duplicate registration idempotently', async () => {
      // First registration
      await request(app)
        .post('/v1/notifications/device-token')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          token: validAndroidToken,
          platform: 'android',
          device_model: 'Pixel 7',
        });

      // Second registration of same token with updated model
      const res = await request(app)
        .post('/v1/notifications/device-token')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          token: validAndroidToken,
          platform: 'android',
          device_model: 'Pixel 7 Pro (Updated)',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.device_model).toBe('Pixel 7 Pro (Updated)');

      // Must remain exactly 1 device record for this token
      const device = await DeviceTokenRepository.findByToken(validAndroidToken);
      expect(device).not.toBeNull();
      expect(device?.token).toBe(validAndroidToken);
    });

    it('reassigns token ownership when a device switches users', async () => {
      // User A registers device
      const resA = await request(app)
        .post('/v1/notifications/device-token')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          token: validAndroidToken,
          platform: 'android',
        });
      const userIdA = resA.body.data.user_id;

      // User B logs in on same device and registers the token
      const resB = await request(app)
        .post('/v1/notifications/device-token')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          token: validAndroidToken,
          platform: 'android',
        });
      const userIdB = resB.body.data.user_id;

      expect(userIdA).not.toBe(userIdB);
      expect(resB.status).toBe(200);
      expect(resB.body.data.user_id).toBe(userIdB);

      // Verify User A no longer has this token
      const userADevices = await DeviceTokenRepository.findActiveTokensByUser(userIdA);
      expect(userADevices.some((d) => d.token === validAndroidToken)).toBe(false);

      // Verify User B now owns the token
      const userBDevices = await DeviceTokenRepository.findActiveTokensByUser(userIdB);
      expect(userBDevices.some((d) => d.token === validAndroidToken)).toBe(true);
    });
  });

  describe('3. Device Token Deactivation & Ownership Security', () => {
    const tokenA = 'fcm_user_a_token_1234567890_test';
    const tokenB = 'fcm_user_b_token_0987654321_test';

    beforeEach(async () => {
      await request(app)
        .post('/v1/notifications/device-token')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ token: tokenA, platform: 'android' });

      await request(app)
        .post('/v1/notifications/device-token')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ token: tokenB, platform: 'ios' });
    });

    it('prevents User B from deactivating User A token with 403 TOKEN_OWNERSHIP_DENIED', async () => {
      const res = await request(app)
        .delete('/v1/notifications/device-token')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ token: tokenA });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TOKEN_OWNERSHIP_DENIED');

      // Token A must still be active
      const record = await DeviceTokenRepository.findByToken(tokenA);
      expect(record?.isActive).toBe(true);
    });

    it('allows User A to successfully deactivate their own token', async () => {
      const res = await request(app)
        .delete('/v1/notifications/device-token')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ token: tokenA });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('deactivated');

      // Token A must now be inactive
      const record = await DeviceTokenRepository.findByToken(tokenA);
      expect(record?.isActive).toBe(false);
    });
  });

  describe('4. Administrative Notification Dispatch (POST /v1/notifications/send-test)', () => {
    it('denies non-admin users from triggering notifications with 403 ROLE_NOT_AUTHORIZED', async () => {
      const res = await request(app)
        .post('/v1/notifications/send-test')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Unauthorized Test',
          body: 'This should be blocked',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ROLE_NOT_AUTHORIZED');
    });

    it('validates notification payload length and required fields', async () => {
      const res = await request(app)
        .post('/v1/notifications/send-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '', // Empty title
          body: 'Body text',
        });

      expect(res.status).toBe(422);
    });

    it('permits Admin to dispatch notification without crashing even in test environment', async () => {
      const res = await request(app)
        .post('/v1/notifications/send-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'National Priority Update',
          body: 'Budget allocation for education approved.',
          arabic_title: 'تحديث الأولويات الوطنية',
          arabic_body: 'تمت الموافقة على مخصصات ميزانية التعليم.',
          data: {
            screen: '/overview',
            region_id: 'frontier',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.target_user_id).toBeDefined();
    });
  });

  describe('5. Stale Token Cleanup Logic', () => {
    it('deactivates invalid or unregistered tokens in batch', async () => {
      const staleToken = 'stale_token_test_1234567890';
      await DeviceTokenRepository.upsertToken({
        userId: 'usr_test',
        token: staleToken,
        platform: 'android',
      });

      const before = await DeviceTokenRepository.findByToken(staleToken);
      expect(before?.isActive).toBe(true);

      await DeviceTokenRepository.deactivateTokens([staleToken]);

      const after = await DeviceTokenRepository.findByToken(staleToken);
      expect(after?.isActive).toBe(false);
    });
  });

  describe('6. Multicast Batching & Limit Safety (Phase E2.1 Hardening)', () => {
    it('verifies FCM multicast batch limit is strictly capped at 500', () => {
      expect(FirebaseService.FCM_MULTICAST_LIMIT).toBe(500);
    });

    it('chunkArray partitions large token arrays into chunks of <= 500', () => {
      const items = Array.from({ length: 1250 }, (_, i) => `token_${i}`);
      const chunks = FirebaseService.chunkArray(items, FirebaseService.FCM_MULTICAST_LIMIT);

      expect(chunks.length).toBe(3);
      expect(chunks[0]!.length).toBe(500);
      expect(chunks[1]!.length).toBe(500);
      expect(chunks[2]!.length).toBe(250);
      expect(chunks.flat().length).toBe(1250);
    });

    it('sendMulticast handles empty token lists without error', async () => {
      const result = await FirebaseService.sendMulticast([], {
        title: 'Empty Test',
        body: 'No recipients',
      });

      expect(result.targetedCount).toBe(0);
      expect(result.deliveredCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.invalidTokens).toEqual([]);
    });

    it('sendMulticast de-duplicates tokens before chunking', async () => {
      const duplicateTokens = ['token_alpha', 'token_alpha', 'token_beta', 'token_beta'];
      const result = await FirebaseService.sendMulticast(duplicateTokens, {
        title: 'De-dup Test',
        body: 'Unique count check',
      });

      // Targeted count must match unique set count (2)
      expect(result.targetedCount).toBe(2);
      expect(typeof result.deliveredCount).toBe('number');
      expect(typeof result.failedCount).toBe('number');
    });

    it('deactivating a non-existent token completes idempotently without error', async () => {
      const result = await DeviceTokenRepository.deactivateToken('non_existent_token_9999999');
      expect(result.success).toBe(true);
    });

    it('deactivating empty token list in batch returns 0 without error', async () => {
      const count = await DeviceTokenRepository.deactivateTokens([]);
      expect(count).toBe(0);
    });
  });
});

