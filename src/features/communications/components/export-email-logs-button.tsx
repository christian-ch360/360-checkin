"use client";

import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ExportEmailLogsButton({ view }: { view?: "inbox" | "archive" }) {
  const searchParams = useSearchParams();

  function hrefFor(format: "csv" | "xlsx") {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.set("format", format);
    if (view) params.set("view", view);
    return `/api/admin/email-logs/export?${params.toString()}`;
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
        <DropdownMenuItem asChild>
          <a href={hrefFor("csv")}>Export as CSV</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={hrefFor("xlsx")}>Export as Excel</a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
