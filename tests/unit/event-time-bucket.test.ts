import { describe, it, expect } from "vitest";
import { computeEventTimeBucket } from "@/features/events/services/events.service";

const now = new Date("2026-06-01T12:00:00Z");

function event(status: "DRAFT" | "PENDING_APPROVAL" | "PUBLISHED" | "REJECTED" | "CANCELLED", startOffsetHrs: number, endOffsetHrs: number) {
  return {
    status,
    startTime: new Date(now.getTime() + startOffsetHrs * 3600_000),
    endTime: new Date(now.getTime() + endOffsetHrs * 3600_000),
  };
}

describe("computeEventTimeBucket", () => {
  it("buckets a pending proposal as pending regardless of time", () => {
    expect(computeEventTimeBucket(event("PENDING_APPROVAL", 1, 2), now)).toBe("pending");
  });

  it("buckets a cancelled event as cancelled regardless of time", () => {
    expect(computeEventTimeBucket(event("CANCELLED", -2, -1), now)).toBe("cancelled");
  });

  it("buckets a draft as drafts", () => {
    expect(computeEventTimeBucket(event("DRAFT", 1, 2), now)).toBe("drafts");
  });

  it("buckets a rejected proposal as drafts", () => {
    expect(computeEventTimeBucket(event("REJECTED", 1, 2), now)).toBe("drafts");
  });

  it("buckets a published future event as upcoming", () => {
    expect(computeEventTimeBucket(event("PUBLISHED", 1, 2), now)).toBe("upcoming");
  });

  it("buckets a published event spanning now as live", () => {
    expect(computeEventTimeBucket(event("PUBLISHED", -1, 1), now)).toBe("live");
  });

  it("buckets a published past event as completed", () => {
    expect(computeEventTimeBucket(event("PUBLISHED", -3, -1), now)).toBe("completed");
  });
});
