"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { assignmentSchema, type AssignmentInput } from "@/features/projects/schemas/project.schema";
import { addAssignment, removeAssignment } from "@/features/projects/services/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

type Assignment = {
  id: string;
  role: string;
  commissionPct: string;
  contributionPct: string;
  hours: string;
  status: string;
  member: { id: string; fullName: string; profilePhotoUrl: string | null; memberNumber: string };
};

export function AssignmentsPanel({
  projectId,
  assignments,
  availableMembers,
  canManage,
}: {
  projectId: string;
  assignments: Assignment[];
  availableMembers: { id: string; fullName: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  // Separate from isPending (which gates the add-member form submit) so
  // removing one assignment doesn't visually disable every other row's
  // remove button too.
  const [removingId, setRemovingId] = useState<string | null>(null);

  const form = useForm<AssignmentInput>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { memberId: "", role: "", commissionPct: "", contributionPct: "" },
  });

  function onSubmit(values: AssignmentInput) {
    startTransition(async () => {
      const result = await addAssignment(projectId, values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Member assigned");
      form.reset();
      setOpen(false);
      router.refresh();
    });
  }

  function remove(assignmentId: string) {
    setRemovingId(assignmentId);
    startTransition(async () => {
      const result = await removeAssignment(projectId, assignmentId);
      if (!result.success) toast.error(result.error);
      else toast.success("Removed from project");
      setRemovingId(null);
      router.refresh();
    });
  }

  const assignedIds = new Set(assignments.map((a) => a.member.id));
  const selectable = availableMembers.filter((m) => !assignedIds.has(m.id));

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus /> Add member
              </Button>
            </DialogTrigger>
            <DialogContent mobileFullscreen>
              <DialogHeader>
                <DialogTitle>Add team member</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="memberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Member</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a member" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {selectable.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role on project</FormLabel>
                        <FormControl>
                          <Input placeholder="Creator, Editor, Lead..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="commissionPct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commission %</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contributionPct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contribution %</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="25" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter className="max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:rounded-none max-sm:bg-card/95 max-sm:backdrop-blur">
                    <Button type="submit" disabled={isPending} className="w-full max-sm:h-12 max-sm:text-base">
                      {isPending && <Loader2 className="size-4 animate-spin" />}
                      Add to project
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {assignments.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No team members assigned yet.</p>
      ) : (
        <div className="divide-y">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-2.5">
              <Avatar className="size-8">
                {a.member.profilePhotoUrl && <AvatarImage src={a.member.profilePhotoUrl} />}
                <AvatarFallback className="text-xs">{initials(a.member.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Link href={`/members/${a.member.id}`} className="truncate text-sm font-medium hover:underline">
                  {a.member.fullName}
                </Link>
                <p className="text-xs text-muted-foreground">{a.role}</p>
              </div>
              <Badge variant="outline">{a.commissionPct}% commission</Badge>
              <Badge variant="outline">{a.contributionPct}% contribution</Badge>
              {canManage && (
                <Button size="icon-sm" variant="ghost" onClick={() => remove(a.id)} disabled={removingId === a.id}>
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
