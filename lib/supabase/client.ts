"use client";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — Campaign auth only.
 * ----------------------------------------------
 * This is a DIFFERENT client from lib/supabaseAdmin.ts on purpose:
 *   - supabaseAdmin.ts uses the SERVICE ROLE key, is server-only, and bypasses
 *     Row Level Security entirely. It's what /api/apply uses to write to the
 *     public `applications` table (which has no authenticated user at all).
 *   - THIS client uses the public ANON key (safe to expose — it's meant to
 *     ship to the browser) and is bound by Row Level Security. It's used for
 *     the things that genuinely have to happen in the browser: signUp,
 *     signInWithPassword, signOut, and — once signed in — inserting the
 *     user's OWN profiles row (the RLS policy only allows a row where
 *     auth.uid() = id, so this can never write anyone else's data).
 *
 * Env vars are NEXT_PUBLIC_-prefixed on purpose: Next.js only inlines
 * NEXT_PUBLIC_ vars into the client bundle. The anon key is designed to be
 * public — it's not a secret the way the service-role key is.
 */
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured for the browser. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createBrowserClient(url, anonKey);
}
