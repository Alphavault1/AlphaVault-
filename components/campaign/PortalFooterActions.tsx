import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SignOutButton } from "@/components/campaign/SignOutButton";
import { PILL_BUTTON_CLASS } from "@/components/ui/buttonStyles";

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
 *
 * The visual treatment itself now lives in components/ui/buttonStyles.ts —
 * shared with AdminHeader and every other "Back to home" site-wide, so this
 * component and those can't drift apart from each other over time.
 */
export function PortalFooterActions() {
  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      <Link href="/" className={PILL_BUTTON_CLASS}>
        <ArrowLeft size={15} />
        Back to home
      </Link>
      <SignOutButton className={PILL_BUTTON_CLASS} />
    </div>
  );
}
