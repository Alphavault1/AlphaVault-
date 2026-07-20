import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Manifesto } from "@/components/Manifesto";
import { Ecosystem } from "@/components/Ecosystem";
import { PurgeDay } from "@/components/PurgeDay";
import { CampaignCallout } from "@/components/CampaignCallout";
import { Footer } from "@/components/Footer";

/**
 * The landing page composition. Order follows the funnel: hook (Hero) → vision
 * (About / Our Goal) → the filter (Manifesto) → what's inside (Ecosystem) → how
 * to get in (PurgeDay) → a lighter, free alternative path (CampaignCallout) →
 * final push (Footer). CampaignCallout sits AFTER PurgeDay specifically so the
 * vault's strict pitch lands first, before a genuinely different, open path is
 * introduced — see that component's header comment for why it isn't folded
 * into PurgeDay's card instead. The navbar sits outside <main> as it's site
 * chrome.
 */
export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Manifesto />
        <Ecosystem />
        <PurgeDay />
        <CampaignCallout />
      </main>
      <Footer />
    </>
  );
}
