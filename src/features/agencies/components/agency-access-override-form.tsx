"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { overrideAgencyAccessByEmailAction } from "@/features/agencies/services/agency-actions";
import type { AgencyMemberRole } from "@prisma/client";

const ROLE_OPTIONS: { value: AgencyMemberRole; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "MANAGER", label: "Manager" },
  { value: "STAFF", label: "Staff" },
];

export function AgencyAccessOverrideForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState<AgencyMemberRole>("STAFF");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await overrideAgencyAccessByEmailAction(email, code, role);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Agency access granted");
      setEmail("");
      setCode("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="size-4 text-warning" /> Override agency access
        </CardTitle>
        <CardDescription>
          Grants a member access to an agency directly, bypassing any pending request — for fixing a
          mis-filed application without waiting on the agency&apos;s own review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="override-email">Member email</Label>
            <Input
              id="override-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="creator@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="override-code">Agency ID (referral code)</Label>
            <Input
              id="override-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. ABCD1234"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="override-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AgencyMemberRole)}>
              <SelectTrigger id="override-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Grant access
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
