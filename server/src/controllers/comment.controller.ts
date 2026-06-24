import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { AuthedRequest } from '../middleware/auth';
import { createNotification } from '../services/notification.service';

const commentAuthorInclude = {
  author: { include: { profile: true } },
  _count: { select: { likes: true, replies: true } },
};

export const getComments = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { postId } = req.params;
  const comments = await prisma.comment.findMany({
    where: { postId, parentId: null, isDeleted: false },
    include: commentAuthorInclude,
    orderBy: { createdAt: 'asc' },
  });
  res.json({ comments });
});

export const getReplies = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { commentId } = req.params;
  const replies = await prisma.comment.findMany({
    where: { parentId: commentId, isDeleted: false },
    include: commentAuthorInclude,
    orderBy: { createdAt: 'asc' },
  });
  res.json({ replies });
});

export const createComment = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { postId } = req.params;
  const { content, parentId } = req.body;

  if (!content?.trim()) throw ApiError.badRequest('Comment cannot be empty');

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.isDeleted) throw ApiError.notFound('Post not found');

  let parent = null;
  if (parentId) {
    parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (!parent || parent.isDeleted) throw ApiError.notFound('Parent comment not found');
  }

  const comment = await prisma.comment.create({
    data: { postId, authorId: req.user!.id, content, parentId: parentId ?? null },
    include: commentAuthorInclude,
  });

  if (parent) {
    await createNotification({
      recipientId: parent.authorId,
      actorId: req.user!.id,
      type: 'REPLY',
      postId,
      commentId: parent.id,
    });
  } else {
    await createNotification({
      recipientId: post.authorId,
      actorId: req.user!.id,
      type: 'COMMENT',
      postId,
      commentId: comment.id,
    });
  }

  res.status(201).json({ comment });
});

export const updateComment = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.commentId } });
  if (!comment || comment.isDeleted) throw ApiError.notFound('Comment not found');
  if (comment.authorId !== req.user!.id) throw ApiError.forbidden('You can only edit your own comments');

  const { content } = req.body;
  if (!content?.trim()) throw ApiError.badRequest('Content cannot be empty');

  const updated = await prisma.comment.update({
    where: { id: comment.id },
    data: { content, isEdited: true },
    include: commentAuthorInclude,
  });

  res.json({ comment: updated });
});

export const deleteComment = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.commentId } });
  if (!comment || comment.isDeleted) throw ApiError.notFound('Comment not found');
  if (comment.authorId !== req.user!.id && req.user!.role === 'USER') {
    throw ApiError.forbidden('You can only delete your own comments');
  }

  await prisma.comment.update({ where: { id: comment.id }, data: { isDeleted: true } });
  res.json({ message: 'Comment deleted' });
});
