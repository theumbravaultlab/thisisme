"use client";

// Shown while the profile loads (esp. from the cloud) so we don't flash
// default content. Mirrors the stage: a centered figure with floating cards.
export function HudSkeleton() {
  const spots = [
    "left-[16%] top-[16%]", "left-[16%] top-[42%]", "left-[16%] top-[68%]",
    "right-[16%] top-[16%]", "right-[16%] top-[42%]", "right-[16%] top-[68%]",
  ];
  return (
    <div className="relative mx-auto h-[80vh] min-h-[600px] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-bg-elev/20">
      <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-accent/15" />
      {spots.map((s) => (
        <div
          key={s}
          className={`absolute w-52 -translate-y-1/2 ${s}`}
        >
          <div className="glass h-24 animate-pulse rounded-2xl" />
        </div>
      ))}
      <span className="sr-only">Loading your profile…</span>
    </div>
  );
}
