"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, NotebookText } from "lucide-react";
import { addMemberNoteAction } from "@/features/members/services/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type MemberNoteEntry = {
  id: string;
  body: string;
  createdAt: string;
  author: { fullName: string };
};

export function MemberNotesCard({ memberId, notes }: { memberId: string; notes: MemberNoteEntry[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSubmit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await addMemberNoteAction(memberId, trimmed);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Note added");
      setBody("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <NotebookText className="size-4 text-muted-foreground" />
          Internal notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Visible to admins only — never shown to the member."
            rows={3}
          />
          <Button size="sm" onClick={onSubmit} disabled={isPending || !body.trim()}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Add note
          </Button>
        </div>

        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No internal notes yet.</p>
        ) : (
          <div className="space-y-3 border-t pt-3">
            {notes.map((note) => (
              <div key={note.id} className="space-y-1 text-sm">
                <p className="whitespace-pre-wrap">{note.body}</p>
                <p className="text-xs text-muted-foreground">
                  {note.author.fullName} · {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
