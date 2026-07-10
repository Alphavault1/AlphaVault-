/**
 * About
 * -----
 * The "what we are and where we're headed" section — the piece the brand's own
 * pinned post states plainly but the page was missing. It opens with their goal
 * (to be Web3's go-to community for contributors) and then names the three
 * things members actually come here to do, pulled from lib/content (GOALS).
 *
 * Layout is centered — a deliberate rhythm break from the left-aligned grids in
 * the sections around it. Server component; entrance handled by <Reveal/>.
 */

import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { GOALS } from "@/lib/content";

export function About() {
  return (
    <section id="about" className="anchor-offset bg-ink py-24 md:py-32">
      <div className="container-vault">
        <Reveal className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <SectionLabel>Our Goal</SectionLabel>
          </div>

          <h2 className="mt-6 text-3xl uppercase leading-tight sm:text-4xl md:text-5xl">
            To become Web3&rsquo;s go-to
            <br className="hidden sm:block" /> community for people who build.
          </h2>

          <p className="mt-7 font-body text-lg leading-relaxed text-slate">
            Alpha Vault is a Web3 community built on learning, sharing
            opportunities, and growing together. It exists for the people looking
            to find what&rsquo;s next, collaborate with skilled builders, and grow
            alongside others who take this space as seriously as they do.
          </p>
        </Reveal>

        {/* The three goals, echoing their post's "find / collaborate / grow". */}
        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          {GOALS.map((goal, i) => {
            const Icon = goal.icon;
            return (
              <Reveal
                key={goal.label}
                as="article"
                delay={i * 0.1}
                className="h-full"
              >
                <div className="flex h-full flex-col items-center rounded-2xl border border-white/5 bg-surface-900 p-8 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 text-gold">
                    <Icon size={22} strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-5 font-body text-base font-semibold text-white">
                    {goal.label}
                  </h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-slate">
                    {goal.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
