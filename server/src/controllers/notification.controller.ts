import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../config/prisma';
import { AuthedRequest } from '../middleware/auth';

export const getNotifications = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const cursor = req.query.cursor as string | undefined;

  const notifications = await prisma.notification.findMany({
    where: { recipientId: req.user!.id },
    include: { actor: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' },
    take: 21,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = notifications.length > 20;
  const page = hasMore ? notifications.slice(0, 20) : notifications;

  res.json({ notifications: page, nextCursor: hasMore ? page[page.length - 1].id : null });
});

export const getUnreadCount = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const count = await prisma.notification.count({ where: { recipientId: req.user!.id, isRead: false } });
  res.json({ count });
});

export const markAsRead = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await prisma.notification.update({
    where: { id: req.params.notificationId },
    data: { isRead: true },
  });
  res.json({ message: 'Marked as read' });
});

export const markAllAsRead = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { recipientId: req.user!.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ message: 'All marked as read' });
});
