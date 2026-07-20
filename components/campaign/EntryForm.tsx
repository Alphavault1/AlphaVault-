"use client";

/**
 * EntryForm
 * ---------
 * Same validate-then-submit pattern as ApplyForm.tsx: instant client-side
 * feedback via the shared zod schema, then the server action (which calls
 * the submit_campaign_entry RPC) has the final say. Error messages returned
 * from the action are the RPC's own — "This campaign is full," "You have
 * already entered this campaign" — written to be shown directly, not
 * generic wrapper text.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { entrySchema } from "@/lib/campaignSchema";
import { submitCampaignEntry } from "@/lib/actions/campaigns";

const inputBase =
  "w-full rounded-xl border bg-black px-4 py-3 font-body text-[15px] text-white placeholder:text-muted transition-colors focus:outline-none border-white/10 focus:border-gold";

interface EntryFormProps {
  campaignId: string;
}

export function EntryForm({ campaignId }: EntryFormProps) {
  const router = useRouter();
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const parsed = entrySchema.safeParse({ campaignId, submissionUrl, walletAddress });
    if (!parsed.success) {
      const next: Partial<Record<string, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setStatus("submitting");

    const result = await submitCampaignEntry(parsed.data);
    if (!result.ok) {
      setSubmitError(result.error);
      setStatus("idle");
      return;
    }

    router.refresh(); // re-fetches the server component, showing the new entry status
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="entry-url" className="mb-2 block font-body text-sm text-slate">
          Link to your X post <span className="text-gold">*</span>
        </label>
        <input
          id="entry-url"
          type="url"
          autoComplete="off"
          placeholder="https://x.com/yourhandle/status/..."
          value={submissionUrl}
          onChange={(e) => setSubmissionUrl(e.target.value)}
          aria-invalid={!!errors.submissionUrl}
          className={inputBase}
        />
        {errors.submissionUrl && (
          <p className="mt-1.5 font-body text-xs text-red-400">{errors.submissionUrl}</p>
        )}
      </div>

      <div>
        <label htmlFor="entry-wallet" className="mb-2 block font-body text-sm text-slate">
          Wallet address <span className="text-gold">*</span>
        </label>
        <input
          id="entry-wallet"
          type="text"
          autoComplete="off"
          placeholder="Where your reward gets sent"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          aria-invalid={!!errors.walletAddress}
          className={inputBase}
        />
        {errors.walletAddress && (
          <p className="mt-1.5 font-body text-xs text-red-400">{errors.walletAddress}</p>
        )}
      </div>

      {submitError && (
        <p role="alert" className="font-body text-sm text-red-400">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {status === "submitting" ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit entry"
        )}
      </button>
    </form>
  );
}
