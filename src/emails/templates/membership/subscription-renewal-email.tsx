import { format } from "date-fns";
import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { InfoCard } from "@/emails/components/info-card";
import { bodyText } from "@/emails/components/colors";
import { formatCurrency } from "@/lib/utils/format";

export type SubscriptionRenewalEmailProps = {
  fullName: string;
  planName: string;
  amount: number;
  currentPeriodEnd: Date;
};

export function SubscriptionRenewalEmail({ fullName, planName, amount, currentPeriodEnd }: SubscriptionRenewalEmailProps) {
  return (
    <EmailLayout preview="Your CreatorHub360 membership has renewed">
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Your <strong>{planName}</strong> membership has renewed.
      </Text>
      <InfoCard
        items={[
          { label: "Amount", value: formatCurrency(amount, { precise: true }) },
          { label: "Next renewal", value: format(currentPeriodEnd, "MMMM d, yyyy") },
        ]}
      />
    </EmailLayout>
  );
}
