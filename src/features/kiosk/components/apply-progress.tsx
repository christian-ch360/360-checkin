const STEP_LABELS = ["Welcome", "About You", "Details"];

export function ApplyProgress({ step }: { step: number }) {
  return (
    <div className="flex w-full items-center gap-3">
      {STEP_LABELS.map((label, i) => {
        const index = i + 1;
        const active = index === step;
        const done = index < step;
        return (
          <div key={label} className="flex flex-1 items-center gap-3">
            <div className="flex flex-1 flex-col items-center gap-2">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  done
                    ? "bg-black text-white"
                    : active
                      ? "border-2 border-black bg-transparent text-black"
                      : "border border-black/15 bg-black/[0.02] text-black/40"
                }`}
              >
                {done ? "✓" : index}
              </span>
              <span className={`text-xs font-medium tracking-wide uppercase ${active || done ? "text-black/70" : "text-black/30"}`}>
                {label}
              </span>
            </div>
            {index < STEP_LABELS.length && (
              <span className={`mb-5 h-px flex-1 transition-colors ${done ? "bg-black/30" : "bg-black/10"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
