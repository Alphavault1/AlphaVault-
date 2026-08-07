"use client";

/**
 * SignOutButton
 * ---------------
 * This didn't exist anywhere in the app before now — there was a real gap
 * where, once signed in, there was no way to sign out at all, on any page.
 * Has to be a client component: supabase.auth.signOut() clears the session
 * from the BROWSER's storage, which a server action has no access to.
 *
 * The `signedOut` flag (rather than just relying on `pending`) exists for
 * the same reason as the fix in MemberTable.tsx and elsewhere: once
 * signOut() has actually succeeded, there's no legitimate reason for this
 * button to ever be clickable again on this page — it's mid-navigation
 * away already. Without it, `pending` alone would flip back to false the
 * instant signOut() resolves, technically re-enabling the button for
 * whatever brief moment remains before the page finishes navigating.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  async function handleSignOut() {
    setPending(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setPending(false);
    setSignedOut(true);
    router.push("/");
    router.refresh(); // clears any cached server-rendered data tied to the old session
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending || signedOut}
      className={`inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-50 ${
        className ?? "font-body text-sm text-slate transition-colors hover:text-white"
      }`}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
      Sign out
    </button>
  );
}
