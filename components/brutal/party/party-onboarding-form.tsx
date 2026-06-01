"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shuffle, ArrowRight } from "lucide-react";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { COLORS } from "@/components/brutal/party/shared/theme";
import { Avatar, AVATAR_IDS, type AvatarId } from "@/components/brutal/party/shared/Avatar";
import { normalizeHandle, validateHandle } from "@/lib/party/handle";
import { parseJsonResponse } from "@/lib/parse-json-response";
import { sanitizeReturnPath } from "@/lib/sanitize-return-path";

const SUGGEST = ["votegremlin", "saltslinger", "pettyqueen", "hottakehal", "chaoscarl", "roasteddog", "moodmagnet"];

export function PartyOnboardingForm() {
  const searchParams = useSearchParams();
  const returnTo = sanitizeReturnPath(searchParams.get("returnTo"), "/party");

  const [avatar, setAvatar] = useState<AvatarId>("fox");
  const [color, setColor] = useState("#CCFF00");
  const [name, setName] = useState("foxonfire");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const randomize = () => {
    setAvatar(AVATAR_IDS[Math.floor(Math.random() * AVATAR_IDS.length)]!);
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]!);
    setName(SUGGEST[Math.floor(Math.random() * SUGGEST.length)]!);
  };

  async function submit() {
    const handle = normalizeHandle(name);
    const validation = validateHandle(handle);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, avatarId: avatar, avatarColor: color }),
    });

    const data = await parseJsonResponse<{ error?: string }>(res);
    if (!res.ok) {
      setError(
        data?.error ??
          (res.status === 401
            ? "Session abgelaufen — bitte neu einloggen."
            : `Speichern fehlgeschlagen (${res.status})`)
      );
      setLoading(false);
      return;
    }

    // Full navigation so server join redirects (e.g. /party/join/CODE) run reliably.
    window.location.assign(returnTo);
  }

  return (
    <Shell>
      <div className="mx-auto max-w-[1100px] px-6 py-16">
        <div className="mb-10 text-center">
          <Meta color="#CCFF00">━━ DEIN PROFIL</Meta>
          <h1
            className="mt-3 text-white"
            style={{
              fontWeight: 900,
              fontSize: "clamp(44px, 7vw, 96px)",
              letterSpacing: "-0.05em",
              lineHeight: 0.9,
            }}
          >
            Wer bist du, <span className="italic text-[#CCFF00]">wirklich</span>?
          </h1>
          <p className="mt-3 text-white/50" style={{ fontSize: 15 }}>
            Handle + Avatar — benötigt für MemeFight Party.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="border border-white/10 bg-black p-8 text-center">
            <Meta>LIVE PREVIEW</Meta>
            <div className="relative mt-6 flex flex-col items-center">
              <div className="border-4" style={{ borderColor: color }}>
                <Avatar id={avatar} color={color} size={168} />
              </div>
              <div
                className="mt-5 text-white"
                style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.03em" }}
              >
                {normalizeHandle(name) || "…"}
              </div>
            </div>
            <button
              type="button"
              onClick={randomize}
              className="mt-6 flex w-full items-center justify-center gap-2 border border-white/20 py-3 text-white transition hover:border-[#CCFF00] hover:text-[#CCFF00]"
              style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em" }}
            >
              <Shuffle className="h-3.5 w-3.5" /> WÜRFELN
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="border border-white/10 bg-black p-5">
              <Meta>HANDLE</Meta>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 20))}
                placeholder="dein_name"
                className="mt-2 w-full border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition focus:border-[#CCFF00]"
                style={{ fontFamily: "ui-monospace, monospace", fontSize: 18, fontWeight: 700 }}
              />
              <p className="mt-2 text-white/40" style={{ fontSize: 11 }}>
                Wird zu: <span className="text-[#CCFF00]">{normalizeHandle(name) || "…"}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {SUGGEST.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setName(s)}
                    className="border border-white/10 px-2 py-1 text-white/50 hover:border-white/40 hover:text-white"
                    style={{ fontSize: 11 }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-white/10 bg-black p-5">
              <Meta>AVATAR</Meta>
              <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-8">
                {AVATAR_IDS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={
                      "aspect-square overflow-hidden border-2 transition hover:scale-105 " +
                      (avatar === a ? "border-[#CCFF00]" : "border-white/10 hover:border-white/40")
                    }
                  >
                    <Avatar id={a} color={avatar === a ? color : "#1a1a1a"} size={64} />
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-white/10 bg-black p-5">
              <Meta>FARBE</Meta>
              <div className="mt-3 grid grid-cols-6 gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={
                      "aspect-square border-2 transition " +
                      (color === c ? "border-white" : "border-white/10 hover:border-white/40")
                    }
                    style={{ background: c }}
                  >
                    {color === c && (
                      <span className="text-black" style={{ fontSize: 14, fontWeight: 900 }}>
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="border border-[#FF3B3B]/50 bg-[#FF3B3B]/10 px-4 py-3 text-[#FF3B3B]" style={{ fontSize: 13 }}>
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() => void submit()}
              className="group flex items-center justify-center gap-3 bg-[#CCFF00] py-5 text-black transition hover:bg-white disabled:opacity-50"
            >
              <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: "0.2em" }}>
                {loading ? "SPEICHERN…" : "WEITER →"}
              </span>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
