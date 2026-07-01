"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, PanInfo } from "motion/react";
import { FIELD_ORDER, FieldKey, Pos, Profile } from "@/lib/types";
import { HudCard } from "./HudCard";
import { Silhouette } from "./Silhouette";
import { CosmicBackdrop } from "./CosmicBackdrop";

// "photo" feeds the central avatar and "name" is the title, so neither floats.
const ORBIT_FIELDS = FIELD_ORDER.filter((f) => f !== "photo" && f !== "name");

// Character center + rings, all in stage %.
const C: Pos = { x: 50, y: 42 };
const RING_X = 41; // outer ring where default card slots sit
const RING_Y = 38;
const ANCHOR_X = 23; // inner ring — where lines meet the character outline
const ANCHOR_Y = 32;

const rad = (deg: number) => (deg * Math.PI) / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Default slot: an even arc around the character, leaving a gap at the bottom.
function arcSlot(index: number, count: number): Pos {
  const startDeg = 125;
  const sweep = 290; // wraps left → top → right, skipping straight-down
  const deg = count <= 1 ? 270 : startDeg + (sweep * index) / (count - 1);
  return {
    x: clamp(C.x + RING_X * Math.cos(rad(deg)), 8, 92),
    y: clamp(C.y + RING_Y * Math.sin(rad(deg)), 8, 90),
  };
}

// Where a card's connector line meets the character — a point on the inner
// ring in the direction of the card, so lines float around the outline.
function anchorFor(p: Pos): Pos {
  const a = Math.atan2(p.y - C.y, p.x - C.x);
  return { x: C.x + ANCHOR_X * Math.cos(a), y: C.y + ANCHOR_Y * Math.sin(a) };
}

// Best practice: a leader line should stop at the label's bounding-box edge
// nearest the target, not run into/behind it. Approx card half-size in stage %.
const CARD_HW = 9.5;
const CARD_HH = 8;
function cardEdge(p: Pos, a: Pos): Pos {
  const dx = a.x - p.x;
  const dy = a.y - p.y;
  const tx = dx !== 0 ? CARD_HW / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? CARD_HH / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty, 1);
  return { x: p.x + dx * t, y: p.y + dy * t };
}

// On drop: snap onto the arc ring when the card lands near it, otherwise keep
// it free (rounded to a light 1% grid).
function snapDrop(x: number, y: number): Pos {
  const a = Math.atan2(y - C.y, x - C.x);
  const rx = C.x + RING_X * Math.cos(a);
  const ry = C.y + RING_Y * Math.sin(a);
  const near = Math.hypot(x - rx, y - ry) < 10;
  return near
    ? { x: rx, y: ry }
    : { x: clamp(Math.round(x), 5, 95), y: clamp(Math.round(y), 4, 92) };
}

interface Props {
  profile: Profile;
  setPosition: (key: FieldKey, pos: Pos) => void;
  onEditField: (key: FieldKey) => void;
  interactive?: boolean;
}

export function ProfileHud({
  profile,
  setPosition,
  onEditField,
  interactive = true,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [dropVer, setDropVer] = useState<Record<string, number>>({});
  const [showHint, setShowHint] = useState(true);

  const visible = ORBIT_FIELDS.filter((f) => profile.visibility[f]);
  const posOf = (field: FieldKey, i: number): Pos =>
    profile.positions[field] ?? arcSlot(i, visible.length);

  const onDragEnd = (field: FieldKey, info: PanInfo) => {
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return;
    const x = ((info.point.x - stage.left) / stage.width) * 100;
    const y = ((info.point.y - stage.top) / stage.height) * 100;
    setPosition(field, snapDrop(x, y));
    setDropVer((v) => ({ ...v, [field]: (v[field] ?? 0) + 1 }));
  };

  // Keyboard control: arrows nudge, Enter/Space edits.
  const onCardKey = (field: FieldKey, i: number, e: KeyboardEvent) => {
    if (!interactive) return;
    const p = posOf(field, i);
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
      setPosition(field, {
        x: clamp(p.x + dx, 5, 95),
        y: clamp(p.y + dy, 4, 92),
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEditField(field);
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
        {visible.map((field, i) => {
          const p = posOf(field, i);
          const a = anchorFor(p);
          const e = cardEdge(p, a); // stop the line at the card's near edge
          return (
            <g key={field}>
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

      {/* draggable glass stat cards */}
      <AnimatePresence>
        {visible.map((field, i) => {
          const p = posOf(field, i);
          return (
            <motion.div
              key={`${field}:${dropVer[field] ?? 0}`}
              drag={interactive}
              dragMomentum={false}
              dragElastic={0}
              onDragEnd={(_, info) => onDragEnd(field, info)}
              tabIndex={interactive ? 0 : -1}
              role={interactive ? "button" : undefined}
              aria-label={
                interactive
                  ? `${field} card. Arrow keys move it, Enter edits.`
                  : undefined
              }
              onKeyDown={(e) => onCardKey(field, i, e)}
              className={`group absolute z-20 w-52 -translate-x-1/2 -translate-y-1/2 touch-none transition-[left,top] duration-500 ease-out ${
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
              <HudCard
                field={field}
                profile={profile}
                onEdit={interactive ? () => onEditField(field) : undefined}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
