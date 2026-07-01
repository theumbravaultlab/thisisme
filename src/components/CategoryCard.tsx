"use client";

import { FIELD_META, FieldKey, Profile } from "@/lib/types";
import { fieldToText } from "@/lib/fieldDisplay";
import { contrastText } from "@/lib/color";

interface Props {
  title: string;
  emoji: string;
  fields: FieldKey[];
  profile: Profile;
  onEdit?: () => void;
}

// One floating glass card per Customize category, showing every visible
// field in that group as a compact row. Replaces the old one-card-per-stat
// layout so the board stays tidy no matter how many stats are toggled on.
export function CategoryCard({ title, emoji, fields, profile, onEdit }: Props) {
  const rows = fields.filter((f) => profile.visibility[f] && fieldToText(f, profile.data));

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
          {rows.map((field) => (
            <FieldRow key={field} field={field} value={fieldToText(field, profile.data)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRow({ field, value }: { field: FieldKey; value: string }) {
  if (field === "favoriteColor") {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] ring-1 ring-fg/20"
          style={{ background: value, color: contrastText(value) }}
        />
        <span className="min-w-0 whitespace-normal break-words text-sm font-medium">
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <span className="shrink-0 text-[11px] text-fg-muted">{FIELD_META[field].emoji}</span>
      <span className="min-w-0 flex-1 whitespace-normal break-words text-sm font-medium">
        {value}
      </span>
    </div>
  );
}
