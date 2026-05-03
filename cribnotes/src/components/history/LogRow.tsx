"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface LogRowProps {
  log: any;
  onEdit: () => void;
  onDelete: () => void;
}

const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
  WAKE: { icon: "☀️", color: "text-wake", label: "Woke Up" },
  SLEEP: { icon: "😴", color: "text-sleep", label: "Fell Asleep" },
  FEED: { icon: "🍼", color: "text-feed", label: "Fed" },
  DIAPER: { icon: "💧", color: "text-diaper", label: "Diaper" },
  NURSE: { icon: "🤱", color: "text-nurse", label: "Nursed" },
  PUMP: { icon: "🥛", color: "text-pump", label: "Pumped" },
};

export function LogRow({ log, onEdit, onDelete }: LogRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = typeConfig[log.type] || typeConfig.WAKE;

  const getDetails = () => {
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

  return (
    <div className="bg-surface border border-border rounded-2xl p-3 flex items-center gap-3">
      <span className="text-xl">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
          <span className="text-xs text-text-muted">{formatTime(new Date(log.occurredAt))}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {getDetails() && <span className="text-xs text-text-secondary">{getDetails()}</span>}
          {log.user?.name && <span className="text-xs text-text-muted">by {log.user.name}</span>}
        </div>
        {log.createdAt && log.createdAt !== log.occurredAt && (
          <span className="text-xs text-text-muted">Logged {formatTime(new Date(log.createdAt))}</span>
        )}
      </div>
      <div className="relative">
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 text-text-muted hover:text-text-primary rounded-lg">
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 mt-1 w-28 bg-elevated border border-border rounded-xl shadow-lg z-20 overflow-hidden">
              <button onClick={() => { setMenuOpen(false); onEdit(); }} className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-surface">Edit</button>
              <button onClick={() => { setMenuOpen(false); onDelete(); }} className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-surface">Delete</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
