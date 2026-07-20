import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session-refresh middleware.
 * ----------------------------
 * This is NOT an access-control gate (that's a separate concern — see the
 * server-side check at the top of app/campaign/page.tsx). This middleware's
 * only job is keeping the Supabase auth cookie fresh.
 *
 * Why this exists at all: Supabase auth tokens expire and need periodic
 * refreshing. In the browser, the client SDK handles that automatically. In
 * Server Components, nothing does it for you — a Server Component can only
 * READ cookies, never refresh/re-set them (see the comment in
 * lib/supabase/server.ts). Without this middleware, a session would quietly
 * go stale: it would work for a while, then start failing server-side reads
 * with no obvious cause. Running the refresh here, on every request before
 * any page renders, is the standard fix.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured (e.g. a preview build without env vars set),
  // don't crash the whole site — just skip the refresh. Every other page on
  // this site works with zero auth, so this must fail open, not closed.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Calling getUser() (not getSession()) is deliberate: getSession() only
  // reads the cookie as-is, while getUser() actually revalidates the token
  // with Supabase, which is what triggers the refresh this middleware exists
  // to perform.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every route except static assets and image optimization files —
     * there's no session to refresh for a .png or a JS chunk.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)",
  ],
};
