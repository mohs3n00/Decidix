import { prisma, testPrismaConnection } from '../database/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/response.js';

export interface UserEntity {
  id: string;
  name: string;
  arabic_name?: string | null;
  email: string;
  password_hash: string;
  role: string;
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

const localSessions = new Map<string, SessionEntity>();

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
      return localUsers.get(normalizedEmail) || null;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        return localUsers.get(normalizedEmail) || null;
      }

      return {
        id: user.id,
        name: user.name,
        arabic_name: user.arabicName,
        email: user.email,
        password_hash: user.passwordHash,
        role: user.role,
      };
    } catch (err) {
      if (env.NODE_ENV === 'production') throw err;
      return localUsers.get(normalizedEmail) || null;
    }
  }

  /**
   * Finds user by primary key ID.
   */
  static async findById(id: string): Promise<UserEntity | null> {
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
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
        for (const u of localUsers.values()) {
          if (u.id === id) return u;
        }
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        arabic_name: user.arabicName,
        email: user.email,
        password_hash: user.passwordHash,
        role: user.role,
      };
    } catch (err) {
      if (env.NODE_ENV === 'production') throw err;
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
  }): Promise<UserEntity> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      if (localUsers.has(normalizedEmail)) {
        throw AppError.badRequest('User with this email already exists', 'EMAIL_ALREADY_EXISTS');
      }

      const user: UserEntity = {
        id: `usr_${Date.now()}`,
        name: data.name,
        arabic_name: data.arabic_name,
        email: normalizedEmail,
        password_hash: data.password_hash,
        role: data.role,
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
          role: data.role,
        },
      });

      return {
        id: user.id,
        name: user.name,
        arabic_name: user.arabicName,
        email: user.email,
        password_hash: user.passwordHash,
        role: user.role,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (env.NODE_ENV === 'production') throw err;

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
        role: data.role,
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
            }
          : null,
      };
    } catch (err) {
      if (env.NODE_ENV === 'production') throw err;
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
        for (const s of localSessions.values()) {
          if (s.refreshTokenHash === refreshTokenHash) {
            const user = await this.findById(s.userId);
            return { ...s, user };
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
            }
          : null,
      };
    } catch (err) {
      if (env.NODE_ENV === 'production') throw err;
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
        if (env.NODE_ENV === 'production') throw err;
      }
    }
  }

  /**
   * Revokes all active sessions for a user (used on token reuse detection or global sign-out).
   */
  static async revokeAllUserSessions(userId: string): Promise<void> {
    const isDbReady = await testPrismaConnection();

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
        if (env.NODE_ENV === 'production') throw err;
      }
    }
  }

  /**
   * Lists all users (sanitized, excluding password hashes).
   */
  static async listUsers(): Promise<Array<Omit<UserEntity, 'password_hash'>>> {
    const isDbReady = await testPrismaConnection();

    if (!isDbReady) {
      return Array.from(localUsers.values()).map((u) => ({
        id: u.id,
        name: u.name,
        arabic_name: u.arabic_name,
        email: u.email,
        role: u.role,
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
      }));
    } catch (err) {
      if (env.NODE_ENV === 'production') throw err;
      return Array.from(localUsers.values()).map((u) => ({
        id: u.id,
        name: u.name,
        arabic_name: u.arabic_name,
        email: u.email,
        role: u.role,
      }));
    }
  }

  /**
   * Updates a user's password hash in storage.
   */
  static async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    const isDbReady = await testPrismaConnection();

    for (const u of localUsers.values()) {
      if (u.id === userId) {
        u.password_hash = newPasswordHash;
      }
    }

    if (isDbReady) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { passwordHash: newPasswordHash },
        });
      } catch (err) {
        if (env.NODE_ENV === 'production') throw err;
      }
    }
  }
}

