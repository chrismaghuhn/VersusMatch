export const OPTION_COLORS = ["#CCFF00", "#FF2D87"] as const;
export const PINK = "#FF2D87";
export const GREEN = "#CCFF00";

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 px-3 py-2">
      <div
        className="text-white/40"
        style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em" }}
      >
        {label}
      </div>
      <div
        className="mt-0.5 text-white"
        style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.03em", lineHeight: 1.1 }}
      >
        {value}
      </div>
    </div>
  );
}

export function VsSlider({ aPct, totalVotes }: { aPct: number; totalVotes: number }) {
  const splitPercent = totalVotes === 0 ? 50 : aPct;
  const pinkPercent = 100 - splitPercent;

  return (
    <>
      <div className="relative hidden min-h-[320px] w-16 self-stretch md:block">
        <div className="absolute inset-y-4 left-1/2 w-0.5 -translate-x-1/2 overflow-hidden rounded-full">
          <div
            className="absolute inset-x-0 top-0 transition-[height] duration-700 ease-out"
            style={{ height: `${pinkPercent}%`, background: `${PINK}80` }}
          />
          <div
            className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
            style={{ height: `${splitPercent}%`, background: `${GREEN}80` }}
          />
        </div>
        <VsBadge
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 transition-[top] duration-700 ease-out"
          style={{ top: `${splitPercent}%` }}
        />
      </div>

      <div className="relative h-16 w-full md:hidden">
        <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 overflow-hidden rounded-full">
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
            style={{ width: `${splitPercent}%`, background: `${GREEN}80` }}
          />
          <div
            className="absolute inset-y-0 right-0 transition-[width] duration-700 ease-out"
            style={{ width: `${pinkPercent}%`, background: `${PINK}80` }}
          />
        </div>
        <VsBadge
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-700 ease-out"
          style={{ left: `${splitPercent}%` }}
        />
      </div>
    </>
  );
}

function VsBadge({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative flex h-20 w-20 items-center justify-center bg-black ${className ?? ""}`}
      style={style}
    >
      <span className="text-white" style={{ fontWeight: 900, fontSize: 18, letterSpacing: "0.08em" }}>
        VS
      </span>
      <div className="absolute -inset-px border border-[#CCFF00]/40" />
      <div className="absolute -inset-3 border border-white/10" />
      <div className="absolute -right-2 -top-2 h-3 w-3 rotate-45 bg-[#FF2D87]" />
      <div className="absolute -bottom-2 -left-2 h-3 w-3 rotate-45 bg-[#CCFF00]" />
    </div>
  );
}

export function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="5" y="5" width="9" height="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M10 2l2 2-2 2M12 4H5a3 3 0 00-3 3v1M4 12l-2-2 2-2M2 10h7a3 3 0 003-3V6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}
