import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client (service role).
 * -------------------------------------------
 * SECURITY: this uses the SERVICE ROLE key, which bypasses Row Level Security
 * and can read/write everything. It must NEVER reach the browser. The
 * `server-only` import above makes the build fail loudly if this file is ever
 * imported into a client component, and the env var is intentionally NOT
 * prefixed with NEXT_PUBLIC_ so Next won't inline it into client bundles.
 *
 * The client is created lazily (inside the function, at request time) rather
 * than at module load, so:
 *   - `next build` doesn't need the env vars to be present, and
 *   - a misconfiguration surfaces as a clear runtime error, not a crashed build.
 */

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    // Thrown at request time and logged server-side; the route turns this into
    // a generic 500 so we never leak which env var is missing to the client.
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  cached = createClient(url, serviceKey, {
    auth: {
      // No end-user sessions here — this is a trusted server client.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cached;
}
