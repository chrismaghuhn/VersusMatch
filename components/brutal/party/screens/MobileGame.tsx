import { Send, Heart, Users, Wifi, Signal, Battery } from "lucide-react";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { MemeFrame } from "@/components/brutal/party/shared/MemeFrame";
import { Avatar } from "@/components/brutal/party/shared/Avatar";

export function MobileGame() {
  return (
    <Shell>
      <div className="mx-auto max-w-[1280px] px-6 py-12">
        <div className="mb-8 text-center">
          <Meta>━━ MOBILE-FIRST</Meta>
          <h1 className="mt-2 text-white" style={{ fontWeight: 900, fontSize: "clamp(40px, 6vw, 72px)", letterSpacing: "-0.04em", lineHeight: 0.9 }}>
            90% play on a <span className="italic text-[#CCFF00]">phone</span>.
          </h1>
          <p className="mt-3 text-white/50" style={{ fontSize: 14 }}>Designed for one thumb, vertical, in bed at 2am.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <PhoneFrame label="CAPTION PHASE">
            <div className="flex h-full flex-col bg-black">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#CCFF00]" />
                  <span className="text-white/60" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em" }}>ROUND 3/7</span>
                </div>
                <span className="text-[#CCFF00]" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, fontWeight: 900 }}>0:42</span>
              </div>
              <div className="p-3">
                <MemeFrame template="drake" caption="MY PRODUCTIVITY APP|OPENING TWITTER 47 TIMES" />
              </div>
              <div className="flex-1 px-3">
                <input placeholder="Top text" defaultValue="HAVING A LIFE" className="w-full border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-white outline-none focus:border-[#CCFF00]" style={{ fontSize: 13, fontFamily: "ui-monospace, monospace" }} />
                <input placeholder="Bottom text" defaultValue="MAKING THIS MEME" className="mt-2 w-full border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-white outline-none focus:border-[#CCFF00]" style={{ fontSize: 13, fontFamily: "ui-monospace, monospace" }} />
              </div>
              <div className="border-t border-white/10 p-3">
                <button className="flex w-full items-center justify-center gap-2 bg-[#FF2D87] py-3.5 text-white" style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.18em" }}>
                  <Send className="h-3 w-3" /> LOCK IN
                </button>
              </div>
            </div>
          </PhoneFrame>

          <PhoneFrame label="VOTING · SWIPE">
            <div className="flex h-full flex-col bg-black">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
                <span className="text-white/60" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em" }}>VOTE · 2 OF 4</span>
                <span className="text-[#FF2D87]" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, fontWeight: 900 }}>0:22</span>
              </div>
              <div className="relative flex-1 p-3">
                <div className="absolute inset-3">
                  <div className="absolute inset-0 translate-x-2 translate-y-2 border-2 border-white/10" />
                  <div className="absolute inset-0 translate-x-1 translate-y-1 border-2 border-white/20" />
                  <div className="relative h-full">
                    <MemeFrame template="drake" caption="MY PRODUCTIVITY APP|OPENING TWITTER 47 TIMES" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/90 p-2.5 backdrop-blur" style={{ borderTop: "2px solid #FF2D87" }}>
                      <div className="flex items-center gap-2">
                        <Avatar id="crown" color="#FF2D87" size={20} />
                        <span className="text-white" style={{ fontWeight: 700, fontSize: 12 }}>PettyQueen</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3">
                <button className="border border-white/20 py-3 text-white/60" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}>SKIP →</button>
                <button className="bg-[#CCFF00] py-3 text-black" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}>♥ VOTE</button>
              </div>
            </div>
          </PhoneFrame>

          <PhoneFrame label="RESULTS">
            <div className="flex h-full flex-col bg-black">
              <div className="flex items-center justify-between border-b border-[#CCFF00]/30 bg-[#CCFF00]/5 px-3 py-2.5">
                <span className="text-[#CCFF00]" style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em" }}>★ ROUND WINNER</span>
                <span className="text-white/60" style={{ fontSize: 10, fontWeight: 700 }}>+400</span>
              </div>
              <div className="p-3">
                <MemeFrame template="drake" caption="MY PRODUCTIVITY APP|OPENING TWITTER 47 TIMES" />
              </div>
              <div className="flex items-center gap-2 px-3">
                <div className="border-2 border-[#FF2D87]"><Avatar id="crown" color="#FF2D87" size={32} /></div>
                <div>
                  <div className="text-white" style={{ fontWeight: 900, fontSize: 14 }}>PettyQueen</div>
                  <div className="text-white/40" style={{ fontSize: 10 }}>4 votes · surgical work</div>
                </div>
              </div>
              <div className="flex-1 px-3 pt-3">
                {[
                  ["#1 PettyQueen", "1,840", true],
                  ["#2 v0te_demon", "1,420"],
                  ["#3 YOU", "1,310"],
                ].map(([n, s, hot], i) => (
                  <div key={i} className={"flex items-center justify-between border-b border-white/5 py-2 text-white " + (hot ? "text-[#CCFF00]" : "")} style={{ fontSize: 12 }}>
                    <span style={{ fontWeight: 700 }}>{n}</span>
                    <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 800 }}>{s}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 p-3">
                <button className="w-full bg-white py-3.5 text-black" style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.18em" }}>NEXT ROUND →</button>
              </div>
            </div>
          </PhoneFrame>
        </div>

        <div className="mt-10 border border-white/10 bg-[#0a0a0a] p-6">
          <Meta color="#CCFF00">━━ MOBILE PRINCIPLES</Meta>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Principle title="ONE-THUMB ZONE" body="Primary action always bottom 25% of screen. No top-bar taps to start a turn." />
            <Principle title="SWIPE TO VOTE" body="Tinder-style stack. Skip → / Vote ♥. Beats grid for one-handed play." />
            <Principle title="MEME FILLS SCREEN" body="On phone the meme is the page. Captions overlay it. No precious whitespace." />
          </div>
        </div>
      </div>
    </Shell>
  );
}

function PhoneFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Meta>{label}</Meta>
      <div className="mt-2 mx-auto relative" style={{ width: 280 }}>
        <div className="absolute inset-0 -m-2 rounded-[40px] bg-[#1a1a1a]" />
        <div className="relative overflow-hidden rounded-[32px] border border-white/10" style={{ aspectRatio: "9/19.5" }}>
          <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-black/90 px-5 py-1 text-white/80 backdrop-blur" style={{ fontSize: 10, fontWeight: 700 }}>
            <span style={{ fontFamily: "ui-monospace, monospace" }}>9:41</span>
            <div className="absolute left-1/2 top-0 h-4 w-20 -translate-x-1/2 rounded-b-2xl bg-black" />
            <div className="flex items-center gap-1">
              <Signal className="h-2.5 w-2.5" />
              <Wifi className="h-2.5 w-2.5" />
              <Battery className="h-2.5 w-2.5" />
            </div>
          </div>
          <div className="absolute inset-x-0 top-6 bottom-0 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-l-2 border-[#CCFF00] pl-4">
      <div className="text-white" style={{ fontWeight: 900, fontSize: 14, letterSpacing: "-0.02em" }}>{title}</div>
      <p className="mt-1 text-white/60" style={{ fontSize: 13, lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}
