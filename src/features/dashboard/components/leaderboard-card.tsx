import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCompactCurrency } from "@/lib/utils/format";

type LeaderboardEntry = {
  id: string;
  name: string;
  gmv: number;
  photoUrl?: string | null;
  href: string;
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function LeaderboardCard({
  title,
  entries,
  emptyLabel,
}: {
  title: string;
  entries: LeaderboardEntry[];
  emptyLabel: string;
}) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {entries.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          entries.map((entry, i) => (
            <Link
              key={entry.id}
              href={entry.href}
              className="flex items-center gap-3 rounded-md px-1.5 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              <span className="w-4 shrink-0 text-xs font-medium text-muted-foreground">
                {i + 1}
              </span>
              {"photoUrl" in entry && (
                <Avatar className="size-6 shrink-0">
                  {entry.photoUrl && <AvatarImage src={entry.photoUrl} alt={entry.name} />}
                  <AvatarFallback className="text-[10px]">{initials(entry.name)}</AvatarFallback>
                </Avatar>
              )}
              <span className="min-w-0 flex-1 truncate font-medium">{entry.name}</span>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                {formatCompactCurrency(entry.gmv)}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
