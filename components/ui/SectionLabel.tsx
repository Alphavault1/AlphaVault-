/**
 * SectionLabel
 * ------------
 * The small monospace "eyebrow" that sits above each section heading. Rendering
 * it in the mono utility face — with a gold tick and wide tracking — is what
 * gives the page its "precision instrument / vault mechanism" register, and
 * keeps the labels visually consistent across sections.
 */

interface SectionLabelProps {
  children: string;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <span className="inline-flex items-center gap-2 font-body text-xs uppercase tracking-eyebrow text-bronze">
      <span aria-hidden className="h-px w-6 bg-gold/60" />
      {children}
    </span>
  );
}
