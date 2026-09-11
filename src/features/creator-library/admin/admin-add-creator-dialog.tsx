"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBlankLibraryProfile } from "@/features/creator-library/services/creator-library-admin.actions";

/**
 * "+ Add Creator" — creates a blank standalone draft profile and drops the
 * manager straight into the editor for it.
 */
export function AdminAddCreatorDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createBlankLibraryProfile(name);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      setName("");
      router.push(`/admin/creator-library/${result.profileId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add Creator
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a creator</DialogTitle>
          <DialogDescription>
            Creates a draft profile you can fill in and publish. It stays hidden until you publish it.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="new-creator-name">Creator name</Label>
            <Input
              id="new-creator-name"
              value={name}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Jordan Rivera"
            />
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || name.trim().length < 2}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Create draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
