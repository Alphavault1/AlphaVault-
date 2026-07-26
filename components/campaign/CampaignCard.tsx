import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/campaign/StatusBadge";
import { rewardPoolLabel } from "@/lib/campaignRewards";

interface CampaignCardProps {
  href: string;
  name: string;
  status: string;
  rewardAmount: number;
  requirementsCount: number;
  maxEntries: number;
  occupiedEntries: number;
  endDate?: string | null;
  /**
   * Who's looking at this card. This component renders on BOTH the member
   * campaign list and the admin dashboard, and they need different things:
   *
   *   "member" (default) — shows the reward pool. No spot count, no fill bar:
   *     both told a browsing member how contested the campaign already was,
   *     which made people assume it was taken and not apply. See
   *     lib/campaignRewards.ts for the full reasoning.
   *
   *   "admin" — shows spots left and the fill bar, because an admin managing
   *     capacity genuinely needs to see how full a campaign is at a glance.
   *
   * Defaults to "member" deliberately: if a new call site forgets to pass
   * this, it fails toward showing LESS internal detail, not more.
   */
  audience?: "member" | "admin";
}

function formatEndDate(endDate: string): string {
  const daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  if (daysLeft < 0) return "Ended";
  if (daysLeft === 0) return "Ends today";
  if (daysLeft === 1) return "Ends tomorrow";
  return `${daysLeft} days left`;
}

export function CampaignCard({
  href,
  name,
  status,
  rewardAmount,
  requirementsCount,
  maxEntries,
  occupiedEntries,
  endDate,
  audience = "member",
}: CampaignCardProps) {
  const isAdmin = audience === "admin";
  const spotsLeft = Math.max(0, maxEntries - occupiedEntries);
  const percentFull = Math.min(100, (occupiedEntries / maxEntries) * 100);

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-white/5 bg-surface-900 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:bg-surface-800"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-body text-lg font-semibold text-white">{name}</h3>
        <StatusBadge status={status} />
      </div>

      <p className="mt-2 font-body text-sm text-slate">
        {requirementsCount} requirement{requirementsCount === 1 ? "" : "s"}
        {isAdmin && (
          <>
            {" "}
            · {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left
          </>
        )}
        {endDate && <> · {formatEndDate(endDate)}</>}
      </p>

      {/* Capacity bar — admin only. A filling bar is the same "already
          claimed" signal as the spot count, just visual, so it comes out of
          the member view alongside it. */}
      {isAdmin && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${percentFull}%` }}
          />
        </div>
      )}

      {!isAdmin && (
        <p className="mt-4 font-body text-sm text-bronze">
          {rewardPoolLabel(rewardAmount, maxEntries)}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        {/* The per-entry figure stays the headline number: it's what a member
            actually earns. The pool above it conveys scale — showing only a
            pool would invite someone to think the whole amount was theirs. */}
        <span className="font-display text-2xl text-gold">
          ${rewardAmount.toLocaleString()}
          {!isAdmin && (
            <span className="ml-1.5 font-body text-xs text-slate">per entry</span>
          )}
        </span>
        <span className="flex items-center gap-1 font-body text-sm text-slate transition-colors group-hover:text-white">
          View
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
