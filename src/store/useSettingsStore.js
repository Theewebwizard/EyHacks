import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useSettingsStore = create(
  persist(
    (set) => ({
      aiLevel: "balanced",
      audioAlerts: true,

      setAiLevel: (level) => set({ aiLevel: level }),
      setAudioAlerts: (enabled) => set({ audioAlerts: enabled }),
    }),
    {
      name: "agent-settings-storage", // unique name
    }
  )
);
