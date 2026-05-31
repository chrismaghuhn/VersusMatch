import Link from "next/link";
import { Swords } from "lucide-react";
import { BATTLE_CATEGORIES } from "@/lib/categories";

export function SiteFooter() {
  return (
    <footer className="relative bg-black">
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center bg-[#CCFF00] text-black">
                <Swords className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <span
                className="text-white"
                style={{ fontWeight: 900, fontSize: 24, letterSpacing: "-0.04em" }}
              >
                MEMEFIGHT<span className="text-[#CCFF00]">×</span>
              </span>
            </div>
            <p className="mt-5 max-w-sm text-white/50" style={{ fontSize: 14, lineHeight: 1.5 }}>
              Shareable A-vs-B battles. Two options, one winner, zero chill.
            </p>
          </div>

          {[
            {
              h: "PRODUCT",
              links: [
                { label: "Create battle", href: "/create" },
                { label: "Browse all battles", href: "/feed" },
              ],
            },
            {
              h: "CATEGORIES",
              links: BATTLE_CATEGORIES.map((category) => ({
                label: category.label,
                href: `/feed/${category.value}`,
              })),
            },
            {
              h: "ACCOUNT",
              links: [
                { label: "Login", href: "/auth/login" },
                { label: "My battles", href: "/my-battles" },
              ],
            },
          ].map((column) => (
            <div key={column.h}>
              <div
                className="mb-4 text-white/40"
                style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em" }}
              >
                {column.h}
              </div>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-white/80 transition hover:text-[#CCFF00]"
                      style={{ fontSize: 14 }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 md:flex-row md:items-center">
          <div className="text-white/30" style={{ fontSize: 12 }}>
            © 2026 MemeFight.lol — Petty disputes, settled scientifically.
          </div>
          <div
            className="flex items-center gap-2 text-white/30"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em" }}
          >
            <span className="h-1.5 w-1.5 animate-pulse bg-[#CCFF00]" />
            BUILT FOR GROUP CHATS
          </div>
        </div>
      </div>

      <div className="overflow-hidden border-t border-white/10">
        <div
          className="flex animate-[scroll_50s_linear_infinite] whitespace-nowrap py-8 text-white/[0.06]"
          style={{ fontWeight: 900, fontSize: 140, letterSpacing: "-0.055em", lineHeight: 1 }}
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={index}>MEMEFIGHT × </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
