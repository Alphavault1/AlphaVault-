import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SignOutButton } from "@/components/campaign/SignOutButton";
import { PILL_BUTTON_CLASS } from "@/components/ui/buttonStyles";

/**
 * AdminHeader
 * -------------
 * Every /admin/campaign/* page used to render with nothing above it but the
 * RBAC check — no logo, no way back to the main site, no way to sign out.
 * Once in, the only way out was the browser's back button or manually
 * editing the URL. This is the fix: a thin bar with exactly the two things
 * that were missing.
 *
 * PILL BUTTONS — this used to deliberately stay plain text, on the stated
 * reasoning that this is "a tools area, not a marketing page." That was a
 * real decision at the time, not an oversight. It's being reversed here by
 * explicit choice: site-wide visual consistency for these two actions won
 * out over keeping this header visually distinct. If a future need to
 * differentiate the admin area re-emerges, that's a legitimate reason to
 * revisit this — but it should be a deliberate call, not a drift back from
 * neglect.
 */
export function AdminHeader() {
  return (
    <div className="border-b border-white/5 bg-black/40">
      <div className="container-vault flex h-14 items-center justify-between">
        <Link href="/" className={PILL_BUTTON_CLASS}>
          <ArrowLeft size={16} />
          Back to home
        </Link>
        <SignOutButton className={PILL_BUTTON_CLASS} />
      </div>
    </div>
  );
}
