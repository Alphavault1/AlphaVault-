"use client";

/**
 * DuplicateCampaignButton
 * --------------------------
 * A single click, unlike DeleteCampaignButton's typed confirmation — because
 * the two actions have very different blast radii. Delete is irreversible
 * and touches real entries and real people's counters; duplicate produces
 * one new, inert DRAFT campaign nobody can see or enter yet. If it's not
 * wanted, it's just deleted like any other unwanted draft — there's nothing
 * here that needs a confirmation gate.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy } from "lucide-react";
import { duplicateCampaign } from "@/lib/actions/admin";
import { PILL_BUTTON_CLASS } from "@/components/ui/buttonStyles";

export function DuplicateCampaignButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDuplicate() {
    setError(null);
    setPending(true);
    const result = await duplicateCampaign(campaignId);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    // Straight to the new draft's edit page — reviewing/adjusting it before
    // anyone deliberately flips it live is the whole point of forcing draft
    // status on the copy in the first place.
    router.push(`/admin/campaign/${result.campaignId}/edit`);
  }

  return (
    <div>
      <button type="button" onClick={handleDuplicate} disabled={pending} className={PILL_BUTTON_CLASS}>
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
        Duplicate campaign
      </button>
      {error && <p className="mt-1.5 font-body text-xs text-red-400">{error}</p>}
    </div>
  );
}
