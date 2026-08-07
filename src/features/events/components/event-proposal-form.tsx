"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { eventDraftSchema, type EventDraftInput } from "@/features/events/schemas/event.schema";
import { saveEventDraft, submitEventForApproval, adminUpdateEvent } from "@/features/events/services/event-actions";
import { checkEventSpaceAvailability } from "@/features/events/services/event-space-availability-actions";
import { EVENT_CATEGORY_META, EVENT_CATEGORY_VALUES } from "@/features/events/config/event-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function toDatetimeLocal(date: Date | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export type EventProposalDefaults = Omit<Partial<EventDraftInput>, "registrationDeadline"> & {
  id?: string;
  startTime?: Date;
  endTime?: Date;
  registrationDeadline?: Date | null;
};

export function EventProposalForm({
  spaces,
  defaults,
  changeRequestNote,
  mode = "propose",
}: {
  spaces: { id: string; name: string }[];
  defaults?: EventProposalDefaults;
  /** Admin feedback from a prior "Request Changes" — shown as context while editing, cleared on next submit. */
  changeRequestNote?: string | null;
  /**
   * "propose" (default) is the creator flow: Save Draft / Submit for Approval, via saveEventDraft.
   * "admin-edit" is the Admin Event Manager's direct edit — available on any status, via
   * adminUpdateEvent — a single Save Changes button, no draft/submit distinction.
   */
  mode?: "propose" | "admin-edit";
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isSubmitting, startSubmitting] = useTransition();
  const [availability, setAvailability] = useState<
    { available: boolean; conflicts: { title: string }[] } | null | "checking"
  >(null);

  const form = useForm({
    resolver: zodResolver(eventDraftSchema),
    defaultValues: {
      title: defaults?.title ?? "",
      description: defaults?.description ?? "",
      category: defaults?.category ?? "OTHER",
      location: defaults?.location ?? "",
      spaceId: defaults?.spaceId ?? "",
      startTime: defaults?.startTime,
      endTime: defaults?.endTime,
      capacity: defaults?.capacity,
      imageUrl: defaults?.imageUrl ?? "",
      logoUrl: defaults?.logoUrl ?? "",
      hostName: defaults?.hostName ?? "",
      hostContact: defaults?.hostContact ?? "",
      registrationDeadline: defaults?.registrationDeadline ?? undefined,
      website: defaults?.website ?? "",
      dressCode: defaults?.dressCode ?? "",
      foodProvided: defaults?.foodProvided ?? false,
      parkingInfo: defaults?.parkingInfo ?? "",
      equipmentNeeded: defaults?.equipmentNeeded ?? [],
      livestreamUrl: defaults?.livestreamUrl ?? "",
      ticketPriceCents: defaults?.ticketPriceCents,
      isPrivate: defaults?.isPrivate ?? false,
    },
  });

  const spaceId = form.watch("spaceId");
  const startTime = form.watch("startTime");
  const endTime = form.watch("endTime");

  useEffect(() => {
    if (!spaceId || !startTime || !endTime) {
      setAvailability(null);
      return;
    }
    setAvailability("checking");
    const timeout = setTimeout(async () => {
      const result = await checkEventSpaceAvailability(spaceId, new Date(startTime).toISOString(), new Date(endTime).toISOString());
      setAvailability(result ? { available: result.available, conflicts: result.conflicts } : null);
    }, 400);
    return () => clearTimeout(timeout);
  }, [spaceId, startTime, endTime]);

  const equipmentText = useMemo(() => (form.getValues("equipmentNeeded") ?? []).join(", "), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveDraft() {
    const values = form.getValues();
    startSaving(async () => {
      const result = await saveEventDraft(values, defaults?.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Draft saved");
      router.push(`/events/proposals/${result.eventId}`);
      router.refresh();
    });
  }

  function handleSubmit(values: EventDraftInput) {
    if (mode === "admin-edit") {
      startSubmitting(async () => {
        const result = await adminUpdateEvent(defaults!.id!, values);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Event updated");
        router.push("/admin/events");
        router.refresh();
      });
      return;
    }

    startSubmitting(async () => {
      const saveResult = await saveEventDraft(values, defaults?.id);
      if (!saveResult.success) {
        toast.error(saveResult.error);
        return;
      }
      const submitResult = await submitEventForApproval(saveResult.eventId!);
      if (!submitResult.success) {
        toast.error(submitResult.error);
        return;
      }
      toast.success("Proposal submitted for approval");
      router.push("/events");
      router.refresh();
    });
  }

  const isPending = isSaving || isSubmitting;

  return (
    <Form {...form}>
      {changeRequestNote && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-medium text-warning">Changes requested by an admin</p>
            <p className="mt-1 text-sm text-muted-foreground">{changeRequestNote}</p>
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event title</FormLabel>
                  <FormControl>
                    <Input placeholder="Creator Meetup: Fall Kickoff" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What's happening?" className="min-h-24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EVENT_CATEGORY_VALUES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {EVENT_CATEGORY_META[c].label}
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
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover image URL (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event logo URL (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…" {...field} />
                  </FormControl>
                  <FormDescription>Falls back to the CreatorHub360 logo if left blank.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">When & where</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starts</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={toDatetimeLocal(field.value)}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ends</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={toDatetimeLocal(field.value)}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="registrationDeadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration deadline (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      value={toDatetimeLocal(field.value)}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="spaceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Space (optional)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="No specific space" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {spaces.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availability === "checking" && (
                    <FormDescription className="flex items-center gap-1.5">
                      <Loader2 className="size-3 animate-spin" /> Checking availability…
                    </FormDescription>
                  )}
                  {availability && availability !== "checking" && (
                    <FormDescription
                      className={`flex items-center gap-1.5 ${availability.available ? "text-success" : "text-destructive"}`}
                    >
                      {availability.available ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                      {availability.available
                        ? "This space is free for the selected time."
                        : `Conflicts with: ${availability.conflicts.map((c) => c.title).join(", ")}`}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location / venue name (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Rooftop, or an external venue name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parkingInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parking info (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Free lot behind the building" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Host & logistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="hostName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Host name</FormLabel>
                    <FormControl>
                      <Input placeholder="Who's hosting?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hostContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Host contact</FormLabel>
                    <FormControl>
                      <Input placeholder="Email or phone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dressCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dress code (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Casual, business casual…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="equipmentNeeded"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment needed (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Projector, microphones, tables"
                      defaultValue={equipmentText}
                      onChange={(e) => field.onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                    />
                  </FormControl>
                  <FormDescription>Separate items with commas.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="foodProvided"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Food will be provided</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isPrivate"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Private event (invite-only, hidden from public listings)</FormLabel>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extras</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event website (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="livestreamUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Livestream link (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticketPriceCents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticket price in cents (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>Future-ready — not yet charged anywhere in the app.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {mode === "admin-edit" ? (
            <Button type="submit" disabled={isPending}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" disabled={isPending} onClick={handleSaveDraft}>
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                Save draft
              </Button>
              <Button type="submit" disabled={isPending}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Submit for approval
              </Button>
            </>
          )}
        </div>
      </form>
    </Form>
  );
}
