'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Hash, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { PostFeed } from '@/components/post/PostFeed';
import { Avatar } from '@/components/ui/Avatar';
import Link from 'next/link';
import type { User, Hashtag } from '@/types';

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', submitted],
    queryFn: async () => {
      const res = await api.get('/search', { params: { q: submitted } });
      return res.data as { users: User[]; hashtags: Hashtag[] };
    },
    enabled: submitted.length > 0,
  });

  const { data: trending } = useQuery({
    queryKey: ['trending'],
    queryFn: async () => {
      const res = await api.get('/search/trending');
      return res.data.hashtags as Hashtag[];
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(query.trim());
  }

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-surface-dark-border dark:bg-surface-dark/80">
        <h1 className="mb-3 text-xl font-bold">Explore</h1>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, people, hashtags…"
            className="input-field pl-10"
          />
        </form>
      </div>

      {submitted ? (
        <div className="p-4">
          {isFetching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : (
            <>
              {results?.users && results.users.length > 0 && (
                <section className="mb-6">
                  <h2 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide">People</h2>
                  <div className="card-surface divide-y divide-zinc-200 rounded-2xl dark:divide-surface-dark-border">
                    {results.users.map((user) => (
                      <Link key={user.id} href={`/profile/${user.username}`} className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors">
                        <Avatar src={user.profile?.avatarUrl} name={user.profile?.displayName ?? user.username} size="md" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.profile?.displayName ?? user.username}</p>
                          <p className="truncate text-sm text-zinc-500">@{user.username}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              {results?.hashtags && results.hashtags.length > 0 && (
                <section className="mb-6">
                  <h2 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide">Hashtags</h2>
                  <div className="card-surface divide-y divide-zinc-200 rounded-2xl dark:divide-surface-dark-border">
                    {results.hashtags.map((tag) => (
                      <Link key={tag.id} href={`/explore/hashtag/${tag.tag}`} className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
                          <Hash className="h-4 w-4 text-brand-500" />
                        </div>
                        <div>
                          <p className="font-medium">#{tag.tag}</p>
                          <p className="text-sm text-zinc-500">{tag.useCount} posts</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      ) : (
        <div>
          {trending && trending.length > 0 && (
            <div className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide">Trending</h2>
              <div className="card-surface divide-y divide-zinc-200 rounded-2xl dark:divide-surface-dark-border">
                {trending.map((tag) => (
                  <Link key={tag.id} href={`/explore/hashtag/${tag.tag}`} className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors">
                    <Hash className="h-4 w-4 text-brand-500" />
                    <div>
                      <p className="font-medium">#{tag.tag}</p>
                      <p className="text-xs text-zinc-400">{tag.useCount.toLocaleString()} posts</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <PostFeed queryKey={['explore']} endpoint="/posts/explore" emptyTitle="Nothing trending right now" />
        </div>
      )}
    </div>
  );
}
