"use client";

/**
 * Navbar
 * ------
 * Sticky glassmorphism header. It's a client component for three reasons:
 *   1. A scroll listener that deepens the blur/border once the user leaves the
 *      hero, so the bar reads as "floating glass" only when there's content
 *      behind it.
 *   2. A mobile menu that animates open/closed with Framer Motion.
 *   3. A full-screen blurred scrim behind the open mobile menu that dims/blurs
 *      the page and doubles as the tap-anywhere-to-close target.
 *
 * IMPORTANT layering detail: the scrim is rendered as a SIBLING of <header>,
 * NOT inside it. The header has `backdrop-blur`, and any ancestor with
 * backdrop-filter/filter/transform becomes the containing block for
 * `position: fixed` descendants — which would shrink a `fixed inset-0` scrim
 * down to the header's little bar instead of the viewport, and also stop its
 * blur from seeing the page. Keeping the scrim outside the header makes it
 * viewport-sized and lets its backdrop blur work. z-index: page < scrim (40) <
 * header + menu (50).
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NAV_LINKS, APPLY_PATH } from "@/lib/content";
import { useCampaignModals } from "@/components/campaign/CampaignModalsProvider";
import vaultMark from "@/public/vault-mark.png";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const { openSignIn } = useCampaignModals();

  useEffect(() => {
    // Threshold is small so the transition happens right as the hero scrolls by.
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll(); // initialise on mount in case the page loads part-scrolled
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes the menu too — expected behaviour for a dismissible overlay.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Lock background scroll while the mobile menu is open. We pin the body with
  // position:fixed (and restore the scroll offset on close) rather than
  // `overflow:hidden`, because iOS Safari / iOS Chrome ignore overflow:hidden on
  // the body and would let the page scroll behind the menu.
  useEffect(() => {
    if (!menuOpen) return;
    const scrollY = window.scrollY;
    const { style } = document.body;
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.left = "0";
    style.right = "0";
    return () => {
      style.position = "";
      style.top = "";
      style.left = "";
      style.right = "";

      // Restore the saved scroll position INSTANTLY, not animated. The site
      // sets `scroll-behavior: smooth` globally, which would otherwise turn
      // this restore into an animated scroll — and that animation runs at the
      // exact same moment the mobile menu panel is also collapsing (its own
      // 250ms height animation, right above). Two concurrent layout-changing
      // animations is a reliable way to get the scroll animation interrupted
      // mid-flight on mobile browsers, leaving the page stranded near the top
      // instead of completing the trip back down to `scrollY`. Toggling
      // scroll-behavior to "auto" just for this one call sidesteps that
      // entirely — same technique Next.js uses internally for its own route
      // transitions (see `disableSmoothScrollDuringRouteTransition`).
      const html = document.documentElement;
      const prevScrollBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, scrollY);
      html.style.scrollBehavior = prevScrollBehavior;
    };
  }, [menuOpen]);

  // Close the mobile menu after any navigation so it never lingers over content.
  const closeMenu = () => setMenuOpen(false);

  /**
   * Mobile section links (#about, #manifesto, etc.) need custom handling
   * instead of a plain anchor jump. Reason: while the mobile menu is open, the
   * background-scroll-lock effect above pins <body> with position:fixed. When
   * a link is tapped, the browser's native "jump to #hash" and our lock's
   * cleanup (which restores the pre-lock scroll position) both fire at nearly
   * the same moment — and the restore reliably wins that race, snapping the
   * page back to where it was and making the tap look like it did nothing.
   *
   * Fix: prevent the native jump, close the menu, and — once the close
   * animation + scroll-lock cleanup have had time to finish — scroll to the
   * target ourselves. This removes the race entirely rather than trying to
   * win it.
   */
  function handleSectionLinkClick(
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    e.preventDefault();
    closeMenu();
    window.setTimeout(
      () => {
        document
          .querySelector(href)
          ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      },
      // Matches the mobile menu's own close-transition duration (0.25s) plus a
      // small buffer, so the scroll only starts once the panel has actually
      // collapsed and the lock's cleanup has already run.
      reduceMotion ? 0 : 320,
    );
  }

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          scrolled
            ? "border-b border-white/10 bg-black/60 backdrop-blur-xl"
            : "border-b border-white/5 bg-black/40 backdrop-blur-md"
        }`}
      >
        {/* Nav row — above the scrim (header is z-50) so it stays crisp/tappable. */}
        <nav className="container-vault flex h-16 items-center justify-between">
          {/* Wordmark */}
          <a
            href="#top"
            onClick={(e) => handleSectionLinkClick(e, "#top")}
            className="flex items-center gap-2.5"
            aria-label="Alpha Vault — back to top"
          >
            <Image
              src={vaultMark}
              alt=""
              aria-hidden
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-white">
              Alpha Vault
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) =>
              link.kind === "route" ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-slate transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-slate transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ),
            )}
            <button
              type="button"
              onClick={openSignIn}
              className="text-sm text-slate transition-colors hover:text-white"
            >
              Sign In
            </button>
            <Link
              href={APPLY_PATH}
              className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-black transition-shadow hover:shadow-gold-glow"
            >
              Enter the Vault
            </Link>
          </div>

          {/* Mobile trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>

        {/* Mobile menu panel — stays inside the header, dropping under the nav
            row. Its own bg is nearly opaque so it reads fine regardless. */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="menu"
              id="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeInOut" }}
              className="overflow-hidden border-t border-white/5 bg-black/90 backdrop-blur-xl md:hidden"
            >
              <div className="container-vault flex flex-col gap-1 py-4">
                {NAV_LINKS.map((link) =>
                  link.kind === "route" ? (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      className="rounded-md px-2 py-3 text-base text-slate transition-colors hover:bg-white/5 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={(e) => handleSectionLinkClick(e, link.href)}
                      className="rounded-md px-2 py-3 text-base text-slate transition-colors hover:bg-white/5 hover:text-white"
                    >
                      {link.label}
                    </a>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    openSignIn();
                  }}
                  className="rounded-md px-2 py-3 text-left text-base text-slate transition-colors hover:bg-white/5 hover:text-white"
                >
                  Sign In
                </button>
                <Link
                  href={APPLY_PATH}
                  onClick={closeMenu}
                  className="mt-2 rounded-full bg-gold px-5 py-3 text-center text-sm font-medium text-black"
                >
                  Enter the Vault
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Scrim — deliberately a SIBLING of <header> (see file header comment).
          Full-screen dim + blur, and the tap-anywhere-to-close target. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="scrim"
            onClick={closeMenu}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeInOut" }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-md md:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
}

