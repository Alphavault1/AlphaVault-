"use client";

/**
 * EntryReviewTable
 * -----------------
 * One row per entry. Pending rows get Approve/Reject; already-reviewed rows
 * just show their final status — matching the RPC's own idempotency (once
 * reviewed, it can't be reviewed again, so the UI doesn't offer the option).
 *
 * A plain browser confirm() gates Reject specifically (not Approve) — a
 * lightweight, appropriate amount of friction for the one action that has no
 * undo and directly affects someone's standing, without building a custom
 * confirmation modal for an internal admin tool.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/campaign/StatusBadge";
import { reviewCampaignEntry } from "@/lib/actions/admin";

export interface ReviewEntryRow {
  id: string;
  xHandle: string;
  submissionUrl: string;
  walletAddress: string;
  status: string;
  reviewNote: string | null;
  submittedAt: string;
}

export function EntryReviewTable({ entries }: { entries: ReviewEntryRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReview(entryId: string, status: "accepted" | "rejected") {
    if (status === "rejected") {
      const confirmed = window.confirm(
        "Reject this entry? This can't be undone through the dashboard.",
      );
      if (!confirmed) return;
    }

    setError(null);
    setPendingId(entryId);

    const result = await reviewCampaignEntry({ entryId, status, reviewNote: null });
    setPendingId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-white/5 bg-surface-900 p-8 text-center font-body text-slate">
        No entries yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="font-body text-sm text-red-400">
          {error}
        </p>
      )}

      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-surface-900 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <p className="font-body font-semibold text-white">@{entry.xHandle}</p>
              <StatusBadge status={entry.status} />
            </div>
            <a
              href={entry.submissionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 font-body text-sm text-bronze transition-colors hover:text-gold"
            >
              View post <ExternalLink size={12} />
            </a>
            <p className="mt-1 truncate font-body text-xs text-muted">
              Wallet: {entry.walletAddress}
            </p>
          </div>

          {entry.status === "pending" && (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => handleReview(entry.id, "accepted")}
                disabled={pendingId === entry.id}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingId === entry.id ? <Loader2 size={14} className="animate-spin" /> : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => handleReview(entry.id, "rejected")}
                disabled={pendingId === entry.id}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:border-red-500/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
