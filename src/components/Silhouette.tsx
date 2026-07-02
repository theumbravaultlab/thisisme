"use client";

import Image from "next/image";

// Central figure. Once the user has a photo/AI avatar, it fully replaces the
// placeholder — shown large and centered, whatever its natural crop (shoulders
// up, full body, etc.) — no wireframe body underneath. Before that, a gentle
// wireframe mannequin stands in as the placeholder.
export function Silhouette({ photoUrl }: { photoUrl: string | null }) {
  if (photoUrl) {
    // Transparent cut-out avatar — shown frameless so the page background
    // surrounds the person. A soft ground glow grounds it; a drop-shadow on
    // the (transparent) PNG gives depth without a rectangular frame.
    return (
      <div className="relative h-full w-full">
        <div className="absolute bottom-[10%] left-1/2 h-36 w-80 -translate-x-1/2 rounded-[100%] bg-accent/20 blur-3xl" />
        <div className="animate-float absolute inset-0 flex items-center justify-center">
          <div
            className="relative h-[94%] w-auto aspect-square"
            style={{ filter: "drop-shadow(0 18px 34px rgba(0,0,0,0.35))" }}
          >
            <Image
              src={photoUrl}
              alt="Your avatar"
              fill
              sizes="480px"
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* soft base glow behind the bust */}
      <div className="absolute bottom-[12%] left-1/2 h-40 w-96 -translate-x-1/2 rounded-[100%] bg-accent/25 blur-3xl" />

      <div className="animate-float absolute inset-0">
        <svg
          viewBox="0 0 200 230"
          preserveAspectRatio="xMidYMid meet"
          className="absolute left-1/2 top-1/2 h-[82%] -translate-x-1/2 -translate-y-1/2"
        >
          <defs>
            <linearGradient id="bust" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.42" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* shoulders + neck */}
          <path
            d="M84 112 L84 138 C54 144 26 168 20 208 L18 230 L182 230 L180 208 C174 168 146 144 116 138 L116 112 Z"
            fill="url(#bust)"
            stroke="var(--accent)"
            strokeWidth="1.2"
            strokeOpacity="0.5"
            strokeLinejoin="round"
          />
          {/* head */}
          <circle
            cx="100"
            cy="62"
            r="52"
            fill="url(#bust)"
            stroke="var(--accent)"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />
        </svg>
      </div>
    </div>
  );
}
