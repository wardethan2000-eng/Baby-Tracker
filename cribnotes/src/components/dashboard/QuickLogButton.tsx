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
  disabled?: boolean;
  timerLabel?: string | null;
}

const colorMap = {
  primary: {
    bg: "bg-feed/10",
    text: "text-feed",
  },
  secondary: {
    bg: "bg-diaper/10",
    text: "text-diaper",
  },
  warning: {
    bg: "bg-wake/10",
    text: "text-wake",
  },
};

const QuickLogButton = forwardRef<HTMLButtonElement, QuickLogButtonProps>(
  ({ icon: Icon, label, color, onClick, haptic = true, disabled = false, timerLabel }, ref) => {
    const handleClick = () => {
      if (haptic && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(50);
      }
      onClick();
    };

    const c = colorMap[color];

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "relative min-w-[120px] min-h-[120px] sm:min-w-[140px] sm:min-h-[140px]",
          "rounded-3xl flex flex-col items-center justify-center gap-2",
          "transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary",
          "bg-surface border border-border hover:bg-elevated",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          c.text,
          timerLabel && "border-2 border-current/30"
        )}
        onClick={handleClick}
      >
        <Icon className="w-10 h-10" />
        <span className="text-sm font-medium">{label}</span>
        {timerLabel && (
          <span className="absolute top-2 right-2 text-[10px] font-bold font-mono bg-current/20 px-1.5 py-0.5 rounded-full animate-pulse">
            {timerLabel}
          </span>
        )}
      </button>
    );
  }
);

QuickLogButton.displayName = "QuickLogButton";

export default QuickLogButton;