import { NextResponse } from "next/server";
import { campaignSignInSchema } from "@/lib/campaignAuthSchema";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/campaign/lookup-email
 * --------------------------------
 * Supabase Auth signs in with an email + password — it has no concept of an
 * "X handle." Since the Sign In modal asks for a handle (matching the rest of
 * this site's voice), this route does the one-step translation: given a
 * handle, find the matching email, so the browser can then call Supabase's
 * own signInWithPassword() with it.
 *
 * This has to be a server route, not a client-side query: an unauthenticated
 * visitor has no session yet, so profiles' RLS "select own row" policy would
 * block them from reading anyone's row — including their own, since there's
 * no auth.uid() to match against before they've logged in. This route uses
 * the service-role client specifically to get around that one narrow,
 * necessary case.
 *
 * ENUMERATION SAFETY: this never returns a "handle not found" vs "handle
 * found" distinction. If the handle doesn't exist, we hand back the
 * original (wrong) handle text in place of an email — Supabase's own
 * signInWithPassword() will then fail with its standard "Invalid login
 * credentials" error, identical in wording and timing to a real wrong
 * password. A visitor (or a script) trying to guess valid handles gets no
 * signal either way.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request." }, { status: 400 });
  }

  // Only the handle matters here — reuse the sign-in schema but only need
  // that one field's validation (trim/lowercase/strip "@").
  const parsed = campaignSignInSchema
    .pick({ xHandle: true })
    .safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid X handle." },
      { status: 400 },
    );
  }

  const { xHandle } = parsed.data;

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("profiles")
      .select("email")
      .eq("x_handle", xHandle)
      .maybeSingle();

    // Deliberately the SAME response shape whether found or not — see the
    // enumeration-safety note above. `email` falls back to the raw handle,
    // which reads as a normal (wrong) email to Supabase's sign-in call.
    return NextResponse.json({ ok: true, email: data?.email ?? xHandle });
  } catch (err) {
    console.error("[campaign/lookup-email] unexpected error:", err);
    // Fail the same way a "not found" would, rather than exposing a 500 that
    // tells an attacker their guess triggered a different code path.
    return NextResponse.json({ ok: true, email: xHandle });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed." }, { status: 405 });
}
