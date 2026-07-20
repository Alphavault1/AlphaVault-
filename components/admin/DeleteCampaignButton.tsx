"use client";

/**
 * DeleteCampaignButton
 * -----------------------
 * Typing the literal word "DELETE" is the confirmation — a deliberately
 * higher bar than a plain confirm() dialog (unlike Reject/Ban elsewhere in
 * this admin area), since this is the one admin action with no undo: once
 * delete_campaign runs, the campaign and every entry in it are gone, and
 * every affected member's counters have already been reversed.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteCampaign } from "@/lib/actions/admin";

export function DeleteCampaignButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setError(null);
    if (confirmation !== "DELETE") {
      setError('Type "DELETE" exactly to confirm.');
      return;
    }
    setPending(true);
    const result = await deleteCampaign({ campaignId, confirmation });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/admin/campaign");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-5 py-2.5 font-body text-sm font-medium text-red-400 transition-colors hover:border-red-500/60 hover:bg-red-500/10"
      >
        <Trash2 size={16} />
        Delete campaign
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
      <p className="font-body text-sm text-white">
        This permanently deletes the campaign and every entry in it. Affected
        members&rsquo; earnings and counts will be adjusted automatically.
        This can&rsquo;t be undone.
      </p>
      <p className="mt-3 font-body text-xs text-slate">
        Type <span className="font-semibold text-white">DELETE</span> to confirm.
      </p>
      <input
        type="text"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        className="mt-2 w-full max-w-[200px] rounded-xl border border-white/10 bg-black px-4 py-2.5 font-body text-sm text-white focus:border-red-500 focus:outline-none"
      />
      {error && <p className="mt-2 font-body text-xs text-red-400">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2 font-body text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : "Confirm delete"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmation("");
            setError(null);
          }}
          disabled={pending}
          className="rounded-full border border-white/15 px-5 py-2 font-body text-sm text-slate transition-colors hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
