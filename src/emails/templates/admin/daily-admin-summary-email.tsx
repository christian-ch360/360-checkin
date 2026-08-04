import { format } from "date-fns";
import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { InfoCard } from "@/emails/components/info-card";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText } from "@/emails/components/colors";

export type DailyAdminSummaryEmailProps = {
  fullName: string;
  date: Date;
  stats: {
    newApplicationsToday: number;
    newCreatorsToday: number;
    pendingApplications: number;
    totalMembers: number;
  };
  dashboardUrl: string;
};

export function DailyAdminSummaryEmail({ fullName, date, stats, dashboardUrl }: DailyAdminSummaryEmailProps) {
  return (
    <EmailLayout preview={`Your CreatorHub360 daily summary for ${format(date, "MMMM d")}`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Here&apos;s what happened on CreatorHub360 yesterday.
      </Text>
      <InfoCard
        items={[
          { label: "New applications", value: String(stats.newApplicationsToday) },
          { label: "New creators", value: String(stats.newCreatorsToday) },
          { label: "Pending applications", value: String(stats.pendingApplications) },
          { label: "Total members", value: String(stats.totalMembers) },
        ]}
      />
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={dashboardUrl}>View dashboard</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
