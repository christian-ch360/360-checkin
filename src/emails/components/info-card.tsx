import { Section, Row, Column, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { COLORS } from "@/emails/components/colors";

export type InfoCardItem = { label: string; value: ReactNode };

export function InfoCard({ items }: { items: InfoCardItem[] }) {
  return (
    <Section
      className="email-info-card"
      style={{ backgroundColor: COLORS.pageBg, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: "16px 20px", margin: "16px 0" }}
    >
      {items.map((item, i) => (
        <Row key={item.label} style={{ marginTop: i === 0 ? 0 : 10 }}>
          <Column>
            <Text className="email-muted" style={{ margin: 0, color: COLORS.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {item.label}
            </Text>
            <Text className="email-text" style={{ margin: "2px 0 0", color: COLORS.text, fontSize: 15, fontWeight: 600 }}>
              {item.value}
            </Text>
          </Column>
        </Row>
      ))}
    </Section>
  );
}
