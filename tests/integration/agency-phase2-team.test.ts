import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  leaveAgency,
  removeTeamMember,
  updateTeamMemberRole,
  transferOwnership,
} from "@/features/agencies/services/agency-team.service";
import {
  createAgencyInvitation,
  getValidAgencyInvitation,
  acceptAgencyInvitation,
  declineAgencyInvitation,
} from "@/features/agencies/services/agency-invitations.service";
import { getAgencyActivity } from "@/features/agencies/services/agency-activity.service";
import { getAgencyTeam } from "@/features/agencies/services/agency-access.service";

const prisma = new PrismaClient();

const LAST_OWNER_ERROR = "This agency must always have at least one Owner. Transfer ownership before continuing.";

const runId = Date.now();
let organizationId: string;
let agencyId: string; // canonical Owner
let managerId: string;
let staffId: string;

describe("Phase 2: Agency Team Management (integration, real Postgres)", () => {
  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: `Test Org Phase2 ${runId}`, slug: `test-org-phase2-${runId}` },
    });
    organizationId = org.id;

    const agency = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-P2-AGY-${runId}`,
        fullName: "Phase2 Talent Agency",
        email: `phase2-agency-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
        agencyRole: "OWNER",
      },
    });
    agencyId = agency.id;

    const manager = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-P2-MGR-${runId}`,
        fullName: "Morgan Manager",
        email: `phase2-manager-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
        agencyId,
        agencyRole: "MANAGER",
      },
    });
    managerId = manager.id;

    const staff = await prisma.member.create({
      data: {
        organizationId,
        memberNumber: `TEST-P2-STF-${runId}`,
        fullName: "Sam Staff",
        email: `phase2-staff-${runId}@example.com`,
        role: "AGENCY",
        status: "ACTIVE",
        agencyId,
        agencyRole: "STAFF",
      },
    });
    staffId = staff.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { member: { organizationId } } });
    await prisma.auditLog.deleteMany({ where: { organizationId } });
    await prisma.agencyActivity.deleteMany({ where: { organizationId } });
    await prisma.agencyInvitation.deleteMany({ where: { organizationId } });
    await prisma.member.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  describe("Prevent Orphaned Agencies", () => {
    it("blocks the sole Owner from leaving", async () => {
      const result = await leaveAgency(organizationId, agencyId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("founding account");
      }
    });

    it("blocks removing the sole Owner", async () => {
      const result = await removeTeamMember(organizationId, agencyId, agencyId, managerId);
      expect(result.success).toBe(false);
    });

    it("blocks demoting the sole Owner to Manager", async () => {
      const result = await updateTeamMemberRole(organizationId, agencyId, agencyId, "MANAGER", agencyId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(LAST_OWNER_ERROR);
      }
    });

    it("allows the Owner to leave only after another Owner exists", async () => {
      const transfer = await transferOwnership(organizationId, agencyId, agencyId, managerId);
      expect(transfer.success).toBe(true);

      const team = await getAgencyTeam(organizationId, agencyId);
      const newOwner = team.find((m) => m.id === managerId);
      const oldOwner = team.find((m) => m.id === agencyId);
      expect(newOwner?.role).toBe("OWNER");
      expect(oldOwner?.role).toBe("MANAGER");

      // Now that managerId is an Owner too, the original founding account is
      // still structurally "canonical" and can't literally leave (it has no
      // agencyId to null out), but demoting it away from Owner should now
      // succeed since it's no longer the last Owner.
      const demote = await updateTeamMemberRole(organizationId, agencyId, agencyId, "MANAGER", managerId);
      expect(demote.success).toBe(true);
    });
  });

  describe("Agency Team roster", () => {
    it("reflects live agencyRole for every team member, including Staff", async () => {
      const team = await getAgencyTeam(organizationId, agencyId);
      const staffMember = team.find((m) => m.id === staffId);
      expect(staffMember?.role).toBe("STAFF");
      expect(staffMember?.isCanonical).toBe(false);
    });
  });

  describe("Agency Invitations", () => {
    const inviteEmail = `phase2-invitee-${runId}@example.com`;

    it("creates a PENDING invitation with a valid token", async () => {
      const result = await createAgencyInvitation(organizationId, agencyId, "Riley Invitee", inviteEmail, "STAFF", managerId);
      expect(result.success).toBe(true);

      const invitation = await prisma.agencyInvitation.findFirst({ where: { organizationId, agencyId, email: inviteEmail } });
      expect(invitation?.status).toBe("PENDING");
      expect(invitation?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("getValidAgencyInvitation returns null for an expired invitation", async () => {
      const invitation = await prisma.agencyInvitation.findFirstOrThrow({ where: { organizationId, agencyId, email: inviteEmail } });
      await prisma.agencyInvitation.update({ where: { id: invitation.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

      const resolved = await getValidAgencyInvitation(invitation.token);
      expect(resolved).toBeNull();
    });

    it("acceptAgencyInvitation joins the team and marks the invitation ACCEPTED", async () => {
      const invitee = await prisma.member.create({
        data: {
          organizationId,
          memberNumber: `TEST-P2-INV-${runId}`,
          fullName: "Riley Invitee",
          email: inviteEmail,
          role: "AGENCY",
          status: "ACTIVE",
        },
      });

      const invitation = await prisma.agencyInvitation.findFirstOrThrow({ where: { organizationId, agencyId, email: inviteEmail } });
      // Reset expiry (the previous test intentionally expired it) so accept succeeds.
      await prisma.agencyInvitation.update({ where: { id: invitation.id }, data: { expiresAt: new Date(Date.now() + 86_400_000) } });

      const result = await acceptAgencyInvitation(organizationId, invitation.token, invitee.id);
      expect(result.success).toBe(true);

      const updatedMember = await prisma.member.findUniqueOrThrow({ where: { id: invitee.id } });
      expect(updatedMember.agencyId).toBe(agencyId);
      expect(updatedMember.agencyRole).toBe("STAFF");

      const updatedInvitation = await prisma.agencyInvitation.findUniqueOrThrow({ where: { id: invitation.id } });
      expect(updatedInvitation.status).toBe("ACCEPTED");
    });

    it("declineAgencyInvitation marks a fresh invitation DECLINED without requiring an account", async () => {
      const declineEmail = `phase2-decline-${runId}@example.com`;
      await createAgencyInvitation(organizationId, agencyId, "Casey Decliner", declineEmail, "STAFF", managerId);
      const invitation = await prisma.agencyInvitation.findFirstOrThrow({ where: { organizationId, agencyId, email: declineEmail } });

      const result = await declineAgencyInvitation(invitation.token);
      expect(result.success).toBe(true);

      const updated = await prisma.agencyInvitation.findUniqueOrThrow({ where: { id: invitation.id } });
      expect(updated.status).toBe("DECLINED");
    });
  });

  describe("Team Activity Feed", () => {
    it("records ownership transfers and invitation events, newest first", async () => {
      const activity = await getAgencyActivity(organizationId, agencyId, "all");
      const types = activity.map((a) => a.type);
      expect(types).toContain("OWNERSHIP_TRANSFERRED");
      expect(types).toContain("INVITATION_SENT");
      expect(types).toContain("INVITATION_ACCEPTED");
      expect(types).toContain("INVITATION_DECLINED");

      for (let i = 1; i < activity.length; i++) {
        expect(activity[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(activity[i].createdAt.getTime());
      }
    });

    it("supports filtering to a narrower time window without erroring", async () => {
      const todayOnly = await getAgencyActivity(organizationId, agencyId, "today");
      expect(Array.isArray(todayOnly)).toBe(true);
      expect(todayOnly.length).toBeGreaterThan(0);
    });
  });
});
