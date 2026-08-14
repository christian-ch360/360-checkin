import Link from "next/link";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export type LeaderboardEntry = {
  id: string;
  name: string;
  photoUrl: string | null;
  referralCode: string | null;
  creatorCount: number;
  gmv: number;
};

/** "Top Referrers" — click into a referrer to see their full referral history. */
export function TopReferrersLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Top Referrers</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState icon={Trophy} title="No referrers yet" className="py-6" />
        ) : (
          <ol className="space-y-3">
            {entries.map((entry, i) => (
              <li key={entry.id}>
                <Link
                  href={`/members/${entry.id}`}
                  className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/50"
                >
                  <span className="w-4 shrink-0 text-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
                  <Avatar className="size-8">
                    {entry.photoUrl && <AvatarImage src={entry.photoUrl} />}
                    <AvatarFallback className="text-xs">{initials(entry.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.creatorCount} referred · {entry.referralCode ?? "—"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
