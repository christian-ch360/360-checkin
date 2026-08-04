import { differenceInCalendarDays } from "date-fns";
import { Progress } from "@/components/ui/progress";

export function TrialProgress({ trialStartedAt, trialEndsAt }: { trialStartedAt: Date; trialEndsAt: Date }) {
  const totalDays = Math.max(1, differenceInCalendarDays(trialEndsAt, trialStartedAt));
  const elapsedDays = Math.min(totalDays, Math.max(0, differenceInCalendarDays(new Date(), trialStartedAt)));
  const daysRemaining = Math.max(0, totalDays - elapsedDays);
  const percentElapsed = Math.round((elapsedDays / totalDays) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Free trial</span>
        <span>{daysRemaining > 0 ? `${daysRemaining} days left` : "Ends today"}</span>
      </div>
      <Progress value={percentElapsed} />
    </div>
  );
}
