import { prisma, testPrismaConnection } from '../database/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/response.js';

export interface UserEntity {
  id: string;
  name: string;
  arabic_name?: string | null;
  email: string;
  password_hash: string;
  google_subject?: string | null;
  role: string;
  email_verified: boolean;
  email_verified_at?: Date | null;
}

export interface SessionEntity {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  user?: UserEntity | null;
}

export interface VerificationTokenEntity {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

export interface PasswordResetTokenEntity {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

const localSessions = new Map<string, SessionEntity>();
const localVerificationTokens = new Map<string, VerificationTokenEntity>();
const localPasswordResetTokens = new Map<string, PasswordResetTokenEntity>();

const localUsers = new Map<string, UserEntity>([
  [
    'admin@decidix.gov',
    {
      id: 'usr_admin',
      email: 'admin@decidix.gov',
      password_hash: '$2a$10$wT8m9L7.tB5s/Wq8Fw1X6.R3iJgHq7zDkI8uE6d2Y9X9zE8x/8W2m',
      name: 'System Administrator',
      arabic_name: 'مدير النظام',
      role: 'admin',
      email_verified: true,
      email_verified_at: new Date('2026-01-01T00:00:00Z'),
    },
  ],
  [
    'analyst@decidix.gov',
    {
      id: 'usr_analyst',
      email: 'analyst@decidix.gov',
      password_hash: '$2a$10$wT8m9L7.tB5s/Wq8Fw1X6.R3iJgHq7zDkI8uE6d2Y9X9zE8x/8W2m',
      name: 'Lead Policy Analyst',
      arabic_name: 'كبير محللي السياسات',
      role: 'analyst',
      email_verified: true,
      email_verified_at: new Date('2026-01-01T00:00:00Z'),
    },
  ],
  [
    'decision_maker@decidix.gov',
    {
      id: 'usr_decision_maker',
      email: 'decision_maker@decidix.gov',
      password_hash: '$2a$10$wT8m9L7.tB5s/Wq8Fw1X6.R3iJgHq7zDkI8uE6d2Y9X9zE8x/8W2m',
      name: 'Executive Decision Maker',
      arabic_name: 'متخذ القرار التنفيذي',
      role: 'decision_maker',
      email_verified: true,
      email_verified_at: new Date('2026-01-01T00:00:00Z'),
    },
  ],
  [
    'planner@decidix.gov',
    {
      id: 'usr_planner',
      email: 'planner@decidix.gov',
      password_hash: '$2a$10$wT8m9L7.tB5s/Wq8Fw1X6.R3iJgHq7zDkI8uE6d2Y9X9zE8x/8W2m',
      name: 'Strategic Planner',
      arabic_name: 'مخطط استراتيجي',
      role: 'planner',
      email_verified: true,
      email_verified_at: new Date('2026-01-01T00:00:00Z'),
    },
  ],
]);

export class AuthRepository {
  /**
   * Finds user by email address.
   */
  static async findByEmail(email: string): Promise<UserEntity | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (env.NODE_ENV !== 'test') {
        throw AppError.internal('Authentication database is unavailable', 'AUTH_DATABASE_UNAVAILABLE');
      }
      return localUsers.get(normalizedEmail) || null;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        return env.NODE_ENV === 'test' ? localUsers.get(normalizedEmail) || null : null;
      }

      return {
        id: user.id,
        name: user.name,
        arabic_name: user.arabicName,
        email: user.email,
        password_hash: user.passwordHash,
        google_subject: user.googleSubject,
        role: user.role,
        email_verified: user.emailVerified,
        email_verified_at: user.emailVerifiedAt,
      };
    } catch (err) {
      if (env.NODE_ENV !== 'test') throw err;
      return localUsers.get(normalizedEmail) || null;
    }
  }

  static async findByGoogleSubject(subject: string): Promise<UserEntity | null> {
    if (!subject.trim()) return null;
    const isDbReady = await testPrismaConnection();
    if (!isDbReady) {
      if (env.NODE_ENV !== 'test') {
        throw AppError.internal('Authentication database is unavailable', 'AUTH_DATABASE_UNAVAILABLE');
      }
      return null;
    }
    try {
      const user = await prisma.user.findUnique({ where: { googleSubject: subject } });
      return user
        ? {
            id: user.id,
            name: user.name,
            arabic_name: user.arabicName,
            email: user.email,
            password_hash: user.passwordHash,
            google_subject: user.googleSubject,
            role: user.role,
            email_verified: user.emailVerified,
            email_verified_at: user.emailVerifiedAt,
          }
        : null;
    } catch (err) {
      if (env.NODE_ENV !== 'test') throw err;
      return null;
    }
  }

  static async linkGoogleSubject(userId: string, subject: string): Promise<void> {
    if (!subject.trim()) return;
    const isDbReady = await testPrismaConnection();
    if (!isDbReady) {
      if (env.NODE_ENV !== 'test') {
        throw AppError.internal('Authentication database is unavailable', 'AUTH_DATABASE_UNAVAILABLE');
      }
      return;
    }
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { googleSubject: subject },
      });
    } catch (err) {
      if (env.NODE_ENV !== 'test') throw err;
    }
  }

  /**
   * Finds user by primary key ID.
   */
  static async findById(id: string): Promise<UserEntity | null> {
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (env.NODE_ENV !== 'test') {
        throw AppError.internal('Authentication database is unavailable', 'AUTH_DATABASE_UNAVAILABLE');
      }
      for (const u of localUsers.values()) {
        if (u.id === id) return u;
      }
      return null;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        if (env.NODE_ENV === 'test') {
          for (const u of localUsers.values()) {
            if (u.id === id) return u;
          }
        }
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        arabic_name: user.arabicName,
        email: user.email,
        password_hash: user.passwordHash,
        google_subject: user.googleSubject,
        role: user.role,
        email_verified: user.emailVerified,
        email_verified_at: user.emailVerifiedAt,
      };
    } catch (err) {
      if (env.NODE_ENV !== 'test') throw err;
      for (const u of localUsers.values()) {
        if (u.id === id) return u;
      }
      return null;
    }
  }

  /**
   * Creates a new user record.
   */
  static async create(data: {
    name: string;
    arabic_name?: string;
    email: string;
    password_hash: string;
    role: string;
    google_subject?: string;
    email_verified?: boolean;
    email_verified_at?: Date | null;
  }): Promise<UserEntity> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const isDbReady = await testPrismaConnection();
    const emailVerified = data.email_verified ?? false;
    const emailVerifiedAt = data.email_verified_at ?? (emailVerified ? new Date() : null);

    if (!isDbReady) {
      if (env.NODE_ENV !== 'test') {
        throw AppError.internal('Authentication database is unavailable', 'AUTH_DATABASE_UNAVAILABLE');
      }
      if (localUsers.has(normalizedEmail)) {
        throw AppError.badRequest('User with this email already exists', 'EMAIL_ALREADY_EXISTS');
      }

      const user: UserEntity = {
        id: `usr_${Date.now()}`,
        name: data.name,
        arabic_name: data.arabic_name,
        email: normalizedEmail,
        password_hash: data.password_hash,
        google_subject: data.google_subject,
        role: data.role,
        email_verified: emailVerified,
        email_verified_at: emailVerifiedAt,
      };
      localUsers.set(normalizedEmail, user);
      return user;
    }

    try {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing) {
        throw AppError.badRequest('User with this email already exists', 'EMAIL_ALREADY_EXISTS');
      }

      const user = await prisma.user.create({
        data: {
          id: `usr_${Date.now()}`,
          name: data.name,
          arabicName: data.arabic_name,
          email: normalizedEmail,
          passwordHash: data.password_hash,
          googleSubject: data.google_subject,
          role: data.role,
          emailVerified,
          emailVerifiedAt,
        },
      });

      return {
        id: user.id,
        name: user.name,
        arabic_name: user.arabicName,
        email: user.email,
        password_hash: user.passwordHash,
        google_subject: user.googleSubject,
        role: user.role,
        email_verified: user.emailVerified,
        email_verified_at: user.emailVerifiedAt,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (env.NODE_ENV !== 'test') throw err;

      // Fallback
      if (localUsers.has(normalizedEmail)) {
        throw AppError.badRequest('User with this email already exists', 'EMAIL_ALREADY_EXISTS');
      }
      const user: UserEntity = {
        id: `usr_${Date.now()}`,
        name: data.name,
        arabic_name: data.arabic_name,
        email: normalizedEmail,
        password_hash: data.password_hash,
        google_subject: data.google_subject,
        role: data.role,
        email_verified: emailVerified,
        email_verified_at: emailVerifiedAt,
      };
      localUsers.set(normalizedEmail, user);
      return user;
    }
  }

  /**
   * Creates a new session record.
   */
  static async createSession(data: {
    id?: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<SessionEntity> {
    const sessionId = data.id || `ses_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (env.NODE_ENV !== 'test') {
        throw AppError.internal('Authentication database is unavailable', 'AUTH_DATABASE_UNAVAILABLE');
      }
      const user = await this.findById(data.userId);
      const session: SessionEntity = {
        id: sessionId,
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        expiresAt: data.expiresAt,
        revokedAt: null,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
        createdAt: new Date(),
        user: user || null,
      };
      localSessions.set(sessionId, session);
      return session;
    }

    try {
      const created = await prisma.session.create({
        data: {
          id: sessionId,
          userId: data.userId,
          refreshTokenHash: data.refreshTokenHash,
          expiresAt: data.expiresAt,
          userAgent: data.userAgent ?? null,
          ipAddress: data.ipAddress ?? null,
        },
        include: { user: true },
      });

      return {
        id: created.id,
        userId: created.userId,
        refreshTokenHash: created.refreshTokenHash,
        expiresAt: created.expiresAt,
        revokedAt: created.revokedAt,
        userAgent: created.userAgent,
        ipAddress: created.ipAddress,
        createdAt: created.createdAt,
        user: created.user
          ? {
              id: created.user.id,
              name: created.user.name,
              arabic_name: created.user.arabicName,
              email: created.user.email,
              password_hash: created.user.passwordHash,
              role: created.user.role,
              email_verified: (created.user as any).emailVerified ?? true,
            }
          : null,
      };
    } catch (err) {
      if (env.NODE_ENV !== 'test') throw err;
      const user = await this.findById(data.userId);
      const session: SessionEntity = {
        id: sessionId,
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        expiresAt: data.expiresAt,
        revokedAt: null,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
        createdAt: new Date(),
        user: user || null,
      };
      localSessions.set(sessionId, session);
      return session;
    }
  }

  /**
   * Finds a session by its hashed refresh token.
   */
  static async findSessionByTokenHash(refreshTokenHash: string): Promise<SessionEntity | null> {
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (env.NODE_ENV !== 'test') {
        throw AppError.internal('Authentication database is unavailable', 'AUTH_DATABASE_UNAVAILABLE');
      }
      for (const s of localSessions.values()) {
        if (s.refreshTokenHash === refreshTokenHash) {
          const user = await this.findById(s.userId);
          return { ...s, user };
        }
      }
      return null;
    }

    try {
      const session = await prisma.session.findFirst({
        where: { refreshTokenHash },
        include: { user: true },
      });

      if (!session) {
        if (env.NODE_ENV === 'test') {
          for (const s of localSessions.values()) {
            if (s.refreshTokenHash === refreshTokenHash) {
              const user = await this.findById(s.userId);
              return { ...s, user };
            }
          }
        }
        return null;
      }

      return {
        id: session.id,
        userId: session.userId,
        refreshTokenHash: session.refreshTokenHash,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        user: session.user
          ? {
              id: session.user.id,
              name: session.user.name,
              arabic_name: session.user.arabicName,
              email: session.user.email,
              password_hash: session.user.passwordHash,
              role: session.user.role,
              email_verified: (session.user as any).emailVerified ?? true,
            }
          : null,
      };
    } catch (err) {
      if (env.NODE_ENV !== 'test') throw err;
      for (const s of localSessions.values()) {
        if (s.refreshTokenHash === refreshTokenHash) {
          const user = await this.findById(s.userId);
          return { ...s, user };
        }
      }
      return null;
    }
  }

  /**
   * Revokes a session by ID.
   */
  static async revokeSession(id: string): Promise<void> {
    const isDbReady = await testPrismaConnection();
    if (!isDbReady && env.NODE_ENV !== 'test') {
      throw AppError.internal('Authentication database is unavailable', 'AUTH_DATABASE_UNAVAILABLE');
    }

    const local = localSessions.get(id);
    if (local) {
      local.revokedAt = new Date();
    }

    if (isDbReady) {
      try {
        await prisma.session.update({
          where: { id },
          data: { revokedAt: new Date() },
        });
      } catch (err) {
        if (env.NODE_ENV !== 'test') throw err;
      }
    }
  }

  /**
   * Revokes all active sessions for a user (used on token reuse detection or global sign-out).
   */
  static async revokeAllUserSessions(userId: string): Promise<void> {
    const isDbReady = await testPrismaConnection();
    if (!isDbReady && env.NODE_ENV !== 'test') {
      throw AppError.internal('Authentication database is unavailable', 'AUTH_DATABASE_UNAVAILABLE');
    }

    for (const s of localSessions.values()) {
      if (s.userId === userId && !s.revokedAt) {
        s.revokedAt = new Date();
      }
    }

    if (isDbReady) {
      try {
        await prisma.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } catch (err) {
        if (env.NODE_ENV !== 'test') throw err;
      }
    }
  }

  /**
   * Lists all users (sanitized, excluding password hashes).
   */
  static async listUsers(): Promise<Array<Omit<UserEntity, 'password_hash'>>> {
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (env.NODE_ENV !== 'test') {
        throw AppError.internal('Authentication database is unavailable', 'AUTH_DATABASE_UNAVAILABLE');
      }
      return Array.from(localUsers.values()).map((u) => ({
        id: u.id,
        name: u.name,
        arabic_name: u.arabic_name,
        email: u.email,
        role: u.role,
        email_verified: u.email_verified ?? true,
      }));
    }

    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return users.map((u) => ({
        id: u.id,
        name: u.name,
        arabic_name: u.arabicName,
        email: u.email,
        role: u.role,
        email_verified: (u as any).emailVerified ?? true,
      }));
    } catch (err) {
      if (env.NODE_ENV !== 'test') throw err;
      return Array.from(localUsers.values()).map((u) => ({
        id: u.id,
        name: u.name,
        arabic_name: u.arabic_name,
        email: u.email,
        role: u.role,
        email_verified: u.email_verified ?? true,
      }));
    }
  }

  /**
   * Updates a user's password hash in storage.
   */
  static async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    const isDbReady = await testPrismaConnection();
    if (!isDbReady && env.NODE_ENV !== 'test') {
      throw AppError.internal('Authentication database is unavailable', 'AUTH_DATABASE_UNAVAILABLE');
    }

    if (env.NODE_ENV === 'test') {
      for (const u of localUsers.values()) {
        if (u.id === userId) {
          u.password_hash = newPasswordHash;
        }
      }
    }

    if (isDbReady) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { passwordHash: newPasswordHash },
        });
      } catch (err) {
        if (env.NODE_ENV !== 'test') throw err;
      }
    }
  }

  /**
   * Marks a user's email as verified.
   */
  static async markEmailVerified(userId: string): Promise<UserEntity> {
    const isDbReady = await testPrismaConnection();
    const verifiedAt = new Date();

    if (env.NODE_ENV === 'test') {
      for (const u of localUsers.values()) {
        if (u.id === userId) {
          u.email_verified = true;
          u.email_verified_at = verifiedAt;
          return u;
        }
      }
    }

    if (!isDbReady) {
      throw AppError.internal('Authentication database is unavailable', 'AUTH_DATABASE_UNAVAILABLE');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: verifiedAt,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      arabic_name: updated.arabicName,
      email: updated.email,
      password_hash: updated.passwordHash,
      google_subject: updated.googleSubject,
      role: updated.role,
      email_verified: updated.emailVerified,
      email_verified_at: updated.emailVerifiedAt,
    };
  }

  /**
   * Creates an email verification token record.
   */
  static async createEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    if (env.NODE_ENV === 'test') {
      localVerificationTokens.set(tokenHash, {
        id,
        userId,
        tokenHash,
        expiresAt,
        usedAt: null,
        createdAt: now,
      });
    }

    const isDbReady = await testPrismaConnection();
    if (isDbReady) {
      try {
        await prisma.emailVerificationToken.create({
          data: {
            id,
            userId,
            tokenHash,
            expiresAt,
          },
        });
      } catch (err) {
        if (env.NODE_ENV !== 'test') throw err;
      }
    }
  }

  /**
   * Finds an email verification token by its hash.
   */
  static async findEmailVerificationToken(
    tokenHash: string
  ): Promise<{ id: string; userId: string; expiresAt: Date; usedAt: Date | null } | null> {
    const isDbReady = await testPrismaConnection();
    if (!isDbReady && env.NODE_ENV === 'test') {
      const token = localVerificationTokens.get(tokenHash);
      return token
        ? { id: token.id, userId: token.userId, expiresAt: token.expiresAt, usedAt: token.usedAt ?? null }
        : null;
    }

    try {
      const record = await prisma.emailVerificationToken.findUnique({
        where: { tokenHash },
      });
      if (!record && env.NODE_ENV === 'test') {
        const token = localVerificationTokens.get(tokenHash);
        return token
          ? { id: token.id, userId: token.userId, expiresAt: token.expiresAt, usedAt: token.usedAt ?? null }
          : null;
      }
      return record;
    } catch (err) {
      if (env.NODE_ENV === 'test') {
        const token = localVerificationTokens.get(tokenHash);
        return token
          ? { id: token.id, userId: token.userId, expiresAt: token.expiresAt, usedAt: token.usedAt ?? null }
          : null;
      }
      throw err;
    }
  }

  /**
   * Marks an email verification token as used.
   */
  static async markEmailVerificationTokenUsed(tokenId: string): Promise<void> {
    const now = new Date();
    if (env.NODE_ENV === 'test') {
      for (const t of localVerificationTokens.values()) {
        if (t.id === tokenId) t.usedAt = now;
      }
    }

    const isDbReady = await testPrismaConnection();
    if (isDbReady) {
      try {
        await prisma.emailVerificationToken.update({
          where: { id: tokenId },
          data: { usedAt: now },
        });
      } catch (err) {
        if (env.NODE_ENV !== 'test') throw err;
      }
    }
  }

  /**
   * Finds the latest verification token for rate limiting / resend throttling.
   */
  static async findLatestVerificationTokenForUser(userId: string): Promise<{ createdAt: Date } | null> {
    const isDbReady = await testPrismaConnection();
    if (!isDbReady && env.NODE_ENV === 'test') {
      const userTokens = Array.from(localVerificationTokens.values())
        .filter((t) => t.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return userTokens[0] ? { createdAt: userTokens[0].createdAt } : null;
    }

    try {
      const record = await prisma.emailVerificationToken.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      return record;
    } catch (err) {
      if (env.NODE_ENV === 'test') return null;
      throw err;
    }
  }

  /**
   * Creates a password reset token record.
   */
  static async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    const id = `prt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    if (env.NODE_ENV === 'test') {
      localPasswordResetTokens.set(tokenHash, {
        id,
        userId,
        tokenHash,
        expiresAt,
        usedAt: null,
        createdAt: now,
      });
    }

    const isDbReady = await testPrismaConnection();
    if (isDbReady) {
      try {
        await prisma.passwordResetToken.create({
          data: {
            id,
            userId,
            tokenHash,
            expiresAt,
          },
        });
      } catch (err) {
        if (env.NODE_ENV !== 'test') throw err;
      }
    }
  }

  /**
   * Finds a password reset token by its hash.
   */
  static async findPasswordResetToken(
    tokenHash: string
  ): Promise<{ id: string; userId: string; expiresAt: Date; usedAt: Date | null } | null> {
    const isDbReady = await testPrismaConnection();
    if (!isDbReady && env.NODE_ENV === 'test') {
      const token = localPasswordResetTokens.get(tokenHash);
      return token
        ? { id: token.id, userId: token.userId, expiresAt: token.expiresAt, usedAt: token.usedAt ?? null }
        : null;
    }

    try {
      const record = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
      });
      if (!record && env.NODE_ENV === 'test') {
        const token = localPasswordResetTokens.get(tokenHash);
        return token
          ? { id: token.id, userId: token.userId, expiresAt: token.expiresAt, usedAt: token.usedAt ?? null }
          : null;
      }
      return record;
    } catch (err) {
      if (env.NODE_ENV === 'test') {
        const token = localPasswordResetTokens.get(tokenHash);
        return token
          ? { id: token.id, userId: token.userId, expiresAt: token.expiresAt, usedAt: token.usedAt ?? null }
          : null;
      }
      throw err;
    }
  }

  /**
   * Marks a password reset token as used.
   */
  static async markPasswordResetTokenUsed(tokenId: string): Promise<void> {
    const now = new Date();
    if (env.NODE_ENV === 'test') {
      for (const t of localPasswordResetTokens.values()) {
        if (t.id === tokenId) t.usedAt = now;
      }
    }

    const isDbReady = await testPrismaConnection();
    if (isDbReady) {
      try {
        await prisma.passwordResetToken.update({
          where: { id: tokenId },
          data: { usedAt: now },
        });
      } catch (err) {
        if (env.NODE_ENV !== 'test') throw err;
      }
    }
  }

  /**
   * Finds the latest password reset token for rate limiting / throttling.
   */
  static async findLatestPasswordResetTokenForUser(userId: string): Promise<{ createdAt: Date } | null> {
    const isDbReady = await testPrismaConnection();
    if (!isDbReady && env.NODE_ENV === 'test') {
      const userTokens = Array.from(localPasswordResetTokens.values())
        .filter((t) => t.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return userTokens[0] ? { createdAt: userTokens[0].createdAt } : null;
    }

    try {
      const record = await prisma.passwordResetToken.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      return record;
    } catch (err) {
      if (env.NODE_ENV === 'test') return null;
      throw err;
    }
  }
}
