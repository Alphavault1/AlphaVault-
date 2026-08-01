import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { PILL_BUTTON_CLASS } from "@/components/ui/buttonStyles";
import { StatusBadge } from "@/components/campaign/StatusBadge";
import { rewardPoolTotal } from "@/lib/campaignRewards";
import { CampaignStatusToggle } from "@/components/admin/CampaignStatusToggle";
import { ExportMenu } from "@/components/admin/ExportMenu";
import { CampaignReferenceForm } from "@/components/admin/CampaignReferenceForm";
import { DeleteCampaignButton } from "@/components/admin/DeleteCampaignButton";
import { EntryReviewTable, type ReviewEntryRow } from "@/components/admin/EntryReviewTable";
import { ApplicationReviewTable, type ReviewApplicationRow } from "@/components/admin/ApplicationReviewTable";

export const metadata: Metadata = {
  title: "Manage Campaign — Admin — Alpha Vault",
  robots: { index: false },
};

/**
 * Never serve this page from the full-route cache.
 *
 * This page shows live data that changes from OUTSIDE any admin action:
 * members submit applications and entries at any time, and none of those
 * member-side server actions revalidate this admin path (nor should they
 * have to — an admin page shouldn't depend on every member action
 * remembering to invalidate it). Without this, an admin could sit on a
 * cached render from before an application existed and conclude, reasonably,
 * that nothing had come in.
 *
 * That is exactly what happened: a member's application was confirmed
 * present in the database and returned correctly by an API route using the
 * same session and the same RLS path — while this page kept rendering "No
 * applications yet" from cache.
 *
 * force-dynamic guarantees a fresh render per request. The cost is one
 * database round trip per view, on an admin-only page with a handful of
 * users — a trade worth making for a page whose entire job is showing the
 * current state of incoming submissions.
 */
export const dynamic = "force-dynamic";

interface AdminCampaignDetailPageProps {
  params: Promise<{ campaignId: string }>;
}

export default async function AdminCampaignDetailPage({
  params,
}: AdminCampaignDetailPageProps) {
  const { campaignId } = await params;
  const supabase = await getSupabaseServerClient();

  // These three don't depend on each other, so they run concurrently rather
  // than sequentially. Previously each awaited the last — meaning the page
  // paid the full network latency of all three stacked end to end before it
  // could render anything. On a campaign that was just created (the redirect
  // target after creation), that stacking is the single biggest contributor
  // to the "creating a campaign feels stuck" delay.
  //
  // The applications query stays separate below: it's conditional on
  // campaign.campaign_type, which we can't know until the campaign query
  // above actually resolves — a real dependency, not an avoidable one.
  const [campaignResult, capacityResult, entriesResult] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, status, reward_amount, requirements, max_entries, reference_url, end_date, campaign_type")
      .eq("id", campaignId)
      .maybeSingle(),
    supabase.rpc("get_campaign_capacity", { p_campaign_id: campaignId }).maybeSingle(),
    supabase
      .from("campaign_entries")
      .select("id, submission_url, wallet_address, payment_method, status, payout_status, review_note, submitted_at, profiles!campaign_entries_profile_id_fkey(x_handle)")
      .eq("campaign_id", campaignId)
      .order("submitted_at", { ascending: false }),
  ]);

  const campaign = campaignResult.data;
  if (!campaign) notFound();

  // get_campaign_capacity is a SECURITY DEFINER FUNCTION (was a view — see
  // the note in app/campaign/page.tsx). Explicitly typed: without generated
  // Supabase database types (this project doesn't use codegen), .rpc()'s
  // inferred type is an empty object, which TypeScript correctly refuses to
  // let us read .occupied_entries etc. off of.
  const capacity = capacityResult.data as {
    occupied_entries: number;
    accepted_entries: number;
    spots_left: number;
  } | null;

  const entriesRaw = entriesResult.data;

  const acceptedEntries = capacity?.accepted_entries ?? 0;

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
      paymentMethod: e.payment_method,
      status: e.status,
      payoutStatus: e.payout_status,
      reviewNote: e.review_note,
      submittedAt: e.submitted_at,
    };
  });

  // Two honest numbers instead of one that overclaimed. The old single
  // "total paid" figure was reward × accepted-count — a calculation of what
  // was OWED, labeled as if the money had already moved. It hadn't; this
  // platform has no payment rail of its own, the real transfer happens
  // manually, off-platform, whenever the admin sends crypto after exporting
  // the accepted-wallets CSV. Flagged directly by the client, correctly.
  //
  // Pending Payout — accepted entries NOT YET marked paid. This is
  // specifically the unpaid subset, not every accepted entry — an earlier
  // pass of this feature used "every accepted entry, paid or not" for this
  // figure, which was corrected after a direct answer clarified the actual
  // intent: this number should represent money still owed right now, not a
  // running total of all approved work ever. If an entry is later marked
  // unpaid again (see the payout-status toggle), it correctly reappears
  // here — this recalculates fresh from current state every render, not
  // from history.
  // Total Disbursed — only entries an admin has explicitly confirmed paid
  // (payout_status = 'paid'). Starts at $0 and only grows on a real click.
  const paidEntries = entries.filter(
    (e) => e.status === "accepted" && e.payoutStatus === "paid",
  ).length;
  const unpaidAcceptedEntries = entries.filter(
    (e) => e.status === "accepted" && e.payoutStatus === "unpaid",
  ).length;
  const totalPendingPayout = campaign.reward_amount * unpaidAcceptedEntries;
  const totalDisbursed = campaign.reward_amount * paidEntries;
  // Not money owed yet — a planning ceiling. Same math as the member-facing
  // Budget card (reward × max_entries), but a different question: Budget
  // answers "is this worth my time" for someone deciding whether to apply;
  // this answers "what's the most this campaign could ever cost me" for the
  // person managing it. Requested directly, distinct from pending payout
  // (which only reflects entries ALREADY accepted) — this reflects the
  // campaign filling completely, which may never happen.
  const maxIfFilled = rewardPoolTotal(campaign.reward_amount, campaign.max_entries);

  const requiresApplication = campaign.campaign_type === "application_required";

  // NOTE the explicit !campaign_applications_profile_id_fkey here, and the
  // matching one on campaign_entries above. Both tables have TWO foreign
  // keys to profiles — profile_id (the member) and reviewed_by (the admin who
  // reviewed it). A bare `profiles(x_handle)` is therefore ambiguous, and
  // PostgREST rejects it with error PGRST201 ("Could not embed because more
  // than one relationship was found") instead of returning rows.
  //
  // This is what made applications and entries appear empty on this page
  // while the rows plainly existed in the database: the query was failing,
  // not returning nothing. Because the results were destructured as `data`
  // only, with `error` discarded, a hard query failure rendered identically
  // to a genuine empty list — no error, no log, no clue.
  //
  // Errors are now captured and surfaced below rather than swallowed.
  const { data: applicationsRaw, error: applicationsError } = requiresApplication
    ? await supabase
        .from("campaign_applications")
        .select("id, status, review_note, applied_at, profiles!campaign_applications_profile_id_fkey(x_handle)")
        .eq("campaign_id", campaignId)
        .order("applied_at", { ascending: false })
    : { data: null, error: null };

  if (applicationsError) {
    console.error("[admin/campaign] applications query failed:", applicationsError);
  }
  if (entriesResult.error) {
    console.error("[admin/campaign] entries query failed:", entriesResult.error);
  }

  const applications: ReviewApplicationRow[] = (applicationsRaw ?? []).map((a) => {
    const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    return {
      id: a.id,
      xHandle: profile?.x_handle ?? "unknown",
      status: a.status,
      reviewNote: a.review_note,
      appliedAt: a.applied_at,
    };
  });

  return (
    <main className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-10 bg-grid [background-size:64px_64px]" />
      <div className="absolute inset-0 -z-10 bg-radial-fade" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-ink" />

      <div className="container-vault">
        <Link href="/admin/campaign" className={PILL_BUTTON_CLASS}>
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
              {campaign.end_date && (
                <>
                  {" "}
                  ·{" "}
                  {new Date(campaign.end_date) <= new Date()
                    ? "Ended"
                    : `Ends ${new Date(campaign.end_date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}`}
                </>
              )}
            </p>
            {/* Two figures now instead of one — see the comment on
                totalPendingPayout/totalDisbursed above for why. */}
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
              <p className="font-display text-2xl text-gold">
                ${totalPendingPayout.toLocaleString()}{" "}
                <span className="font-body text-sm text-slate">pending payout</span>
              </p>
              <p className="font-display text-2xl text-white">
                ${totalDisbursed.toLocaleString()}{" "}
                <span className="font-body text-sm text-slate">total disbursed</span>
              </p>
              {/* Muted on purpose — the two figures above are real money
                  (owed now, or already sent). This one is a hypothetical
                  ceiling: what it WOULD cost if every remaining spot filled,
                  which may never happen. Same gold/white treatment as the
                  others would make it look equally "real," which it isn't. */}
              <p className="font-display text-2xl text-muted">
                ${maxIfFilled.toLocaleString()}{" "}
                <span className="font-body text-sm text-slate">max if filled</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-4 sm:items-end">
            <Link href={`/admin/campaign/${campaign.id}/edit`} className={PILL_BUTTON_CLASS}>
              <Pencil size={14} />
              Edit campaign
            </Link>
            <CampaignStatusToggle campaignId={campaign.id} currentStatus={campaign.status} />
            <ExportMenu campaignId={campaign.id} />
          </div>
        </div>

        <div className="mt-10 max-w-xl">
          <CampaignReferenceForm campaignId={campaign.id} currentUrl={campaign.reference_url} />
        </div>

        {requiresApplication && (
          <>
            <h2 className="mt-14 text-2xl uppercase leading-tight sm:text-3xl">
              Applications.
            </h2>
            <div className="mt-6">
              <ApplicationReviewTable applications={applications} />
            </div>
          </>
        )}

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
