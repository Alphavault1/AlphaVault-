import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CommunityStats } from "@/components/CommunityStats";
import { AchievementsList } from "@/components/AchievementsList";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Community — Alpha Vault",
  description:
    "The numbers and milestones behind Alpha Vault — a live look at the community.",
};

/**
 * /community
 * ----------
 * Unlike /apply (a standalone form flow with no nav/footer), this is a real
 * destination people browse to — so it keeps the full site chrome (Navbar,
 * Footer) rather than the minimal "back to home" pattern.
 *
 * Two blocks: a compact stats strip up top ("is this community real?"), then
 * a list of achievements below it ("here's what it's actually done"). Both
 * pull from lib/content — see the comments there on COMMUNITY_STATS
 * (hand-entered placeholder numbers) and ACHIEVEMENTS (placeholder
 * milestones). This page previously also had a contributor spotlight grid;
 * the client asked to drop that entirely, so this section was rebuilt as
 * Achievements rather than left empty.
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
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-body text-sm text-slate transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>

          <Reveal className="mt-10 max-w-2xl">
            <SectionLabel>The Community</SectionLabel>
            <h1 className="mt-6 text-3xl uppercase leading-tight sm:text-4xl md:text-5xl">
              Proof it&rsquo;s real.
            </h1>
            <p className="mt-5 font-body text-lg leading-relaxed text-slate">
              A live look at Alpha Vault&rsquo;s numbers and the milestones
              behind them — this is a working community, not just a landing
              page.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-14">
            <CommunityStats />
          </Reveal>

          <Reveal delay={0.15} className="mt-24">
            <h2 className="text-2xl uppercase leading-tight sm:text-3xl">
              Achievements.
            </h2>
            <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-slate">
              Real milestones from inside the vault, logged as they happen.
            </p>
          </Reveal>

          <div className="mt-10">
            <AchievementsList />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
