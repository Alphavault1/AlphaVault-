import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client — reads the current user's session from cookies.
 * -------------------------------------------------------------------------
 * Unlike lib/supabaseAdmin.ts (service role, sees everything, no session),
 * this client is built from the ANON key + whatever session cookie the
 * request is carrying. It acts AS the signed-in user, so RLS applies exactly
 * as it would in the browser — this is how /campaign can safely read "my own
 * profile row" server-side without needing a service-role bypass for
 * something a normal user should already be allowed to read.
 *
 * The try/catch around cookie writes exists because Server Components can
 * only READ cookies — calling .set() from one throws. That's fine here: the
 * middleware (see middleware.ts) is what actually refreshes and re-writes the
 * session cookie on each request. If this client is used somewhere that CAN
 * write cookies (a Route Handler, a Server Action), the write succeeds
 * normally; if it's used in a Server Component, the write is silently
 * skipped and the middleware's refresh covers it instead.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — expected, see file header comment.
        }
      },
    },
  });
}
