"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore, ActiveTimer } from "@/lib/store";

export function useActiveTimers() {
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const activeTimers = useAppStore((s) => s.activeTimers);
  const addTimer = useAppStore((s) => s.addTimer);
  const removeTimer = useAppStore((s) => s.removeTimer);
  const setTimers = useAppStore((s) => s.setTimers);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["timers", selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return { timers: [] };
      const res = await fetch(`/api/logs/timers?childId=${selectedChildId}`);
      if (!res.ok) throw new Error("Failed to fetch timers");
      return res.json();
    },
    enabled: !!selectedChildId,
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!data?.timers) return;

    const serverTimers: ActiveTimer[] = data.timers
      .filter((t: any) => t.startedAt)
      .map((t: any) => ({
      logId: t.id,
      type: t.type,
      startedAt: t.startedAt,
      childId: t.childId,
      side: t.nurseSide ?? t.pumpSide ?? undefined,
    }));

    setTimers(serverTimers);
  }, [data, setTimers]);

  const timersForChild = activeTimers.filter(
    (t) => t.childId === selectedChildId
  );

  const hasTimer = (type: "SLEEP" | "NURSE" | "PUMP") =>
    timersForChild.some((t) => t.type === type);

  const getTimer = (type: "SLEEP" | "NURSE" | "PUMP") =>
    timersForChild.find((t) => t.type === type) ?? null;

  const invalidateTimers = () => {
    queryClient.invalidateQueries({ queryKey: ["timers"] });
    queryClient.invalidateQueries({ queryKey: ["logs"] });
  };

  return {
    timersForChild,
    hasTimer,
    getTimer,
    addTimer,
    removeTimer,
    invalidateTimers,
  };
}