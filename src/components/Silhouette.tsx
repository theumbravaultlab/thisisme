"use client";

import Image from "next/image";

// Central figure: a large head-and-shoulders mannequin bust, centered and
// gently floating. The AI avatar (Phase 2) fills the head.
export function Silhouette({ photoUrl }: { photoUrl: string | null }) {
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
            <clipPath id="headClip">
              <circle cx="100" cy="62" r="48" />
            </clipPath>
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

          {/* avatar photo into the head, if present */}
          {photoUrl && (
            <foreignObject x="52" y="14" width="96" height="96" clipPath="url(#headClip)">
              <div className="relative h-full w-full">
                <Image src={photoUrl} alt="avatar" fill sizes="96px" className="object-cover" unoptimized />
              </div>
            </foreignObject>
          )}
        </svg>
      </div>
    </div>
  );
}
