import type { Metadata } from "next";
import { Cinzel, Manrope } from "next/font/google";
import "./globals.css";

/*
  Fonts are loaded with next/font so they're self-hosted, preloaded, and
  layout-shift-free. Each exposes a CSS variable that Tailwind maps to
  font-display / font-body (see tailwind.config.ts).

    - Cinzel   → display / headings / wordmark. A classical Roman serif chosen
                 to match Alpha Vault's Trajan-style ALPHA VAULT lettering.
    - Manrope  → body prose, labels, and UI. Clean and highly readable, it lets
                 the serif carry the personality without fighting it.
*/
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  // metadataBase makes relative OG/Twitter image URLs (like /og-cover.jpg)
  // resolve to an absolute URL. Without it, Next falls back to
  // http://localhost:3000 at build time, which breaks link previews on
  // X/Telegram/Discord. Override via NEXT_PUBLIC_SITE_URL if you add a custom
  // domain later.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://alphavaultx.netlify.app"
  ),
  title: "Alpha Vault — A Web3 Collective for Contributors",
  description:
    "An action-oriented Web3 ecosystem built strictly for active contributors, builders, and NFT enthusiasts. No observers. No passive members.",
  openGraph: {
    title: "Alpha Vault — A Web3 Collective for Contributors",
    description:
      "No observers. No passive members. Access is earned, then defended — and opens on Purge Day.",
    type: "website",
    images: [{ url: "/og-cover.jpg", width: 1500, height: 500, alt: "Alpha Vault" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Alpha Vault — A Web3 Collective for Contributors",
    description: "No observers. No passive members. Access is earned, then defended.",
    images: ["/og-cover.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
