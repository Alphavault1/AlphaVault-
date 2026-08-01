import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * TEMPORARY DIAGNOSTIC — DELETE AFTER USE.
 * ------------------------------------------
 * Reports what the SERVER actually sees for the signed-in admin: whether it
 * has a session at all, what is_admin() returns in that exact context, and
 * whether the applications query returns rows.
 *
 * Every check runs through getSupabaseServerClient() — the same client, same
 * cookies, same RLS path the failing admin page uses — so whatever this
 * returns is what that page is working with.
 *
 * Returns no personal data beyond the signed-in admin's own ids/handles,
 * and requires an existing admin session to return anything meaningful.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaign_id");

  const supabase = await getSupabaseServerClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  // What the layout's check does — a direct table read.
  const { data: profileRow, error: profileError } = user
    ? await supabase.from("profiles").select("id, x_handle, role").eq("id", user.id).maybeSingle()
    : { data: null, error: null };

  // What RLS relies on — the SECURITY DEFINER function.
  const { data: isAdminRpc, error: isAdminError } = await supabase.rpc("is_admin");

  // The actual failing query.
  const { data: applications, error: applicationsError } = campaignId
    ? await supabase
        .from("campaign_applications")
        .select("id, status, applied_at")
        .eq("campaign_id", campaignId)
    : { data: null, error: null };

  return NextResponse.json({
    server_has_session: Boolean(user),
    auth_user_id: user?.id ?? null,
    auth_error: userError?.message ?? null,
    profile_row_via_direct_select: profileRow,
    profile_error: profileError?.message ?? null,
    is_admin_rpc_returns: isAdminRpc,
    is_admin_error: isAdminError?.message ?? null,
    applications_count: applications?.length ?? null,
    applications_error: applicationsError?.message ?? null,
  });
}
