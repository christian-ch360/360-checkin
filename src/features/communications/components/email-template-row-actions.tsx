"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, Send, Loader2 } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { previewTemplateAction, sendTestEmailAction } from "@/features/communications/services/email-templates.actions";
import type { TemplateName } from "@/lib/email/email-types";

export function EmailTemplateRowActions({ template, canManage }: { template: TemplateName; canManage: boolean }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string; text: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function openPreview() {
    setPreviewOpen(true);
    setPreviewLoading(true);
    previewTemplateAction(template)
      .then(setPreview)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to render preview."))
      .finally(() => setPreviewLoading(false));
  }

  function handleSendTest() {
    startTransition(async () => {
      const result = await sendTestEmailAction({ template, to: testEmail });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Test email sent to ${testEmail}`);
      setTestOpen(false);
      setTestEmail("");
    });
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={openPreview}>
          <Eye className="size-3.5" />
          Preview
        </Button>
        <Button variant="outline" size="sm" disabled={!canManage} onClick={() => setTestOpen(true)}>
          <Send className="size-3.5" />
          Send Test
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.subject ?? "Preview"}</DialogTitle>
            <DialogDescription>{template.replace(/_/g, " ")} — rendered with sample data</DialogDescription>
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
    </>
  );
}
