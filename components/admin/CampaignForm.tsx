"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import {
  campaignFormSchema,
  campaignEditFormSchema,
  type CampaignFormInput,
  type CampaignEditFormInput,
} from "@/lib/campaignSchema";
import { createCampaign, updateCampaignDetails } from "@/lib/actions/admin";

const inputBase =
  "w-full rounded-xl border bg-black px-4 py-3 font-body text-[15px] text-white placeholder:text-muted transition-colors focus:outline-none border-white/10 focus:border-gold disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/10";

const DEFAULT_DISCLAIMER =
  "We reserve the right to reject entries that do not meet the campaign requirements.";

interface EditableFieldValues {
  name: string;
  requirements: string;
  maxEntries: string;
  rewardAmount: string;
  disclaimer: string;
  endDate: string;
}

interface CampaignFormProps {
  /**
   * "create" (default) is the original, unchanged behavior — every existing
   * call site keeps working exactly as before without passing anything new.
   *
   * "edit" hides status/campaignType/referenceUrl entirely (see the long
   * comment on campaignEditFormSchema in lib/campaignSchema.ts for exactly
   * why those three are excluded — short version: two of them already have
   * their own separate, working edit paths, and the third is a deliberately
   * out-of-scope product decision, not an oversight), validates against the
   * smaller edit schema, and calls updateCampaignDetails instead of
   * createCampaign.
   */
  mode?: "create" | "edit";
  /** Required when mode === "edit" — which campaign is being updated. */
  campaignId?: string;
  /** Required when mode === "edit" — the campaign's current values, prefilled. */
  initialValues?: EditableFieldValues;
  /**
   * True once the campaign has ≥1 accepted entry. Disables the reward/cap
   * inputs and shows why — this is a UX courtesy, NOT the actual
   * enforcement. The real guarantee is the campaigns_prevent_locked_field_
   * changes database trigger (migration 10), which blocks the change
   * regardless of whether this prop is ever wrong, stale, or bypassed
   * entirely (e.g. a direct API call). If this prop and the trigger ever
   * disagree, the trigger wins — the admin would just see a less specific
   * error message than usual, not an actual gap in protection.
   */
  isLocked?: boolean;
  /** How many accepted entries exist — only used for the lock explanation's wording. */
  acceptedEntriesCount?: number;
}

export function CampaignForm({
  mode = "create",
  campaignId,
  initialValues,
  isLocked = false,
  acceptedEntriesCount = 0,
}: CampaignFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [name, setName] = useState(initialValues?.name ?? "");
  const [requirements, setRequirements] = useState(initialValues?.requirements ?? "");
  const [maxEntries, setMaxEntries] = useState(initialValues?.maxEntries ?? "10");
  const [rewardAmount, setRewardAmount] = useState(initialValues?.rewardAmount ?? "");
  const [disclaimer, setDisclaimer] = useState(initialValues?.disclaimer ?? DEFAULT_DISCLAIMER);
  const [endDate, setEndDate] = useState(initialValues?.endDate ?? "");

  // create-only fields — irrelevant and unused in edit mode, but the hooks
  // still need to exist unconditionally (rules of hooks), so they're simply
  // never rendered or read from when isEdit is true.
  const [status, setStatus] = useState<"draft" | "live" | "closed">("draft");
  const [campaignType, setCampaignType] = useState<"direct_submission" | "application_required">(
    "direct_submission",
  );
  const [referenceUrl, setReferenceUrl] = useState("");

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (isEdit) {
      const parsed = campaignEditFormSchema.safeParse({
        campaignId,
        name,
        requirements,
        maxEntries,
        rewardAmount,
        disclaimer,
        endDate,
      });

      if (!parsed.success) {
        setErrors(collectFieldErrors(parsed.error.issues));
        return;
      }

      setErrors({});
      setSubmitting(true);

      const result = await updateCampaignDetails(parsed.data satisfies CampaignEditFormInput);
      if (!result.ok) {
        setSubmitError(result.error);
        setSubmitting(false);
        return;
      }

      router.push(`/admin/campaign/${campaignId}`);
      return;
    }

    const parsed = campaignFormSchema.safeParse({
      name,
      requirements,
      maxEntries,
      rewardAmount,
      disclaimer,
      status,
      campaignType,
      referenceUrl,
      endDate,
    });

    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error.issues));
      return;
    }

    setErrors({});
    setSubmitting(true);

    const result = await createCampaign(parsed.data satisfies CampaignFormInput);
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
        {/* Each line becomes its own requirement — a real point of confusion
            previously (a campaign showed "5 requirements" when one had been
            typed across 5 lines for readability). This count updates live so
            the effect of a line break is visible before submitting, not
            discovered after. */}
        <p className="mt-1.5 font-body text-xs text-muted">
          {countNonEmptyLines(requirements)} requirement
          {countNonEmptyLines(requirements) === 1 ? "" : "s"} — each new line is a separate one.
        </p>
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
            disabled={isEdit && isLocked}
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
            disabled={isEdit && isLocked}
            className={inputBase}
          />
          {errors.rewardAmount && (
            <p className="mt-1.5 font-body text-xs text-red-400">{errors.rewardAmount}</p>
          )}
        </div>
      </div>

      {isEdit && isLocked && (
        <div className="flex items-start gap-2.5 rounded-xl border border-gold/20 bg-gold/5 p-4">
          <Lock size={16} className="mt-0.5 shrink-0 text-gold" />
          <p className="font-body text-sm text-slate">
            Reward and entry cap are locked — this campaign already has{" "}
            {acceptedEntriesCount} accepted {acceptedEntriesCount === 1 ? "entry" : "entries"}.
            Changing either now would make the payout math wrong for what&rsquo;s already been
            credited. Every other field here stays editable.
          </p>
        </div>
      )}

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

      {!isEdit && (
        <>
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
            <label htmlFor="cf-campaign-type" className="mb-2 block font-body text-sm text-slate">
              Campaign type
            </label>
            <select
              id="cf-campaign-type"
              value={campaignType}
              onChange={(e) =>
                setCampaignType(e.target.value as "direct_submission" | "application_required")
              }
              className={inputBase}
            >
              <option value="direct_submission">Direct submission — members can enter right away</option>
              <option value="application_required">
                Application required — members must apply and be approved first
              </option>
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
        </>
      )}

      {isEdit && (
        <p className="font-body text-xs text-muted">
          Status, campaign type, and the reference link are edited separately, from the campaign
          page — not here.
        </p>
      )}

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
            {isEdit ? "Saving…" : "Creating…"}
          </>
        ) : isEdit ? (
          "Save changes"
        ) : (
          "Create campaign"
        )}
      </button>
    </form>
  );
}

function countNonEmptyLines(value: string): number {
  return value.split("\n").filter((line) => line.trim().length > 0).length;
}

function collectFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Partial<Record<string, string>> {
  const next: Partial<Record<string, string>> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !next[key]) next[key] = issue.message;
  }
  return next;
}
