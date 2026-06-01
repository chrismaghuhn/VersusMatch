import type { Metadata } from "next";
import Link from "next/link";
import { PARTY_TEMPLATE_CREDITS } from "@/lib/party/template-credits";
import { getAppUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Credits · MemeFight",
  description: "Attribution and credits for MemeFight Party meme templates and assets.",
  alternates: {
    canonical: getAppUrl("/credits"),
  },
};

export default function CreditsPage() {
  const credits = PARTY_TEMPLATE_CREDITS;

  return (
    <div className="min-h-[60vh] bg-black px-4 py-16 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div
          className="text-[#CCFF00]"
          style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em" }}
        >
          CREDITS
        </div>
        <h1
          className="mt-3 text-white"
          style={{
            fontWeight: 900,
            fontSize: "clamp(32px, 6vw, 48px)",
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
          }}
        >
          Attribution & <span className="italic text-[#CCFF00]">sources</span>
        </h1>
        <p className="mt-4 text-white/50" style={{ fontSize: 15, lineHeight: 1.6 }}>
          MemeFight uses licensed and original assets. Party meme templates are listed below.
        </p>

        <section className="mt-12 border border-white/10 bg-[#0a0a0a] p-6">
          <div
            className="text-white/40"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em" }}
          >
            MEME TEMPLATES (PARTY)
          </div>
          <p className="mt-3 text-white/70" style={{ fontSize: 14, lineHeight: 1.6 }}>
            Provider: <span className="text-white">{credits.provider}</span>
          </p>
          <p className="mt-2 text-white/50" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Imported {credits.importedAt}. {credits.usageNote}
          </p>
          <p className="mt-3 text-white/50" style={{ fontSize: 13, lineHeight: 1.6 }}>
            License:{" "}
            <span className="text-white">
              {credits.licenseName} v{credits.licenseVersion}
            </span>{" "}
            (purchased {credits.purchaseDate}, {credits.licenseHolder}). Governing law:{" "}
            {credits.governingLaw}.
          </p>
          {credits.attributionRequired && credits.attributionText ? (
            <p className="mt-4 border-l-2 border-[#CCFF00] pl-4 text-white/80" style={{ fontSize: 13 }}>
              {credits.attributionText}
            </p>
          ) : (
            <p className="mt-4 text-white/40" style={{ fontSize: 12 }}>
              No attribution to the pack seller is required. Some templates may depict third-party
              characters or brands — use remains subject to applicable trademark and copyright law.
            </p>
          )}

          <ul className="mt-6 space-y-2 border-t border-white/10 pt-6">
            {credits.templates.map((template) => (
              <li
                key={template.storageName}
                className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between"
              >
                <span className="text-white/90" style={{ fontSize: 14 }}>
                  {template.label}
                </span>
                <span
                  className="text-white/30"
                  style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}
                >
                  {template.storageName}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 border border-white/10 p-6">
          <div
            className="text-white/40"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em" }}
          >
            MEMEFIGHT
          </div>
          <p className="mt-3 text-white/60" style={{ fontSize: 14, lineHeight: 1.6 }}>
            MemeFight.lol — shareable A-vs-B battles and live meme caption parties with friends.
          </p>
        </section>

        <p className="mt-10 text-white/40" style={{ fontSize: 13 }}>
          <Link href="/party" className="text-[#CCFF00] transition hover:text-white">
            Back to Party
          </Link>
          {" · "}
          <Link href="/feed" className="text-white/60 transition hover:text-[#CCFF00]">
            Browse battles
          </Link>
        </p>
      </div>
    </div>
  );
}
