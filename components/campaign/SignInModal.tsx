"use client";

/**
 * SignInModal
 * -----------
 * Two real network calls, in sequence:
 *   1. POST /api/campaign/lookup-email — X handle -> email (Supabase Auth
 *      only understands email; see that route's comments for why this has
 *      to be a server call and how it avoids leaking whether a handle
 *      exists).
 *   2. supabase.auth.signInWithPassword() — the actual credential check,
 *      handled entirely by Supabase.
 *
 * After a successful sign-in, we read the user's OWN profile row (allowed by
 * the "select own" RLS policy — see supabase/campaign_schema.sql) to decide
 * where to send them: admin -> /admin/campaign, creator -> /campaign.
 *
 * "Forgot password?" is a real, honest placeholder rather than a broken
 * link: the actual reset flow (with the admin-account exception the spec
 * calls for) is Phase 4, not built yet, so clicking it reveals an inline note
 * saying so instead of navigating to a page that doesn't exist.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { campaignSignInSchema } from "@/lib/campaignAuthSchema";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type FieldErrors = Partial<Record<string, string>>;

const inputBase =
  "w-full rounded-xl border bg-black px-4 py-3 font-body text-[15px] text-white placeholder:text-muted transition-colors focus:outline-none border-white/10 focus:border-gold";

interface SignInModalProps {
  onSwitchToSignUp: () => void;
  onSuccess: () => void;
}

export function SignInModal({ onSwitchToSignUp, onSuccess }: SignInModalProps) {
  const router = useRouter();
  const [xHandle, setXHandle] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [showForgotNote, setShowForgotNote] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const parsed = campaignSignInSchema.safeParse({ xHandle, password });
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
      // Step 1 — resolve the handle to an email.
      const lookupRes = await fetch("/api/campaign/lookup-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xHandle: parsed.data.xHandle }),
      });
      const lookupBody = await lookupRes.json().catch(() => ({}));
      const email: string = lookupBody?.email ?? parsed.data.xHandle;

      // Step 2 — the real credential check, entirely Supabase's job.
      const supabase = getSupabaseBrowserClient();
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password: parsed.data.password });

      if (signInError || !signInData.user) {
        // "Email not confirmed" is deliberately shown as its own specific
        // message, not lumped into the generic one below. This differs from
        // the enumeration-safety reasoning elsewhere in this flow: someone
        // typing their OWN just-created handle and password has already
        // proven the account is theirs — telling them precisely what's
        // blocking them (confirm your email) doesn't leak anything to an
        // attacker that guessing random handles would meaningfully expose,
        // and leaving people stuck on a generic "wrong password" message
        // when the real issue is an unclicked email link is a worse,
        // needlessly confusing outcome.
        if (signInError?.message?.toLowerCase().includes("email not confirmed")) {
          setSubmitError(
            "Confirm your email first — check your inbox for a link, then try signing in again.",
          );
        } else {
          // Same generic message regardless of whether the handle didn't
          // exist or the password was wrong — see lookup-email's
          // enumeration note.
          setSubmitError("Invalid handle or password.");
        }
        setStatus("idle");
        return;
      }

      // Step 3 — read the user's OWN profile row to decide where to send
      // them. Allowed by the "select own" RLS policy: auth.uid() now matches
      // this row's id, since we just established a session for it.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", signInData.user.id)
        .maybeSingle();

      onSuccess();
      router.push(profile?.role === "admin" ? "/admin/campaign" : "/campaign");
    } catch {
      setSubmitError("Network error — check your connection and try again.");
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="si-xhandle" className="mb-2 block font-body text-sm text-slate">
          X Handle <span className="text-gold">*</span>
        </label>
        <input
          id="si-xhandle"
          type="text"
          autoComplete="username"
          placeholder="@yourhandle"
          value={xHandle}
          onChange={(e) => setXHandle(e.target.value)}
          aria-invalid={!!errors.xHandle}
          className={inputBase}
        />
        {errors.xHandle && (
          <p className="mt-1.5 font-body text-xs text-red-400">{errors.xHandle}</p>
        )}
      </div>

      <div>
        <label htmlFor="si-password" className="mb-2 block font-body text-sm text-slate">
          Password <span className="text-gold">*</span>
        </label>
        <input
          id="si-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          className={inputBase}
        />
        {errors.password && (
          <p className="mt-1.5 font-body text-xs text-red-400">{errors.password}</p>
        )}

        <button
          type="button"
          onClick={() => setShowForgotNote((v) => !v)}
          className="mt-2 font-body text-sm text-bronze transition-colors hover:text-gold"
        >
          Forgot password?
        </button>
        {showForgotNote && (
          <p className="mt-2 font-body text-xs leading-relaxed text-muted">
            Password reset isn&rsquo;t live yet — this is coming in a future
            update. Reach out via Telegram or X in the meantime.
          </p>
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
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting" ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>

      <p className="text-center font-body text-sm text-slate">
        New to the campaign?{" "}
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="text-gold underline-offset-2 hover:underline"
        >
          Create an account
        </button>
      </p>
    </form>
  );
}
