import { Clock, MessageCircle, CheckCircle2 } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { listAllFeedback, listMyFeedback, getFeedbackCounts } from "@/features/feedback/services/feedback.service";
import { hasPermission } from "@/lib/permissions";
import { FeedbackForm } from "@/features/feedback/components/feedback-form";
import { FeedbackInbox } from "@/features/feedback/components/feedback-inbox";
import { MyFeedbackList } from "@/features/feedback/components/my-feedback-list";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = { title: "Feedback" };

export default async function FeedbackPage() {
  const actor = await requireCurrentMember();
  const canTriage = hasPermission(actor.systemRole, "feedback.manage");

  if (canTriage) {
    const [items, counts] = await Promise.all([
      listAllFeedback(actor.organizationId),
      getFeedbackCounts(actor.organizationId),
    ]);

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Feedback</h1>
          <p className="text-sm text-muted-foreground">Review and triage feedback submitted by members.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Open" value={String(counts.open)} icon={MessageCircle} accent="warning" />
          <StatCard label="In review" value={String(counts.inReview)} icon={Clock} accent="primary" />
          <StatCard label="Resolved" value={String(counts.resolved)} icon={CheckCircle2} accent="success" />
        </div>

        <FeedbackForm />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inbox</CardTitle>
          </CardHeader>
          <CardContent>
            <FeedbackInbox items={items} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const myItems = await listMyFeedback(actor.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Feedback</h1>
        <p className="text-sm text-muted-foreground">Tell us what&apos;s working and what isn&apos;t.</p>
      </div>

      <FeedbackForm />
      <MyFeedbackList items={myItems} />
    </div>
  );
}
