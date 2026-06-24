'use client';

import { useEffect, useRef } from 'react';
import { PostCard } from './PostCard';
import { PostSkeleton } from '@/components/ui/Skeletons';
import { EmptyState } from '@/components/ui/EmptyState';
import { Newspaper, Loader2 } from 'lucide-react';
import type { Post } from '@/types';
import { useInfinitePosts } from '@/hooks/useInfinitePosts';

interface PostFeedProps {
  queryKey: string[];
  endpoint: string;
  emptyTitle?: string;
  emptyDescription?: string;
  enabled?: boolean;
}

export function PostFeed({ queryKey, endpoint, emptyTitle = 'Nothing here yet', emptyDescription, enabled = true }: PostFeedProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useInfinitePosts(
    queryKey,
    endpoint,
    enabled
  );

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];

  if (isLoading) {
    return (
      <div className="divide-y divide-zinc-200 dark:divide-surface-dark-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4">
            <PostSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={Newspaper}
        title="Couldn't load posts"
        description="Something went wrong. Try refreshing the page."
      />
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={Newspaper}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div>
      {posts.map((post: Post) => (
        <PostCard key={post.id} post={post} />
      ))}
      <div ref={sentinelRef} className="flex justify-center py-6">
        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />}
      </div>
    </div>
  );
}
