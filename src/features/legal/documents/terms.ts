import type { LegalDocumentDefinition } from "@/features/legal/types";

export const TERMS_DOCUMENT: LegalDocumentDefinition = {
  type: "TERMS",
  slug: "terms",
  title: "Terms & Conditions",
  version: "1.0",
  effectiveDate: "2026-07-30",
  summary:
    "The rules that govern your use of CreatorHub360 — your account, membership, facility access, and how GMV and commissions are tracked.",
  sections: [
    {
      id: "acceptance",
      heading: "1. Acceptance of Terms",
      body: [
        "These Terms & Conditions (\"Terms\") form a binding agreement between you and CreatorHub360 (\"CreatorHub360,\" \"we,\" \"us\"). By submitting an application, accepting an invitation, or otherwise creating a Member account, you confirm that you have read, understood, and agree to be bound by these Terms.",
        "If you do not agree to these Terms, do not submit an application or create an account. Continued use of the platform after a revised version of these Terms takes effect constitutes acceptance of the revision.",
      ],
    },
    {
      id: "eligibility",
      heading: "2. Eligibility & Membership",
      body: [
        "CreatorHub360 membership is granted at our discretion following review of your application. We may approve, reject, or request additional information before approving any application.",
        "You must be at least 18 years old, or the age of majority in your jurisdiction, to hold a Member account. Membership tiers (Creator, Brand, Agency, Broker, and others) carry different features, benefits, and — where applicable — billing terms disclosed to you at signup and in your Settings.",
      ],
    },
    {
      id: "account",
      heading: "3. Account Registration & Security",
      body: [
        "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account, including activity performed through your personal QR badge.",
        "You agree to provide accurate, current, and complete information during signup and to keep that information up to date in Settings. Notify us immediately of any unauthorized use of your account or QR badge.",
      ],
    },
    {
      id: "facility",
      heading: "4. Facility Access & Kiosk Check-In",
      body: [
        "Members with facility access may check in and out using their personal QR code at kiosk terminals or staffed entry points. Check-in and check-out events, timestamps, and location data are recorded for occupancy, safety, and billing purposes.",
        "You agree to follow all posted facility rules, staff instructions, and space-specific guidelines (studios, editing suites, meeting rooms, and other bookable Spaces). Booking a Space through the platform reserves that resource for the stated time window only, and no-shows or repeated late cancellations may result in booking privileges being restricted.",
      ],
    },
    {
      id: "gmv-commission",
      heading: "5. GMV & Commission Tracking",
      body: [
        "For Members whose membership tier involves revenue attribution, gross merchandise value (GMV) generated through the platform's tracked channels is recorded against your account and used to calculate commissions under your assigned commission tier.",
        "You agree to report GMV accurately and understand that commission calculations, payout eligibility, and payout timing are determined by the commission tier and policies in effect at the time the GMV was recorded, as disclosed to you in your Member dashboard.",
      ],
    },
    {
      id: "acceptable-use",
      heading: "6. Acceptable Use",
      body: [
        "You agree not to: (a) use the platform for any unlawful purpose; (b) misrepresent your identity, affiliation, or the content you submit for Collab Hub posts, applications, or profiles; (c) attempt to access another Member's account, QR badge, or data; (d) interfere with or disrupt the platform, kiosk devices, or facility systems; or (e) upload content that infringes another party's intellectual property or rights of publicity.",
        "We may suspend or terminate access for any Member who violates this section or otherwise misuses the platform or facility.",
      ],
    },
    {
      id: "intellectual-property",
      heading: "7. Intellectual Property",
      body: [
        "CreatorHub360's platform, branding, and underlying software are our property or that of our licensors. You retain ownership of content you post (profile content, Collab Hub posts, project materials), and by posting it you grant CreatorHub360 a non-exclusive, royalty-free license to display and distribute that content within the platform for its intended purpose.",
      ],
    },
    {
      id: "termination",
      heading: "8. Suspension & Termination",
      body: [
        "You may request account closure at any time by contacting us. We may suspend or terminate your membership for violation of these Terms, the Release of Liability, the Media Release, non-payment of applicable membership fees, or at our discretion with reasonable notice, except where immediate action is necessary to protect the platform, facility, or other Members.",
      ],
    },
    {
      id: "disclaimers",
      heading: "9. Disclaimers",
      body: [
        "The platform and facility are provided \"as is\" and \"as available.\" We do not guarantee uninterrupted access, error-free operation, or that GMV/commission figures will be free of every possible discrepancy — report any suspected error to support so it can be corrected.",
      ],
    },
    {
      id: "liability",
      heading: "10. Limitation of Liability",
      body: [
        "To the fullest extent permitted by law, CreatorHub360 is not liable for indirect, incidental, special, or consequential damages arising from your use of the platform or facility. Nothing in this section limits liability that cannot be limited under applicable law. See also the separate Release of Liability, which governs your use of physical facility spaces and equipment.",
      ],
    },
    {
      id: "governing-law",
      heading: "11. Governing Law",
      body: [
        "These Terms are governed by the laws of the jurisdiction in which CreatorHub360 is organized, without regard to conflict-of-laws principles, except where local mandatory consumer-protection law provides otherwise.",
      ],
    },
    {
      id: "changes",
      heading: "12. Changes to These Terms",
      body: [
        "We may revise these Terms from time to time. When we do, we update the version and effective date shown on this page. Material changes will be communicated to active Members, and continued use of the platform after the new version takes effect constitutes acceptance.",
      ],
    },
    {
      id: "contact",
      heading: "13. Contact",
      body: ["Questions about these Terms can be directed to your organization's CreatorHub360 administrator or support contact."],
    },
  ],
};
