import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../utils/asyncHandler';
import * as authService from '../services/auth.service';
import { verifyGoogleIdToken } from '../services/googleAuth.service';
import { sendPasswordResetEmail } from '../services/email.service';
import { AuthedRequest } from '../middleware/auth';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';

const REFRESH_COOKIE = 'refreshToken';
const ACCESS_COOKIE = 'accessToken';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...authService.cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...authService.cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function publicUser(user: { id: string; email: string; username: string; role: string; isVerified: boolean }) {
  return { id: user.id, email: user.email, username: user.username, role: user.role, isVerified: user.isVerified };
}

export const register = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  const user = await authService.registerUser(email, username, password);
  const tokens = await authService.issueTokenPair(user.id, user.role);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.status(201).json({ user: publicUser(user), accessToken: tokens.accessToken });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.validateCredentials(email, password);
  const tokens = await authService.issueTokenPair(user.id, user.role);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ user: publicUser(user), accessToken: tokens.accessToken });
});

export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken is required' });

  const profile = await verifyGoogleIdToken(idToken);
  const user = await authService.findOrCreateGoogleUser(profile);
  const tokens = await authService.issueTokenPair(user.id, user.role);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ user: publicUser(user), accessToken: tokens.accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token provided' });

  const tokens = await authService.rotateRefreshToken(token);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ accessToken: tokens.accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) await authService.revokeRefreshToken(token);
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  res.json({ message: 'Logged out' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.createPasswordResetToken(email);
  if (result) {
    const resetUrl = `${env.clientUrl}/reset-password?token=${result.token}`;
    await sendPasswordResetEmail(result.user.email, resetUrl);
  }
  // Same response regardless of whether the email exists, to prevent enumeration.
  res.json({ message: 'If an account exists for this email, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  await authService.resetPasswordWithToken(token, password);
  res.json({ message: 'Password reset successful. You can now log in.' });
});

export const changePassword = asyncHandler(async (req: AuthedRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.passwordHash) throw ApiError.badRequest('No password set (OAuth account)');
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ message: 'Password changed' });
});

export const me = asyncHandler(async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { profile: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, resetToken, verifyToken, ...safe } = user;
  res.json({ user: safe });
});
