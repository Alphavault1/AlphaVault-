import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CampaignCard } from "@/components/campaign/CampaignCard";

export const metadata: Metadata = {
  title: "Admin — Campaign — Alpha Vault",
  robots: { index: false },
};

/**
 * /admin/campaign
 * ----------------
 * Three top-level metrics, then every campaign regardless of status (unlike
 * the member-facing /campaign list, which only shows 'live' ones — an admin
 * needs to see drafts and closed campaigns too, to manage them).
 *
 * "Accepted reward value" sums profiles.total_earnings across everyone —
 * that column is already the running total the review_campaign_entry RPC
 * keeps accurate every time an entry's accepted, so this is a direct sum,
 * not a recomputation.
 */
export default async function AdminCampaignPage() {
  const supabase = await getSupabaseServerClient();

  const [{ count: membersWaiting }, { count: pendingEntries }, { data: earningsRows }, { data: campaigns }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("campaign_entries").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("total_earnings"),
      supabase
        .from("campaigns")
        .select("id, name, status, reward_amount, requirements, max_entries")
        .order("created_at", { ascending: false }),
    ]);

  const acceptedRewardValue = (earningsRows ?? []).reduce(
    (sum, row) => sum + Number(row.total_earnings ?? 0),
    0,
  );

  const campaignIds = (campaigns ?? []).map((c) => c.id);
  // get_campaign_capacity is a SECURITY DEFINER FUNCTION (was a view — see
  // the note in app/campaign/page.tsx). This page is admin-only (gated by
  // app/admin/campaign/layout.tsx), so is_admin() is true here — meaning
  // this call returns capacity for EVERY campaign regardless of status, not
  // just 'live' ones, matching what the dashboard needs to show. Explicitly
  // typed: no generated Supabase database types in this project.
  const { data: capacities } = campaignIds.length > 0
    ? ((await supabase.rpc("get_campaign_capacity")) as {
        data: { campaign_id: string; occupied_entries: number }[] | null;
      })
    : { data: [] as { campaign_id: string; occupied_entries: number }[] };

  const capacityByCampaign = new Map(
    (capacities ?? []).map((c) => [c.campaign_id, c.occupied_entries]),
  );

  return (
    <main className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-10 bg-grid [background-size:64px_64px]" />
      <div className="absolute inset-0 -z-10 bg-radial-fade" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-ink" />

      <div className="container-vault">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Admin</SectionLabel>
            <h1 className="mt-4 text-3xl uppercase leading-tight sm:text-4xl">
              Campaign dashboard.
            </h1>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/campaign/members"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 font-body text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/5"
            >
              <Users size={16} />
              Members
            </Link>
            <Link
              href="/admin/campaign/new"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow"
            >
              <Plus size={16} />
              New campaign
            </Link>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-surface-900 p-6">
            <p className="font-display text-3xl text-gold">{membersWaiting ?? 0}</p>
            <p className="mt-2 font-body text-sm uppercase tracking-wide text-slate">
              Members waiting
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface-900 p-6">
            <p className="font-display text-3xl text-white">{pendingEntries ?? 0}</p>
            <p className="mt-2 font-body text-sm uppercase tracking-wide text-slate">
              Pending entries
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface-900 p-6">
            <p className="font-display text-3xl text-gold">
              ${acceptedRewardValue.toLocaleString()}
            </p>
            <p className="mt-2 font-body text-sm uppercase tracking-wide text-slate">
              Accepted reward value
            </p>
          </div>
        </div>

        <h2 className="mt-16 text-2xl uppercase leading-tight sm:text-3xl">
          All campaigns.
        </h2>

        {(campaigns ?? []).length === 0 ? (
          <p className="mt-8 rounded-2xl border border-white/5 bg-surface-900 p-8 text-center font-body text-slate">
            No campaigns yet —{" "}
            <Link href="/admin/campaign/new" className="text-gold hover:underline">
              create the first one
            </Link>
            .
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(campaigns ?? []).map((campaign) => (
              <CampaignCard
                key={campaign.id}
                href={`/admin/campaign/${campaign.id}`}
                name={campaign.name}
                status={campaign.status}
                rewardAmount={campaign.reward_amount}
                requirementsCount={campaign.requirements.length}
                maxEntries={campaign.max_entries}
                occupiedEntries={capacityByCampaign.get(campaign.id) ?? 0}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
