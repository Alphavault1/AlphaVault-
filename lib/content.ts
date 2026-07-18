/**
 * Central content model for the landing page.
 *
 * Keeping copy and structural data here (rather than inline in JSX) means the
 * sections stay presentational, the types document the shape of each block, and
 * a future CMS swap only has to satisfy these interfaces.
 */

import type { LucideIcon } from "lucide-react";
import type { ApplicantRole } from "@/lib/applicationSchema";
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

/** "Community" leads to the stats + contributor spotlight page. */
export const COMMUNITY_PATH = "/community";

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
  step: string;
  title: string;
  description: string;
}

/**
 * These three steps ARE a real sequence (open channel → guarded core → monthly
 * reset), so the numbering encodes something true rather than decorating.
 */
export const ACCESS_STEPS: readonly AccessStep[] = [
  {
    icon: Radio,
    step: "01",
    title: "The Open Radar",
    description:
      "Telegram stays open to everyone. It's the update channel — announcements, drops, and the signal that a Purge Day window is approaching.",
  },
  {
    icon: ShieldCheck,
    step: "02",
    title: "The Guarded Core",
    description:
      "The inner Discord is heavily gated. Access isn't sold or farmed — it's extended to contributors who have already demonstrated value.",
  },
  {
    icon: Flame,
    step: "03",
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
/*  Community — stats strip + contributor spotlight (/community)              */
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
 */
export const COMMUNITY_STATS: readonly CommunityStat[] = [
  { label: "Members", value: "—" },
  { label: "Applications Reviewed", value: "—" },
  { label: "Contributors Spotlighted", value: "—" },
] as const;

export interface Contributor {
  name: string;
  /** X handle, without the leading "@" (added when rendering). */
  xHandle: string;
  role: ApplicantRole;
  /** One line on what they do. Optional — omit for a terser card. */
  blurb?: string;
  /**
   * Path to their avatar image, if they've supplied one (e.g. "/contributors/
   * ada.jpg"). Left undefined here on purpose: Claude cannot fetch an X
   * avatar automatically — each contributor needs to supply an actual image
   * file. Until then, ContributorCard renders an initials badge instead, so
   * every card looks intentional rather than broken.
   */
  avatarUrl?: string;
}

/**
 * EXAMPLE ENTRIES — placeholders to prove out the page's layout, not real
 * community members. Replace with real contributors (name, X handle, role,
 * and ideally an avatar image) once that information comes in.
 */
export const CONTRIBUTORS: readonly Contributor[] = [
  {
    name: "Ada K.",
    xHandle: "adak_builds",
    role: "Developer",
    blurb: "Shipping the smart-contract tooling behind the vault.",
  },
  {
    name: "Femi O.",
    xHandle: "femi_designs",
    role: "Designer",
    blurb: "The visual language behind Alpha Vault.",
  },
  {
    name: "Priya S.",
    xHandle: "priya_alpha",
    role: "Trading & Alpha",
    blurb: "Surfaces the alpha before it reaches the crowd.",
  },
] as const;
