import type { Config } from "tailwindcss";

/**
 * Design tokens live here so every component pulls from one disciplined source
 * rather than sprinkling raw hex values through the markup. The palette is kept
 * deliberately small: three black surfaces, two golds, and two text greys.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand-derived near-black. Sampled from the Alpha Vault artwork, which
        // uses a cool charcoal (~#0D1114) rather than pure black — matching it
        // makes the page feel unmistakably like their identity. Pure #000000
        // remains available via Tailwind's `black` for the deepest insets.
        ink: "#0B0E11",
        surface: {
          900: "#0F1317",
          800: "#161B21",
        },
        // Metallic gold accents. `gold` is the primary anchor; `bronze` is the
        // slightly muted companion used for subtler strokes and gradients.
        gold: "#D4AF37",
        bronze: "#C5A059",
        // Text greys. `slate` is body prose; `muted` is captions / fine print.
        slate: "#A3A3A3",
        muted: "#6B6B6B",
      },
      fontFamily: {
        // Injected by next/font in app/layout.tsx.
        // display = Cinzel (classical Roman serif — matches the ALPHA VAULT
        // wordmark); body = Manrope (clean, highly readable sans for prose).
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        // A wide track reserved for uppercase eyebrow labels and small caps.
        eyebrow: "0.28em",
      },
      boxShadow: {
        // A restrained gold halo for focus states and the primary CTA hover.
        "gold-glow": "0 0 0 1px rgba(212,175,55,0.35), 0 8px 40px -12px rgba(212,175,55,0.25)",
      },
      backgroundImage: {
        // Faint hairline grid used as ambient texture instead of neon glows.
        grid: "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
        // Soft radial vignette to lift the hero off pure black.
        "radial-fade": "radial-gradient(60% 50% at 50% 0%, rgba(212,175,55,0.06) 0%, transparent 70%)",
      },
      backgroundSize: {
        grid: "64px 64px",
      },
      keyframes: {
        // Gentle idle shimmer for the vault's gold rim.
        shimmer: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
