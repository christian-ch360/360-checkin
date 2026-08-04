import { z } from "zod";

export const visitorTypeValues = [
  "BRAND",
  "CREATOR",
  "AGENCY",
  "VENDOR",
  "BROKER",
  "MEDIA",
  "INTERVIEW",
  "GUEST",
  "OTHER",
] as const;

export const visitorSchema = z.object({
  firstName: z.string().min(1, "Enter a first name"),
  lastName: z.string().min(1, "Enter a last name"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  reasonForVisit: z.string().min(2, "Tell us why you're visiting"),
  visitorType: z.enum(visitorTypeValues),
  expectedTimeLeaving: z.string().optional().or(z.literal("")),
  termsAccepted: z.boolean().refine((v) => v === true, { message: "You must accept the terms to continue" }),
});

export type VisitorInput = z.infer<typeof visitorSchema>;
