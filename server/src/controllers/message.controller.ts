import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { AuthedRequest } from '../middleware/auth';
import { emitNewMessage } from '../sockets';
import { createNotification } from '../services/notification.service';

const participantInclude = {
  participants: { include: { user: { include: { profile: true } } } },
};

export const getConversations = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.id;

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      ...participantInclude,
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const shaped = conversations.map((c) => {
    const me = c.participants.find((p) => p.userId === userId);
    const lastMessage = c.messages[0];
    const unread = lastMessage && me?.lastReadAt ? lastMessage.createdAt > me.lastReadAt : !!lastMessage;
    return {
      id: c.id,
      type: c.type,
      participants: c.participants.filter((p) => p.userId !== userId).map((p) => p.user),
      lastMessage: lastMessage ?? null,
      unread,
      updatedAt: c.updatedAt,
    };
  });

  res.json({ conversations: shaped });
});

/** Finds an existing direct conversation between two users, or creates one. */
export const getOrCreateDirectConversation = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.id;
  const { userId: otherUserId } = req.params;

  if (userId === otherUserId) throw ApiError.badRequest('Cannot message yourself');
  const other = await prisma.user.findUnique({ where: { id: otherUserId } });
  if (!other) throw ApiError.notFound('User not found');

  const existing = await prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: otherUserId } } },
      ],
    },
    include: participantInclude,
  });

  if (existing) return res.json({ conversation: existing });

  const created = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      participants: { create: [{ userId }, { userId: otherUserId }] },
    },
    include: participantInclude,
  });

  res.status(201).json({ conversation: created });
});

export const getMessages = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { conversationId } = req.params;
  const cursor = req.query.cursor as string | undefined;

  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: req.user!.id } },
  });
  if (!isParticipant) throw ApiError.forbidden('Not a participant in this conversation');

  const messages = await prisma.message.findMany({
    where: { conversationId, isDeleted: false },
    include: { sender: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' },
    take: 31,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = messages.length > 30;
  const page = hasMore ? messages.slice(0, 30) : messages;

  res.json({ messages: page.reverse(), nextCursor: hasMore ? page[0].id : null });
});

export const sendMessage = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { conversationId } = req.params;
  const { content } = req.body;

  if (!content?.trim()) throw ApiError.badRequest('Message cannot be empty');

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: req.user!.id } },
  });
  if (!participant) throw ApiError.forbidden('Not a participant in this conversation');

  const message = await prisma.message.create({
    data: { conversationId, senderId: req.user!.id, content },
    include: { sender: { include: { profile: true } } },
  });

  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  emitNewMessage(conversationId, message);

  // Notify other participants.
  const others = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: req.user!.id } },
  });
  for (const p of others) {
    await createNotification({
      recipientId: p.userId,
      actorId: req.user!.id,
      type: 'MESSAGE',
      message: content.slice(0, 80),
    });
  }

  res.status(201).json({ message });
});

export const markConversationRead = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { conversationId } = req.params;
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId: req.user!.id },
    data: { lastReadAt: new Date() },
  });
  res.json({ message: 'Marked as read' });
});
