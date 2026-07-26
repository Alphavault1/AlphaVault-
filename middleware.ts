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
 *
 * BOUNDED TIMEOUT — why this was added:
 * This runs on EVERY navigation, site-wide, before anything renders. Without
 * a timeout, a slow moment on Supabase's end (network hiccup, cold region,
 * anything short of a hard failure) makes every single click feel sluggish —
 * "Back to home," "Sign out," any page load — because the whole response is
 * blocked waiting on this one call. AUTH_REFRESH_TIMEOUT_MS bounds the worst
 * case: if the revalidation call doesn't come back in time, the request is
 * aborted (via AbortController, so the in-flight fetch is actually cancelled,
 * not just abandoned) and the page proceeds without a refreshed session for
 * this one request. That's a strictly smaller problem than blocking the
 * entire site on a slow auth call — the existing cookie is still valid for a
 * while yet, and the next request tries the refresh again. Fails open, same
 * philosophy as the missing-env-vars case below.
 */
const AUTH_REFRESH_TIMEOUT_MS = 3000;

/** Wraps fetch so any request through this client is aborted after `timeoutMs`. */
function fetchWithTimeout(timeoutMs: number): typeof fetch {
  return (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(input, { ...init, signal: controller.signal }).finally(() =>
      clearTimeout(timer),
    );
  };
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured (e.g. a preview build without env vars set),
  // don't crash the whole site — just skip the refresh. Every other page on
  // this site works with zero auth, so this must fail open, not closed.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    global: { fetch: fetchWithTimeout(AUTH_REFRESH_TIMEOUT_MS) },
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
  //
  // Wrapped in try/catch: if the timeout above fires, this rejects with an
  // AbortError. That's expected and handled the same way as the missing-env
  // case — skip the refresh for this one request rather than fail the page.
  try {
    await supabase.auth.getUser();
  } catch {
    // Fail open. The existing session cookie is still usable; the refresh
    // will simply be retried on the next request.
  }

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
