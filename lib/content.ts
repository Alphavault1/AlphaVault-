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
/*  Navigation                                                                 */
/* -------------------------------------------------------------------------- */

export interface NavLink {
  label: string;
  /** In-page anchor target (matches a section id). */
  href: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: "About", href: "#about" },
  { label: "Manifesto", href: "#manifesto" },
  { label: "Ecosystem", href: "#ecosystem" },
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
 * Primary CTA target. "Enter the Vault" now leads to the real application form
 * at /apply (Phase 1), not just the on-page gating explainer. The "Gating
 * Mechanism" nav link still points at the #gating section, so the two are now
 * genuinely distinct destinations.
 */
export const APPLY_PATH = "/apply";
export const TELEGRAM_URL = "https://telegram.org";
