import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { InfoCard } from "@/emails/components/info-card";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText } from "@/emails/components/colors";

export type CampaignRequestAdminEmailProps = {
  fullName: string;
  campaignName: string;
  brandName: string | null;
  brandWebsite: string | null;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  campaignType: string;
  objective: string | null;
  budget: string;
  categories: string;
  platforms: string;
  desiredReach: string;
  location: string;
  deliverables: string;
  creatorCount: string;
  timeline: string;
  reviewUrl: string;
};

/**
 * INTERNAL notification only — sent to CreatorHub360 team members with
 * "members.manage" permission when a brand submits a campaign request via
 * the public Creator Library. Never sent to the brand; the brand only ever
 * sees the "Request received" confirmation in campaign-builder.tsx.
 */
export function CampaignRequestAdminEmail({
  fullName,
  campaignName,
  brandName,
  brandWebsite,
  contactName,
  contactEmail,
  contactPhone,
  campaignType,
  objective,
  budget,
  categories,
  platforms,
  desiredReach,
  location,
  deliverables,
  creatorCount,
  timeline,
  reviewUrl,
}: CampaignRequestAdminEmailProps) {
  return (
    <EmailLayout preview={`New campaign request: ${campaignName}`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        A brand submitted a new campaign request through the Creator Library: <strong>{campaignName}</strong> ({campaignType}).
      </Text>

      <InfoCard
        items={[
          { label: "Brand", value: brandName || "Not provided" },
          { label: "Website", value: brandWebsite || "Not provided" },
          { label: "Contact", value: contactName || "Not provided" },
          { label: "Email", value: contactEmail },
          { label: "Phone", value: contactPhone || "Not provided" },
        ]}
      />

      <InfoCard
        items={[
          { label: "Objective", value: objective || "Not provided" },
          { label: "Budget", value: budget },
          { label: "Categories", value: categories },
          { label: "Platforms", value: platforms },
          { label: "Desired Creator Reach", value: desiredReach },
          { label: "Location", value: location },
          { label: "Deliverables", value: deliverables },
          { label: "Creators Needed", value: creatorCount },
          { label: "Timeline", value: timeline },
        ]}
      />

      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={reviewUrl}>Review in CRM</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
