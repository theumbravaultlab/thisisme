"use client";

// Client-side "demo" stylizer. Runs entirely in the browser (canvas) so the
// feature works with zero cost / no API key. When a real image API is
// configured server-side, /api/avatar returns a model image instead and this
// is skipped. Not "true" AI — a color-filter preview, not a real render (that
// needs the actual model).

export type AvatarStyle = "glow" | "beauty";

export interface AvatarPreset {
  key: string;
  label: string;
  prompt: string;
  guidanceScale: number;
  stylizer: AvatarStyle;
}

// The Intensity slider has three stops mapping to a denoising strength: how
// far the model is allowed to move from the original photo. Higher = more
// transformation (but identity can drift). Defaults to Balanced.
export type StrengthLevel = "low" | "balanced" | "high";
export const STRENGTH_LEVELS: Record<StrengthLevel, number> = {
  low: 0.25,
  balanced: 0.45,
  high: 0.62,
};
export const STRENGTH_ORDER: StrengthLevel[] = ["low", "balanced", "high"];
export const DEFAULT_LEVEL: StrengthLevel = "balanced";

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    key: "hyperreal",
    label: "Hyperrealistic",
    prompt:
      "hyperrealistic portrait of the same specific person, keep their exact facial features, eye color, nose, mouth, hairstyle and identity perfectly recognizable and unmistakably them. Ultra-detailed lifelike skin with fine pores and natural texture, razor-sharp focus, intricate realistic detail, true-to-life colors, professional studio lighting, high-resolution photograph shot on a high-end camera — a real photo of a real person, not a painting, drawing or illustration",
    guidanceScale: 4.5,
    stylizer: "beauty",
  },
  {
    key: "cinematic",
    label: "Cinematic",
    prompt:
      "cinematic film-still portrait of the same specific person, keep their exact facial features and identity clearly recognizable and unmistakably them. Dramatic moody lighting with soft rim light and gentle shadows, shallow depth of field with a blurred background, teal-and-orange color grade, filmic contrast and grain, movie-poster atmosphere, sharp high-end cinema camera look — a real photo of a real person, not a cartoon or illustration",
    guidanceScale: 5.5,
    stylizer: "beauty",
  },
  {
    key: "hdr",
    label: "HDR Realism",
    prompt:
      "HDR realism portrait of the same specific person, keep their exact facial features and identity clearly recognizable and unmistakably them. High dynamic range with bright balanced highlights and rich detailed shadows, crisp clarity, vivid lifelike colors, punchy contrast, ultra-clean and detailed professional photograph, tack-sharp focus — a real photo of a real person, not a painting or illustration",
    guidanceScale: 5,
    stylizer: "beauty",
  },
  {
    key: "photoreal",
    label: "Photorealism",
    prompt:
      "photorealistic portrait of the same specific person, keep their exact facial features, eye color, nose, mouth and identity clearly recognizable and unmistakably them. Natural true-to-life skin and lighting, neutral flattering studio setup, clean DSLR photograph quality, authentic realistic detail, sharp focus, believable and candid — a real photo of a real person, not a cartoon, painting or illustration",
    guidanceScale: 4,
    stylizer: "beauty",
  },
];

export const DEFAULT_AVATAR_PRESET = AVATAR_PRESETS[0];

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

    if (opts.style === "beauty") {
      // gentle brighten + soft contrast lift, no posterizing — a subtle
      // "touched up photo" feel rather than a cartoon filter.
      const lifted = clamp255(Math.pow(lum, 0.9) * 255 * 1.06);
      const t = lifted / 255;
      p[i] = clamp255(mix(p[i], mix(p[i], ar, 0.08), 1) * (1 + (t - lum) * 0.5));
      p[i + 1] = clamp255(mix(p[i + 1], mix(p[i + 1], ag, 0.08), 1) * (1 + (t - lum) * 0.5));
      p[i + 2] = clamp255(mix(p[i + 2], mix(p[i + 2], ab, 0.08), 1) * (1 + (t - lum) * 0.5));
    } else {
      const t = posterize(lum, 6);
      p[i] = clamp255(mix(15, ar, t));
      p[i + 1] = clamp255(mix(15, ag, t));
      p[i + 2] = clamp255(mix(22, ab, t));
    }
  }

  ctx.putImageData(data, 0, 0);

  // soft accent vignette for depth
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.75);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(${ar},${ag},${ab},${opts.style === "beauty" ? 0.12 : 0.28})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return canvas.toDataURL("image/jpeg", 0.9);
}
