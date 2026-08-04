"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import {
  collabPostSchema,
  collabPostCategoryValues,
  collabBudgetTypeValues,
  collabLocationValues,
  type CollabPostInput,
} from "@/features/collab-hub/schemas/collab-post.schema";
import { createCollabPost } from "@/features/collab-hub/services/collab-post-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORY_LABELS: Record<(typeof collabPostCategoryValues)[number], string> = {
  CREATOR: "Creator",
  BRAND: "Brand",
  AGENCY: "Agency",
  PHOTOGRAPHER: "Photographer",
  VIDEOGRAPHER: "Videographer",
  EDITOR: "Editor",
  MODEL: "Model",
  PODCAST: "Podcast",
  UGC: "UGC",
};

const BUDGET_LABELS: Record<(typeof collabBudgetTypeValues)[number], string> = {
  PAID: "Paid",
  TRADE: "Trade",
  FREE: "Free",
};

const LOCATION_LABELS: Record<(typeof collabLocationValues)[number], string> = {
  ON_SITE: "CreatorHub360",
  REMOTE: "Remote",
};

function UrlListField({
  label,
  placeholder,
  urls,
  setUrls,
}: {
  label: string;
  placeholder: string;
  urls: string[];
  setUrls: (urls: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {urls.map((url, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={url}
            onChange={(e) => setUrls(urls.map((u, idx) => (idx === i ? e.target.value : u)))}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setUrls(urls.filter((_, idx) => idx !== i))}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setUrls([...urls, ""])}>
        <Plus className="size-3.5" /> Add link
      </Button>
    </div>
  );
}

export function CollabPostFormDialog() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  const form = useForm<CollabPostInput>({
    resolver: zodResolver(collabPostSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "CREATOR",
      budgetType: "PAID",
      budgetNote: "",
      dateNeeded: "",
      location: "ON_SITE",
      expiresAt: "",
    },
  });

  function onSubmit(values: CollabPostInput) {
    startTransition(async () => {
      const result = await createCollabPost({
        ...values,
        imageUrls: imageUrls.filter(Boolean),
        videoUrls: videoUrls.filter(Boolean),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Collaboration posted");
      form.reset();
      setImageUrls([]);
      setVideoUrls([]);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Post a collaboration
        </Button>
      </DialogTrigger>
      <DialogContent mobileFullscreen className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Post a collaboration</DialogTitle>
          <DialogDescription>Tell the community what you&apos;re looking to create.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Looking for a skincare creator" {...field} />
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
                    <Textarea placeholder="What are you looking to create?" rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {collabPostCategoryValues.map((c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_LABELS[c]}
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
                name="budgetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {collabBudgetTypeValues.map((b) => (
                          <SelectItem key={b} value={b}>
                            {BUDGET_LABELS[b]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="budgetNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget detail (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. $500, or studio day trade" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {collabLocationValues.map((l) => (
                          <SelectItem key={l} value={l}>
                            {LOCATION_LABELS[l]}
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
                name="dateNeeded"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date needed</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <UrlListField label="Images" placeholder="Paste an image URL" urls={imageUrls} setUrls={setImageUrls} />
            <UrlListField
              label="Reference videos"
              placeholder="Paste a video URL"
              urls={videoUrls}
              setUrls={setVideoUrls}
            />

            <DialogFooter className="max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:rounded-none max-sm:bg-card/95 max-sm:backdrop-blur">
              <Button type="submit" disabled={isPending} className="w-full max-sm:h-12 max-sm:text-base">
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Post collaboration
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
