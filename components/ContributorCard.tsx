/**
 * ContributorCard
 * ---------------
 * One spotlighted community member. Renders their supplied avatar image if
 * `avatarUrl` is set; otherwise falls back to a gold initials badge, styled
 * consistently with the rest of the site's palette rather than a generic grey
 * circle — so an unset avatar reads as "intentional placeholder," not broken.
 *
 * Server component: no interactivity, purely presentational.
 */

import Image from "next/image";
import type { Contributor } from "@/lib/content";

/** "Ada K." -> "AK". Falls back to the first two letters if there's no space. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface ContributorCardProps {
  contributor: Contributor;
}

export function ContributorCard({ contributor }: ContributorCardProps) {
  const { name, xHandle, role, blurb, avatarUrl } = contributor;

  return (
    <article className="flex h-full flex-col items-center rounded-2xl border border-white/5 bg-surface-900 p-8 text-center transition-colors duration-300 hover:border-gold/30 hover:bg-surface-800">
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          width={72}
          height={72}
          className="h-[72px] w-[72px] rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-gold/30 bg-gradient-to-br from-gold/20 to-bronze/10 font-display text-xl text-gold"
        >
          {getInitials(name)}
        </span>
      )}

      <h3 className="mt-5 font-body text-base font-semibold text-white">
        {name}
      </h3>

      <a
        href={`https://x.com/${xHandle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 font-body text-sm text-bronze transition-colors hover:text-gold"
      >
        @{xHandle}
      </a>

      <span className="mt-3 rounded-full border border-white/10 px-3 py-1 font-body text-xs uppercase tracking-wide text-slate">
        {role}
      </span>

      {blurb && (
        <p className="mt-4 font-body text-[15px] leading-relaxed text-slate">
          {blurb}
        </p>
      )}
    </article>
  );
}
