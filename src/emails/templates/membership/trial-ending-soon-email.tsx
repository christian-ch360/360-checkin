import { format } from "date-fns";
import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { bodyText, mutedText } from "@/emails/components/colors";

export type TrialEndingSoonEmailProps = {
  fullName: string;
  planName: string;
  trialEndsAt: Date;
};

export function TrialEndingSoonEmail({ fullName, planName, trialEndsAt }: TrialEndingSoonEmailProps) {
  return (
    <EmailLayout preview="Your CreatorHub360 trial is ending soon">
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Your <strong>{planName}</strong> trial ends on {format(trialEndsAt, "EEEE, MMMM d")}. Your membership will
        continue automatically — no action is needed to stay active.
      </Text>
      <Text className="email-muted" style={mutedText}>
        Questions about your plan? Reach out any time.
      </Text>
    </EmailLayout>
  );
}
