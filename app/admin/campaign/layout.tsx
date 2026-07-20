import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Layout for every /admin/campaign/* route.
 * -------------------------------------------
 * This is the ONE place the "must be an admin" check lives for the whole
 * admin section — every page under app/admin/campaign/ inherits it
 * automatically just by existing in this folder, rather than each page
 * needing to repeat the same redirect logic.
 *
 * Checked server-side, before any admin content renders — an unauthenticated
 * visitor or a signed-in "creator" hitting /admin/campaign directly in the
 * browser bar gets redirected before the page's real content is ever sent to
 * their browser, not hidden with CSS after the fact.
 */
export default async function AdminCampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") redirect("/");

  return <>{children}</>;
}
