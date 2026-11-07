import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../database/prisma.js';

export function generateSecurePassword(): string {
  const length = 20;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  let password = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
}

async function main() {
  const email = 'admin@decidixapp.tech';
  const plainPassword = process.env.ADMIN_BOOTSTRAP_PASS;

  if (!plainPassword || plainPassword.length < 12) {
    throw new Error('ADMIN_BOOTSTRAP_PASS must be provided and at least 12 characters.');
  }

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        role: 'admin',
        status: 'active',
        isActive: true,
        mustChangePassword: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        passwordHash,
      },
    });
    console.log(`[BOOTSTRAP_ADMIN] Admin account ${email} updated successfully with role: admin, status: active, mustChangePassword: true.`);
  } else {
    await prisma.user.create({
      data: {
        id: `usr_${Date.now()}`,
        name: 'Decidix Administrator',
        arabicName: 'مدير منصة ديسيديكس',
        email,
        passwordHash,
        role: 'admin',
        status: 'active',
        isActive: true,
        mustChangePassword: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`[BOOTSTRAP_ADMIN] Admin account ${email} created successfully with role: admin, status: active, mustChangePassword: true.`);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Failed to retrieve user after saving.');
  }

  const matches = await bcrypt.compare(plainPassword, user.passwordHash);
  if (!matches) {
    throw new Error('Password verification check failed after save.');
  }

  console.log(`[BOOTSTRAP_ADMIN] Credentials verification succeeded against database for ${email}.`);
}

main()
  .catch((err) => {
    console.error('[BOOTSTRAP_ADMIN] Error:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
