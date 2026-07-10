"use client";

/**
 * Reveal
 * -------
 * A single, reusable entrance animation so every section fades/rises in the
 * same disciplined way instead of each component reinventing its own motion.
 *
 * - Uses `whileInView` so the animation fires as the element scrolls into view.
 * - `once: true` prevents the distracting re-trigger when scrolling back up.
 * - Honours the OS "reduce motion" setting: when set, we render the content
 *   fully visible with no transform, so nothing moves.
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Stagger helper: delay the entrance by N seconds. */
  delay?: number;
  /** Optional passthrough for layout classes. */
  className?: string;
  /** Render as a different element when semantics call for it. */
  as?: "div" | "section" | "li" | "article";
}

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  const variants: Variants = {
    hidden: {
      opacity: 0,
      // Skip the vertical travel entirely for reduced-motion users.
      y: reduceMotion ? 0 : 24,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? 0 : 0.6,
        delay: reduceMotion ? 0 : delay,
        ease: [0.22, 1, 0.36, 1], // gentle "ease-out-expo" style curve
      },
    },
  };

  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </MotionTag>
  );
}
