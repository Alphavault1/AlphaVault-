"use client";

/**
 * ApplySuccessModal
 * ------------------
 * The confirmation shown after a successful application submission. Rendered
 * as a centered modal over the (still-visible, dimmed) form, rather than
 * swapping inline content — gives submission a "sealed" moment instead of just
 * silently rewriting the page.
 *
 * Dismissal is DELIBERATE, not incidental: only the X button, the "Back to
 * home" button, or the Escape key close it. The backdrop is NOT a tap-to-close
 * target here — unlike the mobile nav menu, this modal's one live action
 * ("Stay on the Radar" → Telegram) is exactly the kind of thing a user might
 * reach for right as their thumb grazes the dimmed area around it. Losing that
 * action to a mistaken tap is a worse outcome than requiring an explicit close,
 * so the backdrop is decorative only.
 *
 * LAYERING NOTE (learned from the mobile nav scrim bug): the backdrop is
 * rendered as a SIBLING of the modal panel, not a parent wrapping it. An
 * ancestor with backdrop-filter/filter/transform becomes the containing block
 * for `position: fixed` descendants, which would shrink/misplace a fixed
 * backdrop nested inside another positioned/blurred element. Keeping them as
 * siblings under one fixed-inset-0 wrapper avoids that entirely.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import { TELEGRAM_URL } from "@/lib/content";

interface ApplySuccessModalProps {
  open: boolean;
  onClose: () => void;
}

export function ApplySuccessModal({ open, onClose }: ApplySuccessModalProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  // Escape closes — same as every other dismissible overlay on this site.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Background scroll lock while open — same iOS-safe position:fixed technique
  // used for the mobile nav menu (overflow:hidden alone doesn't hold on iOS).
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const { style } = document.body;
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.left = "0";
    style.right = "0";
    return () => {
      style.position = "";
      style.top = "";
      style.left = "";
      style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  function handleClose() {
    onClose();
    router.push("/");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="apply-success-wrapper"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          {/* Backdrop — decorative dim/blur only. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-success-heading"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.94, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.96, y: reduceMotion ? 0 : 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gold/25 bg-surface-900 p-8 text-center shadow-2xl sm:p-10"
          >
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close and return to home"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate transition-colors hover:bg-white/5 hover:text-white"
            >
              <X size={18} />
            </button>

            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 text-gold">
              <Check size={26} strokeWidth={2} />
            </span>

            <h2
              id="apply-success-heading"
              className="mt-6 text-2xl uppercase leading-tight sm:text-3xl"
            >
              You&rsquo;re in the queue.
            </h2>

            <p className="mx-auto mt-4 max-w-sm font-body leading-relaxed text-slate">
              We review every application by hand. If your work checks out, your
              invite goes out on the next Purge Day — the last day of the month.
              Keep an eye on your Discord DMs.
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
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 font-body text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/5"
              >
                Back to home
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
