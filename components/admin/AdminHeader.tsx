import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SignOutButton } from "@/components/campaign/SignOutButton";

/**
 * AdminHeader
 * -------------
 * Every /admin/campaign/* page used to render with nothing above it but the
 * RBAC check — no logo, no way back to the main site, no way to sign out.
 * Once in, the only way out was the browser's back button or manually
 * editing the URL. This is the fix: a thin, deliberately minimal bar (not
 * the full site Navbar — this is a tools area, not a marketing page) with
 * exactly the two things that were missing.
 */
export function AdminHeader() {
  return (
    <div className="border-b border-white/5 bg-black/40">
      <div className="container-vault flex h-14 items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-body text-sm text-slate transition-colors hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>
        <SignOutButton />
      </div>
    </div>
  );
}
