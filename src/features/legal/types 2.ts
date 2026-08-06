import type { LegalDocumentType } from "@prisma/client";

/** The 4 legal documents that have their own page — DATA_PROCESSING has no
 * standalone page (its clause lives inside the Privacy Policy) so it's
 * deliberately excluded from this union. See documents/index.ts. */
export type LegalPageDocumentType = Exclude<LegalDocumentType, "DATA_PROCESSING">;

export type LegalSection = {
  id: string;
  heading: string;
  body: string[];
};

export type LegalDocumentDefinition = {
  type: LegalPageDocumentType;
  slug: string;
  title: string;
  /** Bump on every substantive revision — this is what gets stored on every
   * new LegalAcceptance/MembershipApplicationLegalAcceptance row and shown
   * back to members in Settings > Legal. */
  version: string;
  effectiveDate: string;
  summary: string;
  sections: LegalSection[];
};
