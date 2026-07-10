/**
 * Manifesto
 * ---------
 * The community's "filter" stated plainly. Visually it's a single bordered
 * panel with a gold rule down the left edge — the copy is the hero here, so the
 * surrounding design stays quiet: one accent, generous space, nothing else.
 *
 * This is a server component: it has no interactivity, so there's no reason to
 * ship it to the client. The entrance animation is delegated to <Reveal/>.
 */

import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function Manifesto() {
  return (
    <section id="manifesto" className="anchor-offset bg-ink py-24 md:py-32">
      <div className="container-vault">
        <Reveal className="mx-auto max-w-4xl text-center">
          <SectionLabel>The Manifesto</SectionLabel>
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-10 max-w-4xl">
          <blockquote className="relative rounded-2xl border border-white/5 bg-surface-900 p-8 sm:p-12 md:p-16">
            {/* Gold rule: the single accent that carries the panel. */}
            <span
              aria-hidden
              className="absolute left-0 top-8 bottom-8 w-[3px] rounded-full bg-gradient-to-b from-gold to-bronze"
            />

            <p className="font-display text-2xl uppercase leading-snug tracking-wide text-white sm:text-3xl md:text-4xl md:leading-[1.25]">
              No observers. No passive members.
            </p>

            <p className="mt-6 font-body text-lg leading-relaxed text-slate sm:text-xl">
              This community is built strictly for contributors. Everyone carries
              the weight here — not just the founder and team — and no one just
              consumes without adding value.
            </p>

            <p className="mt-5 font-body text-base leading-relaxed text-muted sm:text-lg">
              We&rsquo;re not a whitelist hustling house. Whitelists are one way we
              reward members who consistently show up and add value — never a
              reason to join. If you&rsquo;re here to farm WL, this probably
              isn&rsquo;t the place for you.
            </p>

            <footer className="mt-8 font-body text-xs uppercase tracking-eyebrow text-bronze">
              — The Alpha Vault Standard
            </footer>
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}
