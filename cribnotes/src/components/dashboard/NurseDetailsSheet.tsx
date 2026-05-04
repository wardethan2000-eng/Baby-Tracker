"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useActiveTimers } from "@/lib/useActiveTimers";

interface NurseDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  logId: string | null;
  isTimer?: boolean;
}

type NurseSide = "LEFT" | "RIGHT" | "BOTH";

const sides: { value: NurseSide; label: string }[] = [
  { value: "LEFT", label: "Left" },
  { value: "RIGHT", label: "Right" },
  { value: "BOTH", label: "Both" },
];

export default function NurseDetailsSheet({ open, onClose, logId, isTimer = false }: NurseDetailsSheetProps) {
  const queryClient = useQueryClient();
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const addTimer = useAppStore((s) => s.addTimer);
  const { invalidateTimers } = useActiveTimers();
  const [duration, setDuration] = useState(0);
  const [side, setSide] = useState<NurseSide>("BOTH");
  const [notes, setNotes] = useState("");

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
      toast.success("Nursing details saved");
      handleClose();
    },
    onError: () => {
      toast.error("Failed to save nursing details");
    },
  });

  const createLogMutation = useMutation({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      toast.success("Nursing logged");
      handleClose();
    },
    onError: () => {
      toast.error("Failed to log nursing");
    },
  });

  const createTimerMutation = useMutation({
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
        if (!r.ok) throw new Error("Failed to start timer");
        return r.json();
      }),
    onSuccess: (data) => {
      const now = new Date().toISOString();
      addTimer({
        logId: data.id,
        type: "NURSE",
        startedAt: now,
        childId: selectedChildId!,
        side,
      });
      invalidateTimers();
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      toast.success("Nursing timer started");
      handleClose();
    },
    onError: () => {
      toast.error("Failed to start nurse timer");
    },
  });

  const handleClose = () => {
    setDuration(0);
    setSide("BOTH");
    setNotes("");
    onClose();
  };

  const handleLogNursing = () => {
    if (isTimer && logId) {
      patchMutation.mutate({
        nurseDuration: duration > 0 ? duration : undefined,
        nurseSide: side,
        notes: notes || undefined,
      });
      return;
    }

    if (!selectedChildId) {
      toast.error("Please select a child first");
      return;
    }

    const now = new Date().toISOString();
    createLogMutation.mutate({
      type: "NURSE",
      childId: selectedChildId,
      occurredAt: now,
      nurseDuration: duration > 0 ? duration : undefined,
      nurseSide: side,
      notes: notes || undefined,
    });
  };

  const handleStartTimer = () => {
    if (!selectedChildId) {
      toast.error("Please select a child first");
      return;
    }

    const now = new Date().toISOString();
    createTimerMutation.mutate({
      type: "NURSE",
      childId: selectedChildId,
      startedAt: now,
      occurredAt: now,
      nurseSide: side,
      notes: notes || undefined,
    });
  };

  const isSaving = createLogMutation.isPending || createTimerMutation.isPending || patchMutation.isPending;

  return (
    <Modal open={open} onClose={handleClose} title={isTimer ? "Nursing timer" : "Log nursing"}>
      <div className="space-y-4">
        {isTimer && (
          <p className="text-sm text-text-secondary">
            Add duration and side details. Stop the timer from the dashboard when done.
          </p>
        )}

        {!isTimer && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Duration (minutes)</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDuration((p) => Math.max(0, p - 1))}
                className="w-10 h-10 rounded-full bg-elevated text-text-primary flex items-center justify-center text-lg font-bold"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold text-text-primary">{duration}</span>
                <span className="ml-1 text-text-secondary">min</span>
              </div>
              <button
                onClick={() => setDuration((p) => p + 1)}
                className="w-10 h-10 rounded-full bg-elevated text-text-primary flex items-center justify-center text-lg font-bold"
              >
                +
              </button>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[5, 10, 15, 20, 30].map((m) => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={`px-3 py-1.5 rounded-full text-sm ${duration === m ? "bg-primary text-base" : "bg-elevated text-text-secondary"}`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        )}

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

        {isTimer ? (
          <Button variant="primary" full onClick={handleLogNursing} disabled={isSaving}>
            {patchMutation.isPending ? "Saving..." : "Save Details"}
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="primary" full onClick={handleStartTimer} disabled={isSaving}>
              {createTimerMutation.isPending ? "..." : "Timer"}
            </Button>
            <Button variant="secondary" full onClick={handleLogNursing} disabled={isSaving}>
              {createLogMutation.isPending ? "Saving..." : "Log Nursing"}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}