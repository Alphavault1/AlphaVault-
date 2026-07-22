import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CampaignCard } from "@/components/campaign/CampaignCard";
import { SignOutButton } from "@/components/campaign/SignOutButton";

export const metadata: Metadata = {
  title: "Campaign — Alpha Vault",
  robots: { index: false }, // a member's own portal has no reason to be indexed
};

/**
 * /campaign
 * ---------
 * Server-rendered: the pending/approved/rejected branching, and the live
 * campaign list, both depend on real database state checked server-side
 * before anything renders.
 *
 * Not signed in at all -> straight back to home. There's no "please sign in"
 * page to build here; Sign In is a modal reachable from Navbar on every page.
 *
 * The stats shown for an approved member (earnings, entered/accepted/
 * rejected) are now REAL — pulled from profiles' own columns, which the
 * review_campaign_entry RPC keeps in sync every time an admin reviews an
 * entry. Phase 1 showed a placeholder "—" here because those columns didn't
 * exist yet; they do now.
 */
export default async function CampaignPage() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "x_handle, role, status, total_earnings, campaigns_entered, campaigns_accepted, campaigns_rejected",
    )
    .eq("id", user.id)
    .maybeSingle();

  // Admins land here too now (sign-in no longer decides this client-side —
  // see SignInModal's own comment on why), so this is where that routing
  // actually happens: server-side, using a profile fetch this page already
  // needed to do for its own rendering regardless. No extra query, no extra
  // round trip — just an additional check against data already in hand.
  if (profile?.role === "admin") redirect("/admin/campaign");

  // The signup trigger should always create this row. If it's somehow
  // missing, something went wrong server-side — safest is to send them home
  // rather than render a broken portal with no data to show.
  if (!profile) redirect("/");

  // Only fetched for approved members — a pending/rejected account can't
  // enter anything yet, so there's no reason to query for it.
  let liveCampaigns: {
    id: string;
    name: string;
    status: string;
    reward_amount: number;
    requirements: string[];
    max_entries: number;
    occupied_entries: number;
    end_date: string | null;
  }[] = [];

  if (profile.status === "approved") {
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, name, status, reward_amount, requirements, max_entries, end_date")
      .eq("status", "live")
      .order("created_at", { ascending: false });

    const campaignIds = (campaigns ?? []).map((c) => c.id);

    // get_campaign_capacity is a SECURITY DEFINER FUNCTION, not a table/view
    // (it used to be a view; that tripped Supabase's linter as a high-risk
    // pattern, so it's now a function instead — same underlying need, the
    // idiomatic form). Called with no campaign_id filter, it returns every
    // live campaign's capacity in one call. Explicitly typed: no generated
    // Supabase database types in this project, so .rpc() needs the cast.
    const { data: capacities } = campaignIds.length > 0
      ? ((await supabase.rpc("get_campaign_capacity")) as {
          data: { campaign_id: string; occupied_entries: number }[] | null;
        })
      : { data: [] as { campaign_id: string; occupied_entries: number }[] };

    const capacityByCampaign = new Map(
      (capacities ?? []).map((c) => [c.campaign_id, c.occupied_entries]),
    );

    liveCampaigns = (campaigns ?? []).map((c) => ({
      ...c,
      occupied_entries: capacityByCampaign.get(c.id) ?? 0,
    }));
  }

  return (
    <main className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-10 bg-grid [background-size:64px_64px]" />
      <div className="absolute inset-0 -z-10 bg-radial-fade" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-ink" />

      <div className="container-vault">
        <div className="mx-auto max-w-lg text-center">
          {profile.status === "pending" && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 text-gold">
                <Clock size={26} strokeWidth={1.75} />
              </span>
              <div className="mt-6 flex justify-center">
                <SectionLabel>Under Review</SectionLabel>
              </div>
              <h1 className="mt-6 text-3xl uppercase leading-tight sm:text-4xl">
                @{profile.x_handle}, you&rsquo;re in the queue.
              </h1>
              <p className="mx-auto mt-4 max-w-md font-body leading-relaxed text-slate">
                Your profile is being reviewed. This page updates automatically
                once a decision&rsquo;s made — no need to do anything else for
                now.
              </p>
            </>
          )}

          {profile.status === "approved" && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 text-gold">
                <CheckCircle2 size={26} strokeWidth={1.75} />
              </span>
              <div className="mt-6 flex justify-center">
                <SectionLabel>Approved</SectionLabel>
              </div>
              <h1 className="mt-6 text-3xl uppercase leading-tight sm:text-4xl">
                @{profile.x_handle}
              </h1>

              <div className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/5 bg-surface-900 p-5">
                  <p className="font-display text-2xl text-gold">
                    ${profile.total_earnings.toLocaleString()}
                  </p>
                  <p className="mt-1 font-body text-xs uppercase tracking-wide text-slate">
                    Earned
                  </p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-surface-900 p-5">
                  <p className="font-display text-2xl text-white">
                    {profile.campaigns_accepted}
                  </p>
                  <p className="mt-1 font-body text-xs uppercase tracking-wide text-slate">
                    Accepted
                  </p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-surface-900 p-5">
                  <p className="font-display text-2xl text-white">
                    {profile.campaigns_entered}
                  </p>
                  <p className="mt-1 font-body text-xs uppercase tracking-wide text-slate">
                    Entered
                  </p>
                </div>
              </div>
            </>
          )}

          {profile.status === "rejected" && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 text-slate">
                <XCircle size={26} strokeWidth={1.75} />
              </span>
              <div className="mt-6 flex justify-center">
                <SectionLabel>Not This Time</SectionLabel>
              </div>
              <h1 className="mt-6 text-3xl uppercase leading-tight sm:text-4xl">
                @{profile.x_handle}
              </h1>
              <p className="mx-auto mt-4 max-w-md font-body leading-relaxed text-slate">
                Your application wasn&rsquo;t approved this round. Stay on the
                radar — future campaigns may reopen.
              </p>
            </>
          )}

          {profile.status !== "approved" && (
            <div className="mt-10 flex items-center justify-center gap-6">
              <Link href="/" className="font-body text-sm text-slate transition-colors hover:text-white">
                Back to home
              </Link>
              <SignOutButton />
            </div>
          )}
        </div>

        {profile.status === "approved" && (
          <div className="mx-auto mt-16 max-w-3xl">
            <h2 className="text-2xl uppercase leading-tight sm:text-3xl">
              Live campaigns.
            </h2>
            <p className="mt-3 font-body text-slate">
              Enter one to submit your X post and wallet for review.
            </p>

            {liveCampaigns.length === 0 ? (
              <p className="mt-8 rounded-2xl border border-white/5 bg-surface-900 p-8 text-center font-body text-slate">
                No campaigns are live right now — check back soon.
              </p>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {liveCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    href={`/campaign/${campaign.id}`}
                    name={campaign.name}
                    status={campaign.status}
                    rewardAmount={campaign.reward_amount}
                    requirementsCount={campaign.requirements.length}
                    maxEntries={campaign.max_entries}
                    occupiedEntries={campaign.occupied_entries}
                    endDate={campaign.end_date}
                  />
                ))}
              </div>
            )}

            <div className="mt-10 flex items-center justify-center gap-6">
              <Link href="/" className="font-body text-sm text-slate transition-colors hover:text-white">
                Back to home
              </Link>
              <SignOutButton />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
