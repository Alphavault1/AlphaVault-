"use client";

/**
 * ApplyForm
 * ---------
 * The Web3 entry form. Client component because it manages input state, inline
 * validation, and submission status.
 *
 * Validation runs twice, on purpose: instantly on the client (using the SAME
 * zod schema the server uses, so feedback is immediate and consistent) and then
 * authoritatively on the server (which never trusts the client). The `company`
 * field is a honeypot — hidden from real users, a bot magnet.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import {
  APPLICANT_ROLES,
  LIMITS,
  applicationSchema,
  type ApplicantRole,
} from "@/lib/applicationSchema";
import { TELEGRAM_URL } from "@/lib/content";

type FieldErrors = Partial<Record<string, string>>;

const inputBase =
  "w-full rounded-xl border bg-black px-4 py-3 font-body text-[15px] text-white placeholder:text-muted transition-colors focus:outline-none";

export function ApplyForm() {
  const [discordUsername, setDiscordUsername] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [role, setRole] = useState<ApplicantRole | "">("");
  const [workUrl, setWorkUrl] = useState("");
  const [note, setNote] = useState("");
  const [company, setCompany] = useState(""); // honeypot

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  const formRef = useRef<HTMLFormElement>(null);

  // Border colour reflects error state so invalid fields read at a glance.
  const borderFor = (field: string) =>
    errors[field] ? "border-red-500/60 focus:border-red-500" : "border-white/10 focus:border-gold";

  function moveFocusToFirstError(fieldErrors: FieldErrors) {
    const order = ["discordUsername", "xHandle", "role", "workUrl", "note"];
    const first = order.find((f) => fieldErrors[f]);
    if (!first) return;
    if (first === "role") {
      formRef.current?.querySelector<HTMLButtonElement>('[data-role-pill="true"]')?.focus();
    } else {
      document.getElementById(first)?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const candidate = {
      discordUsername,
      xHandle,
      role,
      workUrl,
      note,
      company,
    };

    // 1. Instant client-side validation with the shared schema.
    const parsed = applicationSchema.safeParse(candidate);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      moveFocusToFirstError(next);
      return;
    }

    setErrors({});
    setStatus("submitting");

    // 2. Authoritative server validation + persistence.
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body?.ok) {
        if (body?.fieldErrors) {
          setErrors(body.fieldErrors as FieldErrors);
          moveFocusToFirstError(body.fieldErrors as FieldErrors);
        }
        setSubmitError(
          body?.error ?? "Something went wrong. Please try again.",
        );
        setStatus("idle");
        return;
      }

      setStatus("success");
    } catch {
      setSubmitError("Network error — check your connection and try again.");
      setStatus("idle");
    }
  }

  // ---- Success state ------------------------------------------------------
  if (status === "success") {
    return (
      <div className="rounded-2xl border border-gold/25 bg-surface-900 p-8 text-center sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 text-gold">
          <Check size={26} strokeWidth={2} />
        </span>
        <h2 className="mt-6 text-2xl uppercase leading-tight sm:text-3xl">
          You&rsquo;re in the queue.
        </h2>
        <p className="mx-auto mt-4 max-w-md font-body leading-relaxed text-slate">
          We review every application by hand. If your work checks out, your
          invite goes out on the next Purge Day — the last day of the month. Keep
          an eye on your Discord DMs.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow"
          >
            Stay on the Radar
          </a>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-body text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/5"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // ---- Form ---------------------------------------------------------------
  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Discord username */}
      <div>
        <label htmlFor="discordUsername" className="mb-2 block font-body text-sm text-slate">
          Discord username <span className="text-gold">*</span>
        </label>
        <input
          id="discordUsername"
          name="discordUsername"
          type="text"
          autoComplete="off"
          placeholder="e.g. alphabuilder"
          value={discordUsername}
          onChange={(e) => setDiscordUsername(e.target.value)}
          aria-invalid={!!errors.discordUsername}
          aria-describedby={errors.discordUsername ? "discordUsername-error" : undefined}
          className={`${inputBase} ${borderFor("discordUsername")}`}
        />
        <p className="mt-1.5 font-body text-xs text-muted">
          So we can send your invite directly. This is how we&rsquo;ll reach you.
        </p>
        {errors.discordUsername && (
          <p id="discordUsername-error" className="mt-1.5 font-body text-xs text-red-400">
            {errors.discordUsername}
          </p>
        )}
      </div>

      {/* X handle (optional) */}
      <div>
        <label htmlFor="xHandle" className="mb-2 block font-body text-sm text-slate">
          X handle <span className="text-muted">(optional)</span>
        </label>
        <input
          id="xHandle"
          name="xHandle"
          type="text"
          autoComplete="off"
          placeholder="@yourhandle"
          value={xHandle}
          onChange={(e) => setXHandle(e.target.value)}
          aria-invalid={!!errors.xHandle}
          aria-describedby={errors.xHandle ? "xHandle-error" : undefined}
          className={`${inputBase} ${borderFor("xHandle")}`}
        />
        {errors.xHandle && (
          <p id="xHandle-error" className="mt-1.5 font-body text-xs text-red-400">
            {errors.xHandle}
          </p>
        )}
      </div>

      {/* Role (pill group) */}
      <div>
        <span className="mb-2 block font-body text-sm text-slate">
          What do you do? <span className="text-gold">*</span>
        </span>
        <div role="group" aria-label="Your primary role" className="flex flex-wrap gap-2">
          {APPLICANT_ROLES.map((r) => {
            const selected = role === r;
            return (
              <button
                key={r}
                type="button"
                data-role-pill="true"
                aria-pressed={selected}
                onClick={() => {
                  setRole(r);
                  setErrors((prev) => ({ ...prev, role: undefined }));
                }}
                className={`rounded-full border px-4 py-2 font-body text-sm transition-colors ${
                  selected
                    ? "border-gold bg-gold text-black"
                    : "border-white/15 text-slate hover:border-white/30 hover:text-white"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
        {errors.role && (
          <p className="mt-1.5 font-body text-xs text-red-400">{errors.role}</p>
        )}
      </div>

      {/* Work URL */}
      <div>
        <label htmlFor="workUrl" className="mb-2 block font-body text-sm text-slate">
          Link to something you&rsquo;ve built <span className="text-gold">*</span>
        </label>
        <input
          id="workUrl"
          name="workUrl"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="GitHub, an X thread, Figma, a Dune dashboard…"
          value={workUrl}
          onChange={(e) => setWorkUrl(e.target.value)}
          aria-invalid={!!errors.workUrl}
          aria-describedby={errors.workUrl ? "workUrl-error" : undefined}
          className={`${inputBase} ${borderFor("workUrl")}`}
        />
        <p className="mt-1.5 font-body text-xs text-muted">
          One link is enough. Show us proof of work, not a resume.
        </p>
        {errors.workUrl && (
          <p id="workUrl-error" className="mt-1.5 font-body text-xs text-red-400">
            {errors.workUrl}
          </p>
        )}
      </div>

      {/* Note (optional) */}
      <div>
        <label htmlFor="note" className="mb-2 block font-body text-sm text-slate">
          One line on what you&rsquo;d bring <span className="text-muted">(optional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={LIMITS.noteMax}
          placeholder="Keep it short and real."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-invalid={!!errors.note}
          aria-describedby={errors.note ? "note-error" : undefined}
          className={`${inputBase} resize-none ${borderFor("note")}`}
        />
        <div className="mt-1.5 flex items-center justify-between">
          {errors.note ? (
            <p id="note-error" className="font-body text-xs text-red-400">
              {errors.note}
            </p>
          ) : (
            <span />
          )}
          <span className="font-body text-xs text-muted">
            {note.length}/{LIMITS.noteMax}
          </span>
        </div>
      </div>

      {/* Honeypot — hidden from humans, tempting to bots. Kept out of the tab
          order and the accessibility tree. */}
      <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company (leave this empty)</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      {/* General submit error */}
      {submitError && (
        <p role="alert" className="font-body text-sm text-red-400">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {status === "submitting" ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            Submit application
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
