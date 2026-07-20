"use client";

/**
 * CampaignModalShell
 * --------------------
 * Shared chrome for the Sign In and Sign Up modals: backdrop, panel, X button,
 * Escape key, iOS-safe scroll lock. Reuses the exact patterns already proven
 * in ApplySuccessModal rather than re-solving the same problems twice:
 *   - Backdrop is a SIBLING of the panel, not its parent (see the layering
 *     note in Navbar.tsx / ApplySuccessModal.tsx — nesting broke this before).
 *   - Scroll lock uses position:fixed + an INSTANT (non-animated) restore on
 *     close, for the same reason documented in Navbar.tsx: the site's global
 *     smooth-scroll would otherwise animate the restore, and that animation
 *     can get interrupted by the modal's own concurrent close transition.
 *
 * One deliberate DIFFERENCE from ApplySuccessModal: tapping the backdrop DOES
 * close this modal. ApplySuccessModal locked that down because its one
 * external action (a Telegram link) is easy to lose to a stray tap. A sign-in
 * or sign-up form doesn't carry that same risk, and tap-outside-to-close is
 * the conventional pattern for an auth modal — so this one follows convention
 * rather than the stricter lock.
 */

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

interface CampaignModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function CampaignModalShell({
  open,
  onClose,
  title,
  children,
}: CampaignModalShellProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
      const html = document.documentElement;
      const prevScrollBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, scrollY);
      html.style.scrollBehavior = prevScrollBehavior;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="campaign-modal-wrapper"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          <div
            aria-hidden
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="campaign-modal-heading"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.94, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.96, y: reduceMotion ? 0 : 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gold/25 bg-surface-900 p-8 shadow-2xl sm:p-10"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate transition-colors hover:bg-white/5 hover:text-white"
            >
              <X size={18} />
            </button>

            <h2
              id="campaign-modal-heading"
              className="text-2xl uppercase leading-tight sm:text-3xl"
            >
              {title}
            </h2>

            <div className="mt-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
