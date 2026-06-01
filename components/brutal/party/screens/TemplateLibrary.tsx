"use client";

import { useState } from "react";
import { Search, Upload, Heart, Eye } from "lucide-react";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { MemeFrame } from "@/components/brutal/party/shared/MemeFrame";

type Cat = "ALL" | "REACTION" | "DILEMMA" | "ASCENDING" | "CLASSIC" | "NSFW" | "YOURS";

type T = { id: string; name: string; cat: Exclude<Cat, "ALL">; uses: string; tpl: "drake" | "boyfriend" | "brain" | "pikachu"; fav?: boolean };

const TEMPLATES: T[] = [
  { id: "1", name: "DRAKE", cat: "REACTION", uses: "2.4M", tpl: "drake", fav: true },
  { id: "2", name: "BOYFRIEND", cat: "REACTION", uses: "1.8M", tpl: "boyfriend" },
  { id: "3", name: "GALAXY BRAIN", cat: "ASCENDING", uses: "1.2M", tpl: "brain" },
  { id: "4", name: "PIKACHU", cat: "REACTION", uses: "612K", tpl: "pikachu" },
  { id: "5", name: "TWO BUTTONS", cat: "DILEMMA", uses: "980K", tpl: "drake" },
  { id: "6", name: "ROLL SAFE", cat: "CLASSIC", uses: "742K", tpl: "pikachu" },
  { id: "7", name: "STONKS", cat: "CLASSIC", uses: "489K", tpl: "brain" },
  { id: "8", name: "MOCKING TEXT", cat: "CLASSIC", uses: "554K", tpl: "boyfriend", fav: true },
  { id: "9", name: "CHANGE MY MIND", cat: "DILEMMA", uses: "421K", tpl: "drake" },
  { id: "10", name: "WOMAN YELLING", cat: "REACTION", uses: "388K", tpl: "boyfriend" },
];

const CATS: Cat[] = ["ALL", "REACTION", "DILEMMA", "ASCENDING", "CLASSIC", "NSFW", "YOURS"];

export function TemplateLibrary() {
  const [cat, setCat] = useState<Cat>("ALL");
  const [q, setQ] = useState("");
  const [hover, setHover] = useState<string | null>(null);

  const filtered = TEMPLATES.filter((t) =>
    (cat === "ALL" || cat === "YOURS" ? true : t.cat === cat) &&
    (q === "" || t.name.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <Shell>
      <div className="mx-auto max-w-[1440px] px-6 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Meta>━━ TEMPLATE LIBRARY</Meta>
            <h1 className="mt-2 text-white" style={{ fontWeight: 900, fontSize: "clamp(40px, 6vw, 72px)", letterSpacing: "-0.04em", lineHeight: 0.9 }}>
              8,247 ways to <span className="italic text-[#CCFF00]">cope</span>.
            </h1>
          </div>
          <div className="flex items-center gap-2 border border-white/10 bg-[#0a0a0a] px-4 py-3" style={{ width: 320 }}>
            <Search className="h-4 w-4 text-white/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Drake, Boyfriend, Brain…" className="w-full bg-transparent outline-none placeholder:text-white/30" style={{ fontSize: 13 }} />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex flex-wrap gap-1">
            {CATS.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={"px-3 py-1.5 transition " + (cat === c ? "bg-[#CCFF00] text-black" : "border border-white/10 text-white/60 hover:border-white/40 hover:text-white")} style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em" }}>
                {c}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 border-2 border-dashed border-white/20 px-4 py-2 text-white/60 hover:border-[#CCFF00] hover:text-[#CCFF00]" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em" }}>
            <Upload className="h-3.5 w-3.5" /> UPLOAD YOUR OWN
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {filtered.map((t) => {
            const isHover = hover === t.id;
            return (
              <button
                key={t.id}
                onMouseEnter={() => setHover(t.id)}
                onMouseLeave={() => setHover(null)}
                className="group relative aspect-square overflow-hidden border border-white/10 bg-[#0a0a0a] transition hover:-translate-y-1 hover:border-[#CCFF00]"
              >
                <MemeFrame template={t.tpl} caption={isHover ? "WHEN YOU PREVIEW|HOVER WORKS" : undefined} />
                <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/90 to-transparent p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-white" style={{ fontWeight: 900, fontSize: 13, letterSpacing: "-0.01em" }}>{t.name}</div>
                    {t.fav && <Heart className="h-3 w-3 fill-[#FF2D87] text-[#FF2D87]" />}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-white/40" style={{ fontSize: 10 }}>
                    <span>{t.uses} uses</span>
                    <span className="border border-white/10 px-1" style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.1em" }}>{t.cat}</span>
                  </div>
                </div>
                <div className="absolute right-2 top-2 z-20 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 text-white/70 opacity-0 backdrop-blur transition group-hover:opacity-100" style={{ fontSize: 10 }}>
                  <Eye className="h-3 w-3" /> hover
                </div>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="border border-white/10 bg-[#0a0a0a] p-16 text-center text-white/40" style={{ fontSize: 14 }}>
            {`Nothing matches "${q}". Try less specific.`}
          </div>
        )}
      </div>
    </Shell>
  );
}
