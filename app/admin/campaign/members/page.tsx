import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { MemberTable, type MemberRow } from "@/components/admin/MemberTable";

export const metadata: Metadata = {
  title: "Members — Admin — Alpha Vault",
  robots: { index: false },
};

export default async function AdminMembersPage() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, x_handle, role, status, banned_until, total_earnings")
    .order("created_at", { ascending: false });

  const members: MemberRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    xHandle: p.x_handle,
    role: p.role,
    status: p.status,
    bannedUntil: p.banned_until,
    totalEarnings: Number(p.total_earnings ?? 0),
  }));

  return (
    <main className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-10 bg-grid [background-size:64px_64px]" />
      <div className="absolute inset-0 -z-10 bg-radial-fade" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-ink" />

      <div className="container-vault">
        <Link
          href="/admin/campaign"
          className="inline-flex items-center gap-2 font-body text-sm text-slate transition-colors hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <div className="mt-10">
          <SectionLabel>Admin</SectionLabel>
          <h1 className="mt-4 text-3xl uppercase leading-tight sm:text-4xl">
            Members.
          </h1>
        </div>

        <div className="mt-10">
          {members.length === 0 ? (
            <p className="rounded-2xl border border-white/5 bg-surface-900 p-8 text-center font-body text-slate">
              No members yet.
            </p>
          ) : (
            <MemberTable members={members} currentUserId={user?.id ?? ""} />
          )}
        </div>
      </div>
    </main>
  );
}
