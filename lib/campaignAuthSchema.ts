import { z } from "zod";

/**
 * Campaign auth validation.
 * -------------------------
 * Same pattern as lib/applicationSchema.ts: one schema, used by both the
 * client (instant feedback) and anywhere server-side that needs to re-check
 * the same shape, so the two can't drift apart.
 */

export const CAMPAIGN_LIMITS = {
  xHandleMin: 2,
  xHandleMax: 40,
  passwordMin: 8,
  passwordMax: 128,
} as const;

/** Strips a leading "@", surrounding whitespace, and lowercases — X handles
 *  are effectively case-insensitive, and this keeps signup/lookup consistent
 *  (a handle stored as "BigXam01" must still match a login attempt typed as
 *  "bigxam01"). Same leading-"@" convention as the /apply form's X field. */
const xHandleField = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => v.replace(/^@+/, ""))
  .pipe(
    z
      .string()
      .min(CAMPAIGN_LIMITS.xHandleMin, "Enter your X handle.")
      .max(
        CAMPAIGN_LIMITS.xHandleMax,
        `Keep it under ${CAMPAIGN_LIMITS.xHandleMax} characters.`,
      )
      .regex(/^\S+$/, "X handles don't contain spaces."),
  );

const passwordField = z
  .string()
  .min(
    CAMPAIGN_LIMITS.passwordMin,
    `Use at least ${CAMPAIGN_LIMITS.passwordMin} characters.`,
  )
  .max(CAMPAIGN_LIMITS.passwordMax, "That password is unusually long.");

export const campaignSignUpSchema = z
  .object({
    xHandle: xHandleField,
    email: z.string().trim().email("Enter a valid email address."),
    confirmEmail: z.string().trim().email("Enter a valid email address."),
    password: passwordField,
  })
  .refine((data) => data.email.toLowerCase() === data.confirmEmail.toLowerCase(), {
    message: "Emails don't match.",
    path: ["confirmEmail"],
  });

export type CampaignSignUpInput = z.infer<typeof campaignSignUpSchema>;

export const campaignSignInSchema = z.object({
  xHandle: xHandleField,
  password: z.string().min(1, "Enter your password."),
});

export type CampaignSignInInput = z.infer<typeof campaignSignInSchema>;
