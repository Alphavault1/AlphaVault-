import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/campaign/StatusBadge";
import { EntryForm } from "@/components/campaign/EntryForm";

export const metadata: Metadata = {
  title: "Campaign — Alpha Vault",
  robots: { index: false },
};

interface CampaignDetailPageProps {
  params: Promise<{ campaignId: string }>;
}

/**
 * /campaign/[campaignId]
 * -----------------------
 * Four possible states for the bottom half of this page, checked in order:
 *   1. Not approved yet         -> gate message, no form
 *   2. Already entered          -> show THEIR entry's own status
 *   3. Campaign is full         -> gate message, no form
 *   4. None of the above        -> the entry form
 *
 * The campaign fetch itself relies on RLS (campaigns_select_live_or_admin):
 * if it comes back null, either the campaign doesn't exist or isn't visible
 * to this viewer (e.g. a non-live campaign, since only admins can see those)
 * — either way, a 404 is the honest response, not a more specific error that
 * would leak which case it was.
 */
export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { campaignId } = await params;
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/");

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, requirements, reward_amount, disclaimer, status, max_entries, reference_url")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) notFound();

  // get_campaign_capacity is a SECURITY DEFINER FUNCTION (was a view — see
  // the note in app/campaign/page.tsx). Explicitly typed for the same reason
  // as the admin detail page — no generated Supabase database types here.
  const { data: capacity } = (await supabase
    .rpc("get_campaign_capacity", { p_campaign_id: campaignId })
    .maybeSingle()) as { data: { occupied_entries: number; spots_left: number } | null };

  const { data: existingEntry } = await supabase
    .from("campaign_entries")
    .select("status, review_note")
    .eq("campaign_id", campaignId)
    .eq("profile_id", user.id)
    .maybeSingle();

  const spotsLeft = capacity?.spots_left ?? 0;

  return (
    <main className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-10 bg-grid [background-size:64px_64px]" />
      <div className="absolute inset-0 -z-10 bg-radial-fade" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-ink" />

      <div className="container-vault">
        <Link
          href="/campaign"
          className="inline-flex items-center gap-2 font-body text-sm text-slate transition-colors hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to campaigns
        </Link>

        <div className="mx-auto mt-10 max-w-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SectionLabel>Campaign</SectionLabel>
              <h1 className="mt-4 text-3xl uppercase leading-tight sm:text-4xl">
                {campaign.name}
              </h1>
            </div>
            <StatusBadge status={campaign.status} />
          </div>

          <p className="mt-4 font-display text-3xl text-gold">
            ${campaign.reward_amount.toLocaleString()}{" "}
            <span className="font-body text-base text-slate">per accepted entry</span>
          </p>

          <div className="mt-8 rounded-2xl border border-white/5 bg-surface-900 p-6">
            <p className="font-body text-xs uppercase tracking-wide text-slate">
              Requirements
            </p>
            <ul className="mt-3 space-y-2">
              {campaign.requirements.map((req: string, i: number) => (
                <li key={i} className="font-body text-[15px] leading-relaxed text-white">
                  · {req}
                </li>
              ))}
            </ul>
          </div>

          {campaign.reference_url && (
            <a
              href={campaign.reference_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/30 px-5 py-2.5 font-body text-sm text-gold transition-colors hover:border-gold/60 hover:bg-gold/5"
            >
              View reference
              <ExternalLink size={14} />
            </a>
          )}

          <p className="mt-4 font-body text-xs leading-relaxed text-muted">
            {campaign.disclaimer}
          </p>

          <p className="mt-6 font-body text-sm text-slate">
            {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left
          </p>

          <div className="mt-8">
            {profile.status !== "approved" && (
              <p className="rounded-2xl border border-white/5 bg-surface-900 p-6 text-center font-body text-slate">
                Your account needs to be approved before you can enter a
                campaign.
              </p>
            )}

            {profile.status === "approved" && existingEntry && (
              <div className="rounded-2xl border border-white/5 bg-surface-900 p-6 text-center">
                <p className="font-body text-sm uppercase tracking-wide text-slate">
                  Your entry
                </p>
                <div className="mt-3 flex justify-center">
                  <StatusBadge status={existingEntry.status} />
                </div>
                {existingEntry.status === "rejected" && existingEntry.review_note && (
                  <p className="mt-4 font-body text-sm text-slate">
                    {existingEntry.review_note}
                  </p>
                )}
              </div>
            )}

            {profile.status === "approved" && !existingEntry && spotsLeft <= 0 && (
              <p className="rounded-2xl border border-white/5 bg-surface-900 p-6 text-center font-body text-slate">
                This campaign is full.
              </p>
            )}

            {profile.status === "approved" && !existingEntry && spotsLeft > 0 && (
              <EntryForm campaignId={campaign.id} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
