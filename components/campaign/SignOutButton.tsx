"use client";

/**
 * SignOutButton
 * ---------------
 * This didn't exist anywhere in the app before now — there was a real gap
 * where, once signed in, there was no way to sign out at all, on any page.
 * Has to be a client component: supabase.auth.signOut() clears the session
 * from the BROWSER's storage, which a server action has no access to.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh(); // clears any cached server-rendered data tied to the old session
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className={`inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-50 ${
        className ?? "font-body text-sm text-slate transition-colors hover:text-white"
      }`}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
      Sign out
    </button>
  );
}
