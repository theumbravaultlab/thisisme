"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, PanInfo } from "motion/react";
import { CATEGORIES, Pos, Profile } from "@/lib/types";
import { CategoryCard } from "./CategoryCard";
import { Silhouette } from "./Silhouette";
import { CosmicBackdrop } from "./CosmicBackdrop";

// "photo" and "name" are handled outside the category cards (avatar + title),
// so the Basics category only shows its remaining fields (age, birthday,
// height, favorite color) when it floats as a card.
const HUD_CATEGORIES = CATEGORIES.map((c) => ({
  ...c,
  fields: c.fields.filter((f) => f !== "photo" && f !== "name"),
})).filter((c) => c.fields.length > 0);

// Character center + rings, all in stage %.
const C: Pos = { x: 50, y: 42 };
const RING_X = 40;
const RING_Y = 36;
const ANCHOR_X = 23; // inner ring — where lines meet the character outline
const ANCHOR_Y = 32;

// Card half-size in stage % — used both for leader-line edges and collision
// avoidance so cards never land on top of each other.
const CARD_HW = 13;
const CARD_HH = 11;

const rad = (deg: number) => (deg * Math.PI) / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function clampToStage(p: Pos): Pos {
  return { x: clamp(p.x, CARD_HW - 2, 100 - CARD_HW + 2), y: clamp(p.y, CARD_HH - 2, 100 - CARD_HH + 2) };
}

// Default slot: an even arc around the character, leaving a gap at the bottom.
function arcSlot(index: number, count: number): Pos {
  const startDeg = 125;
  const sweep = 290; // wraps left → top → right, skipping straight-down
  const deg = count <= 1 ? 270 : startDeg + (sweep * index) / (count - 1);
  return clampToStage({
    x: C.x + RING_X * Math.cos(rad(deg)),
    y: C.y + RING_Y * Math.sin(rad(deg)),
  });
}

// Push `pos` away from any already-placed card it overlaps, using the
// minimum-translation axis, so no two cards ever cover each other.
function resolveOverlap(pos: Pos, placed: Pos[]): Pos {
  let p = { ...pos };
  for (let iter = 0; iter < 6; iter++) {
    let moved = false;
    for (const other of placed) {
      const dx = p.x - other.x;
      const dy = p.y - other.y;
      const overlapX = CARD_HW * 2 - Math.abs(dx);
      const overlapY = CARD_HH * 2 - Math.abs(dy);
      if (overlapX > 0 && overlapY > 0) {
        moved = true;
        if (overlapX < overlapY) {
          p.x += overlapX * (dx < 0 ? -1 : 1);
        } else {
          p.y += overlapY * (dy < 0 ? -1 : 1);
        }
      }
    }
    p = clampToStage(p);
    if (!moved) break;
  }
  return p;
}

// Where a card's connector line meets the character — a point on the inner
// ring in the direction of the card, so lines float around the outline.
function anchorFor(p: Pos): Pos {
  const a = Math.atan2(p.y - C.y, p.x - C.x);
  return { x: C.x + ANCHOR_X * Math.cos(a), y: C.y + ANCHOR_Y * Math.sin(a) };
}

// Best practice: a leader line should stop at the label's bounding-box edge
// nearest the target, not run into/behind it.
function cardEdge(p: Pos, a: Pos): Pos {
  const dx = a.x - p.x;
  const dy = a.y - p.y;
  const tx = dx !== 0 ? CARD_HW / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? CARD_HH / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty, 1);
  return { x: p.x + dx * t, y: p.y + dy * t };
}

interface Props {
  profile: Profile;
  setPosition: (key: string, pos: Pos) => void;
  onEditCategory: (title: string) => void;
  interactive?: boolean;
}

export function ProfileHud({
  profile,
  setPosition,
  onEditCategory,
  interactive = true,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [dropVer, setDropVer] = useState<Record<string, number>>({});
  const [showHint, setShowHint] = useState(true);

  const visible = HUD_CATEGORIES.filter((c) => c.fields.some((f) => profile.visibility[f]));

  // Compute final, collision-free positions for every visible category card
  // in one pass: manual placements win, auto slots fill the rest, and any
  // resulting overlap gets nudged apart.
  const resolved: Pos[] = [];
  visible.forEach((cat, i) => {
    const raw = profile.positions[cat.title] ?? arcSlot(i, visible.length);
    resolved.push(resolveOverlap(raw, resolved));
  });
  const posOf = (i: number): Pos => resolved[i];

  const onDragEnd = (title: string, i: number, info: PanInfo) => {
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return;
    const x = ((info.point.x - stage.left) / stage.width) * 100;
    const y = ((info.point.y - stage.top) / stage.height) * 100;
    const others = resolved.filter((_, j) => j !== i);
    const final = resolveOverlap(clampToStage({ x, y }), others);
    setPosition(title, final);
    setDropVer((v) => ({ ...v, [title]: (v[title] ?? 0) + 1 }));
  };

  // Keyboard control: arrows nudge, Enter/Space edits.
  const onCardKey = (title: string, i: number, e: KeyboardEvent) => {
    if (!interactive) return;
    const p = posOf(i);
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
      setPosition(title, resolveOverlap(clampToStage({ x: p.x + dx, y: p.y + dy }), others));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEditCategory(title);
    }
  };

  return (
    <div
      ref={stageRef}
      className="relative mx-auto h-[80vh] min-h-[600px] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-bg-elev/20"
    >
      <CosmicBackdrop />

      {/* subtle hint — sits below the figure */}
      <AnimatePresence>
        {interactive && showHint && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            onClick={() => setShowHint(false)}
            className="glass absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full px-3.5 py-1.5 text-xs text-fg-muted transition hover:text-fg"
          >
            Drag to rearrange · tap a card to edit
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
        {visible.map((cat, i) => {
          const p = posOf(i);
          const a = anchorFor(p);
          const e = cardEdge(p, a);
          return (
            <g key={cat.title}>
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

      {/* draggable category cards */}
      <AnimatePresence>
        {visible.map((cat, i) => {
          const p = posOf(i);
          return (
            <motion.div
              key={`${cat.title}:${dropVer[cat.title] ?? 0}`}
              drag={interactive}
              dragMomentum={false}
              dragElastic={0}
              onDragEnd={(_, info) => onDragEnd(cat.title, i, info)}
              tabIndex={interactive ? 0 : -1}
              role={interactive ? "button" : undefined}
              aria-label={
                interactive
                  ? `${cat.title} card. Arrow keys move it, Enter edits.`
                  : undefined
              }
              onKeyDown={(e) => onCardKey(cat.title, i, e)}
              className={`group absolute z-20 w-56 -translate-x-1/2 -translate-y-1/2 touch-none transition-[left,top] duration-500 ease-out ${
                interactive ? "cursor-grab active:cursor-grabbing" : ""
              }`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              whileHover={interactive ? { zIndex: 40 } : undefined}
              whileDrag={{ scale: 1.05, zIndex: 50 }}
            >
              <CategoryCard
                title={cat.title}
                emoji={cat.emoji}
                fields={cat.fields}
                profile={profile}
                onEdit={interactive ? () => onEditCategory(cat.title) : undefined}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
