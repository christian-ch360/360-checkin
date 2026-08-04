"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CameraDevice, Html5Qrcode } from "html5-qrcode";
import { QrCode, Loader2, Flashlight, FlashlightOff, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ScannerState = "idle" | "starting" | "scanning" | "stopping" | "stopped";

const SCAN_CONFIG = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 };
const CAMERA_STORAGE_KEY = "ch360:qr-scanner:last-camera";
// getUserMedia (called inside getCameras()/scanner.start()) needs to run as
// close to the click's synchronous gesture as possible -- iOS Safari in
// particular can silently withhold the permission prompt if too much async
// work (a dynamic import, a network fetch) happens between the click and the
// call. html5-qrcode is preloaded on mount for this reason (see the useEffect
// below); this constant only bounds how long we wait once the call is made.
const CAMERA_TIMEOUT_MS = 10000;

let html5QrcodeModulePromise: Promise<typeof Html5Qrcode> | null = null;

async function loadHtml5Qrcode() {
  html5QrcodeModulePromise ??= import("html5-qrcode").then((mod) => mod.Html5Qrcode);
  return html5QrcodeModulePromise;
}

class CameraTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CameraTimeoutError";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new CameraTimeoutError(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function getSavedCameraId(): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(CAMERA_STORAGE_KEY) : null;
  } catch (err) {
    console.warn("Scanner camera preference read:", err);
    return null;
  }
}

function saveCameraId(id: string) {
  try {
    window.localStorage.setItem(CAMERA_STORAGE_KEY, id);
  } catch (err) {
    console.warn("Scanner camera preference save:", err);
  }
}

function pickDefaultCamera(cameras: CameraDevice[]): CameraDevice | undefined {
  const saved = getSavedCameraId();
  const savedMatch = saved && cameras.find((c) => c.id === saved);
  if (savedMatch) return savedMatch;
  const rear = cameras.find((c) => /back|rear|environment/i.test(c.label));
  return rear ?? cameras[0];
}

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof Error ? err.name : "";
  if (name === "CameraTimeoutError") {
    return "Camera didn't respond in time. If your browser is showing a permission prompt, allow it and try again.";
  }
  if (name === "NotAllowedError") {
    return "Camera access was denied. Allow camera permissions in your browser and try again.";
  }
  if (name === "NotFoundError" || name === "NotFoundException") {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The camera is already in use by another app. Close it and try again.";
  }
  if (err instanceof Error && err.message) {
    return `We couldn't access the camera: ${err.message}`;
  }
  return "We couldn't access the camera. Please try again.";
}

function playSuccessBeep() {
  try {
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.25);
    oscillator.onended = () => ctx.close();
  } catch (err) {
    console.warn("Scanner beep:", err);
  }
}

/**
 * Mobile-first QR scanner backed by html5-qrcode.
 *
 * The scanner instance is created lazily (once) on first Start click and stored in a ref
 * so re-renders never spawn a second instance. `stop()` is only ever called while the
 * tracked state is "scanning" -- calling it from any other state throws inside the library.
 * html5-qrcode's module is preloaded on mount (not on click) so the actual
 * getUserMedia call happens as close to the click's user gesture as possible --
 * see CAMERA_TIMEOUT_MS's comment for why that gap matters on iOS Safari.
 */
export function QRScanner({
  onScan,
  successLabel = "Check In Successful",
}: {
  onScan: (token: string) => void;
  successLabel?: string;
}) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const elementId = `qr-reader-${rawId}`;

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const stateRef = useRef<ScannerState>("idle");
  // Guards the actual scanner.start() call specifically -- distinct from
  // scannerState, which legitimately sits at "starting" for the whole
  // enumerate-then-start sequence. Checking scannerState here would make
  // startWithCamera reject the exact "starting" state handleStart just put
  // it in, which is what was silently swallowing every start attempt before.
  const startInFlightRef = useRef(false);

  const [scannerState, setScannerStateRaw] = useState<ScannerState>("idle");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const setScannerState = useCallback((next: ScannerState) => {
    stateRef.current = next;
    setScannerStateRaw(next);
  }, []);

  // Warm the html5-qrcode module cache as soon as this screen mounts, well
  // before any click. If we only imported it inside handleStart, the click
  // would trigger a network fetch for the chunk and then await it before
  // ever calling getUserMedia -- and browsers with strict "transient
  // activation" rules for camera access (iOS Safari especially) can silently
  // withhold the permission prompt once that gap gets too long, so nothing
  // ever appears to happen and the promise just hangs.
  useEffect(() => {
    loadHtml5Qrcode().catch((err) => console.warn("Scanner preload:", err));
  }, []);

  const getScanner = useCallback(async () => {
    if (!scannerRef.current) {
      const Html5QrcodeCtor = await loadHtml5Qrcode();
      scannerRef.current = new Html5QrcodeCtor(elementId, false);
    }
    return scannerRef.current;
  }, [elementId]);

  const detectTorchSupport = useCallback((scanner: Html5Qrcode) => {
    try {
      const torch = scanner.getRunningTrackCameraCapabilities().torchFeature();
      setTorchSupported(torch.isSupported());
    } catch (err) {
      console.warn("Torch detection:", err);
      setTorchSupported(false);
    }
  }, []);

  const handleSuccess = useCallback(
    (decodedText: string) => {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(150);
        } catch (err) {
          console.warn("Scanner vibrate:", err);
        }
      }
      playSuccessBeep();
      setSuccess(decodedText);
      setTorchOn(false);

      const scanner = scannerRef.current;
      if (scanner && stateRef.current === "scanning") {
        setScannerState("stopping");
        scanner
          .stop()
          .catch((err) => console.warn("Scanner cleanup:", err))
          .finally(() => setScannerState("stopped"));
      }

      onScan(decodedText);
    },
    [onScan, setScannerState]
  );

  const startWithCamera = useCallback(
    async (cameraId: string) => {
      console.log("startWithCamera: called with cameraId =", cameraId);
      if (startInFlightRef.current) {
        console.log("startWithCamera: bailing, a start is already in flight");
        return;
      }
      if (stateRef.current === "scanning") {
        console.log("startWithCamera: bailing, already scanning");
        return;
      }
      startInFlightRef.current = true;
      setScannerState("starting");
      setError(null);
      try {
        console.log("startWithCamera: getting/creating Html5Qrcode instance…");
        const scanner = await getScanner();
        console.log("startWithCamera: instance ready, calling scanner.start()…");
        await withTimeout(
          scanner.start(cameraId, SCAN_CONFIG, handleSuccess, () => {
            // Per-frame "no QR in view" noise -- expected, not an error.
          }),
          CAMERA_TIMEOUT_MS,
          "scanner.start() did not settle in time"
        );
        console.log("startWithCamera: scanner.start() resolved — camera is live");
        setScannerState("scanning");
        detectTorchSupport(scanner);
        saveCameraId(cameraId);
      } catch (err) {
        console.error("startWithCamera: scanner.start() rejected:", err);
        setError(cameraErrorMessage(err));
        setScannerState("idle");
      } finally {
        startInFlightRef.current = false;
      }
    },
    [detectTorchSupport, getScanner, handleSuccess, setScannerState]
  );

  const handleStart = useCallback(async () => {
    console.log("Start Scanner clicked");
    if (stateRef.current === "scanning" || stateRef.current === "starting") {
      console.log("handleStart: bailing, state is already", stateRef.current);
      return;
    }
    setError(null);
    setSuccess(null);
    setScannerState("starting");
    try {
      console.log("handleStart: loading html5-qrcode module…");
      const Html5QrcodeCtor = await loadHtml5Qrcode();
      console.log("handleStart: module loaded, calling getCameras()…");
      const devices = await withTimeout(
        Html5QrcodeCtor.getCameras(),
        CAMERA_TIMEOUT_MS,
        "getCameras() did not settle in time"
      );
      console.log("handleStart: getCameras() resolved with", devices);
      if (!devices || devices.length === 0) {
        setError("No camera was found on this device.");
        setScannerState("idle");
        return;
      }
      setCameras(devices);
      const defaultCamera = pickDefaultCamera(devices);
      console.log("handleStart: default camera picked:", defaultCamera);
      if (!defaultCamera) {
        setError("No camera was found on this device.");
        setScannerState("idle");
        return;
      }
      setSelectedCameraId(defaultCamera.id);
      await startWithCamera(defaultCamera.id);
    } catch (err) {
      console.error("handleStart: camera enumeration failed:", err);
      setError(cameraErrorMessage(err));
      setScannerState("idle");
    }
  }, [setScannerState, startWithCamera]);

  const handleStop = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner || stateRef.current !== "scanning") return;
    setScannerState("stopping");
    try {
      await scanner.stop();
    } catch (err) {
      console.warn("Scanner cleanup:", err);
    } finally {
      setTorchOn(false);
      setScannerState("stopped");
    }
  }, [setScannerState]);

  const handleSwitchCamera = useCallback(
    async (cameraId: string) => {
      setSelectedCameraId(cameraId);
      const scanner = scannerRef.current;
      if (scanner && stateRef.current === "scanning") {
        try {
          await scanner.stop();
        } catch (err) {
          console.warn("Scanner cleanup:", err);
        }
        setTorchOn(false);
        // Without this, stateRef.current stays "scanning" after stop(), and
        // startWithCamera's own "already scanning" guard below would then
        // reject the restart on the new camera -- same shape of bug as the
        // starting/starting deadlock this file just got fixed for.
        setScannerState("stopped");
      }
      await startWithCamera(cameraId);
    },
    [startWithCamera, setScannerState]
  );

  const handleToggleTorch = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner || stateRef.current !== "scanning") return;
    try {
      const torch = scanner.getRunningTrackCameraCapabilities().torchFeature();
      const next = !torchOn;
      await torch.apply(next);
      setTorchOn(next);
    } catch (err) {
      console.warn("Torch toggle:", err);
    }
  }, [torchOn]);

  // Unmount cleanup. Never calls stop() unless the ref says we're actually scanning,
  // and never lets a rejected promise escape into React.
  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner && stateRef.current === "scanning") {
        scanner
          .stop()
          .catch((err) => console.warn("Scanner cleanup:", err))
          .finally(() => {
            try {
              scanner.clear();
            } catch (err) {
              console.warn("Scanner cleanup:", err);
            }
          });
      }
    };
  }, []);

  const isBusy = scannerState === "starting" || scannerState === "stopping";
  const isVisible = scannerState === "scanning" || scannerState === "starting";

  const subtitle =
    error ??
    (scannerState === "scanning"
      ? "Align the QR code inside the frame."
      : scannerState === "starting"
        ? "Starting camera…"
        : scannerState === "stopping"
          ? "Stopping…"
          : "Scan your CreatorHub360 QR code");

  return (
    <Card className="mx-auto w-full border shadow-sm sm:max-w-[700px]">
      <CardContent className="space-y-4 p-4 text-center sm:p-6">
        {success ? (
          <div
            role="status"
            aria-live="polite"
            className="animate-in zoom-in-50 fade-in flex flex-col items-center gap-3 py-8 duration-300"
          >
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="size-9" />
            </div>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">✓ {successLabel}</p>
          </div>
        ) : (
          <>
            <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <QrCode className="size-5" />
            </div>
            <div>
              <p className="text-base font-semibold sm:text-lg">QR Check In</p>
              <p className={cn("text-sm", error ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
                {subtitle}
              </p>
            </div>
          </>
        )}

        <div className="relative">
          {isVisible && <span className="sr-only">Live camera preview for scanning a QR code</span>}
          <div
            id={elementId}
            className={isVisible ? "mx-auto w-full overflow-hidden rounded-2xl border bg-black" : "hidden"}
          />
          {isVisible && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative aspect-square w-[72%] max-w-[280px] overflow-hidden rounded-2xl">
                <div className="absolute inset-0 rounded-2xl border-2 border-white/60" />
                <div className="absolute left-0 top-0 size-7 rounded-tl-2xl border-l-4 border-t-4 border-primary" />
                <div className="absolute right-0 top-0 size-7 rounded-tr-2xl border-r-4 border-t-4 border-primary" />
                <div className="absolute bottom-0 left-0 size-7 rounded-bl-2xl border-b-4 border-l-4 border-primary" />
                <div className="absolute bottom-0 right-0 size-7 rounded-br-2xl border-b-4 border-r-4 border-primary" />
                {scannerState === "scanning" && (
                  <div className="animate-qr-scan-line absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_8px_var(--color-primary)]" />
                )}
              </div>
            </div>
          )}
        </div>

        {isVisible && cameras.length > 1 && (
          <Select value={selectedCameraId ?? undefined} onValueChange={handleSwitchCamera}>
            <SelectTrigger className="h-12 w-full text-base" aria-label="Choose camera">
              <SelectValue placeholder="Choose camera" />
            </SelectTrigger>
            <SelectContent>
              {cameras.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-base">
                  {c.label || "Camera"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="max-md:sticky max-md:bottom-0 max-md:-mx-4 max-md:border-t max-md:bg-card/95 max-md:p-4 max-md:pt-3 max-md:backdrop-blur">
          <div className="flex items-center gap-2">
            {scannerState === "scanning" ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 text-base"
                onClick={handleStop}
                disabled={isBusy}
                aria-label="Stop Scanner"
              >
                Stop Scanner
              </Button>
            ) : (
              <Button
                type="button"
                className="h-12 flex-1 text-base"
                onClick={handleStart}
                disabled={isBusy}
                aria-label={success ? "Scan again" : "Start Scanner"}
              >
                {isBusy && <Loader2 className="size-4 animate-spin" />}
                {success ? "Scan Again" : error ? "Try Again" : "Start Scanner"}
              </Button>
            )}

            {scannerState === "scanning" && torchSupported && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-12 shrink-0"
                onClick={handleToggleTorch}
                aria-label={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
                aria-pressed={torchOn}
              >
                {torchOn ? <FlashlightOff className="size-5" /> : <Flashlight className="size-5" />}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
