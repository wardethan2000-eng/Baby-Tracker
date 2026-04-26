"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { format, startOfDay, endOfDay } from "date-fns";

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

  const hasData = todayFeeds.length > 0 || todayNurses.length > 0 || todayPumps.length > 0 || sleepStarts.length > 0;

  if (!hasData) return null;

  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      {todayFeeds.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-3 text-center">
          <p className="text-xs text-text-secondary">Fed</p>
          <p className="text-lg font-bold text-[#38bdf8]">{todayFeeds.length}x</p>
          <p className="text-xs text-text-muted">{totalFeedVolume > 0 ? `${totalFeedVolume.toFixed(1)} oz` : "\u2014"}</p>
        </div>
      )}
      {todayNurses.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-3 text-center">
          <p className="text-xs text-text-secondary">Nursed</p>
          <p className="text-lg font-bold text-[#f472b6]">{todayNurses.length}x</p>
          <p className="text-xs text-text-muted">{totalNurseMinutes > 0 ? formatDuration(totalNurseMinutes) : "\u2014"}</p>
        </div>
      )}
      {todayPumps.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-3 text-center">
          <p className="text-xs text-text-secondary">Pumped</p>
          <p className="text-lg font-bold text-[#a78bfa]">{todayPumps.length}x</p>
          <p className="text-xs text-text-muted">{totalPumpVolume > 0 ? `${totalPumpVolume.toFixed(1)} oz` : "\u2014"}</p>
        </div>
      )}
      {totalSleepMinutes > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-3 text-center">
          <p className="text-xs text-text-secondary">Asleep</p>
          <p className="text-lg font-bold text-[#fbbf24]">{formatDuration(totalSleepMinutes)}</p>
          <p className="text-xs text-text-muted">{sleepStarts.length} nap{sleepStarts.length !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}