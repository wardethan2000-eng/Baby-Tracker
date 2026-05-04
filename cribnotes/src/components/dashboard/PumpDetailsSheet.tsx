"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useActiveTimers } from "@/lib/useActiveTimers";

interface PumpDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  logId: string | null;
  isTimer?: boolean;
}

type PumpSide = "LEFT" | "RIGHT" | "BOTH";

const sides: { value: PumpSide; label: string }[] = [
  { value: "LEFT", label: "Left" },
  { value: "RIGHT", label: "Right" },
  { value: "BOTH", label: "Both" },
];

function useLastPumpUnit() {
  const [unit, setUnit] = useState<"OZ" | "ML">("OZ");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nw-lastPumpUnit");
      if (saved === "OZ" || saved === "ML") setUnit(saved);
    } catch {}
  }, []);

  const saveUnit = (u: "OZ" | "ML") => {
    setUnit(u);
    try { localStorage.setItem("nw-lastPumpUnit", u); } catch {}
  };

  return { unit, saveUnit };
}

export default function PumpDetailsSheet({ open, onClose, logId, isTimer = false }: PumpDetailsSheetProps) {
  const queryClient = useQueryClient();
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const addTimer = useAppStore((s) => s.addTimer);
  const { invalidateTimers } = useActiveTimers();
  const { unit, saveUnit } = useLastPumpUnit();
  const [amount, setAmount] = useState(0);
  const [side, setSide] = useState<PumpSide>("BOTH");
  const [notes, setNotes] = useState("");
  const [startTimer, setStartTimer] = useState(false);

  const createMutation = useMutation({
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      if (startTimer) {
        const now = new Date().toISOString();
        addTimer({
          logId: data.id,
          type: "PUMP",
          startedAt: now,
          childId: selectedChildId!,
        });
        invalidateTimers();
        toast.success("Pumping timer started");
      } else {
        toast.success("Pumping logged");
      }
      handleClose();
    },
    onError: () => {
      toast.error(startTimer ? "Failed to start pump timer" : "Failed to log pumping");
    },
  });

  const patchMutation = useMutation({
    mutationFn: (data: object) =>
      fetch(`/api/logs/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Failed to update");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      toast.success("Pumping details saved");
      handleClose();
    },
    onError: () => {
      toast.error("Failed to save pumping details");
    },
  });

  const handleClose = () => {
    setAmount(0);
    setSide("BOTH");
    setNotes("");
    setStartTimer(false);
    onClose();
  };

  const handleSave = () => {
    if (isTimer && logId) {
      const data: any = {
        pumpAmount: amount > 0 ? amount : undefined,
        pumpUnit: amount > 0 ? unit : undefined,
        pumpSide: side,
        notes: notes || undefined,
      };
      patchMutation.mutate(data);
      return;
    }

    if (!selectedChildId) {
      toast.error("Please select a child first");
      return;
    }

    const now = new Date().toISOString();
    const data: any = {
      type: "PUMP",
      childId: selectedChildId,
      occurredAt: now,
      pumpAmount: amount > 0 ? amount : undefined,
      pumpUnit: amount > 0 ? unit : undefined,
      pumpSide: side,
      notes: notes || undefined,
    };

    if (startTimer) {
      data.startedAt = now;
    }

    createMutation.mutate(data);
  };

  return (
    <Modal open={open} onClose={handleClose} title={isTimer ? "Pumping timer running" : "Log pumping session"}>
      <div className="space-y-4">
        {isTimer && (
          <p className="text-sm text-text-secondary">
            Add amount and side details. Stop the timer from the dashboard when done.
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Amount</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAmount((p) => Math.max(0, p - (unit === "OZ" ? 0.5 : 10)))}
              className="w-10 h-10 rounded-full bg-elevated text-text-primary flex items-center justify-center text-lg font-bold"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-2xl font-bold text-text-primary">{amount}</span>
              <span className="ml-1 text-text-secondary">{unit.toLowerCase()}</span>
            </div>
            <button
              onClick={() => setAmount((p) => p + (unit === "OZ" ? 0.5 : 10))}
              className="w-10 h-10 rounded-full bg-elevated text-text-primary flex items-center justify-center text-lg font-bold"
            >
              +
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => saveUnit("OZ")}
              className={`px-4 py-1.5 rounded-full text-sm ${unit === "OZ" ? "bg-primary text-base" : "bg-elevated text-text-secondary"}`}
            >
              OZ
            </button>
            <button
              onClick={() => saveUnit("ML")}
              className={`px-4 py-1.5 rounded-full text-sm ${unit === "ML" ? "bg-primary text-base" : "bg-elevated text-text-secondary"}`}
            >
              ML
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-text-secondary mb-2">Side</p>
          <div className="grid grid-cols-3 gap-2">
            {sides.map((s) => (
              <button
                key={s.value}
                onClick={() => setSide(s.value)}
                className={`px-3 py-3 rounded-2xl text-sm font-medium ${
                  side === s.value ? "bg-primary text-base" : "bg-elevated text-text-secondary"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {!isTimer && (
          <button
            type="button"
            onClick={() => setStartTimer((prev) => !prev)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-colors ${
              startTimer
                ? "bg-primary/10 border-primary text-primary"
                : "bg-elevated border-border text-text-secondary"
            }`}
          >
            <span className="text-sm font-medium">{startTimer ? "Timer will start" : "Start a timer?"}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${startTimer ? "bg-primary/20 text-primary" : "bg-elevated text-text-muted"}`}>
              {startTimer ? "Yes" : "No"}
            </span>
          </button>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Notes</label>
          <textarea
            className="w-full p-3 bg-elevated rounded-2xl text-text-primary placeholder:text-text-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" full onClick={handleClose}>
            {isTimer ? "Skip" : "Cancel"}
          </Button>
          <Button variant="primary" full onClick={handleSave} disabled={createMutation.isPending || patchMutation.isPending}>
            {createMutation.isPending || patchMutation.isPending
              ? "Saving..."
              : isTimer
                ? "Save Details"
                : startTimer
                  ? "Start Timer & Log"
                  : "Log Pumping"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}