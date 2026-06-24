import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { AuthedRequest } from '../middleware/auth';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../config/cloudinary';
import { createPostWithSideEffects, postInclude, attachViewerContext } from '../services/post.service';
import { extractHashtags } from '../utils/textParsing';

const PAGE_SIZE = 10;

/** Cursor-paginated personalized feed: own posts + posts from followed users. */
export const getFeed = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const cursor = req.query.cursor as string | undefined;
  const userId = req.user!.id;

  const following = await prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
  const authorIds = [userId, ...following.map((f) => f.followingId)];

  const posts = await prisma.post.findMany({
    where: { authorId: { in: authorIds }, isDeleted: false, parentId: null },
    include: postInclude,
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = posts.length > PAGE_SIZE;
  const page = hasMore ? posts.slice(0, PAGE_SIZE) : posts;
  const withContext = await attachViewerContext(page, userId);

  res.json({ posts: withContext, nextCursor: hasMore ? page[page.length - 1].id : null });
});

/** Explore feed: most-engaged recent posts from everyone (simple trending heuristic). */
export const getExplore = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const cursor = req.query.cursor as string | undefined;

  const posts = await prisma.post.findMany({
    where: { isDeleted: false, parentId: null },
    include: postInclude,
    orderBy: [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = posts.length > PAGE_SIZE;
  const page = hasMore ? posts.slice(0, PAGE_SIZE) : posts;
  const withContext = await attachViewerContext(page, req.user?.id);

  res.json({ posts: withContext, nextCursor: hasMore ? page[page.length - 1].id : null });
});

export const getUserPosts = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { username } = req.params;
  const cursor = req.query.cursor as string | undefined;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw ApiError.notFound('User not found');

  const posts = await prisma.post.findMany({
    where: { authorId: user.id, isDeleted: false, parentId: null },
    include: postInclude,
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = posts.length > PAGE_SIZE;
  const page = hasMore ? posts.slice(0, PAGE_SIZE) : posts;
  const withContext = await attachViewerContext(page, req.user?.id);

  res.json({ posts: withContext, nextCursor: hasMore ? page[page.length - 1].id : null });
});

export const getPostById = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.postId },
    include: postInclude,
  });
  if (!post || post.isDeleted) throw ApiError.notFound('Post not found');

  const [withContext] = await attachViewerContext([post], req.user?.id);
  res.json({ post: withContext });
});

export const createPost = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { content } = req.body;
  const files = (req.files as Express.Multer.File[]) ?? [];

  if (!content?.trim() && files.length === 0) {
    throw ApiError.badRequest('Post must contain text or at least one image');
  }
  if (files.length > 4) throw ApiError.badRequest('Maximum 4 images per post');

  const uploaded = await Promise.all(
    files.map((f) => uploadBufferToCloudinary(f.buffer, 'posts', { width: 1600 }))
  );

  const post = await createPostWithSideEffects(req.user!.id, content ?? '', uploaded);

  const full = await prisma.post.findUnique({ where: { id: post.id }, include: postInclude });
  res.status(201).json({ post: full });
});

export const updatePost = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.postId } });
  if (!post || post.isDeleted) throw ApiError.notFound('Post not found');
  if (post.authorId !== req.user!.id) throw ApiError.forbidden('You can only edit your own posts');

  const { content } = req.body;
  if (!content?.trim()) throw ApiError.badRequest('Content cannot be empty');

  // Re-derive hashtags on edit so trending stays accurate.
  const oldHashtags = await prisma.postHashtag.findMany({ where: { postId: post.id } });
  await prisma.postHashtag.deleteMany({ where: { postId: post.id } });
  const newTags = extractHashtags(content);
  for (const tag of newTags) {
    const hashtag = await prisma.hashtag.upsert({
      where: { tag },
      update: { useCount: { increment: 1 } },
      create: { tag, useCount: 1 },
    });
    await prisma.postHashtag.create({ data: { postId: post.id, hashtagId: hashtag.id } });
  }
  void oldHashtags; // old links already removed; counts intentionally not decremented (simple heuristic)

  const updated = await prisma.post.update({
    where: { id: post.id },
    data: { content, isEdited: true, editedAt: new Date() },
    include: postInclude,
  });

  res.json({ post: updated });
});

export const deletePost = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.postId }, include: { images: true } });
  if (!post || post.isDeleted) throw ApiError.notFound('Post not found');
  if (post.authorId !== req.user!.id && req.user!.role === 'USER') {
    throw ApiError.forbidden('You can only delete your own posts');
  }

  await prisma.post.update({ where: { id: post.id }, data: { isDeleted: true } });
  await prisma.profile.update({ where: { userId: post.authorId }, data: { postsCount: { decrement: 1 } } });

  // Best-effort cleanup of Cloudinary assets.
  await Promise.all(post.images.map((img) => deleteFromCloudinary(img.publicId)));

  res.json({ message: 'Post deleted' });
});
