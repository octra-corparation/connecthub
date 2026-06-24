import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { AuthedRequest } from '../middleware/auth';
import { createNotification } from '../services/notification.service';

export const likePost = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { postId } = req.params;
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.isDeleted) throw ApiError.notFound('Post not found');

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: req.user!.id, postId } },
  });
  if (existing) throw ApiError.conflict('Already liked');

  await prisma.like.create({ data: { userId: req.user!.id, postId } });
  await createNotification({ recipientId: post.authorId, actorId: req.user!.id, type: 'LIKE', postId });

  res.status(201).json({ message: 'Liked' });
});

export const unlikePost = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { postId } = req.params;
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: req.user!.id, postId } },
  });
  if (!existing) throw ApiError.notFound('Like not found');
  await prisma.like.delete({ where: { id: existing.id } });
  res.json({ message: 'Unliked' });
});

export const likeComment = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { commentId } = req.params;
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.isDeleted) throw ApiError.notFound('Comment not found');

  const existing = await prisma.like.findUnique({
    where: { userId_commentId: { userId: req.user!.id, commentId } },
  });
  if (existing) throw ApiError.conflict('Already liked');

  await prisma.like.create({ data: { userId: req.user!.id, commentId } });
  await createNotification({ recipientId: comment.authorId, actorId: req.user!.id, type: 'LIKE', commentId });

  res.status(201).json({ message: 'Liked' });
});

export const unlikeComment = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { commentId } = req.params;
  const existing = await prisma.like.findUnique({
    where: { userId_commentId: { userId: req.user!.id, commentId } },
  });
  if (!existing) throw ApiError.notFound('Like not found');
  await prisma.like.delete({ where: { id: existing.id } });
  res.json({ message: 'Unliked' });
});

export const repostPost = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { postId } = req.params;
  const { comment } = req.body;
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.isDeleted) throw ApiError.notFound('Post not found');

  const existing = await prisma.repost.findUnique({
    where: { userId_postId: { userId: req.user!.id, postId } },
  });
  if (existing) throw ApiError.conflict('Already reposted');

  const repost = await prisma.repost.create({
    data: { userId: req.user!.id, postId, comment: comment?.trim() || null },
  });
  await createNotification({ recipientId: post.authorId, actorId: req.user!.id, type: 'REPOST', postId });

  res.status(201).json({ repost });
});

export const undoRepost = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { postId } = req.params;
  const existing = await prisma.repost.findUnique({
    where: { userId_postId: { userId: req.user!.id, postId } },
  });
  if (!existing) throw ApiError.notFound('Repost not found');
  await prisma.repost.delete({ where: { id: existing.id } });
  res.json({ message: 'Repost removed' });
});

export const bookmarkPost = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { postId } = req.params;
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.isDeleted) throw ApiError.notFound('Post not found');

  const existing = await prisma.bookmark.findUnique({
    where: { userId_postId: { userId: req.user!.id, postId } },
  });
  if (existing) throw ApiError.conflict('Already bookmarked');

  await prisma.bookmark.create({ data: { userId: req.user!.id, postId } });
  res.status(201).json({ message: 'Bookmarked' });
});

export const removeBookmark = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { postId } = req.params;
  const existing = await prisma.bookmark.findUnique({
    where: { userId_postId: { userId: req.user!.id, postId } },
  });
  if (!existing) throw ApiError.notFound('Bookmark not found');
  await prisma.bookmark.delete({ where: { id: existing.id } });
  res.json({ message: 'Bookmark removed' });
});

export const getBookmarks = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: req.user!.id },
    include: {
      post: {
        include: {
          author: { include: { profile: true } },
          images: true,
          _count: { select: { likes: true, comments: true, reposts: true, bookmarks: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  res.json({ posts: bookmarks.map((b) => b.post) });
});
