import { describe, it, expect, beforeAll, vi } from 'vitest';



import request from 'supertest';



import jwt from 'jsonwebtoken';



import { createApp } from '../src/app.js';



import { env } from '../src/config/env.js';



import express, { Express } from 'express';



import { createRateLimiter } from '../src/middleware/rate_limit.js';



import { errorHandler } from '../src/middleware/error_handler.js';







describe('Decidix Authentication & RBAC Suite', () => {



  let app: Express;







  beforeAll(() => {



    app = createApp();



  });







  describe('1. User Registration Flow', () => {



    const testEmail = `auth_test_${Date.now()}@decidix.gov`;







    it('successfully registers a new user with access and refresh tokens', async () => {



      const res = await request(app)



        .post('/v1/auth/register')



        .send({



          name: 'Security Analyst',



          arabic_name: 'محلل أمني',



          email: testEmail,



          password: 'Password123!',



          role: 'analyst',



        });







      expect(res.status).toBe(201);



      expect(res.body.data).toBeDefined();



      expect(res.body.data.user.email).toBe(testEmail);



      expect(res.body.data.user.role).toBe('analyst');



      expect(res.body.data.token).toBeDefined();



      expect(res.body.data.refresh_token).toBeDefined();



      // Ensure password hash is NEVER leaked in response



      expect(res.body.data.user.password_hash).toBeUndefined();



      expect(res.body.data.user.passwordHash).toBeUndefined();



    });







    it('rejects duplicate email registration with 400 EMAIL_ALREADY_EXISTS', async () => {



      const res = await request(app)



        .post('/v1/auth/register')



        .send({



          name: 'Duplicate Analyst',



          email: testEmail,



          password: 'Password123!',



          role: 'analyst',



        });







      expect(res.status).toBe(400);



      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');



    });







    it('validates password length (> 8 chars) returning 422 VALIDATION_ERROR', async () => {



      const res = await request(app)



        .post('/v1/auth/register')



        .send({



          name: 'Short Password User',



          email: `short_${Date.now()}@decidix.gov`,



          password: 'short',



        });







      expect(res.status).toBe(422);



      expect(res.body.error.code).toBe('VALIDATION_ERROR');



    });



  });







  describe('2. User Login Flow', () => {



    const userEmail = `login_${Date.now()}@decidix.gov`;



    const password = 'StrongPassword2026!';







    beforeAll(async () => {



      await request(app)



        .post('/v1/auth/register')



        .send({



          name: 'Login Test User',



          email: userEmail,



          password,



          role: 'decision_maker',



        });



    });







    it('successfully authenticates with valid credentials', async () => {



      const res = await request(app)



        .post('/v1/auth/login')



        .send({ email: userEmail, password });







      expect(res.status).toBe(200);



      expect(res.body.data.user.email).toBe(userEmail);



      expect(res.body.data.user.role).toBe('decision_maker');



      expect(res.body.data.token).toBeDefined();



      expect(res.body.data.refresh_token).toBeDefined();



    });







    it('rejects invalid password with 401 INVALID_CREDENTIALS', async () => {



      const res = await request(app)



        .post('/v1/auth/login')



        .send({ email: userEmail, password: 'WrongPassword!' });







      expect(res.status).toBe(401);



      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');



    });







    it('rejects non-existent email with 401 INVALID_CREDENTIALS', async () => {



      const res = await request(app)



        .post('/v1/auth/login')



        .send({ email: 'ghost_user@decidix.gov', password });







      expect(res.status).toBe(401);



      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');



    });



  });







  describe('3. Token Refresh & Reuse Detection', () => {



    let initialRefreshToken: string;



    let rotatedRefreshToken: string;



    let initialAccessToken: string;







    beforeAll(async () => {



      const reg = await request(app)



        .post('/v1/auth/register')



        .send({



          name: 'Rotation Tester',



          email: `rotate_${Date.now()}@decidix.gov`,



          password: 'Password123!',



          role: 'analyst',



        });



      initialRefreshToken = reg.body.data.refresh_token;



      initialAccessToken = reg.body.data.token;



    });







    it('successfully rotates refresh token and yields new access token', async () => {



      const res = await request(app)



        .post('/v1/auth/refresh')



        .send({ refresh_token: initialRefreshToken });







      expect(res.status).toBe(200);



      expect(res.body.data.token).toBeDefined();



      expect(res.body.data.refresh_token).toBeDefined();



      expect(res.body.data.refresh_token).not.toBe(initialRefreshToken);







      rotatedRefreshToken = res.body.data.refresh_token;







      // Ensure new access token works for authenticated requests



      const meRes = await request(app)



        .get('/v1/auth/me')



        .set('Authorization', `Bearer ${res.body.data.token}`);



      expect(meRes.status).toBe(200);



    });







    it('detects refresh token reuse and revokes all sessions with 401 TOKEN_REUSE_DETECTED', async () => {



      // Attempt to reuse the already rotated initialRefreshToken



      const reuseRes = await request(app)



        .post('/v1/auth/refresh')



        .send({ refresh_token: initialRefreshToken });







      expect(reuseRes.status).toBe(401);



      expect(reuseRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');







      // Verify that previously issued rotated token was also revoked in the breach response



      const subsequentRes = await request(app)



        .post('/v1/auth/refresh')



        .send({ refresh_token: rotatedRefreshToken });







      expect(subsequentRes.status).toBe(401);



      expect(subsequentRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');



    });







    it('rejects unknown refresh token with 401 INVALID_REFRESH_TOKEN', async () => {



      const res = await request(app)



        .post('/v1/auth/refresh')



        .send({ refresh_token: 'fake_non_existent_token_string' });







      expect(res.status).toBe(401);



      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');



    });



  });







  describe('4. Token Expiration & Tampering', () => {



    it('rejects unauthenticated requests to protected endpoints with 401 TOKEN_REQUIRED', async () => {



      const res = await request(app).get('/v1/auth/me');



      expect(res.status).toBe(401);



      expect(res.body.error.code).toBe('TOKEN_REQUIRED');



    });







    it('rejects tampered or malformed tokens with 401 INVALID_TOKEN', async () => {



      const res = await request(app)



        .get('/v1/auth/me')



        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature');



      expect(res.status).toBe(401);



      expect(res.body.error.code).toBe('INVALID_TOKEN');



    });







    it('rejects expired access token with 401 SESSION_EXPIRED', async () => {



      const expiredToken = jwt.sign(



        { id: 'usr_test', email: 'test@decidix.gov', role: 'analyst', name: 'Expired User' },



        env.JWT_SECRET,



        { expiresIn: '-1s' }



      );







      const res = await request(app)



        .get('/v1/auth/me')



        .set('Authorization', `Bearer ${expiredToken}`);







      expect(res.status).toBe(401);



      expect(res.body.error.code).toBe('SESSION_EXPIRED');



    });



  });







  describe('5. User Logout & Session Invalidation', () => {



    let logoutRefreshToken: string;



    let logoutAccessToken: string;







    beforeAll(async () => {



      const reg = await request(app)



        .post('/v1/auth/register')



        .send({



          name: 'Logout Tester',



          email: `logout_${Date.now()}@decidix.gov`,



          password: 'Password123!',



          role: 'viewer',



        });



      logoutRefreshToken = reg.body.data.refresh_token;



      logoutAccessToken = reg.body.data.token;



    });







    it('successfully revokes session on logout', async () => {



      const res = await request(app)



        .post('/v1/auth/logout')



        .set('Authorization', `Bearer ${logoutAccessToken}`)



        .send({ refresh_token: logoutRefreshToken });







      expect(res.status).toBe(200);



      expect(res.body.data.message).toBe('Logged out successfully');







      // Attempting to refresh with the revoked token must fail with reuse/revocation



      const refreshRes = await request(app)



        .post('/v1/auth/refresh')



        .send({ refresh_token: logoutRefreshToken });







      expect(refreshRes.status).toBe(401);



    });



  });







  describe('6. Role-Based Access Control (RBAC)', () => {



    let adminToken: string;



    let decisionMakerToken: string;



    let plannerToken: string;



    let analystToken: string;



    let viewerToken: string;







    beforeAll(async () => {



      // Register Admin



      const adminRes = await request(app)



        .post('/v1/auth/register')



        .send({



          name: 'Admin User',



          email: `admin_${Date.now()}@decidix.gov`,



          password: 'Password123!',



          role: 'admin',



        });



      adminToken = adminRes.body.data.token;







      // Register Decision Maker



      const dmRes = await request(app)



        .post('/v1/auth/register')



        .send({



          name: 'Decision Maker User',



          email: `dm_${Date.now()}@decidix.gov`,



          password: 'Password123!',



          role: 'decision_maker',



        });



      decisionMakerToken = dmRes.body.data.token;







      // Register Planner



      const plannerRes = await request(app)



        .post('/v1/auth/register')



        .send({



          name: 'Strategic Planner User',



          email: `planner_${Date.now()}@decidix.gov`,



          password: 'Password123!',



          role: 'planner',



        });



      plannerToken = plannerRes.body.data.token;







      // Register Analyst



      const analystRes = await request(app)



        .post('/v1/auth/register')



        .send({



          name: 'Analyst User',



          email: `analyst_${Date.now()}@decidix.gov`,



          password: 'Password123!',



          role: 'analyst',



        });



      analystToken = analystRes.body.data.token;







      // Register Viewer



      const viewerRes = await request(app)



        .post('/v1/auth/register')



        .send({



          name: 'Viewer User',



          email: `viewer_${Date.now()}@decidix.gov`,



          password: 'Password123!',



          role: 'viewer',



        });



      viewerToken = viewerRes.body.data.token;



    });







    it('permits Admin to access /v1/admin/users', async () => {



      const res = await request(app)



        .get('/v1/admin/users')



        .set('Authorization', `Bearer ${adminToken}`);







      expect(res.status).toBe(200);



      expect(res.body.data.users).toBeDefined();



      expect(Array.isArray(res.body.data.users)).toBe(true);



    });







    it('denies Decision Maker access to /v1/admin/users with 403 ROLE_NOT_AUTHORIZED', async () => {



      const res = await request(app)



        .get('/v1/admin/users')



        .set('Authorization', `Bearer ${decisionMakerToken}`);







      expect(res.status).toBe(403);



      expect(res.body.error.code).toBe('ROLE_NOT_AUTHORIZED');



    });







    it('denies Planner access to /v1/admin/users with 403 ROLE_NOT_AUTHORIZED', async () => {



      const res = await request(app)



        .get('/v1/admin/users')



        .set('Authorization', `Bearer ${plannerToken}`);







      expect(res.status).toBe(403);



      expect(res.body.error.code).toBe('ROLE_NOT_AUTHORIZED');



    });







    it('denies Analyst access to /v1/admin/users with 403 ROLE_NOT_AUTHORIZED', async () => {



      const res = await request(app)



        .get('/v1/admin/users')



        .set('Authorization', `Bearer ${analystToken}`);







      expect(res.status).toBe(403);



      expect(res.body.error.code).toBe('ROLE_NOT_AUTHORIZED');



    });







    it('denies Viewer access to /v1/admin/users with 403 ROLE_NOT_AUTHORIZED', async () => {



      const res = await request(app)



        .get('/v1/admin/users')



        .set('Authorization', `Bearer ${viewerToken}`);







      expect(res.status).toBe(403);



      expect(res.body.error.code).toBe('ROLE_NOT_AUTHORIZED');



    });







    it('denies unauthenticated access to /v1/admin/users with 401 TOKEN_REQUIRED', async () => {



      const res = await request(app).get('/v1/admin/users');



      expect(res.status).toBe(401);



      expect(res.body.error.code).toBe('TOKEN_REQUIRED');



    });







    it('denies Viewer role from accepting policy recommendations with 403 PERMISSION_DENIED', async () => {



      const res = await request(app)



        .post('/v1/intelligence/recommendations/rec_frontier_mobile_clinics/accept')



        .set('Authorization', `Bearer ${viewerToken}`);







      expect(res.status).toBe(403);



      expect(res.body.error.code).toBe('PERMISSION_DENIED');



    });







    it('permits authorized planning roles and rejects Analyst recommendation mutation', async () => {



      const adminAccept = await request(app)



        .post('/v1/intelligence/recommendations/rec_frontier_mobile_clinics/accept')



        .set('Authorization', `Bearer ${adminToken}`);



      expect(adminAccept.status).toBe(200);



      expect(adminAccept.body.data.status).toBe('in_plan');







      const dmAccept = await request(app)



        .post('/v1/intelligence/recommendations/rec_frontier_mobile_clinics/accept')



        .set('Authorization', `Bearer ${decisionMakerToken}`);



      expect(dmAccept.status).toBe(200);







      const plannerAccept = await request(app)



        .post('/v1/intelligence/recommendations/rec_frontier_mobile_clinics/accept')



        .set('Authorization', `Bearer ${plannerToken}`);



      expect(plannerAccept.status).toBe(200);







      const analystAccept = await request(app)



        .post('/v1/intelligence/recommendations/rec_frontier_mobile_clinics/accept')



        .set('Authorization', `Bearer ${analystToken}`);



      expect(analystAccept.status).toBe(403);
      expect(analystAccept.body.error.code).toBe('PERMISSION_DENIED');



    });



  });







  describe('7. Session Ownership Enforcement', () => {



    let userAToken: string;



    let userARefreshToken: string;



    let userBToken: string;



    let userBRefreshToken: string;







    beforeAll(async () => {



      const userA = await request(app)



        .post('/v1/auth/register')



        .send({



          name: 'User A',



          email: `usera_${Date.now()}@decidix.gov`,



          password: 'Password123!',



          role: 'analyst',



        });



      userAToken = userA.body.data.token;



      userARefreshToken = userA.body.data.refresh_token;







      const userB = await request(app)



        .post('/v1/auth/register')



        .send({



          name: 'User B',



          email: `userb_${Date.now()}@decidix.gov`,



          password: 'Password123!',



          role: 'analyst',



        });



      userBToken = userB.body.data.token;



      userBRefreshToken = userB.body.data.refresh_token;



    });







    it('prevents User B from revoking User A session with 403 SESSION_FORBIDDEN', async () => {



      const res = await request(app)



        .post('/v1/auth/logout')



        .set('Authorization', `Bearer ${userBToken}`)



        .send({ refresh_token: userARefreshToken });







      expect(res.status).toBe(403);



      expect(res.body.error.code).toBe('SESSION_FORBIDDEN');



    });







    it('allows User A to revoke their own session', async () => {



      const res = await request(app)



        .post('/v1/auth/logout')



        .set('Authorization', `Bearer ${userAToken}`)



        .send({ refresh_token: userARefreshToken });







      expect(res.status).toBe(200);



      expect(res.body.data.message).toBe('Logged out successfully');



    });



  });







  describe('8. Password Change & Session Invalidation Flow', () => {



    const email = `pwd_change_${Date.now()}@decidix.gov`;



    const oldPassword = 'OldPassword123!';



    const newPassword = 'NewSecretPassword2026!';



    let token: string;



    let refreshToken: string;







    beforeAll(async () => {



      const reg = await request(app)



        .post('/v1/auth/register')



        .send({



          name: 'Password Changer',



          email,



          password: oldPassword,



          role: 'planner',



        });



      token = reg.body.data.token;



      refreshToken = reg.body.data.refresh_token;



    });







    it('rejects password change if current password is incorrect', async () => {



      const res = await request(app)



        .post('/v1/auth/change-password')



        .set('Authorization', `Bearer ${token}`)



        .send({



          current_password: 'WrongPassword!',



          new_password: newPassword,



        });







      expect(res.status).toBe(401);



      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');



    });







    it('rejects new password if shorter than 8 characters', async () => {



      const res = await request(app)



        .post('/v1/auth/change-password')



        .set('Authorization', `Bearer ${token}`)



        .send({



          current_password: oldPassword,



          new_password: 'short',



        });







      expect(res.status).toBe(422);



    });







    it('successfully changes password and invalidates active sessions', async () => {



      const res = await request(app)



        .post('/v1/auth/change-password')



        .set('Authorization', `Bearer ${token}`)



        .send({



          current_password: oldPassword,



          new_password: newPassword,



        });







      expect(res.status).toBe(200);



      expect(res.body.data.message).toContain('Password updated successfully');







      // Old refresh token must now be revoked



      const refreshRes = await request(app)



        .post('/v1/auth/refresh')



        .send({ refresh_token: refreshToken });



      expect(refreshRes.status).toBe(401);







      // Old password cannot log in



      const oldLogin = await request(app)



        .post('/v1/auth/login')



        .send({ email, password: oldPassword });



      expect(oldLogin.status).toBe(401);







      // New password logs in successfully



      const newLogin = await request(app)



        .post('/v1/auth/login')



        .send({ email, password: newPassword });



      expect(newLogin.status).toBe(200);



      expect(newLogin.body.data.token).toBeDefined();



    });



  });







  describe('9. In-Memory Rate Limiting Behavioral Verification', () => {



    it('sets standard rate limiting headers and returns 429 when maxRequests is exceeded', async () => {



      const testApp = express();



      const testLimiter = createRateLimiter({



        windowMs: 60000,



        maxRequests: 3,



        message: 'Test rate limit reached',



        skipInTest: false,



      });







      testApp.get('/test-limit', testLimiter, (_req, res) => {



        res.json({ success: true });



      });



      testApp.use(errorHandler);







      // Request 1: OK



      const res1 = await request(testApp).get('/test-limit');



      expect(res1.status).toBe(200);



      expect(res1.headers['x-ratelimit-limit']).toBe('3');



      expect(res1.headers['x-ratelimit-remaining']).toBe('2');



      expect(res1.headers['x-ratelimit-reset']).toBeDefined();







      // Request 2: OK



      const res2 = await request(testApp).get('/test-limit');



      expect(res2.status).toBe(200);



      expect(res2.headers['x-ratelimit-remaining']).toBe('1');







      // Request 3: OK



      const res3 = await request(testApp).get('/test-limit');



      expect(res3.status).toBe(200);



      expect(res3.headers['x-ratelimit-remaining']).toBe('0');







      // Request 4: Blocked with 429 TOO_MANY_REQUESTS



      const res4 = await request(testApp).get('/test-limit');



      expect(res4.status).toBe(429);



      expect(res4.body.error.code).toBe('TOO_MANY_REQUESTS');



      expect(res4.headers['retry-after']).toBeDefined();



    });



  });







  describe('10. Google Sign-In Authentication Flow', () => {

    it('rejects missing id_token with 422 VALIDATION_ERROR', async () => {

      const res = await request(app)

        .post('/v1/auth/google')

        .send({});

      expect(res.status).toBe(422);

    });



    it('rejects invalid Google ID token with 401 INVALID_GOOGLE_TOKEN', async () => {

      const res = await request(app)

        .post('/v1/auth/google')

        .send({ id_token: 'invalid_malformed_token' });

      expect(res.status).toBe(401);

      expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');

    });



    it('successfully registers new user with default viewer role (zero client escalation)', async () => {

      const uniqueEmail = 'google_new_' + Date.now() + '@gmail.com';

      const res = await request(app)

        .post('/v1/auth/google')

        .send({ id_token: 'test_google_:' + uniqueEmail + ':New Google User' });



      expect(res.status).toBe(200);

      expect(res.body.data.user.email).toBe(uniqueEmail);

      expect(res.body.data.user.name).toBe('New Google User');

      expect(res.body.data.user.role).toBe('viewer');

      expect(res.body.data.token).toBeDefined();

      expect(res.body.data.refresh_token).toBeDefined();

    });



    it('authenticates existing user and preserves their established administrative role', async () => {

      const adminEmail = 'admin_google_' + Date.now() + '@decidix.gov';

      await request(app)

        .post('/v1/auth/register')

        .send({

          name: 'Chief Admin',

          email: adminEmail,

          password: 'Password123!',

          role: 'admin',

        });



      const res = await request(app)

        .post('/v1/auth/google')

        .send({ id_token: 'test_google_:' + adminEmail + ':Chief Admin' });



      expect(res.status).toBe(200);

      expect(res.body.data.user.email).toBe(adminEmail);

      expect(res.body.data.user.role).toBe('admin');

      expect(res.body.data.token).toBeDefined();

    });



    it('rejects expired Google ID token with 401 INVALID_GOOGLE_TOKEN', async () => {

      const { OAuth2Client } = await import('google-auth-library');

      const spy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValueOnce(

        new Error('Token used too late, exp: 1700000000, now: 1700001000')

      );

      const res = await request(app)

        .post('/v1/auth/google')

        .send({ id_token: 'expired.google.token' });

      expect(res.status).toBe(401);

      expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');

      spy.mockRestore();

    });



    it('rejects token with wrong audience with 401 INVALID_GOOGLE_TOKEN', async () => {

      const { OAuth2Client } = await import('google-auth-library');

      const spy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValueOnce(

        new Error('Wrong recipient, payload audience != audience')

      );

      const res = await request(app)

        .post('/v1/auth/google')

        .send({ id_token: 'wrong_audience.google.token' });

      expect(res.status).toBe(401);

      expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');

      spy.mockRestore();

    });



    it('successfully accepts valid Google ID token matching expected Web Client ID', async () => {

      const { OAuth2Client } = await import('google-auth-library');

      const uniqueEmail = 'verified_google_' + Date.now() + '@gmail.com';

      const spy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValueOnce({

        getPayload: () => ({

          sub: 'google_sub_12345',

          email: uniqueEmail,

          name: 'Verified Google User',

          picture: 'https://example.com/photo.jpg',

          aud: process.env.GOOGLE_WEB_CLIENT_ID,

          email_verified: true,

        }),

      } as any);



      const res = await request(app)

        .post('/v1/auth/google')

        .send({ id_token: 'valid.google.id_token' });

      expect(res.status).toBe(200);

      expect(res.body.data.user.email).toBe(uniqueEmail);

      expect(res.body.data.user.name).toBe('Verified Google User');

      expect(res.body.data.user.role).toBe('viewer');

      expect(res.body.data.token).toBeDefined();

      spy.mockRestore();

    });

    it('rejects a Google token whose email is not verified', async () => {
      const { OAuth2Client } = await import('google-auth-library');
      const spy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValueOnce({
        getPayload: () => ({
          sub: 'google_sub_unverified',
          email: 'unverified_' + Date.now() + '@gmail.com',
          name: 'Unverified User',
          email_verified: false,
          aud: process.env.GOOGLE_WEB_CLIENT_ID,
        }),
      } as any);

      const res = await request(app)
        .post('/v1/auth/google')
        .send({ id_token: 'unverified.google.id_token' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');
      spy.mockRestore();
    });

  });

});


describe('Google verification failure classification', () => {
  let app: Express;
  beforeAll(() => {
    app = createApp();
  });

  it('reports a verification outage as unavailable, not as an invalid user token', async () => {
    const { OAuth2Client } = await import('google-auth-library');
    const spy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValueOnce(
      Object.assign(new Error('getaddrinfo ENOTFOUND www.googleapis.com'), { code: 'ENOTFOUND' })
    );

    const res = await request(app)
      .post('/v1/auth/google')
      .send({ id_token: 'network.failure.token' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('GOOGLE_VERIFICATION_UNAVAILABLE');
    spy.mockRestore();
  });
});
