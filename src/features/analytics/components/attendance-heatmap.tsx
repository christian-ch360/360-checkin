import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AttendanceHeatmap({
  days,
  hours,
  grid,
  max,
}: {
  days: string[];
  hours: string[];
  grid: number[][];
  max: number;
}) {
  function intensity(value: number) {
    if (value === 0) return "bg-muted";
    const ratio = value / max;
    if (ratio > 0.75) return "bg-primary";
    if (ratio > 0.5) return "bg-primary/70";
    if (ratio > 0.25) return "bg-primary/40";
    return "bg-primary/20";
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Attendance heat map</CardTitle>
        <CardDescription>Check-ins by day of week and time (last 90 days)</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[480px]">
          <div className="grid grid-cols-[40px_repeat(9,1fr)] gap-1 text-[10px] text-muted-foreground">
            <div />
            {hours.map((h) => (
              <div key={h} className="text-center">
                {h}
              </div>
            ))}
          </div>
          {days.map((day, dayIndex) => (
            <div key={day} className="mt-1 grid grid-cols-[40px_repeat(9,1fr)] gap-1">
              <div className="flex items-center text-[10px] text-muted-foreground">{day}</div>
              {grid[dayIndex].map((value, hourIndex) => (
                <div
                  key={hourIndex}
                  title={`${value} check-ins`}
                  className={cn("aspect-square rounded-sm", intensity(value))}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
