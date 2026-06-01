import Link from "next/link";
import { Swords, Zap } from "lucide-react";
import { HeaderAuth, HeaderNavAuth } from "@/components/header-auth";
import { HeaderRewardsPill } from "@/components/header-rewards-pill";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center bg-[#CCFF00] text-black transition group-hover:rotate-6">
              <Swords className="h-5 w-5" strokeWidth={2.5} />
              <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-[#FF2D87]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className="text-white"
                style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.05em" }}
              >
                MEMEFIGHT
              </span>
              <span className="text-[#CCFF00]" style={{ fontWeight: 900, fontSize: 22 }}>
                ×
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <Link
              href="/feed"
              className="px-3 py-1.5 text-white/50 transition hover:bg-white/5 hover:text-white"
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em" }}
            >
              FEED
            </Link>
            <Link
              href="/party"
              className="px-3 py-1.5 text-white/50 transition hover:bg-white/5 hover:text-white"
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em" }}
            >
              PARTY
            </Link>
            <HeaderNavAuth />
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <HeaderRewardsPill />
          <Link href="/create" className="hidden sm:block">
            <Button className="group relative gap-1.5 px-4 py-2.5">
              <Zap className="h-3.5 w-3.5 fill-black" strokeWidth={2.5} />
              <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.08em" }}>
                START FIGHT
              </span>
              <span
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center bg-[#FF2D87] text-white"
                style={{ fontSize: 9, fontWeight: 900 }}
              >
                +
              </span>
            </Button>
          </Link>
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
