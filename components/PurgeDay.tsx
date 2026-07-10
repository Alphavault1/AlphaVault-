/**
 * PurgeDay
 * --------
 * The gating mechanism. Two parts:
 *   1. A three-step access sequence (open radar → guarded core → purge). Because
 *      this genuinely IS an ordered flow, the 01/02/03 markers carry real
 *      meaning here — unlike the ecosystem pillars, which are peers.
 *   2. A callout card pairing the FOMO copy with the live countdown to the next
 *      Purge Day, so the urgency is stated and demonstrated in the same breath.
 */

import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { PurgeCountdown } from "@/components/PurgeCountdown";
import { ACCESS_STEPS, TELEGRAM_URL } from "@/lib/content";

export function PurgeDay() {
  return (
    <section id="gating" className="anchor-offset bg-surface-900 py-24 md:py-32">
      <div className="container-vault">
        <Reveal className="max-w-2xl">
          <SectionLabel>The Gating Mechanism</SectionLabel>
          <h2 className="mt-6 text-3xl leading-tight sm:text-4xl md:text-5xl">
            Access is earned, then defended.
          </h2>
          <p className="mt-5 font-body text-lg leading-relaxed text-slate">
            The update channel is open to all. The core is not. Here is exactly
            how the door works — and when it opens.
          </p>
        </Reveal>

        {/* Access sequence */}
        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {ACCESS_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.step} as="article" delay={i * 0.1} className="h-full">
                <div className="flex h-full flex-col rounded-2xl border border-white/5 bg-black p-8">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-gold">
                      <Icon size={20} strokeWidth={1.75} />
                    </span>
                    <span className="font-body text-sm tracking-eyebrow text-white/20">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="mt-6 font-body text-lg font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-slate">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Countdown callout */}
        <Reveal delay={0.15} className="mt-6">
          <div className="overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-surface-800 to-black p-8 sm:p-10 md:p-12">
            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-lg">
                <h3 className="font-body text-2xl font-bold text-white sm:text-3xl">
                  The next Purge Day is coming.
                </h3>
                <p className="mt-4 leading-relaxed text-slate">
                  When the clock hits zero, invites go out and passive members
                  are cleared. Be on the radar before the window closes.
                </p>
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium text-black transition-shadow hover:shadow-gold-glow"
                >
                  Get on the Radar
                </a>
              </div>

              <div className="w-full shrink-0 lg:w-auto">
                <PurgeCountdown />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
