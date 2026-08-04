"use client";

import { useEffect } from "react";
import { useSettingsDirtyStore } from "@/stores/settings-dirty-store";

/**
 * Mirrors a form's dirty state into the shared settings store so
 * SettingsShell can warn before navigating to another tab or closing the
 * tab. Clears on unmount so a stale "dirty" flag never survives a tab
 * switch — by the time this unmounts, either the user already confirmed
 * leaving (see SettingsShell) or the form was never dirty to begin with.
 */
export function useSettingsFormDirty(isDirty: boolean) {
  const setDirty = useSettingsDirtyStore((s) => s.setDirty);

  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);
}
