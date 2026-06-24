export function PostSkeleton() {
  return (
    <div className="card-surface rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      </div>
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-4/5 rounded" />
      <div className="skeleton h-48 w-full rounded-xl" />
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-48 w-full" />
      <div className="px-4 -mt-12 flex items-end justify-between">
        <div className="skeleton h-24 w-24 rounded-full border-4 border-surface dark:border-surface-dark" />
        <div className="skeleton h-9 w-28 rounded-full" />
      </div>
      <div className="px-4 space-y-2">
        <div className="skeleton h-5 w-40 rounded" />
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-3 w-full rounded" />
      </div>
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="skeleton h-10 w-10 rounded-full" />
      <div className="space-y-2 flex-1">
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}
