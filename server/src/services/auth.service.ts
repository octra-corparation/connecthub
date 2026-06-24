import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ApiError } from '../utils/apiError';
import { env } from '../config/env';

const REFRESH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function registerUser(email: string, username: string, password: string) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    throw ApiError.conflict(
      existing.email === email ? 'An account with this email already exists' : 'Username is taken'
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      profile: { create: { displayName: username } },
    },
    include: { profile: true },
  });

  return user;
}

export async function validateCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been suspended');
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  return user;
}

/** Issues an access + refresh token pair, persisting the refresh token for revocation support. */
export async function issueTokenPair(userId: string, role: 'USER' | 'ADMIN' | 'MODERATOR') {
  const refreshRecord = await prisma.refreshToken.create({
    data: {
      token: crypto.randomUUID(), // placeholder, replaced below once we know the JWT
      userId,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRY_MS),
    },
  });

  const refreshToken = signRefreshToken({ userId, tokenId: refreshRecord.id });
  const accessToken = signAccessToken({ userId, role });

  // Store the actual signed JWT so we can do a fast lookup/blacklist on rotation.
  await prisma.refreshToken.update({ where: { id: refreshRecord.id }, data: { token: refreshToken } });

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(oldToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(oldToken);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });
  if (!stored || stored.revoked || stored.token !== oldToken || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token expired or revoked');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Account unavailable');

  // Revoke old, issue new (rotation prevents replay of stolen refresh tokens).
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
  return issueTokenPair(user.id, user.role);
}

export async function revokeRefreshToken(token: string) {
  await prisma.refreshToken.updateMany({ where: { token }, data: { revoked: true } });
}

export async function createPasswordResetToken(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always behave the same whether or not the user exists, to avoid email enumeration.
  if (!user) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpires },
  });

  return { user, token };
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExpires: { gt: new Date() } },
  });
  if (!user) throw ApiError.badRequest('Invalid or expired reset token');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpires: null },
  });
}

export async function findOrCreateGoogleUser(googleProfile: {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
}) {
  let user = await prisma.user.findUnique({ where: { googleId: googleProfile.googleId } });
  if (user) return user;

  // Link by email if an account already exists with local auth.
  user = await prisma.user.findUnique({ where: { email: googleProfile.email } });
  if (user) {
    return prisma.user.update({
      where: { id: user.id },
      data: { googleId: googleProfile.googleId, isVerified: true },
    });
  }

  // Generate a unique username from the email/name.
  const base = (googleProfile.name ?? googleProfile.email.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20) || 'user';
  let username = base;
  let suffix = 0;
  while (await prisma.user.findUnique({ where: { username } })) {
    suffix += 1;
    username = `${base}${suffix}`;
  }

  return prisma.user.create({
    data: {
      email: googleProfile.email,
      username,
      provider: 'GOOGLE',
      googleId: googleProfile.googleId,
      isVerified: true,
      profile: {
        create: {
          displayName: googleProfile.name ?? username,
          avatarUrl: googleProfile.picture,
        },
      },
    },
  });
}

export const cookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? ('strict' as const) : ('lax' as const),
  path: '/',
};
