'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PaginatedPosts } from '@/types';

/**
 * Generic infinite-scroll hook for any cursor-paginated posts endpoint.
 * `endpoint` should return { posts, nextCursor }.
 */
export function useInfinitePosts(queryKey: string[], endpoint: string, enabled = true) {
  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const res = await api.get<PaginatedPosts>(endpoint, {
        params: pageParam ? { cursor: pageParam } : {},
      });
      return res.data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
  });
}
