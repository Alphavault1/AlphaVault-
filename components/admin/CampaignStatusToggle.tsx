"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateCampaignStatus } from "@/lib/actions/admin";

const STATUSES = ["draft", "live", "closed"] as const;

export function CampaignStatusToggle({
  campaignId,
  currentStatus,
}: {
  campaignId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  // Displayed optimistically — updated the instant the change succeeds,
  // rather than waiting for router.refresh() to re-fetch the whole page
  // just to reflect a one-column change. That refresh still happens below
  // (so the header's separate StatusBadge, rendered from the original
  // server data, stays in sync too) — it just no longer blocks this
  // component's own visual feedback, which is what made a simple toggle
  // feel like it was reloading the entire page.
  const [displayedStatus, setDisplayedStatus] = useState(currentStatus);
  // Tracks WHICH button was actually clicked. Previously this was just a
  // boolean, which meant the spinner logic (pending && s !== currentStatus)
  // showed a spinner on BOTH non-current buttons at once — not just the one
  // someone actually clicked, since neither of them equalled the old status
  // either. That's the "two spinning icons" bug from the screenshot.
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(status: (typeof STATUSES)[number]) {
    if (status === displayedStatus) return;
    setError(null);
    setPendingStatus(status);

    const result = await updateCampaignStatus({ campaignId, status });
    setPendingStatus(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setDisplayedStatus(status);
    router.refresh();
  }

  return (
    <div>
      <div className="flex gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleChange(s)}
            disabled={pendingStatus !== null}
            className={`rounded-full border px-4 py-2 font-body text-xs uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              s === displayedStatus
                ? "border-gold bg-gold text-black"
                : "border-white/15 text-slate hover:border-white/30 hover:text-white"
            }`}
          >
            {pendingStatus === s ? <Loader2 size={12} className="animate-spin" /> : s}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 font-body text-xs text-red-400">{error}</p>}
    </div>
  );
}
