"use client";

import { fontVar } from "@/lib/types";

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "today";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Clean identity title with a user-selectable display font, plus an optional
// "Updated …" line so viewers know how recent the profile is.
export function NameTitle({
  name,
  font,
  updatedAt,
}: {
  name: string;
  font: string;
  updatedAt?: string;
}) {
  const updated = updatedAt ? formatUpdated(updatedAt) : "";
  return (
    <div className="mb-2 text-center sm:mb-4">
      <h1
        className="text-2xl font-semibold tracking-tight text-fg sm:text-4xl"
        style={{ fontFamily: fontVar(font) }}
      >
        {name || " "}
      </h1>
      {updated && <p className="mt-1 text-xs text-fg-muted">Updated {updated}</p>}
    </div>
  );
}
