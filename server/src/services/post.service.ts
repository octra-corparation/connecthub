import { prisma } from '../config/prisma';
import { extractHashtags, extractMentions } from '../utils/textParsing';
import { createNotification } from './notification.service';

interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

export async function createPostWithSideEffects(authorId: string, content: string, images: UploadedImage[]) {
  const hashtags = extractHashtags(content);
  const mentionUsernames = extractMentions(content);

  const mentionedUsers = mentionUsernames.length
    ? await prisma.user.findMany({ where: { username: { in: mentionUsernames } }, select: { id: true } })
    : [];

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        authorId,
        content,
        images: { create: images.map((img, i) => ({ ...img, order: i })) },
      },
    });

    // Upsert hashtags and link them.
    for (const tag of hashtags) {
      const hashtag = await tx.hashtag.upsert({
        where: { tag },
        update: { useCount: { increment: 1 } },
        create: { tag, useCount: 1 },
      });
      await tx.postHashtag.create({ data: { postId: created.id, hashtagId: hashtag.id } });
    }

    // Link mentions.
    for (const user of mentionedUsers) {
      await tx.postMention.create({ data: { postId: created.id, userId: user.id } });
    }

    await tx.profile.update({ where: { userId: authorId }, data: { postsCount: { increment: 1 } } });

    return created;
  });

  // Fire mention notifications outside the transaction (non-critical path).
  for (const user of mentionedUsers) {
    await createNotification({ recipientId: user.id, actorId: authorId, type: 'MENTION', postId: post.id });
  }

  return post;
}

export const postInclude = {
  author: { include: { profile: true } },
  images: { orderBy: { order: 'asc' as const } },
  _count: { select: { likes: true, comments: true, reposts: true, bookmarks: true } },
};

/** Shapes a raw Prisma post (with postInclude) into the API response, adding viewer-specific flags. */
export async function attachViewerContext<T extends { id: string }>(posts: T[], viewerId?: string) {
  if (!viewerId || posts.length === 0) return posts.map((p) => ({ ...p, isLiked: false, isBookmarked: false, isReposted: false }));

  const postIds = posts.map((p) => p.id);
  const [likes, bookmarks, reposts] = await Promise.all([
    prisma.like.findMany({ where: { userId: viewerId, postId: { in: postIds } }, select: { postId: true } }),
    prisma.bookmark.findMany({ where: { userId: viewerId, postId: { in: postIds } }, select: { postId: true } }),
    prisma.repost.findMany({ where: { userId: viewerId, postId: { in: postIds } }, select: { postId: true } }),
  ]);
  const likedSet = new Set(likes.map((l) => l.postId));
  const bookmarkedSet = new Set(bookmarks.map((b) => b.postId));
  const repostedSet = new Set(reposts.map((r) => r.postId));

  return posts.map((p) => ({
    ...p,
    isLiked: likedSet.has(p.id),
    isBookmarked: bookmarkedSet.has(p.id),
    isReposted: repostedSet.has(p.id),
  }));
}
