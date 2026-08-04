import { describe, it, expect } from "vitest";
import {
  LEGAL_DOCUMENTS,
  LEGAL_DOCUMENT_LIST,
  getSeedVersion,
  getDocumentHref,
} from "@/features/legal/documents";
import { applicationSchema } from "@/features/applications/schemas/application.schema";
import { signupSchema } from "@/features/auth/schemas/auth.schema";

const VALID_APPLICATION_FIELDS = {
  fullName: "Jane Creator",
  email: "jane@example.com",
  phone: "5551234567",
  role: "CREATOR" as const,
  company: "",
  instagram: "https://instagram.com/jane",
  tiktok: "https://tiktok.com/@jane",
  youtube: "",
  city: "Los Angeles",
  state: "California",
  country: "United States",
  reason: "I want to join CreatorHub360 to grow my creative business.",
  referredBy: "No Referral",
};

const REQUIRED_APPLICATION_CONSENTS = {
  termsAccepted: true as const,
  privacyAccepted: true as const,
  dataProcessingAccepted: true as const,
  mediaReleaseAccepted: true as const,
};

const VALID_SIGNUP_FIELDS = {
  fullName: "Jane Creator",
  email: "jane@example.com",
  password: "password123",
  confirmPassword: "password123",
  appliedRole: "CREATOR" as const,
};

describe("legal document registry", () => {
  it("defines all 4 page documents with non-empty content", () => {
    expect(LEGAL_DOCUMENT_LIST).toHaveLength(4);
    for (const doc of LEGAL_DOCUMENT_LIST) {
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.version.length).toBeGreaterThan(0);
      expect(doc.effectiveDate.length).toBeGreaterThan(0);
      expect(doc.sections.length).toBeGreaterThan(0);
      for (const section of doc.sections) {
        expect(section.body.length).toBeGreaterThan(0);
      }
    }
  });

  it("has unique slugs", () => {
    const slugs = LEGAL_DOCUMENT_LIST.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("resolves DATA_PROCESSING's seed version to the Privacy Policy's seed version", () => {
    expect(getSeedVersion("DATA_PROCESSING")).toBe(LEGAL_DOCUMENTS.PRIVACY.version);
  });

  it("resolves each real document type's seed version to its own registry entry", () => {
    expect(getSeedVersion("TERMS")).toBe(LEGAL_DOCUMENTS.TERMS.version);
    expect(getSeedVersion("MEDIA_RELEASE")).toBe(LEGAL_DOCUMENTS.MEDIA_RELEASE.version);
    expect(getSeedVersion("LIABILITY_RELEASE")).toBe(LEGAL_DOCUMENTS.LIABILITY_RELEASE.version);
  });

  it("points DATA_PROCESSING's href at the Privacy Policy's consent anchor", () => {
    expect(getDocumentHref("DATA_PROCESSING")).toBe("/legal/privacy#data-processing");
  });

  it("points every other document type's href at its own page", () => {
    expect(getDocumentHref("TERMS")).toBe("/legal/terms");
    expect(getDocumentHref("PRIVACY")).toBe("/legal/privacy");
    expect(getDocumentHref("MEDIA_RELEASE")).toBe("/legal/media-release");
    expect(getDocumentHref("LIABILITY_RELEASE")).toBe("/legal/release-of-liability");
  });
});

// buildAcceptanceInputs now resolves versions from the DB (see
// legal-documents.service.ts) and needs a real organizationId, so its
// coverage (one row per type, shared acceptedAt, version stamping, IP/UA
// pass-through, null IP allowed) lives in
// tests/integration/legal-consent.test.ts against a real Postgres org.

describe("applicationSchema legal consent requirements", () => {
  it("rejects the application when any required consent is missing", () => {
    for (const key of Object.keys(REQUIRED_APPLICATION_CONSENTS) as (keyof typeof REQUIRED_APPLICATION_CONSENTS)[]) {
      const result = applicationSchema.safeParse({
        ...VALID_APPLICATION_FIELDS,
        ...REQUIRED_APPLICATION_CONSENTS,
        [key]: false,
      });
      expect(result.success, `expected failure when ${key} is false`).toBe(false);
    }
  });

  it("accepts the application once all 4 consents are true", () => {
    const result = applicationSchema.safeParse({ ...VALID_APPLICATION_FIELDS, ...REQUIRED_APPLICATION_CONSENTS });
    expect(result.success).toBe(true);
  });
});

describe("signupSchema legal consent requirements", () => {
  const requiredConsents = {
    termsAccepted: true as const,
    privacyAccepted: true as const,
    dataProcessingAccepted: true as const,
    mediaReleaseAccepted: true as const,
  };

  it("rejects signup when any required consent is missing", () => {
    for (const key of Object.keys(requiredConsents) as (keyof typeof requiredConsents)[]) {
      const result = signupSchema.safeParse({
        ...VALID_SIGNUP_FIELDS,
        ...requiredConsents,
        [key]: false,
      });
      expect(result.success, `expected failure when ${key} is false`).toBe(false);
    }
  });

  it("accepts signup once all 4 consents are true", () => {
    const result = signupSchema.safeParse({ ...VALID_SIGNUP_FIELDS, ...requiredConsents });
    expect(result.success).toBe(true);
  });
});
