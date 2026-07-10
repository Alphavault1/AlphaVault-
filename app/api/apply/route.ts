import { NextResponse } from "next/server";
import { applicationSchema } from "@/lib/applicationSchema";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/apply
 * ---------------
 * Receives an application from the /apply form, validates it server-side, and
 * stores it in the `applications` table. The browser never talks to Supabase
 * directly — everything funnels through here so validation, the honeypot, and
 * (in Phase 4) rate-limiting can't be bypassed.
 *
 * Node runtime (not edge) because we use the Supabase service client.
 */
export const runtime = "nodejs";
// This endpoint mutates data; never let it be statically cached.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Parse the body defensively — a malformed/absent JSON body is a 400.
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Malformed request." },
      { status: 400 },
    );
  }

  // 2. Validate against the shared schema. On failure, return the first
  //    message per field so the form can show inline errors.
  const parsed = applicationSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in fieldErrors)) {
        fieldErrors[key] = issue.message;
      }
    }
    return NextResponse.json(
      { ok: false, error: "Please check the highlighted fields.", fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // 3. Honeypot: a real user can't see or fill the `company` field. If it's
  //    populated, silently accept (200) so the bot thinks it succeeded, but
  //    never write anything to the database.
  if (data.company) {
    return NextResponse.json({ ok: true });
  }

  // 4. Insert. The service-role client is created here (request time), so a
  //    missing env var throws and is caught below as a generic 500.
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("applications").insert({
      discord_username: data.discordUsername,
      x_handle: data.xHandle ?? null,
      role: data.role,
      work_url: data.workUrl,
      note: data.note ?? null,
      // status defaults to 'pending' in the schema; Phase 2 flips it.
    });

    if (error) {
      // Log the real Postgres error server-side; return a generic message.
      console.error("[apply] insert failed:", error.message);
      return NextResponse.json(
        { ok: false, error: "Could not save your application. Try again." },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error("[apply] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong on our end. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

// Any non-POST method gets a clean 405 rather than a confusing default.
export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Method not allowed." },
    { status: 405 },
  );
}
