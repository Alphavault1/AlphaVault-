"use client";

/**
 * ScrollToHash
 * -------------
 * Mounted once on the homepage. Its only job: if you arrive at "/" with a
 * hash already in the URL (e.g. someone on /community clicked "Ecosystem" in
 * the nav, which now navigates to "/#ecosystem" instead of doing nothing —
 * see Navbar.tsx), make sure the browser actually lands on that section.
 *
 * This isn't purely decorative — Next.js's own hash-scroll-after-navigation
 * behavior can fire before the page's content has fully settled (particularly
 * with Reveal's whileInView animations still mounting), so relying on it
 * alone is a real, correctness-affecting risk here, not just polish. Renders
 * nothing; it's a pure side-effect component.
 */

import { useEffect } from "react";
import { useReducedMotion } from "framer-motion";

export function ScrollToHash() {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    // A short delay, same reasoning as Navbar's own post-navigation scrolls
    // elsewhere in this codebase: give the page a beat to finish rendering
    // before asking the browser to measure and scroll to an element's
    // position, rather than racing initial layout/hydration.
    const timeoutId = window.setTimeout(() => {
      document
        .querySelector(hash)
        ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }, 150);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only ever needs to run once, on mount
  }, []);

  return null;
}
