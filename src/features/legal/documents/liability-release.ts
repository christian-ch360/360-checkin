import type { LegalDocumentDefinition } from "@/features/legal/types";

export const LIABILITY_RELEASE_DOCUMENT: LegalDocumentDefinition = {
  type: "LIABILITY_RELEASE",
  slug: "release-of-liability",
  title: "Release of Liability",
  version: "1.0",
  effectiveDate: "2026-07-30",
  summary:
    "The risks associated with using CreatorHub360's physical facility, studios, and equipment, and your waiver of claims arising from that use.",
  sections: [
    {
      id: "assumption-of-risk",
      heading: "1. Assumption of Risk",
      body: [
        "Use of CreatorHub360's facility, bookable Spaces (including podcast booths, editing suites, photography and recording studios, and event spaces), and any equipment provided there carries inherent risks, including but not limited to equipment malfunction, trip-and-fall hazards, electrical equipment, and interaction with other Members, guests, or staff.",
        "By accepting this Release of Liability, you acknowledge these risks and voluntarily assume full responsibility for any injury, loss, or damage that may result from your use of the facility, Spaces, or equipment.",
      ],
    },
    {
      id: "waiver",
      heading: "2. Waiver of Claims",
      body: [
        "To the fullest extent permitted by law, you release, waive, and discharge CreatorHub360, its owners, officers, employees, and agents from any and all liability, claims, demands, or causes of action arising out of or related to any loss, damage, or injury that may be sustained by you, or by any property belonging to you, while on CreatorHub360 premises or using any Space or equipment, whether caused by negligence or otherwise, except to the extent caused by gross negligence or willful misconduct that cannot be waived under applicable law.",
      ],
    },
    {
      id: "personal-property",
      heading: "3. Personal Property",
      body: [
        "CreatorHub360 is not responsible for loss, theft, or damage to personal property brought onto the premises, including equipment, devices, and materials you bring for use in a booked Space.",
      ],
    },
    {
      id: "equipment-use",
      heading: "4. Equipment Use",
      body: [
        "You agree to use any facility equipment only for its intended purpose and in accordance with posted instructions or staff guidance, and to report any damage or malfunction immediately. You may be held responsible for damage to equipment or Spaces resulting from misuse or negligence.",
      ],
    },
    {
      id: "indemnification",
      heading: "5. Indemnification",
      body: [
        "You agree to indemnify and hold harmless CreatorHub360 from any claims, damages, or expenses (including reasonable legal fees) arising from your breach of this Release, your misuse of the facility or equipment, or injury or damage you cause to another Member, guest, or staff member while on the premises.",
      ],
    },
    {
      id: "guests",
      heading: "6. Guests",
      body: [
        "If you bring a guest onto CreatorHub360 premises, you are responsible for ensuring your guest complies with facility rules, and you agree that this Release extends to claims arising from your guest's presence to the extent permitted by law.",
      ],
    },
    {
      id: "medical",
      heading: "7. Emergency Medical Care",
      body: [
        "In the event of an injury or medical emergency on the premises, you authorize CreatorHub360 staff to contact emergency medical services on your behalf. You are responsible for any costs associated with medical treatment you receive.",
      ],
    },
    {
      id: "severability",
      heading: "8. Severability",
      body: [
        "If any provision of this Release is found unenforceable, the remaining provisions remain in full force and effect, and the unenforceable provision will be interpreted to give effect to its intent to the maximum extent permitted by law.",
      ],
    },
    {
      id: "governing-law",
      heading: "9. Governing Law",
      body: ["This Release of Liability is governed by the laws of the jurisdiction in which CreatorHub360 is organized."],
    },
  ],
};
