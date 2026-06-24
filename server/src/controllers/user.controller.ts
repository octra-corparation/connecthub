import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { AuthedRequest } from '../middleware/auth';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../config/cloudinary';
import { createNotification } from '../services/notification.service';

function safeUser<T extends { passwordHash?: string | null; resetToken?: string | null; verifyToken?: string | null }>(
  user: T
) {
  const { passwordHash, resetToken, verifyToken, ...rest } = user;
  return rest;
}

export const getUserByUsername = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { username } = req.params;
  const user = await prisma.user.findUnique({
    where: { username },
    include: { profile: true },
  });
  if (!user || !user.isActive) throw ApiError.notFound('User not found');

  let isFollowing = false;
  let isFollowedBy = false;
  if (req.user) {
    const [a, b] = await Promise.all([
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: req.user.id, followingId: user.id } },
      }),
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: user.id, followingId: req.user.id } },
      }),
    ]);
    isFollowing = !!a;
    isFollowedBy = !!b;
  }

  res.json({ user: safeUser(user), isFollowing, isFollowedBy });
});

export const updateProfile = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { displayName, bio, website, location, username } = req.body;

  if (username) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== req.user!.id) throw ApiError.conflict('Username is taken');
    await prisma.user.update({ where: { id: req.user!.id }, data: { username } });
  }

  const profile = await prisma.profile.update({
    where: { userId: req.user!.id },
    data: {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(website !== undefined ? { website } : {}),
      ...(location !== undefined ? { location } : {}),
    },
  });

  res.json({ profile });
});

export const uploadAvatar = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No image file provided');

  const existing = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
  const result = await uploadBufferToCloudinary(req.file.buffer, 'avatars', {
    width: 500,
    height: 500,
    crop: 'fill',
  });

  const profile = await prisma.profile.update({
    where: { userId: req.user!.id },
    data: { avatarUrl: result.url, avatarPublicId: result.publicId },
  });

  if (existing?.avatarPublicId) await deleteFromCloudinary(existing.avatarPublicId);

  res.json({ profile });
});

export const uploadCover = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No image file provided');

  const existing = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
  const result = await uploadBufferToCloudinary(req.file.buffer, 'covers', { width: 1500, height: 500, crop: 'fill' });

  const profile = await prisma.profile.update({
    where: { userId: req.user!.id },
    data: { coverUrl: result.url, coverPublicId: result.publicId },
  });

  if (existing?.coverPublicId) await deleteFromCloudinary(existing.coverPublicId);

  res.json({ profile });
});

export const followUser = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const targetId = req.params.userId;
  if (targetId === req.user!.id) throw ApiError.badRequest('You cannot follow yourself');

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw ApiError.notFound('User not found');

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: req.user!.id, followingId: targetId } },
  });
  if (existing) throw ApiError.conflict('Already following this user');

  await prisma.$transaction([
    prisma.follow.create({ data: { followerId: req.user!.id, followingId: targetId } }),
    prisma.profile.update({ where: { userId: targetId }, data: { followersCount: { increment: 1 } } }),
    prisma.profile.update({ where: { userId: req.user!.id }, data: { followingCount: { increment: 1 } } }),
  ]);

  await createNotification({
    recipientId: targetId,
    actorId: req.user!.id,
    type: 'FOLLOW',
  });

  res.status(201).json({ message: 'Followed' });
});

export const unfollowUser = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const targetId = req.params.userId;
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: req.user!.id, followingId: targetId } },
  });
  if (!existing) throw ApiError.notFound('You are not following this user');

  await prisma.$transaction([
    prisma.follow.delete({ where: { id: existing.id } }),
    prisma.profile.update({ where: { userId: targetId }, data: { followersCount: { decrement: 1 } } }),
    prisma.profile.update({ where: { userId: req.user!.id }, data: { followingCount: { decrement: 1 } } }),
  ]);

  res.json({ message: 'Unfollowed' });
});

export const getFollowers = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: req.params.username } });
  if (!user) throw ApiError.notFound('User not found');

  const followers = await prisma.follow.findMany({
    where: { followingId: user.id },
    include: { follower: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json({ followers: followers.map((f) => safeUser(f.follower)) });
});

export const getFollowing = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: req.params.username } });
  if (!user) throw ApiError.notFound('User not found');

  const following = await prisma.follow.findMany({
    where: { followerId: user.id },
    include: { following: { include: { profile: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json({ following: following.map((f) => safeUser(f.following)) });
});

export const suggestedUsers = asyncHandler(async (req: AuthedRequest, res: Response) => {
  // Suggest active users not already followed, ranked by follower count.
  const alreadyFollowing = await prisma.follow.findMany({
    where: { followerId: req.user!.id },
    select: { followingId: true },
  });
  const excludeIds = [req.user!.id, ...alreadyFollowing.map((f) => f.followingId)];

  const users = await prisma.user.findMany({
    where: { id: { notIn: excludeIds }, isActive: true },
    include: { profile: true },
    orderBy: { profile: { followersCount: 'desc' } },
    take: 5,
  });

  res.json({ users: users.map(safeUser) });
});
