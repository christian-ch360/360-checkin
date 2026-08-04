"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, RotateCw } from "lucide-react";
import type { NotificationType } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NOTIFICATION_TYPE_META } from "@/lib/notification-meta";

type NotificationDTO = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

type LoadResult = { ok: true; notifications: NotificationDTO[]; unreadCount: number } | { ok: false };

const REQUEST_TIMEOUT_MS = 8000;

function describeStatus(status: number): string {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not found";
  if (status >= 500) return "server error";
  return `unexpected status ${status}`;
}

/**
 * Never throws — every failure path (network, timeout, non-2xx, malformed JSON) is caught
 * and logged here, resolving to a safe { ok: false } instead of rejecting, so callers never
 * need their own try/catch and the component can never surface an uncaught fetch rejection.
 *
 * Creates its own AbortController + timeout on every call — never shared across polling
 * cycles. The previous version hoisted a single controller/timeout to the enclosing effect
 * and reused it for every interval tick: once the 8s timeout fired once, `signal.aborted`
 * stayed permanently true, so every subsequent poll rejected instantly with AbortError
 * regardless of whether the server was actually responding — a real, production bug, not a
 * dev-only artifact. `onController` lets the caller observe the in-flight controller so it
 * can be aborted on unmount, without the controller itself ever being reused between calls.
 */
async function fetchNotifications(onController?: (controller: AbortController) => void): Promise<LoadResult> {
  const controller = new AbortController();
  onController?.(controller);
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let res: Response;
    try {
      res = await fetch("/api/notifications", { signal: controller.signal });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        console.error("[NotificationsMenu] GET /api/notifications timed out after", REQUEST_TIMEOUT_MS, "ms");
      } else {
        console.error("[NotificationsMenu] GET /api/notifications network failure:", err);
      }
      return { ok: false };
    }

    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch {
        // body unreadable — ignore, we still have the status code
      }
      console.error(
        `[NotificationsMenu] GET /api/notifications failed (${describeStatus(res.status)}): HTTP ${res.status} ${detail}`.trim()
      );
      return { ok: false };
    }

    try {
      const data = await res.json();
      return {
        ok: true,
        notifications: Array.isArray(data?.notifications) ? data.notifications : [],
        unreadCount: typeof data?.unreadCount === "number" ? data.unreadCount : 0,
      };
    } catch (err) {
      console.error("[NotificationsMenu] GET /api/notifications returned malformed JSON:", err);
      return { ok: false };
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

export function NotificationsMenu() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Tracks whichever controller the currently in-flight fetchNotifications() call created,
    // purely so unmount can abort it — never reused across calls, unlike the old shared one.
    let activeController: AbortController | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    // True while document.hidden — blocks scheduleNext() from queuing a future poll. A tab
    // that's merely paused (not unmounted) still needs its own flag distinct from `cancelled`.
    let paused = document.hidden;
    // Single source of truth for "a fetch is currently running," shared by the normal poll
    // cycle *and* every out-of-cycle trigger below (visibility restore, focus, online) — this
    // is what actually satisfies "no duplicate/overlapping requests" now that requests can be
    // kicked off from more than one place; recursive setTimeout alone only serializes the
    // timer's own ticks, not these independent event-driven ones.
    let isFetching = false;

    async function runLoad() {
      if (isFetching) return;
      isFetching = true;
      setLoading(true);
      const result = await fetchNotifications((controller) => {
        activeController = controller;
      });
      activeController = null;
      isFetching = false;
      if (cancelled) return;
      if (result.ok) {
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
        setLoadFailed(false);
      } else {
        setNotifications([]);
        setUnreadCount(0);
        setLoadFailed(true);
      }
      setLoading(false);
    }

    // Re-arms the next tick unless the effect has been torn down or the tab is hidden —
    // this is where "pause while hidden" actually takes effect, since it's the only place a
    // future poll gets queued.
    function scheduleNext() {
      clearTimeout(timeoutId);
      if (cancelled || paused) return;
      timeoutId = setTimeout(poll, 30000);
    }

    // Recursive setTimeout rather than setInterval: the next poll is scheduled only once
    // the current one finishes, so overlap within the polling cycle itself is impossible by
    // construction, a slow request naturally pushes the next poll back instead of stacking up
    // skipped ticks, and there's no interval-drift to accumulate over a long session.
    async function poll() {
      await runLoad();
      scheduleNext();
    }

    // Shared by every "refresh right now, outside the normal cycle" trigger below. Clears
    // whatever tick was pending so it doesn't also fire moments later, runs (or, via the
    // isFetching guard inside runLoad, no-ops into) a fetch, then re-arms the normal cycle.
    async function refreshNow() {
      clearTimeout(timeoutId);
      await runLoad();
      scheduleNext();
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        paused = true;
        clearTimeout(timeoutId);
      } else {
        paused = false;
        refreshNow();
      }
    }

    function handleFocus() {
      refreshNow();
    }

    function handleOnline() {
      refreshNow();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    poll();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      activeController?.abort();
      clearTimeout(timeoutId);
    };
  }, [retryToken]);

  const retry = useCallback(() => setRetryToken((n) => n + 1), []);

  async function markRead(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (!res.ok) {
        console.error(`[NotificationsMenu] POST /api/notifications/${id}/read failed: HTTP ${res.status}`);
        return;
      }
    } catch (err) {
      console.error(`[NotificationsMenu] POST /api/notifications/${id}/read network failure:`, err);
      return;
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    const previous = notifications;
    const previousUnread = unreadCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    try {
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
      if (!res.ok) {
        console.error(`[NotificationsMenu] POST /api/notifications/mark-all-read failed: HTTP ${res.status}`);
        setNotifications(previous);
        setUnreadCount(previousUnread);
      }
    } catch (err) {
      console.error("[NotificationsMenu] POST /api/notifications/mark-all-read network failure:", err);
      setNotifications(previous);
      setUnreadCount(previousUnread);
    }
  }

  function handleSelect(n: NotificationDTO) {
    if (!n.readAt) markRead(n.id);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3" /> Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {loading && notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Loading notifications…</p>
        ) : loadFailed ? (
          <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">No notifications</p>
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <RotateCw className="size-3" /> Retry
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => {
              const Icon = NOTIFICATION_TYPE_META[n.type]?.icon ?? Bell;
              return (
                <DropdownMenuItem
                  key={n.id}
                  className={cn("flex items-start gap-2 whitespace-normal", !n.readAt && "bg-primary/5")}
                  onSelect={(e) => {
                    e.preventDefault();
                    handleSelect(n);
                  }}
                >
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-sm font-medium">{n.title}</span>
                    {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
