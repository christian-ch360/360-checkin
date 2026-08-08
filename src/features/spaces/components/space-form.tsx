"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { z } from "zod";
import { SpaceType } from "@prisma/client";
import { createSpace, updateSpace } from "@/features/spaces/services/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SpaceDashboardItem } from "@/features/spaces/services/spaces.service";

const formSchema = z.object({
  name: z.string().min(2, "Enter a space name"),
  type: z.nativeEnum(SpaceType),
  capacity: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  equipment: z.string().optional().or(z.literal("")),
  imageUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  isActive: z.boolean(),
  displayOrder: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

const TYPE_LABELS: Record<SpaceType, string> = {
  PODCAST_BOOTH: "Podcast Booth",
  EDITING_SUITE: "Editing Suite",
  PHOTOGRAPHY_STUDIO: "Photography Studio",
  CONFERENCE_ROOM: "Conference Room",
  MEETING_ROOM: "Meeting Room",
  CREATOR_LOUNGE: "Creator Lounge",
  BEAUTY_STATION: "Makeup",
  RECORDING_STUDIO: "Recording Studio",
  LIVESTREAM_STUDIO: "Livestream Studio",
  CONTENT_LAB: "Content Lab",
  EVENT_SPACE: "Event Space",
  CONTENT_BOOTH: "Content Booth",
};

function defaultValuesFor(space?: SpaceDashboardItem): FormValues {
  if (!space) {
    return {
      name: "",
      type: SpaceType.PODCAST_BOOTH,
      capacity: "",
      location: "",
      description: "",
      equipment: "",
      imageUrl: "",
      isActive: true,
      displayOrder: "",
    };
  }
  return {
    name: space.name,
    type: space.type,
    capacity: space.capacity ? String(space.capacity) : "",
    location: space.location ?? "",
    description: space.description ?? "",
    equipment: space.equipment.join(", "),
    imageUrl: space.imageUrl ?? "",
    isActive: space.isActive,
    displayOrder: String(space.displayOrder),
  };
}

/**
 * Handles both Add Space (self-triggered, no `space` prop) and Edit Space
 * (externally controlled via `open`/`onOpenChange` from SpaceActionsMenu —
 * this Dialog is rendered as a sibling of the DropdownMenu that opens it,
 * never nested inside it, since a nested Dialog can get its close animation
 * raced by the closing DropdownMenu's own portal teardown).
 */
export function SpaceFormDialog({
  space,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  space?: SpaceDashboardItem;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [internalOpen, setInternalOpen] = useState(false);
  const isEdit = Boolean(space);

  const open = openProp ?? internalOpen;
  const setOpen = onOpenChangeProp ?? setInternalOpen;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValuesFor(space),
  });

  // Re-sync the form whenever it opens (the dialog is reused across cards
  // via the same controlled open/onOpenChange, so its internal state would
  // otherwise carry over from whichever space was edited last).
  useEffect(() => {
    if (open) form.reset(defaultValuesFor(space));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, space?.id]);

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = isEdit ? await updateSpace(space!.id, values) : await createSpace(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Space updated" : "Space created");
      if (!isEdit) form.reset();
      setOpen(false);
      router.refresh();
    });
  }

  const content = (
    <DialogContent mobileFullscreen>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit space" : "Add space"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "Update this space's details." : "Creates a space and generates its QR code automatically."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Podcast Booth A" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="2nd floor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="What this space is set up for..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="equipment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Equipment (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ring light, Tripod, Mic" {...field} />
                </FormControl>
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
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display order</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <div className="flex h-9 items-center gap-2">
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                      <Label className="font-normal text-muted-foreground">
                        {field.value ? "Active" : "Inactive"}
                      </Label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <DialogFooter className="max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:rounded-none max-sm:bg-card/95 max-sm:backdrop-blur">
            <Button type="submit" disabled={isPending} className="w-full max-sm:h-12 max-sm:text-base">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create space"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );

  if (isEdit) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Add space
        </Button>
      </DialogTrigger>
      {content}
    </Dialog>
  );
}
