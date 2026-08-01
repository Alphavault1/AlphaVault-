import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CampaignForm } from "@/components/admin/CampaignForm";
import { PILL_BUTTON_CLASS } from "@/components/ui/buttonStyles";

export const metadata: Metadata = {
  title: "Edit Campaign — Admin — Alpha Vault",
  robots: { index: false },
};

interface EditCampaignPageProps {
  params: Promise<{ campaignId: string }>;
}

/**
 * Formats a Date/timestamp as the "YYYY-MM-DD" shape an <input type="date">
 * expects for its value — the exact inverse of campaignFormSchema's endDate
 * transform, which parses that same shape back into a real Date. Timezone
 * note: toISOString() renders in UTC, so this reads the date the way it was
 * originally STORED (end_date is pushed to 23:59:59.999 in the browser's own
 * timezone at creation time, per campaignFormSchema — see that file), not
 * re-interpreted through a different zone here.
 */
function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const { campaignId } = await params;
  const supabase = await getSupabaseServerClient();

  const [campaignResult, capacityResult] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, requirements, reward_amount, max_entries, disclaimer, end_date")
      .eq("id", campaignId)
      .maybeSingle(),
    supabase.rpc("get_campaign_capacity", { p_campaign_id: campaignId }).maybeSingle(),
  ]);

  const campaign = campaignResult.data;
  if (!campaign) notFound();

  // Same explicit-typing note as the campaign detail page: get_campaign_capacity
  // is untyped without Supabase codegen, so .data needs an explicit shape.
  const capacity = capacityResult.data as { accepted_entries: number } | null;
  const acceptedEntries = capacity?.accepted_entries ?? 0;

  return (
    <div className="container-vault py-10">
      <Link href={`/admin/campaign/${campaignId}`} className={PILL_BUTTON_CLASS}>
        <ArrowLeft size={16} />
        Back to campaign
      </Link>

      <div className="mx-auto mt-8 max-w-xl">
        <SectionLabel>Edit Campaign</SectionLabel>
        <h1 className="mt-4 text-3xl uppercase leading-tight sm:text-4xl">{campaign.name}</h1>

        <div className="mt-8">
          <CampaignForm
            mode="edit"
            campaignId={campaign.id}
            initialValues={{
              name: campaign.name,
              requirements: campaign.requirements.join("\n"),
              maxEntries: String(campaign.max_entries),
              rewardAmount: String(campaign.reward_amount),
              disclaimer: campaign.disclaimer,
              endDate: toDateInputValue(campaign.end_date),
            }}
            isLocked={acceptedEntries > 0}
            acceptedEntriesCount={acceptedEntries}
          />
        </div>
      </div>
    </div>
  );
}
