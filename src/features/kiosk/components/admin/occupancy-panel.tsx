import { OccupancyList } from "@/features/checkin/components/occupancy-list";

export type OccupancyMember = {
  id: string;
  checkIn: Date;
  member: { id: string; fullName: string; memberNumber: string; profilePhotoUrl: string | null };
};

export function OccupancyPanel({ members }: { members: OccupancyMember[] }) {
  return (
    <OccupancyList
      members={members.map((c) => ({
        id: c.id,
        memberId: c.member.id,
        fullName: c.member.fullName,
        memberNumber: c.member.memberNumber,
        profilePhotoUrl: c.member.profilePhotoUrl,
        checkIn: c.checkIn,
      }))}
    />
  );
}
