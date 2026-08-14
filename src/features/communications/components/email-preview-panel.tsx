"use client";

import { useEffect, useState } from "react";
import { Monitor, Smartphone, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { previewEditorContentAction } from "@/features/communications/services/email-template-admin.actions";

/**
 * Renders the editor's current (possibly unsaved) content through the real
 * send-time pipeline — renderCustomContent, the same interpolation +
 * sanitization + EmailLayout wrap a saved override would get — debounced on
 * every edit, "reusing the existing rendering system rather than a separate
 * renderer." `sandbox=""` matches the same safe-iframe pattern the catalog
 * page's existing Preview dialog already uses.
 */
export function EmailPreviewPanel({
  templateKey,
  subject,
  previewText,
  bodyHtml,
}: {
  templateKey: string;
  subject: string;
  previewText: string;
  bodyHtml: string;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [rendered, setRendered] = useState<{ subject: string; html: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timeout = setTimeout(() => {
      previewEditorContentAction({ templateKey, subject, previewText, bodyHtml })
        .then((result) => {
          if (!cancelled) setRendered(result);
        })
        .catch(() => {
          if (!cancelled) setRendered(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [templateKey, subject, previewText, bodyHtml]);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Preview</CardTitle>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
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
        {rendered && <p className="mb-2 truncate text-xs text-muted-foreground">Subject: {rendered.subject}</p>}
        <div className="flex justify-center overflow-hidden rounded-lg border bg-muted/20 p-3">
          <iframe
            srcDoc={rendered?.html ?? "<p style='font-family:sans-serif;color:#71717a;padding:16px;'>Nothing to preview yet.</p>"}
            title="Email preview"
            sandbox=""
            className="rounded border bg-white"
            style={{ width: device === "mobile" ? 375 : "100%", height: 480, maxWidth: "100%" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
