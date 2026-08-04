import type { LegalDocumentDefinition } from "@/features/legal/types";

export const PRIVACY_DOCUMENT: LegalDocumentDefinition = {
  type: "PRIVACY",
  slug: "privacy",
  title: "Privacy Policy",
  version: "1.0",
  effectiveDate: "2026-07-30",
  summary:
    "What personal data CreatorHub360 collects, why we process it, who we share it with, and the rights you have over it — including your consent to processing.",
  sections: [
    {
      id: "overview",
      heading: "1. Overview",
      body: [
        "This Privacy Policy explains how CreatorHub360 collects, uses, discloses, and protects personal data belonging to applicants and Members of the platform. It applies wherever CreatorHub360 processes your data: the web application, the kiosk check-in terminals, and our backend systems.",
      ],
    },
    {
      id: "data-we-collect",
      heading: "2. Information We Collect",
      body: [
        "Account & profile data: full name, email, phone number, company, role, bio, social media handles, and profile photo.",
        "Facility & access data: QR badge scans, check-in/check-out timestamps, and the location or kiosk terminal used.",
        "Financial & commission data: GMV entries, commission calculations, payout records, and membership billing status where applicable.",
        "Usage data: pages visited, actions taken within the platform, and device/browser information collected automatically.",
        "Technical data: IP address and user agent, including at the moment you accept these legal agreements (see Section 4, Consent to Processing).",
        "Communications: messages sent through Collab Hub, direct messages, and support correspondence.",
      ],
    },
    {
      id: "how-we-use-it",
      heading: "3. How We Use Your Information",
      body: [
        "We use your information to: operate and secure your account; grant and log facility access; calculate GMV, commissions, and payouts; facilitate Collab Hub matchmaking and messaging; send transactional and, where you've opted in, marketing communications; enforce these Terms and the Release of Liability; and improve the platform.",
      ],
    },
    {
      id: "data-processing",
      heading: "4. Consent to Collection & Processing of Personal Data",
      body: [
        "By checking the corresponding box at signup, you separately and explicitly consent to CreatorHub360 collecting and processing the categories of personal data described in Section 2 for the purposes described in Section 3. This consent is the legal basis we rely on in jurisdictions that require explicit consent for processing (for example, under GDPR Article 6(1)(a) or equivalent local law) — it exists alongside, not instead of, our processing that is otherwise necessary to perform your membership agreement or to comply with law.",
        "You may withdraw this consent at any time by contacting us, without affecting the lawfulness of processing carried out before withdrawal; withdrawing consent required to operate your account may result in suspension of the affected features or of your membership.",
      ],
    },
    {
      id: "sharing",
      heading: "5. How We Share Information",
      body: [
        "We share personal data with: service providers who process data on our behalf (hosting, email delivery, payment processing) under contractual confidentiality obligations; other Members, to the extent your profile or Collab Hub post is configured as visible in the directory; brands, agencies, or partners you choose to engage with through the platform; and regulators, law enforcement, or other parties where required by law or to protect the rights, property, or safety of CreatorHub360, our Members, or the public.",
        "We do not sell your personal data.",
      ],
    },
    {
      id: "retention",
      heading: "6. Data Retention",
      body: [
        "We retain personal data for as long as your account is active and for a reasonable period afterward to satisfy legal, accounting, dispute-resolution, and audit-trail obligations (including the acceptance records described in Section 4). Facility check-in logs and GMV/commission records are retained in accordance with applicable financial record-keeping requirements.",
      ],
    },
    {
      id: "your-rights",
      heading: "7. Your Rights",
      body: [
        "Depending on your jurisdiction, you may have the right to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your data, subject to our legitimate retention needs; request a portable copy of your data; object to or restrict certain processing; and withdraw consent as described in Section 4.",
        "To exercise any of these rights, contact your organization's CreatorHub360 administrator or support contact. We will respond within the timeframe required by applicable law.",
      ],
    },
    {
      id: "cookies",
      heading: "8. Cookies & Similar Technologies",
      body: [
        "The platform uses strictly necessary cookies to keep you signed in and to remember basic preferences. We do not use third-party advertising trackers.",
      ],
    },
    {
      id: "security",
      heading: "9. Security",
      body: [
        "We apply administrative, technical, and physical safeguards designed to protect personal data, including encryption in transit, row-level access controls in our database, and restricted administrative access. No system is completely secure, and we encourage you to use a strong, unique password and to report any suspected compromise immediately.",
      ],
    },
    {
      id: "international-transfers",
      heading: "10. International Data Transfers",
      body: [
        "Your data may be processed in a country other than the one in which you reside. Where required, we rely on appropriate safeguards (such as standard contractual clauses) to protect data transferred internationally.",
      ],
    },
    {
      id: "children",
      heading: "11. Children's Privacy",
      body: ["CreatorHub360 is not directed to individuals under 18, and we do not knowingly collect personal data from them."],
    },
    {
      id: "changes",
      heading: "12. Changes to This Policy",
      body: [
        "We may update this Privacy Policy from time to time. When we do, we update the version and effective date shown on this page and, for material changes, notify active Members.",
      ],
    },
    {
      id: "contact",
      heading: "13. Contact",
      body: [
        "Questions about this Privacy Policy, or requests to exercise your rights under Section 7, can be directed to your organization's CreatorHub360 administrator or support contact.",
      ],
    },
  ],
};
