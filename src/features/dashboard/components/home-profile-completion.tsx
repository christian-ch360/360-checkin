import Link from "next/link";
import { CheckCircle2, UserCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

/**
 * Home-page surface for the same completion score Settings → Profile shows
 * live while editing (calculateProfileCompletion, the one source of truth —
 * see src/features/settings/lib/profile-completion.ts). This component only
 * renders the *labels* for which checks failed; the score itself always
 * comes from that shared function, never recomputed here.
 */
export function HomeProfileCompletion({ percent, missing }: { percent: number; missing: string[] }) {
  if (percent >= 100) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <CheckCircle2 className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Your profile is complete</p>
            <p className="text-xs text-muted-foreground">You&apos;re fully set up — nice work.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserCircle2 className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Profile {percent}% complete</p>
            {missing.length > 0 && (
              <p className="truncate text-xs text-muted-foreground">Missing: {missing.join(", ")}</p>
            )}
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href="/settings">Complete Profile</Link>
          </Button>
        </div>
        <Progress value={percent} />
      </CardContent>
    </Card>
  );
}
