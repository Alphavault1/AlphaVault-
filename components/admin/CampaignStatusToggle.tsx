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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(status: (typeof STATUSES)[number]) {
    if (status === currentStatus) return;
    setError(null);
    setPending(true);

    const result = await updateCampaignStatus({ campaignId, status });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

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
            disabled={pending}
            className={`rounded-full border px-4 py-2 font-body text-xs uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              s === currentStatus
                ? "border-gold bg-gold text-black"
                : "border-white/15 text-slate hover:border-white/30 hover:text-white"
            }`}
          >
            {pending && s !== currentStatus ? <Loader2 size={12} className="animate-spin" /> : s}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 font-body text-xs text-red-400">{error}</p>}
    </div>
  );
}
