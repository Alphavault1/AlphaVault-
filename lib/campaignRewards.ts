/**
 * Campaign reward presentation.
 * ------------------------------
 * How reward figures are worded for MEMBERS, in one place.
 *
 * WHY THIS EXISTS: a campaign has two money figures, and which one a member
 * sees changes how the campaign feels.
 *
 *   - reward_amount  — what one accepted entry pays. The number a member
 *                      personally cares about: "what do I get?"
 *   - the pool       — reward_amount × max_entries. The scale of the whole
 *                      campaign: "how much is going out on this?"
 *
 * Members used to see the ENTRY COUNT instead of the pool ("3 spots left",
 * plus a progress bar filling up). That actively discouraged applications:
 * a small remaining number reads as "this is already claimed, someone else
 * got there first," so people self-rejected before applying — the opposite
 * of what an open campaign needs. Showing the pool communicates the same
 * scale without giving anyone a headcount to count themselves out of.
 *
 * The cap itself is unchanged and still fully enforced server-side
 * (max_entries, checked inside submit_campaign_entry's locked transaction).
 * This is a presentation change only — nothing about capacity, budget, or
 * race-safety moved.
 */

/** Total budget for a campaign: what one entry pays × how many can be paid. */
export function rewardPoolTotal(rewardAmount: number, maxEntries: number): number {
  return rewardAmount * maxEntries;
}

/**
 * The member-facing pool figure, e.g. "$125 reward pool".
 *
 * "Reward pool" over alternatives on purpose: it's the established term in
 * crypto/campaign contexts (members already read it on other platforms), it
 * states a total without implying any individual gets that amount, and it
 * matches this brand's register — "up for grabs" and similar read too casual
 * next to the rest of the site's copy.
 */
export function rewardPoolLabel(rewardAmount: number, maxEntries: number): string {
  return `$${rewardPoolTotal(rewardAmount, maxEntries).toLocaleString()} reward pool`;
}

/**
 * What a single accepted entry pays, e.g. "$25 per accepted entry".
 * Always shown alongside the pool — a member seeing only a pool figure could
 * reasonably think that whole amount was theirs, which would be worse than
 * showing no number at all.
 */
export function rewardPerEntryLabel(rewardAmount: number): string {
  return `$${rewardAmount.toLocaleString()} per accepted entry`;
}
