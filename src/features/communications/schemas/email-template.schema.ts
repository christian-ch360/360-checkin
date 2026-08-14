import { z } from "zod";
import { EmailCategory, EmailTemplateStatus } from "@prisma/client";

const EMAIL_CATEGORY_VALUES = Object.values(EmailCategory) as [EmailCategory, ...EmailCategory[]];
const EMAIL_TEMPLATE_STATUS_VALUES = Object.values(EmailTemplateStatus) as [EmailTemplateStatus, ...EmailTemplateStatus[]];

/** Lowercase snake_case, matching every existing TemplateName (e.g. "welcome", "new_direct_message"). */
export const templateKeySchema = z
  .string()
  .min(2, "Enter a template key")
  .max(64, "Keep the key under 64 characters")
  .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, numbers, and underscores, starting with a letter");

export const emailTemplateSchema = z.object({
  templateKey: templateKeySchema,
  name: z.string().min(2, "Enter a template name").max(160),
  description: z.string().max(500).optional().or(z.literal("")),
  category: z.enum(EMAIL_CATEGORY_VALUES),
  subject: z.string().min(1, "Enter a subject").max(300),
  previewText: z.string().max(300).optional().or(z.literal("")),
  bodyHtml: z.string().min(1, "Enter the email body"),
  status: z.enum(EMAIL_TEMPLATE_STATUS_VALUES),
});

export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;
