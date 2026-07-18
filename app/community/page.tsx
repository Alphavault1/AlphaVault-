import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CommunityStats } from "@/components/CommunityStats";
import { ContributorCard } from "@/components/ContributorCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";
import { CONTRIBUTORS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Community — Alpha Vault",
  description:
    "The people and numbers behind Alpha Vault — a live look at the community and the contributors building it.",
};

/**
 * /community
 * ----------
 * Unlike /apply (a standalone form flow with no nav/footer), this is a real
 * destination people browse to — so it keeps the full site chrome (Navbar,
 * Footer) rather than the minimal "back to home" pattern.
 *
 * Two blocks, in the order agreed on: a compact stats strip up top ("is this
 * community real?"), then the contributor directory below it ("here's who's
 * in it"). Both pull from lib/content — see the comments there on
 * COMMUNITY_STATS (hand-entered placeholder numbers) and CONTRIBUTORS
 * (example entries standing in for real community members).
 */
export default function CommunityPage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden pt-32 pb-24 md:pb-32">
        <div className="absolute inset-0 -z-10 bg-grid [background-size:64px_64px]" />
        <div className="absolute inset-0 -z-10 bg-radial-fade" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-ink" />

        <div className="container-vault">
          <Reveal className="max-w-2xl">
            <SectionLabel>The Community</SectionLabel>
            <h1 className="mt-6 text-3xl uppercase leading-tight sm:text-4xl md:text-5xl">
              The people building it.
            </h1>
            <p className="mt-5 font-body text-lg leading-relaxed text-slate">
              A live look at who&rsquo;s here and what they&rsquo;re building —
              the proof that this is a working community, not just a landing
              page.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-14">
            <CommunityStats />
          </Reveal>

          <Reveal delay={0.15} className="mt-24">
            <h2 className="text-2xl uppercase leading-tight sm:text-3xl">
              Contributor spotlight.
            </h2>
            <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-slate">
              A few of the builders, designers, and traders adding value inside
              the vault.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CONTRIBUTORS.map((contributor, i) => (
              <Reveal key={contributor.xHandle} delay={0.05 * i} className="h-full">
                <ContributorCard contributor={contributor} />
              </Reveal>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
