import { Crown, Check, X, Zap, Users, Upload, Film, Lock } from "lucide-react";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";

const PERKS = [
  { icon: <Upload className="h-5 w-5" />, title: "UPLOAD YOUR OWN TEMPLATES", body: "Drop any image. Becomes a template for your lobby — and the public pool if you want." },
  { icon: <Users className="h-5 w-5" />, title: "BIG LOBBIES — UP TO 16", body: "Free caps at 8. Premium hosts can run office-party-sized chaos." },
  { icon: <Film className="h-5 w-5" />, title: "REPLAY SAVES", body: "Every round is auto-saved as a video. Send the cursed ones to the group chat forever." },
  { icon: <Lock className="h-5 w-5" />, title: "NSFW PACK ACCESS", body: "1,200+ templates the free tier can't touch. Unhinged opt-in only." },
  { icon: <Zap className="h-5 w-5" />, title: "PRIORITY ROOMS", body: "Skip the queue when servers are slammed. Friday night insurance." },
  { icon: <Crown className="h-5 w-5" />, title: "GOLD CROWN ON LEADERBOARD", body: "Everyone in your lobby sees you funded the bit. Status." },
];

const PLANS = [
  { name: "PASS", price: "4.99", period: "month", desc: "All perks, billed monthly.", color: "#94A3B8", featured: false },
  { name: "YEARLY", price: "39", period: "year", desc: "Same thing, two months free.", color: "#CCFF00", featured: true, save: "SAVE 35%" },
  { name: "LIFETIME", price: "99", period: "once", desc: "Pay once. Cope forever.", color: "#FF2D87", featured: false, save: "GOAT TIER" },
];

const COMPARE = [
  ["Max lobby size", "8", "16"],
  ["Templates", "8,247", "9,400+"],
  ["Custom uploads", "—", "Unlimited"],
  ["Replay saves", "—", "Yes"],
  ["NSFW pack", "—", "Included"],
  ["Coin earn rate", "1×", "2×"],
  ["Ads between rounds", "Yes (rare)", "Never"],
];

export function PremiumBundle() {
  return (
    <Shell>
      <div className="mx-auto max-w-[1280px] px-6 py-12">
        <div className="mb-10 text-center">
          <Meta color="#FFB800">━━ PREMIUM · MEMEFIGHT GOLD</Meta>
          <h1 className="mt-3 text-white" style={{ fontWeight: 900, fontSize: "clamp(48px, 8vw, 112px)", letterSpacing: "-0.05em", lineHeight: 0.9 }}>
            Fund the <span className="italic text-[#FFB800]">bit</span>.
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-white/60" style={{ fontSize: 16, lineHeight: 1.5 }}>
            Free tier has everything you need. Premium has everything you <span className="italic">want</span>.
          </p>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={"relative border p-6 " + (p.featured ? "border-[#CCFF00] bg-[#CCFF00]/5" : "border-white/10 bg-[#0a0a0a]")}>
              {p.save && (
                <div className="absolute -top-3 left-6 px-2 py-0.5 text-black" style={{ background: p.color, fontSize: 10, fontWeight: 900, letterSpacing: "0.18em" }}>
                  {p.save}
                </div>
              )}
              <div className="text-white/40" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.2em" }}>{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-white/40" style={{ fontSize: 24 }}>$</span>
                <span className="text-white" style={{ fontWeight: 900, fontSize: 72, letterSpacing: "-0.05em", lineHeight: 1 }}>{p.price}</span>
                <span className="text-white/40" style={{ fontSize: 13 }}>/{p.period}</span>
              </div>
              <p className="mt-2 text-white/60" style={{ fontSize: 13 }}>{p.desc}</p>
              <button className={"mt-5 w-full py-3.5 transition " + (p.featured ? "bg-[#CCFF00] text-black hover:bg-white" : "border border-white/20 text-white hover:border-white hover:bg-white hover:text-black")} style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.18em" }}>
                {p.featured ? "GET YEARLY →" : "CHOOSE"}
              </button>
            </div>
          ))}
        </div>

        <div className="mb-10">
          <Meta color="#CCFF00">━━ WHAT YOU UNLOCK</Meta>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {PERKS.map((p) => (
              <div key={p.title} className="border border-white/10 bg-[#0a0a0a] p-5 hover:border-[#FFB800]">
                <div className="flex h-10 w-10 items-center justify-center border border-[#FFB800] bg-[#FFB800]/15 text-[#FFB800]">
                  {p.icon}
                </div>
                <h3 className="mt-4 text-white" style={{ fontWeight: 900, fontSize: 15, letterSpacing: "-0.01em" }}>{p.title}</h3>
                <p className="mt-1.5 text-white/60" style={{ fontSize: 12, lineHeight: 1.5 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-white/10 bg-black">
          <div className="border-b border-white/10 px-6 py-4">
            <Meta>━━ FREE vs GOLD</Meta>
          </div>
          <div className="grid grid-cols-[1.5fr_1fr_1fr]">
            <div className="border-r border-white/10 px-6 py-3 text-white/40" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}>FEATURE</div>
            <div className="border-r border-white/10 px-6 py-3 text-center text-white/40" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}>FREE</div>
            <div className="px-6 py-3 text-center text-[#FFB800]" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}>★ GOLD</div>

            {COMPARE.map(([label, free, gold]) => (
              <Row key={label} label={label} free={free} gold={gold} />
            ))}
          </div>
        </div>

        <p className="mt-8 text-center text-white/40" style={{ fontSize: 12 }}>
          {`Cancel anytime. We won't email you. Lifetime is lifetime — promise on the homies.`}
        </p>
      </div>
    </Shell>
  );
}

function Row({ label, free, gold }: { label: string; free: string; gold: string }) {
  const renderCell = (val: string, hot?: boolean) => {
    if (val === "—") return <X className="mx-auto h-4 w-4 text-white/20" />;
    if (val === "Yes" && hot) return <Check className="mx-auto h-4 w-4 text-[#FFB800]" />;
    return <span className={hot ? "text-[#FFB800]" : "text-white"} style={{ fontSize: 13, fontWeight: hot ? 800 : 600 }}>{val}</span>;
  };
  return (
    <>
      <div className="border-t border-r border-white/5 px-6 py-3 text-white/80" style={{ fontSize: 13 }}>{label}</div>
      <div className="border-t border-r border-white/5 px-6 py-3 text-center text-white/50" style={{ fontSize: 13 }}>{renderCell(free)}</div>
      <div className="border-t border-white/5 px-6 py-3 text-center">{renderCell(gold, true)}</div>
    </>
  );
}
