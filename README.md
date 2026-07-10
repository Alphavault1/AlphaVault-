# Alpha Vault — Landing Page

A production-ready landing page for the **Alpha Vault** Web3 collective. Built as
a polished, bespoke experience aligned to their real brand: a classical gold-on-
charcoal identity, the actual vault emblem, and one signature moment (a live
Purge Day countdown).

**Stack:** Next.js 15 (App Router, TypeScript) · Tailwind CSS · Framer Motion · Lucide React

---

## Getting started

You'll need **Node.js 18.18+** (Node 20+ recommended).

```bash
npm install     # fetches the Google Fonts on first build
npm run dev     # → http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

> **First build needs internet.** `next/font/google` downloads Cinzel + Manrope
> at build time, then self-hosts them (no runtime calls to Google afterward).

---

## Project structure

| Path | What it is |
| --- | --- |
| `app/layout.tsx` | Root layout — fonts (Cinzel/Manrope), metadata + social cards, `<html>` shell |
| `app/page.tsx` | Page composition — sections in funnel order |
| `app/globals.css` | Tailwind layers, base type, focus states, reduced-motion, smooth scroll |
| `tailwind.config.ts` | Design tokens — palette, font-variable mapping, shadows, grid texture |
| `lib/content.ts` | Typed content — nav links, pillars, access steps, socials |
| `public/vault-mark.png` | The Alpha Vault emblem (cropped from the brand artwork, edges feathered) |
| `public/og-cover.jpg` | Social-share / OpenGraph banner (the brand cover) |
| `components/Navbar.tsx` | Sticky glassmorphism header + animated mobile menu |
| `components/Hero.tsx` | Hero — emblem, orchestrated entrance, dual CTAs |
| `components/About.tsx` | About / Our Goal — mission + the three member goals |
| `components/Manifesto.tsx` | The contributor-only manifesto panel |
| `components/Ecosystem.tsx` | Three ecosystem pillars (grid + hover) |
| `components/PurgeDay.tsx` | Gating mechanism — access sequence + countdown callout |
| `components/PurgeCountdown.tsx` | Live, hydration-safe countdown to the next Purge Day |
| `components/Footer.tsx` | Final CTA + social links |
| `components/ui/Reveal.tsx` | Reusable scroll-reveal wrapper (reduced-motion aware) |
| `components/ui/SectionLabel.tsx` | The eyebrow label above each section heading |

---

## Design decisions (the short version)

- **Matched to the real brand, not the brief's guesses.** After seeing the X
  assets, three things changed: the wordmark/headlines now use **Cinzel** (a
  classical Roman serif close to their Trajan-style ALPHA VAULT lettering), the
  page base is their **charcoal** (`#0B0E11`, sampled ~`#0D1114` from the
  artwork) rather than pure black, and the hero uses **their actual emblem**
  instead of a hand-built stand-in.
- **Two type roles, deliberately.** Cinzel carries the big statements (wordmark,
  hero, section headings, the manifesto line); **Manrope** handles body, card
  titles, labels, and the countdown — so the serif reads as intentional, not
  shouty everywhere.
- **The emblem is the one bold element.** Everything else stays quiet — a tiny
  palette, hairline borders, generous whitespace.
- **Numbering means something.** Purge Day's access steps are numbered (01/02/03)
  because they're a real sequence; the ecosystem pillars are not, because they're
  peers.
- **Motion is restrained and accessible.** Entrance fades, a slow emblem float, a
  soft halo shimmer, hover micro-interactions — all disabled when the OS "reduce
  motion" setting is on.

## Copy & voice

The wording tracks Alpha Vault's own pinned post: the hero is their opening
line, the About section states their stated goal (a go-to community to find
opportunities, collaborate with skilled people, and grow together), the
manifesto keeps their exact stance ("no observers, no passive members…
everyone carries the weight, not just the founder and team", and "not a WL
hustling house"), and the gating section matches the Telegram-open /
Discord-gated / invites-on-Purge-Day mechanic. All of it lives in
`lib/content.ts` and the section components, so it's easy to tune.

## Responsiveness & browser support

- Fluid from ~320px phones up to large desktops. The Purge Day countdown is a
  fluid 4-column grid (no fixed pixel widths), so it never overflows narrow
  screens.
- A `browserslist` (in `package.json`) targets Safari 14+, iOS 14+, and recent
  Chrome/Firefox, so Autoprefixer emits the vendor prefixes those need — the
  glassmorphism navbar ships with `-webkit-backdrop-filter` for **Safari (macOS
  + iOS)** and **Chrome on iOS** (which uses the Safari/WebKit engine).
- Keyboard focus is always visible (`:focus-visible` gold ring); flex `gap`,
  `scroll-margin-top`, and smooth scroll all degrade gracefully on older Safari.

## Editing content

Copy and structural data live in `lib/content.ts` (nav links, pillars, access
steps, social URLs). The Telegram / X links are placeholders (`telegram.org`,
`x.com`) — swap them there, plus the two inline references in `Hero.tsx` /
`PurgeDay.tsx`, for the real community links.

To replace the emblem or social banner, drop new files at `public/vault-mark.png`
and `public/og-cover.jpg`.

## Purge Day countdown

`PurgeCountdown` counts down to the **last calendar day of the current month** at
23:59:59 local time, then rolls over automatically. It renders `--` placeholders
until it mounts on the client, avoiding an SSR/client hydration mismatch (the
server can't know the remaining time).

## A note on dependencies / security

- Pinned to **Next.js 15.5.20** (a patched release). I initially scaffolded on
  14.2.x per "Next.js 14+", but `npm audit` flagged several *high*-severity
  advisories against that line, so I moved to the latest stable 15.x — it
  satisfies "14+", clears all the highs, and needed no code changes.
- `npm audit` will still show **2 moderate** advisories, both tracing to a
  `postcss` copy vendored *inside* Next itself (`next/node_modules/postcss`), not
  this project's dependencies. It's an XSS-in-CSS-stringify issue that only
  applies to untrusted CSS input (not a static build), with no forward fix yet
  (npm's only "fix" downgrades Next to v9). Safe to ignore; **don't** run
  `npm audit fix --force`.
