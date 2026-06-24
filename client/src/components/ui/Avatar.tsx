'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import clsx from 'clsx';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
}

const SIZES: Record<NonNullable<AvatarProps['size']>, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 96,
};

export function Avatar({ src, name, size = 'md', online, className }: AvatarProps) {
  const px = SIZES[size];
  const initials = useMemo(() => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }, [name]);

  return (
    <div className={clsx('relative inline-block flex-shrink-0', className)} style={{ width: px, height: px }}>
      {src ? (
        <Image
          src={src}
          alt={name ?? 'User avatar'}
          width={px}
          height={px}
          className="rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-semibold text-white"
          style={{ width: px, height: px, fontSize: px * 0.38 }}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full border-2 border-surface dark:border-surface-dark',
            online ? 'bg-emerald-500' : 'bg-zinc-400'
          )}
          style={{ width: px * 0.28, height: px * 0.28 }}
        />
      )}
    </div>
  );
}
