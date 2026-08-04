"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";
import { addNote } from "@/features/projects/services/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function NotesPanel({
  projectId,
  notes,
}: {
  projectId: string;
  notes: { id: string; body: string; createdAt: Date }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState("");

  function submit() {
    if (!body.trim()) return;
    startTransition(async () => {
      const result = await addNote(projectId, body);
      if (!result.success) toast.error(result.error);
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Textarea placeholder="Leave a note for the team..." value={body} onChange={(e) => setBody(e.target.value)} />
        <Button onClick={submit} disabled={isPending} size="icon" className="shrink-0">
          <Send />
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border bg-card p-3">
              <p className="text-sm">{note.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDistanceToNow(note.createdAt, { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
