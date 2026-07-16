"use client";

/**
 * Hero
 * ----
 * The filter-and-hook opener. Two-column split on desktop (copy left, the Alpha
 * Vault artwork right); stacks vertically on mobile with the artwork beneath the
 * copy.
 *
 * The visual is the brand's own key artwork (public/hero-vault.webp) — the open
 * vault with the mascot — served through next/image for automatic optimization.
 * It's the brand's supplied piece with the baked-in "ALPHA VAULT" wordmark and
 * @_ALPHAVAULT handle cropped off, since the page already states both in live
 * text (the wordmark sits in the navbar, the headline right beside this image).
 * Duplicating them inside a raster image would be redundant and unselectable.
 *
 * The asset's edges are feathered to transparency so the scene dissolves into
 * the page instead of showing a rectangle — the artwork's own background is a
 * warm dark brown that reads visibly against the page's cooler #0B0E11.
 * WebP (not PNG) because this is photographic: 153KB vs 1.2MB for identical
 * output, and it keeps the alpha channel. Safari/iOS 14+ (our browserslist
 * floor) support WebP transparency.
 *
 * Two motion layers keep it alive rather than static: a slow float, and a faint
 * gold glow breathing behind it (bleeding through the feathered edges). The
 * glow is much fainter than the one the old emblem used, since this artwork
 * already carries its own; their cycles are deliberately offset (6s vs 7s) so
 * they never lock into an obvious mechanical sync. It's never rotated — the
 * composition has a fixed "up".
 *
 * Entrance uses a single staggered container so the eyebrow, headline, sub-copy
 * and CTAs rise in sequence — one orchestrated moment, not four at once.
 */

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, Send } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { APPLY_PATH, TELEGRAM_URL } from "@/lib/content";
import heroVault from "@/public/hero-vault.webp";

export function Hero() {
  const reduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: reduceMotion ? 0 : 0.12, delayChildren: 0.1 },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section id="top" className="relative overflow-hidden">
      {/* Layered ambient background, behind content with -z-10:
          1. faint hairline grid  2. gold radial lift  3. fade to base at foot */}
      <div className="absolute inset-0 -z-10 bg-grid [background-size:64px_64px]" />
      <div className="absolute inset-0 -z-10 bg-radial-fade" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-ink" />

      <div className="container-vault grid grid-cols-1 items-center gap-12 pb-20 pt-32 md:pb-28 md:pt-40 lg:grid-cols-2 lg:gap-8">
        {/* Left: copy */}
        <motion.div variants={container} initial="hidden" animate="visible">
          <motion.div variants={item}>
            <SectionLabel>Members-only Web3 collective</SectionLabel>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 text-4xl uppercase leading-[1.12] sm:text-5xl lg:text-[3.75rem]"
          >
            Learn. Share.
            <br />
            <span className="text-gold">Grow together.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-xl font-body text-base leading-relaxed text-slate sm:text-lg"
          >
            An action-oriented Web3 ecosystem built strictly for active
            contributors, builders, and NFT enthusiasts.
          </motion.p>

          <motion.div variants={item} className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href={APPLY_PATH}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow"
            >
              Enter the Vault
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-7 py-3.5 font-body text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/5"
            >
              <Send size={16} />
              Join Telegram Update Radar
            </a>
          </motion.div>
        </motion.div>

        {/* Right: the brand's hero artwork. Fades/scales in after the copy settles.
            Two motion layers keep it alive rather than static: a slow float, and
            a faint glow breathing behind it. */}
        <motion.div
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center lg:justify-end"
        >
          {/* Sized box. Everything below is positioned relative to THIS, not to
              the grid column — which matters on lg, where the column is wider
              than the artwork and `lg:justify-end` pushes the artwork right. A
              glow centred on the column would sit noticeably left of a
              right-aligned image; centred on this box, it tracks the artwork at
              every breakpoint.

              `w-full` + `max-w-*` (rather than a fixed `w-*`) is deliberate: it
              caps the artwork's size but lets it shrink, so it can never
              overflow its container. A fixed width overflows twice — on ~320px
              phones, and at exactly the 1024px `lg` breakpoint, where the grid
              column is only ~464px wide (narrower than at 1152px+, because the
              container hasn't hit its max width yet). */}
          <div className="relative w-full max-w-[300px] sm:max-w-[380px] lg:max-w-[440px]">
            {/* Layer 1 — ambient glow, breathing.
                Deliberately much fainter than the halo the old emblem used
                (gold/15, not gold/20): this artwork has its own glow baked in,
                so this isn't here to light it. It's here to bleed through the
                feathered edges and pulse gently against the page, so the piece
                radiates instead of sitting still.
                It sits outside the float wrapper on purpose — staying put while
                the artwork drifts through it reads as depth, rather than the
                whole thing sliding around as one flat unit.
                Its 6s cycle is intentionally out of step with the float's 7s —
                equal timings would lock the two into a mechanical, obviously
                looping sync. Offsetting them makes the motion read as organic. */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[74%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/15 blur-3xl"
              animate={
                reduceMotion
                  ? {}
                  : { opacity: [0.5, 1, 0.5], scale: [0.94, 1.06, 0.94] }
              }
              transition={
                reduceMotion
                  ? {}
                  : { duration: 6, ease: "easeInOut", repeat: Infinity }
              }
            />

            {/* Layer 2 — gentle float loop (skipped for reduced-motion users). */}
            <motion.div
              animate={reduceMotion ? {} : { y: [0, -14, 0] }}
              transition={
                reduceMotion
                  ? {}
                  : { duration: 7, ease: "easeInOut", repeat: Infinity }
              }
            >
              <Image
                src={heroVault}
                alt="An open gold Alpha Vault door revealing Web3 tokens — DeFi, DAO, L2, ZK, NFT — with the Alpha Vault robot mascot standing in front."
                priority
                sizes="(max-width: 640px) 300px, (max-width: 1024px) 380px, 440px"
                className="h-auto w-full"
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
