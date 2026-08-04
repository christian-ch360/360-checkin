import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function HomeCheckinStatus({ checkedIn }: { checkedIn: boolean }) {
  return (
    <Link href={checkedIn ? "/check-in" : "/scan"} className="block h-full">
      <Card className="card-interactive h-full hover:bg-muted/50">
        <CardContent className="flex h-full items-center gap-3 p-4">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              checkedIn ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            )}
          >
            {checkedIn ? <LogIn className="size-4.5" /> : <LogOut className="size-4.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{checkedIn ? "You're checked in" : "You're checked out"}</p>
            <p className="text-xs text-muted-foreground">{checkedIn ? "Tap to view your visit" : "Scan to check in"}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
