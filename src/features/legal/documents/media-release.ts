import type { LegalDocumentDefinition } from "@/features/legal/types";

export const MEDIA_RELEASE_DOCUMENT: LegalDocumentDefinition = {
  type: "MEDIA_RELEASE",
  slug: "media-release",
  title: "Media Release",
  version: "1.0",
  effectiveDate: "2026-07-30",
  summary:
    "Your consent for CreatorHub360 to photograph, film, or record you at the facility or at CreatorHub360 events, and to use that media for promotional purposes.",
  sections: [
    {
      id: "grant",
      heading: "1. Grant of Rights",
      body: [
        "You grant CreatorHub360 and its authorized representatives the irrevocable right to photograph, film, video-record, or otherwise capture your image, likeness, and voice (\"Media\") while you are present at CreatorHub360's facility, at CreatorHub360-hosted or CreatorHub360-affiliated events, or at kiosk check-in points, and to use, reproduce, edit, publish, and distribute that Media in any format now known or later developed.",
      ],
    },
    {
      id: "permitted-uses",
      heading: "2. Permitted Uses",
      body: [
        "Permitted uses include, without limitation: the CreatorHub360 website and app, social media accounts, marketing and promotional materials, press and media coverage, and internal training or archival purposes. CreatorHub360 is not obligated to use the Media at all, and this release does not guarantee any particular placement, editing, or context.",
      ],
    },
    {
      id: "no-compensation",
      heading: "3. No Compensation",
      body: [
        "You understand that your participation is voluntary and that you will not receive any payment, royalty, or other compensation for the use of the Media, now or in the future, unless separately agreed in writing.",
      ],
    },
    {
      id: "no-guarantee",
      heading: "4. No Guarantee of Approval or Editorial Control",
      body: [
        "You waive any right to inspect or approve the finished Media, or any related written or promotional copy, before it is used, and you waive any claim based on how the Media is edited, distorted, or used in combination with other material, provided such use is not defamatory.",
      ],
    },
    {
      id: "release",
      heading: "5. Release from Claims",
      body: [
        "You release CreatorHub360, its officers, employees, and agents from any claims, demands, or causes of action arising out of or related to the use of the Media, including any claims for invasion of privacy, right of publicity, defamation, or infringement of moral rights, to the extent permitted by applicable law.",
      ],
    },
    {
      id: "term",
      heading: "6. Term & Revocation",
      body: [
        "This release remains in effect while your CreatorHub360 membership is active and does not automatically expire when your membership ends, except for Media capturing you specifically that has not yet been published. You may revoke this consent for future use by submitting a written request to your organization's CreatorHub360 administrator; revocation does not affect Media already published or in active distribution at the time of your request, and we will make reasonable efforts to remove your likeness from materials still under our direct control.",
      ],
    },
    {
      id: "minors",
      heading: "7. Minors",
      body: [
        "This release may only be accepted by an individual who is at least 18 years old, or the age of majority in their jurisdiction, on their own behalf."],
    },
    {
      id: "governing-law",
      heading: "8. Governing Law",
      body: ["This Media Release is governed by the laws of the jurisdiction in which CreatorHub360 is organized."],
    },
  ],
};
