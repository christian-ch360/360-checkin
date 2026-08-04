"use client";

import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const FORMATS = [
  { value: "csv", label: "Export CSV" },
  { value: "xlsx", label: "Export Excel" },
  { value: "pdf", label: "Export PDF" },
] as const;

export function ExportComplianceButton() {
  const searchParams = useSearchParams();

  function hrefFor(format: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("format", format);
    return `/api/legal/compliance-report?${params.toString()}`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="size-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {FORMATS.map((f) => (
          <DropdownMenuItem key={f.value} asChild>
            <a href={hrefFor(f.value)}>{f.label}</a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
