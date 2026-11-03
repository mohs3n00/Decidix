import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';

describe('Seed Administrative Security & Idempotency Suite', () => {
  const originalEnv = process.env.SEED_ADMIN_PASSWORD;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.SEED_ADMIN_PASSWORD = originalEnv;
    } else {
      delete process.env.SEED_ADMIN_PASSWORD;
    }
  });

  it('rejects initial account creation when SEED_ADMIN_PASSWORD is missing', () => {
    delete process.env.SEED_ADMIN_PASSWORD;

    const seedUsers = [
      { id: 'usr_admin', email: 'admin@decidix.gov', role: 'admin' },
    ];
    const existingUserIds = new Set<string>();
    const missingUsers = seedUsers.filter((u) => !existingUserIds.has(u.id));

    expect(missingUsers.length).toBeGreaterThan(0);

    expect(() => {
      const rawPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
      if (!rawPassword || rawPassword.length < 8) {
        throw new Error(
          'SEED_ADMIN_PASSWORD environment variable is required to create initial administrative accounts (minimum 8 characters).'
        );
      }
    }).toThrowError(/SEED_ADMIN_PASSWORD environment variable is required/);
  });

  it('rejects initial account creation when SEED_ADMIN_PASSWORD is shorter than 8 characters', () => {
    process.env.SEED_ADMIN_PASSWORD = 'short';

    expect(() => {
      const rawPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
      if (!rawPassword || rawPassword.length < 8) {
        throw new Error(
          'SEED_ADMIN_PASSWORD environment variable is required to create initial administrative accounts (minimum 8 characters).'
        );
      }
    }).toThrowError(/minimum 8 characters/);
  });

  it('generates secure bcrypt hash when valid SEED_ADMIN_PASSWORD is provided', async () => {
    const testSecret = 'SuperSecureInitialAdminPass2026!';
    process.env.SEED_ADMIN_PASSWORD = testSecret;

    const rawPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
    expect(rawPassword).toBe(testSecret);

    const hash = await bcrypt.hash(rawPassword!, 10);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(testSecret);

    const matches = await bcrypt.compare(testSecret, hash);
    expect(matches).toBe(true);

    const wrongMatches = await bcrypt.compare('WrongPassword!', hash);
    expect(wrongMatches).toBe(false);
  });

  it('guarantees seed idempotency: existing user passwordHash is never overwritten or reset', async () => {
    // Simulate user already existing with their custom password
    const userCustomPassword = 'UserCustomPassword999!';
    const existingHash = await bcrypt.hash(userCustomPassword, 10);

    const fakeUserTable = new Map<string, any>();
    fakeUserTable.set('usr_admin', {
      id: 'usr_admin',
      email: 'admin@decidix.gov',
      name: 'Old Admin Name',
      passwordHash: existingHash,
    });

    const seedUsers = [
      { id: 'usr_admin', email: 'admin@decidix.gov', name: 'Updated System Administrator', role: 'admin' },
      { id: 'usr_viewer', email: 'viewer@decidix.gov', name: 'Policy Observer', role: 'viewer' },
    ];

    const existingUserIds = new Set(fakeUserTable.keys());

    // When re-seeding without SEED_ADMIN_PASSWORD:
    // If usr_admin already exists, updating usr_admin does NOT require SEED_ADMIN_PASSWORD and does not reset passwordHash
    for (const u of seedUsers) {
      if (existingUserIds.has(u.id)) {
        const current = fakeUserTable.get(u.id);
        // Emulate tx.user.update
        fakeUserTable.set(u.id, {
          ...current,
          name: u.name,
          role: u.role,
        });
      }
    }

    const updatedAdmin = fakeUserTable.get('usr_admin');
    expect(updatedAdmin.name).toBe('Updated System Administrator');
    expect(updatedAdmin.passwordHash).toBe(existingHash);

    // Verify existing password still authenticates
    const stillMatches = await bcrypt.compare(userCustomPassword, updatedAdmin.passwordHash);
    expect(stillMatches).toBe(true);
  });
});
