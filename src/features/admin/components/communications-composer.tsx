"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send, Search, X, RotateCw } from "lucide-react";
import {
  sendAnnouncementAction,
  searchMembersForCommunications,
  resendWelcomeEmailAction,
} from "@/features/admin/services/communications-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type MemberOption = { id: string; fullName: string; email: string; memberNumber: string };

export function CommunicationsComposer() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<MemberOption[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearching(true);
      searchMembersForCommunications(query)
        .then(setResults)
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  function toggleMember(member: MemberOption) {
    setSelected((prev) =>
      prev.some((m) => m.id === member.id) ? prev.filter((m) => m.id !== member.id) : [...prev, member]
    );
  }

  function onResendWelcome(member: MemberOption) {
    setResendingId(member.id);
    startTransition(async () => {
      const result = await resendWelcomeEmailAction(member.id);
      setResendingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Welcome email resent to ${member.fullName}`);
      router.refresh();
    });
  }

  function onSend() {
    if (selected.length === 0) {
      toast.error("Select at least one recipient.");
      return;
    }
    startTransition(async () => {
      const result = await sendAnnouncementAction({
        subject,
        body,
        memberIds: selected.map((m) => m.id),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Sent to ${result.sent} recipient${result.sent === 1 ? "" : "s"}`);
      setSubject("");
      setBody("");
      setSelected([]);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compose message</CardTitle>
        <CardDescription>Search members to build a recipient list, then send an announcement or individual email.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members by name, email, or member ID…"
              className="pl-9"
            />
          </div>

          {query.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-lg border">
              {searching ? (
                <p className="p-3 text-sm text-muted-foreground">Searching…</p>
              ) : results.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No members found.</p>
              ) : (
                results.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted">
                    <button
                      type="button"
                      onClick={() => toggleMember(member)}
                      className="flex-1 text-left text-sm"
                    >
                      <span className="font-medium">{member.fullName}</span>{" "}
                      <span className="text-muted-foreground">{member.email}</span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {selected.some((m) => m.id === member.id) && <Badge variant="secondary">Selected</Badge>}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={resendingId === member.id}
                        onClick={() => onResendWelcome(member)}
                      >
                        {resendingId === member.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <RotateCw className="size-3" />
                        )}
                        Resend welcome
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((member) => (
                <Badge key={member.id} variant="secondary" className="gap-1 pr-1">
                  {member.fullName}
                  <button type="button" onClick={() => toggleMember(member)} className="rounded-full p-0.5 hover:bg-muted-foreground/20">
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" rows={5} />

        <div className="flex justify-end">
          <Button onClick={onSend} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send />}
            Send{selected.length > 0 ? ` to ${selected.length}` : ""}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
