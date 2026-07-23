"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  reviewSchema,
  banSchema,
  verificationSchema,
  campaignFormSchema,
  campaignReferenceSchema,
  deleteCampaignSchema,
  setMemberRoleSchema,
  reviewApplicationSchema,
} from "@/lib/campaignSchema";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Admin server actions.
 * ----------------------
 * None of these separately check "is this user an admin?" — that's
 * deliberate, not an oversight. Every RPC here (review_campaign_entry,
 * set_member_ban, set_member_verification) already checks public.is_admin()
 * itself and raises "Administrator access required" if not. Re-checking it
 * here too would just be the same rule enforced twice, with two places that
 * could drift out of sync. The two direct-table operations (createCampaign,
 * updateCampaignStatus) are protected the same way, just via RLS policies
 * (campaigns_insert_admin / campaigns_update_admin) instead of an RPC — same
 * underlying is_admin() check, different enforcement point.
 */

export async function reviewCampaignEntry(input: unknown): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("review_campaign_entry", {
    p_entry_id: parsed.data.entryId,
    p_status: parsed.data.status,
    p_review_note: parsed.data.reviewNote ?? null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/campaign");
  return { ok: true };
}

export async function setMemberBan(input: unknown): Promise<ActionResult> {
  const parsed = banSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("set_member_ban", {
    p_profile_id: parsed.data.profileId,
    p_days: parsed.data.days,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/campaign/members");
  return { ok: true };
}

export async function setMemberVerification(input: unknown): Promise<ActionResult> {
  const parsed = verificationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("set_member_verification", {
    p_profile_id: parsed.data.profileId,
    p_status: parsed.data.status,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/campaign/members");
  return { ok: true };
}

type CreateCampaignResult = { ok: true; campaignId: string } | { ok: false; error: string };

export async function createCampaign(input: unknown): Promise<CreateCampaignResult> {
  const parsed = campaignFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  // Direct insert, not an RPC — RLS's campaigns_insert_admin policy is what
  // actually enforces "must be an admin, and created_by must be yourself."
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name: parsed.data.name,
      requirements: parsed.data.requirements,
      max_entries: parsed.data.maxEntries,
      reward_amount: parsed.data.rewardAmount,
      disclaimer: parsed.data.disclaimer,
      status: parsed.data.status,
      created_by: user.id,
      reference_url: parsed.data.referenceUrl ?? null,
      end_date: parsed.data.endDate?.toISOString() ?? null,
      campaign_type: parsed.data.campaignType,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/campaign");
  return { ok: true, campaignId: data.id as string };
}

const updateStatusSchema = z.object({
  campaignId: z.string().uuid(),
  status: z.enum(["draft", "live", "closed"]),
});

export async function updateCampaignStatus(input: unknown): Promise<ActionResult> {
  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid campaign or status." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.campaignId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/campaign");
  revalidatePath(`/admin/campaign/${parsed.data.campaignId}`);
  return { ok: true };
}

interface WalletExportRow {
  x_handle: string;
  wallet_address: string;
  submission_url: string;
  reviewed_at: string;
}

type WalletExportResult =
  | { ok: true; rows: WalletExportRow[] }
  | { ok: false; error: string };

export async function getCampaignWalletExport(campaignId: string): Promise<WalletExportResult> {
  const parsedId = z.string().uuid().safeParse(campaignId);
  if (!parsedId.success) return { ok: false, error: "Invalid campaign." };

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("export_accepted_campaign_wallets", {
    p_campaign_id: parsedId.data,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: (data ?? []) as WalletExportRow[] };
}

/**
 * updateCampaignReference
 * -------------------------
 * Sets, replaces, or clears the optional reference link on an existing
 * campaign — a plain RLS-gated update (campaigns_update_admin), not an RPC;
 * there's no multi-table side effect here the way delete_campaign has.
 */
export async function updateCampaignReference(input: unknown): Promise<ActionResult> {
  const parsed = campaignReferenceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ reference_url: parsed.data.referenceUrl })
    .eq("id", parsed.data.campaignId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/campaign/${parsed.data.campaignId}`);
  revalidatePath(`/campaign/${parsed.data.campaignId}`);
  return { ok: true };
}

/**
 * deleteCampaign
 * ----------------
 * The "type DELETE to confirm" check happens client-side (see
 * DeleteCampaignButton) before this is even called — this schema re-checks
 * it server-side too, so the action can't be invoked correctly without that
 * exact literal, even by something bypassing the UI. The real safety net is
 * still the delete_campaign RPC itself, which re-verifies admin access
 * independently and reverses every affected profile's counters before
 * anything is actually deleted (see supabase/campaign_schema_04_admin_
 * features.sql for why that reversal has to happen inside the same
 * transaction as the delete, not as a separate step).
 */
export async function deleteCampaign(input: unknown): Promise<ActionResult> {
  const parsed = deleteCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Type DELETE exactly to confirm." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("delete_campaign", {
    p_campaign_id: parsed.data.campaignId,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/campaign");
  return { ok: true };
}

interface SubmissionExportRow {
  x_handle: string;
  submission_url: string;
  status: string;
  submitted_at: string;
}

type SubmissionExportResult =
  | { ok: true; rows: SubmissionExportRow[] }
  | { ok: false; error: string };

/**
 * getCampaignSubmissionsExport
 * ------------------------------
 * Unlike the wallet export (accepted entries only, for payouts), this
 * returns EVERY entry in the campaign — pending, accepted, and rejected —
 * for an admin doing a first-pass content review before formally deciding on
 * anything. No wallet address in this one; it's about the submitted content,
 * not the payout.
 */
export async function getCampaignSubmissionsExport(
  campaignId: string,
): Promise<SubmissionExportResult> {
  const parsedId = z.string().uuid().safeParse(campaignId);
  if (!parsedId.success) return { ok: false, error: "Invalid campaign." };

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("export_campaign_submissions", {
    p_campaign_id: parsedId.data,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: (data ?? []) as SubmissionExportRow[] };
}

/**
 * setMemberRole
 * ---------------
 * Lets an existing admin promote or demote another member, without needing
 * a developer to run raw SQL each time — see set_member_role in
 * supabase/campaign_schema_05_role_management.sql for the actual guards
 * (can't change your own role, can't demote the last remaining admin).
 */
export async function setMemberRole(input: unknown): Promise<ActionResult> {
  const parsed = setMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("set_member_role", {
    p_profile_id: parsed.data.profileId,
    p_role: parsed.data.role,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/campaign/members");
  return { ok: true };
}

/**
 * reviewCampaignApplication
 * ----------------------------
 * Approve/reject a pending application — the pre-approval gate for
 * "Application Required" campaigns. Same thin-wrapper reasoning as every
 * other review action here: the real rules (idempotent, admin-only) live in
 * review_campaign_application() in
 * supabase/campaign_schema_07_application_required.sql.
 */
export async function reviewCampaignApplication(input: unknown): Promise<ActionResult> {
  const parsed = reviewApplicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("review_campaign_application", {
    p_application_id: parsed.data.applicationId,
    p_status: parsed.data.status,
    p_review_note: parsed.data.reviewNote ?? null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/campaign");
  return { ok: true };
}

interface ApplicationExportRow {
  x_handle: string;
  status: string;
  applied_at: string;
}

type ApplicationExportResult =
  | { ok: true; rows: ApplicationExportRow[] }
  | { ok: false; error: string };

export async function getCampaignApplicationsExport(
  campaignId: string,
): Promise<ApplicationExportResult> {
  const parsedId = z.string().uuid().safeParse(campaignId);
  if (!parsedId.success) return { ok: false, error: "Invalid campaign." };

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("export_campaign_applications", {
    p_campaign_id: parsedId.data,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: (data ?? []) as ApplicationExportRow[] };
}
