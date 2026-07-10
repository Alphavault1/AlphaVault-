"use client";

/**
 * Hero
 * ----
 * The filter-and-hook opener. Two-column split on desktop (copy left, the Alpha
 * Vault emblem right); stacks vertically on mobile with the emblem beneath the
 * copy.
 *
 * The emblem is the brand's own artwork (public/vault-mark.png) rather than a
 * stand-in — served through next/image for automatic optimization. A soft gold
 * halo seats it against the dark background, and a slow float gives it life
 * without rotating it (it isn't radially symmetric — it has a key and hinges).
 *
 * Entrance uses a single staggered container so the eyebrow, headline, sub-copy
 * and CTAs rise in sequence — one orchestrated moment, not four at once.
 */

import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, Send } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ENTER_VAULT_ANCHOR, TELEGRAM_URL } from "@/lib/content";
import vaultMark from "@/public/vault-mark.png";

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
            <a
              href={ENTER_VAULT_ANCHOR}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow"
            >
              Enter the Vault
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </a>
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

        {/* Right: brand emblem. Fades/scales in after the copy settles. */}
        <motion.div
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex justify-center lg:justify-end"
        >
          {/* Soft gold halo seating the emblem. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/20 blur-3xl animate-shimmer"
          />
          {/* Gentle float loop (skipped for reduced-motion users). */}
          <motion.div
            animate={reduceMotion ? {} : { y: [0, -14, 0] }}
            transition={
              reduceMotion
                ? {}
                : { duration: 7, ease: "easeInOut", repeat: Infinity }
            }
          >
            <Image
              src={vaultMark}
              alt="The Alpha Vault emblem — a gilded vault door with a ship's-wheel handle."
              priority
              sizes="(max-width: 1024px) 70vw, 440px"
              className="h-auto w-[260px] sm:w-[340px] lg:w-[440px]"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
