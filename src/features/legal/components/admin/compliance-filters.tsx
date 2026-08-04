"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import type { LegalDocumentType, MemberRole } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { COMPLIANCE_STATUS_META } from "@/features/legal/config/compliance-status-meta";
import type { ComplianceStatus } from "@/features/legal/services/compliance.service";

const DOCUMENT_OPTIONS: { value: LegalDocumentType; label: string }[] = [
  { value: "TERMS", label: "Terms & Conditions" },
  { value: "PRIVACY", label: "Privacy Policy" },
  { value: "MEDIA_RELEASE", label: "Media Release" },
  { value: "LIABILITY_RELEASE", label: "Release of Liability" },
];

const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [MemberRole, string][];
const STATUS_OPTIONS = Object.entries(COMPLIANCE_STATUS_META) as [ComplianceStatus, { label: string }][];

export function ComplianceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("search", search);
      else params.delete("search");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] max-w-xs flex-1">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <Select value={searchParams.get("role") ?? "all"} onValueChange={(v) => setParam("role", v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          {ROLE_OPTIONS.map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("document") ?? "all"} onValueChange={(v) => setParam("document", v)}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Document" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All documents</SelectItem>
          {DOCUMENT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("status") ?? "all"} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_OPTIONS.map(([value, meta]) => (
            <SelectItem key={value} value={value}>
              {meta.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        aria-label="Accepted from"
        value={searchParams.get("from") ?? ""}
        onChange={(e) => setParam("from", e.target.value)}
        className="w-[150px]"
      />
      <Input
        type="date"
        aria-label="Accepted to"
        value={searchParams.get("to") ?? ""}
        onChange={(e) => setParam("to", e.target.value)}
        className="w-[150px]"
      />
    </div>
  );
}
