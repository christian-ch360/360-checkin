"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { EmailCategory, EmailTemplateStatus } from "@prisma/client";
import { Loader2, Send, Copy, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { EMAIL_CATEGORY_LABELS } from "@/features/communications/config/template-catalog";
import { HtmlSourceEditor, type HtmlSourceEditorHandle } from "@/features/communications/components/html-source-editor";
import { EmailVariableList } from "@/features/communications/components/email-variable-list";
import { EmailPreviewPanel } from "@/features/communications/components/email-preview-panel";
import {
  createEmailTemplateAction,
  updateEmailTemplateAction,
  duplicateEmailTemplateAction,
  setEmailTemplateStatusAction,
  deleteEmailTemplateAction,
  sendTestFromEditorAction,
} from "@/features/communications/services/email-template-admin.actions";
import { extractVariableTokens } from "@/lib/email/template-interpolation";
import { templateKeySchema } from "@/features/communications/schemas/email-template.schema";

const CATEGORY_OPTIONS = Object.entries(EMAIL_CATEGORY_LABELS) as [EmailCategory, string][];
const STATUS_OPTIONS: { value: EmailTemplateStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export type EmailTemplateEditorInitial = {
  templateKey: string;
  isSystem: boolean;
  isNew: boolean;
  name: string;
  description: string;
  category: EmailCategory;
  subject: string;
  previewText: string;
  bodyHtml: string;
  status: EmailTemplateStatus;
  updatedAt: string | null;
  updatedByName: string | null;
};

export function EmailTemplateEditor({
  mode,
  initial,
  availableVariables,
}: {
  mode: "create" | "edit";
  initial: EmailTemplateEditorInitial;
  availableVariables: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const bodyEditorRef = useRef<HtmlSourceEditorHandle>(null);

  const [templateKey, setTemplateKey] = useState(initial.templateKey);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState<EmailCategory>(initial.category);
  const [subject, setSubject] = useState(initial.subject);
  const [previewText, setPreviewText] = useState(initial.previewText);
  const [bodyHtml, setBodyHtml] = useState(initial.bodyHtml);
  const [status, setStatus] = useState<EmailTemplateStatus>(initial.status);
  const [keyError, setKeyError] = useState<string | null>(null);

  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const usedUnknownVariables = [
    ...extractVariableTokens(subject),
    ...extractVariableTokens(previewText),
    ...extractVariableTokens(bodyHtml),
  ].filter((t) => !availableVariables.includes(t));
  const uniqueUnknown = [...new Set(usedUnknownVariables)];

  function insertVariable(token: string) {
    bodyEditorRef.current?.insertAtCursor(token);
  }

  function handleTemplateKeyChange(value: string) {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    setTemplateKey(cleaned);
    const parsed = templateKeySchema.safeParse(cleaned);
    setKeyError(parsed.success || cleaned === "" ? null : parsed.error.issues[0]?.message ?? "Invalid key");
  }

  function save(targetStatus: EmailTemplateStatus) {
    if (mode === "create") {
      const parsed = templateKeySchema.safeParse(templateKey);
      if (!parsed.success) {
        setKeyError(parsed.error.issues[0]?.message ?? "Enter a valid template key");
        return;
      }
    }
    if (!name.trim()) return toast.error("Enter a template name");
    if (!subject.trim()) return toast.error("Enter a subject");
    if (!bodyHtml.trim()) return toast.error("Enter the email body");

    startTransition(async () => {
      const payload = { templateKey, name, description, category, subject, previewText, bodyHtml, status: targetStatus };
      const result =
        mode === "create"
          ? await createEmailTemplateAction(payload)
          : await updateEmailTemplateAction(initial.templateKey, payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(targetStatus === "ACTIVE" ? "Template saved and activated." : "Template saved as draft.");
      router.push(`/admin/email-templates/${result.templateKey}/edit`);
      router.refresh();
    });
  }

  function handleSendTest() {
    setSendingTest(true);
    sendTestFromEditorAction({ templateKey: templateKey || "preview", category, subject, previewText, bodyHtml, to: testEmail })
      .then((result) => {
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Test email sent.");
        setTestOpen(false);
        setTestEmail("");
      })
      .finally(() => setSendingTest(false));
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateEmailTemplateAction(initial.templateKey);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Duplicated as a new draft template.");
      router.push(`/admin/email-templates/${result.templateKey}/edit`);
    });
  }

  function handleRevertToDefault() {
    startTransition(async () => {
      const result = await setEmailTemplateStatusAction(initial.templateKey, "INACTIVE");
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Reverted to the default template.");
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEmailTemplateAction(initial.templateKey);
      if (!result.success) {
        toast.error(result.error);
        setDeleteOpen(false);
        return;
      }
      toast.success("Template deleted.");
      router.push("/admin/email-templates");
    });
  }

  const canRevert = mode === "edit" && initial.isSystem && !initial.isNew;
  const canDelete = mode === "edit" && !initial.isSystem;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tpl-name">Template Name</Label>
                <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome Email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-key">Template Key</Label>
                <Input
                  id="tpl-key"
                  value={templateKey}
                  onChange={(e) => handleTemplateKeyChange(e.target.value)}
                  disabled={mode === "edit"}
                  placeholder="e.g. seasonal_promo"
                  className="font-mono text-sm"
                />
                {keyError && <p className="text-xs text-destructive">{keyError}</p>}
                {initial.isSystem && mode === "edit" && (
                  <p className="text-xs text-muted-foreground">System template key — can&apos;t be changed.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as EmailCategory)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tpl-description">Description</Label>
                <Textarea
                  id="tpl-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What is this email for, and when does it send?"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as EmailTemplateStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {initial.updatedAt && (
                <div className="flex items-end pb-1.5 text-xs text-muted-foreground">
                  Last updated {new Date(initial.updatedAt).toLocaleString()}
                  {initial.updatedByName ? ` by ${initial.updatedByName}` : ""}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Email Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-subject">Subject</Label>
                <Input id="tpl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Welcome to CreatorHub360" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-preview-text">Preview Text / Preheader</Label>
                <Input
                  id="tpl-preview-text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Shown in the recipient's inbox next to the subject"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email Body</Label>
                <HtmlSourceEditor ref={bodyEditorRef} value={bodyHtml} onChange={setBodyHtml} />
              </div>
              {uniqueUnknown.length > 0 && (
                <p className="text-xs text-warning">
                  Unknown variable{uniqueUnknown.length > 1 ? "s" : ""}: {uniqueUnknown.map((t) => `{{${t}}}`).join(", ")} — this
                  will still send (unknown variables are left as literal text), but activating is blocked until fixed.
                </p>
              )}
            </CardContent>
          </Card>

          <EmailVariableList variables={availableVariables} onInsert={insertVariable} />
        </div>

        <div className="space-y-4">
          <EmailPreviewPanel templateKey={templateKey || initial.templateKey} subject={subject} previewText={previewText} bodyHtml={bodyHtml} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {initial.isSystem && <Badge variant="outline">System template</Badge>}
          {canRevert && (
            <Button type="button" variant="outline" size="sm" onClick={handleRevertToDefault} disabled={isPending}>
              <RotateCcw className="size-3.5" /> Revert to Default
            </Button>
          )}
          {mode === "edit" && (
            <Button type="button" variant="outline" size="sm" onClick={handleDuplicate} disabled={isPending}>
              <Copy className="size-3.5" /> Duplicate
            </Button>
          )}
          {canDelete && (
            <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteOpen(true)} disabled={isPending}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setTestOpen(true)}>
            <Send className="size-3.5" /> Send Test
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/email-templates")} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={() => save("DRAFT")} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Save Draft
          </Button>
          <Button type="button" onClick={() => save(status)} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {status === "ACTIVE" ? "Save & Activate" : "Save"}
          </Button>
        </div>
      </div>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send test email</DialogTitle>
            <DialogDescription>
              Sends a real email using your current unsaved editor content and sample data. The subject will be prefixed
              &quot;[TEST]&quot; and it will appear in Email Center.
            </DialogDescription>
          </DialogHeader>
          <Input type="email" placeholder="you@creatorhub360.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)} disabled={sendingTest}>
              Cancel
            </Button>
            <Button onClick={handleSendTest} disabled={sendingTest || !testEmail.trim()}>
              {sendingTest && <Loader2 className="size-4 animate-spin" />}
              Send Test Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes &quot;{name}&quot;. This can&apos;t be undone.
            </AlertDialogDescription>
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
    </div>
  );
}
