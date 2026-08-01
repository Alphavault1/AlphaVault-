import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * TEMPORARY DIAGNOSTIC — DELETE AFTER USE.
 * ------------------------------------------
 * Deliberately placed UNDER app/admin/campaign/ so it inherits the same
 * layout (and therefore the same preceding auth.getUser() call) as the real
 * admin pages.
 *
 * The API route version of this check reported everything correct
 * (session present, is_admin() true, 1 application found) — but that route
 * has no layout above it. This page has the identical queries running in the
 * identical position as the failing page, so a difference between the two
 * isolates the layout as the cause rather than anything about the queries
 * themselves.
 */
export const dynamic = "force-dynamic";

const CAMPAIGN_ID = "7f778d02-46b4-4eed-b306-a28f107d2ea2";

export default async function AdminDiagnosticPage() {
  const supabase = await getSupabaseServerClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  const { data: profileRow, error: profileError } = user
    ? await supabase.from("profiles").select("id, x_handle, role").eq("id", user.id).maybeSingle()
    : { data: null, error: null };

  const { data: isAdminRpc, error: isAdminError } = await supabase.rpc("is_admin");

  const { data: applications, error: applicationsError } = await supabase
    .from("campaign_applications")
    .select("id, status, applied_at")
    .eq("campaign_id", CAMPAIGN_ID);

  const { data: entries, error: entriesError } = await supabase
    .from("campaign_entries")
    .select("id, status")
    .eq("campaign_id", CAMPAIGN_ID);

  const report = {
    context: "SERVER COMPONENT PAGE (inherits admin layout)",
    server_has_session: Boolean(user),
    auth_user_id: user?.id ?? null,
    auth_error: userError?.message ?? null,
    profile_row_via_direct_select: profileRow,
    profile_error: profileError?.message ?? null,
    is_admin_rpc_returns: isAdminRpc,
    is_admin_error: isAdminError?.message ?? null,
    applications_count: applications?.length ?? null,
    applications_error: applicationsError?.message ?? null,
    entries_count: entries?.length ?? null,
    entries_error: entriesError?.message ?? null,
  };

  return (
    <main className="container-vault py-24">
      <h1 className="text-2xl uppercase">Admin diagnostic</h1>
      <pre className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-black p-6 font-mono text-xs text-white">
        {JSON.stringify(report, null, 2)}
      </pre>
    </main>
  );
}
