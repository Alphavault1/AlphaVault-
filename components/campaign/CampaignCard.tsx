import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/campaign/StatusBadge";

interface CampaignCardProps {
  href: string;
  name: string;
  status: string;
  rewardAmount: number;
  requirementsCount: number;
  maxEntries: number;
  occupiedEntries: number;
}

export function CampaignCard({
  href,
  name,
  status,
  rewardAmount,
  requirementsCount,
  maxEntries,
  occupiedEntries,
}: CampaignCardProps) {
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
        {requirementsCount} requirement{requirementsCount === 1 ? "" : "s"} ·{" "}
        {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left
      </p>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${percentFull}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-display text-2xl text-gold">
          ${rewardAmount.toLocaleString()}
        </span>
        <span className="flex items-center gap-1 font-body text-sm text-slate transition-colors group-hover:text-white">
          View
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
