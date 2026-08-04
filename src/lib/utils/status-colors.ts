export type StatusTone = "success" | "warning" | "error" | "info" | "community" | "neutral";

export const statusToneClass: Record<StatusTone, string> = {
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  error: "border-destructive/20 bg-destructive/10 text-destructive",
  info: "border-info/20 bg-info/10 text-info",
  community: "border-community/20 bg-community/10 text-community",
  neutral: "border-transparent bg-muted text-muted-foreground",
};
