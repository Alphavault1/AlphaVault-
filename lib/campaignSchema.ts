import { z } from "zod";
import { PAYMENT_METHOD_VALUES } from "@/lib/paymentMethods";

/**
 * Campaign & admin validation.
 * -----------------------------
 * These schemas validate on the CLIENT for instant feedback, but the real
 * enforcement is the SQL layer (supabase/campaign_schema_02_multi_campaign.sql)
 * — every RPC re-checks its own inputs regardless of what the client already
 * validated. That's deliberate defense in depth, not redundancy: a schema
 * here can be bypassed by anyone calling the RPC directly, but the database
 * constraint can't be.
 */

export const campaignFormSchema = z.object({
  name: z.string().trim().min(3, "At least 3 characters.").max(100, "Keep it under 100 characters."),
  // Textarea input, one requirement per line — same pattern as SubsGigs'
  // reference implementation, adapted to zod v3's API (theirs uses zod v4).
  requirements: z
    .string()
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.string().min(2).max(300))
        .min(1, "Add at least one requirement.")
        .max(20, "Keep it to 20 requirements or fewer."),
    ),
  maxEntries: z.coerce.number().int().min(1, "Must allow at least 1 entry.").max(100_000),
  rewardAmount: z.coerce.number().nonnegative("Reward can't be negative.").max(1_000_000),
  disclaimer: z
    .string()
    .trim()
    .min(10, "At least 10 characters.")
    .max(1000, "Keep it under 1000 characters."),
  status: z.enum(["draft", "live", "closed"]),
  campaignType: z.enum(["direct_submission", "application_required"]).default("direct_submission"),
  // Optional — an example post or task-instructions link shown to members.
  // Empty string normalizes to undefined so an unfilled field doesn't fail
  // the URL check.
  referenceUrl: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(z.string().url("Enter a valid link.").max(2048).optional())
    .optional(),
  // Optional — an HTML date input's value is always "" or "YYYY-MM-DD".
  // Empty stays optional/undefined (no deadline); a real date gets parsed
  // and pushed to the end of that day, so "ends July 22" means through the
  // end of July 22 in the browser's own timezone, not the first second of
  // it.
  endDate: z
    .string()
    .trim()
    .transform((v) => {
      if (v === "") return undefined;
      const parsed = new Date(v);
      parsed.setHours(23, 59, 59, 999);
      return parsed;
    })
    .pipe(z.date().optional())
    .optional(),
});

export type CampaignFormInput = z.infer<typeof campaignFormSchema>;

/**
 * campaignEditFormSchema / campaignEditSubmissionSchema
 * ---------------------------------------------------------
 * The editable subset of a campaign, post-creation: name, requirements,
 * maxEntries, rewardAmount, disclaimer, endDate — the exact same rules as
 * campaignFormSchema/campaignSubmissionSchema above, just without status,
 * campaignType, or referenceUrl.
 *
 * Those three are deliberately excluded, not forgotten:
 *   - status and referenceUrl already have their own dedicated, working,
 *     separately-tested edit paths (CampaignStatusToggle,
 *     CampaignReferenceForm / updateCampaignReference) — folding them into
 *     this form too would mean two different code paths that can write the
 *     same column, which is exactly the kind of duplication that drifts out
 *     of sync over time.
 *   - campaignType (direct_submission vs application_required) changes the
 *     RULES entries are gated by — flipping it mid-campaign, after some
 *     entries already exist under the old rule, is a genuine product
 *     decision with its own edge cases, not a data-shape decision like the
 *     others. Deliberately left out of this first pass rather than bundled
 *     in without being asked for.
 *
 * reward_amount and max_entries ARE included here — they're editable
 * through this schema whenever the campaign allows it. What actually
 * enforces "not editable once accepted entries exist" is the database
 * trigger (campaigns_prevent_locked_field_changes, migration 10), not this
 * schema — the schema's job is shape/range validation, not that business
 * rule, same separation of concerns as everywhere else in this file.
 */
export const campaignEditFormSchema = z.object({
  campaignId: z.string().uuid(),
  name: campaignFormSchema.shape.name,
  requirements: campaignFormSchema.shape.requirements,
  maxEntries: campaignFormSchema.shape.maxEntries,
  rewardAmount: campaignFormSchema.shape.rewardAmount,
  disclaimer: campaignFormSchema.shape.disclaimer,
  endDate: campaignFormSchema.shape.endDate,
});

export type CampaignEditFormInput = z.infer<typeof campaignEditFormSchema>;

export const campaignEditSubmissionSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().trim().min(3).max(100),
  requirements: z.array(z.string().min(2).max(300)).min(1).max(20),
  maxEntries: z.coerce.number().int().min(1).max(100_000),
  rewardAmount: z.coerce.number().nonnegative().max(1_000_000),
  disclaimer: z.string().trim().min(10).max(1000),
  endDate: z.date().optional(),
});


/**
 * campaignSubmissionSchema
 * ---------------------------
 * The server action's real input shape — NOT the same as campaignFormSchema
 * above, and that distinction is exactly what was broken before this schema
 * existed. campaignFormSchema validates raw form input: a textarea string
 * for requirements, a date-input string for endDate. It transforms those
 * into an array and a Date respectively before handing them to the server
 * action. But the server action was re-validating with that SAME schema —
 * which still expects a raw string for requirements and endDate, not the
 * array/Date it was actually receiving. Every campaign creation failed
 * server-side as a result, silently, since the client-side parse always
 * succeeded first.
 *
 * This schema validates the ACTUAL post-transform shape instead — same
 * rules (length limits, valid values), just expressed against the types
 * that are genuinely being submitted. Defense-in-depth is preserved (the
 * server still independently validates, protecting against someone calling
 * the action directly, bypassing the client entirely) — it just validates
 * the right thing now.
 */
export const campaignSubmissionSchema = z.object({
  name: z.string().trim().min(3).max(100),
  requirements: z.array(z.string().min(2).max(300)).min(1).max(20),
  maxEntries: z.coerce.number().int().min(1).max(100_000),
  rewardAmount: z.coerce.number().nonnegative().max(1_000_000),
  disclaimer: z.string().trim().min(10).max(1000),
  status: z.enum(["draft", "live", "closed"]),
  campaignType: z.enum(["direct_submission", "application_required"]),
  referenceUrl: z.string().url().max(2048).optional(),
  endDate: z.date().optional(),
});

export const entrySchema = z.object({
  campaignId: z.string().uuid(),
  submissionUrl: z
    .string()
    .trim()
    .url("Enter a valid link.")
    .refine(
      (value) => /^https:\/\/(www\.)?(x\.com|twitter\.com)\//i.test(value),
      "Enter a valid X post link.",
    ),
  // Both accepted chains (USDT on BEP20, USDC on Base) are EVM-compatible,
  // so a real wallet address always has the same shape regardless of which
  // one is selected: "0x" followed by exactly 40 hex characters (42 total).
  //
  // Deliberately checking SHAPE, not EIP-55 checksum casing. A checksum
  // check would reject perfectly valid addresses that happen to be
  // all-lowercase — which is extremely common; many wallets and exchanges
  // export addresses that way, and lowercase is a fully valid EVM address,
  // just not checksum-annotated. Enforcing checksum casing here would create
  // false rejections of good addresses, which is a worse failure mode than
  // the one this is fixing.
  //
  // This exists because a real submission was accepted with a 21-character
  // address (should be 42) — the previous check only validated a length
  // RANGE (8–255), not that the value was actually shaped like an address at
  // all. A truncated or malformed address like that would silently fail to
  // receive a payout with no indication anything was wrong until someone
  // went looking.
  walletAddress: z
    .string()
    .trim()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      "Enter a valid wallet address — it should start with 0x, followed by 40 letters/numbers (42 characters total).",
    ),
  // Which chain the reward is paid on. An unselected control submits "",
  // which fails the enum with our own message rather than zod's default
  // "Invalid enum value" wording.
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES, {
    errorMap: () => ({ message: "Select a payment method." }),
  }),
});

export type EntryInput = z.infer<typeof entrySchema>;

export const reviewSchema = z.object({
  entryId: z.string().uuid(),
  status: z.enum(["accepted", "rejected"]),
  // .nullable() as well as .optional(): the review tables send an explicit
  // `reviewNote: null` when approving/rejecting without a note. Plain
  // .optional() accepts `string | undefined` but REJECTS null, so every
  // no-note review failed validation with "Expected string, received null"
  // before it ever reached the database. .transform normalizes null to
  // undefined so downstream code keeps seeing one shape, not two.
  reviewNote: z
    .string()
    .trim()
    .max(500, "Keep it under 500 characters.")
    .nullable()
    .optional()
    .transform((value) => value ?? undefined),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

/**
 * "Total paid" used to just mean "accepted" — a calculation of what's owed,
 * labeled as if the money had already moved. It hadn't; the real transfer
 * happens manually, off-platform. This schema backs the real distinction:
 * an entry starts 'unpaid' the moment it's accepted, and only becomes 'paid'
 * when an admin explicitly confirms they sent it.
 */
export const payoutStatusSchema = z.object({
  entryId: z.string().uuid(),
  payoutStatus: z.enum(["unpaid", "paid"]),
});

export const banSchema = z.object({
  profileId: z.string().uuid(),
  // 0 lifts an existing ban — same convention as the RPC itself.
  days: z.coerce.number().int().min(0, "Can't be negative.").max(3650, "Cap it at 10 years."),
});

export type BanInput = z.infer<typeof banSchema>;

export const verificationSchema = z.object({
  profileId: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected"]),
});

export type VerificationInput = z.infer<typeof verificationSchema>;

export const campaignReferenceSchema = z.object({
  campaignId: z.string().uuid(),
  // Empty string clears the reference link — a real, supported action, not
  // treated as "invalid input."
  referenceUrl: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.union([z.string().url("Enter a valid link.").max(2048), z.null()])),
});

export type CampaignReferenceInput = z.infer<typeof campaignReferenceSchema>;

export const deleteCampaignSchema = z.object({
  campaignId: z.string().uuid(),
  // The literal word "DELETE", typed by the admin — checked client-side
  // before the action is even called, and the campaignId/admin check is
  // re-verified server-side regardless (see delete_campaign in the SQL).
  confirmation: z.literal("DELETE"),
});

export const setMemberRoleSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(["creator", "admin"]),
});

export const applicationSchema = z.object({
  campaignId: z.string().uuid(),
});

export const reviewApplicationSchema = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  // Same null-vs-undefined fix as reviewSchema above — see the note there.
  reviewNote: z
    .string()
    .trim()
    .max(500, "Keep it under 500 characters.")
    .nullable()
    .optional()
    .transform((value) => value ?? undefined),
});
