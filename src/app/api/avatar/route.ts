import { NextRequest, NextResponse } from "next/server";

// Generates an AI avatar from the user's photo.
// - If an image API key is configured, calls the model and returns its image.
// - Otherwise responds { demo: true } and the client applies a free local
//   stylizer, so the feature works end-to-end at zero cost during development.
//
// To enable real generation, set FAL_KEY in .env.local (fal.ai) and flesh out
// the call below for your chosen model.

// Cap how long we'll wait on the model + the follow-up image fetch, so a slow
// or hung upstream call fails over to the local stylizer promptly instead of
// leaving the request open indefinitely.
async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req: NextRequest) {
  const { image, prompt, strength, color } = (await req.json()) as {
    image?: string;
    prompt?: string;
    strength?: number;
    color?: string;
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
      (prompt?.trim() || "portrait of the same person, high quality") +
      (color ? `, subtle ${color} accent tones` : "");
    // clamp strength to a sane range
    const s = Math.min(0.95, Math.max(0.15, strength ?? 0.5));

    // fal.ai FLUX.1 [dev] image-to-image (synchronous). image_url accepts a
    // base64 data URI. Fewer steps = faster + cheaper.
    const res = await fetchWithTimeout(
      "https://fal.run/fal-ai/flux/dev/image-to-image",
      {
        method: "POST",
        headers: {
          Authorization: `Key ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: image,
          prompt: finalPrompt,
          strength: s,
          num_inference_steps: 28,
          output_format: "jpeg",
        }),
      },
      25_000
    );

    if (!res.ok) throw new Error(`Model error ${res.status}`);
    const json = await res.json();
    const url = json?.images?.[0]?.url;
    if (!url) throw new Error("No image in response");

    // Inline the image as a data URL so the avatar persists even if fal's
    // hosted URL later expires.
    const imgRes = await fetchWithTimeout(url, {}, 15_000);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const dataUrl = `data:${contentType};base64,${buf.toString("base64")}`;
    return NextResponse.json({ image: dataUrl });
  } catch (e) {
    // Fail soft to the free demo path rather than erroring the user.
    return NextResponse.json({ demo: true, note: String(e) });
  }
}
