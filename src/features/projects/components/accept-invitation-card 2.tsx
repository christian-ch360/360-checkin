"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { acceptProjectInvitation } from "@/features/projects/services/invitation-actions";

export function AcceptInvitationCard({
  token,
  projectName,
  roleLabel,
}: {
  token: string;
  projectName: string;
  roleLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptProjectInvitation(token);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAccepted(true);
    });
  }

  if (accepted) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <CheckCircle2 className="size-10 text-success" />
          <p className="font-medium">Invitation accepted</p>
          <p className="text-sm text-muted-foreground">
            An admin will follow up to finish setting up your access to {projectName}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>You&apos;re invited to collaborate</CardTitle>
        <CardDescription>
          {projectName} · {roleLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={handleAccept} disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          Accept invitation
        </Button>
      </CardContent>
    </Card>
  );
}
