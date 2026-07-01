"use client";

// Calm ambient backdrop for the figure stage — soft accent light blooms, no
// grid, planet, or monogram. Keeps the liquid-glass look clean and quiet.
export function CosmicBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute -left-10 bottom-6 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute -right-10 top-10 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
    </div>
  );
}
