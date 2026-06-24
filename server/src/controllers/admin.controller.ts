import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { AuthedRequest } from '../middleware/auth';

export const getAnalyticsOverview = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, totalPosts, totalComments, activeToday, newUsers7d, newPosts7d, pendingReports, suspendedUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.post.count({ where: { isDeleted: false } }),
      prisma.comment.count({ where: { isDeleted: false } }),
      prisma.user.count({ where: { lastSeenAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.user.count({ where: { createdAt: { gte: since7d } } }),
      prisma.post.count({ where: { createdAt: { gte: since7d }, isDeleted: false } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { isActive: false } }),
    ]);

  // Simple daily signup counts for the last 30 days, for a chart on the frontend.
  const recentUsers = await prisma.user.findMany({
    where: { createdAt: { gte: since30d } },
    select: { createdAt: true },
  });
  const signupsByDay: Record<string, number> = {};
  for (const u of recentUsers) {
    const day = u.createdAt.toISOString().slice(0, 10);
    signupsByDay[day] = (signupsByDay[day] ?? 0) + 1;
  }

  res.json({
    totalUsers,
    totalPosts,
    totalComments,
    activeToday,
    newUsers7d,
    newPosts7d,
    pendingReports,
    suspendedUsers,
    signupsByDay,
  });
});

export const listUsers = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const q = (req.query.q as string)?.trim();
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = 20;

  const where = q
    ? { OR: [{ username: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    users: users.map(({ passwordHash, resetToken, verifyToken, ...u }) => u),
    total,
    page,
    pageSize,
  });
});

export const suspendUser = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { userId } = req.params;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw ApiError.notFound('User not found');
  if (target.role === 'ADMIN') throw ApiError.forbidden('Cannot suspend an admin');

  await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  res.json({ message: 'User suspended' });
});

export const reinstateUser = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { userId } = req.params;
  await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
  res.json({ message: 'User reinstated' });
});

export const changeUserRole = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;
  if (!['USER', 'ADMIN', 'MODERATOR'].includes(role)) throw ApiError.badRequest('Invalid role');

  await prisma.user.update({ where: { id: userId }, data: { role } });
  res.json({ message: 'Role updated' });
});

export const listReports = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const status = req.query.status as string | undefined;

  const reports = await prisma.report.findMany({
    where: status ? { status: status as 'PENDING' | 'REVIEWED' | 'ACTION_TAKEN' | 'DISMISSED' } : {},
    include: {
      reporter: { include: { profile: true } },
      reportedUser: { include: { profile: true } },
      post: { include: { author: { include: { profile: true } } } },
      comment: { include: { author: { include: { profile: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json({ reports });
});

export const resolveReport = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { reportId } = req.params;
  const { status, reviewNote, removeContent } = req.body;

  if (!['REVIEWED', 'ACTION_TAKEN', 'DISMISSED'].includes(status)) {
    throw ApiError.badRequest('Invalid status');
  }

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw ApiError.notFound('Report not found');

  if (removeContent && status === 'ACTION_TAKEN') {
    if (report.postId) await prisma.post.update({ where: { id: report.postId }, data: { isDeleted: true } });
    if (report.commentId) await prisma.comment.update({ where: { id: report.commentId }, data: { isDeleted: true } });
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: { status, reviewNote, reviewedById: req.user!.id },
  });

  res.json({ report: updated });
});

export const createReport = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { targetType, reason, postId, commentId, reportedUserId } = req.body;
  if (!['POST', 'COMMENT', 'USER'].includes(targetType)) throw ApiError.badRequest('Invalid target type');
  if (!reason?.trim()) throw ApiError.badRequest('Reason is required');

  const report = await prisma.report.create({
    data: {
      reporterId: req.user!.id,
      targetType,
      reason,
      postId: targetType === 'POST' ? postId : undefined,
      commentId: targetType === 'COMMENT' ? commentId : undefined,
      reportedUserId: targetType === 'USER' ? reportedUserId : undefined,
    },
  });

  res.status(201).json({ report });
});
