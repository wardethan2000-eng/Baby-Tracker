"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EditLogModalProps {
  open: boolean;
  onClose: () => void;
  log: any;
}

export function EditLogModal({ open, onClose, log }: EditLogModalProps) {
  const queryClient = useQueryClient();
  const [occurredAt, setOccurredAt] = useState("");
  const [feedAmount, setFeedAmount] = useState<string>("");
  const [feedUnit, setFeedUnit] = useState<"OZ" | "ML">("OZ");
  const [feedType, setFeedType] = useState<"BREAST" | "BOTTLE" | "BOTH" | "SOLID">("BOTTLE");
  const [foodName, setFoodName] = useState("");
  const [diaperType, setDiaperType] = useState<"PEE" | "POOP" | "BOTH">("PEE");
  const [nurseDuration, setNurseDuration] = useState<string>("");
  const [nurseSide, setNurseSide] = useState<"LEFT" | "RIGHT" | "BOTH">("BOTH");
  const [pumpAmount, setPumpAmount] = useState<string>("");
  const [pumpUnit, setPumpUnit] = useState<"OZ" | "ML">("OZ");
  const [pumpSide, setPumpSide] = useState<"LEFT" | "RIGHT" | "BOTH" | "">("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (log && open) {
      setConfirmed(false);
      setOccurredAt(format(new Date(log.occurredAt), "yyyy-MM-dd'T'HH:mm"));
      setFeedAmount(log.feedAmount != null ? String(log.feedAmount) : "");
      setFeedUnit(log.feedUnit || "OZ");
      setFeedType(log.feedType || "BOTTLE");
      setFoodName(log.foodName || "");
      setDiaperType(log.diaperType || "PEE");
      setNurseDuration(log.nurseDuration != null ? String(log.nurseDuration) : "");
      setNurseSide(log.nurseSide || "BOTH");
      setPumpAmount(log.pumpAmount != null ? String(log.pumpAmount) : "");
      setPumpUnit(log.pumpUnit || "OZ");
      setPumpSide(log.pumpSide || "");
      setNotes(log.notes || "");
    }
  }, [log, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setSaving(true);
    try {
      const data: any = {
        occurredAt: new Date(occurredAt).toISOString(),
        notes: notes || undefined,
      };
      if (log.type === "FEED") {
        data.feedAmount = feedAmount ? parseFloat(feedAmount) : undefined;
        data.feedUnit = feedUnit;
        data.feedType = feedType;
        if (foodName.trim()) data.foodName = foodName.trim();
      }
      if (log.type === "DIAPER") {
        data.diaperType = diaperType;
      }
      if (log.type === "NURSE") {
        data.nurseDuration = nurseDuration ? parseInt(nurseDuration) : undefined;
        data.nurseSide = nurseSide;
      }
      if (log.type === "PUMP") {
        data.pumpAmount = pumpAmount ? parseFloat(pumpAmount) : undefined;
        data.pumpUnit = pumpUnit;
        if (pumpSide) data.pumpSide = pumpSide;
      }
      const res = await fetch(`/api/logs/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      toast.success("Log updated");
      onClose();
    } catch {
      toast.error("Failed to update log");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Log">
      <form onSubmit={handleSubmit} className="space-y-4">
        {log?.user?.name && (
          <p className="text-sm text-text-secondary">Logged by {log.user.name}</p>
        )}
        <Input label="Time" type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} required />

        {log?.type === "FEED" && (
          <>
            <Input label="Amount" type="number" step="any" value={feedAmount} onChange={(e) => setFeedAmount(e.target.value)} placeholder="3.5" />
            <div>
              <p className="text-sm text-text-secondary mb-2">Unit</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setFeedUnit("OZ")} className={`px-4 py-2 rounded-full text-sm ${feedUnit === "OZ" ? "bg-primary text-base" : "bg-elevated text-text-secondary"}`}>OZ</button>
                <button type="button" onClick={() => setFeedUnit("ML")} className={`px-4 py-2 rounded-full text-sm ${feedUnit === "ML" ? "bg-primary text-base" : "bg-elevated text-text-secondary"}`}>ML</button>
              </div>
            </div>
            <div>
              <p className="text-sm text-text-secondary mb-2">Feed Type</p>
              <div className="flex gap-2 flex-wrap">
                {(["BREAST", "BOTTLE", "BOTH", "SOLID"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setFeedType(t)} className={`flex-1 min-w-0 px-3 py-2 rounded-full text-sm ${feedType === t ? "bg-primary text-base" : "bg-elevated text-text-secondary"}`}>
                    {t === "BREAST" ? "Breast" : t === "BOTTLE" ? "Bottle" : t === "BOTH" ? "Both" : "Solid"}
                  </button>
                ))}
              </div>
            </div>
            {feedType === "SOLID" && (
              <Input label="Food Name" type="text" value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="e.g., Rice cereal, Mashed banana" />
            )}
          </>
        )}

        {log?.type === "DIAPER" && (
          <div>
            <p className="text-sm text-text-secondary mb-2">Diaper Type</p>
            <div className="grid grid-cols-3 gap-2">
              {(["PEE", "POOP", "BOTH"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setDiaperType(t)} className={`px-3 py-2 rounded-2xl text-sm ${diaperType === t ? "bg-primary text-base" : "bg-elevated text-text-secondary"}`}>
                  {t === "PEE" ? "Pee" : t === "POOP" ? "Poop" : "Both"}
                </button>
              ))}
            </div>
          </div>
        )}

        {log?.type === "NURSE" && (
          <>
            <Input label="Duration (minutes)" type="number" step="1" value={nurseDuration} onChange={(e) => setNurseDuration(e.target.value)} placeholder="15" />
            <div>
              <p className="text-sm text-text-secondary mb-2">Side</p>
              <div className="grid grid-cols-3 gap-2">
                {(["LEFT", "RIGHT", "BOTH"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setNurseSide(s)} className={`px-3 py-2 rounded-2xl text-sm ${nurseSide === s ? "bg-primary text-base" : "bg-elevated text-text-secondary"}`}>
                    {s === "LEFT" ? "Left" : s === "RIGHT" ? "Right" : "Both"}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {log?.type === "PUMP" && (
          <div className="space-y-4">
            <Input label="Amount" type="number" step="any" value={pumpAmount} onChange={(e) => setPumpAmount(e.target.value)} placeholder="3.5" />
            <div>
              <p className="text-sm text-text-secondary mb-2">Unit</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPumpUnit("OZ")} className={`px-4 py-2 rounded-full text-sm ${pumpUnit === "OZ" ? "bg-primary text-base" : "bg-elevated text-text-secondary"}`}>OZ</button>
                <button type="button" onClick={() => setPumpUnit("ML")} className={`px-4 py-2 rounded-full text-sm ${pumpUnit === "ML" ? "bg-primary text-base" : "bg-elevated text-text-secondary"}`}>ML</button>
              </div>
            </div>
            <div>
              <p className="text-sm text-text-secondary mb-2">Side <span className="text-text-muted">(optional)</span></p>
              <div className="grid grid-cols-3 gap-2">
                {(["LEFT", "RIGHT", "BOTH"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setPumpSide(pumpSide === s ? "" : s)} className={`px-3 py-2 rounded-2xl text-sm ${pumpSide === s ? "bg-primary text-base" : "bg-elevated text-text-secondary"}`}>
                    {s === "LEFT" ? "Left" : s === "RIGHT" ? "Right" : "Both"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm text-text-secondary mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-3 bg-elevated rounded-2xl text-text-primary placeholder:text-text-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary resize-none" rows={2} placeholder="Optional notes..." />
        </div>

        {confirmed && (
          <p className="text-xs text-center text-warning bg-warning/5 rounded-xl py-2">
            Review your changes above, then confirm to save
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            full
            onClick={() => confirmed ? setConfirmed(false) : onClose()}
          >
            {confirmed ? "Go Back" : "Cancel"}
          </Button>
          <Button variant={confirmed ? "danger" : "primary"} full disabled={saving}>
            {saving ? "Saving..." : confirmed ? "Confirm Save" : "Review Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
