import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ActiveTimer {
  logId: string;
  type: "SLEEP" | "NURSE" | "PUMP";
  startedAt: string;
  childId: string;
  side?: "LEFT" | "RIGHT" | "BOTH";
}

interface AppState {
  selectedChildId: string | null;
  setSelectedChildId: (id: string | null) => void;
  onboarded: boolean;
  setOnboarded: (val: boolean) => void;
  pwaBannerDismissed: boolean;
  dismissPwaBanner: () => void;
  activeTimers: ActiveTimer[];
  addTimer: (timer: ActiveTimer) => void;
  removeTimer: (logId: string) => void;
  setTimers: (timers: ActiveTimer[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedChildId: null,
      setSelectedChildId: (id) => set({ selectedChildId: id }),
      onboarded: false,
      setOnboarded: (val) => set({ onboarded: val }),
      pwaBannerDismissed: false,
      dismissPwaBanner: () => set({ pwaBannerDismissed: true }),
      activeTimers: [],
      addTimer: (timer) =>
        set((state) => ({
          activeTimers: [...state.activeTimers.filter((t) => !(t.childId === timer.childId && t.type === timer.type)), timer],
        })),
      removeTimer: (logId) =>
        set((state) => ({
          activeTimers: state.activeTimers.filter((t) => t.logId !== logId),
        })),
      setTimers: (timers) => set({ activeTimers: timers }),
    }),
    {
      name: "cribnotes-app-store",
      partialize: (state) => ({
        selectedChildId: state.selectedChildId,
        onboarded: state.onboarded,
        pwaBannerDismissed: state.pwaBannerDismissed,
        activeTimers: state.activeTimers,
      }),
    }
  )
);