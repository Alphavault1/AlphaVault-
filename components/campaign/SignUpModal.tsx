"use client";

/**
 * SignUpModal
 * -----------
 * Real signup, not a placeholder: this calls Supabase Auth's own signUp()
 * directly from the browser (the anon-key client — see lib/supabase/client),
 * so password hashing, storage, and session creation are Supabase's problem,
 * not ours. The x_handle is passed as signup "user metadata"; a Postgres
 * trigger (supabase/campaign_schema.sql) uses that to create the matching
 * profiles row automatically — see that file's comments for why it's a
 * trigger and not a second client-side insert call.
 *
 * The live email/confirm-email check runs on every keystroke (not just on
 * submit) — as soon as both fields have content and they don't match, the
 * confirm field gets a gold warning + red border and Submit disables. This is
 * exactly what the spec asked for: catch a typo before it becomes an account
 * with an email the person can't actually receive mail at.
 */

import { useState } from "react";
import Link from "next/link";
import { Loader2, Check, ArrowLeft } from "lucide-react";
import {
  campaignSignUpSchema,
  CAMPAIGN_LIMITS,
} from "@/lib/campaignAuthSchema";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type FieldErrors = Partial<Record<string, string>>;

const inputBase =
  "w-full rounded-xl border bg-black px-4 py-3 font-body text-[15px] text-white placeholder:text-muted transition-colors focus:outline-none";

interface SignUpModalProps {
  onSwitchToSignIn: () => void;
  onClose: () => void;
}

export function SignUpModal({ onSwitchToSignIn, onClose }: SignUpModalProps) {
  const [xHandle, setXHandle] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">(
    "idle",
  );
  // Supabase tells us this directly in the signUp response — data.session is
  // null when confirmation is required, present when it isn't. Using that
  // real signal means the success message can state what actually happened,
  // rather than hedging with "if" about something the app already knows.
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(true);

  // Live match check — independent of the zod validation, so it updates on
  // every keystroke rather than only at submit time.
  const bothTyped = email.trim().length > 0 && confirmEmail.trim().length > 0;
  const emailsMismatch =
    bothTyped && email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase();

  const borderFor = (field: string) =>
    errors[field] || (field === "confirmEmail" && emailsMismatch)
      ? "border-red-500/60 focus:border-red-500"
      : "border-white/10 focus:border-gold";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (emailsMismatch) return; // guarded, but the disabled button already prevents this

    const parsed = campaignSignUpSchema.safeParse({
      xHandle,
      email,
      confirmEmail,
      password,
    });

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setStatus("submitting");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: { x_handle: parsed.data.xHandle },
          // Explicit, not left to Supabase's dashboard "Site URL" default —
          // that default is http://localhost:3000 on every new project, and
          // depending on it silently breaks every confirmation email until
          // someone notices and fixes it in the dashboard (exactly what
          // happened here). window.location.origin always resolves to
          // wherever this code is actually running — sandbox today, the
          // client's own production domain later — so this can't drift out
          // of sync with reality the way a dashboard default can. Supabase
          // still validates this against its Redirect URLs allow-list
          // server-side, so this doesn't bypass that configuration — it just
          // stops us from depending on a separate setting being right too.
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already exists")) {
          setSubmitError("That email is already registered. Try signing in instead.");
        } else if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
          setSubmitError("That X handle is already taken — try a different one.");
        } else {
          setSubmitError(error.message || "Something went wrong. Try again.");
        }
        setStatus("idle");
        return;
      }

      setNeedsEmailConfirmation(!data.session);

      setStatus("success");
    } catch {
      setSubmitError("Network error — check your connection and try again.");
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 text-gold">
          <Check size={26} strokeWidth={2} />
        </span>
        <p className="mt-6 font-body text-lg text-white">
          Account created.
        </p>
        <p className="mt-3 font-body text-[15px] leading-relaxed text-slate">
          {needsEmailConfirmation
            ? "Check your inbox for a confirmation link before signing in."
            : "You're all set — sign in whenever you're ready."}
        </p>
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow"
        >
          Sign in
        </button>
        <Link
          href="/"
          onClick={onClose}
          className="mx-auto mt-4 flex w-fit items-center gap-2 font-body text-sm text-slate transition-colors hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="su-xhandle" className="mb-2 block font-body text-sm text-slate">
          X Handle <span className="text-gold">*</span>
        </label>
        <input
          id="su-xhandle"
          type="text"
          autoComplete="off"
          placeholder="@yourhandle"
          value={xHandle}
          onChange={(e) => setXHandle(e.target.value)}
          aria-invalid={!!errors.xHandle}
          className={`${inputBase} ${borderFor("xHandle")}`}
        />
        {errors.xHandle && (
          <p className="mt-1.5 font-body text-xs text-red-400">{errors.xHandle}</p>
        )}
      </div>

      <div>
        <label htmlFor="su-email" className="mb-2 block font-body text-sm text-slate">
          Email Address <span className="text-gold">*</span>
        </label>
        <input
          id="su-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          className={`${inputBase} ${borderFor("email")}`}
        />
        {errors.email && (
          <p className="mt-1.5 font-body text-xs text-red-400">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="su-confirm-email" className="mb-2 block font-body text-sm text-slate">
          Confirm Email Address <span className="text-gold">*</span>
        </label>
        <input
          id="su-confirm-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          aria-invalid={emailsMismatch || !!errors.confirmEmail}
          className={`${inputBase} ${borderFor("confirmEmail")}`}
        />
        {/* Live mismatch warning — gold text per the spec, distinct from the
            red field-error styling used for validation failures elsewhere. */}
        {emailsMismatch && (
          <p className="mt-1.5 font-body text-xs text-gold">
            These emails don&rsquo;t match yet.
          </p>
        )}
        {!emailsMismatch && errors.confirmEmail && (
          <p className="mt-1.5 font-body text-xs text-red-400">{errors.confirmEmail}</p>
        )}
      </div>

      <div>
        <label htmlFor="su-password" className="mb-2 block font-body text-sm text-slate">
          Password <span className="text-gold">*</span>
        </label>
        <input
          id="su-password"
          type="password"
          autoComplete="new-password"
          placeholder={`At least ${CAMPAIGN_LIMITS.passwordMin} characters`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          className={`${inputBase} ${borderFor("password")}`}
        />
        {errors.password && (
          <p className="mt-1.5 font-body text-xs text-red-400">{errors.password}</p>
        )}
      </div>

      {submitError && (
        <p role="alert" className="font-body text-sm text-red-400">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting" || emailsMismatch}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting" ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </button>

      <p className="text-center font-body text-sm text-slate">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="text-gold underline-offset-2 hover:underline"
        >
          Sign in
        </button>
      </p>

      <Link
        href="/"
        onClick={onClose}
        className="mx-auto flex w-fit items-center gap-2 font-body text-sm text-slate transition-colors hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to home
      </Link>
    </form>
  );
}
