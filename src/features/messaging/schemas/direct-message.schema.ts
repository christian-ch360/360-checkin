import { z } from "zod";

/**
 * VOICE is deliberately excluded -- DirectMessageType.VOICE exists in the
 * database enum for forward-compat, but nothing can construct one yet
 * (same convention as Collab Hub's message.schema.ts).
 */
export const directMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("TEXT"), body: z.string().min(1, "Message can't be empty") }),
  z.object({ type: z.literal("IMAGE"), attachmentUrl: z.string().url(), body: z.string().optional() }),
  z.object({ type: z.literal("FILE"), attachmentUrl: z.string().url(), body: z.string().optional() }),
]);

export type DirectMessageInput = z.infer<typeof directMessageSchema>;
