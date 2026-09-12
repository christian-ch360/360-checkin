"use server";

import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { EmailService } from "@/lib/email/email-service";

/**
 * One-time, hardcoded send action for the CreatorHUB Academy Kick Off —
 * Matcha & Coffee campaign. The exact 23-person recipient list below was
 * hand-matched to real Member records, safety-checked for duplicates, and
 * explicitly approved by the account owner in chat before this file was
 * written. Recipients are intentionally hardcoded (not an accepted
 * parameter) so this action can never be invoked with a different or
 * larger audience than what was approved — that is the point of this
 * being a one-off action rather than a generic "send to any list" tool.
 *
 * Every send still goes through the real EmailService /
 * sendCreatorHubAcademyKickoffEmail → EmailLog pipeline used everywhere
 * else in Email Center — this is not a parallel send mechanism.
 */
const ORG_ID = "fabe6a56-3a88-4c25-b4dd-7245fc7a84ea"; // CreatorHub360
const SENT_BY_MEMBER_ID = "21680dc1-5b15-4b94-9c0b-bce7a1b94cea"; // Christian Bipat — explicitly approved this send
const OWNER_TEST_EMAIL = "cjbipat@gmail.com";

const CAMPAIGN_RECIPIENTS: { name: string; email: string; memberId: string | null }[] = [
  { name: "Ezekiel Ajeigbe", email: "ajeigbee@icloud.com", memberId: "963d73d8-6b68-4c2f-bc0a-ab90cf01f69c" },
  { name: "Swirv Bramble", email: "swirvent@gmail.com", memberId: "ef0e365b-8aad-4288-8bc1-d4c716d9c9bd" },
  { name: "Divizon Woods", email: "newplanetx94@gmail.com", memberId: "7b6ddaf4-ab05-43e7-b1ff-cf43241eee06" },
  { name: "Marc Illy", email: "atlpub@yahoo.com", memberId: "49ca1fcc-b56d-4b32-9c30-24dbbe0097b9" },
  { name: "Aleksandra Sativa", email: "thisissativa@gmail.com", memberId: "cc9b4c69-bfb6-4fe4-83b5-091acc3a8617" },
  { name: "Katherine La", email: "katherinela@att.net", memberId: "46776bad-b907-4e54-ba8d-61e7fad9b0fc" },
  { name: "Jose Ruiz", email: "josemedia507@gmail.com", memberId: "f6ffd2d9-2041-40d2-80f1-8ca49a7ab09a" },
  { name: "Katie Chen", email: "hellokatiechen@gmail.com", memberId: "510636c4-aca1-44d8-ba01-e12f1634f3d7" },
  { name: "Malack Alu", email: "malackalu@gmail.com", memberId: "18de692e-978e-42dd-a336-45d33a816a64" },
  { name: "JLamar", email: "bookjlamar@gmail.com", memberId: "97b7ec00-1d12-433f-8faf-ef72210df48a" },
  { name: "Nicole Steen", email: "info@nicolesteenfitness.com", memberId: "9f31b224-7450-4c2a-bcfa-3e31182a034a" },
  { name: "Axel Chico", email: "chicoaxel111@gmail.com", memberId: null },
  { name: "Steven Morana", email: "stevenmorana@gmail.com", memberId: "988ab931-c372-49c9-ae7c-5dd51a19d65b" },
  { name: "Abdul Rana", email: "bigsiixstake@gmail.com", memberId: "f015451a-4052-40f0-948c-211905bda76d" },
  { name: "Kasey Ma", email: "kasey@untamedagency.com", memberId: "ada5f396-60d6-451a-ba51-f1d6305e64ab" },
  { name: "Ozioma Ogele", email: "oziomaogele@gmail.com", memberId: "39103776-e6d2-443b-a6cd-5db22c5262b5" },
  { name: "Matthew Bingle", email: "502blasian@gmail.com", memberId: "d352e1b2-dbe2-4952-995f-a3272402a6f2" },
  { name: "Michelle Yang", email: "m1y2l31023@yahoo.com", memberId: "c25abf91-c902-42f2-851b-bb44741ff70b" },
  { name: "Heather Worden", email: "imseeliemusic@gmail.com", memberId: "9e413ce3-cbab-43ad-b0dc-cf430adfa7d9" },
  { name: "Jonathan S Hwang", email: "hwang.s.jonathan@gmail.com", memberId: "97ffb3a4-c8e2-480a-8b70-b88710769bcd" },
  { name: "Shanghai Phantom", email: "info@shanghaiphantom.com", memberId: "3217955d-bedc-42aa-9861-b977eb9380b4" },
  { name: "Priscilla Ling", email: "dancewithsk8s@gmail.com", memberId: "bafefc59-e1df-4166-bfe0-478f7c8d216b" },
  { name: "Todd Exume", email: "texume22@gmail.com", memberId: null },
];

export type CampaignSendRow = { name: string; email: string; sent: boolean; providerId?: string | null; reason?: string | null };
export type CampaignSendReport = {
  success: true;
  campaignResults: CampaignSendRow[];
  testResult: CampaignSendRow;
} | { success: false; error: string };

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

let alreadySent = false;

export async function sendCreatorHubAcademyKickoffCampaignAction(): Promise<CampaignSendReport> {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "communications.manage")) {
    return { success: false, error: "Only Super Admins can send campaigns." };
  }

  // Hard stop against an accidental double-click firing a second real send
  // in the same server process — this campaign is meant to go out exactly
  // once. A fresh deploy/restart resets this, which is fine: the intent is
  // to prevent a rapid repeat click, not to survive process restarts.
  if (alreadySent) {
    return { success: false, error: "This campaign has already been sent from this server instance. Refusing to send again." };
  }

  if (CAMPAIGN_RECIPIENTS.length !== 23) {
    return { success: false, error: `Expected exactly 23 recipients, found ${CAMPAIGN_RECIPIENTS.length}. Aborting.` };
  }
  const emails = CAMPAIGN_RECIPIENTS.map((r) => r.email.toLowerCase());
  if (new Set(emails).size !== emails.length) {
    return { success: false, error: "Duplicate recipient emails detected. Aborting." };
  }
  if (emails.includes(OWNER_TEST_EMAIL.toLowerCase())) {
    return { success: false, error: "Owner test email found inside the campaign list. Aborting." };
  }

  alreadySent = true;

  const campaignResults: CampaignSendRow[] = [];
  for (const r of CAMPAIGN_RECIPIENTS) {
    try {
      const result = await EmailService.sendCreatorHubAcademyKickoffEmail({
        to: r.email,
        organizationId: ORG_ID,
        memberId: r.memberId,
        sentBy: SENT_BY_MEMBER_ID,
        fullName: r.name,
      });
      campaignResults.push({ name: r.name, email: r.email, sent: result.sent, providerId: result.providerId, reason: result.reason });
    } catch (err) {
      campaignResults.push({ name: r.name, email: r.email, sent: false, reason: err instanceof Error ? err.message : String(err) });
    }
    await delay(350);
  }

  let testResult: CampaignSendRow;
  try {
    const result = await EmailService.sendCreatorHubAcademyKickoffEmail({
      to: OWNER_TEST_EMAIL,
      organizationId: ORG_ID,
      memberId: SENT_BY_MEMBER_ID,
      sentBy: SENT_BY_MEMBER_ID,
      fullName: "Christian Bipat",
    });
    testResult = { name: "Christian Bipat (owner test copy)", email: OWNER_TEST_EMAIL, sent: result.sent, providerId: result.providerId, reason: result.reason };
  } catch (err) {
    testResult = { name: "Christian Bipat (owner test copy)", email: OWNER_TEST_EMAIL, sent: false, reason: err instanceof Error ? err.message : String(err) };
  }

  return { success: true, campaignResults, testResult };
}
