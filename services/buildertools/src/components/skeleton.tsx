export function SkeletonLine({ width = "100%" }: { width?: string }) {
  return (
    <div
      className="h-4 animate-pulse rounded bg-zinc-800"
      style={{ width }}
    />
  );
}

export function SkeletonBlock({ height = "80px" }: { height?: string }) {
  return (
    <div
      className="w-full animate-pulse rounded bg-zinc-800"
      style={{ height }}
    />
  );
}

export function EntityFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 py-3">
        <div className="h-9 w-20 animate-pulse rounded bg-zinc-800" />
        <div className="ml-auto h-9 w-20 animate-pulse rounded bg-zinc-800" />
      </div>

      {[1, 2, 3].map((group) => (
        <fieldset
          className="rounded border border-zinc-700/50 p-4"
          key={group}
        >
          <legend className="px-2">
            <SkeletonLine width="80px" />
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((field) => (
              <div key={field}>
                <SkeletonLine width="60px" />
                <div className="mt-1 h-9 w-full animate-pulse rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
