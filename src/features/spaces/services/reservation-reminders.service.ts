import "server-only";

import { prisma } from "@/lib/db/prisma";
import { EmailService } from "@/lib/email/email-service";

const REMINDER_WINDOW_MINUTES = 60;

/**
 * Runs every 15 minutes — sends a reminder ~1h before a confirmed
 * reservation starts. reminderSentAt guards against duplicate sends across
 * invocations; there's no cron-run bookkeeping beyond that single field.
 */
export async function runReservationReminders() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

  const reservations = await prisma.reservation.findMany({
    where: {
      status: "CONFIRMED",
      startTime: { gt: now, lte: windowEnd },
      reminderSentAt: null,
    },
    include: {
      space: { select: { name: true } },
      member: { select: { id: true, email: true, fullName: true, notifySpaceBookings: true } },
      attendees: { select: { id: true, email: true, fullName: true, notifySpaceBookings: true } },
    },
  });

  let sent = 0;
  for (const reservation of reservations) {
    const recipients = [reservation.member, ...reservation.attendees].filter((r) => r.notifySpaceBookings);
    for (const recipient of recipients) {
      await EmailService.sendReservationReminderEmail({
        to: recipient.email,
        fullName: recipient.fullName,
        spaceName: reservation.space.name,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        organizationId: reservation.organizationId,
        memberId: recipient.id,
      });
      sent++;
    }
    await prisma.reservation.update({ where: { id: reservation.id }, data: { reminderSentAt: now } });
  }

  return { reservationsProcessed: reservations.length, emailsSent: sent };
}
