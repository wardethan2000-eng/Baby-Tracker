"use client";

import { useState } from "react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LogRow } from "@/components/history/LogRow";
import { EditLogModal } from "@/components/history/EditLogModal";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { Moon, Baby, Droplets, MoreVertical } from "lucide-react";

export default function HistoryPage() {
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<"today" | "week" | "month">("week");
  const [activeTypes, setActiveTypes] = useState<string[]>(["WAKE", "SLEEP", "FEED", "DIAPER", "NURSE", "PUMP"]);
  const [editingLog, setEditingLog] = useState<any>(null);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "today": return { from: startOfDay(now), to: endOfDay(now) };
      case "week": return { from: startOfWeek(now), to: endOfWeek(now) };
      case "month": return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  };

  const { from, to } = getDateRange();

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["logs", selectedChildId, dateRange, activeTypes],
    queryFn: () => {
      const params = new URLSearchParams({
        childId: selectedChildId!,
        from: from.toISOString(),
        to: to.toISOString(),
        type: activeTypes.join(","),
      });
      return fetch(`/api/logs?${params}`).then((r) => r.json());
    },
    enabled: !!selectedChildId,
  });

  const logs = logsData?.logs || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/logs/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      toast("Log deleted", {
        action: {
          label: "Undo",
          onClick: async () => {
            await fetch(`/api/logs/${id}/restore`, { method: "POST" });
            queryClient.invalidateQueries({ queryKey: ["logs"] });
          },
        },
        duration: 8000,
      });
    },
  });

  const toggleType = (type: string) => {
    setActiveTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  };

  const groupedLogs = logs.reduce((acc: Record<string, any[]>, log: any) => {
    const date = format(new Date(log.occurredAt), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  const formatDateHeading = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) return `Today — ${format(date, "MMM d, yyyy")}`;
    if (format(date, "yyyy-MM-dd") === format(subDays(today, 1), "yyyy-MM-dd")) return `Yesterday — ${format(date, "MMM d, yyyy")}`;
    return format(date, "EEEE — MMM d, yyyy");
  };

  const typeColors: Record<string, string> = {
    WAKE: "bg-[#fbbf24]/10 text-[#fbbf24]",
    SLEEP: "bg-[#818cf8]/10 text-[#818cf8]",
    FEED: "bg-[#38bdf8]/10 text-[#38bdf8]",
    DIAPER: "bg-[#818cf8]/10 text-[#818cf8]",
    NURSE: "bg-[#f472b6]/10 text-[#f472b6]",
    PUMP: "bg-[#a78bfa]/10 text-[#a78bfa]",
  };

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-display text-2xl font-bold text-text-primary">History</h1>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(["today", "week", "month"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setDateRange(r)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize shrink-0 ${
              dateRange === r ? "bg-primary text-base" : "bg-surface text-text-secondary"
            }`}
          >
            {r === "today" ? "Today" : r === "week" ? "Last 7 Days" : "This Month"}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {(["WAKE", "SLEEP", "FEED", "DIAPER", "NURSE", "PUMP"] as const).map((type) => (
          <button
            key={type}
            onClick={() => toggleType(type)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              activeTypes.includes(type) ? typeColors[type] : "bg-surface text-text-muted"
            }`}
          >
            {type === "WAKE" ? "Wake" : type === "SLEEP" ? "Sleep" : type === "FEED" ? "Feed" : type === "DIAPER" ? "Diaper" : type === "NURSE" ? "Nurse" : "Pump"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="bg-surface rounded-2xl h-16 animate-pulse" />)}
        </div>
      ) : Object.keys(groupedLogs).length === 0 ? (
        <div className="bg-surface rounded-2xl p-6 text-center">
          <p className="text-text-secondary">No logs found for this period.</p>
        </div>
      ) : (
        Object.entries(groupedLogs)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, dayLogs]: [string, any]) => (
            <div key={date} className="mb-6">
              <h2 className="font-display text-sm font-semibold text-text-secondary mb-2">{formatDateHeading(date)}</h2>
              <div className="space-y-2">
                {dayLogs.map((log: any) => (
                  <LogRow key={log.id} log={log} onEdit={() => setEditingLog(log)} onDelete={() => deleteMutation.mutate(log.id)} />
                ))}
              </div>
            </div>
          ))
      )}

      {editingLog && (
        <EditLogModal open={!!editingLog} onClose={() => setEditingLog(null)} log={editingLog} />
      )}
    </div>
  );
}