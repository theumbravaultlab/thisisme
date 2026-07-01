"use client";

// Client-side "demo" avatar stylizer. Runs entirely in the browser (canvas) so
// the feature works with zero cost / no API key. When a real image API is
// configured server-side, /api/avatar returns a model image instead and this
// is skipped. Not "true" AI — a stylized effect that reads the favorite color.

export type AvatarStyle = "duotone" | "neon" | "pop" | "mono" | "glow";

// Presets pair a starting AI prompt + strength with a local-stylizer fallback.
// `prompt` is fully editable in the UI; `strength` maps to the intensity slider.
export interface AvatarPreset {
  key: string;
  label: string;
  prompt: string;
  strength: number;
  stylizer: AvatarStyle;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    key: "enhanced",
    label: "Enhanced (same you)",
    prompt:
      "the same person, keep their likeness, soft flattering studio lighting, gentle shading, natural skin, subtle retouch, sharp, high-quality portrait",
    strength: 0.3,
    stylizer: "glow",
  },
  {
    key: "cinematic",
    label: "Cinematic",
    prompt:
      "cinematic portrait of the same person, dramatic rim lighting, moody soft shadows, film still, high detail",
    strength: 0.45,
    stylizer: "duotone",
  },
  {
    key: "3d",
    label: "3D Character",
    prompt:
      "3d stylized character portrait of the same person, pixar-like, soft global illumination, clean render",
    strength: 0.7,
    stylizer: "pop",
  },
  {
    key: "cyber",
    label: "Cyberpunk",
    prompt:
      "cyberpunk neon portrait of the same person, glowing accent lights, futuristic, high contrast",
    strength: 0.7,
    stylizer: "neon",
  },
  {
    key: "paint",
    label: "Painterly",
    prompt:
      "painterly digital portrait of the same person, soft brush strokes, artistic lighting",
    strength: 0.6,
    stylizer: "glow",
  },
  {
    key: "noir",
    label: "Noir",
    prompt:
      "black and white noir portrait of the same person, high-contrast lighting, classic film",
    strength: 0.5,
    stylizer: "mono",
  },
];

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

    let r = p[i], g = p[i + 1], b = p[i + 2];

    switch (opts.style) {
      case "duotone": {
        // dark → accent → white ramp
        const t = lum;
        const shadowMix = Math.min(t * 2, 1);
        r = mix(20, ar, shadowMix);
        g = mix(20, ag, shadowMix);
        b = mix(28, ab, shadowMix);
        if (t > 0.5) {
          r = mix(r, 255, (t - 0.5) * 2 * 0.8);
          g = mix(g, 255, (t - 0.5) * 2 * 0.8);
          b = mix(b, 255, (t - 0.5) * 2 * 0.8);
        }
        break;
      }
      case "neon": {
        const c = Math.pow(lum, 1.4); // crush shadows
        r = mix(8, ar, c) + (c > 0.7 ? 60 : 0);
        g = mix(8, ag, c) + (c > 0.7 ? 60 : 0);
        b = mix(14, ab, c) + (c > 0.7 ? 60 : 0);
        break;
      }
      case "pop": {
        r = posterize(r, 4) * 255;
        g = posterize(g, 4) * 255;
        b = posterize(b, 4) * 255;
        // tint mids toward accent
        r = mix(r, ar, 0.25);
        g = mix(g, ag, 0.25);
        b = mix(b, ab, 0.25);
        break;
      }
      case "glow": {
        const t = posterize(lum, 6);
        r = mix(15, ar, t);
        g = mix(15, ag, t);
        b = mix(22, ab, t);
        break;
      }
      case "mono": {
        const v = clamp255(Math.pow(lum, 0.9) * 255);
        r = g = b = v;
        break;
      }
    }
    p[i] = clamp255(r);
    p[i + 1] = clamp255(g);
    p[i + 2] = clamp255(b);
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
