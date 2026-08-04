import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-32" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <Skeleton className="aspect-[3/1] w-full rounded-none sm:aspect-[4/1]" />
        <div className="space-y-3 px-4 pb-6 sm:px-6">
          <div className="-mt-10 sm:-mt-12">
            <Skeleton className="size-20 rounded-full border-4 border-card sm:size-24" />
          </div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border shadow-sm lg:col-span-2">
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
