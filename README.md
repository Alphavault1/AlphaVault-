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

## Application form & database (Phase 1)

"Enter the Vault" leads to `/apply`, a gated entry form (Discord username, role,
a link to your work, an optional note). Submissions are validated server-side
and stored in **Supabase**. The browser never talks to the database directly —
everything goes through the `/api/apply` route using a server-only service key,
and the table is locked down with Row Level Security.

**One-time setup (about 5 minutes):**

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard → **SQL Editor**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql) and run it. This creates the
   `applications` table with RLS enabled.
3. Grab two values from **Project Settings**:
   - **Project URL** (Settings → Data API)
   - **service_role key** (Settings → API Keys) — this is secret, treat it like
     a password.
4. Add them as environment variables (see [`.env.example`](./.env.example)):
   - Locally: copy `.env.example` to `.env.local` and fill in the two values.
   - On Netlify: **Site settings → Environment variables** → add `SUPABASE_URL`
     and `SUPABASE_SERVICE_ROLE_KEY`, then redeploy.

That's it — no other config. Neither key is exposed to the browser (they have no
`NEXT_PUBLIC_` prefix).

**To verify it works:** submit the form once, then open the Supabase **Table
editor → applications** — your test row should be there with `status = pending`.

**Scope note:** Phase 1 covers the form, validation, and storage. Approving
applicants and auto-sending Discord invites is Phase 2+ (the Discord bot), which
reads and updates this same table — the `status` / `reviewed_by` / `reviewed_at`
columns already exist for it. Duplicate submissions are intentionally allowed
for now; de-duplication and rate-limiting come with the anti-abuse phase.

---

## Project structure

| Path | What it is |
| --- | --- |
| `app/layout.tsx` | Root layout — fonts (Cinzel/Manrope), metadata + social cards, `<html>` shell |
| `app/page.tsx` | Page composition — sections in funnel order |
| `app/globals.css` | Tailwind layers, base type, focus states, reduced-motion, smooth scroll |
| `tailwind.config.ts` | Design tokens — palette, font-variable mapping, shadows, grid texture |
| `lib/content.ts` | Typed content — nav links, pillars, access steps, socials |
| `public/hero-vault.webp` | The hero artwork — open vault + mascot (brand piece, baked-in text cropped off, edges feathered) |
| `public/vault-mark.png` | The Alpha Vault emblem — used as the small logo in the navbar, on `/apply`, and as the Discord avatar |
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
| `app/apply/page.tsx` | The `/apply` entry page (framing + form) |
| `components/ApplyForm.tsx` | The application form — inline validation, submit states, honeypot |
| `app/api/apply/route.ts` | Server route that validates and stores submissions |
| `lib/applicationSchema.ts` | Shared zod schema — one source of truth for validation |
| `lib/supabaseAdmin.ts` | Server-only Supabase client (service role) |
| `supabase/schema.sql` | Database schema to run once in Supabase |
| `.env.example` | Template for the required environment variables |

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

To replace the artwork, drop new files at `public/hero-vault.webp` (the big hero
visual), `public/vault-mark.png` (the small logo — navbar, `/apply`, Discord
avatar), or `public/og-cover.jpg` (the social-share banner).

Two things to preserve if you regenerate the hero artwork: **feather the edges to
transparency** (its background is a warm dark brown that shows as a visible
rectangle against the page's cooler `#0B0E11` otherwise), and **don't include
baked-in text** — the wordmark and headline are already live text elsewhere on
the page, so duplicating them in a raster image is redundant and unselectable.

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
