"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Moon, Sun, Baby, Droplets, Heart, Milk } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import QuickLogButton from "@/components/dashboard/QuickLogButton";
import FeedDetailsSheet from "@/components/dashboard/FeedDetailsSheet";
import DiaperDetailsSheet from "@/components/dashboard/DiaperDetailsSheet";
import NurseDetailsSheet from "@/components/dashboard/NurseDetailsSheet";
import PumpDetailsSheet from "@/components/dashboard/PumpDetailsSheet";
import { useAppStore } from "@/lib/store";
import { useActiveTimers } from "@/lib/useActiveTimers";
import { format } from "date-fns";

export default function QuickLogGrid() {
  const queryClient = useQueryClient();
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const addTimer = useAppStore((s) => s.addTimer);
  const { getTimer, invalidateTimers } = useActiveTimers();

  const [feedSheetOpen, setFeedSheetOpen] = useState(false);
  const [feedLogId, setFeedLogId] = useState<string | null>(null);
  const [diaperSheetOpen, setDiaperSheetOpen] = useState(false);
  const [diaperLogId, setDiaperLogId] = useState<string | null>(null);
  const [nurseSheetOpen, setNurseSheetOpen] = useState(false);
  const [nurseLogId, setNurseLogId] = useState<string | null>(null);
  const [pumpSheetOpen, setPumpSheetOpen] = useState(false);
  const [pumpLogId, setPumpLogId] = useState<string | null>(null);

  const logMutation = useMutation({
    mutationFn: (data: object) =>
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          throw new Error("Session expired");
        }
        if (!r.ok) throw new Error("Failed to log");
        return r.json();
      }),
  });

  const pending = logMutation.isPending;

  const startSleepTimer = () => {
    if (!selectedChildId) {
      toast.error("Please select a child first");
      return;
    }
    const now = new Date().toISOString();

    logMutation.mutate(
      { type: "SLEEP" as const, childId: selectedChildId, startedAt: now, occurredAt: now },
      {
        onSuccess: (data) => {
          invalidateTimers();
          addTimer({
            logId: data.id,
            type: "SLEEP",
            startedAt: now,
            childId: selectedChildId,
          });
          toast.success("Started sleep timer");
        },
        onError: () => {
          toast.error("Failed to start timer");
        },
      }
    );
  };

  const handleLog = (type: "WAKE" | "SLEEP" | "FEED" | "DIAPER" | "NURSE" | "PUMP") => {
    if (!selectedChildId) {
      toast.error("Please select a child first");
      return;
    }

    if (type === "SLEEP") {
      startSleepTimer();
      return;
    }

    if (type === "NURSE") {
      setNurseLogId(nurseTimer ? nurseTimer.logId : null);
      setNurseSheetOpen(true);
      return;
    }

    if (type === "PUMP") {
      setPumpLogId(pumpTimer ? pumpTimer.logId : null);
      setPumpSheetOpen(true);
      return;
    }

    const now = new Date().toISOString();
    const time = format(new Date(), "h:mm a");

    logMutation.mutate(
      { type, childId: selectedChildId, occurredAt: now },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ["logs"] });
          if (type === "FEED") {
            setFeedLogId(data.id);
            setFeedSheetOpen(true);
          } else if (type === "DIAPER") {
            setDiaperLogId(data.id);
            setDiaperSheetOpen(true);
          } else {
            const messages: Record<string, string> = {
              WAKE: `Logged: woke up at ${time}`,
            };
            toast.success(messages[type] || "Logged!");
          }
        },
        onError: () => {
          toast.error("Failed to log event");
        },
      }
    );
  };

  const sleepTimer = getTimer("SLEEP");
  const nurseTimer = getTimer("NURSE");
  const pumpTimer = getTimer("PUMP");

  const getTimerElapsed = (timer: { startedAt: string } | null): string | null => {
    if (!timer) return null;
    const ms = Date.now() - new Date(timer.startedAt).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h${m}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <QuickLogButton
          icon={Sun}
          label="Woke Up"
          color="warning"
          onClick={() => handleLog("WAKE")}
          disabled={pending}
        />
        <QuickLogButton
          icon={Moon}
          label={sleepTimer ? "Asleep" : "Asleep"}
          color="secondary"
          onClick={() => handleLog("SLEEP")}
          disabled={!!sleepTimer || pending}
          timerLabel={getTimerElapsed(sleepTimer)}
        />
        <QuickLogButton
          icon={Baby}
          label="Fed"
          color="primary"
          onClick={() => handleLog("FEED")}
          disabled={pending}
        />
        <QuickLogButton
          icon={Droplets}
          label="Diaper"
          color="secondary"
          onClick={() => handleLog("DIAPER")}
          disabled={pending}
        />
        <QuickLogButton
          icon={Heart}
          label={nurseTimer ? "Nursing" : "Nursed"}
          color="warning"
          onClick={() => handleLog("NURSE")}
          disabled={pending}
          timerLabel={getTimerElapsed(nurseTimer)}
        />
        <QuickLogButton
          icon={Milk}
          label={pumpTimer ? "Pumping" : "Pumped"}
          color="secondary"
          onClick={() => handleLog("PUMP")}
          disabled={pending}
          timerLabel={getTimerElapsed(pumpTimer)}
        />
      </div>
      <FeedDetailsSheet
        open={feedSheetOpen}
        onClose={() => setFeedSheetOpen(false)}
        logId={feedLogId}
      />
      <DiaperDetailsSheet
        open={diaperSheetOpen}
        onClose={() => setDiaperSheetOpen(false)}
        logId={diaperLogId}
      />
      <NurseDetailsSheet
        open={nurseSheetOpen}
        onClose={() => setNurseSheetOpen(false)}
        logId={nurseLogId}
        isTimer={!!nurseTimer}
      />
      <PumpDetailsSheet
        open={pumpSheetOpen}
        onClose={() => setPumpSheetOpen(false)}
        logId={pumpLogId}
        isTimer={!!pumpTimer}
      />
    </div>
  );
}