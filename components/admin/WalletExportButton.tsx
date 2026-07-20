"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { getCampaignWalletExport } from "@/lib/actions/admin";

/**
 * WalletExportButton
 * --------------------
 * The export itself (which rows are allowed to be returned — accepted
 * entries for ONE campaign only) is enforced server-side, in the RPC. This
 * component's only job is calling that, then turning the result into a CSV
 * file the browser downloads — no separate API route needed for that, since
 * a Server Action can already return the data directly.
 */
export function WalletExportButton({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setLoading(true);

    const result = await getCampaignWalletExport(campaignId);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (result.rows.length === 0) {
      setError("No accepted entries to export yet.");
      return;
    }

    const header = "x_handle,wallet_address,submission_url,reviewed_at";
    const lines = result.rows.map((row) =>
      [row.x_handle, row.wallet_address, row.submission_url, row.reviewed_at]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header, ...lines].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `campaign-${campaignId}-wallets.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 font-body text-sm font-medium text-white transition-colors hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        Export accepted wallets
      </button>
      {error && <p className="mt-2 font-body text-xs text-red-400">{error}</p>}
    </div>
  );
}
