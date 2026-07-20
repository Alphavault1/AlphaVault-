import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/campaign/StatusBadge";
import { CampaignStatusToggle } from "@/components/admin/CampaignStatusToggle";
import { ExportMenu } from "@/components/admin/ExportMenu";
import { CampaignReferenceForm } from "@/components/admin/CampaignReferenceForm";
import { DeleteCampaignButton } from "@/components/admin/DeleteCampaignButton";
import { EntryReviewTable, type ReviewEntryRow } from "@/components/admin/EntryReviewTable";

export const metadata: Metadata = {
  title: "Manage Campaign — Admin — Alpha Vault",
  robots: { index: false },
};

interface AdminCampaignDetailPageProps {
  params: Promise<{ campaignId: string }>;
}

export default async function AdminCampaignDetailPage({
  params,
}: AdminCampaignDetailPageProps) {
  const { campaignId } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, status, reward_amount, requirements, max_entries, reference_url")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) notFound();

  // get_campaign_capacity is a SECURITY DEFINER FUNCTION (was a view — see
  // the note in app/campaign/page.tsx). Explicitly typed: without generated
  // Supabase database types (this project doesn't use codegen), .rpc()'s
  // inferred type is an empty object, which TypeScript correctly refuses to
  // let us read .occupied_entries etc. off of.
  const { data: capacity } = (await supabase
    .rpc("get_campaign_capacity", { p_campaign_id: campaignId })
    .maybeSingle()) as {
    data: { occupied_entries: number; accepted_entries: number; spots_left: number } | null;
  };

  const acceptedEntries = capacity?.accepted_entries ?? 0;
  const totalPaid = campaign.reward_amount * acceptedEntries;

  const { data: entriesRaw } = await supabase
    .from("campaign_entries")
    .select("id, submission_url, wallet_address, status, review_note, submitted_at, profiles(x_handle)")
    .eq("campaign_id", campaignId)
    .order("submitted_at", { ascending: false });

  // Supabase's embedded-relation typing can surface this as either a single
  // object or an array depending on inferred cardinality — normalise
  // defensively rather than assume one shape.
  const entries: ReviewEntryRow[] = (entriesRaw ?? []).map((e) => {
    const profile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
    return {
      id: e.id,
      xHandle: profile?.x_handle ?? "unknown",
      submissionUrl: e.submission_url,
      walletAddress: e.wallet_address,
      status: e.status,
      reviewNote: e.review_note,
      submittedAt: e.submitted_at,
    };
  });

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

        <div className="mt-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <SectionLabel>Manage Campaign</SectionLabel>
            <div className="mt-4 flex items-center gap-3">
              <h1 className="text-3xl uppercase leading-tight sm:text-4xl">{campaign.name}</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="mt-3 font-body text-slate">
              ${campaign.reward_amount.toLocaleString()} per accepted entry ·{" "}
              {capacity?.occupied_entries ?? 0}/{campaign.max_entries} filled ·{" "}
              {acceptedEntries} accepted
            </p>
            {/* Cost tracking — reward × accepted entries. Pure display math
                from data get_campaign_capacity() already returns; no new
                schema needed for this one. */}
            <p className="mt-1 font-display text-2xl text-gold">
              ${totalPaid.toLocaleString()}{" "}
              <span className="font-body text-sm text-slate">total paid</span>
            </p>
          </div>

          <div className="flex flex-col items-start gap-4 sm:items-end">
            <CampaignStatusToggle campaignId={campaign.id} currentStatus={campaign.status} />
            <ExportMenu campaignId={campaign.id} />
          </div>
        </div>

        <div className="mt-10 max-w-xl">
          <CampaignReferenceForm campaignId={campaign.id} currentUrl={campaign.reference_url} />
        </div>

        <h2 className="mt-14 text-2xl uppercase leading-tight sm:text-3xl">Entries.</h2>
        <div className="mt-6">
          <EntryReviewTable entries={entries} />
        </div>

        <div className="mt-16 border-t border-white/5 pt-8">
          <p className="mb-4 font-body text-xs uppercase tracking-wide text-slate">
            Danger zone
          </p>
          <DeleteCampaignButton campaignId={campaign.id} />
        </div>
      </div>
    </main>
  );
}
