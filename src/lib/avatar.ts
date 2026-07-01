"use client";

// Client-side "demo" stylizer. Runs entirely in the browser (canvas) so the
// feature works with zero cost / no API key. When a real image API is
// configured server-side, /api/avatar returns a model image instead and this
// is skipped. Not "true" AI — a stylized color-filter preview, not a cartoon
// render (that needs the real model).

export type AvatarStyle = "glow";

// The one and only avatar look: background removed, composited onto a clean
// backdrop, then turned into a clearly-cartoon (but still recognizable)
// portrait. `strength` is user-adjustable via the intensity slider.
export interface AvatarPreset {
  key: string;
  label: string;
  prompt: string;
  strength: number;
  stylizer: AvatarStyle;
}

export const DEFAULT_AVATAR_PRESET: AvatarPreset = {
  key: "cartoon",
  label: "Cartoon",
  prompt:
    "3D animated movie character, Pixar and DreamWorks animation style illustration, obviously NOT a photograph, cel-shaded cartoon rendering, flat simplified cartoon skin with no pores or photographic texture, bold clean outlines, glossy cartoon eyes noticeably enlarged, smooth toon shading, vibrant saturated colors, friendly cartoon expression, simple clean background — but with the same face shape, eye color, nose, mouth and hairstyle as the reference photo so it is instantly recognizable as that specific person turned into a cartoon character",
  strength: 0.75,
  stylizer: "glow",
};

function parse(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full || "7c5cff", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp255 = (n: number) => Math.max(0, Math.min(255, n));

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function stylizeImage(
  src: string,
  opts: { color: string; style: AvatarStyle }
): Promise<string> {
  void opts.style; // only "glow" exists today
  const img = await loadImage(src);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // center-crop cover
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

  const [ar, ag, ab] = parse(opts.color);
  const data = ctx.getImageData(0, 0, size, size);
  const p = data.data;

  const posterize = (v: number, levels: number) =>
    Math.round((v / 255) * (levels - 1)) / (levels - 1);

  for (let i = 0; i < p.length; i += 4) {
    const lum = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
    const t = posterize(lum, 6);
    p[i] = clamp255(mix(15, ar, t));
    p[i + 1] = clamp255(mix(15, ag, t));
    p[i + 2] = clamp255(mix(22, ab, t));
  }

  ctx.putImageData(data, 0, 0);

  // soft accent vignette for depth
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.75);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(${ar},${ag},${ab},0.28)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return canvas.toDataURL("image/jpeg", 0.9);
}
