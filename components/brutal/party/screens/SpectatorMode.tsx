import { Eye, MessageCircle, Heart, Laugh } from "lucide-react";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { MemeFrame } from "@/components/brutal/party/shared/MemeFrame";
import { Avatar, AvatarId } from "@/components/brutal/party/shared/Avatar";

const chat = [
  { author: "@watcher_42", color: "#00E1FF", emoji: "👀", text: "the petty queen is COOKING tonight" },
  { author: "@latejoiner", color: "#FFB800", emoji: "🌶️", text: "can i join next round" },
  { author: "@watcher_42", color: "#00E1FF", emoji: "👀", text: "v0te_demon entry is mid tbh" },
  { author: "@chaosfan", color: "#FF2D87", emoji: "🎪", text: "imagine WRITING 'bottom text'" },
  { author: "@watcher_42", color: "#00E1FF", emoji: "👀", text: "🤣🤣🤣" },
];

const reactions = [
  { emoji: "😂", count: 47 },
  { emoji: "💀", count: 23 },
  { emoji: "🔥", count: 18 },
  { emoji: "🤡", count: 9 },
];

export function SpectatorMode() {
  return (
    <Shell>
      <div className="mx-auto max-w-[1440px] px-6 py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Meta color="#00E1FF">━━ SPECTATOR MODE</Meta>
            <h1 className="mt-2 text-white" style={{ fontWeight: 900, fontSize: "clamp(36px, 5vw, 64px)", letterSpacing: "-0.04em", lineHeight: 0.95 }}>
              You're watching <span className="italic text-[#00E1FF]">FIGHT-42K</span>.
            </h1>
          </div>
          <div className="flex items-center gap-3 border border-white/10 bg-[#0a0a0a] px-4 py-2.5">
            <Eye className="h-4 w-4 text-[#00E1FF]" />
            <span className="text-white/70" style={{ fontSize: 12 }}>
              <span className="text-white" style={{ fontWeight: 800 }}>23</span> spectators
            </span>
            <span className="text-white/30">·</span>
            <button className="text-[#CCFF00]" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}>REQUEST TO JOIN →</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="relative border border-white/10 bg-black p-4">
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black to-transparent px-4 py-3">
                <div className="flex items-center gap-2 border border-[#00E1FF]/40 bg-[#00E1FF]/10 px-2 py-1 text-[#00E1FF]" style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em" }}>
                  <Eye className="h-3 w-3" /> WATCH ONLY
                </div>
                <div className="text-white/40" style={{ fontSize: 11 }}>Round 3 · Voting phase</div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { author: "PettyQueen", color: "#FF2D87", avatar: "crown" as AvatarId, caption: "MY PRODUCTIVITY APP|OPENING TWITTER 47 TIMES", votes: 3 },
                  { author: "v0te_demon", color: "#00E1FF", avatar: "demon" as AvatarId, caption: "READING THE WIKI|ASKING IN DISCORD", votes: 1 },
                ].map((s) => (
                  <div key={s.author} className="relative">
                    <MemeFrame caption={s.caption} />
                    <div className="absolute inset-x-0 bottom-0 bg-black/90 p-2.5 backdrop-blur" style={{ borderTop: `2px solid ${s.color}` }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar id={s.avatar} color={s.color} size={24} />
                          <span className="text-white" style={{ fontWeight: 700, fontSize: 12 }}>{s.author}</span>
                        </div>
                        <span className="border border-white/20 px-2 py-0.5 text-white/60" style={{ fontSize: 10, fontWeight: 800 }}>
                          {s.votes} {s.votes === 1 ? "vote" : "votes"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                <div className="flex items-center gap-2">
                  <Meta>YOUR REACTION</Meta>
                  <span className="text-white/30">·</span>
                  <span className="text-white/50" style={{ fontSize: 11 }}>spectators can react, not vote</span>
                </div>
                <div className="flex gap-1">
                  {reactions.map((r) => (
                    <button key={r.emoji} className="flex items-center gap-1.5 border border-white/10 bg-black px-3 py-2 transition hover:border-white/40">
                      <span style={{ fontSize: 16 }}>{r.emoji}</span>
                      <span className="text-white/70" style={{ fontSize: 11, fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>{r.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="border border-white/10 bg-black">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                <div className="flex items-center gap-2 text-white/40" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em" }}>
                  <MessageCircle className="h-3 w-3" /> SPECTATOR CHAT
                </div>
                <span className="text-white/30" style={{ fontSize: 10 }}>23 watching</span>
              </div>
              <div className="max-h-[400px] space-y-2 overflow-y-auto p-3">
                {chat.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span style={{ fontSize: 14 }}>{c.emoji}</span>
                    <div className="flex-1">
                      <div className="text-white/50" style={{ fontSize: 10, fontWeight: 700 }} >{c.author}</div>
                      <div className="text-white" style={{ fontSize: 12 }}>{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 p-2">
                <input placeholder="Say something…" className="w-full bg-[#0a0a0a] px-3 py-2 text-white outline-none placeholder:text-white/30" style={{ fontSize: 12 }} />
              </div>
            </div>

            <div className="border border-white/10 bg-[#0a0a0a] p-4">
              <Meta color="#CCFF00">━━ JOIN NEXT ROUND?</Meta>
              <p className="mt-2 text-white/60" style={{ fontSize: 12, lineHeight: 1.5 }}>
                Host has to approve. You'll come in with 0 points but you can still win on caption skill alone.
              </p>
              <button className="mt-3 flex w-full items-center justify-center gap-2 bg-[#CCFF00] py-2.5 text-black hover:bg-white" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em" }}>
                <Heart className="h-3 w-3 fill-current" /> ASK TO PLAY
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
