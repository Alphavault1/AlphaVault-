"use server";

import { revalidatePath } from "next/cache";
import { entrySchema, applicationSchema } from "@/lib/campaignSchema";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * submitCampaignEntry
 * --------------------
 * Deliberately thin: this action's own job is just validating shape and
 * calling the RPC. Every real rule — must be verified, must not be banned,
 * campaign must be live, must have spots left, race-safety against
 * concurrent submissions — lives in submit_campaign_entry() in
 * supabase/campaign_schema_02_multi_campaign.sql, not duplicated here. That
 * keeps the rules defined in exactly one place.
 */
export async function submitCampaignEntry(input: unknown): Promise<ActionResult> {
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase.rpc("submit_campaign_entry", {
    p_campaign_id: parsed.data.campaignId,
    p_submission_url: parsed.data.submissionUrl,
    p_wallet_address: parsed.data.walletAddress,
    p_payment_method: parsed.data.paymentMethod,
  });

  if (error) {
    // The RPC's own RAISE EXCEPTION messages are already written to be
    // shown directly to the person submitting (see the SQL file's comments)
    // — e.g. "This campaign is full," "You have already entered this
    // campaign" — so passing error.message straight through is correct here,
    // not a shortcut.
    return { ok: false, error: error.message };
  }

  // Same reasoning as submitCampaignApplication below: the admin's review
  // views need to see this entry appear, so they're revalidated here too
  // rather than relying on an admin happening to trigger a refresh.
  revalidatePath(`/campaign/${parsed.data.campaignId}`);
  revalidatePath("/campaign");
  revalidatePath(`/admin/campaign/${parsed.data.campaignId}`);
  revalidatePath("/admin/campaign");
  return { ok: true };
}

/**
 * submitCampaignApplication
 * ----------------------------
 * The pre-approval step for "Application Required" campaigns — same thin
 * wrapper pattern as submitCampaignEntry above. All the real rules (must be
 * verified, campaign must actually require an application, can't apply
 * twice) live in submit_campaign_application() in
 * supabase/campaign_schema_07_application_required.sql.
 */
export async function submitCampaignApplication(input: unknown): Promise<ActionResult> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase.rpc("submit_campaign_application", {
    p_campaign_id: parsed.data.campaignId,
  });

  if (error) return { ok: false, error: error.message };

  // Revalidate the ADMIN views too, not just the member's own page — an
  // admin reviewing applications needs to see this one appear. (The pages
  // themselves are also force-dynamic now, so this is belt-and-braces rather
  // than the sole guarantee.)
  revalidatePath(`/campaign/${parsed.data.campaignId}`);
  revalidatePath(`/admin/campaign/${parsed.data.campaignId}`);
  revalidatePath("/admin/campaign");
  return { ok: true };
}
