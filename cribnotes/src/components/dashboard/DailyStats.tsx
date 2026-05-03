"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { startOfDay, endOfDay } from "date-fns";
import { Baby, Heart, Milk, Moon, Droplets } from "lucide-react";

export default function DailyStats() {
  const selectedChildId = useAppStore((s) => s.selectedChildId);

  const { data: logsData } = useQuery({
    queryKey: ["logs", selectedChildId, "daily-stats"],
    queryFn: () => {
      const now = new Date();
      const params = new URLSearchParams({
        childId: selectedChildId!,
        from: startOfDay(now).toISOString(),
        to: endOfDay(now).toISOString(),
        limit: "200",
      });
      return fetch(`/api/logs?${params}`).then((r) => r.json());
    },
    enabled: !!selectedChildId,
  });

  const logs = logsData?.logs || [];

  const todayFeeds = logs.filter((l: any) => l.type === "FEED");
  const totalFeedVolume = todayFeeds.reduce((s: number, l: any) => s + (l.feedAmount || 0), 0);

  const todayNurses = logs.filter((l: any) => l.type === "NURSE");
  const totalNurseMinutes = todayNurses.reduce((s: number, l: any) => s + (l.nurseDuration || 0), 0);

  const todayPumps = logs.filter((l: any) => l.type === "PUMP");
  const totalPumpVolume = todayPumps.reduce((s: number, l: any) => s + (l.pumpAmount || 0), 0);

  const sleepLogs = logs.filter((l: any) => l.type === "SLEEP");
  const wakeLogs = logs.filter((l: any) => l.type === "WAKE");

  let totalSleepMinutes = 0;
  const sleepStarts = sleepLogs.map((l: any) => new Date(l.occurredAt)).sort((a: Date, b: Date) => a.getTime() - b.getTime());
  const wakeTimes = wakeLogs.map((l: any) => new Date(l.occurredAt)).sort((a: Date, b: Date) => a.getTime() - b.getTime());
  for (const sleepStart of sleepStarts) {
    const matchingWake = wakeTimes.find((w: Date) => w > sleepStart);
    if (matchingWake) {
      totalSleepMinutes += Math.round((matchingWake.getTime() - sleepStart.getTime()) / 60000);
    }
  }

  const formatDuration = (min: number) => {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const diapers = logs.filter((l: any) => l.type === "DIAPER");

  const hasData =
    todayFeeds.length > 0 ||
    todayNurses.length > 0 ||
    todayPumps.length > 0 ||
    sleepStarts.length > 0 ||
    diapers.length > 0;

  if (!hasData) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-5">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted mb-2 ml-0.5">
        Today
      </p>
      <div className="space-y-1.5">
        {todayFeeds.length > 0 && (
          <div className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-2.5">
            <Baby className="w-5 h-5 text-feed" strokeWidth={2} />
            <span className="text-sm font-medium text-text-primary">Fed</span>
            <span className="ml-auto text-xs text-text-muted">{todayFeeds.length}x</span>
            {totalFeedVolume > 0 && (
              <span className="text-sm font-semibold text-text-primary">{totalFeedVolume.toFixed(1)} oz</span>
            )}
          </div>
        )}
        {todayNurses.length > 0 && (
          <div className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-2.5">
            <Heart className="w-5 h-5 text-nurse" strokeWidth={2} />
            <span className="text-sm font-medium text-text-primary">Nursed</span>
            <span className="ml-auto text-xs text-text-muted">{todayNurses.length}x</span>
            {totalNurseMinutes > 0 && (
              <span className="text-sm font-semibold text-text-primary">{formatDuration(totalNurseMinutes)}</span>
            )}
          </div>
        )}
        {todayPumps.length > 0 && (
          <div className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-2.5">
            <Milk className="w-5 h-5 text-pump" strokeWidth={2} />
            <span className="text-sm font-medium text-text-primary">Pumped</span>
            <span className="ml-auto text-xs text-text-muted">{todayPumps.length}x</span>
            {totalPumpVolume > 0 && (
              <span className="text-sm font-semibold text-text-primary">{totalPumpVolume.toFixed(1)} oz</span>
            )}
          </div>
        )}
        {diapers.length > 0 && (
          <div className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-2.5">
            <Droplets className="w-5 h-5 text-diaper" strokeWidth={2} />
            <span className="text-sm font-medium text-text-primary">Diaper</span>
            <span className="ml-auto text-sm font-semibold text-text-primary">{diapers.length}x</span>
          </div>
        )}
        {totalSleepMinutes > 0 && (
          <div className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-2.5">
            <Moon className="w-5 h-5 text-sleep" strokeWidth={2} />
            <span className="text-sm font-medium text-text-primary">Asleep</span>
            <span className="ml-auto text-sm font-semibold text-text-primary">{formatDuration(totalSleepMinutes)}</span>
            <span className="text-xs text-text-muted">{sleepStarts.length} nap{sleepStarts.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}
