"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { submitCampaignApplication } from "@/lib/actions/campaigns";

export function ApplyButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
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
    router.refresh();
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={handleApply}
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Applying…
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
