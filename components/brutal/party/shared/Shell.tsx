import { PARTY_DESIGN, partyGlowLayerStyle, type PartyTexture } from "@/lib/party/design";

type ShellProps = {
  children: React.ReactNode;
  texture?: PartyTexture;
  accent?: string;
};

export function Shell({
  children,
  texture = PARTY_DESIGN.texture,
  accent = PARTY_DESIGN.accent,
}: ShellProps) {
  return (
    <div
      className="relative min-h-screen w-full bg-black text-white"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif" }}
    >
      <style>{`::selection { background: #CCFF00; color: #000; }`}</style>
      {texture === "glow" ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 will-change-transform"
          style={partyGlowLayerStyle(accent)}
        />
      ) : null}
      {children}
    </div>
  );
}

export function Meta({
  children,
  color = "rgba(255,255,255,0.4)",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      className="uppercase"
      style={{ color, fontSize: 10, fontWeight: 700, letterSpacing: "0.22em" }}
    >
      {children}
    </div>
  );
}
