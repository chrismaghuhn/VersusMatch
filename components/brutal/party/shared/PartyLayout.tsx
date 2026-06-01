import { PARTY_DESIGN } from "@/lib/party/design";
import { Meta } from "@/components/brutal/party/shared/Shell";

export type PartyLayoutRegions = {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headRight?: React.ReactNode;
  main: React.ReactNode;
  asides?: { label: string; node: React.ReactNode }[];
  actions?: React.ReactNode;
};

type PartyLayoutProps = {
  regions: PartyLayoutRegions;
  maxWidth?: number;
  fontScale?: number;
  accent?: string;
};

export function TitleBlock({
  eyebrow,
  title,
  subtitle,
  accent = PARTY_DESIGN.accent,
  scale = 1,
  big = false,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  accent?: string;
  scale?: number;
  big?: boolean;
}) {
  return (
    <div>
      {eyebrow ? (
        <div className="mb-2.5">
          <Meta color={accent}>{eyebrow}</Meta>
        </div>
      ) : null}
      <h1
        className="m-0 text-white"
        style={{
          fontWeight: 900,
          fontSize: big
            ? `clamp(44px, ${5.5 * scale}vw, ${92 * scale}px)`
            : `clamp(32px, ${3.4 * scale}vw, ${56 * scale}px)`,
          letterSpacing: "-0.04em",
          lineHeight: 0.92,
        }}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-3 text-white/50" style={{ fontSize: 15, lineHeight: 1.5 }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function Panel({
  label,
  accent = PARTY_DESIGN.accent,
  children,
  className = "",
}: {
  label?: string;
  accent?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"border border-white/10 bg-[#0a0a0a] p-4 " + className}>
      {label ? (
        <div className="mb-3">
          <Meta color={accent}>{label}</Meta>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function PartyLayout({
  regions,
  maxWidth = PARTY_DESIGN.maxWidth,
  fontScale = PARTY_DESIGN.fontScale,
  accent = PARTY_DESIGN.accent,
}: PartyLayoutProps) {
  const { eyebrow, title, subtitle, headRight, main, asides = [], actions } = regions;

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <div
        className="mx-auto px-8 pb-16 pt-[clamp(32px,5vw,64px)]"
        style={{ maxWidth }}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <TitleBlock
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            accent={accent}
            scale={fontScale}
          />
          {headRight ? <div className="shrink-0">{headRight}</div> : null}
        </div>
        <div className="mt-10">{main}</div>
        {asides.length > 0 ? (
          <div
            className="mt-8 grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(asides.length, 3)}, minmax(0, 1fr))`,
            }}
          >
            {asides.map((aside) => (
              <Panel key={aside.label} label={aside.label} accent={accent}>
                {aside.node}
              </Panel>
            ))}
          </div>
        ) : null}
        {actions ? <div className="mt-8">{actions}</div> : null}
      </div>
    </div>
  );
}
