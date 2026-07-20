import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CampaignCard } from "@/components/campaign/CampaignCard";

export const metadata: Metadata = {
  title: "Campaign — Alpha Vault",
  robots: { index: false },
};

// 🛠️ SET TO true TO BYPASS SUPABASE AUTH & TEST THE UI LOCALLY
const MOCK_MODE = true; 
// Change to "pending", "approved", or "rejected" to see different layout states
const MOCK_STATUS: "approved" | "pending" | "rejected" = "approved"; 

export default async function CampaignPage() {
  // --- MOCK FLOW FOR LOCAL TESTING ---
  if (MOCK_MODE) {
    const mockProfile = {
      x_handle: "dev_tester",
      status: MOCK_STATUS,
      total_earnings: 1250,
      campaigns_entered: 5,
      campaigns_accepted: 3,
      campaigns_rejected: 1,
    };

    const mockLiveCampaigns = [
      {
        id: "mock-1",
        name: "Alpha Launch Hype Campaign",
        status: "live",
        reward_amount: 250,
        requirements: ["Follow X", "Retweet Announcement"],
        max_entries: 100,
        occupied_entries: 42,
      },
      {
        id: "mock-2",
        name: "Ecosystem Liquidity Booster",
        status: "live",
        reward_amount: 500,
        requirements: ["Join Telegram", "Hold Alpha NFT"],
        max_entries: 50,
        occupied_entries: 50, // Full campaign example
      }
    ];

    return (
      <main className="relative overflow-hidden py-24">
        <div className="absolute inset-0 -z-10 bg-grid [background-size:64px_64px]" />
        <div className="absolute inset-0 -z-10 bg-radial-fade" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-ink" />

        <div className="container-vault">
          <div className="mx-auto max-w-lg text-center">
            {/* Mock Mode Banner Indicator */}
            <div className="mb-6 rounded-md bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-400">
              ⚠️ Mock Staging Mode Active (Status: {mockProfile.status.toUpperCase()})
            </div>

            {mockProfile.status === "pending" && (
              <>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 text-gold">
                  <Clock size={26} strokeWidth={1.75} />
                </span>
                <div className="mt-6 flex justify-center">
                  <SectionLabel>Under Review</SectionLabel>
                </div>
                <h1 className="mt-6 text-3xl uppercase leading-tight sm:text-4xl">
                  @{mockProfile.x_handle}, you&rsquo;re in the queue.
                </h1>
                <p className="mx-auto mt-4 max-w-md font-body leading-relaxed text-slate">
                  Your profile is being reviewed. This page updates automatically once a decision&rsquo;s made.
                </p>
              </>
            )}

            {mockProfile.status === "approved" && (
              <>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 text-gold">
                  <CheckCircle2 size={26} strokeWidth={1.75} />
                </span>
                <div className="mt-6 flex justify-center">
                  <SectionLabel>Approved</SectionLabel>
                </div>
                <h1 className="mt-6 text-3xl uppercase leading-tight sm:text-4xl">
                  @{mockProfile.x_handle}
                </h1>

                <div className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-white/5 bg-surface-900 p-5">
                    <p className="font-display text-2xl text-gold">
                      ${mockProfile.total_earnings.toLocaleString()}
                    </p>
                    <p className="mt-1 font-body text-xs uppercase tracking-wide text-slate">
                      Earned
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-surface-900 p-5">
                    <p className="font-display text-2xl text-white">
                      {mockProfile.campaigns_accepted}
                    </p>
                    <p className="mt-1 font-body text-xs uppercase tracking-wide text-slate">
                      Accepted
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-surface-900 p-5">
                    <p className="font-display text-2xl text-white">
                      {mockProfile.campaigns_entered}
                    </p>
                    <p className="mt-1 font-body text-xs uppercase tracking-wide text-slate">
                      Entered
                    </p>
                  </div>
                </div>
              </>
            )}

            {mockProfile.status === "rejected" && (
              <>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 text-slate">
                  <XCircle size={26} strokeWidth={1.75} />
                </span>
                <div className="mt-6 flex justify-center">
                  <SectionLabel>Not This Time</SectionLabel>
                </div>
                <h1 className="mt-6 text-3xl uppercase leading-tight sm:text-4xl">
                  @{mockProfile.x_handle}
                </h1>
                <p className="mx-auto mt-4 max-w-md font-body leading-relaxed text-slate">
                  Your application wasn&rsquo;t approved this round. Stay on the radar — future campaigns may reopen.
                </p>
              </>
            )}

            {mockProfile.status !== "approved" && (
              <Link
                href="/"
                className="mt-10 inline-block font-body text-sm text-slate transition-colors hover:text-white"
              >
                Back to home
              </Link>
            )}
          </div>

          {mockProfile.status === "approved" && (
            <div className="mx-auto mt-16 max-w-3xl">
              <h2 className="text-2xl uppercase leading-tight sm:text-3xl">
                Live campaigns.
              </h2>
              <p className="mt-3 font-body text-slate">
                Enter one to submit your X post and wallet for review.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {mockLiveCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    href={`/campaign/${campaign.id}`}
                    name={campaign.name}
                    status={campaign.status}
                    rewardAmount={campaign.reward_amount}
                    requirementsCount={campaign.requirements.length}
                    maxEntries={campaign.max_entries}
                    occupiedEntries={campaign.occupied_entries}
                  />
                ))}
              </div>

              <div className="mt-10 text-center">
                <Link
                  href="/"
                  className="font-body text-sm text-slate transition-colors hover:text-white"
                >
                  Back to home
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // --- ORIGINAL LIVE DATABASE FLOW ---
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "x_handle, status, total_earnings, campaigns_entered, campaigns_accepted, campaigns_rejected",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/");

  let liveCampaigns: {
    id: string;
    name: string;
    status: string;
    reward_amount: number;
    requirements: string[];
    max_entries: number;
    occupied_entries: number;
  }[] = [];

  if (profile.status === "approved") {
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, name, status, reward_amount, requirements, max_entries")
      .eq("status", "live")
      .order("created_at", { ascending: false });

    const campaignIds = (campaigns ?? []).map((c) => c.id);

    const { data: capacities } =
      campaignIds.length > 0
        ? await supabase
            .from("campaign_capacity")
            .select("campaign_id, occupied_entries")
            .in("campaign_id", campaignIds)
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
            <Link
              href="/"
              className="mt-10 inline-block font-body text-sm text-slate transition-colors hover:text-white"
            >
              Back to home
            </Link>
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
                  />
                ))}
              </div>
            )}

            <div className="mt-10 text-center">
              <Link
                href="/"
                className="font-body text-sm text-slate transition-colors hover:text-white"
              >
                Back to home
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
