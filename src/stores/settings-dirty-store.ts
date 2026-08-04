import { create } from "zustand";

type SettingsDirtyState = {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
};

/** Tracks whether the currently-mounted Settings tab has an unsaved form — read by SettingsShell to warn before navigating away or closing the tab. */
export const useSettingsDirtyStore = create<SettingsDirtyState>((set) => ({
  isDirty: false,
  setDirty: (dirty) => set({ isDirty: dirty }),
}));
