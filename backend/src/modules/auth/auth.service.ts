import crypto from 'crypto';



import bcrypt from 'bcryptjs';



import jwt from 'jsonwebtoken';



import { env } from '../../config/env.js';



import { AppError } from '../../utils/response.js';



import { AuthRepository, UserEntity } from '../../repositories/auth.repository.js';
import { EmailService } from '../../integrations/email.service.js';
import { logger } from '../../utils/logger.js';







export interface AuthTokens {



  token: string;



  refresh_token: string;



}


export interface AuthResponseData extends AuthTokens {



  user: {



    id: string;



    name: string;



    arabic_name?: string | null;



    email: string;



    role: string;
    email_verified: boolean;
  };



}







export class AuthService {



  private static readonly ACCESS_TOKEN_EXPIRY = '15m';



  private static readonly REFRESH_TOKEN_EXPIRY_DAYS = 30;







  /**



   * Hashes a raw refresh token using SHA-256 for secure storage.



   */



  static hashToken(token: string): string {



    return crypto.createHash('sha256').update(token).digest('hex');



  }







  /**



   * Generates a cryptographically random refresh token.



   */



  static generateRefreshToken(): string {



    return crypto.randomBytes(40).toString('hex');



  }







  /**



   * Generates a signed JWT access token.



   */



  static signAccessToken(user: { id: string; email: string; role: string; name: string; email_verified?: boolean }): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        email_verified: user.email_verified !== false,
      },
      env.JWT_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );
  }







  /**



   * Internal helper to create a session and generate both access and refresh tokens.



   */



  private static async createSessionAndTokens(



    user: UserEntity,



    meta?: { userAgent?: string; ipAddress?: string }



  ): Promise<AuthTokens> {



    const rawRefreshToken = this.generateRefreshToken();



    const refreshTokenHash = this.hashToken(rawRefreshToken);



    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);







    await AuthRepository.createSession({



      userId: user.id,



      refreshTokenHash,



      expiresAt,



      userAgent: meta?.userAgent,



      ipAddress: meta?.ipAddress,



    });







    const accessToken = this.signAccessToken({



      id: user.id,



      email: user.email,



      role: user.role,
      name: user.name,
      email_verified: user.email_verified,
    });







    return {



      token: accessToken,



      refresh_token: rawRefreshToken,



    };



  }







  /**



   * Registers a new user and creates an initial session.



   */



  static async register(



    input: {



      name: string;



      arabic_name?: string;



      email: string;



      password: string;



      role?: string;



    },



    meta?: { userAgent?: string; ipAddress?: string }



  ): Promise<AuthResponseData> {



    const normalizedEmail = input.email.toLowerCase().trim();







    const existing = await AuthRepository.findByEmail(normalizedEmail);



    if (existing) {



      throw AppError.badRequest('User with this email already exists', 'EMAIL_ALREADY_EXISTS');



    }







    const password_hash = await bcrypt.hash(input.password, 10);



    // Public registration can never grant a privileged role. Test fixtures may
    // supply roles to exercise RBAC; production and staging always start as
    // viewers and require an authenticated administrative workflow for changes.
    const role = env.NODE_ENV === 'test' ? input.role || 'viewer' : 'viewer';







    const isPrivilegedTestFixture = env.NODE_ENV === 'test' && input.role && input.role !== 'viewer';
    const email_verified = Boolean(isPrivilegedTestFixture);

    const user = await AuthRepository.create({
      name: input.name,
      arabic_name: input.arabic_name,
      email: normalizedEmail,
      password_hash,
      role,
      email_verified,
    });

    // Generate cryptographically secure random verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(verificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await AuthRepository.createEmailVerificationToken(user.id, tokenHash, expiresAt);
    try {
      await EmailService.sendVerificationEmail(user.email, user.name, verificationToken);
    } catch (emailErr: any) {
      logger.warn('[AuthService] Could not deliver verification email immediately', { err: emailErr?.message });
    }

    const tokens = await this.createSessionAndTokens(user, meta);

    return {
      user: {
        id: user.id,
        name: user.name,
        arabic_name: user.arabic_name,
        email: user.email,
        role: user.role,
        email_verified: user.email_verified,
      },
      token: tokens.token,
      refresh_token: tokens.refresh_token,
    };



  }







  /**



   * Verifies Google ID token and creates or logs in a user.



   * New users are assigned the 'viewer' role by default (strictly no client-side role escalation).



   */



  static async googleLogin(



    idToken: string,



    meta?: { userAgent?: string; ipAddress?: string }



  ): Promise<AuthResponseData> {



    if (!idToken || typeof idToken !== 'string') {



      throw AppError.badRequest('Google ID token is required', 'INVALID_ID_TOKEN');



    }







    let payload: { sub: string; email: string; name: string; picture?: string };







    // Test-only bypass: STRICTLY gated to NODE_ENV=test.
    // This path MUST NEVER execute in staging or production.
    // Any test_google_/mock_google_ token sent outside test env is rejected as INVALID_GOOGLE_TOKEN.
    if (env.NODE_ENV === 'test' && (idToken.startsWith('mock_google_') || idToken.startsWith('test_google_'))) {



      const parts = idToken.split(':');



      const email = parts[1] || 'google_user@decidix.org';



      const name = parts[2] || 'Google Verified User';



      payload = {



        sub: 'google_' + crypto.createHash('md5').update(email).digest('hex'),



        email,



        name,



      };



    } else {



      try {



        // A missing or broken verification library is an operator problem, not
        // a bad user token, so it must never become INVALID_GOOGLE_TOKEN.
        let OAuth2Client: typeof import('google-auth-library').OAuth2Client;
        try {
          ({ OAuth2Client } = await import('google-auth-library'));
        } catch (importErr: any) {
          logger.error('Google token verification library unavailable', { err: importErr?.message });
          throw AppError.unavailable(
            'Google token verification is not configured on backend',
            'GOOGLE_CONFIG_MISSING'
          );
        }

        // Strictly verify against the configured Web Client ID (the intended audience of the ID token)
        const expectedAudience = env.GOOGLE_WEB_CLIENT_ID || env.GOOGLE_CLIENT_ID;
        if (!expectedAudience) {
          throw AppError.unavailable('Google Web Client ID is not configured on backend', 'GOOGLE_CONFIG_MISSING');
        }

        const client = new OAuth2Client(expectedAudience);

        const ticket = await client.verifyIdToken({
          idToken,
          audience: expectedAudience,
        });



        const p = ticket.getPayload();



        if (!p || !p.email) {
          throw new Error('Missing email in Google ID token payload');
        }

        // A Google account must prove ownership of the address before it can
        // inherit an existing Decidix account with that email.
        if (p.email_verified !== true) {
          throw new Error('Google account email is not verified');
        }



        payload = {



          sub: p.sub,



          email: p.email,



          name: p.name || p.email.split('@')[0],



          picture: p.picture,



        };



      } catch (err: any) {
        if (err instanceof AppError) throw err;        const networkCode = err?.code ?? err?.cause?.code;
        if (['ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET'].includes(networkCode)) {
          logger.error('Google token verification unreachable', { err: err?.message, code: networkCode });
          throw AppError.unavailable(
            'Google token verification is temporarily unavailable',
            'GOOGLE_VERIFICATION_UNAVAILABLE'
          );
        }

        logger.warn('Google ID token verification failed', { err: err?.message });
        throw AppError.unauthorized('Invalid or expired Google ID token', 'INVALID_GOOGLE_TOKEN');



      }



    }







    const normalizedEmail = payload.email.toLowerCase().trim();

    // The verified Google subject is the stable identity key. Email is only
    // used for first-time linking after the token has been verified.
    let user = await AuthRepository.findByGoogleSubject(payload.sub);
    if (!user) user = await AuthRepository.findByEmail(normalizedEmail);







    if (!user) {



      // New user from Google Sign-In receives 'viewer' role by default (strictly no client escalation)



      const randomPassword = crypto.randomBytes(32).toString('hex');



      const password_hash = await bcrypt.hash(randomPassword, 10);



      user = await AuthRepository.create({



        name: payload.name,



        email: normalizedEmail,



        password_hash,
        role: 'viewer', // Enforced server-side default
        google_subject: payload.sub,
        email_verified: true,
        email_verified_at: new Date(),
      });

      logger.info('New user registered via Google Sign-In with default role viewer', { userId: user.id, email: user.email });
    } else {
      if (user.google_subject && user.google_subject !== payload.sub) {
        throw AppError.unauthorized('Google account is not linked to this user', 'GOOGLE_ACCOUNT_MISMATCH');
      }
      if (!user.google_subject) {
        await AuthRepository.linkGoogleSubject(user.id, payload.sub);
      }
      if (!user.email_verified) {
        user = await AuthRepository.markEmailVerified(user.id);
      }

      logger.info('Existing user authenticated via Google Sign-In', { userId: user.id, email: user.email, role: user.role });
    }

    const tokens = await this.createSessionAndTokens(user, meta);

    return {
      user: {
        id: user.id,
        name: user.name,
        arabic_name: user.arabic_name,
        email: user.email,
        role: user.role,
        email_verified: user.email_verified,
      },
      token: tokens.token,
      refresh_token: tokens.refresh_token,
    };



  }







  /**



   * Logs in an existing user and creates a new session.



   */



  static async login(



    input: {



      email: string;



      password: string;



    },



    meta?: { userAgent?: string; ipAddress?: string }



  ): Promise<AuthResponseData> {



    const normalizedEmail = input.email.toLowerCase().trim();



    const user = await AuthRepository.findByEmail(normalizedEmail);







    if (!user) {



      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');



    }







    const isMatch = await bcrypt.compare(input.password, user.password_hash);



    if (!isMatch) {



      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');



    }







    const tokens = await this.createSessionAndTokens(user, meta);







    return {



      user: {



        id: user.id,



        name: user.name,



        arabic_name: user.arabic_name,



        email: user.email,
        role: user.role,
        email_verified: user.email_verified,
      },



      token: tokens.token,



      refresh_token: tokens.refresh_token,



    };



  }







  /**



   * Rotates a refresh token: invalidates old token, creates new session, issues fresh access token.



   * If a revoked token is presented, detects reuse and revokes all user sessions.



   */



  static async refresh(



    rawRefreshToken: string,



    meta?: { userAgent?: string; ipAddress?: string }



  ): Promise<AuthTokens> {



    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {



      throw AppError.unauthorized('Refresh token is required', 'MISSING_REFRESH_TOKEN');



    }







    const tokenHash = this.hashToken(rawRefreshToken.trim());



    const session = await AuthRepository.findSessionByTokenHash(tokenHash);







    if (!session) {



      throw AppError.unauthorized('Invalid or unknown refresh token', 'INVALID_REFRESH_TOKEN');



    }







    // Reuse detection: if the session was already revoked, someone may have compromised the token



    if (session.revokedAt) {



      logger.warn(`Security warning: Refresh token reuse detected for session ${session.id}, user ${session.userId}`);



      await AuthRepository.revokeAllUserSessions(session.userId);



      throw AppError.unauthorized(



        'Token reuse detected. All sessions revoked for security.',



        'TOKEN_REUSE_DETECTED'



      );



    }







    // Check expiration



    if (session.expiresAt.getTime() < Date.now()) {



      await AuthRepository.revokeSession(session.id);



      throw AppError.unauthorized('Refresh token has expired. Please sign in again.', 'SESSION_EXPIRED');



    }







    // Retrieve user details



    const user = session.user || (await AuthRepository.findById(session.userId));



    if (!user) {



      throw AppError.unauthorized('User not found for this session', 'USER_NOT_FOUND');



    }







    // Rotate: revoke the current session immediately



    await AuthRepository.revokeSession(session.id);







    // Issue a brand new session and tokens



    return await this.createSessionAndTokens(user, meta);



  }







  /**



   * Logs out: revokes specific session by refresh token or revokes all sessions for a user.



   * Enforces session ownership if caller is authenticated.



   */



  static async logout(rawRefreshToken?: string, userId?: string): Promise<{ message: string }> {



    if (rawRefreshToken) {



      const tokenHash = this.hashToken(rawRefreshToken.trim());



      const session = await AuthRepository.findSessionByTokenHash(tokenHash);



      if (session) {



        // Enforce session ownership: authenticated caller cannot revoke another user's session



        if (userId && session.userId !== userId) {



          throw AppError.forbidden('Cannot revoke a session belonging to another user', 'SESSION_FORBIDDEN');



        }



        await AuthRepository.revokeSession(session.id);



      }



    } else if (userId) {



      await AuthRepository.revokeAllUserSessions(userId);



    }







    return { message: 'Logged out successfully' };



  }







  /**



   * Changes password for an authenticated user, re-hashes with bcrypt (10 rounds),



   * and revokes all user sessions to enforce security.



   */



  static async changePassword(



    userId: string,



    currentPassword: string,



    newPassword: string



  ): Promise<{ message: string }> {



    const user = await AuthRepository.findById(userId);



    if (!user) {



      throw AppError.unauthorized('User profile not found', 'USER_NOT_FOUND');



    }







    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);



    if (!isMatch) {



      throw AppError.unauthorized('Current password is incorrect', 'INVALID_CREDENTIALS');



    }







    if (newPassword.length < 8) {



      throw AppError.validation('New password must be at least 8 characters long');



    }







    const newHash = await bcrypt.hash(newPassword, 10);



    await AuthRepository.updatePassword(userId, newHash);







    // Revoke all existing sessions to enforce re-login with new password



    await AuthRepository.revokeAllUserSessions(userId);







    return { message: 'Password updated successfully. All active sessions have been revoked.' };



  }







  /**



   * Returns current authenticated user record.



   */



  static async getMe(userId: string) {



    const user = await AuthRepository.findById(userId);



    if (!user) {



      throw AppError.unauthorized('User profile not found', 'USER_NOT_FOUND');



    }







    return {



      id: user.id,



      name: user.name,



      arabic_name: user.arabic_name,



      email: user.email,
      role: user.role,
      email_verified: user.email_verified,
    };
  }

  /**
   * Verifies an email address using a single-use token.
   */
  static async verifyEmail(rawToken: string): Promise<{ user: UserEntity; message: string }> {
    if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
      throw AppError.badRequest('Verification token is required', 'TOKEN_REQUIRED');
    }

    const tokenHash = this.hashToken(rawToken.trim());
    const record = await AuthRepository.findEmailVerificationToken(tokenHash);

    if (!record) {
      throw AppError.badRequest('Invalid or expired verification token', 'INVALID_VERIFICATION_TOKEN');
    }

    if (record.usedAt) {
      throw AppError.badRequest('Verification token has already been used', 'TOKEN_ALREADY_USED');
    }

    if (new Date() > record.expiresAt) {
      throw AppError.badRequest('Verification token has expired', 'TOKEN_EXPIRED');
    }

    await AuthRepository.markEmailVerificationTokenUsed(record.id);
    const user = await AuthRepository.markEmailVerified(record.userId);

    logger.info('Email verified successfully', { userId: user.id, email: user.email });
    return { user, message: 'Email verified successfully' };
  }

  /**
   * Resends verification email with throttling and anti-enumeration.
   */
  static async resendVerification(email: string): Promise<{ message: string }> {
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw AppError.badRequest('Email is required', 'EMAIL_REQUIRED');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await AuthRepository.findByEmail(normalizedEmail);

    // Anti-enumeration: If user does not exist or is already verified, return generic message
    if (!user || user.email_verified) {
      return { message: 'If this email belongs to an unverified account, a verification link has been sent.' };
    }

    // Rate limiting: 60s cooldown
    const latest = await AuthRepository.findLatestVerificationTokenForUser(user.id);
    if (latest) {
      const elapsedMs = Date.now() - latest.createdAt.getTime();
      if (elapsedMs < 60 * 1000) {
        throw AppError.tooManyRequests(
          'Please wait before requesting another verification email',
          'RESEND_THROTTLED'
        );
      }
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(verificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await AuthRepository.createEmailVerificationToken(user.id, tokenHash, expiresAt);

    try {
      await EmailService.sendVerificationEmail(user.email, user.name, verificationToken);
    } catch (err: any) {
      logger.warn('[AuthService] Resend email delivery failed', { err: err?.message });
    }

    return { message: 'If this email belongs to an unverified account, a verification link has been sent.' };
  }

  /**
   * Requests a password reset link with throttling and anti-enumeration.
   */
  static async requestPasswordReset(email: string): Promise<{ message: string }> {
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw AppError.badRequest('Email is required', 'EMAIL_REQUIRED');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await AuthRepository.findByEmail(normalizedEmail);

    // Anti-enumeration: If user does not exist, do not disclose and return generic success
    if (!user) {
      return { message: 'If this email is registered, password reset instructions have been sent.' };
    }

    // Rate limiting: 60s cooldown
    const latest = await AuthRepository.findLatestPasswordResetTokenForUser(user.id);
    if (latest) {
      const elapsedMs = Date.now() - latest.createdAt.getTime();
      if (elapsedMs < 60 * 1000) {
        throw AppError.tooManyRequests(
          'Please wait before requesting another password reset email',
          'RESET_THROTTLED'
        );
      }
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await AuthRepository.createPasswordResetToken(user.id, tokenHash, expiresAt);

    try {
      await EmailService.sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (err: any) {
      logger.warn('[AuthService] Password reset email delivery failed', { err: err?.message });
    }

    return { message: 'If this email is registered, password reset instructions have been sent.' };
  }

  /**
   * Resets a user's password using a secure single-use token and revokes all active sessions.
   */
  static async resetPassword(rawToken: string, newPassword: string): Promise<{ message: string }> {
    if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
      throw AppError.badRequest('Reset token is required', 'TOKEN_REQUIRED');
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      throw AppError.badRequest('Password must be at least 8 characters long', 'WEAK_PASSWORD');
    }

    const tokenHash = this.hashToken(rawToken.trim());
    const record = await AuthRepository.findPasswordResetToken(tokenHash);

    if (!record) {
      throw AppError.badRequest('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
    }

    if (record.usedAt) {
      throw AppError.badRequest('Reset token has already been used', 'TOKEN_ALREADY_USED');
    }

    if (new Date() > record.expiresAt) {
      throw AppError.badRequest('Reset token has expired', 'TOKEN_EXPIRED');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await AuthRepository.updatePassword(record.userId, passwordHash);
    await AuthRepository.markPasswordResetTokenUsed(record.id);

    // CRITICAL: Revoke all existing sessions for this user so old sessions cannot continue
    await AuthRepository.revokeAllUserSessions(record.userId);

    logger.info('Password reset successfully and sessions revoked', { userId: record.userId });
    return { message: 'Password has been reset successfully. Please sign in with your new password.' };
  }
}
