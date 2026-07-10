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
 * Layering note: the scrim needs to sit ABOVE the page (so its backdrop blur
 * frosts the content) but BELOW the nav row and the menu panel (so the
 * hamburger and links stay crisp and clickable). We do that with explicit
 * z-index — scrim at z-40, nav row and menu panel at z-50 — rather than relying
 * on DOM order.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NAV_LINKS, ENTER_VAULT_ANCHOR } from "@/lib/content";
import vaultMark from "@/public/vault-mark.png";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

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

  // Close the mobile menu after any navigation so it never lingers over content.
  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-black/60 backdrop-blur-xl"
          : "border-b border-white/5 bg-black/40 backdrop-blur-md"
      }`}
    >
      {/* Nav row — kept above the scrim (z-50) so it stays crisp and tappable. */}
      <nav className="container-vault relative z-50 flex h-16 items-center justify-between">
        {/* Wordmark */}
        <a
          href="#top"
          onClick={closeMenu}
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
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-slate transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <a
            href={ENTER_VAULT_ANCHOR}
            className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-black transition-shadow hover:shadow-gold-glow"
          >
            Enter the Vault
          </a>
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

      <AnimatePresence>
        {/* Full-screen blurred scrim: frosts the page behind the menu and is
            itself the tap-anywhere-to-close target. Sits at z-40 — above the
            page, below the nav row and menu panel. Kept as its own direct child
            of AnimatePresence (not wrapped in a fragment) so its exit animation
            is tracked. */}
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

        {/* Mobile menu panel — above the scrim (z-50). */}
        {menuOpen && (
          <motion.div
            key="menu"
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeInOut" }}
            className="relative z-50 overflow-hidden border-t border-white/5 bg-black/80 backdrop-blur-xl md:hidden"
          >
            <div className="container-vault flex flex-col gap-1 py-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="rounded-md px-2 py-3 text-base text-slate transition-colors hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={ENTER_VAULT_ANCHOR}
                onClick={closeMenu}
                className="mt-2 rounded-full bg-gold px-5 py-3 text-center text-sm font-medium text-black"
              >
                Enter the Vault
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
