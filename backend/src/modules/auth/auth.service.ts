import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/response.js';
import { AuthRepository, UserEntity } from '../../repositories/auth.repository.js';
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
  static signAccessToken(user: { id: string; email: string; role: string; name: string }): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
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
    const role = input.role || 'viewer';

    const user = await AuthRepository.create({
      name: input.name,
      arabic_name: input.arabic_name,
      email: normalizedEmail,
      password_hash,
      role,
    });

    const tokens = await this.createSessionAndTokens(user, meta);

    return {
      user: {
        id: user.id,
        name: user.name,
        arabic_name: user.arabic_name,
        email: user.email,
        role: user.role,
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
    };
  }
}

