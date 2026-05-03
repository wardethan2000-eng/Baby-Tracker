"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return {
      gridStroke: "#1e3a5f",
      axisStroke: "#94a3b8",
      tooltipBg: "#161f33",
      tooltipBorder: "#1e3a5f",
      feed: "#38bdf8",
      wake: "#fbbf24",
      diaper: "#818cf8",
      nurse: "#f472b6",
      pump: "#a78bfa",
      sleep: "#818cf8",
    };
  }

  const isDark = resolvedTheme === "dark";
  return {
    gridStroke: isDark ? "#1e3a5f" : "#e2e8f0",
    axisStroke: isDark ? "#94a3b8" : "#64748b",
    tooltipBg: isDark ? "#161f33" : "#ffffff",
    tooltipBorder: isDark ? "#1e3a5f" : "#e2e8f0",
    feed: isDark ? "#38bdf8" : "#0284c7",
    wake: isDark ? "#fbbf24" : "#d97706",
    diaper: isDark ? "#818cf8" : "#4f46e5",
    nurse: isDark ? "#f472b6" : "#db2777",
    pump: isDark ? "#a78bfa" : "#7c3aed",
    sleep: isDark ? "#818cf8" : "#4f46e5",
  };
}
