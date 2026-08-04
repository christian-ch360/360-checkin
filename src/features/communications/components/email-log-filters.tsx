"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format, startOfDay, startOfYear, subDays } from "date-fns";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EMAIL_CATEGORY_LABELS, EMAIL_STATUS_LABELS } from "@/features/communications/config/template-catalog";
import type { TemplateName } from "@/lib/email/email-types";

const QUICK_FILTERS = [
  { label: "Today", from: () => startOfDay(new Date()) },
  { label: "Last 7 Days", from: () => startOfDay(subDays(new Date(), 6)) },
  { label: "Last 30 Days", from: () => startOfDay(subDays(new Date(), 29)) },
  { label: "This Year", from: () => startOfYear(new Date()) },
] as const;

export function EmailLogFilters({ templates }: { templates: TemplateName[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [showCustomRange, setShowCustomRange] = useState(Boolean(searchParams.get("from") || searchParams.get("to")));

  function setParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setParams({ search: search || null });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const activeFrom = searchParams.get("from");
  const activeTo = searchParams.get("to");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by member, email, or subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={searchParams.get("template") ?? "all"} onValueChange={(v) => setParams({ template: v })}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All templates</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={searchParams.get("category") ?? "all"} onValueChange={(v) => setParams({ category: v })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {Object.entries(EMAIL_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={searchParams.get("status") ?? "all"} onValueChange={(v) => setParams({ status: v })}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(EMAIL_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUICK_FILTERS.map((qf) => (
          <Button
            key={qf.label}
            variant="outline"
            size="sm"
            onClick={() => {
              setShowCustomRange(false);
              setParams({ from: format(qf.from(), "yyyy-MM-dd"), to: format(new Date(), "yyyy-MM-dd") });
            }}
          >
            {qf.label}
          </Button>
        ))}
        <Button
          variant={showCustomRange ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowCustomRange((v) => !v)}
        >
          Custom Range
        </Button>
        {(activeFrom || activeTo) && (
          <Button variant="ghost" size="sm" onClick={() => setParams({ from: null, to: null })}>
            Clear dates
          </Button>
        )}
      </div>

      {showCustomRange && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="w-40"
            value={activeFrom ?? ""}
            onChange={(e) => setParams({ from: e.target.value || null })}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            className="w-40"
            value={activeTo ?? ""}
            onChange={(e) => setParams({ to: e.target.value || null })}
          />
        </div>
      )}
    </div>
  );
}
