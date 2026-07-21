"use client";

/**
 * /reset-password
 * -----------------
 * Reached only via the link in a password-reset email — never linked to
 * directly from anywhere in the app. Supabase's browser client (via
 * @supabase/ssr) automatically detects and exchanges the recovery code in
 * the URL for a temporary "recovery" session the moment this page loads —
 * that's what makes supabase.auth.updateUser({ password }) below able to
 * work at all, without the person needing to separately sign in first.
 *
 * A full page, not a modal: modals in this app are mounted at the root
 * layout and opened via CampaignModalsProvider — this route is reached from
 * OUTSIDE the app entirely (an email client), so there's no in-app trigger
 * to open a modal from. A real page is the correct shape here.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const inputBase =
  "w-full rounded-xl border bg-black px-4 py-3 font-body text-[15px] text-white placeholder:text-muted transition-colors focus:outline-none border-white/10 focus:border-gold";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    // By the time this fires, the SDK has already attempted to exchange any
    // recovery code present in the URL. A present session at this point
    // means the link was valid; no session means it was missing, expired,
    // or already used.
    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(!!data.session);
      setCheckingSession(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    setSubmitError(null);

    if (password.length < 8) {
      setFieldError("At least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFieldError("Passwords don't match.");
      return;
    }

    setStatus("submitting");
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setSubmitError(error.message || "Something went wrong. Try again.");
      setStatus("idle");
      return;
    }

    setStatus("success");
    window.setTimeout(() => router.push("/"), 2500);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden py-24">
      <div className="absolute inset-0 -z-10 bg-grid [background-size:64px_64px]" />
      <div className="absolute inset-0 -z-10 bg-radial-fade" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-ink" />

      <div className="container-vault flex max-w-md flex-col items-center text-center">
        {checkingSession ? (
          <Loader2 size={28} className="animate-spin text-gold" />
        ) : status === "success" ? (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 text-gold">
              <CheckCircle2 size={26} strokeWidth={1.75} />
            </span>
            <h1 className="mt-6 text-2xl uppercase leading-tight sm:text-3xl">
              Password updated.
            </h1>
            <p className="mt-3 font-body text-slate">Taking you home now…</p>
          </>
        ) : !hasRecoverySession ? (
          <>
            <h1 className="text-2xl uppercase leading-tight sm:text-3xl">
              Link expired.
            </h1>
            <p className="mt-4 font-body leading-relaxed text-slate">
              This reset link is invalid or has already been used. Request a
              new one from the Sign In panel.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center gap-2 font-body text-sm text-slate transition-colors hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to home
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl uppercase leading-tight sm:text-3xl">
              Set a new password.
            </h1>
            <form onSubmit={handleSubmit} noValidate className="mt-8 w-full space-y-5 text-left">
              <div>
                <label htmlFor="new-password" className="mb-2 block font-body text-sm text-slate">
                  New password <span className="text-gold">*</span>
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputBase}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-2 block font-body text-sm text-slate">
                  Confirm password <span className="text-gold">*</span>
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputBase}
                />
                {fieldError && (
                  <p className="mt-1.5 font-body text-xs text-red-400">{fieldError}</p>
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
                    Updating…
                  </>
                ) : (
                  "Update password"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
