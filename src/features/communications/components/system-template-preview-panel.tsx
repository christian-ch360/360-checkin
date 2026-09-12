"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Monitor, Smartphone, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { sendSystemDefaultTestAction } from "@/features/communications/services/email-template-admin.actions";
import {
  sendCreatorHubAcademyKickoffCampaignAction,
  type CampaignSendRow,
} from "@/features/communications/services/creatorhub-academy-campaign.actions";

/**
 * Desktop/mobile preview of a system template's actual code-defined
 * component (rendered server-side with sample props, passed in as static
 * html/subject) plus a "Send Test" dialog against that same real render —
 * the counterpart to EmailPreviewPanel for templates rich enough that the
 * generic bodyHtml override editor isn't the right tool to preview them
 * with. Visually matches EmailPreviewPanel's desktop/mobile toggle so both
 * feel like one Email Center, not two.
 */
export function SystemTemplatePreviewPanel({ templateKey, subject, html }: { templateKey: string; subject: string; html: string }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // One-time approved-campaign trigger — only rendered for this exact
  // template key. See creatorhub-academy-campaign.actions.ts for the
  // hardcoded, safety-checked 23-person recipient list.
  const [campaignConfirmOpen, setCampaignConfirmOpen] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [campaignReport, setCampaignReport] = useState<{ campaignResults: CampaignSendRow[]; testResult: CampaignSendRow } | null>(null);

  function handleSendCampaign() {
    setSendingCampaign(true);
    sendCreatorHubAcademyKickoffCampaignAction()
      .then((result) => {
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setCampaignReport({ campaignResults: result.campaignResults, testResult: result.testResult });
        setCampaignConfirmOpen(false);
        const sentCount = result.campaignResults.filter((r) => r.sent).length;
        toast.success(`Campaign sent: ${sentCount}/${result.campaignResults.length} delivered.`);
      })
      .finally(() => setSendingCampaign(false));
  }

  function handleSendTest() {
    setSendingTest(true);
    sendSystemDefaultTestAction({ templateKey, to: testEmail })
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

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Preview (default template)</CardTitle>
        <div className="flex items-center gap-2">
          {templateKey === "creatorhub_academy_kickoff" && (
            <Button type="button" variant="default" size="sm" onClick={() => setCampaignConfirmOpen(true)}>
              <Send className="size-3.5" /> Send Approved Campaign (23)
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setTestOpen(true)}>
            <Send className="size-3.5" /> Send Test
          </Button>
          <Tabs value={device} onValueChange={(v) => setDevice(v as "desktop" | "mobile")}>
            <TabsList>
              <TabsTrigger value="desktop">
                <Monitor className="size-3.5" /> Desktop
              </TabsTrigger>
              <TabsTrigger value="mobile">
                <Smartphone className="size-3.5" /> Mobile
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-2 truncate text-xs text-muted-foreground">Subject: {subject}</p>
        <div className="flex justify-center overflow-hidden rounded-lg border bg-muted/20 p-3">
          <iframe
            srcDoc={html}
            title="Email preview"
            sandbox=""
            className="rounded border bg-white"
            style={{ width: device === "mobile" ? 375 : "100%", height: 720, maxWidth: "100%" }}
          />
        </div>
      </CardContent>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send test email</DialogTitle>
            <DialogDescription>
              Sends a real email using this template&rsquo;s default design and sample data. The subject will be prefixed
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

      <Dialog open={campaignConfirmOpen} onOpenChange={setCampaignConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send the approved campaign?</DialogTitle>
            <DialogDescription>
              Sends this real email to the exact, pre-approved 23-person recipient list (hardcoded server-side — no
              additions possible from here), plus one separate copy to the account-owner address. This cannot be
              undone and can only be triggered once per server instance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignConfirmOpen(false)} disabled={sendingCampaign}>
              Cancel
            </Button>
            <Button onClick={handleSendCampaign} disabled={sendingCampaign}>
              {sendingCampaign && <Loader2 className="size-4 animate-spin" />}
              Yes, send to 23 recipients + test copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {campaignReport && (
        <Card className="mt-4 border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Campaign send report — {campaignReport.campaignResults.filter((r) => r.sent).length}/
              {campaignReport.campaignResults.length} delivered
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            {campaignReport.campaignResults.map((r) => (
              <div key={r.email} className="flex items-center justify-between gap-2 border-b py-1 last:border-0">
                <span>
                  {r.name} — {r.email}
                </span>
                <span className={r.sent ? "text-emerald-600" : "text-red-600"}>{r.sent ? "SENT" : `FAILED: ${r.reason ?? "unknown"}`}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2 font-medium">
              <span>Test copy — {campaignReport.testResult.email}</span>
              <span className={campaignReport.testResult.sent ? "text-emerald-600" : "text-red-600"}>
                {campaignReport.testResult.sent ? "SENT" : `FAILED: ${campaignReport.testResult.reason ?? "unknown"}`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </Card>
  );
}
