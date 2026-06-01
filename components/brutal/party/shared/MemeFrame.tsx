export function MemeFrame({
  caption, big = false, mini = false, template = "drake",
}: { caption?: string; big?: boolean; mini?: boolean; template?: "drake" | "boyfriend" | "brain" | "pikachu" }) {
  const fontSize = big ? 32 : mini ? 11 : 18;
  const labelSize = big ? 14 : mini ? 8 : 10;

  const renderTemplate = () => {
    if (template === "boyfriend") {
      return (
        <div className="grid h-full grid-cols-3">
          <div className="relative flex items-center justify-center" style={{ background: "#3B82F6" }}>
            <span style={{ fontSize: big ? 56 : mini ? 18 : 32 }}>👨</span>
          </div>
          <div className="relative flex items-center justify-center" style={{ background: "#FF2D87" }}>
            <span style={{ fontSize: big ? 56 : mini ? 18 : 32 }}>👀</span>
          </div>
          <div className="relative flex items-center justify-center" style={{ background: "#FFB800" }}>
            <span style={{ fontSize: big ? 56 : mini ? 18 : 32 }}>😤</span>
          </div>
        </div>
      );
    }
    if (template === "brain") {
      return (
        <div className="grid h-full grid-cols-2 grid-rows-2">
          {["#1f2937", "#7c3aed", "#ec4899", "#FFB800"].map((c, i) => (
            <div key={i} className="flex items-center justify-center" style={{ background: c }}>
              <span style={{ fontSize: big ? 36 : mini ? 14 : 22 }}>{["🧠", "🧠✨", "🧠🌟", "🌌"][i]}</span>
            </div>
          ))}
        </div>
      );
    }
    if (template === "pikachu") {
      return (
        <div className="relative flex h-full items-center justify-center" style={{ background: "#FFB800" }}>
          <span style={{ fontSize: big ? 120 : mini ? 40 : 80 }}>😮</span>
        </div>
      );
    }
    return (
      <div className="grid h-full grid-rows-2">
        <div className="relative flex items-center justify-center overflow-hidden" style={{ background: "#dc2626" }}>
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 30% 40%, #fff 0%, transparent 50%)" }} />
          <div className="relative text-center text-white/95">
            <div style={{ fontSize: big ? 56 : mini ? 22 : 40 }}>🙅</div>
          </div>
        </div>
        <div className="relative flex items-center justify-center overflow-hidden" style={{ background: "#16a34a" }}>
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 70% 60%, #fff 0%, transparent 50%)" }} />
          <div className="relative text-center text-white/95">
            <div style={{ fontSize: big ? 56 : mini ? 22 : 40 }}>👉</div>
          </div>
        </div>
      </div>
    );
  };

  const [top, bottom] = caption?.includes("|")
    ? caption.split("|").map((s) => s.trim())
    : [caption || "", ""];

  const textStyle: React.CSSProperties = {
    fontFamily: "Impact, 'Arial Black', sans-serif",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    lineHeight: 1.05,
    textAlign: "center",
    padding: "0 12px",
    textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
    WebkitTextStroke: mini ? "1px #000" : "1.5px #000",
    fontSize,
  };

  return (
    <div className={"relative w-full overflow-hidden border-2 border-white " + (big ? "aspect-[4/5]" : "aspect-square")}>
      {renderTemplate()}
      {!mini && (
        <div className="absolute left-2 top-2 z-10 border border-white/20 bg-black/70 px-1.5 py-0.5 text-white/70 backdrop-blur" style={{ fontSize: labelSize - 1, fontWeight: 800, letterSpacing: "0.18em" }}>
          {template.toUpperCase()}
        </div>
      )}
      {top && (
        <div className="absolute inset-x-0 top-[12%] z-10 flex items-center justify-center" style={{ height: "30%" }}>
          <div style={textStyle}>{top}</div>
        </div>
      )}
      {bottom && (
        <div className="absolute inset-x-0 bottom-[12%] z-10 flex items-center justify-center" style={{ height: "30%" }}>
          <div style={textStyle}>{bottom}</div>
        </div>
      )}
    </div>
  );
}
