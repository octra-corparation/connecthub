import { prisma } from '../config/prisma';
import { getIO } from '../sockets';
import { NotificationType } from '@prisma/client';

interface CreateNotificationInput {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  postId?: string;
  commentId?: string;
  message?: string;
}

/**
 * Persists a notification and pushes it in real time over Socket.IO if the
 * recipient is connected. Silently no-ops self-notifications (e.g. liking
 * your own post shouldn't notify you).
 */
export async function createNotification(input: CreateNotificationInput) {
  if (input.actorId && input.actorId === input.recipientId) return null;

  const notification = await prisma.notification.create({
    data: input,
    include: {
      actor: { include: { profile: true } },
    },
  });

  const io = getIO();
  io?.to(`user:${input.recipientId}`).emit('notification:new', notification);

  return notification;
}
