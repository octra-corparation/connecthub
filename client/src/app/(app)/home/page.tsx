import type { Metadata } from 'next';
import { PostFeed } from '@/components/post/PostFeed';

export const metadata: Metadata = { title: 'Home' };

export default function HomePage() {
  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-surface-dark-border dark:bg-surface-dark/80">
        <h1 className="text-xl font-bold">Home</h1>
      </div>
      <PostFeed
        queryKey={['feed']}
        endpoint="/posts/feed"
        emptyTitle="Your feed is empty"
        emptyDescription="Follow some people to see their posts here."
      />
    </div>
  );
}
