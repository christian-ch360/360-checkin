import { Users, LogIn, LogOut, UserCheck } from "lucide-react";
import type { Visitor } from "@prisma/client";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceHistoryTable } from "@/features/checkin/components/attendance-history-table";
import { OccupancyPanel, type OccupancyMember } from "@/features/kiosk/components/admin/occupancy-panel";
import { VisitorsWaitingPanel } from "@/features/kiosk/components/admin/visitors-waiting-panel";
import { ManualCheckinPanel } from "@/features/kiosk/components/admin/manual-checkin-panel";
import { EvacuationList } from "@/features/kiosk/components/admin/evacuation-list";
import { RecentVisitorsTable } from "@/features/kiosk/components/admin/recent-visitors-table";

type RecentCheckIn = {
  id: string;
  checkIn: Date;
  checkOut: Date | null;
  duration: number | null;
  status: "CHECKED_IN" | "CHECKED_OUT";
  member: { id: string; fullName: string; memberNumber: string; profilePhotoUrl: string | null };
};

export function KioskAdminDashboard({
  overview,
  recentCheckIns,
  waitingVisitors,
  onSiteVisitors,
  recentVisitors,
  todayVisitorCount,
}: {
  overview: {
    currentlyIn: OccupancyMember[];
    todayCheckIns: number;
    todayCheckOuts: number;
  };
  recentCheckIns: RecentCheckIn[];
  waitingVisitors: Visitor[];
  onSiteVisitors: Visitor[];
  recentVisitors: Visitor[];
  todayVisitorCount: number;
}) {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kiosk Admin</h1>
        <p className="text-sm text-muted-foreground">Occupancy, check-ins, and visitors for the facility kiosk.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Currently inside" value={String(overview.currentlyIn.length)} icon={Users} accent="primary" />
        <StatCard label="Today's check-ins" value={String(overview.todayCheckIns)} icon={LogIn} />
        <StatCard label="Today's check-outs" value={String(overview.todayCheckOuts)} icon={LogOut} />
        <StatCard label="Visitors waiting" value={String(waitingVisitors.length)} icon={UserCheck} accent="success" />
      </div>

      <Tabs defaultValue="occupancy">
        <TabsList>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
          <TabsTrigger value="manual">Manual check in/out</TabsTrigger>
          <TabsTrigger value="history">Recent activity</TabsTrigger>
          <TabsTrigger value="evacuation">Evacuation list</TabsTrigger>
        </TabsList>

        <TabsContent value="occupancy">
          <Card>
            <CardHeader>
              <CardTitle>Currently on campus</CardTitle>
              <CardDescription>{overview.currentlyIn.length} member(s) checked in</CardDescription>
            </CardHeader>
            <CardContent>
              <OccupancyPanel members={overview.currentlyIn} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visitors waiting</CardTitle>
              <CardDescription>{todayVisitorCount} visitor(s) registered today</CardDescription>
            </CardHeader>
            <CardContent>
              <VisitorsWaitingPanel waitingVisitors={waitingVisitors} onSiteVisitors={onSiteVisitors} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent visitors</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentVisitorsTable visitors={recentVisitors} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Manual check in / check out</CardTitle>
              <CardDescription>Search a member to check them in or out by hand.</CardDescription>
            </CardHeader>
            <CardContent>
              <ManualCheckinPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent check-ins</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceHistoryTable checkIns={recentCheckIns} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evacuation">
          <Card className="print:border-0 print:shadow-none">
            <CardHeader>
              <CardTitle>Emergency evacuation list</CardTitle>
              <CardDescription>Everyone currently in the building — members and on-site visitors.</CardDescription>
            </CardHeader>
            <CardContent>
              <EvacuationList members={overview.currentlyIn} visitors={onSiteVisitors} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
