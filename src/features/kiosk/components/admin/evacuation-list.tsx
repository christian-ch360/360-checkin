"use client";

import { format } from "date-fns";
import type { Visitor } from "@prisma/client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OccupancyMember } from "@/features/kiosk/components/admin/occupancy-panel";

export function EvacuationList({ members, visitors }: { members: OccupancyMember[]; visitors: Visitor[] }) {
  const total = members.length + visitors.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">{total} people currently in the building</p>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer /> Print
        </Button>
      </div>

      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nobody is currently in the building.</p>
      ) : (
        <div className="space-y-4 text-sm">
          {members.length > 0 && (
            <div>
              <p className="mb-1 font-medium uppercase tracking-wide text-xs text-muted-foreground">
                Members ({members.length})
              </p>
              <ul className="divide-y">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-1.5">
                    <span>{m.member.fullName}</span>
                    <span className="text-muted-foreground tabular-nums">Arrived {format(m.checkIn, "h:mm a")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {visitors.length > 0 && (
            <div>
              <p className="mb-1 font-medium uppercase tracking-wide text-xs text-muted-foreground">
                Visitors ({visitors.length})
              </p>
              <ul className="divide-y">
                {visitors.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-1.5">
                    <span>
                      {v.firstName} {v.lastName}
                    </span>
                    <span className="text-muted-foreground tabular-nums">Arrived {format(v.arrivedAt, "h:mm a")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
