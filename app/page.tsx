import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Manifesto } from "@/components/Manifesto";
import { Ecosystem } from "@/components/Ecosystem";
import { PurgeDay } from "@/components/PurgeDay";
import { CampaignCallout } from "@/components/CampaignCallout";
import { Footer } from "@/components/Footer";
import { ScrollToHash } from "@/components/ScrollToHash";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The landing page composition. Order follows the funnel: hook (Hero) → vision
 * (About / Our Goal) → the filter (Manifesto) → what's inside (Ecosystem) → how
 * to get in (PurgeDay) → a lighter, free alternative path (CampaignCallout) →
 * final push (Footer). CampaignCallout sits AFTER PurgeDay specifically so the
 * vault's strict pitch lands first, before a genuinely different, open path is
 * introduced — see that component's header comment for why it isn't folded
 * into PurgeDay's card instead. The navbar sits outside <main> as it's site
 * chrome.
 *
 * Auth state is fetched here, server-side, and passed into Navbar as its
 * INITIAL state — not left for Navbar to discover on its own after mounting.
 * That "discover after mounting" approach is what caused the flash someone
 * would see on every fresh load or return to this page: Navbar always
 * rendered "Sign In" first (its hardcoded default), then corrected itself to
 * "Dashboard" a moment later once its own client-side check finished. By the
 * time this page's HTML reaches the browser, the correct answer is already
 * known and baked in — nothing to correct after the fact. Navbar still keeps
 * its own live auth-state subscription too, for the case where someone signs
 * in or out without a full page navigation (e.g. through a modal) — this
 * server fetch only fixes the initial value, not live updates.
 */
export default async function Home() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialRole: "admin" | "creator" | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    initialRole = (profile?.role as "admin" | "creator") ?? "creator";
  }

  return (
    <>
      <Navbar initialIsSignedIn={!!user} initialRole={initialRole} />
      <ScrollToHash />
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
