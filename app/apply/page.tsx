import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { ApplyForm } from "@/components/ApplyForm";
import { SectionLabel } from "@/components/ui/SectionLabel";
import vaultMark from "@/public/vault-mark.png";

export const metadata: Metadata = {
  title: "Apply — Alpha Vault",
  description:
    "Request access to Alpha Vault. Show us what you've built. Invites go out on Purge Day.",
};

export default function ApplyPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Same ambient backdrop language as the hero, kept subtle. */}
      <div className="absolute inset-0 -z-10 bg-grid [background-size:64px_64px]" />
      <div className="absolute inset-0 -z-10 bg-radial-fade" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-ink" />

      <div className="container-vault flex min-h-screen flex-col py-10">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 self-start font-body text-sm text-slate transition-colors hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <div className="mx-auto w-full max-w-xl py-12 sm:py-16">
          <div className="text-center">
            <Image
              src={vaultMark}
              alt=""
              aria-hidden
              width={72}
              height={72}
              className="mx-auto h-16 w-16 object-contain"
              priority
            />
            <div className="mt-6 flex justify-center">
              <SectionLabel>Request Access</SectionLabel>
            </div>
            <h1 className="mt-6 text-3xl uppercase leading-tight sm:text-4xl">
              Show us what you&rsquo;ve built.
            </h1>
            <p className="mx-auto mt-4 max-w-md font-body leading-relaxed text-slate">
              No observers, no passive members. This is a quick check — your work
              speaks for you. Approved applicants get an invite on the next Purge
              Day.
            </p>
          </div>

          <div className="mt-10">
            <ApplyForm />
          </div>
        </div>
      </div>
    </main>
  );
}
