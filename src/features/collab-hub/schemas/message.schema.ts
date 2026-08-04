import { z } from "zod";

/**
 * VOICE is deliberately excluded from this union -- MessageType.VOICE exists in the
 * database enum for forward-compat, but nothing can construct one yet.
 */
export const messageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("TEXT"), body: z.string().min(1, "Message can't be empty") }),
  z.object({ type: z.literal("IMAGE"), attachmentUrl: z.string().url(), body: z.string().optional() }),
  z.object({ type: z.literal("FILE"), attachmentUrl: z.string().url(), body: z.string().optional() }),
  z.object({ type: z.literal("PROJECT_REF"), projectRefId: z.string().uuid() }),
  z.object({ type: z.literal("RESERVATION_REF"), reservationRefId: z.string().uuid() }),
]);

export type MessageInput = z.infer<typeof messageSchema>;
