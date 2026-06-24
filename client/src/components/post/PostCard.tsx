'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Heart, MessageCircle, Repeat2, Bookmark, MoreHorizontal, Trash2, Pencil, Flag } from 'lucide-react';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/timeAgo';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Post } from '@/types';
import toast from 'react-hot-toast';
import { ImageGallery } from './ImageGallery';
import { ReportModal } from './ReportModal';

interface PostCardProps {
  post: Post;
  onDeleted?: (postId: string) => void;
}

function renderContent(content: string) {
  // Lightweight inline rendering of #hashtags and @mentions as links.
  const parts = content.split(/(\s+)/);
  return parts.map((part, i) => {
    if (part.startsWith('#') && part.length > 1) {
      return (
        <Link key={i} href={`/explore/hashtag/${part.slice(1)}`} className="text-brand-500 hover:underline">
          {part}
        </Link>
      );
    }
    if (part.startsWith('@') && part.length > 1) {
      return (
        <Link key={i} href={`/profile/${part.slice(1)}`} className="text-brand-500 hover:underline">
          {part}
        </Link>
      );
    }
    return part;
  });
}

export function PostCard({ post, onDeleted }: PostCardProps) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked);
  const [reposted, setReposted] = useState(post.isReposted);
  const [repostCount, setRepostCount] = useState(post._count.reposts);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  const isOwner = user?.id === post.authorId;
  const displayName = post.author.profile?.displayName ?? post.author.username;

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : c - 1));
    try {
      if (next) await api.post(`/posts/${post.id}/like`);
      else await api.delete(`/posts/${post.id}/like`);
    } catch (err) {
      setLiked(!next);
      setLikeCount((c) => (next ? c - 1 : c + 1));
      toast.error(getApiErrorMessage(err));
    }
  }

  async function toggleBookmark() {
    const next = !bookmarked;
    setBookmarked(next);
    try {
      if (next) await api.post(`/posts/${post.id}/bookmark`);
      else await api.delete(`/posts/${post.id}/bookmark`);
      toast.success(next ? 'Saved to bookmarks' : 'Removed from bookmarks');
    } catch (err) {
      setBookmarked(!next);
      toast.error(getApiErrorMessage(err));
    }
  }

  async function toggleRepost() {
    const next = !reposted;
    setReposted(next);
    setRepostCount((c) => (next ? c + 1 : c - 1));
    try {
      if (next) await api.post(`/posts/${post.id}/repost`);
      else await api.delete(`/posts/${post.id}/repost`);
    } catch (err) {
      setReposted(!next);
      setRepostCount((c) => (next ? c - 1 : c + 1));
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
      await api.delete(`/posts/${post.id}`);
      toast.success('Post deleted');
      onDeleted?.(post.id);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleEdit() {
    if (!editContent.trim()) return;
    try {
      await api.put(`/posts/${post.id}`, { content: editContent });
      toast.success('Post updated');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <article className="border-b border-zinc-200 p-4 transition-colors hover:bg-zinc-50/60 dark:border-surface-dark-border dark:hover:bg-white/[0.02]">
      <div className="flex gap-3">
        <Link href={`/profile/${post.author.username}`}>
          <Avatar src={post.author.profile?.avatarUrl} name={displayName} size="md" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-baseline gap-1.5 text-sm">
              <Link href={`/profile/${post.author.username}`} className="truncate font-semibold hover:underline">
                {displayName}
              </Link>
              <span className="truncate text-zinc-500">@{post.author.username}</span>
              <span className="text-zinc-400">·</span>
              <Link href={`/post/${post.id}`} className="flex-shrink-0 text-zinc-500 hover:underline">
                {timeAgo(post.createdAt)}
              </Link>
              {post.isEdited && <span className="flex-shrink-0 text-xs text-zinc-400">· edited</span>}
            </div>

            <div className="relative flex-shrink-0">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-surface-dark-raised"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="card-surface absolute right-0 z-20 mt-1 w-44 rounded-xl py-1 shadow-lg">
                    {isOwner ? (
                      <>
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-white/5"
                        >
                          <Pencil className="h-4 w-4" /> Edit post
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            handleDelete();
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-accent-rose hover:bg-zinc-100 dark:hover:bg-white/5"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setReportOpen(true);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-white/5"
                      >
                        <Flag className="h-4 w-4" /> Report post
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="mt-1 space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="input-field"
              />
              <div className="flex gap-2">
                <button onClick={handleEdit} className="btn-primary !py-1.5 !text-xs">
                  Save
                </button>
                <button onClick={() => setIsEditing(false)} className="btn-secondary !py-1.5 !text-xs">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <Link href={`/post/${post.id}`} className="block">
              {post.content && (
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-normal">
                  {renderContent(post.content)}
                </p>
              )}
            </Link>
          )}

          {post.images.length > 0 && <ImageGallery images={post.images} />}

          <div className="mt-3 flex max-w-md items-center justify-between">
            <Link
              href={`/post/${post.id}`}
              className="group flex items-center gap-1.5 text-zinc-500 hover:text-brand-500"
            >
              <span className="rounded-full p-1.5 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20">
                <MessageCircle className="h-[18px] w-[18px]" />
              </span>
              <span className="text-xs">{post._count.comments || ''}</span>
            </Link>

            <button
              onClick={toggleRepost}
              className={clsx(
                'group flex items-center gap-1.5',
                reposted ? 'text-emerald-500' : 'text-zinc-500 hover:text-emerald-500'
              )}
            >
              <span className="rounded-full p-1.5 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20">
                <Repeat2 className="h-[18px] w-[18px]" />
              </span>
              <span className="text-xs">{repostCount || ''}</span>
            </button>

            <button
              onClick={toggleLike}
              className={clsx(
                'group flex items-center gap-1.5',
                liked ? 'text-accent-rose' : 'text-zinc-500 hover:text-accent-rose'
              )}
            >
              <span className="rounded-full p-1.5 group-hover:bg-rose-50 dark:group-hover:bg-rose-900/20">
                <Heart className={clsx('h-[18px] w-[18px]', liked && 'fill-current animate-like-pop')} />
              </span>
              <span className="text-xs">{likeCount || ''}</span>
            </button>

            <button
              onClick={toggleBookmark}
              className={clsx(
                'group flex items-center gap-1.5',
                bookmarked ? 'text-brand-500' : 'text-zinc-500 hover:text-brand-500'
              )}
            >
              <span className="rounded-full p-1.5 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20">
                <Bookmark className={clsx('h-[18px] w-[18px]', bookmarked && 'fill-current')} />
              </span>
            </button>
          </div>
        </div>
      </div>

      {reportOpen && <ReportModal targetType="POST" postId={post.id} onClose={() => setReportOpen(false)} />}
    </article>
  );
}
