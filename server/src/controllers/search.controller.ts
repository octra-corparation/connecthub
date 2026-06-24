import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../config/prisma';
import { AuthedRequest } from '../middleware/auth';
import { postInclude, attachViewerContext } from '../services/post.service';

export const search = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const q = (req.query.q as string)?.trim();
  if (!q) return res.json({ users: [], posts: [], hashtags: [] });

  const cleanTag = q.replace(/^#/, '');

  const [users, posts, hashtags] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { profile: { displayName: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: { profile: true },
      take: 10,
    }),
    prisma.post.findMany({
      where: { isDeleted: false, content: { contains: q, mode: 'insensitive' } },
      include: postInclude,
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.hashtag.findMany({
      where: { tag: { contains: cleanTag, mode: 'insensitive' } },
      orderBy: { useCount: 'desc' },
      take: 10,
    }),
  ]);

  const postsWithContext = await attachViewerContext(posts, req.user?.id);

  res.json({
    users: users.map(({ passwordHash, resetToken, verifyToken, ...u }) => u),
    posts: postsWithContext,
    hashtags,
  });
});

export const trendingHashtags = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const hashtags = await prisma.hashtag.findMany({
    orderBy: { useCount: 'desc' },
    take: 10,
  });
  res.json({ hashtags });
});

export const getPostsByHashtag = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { tag } = req.params;
  const posts = await prisma.post.findMany({
    where: { isDeleted: false, hashtags: { some: { hashtag: { tag: tag.toLowerCase() } } } },
    include: postInclude,
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  const withContext = await attachViewerContext(posts, req.user?.id);
  res.json({ posts: withContext });
});
