"use client";

/**
 * PurgeCountdown
 * --------------
 * Live countdown to the next Purge Day — the last day of the current month.
 *
 * Hydration safety: the remaining time depends on `Date.now()`, which differs
 * between the server render and the client. To avoid a hydration mismatch we
 * render neutral placeholders ("--") until the component has mounted on the
 * client, then start ticking. Nothing time-dependent is rendered during SSR.
 *
 * Layout: a fluid 4-column grid so it never overflows — the four cells share
 * the available width evenly and shrink together on the narrowest phones
 * (down to ~320px), rather than relying on fixed pixel widths.
 */

import { useEffect, useState } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** The next Purge Day: last calendar day of the current month, end of day. */
function getNextPurgeDate(now: Date): Date {
  // `day 0` of the *next* month resolves to the last day of the current month.
  let target = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 0);
  // If we're somehow already past it, roll to the following month.
  if (now.getTime() > target.getTime()) {
    target = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 0);
  }
  return target;
}

function computeTimeLeft(): TimeLeft {
  const now = new Date();
  const diff = Math.max(0, getNextPurgeDate(now).getTime() - now.getTime());

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const UNITS: { key: keyof TimeLeft; label: string }[] = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hrs" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Sec" },
];

export function PurgeCountdown() {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setMounted(true);
    setTimeLeft(computeTimeLeft());
    const id = setInterval(() => setTimeLeft(computeTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  // Two-digit padding; "--" before mount so SSR and first client paint match.
  const display = (value: number | undefined): string =>
    mounted && value !== undefined ? String(value).padStart(2, "0") : "--";

  return (
    <div
      className="grid grid-cols-4 gap-2 sm:gap-3"
      role="timer"
      aria-label="Time remaining until the next Purge Day"
    >
      {UNITS.map((unit) => (
        <div
          key={unit.key}
          className="flex min-w-0 flex-col items-center rounded-xl border border-white/10 bg-black px-1 py-3 sm:px-2 sm:py-4"
        >
          <span className="font-body text-xl font-semibold tabular-nums text-gold sm:text-2xl md:text-3xl">
            {display(timeLeft?.[unit.key])}
          </span>
          <span className="mt-1 text-[9px] uppercase tracking-eyebrow text-muted sm:text-[10px]">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
}
