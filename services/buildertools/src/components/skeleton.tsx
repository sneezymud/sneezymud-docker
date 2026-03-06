import { Skeleton } from "@/components/ui/skeleton.tsx";

export function EntityFormSkeleton() {
  return (
    <div
      aria-busy="true"
      className="space-y-6"
      role="status"
    >
      <div className="flex items-center gap-3 py-3">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="ml-auto h-9 w-20" />
      </div>

      {[1, 2, 3].map((group) => (
        <fieldset
          className="border-border/50 rounded border p-4"
          key={group}
        >
          <legend className="px-2">
            <Skeleton className="h-4 w-20" />
          </legend>

          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((field) => (
              <div
                className="flex flex-col gap-1"
                key={field}
              >
                <Skeleton className="h-4 w-15" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
