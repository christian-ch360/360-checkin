"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  memberSchema,
  memberRoleValues,
  adminAssignableRoleValues,
  memberStatusValues,
  type MemberInput,
} from "@/features/members/schemas/member.schema";
import { createMember, updateMember } from "@/features/members/services/actions";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { SYSTEM_ROLE_LABELS } from "@/lib/permissions/member-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

const STATUS_LABELS: Record<(typeof memberStatusValues)[number], string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  PENDING: "Pending",
  REJECTED: "Rejected",
};

type MemberFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: { id: string; name: string }[];
  commissionTiers: { id: string; code: string; name: string; percentage: string }[];
  /** Admin/Super Admin *options* are only offered when adding a new member —
   * promoting an existing member goes through the dedicated Permissions card
   * instead. When editing, this only controls whether the Role field shows a
   * hint pointing there (see showAdminRoleOptions/showPermissionsHint below). */
  canAssignAdminRoles?: boolean;
  member?: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: MemberInput["role"];
    status: MemberInput["status"];
    companyId: string | null;
    commissionTierId: string | null;
    referralSource: string | null;
    instagramUrl?: string | null;
    tiktokUrl?: string | null;
    youtubeUrl?: string | null;
    linkedinUrl?: string | null;
    website?: string | null;
    businessRegistrationNumber?: string | null;
  };
};

export function MemberForm({
  open,
  onOpenChange,
  companies,
  commissionTiers,
  canAssignAdminRoles = false,
  member,
}: MemberFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(member);
  const showAdminRoleOptions = !isEdit && canAssignAdminRoles;
  const showPermissionsHint = isEdit && canAssignAdminRoles;

  const form = useForm<MemberInput>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      fullName: member?.fullName ?? "",
      email: member?.email ?? "",
      phone: member?.phone ?? "",
      role: member?.role ?? "CREATOR",
      status: member?.status ?? "ACTIVE",
      companyId: member?.companyId ?? "",
      commissionTierId: member?.commissionTierId ?? "",
      referralSource: member?.referralSource ?? "",
      instagramUrl: member?.instagramUrl ?? "",
      tiktokUrl: member?.tiktokUrl ?? "",
      youtubeUrl: member?.youtubeUrl ?? "",
      linkedinUrl: member?.linkedinUrl ?? "",
      website: member?.website ?? "",
      businessRegistrationNumber: member?.businessRegistrationNumber ?? "",
    },
  });

  const selectedRole = form.watch("role");

  function onSubmit(values: MemberInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateMember(member!.id, values)
        : await createMember(values);

      if (!result.success) {
        if (result.existingAgencyId) {
          toast.error(result.error, {
            action: { label: "View existing agency", onClick: () => router.push(`/members/${result.existingAgencyId}`) },
          });
        } else {
          toast.error(result.error);
        }
        return;
      }

      toast.success(isEdit ? "Member updated" : "Member added");
      if (!isEdit && "onboardingNote" in result && result.onboardingNote) {
        toast.info(result.onboardingNote);
      }
      onOpenChange(false);
      form.reset();
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit member" : "Add member"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update this member's profile details." : "Create a new CreatorHub360 member profile."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4 pb-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Creator" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane@creatorhub360.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {memberRoleValues.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                        {showAdminRoleOptions &&
                          adminAssignableRoleValues.map((role) => (
                            <SelectItem key={role} value={role}>
                              {SYSTEM_ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {showPermissionsHint && (
                      <FormDescription>
                        To grant Admin or Super Admin access, use the Permissions card on this member&apos;s profile.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {memberStatusValues.map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="No company" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commissionTierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commission tier</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="No tier assigned" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {commissionTiers.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>
                          Tier {tier.code} — {tier.percentage}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole === "AGENCY" && (
              <div className="grid grid-cols-1 gap-4 rounded-lg border p-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://youragency.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessRegistrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business registration # (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="EIN / registration ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="referralSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referral source</FormLabel>
                  <FormControl>
                    <Input placeholder="How did they hear about us?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="instagramUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input placeholder="https://instagram.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tiktokUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TikTok</FormLabel>
                    <FormControl>
                      <Input placeholder="https://tiktok.com/@..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="youtubeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube</FormLabel>
                    <FormControl>
                      <Input placeholder="https://youtube.com/@..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="linkedinUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn</FormLabel>
                    <FormControl>
                      <Input placeholder="https://linkedin.com/in/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="px-0 max-md:sticky max-md:bottom-0 max-md:border-t max-md:bg-card/95 max-md:p-4 max-md:backdrop-blur">
              <Button type="submit" disabled={isPending} className="w-full max-md:h-12 max-md:text-base">
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? "Save changes" : "Add member"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
