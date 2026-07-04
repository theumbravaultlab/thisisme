"use client";

import { contrastText } from "@/lib/color";
import type { ResolvedRow } from "@/lib/hudCards";

interface Props {
  title: string;
  emoji: string;
  rows: ResolvedRow[];
  onEdit?: () => void;
  draggable?: boolean;
  // Grouped-view cards hold several different fields, so each row shows its
  // own label. Detailed-view cards are a single field whose label is already
  // the card header, so this stays off there to avoid repeating it.
  showLabels?: boolean;
  // Tighter type + padding so several cards fit around the avatar on a phone.
  compact?: boolean;
}

// Presentational floating card. Rows are pre-resolved (label/emoji/text) by
// hudCards, so this component doesn't need to know about built-in vs custom.
export function CategoryCard({ title, emoji, rows, onEdit, draggable, showLabels, compact }: Props) {
  return (
    <div
      className={`glass relative w-full rounded-2xl text-left transition group-hover:-translate-y-0.5 ${
        compact ? "p-2.5" : "p-3.5"
      }`}
    >
      {onEdit && (
        <button
          onPointerDownCapture={(e) => e.stopPropagation()}
          onClick={onEdit}
          className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-full text-fg-muted transition hover:bg-accent/15 hover:text-accent group-hover:flex"
          aria-label={`Edit ${title}`}
        >
          ✎
        </button>
      )}

      <p
        className={`flex items-center gap-1.5 font-semibold text-fg ${
          compact ? "mb-1.5 text-[11px]" : "mb-2 text-xs"
        }`}
      >
        <span>{emoji}</span>
        {title}
      </p>

      {rows.length === 0 ? (
        <p className="text-xs text-fg-muted">Nothing added yet</p>
      ) : (
        <div className={`flex flex-col ${compact ? "gap-1" : "gap-1.5"}`}>
          {rows.map((row) => (
            <div key={row.key} className="min-w-0">
              {showLabels && (
                <p className={`truncate text-fg-muted ${compact ? "text-[10px]" : "mb-0.5 text-[11px]"}`}>
                  {row.emoji} {row.label}
                </p>
              )}
              {row.isColor ? (
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`shrink-0 rounded-full ring-1 ring-fg/20 ${compact ? "h-4 w-4" : "h-5 w-5"}`}
                    style={{ background: row.text, color: contrastText(row.text) }}
                  />
                  <span
                    className={`min-w-0 whitespace-normal break-words font-medium ${
                      compact ? "text-xs" : "text-sm"
                    }`}
                  >
                    {row.text}
                  </span>
                </div>
              ) : (
                <span
                  className={`whitespace-normal break-words font-medium ${compact ? "text-xs" : "text-sm"}`}
                >
                  {row.text}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {draggable && (
        <div className="mt-2 flex justify-center" aria-hidden title="Drag to move">
          <span className="h-1 w-8 select-none rounded-full bg-fg-muted/40" />
        </div>
      )}
    </div>
  );
}
