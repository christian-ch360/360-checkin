import { Skeleton } from "@/components/ui/skeleton";

export default function MessagesLoading() {
  return (
    <div className="flex h-[75vh] min-h-[420px] flex-col gap-4">
      <div className="md:hidden">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <div className="flex flex-1 gap-4 overflow-hidden rounded-2xl border bg-card">
        <div className="hidden w-72 shrink-0 flex-col gap-1 border-r p-3 md:flex">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg p-2">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden flex-1 items-center justify-center md:flex">
          <Skeleton className="size-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}
