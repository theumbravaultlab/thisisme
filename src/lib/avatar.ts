"use client";

// Client-side "demo" stylizer. Runs entirely in the browser (canvas) so the
// feature works with zero cost / no API key. When a real image API is
// configured server-side, /api/avatar returns a model image instead and this
// is skipped. Not "true" AI — a color-filter preview, not a real render (that
// needs the actual model).

export type AvatarStyle = "glow" | "beauty";

// The Intensity control shows three stops — Low / Balanced / High — but the
// actual denoising strength behind each stop is per-style and hidden from the
// user. A "Balanced" cartoon transforms far more than a "Balanced" video-game
// render, so each style carries its own low/balanced/high numbers.
export type IntensityLevel = "low" | "balanced" | "high";
export const INTENSITY_ORDER: IntensityLevel[] = ["low", "balanced", "high"];
export const DEFAULT_INTENSITY: IntensityLevel = "balanced";
export type StrengthRange = Record<IntensityLevel, number>;

export interface AvatarPreset {
  key: string;
  label: string;
  // When false, this "style" skips the AI entirely and just cuts the person
  // out of their background (see "Keep as is"). Prompt / guidance / strengths
  // are then unused.
  stylize: boolean;
  prompt: string;
  guidanceScale: number;
  strengths: StrengthRange;
  stylizer: AvatarStyle;
}

// The stylizing prompts are written for FLUX.1 [dev] img2img: natural-language
// prose, no negatives (FLUX ignores them and can pull negated concepts in),
// lighting called out explicitly, and identity locked up front before the
// stylistic brief. No background/scene wording — the pipeline cuts the person
// out to a transparent PNG afterward, so any described backdrop is discarded.
export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    key: "cartoon",
    label: "Cartoon",
    // Biggest departure from the photo, so the whole range sits high and a firm
    // guidance makes the cartoon look actually land.
    stylize: true,
    prompt:
      "A fun, clearly cartoon 3D character version of the same specific person, in the polished style of a modern Pixar and Disney animated movie. Keep the exact same face shape, eye color and eye shape, eyebrows, nose, mouth and smile, their exact skin tone and apparent age, and their hairstyle, hair color and hair texture. Keep any glasses, facial hair, freckles, moles, dimples and other distinctive marks exactly as in the photo, so it clearly reads as them. An obviously stylized cartoon look with smooth subsurface-scattering skin, large expressive glossy eyes with bright catchlights, a warm friendly smile, and gently exaggerated cartoon proportions with clean rounded surfaces. Vibrant saturated colors, soft studio lighting with a bright key light and a gentle rim light, high-quality 3D character render full of personality. Playful, cheerful and fun.",
    guidanceScale: 5,
    strengths: { low: 0.5, balanced: 0.6, high: 0.72 },
    stylizer: "glow",
  },
  {
    key: "gamechar",
    label: "Video Game",
    // Semi-realistic "cool digital human" look. Leans toward likeness, so the
    // whole range sits low and guidance is gentler to stay believable.
    stylize: true,
    prompt:
      "A hyper-realistic 3D character render of the same specific person, in the style of a high-fidelity digital human or a next-generation video game cinematic close-up. Keep their exact face shape, eye color and eye shape, eyebrows, nose, mouth and smile, their exact skin tone and apparent age, and their hairstyle, hair color and hair texture. Keep any glasses, facial hair, freckles, moles, dimples and other distinctive marks exactly as in the photo, so it unmistakably reads as them. True-to-life realistic proportions and features, rendered with cinematic realism. Ultra-detailed rendered skin with realistic subsurface scattering, fine pores and natural texture, richly detailed individual hair strands, expressive lifelike eyes with subtle catchlights, sharp crisp focus. Soft cinematic studio lighting with a gentle key light and a rim light, premium true-to-life color grading, polished next-gen game-engine character render, cool, heroic and professional.",
    guidanceScale: 4,
    strengths: { low: 0.3, balanced: 0.4, high: 0.5 },
    stylizer: "beauty",
  },
  {
    key: "anime",
    label: "Anime",
    // Base FLUX.1 [dev] resists a full anime look, so the range sits highest to
    // break away from photorealism, with heavy positive drawn/2D wording (no
    // "not a photo" negatives, which FLUX would ignore).
    stylize: true,
    prompt:
      "A 2D anime and manga style illustration of the same specific person, redrawn as a hand-drawn anime character. Keep the same face shape, eye color, eyebrows, nose, mouth and smile, their skin tone and apparent age, and their hairstyle, hair color and hair texture. Keep any glasses, facial hair and other distinctive marks as in the photo, so it clearly reads as them. Clean bold anime linework, large expressive anime eyes with bright highlights, smooth cel-shaded coloring with soft anime shading, vibrant saturated colors, the crisp look of a modern anime key-visual, fully hand-drawn flat 2D artwork and illustration.",
    guidanceScale: 5,
    strengths: { low: 0.55, balanced: 0.65, high: 0.75 },
    stylizer: "glow",
  },
  {
    key: "asis",
    label: "Keep as is",
    // No AI restyle at all — the pipeline just removes the background and
    // returns a clean cut-out of the original photo. Prompt/guidance/strengths
    // below are unused (kept only to satisfy the shared shape).
    stylize: false,
    prompt: "",
    guidanceScale: 0,
    strengths: { low: 0, balanced: 0, high: 0 },
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

// Generated avatars (especially "Keep as is" cutouts, which inherit the
// uploaded photo's full resolution) can be several MB as a data URL. Every
// avatar added to the library is persisted into the localStorage profile
// blob (~5-10MB quota total), so shrink to a size that's still sharp for the
// small HUD avatar slot before it's ever stored. WebP keeps the transparent
// cut-out while compressing far smaller than PNG at the same resolution.
export async function shrinkDataUrl(
  dataUrl: string,
  maxDim = 768,
  quality = 0.85
): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/webp", quality);
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
