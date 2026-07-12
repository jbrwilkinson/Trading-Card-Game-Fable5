import type { Card } from "@lotr-tcg/engine";

/**
 * Generative card art: every card gets an original, deterministic SVG scene
 * composed from its faction palette, kind, name keywords, and a hash of its
 * artId. If real illustration files are added later (art/cards/<faction>/
 * <artId>.webp per the asset pipeline), swap this component's output for an
 * <img> keyed by the same artId — nothing else changes.
 */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG for art composition, seeded by artId. */
function artRng(seed: string) {
  let state = hashString(seed);
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

interface Palette {
  skyTop: string;
  skyBottom: string;
  glow: string;
  far: string;
  near: string;
  accent: string;
}

const PALETTES: Record<Card["faction"], Palette> = {
  fellowship: { skyTop: "#2c4a33", skyBottom: "#0d1a10", glow: "#a8d08d", far: "#1e3323", near: "#0a140c", accent: "#e8d477" },
  rohan: { skyTop: "#5a4a26", skyBottom: "#1d1708", glow: "#e8c968", far: "#3d3318", near: "#14100a", accent: "#f0e2a8" },
  gondor: { skyTop: "#3a4654", skyBottom: "#10141a", glow: "#c8d8e8", far: "#28313d", near: "#0c0f14", accent: "#ffffff" },
  mordor: { skyTop: "#4d2020", skyBottom: "#170808", glow: "#e86840", far: "#331414", near: "#120707", accent: "#ff9548" },
  neutral: { skyTop: "#3a3444", skyBottom: "#131019", glow: "#b8a8d0", far: "#292433", near: "#0e0c12", accent: "#d8c8f0" },
};

function ridge(rnd: () => number, baseY: number, jag: number, width = 100): string {
  const points: string[] = [`0,70`, `0,${baseY + (rnd() - 0.5) * jag}`];
  for (let x = 12; x < width; x += 12) {
    points.push(`${x},${baseY + (rnd() - 0.5) * 2 * jag}`);
  }
  points.push(`${width},${baseY + (rnd() - 0.5) * jag}`, `${width},70`);
  return points.join(" ");
}

function LocationScene({ p, rnd, artId }: { p: Palette; rnd: () => number; artId: string }) {
  const sunX = 20 + rnd() * 60;
  const sunY = 12 + rnd() * 16;
  const hasTower = rnd() > 0.5;
  const towerX = 25 + rnd() * 50;
  return (
    <>
      <circle cx={sunX} cy={sunY} r={7 + rnd() * 4} fill={p.glow} opacity="0.9" />
      <circle cx={sunX} cy={sunY} r={12 + rnd() * 6} fill={p.glow} opacity="0.25" />
      <polygon points={ridge(rnd, 34, 14)} fill={p.far} />
      {hasTower && (
        <g fill={p.near}>
          <rect x={towerX - 2.5} y={26} width={5} height={22} />
          <polygon points={`${towerX - 4},27 ${towerX + 4},27 ${towerX},19`} />
          <circle cx={towerX} cy={22} r={0.9} fill={p.accent} />
        </g>
      )}
      <polygon points={ridge(rnd, 46, 12)} fill={p.near} />
      {artId.length % 2 === 0 && <ellipse cx={50} cy={66} rx={40} ry={5} fill={p.glow} opacity="0.12" />}
    </>
  );
}

function figureFor(tags: string[], p: Palette, rnd: () => number) {
  const has = (t: string) => tags.includes(t);
  const cx = 50;
  const dark = "#08060c";
  // Broad body silhouette, then a signature prop chosen from the card's tags.
  const small = has("hobbit") || has("creature");
  const big = has("troll") || has("ent") || has("skin-changer") || has("ancient");
  const scale = small ? 0.72 : big ? 1.25 : 1;
  const baseY = 62;
  const headY = baseY - 34 * scale;

  return (
    <g>
      <ellipse cx={cx} cy={baseY + 2} rx={26 * scale} ry={4} fill={dark} opacity="0.55" />
      {has("spider") ? (
        <g fill={dark}>
          <ellipse cx={cx} cy={44} rx={13} ry={9} />
          <circle cx={cx} cy={33} r={5.5} />
          {[-1, 1].map((side) =>
            [0, 1, 2, 3].map((i) => (
              <path
                key={`${side}-${i}`}
                d={`M ${cx + side * 8} ${40 + i * 2} q ${side * 12} ${-6 + i * 3} ${side * 20} ${4 + i * 4}`}
                stroke={dark}
                strokeWidth="1.8"
                fill="none"
              />
            ))
          )}
          <circle cx={cx - 2} cy={31} r={0.8} fill={p.accent} />
          <circle cx={cx + 2} cy={31} r={0.8} fill={p.accent} />
        </g>
      ) : (
        <g fill={dark}>
          {/* cloaked body */}
          <path
            d={`M ${cx} ${headY + 6 * scale}
                C ${cx - 14 * scale} ${headY + 14 * scale}, ${cx - 12 * scale} ${baseY - 8 * scale}, ${cx - 15 * scale} ${baseY}
                L ${cx + 15 * scale} ${baseY}
                C ${cx + 12 * scale} ${baseY - 8 * scale}, ${cx + 14 * scale} ${headY + 14 * scale}, ${cx} ${headY + 6 * scale} Z`}
          />
          <circle cx={cx} cy={headY + 3 * scale} r={5.2 * scale} />
          {(has("wizard") || has("enigma")) && (
            <polygon
              points={`${cx - 6 * scale},${headY + 1} ${cx + 6 * scale},${headY + 1} ${cx + 1 * scale},${headY - 12 * scale}`}
            />
          )}
          {(has("king") || has("lord") || has("lady") || has("prince") || has("steward")) && (
            <path
              d={`M ${cx - 5 * scale} ${headY - 1} l 2 -4 l 3 3 l 3 -3 l 2 4 z`}
              fill={p.accent}
            />
          )}
          {(has("wraith") || has("traitor")) && (
            <circle cx={cx} cy={headY + 3 * scale} r={5.2 * scale} fill="#000" opacity="0.85" />
          )}
          {/* props */}
          {(has("wizard") || has("enigma")) && (
            <rect x={cx + 14 * scale} y={headY - 6 * scale} width={1.8} height={40 * scale} rx={1} />
          )}
          {has("archer") && (
            <path
              d={`M ${cx - 20 * scale} ${headY + 4} q 12 ${16 * scale} 0 ${32 * scale}`}
              stroke={dark}
              strokeWidth="1.8"
              fill="none"
            />
          )}
          {(has("rider") || has("marshal") || has("knight")) && (
            <g>
              <rect x={cx + 15 * scale} y={headY - 10 * scale} width={1.6} height={46 * scale} rx={1} />
              <polygon
                points={`${cx + 15.8 * scale},${headY - 12 * scale} ${cx + 12 * scale},${headY - 4 * scale} ${cx + 19.5 * scale},${headY - 4 * scale}`}
              />
            </g>
          )}
          {(has("guard") || has("shieldmaiden")) && (
            <ellipse cx={cx - 15 * scale} cy={baseY - 18 * scale} rx={5.5 * scale} ry={7.5 * scale} stroke={p.accent} strokeWidth="0.8" />
          )}
          {(has("orc") || has("uruk-hai") || has("goblin") || has("warrior") || has("easterling") || has("haradrim")) && (
            <path
              d={`M ${cx - 16 * scale} ${headY + 2} l ${-6 * scale} ${26 * scale} l 3 1 z`}
            />
          )}
        </g>
      )}
      {has("ring-bearer") && <circle cx={cx} cy={headY - 8} r={3} stroke={p.accent} strokeWidth="1.2" fill="none" />}
    </g>
  );
}

function CharacterScene({ card, p, rnd }: { card: Card & { kind: "character" }; p: Palette; rnd: () => number }) {
  return (
    <>
      <circle cx={50} cy={36} r={26 + rnd() * 6} fill={p.glow} opacity="0.22" />
      <circle cx={50} cy={36} r={16 + rnd() * 4} fill={p.glow} opacity="0.18" />
      <polygon points={ridge(rnd, 52, 8)} fill={p.far} opacity="0.8" />
      {figureFor(card.tags, p, rnd)}
    </>
  );
}

function itemGlyph(name: string, p: Palette) {
  const n = name.toLowerCase();
  const dark = "#0a0810";
  if (n.includes("ring")) {
    return (
      <g>
        <circle cx={50} cy={34} r={12} stroke={p.accent} strokeWidth="4.5" fill="none" />
        <circle cx={50} cy={34} r={12} stroke="#fff" strokeWidth="1" fill="none" opacity="0.5" />
      </g>
    );
  }
  if (n.includes("shield")) {
    return (
      <path d="M 50 18 C 58 22 64 22 66 21 C 66 40 60 50 50 55 C 40 50 34 40 34 21 C 36 22 42 22 50 18 Z" fill={dark} stroke={p.accent} strokeWidth="1.6" />
    );
  }
  if (n.includes("banner")) {
    return (
      <g>
        <rect x={38} y={14} width={2} height={44} fill={dark} />
        <path d="M 41 16 L 68 20 L 62 27 L 68 34 L 41 38 Z" fill={dark} stroke={p.accent} strokeWidth="1.2" />
      </g>
    );
  }
  if (n.includes("hammer") || n.includes("grond")) {
    return (
      <g transform="rotate(-30 50 36)">
        <rect x={48.5} y={22} width={3} height={34} fill={dark} />
        <rect x={36} y={14} width={28} height={12} rx={2} fill={dark} stroke={p.accent} strokeWidth="1.4" />
      </g>
    );
  }
  if (n.includes("armour") || n.includes("shirt")) {
    return (
      <path d="M 40 20 L 46 16 L 54 16 L 60 20 L 64 28 L 58 31 L 58 52 L 42 52 L 42 31 L 36 28 Z" fill={dark} stroke={p.accent} strokeWidth="1.4" />
    );
  }
  if (n.includes("spear")) {
    return (
      <g transform="rotate(20 50 36)">
        <rect x={49.2} y={20} width={1.8} height={40} fill={dark} />
        <polygon points="50,10 45,22 55,22" fill={dark} stroke={p.accent} strokeWidth="1" />
      </g>
    );
  }
  // default: a sword
  return (
    <g transform="rotate(25 50 36)">
      <polygon points="50,8 52.5,14 52.5,42 47.5,42 47.5,14" fill="#c8ccd8" stroke={p.accent} strokeWidth="0.8" />
      <rect x={42} y={42} width={16} height={3.2} rx={1.4} fill={dark} />
      <rect x={48.4} y={45} width={3.2} height={12} fill={dark} />
      <circle cx={50} cy={59} r={2.6} fill={p.accent} />
    </g>
  );
}

function ItemScene({ card, p, rnd }: { card: Card & { kind: "item" }; p: Palette; rnd: () => number }) {
  return (
    <>
      <circle cx={50} cy={34} r={22 + rnd() * 4} fill={p.glow} opacity="0.25" />
      <ellipse cx={50} cy={60} rx={22} ry={4.5} fill="#000" opacity="0.5" />
      {itemGlyph(card.name, p)}
    </>
  );
}

function EventScene({ p, rnd }: { p: Palette; rnd: () => number }) {
  const rays = 9;
  return (
    <>
      <circle cx={50} cy={35} r={9 + rnd() * 3} fill={p.glow} opacity="0.9" />
      {Array.from({ length: rays }, (_, i) => {
        const angle = (i / rays) * Math.PI * 2 + rnd() * 0.3;
        const len = 18 + rnd() * 16;
        return (
          <line
            key={i}
            x1={50 + Math.cos(angle) * 11}
            y1={35 + Math.sin(angle) * 11}
            x2={50 + Math.cos(angle) * (11 + len)}
            y2={35 + Math.sin(angle) * (11 + len)}
            stroke={p.glow}
            strokeWidth={1.6 - (i % 3) * 0.4}
            opacity={0.5 + rnd() * 0.4}
          />
        );
      })}
      <circle cx={50} cy={35} r={4} fill="#fff" opacity="0.85" />
    </>
  );
}

function StoryScene({ p, rnd }: { p: Palette; rnd: () => number }) {
  return (
    <>
      <circle cx={50} cy={35} r={26} fill={p.glow} opacity="0.14" />
      <rect x={30} y={16} width={40} height={40} rx={2} fill="#d8cba8" opacity="0.92" />
      <rect x={27} y={14} width={46} height={5} rx={2.5} fill="#a08d5c" />
      <rect x={27} y={53} width={46} height={5} rx={2.5} fill="#a08d5c" />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={35} y1={24 + i * 6} x2={35 + 22 + rnd() * 8} y2={24 + i * 6} stroke="#5c4c28" strokeWidth="1.4" opacity="0.8" />
      ))}
      <circle cx={62} cy={44} r={4} fill={p.accent} opacity="0.75" />
    </>
  );
}

export function CardArt({ card }: { card: Card }) {
  const p = PALETTES[card.faction];
  const rnd = artRng(card.artId);
  const gradId = `sky-${card.artId}`;
  return (
    <svg viewBox="0 0 100 70" preserveAspectRatio="xMidYMid slice" className="card-art-svg" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.skyTop} />
          <stop offset="100%" stopColor={p.skyBottom} />
        </linearGradient>
      </defs>
      <rect width="100" height="70" fill={`url(#${gradId})`} />
      {card.kind === "location" && <LocationScene p={p} rnd={rnd} artId={card.artId} />}
      {card.kind === "character" && <CharacterScene card={card} p={p} rnd={rnd} />}
      {card.kind === "item" && <ItemScene card={card} p={p} rnd={rnd} />}
      {card.kind === "event" && <EventScene p={p} rnd={rnd} />}
      {card.kind === "story" && <StoryScene p={p} rnd={rnd} />}
    </svg>
  );
}
