import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useSettingsStore = create(
  persist(
    (set) => ({
      aiLevel: "balanced",
      themeAccent: "emerald",
      audioAlerts: true,

      setAiLevel: (level) => set({ aiLevel: level }),
      setThemeAccent: (accent) => set({ themeAccent: accent }),
      setAudioAlerts: (enabled) => set({ audioAlerts: enabled }),
    }),
    {
      name: "agent-settings-storage", // unique name
    }
  )
);
