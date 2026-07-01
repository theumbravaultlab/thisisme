// Tiny hex-color helpers for the favorite-color palette swatches.

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parse(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full || "7c5cff", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
}

// Mix toward white (amount>0) or black (amount<0).
function mix([r, g, b]: [number, number, number], amount: number) {
  const t = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  return toHex(r + (t - r) * a, g + (t - g) * a, b + (t - b) * a);
}

// A row of shades from light → dark, like the reference palette strip.
export function shades(hex: string): string[] {
  const rgb = parse(hex);
  return [0.45, 0.22, 0, -0.2, -0.42, -0.62].map((a) => mix(rgb, a));
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return toHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

// Clamp the favorite color's lightness/saturation into a band that stays
// legible as the UI accent (text, lines) against the current theme. The raw
// color is still used for swatches; this is only for accent usage.
export function readableAccent(hex: string, theme: "light" | "dark"): string {
  const hsl = rgbToHsl(parse(hex));
  const h = hsl[0];
  let s = hsl[1];
  let l = hsl[2];
  // Only boost saturation for colors that already have a hue — keep true
  // grayscale (black/white/gray) neutral instead of tinting it red.
  if (s > 0.12) s = Math.max(s, 0.45);
  if (theme === "dark") l = Math.min(Math.max(l, 0.58), 0.74);
  else l = Math.min(Math.max(l, 0.34), 0.5);
  return hslToHex(h, s, l);
}

// Returns black or white — whichever reads better on top of `hex`.
export function contrastText(hex: string): string {
  const [r, g, b] = parse(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? "#0b0b0b" : "#ffffff";
}
