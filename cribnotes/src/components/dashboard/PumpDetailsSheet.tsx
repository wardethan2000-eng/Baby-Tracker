"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface PumpDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  logId: string | null;
}

function useLastPumpUnit() {
  const [unit, setUnit] = useState<"OZ" | "ML">("OZ");

  const saveUnit = (u: "OZ" | "ML") => {
    setUnit(u);
    try { localStorage.setItem("nw-lastPumpUnit", u); } catch {}
  };

  return { unit, saveUnit };
}

export default function PumpDetailsSheet({ open, onClose, logId }: PumpDetailsSheetProps) {
  const queryClient = useQueryClient();
  const { unit, saveUnit } = useLastPumpUnit();
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
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
    setNotes("");
    onClose();
  };

  const handleSave = () => {
    if (!logId) return;
    mutation.mutate({
      pumpAmount: amount,
      pumpUnit: unit,
      notes: notes || undefined,
    });
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add pumping details (optional)">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Amount</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAmount((p) => Math.max(0, p - 0.5))}
              className="w-10 h-10 rounded-full bg-elevated text-text-primary flex items-center justify-center text-lg font-bold"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-2xl font-bold text-text-primary">{amount}</span>
              <span className="ml-1 text-text-secondary">{unit.toLowerCase()}</span>
            </div>
            <button
              onClick={() => setAmount((p) => p + 0.5)}
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
          <Button variant="secondary" full onClick={handleClose}>Skip</Button>
          <Button variant="primary" full onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Details"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}