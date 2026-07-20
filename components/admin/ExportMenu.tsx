"use client";

/**
 * ExportMenu
 * ------------
 * Three distinct exports, each serving a different admin task:
 *   - Wallets   — accepted entries only, for running payouts.
 *   - Submissions — every entry regardless of status, for a first-pass
 *     content review before deciding anything.
 *   - Links only — just the submitted URLs, one per line, for quickly
 *     skimming through content without any of the surrounding data.
 * All three call a server action (not an API route) and turn the result
 * into a client-side download — no separate export endpoint needed for
 * that, since a Server Action can already return the data directly.
 */

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { getCampaignWalletExport, getCampaignSubmissionsExport } from "@/lib/actions/admin";

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toCsvRow(values: unknown[]) {
  return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
}

export function ExportMenu({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState<"wallets" | "submissions" | "links" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleWallets() {
    setError(null);
    setLoading("wallets");
    const result = await getCampaignWalletExport(campaignId);
    setLoading(null);
    if (!result.ok) return setError(result.error);
    if (result.rows.length === 0) return setError("No accepted entries to export yet.");

    const csv = [
      toCsvRow(["x_handle", "wallet_address", "submission_url", "reviewed_at"]),
      ...result.rows.map((r) => toCsvRow([r.x_handle, r.wallet_address, r.submission_url, r.reviewed_at])),
    ].join("\n");
    downloadFile(`campaign-${campaignId}-wallets.csv`, csv, "text/csv;charset=utf-8;");
  }

  async function handleSubmissions() {
    setError(null);
    setLoading("submissions");
    const result = await getCampaignSubmissionsExport(campaignId);
    setLoading(null);
    if (!result.ok) return setError(result.error);
    if (result.rows.length === 0) return setError("No entries to export yet.");

    const csv = [
      toCsvRow(["x_handle", "submission_url", "status", "submitted_at"]),
      ...result.rows.map((r) => toCsvRow([r.x_handle, r.submission_url, r.status, r.submitted_at])),
    ].join("\n");
    downloadFile(`campaign-${campaignId}-submissions.csv`, csv, "text/csv;charset=utf-8;");
  }

  async function handleLinksOnly() {
    setError(null);
    setLoading("links");
    const result = await getCampaignSubmissionsExport(campaignId);
    setLoading(null);
    if (!result.ok) return setError(result.error);
    if (result.rows.length === 0) return setError("No entries to export yet.");

    const text = result.rows.map((r) => r.submission_url).join("\n");
    downloadFile(`campaign-${campaignId}-links.txt`, text, "text/plain;charset=utf-8;");
  }

  const buttonClass =
    "inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 font-body text-xs font-medium text-white transition-colors hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleWallets} disabled={loading !== null} className={buttonClass}>
          {loading === "wallets" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Accepted wallets
        </button>
        <button type="button" onClick={handleSubmissions} disabled={loading !== null} className={buttonClass}>
          {loading === "submissions" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          All submissions
        </button>
        <button type="button" onClick={handleLinksOnly} disabled={loading !== null} className={buttonClass}>
          {loading === "links" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Links only
        </button>
      </div>
      {error && <p className="mt-2 font-body text-xs text-red-400">{error}</p>}
    </div>
  );
}
