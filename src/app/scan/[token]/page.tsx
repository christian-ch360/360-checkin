import { notFound } from "next/navigation";
import Link from "next/link";
import { resolveQRToken } from "@/features/qr/services/qr-asset.service";
import { getOpenCheckIn } from "@/features/checkin/services/checkin.service";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { SelfCheckinCard } from "@/features/checkin/components/self-checkin-card";
import { EventSelfCheckinCard } from "@/features/events/components/event-self-checkin-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const asset = await resolveQRToken(token);

  if (!asset) notFound();

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm border shadow-sm">
        <CardHeader className="text-center">
          <CardTitle>
            {asset.type === "MEMBER" && asset.member?.fullName}
            {asset.type === "PROJECT" && asset.project?.name}
            {asset.type === "BRAND" && asset.brand?.name}
            {asset.type === "SPACE" && asset.space?.name}
            {asset.type === "EVENT" && asset.event?.title}
          </CardTitle>
          <CardDescription className="capitalize">{asset.type.toLowerCase()}</CardDescription>
        </CardHeader>
        <CardContent>
          {asset.type === "MEMBER" && asset.member ? (
            <MemberScanContent memberId={asset.member.id} memberName={asset.member.fullName} token={token} />
          ) : asset.type === "EVENT" && asset.event ? (
            <EventScanContent eventTitle={asset.event.title} eventStatus={asset.event.status} token={token} />
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Sign in to CreatorHub360 to manage this {asset.type.toLowerCase()}.
            </p>
          )}
          <Button variant="ghost" asChild className="mt-4 w-full">
            <Link href="/login">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

async function MemberScanContent({
  memberId,
  memberName,
  token,
}: {
  memberId: string;
  memberName: string;
  token: string;
}) {
  const open = await getOpenCheckIn(memberId);
  return <SelfCheckinCard token={token} memberName={memberName} isCurrentlyIn={Boolean(open)} />;
}

async function EventScanContent({
  eventTitle,
  eventStatus,
  token,
}: {
  eventTitle: string;
  eventStatus: string;
  token: string;
}) {
  if (eventStatus !== "PUBLISHED") {
    return <p className="text-center text-sm text-muted-foreground">This event isn&apos;t currently open for check-in.</p>;
  }
  const actor = await getCurrentMember();
  return <EventSelfCheckinCard token={token} eventTitle={eventTitle} isSignedIn={Boolean(actor)} />;
}
