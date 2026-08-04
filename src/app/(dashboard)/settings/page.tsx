import { redirect } from "next/navigation";
import { DEFAULT_SETTINGS_TAB } from "@/features/settings/config/settings-tabs";

export default function SettingsIndexPage() {
  redirect(`/settings/${DEFAULT_SETTINGS_TAB}`);
}
