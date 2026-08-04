"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { bulkImportMembers } from "@/features/admin/services/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function BulkImportPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      startTransition(async () => {
        const result = await bulkImportMembers(text);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`Imported ${result.created} member(s)${result.skipped ? `, skipped ${result.skipped}` : ""}`);
        router.refresh();
      });
    };
    reader.readAsText(file);
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Bulk import members</CardTitle>
        <CardDescription>
          CSV with columns: fullName, email, role, phone. Role must be one of BRAND, AGENCY, BROKER,
          BUSINESS_DEVELOPMENT, CREATOR, PROJECT_LEADER, VENDOR, STAFF, ENTERTAINMENT, INVESTOR.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload />}
          Upload CSV
        </Button>
        {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
      </CardContent>
    </Card>
  );
}
