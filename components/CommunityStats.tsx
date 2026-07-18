/**
 * CommunityStats
 * --------------
 * A compact, glanceable row of community numbers. Deliberately terse — this is
 * a "prove it's real" strip, not a dashboard. Values are entered by hand (see
 * the comment on COMMUNITY_STATS in lib/content.ts) rather than pulled from a
 * live source, so keeping them accurate is a manual, ongoing task.
 */

import { COMMUNITY_STATS } from "@/lib/content";

export function CommunityStats() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {COMMUNITY_STATS.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-white/5 bg-surface-900 px-6 py-8 text-center"
        >
          <div className="font-display text-4xl text-gold sm:text-5xl">
            {stat.value}
          </div>
          <div className="mt-2 font-body text-sm uppercase tracking-wide text-slate">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
