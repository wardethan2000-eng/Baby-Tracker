"use client";

import { useState, useEffect, useCallback } from "react";
import { Moon, Heart, Milk, Square } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActiveTimers } from "@/lib/useActiveTimers";
import { ActiveTimer } from "@/lib/store";

const TIMER_CONFIG: Record<
  string,
  { icon: typeof Moon; label: string; colorClass: string; bgClass: string }
> = {
  SLEEP: {
    icon: Moon,
    label: "Asleep",
    colorClass: "text-sleep",
    bgClass: "bg-sleep/10",
  },
  NURSE: {
    icon: Heart,
    label: "Nursing",
    colorClass: "text-nurse",
    bgClass: "bg-nurse/10",
  },
  PUMP: {
    icon: Milk,
    label: "Pumping",
    colorClass: "text-pump",
    bgClass: "bg-pump/10",
  },
};

const SIDE_LABELS: Record<string, string> = {
  LEFT: "Left",
  RIGHT: "Right",
  BOTH: "Both sides",
};

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

function TimerRow({ timer, onStop }: { timer: ActiveTimer; onStop: (timer: ActiveTimer) => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    const startMs = new Date(timer.startedAt).getTime();
    setElapsed(Date.now() - startMs);

    const interval = setInterval(() => {
      setElapsed(Date.now() - startMs);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.startedAt, timer.logId]);

  const config = TIMER_CONFIG[timer.type];
  if (!config) return null;

  const Icon = config.icon;
  const sideLabel = timer.side ? SIDE_LABELS[timer.side] : null;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${config.bgClass} border border-border`}>
      <div className={`p-1.5 rounded-lg ${config.bgClass}`}>
        <Icon className={`w-4 h-4 ${config.colorClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${config.colorClass}`}>
            {config.label}
          </span>
          {sideLabel && (
            <span className="text-xs text-text-muted bg-elevated px-1.5 py-0.5 rounded-full">
              {sideLabel}
            </span>
          )}
        </div>
        <span className="text-lg font-bold text-text-primary font-mono tabular-nums">
          {formatElapsed(elapsed)}
        </span>
      </div>
      <button
        onClick={() => {
          setStopping(true);
          onStop(timer);
        }}
        disabled={stopping}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-elevated border border-border text-sm font-medium text-text-secondary hover:text-danger hover:border-danger/50 transition-colors disabled:opacity-50"
      >
        <Square className="w-3 h-3 fill-current" />
        {stopping ? "..." : "Stop"}
      </button>
    </div>
  );
}

export default function ActiveTimersBar() {
  const { timersForChild, removeTimer, invalidateTimers } = useActiveTimers();
  const queryClient = useQueryClient();

  const stopMutation = useMutation({
    mutationFn: async (timer: ActiveTimer) => {
      const res = await fetch(`/api/logs/${timer.logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopTimer: true }),
      });
      if (!res.ok) throw new Error("Failed to stop timer");
      return res.json();
    },
    onSuccess: (data, timer) => {
      removeTimer(timer.logId);
      invalidateTimers();

      const config = TIMER_CONFIG[timer.type];
      const durationMin = data.nurseDuration;
      let msg = `${config?.label || timer.type} stopped`;
      if (durationMin) {
        msg = `${config?.label || timer.type} stopped after ${durationMin} min`;
      }
      toast.success(msg);

      if (data.wakeLog) {
        toast.success("Woke up logged");
      }
    },
    onError: (_, timer) => {
      const config = TIMER_CONFIG[timer.type];
      toast.error(`Failed to stop ${config?.label?.toLowerCase() || "timer"}`);
    },
  });

  if (timersForChild.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {timersForChild.map((timer) => (
        <TimerRow
          key={timer.logId}
          timer={timer}
          onStop={(t) => stopMutation.mutate(t)}
        />
      ))}
    </div>
  );
}