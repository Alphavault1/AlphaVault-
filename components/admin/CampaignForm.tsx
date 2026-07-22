"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { campaignFormSchema } from "@/lib/campaignSchema";
import { createCampaign } from "@/lib/actions/admin";

const inputBase =
  "w-full rounded-xl border bg-black px-4 py-3 font-body text-[15px] text-white placeholder:text-muted transition-colors focus:outline-none border-white/10 focus:border-gold";

const DEFAULT_DISCLAIMER =
  "We reserve the right to reject entries that do not meet the campaign requirements.";

export function CampaignForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [requirements, setRequirements] = useState("");
  const [maxEntries, setMaxEntries] = useState("10");
  const [rewardAmount, setRewardAmount] = useState("");
  const [disclaimer, setDisclaimer] = useState(DEFAULT_DISCLAIMER);
  const [status, setStatus] = useState<"draft" | "live" | "closed">("draft");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [endDate, setEndDate] = useState("");

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const parsed = campaignFormSchema.safeParse({
      name,
      requirements,
      maxEntries,
      rewardAmount,
      disclaimer,
      status,
      referenceUrl,
      endDate,
    });

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
    setSubmitting(true);

    const result = await createCampaign(parsed.data);
    if (!result.ok) {
      setSubmitError(result.error);
      setSubmitting(false);
      return;
    }

    router.push(`/admin/campaign/${result.campaignId}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="cf-name" className="mb-2 block font-body text-sm text-slate">
          Campaign name <span className="text-gold">*</span>
        </label>
        <input
          id="cf-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputBase}
        />
        {errors.name && <p className="mt-1.5 font-body text-xs text-red-400">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="cf-requirements" className="mb-2 block font-body text-sm text-slate">
          Requirements <span className="text-gold">*</span>{" "}
          <span className="text-muted">(one per line)</span>
        </label>
        <textarea
          id="cf-requirements"
          rows={4}
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          className={`${inputBase} resize-none`}
        />
        {errors.requirements && (
          <p className="mt-1.5 font-body text-xs text-red-400">{errors.requirements}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="cf-max" className="mb-2 block font-body text-sm text-slate">
            Max entries <span className="text-gold">*</span>
          </label>
          <input
            id="cf-max"
            type="number"
            min={1}
            value={maxEntries}
            onChange={(e) => setMaxEntries(e.target.value)}
            className={inputBase}
          />
          {errors.maxEntries && (
            <p className="mt-1.5 font-body text-xs text-red-400">{errors.maxEntries}</p>
          )}
        </div>
        <div>
          <label htmlFor="cf-reward" className="mb-2 block font-body text-sm text-slate">
            Reward per entry ($) <span className="text-gold">*</span>
          </label>
          <input
            id="cf-reward"
            type="number"
            min={0}
            step="0.01"
            value={rewardAmount}
            onChange={(e) => setRewardAmount(e.target.value)}
            className={inputBase}
          />
          {errors.rewardAmount && (
            <p className="mt-1.5 font-body text-xs text-red-400">{errors.rewardAmount}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="cf-end-date" className="mb-2 block font-body text-sm text-slate">
          Ends on <span className="text-muted">(optional — runs until manually closed or full otherwise)</span>
        </label>
        <input
          id="cf-end-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className={inputBase}
        />
        {errors.endDate && (
          <p className="mt-1.5 font-body text-xs text-red-400">{errors.endDate}</p>
        )}
      </div>

      <div>
        <label htmlFor="cf-disclaimer" className="mb-2 block font-body text-sm text-slate">
          Disclaimer
        </label>
        <textarea
          id="cf-disclaimer"
          rows={2}
          value={disclaimer}
          onChange={(e) => setDisclaimer(e.target.value)}
          className={`${inputBase} resize-none`}
        />
        {errors.disclaimer && (
          <p className="mt-1.5 font-body text-xs text-red-400">{errors.disclaimer}</p>
        )}
      </div>

      <div>
        <label htmlFor="cf-status" className="mb-2 block font-body text-sm text-slate">
          Status
        </label>
        <select
          id="cf-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as "draft" | "live" | "closed")}
          className={inputBase}
        >
          <option value="draft">Draft — not visible to members yet</option>
          <option value="live">Live — open for entries now</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div>
        <label htmlFor="cf-reference" className="mb-2 block font-body text-sm text-slate">
          Reference link
        </label>
        <input
          id="cf-reference"
          type="url"
          placeholder="https://x.com/example/status/..."
          value={referenceUrl}
          onChange={(e) => setReferenceUrl(e.target.value)}
          className={inputBase}
        />
        {errors.referenceUrl && (
          <p className="mt-1.5 font-body text-xs text-red-400">{errors.referenceUrl}</p>
        )}
      </div>

      {submitError && (
        <p role="alert" className="font-body text-sm text-red-400">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating…
          </>
        ) : (
          "Create campaign"
        )}
      </button>
    </form>
  );
}
