"use client";

/**
 * OPTIMISTIC FEEDBACK — see MemberTable.tsx for the full explanation of the
 * underlying bug this addresses across the app. This form has no separate
 * badge/row to patch (the input already shows exactly what was typed), so
 * the fix here is a brief, explicit "Saved" confirmation the instant the
 * save succeeds — rather than leaving the admin to guess whether a second
 * click is needed just because nothing visibly changed.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { updateCampaignReference } from "@/lib/actions/admin";

export function CampaignReferenceForm({
  campaignId,
  currentUrl,
}: {
  campaignId: string;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function handleSave() {
    setError(null);
    setJustSaved(false);
    setPending(true);
    const result = await updateCampaignReference({ campaignId, referenceUrl: value });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setJustSaved(true);
    // Clears on its own — a lingering "Saved" label would start to look
    // like a stale claim rather than a fresh confirmation.
    setTimeout(() => setJustSaved(false), 2500);
    router.refresh();
  }

  return (
    <div>
      <label htmlFor="ref-url" className="mb-2 block font-body text-sm text-slate">
        Reference link
        <span className="ml-1 text-muted">(optional — an example post or task instructions)</span>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id="ref-url"
          type="url"
          placeholder="https://x.com/example/status/..."
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setJustSaved(false);
          }}
          className="w-full rounded-xl border border-white/10 bg-black px-4 py-2.5 font-body text-sm text-white placeholder:text-muted focus:border-gold focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-2.5 font-body text-sm text-white transition-colors hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : justSaved ? (
            <>
              <Check size={14} className="text-green-400" />
              Saved
            </>
          ) : (
            "Save"
          )}
        </button>
      </div>
      {error && <p className="mt-1.5 font-body text-xs text-red-400">{error}</p>}
    </div>
  );
}
