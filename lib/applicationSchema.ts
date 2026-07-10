import { z } from "zod";

/**
 * Application validation schema.
 * ------------------------------
 * This is the ONE definition of what a valid application looks like. The server
 * route (app/api/apply/route.ts) validates against it before touching the
 * database, and the client form (components/ApplyForm.tsx) reuses the same role
 * list and length limits so the two never drift apart.
 *
 * Everything here runs on both server and client, so it must stay free of any
 * server-only imports (no database client, no secrets).
 */

/**
 * The roles an applicant can pick. Kept as a `const` tuple so it can drive both
 * the zod enum below AND the pill buttons in the form. If you change this list,
 * also update the CHECK constraint in supabase/schema.sql to match.
 */
export const APPLICANT_ROLES = [
  "Developer",
  "Designer",
  "Trading & Alpha",
  "Content & Community",
  "Founder & BD",
  "Other",
] as const;

export type ApplicantRole = (typeof APPLICANT_ROLES)[number];

// Field length caps. Generous enough for real answers, tight enough that a bot
// can't post a novel. Enforced on the server, so they're a hard limit.
export const LIMITS = {
  discordMin: 2,
  discordMax: 40,
  xHandleMax: 40,
  workUrlMax: 400,
  noteMax: 280,
} as const;

/**
 * Optional free-text field that treats empty/whitespace as "not provided"
 * (→ undefined, which the route stores as NULL). `strip` also removes a leading
 * "@" — used for the X handle. Length is checked on the cleaned value.
 */
const optionalCleaned = (max: number, strip = false) =>
  z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      let t = v.trim();
      if (strip) t = t.replace(/^@+/, "");
      return t === "" ? undefined : t;
    },
    z.string().max(max, `Keep it under ${max} characters.`).optional(),
  );

export const applicationSchema = z.object({
  // Needed so Phase 2/3 can DM the invite to the right person. No spaces.
  discordUsername: z
    .string()
    .trim()
    .min(LIMITS.discordMin, "Enter your Discord username.")
    .max(LIMITS.discordMax, `Keep it under ${LIMITS.discordMax} characters.`)
    .regex(/^\S+$/, "Discord usernames don't contain spaces."),

  xHandle: optionalCleaned(LIMITS.xHandleMax, true),

  role: z.enum(APPLICANT_ROLES, {
    // Shown if the value isn't one of the allowed roles (e.g. tampered request).
    message: "Choose the option that fits you best.",
  }),

  // Must be a real http(s) link to something they've shipped.
  workUrl: z
    .string()
    .trim()
    .min(1, "Share a link to something you've built.")
    .max(LIMITS.workUrlMax, "That link is unusually long.")
    .url("That doesn't look like a valid URL.")
    .refine(
      (v) => /^https?:\/\//i.test(v),
      "Link must start with http:// or https://.",
    ),

  note: optionalCleaned(LIMITS.noteMax),

  // Honeypot: a field hidden from real users via CSS. Bots tend to fill every
  // field. We accept any value here at the schema level so the server route can
  // *silently* absorb a filled honeypot (return 200, write nothing) rather than
  // returning an error that tips the bot off. Real users always send "".
  company: z.string().optional(),
});

/** The validated, cleaned application shape. */
export type ApplicationInput = z.infer<typeof applicationSchema>;
