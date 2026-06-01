import { ArrowRight } from "lucide-react";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { PartyErrorState } from "@/components/brutal/party/party-error-state";
import {
  PARTY_ERROR_DEFINITIONS,
  PARTY_ERROR_PREVIEW_DEFINITIONS,
} from "@/lib/party/copy-de";

const wiredCodes = Object.values(PARTY_ERROR_DEFINITIONS);

export function ErrorStates() {
  return (
    <Shell>
      <div className="mx-auto max-w-[1280px] px-6 py-12">
        <div className="mb-8">
          <Meta>━━ ERROR & EMPTY STATES</Meta>
          <h1 className="mt-2 text-white" style={{ fontWeight: 900, fontSize: "clamp(40px, 6vw, 72px)", letterSpacing: "-0.04em", lineHeight: 0.9 }}>
            When it <span className="italic text-[#FF3B3B]">breaks</span>.
          </h1>
          <p className="mt-3 max-w-2xl text-white/50" style={{ fontSize: 15 }}>
            {`Same tone as the game — don't apologize, don't engineer-speak. Just say what happened and what to do.`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {wiredCodes.map((def) => (
            <PartyErrorState key={def.code} code={def.code} compact />
          ))}
          {PARTY_ERROR_PREVIEW_DEFINITIONS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.code} className="relative overflow-hidden border border-white/10 bg-[#0a0a0a] p-6">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20 blur-2xl" style={{ background: s.color }} />
                <div className="absolute left-0 top-0 h-1 w-full" style={{ background: s.color }} />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center border" style={{ borderColor: s.color, color: s.color, background: `${s.color}10` }}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <span className="border px-2 py-1" style={{ borderColor: s.color, color: s.color, fontSize: 10, fontWeight: 900, letterSpacing: "0.18em" }}>
                      {s.label}
                    </span>
                  </div>
                  <h3 className="mt-5 text-white" style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{s.title}</h3>
                  <p className="mt-2 text-white/60" style={{ fontSize: 13, lineHeight: 1.5 }}>{s.body}</p>
                  <button className="mt-5 flex w-full items-center justify-between border px-4 py-2.5 text-white transition hover:bg-white hover:text-black" style={{ borderColor: s.color, fontSize: 11, fontWeight: 800, letterSpacing: "0.18em" }}>
                    {s.cta} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
