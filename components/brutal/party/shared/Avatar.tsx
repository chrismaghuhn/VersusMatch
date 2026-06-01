"use client";

import { AVATAR_IDS, type AvatarId } from "@/lib/party/avatar-ids";

export type { AvatarId };
export { AVATAR_IDS };

type Props = {
  id: AvatarId;
  color: string;
  size?: number;
  className?: string;
};

export function Avatar({ id, color, size = 64, className }: Props) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={{ display: "block" }} shapeRendering="crispEdges">
      <rect width="64" height="64" fill={color} />
      {RENDER[id]?.(color)}
    </svg>
  );
}

const BLACK = "#0a0a0a";
const WHITE = "#fff";

const RENDER: Record<AvatarId, (accent: string) => React.JSX.Element> = {
  gremlin: (_accent) => (
    <g>
      <path d="M10 22 L32 8 L54 22 L54 50 L10 50 Z" fill={BLACK} />
      <rect x="18" y="28" width="10" height="6" fill={WHITE} />
      <rect x="36" y="28" width="10" height="6" fill={WHITE} />
      <rect x="22" y="30" width="3" height="3" fill={BLACK} />
      <rect x="40" y="30" width="3" height="3" fill={BLACK} />
      <path d="M22 42 L26 44 L30 42 L34 44 L38 42 L42 44" stroke={WHITE} strokeWidth="2" fill="none" />
    </g>
  ),
  skull: (_accent) => (
    <g>
      <path d="M14 22 Q14 10 32 10 Q50 10 50 22 L50 38 L42 38 L42 48 L36 48 L36 42 L28 42 L28 48 L22 48 L22 38 L14 38 Z" fill={WHITE} />
      <rect x="20" y="24" width="8" height="8" fill={BLACK} />
      <rect x="36" y="24" width="8" height="8" fill={BLACK} />
      <rect x="29" y="34" width="6" height="4" fill={BLACK} />
    </g>
  ),
  cyclops: (_accent) => (
    <g>
      <circle cx="32" cy="32" r="20" fill={BLACK} />
      <circle cx="32" cy="30" r="10" fill={WHITE} />
      <circle cx="32" cy="30" r="5" fill={BLACK} />
      <circle cx="34" cy="28" r="1.5" fill={WHITE} />
      <path d="M22 44 L42 44" stroke={WHITE} strokeWidth="2" />
    </g>
  ),
  fox: (_accent) => (
    <g>
      <path d="M10 16 L22 26 L42 26 L54 16 L50 40 Q32 56 14 40 Z" fill={BLACK} />
      <path d="M14 18 L20 26 Z" fill={WHITE} />
      <path d="M50 18 L44 26 Z" fill={WHITE} />
      <rect x="20" y="30" width="6" height="4" fill={WHITE} />
      <rect x="38" y="30" width="6" height="4" fill={WHITE} />
      <path d="M28 40 L32 44 L36 40" stroke={WHITE} strokeWidth="2" fill="none" />
    </g>
  ),
  demon: (_accent) => (
    <g>
      <path d="M12 22 L18 10 L22 20 L42 20 L46 10 L52 22 L52 46 Q32 56 12 46 Z" fill={BLACK} />
      <path d="M18 28 L26 32 L18 36 Z" fill="#FF2D87" />
      <path d="M46 28 L38 32 L46 36 Z" fill="#FF2D87" />
      <path d="M22 42 L26 46 L32 44 L38 46 L42 42" stroke={WHITE} strokeWidth="2" fill="none" />
    </g>
  ),
  clown: (_accent) => (
    <g>
      <circle cx="32" cy="34" r="20" fill={WHITE} />
      <circle cx="32" cy="20" r="6" fill="#FF2D87" />
      <rect x="20" y="30" width="6" height="6" fill={BLACK} />
      <rect x="38" y="30" width="6" height="6" fill={BLACK} />
      <circle cx="32" cy="40" r="3" fill="#FF2D87" />
      <path d="M22 46 Q32 52 42 46" stroke={BLACK} strokeWidth="2" fill="none" />
    </g>
  ),
  robot: (_accent) => (
    <g>
      <rect x="28" y="6" width="8" height="8" fill={BLACK} />
      <rect x="30" y="2" width="4" height="6" fill={BLACK} />
      <rect x="12" y="14" width="40" height="36" fill={BLACK} />
      <rect x="18" y="22" width="10" height="8" fill="#00E1FF" />
      <rect x="36" y="22" width="10" height="8" fill="#00E1FF" />
      <rect x="22" y="38" width="20" height="4" fill={WHITE} />
      <rect x="24" y="40" width="2" height="2" fill={BLACK} />
      <rect x="28" y="40" width="2" height="2" fill={BLACK} />
      <rect x="32" y="40" width="2" height="2" fill={BLACK} />
      <rect x="36" y="40" width="2" height="2" fill={BLACK} />
    </g>
  ),
  ghost: (_accent) => (
    <g>
      <path d="M12 26 Q12 10 32 10 Q52 10 52 26 L52 54 L46 48 L40 54 L34 48 L28 54 L22 48 L16 54 L12 54 Z" fill={WHITE} />
      <circle cx="24" cy="28" r="4" fill={BLACK} />
      <circle cx="40" cy="28" r="4" fill={BLACK} />
      <ellipse cx="32" cy="38" rx="6" ry="3" fill={BLACK} />
    </g>
  ),
  crown: (_accent) => (
    <g>
      <circle cx="32" cy="36" r="18" fill={BLACK} />
      <path d="M14 18 L20 26 L26 14 L32 24 L38 14 L44 26 L50 18 L48 28 L16 28 Z" fill="#FFB800" />
      <circle cx="32" cy="20" r="2" fill="#FF2D87" />
      <rect x="22" y="34" width="6" height="4" fill={WHITE} />
      <rect x="36" y="34" width="6" height="4" fill={WHITE} />
      <path d="M26 44 Q32 48 38 44" stroke={WHITE} strokeWidth="2" fill="none" />
    </g>
  ),
  alien: (_accent) => (
    <g>
      <ellipse cx="32" cy="32" rx="20" ry="22" fill={BLACK} />
      <ellipse cx="24" cy="30" rx="4" ry="8" fill={WHITE} />
      <ellipse cx="40" cy="30" rx="4" ry="8" fill={WHITE} />
      <rect x="28" y="44" width="8" height="2" fill={WHITE} />
      <path d="M14 22 L8 16" stroke={BLACK} strokeWidth="2" />
      <path d="M50 22 L56 16" stroke={BLACK} strokeWidth="2" />
      <circle cx="8" cy="14" r="2" fill={BLACK} />
      <circle cx="56" cy="14" r="2" fill={BLACK} />
    </g>
  ),
  cat: (accent) => (
    <g>
      <path d="M12 18 L20 28 L44 28 L52 18 L50 48 Q32 56 14 48 Z" fill={BLACK} />
      <path d="M14 20 L18 28 Z" fill={accent} />
      <path d="M50 20 L46 28 Z" fill={accent} />
      <path d="M20 36 L26 38 L20 40 M44 36 L38 38 L44 40" stroke={WHITE} strokeWidth="1.5" />
      <circle cx="24" cy="34" r="2" fill={WHITE} />
      <circle cx="40" cy="34" r="2" fill={WHITE} />
      <path d="M32 40 L30 44 M32 40 L34 44" stroke={WHITE} strokeWidth="1.5" />
    </g>
  ),
  frog: (_accent) => (
    <g>
      <circle cx="20" cy="20" r="8" fill="#22c55e" />
      <circle cx="44" cy="20" r="8" fill="#22c55e" />
      <circle cx="20" cy="20" r="4" fill={WHITE} />
      <circle cx="44" cy="20" r="4" fill={WHITE} />
      <circle cx="20" cy="20" r="2" fill={BLACK} />
      <circle cx="44" cy="20" r="2" fill={BLACK} />
      <ellipse cx="32" cy="38" rx="22" ry="16" fill="#22c55e" />
      <path d="M18 38 Q32 50 46 38" stroke={BLACK} strokeWidth="2" fill="none" />
    </g>
  ),
  shroom: (_accent) => (
    <g>
      <path d="M10 30 Q10 12 32 12 Q54 12 54 30 L10 30 Z" fill="#FF2D87" />
      <circle cx="22" cy="22" r="3" fill={WHITE} />
      <circle cx="40" cy="20" r="4" fill={WHITE} />
      <circle cx="32" cy="26" r="2" fill={WHITE} />
      <rect x="22" y="30" width="20" height="24" fill={WHITE} />
      <rect x="26" y="38" width="3" height="3" fill={BLACK} />
      <rect x="35" y="38" width="3" height="3" fill={BLACK} />
      <path d="M28 46 Q32 48 36 46" stroke={BLACK} strokeWidth="2" fill="none" />
    </g>
  ),
  bandit: (_accent) => (
    <g>
      <circle cx="32" cy="34" r="20" fill={BLACK} />
      <rect x="12" y="24" width="40" height="8" fill={WHITE} />
      <rect x="20" y="26" width="6" height="4" fill={BLACK} />
      <rect x="38" y="26" width="6" height="4" fill={BLACK} />
      <path d="M22 42 L42 42" stroke={WHITE} strokeWidth="2" />
      <path d="M12 14 L52 14 L48 22 L16 22 Z" fill="#FF2D87" />
    </g>
  ),
  rage: (_accent) => (
    <g>
      <circle cx="32" cy="32" r="22" fill="#FF3B3B" />
      <path d="M16 22 L26 28 M48 22 L38 28" stroke={BLACK} strokeWidth="3" />
      <rect x="22" y="28" width="6" height="6" fill={WHITE} />
      <rect x="36" y="28" width="6" height="6" fill={WHITE} />
      <rect x="23" y="30" width="2" height="2" fill={BLACK} />
      <rect x="37" y="30" width="2" height="2" fill={BLACK} />
      <path d="M22 44 L26 42 L30 44 L34 42 L38 44 L42 42" stroke={BLACK} strokeWidth="2.5" fill="none" />
    </g>
  ),
  ghoul: (_accent) => (
    <g>
      <path d="M14 24 Q14 12 32 12 Q50 12 50 24 L48 50 L40 46 L32 52 L24 46 L16 50 Z" fill="#94A3B8" />
      <circle cx="24" cy="28" r="3" fill={BLACK} />
      <circle cx="40" cy="28" r="3" fill={BLACK} />
      <path d="M22 40 L26 44 L30 40 L34 44 L38 40 L42 44" stroke={BLACK} strokeWidth="2" fill="none" />
      <path d="M14 20 L20 18 L18 14" stroke={BLACK} strokeWidth="1.5" fill="none" />
    </g>
  ),
  wizard: (_accent) => (
    <g>
      <path d="M14 32 L32 4 L50 32 Z" fill="#9333ea" />
      <circle cx="32" cy="14" r="2" fill="#FFB800" />
      <path d="M28 22 L36 22" stroke="#FFB800" strokeWidth="1" />
      <circle cx="32" cy="42" r="14" fill="#fde68a" />
      <rect x="22" y="40" width="20" height="4" fill={WHITE} />
      <rect x="26" y="38" width="3" height="4" fill={BLACK} />
      <rect x="35" y="38" width="3" height="4" fill={BLACK} />
      <path d="M28 48 Q32 50 36 48" stroke={BLACK} strokeWidth="2" fill="none" />
    </g>
  ),
  pilot: (_accent) => (
    <g>
      <circle cx="32" cy="34" r="20" fill={BLACK} />
      <path d="M18 22 Q32 10 46 22" fill="#FFB800" />
      <ellipse cx="32" cy="32" rx="14" ry="8" fill="#00E1FF" />
      <ellipse cx="32" cy="32" rx="14" ry="8" fill="none" stroke={BLACK} strokeWidth="2" />
      <path d="M18 32 L46 32" stroke={BLACK} strokeWidth="2" />
      <rect x="28" y="44" width="8" height="3" fill={WHITE} />
    </g>
  ),
  blob: (_accent) => (
    <g>
      <path d="M14 32 Q10 18 24 14 Q34 8 44 16 Q56 22 52 36 Q56 50 40 52 Q28 58 18 48 Q8 42 14 32 Z" fill={WHITE} />
      <rect x="20" y="28" width="6" height="8" fill={BLACK} />
      <rect x="38" y="28" width="6" height="8" fill={BLACK} />
      <rect x="22" y="32" width="2" height="2" fill={WHITE} />
      <rect x="40" y="32" width="2" height="2" fill={WHITE} />
      <path d="M26 42 Q32 46 38 42" stroke={BLACK} strokeWidth="2" fill="none" />
    </g>
  ),
  pixel: (_accent) => (
    <g>
      {[[18,14],[26,14],[34,14],[42,14],
        [14,22],[50,22],
        [14,30],[22,30],[42,30],[50,30],
        [14,38],[50,38],
        [18,46],[26,46],[34,46],[42,46]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="8" height="8" fill={BLACK} />
      ))}
      <rect x="22" y="22" width="8" height="8" fill={WHITE} />
      <rect x="34" y="22" width="8" height="8" fill={WHITE} />
      <rect x="24" y="24" width="3" height="3" fill={BLACK} />
      <rect x="36" y="24" width="3" height="3" fill={BLACK} />
    </g>
  ),
  vampire: (_accent) => (
    <g>
      <path d="M12 18 L20 28 L32 22 L44 28 L52 18 L50 48 Q32 56 14 48 Z" fill={BLACK} />
      <circle cx="24" cy="32" r="3" fill="#FF2D87" />
      <circle cx="40" cy="32" r="3" fill="#FF2D87" />
      <path d="M24 40 L26 46 L28 40" fill={WHITE} />
      <path d="M36 40 L38 46 L40 40" fill={WHITE} />
      <path d="M24 40 L40 40" stroke={WHITE} strokeWidth="2" />
    </g>
  ),
  shark: (_accent) => (
    <g>
      <path d="M8 32 L24 18 L48 18 L56 32 L48 46 L24 46 Z" fill="#6b7280" />
      <path d="M30 14 L36 8 L40 14 Z" fill="#6b7280" />
      <circle cx="22" cy="28" r="2" fill={BLACK} />
      <path d="M24 34 L28 36 L32 34 L36 36 L40 34 L44 36 L48 34 L46 38 L42 40 L38 38 L34 40 L30 38 L26 40 Z" fill={WHITE} />
    </g>
  ),
  punk: (_accent) => (
    <g>
      <path d="M14 14 L18 22 L22 12 L26 22 L30 14 L34 22 L38 12 L42 22 L46 14 L50 22 L48 28 L16 28 Z" fill="#FF2D87" />
      <circle cx="32" cy="38" r="18" fill={BLACK} />
      <rect x="22" y="34" width="6" height="6" fill="#CCFF00" />
      <rect x="36" y="34" width="6" height="6" fill="#CCFF00" />
      <rect x="28" y="46" width="8" height="2" fill={WHITE} />
      <circle cx="14" cy="40" r="2" fill={WHITE} />
    </g>
  ),
  snake: (_accent) => (
    <g>
      <path d="M50 16 Q56 28 46 34 Q34 38 30 28 Q26 18 14 22 Q6 28 12 40 Q20 50 34 46 Q50 42 52 50" stroke="#22c55e" strokeWidth="6" fill="none" strokeLinecap="square" />
      <path d="M48 14 L54 14 L52 20 Z" fill="#22c55e" />
      <circle cx="50" cy="17" r="1.5" fill={BLACK} />
      <path d="M52 14 L56 12 M52 14 L56 16" stroke="#FF2D87" strokeWidth="1.5" />
    </g>
  ),
};
