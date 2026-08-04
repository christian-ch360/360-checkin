import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { bodyText } from "@/emails/components/colors";

export type AnnouncementEmailProps = {
  fullName: string;
  subject: string;
  body: string;
};

export function AnnouncementEmail({ fullName, subject, body }: AnnouncementEmailProps) {
  const paragraphs = body.split("\n").filter((line) => line.trim().length > 0);

  return (
    <EmailLayout preview={subject}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      {paragraphs.map((paragraph, index) => (
        <Text key={index} className="email-text" style={bodyText}>
          {paragraph}
        </Text>
      ))}
    </EmailLayout>
  );
}
