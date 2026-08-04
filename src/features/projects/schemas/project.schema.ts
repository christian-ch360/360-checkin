import { z } from "zod";

export const projectStatusValues = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;

export const projectSchema = z.object({
  name: z.string().min(2, "Enter a project name"),
  description: z.string().optional().or(z.literal("")),
  clientId: z.string().uuid().optional().or(z.literal("")),
  brandId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(projectStatusValues),
  deadline: z.string().optional().or(z.literal("")),
  projectLeaderId: z.string().uuid().optional().or(z.literal("")),
  budget: z.string().optional().or(z.literal("")),
});

export type ProjectInput = z.infer<typeof projectSchema>;

export const taskSchema = z.object({
  title: z.string().min(2, "Enter a task title"),
  description: z.string().optional().or(z.literal("")),
  status: z.enum(["todo", "in_progress", "done"]),
  dueDate: z.string().optional().or(z.literal("")),
});

export type TaskInput = z.infer<typeof taskSchema>;

export const assignmentSchema = z.object({
  memberId: z.string().uuid("Select a member"),
  role: z.string().min(1, "Enter a role"),
  commissionPct: z.string().optional().or(z.literal("")),
  contributionPct: z.string().optional().or(z.literal("")),
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;
