"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfettiBurst } from "@/features/kiosk/components/confetti-burst";

function playSuccessTone() {
  try {
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, ctx.currentTime);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
    oscillator.onended = () => ctx.close();
  } catch (err) {
    console.warn("Kiosk success tone:", err);
  }
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

type Props =
  | { outcome: "checked_in"; memberName: string; profilePhotoUrl: string | null; time: string }
  | { outcome: "checked_out"; memberName: string; profilePhotoUrl: string | null; duration: string };

export function SuccessScreen(props: Props) {
  const isCheckIn = props.outcome === "checked_in";

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch (err) {
        console.warn("Kiosk success vibrate:", err);
      }
    }
    playSuccessTone();
  }, []);

  return (
    <div role="status" aria-live="polite" className="flex w-full max-w-md flex-col items-center gap-6 text-center">
      <ConfettiBurst />

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="relative"
      >
        <Avatar className="size-24 border-2 border-emerald-400/40">
          {props.profilePhotoUrl && <AvatarImage src={props.profilePhotoUrl} alt={props.memberName} />}
          <AvatarFallback className="bg-emerald-500/15 text-2xl text-emerald-400">
            {initials(props.memberName)}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-emerald-500 text-black">
          <CheckCircle2 className="size-5" />
        </span>
      </motion.div>

      <div className="space-y-1">
        <p className="text-2xl font-semibold text-emerald-500">
          {isCheckIn ? "Welcome back!" : "Check Out Successful"}
        </p>
        <p className="text-4xl font-semibold tracking-tight text-balance text-black">{props.memberName}</p>
      </div>

      <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-6 py-3">
        <p className="text-sm tracking-wide text-black/50 uppercase">{isCheckIn ? "Checked In" : "Duration Today"}</p>
        <p className="text-2xl font-semibold text-black tabular-nums">{isCheckIn ? props.time : props.duration}</p>
      </div>

      <p className="text-black/50">{isCheckIn ? "You have been checked in." : "Have a great day!"}</p>
    </div>
  );
}
