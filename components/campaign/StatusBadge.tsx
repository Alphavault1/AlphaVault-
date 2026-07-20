/**
 * StatusBadge
 * -----------
 * One small component reused everywhere a status needs showing — campaign
 * status (draft/live/closed), entry status (pending/accepted/rejected),
 * member verification (pending/approved/rejected). Three visual buckets
 * cover all of them: positive (gold), neutral/waiting (slate), negative
 * (red) — matching colors already used elsewhere on this site (the red-400
 * error states in the Campaign auth forms), not a new palette.
 */

const POSITIVE = new Set(["live", "accepted", "approved"]);
const NEGATIVE = new Set(["closed", "rejected", "banned"]);

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = POSITIVE.has(status) ? "positive" : NEGATIVE.has(status) ? "negative" : "neutral";

  const toneClasses = {
    positive: "border-gold/40 text-gold",
    neutral: "border-white/15 text-slate",
    negative: "border-red-500/40 text-red-400",
  }[tone];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-body text-xs uppercase tracking-wide ${toneClasses}`}
    >
      {status}
    </span>
  );
}
