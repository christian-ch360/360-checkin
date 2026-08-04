/**
 * Single source of truth for Settings' tab list — both the nav labels
 * (SettingsShell) and the route switch (/settings/[tab]/page.tsx) are
 * derived from this array, so they can never drift out of sync the way the
 * old anchor-scroll page's section-id list and each SettingsSectionCard's
 * own hardcoded `id` prop could.
 */
export type SettingsTabId =
  | "profile"
  | "membership"
  | "agency"
  | "qr-code"
  | "security"
  | "change-email"
  | "notifications"
  | "appearance"
  | "active-sessions"
  | "legal"
  | "admin"
  | "developer-tools";

export type SettingsTabDef = { id: SettingsTabId; label: string };

export const SETTINGS_TABS: SettingsTabDef[] = [
  { id: "profile", label: "Profile" },
  { id: "membership", label: "Membership" },
  { id: "agency", label: "Agency" },
  { id: "qr-code", label: "My QR Code" },
  { id: "security", label: "Security" },
  { id: "change-email", label: "Change Email" },
  { id: "notifications", label: "Notifications" },
  { id: "appearance", label: "Appearance" },
  { id: "active-sessions", label: "Active Sessions" },
  { id: "legal", label: "Legal" },
  { id: "admin", label: "Admin" },
  { id: "developer-tools", label: "Developer Tools" },
];

export const DEFAULT_SETTINGS_TAB: SettingsTabId = "profile";

export function isSettingsTabId(value: string): value is SettingsTabId {
  return SETTINGS_TABS.some((t) => t.id === value);
}
