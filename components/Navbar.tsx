"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NAV_LINKS, APPLY_PATH } from "@/lib/content";
import vaultMark from "@/public/vault-mark.png";
import { createBrowserClient } from "@supabase/ssr";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // 🛠️ TOGGLE TO true TO FORCE THE "GO TO PORTAL" LINK ON THE LANDING PAGE LOCALLY
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  
  const reduceMotion = useReducedMotion();

  // Safe client check to prevent runtime errors when environment variables aren't set
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Only attempt initializing if variables actually exist
    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase environment keys are missing. Running in localized state mode.");
      return;
    }

    try {
      const supabase = createBrowserClient(supabaseUrl, supabaseKey);

      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setIsLoggedIn(true);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setIsLoggedIn(!!session);
      });

      return () => subscription.unsubscribe();
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

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

      const html = document.documentElement;
      const prevScrollBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, scrollY);
      html.style.scrollBehavior = prevScrollBehavior;
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

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
          .scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      },
      reduceMotion ? 0 : 320,
    );
  }

  // Define dynamic button properties based on auth state
  const ctaHref = isLoggedIn ? "/campaign" : APPLY_PATH;
  const ctaLabel = isLoggedIn ? "Go to Portal" : "Enter the Vault";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          scrolled
            ? "border-b border-white/10 bg-black/60 backdrop-blur-xl"
            : "border-b border-white/5 bg-black/40 backdrop-blur-md"
        }`}
      >
        <nav className="container-vault flex h-16 items-center justify-between">
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
            
            {/* Dynamic Auth CTA */}
            <Link
              href={ctaHref}
              className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-black transition-shadow hover:shadow-gold-glow"
            >
              {ctaLabel}
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

        {/* Mobile menu panel */}
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
                
                {/* Dynamic Auth CTA for Mobile */}
                <Link
                  href={ctaHref}
                  onClick={closeMenu}
                  className="mt-2 rounded-full bg-gold px-5 py-3 text-center text-sm font-medium text-black"
                >
                  {ctaLabel}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Scrim */}
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
