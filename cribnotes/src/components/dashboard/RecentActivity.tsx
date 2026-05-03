"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Moon, Sun, Baby, Droplets, Heart, Milk } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { formatRelativeTime } from "@/lib/utils";

const typeConfig: Record<string, { icon: typeof Moon; label: string; color: string }> = {
  WAKE: { icon: Sun, label: "Woke Up", color: "text-wake bg-wake/10" },
  SLEEP: { icon: Moon, label: "Fell Asleep", color: "text-sleep bg-sleep/10" },
  FEED: { icon: Baby, label: "Fed", color: "text-feed bg-feed/10" },
  DIAPER: { icon: Droplets, label: "Diaper", color: "text-diaper bg-diaper/10" },
  NURSE: { icon: Heart, label: "Nursed", color: "text-nurse bg-nurse/10" },
  PUMP: { icon: Milk, label: "Pumped", color: "text-pump bg-pump/10" },
};

export default function RecentActivity() {
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const queryClient = useQueryClient();

  const { data: childrenData } = useQuery({
    queryKey: ["children"],
    queryFn: () => fetch("/api/children").then((r) => r.json()),
  });

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["logs", selectedChildId, "recent"],
    queryFn: () =>
      fetch(`/api/logs?childId=${selectedChildId}&limit=5`).then((r) => r.json()),
    enabled: !!selectedChildId,
  });

  const children = Array.isArray(childrenData) ? childrenData : [];
  const logs = Array.isArray(logsData?.logs) ? logsData.logs : [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/logs/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      toast("Event removed", {
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

  const childName = children.find((c: any) => c.id === selectedChildId)?.name || "Baby";

  const getDetail = (log: any) => {
    if (log.type === "FEED" && log.feedAmount) {
      return `${log.feedAmount} ${log.feedUnit?.toLowerCase() || "oz"}`;
    }
    if (log.type === "DIAPER" && log.diaperType) {
      return log.diaperType === "PEE" ? "Pee" : log.diaperType === "POOP" ? "Poop" : "Pee + poop";
    }
    if (log.type === "NURSE" && log.nurseDuration) {
      const side = log.nurseSide ? ` · ${log.nurseSide === "BOTH" ? "Both sides" : log.nurseSide === "LEFT" ? "Left side" : "Right side"}` : "";
      return `${log.nurseDuration} min${side}`;
    }
    if (log.type === "PUMP" && log.pumpAmount) {
      return `${log.pumpAmount} ${log.pumpUnit?.toLowerCase() || "oz"}`;
    }
    return "";
  };

  if (isLoading) {
    return (
      <div>
        <h2 className="font-display text-lg font-semibold text-text-primary mb-3">Recent Activity</h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-2xl p-4 animate-pulse h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-text-primary mb-3">Recent Activity</h2>
      {logs.length === 0 ? (
        <div className="bg-surface rounded-2xl p-6 text-center">
          <p className="text-text-secondary">No activity logged for {childName} yet today.</p>
          <p className="text-text-muted text-sm mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => {
            const cfg = typeConfig[log.type] || typeConfig.WAKE;
            const Icon = cfg.icon;
            return (
              <div key={log.id} className="bg-surface border border-border rounded-2xl p-3 flex items-center gap-3">
                <div className={`p-2 rounded-xl ${cfg.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">{cfg.label}</span>
                    <span className="text-xs text-text-muted">
                      {formatRelativeTime(new Date(log.occurredAt))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getDetail(log) && (
                      <span className="text-xs text-text-secondary">{getDetail(log)}</span>
                    )}
                    {log.user?.name && (
                      <span className="text-xs text-text-muted">by {log.user.name}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(log.id)}
                  className="text-xs text-text-muted hover:text-danger transition-colors"
                >
                  Undo
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
