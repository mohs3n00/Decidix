import { Router, Request, Response, NextFunction } from 'express';

import { z } from 'zod';

import { sendSuccess } from '../../utils/response.js';

import { validateRequest } from '../../middleware/validator.js';

import { requireAuth, optionalAuth } from '../../middleware/auth.js';

import { authRateLimiter } from '../../middleware/rate_limit.js';

import { AuthService } from './auth.service.js';



export const authRouter = Router();



const registerSchema = z.object({

  name: z.string().min(2, 'Name must be at least 2 characters'),

  arabic_name: z.string().optional(),

  email: z.string().email('Invalid email address'),

  password: z.string().min(8, 'Password must be at least 8 characters'),

  role: z.enum(['admin', 'analyst', 'decision_maker', 'planner', 'viewer']).optional(),
});



const googleLoginSchema = z.object({

  id_token: z.string().min(1, 'Google ID token is required'),

});



const loginSchema = z.object({

  email: z.string().email('Invalid email address'),

  password: z.string().min(1, 'Password is required'),

});



const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});



const logoutSchema = z.object({

  refresh_token: z.string().optional(),

});



const changePasswordSchema = z.object({

  current_password: z.string().min(1, 'Current password is required'),

  new_password: z.string().min(8, 'New password must be at least 8 characters long'),

});



/**

 * POST /v1/auth/register

 * Registers a new user and returns user info with access token and refresh token.

 */

authRouter.post(

  '/register',

  authRateLimiter,

  validateRequest({ body: registerSchema }),

  async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {

      const { name, arabic_name, email, password, role } = req.body;

      const meta = {

        userAgent: req.headers['user-agent'],

        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip,

      };



      const result = await AuthService.register(

        { name, arabic_name, email, password, role },

        meta

      );



      sendSuccess(res, result, undefined, 201);

    } catch (error) {

      next(error);

    }

  }

);



/**

 * POST /v1/auth/google

 * Authenticates with a Google ID token. New users receive 'viewer' role by default.

 */

authRouter.post(

  '/google',

  authRateLimiter,

  validateRequest({ body: googleLoginSchema }),

  async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {

      const { id_token } = req.body;

      const meta = {

        userAgent: req.headers['user-agent'],

        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip,

      };



      const result = await AuthService.googleLogin(id_token, meta);

      sendSuccess(res, result);

    } catch (error) {

      next(error);

    }

  }

);



/**

 * POST /v1/auth/login

 * Verifies credentials and returns access token and rotating refresh token.

 */

authRouter.post(

  '/login',

  authRateLimiter,

  validateRequest({ body: loginSchema }),

  async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {

      const { email, password } = req.body;

      const meta = {

        userAgent: req.headers['user-agent'],

        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip,

      };



      const result = await AuthService.login({ email, password }, meta);

      sendSuccess(res, result);

    } catch (error) {

      next(error);

    }

  }

);



/**

 * POST /v1/auth/refresh

 * Rotates refresh token: revokes provided token and issues new access and refresh tokens.

 */

authRouter.post(

  '/refresh',

  authRateLimiter,

  validateRequest({ body: refreshSchema }),

  async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {

      const { refresh_token } = req.body;

      const meta = {

        userAgent: req.headers['user-agent'],

        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip,

      };



      const tokens = await AuthService.refresh(refresh_token, meta);

      sendSuccess(res, tokens);

    } catch (error) {

      next(error);

    }

  }

);



/**

 * GET /v1/auth/me

 * Retrieves current authenticated user record.

 */

authRouter.get(

  '/me',

  requireAuth,

  async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {

      const user = await AuthService.getMe(req.user!.id);

      sendSuccess(res, { user });

    } catch (error) {

      next(error);

    }

  }

);



/**

 * POST /v1/auth/logout

 * Revokes current session and refresh token.

 */

authRouter.post(

  '/logout',

  optionalAuth,

  validateRequest({ body: logoutSchema }),

  async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {

      const { refresh_token } = req.body;

      const result = await AuthService.logout(refresh_token, req.user?.id);

      sendSuccess(res, result);

    } catch (error) {

      next(error);

    }

  }

);



/**

 * POST /v1/auth/change-password

 * Securely updates current user password and revokes all active sessions.

 */

authRouter.post(

  '/change-password',

  authRateLimiter,

  requireAuth,

  validateRequest({ body: changePasswordSchema }),

  async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {

      const { current_password, new_password } = req.body;

      const result = await AuthService.changePassword(req.user!.id, current_password, new_password);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /v1/auth/verify-email
 * Programmatic endpoint to verify email with token.
 */
authRouter.post(
  '/verify-email',
  authRateLimiter,
  validateRequest({ body: verifyEmailSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.body;
      const result = await AuthService.verifyEmail(token);
      sendSuccess(res, {
        message: result.message,
        email_verified: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /v1/auth/verify-email
 * User-facing browser landing page for email verification links.
 */
authRouter.get('/verify-email', async (req: Request, res: Response): Promise<void> => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Decidix - رابط تأكيد غير صالح</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
          .icon { font-size: 48px; color: #ef4444; margin-bottom: 16px; }
          h1 { font-size: 20px; margin: 0 0 12px; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
          .btn { background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✕</div>
          <h1>رابط غير مكتمل / Incomplete Link</h1>
          <p>لم يتم تضمين رمز التأكيد في الرابط. يرجى طلب رابط جديد من التطبيق.<br/>No verification token was provided.</p>
          <a href="decidix://auth/login" class="btn">العودة للتطبيق / Open App</a>
        </div>
      </body>
      </html>
    `);
    return;
  }

  try {
    const result = await AuthService.verifyEmail(token);
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Decidix - تم تأكيد البريد الإلكتروني</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
          .badge { width: 64px; height: 64px; background: rgba(16, 185, 129, 0.15); border: 2px solid #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; color: #10b981; }
          h1 { font-size: 22px; margin: 0 0 12px; color: #f8fafc; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
          .email-tag { display: inline-block; background: #334155; color: #38bdf8; padding: 4px 12px; border-radius: 6px; font-family: monospace; font-size: 13px; margin-bottom: 20px; }
          .btn { background: #10b981; color: #fff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; display: inline-block; font-size: 15px; transition: background 0.2s; }
          .btn:hover { background: #059669; }
          .en-sub { font-size: 13px; color: #64748b; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✓</div>
          <h1>تم تأكيد البريد الإلكتروني بنجاح!</h1>
          <div class="email-tag">${result.user.email}</div>
          <p>شكراً لك. أصبح حسابك موثقاً بالكامل وجاهزاً للاستخدام في منصة ديسيدكس الذكية لدعم القرار.</p>
          <a href="decidix://auth/verified" class="btn">فتح تطبيق ديسيدكس / Open App</a>
          <div class="en-sub">Your email has been verified. You may now return to the Decidix application.</div>
        </div>
      </body>
      </html>
    `);
  } catch (error: any) {
    const errorMsg = error?.message || 'الرابط غير صالح أو انتهت صلاحيته.';
    res.status(400).send(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Decidix - خطأ في التأكيد</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
          .badge { width: 64px; height: 64px; background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; color: #ef4444; }
          h1 { font-size: 20px; margin: 0 0 12px; color: #f8fafc; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
          .btn { background: #3b82f6; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 14px; }
          .en-sub { font-size: 13px; color: #64748b; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✕</div>
          <h1>تعذر تأكيد البريد الإلكتروني</h1>
          <p>${errorMsg}<br/>قد يكون الرابط مستخدماً بالفعل أو منتهي الصلاحية (صلاحية الرابط 24 ساعة).</p>
          <a href="decidix://auth/login" class="btn">العودة للتطبيق / Return to App</a>
          <div class="en-sub">Verification failed: the link may be expired or already used.</div>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * POST /v1/auth/resend-verification
 * Resends a verification email (throttled, anti-enumeration).
 */
authRouter.post(
  '/resend-verification',
  authRateLimiter,
  validateRequest({ body: resendVerificationSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      const result = await AuthService.resendVerification(email);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /v1/auth/forgot-password
 * Requests password reset instructions (throttled, anti-enumeration).
 */
authRouter.post(
  '/forgot-password',
  authRateLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      const result = await AuthService.requestPasswordReset(email);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /v1/auth/reset-password
 * Browser form for resetting password via emailed link.
 */
authRouter.get('/reset-password', (req: Request, res: Response): void => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Decidix - إعادة تعيين كلمة المرور</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 440px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
        h1 { font-size: 22px; margin: 0 0 8px; text-align: center; }
        p.subtitle { color: #94a3b8; font-size: 14px; text-align: center; margin: 0 0 24px; }
        .form-group { margin-bottom: 16px; text-align: right; }
        label { display: block; font-size: 13px; color: #cbd5e1; margin-bottom: 6px; font-weight: 500; }
        input { width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 15px; box-sizing: border-box; }
        input:focus { outline: none; border-color: #3b82f6; }
        .btn { width: 100%; background: #3b82f6; color: #fff; border: none; padding: 14px; border-radius: 8px; font-weight: 700; font-size: 15px; cursor: pointer; margin-top: 8px; }
        .btn:hover { background: #2563eb; }
        .alert { display: none; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; text-align: center; }
        .alert.error { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; }
        .alert.success { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>إعادة تعيين كلمة المرور</h1>
        <p class="subtitle">Reset your Decidix password</p>
        <div id="alertBox" class="alert"></div>
        <form id="resetForm">
          <input type="hidden" id="token" value="${token}" />
          <div class="form-group">
            <label for="password">كلمة المرور الجديدة / New Password</label>
            <input type="password" id="password" required minlength="8" placeholder="8 أحرف على الأقل" />
          </div>
          <div class="form-group">
            <label for="confirm">تأكيد كلمة المرور / Confirm Password</label>
            <input type="password" id="confirm" required minlength="8" placeholder="أعد إدخال كلمة المرور" />
          </div>
          <button type="submit" class="btn" id="submitBtn">حفظ كلمة المرور الجديدة / Reset</button>
        </form>
      </div>
      <script>
        document.getElementById('resetForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const token = document.getElementById('token').value;
          const password = document.getElementById('password').value;
          const confirm = document.getElementById('confirm').value;
          const alertBox = document.getElementById('alertBox');
          const submitBtn = document.getElementById('submitBtn');

          if (password !== confirm) {
            alertBox.className = 'alert error';
            alertBox.style.display = 'block';
            alertBox.innerText = 'كلمتا المرور غير متطابقتين / Passwords do not match';
            return;
          }

          submitBtn.disabled = true;
          submitBtn.innerText = 'جاري الحفظ...';

          try {
            const res = await fetch('/v1/auth/reset-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, password })
            });
            const data = await res.json();
            if (res.ok) {
              alertBox.className = 'alert success';
              alertBox.style.display = 'block';
              alertBox.innerText = 'تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول من التطبيق.';
              document.getElementById('resetForm').innerHTML = '<a href="decidix://auth/login" class="btn" style="display:block;text-align:center;text-decoration:none;">فتح التطبيق / Open App</a>';
            } else {
              alertBox.className = 'alert error';
              alertBox.style.display = 'block';
              alertBox.innerText = (data.error && data.error.message) || 'تعذر تغيير كلمة المرور.';
              submitBtn.disabled = false;
              submitBtn.innerText = 'حفظ كلمة المرور الجديدة / Reset';
            }
          } catch (err) {
            alertBox.className = 'alert error';
            alertBox.style.display = 'block';
            alertBox.innerText = 'حدث خطأ في الاتصال بالخادم.';
            submitBtn.disabled = false;
            submitBtn.innerText = 'حفظ كلمة المرور الجديدة / Reset';
          }
        });
      </script>
    </body>
    </html>
  `);
});

/**
 * POST /v1/auth/reset-password
 * Programmatic endpoint to complete password reset.
 */
authRouter.post(
  '/reset-password',
  authRateLimiter,
  validateRequest({ body: resetPasswordSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, password } = req.body;
      const result = await AuthService.resetPassword(token, password);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);
