import { Clock, XCircle } from "lucide-react";
import { logoutAction } from "@/features/auth/services/actions";
import { Button } from "@/components/ui/button";

export function ApplicationStatusScreen({
  status,
  rejectionReason,
}: {
  status: "PENDING" | "REJECTED";
  rejectionReason: string | null;
}) {
  const pending = status === "PENDING";

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/20 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div
          className={`mx-auto flex size-14 items-center justify-center rounded-full ${
            pending ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          {pending ? <Clock className="size-7" /> : <XCircle className="size-7" />}
        </div>

        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          {pending ? "Pending Approval" : "Membership Inactive"}
        </h1>

        {pending ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Your CreatorHub360 membership is currently under review. You&apos;ll receive an email
            once your application has been approved.
          </p>
        ) : (
          <div className="mt-2 space-y-3 text-sm text-muted-foreground">
            <p>Your CreatorHub360 application was not approved.</p>
            {rejectionReason && (
              <p className="rounded-lg border bg-muted/40 p-3 text-left">
                <span className="font-medium text-foreground">Reason: </span>
                {rejectionReason}
              </p>
            )}
            <p>
              Contact{" "}
              <a href="mailto:support@creatorhub360.com" className="font-medium text-foreground underline underline-offset-4">
                support@creatorhub360.com
              </a>{" "}
              with questions.
            </p>
          </div>
        )}

        <form action={logoutAction} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            Log out
          </Button>
        </form>
      </div>
    </div>
  );
}
