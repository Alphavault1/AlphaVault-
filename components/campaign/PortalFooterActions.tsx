import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SignOutButton } from "@/components/campaign/SignOutButton";

/**
 * PortalFooterActions
 * --------------------
 * "Back to home" + "Sign out", styled as an actual pill-button pair rather
 * than bare underlined text. Previously both were just `<Link>`/`<button>`
 * with a text-color hover transition — functionally fine, but nothing about
 * them read as tappable, especially on mobile where there's no hover state
 * to hint at it.
 *
 * Used twice in app/campaign/page.tsx (the pending/rejected state and the
 * approved state each render their own copy of this pair) — pulled out here
 * so both stay visually identical without copy-pasting the class list twice.
 *
 * Tap feedback: `active:scale-95` gives an immediate, visible press the
 * instant a finger/cursor is down — before any network response comes back.
 * That immediacy is what was actually missing; it doesn't make sign-out
 * faster, but it removes the "did that even register?" moment that reads as
 * slowness on a plain text link with no visual state of its own.
 */
const buttonClass =
  "inline-flex items-center gap-2 rounded-full border border-white/15 bg-surface-900 px-5 py-2.5 font-body text-sm text-slate transition-all duration-150 hover:border-gold/40 hover:bg-surface-800 hover:text-white active:scale-95 disabled:opacity-50 disabled:active:scale-100";

export function PortalFooterActions() {
  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      <Link href="/" className={buttonClass}>
        <ArrowLeft size={15} />
        Back to home
      </Link>
      <SignOutButton className={buttonClass} />
    </div>
  );
}
