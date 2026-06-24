'use client';

import { useEffect, useRef } from 'react';

/** Calls `onIntersect` when the returned ref's element scrolls into view. */
export function useInfiniteScrollTrigger(onIntersect: () => void, enabled = true) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onIntersect();
      },
      { rootMargin: '400px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, onIntersect]);

  return ref;
}
