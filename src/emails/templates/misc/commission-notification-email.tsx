import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { bodyText } from "@/emails/components/colors";
import { formatCurrency } from "@/lib/utils/format";

export type CommissionNotificationEmailProps = {
  fullName: string;
  amount: number;
  projectName?: string | null;
  status: "paid" | "pending";
};

export function CommissionNotificationEmail({ fullName, amount, projectName, status }: CommissionNotificationEmailProps) {
  const amountText = formatCurrency(amount, { precise: true });

  return (
    <EmailLayout preview={status === "paid" ? `Commission paid: ${amountText}` : `Commission earned: ${amountText}`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      {status === "paid" ? (
        <Text className="email-text" style={bodyText}>
          A commission payout of <strong>{amountText}</strong>
          {projectName ? ` for ${projectName}` : ""} has been marked as paid.
        </Text>
      ) : (
        <Text className="email-text" style={bodyText}>
          You&apos;ve earned a commission of <strong>{amountText}</strong>
          {projectName ? ` on ${projectName}` : ""}. It&apos;s now pending payout.
        </Text>
      )}
    </EmailLayout>
  );
}
