import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmailCenterAnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-56" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <Skeleton className="h-9 w-44" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className={`border shadow-sm ${i === 4 ? "lg:col-span-2" : ""}`}>
            <CardContent className="p-4">
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
