import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import cookie from 'cookie';
import { verifyAccessToken } from '../utils/jwt';
import { env } from '../config/env';
import { prisma } from '../config/prisma';

let io: Server | null = null;

interface AuthedSocket extends Socket {
  userId?: string;
}

export function getIO(): Server | null {
  return io;
}

export function initSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  // ── Authentication middleware: every socket connection must carry a valid access token ──
  io.use((socket: AuthedSocket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      const tokenFromCookie = rawCookie ? cookie.parse(rawCookie).accessToken : undefined;
      const tokenFromAuth = socket.handshake.auth?.token as string | undefined;
      const token = tokenFromAuth ?? tokenFromCookie;

      if (!token) return next(new Error('Authentication required'));
      const payload = verifyAccessToken(token);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket: AuthedSocket) => {
    const userId = socket.userId!;

    // Personal room for direct notification/message delivery.
    socket.join(`user:${userId}`);

    await prisma.user.update({ where: { id: userId }, data: { isOnline: true, lastSeenAt: new Date() } });
    socket.broadcast.emit('presence:update', { userId, isOnline: true });

    // ── Conversations: join all rooms the user participates in ──
    const participantRows = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    participantRows.forEach((p) => socket.join(`conversation:${p.conversationId}`));

    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // ── Typing indicators ──
    socket.on('typing:start', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:update', { conversationId, userId, isTyping: true });
    });

    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:update', { conversationId, userId, isTyping: false });
    });

    // ── Messages: persisted via REST, but broadcast here for instant delivery ──
    // (Actual creation happens through POST /api/messages so it goes through
    // validation + sanitization; this listener is for ephemeral signals only.)

    socket.on('message:read', async ({ conversationId }: { conversationId: string }) => {
      await prisma.conversationParticipant.updateMany({
        where: { conversationId, userId },
        data: { lastReadAt: new Date() },
      });
      socket.to(`conversation:${conversationId}`).emit('message:read-receipt', { conversationId, userId, at: new Date() });
    });

    socket.on('disconnect', async () => {
      // Only mark offline if no other sockets for this user remain connected.
      const sockets = await io!.in(`user:${userId}`).fetchSockets();
      if (sockets.length === 0) {
        await prisma.user.update({ where: { id: userId }, data: { isOnline: false, lastSeenAt: new Date() } });
        socket.broadcast.emit('presence:update', { userId, isOnline: false });
      }
    });
  });

  return io;
}

/** Broadcasts a newly created message to everyone in the conversation room. */
export function emitNewMessage(conversationId: string, message: unknown) {
  io?.to(`conversation:${conversationId}`).emit('message:new', message);
}
