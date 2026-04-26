"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface QuickLogButtonProps {
  icon: LucideIcon;
  label: string;
  color: "primary" | "secondary" | "warning";
  onClick: () => void;
  haptic?: boolean;
}

const colorMap = {
  primary: {
    bg: "bg-[#38bdf8]/10",
    text: "text-[#38bdf8]",
    shadow: "shadow-[0_4px_24px_rgba(56,189,248,0.2)]",
  },
  secondary: {
    bg: "bg-[#818cf8]/10",
    text: "text-[#818cf8]",
    shadow: "shadow-[0_4px_24px_rgba(129,140,248,0.2)]",
  },
  warning: {
    bg: "bg-[#fbbf24]/10",
    text: "text-[#fbbf24]",
    shadow: "shadow-[0_4px_24px_rgba(251,191,36,0.2)]",
  },
};

const QuickLogButton = forwardRef<HTMLButtonElement, QuickLogButtonProps>(
  ({ icon: Icon, label, color, onClick, haptic = true }, ref) => {
    const handlePointerDown = () => {
      if (haptic && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(50);
      }
    };

    const c = colorMap[color];

    return (
      <button
        ref={ref}
        className={cn(
          "min-w-[120px] min-h-[120px] sm:min-w-[140px] sm:min-h-[140px]",
          "rounded-3xl flex flex-col items-center justify-center gap-2",
          "transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary",
          "bg-surface border border-border hover:bg-elevated",
          c.shadow,
          c.text
        )}
        onClick={onClick}
        onPointerDown={handlePointerDown}
      >
        <Icon className="w-10 h-10" />
        <span className="text-sm font-medium">{label}</span>
      </button>
    );
  }
);

QuickLogButton.displayName = "QuickLogButton";

export default QuickLogButton;