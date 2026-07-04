"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, PanInfo } from "motion/react";
import { CardView, Pos, Profile } from "@/lib/types";
import { getHudCards, HudCardSpec } from "@/lib/hudCards";
import { CategoryCard } from "./CategoryCard";
import { Silhouette } from "./Silhouette";
import { CosmicBackdrop } from "./CosmicBackdrop";

// Character center + ring radii (all stage %). Two sets: roomy on desktop, and
// tighter on phones so the smaller mobile cards still fit inside the narrow
// stage width (keeping the "cards around the avatar" layout without overflow).
interface Geom {
  cx: number;
  cy: number;
  ringX: number;
  ringY: number;
  anchorX: number; // inner ring — where lines meet the character outline
  anchorY: number;
}
const DESKTOP_GEOM: Geom = { cx: 50, cy: 42, ringX: 40, ringY: 36, anchorX: 23, anchorY: 32 };
const MOBILE_GEOM: Geom = { cx: 50, cy: 40, ringX: 27, ringY: 33, anchorX: 17, anchorY: 27 };

// Fallback card half-size (stage %) used before a card's real size has been
// measured. Real measured sizes (see useCardSizes below) take over once known,
// so cards that grow to fit their content never overlap another card.
const DEFAULT_SIZE = { hw: 12, hh: 9 };

const rad = (deg: number) => (deg * Math.PI) / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Tracks each card's rendered size (converted to stage %) via ResizeObserver,
// so collision avoidance matches the card's *actual* footprint even as its
// content (and therefore height) changes.
function useCardSizes(stageRef: React.RefObject<HTMLDivElement | null>) {
  const [sizes, setSizes] = useState<Record<string, { hw: number; hh: number }>>({});
  const observers = useRef<Map<string, ResizeObserver>>(new Map());

  const registerCard = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      const existing = observers.current.get(key);
      if (existing) {
        existing.disconnect();
        observers.current.delete(key);
      }
      if (!el) return;
      const ro = new ResizeObserver(() => {
        const stage = stageRef.current?.getBoundingClientRect();
        if (!stage || !stage.width || !stage.height) return;
        const rect = el.getBoundingClientRect();
        const hw = (rect.width / 2 / stage.width) * 100;
        const hh = (rect.height / 2 / stage.height) * 100;
        setSizes((s) => {
          const prev = s[key];
          if (prev && Math.abs(prev.hw - hw) < 0.3 && Math.abs(prev.hh - hh) < 0.3) return s;
          return { ...s, [key]: { hw, hh } };
        });
      });
      ro.observe(el);
      observers.current.set(key, ro);
    },
    [stageRef]
  );

  useEffect(() => {
    const map = observers.current;
    return () => {
      map.forEach((ro) => ro.disconnect());
      map.clear();
    };
  }, []);

  const sizeOf = useCallback((key: string) => sizes[key] ?? DEFAULT_SIZE, [sizes]);
  return { registerCard, sizeOf };
}

function clampToStage(p: Pos, hw: number, hh: number): Pos {
  return { x: clamp(p.x, hw - 2, 100 - hw + 2), y: clamp(p.y, hh - 2, 100 - hh + 2) };
}

// Default slot: an even arc around the character, leaving a gap at the bottom.
function arcSlot(index: number, count: number, hw: number, hh: number, g: Geom): Pos {
  const startDeg = 125;
  const sweep = 290; // wraps left → top → right, skipping straight-down
  const deg = count <= 1 ? 270 : startDeg + (sweep * index) / (count - 1);
  return clampToStage(
    { x: g.cx + g.ringX * Math.cos(rad(deg)), y: g.cy + g.ringY * Math.sin(rad(deg)) },
    hw,
    hh
  );
}

// Push `pos` away from any already-placed card it overlaps, using the
// minimum-translation axis, so no two cards ever cover each other. Each card
// can have a different measured size.
function resolveOverlap(
  pos: Pos,
  hw: number,
  hh: number,
  placed: { pos: Pos; hw: number; hh: number }[]
): Pos {
  let p = { ...pos };
  for (let iter = 0; iter < 6; iter++) {
    let moved = false;
    for (const other of placed) {
      const dx = p.x - other.pos.x;
      const dy = p.y - other.pos.y;
      const overlapX = hw + other.hw - Math.abs(dx);
      const overlapY = hh + other.hh - Math.abs(dy);
      if (overlapX > 0 && overlapY > 0) {
        moved = true;
        if (overlapX < overlapY) {
          p.x += overlapX * (dx < 0 ? -1 : 1);
        } else {
          p.y += overlapY * (dy < 0 ? -1 : 1);
        }
      }
    }
    p = clampToStage(p, hw, hh);
    if (!moved) break;
  }
  return p;
}

// Where a card's connector line meets the character — a point on the inner
// ring in the direction of the card, so lines float around the outline.
function anchorFor(p: Pos, g: Geom): Pos {
  const a = Math.atan2(p.y - g.cy, p.x - g.cx);
  return { x: g.cx + g.anchorX * Math.cos(a), y: g.cy + g.anchorY * Math.sin(a) };
}

// Best practice: a leader line should stop at the label's bounding-box edge
// nearest the target, not run into/behind it.
function cardEdge(p: Pos, a: Pos, hw: number, hh: number): Pos {
  const dx = a.x - p.x;
  const dy = a.y - p.y;
  const tx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty, 1);
  return { x: p.x + dx * t, y: p.y + dy * t };
}

interface Props {
  profile: Profile;
  setPosition: (key: string, pos: Pos) => void;
  clearPosition?: (key: string) => void;
  onEditCard: (card: HudCardSpec) => void;
  interactive?: boolean;
}

export function ProfileHud({
  profile,
  setPosition,
  clearPosition,
  onEditCard,
  interactive = true,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [dropVer, setDropVer] = useState<Record<string, number>>({});
  const [showHint, setShowHint] = useState(true);
  const [mobile, setMobile] = useState(false);
  const { registerCard, sizeOf } = useCardSizes(stageRef);

  // Phones get the tighter geometry + smaller cards; drag is disabled there so
  // it never fights vertical scrolling.
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const geom = mobile ? MOBILE_GEOM : DESKTOP_GEOM;
  const canDrag = interactive && !mobile;

  const visible = getHudCards(profile);

  // Compute final, collision-free positions for every visible card in one
  // pass: manual placements win, auto slots fill the rest, and any resulting
  // overlap gets nudged apart using each card's *measured* size.
  const resolved: { pos: Pos; hw: number; hh: number }[] = [];
  visible.forEach((card, i) => {
    const { hw, hh } = sizeOf(card.key);
    const raw = profile.positions[card.key] ?? arcSlot(i, visible.length, hw, hh, geom);
    resolved.push({ pos: resolveOverlap(raw, hw, hh, resolved), hw, hh });
  });
  const posOf = (i: number): Pos => resolved[i].pos;

  const onDragEnd = (key: string, i: number, info: PanInfo) => {
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return;
    const x = ((info.point.x - stage.left) / stage.width) * 100;
    const y = ((info.point.y - stage.top) / stage.height) * 100;
    const { hw, hh } = resolved[i];
    const others = resolved.filter((_, j) => j !== i);
    const final = resolveOverlap(clampToStage({ x, y }, hw, hh), hw, hh, others);
    setPosition(key, final);
    setDropVer((v) => ({ ...v, [key]: (v[key] ?? 0) + 1 }));
  };

  // Keyboard control: arrows nudge, Enter/Space edits.
  const onCardKey = (card: HudCardSpec, i: number, e: KeyboardEvent) => {
    if (!interactive) return;
    const p = posOf(i);
    const { hw, hh } = resolved[i];
    const step = 2;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      const others = resolved.filter((_, j) => j !== i);
      setPosition(
        card.key,
        resolveOverlap(clampToStage({ x: p.x + dx, y: p.y + dy }, hw, hh), hw, hh, others)
      );
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEditCard(card);
    }
  };

  const cardWidth: CardView = profile.cardView;

  return (
    <div
      ref={stageRef}
      className="relative mx-auto h-[78vh] min-h-[520px] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-bg-elev/20 sm:h-[80vh] sm:min-h-[600px]"
    >
      <CosmicBackdrop />

      {/* watermark — premium removes the "thisisme" branding */}
      {profile.tier !== "premium" && (
        <span className="pointer-events-none absolute bottom-4 left-4 z-20 select-none text-sm font-extrabold tracking-tight text-fg/70">
          this<span className="text-accent">is</span>me
        </span>
      )}

      {/* subtle hint — sits below the figure */}
      <AnimatePresence>
        {interactive && showHint && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            onClick={() => setShowHint(false)}
            className="glass absolute bottom-5 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs text-fg-muted transition hover:text-fg"
          >
            {canDrag ? "Drag to rearrange · tap to edit · double-click to reset" : "Tap a card to edit"}
          </motion.button>
        )}
      </AnimatePresence>

      {/* central figure */}
      <div className="absolute inset-0 z-10">
        <Silhouette photoUrl={profile.data.photoDataUrl} />
      </div>

      {/* connector lines — anchored around the character's outline */}
      <svg
        className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {visible.map((card, i) => {
          const p = posOf(i);
          const a = anchorFor(p, geom);
          const e = cardEdge(p, a, resolved[i].hw, resolved[i].hh);
          return (
            <g key={card.key}>
              <line
                x1={a.x}
                y1={a.y}
                x2={e.x}
                y2={e.y}
                stroke="var(--accent)"
                strokeWidth="0.14"
                strokeOpacity="0.35"
              />
              <circle cx={a.x} cy={a.y} r="0.5" fill="var(--accent)" fillOpacity="0.6" />
            </g>
          );
        })}
      </svg>

      {/* draggable cards */}
      <AnimatePresence>
        {visible.map((card, i) => {
          const p = posOf(i);
          return (
            <motion.div
              key={`${card.key}:${dropVer[card.key] ?? 0}`}
              ref={registerCard(card.key)}
              drag={canDrag}
              dragMomentum={false}
              dragElastic={0}
              onDragEnd={(_, info) => onDragEnd(card.key, i, info)}
              onDoubleClick={
                canDrag && clearPosition ? () => clearPosition(card.key) : undefined
              }
              tabIndex={interactive ? 0 : -1}
              role={interactive ? "button" : undefined}
              aria-label={
                interactive
                  ? `${card.title} card. Arrow keys move it, Enter edits, double-click to reset its position.`
                  : undefined
              }
              onKeyDown={(e) => onCardKey(card, i, e)}
              className={`group absolute z-20 -translate-x-1/2 -translate-y-1/2 touch-none transition-[left,top] duration-500 ease-out ${
                mobile ? "w-36" : cardWidth === "detailed" ? "w-48" : "w-60"
              } ${canDrag ? "cursor-grab active:cursor-grabbing" : ""}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              whileHover={interactive ? { zIndex: 40 } : undefined}
              whileDrag={{ scale: 1.05, zIndex: 50 }}
            >
              <CategoryCard
                title={card.title}
                emoji={card.emoji}
                rows={card.rows}
                draggable={interactive}
                onEdit={interactive ? () => onEditCard(card) : undefined}
                showLabels={cardWidth === "grouped"}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
