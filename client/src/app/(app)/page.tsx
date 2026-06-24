'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { PostCard } from '@/components/post/PostCard';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/authStore';
import { timeAgo } from '@/lib/timeAgo';
import { EmptyState } from '@/components/ui/EmptyState';
import { MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Comment, Post } from '@/types';

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: postData, isLoading: postLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const res = await api.get(`/posts/${postId}`);
      return res.data.post as Post;
    },
  });

  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const res = await api.get(`/posts/${postId}/comments`);
      return res.data.comments as Comment[];
    },
  });

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/posts/${postId}/comments`, { content: commentText });
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      toast.success('Comment posted');
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-surface-dark-border dark:bg-surface-dark/80">
        <button onClick={() => router.back()} className="btn-ghost rounded-full p-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Post</h1>
      </div>

      {postLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      ) : postData ? (
        <>
          <PostCard post={postData} />

          {/* Comment composer */}
          {user && (
            <div className="border-b border-zinc-200 p-4 dark:border-surface-dark-border">
              <form onSubmit={submitComment} className="flex gap-3">
                <Avatar src={user.profile?.avatarUrl} name={user.profile?.displayName ?? user.username} size="sm" />
                <div className="flex flex-1 items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-surface-dark-border dark:bg-surface-dark-raised">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a reply…"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                  <button type="submit" disabled={submitting || !commentText.trim()} className="text-brand-500 disabled:opacity-40">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Comments */}
          <div className="divide-y divide-zinc-200 dark:divide-surface-dark-border">
            {commentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              </div>
            ) : !commentsData?.length ? (
              <EmptyState icon={MessageCircle} title="No replies yet" description="Be the first to reply." />
            ) : (
              commentsData.map((comment) => (
                <CommentRow key={comment.id} comment={comment} postId={postId} />
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function CommentRow({ comment, postId }: { comment: Comment; postId: string }) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);

  const { data: replies } = useQuery({
    queryKey: ['replies', comment.id],
    queryFn: async () => {
      const res = await api.get(`/comments/${comment.id}/replies`);
      return res.data.replies as Comment[];
    },
    enabled: showReplies,
  });

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    await api.post(`/posts/${postId}/comments`, { content: replyText, parentId: comment.id });
    setReplyText('');
    setReplyOpen(false);
    queryClient.invalidateQueries({ queryKey: ['replies', comment.id] });
    setShowReplies(true);
  }

  const displayName = comment.author.profile?.displayName ?? comment.author.username;

  return (
    <div className="px-4 py-3">
      <div className="flex gap-3">
        <Avatar src={comment.author.profile?.avatarUrl} name={displayName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 text-sm">
            <span className="font-semibold">{displayName}</span>
            <span className="text-zinc-500">@{comment.author.username}</span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-400">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="mt-0.5 text-sm">{comment.content}</p>
          <div className="mt-2 flex gap-3">
            <button onClick={() => setReplyOpen((v) => !v)} className="text-xs text-zinc-400 hover:text-brand-500">
              Reply
            </button>
            {comment._count.replies > 0 && (
              <button onClick={() => setShowReplies((v) => !v)} className="text-xs text-brand-500 hover:underline">
                {showReplies ? 'Hide' : `Show ${comment._count.replies} repl${comment._count.replies === 1 ? 'y' : 'ies'}`}
              </button>
            )}
          </div>
          {replyOpen && user && (
            <form onSubmit={submitReply} className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to @${comment.author.username}…`}
                className="input-field flex-1 !py-1.5 !text-xs"
                autoFocus
              />
              <button type="submit" disabled={!replyText.trim()} className="text-brand-500 disabled:opacity-40">
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
          {showReplies && replies?.map((r) => (
            <div key={r.id} className="mt-3 flex gap-2 pl-4 border-l-2 border-zinc-100 dark:border-surface-dark-border">
              <Avatar src={r.author.profile?.avatarUrl} name={r.author.profile?.displayName ?? r.author.username} size="xs" />
              <div className="min-w-0">
                <div className="flex items-baseline gap-1 text-xs">
                  <span className="font-semibold">{r.author.profile?.displayName ?? r.author.username}</span>
                  <span className="text-zinc-400">·</span>
                  <span className="text-zinc-400">{timeAgo(r.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-sm">{r.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
