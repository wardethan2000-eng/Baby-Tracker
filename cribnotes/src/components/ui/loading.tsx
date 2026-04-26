"use client";

import { cn } from "@/lib/utils";

export function LoadingSpinner({ className }: { className?: string }) {
  return <div className={cn("w-6 h-6 border-2 border-text-muted border-t-primary rounded-full animate-spin", className)} />;
}

export function Skeleton({ width, height, className }: { width?: string | number; height?: string | number; className?: string }) {
  return (
    <div
      className={cn("bg-surface rounded-2xl animate-pulse", className)}
      style={{ width: width || "100%", height: height || "1rem" }}
    />
  );
}