import { Lock, WifiOff, UserX, AlertTriangle, ArrowRight, Users } from "lucide-react";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";

const states = [
  {
    icon: <Users className="h-8 w-8" />, color: "#FFB800", code: "ROOM FULL",
    title: "This party's at capacity.",
    body: "8 players already in FIGHT-42K. Wait for someone to leave or roll into a different lobby.",
    cta: "FIND ANOTHER LOBBY",
  },
  {
    icon: <Lock className="h-8 w-8" />, color: "#FF2D87", code: "BAD CODE",
    title: "That room doesn't exist.",
    body: "Either you typed it wrong, or the host already closed it. Codes are case-insensitive but have to match exactly.",
    cta: "TRY AGAIN",
  },
  {
    icon: <WifiOff className="h-8 w-8" />, color: "#FF3B3B", code: "DISCONNECTED",
    title: "We lost you for a sec.",
    body: "Could be your wifi, could be ours. Your spot in FIGHT-42K is held for 30 seconds — reconnecting...",
    cta: "RECONNECTING…",
    progress: 60,
  },
  {
    icon: <UserX className="h-8 w-8" />, color: "#94A3B8", code: "EVERYONE LEFT",
    title: "You're the last one standing.",
    body: "Everyone bailed mid-round. Can't play alone, sorry friend. Want to start a fresh lobby?",
    cta: "NEW LOBBY",
  },
  {
    icon: <AlertTriangle className="h-8 w-8" />, color: "#CCFF00", code: "NO SUBMISSIONS",
    title: "Nobody wrote anything.",
    body: "Everyone ghosted the round. Skipping ahead. (We'll skip the host too if they keep this up.)",
    cta: "NEXT ROUND",
  },
  {
    icon: <Lock className="h-8 w-8" />, color: "#9333ea", code: "BANNED FROM ROOM",
    title: "Host kicked you out.",
    body: "Probably for cause. Probably not. You can join a different room — but FIGHT-42K is closed to you for 24h.",
    cta: "BROWSE LOBBIES",
  },
];

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
            Same tone as the game — don't apologize, don't engineer-speak. Just say what happened and what to do.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {states.map((s) => (
            <div key={s.code} className="relative overflow-hidden border border-white/10 bg-[#0a0a0a] p-6">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20 blur-2xl" style={{ background: s.color }} />
              <div className="absolute left-0 top-0 h-1 w-full" style={{ background: s.color }} />

              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center border" style={{ borderColor: s.color, color: s.color, background: `${s.color}10` }}>
                    {s.icon}
                  </div>
                  <span className="border px-2 py-1" style={{ borderColor: s.color, color: s.color, fontSize: 10, fontWeight: 900, letterSpacing: "0.18em" }}>
                    {s.code}
                  </span>
                </div>

                <h3 className="mt-5 text-white" style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{s.title}</h3>
                <p className="mt-2 text-white/60" style={{ fontSize: 13, lineHeight: 1.5 }}>{s.body}</p>

                {s.progress !== undefined && (
                  <div className="mt-4 h-1 w-full overflow-hidden bg-white/10">
                    <div className="h-full animate-pulse" style={{ width: `${s.progress}%`, background: s.color }} />
                  </div>
                )}

                <button className="mt-5 flex w-full items-center justify-between border px-4 py-2.5 text-white transition hover:bg-white hover:text-black" style={{ borderColor: s.color, fontSize: 11, fontWeight: 800, letterSpacing: "0.18em" }}>
                  {s.cta} <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
