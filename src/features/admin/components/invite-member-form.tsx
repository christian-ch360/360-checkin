"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { z } from "zod";
import { inviteMember } from "@/features/admin/services/actions";
import { SYSTEM_ROLE_LABELS, systemRoleValues, RESTRICTED_INVITE_ROLES } from "@/lib/permissions/member-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  email: z.string().email("Enter a valid email"),
  role: z.enum(systemRoleValues),
});

export function InviteMemberForm({ canManageRoles = false }: { canManageRoles?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", role: "MEMBER" },
  });

  const roleOptions = systemRoleValues.filter(
    (role) => canManageRoles || !RESTRICTED_INVITE_ROLES.includes(role)
  );

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const result = await inviteMember(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Invitation created");
      form.reset();
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="flex-1 min-w-[220px]">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="new.member@creatorhub360.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem className="w-44">
              <FormLabel>Role</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {SYSTEM_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus />}
          Send invite
        </Button>
      </form>
    </Form>
  );
}
