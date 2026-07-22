"use client";

/**
 * ForgotPasswordModal
 * ----------------------
 * Asks for an X handle (not email) — same voice as the rest of this auth
 * flow — then reuses the existing /api/campaign/lookup-email route to
 * resolve it to an email before calling Supabase's own password reset.
 *
 * ENUMERATION SAFETY, adapted for this specific flow: lookup-email already
 * returns the same shape whether the handle exists or not (falling back to
 * the raw handle text as "email" when it doesn't — see that route's own
 * comment). But Supabase's resetPasswordForEmail() would reject that
 * fallback value outright as "not a valid email," which — unlike sign-in's
 * generic "invalid credentials" — WOULD create a distinguishable signal
 * between a real and fake handle. So this component always shows the same
 * generic confirmation message regardless of what resetPasswordForEmail
 * actually returns, rather than surfacing its result directly.
 */

import { useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { campaignSignInSchema } from "@/lib/campaignAuthSchema";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const inputBase =
  "w-full rounded-xl border bg-black px-4 py-3 font-body text-[15px] text-white placeholder:text-muted transition-colors focus:outline-none border-white/10 focus:border-gold";

interface ForgotPasswordModalProps {
  onSwitchToSignIn: () => void;
  onClose: () => void;
}

export function ForgotPasswordModal({ onSwitchToSignIn, onClose }: ForgotPasswordModalProps) {
  const [xHandle, setXHandle] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);

    const parsed = campaignSignInSchema.pick({ xHandle: true }).safeParse({ xHandle });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Enter a valid X handle.");
      return;
    }

    setStatus("submitting");

    try {
      const lookupRes = await fetch("/api/campaign/lookup-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xHandle: parsed.data.xHandle }),
      });
      const lookupBody = await lookupRes.json().catch(() => ({}));
      const email: string = lookupBody?.email ?? parsed.data.xHandle;

      const supabase = getSupabaseBrowserClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // Deliberately swallowed — see the enumeration-safety note above. The
      // person sees the same "check your email" message whether the handle
      // was real, fake, or the request itself failed outright.
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 text-gold">
          <Mail size={24} strokeWidth={1.75} />
        </span>
        <p className="mt-6 font-body text-[15px] leading-relaxed text-slate">
          We&rsquo;ve sent a password reset link to the email on file. Check
          your inbox — including spam — and follow the link to set a new
          password.
        </p>
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="mx-auto mt-6 flex items-center gap-2 font-body text-sm text-gold underline-offset-2 hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <p className="font-body text-sm text-slate">
        Enter your X handle and we&rsquo;ll send a password reset link to the
        email on file.
      </p>

      <div>
        <label htmlFor="reset-handle" className="mb-2 block font-body text-sm text-slate">
          X Handle <span className="text-gold">*</span>
        </label>
        <input
          id="reset-handle"
          type="text"
          autoComplete="off"
          placeholder="yourhandle"
          value={xHandle}
          onChange={(e) => setXHandle(e.target.value)}
          aria-invalid={!!fieldError}
          className={inputBase}
        />
        {fieldError && <p className="mt-1.5 font-body text-xs text-red-400">{fieldError}</p>}
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting" ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Sending…
          </>
        ) : (
          "Send reset link"
        )}
      </button>

      <button
        type="button"
        onClick={onSwitchToSignIn}
        className="mx-auto block text-center font-body text-sm text-slate underline-offset-2 hover:text-white hover:underline"
      >
        Back to sign in
      </button>

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
