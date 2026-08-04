import { z } from "zod";
import { EventCategory } from "@prisma/client";

export const rsvpStatusValues = ["GOING", "MAYBE", "NOT_GOING", "WAITLISTED"] as const;

const sponsorSchema = z.object({
  name: z.string().min(1),
  logoUrl: z.string().url().optional().or(z.literal("")),
  message: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaLink: z.string().url().optional().or(z.literal("")),
});

const eventFieldsSchema = z.object({
  title: z.string().min(3, "Give the event a title"),
  description: z.string().optional(),
  category: z.nativeEnum(EventCategory).default("OTHER"),
  location: z.string().optional(),
  spaceId: z.string().uuid().optional().or(z.literal("")),
  startTime: z.date(),
  endTime: z.date(),
  capacity: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  hostName: z.string().min(2, "Host name is required"),
  hostContact: z.string().min(3, "Host contact is required"),
  registrationDeadline: z.date().optional(),
  website: z.string().url().optional().or(z.literal("")),
  dressCode: z.string().optional(),
  foodProvided: z.boolean().default(false),
  parkingInfo: z.string().optional(),
  equipmentNeeded: z.array(z.string()).default([]),
  livestreamUrl: z.string().url().optional().or(z.literal("")),
  ticketPriceCents: z.number().int().nonnegative().optional(),
  isPrivate: z.boolean().default(false),
  sponsors: z.array(sponsorSchema).optional(),
});

export const eventProposalSchema = eventFieldsSchema.refine((v) => v.endTime > v.startTime, {
  message: "End time must be after start time.",
  path: ["endTime"],
});

export type EventProposalInput = z.infer<typeof eventProposalSchema>;

// Draft saves skip the cross-field end>start check (a half-filled draft is
// allowed to have start/end that don't make sense yet) but title/startTime/
// endTime stay required — they're NOT NULL columns on Event, so even the
// earliest draft needs placeholder values the form can default.
export const eventDraftSchema = eventFieldsSchema.partial().extend({
  title: z.string().min(3, "Give the event a title"),
  startTime: z.date(),
  endTime: z.date(),
});
export type EventDraftInput = z.infer<typeof eventDraftSchema>;

export const rsvpSchema = z.object({
  status: z.enum(rsvpStatusValues),
});

export const rejectEventSchema = z.object({
  reason: z.string().min(3, "Give a reason so the host knows what to fix."),
});

export const requestEventChangesSchema = z.object({
  note: z.string().min(3, "Explain what needs to change."),
});

export const cancelEventSchema = z.object({
  reason: z.string().optional(),
});
