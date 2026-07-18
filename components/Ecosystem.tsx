/**
 * Ecosystem
 * ---------
 * Three pillars in a balanced grid. Cards lean on hairline borders and space
 * rather than filled backgrounds, matching the disciplined dark aesthetic.
 *
 * These pillars are peers, not steps, so there's deliberately no 01/02/03
 * numbering — numbering here would imply a sequence that doesn't exist.
 *
 * Data comes from lib/content, so the markup is a pure map over PILLARS.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { PILLARS, COMMUNITY_PATH } from "@/lib/content";

export function Ecosystem() {
  return (
    <section id="ecosystem" className="anchor-offset bg-ink py-24 md:py-32">
      <div className="container-vault">
        <Reveal className="max-w-2xl">
          <SectionLabel>The Ecosystem</SectionLabel>
          <h2 className="mt-6 text-3xl leading-tight sm:text-4xl md:text-5xl">
            Built for people who ship.
          </h2>
          <p className="mt-5 font-body text-lg leading-relaxed text-slate">
            Three pillars hold the vault together. Each one exists to move
            contributors from insight to action — and to keep the signal high.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <Reveal
                key={pillar.title}
                as="article"
                delay={i * 0.1}
                className="group h-full"
              >
                <div className="flex h-full flex-col rounded-2xl border border-white/5 bg-surface-900 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:bg-surface-800">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black text-gold transition-colors duration-300 group-hover:border-gold/40">
                    <Icon size={22} strokeWidth={1.75} />
                  </span>

                  <h3 className="mt-6 font-body text-xl font-semibold text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 font-body text-[15px] leading-relaxed text-slate">
                    {pillar.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Community callout — deliberately NOT a new section. Extending
            Ecosystem here (hairline divider, no new background/padding block)
            keeps this page's length exactly as it was: "here's what's
            inside" (the pillars above) naturally continues into "here's who's
            actually in it," rather than costing a whole new scroll-length
            section for one link. Same reasoning as the Purge Day countdown
            living inside the Gating Mechanism section instead of its own. */}
        <Reveal delay={0.3} className="mt-14 border-t border-white/5 pt-10">
          <div className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
            <div>
              <p className="font-body text-xs uppercase tracking-eyebrow text-bronze">
                Meet the people building it
              </p>
              <p className="mt-2 font-body text-lg text-white">
                Real members, real contributors — see who&rsquo;s inside.
              </p>
            </div>
            <Link
              href={COMMUNITY_PATH}
              className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-gold px-6 py-3 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow"
            >
              See the Community
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
