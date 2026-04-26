import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  selectedChildId: string | null;
  setSelectedChildId: (id: string | null) => void;
  onboarded: boolean;
  setOnboarded: (val: boolean) => void;
  pwaBannerDismissed: boolean;
  dismissPwaBanner: () => void;
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
    }),
    {
      name: "cribnotes-app-store",
      partialize: (state) => ({
        selectedChildId: state.selectedChildId,
        onboarded: state.onboarded,
        pwaBannerDismissed: state.pwaBannerDismissed,
      }),
    }
  )
);