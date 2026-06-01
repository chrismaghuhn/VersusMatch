"use client";

import { useState } from "react";
import { JoinScreen } from "@/components/brutal/party/screens/JoinScreen";
import { AvatarPicker } from "@/components/brutal/party/screens/AvatarPicker";
import { TemplateLibrary } from "@/components/brutal/party/screens/TemplateLibrary";
import { ErrorStates } from "@/components/brutal/party/screens/ErrorStates";
import { MobileGame } from "@/components/brutal/party/screens/MobileGame";
import { SpectatorMode } from "@/components/brutal/party/screens/SpectatorMode";
import { ShareCard } from "@/components/brutal/party/screens/ShareCard";
import { PremiumBundle } from "@/components/brutal/party/screens/PremiumBundle";
import { Tutorial } from "@/components/brutal/party/screens/Tutorial";
import { HostOnboarding } from "@/components/brutal/party/screens/HostOnboarding";

type ScreenId =
  | "join"
  | "avatar"
  | "tutorial"
  | "host"
  | "templates"
  | "mobile"
  | "spectate"
  | "share"
  | "premium"
  | "errors";

const SCREENS: {
  id: ScreenId;
  num: string;
  label: string;
  group: string;
  color: string;
  p1: boolean;
  Comp: () => React.JSX.Element;
}[] = [
  { id: "join", num: "01", label: "Join / Lobby", group: "P1 FLOW", color: "#CCFF00", p1: true, Comp: JoinScreen },
  { id: "avatar", num: "02", label: "Avatar Picker", group: "P1 FLOW", color: "#CCFF00", p1: true, Comp: AvatarPicker },
  { id: "tutorial", num: "03", label: "Tutorial · 4 slides", group: "P1 FLOW", color: "#CCFF00", p1: true, Comp: Tutorial },
  { id: "host", num: "04", label: "Host Lobby + Reactions", group: "P1 FLOW", color: "#FFB800", p1: true, Comp: HostOnboarding },
  { id: "mobile", num: "06", label: "Mobile Game (3 phases)", group: "P1 IN-GAME", color: "#FF2D87", p1: true, Comp: MobileGame },
  { id: "share", num: "08", label: "Share Card", group: "P1 POST", color: "#CCFF00", p1: true, Comp: () => <ShareCard /> },
  { id: "errors", num: "10", label: "Error & Empty States", group: "P1 EDGE", color: "#FF3B3B", p1: true, Comp: ErrorStates },
  { id: "templates", num: "05", label: "Template Library", group: "LATER", color: "#666", p1: false, Comp: TemplateLibrary },
  { id: "spectate", num: "07", label: "Spectator Mode", group: "LATER", color: "#666", p1: false, Comp: SpectatorMode },
  { id: "premium", num: "09", label: "Premium Bundle", group: "LATER", color: "#666", p1: false, Comp: PremiumBundle },
];

const GROUPS = ["P1 FLOW", "P1 IN-GAME", "P1 POST", "P1 EDGE", "LATER"];

export function PartyDesignPreview() {
  const [id, setId] = useState<ScreenId>("join");
  const [collapsed, setCollapsed] = useState(false);
  const current = SCREENS.find((s) => s.id === id)!;
  const Comp = current.Comp;

  return (
    <div
      className="flex min-h-screen bg-black text-white"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
    >
      <aside
        className={
          "sticky top-0 flex h-screen flex-col border-r border-white/10 bg-[#050505] transition-all " +
          (collapsed ? "w-14" : "w-72")
        }
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          {!collapsed && (
            <div>
              <div className="text-[#CCFF00]" style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.03em" }}>
                MEMEFIGHT PARTY
              </div>
              <div className="text-white/40" style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em" }}>
                DESIGN PREVIEW · 10 SCREENS
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="border border-white/10 px-2 py-1 text-white/50 hover:border-white hover:text-white"
            style={{ fontSize: 10, fontWeight: 800 }}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {GROUPS.map((g) => {
            const items = SCREENS.filter((s) => s.group === g);
            if (items.length === 0) return null;
            return (
              <div key={g} className="mb-4">
                {!collapsed && (
                  <div
                    className="px-2 pb-1 text-white/30"
                    style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em" }}
                  >
                    ━━ {g}
                  </div>
                )}
                {items.map((s) => {
                  const active = s.id === id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setId(s.id)}
                      className={
                        "group flex w-full items-center gap-3 px-2 py-2 text-left transition " +
                        (active ? "bg-white/5" : "hover:bg-white/5")
                      }
                      title={collapsed ? s.label : ""}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center border"
                        style={{
                          borderColor: active ? s.color : "rgba(255,255,255,0.1)",
                          color: active ? s.color : "rgba(255,255,255,0.5)",
                          fontSize: 9,
                          fontWeight: 900,
                        }}
                      >
                        {s.num}
                      </span>
                      {!collapsed && (
                        <span
                          className={active ? "text-white" : "text-white/60 group-hover:text-white"}
                          style={{ fontSize: 12, fontWeight: active ? 700 : 500 }}
                        >
                          {s.label}
                          {!s.p1 && <span className="ml-1 text-white/30">· later</span>}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="border-t border-white/10 p-4">
            <div className="text-white/40" style={{ fontSize: 10, lineHeight: 1.5 }}>
              Live <code className="text-[#CCFF00]" style={{ fontFamily: "ui-monospace, monospace" }}>/party</code>{" "}
              uses Arena layout, glow background, and regular card density (desktop lg+ for in-game).
            </div>
            <div className="mt-2 text-white/40" style={{ fontSize: 10, lineHeight: 1.5 }}>
              Source:{" "}
              <code className="text-[#CCFF00]" style={{ fontFamily: "ui-monospace, monospace" }}>
                components/brutal/party/
              </code>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-black/90 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <span style={{ color: current.color, fontWeight: 900, fontSize: 12, letterSpacing: "0.18em" }}>
              {current.num}
            </span>
            <span className="text-white/30">·</span>
            <span className="text-white" style={{ fontWeight: 800, fontSize: 13, letterSpacing: "-0.01em" }}>
              {current.label}
            </span>
          </div>
        </div>

        <div key={id}>
          <Comp />
        </div>
      </main>
    </div>
  );
}
