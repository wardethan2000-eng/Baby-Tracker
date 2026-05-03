"use client";

import { useState } from "react";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/analytics/MetricCard";
import { ChartCard } from "@/components/analytics/ChartCard";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useAppStore } from "@/lib/store";

export default function AnalyticsPage() {
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("week");

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case "day":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "week":
        return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
      case "month":
        return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  };

  const { from, to } = getDateRange();

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["logs", selectedChildId, "analytics", timeRange],
    queryFn: () => {
      const params = new URLSearchParams({
        childId: selectedChildId!,
        from: from.toISOString(),
        to: to.toISOString(),
      });
      return fetch(`/api/logs?${params}`).then((r) => r.json());
    },
    enabled: !!selectedChildId,
  });

  const logs = logsData?.logs || [];
  const feeds = logs.filter((l: any) => l.type === "FEED");
  const diapers = logs.filter((l: any) => l.type === "DIAPER");
  const wakes = logs.filter((l: any) => l.type === "WAKE");
  const nurses = logs.filter((l: any) => l.type === "NURSE");
  const pumps = logs.filter((l: any) => l.type === "PUMP");
  const sleeps = logs.filter((l: any) => l.type === "SLEEP");

  const totalFeeds = feeds.length;
  const totalVolume = feeds.reduce((s: number, l: any) => s + (l.feedAmount || 0), 0);
  const days = timeRange === "day" ? 1 : timeRange === "week" ? 7 : 30;
  const avgPerDay = (totalFeeds / days).toFixed(1);

  const totalNurses = nurses.length;
  const totalNurseMinutes = nurses.reduce((s: number, l: any) => s + (l.nurseDuration || 0), 0);
  const avgNurseDuration = totalNurses > 0 ? (totalNurseMinutes / totalNurses).toFixed(0) : "0";

  const totalPumps = pumps.length;
  const totalPumpVolume = pumps.reduce((s: number, l: any) => s + (l.pumpAmount || 0), 0);
  const avgPumpPerDay = (totalPumpVolume / days).toFixed(1);

  let totalSleepMinutes = 0;
  const sleepStarts = sleeps.map((l: any) => new Date(l.occurredAt)).sort((a: Date, b: Date) => a.getTime() - b.getTime());
  for (const sleepStart of sleepStarts) {
    const matchingWake = wakes.find((w: any) => new Date(w.occurredAt) > sleepStart);
    if (matchingWake) {
      totalSleepMinutes += Math.round((new Date(matchingWake.occurredAt).getTime() - sleepStart.getTime()) / 60000);
    }
  }

  const feedAmountData = feeds.reduce((acc: any[], l: any) => {
    const date = format(new Date(l.occurredAt), "MMM dd");
    const existing = acc.find((a) => a.date === date);
    if (existing) {
      existing.amount += l.feedAmount || 0;
    } else {
      acc.push({ date, amount: l.feedAmount || 0 });
    }
    return acc;
  }, []);

  const feedsPerDay = [...Array(Math.min(days, 7))].map((_, i) => {
    const date = new Date(from);
    date.setDate(date.getDate() + i);
    const key = format(date, "MMM dd");
    return { date: key, count: feeds.filter((l: any) => format(new Date(l.occurredAt), "MMM dd") === key).length };
  });

  const wakesByHour = [...Array(24)].map((_, h) => ({
    hour: `${h}:00`,
    count: wakes.filter((l: any) => new Date(l.occurredAt).getHours() === h).length,
  })).filter((d) => d.count > 0);

  const diapersPerDay = [...Array(Math.min(days, 7))].map((_, i) => {
    const date = new Date(from);
    date.setDate(date.getDate() + i);
    const key = format(date, "MMM dd");
    return { date: key, count: diapers.filter((l: any) => format(new Date(l.occurredAt), "MMM dd") === key).length };
  });

  const nurseDurationPerDay = [...Array(Math.min(days, 7))].map((_, i) => {
    const date = new Date(from);
    date.setDate(date.getDate() + i);
    const key = format(date, "MMM dd");
    return { date: key, minutes: nurses.filter((l: any) => format(new Date(l.occurredAt), "MMM dd") === key).reduce((s: number, l: any) => s + (l.nurseDuration || 0), 0) };
  });

  const pumpVolumePerDay = [...Array(Math.min(days, 7))].map((_, i) => {
    const date = new Date(from);
    date.setDate(date.getDate() + i);
    const key = format(date, "MMM dd");
    return { date: key, amount: pumps.filter((l: any) => format(new Date(l.occurredAt), "MMM dd") === key).reduce((s: number, l: any) => s + (l.pumpAmount || 0), 0) };
  });

  const sleepDurationPerDay = [...Array(Math.min(days, 7))].map((_, i) => {
    const date = new Date(from);
    date.setDate(date.getDate() + i);
    const key = format(date, "MMM dd");
    const daySleeps = sleeps.filter((l: any) => format(new Date(l.occurredAt), "MMM dd") === key);
    let daySleepMin = 0;
    for (const s of daySleeps) {
      const sleepStart = new Date(s.occurredAt);
      const matchingWake = wakes.find((w: any) => new Date(w.occurredAt) > sleepStart && format(new Date(w.occurredAt), "MMM dd") === key);
      if (matchingWake) {
        daySleepMin += Math.round((new Date(matchingWake.occurredAt).getTime() - sleepStart.getTime()) / 60000);
      }
    }
    return { date: key, minutes: daySleepMin };
  });

  return (
    <div className="px-4 pt-4 pb-24">
      <h1 className="font-display text-2xl font-bold text-text-primary mb-4">Analytics</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(["day", "week", "month"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setTimeRange(r)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${
              timeRange === r ? "bg-primary text-base" : "bg-surface text-text-secondary"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <MetricCard label="Total Feeds" value={String(totalFeeds)} sublabel={`Avg ${avgPerDay}/day`} />
        <MetricCard label="Total Volume" value={`${totalVolume.toFixed(1)} oz`} />
        <MetricCard label="Diaper Changes" value={String(diapers.length)} />
        <MetricCard label="Wake Events" value={String(wakes.length)} />
        <MetricCard label="Sleep" value={`${totalSleepMinutes}m`} sublabel={`${sleeps.length} nap${sleeps.length !== 1 ? "s" : ""}`} />
        <MetricCard label="Nursing Sessions" value={String(totalNurses)} sublabel={`Avg ${avgNurseDuration} min`} />
        <MetricCard label="Nursing Total" value={`${totalNurseMinutes} min`} />
        <MetricCard label="Pump Sessions" value={String(totalPumps)} />
        <MetricCard label="Pump Volume" value={`${totalPumpVolume.toFixed(1)} oz`} sublabel={`${avgPumpPerDay} oz/day`} />
      </div>

      <div className="space-y-6">
        <ChartCard title="Feed Amount Over Time">
          {feedAmountData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={feedAmountData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#161f33", border: "1px solid #1e3a5f", borderRadius: "0.75rem" }} />
                <Line type="monotone" dataKey="amount" stroke="#38bdf8" strokeWidth={2} dot={{ stroke: "#38bdf8", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-text-muted">No data yet for this period.</p>
          )}
        </ChartCard>

        <ChartCard title="Feeds Per Day">
          {feedsPerDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={feedsPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#161f33", border: "1px solid #1e3a5f", borderRadius: "0.75rem" }} />
                <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-text-muted">No data yet for this period.</p>
          )}
        </ChartCard>

        <ChartCard title="Wake Events by Hour">
          {wakesByHour.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={wakesByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#161f33", border: "1px solid #1e3a5f", borderRadius: "0.75rem" }} />
                <Bar dataKey="count" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-text-muted">No data yet for this period.</p>
          )}
        </ChartCard>

        <ChartCard title="Diaper Changes Per Day">
          {diapersPerDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={diapersPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#161f33", border: "1px solid #1e3a5f", borderRadius: "0.75rem" }} />
                <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-text-muted">No data yet for this period.</p>
          )}
        </ChartCard>

        <ChartCard title="Sleep Duration Per Day">
          {sleepDurationPerDay.some((d) => d.minutes > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sleepDurationPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#161f33", border: "1px solid #1e3a5f", borderRadius: "0.75rem" }} />
                <Bar dataKey="minutes" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-text-muted">No data yet for this period.</p>
          )}
        </ChartCard>

        <ChartCard title="Nursing Duration Per Day">
          {nurseDurationPerDay.some((d) => d.minutes > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={nurseDurationPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#161f33", border: "1px solid #1e3a5f", borderRadius: "0.75rem" }} />
                <Bar dataKey="minutes" fill="#f472b6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-text-muted">No data yet for this period.</p>
          )}
        </ChartCard>

        <ChartCard title="Pump Volume Per Day">
          {pumpVolumePerDay.some((d) => d.amount > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pumpVolumePerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#161f33", border: "1px solid #1e3a5f", borderRadius: "0.75rem" }} />
                <Bar dataKey="amount" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-8 text-text-muted">No data yet for this period.</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}