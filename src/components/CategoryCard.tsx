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
}

// Presentational floating card. Rows are pre-resolved (label/emoji/text) by
// hudCards, so this component doesn't need to know about built-in vs custom.
export function CategoryCard({ title, emoji, rows, onEdit, draggable, showLabels }: Props) {
  return (
    <div className="glass relative w-full rounded-2xl p-3.5 text-left transition group-hover:-translate-y-0.5">
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

      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-fg">
        <span>{emoji}</span>
        {title}
      </p>

      {rows.length === 0 ? (
        <p className="text-xs text-fg-muted">Nothing added yet</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <div key={row.key} className="min-w-0">
              {showLabels && (
                <p className="mb-0.5 truncate text-[11px] text-fg-muted">
                  {row.emoji} {row.label}
                </p>
              )}
              {row.isColor ? (
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-5 w-5 shrink-0 rounded-full ring-1 ring-fg/20"
                    style={{ background: row.text, color: contrastText(row.text) }}
                  />
                  <span className="min-w-0 whitespace-normal break-words text-sm font-medium">
                    {row.text}
                  </span>
                </div>
              ) : (
                <span className="whitespace-normal break-words text-sm font-medium">
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
