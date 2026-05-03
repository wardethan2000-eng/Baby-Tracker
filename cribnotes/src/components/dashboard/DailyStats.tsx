"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { startOfDay, endOfDay } from "date-fns";
import { Baby, Heart, Milk, Moon } from "lucide-react";

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
    <div className="mt-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted mb-2.5 ml-0.5">
        Today
      </p>
      <div className="flex flex-wrap gap-2">
        {todayFeeds.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] ring-1 ring-white/[0.06] px-3 py-1.5">
            <Baby className="w-3 h-3 text-[#38bdf8]" strokeWidth={2.5} />
            <span className="text-xs font-semibold text-text-primary">
              {todayFeeds.length}x
            </span>
            {totalFeedVolume > 0 && (
              <span className="text-[11px] text-text-muted">
                &middot; {totalFeedVolume.toFixed(1)}&thinsp;oz
              </span>
            )}
          </span>
        )}
        {todayNurses.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] ring-1 ring-white/[0.06] px-3 py-1.5">
            <Heart className="w-3 h-3 text-[#f472b6]" strokeWidth={2.5} />
            <span className="text-xs font-semibold text-text-primary">
              {todayNurses.length}x
            </span>
            {totalNurseMinutes > 0 && (
              <span className="text-[11px] text-text-muted">
                &middot; {formatDuration(totalNurseMinutes)}
              </span>
            )}
          </span>
        )}
        {todayPumps.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] ring-1 ring-white/[0.06] px-3 py-1.5">
            <Milk className="w-3 h-3 text-[#a78bfa]" strokeWidth={2.5} />
            <span className="text-xs font-semibold text-text-primary">
              {todayPumps.length}x
            </span>
            {totalPumpVolume > 0 && (
              <span className="text-[11px] text-text-muted">
                &middot; {totalPumpVolume.toFixed(1)}&thinsp;oz
              </span>
            )}
          </span>
        )}
        {totalSleepMinutes > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] ring-1 ring-white/[0.06] px-3 py-1.5">
            <Moon className="w-3 h-3 text-[#fbbf24]" strokeWidth={2.5} />
            <span className="text-xs font-semibold text-text-primary">
              {formatDuration(totalSleepMinutes)}
            </span>
            <span className="text-[11px] text-text-muted">
              &middot; {sleepStarts.length}&thinsp;nap{sleepStarts.length !== 1 ? "s" : ""}
            </span>
          </span>
        )}
        {diapers.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] ring-1 ring-white/[0.06] px-3 py-1.5">
            <span className="relative inline-flex w-3 h-3 items-center justify-center">
              <span className="absolute w-2 h-2 rounded-full bg-[#818cf8]" />
            </span>
            <span className="text-xs font-semibold text-text-primary">
              {diapers.length}x
            </span>
            <span className="text-[11px] text-text-muted">diaper{diapers.length !== 1 ? "s" : ""}</span>
          </span>
        )}
      </div>
    </div>
  );
}