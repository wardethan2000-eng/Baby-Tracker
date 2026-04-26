"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface DiaperDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  logId: string | null;
}

type DiaperType = "PEE" | "POOP" | "BOTH";

const diaperTypes: { value: DiaperType; label: string }[] = [
  { value: "PEE", label: "Pee" },
  { value: "POOP", label: "Poop" },
  { value: "BOTH", label: "Both" },
];

export default function DiaperDetailsSheet({ open, onClose, logId }: DiaperDetailsSheetProps) {
  const queryClient = useQueryClient();
  const [diaperType, setDiaperType] = useState<DiaperType>("PEE");
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
      toast.success("Diaper details saved");
      handleClose();
    },
    onError: () => {
      toast.error("Failed to save diaper details");
    },
  });

  const handleClose = () => {
    setDiaperType("PEE");
    setNotes("");
    onClose();
  };

  const handleSave = () => {
    if (!logId) return;
    mutation.mutate({
      diaperType,
      notes: notes || undefined,
    });
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add diaper details">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-text-secondary mb-2">What was it?</p>
          <div className="grid grid-cols-3 gap-2">
            {diaperTypes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setDiaperType(t.value)}
                className={`px-3 py-3 rounded-2xl text-sm font-medium ${
                  diaperType === t.value ? "bg-primary text-base" : "bg-elevated text-text-secondary"
                }`}
              >
                {t.label}
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
