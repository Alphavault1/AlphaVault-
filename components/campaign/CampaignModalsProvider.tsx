"use client";

/**
 * CampaignModalsProvider
 * -----------------------
 * The Sign In and Sign Up modals need to be triggerable from two unrelated
 * places — Navbar ("Sign In") and a homepage callout ("Join the Campaign") —
 * and the modals themselves are mounted once, at the root layout, so Sign In
 * works from any page on the site, not just the homepage. A shared context is
 * the simplest correct tool for "two distant components need to open the same
 * piece of shared UI state" — no new state-management library needed for
 * something this small.
 */

import { createContext, useContext, useState, type ReactNode } from "react";

type CampaignModalKind = "signin" | "signup" | "reset" | null;

interface CampaignModalsContextValue {
  openModal: CampaignModalKind;
  openSignIn: () => void;
  openSignUp: () => void;
  openReset: () => void;
  close: () => void;
}

const CampaignModalsContext = createContext<CampaignModalsContextValue | null>(
  null,
);

export function CampaignModalsProvider({ children }: { children: ReactNode }) {
  const [openModal, setOpenModal] = useState<CampaignModalKind>(null);

  const value: CampaignModalsContextValue = {
    openModal,
    openSignIn: () => setOpenModal("signin"),
    openSignUp: () => setOpenModal("signup"),
    openReset: () => setOpenModal("reset"),
    close: () => setOpenModal(null),
  };

  return (
    <CampaignModalsContext.Provider value={value}>
      {children}
    </CampaignModalsContext.Provider>
  );
}

/** Throws if used outside the provider — a silent no-op here would be a much
 *  more confusing bug to track down than a clear error at the call site. */
export function useCampaignModals(): CampaignModalsContextValue {
  const ctx = useContext(CampaignModalsContext);
  if (!ctx) {
    throw new Error(
      "useCampaignModals must be used within a CampaignModalsProvider (mounted in app/layout.tsx).",
    );
  }
  return ctx;
}
