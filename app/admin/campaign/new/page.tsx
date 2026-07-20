import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CampaignForm } from "@/components/admin/CampaignForm";

export const metadata: Metadata = {
  title: "New Campaign — Admin — Alpha Vault",
  robots: { index: false },
};

export default function NewCampaignPage() {
  return (
    <main className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-10 bg-grid [background-size:64px_64px]" />
      <div className="absolute inset-0 -z-10 bg-radial-fade" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-ink" />

      <div className="container-vault">
        <Link
          href="/admin/campaign"
          className="inline-flex items-center gap-2 font-body text-sm text-slate transition-colors hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <div className="mx-auto mt-10 max-w-xl">
          <SectionLabel>New Campaign</SectionLabel>
          <h1 className="mt-4 text-3xl uppercase leading-tight sm:text-4xl">
            Set it up.
          </h1>
          <div className="mt-10">
            <CampaignForm />
          </div>
        </div>
      </div>
    </main>
  );
}
