"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { StatusBadge } from "@/components/campaign/StatusBadge";
import { reviewCampaignApplication } from "@/lib/actions/admin";

export interface ReviewApplicationRow {
  id: string;
  xHandle: string;
  status: string;
  reviewNote: string | null;
  appliedAt: string;
}

export function ApplicationReviewTable({ applications }: { applications: ReviewApplicationRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().replace(/^@/, "").toLowerCase();
  const filteredApplications = normalizedSearch
    ? applications.filter((a) => a.xHandle.toLowerCase().includes(normalizedSearch))
    : applications;

  async function handleReview(applicationId: string, status: "approved" | "rejected") {
    if (status === "rejected") {
      const confirmed = window.confirm(
        "Reject this application? This can't be undone through the dashboard.",
      );
      if (!confirmed) return;
    }

    setError(null);
    setPendingId(applicationId);

    const result = await reviewCampaignApplication({ applicationId, status, reviewNote: null });
    setPendingId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  if (applications.length === 0) {
    return (
      <p className="rounded-2xl border border-white/5 bg-surface-900 p-8 text-center font-body text-slate">
        No applications yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Filter by X handle…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black py-2.5 pl-10 pr-4 font-body text-sm text-white placeholder:text-muted focus:border-gold focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="font-body text-sm text-red-400">
          {error}
        </p>
      )}

      {filteredApplications.length === 0 && (
        <p className="rounded-2xl border border-white/5 bg-surface-900 p-8 text-center font-body text-slate">
          No applications match &ldquo;{search}&rdquo;.
        </p>
      )}

      {filteredApplications.map((application) => (
        <div
          key={application.id}
          className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-surface-900 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <p className="font-body font-semibold text-white">@{application.xHandle}</p>
              <StatusBadge status={application.status} />
            </div>
          </div>

          {application.status === "pending" && (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => handleReview(application.id, "approved")}
                disabled={pendingId === application.id}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingId === application.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Approve"
                )}
              </button>
              <button
                type="button"
                onClick={() => handleReview(application.id, "rejected")}
                disabled={pendingId === application.id}
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
