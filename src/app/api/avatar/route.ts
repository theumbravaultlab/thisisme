import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { paleTint } from "@/lib/color";

// Generates an AI avatar from the user's photo in two model steps:
//   1. Background removal (fal.ai BiRefNet, "Portrait" mode) — isolates the
//      person from whatever's behind them.
//   2. The cutout is composited onto a clean solid backdrop (a pale tint of
//      the user's favorite color) so the next model sees a simple, uncluttered
//      scene instead of transparency it doesn't understand.
//   3. Image-to-image stylization (fal.ai FLUX.1 [dev]) turns that into a
//      cartoon-leaning portrait while keeping the person recognizable.
// If FAL_KEY isn't set, or any step fails, we fail soft to { demo: true } and
// the client applies a free local stylizer instead — the feature always works.

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function toDataUrl(res: Response, fallbackType: string): Promise<string> {
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || fallbackType;
  return `data:${contentType};base64,${buf.toString("base64")}`;
}

// Step 1: cut the person out from their background. Returns a transparent PNG.
async function removeBackground(key: string, imageDataUrl: string): Promise<string> {
  const res = await fetchWithTimeout(
    "https://fal.run/fal-ai/birefnet",
    {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageDataUrl,
        model: "Portrait",
        output_format: "png",
      }),
    },
    20_000
  );
  if (!res.ok) throw new Error(`Background removal error ${res.status}`);
  const json = await res.json();
  const url = json?.image?.url;
  if (!url) throw new Error("No cutout in response");
  const imgRes = await fetchWithTimeout(url, {}, 15_000);
  return toDataUrl(imgRes, "image/png");
}

// Step 2: flatten the transparent cutout onto a clean, simple backdrop so the
// stylization model has an uncluttered scene to work with, and keeps the
// person as the unambiguous focal point.
async function compositeOnBackdrop(cutoutDataUrl: string, favoriteColor: string): Promise<string> {
  const base64 = cutoutDataUrl.split(",")[1];
  const cutoutBuf = Buffer.from(base64, "base64");
  const { width = 1024, height = 1024 } = await sharp(cutoutBuf).metadata();

  const backdrop = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: paleTint(favoriteColor),
    },
  })
    .png()
    .toBuffer();

  const composited = await sharp(backdrop)
    .composite([{ input: cutoutBuf }])
    .jpeg({ quality: 92 })
    .toBuffer();

  return `data:image/jpeg;base64,${composited.toString("base64")}`;
}

// Step 3: stylize the composited portrait.
async function stylize(
  key: string,
  imageDataUrl: string,
  prompt: string,
  strength: number
): Promise<string> {
  const res = await fetchWithTimeout(
    "https://fal.run/fal-ai/flux/dev/image-to-image",
    {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageDataUrl,
        prompt,
        strength,
        // Higher than the model default (3.5) so the cartoon-stylization
        // wording actually takes hold instead of staying near-photographic.
        guidance_scale: 7.5,
        num_inference_steps: 32,
        output_format: "jpeg",
      }),
    },
    25_000
  );
  if (!res.ok) throw new Error(`Model error ${res.status}`);
  const json = await res.json();
  const url = json?.images?.[0]?.url;
  if (!url) throw new Error("No image in response");
  const imgRes = await fetchWithTimeout(url, {}, 15_000);
  return toDataUrl(imgRes, "image/jpeg");
}

export async function POST(req: NextRequest) {
  const { image, prompt, strength, color, removeBg } = (await req.json()) as {
    image?: string;
    prompt?: string;
    strength?: number;
    color?: string;
    removeBg?: boolean;
  };

  if (!image) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const key = process.env.FAL_KEY;
  if (!key) {
    // Free demo path — client stylizes locally.
    return NextResponse.json({ demo: true });
  }

  try {
    const finalPrompt =
      prompt?.trim() ||
      "portrait of the same person, keep their likeness, high quality, clean simple background";
    const s = Math.min(0.95, Math.max(0.15, strength ?? 0.5));
    const accentColor = color || "#7c5cff";

    // Isolate the subject and put them on a clean backdrop before stylizing,
    // unless the caller opted out (removeBg === false).
    let sourceForStylize = image;
    if (removeBg !== false) {
      try {
        const cutout = await removeBackground(key, image);
        sourceForStylize = await compositeOnBackdrop(cutout, accentColor);
      } catch {
        // If background removal fails for any reason, still stylize the
        // original photo rather than giving up entirely.
        sourceForStylize = image;
      }
    }

    const finalImage = await stylize(key, sourceForStylize, finalPrompt, s);
    return NextResponse.json({ image: finalImage });
  } catch (e) {
    // Fail soft to the free demo path rather than erroring the user.
    return NextResponse.json({ demo: true, note: String(e) });
  }
}
