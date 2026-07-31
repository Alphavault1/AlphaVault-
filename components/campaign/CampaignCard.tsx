import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/campaign/StatusBadge";
import { rewardPoolFigure } from "@/lib/campaignRewards";

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
   *   "member" (default) — shows ONLY the total budget ("Budget · $X"). No
   *     spot count, no fill bar, no per-entry figure. Confirmed directly by
   *     the client against a reference design: match that card exactly — one
   *     number, the total. See lib/campaignRewards.ts for the full history.
   *
   *   "admin" — shows spots left, the fill bar, and the raw per-entry
   *     reward, because an admin managing capacity and payouts genuinely
   *     needs those numbers, not the member-facing summary.
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
          claimed" signal as the spot count, just visual, so it stays out of
          the member view alongside it. */}
      {isAdmin && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${percentFull}%` }}
          />
        </div>
      )}

      <div className="mt-4 flex items-end justify-between">
        {isAdmin ? (
          // Admin needs the per-entry payout figure, not the budget summary.
          <span className="font-display text-2xl text-gold">
            ${rewardAmount.toLocaleString()}
          </span>
        ) : (
          <div>
            <p className="font-body text-xs uppercase tracking-wide text-slate">
              Budget
            </p>
            <p className="mt-0.5 font-display text-2xl text-gold">
              {rewardPoolFigure(rewardAmount, maxEntries)}
            </p>
          </div>
        )}
        <span className="flex items-center gap-1 font-body text-sm text-slate transition-colors group-hover:text-white">
          View
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
