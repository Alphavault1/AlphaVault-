import { z } from "zod";

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
  // Optional — an example post or task-instructions link shown to members.
  // Empty string normalizes to undefined so an unfilled field doesn't fail
  // the URL check.
  referenceUrl: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(z.string().url("Enter a valid link.").max(2048).optional())
    .optional(),
});

export type CampaignFormInput = z.infer<typeof campaignFormSchema>;

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
  walletAddress: z
    .string()
    .trim()
    .min(8, "Enter a valid wallet address.")
    .max(255, "That wallet address is unusually long."),
});

export type EntryInput = z.infer<typeof entrySchema>;

export const reviewSchema = z.object({
  entryId: z.string().uuid(),
  status: z.enum(["accepted", "rejected"]),
  reviewNote: z.string().trim().max(500, "Keep it under 500 characters.").optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

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
