/**
 * Footer
 * ------
 * Closes the page on the brand's terms: a final, stark call to action, then the
 * quiet utility row (wordmark, socials, copyright). Server component — purely
 * presentational.
 */

import { SOCIAL_LINKS, ENTER_VAULT_ANCHOR } from "@/lib/content";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-ink">
      <div className="container-vault py-20 md:py-24">
        {/* Final CTA */}
        <div className="flex flex-col items-start justify-between gap-8 border-b border-white/5 pb-16 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="font-body text-xs uppercase tracking-eyebrow text-bronze">
              Welcome to Alpha Vault
            </p>
            <h2 className="mt-5 text-3xl uppercase leading-tight sm:text-4xl">
              Ready to add value?
              <br />
              <span className="text-gold">Prepare for the next Purge Day.</span>
            </h2>
          </div>
          <a
            href={ENTER_VAULT_ANCHOR}
            className="inline-flex shrink-0 items-center rounded-full bg-gold px-7 py-3.5 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow"
          >
            Enter the Vault
          </a>
        </div>

        {/* Utility row */}
        <div className="mt-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <span className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-white">
            Alpha Vault
          </span>

          <nav className="flex items-center gap-6" aria-label="Social links">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate transition-colors hover:text-gold"
              >
                {social.label}
              </a>
            ))}
          </nav>

          <p className="font-body text-xs text-muted">
            © {year} Alpha Vault. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
