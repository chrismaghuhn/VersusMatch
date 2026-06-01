export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-black text-white" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
      <style>{`::selection { background: #CCFF00; color: #000; }`}</style>
      {children}
    </div>
  );
}

export function Meta({ children, color = "rgba(255,255,255,0.4)" }: { children: React.ReactNode; color?: string }) {
  return <div style={{ color, fontSize: 10, fontWeight: 700, letterSpacing: "0.22em" }}>{children}</div>;
}
