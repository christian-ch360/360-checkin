"use client";

import { useEffect, useRef, useState } from "react";

const QUEUE_KEY = "ch360:kiosk:offline-queue";

function readQueue(): string[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: string[]) {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn("Kiosk offline queue write:", err);
  }
}

/**
 * Covers connectivity blips on an already-loaded kiosk — scans made while
 * offline are queued in localStorage and replayed on reconnect. This is not
 * a service worker: it cannot help a kiosk that's offline at page load.
 */
export function useOfflineQueue(replay: (rawScan: string) => Promise<void>) {
  const [isOnline, setIsOnline] = useState(true);
  const replayRef = useRef(replay);
  replayRef.current = replay;

  useEffect(() => {
    setIsOnline(navigator.onLine);

    async function flush() {
      const queue = readQueue();
      if (queue.length === 0) return;
      writeQueue([]);
      for (const token of queue) {
        try {
          await replayRef.current(token);
        } catch (err) {
          console.warn("Kiosk offline queue replay failed:", err);
        }
      }
    }

    function handleOnline() {
      setIsOnline(true);
      void flush();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (navigator.onLine) void flush();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function enqueue(rawScan: string) {
    writeQueue([...readQueue(), rawScan]);
  }

  return { isOnline, enqueue };
}
