"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Send, Loader2, Pencil, MoreHorizontal, Copy, RotateCcw, Trash2, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { previewTemplateAction, sendTestEmailAction } from "@/features/communications/services/email-templates.actions";
import {
  duplicateEmailTemplateAction,
  setEmailTemplateStatusAction,
  deleteEmailTemplateAction,
} from "@/features/communications/services/email-template-admin.actions";
import type { EmailTemplateListRow } from "@/features/communications/services/email-template-admin.service";

export function EmailTemplateRowActions({ row, canManage }: { row: EmailTemplateListRow; canManage: boolean }) {
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string; text: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isEffectivelyActive = row.isSystem ? row.overrideStatus === "ACTIVE" || row.overrideStatus === null : row.overrideStatus === "ACTIVE";

  function openPreview() {
    setPreviewOpen(true);
    setPreviewLoading(true);
    previewTemplateAction(row.templateKey)
      .then(setPreview)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to render preview."))
      .finally(() => setPreviewLoading(false));
  }

  function handleSendTest() {
    startTransition(async () => {
      const result = await sendTestEmailAction({ templateKey: row.templateKey, to: testEmail });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Test email sent to ${testEmail}`);
      setTestOpen(false);
      setTestEmail("");
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateEmailTemplateAction(row.templateKey);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Duplicated as a new draft template.");
      router.push(`/admin/email-templates/${result.templateKey}/edit`);
    });
  }

  function handleToggleStatus() {
    const nextStatus = isEffectivelyActive ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      const result = await setEmailTemplateStatusAction(row.templateKey, nextStatus);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(nextStatus === "ACTIVE" ? "Template activated." : row.isSystem ? "Reverted to the default template." : "Template deactivated.");
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEmailTemplateAction(row.templateKey);
      setDeleteOpen(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Template deleted.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={openPreview}>
              <Eye className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Preview</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" disabled={!canManage} onClick={() => setTestOpen(true)}>
              <Send className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Send Test</TooltipContent>
        </Tooltip>

        {canManage && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/admin/email-templates/${row.templateKey}/edit`}>
                    <Pencil className="size-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isPending}>
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <MoreHorizontal className="size-3.5" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="size-3.5" /> Duplicate
                </DropdownMenuItem>
                {row.hasOverride && (
                  <DropdownMenuItem onClick={handleToggleStatus}>
                    {isEffectivelyActive ? (
                      row.isSystem ? (
                        <>
                          <RotateCcw className="size-3.5" /> Revert to Default
                        </>
                      ) : (
                        <>
                          <PowerOff className="size-3.5" /> Deactivate
                        </>
                      )
                    ) : (
                      <>
                        <Power className="size-3.5" /> Activate
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {!row.isSystem && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="size-3.5" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.subject ?? "Preview"}</DialogTitle>
            <DialogDescription>{row.templateKey.replace(/_/g, " ")} — rendered with sample data</DialogDescription>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : preview ? (
            <Tabs defaultValue="desktop">
              <TabsList>
                <TabsTrigger value="desktop">Desktop</TabsTrigger>
                <TabsTrigger value="mobile">Mobile</TabsTrigger>
                <TabsTrigger value="text">Plain Text</TabsTrigger>
              </TabsList>
              <TabsContent value="desktop" className="mt-3">
                <iframe srcDoc={preview.html} title="Desktop preview" sandbox="" className="h-[480px] w-full rounded-lg border bg-white" />
              </TabsContent>
              <TabsContent value="mobile" className="mt-3 flex justify-center">
                <iframe
                  srcDoc={preview.html}
                  title="Mobile preview"
                  sandbox=""
                  className="h-[480px] w-[375px] rounded-lg border bg-white"
                />
              </TabsContent>
              <TabsContent value="text" className="mt-3">
                <pre className="max-h-[480px] overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                  {preview.text}
                </pre>
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send test email</DialogTitle>
            <DialogDescription>
              Sends a real email using sample data. The subject will be prefixed &quot;[TEST]&quot; and it will appear in Email
              Center.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="email"
            placeholder="you@creatorhub360.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSendTest} disabled={isPending || !testEmail.trim()}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Send Test Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes &quot;{row.name}&quot;. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
