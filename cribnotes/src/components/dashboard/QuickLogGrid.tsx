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
import { format } from "date-fns";

export default function QuickLogGrid() {
  const queryClient = useQueryClient();
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const [feedSheetOpen, setFeedSheetOpen] = useState(false);
  const [feedLogId, setFeedLogId] = useState<string | null>(null);
  const [diaperSheetOpen, setDiaperSheetOpen] = useState(false);
  const [diaperLogId, setDiaperLogId] = useState<string | null>(null);
  const [nurseSheetOpen, setNurseSheetOpen] = useState(false);
  const [nurseLogId, setNurseLogId] = useState<string | null>(null);
  const [pumpSheetOpen, setPumpSheetOpen] = useState(false);
  const [pumpLogId, setPumpLogId] = useState<string | null>(null);

  const logMutation = useMutation({
    mutationFn: (data: { type: string; childId: string; occurredAt: string }) =>
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Failed to log");
        return r.json();
      }),
  });

  const handleLog = (type: "WAKE" | "SLEEP" | "FEED" | "DIAPER" | "NURSE" | "PUMP") => {
    if (!selectedChildId) {
      toast.error("Please select a child first");
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
          } else if (type === "NURSE") {
            setNurseLogId(data.id);
            setNurseSheetOpen(true);
          } else if (type === "PUMP") {
            setPumpLogId(data.id);
            setPumpSheetOpen(true);
          } else {
            const messages: Record<string, string> = {
              WAKE: `Logged: woke up at ${time}`,
              SLEEP: `Logged: fell asleep at ${time}`,
            };
            toast.success(messages[type]);
          }
        },
        onError: () => {
          toast.error("Failed to log event");
        },
      }
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <QuickLogButton
          icon={Sun}
          label="Woke Up"
          color="warning"
          onClick={() => handleLog("WAKE")}
        />
        <QuickLogButton
          icon={Moon}
          label="Asleep"
          color="secondary"
          onClick={() => handleLog("SLEEP")}
        />
        <QuickLogButton
          icon={Baby}
          label="Fed"
          color="primary"
          onClick={() => handleLog("FEED")}
        />
        <QuickLogButton
          icon={Droplets}
          label="Diaper"
          color="secondary"
          onClick={() => handleLog("DIAPER")}
        />
        <QuickLogButton
          icon={Heart}
          label="Nursed"
          color="warning"
          onClick={() => handleLog("NURSE")}
        />
        <QuickLogButton
          icon={Milk}
          label="Pumped"
          color="secondary"
          onClick={() => handleLog("PUMP")}
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
      />
      <PumpDetailsSheet
        open={pumpSheetOpen}
        onClose={() => setPumpSheetOpen(false)}
        logId={pumpLogId}
      />
    </div>
  );
}