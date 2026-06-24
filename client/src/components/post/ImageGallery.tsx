'use client';

import Image from 'next/image';
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { PostImage } from '@/types';

export function ImageGallery({ images }: { images: PostImage[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const gridClass = clsx('mt-2 grid gap-1 overflow-hidden rounded-2xl', {
    'grid-cols-1': images.length === 1,
    'grid-cols-2': images.length >= 2,
  });

  return (
    <>
      <div className={gridClass} onClick={(e) => e.stopPropagation()}>
        {images.slice(0, 4).map((img, i) => (
          <button
            key={img.id}
            onClick={() => setLightboxIndex(i)}
            className={clsx('relative bg-zinc-100 dark:bg-zinc-900', images.length === 3 && i === 0 ? 'row-span-2' : '')}
            style={{ aspectRatio: images.length === 1 ? img.width && img.height ? img.width / img.height : 16 / 9 : 1 }}
          >
            <Image src={img.url} alt="" fill className="object-cover" sizes="(max-width: 600px) 100vw, 600px" />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxIndex(null);
          }}
        >
          <button className="absolute right-4 top-4 text-white" onClick={() => setLightboxIndex(null)}>
            <X className="h-7 w-7" />
          </button>
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i !== null ? i - 1 : i));
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          <div className="relative h-[80vh] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <Image src={images[lightboxIndex].url} alt="" fill className="object-contain" />
          </div>
          {lightboxIndex < images.length - 1 && (
            <button
              className="absolute right-4 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i !== null ? i + 1 : i));
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
