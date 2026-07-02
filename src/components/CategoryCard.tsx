"use client";

import { contrastText } from "@/lib/color";
import type { ResolvedRow } from "@/lib/hudCards";

interface Props {
  title: string;
  emoji: string;
  rows: ResolvedRow[];
  onEdit?: () => void;
  draggable?: boolean;
}

// Presentational floating card. Rows are pre-resolved (label/emoji/text) by
// hudCards, so this component doesn't need to know about built-in vs custom.
export function CategoryCard({ title, emoji, rows, onEdit, draggable }: Props) {
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
        {draggable && (
          <span aria-hidden title="Drag to move" className="-ml-0.5 select-none text-fg-muted/50">
            ⠿
          </span>
        )}
        <span>{emoji}</span>
        {title}
      </p>

      {rows.length === 0 ? (
        <p className="text-xs text-fg-muted">Nothing added yet</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((row) =>
            row.isColor ? (
              <div key={row.key} className="flex min-w-0 items-center gap-2">
                <span
                  className="h-5 w-5 shrink-0 rounded-full ring-1 ring-fg/20"
                  style={{ background: row.text, color: contrastText(row.text) }}
                />
                <span className="min-w-0 whitespace-normal break-words text-sm font-medium">
                  {row.text}
                </span>
              </div>
            ) : (
              <div key={row.key} className="flex min-w-0 items-baseline gap-1.5">
                <span className="shrink-0 text-[11px] text-fg-muted">{row.emoji}</span>
                <span className="min-w-0 flex-1 whitespace-normal break-words text-sm font-medium">
                  {row.text}
                </span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
