'use client';

import { useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Heart, UserPlus, MessageCircle, Repeat2, AtSign, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/lib/timeAgo';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSocket } from '@/hooks/useSocket';
import clsx from 'clsx';
import type { AppNotification } from '@/types';
import toast from 'react-hot-toast';

const ICONS: Record<string, React.ElementType> = {
  FOLLOW: UserPlus,
  LIKE: Heart,
  COMMENT: MessageCircle,
  REPLY: MessageCircle,
  MENTION: AtSign,
  REPOST: Repeat2,
  MESSAGE: MessageCircle,
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const socket = useSocket();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam }) => {
      const res = await api.get('/notifications', { params: pageParam ? { cursor: pageParam } : {} });
      return res.data as { notifications: AppNotification[]; nextCursor: string | null };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (p) => p.nextCursor,
  });

  useEffect(() => {
    if (!socket) return;
    const handler = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
    socket.on('notification:new', handler);
    return () => { socket.off('notification:new', handler); };
  }, [socket, queryClient]);

  async function markAll() {
    await api.put('/notifications/read-all');
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast.success('All marked as read');
  }

  const notifications = data?.pages.flatMap((p) => p.notifications) ?? [];

  function notificationText(n: AppNotification) {
    const actor = n.actor?.profile?.displayName ?? n.actor?.username ?? 'Someone';
    switch (n.type) {
      case 'FOLLOW': return `${actor} started following you`;
      case 'LIKE': return `${actor} liked your post`;
      case 'COMMENT': return `${actor} commented on your post`;
      case 'REPLY': return `${actor} replied to your comment`;
      case 'MENTION': return `${actor} mentioned you`;
      case 'REPOST': return `${actor} reposted your post`;
      case 'MESSAGE': return `${actor} sent you a message`;
      default: return 'New notification';
    }
  }

  function notificationHref(n: AppNotification) {
    if (n.type === 'FOLLOW') return `/profile/${n.actor?.username}`;
    if (n.type === 'MESSAGE') return '/messages';
    if (n.postId) return `/post/${n.postId}`;
    return '#';
  }

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-surface-dark-border dark:bg-surface-dark/80">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Notifications</h1>
          {notifications.some((n) => !n.isRead) && (
            <button onClick={markAll} className="text-xs text-brand-500 hover:underline font-medium">
              Mark all read
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" description="When someone follows or interacts with you, you'll see it here." />
      ) : (
        <div>
          {notifications.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <Link
                key={n.id}
                href={notificationHref(n)}
                onClick={() => !n.isRead && api.put(`/notifications/${n.id}/read`).catch(() => {})}
                className={clsx(
                  'flex items-start gap-3 border-b border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-surface-dark-border dark:hover:bg-white/[0.02]',
                  !n.isRead && 'bg-brand-50/60 dark:bg-brand-900/10'
                )}
              >
                <div className="relative flex-shrink-0">
                  <Avatar src={n.actor?.profile?.avatarUrl} name={n.actor?.profile?.displayName ?? n.actor?.username} size="md" />
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
                    <Icon className="h-3 w-3" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{notificationText(n)}</p>
                  {n.message && <p className="mt-0.5 truncate text-xs text-zinc-500">"{n.message}"</p>}
                  <p className="mt-0.5 text-xs text-zinc-400">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                )}
              </Link>
            );
          })}
          {hasNextPage && (
            <div className="flex justify-center py-4">
              <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="btn-ghost text-sm">
                {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
