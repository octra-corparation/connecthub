import type { Metadata } from 'next';
import { PostFeed } from '@/components/post/PostFeed';

export const metadata: Metadata = { title: 'Bookmarks' };

export default function BookmarksPage() {
  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-surface-dark-border dark:bg-surface-dark/80">
        <h1 className="text-xl font-bold">Bookmarks</h1>
      </div>
      <PostFeed
        queryKey={['bookmarks']}
        endpoint="/posts/bookmarks"
        emptyTitle="No bookmarks yet"
        emptyDescription="Save posts you want to read later."
      />
    </div>
  );
}
