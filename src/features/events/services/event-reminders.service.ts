import "server-only";

import { prisma } from "@/lib/db/prisma";
import { EmailService } from "@/lib/email/email-service";

const REMINDER_WINDOW_HOURS = 24;
const STARTING_SOON_WINDOW_MINUTES = 60;

/**
 * Runs hourly — handles both the ~24h "Event Reminder" and ~1h "Event
 * Starting Soon" windows for every GOING RSVP, guarded by reminderSentAt /
 * startingSoonSentAt so a second run within the same window never
 * double-sends.
 */
export async function runEventReminders() {
  const now = new Date();
  const reminderWindowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);
  const startingSoonWindowEnd = new Date(now.getTime() + STARTING_SOON_WINDOW_MINUTES * 60 * 1000);

  const [reminderRsvps, startingSoonRsvps] = await Promise.all([
    prisma.eventRsvp.findMany({
      where: {
        status: "GOING",
        reminderSentAt: null,
        event: { startTime: { gt: now, lte: reminderWindowEnd } },
      },
      include: {
        event: { select: { title: true, startTime: true, location: true, organizationId: true } },
        member: { select: { id: true, email: true, fullName: true, notifyEmail: true } },
      },
    }),
    prisma.eventRsvp.findMany({
      where: {
        status: "GOING",
        startingSoonSentAt: null,
        event: { startTime: { gt: now, lte: startingSoonWindowEnd } },
      },
      include: {
        event: { select: { title: true, startTime: true, location: true, organizationId: true } },
        member: { select: { id: true, email: true, fullName: true, notifyEmail: true } },
      },
    }),
  ]);

  let reminderSent = 0;
  for (const rsvp of reminderRsvps) {
    if (rsvp.member.notifyEmail) {
      await EmailService.sendEventReminderEmail({
        to: rsvp.member.email,
        fullName: rsvp.member.fullName,
        eventTitle: rsvp.event.title,
        startTime: rsvp.event.startTime,
        location: rsvp.event.location,
        organizationId: rsvp.event.organizationId,
        memberId: rsvp.member.id,
      });
      reminderSent++;
    }
    await prisma.eventRsvp.update({ where: { id: rsvp.id }, data: { reminderSentAt: now } });
  }

  let startingSoonSent = 0;
  for (const rsvp of startingSoonRsvps) {
    if (rsvp.member.notifyEmail) {
      await EmailService.sendEventStartingSoonEmail({
        to: rsvp.member.email,
        fullName: rsvp.member.fullName,
        eventTitle: rsvp.event.title,
        startTime: rsvp.event.startTime,
        location: rsvp.event.location,
        organizationId: rsvp.event.organizationId,
        memberId: rsvp.member.id,
      });
      startingSoonSent++;
    }
    await prisma.eventRsvp.update({ where: { id: rsvp.id }, data: { startingSoonSentAt: now } });
  }

  return { reminderSent, startingSoonSent };
}
