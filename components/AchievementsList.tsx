/**
 * AchievementsList
 * ----------------
 * A bordered list of milestones, each row split into a date badge (left) and
 * title + description (right).
 *
 * Deliberately NOT another 3-column card grid — the site already uses that
 * pattern twice (Ecosystem's pillars, and the contributor grid this section
 * replaced), so a third identical grid here would start to feel repetitive.
 * A divided list reads as a log of real events, which is closer to what an
 * achievement actually is.
 *
 * Also deliberately NOT numbered (no 01/02/03) and no connecting line — that
 * would imply these are ordered phases of a plan, which is the "Roadmap"
 * timeline concept that was considered and dropped for this site. Achievements
 * are discrete, dated wins, not a sequence — the date badge carries that
 * meaning instead of a step number.
 */

import { Reveal } from "@/components/ui/Reveal";
import { ACHIEVEMENTS } from "@/lib/content";

export function AchievementsList() {
  return (
    <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/5 bg-surface-900">
      {ACHIEVEMENTS.map((achievement, i) => (
        <Reveal key={achievement.title} as="article" delay={i * 0.06}>
          <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:gap-8 sm:p-8">
            <span className="inline-flex shrink-0 items-center justify-center self-start rounded-full border border-gold/30 bg-black px-4 py-1.5 font-body text-xs uppercase tracking-wide text-gold sm:w-32 sm:justify-center">
              {achievement.date}
            </span>
            <div>
              <h3 className="font-body text-lg font-semibold text-white">
                {achievement.title}
              </h3>
              <p className="mt-2 font-body text-[15px] leading-relaxed text-slate">
                {achievement.description}
              </p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
