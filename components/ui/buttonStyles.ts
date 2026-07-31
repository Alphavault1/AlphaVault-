/**
 * Shared "pill" button treatment.
 * ---------------------------------
 * Bordered, filled, with a hover lift and an immediate `active:scale-95`
 * press-down the instant it's tapped — first built for the member portal's
 * "Back to home" / "Sign out" pair (see PortalFooterActions.tsx), which
 * replaced plain underlined text that didn't read as tappable, especially on
 * mobile where there's no hover state to hint at it.
 *
 * Extended here to every other "Back to home" / "Sign out" action site-wide —
 * AdminHeader, the sign-in/sign-up/forgot-password modals, /apply, and
 * /reset-password — for visual consistency. AdminHeader previously had a
 * documented "stay minimal, this is a tools area" rationale for NOT getting
 * this treatment; that was a deliberate choice at the time, and this change
 * deliberately reverses it — an explicit decision to prioritize consistency
 * across the whole site over that header staying visually distinct.
 *
 * This constant is the INTERACTIVE/VISUAL treatment only — border, fill,
 * radius, transition, hover, active, disabled. It deliberately does NOT
 * include layout/position utilities like `self-start`, `mx-auto`, or a
 * top-margin, since those differ correctly by where a given instance sits on
 * its page. Callers compose their own positioning classes alongside this:
 *
 *   className={`self-start ${PILL_BUTTON_CLASS}`}
 *   className={`mx-auto w-fit ${PILL_BUTTON_CLASS}`}
 *
 * Single source of truth: every call site importing this instead of hand-
 * rolling its own copy is what keeps them from drifting out of sync with
 * each other as the site evolves.
 */
export const PILL_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-white/15 bg-surface-900 px-5 py-2.5 font-body text-sm text-slate transition-all duration-150 hover:border-gold/40 hover:bg-surface-800 hover:text-white active:scale-95 disabled:opacity-50 disabled:active:scale-100";
