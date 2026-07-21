"use client";

import { useCampaignModals } from "@/components/campaign/CampaignModalsProvider";
import { CampaignModalShell } from "@/components/campaign/CampaignModalShell";
import { SignInModal } from "@/components/campaign/SignInModal";
import { SignUpModal } from "@/components/campaign/SignUpModal";
import { ForgotPasswordModal } from "@/components/campaign/ForgotPasswordModal";

/**
 * Mounted ONCE, at the root layout — not per-page. This is what lets
 * Navbar's "Sign In" (present on every page) and the homepage's "Join the
 * Campaign" callout open the same modals regardless of which page they're
 * rendered from.
 */
export function CampaignAuthModals() {
  const { openModal, openSignIn, openSignUp, openReset, close } = useCampaignModals();

  return (
    <>
      <CampaignModalShell open={openModal === "signin"} onClose={close} title="Sign In">
        <SignInModal
          onSwitchToSignUp={openSignUp}
          onSwitchToReset={openReset}
          onSuccess={close}
          onClose={close}
        />
      </CampaignModalShell>

      <CampaignModalShell open={openModal === "signup"} onClose={close} title="Join the Campaign">
        <SignUpModal onSwitchToSignIn={openSignIn} onClose={close} />
      </CampaignModalShell>

      <CampaignModalShell open={openModal === "reset"} onClose={close} title="Reset Password">
        <ForgotPasswordModal onSwitchToSignIn={openSignIn} onClose={close} />
      </CampaignModalShell>
    </>
  );
}
