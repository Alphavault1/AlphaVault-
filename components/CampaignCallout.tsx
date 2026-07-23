"use client";

/**
 * CampaignCallout
 * -----------------
 * "Join the Campaign" deliberately does NOT live inside the Purge Day /
 * Gating Mechanism section, even though that would have cost zero extra
 * scroll length (reusing an existing card's button row). That section's
 * entire job is selling strictness — "no passive members," invites only on
 * Purge Day. The Campaign is the opposite: an intentionally free, open way to
 * get involved. Bolting one onto the other would undercut the message either
 * one is trying to send.
 *
 * Instead this is its own short section, positioned after Gating Mechanism
 * and before the Footer — so a visitor reads "that's the exclusive vault"
 * first, and only then "there's also a free way in" as a clearly separate
 * idea, not a confusing alternative sitting right next to the strict pitch.
 *
 * Kept deliberately light — lighter vertical padding than the page's main
 * narrative sections (which use py-24/32) — since this is a secondary path,
 * not another core pitch section.
 */

import { Megaphone } from "lucide-react";
import { useCampaignModals } from "@/components/campaign/CampaignModalsProvider";
import { Reveal } from "@/components/ui/Reveal";

export function CampaignCallout() {
  const { openSignUp } = useCampaignModals();

  return (
    <section className="bg-surface-900 py-16 md:py-20">
      <div className="container-vault">
        <Reveal className="flex flex-col items-center gap-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black text-gold">
            <Megaphone size={22} strokeWidth={1.75} />
          </span>

          <div>
            <h2 className="text-2xl uppercase leading-tight sm:text-3xl">
              Join the Campaign.
            </h2>
            <p className="mx-auto mt-4 max-w-md font-body text-base leading-relaxed text-slate">
              Created for alpha vault contributors.
            </p>
          </div>

          <button
            type="button"
            onClick={openSignUp}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 font-body text-sm font-medium text-black transition-shadow hover:shadow-gold-glow"
          >
            Join the Campaign
          </button>
        </Reveal>
      </div>
    </section>
  );
}
