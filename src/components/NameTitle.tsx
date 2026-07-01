"use client";

import { fontVar } from "@/lib/types";

// Clean identity title with a user-selectable display font.
export function NameTitle({ name, font }: { name: string; font: string }) {
  return (
    <div className="mb-4 text-center">
      <h1
        className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl"
        style={{ fontFamily: fontVar(font) }}
      >
        {name || " "}
      </h1>
    </div>
  );
}
