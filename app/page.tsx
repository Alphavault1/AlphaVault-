import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Manifesto } from "@/components/Manifesto";
import { Ecosystem } from "@/components/Ecosystem";
import { PurgeDay } from "@/components/PurgeDay";
import { Footer } from "@/components/Footer";

/**
 * The landing page composition. Order follows the funnel: hook (Hero) → vision
 * (About / Our Goal) → the filter (Manifesto) → what's inside (Ecosystem) → how
 * to get in (PurgeDay) → final push (Footer). The navbar sits outside <main> as
 * it's site chrome.
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
      </main>
      <Footer />
    </>
  );
}
