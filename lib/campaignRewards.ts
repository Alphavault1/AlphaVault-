/**
 * Campaign reward presentation.
 * ------------------------------
 * How the reward is worded for MEMBERS, in one place.
 *
 * A campaign has two money figures: `reward_amount` (what one accepted entry
 * pays) and the pool (`reward_amount × max_entries` — the campaign's total
 * budget). This went through two rounds of client feedback before landing
 * here, worth recording so a future change doesn't accidentally re-litigate
 * settled ground:
 *
 *   1. Members originally saw a live ENTRY COUNT ("3 spots left" + a filling
 *      progress bar). That discouraged applications — a small remaining
 *      number reads as "already claimed, someone beat me to it," so people
 *      self-rejected before applying. Replaced with the pool total, shown
 *      alongside the per-entry figure, so there was no headcount to count
 *      yourself out of.
 *   2. Client reviewed a reference design (a competitor's card showing only
 *      "Budget: $10,000") and confirmed explicitly: match that — pool only,
 *      and drop the per-entry figure too. So what a member sees now is just
 *      the ONE number: the total budget, labeled "Budget."
 *
 * The per-entry amount (`reward_amount`) is NOT gone from the system — admin
 * still needs it for payout math (see app/admin/campaign/[campaignId]/page.tsx,
 * which reads campaign.reward_amount directly for its own "$X per accepted
 * entry · $Y total paid" line). It's specifically gone from what MEMBERS see.
 * This file only ever formats the member-facing figure.
 *
 * The cap itself is unchanged and still fully enforced server-side
 * (max_entries, checked inside submit_campaign_entry's locked transaction).
 * Everything here is presentation only — nothing about capacity, budget, or
 * race-safety moved.
 */

/** Total budget for a campaign: what one entry pays × how many can be paid. */
export function rewardPoolTotal(rewardAmount: number, maxEntries: number): number {
  return rewardAmount * maxEntries;
}

/** The member-facing budget figure, e.g. "$25". Pair with a "Budget" label — this returns the number alone so callers control label placement/sizing (headline treatment differs slightly between the campaign card and the campaign detail page). */
export function rewardPoolFigure(rewardAmount: number, maxEntries: number): string {
  return `$${rewardPoolTotal(rewardAmount, maxEntries).toLocaleString()}`;
}
