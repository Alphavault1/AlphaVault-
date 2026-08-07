"use client";

/**
 * OPTIMISTIC FEEDBACK — see MemberTable.tsx for the full explanation of the
 * underlying bug. This one's simpler than most: submit_campaign_application
 * already refuses a second application from the same member for the same
 * campaign, so there's no legitimate reason for this button to ever be
 * clickable again after it succeeds once. Rather than re-enable it and hope
 * router.refresh() swaps in the "pending" status card before anyone notices,
 * it transitions to a permanent "Applied" state the instant the action
 * succeeds — no waiting on refresh timing to know whether the click worked.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { submitCampaignApplication } from "@/lib/actions/campaigns";

export function ApplyButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setError(null);
    setPending(true);
    const result = await submitCampaignApplication({ campaignId });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setApplied(true);
    router.refresh();
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={handleApply}
        disabled={pending || applied}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Applying…
          </>
        ) : applied ? (
          <>
            <Check size={16} />
            Applied
          </>
        ) : (
          "Apply to this campaign"
        )}
      </button>
      {error && (
        <p role="alert" className="mt-3 font-body text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
