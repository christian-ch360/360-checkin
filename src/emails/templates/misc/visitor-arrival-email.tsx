import { format } from "date-fns";
import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { InfoCard } from "@/emails/components/info-card";
import { bodyText } from "@/emails/components/colors";

export type VisitorArrivalEmailProps = {
  recipientFullName: string;
  visitorName: string;
  visitorCompany?: string | null;
  arrivedAt: Date;
};

// Sent to front-desk / facility staff when a visitor checks in — the
// recipient is staff, not a "host" the visitor asked to see.
export function VisitorArrivalEmail({ recipientFullName, visitorName, visitorCompany, arrivedAt }: VisitorArrivalEmailProps) {
  const items = [
    { label: "Visitor", value: visitorName },
    { label: "Arrived", value: format(arrivedAt, "h:mm a") },
  ];
  if (visitorCompany) items.push({ label: "Company", value: visitorCompany });

  return (
    <EmailLayout preview={`${visitorName} has arrived`}>
      <Text className="email-text" style={bodyText}>
        Hi {recipientFullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        A visitor has checked in.
      </Text>
      <InfoCard items={items} />
    </EmailLayout>
  );
}
