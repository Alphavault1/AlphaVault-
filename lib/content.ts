/**
 * Central content model for the landing page.
 *
 * Keeping copy and structural data here (rather than inline in JSX) means the
 * sections stay presentational, the types document the shape of each block, and
 * a future CMS swap only has to satisfy these interfaces.
 */

import type { LucideIcon } from "lucide-react";
import {
  Compass,
  Lock,
  Users,
  Radio,
  ShieldCheck,
  Flame,
  Target,
  Handshake,
  TrendingUp,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Route paths — declared first since NAV_LINKS below references them         */
/* -------------------------------------------------------------------------- */

/** "Enter the Vault" leads to the real application form at /apply. */
export const APPLY_PATH = "/apply";

/** "Community" leads to the stats + achievements page. */
export const COMMUNITY_PATH = "/community";

/** Where a signed-in creator lands after signing in. */
export const CAMPAIGN_PATH = "/campaign";

/* -------------------------------------------------------------------------- */
/*  Navigation                                                                 */
/* -------------------------------------------------------------------------- */

export interface NavLink {
  label: string;
  /** In-page anchor target (matches a section id) — unless `kind: "route"`. */
  href: string;
  /**
   * "route" = a real Next.js page (rendered with next/link, a full
   * navigation). Omitted (the default) = a same-page hash anchor, handled by
   * Navbar's scroll logic. Community is the one real route mixed in among the
   * section anchors, so it needs to be tagged explicitly rather than assumed.
   */
  kind?: "route";
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: "About", href: "#about" },
  { label: "Manifesto", href: "#manifesto" },
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "Community", href: COMMUNITY_PATH, kind: "route" },
  { label: "Gating Mechanism", href: "#gating" },
] as const;

/* -------------------------------------------------------------------------- */
/*  Our Goal — the three things members come here to do                        */
/* -------------------------------------------------------------------------- */

export interface Goal {
  icon: LucideIcon;
  label: string;
  description: string;
}

export const GOALS: readonly Goal[] = [
  {
    icon: Target,
    label: "Find opportunities",
    description:
      "Early alpha and openings across Web3, surfaced before they reach the crowd.",
  },
  {
    icon: Handshake,
    label: "Collaborate",
    description:
      "Work alongside skilled builders and creators from across disciplines.",
  },
  {
    icon: TrendingUp,
    label: "Grow together",
    description:
      "Level up beside people who take the space as seriously as you do.",
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Ecosystem pillars                                                          */
/* -------------------------------------------------------------------------- */

export interface Pillar {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const PILLARS: readonly Pillar[] = [
  {
    icon: Compass,
    title: "Alpha & Opportunities",
    description:
      "Updates and early opportunities shared as they surface — the signal, filtered from the noise, before it reaches the crowd.",
  },
  {
    icon: Lock,
    title: "Gated Discord Hub",
    description:
      "A gated hub for NFT discussion and deep collaboration, where opportunities across Web3 get spotlighted for the people who show up.",
  },
  {
    icon: Users,
    title: "The Contributor Network",
    description:
      "Collaborate with skilled builders and creators across disciplines — a room of people who add value, not spectators.",
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Purge Day — access mechanics                                               */
/* -------------------------------------------------------------------------- */

export interface AccessStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Displayed as three centered, unnumbered cards — see PurgeDay.tsx for why
 * the numbering these used to carry was removed.
 */
export const ACCESS_STEPS: readonly AccessStep[] = [
  {
    icon: Radio,
    title: "The Open Radar",
    description:
      "Telegram stays open to everyone. It's the update channel — announcements, drops, and the signal that a Purge Day window is approaching.",
  },
  {
    icon: ShieldCheck,
    title: "The Guarded Core",
    description:
      "The inner Discord is heavily gated. Access isn't sold or farmed — it's extended to contributors who have already demonstrated value.",
  },
  {
    icon: Flame,
    title: "Purge Day",
    description:
      "On the last day of every month, invites are distributed and passive members are cleared out. Quality is preserved by design, not by hope.",
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Social / footer                                                            */
/* -------------------------------------------------------------------------- */

export interface SocialLink {
  label: string;
  href: string;
}

export const SOCIAL_LINKS: readonly SocialLink[] = [
  { label: "X", href: "https://x.com" },
  { label: "Telegram", href: "https://telegram.org" },
] as const;

/**
 * "Enter the Vault" leads to the real application form at /apply (Phase 1),
 * not just the on-page gating explainer — see APPLY_PATH at the top of this
 * file. The "Gating Mechanism" nav link still points at the #gating section,
 * so the two are genuinely distinct destinations.
 */
export const TELEGRAM_URL = "https://telegram.org";

/* -------------------------------------------------------------------------- */
/*  Community — stats strip + achievements (/community)                       */
/* -------------------------------------------------------------------------- */

export interface CommunityStat {
  label: string;
  value: string;
}

/**
 * PLACEHOLDER NUMBERS. These are entered by hand (not pulled from a live
 * source — no Discord API, no Supabase count wired up here), so they only stay
 * accurate if updated manually as the community grows. Replace the `value`
 * strings with real figures before this page is considered final.
 *
 * The third stat is deliberately labeled "Contributors" rather than
 * "Contributors Spotlighted" — the client asked to drop the public spotlight
 * section itself (the grid of individual profiles that used to sit below this
 * strip), but keep tracking this number. A label that still said "Spotlighted"
 * would reference a feature that no longer exists on the page, which is the
 * kind of small inconsistency worth avoiding.
 */
export const COMMUNITY_STATS: readonly CommunityStat[] = [
  { label: "Members", value: "—" },
  { label: "Applications Reviewed", value: "—" },
  { label: "Contributors", value: "—" },
] as const;

export interface Achievement {
  title: string;
  description: string;
  /** Freeform, e.g. "Jul 2026" — not a real Date, so it's easy to hand-edit. */
  date: string;
}

/**
 * PLACEHOLDER ENTRIES — 4 plausible milestones invented to prove out the
 * page's layout, not real events. Swap the `title`/`description`/`date` in
 * each one for the real thing whenever it happens; the shape (a short title, a
 * one-line description, a loose date string) is meant to make that a quick
 * edit rather than a restructure.
 */
export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    title: "Alpha Vault Launched",
    description:
      "The vault opened its doors — the manifesto, the gating mechanism, and the first cohort of contributors.",
    date: "Jul 2026",
  },
  {
    title: "First Purge Day Completed",
    description:
      "Ran our first monthly access cycle end to end — invites sent, passive members cleared.",
    date: "Jul 2026",
  },
  {
    title: "Gated Discord Hub Opened",
    description:
      "The inner Discord went live for approved members — alpha, NFT discussion, and deep collaboration in one room.",
    date: "Aug 2026",
  },
  {
    title: "50 Members Onboarded",
    description:
      "Crossed our first real membership milestone through the application pipeline.",
    date: "Aug 2026",
  },
] as const;
