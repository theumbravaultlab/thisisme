import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import sharp from "sharp";
import { paleTint } from "@/lib/color";
import { rateLimit } from "@/lib/rateLimit";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AVATAR_GEN_LIMITS } from "@/lib/types";

// The stylize path chains several fal.ai calls (isolate → stylize → transparent
// cut-out). Give the function the full budget so it isn't cut off before the
// pipeline finishes. 60s is the Vercel Hobby ceiling; raise it on Pro if needed.
export const maxDuration = 60;

// ---- per-account generation metering ----------------------------------------
// Metering is MONTHLY: both free and premium get an allowance that resets each
// calendar month (see AVATAR_GEN_LIMITS). Only real stylized generations count;
// "Keep as is" is cheap and never metered.
interface UsageRow {
  month: string | null; // 'YYYY-MM' the count below is for
  month_gens: number;
}

const monthStr = () => new Date().toISOString().slice(0, 7); // YYYY-MM
const todayStr = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// Per-IP daily backstop for anonymous generations (catches localStorage resets).
const ANON_IP_DAILY = 5;

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// Atomic monthly claim via Postgres (a row lock serializes concurrent requests,
// closing the check-then-count race). "ok" = counted, "over" = cap reached,
// "fallback" = the RPC isn't available yet (migration not applied).
async function claimMonthlyGen(
  admin: SupabaseClient,
  userId: string,
  month: string,
  cap: number
): Promise<"ok" | "over" | "fallback"> {
  const { data, error } = await admin.rpc("claim_avatar_gen", {
    p_user_id: userId,
    p_month: month,
    p_cap: cap,
  });
  if (error) return "fallback";
  return data ? "ok" : "over";
}

// Hand a claimed generation back when the render ultimately fails.
async function releaseMonthlyGen(admin: SupabaseClient, userId: string, month: string): Promise<void> {
  await admin.rpc("release_avatar_gen", { p_user_id: userId, p_month: month });
}

// Shared-store burst limiter (fixed window). "ok" = under the limit, "over" =
// window full, "fallback" = RPC unavailable (use in-memory instead).
async function claimRate(
  admin: SupabaseClient,
  bucket: string,
  windowSecs: number,
  limit: number
): Promise<"ok" | "over" | "fallback"> {
  const { data, error } = await admin.rpc("claim_rate", {
    p_bucket: bucket,
    p_window_secs: windowSecs,
    p_limit: limit,
  });
  if (error) return "fallback";
  return data ? "ok" : "over";
}

// Atomic per-IP daily claim (shared across serverless instances).
async function claimIpGen(
  admin: SupabaseClient,
  ipHash: string,
  day: string,
  cap: number
): Promise<"ok" | "over" | "fallback"> {
  const { data, error } = await admin.rpc("claim_ip_gen", {
    p_ip_hash: ipHash,
    p_day: day,
    p_cap: cap,
  });
  if (error) return "fallback";
  return data ? "ok" : "over";
}

// Resolve the signed-in user (if any) from their Supabase access token. Anon
// requests just return null and fall back to the per-IP taste limit.
async function userFromRequest(req: NextRequest): Promise<string | null> {
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  try {
    const sb = createClient(url, anon, { auth: { persistSession: false } });
    const {
      data: { user },
    } = await sb.auth.getUser(token);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function readPremium(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("entitlements")
    .select("is_premium")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data?.is_premium);
}

async function readUsage(admin: SupabaseClient, userId: string): Promise<UsageRow | null> {
  const { data } = await admin
    .from("avatar_usage")
    .select("month, month_gens")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as UsageRow) ?? null;
}

// Record one successful, real (stylized) generation against this month's count.
async function recordGen(admin: SupabaseClient, userId: string, usage: UsageRow | null): Promise<void> {
  const month = monthStr();
  const monthGens = (usage?.month === month ? usage.month_gens : 0) + 1;
  await admin.from("avatar_usage").upsert(
    {
      user_id: userId,
      month,
      month_gens: monthGens,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

// Best-effort client IP. On Vercel/most proxies the client is the leftmost
// entry in x-forwarded-for; falls back to x-real-ip.
function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// ~11MB decoded. Guards against giant payloads inflating memory + model cost.
const MAX_IMAGE_CHARS = 15_000_000;

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
  strength: number,
  guidanceScale: number
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
        // Model default is 3.5. Higher values push harder toward the prompt
        // (needed for the cartoon look); lower values stay closer to a real
        // photo (needed for the beautify look).
        guidance_scale: guidanceScale,
        // 28 steps keeps quality high while trimming a few seconds off the
        // slowest step, reducing the chance of hitting the function timeout.
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
  const imgRes = await fetchWithTimeout(url, {}, 15_000);
  return toDataUrl(imgRes, "image/jpeg");
}

export async function POST(req: NextRequest) {
  const { image, prompt, strength, guidanceScale, color, removeBg, stylize: shouldStylize } = (await req.json()) as {
    image?: string;
    prompt?: string;
    strength?: number;
    guidanceScale?: number;
    color?: string;
    removeBg?: boolean;
    stylize?: boolean;
  };

  if (!image) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  if (image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json(
      { error: "That photo is too large — please use an image under ~10MB." },
      { status: 413 }
    );
  }

  // Throttle per IP so a runaway loop can't hammer the pipeline. Short burst
  // window; enforced in the database (shared across instances) with an
  // in-memory fallback when the RPC/service key isn't available.
  const ip = clientIp(req);
  const admin = getSupabaseAdmin();
  const burstBucket = `avatar:burst:${sha256(ip)}`;
  let burstOk: boolean;
  if (admin) {
    const r = await claimRate(admin, burstBucket, 5 * 60, 12);
    burstOk = r === "fallback" ? rateLimit(burstBucket, 12, 5 * 60_000).ok : r === "ok";
  } else {
    burstOk = rateLimit(burstBucket, 12, 5 * 60_000).ok;
  }
  if (!burstOk) {
    return NextResponse.json(
      { error: "You're generating avatars too quickly — please try again in a few minutes." },
      { status: 429 }
    );
  }

  const key = process.env.FAL_KEY;
  if (!key) {
    // No model key → free local demo path, nothing to meter.
    return NextResponse.json({ demo: true });
  }

  // ---- monthly generation limits (atomic + shared-store) ------------------
  // EVERY generation counts — even "Keep as is", which still makes a paid
  // fal.ai background-removal call. Signed-in users are metered per ACCOUNT with
  // a monthly allowance (free vs premium cap); anonymous users get a small
  // per-IP daily taste and are nudged to sign in. Claims are atomic in Postgres
  // so concurrent requests can't race past the cap, shared across instances.
  const userId = await userFromRequest(req);
  const month = monthStr();

  // Set when this request consumed a per-account credit that must be handed
  // back if the generation ultimately fails; and the legacy record-on-success
  // path used only when the atomic RPC isn't available yet.
  let onFailRefund: (() => Promise<void>) | null = null;
  let legacyUsage: UsageRow | null = null;
  let legacyRecord = false;

  const overMonthly = (isPremium: boolean) =>
    NextResponse.json(
      isPremium
        ? { error: "You've hit this month's generation limit — it resets next month.", reason: "monthly" }
        : {
            error: `You've used your ${AVATAR_GEN_LIMITS.freePerMonth} free avatars this month. Upgrade to Premium for more.`,
            reason: "upgrade",
          },
      { status: 402 }
    );
  const anonBlocked = () =>
    NextResponse.json(
      { error: "Sign in to keep generating avatars — it's free.", reason: "signin" },
      { status: 402 }
    );

  if (userId && admin) {
    const isPremium = await readPremium(admin, userId);
    const cap = isPremium ? AVATAR_GEN_LIMITS.premiumPerMonth : AVATAR_GEN_LIMITS.freePerMonth;
    const claim = await claimMonthlyGen(admin, userId, month, cap);
    if (claim === "over") return overMonthly(isPremium);
    if (claim === "ok") {
      onFailRefund = () => releaseMonthlyGen(admin, userId, month);
    } else {
      // Fallback (RPC not present yet): non-atomic check + record-on-success.
      legacyUsage = await readUsage(admin, userId);
      const used = legacyUsage?.month === month ? legacyUsage.month_gens : 0;
      if (used >= cap) return overMonthly(isPremium);
      legacyRecord = true;
    }
  } else if (admin) {
    // Anonymous with a configured backend: shared per-IP daily backstop.
    const claim = await claimIpGen(admin, sha256(ip), todayStr(), ANON_IP_DAILY);
    if (claim === "over") return anonBlocked();
    if (claim === "fallback") {
      const anon = rateLimit(`avatar:anon:${ip}`, ANON_IP_DAILY, 24 * 60 * 60_000);
      if (!anon.ok) return anonBlocked();
    }
  } else {
    // No backend configured (e.g. local without a service key): in-memory only.
    const anon = rateLimit(`avatar:anon:${ip}`, ANON_IP_DAILY, 24 * 60 * 60_000);
    if (!anon.ok) return anonBlocked();
  }

  // "Keep as is" — no AI restyle, just cut the person out of their background.
  // It's a paid background-removal call, so it's metered like any generation
  // (the credit was already claimed above; refund it if the call fails).
  if (shouldStylize === false) {
    try {
      const cutout = await removeBackground(key, image);
      if (legacyRecord && userId && admin) await recordGen(admin, userId, legacyUsage);
      return NextResponse.json({ image: cutout });
    } catch (e) {
      if (onFailRefund) await onFailRefund().catch(() => {});
      return NextResponse.json({ demo: true, note: String(e) });
    }
  }

  try {
    const finalPrompt =
      prompt?.trim() ||
      "portrait of the same person, keep their likeness, high quality, clean simple background";
    const s = Math.min(0.95, Math.max(0.15, strength ?? 0.5));
    const g = Math.min(15, Math.max(1, guidanceScale ?? 4.5));
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

    const stylized = await stylize(key, sourceForStylize, finalPrompt, s, g);

    // Remove the background from the FINAL stylized image so the avatar is a
    // transparent cut-out of just the person — the page background then shows
    // around them. (Skipped if the caller opted out of bg removal.)
    let finalImage = stylized;
    if (removeBg !== false) {
      try {
        finalImage = await removeBackground(key, stylized);
      } catch {
        finalImage = stylized; // keep the stylized (with-bg) result if this fails
      }
    }
    if (legacyRecord && userId && admin) await recordGen(admin, userId, legacyUsage);
    return NextResponse.json({ image: finalImage });
  } catch (e) {
    // The render failed after we claimed a credit — give it back so a failed
    // attempt doesn't count against the user, then fail soft to the demo path.
    if (onFailRefund) await onFailRefund().catch(() => {});
    return NextResponse.json({ demo: true, note: String(e) });
  }
}

// Current month's generation usage for the signed-in caller, so the client can
// gray out the Generate button before they even try. Anonymous callers get
// { signedIn: false } and the client uses its own local taste counter.
export async function GET(req: NextRequest) {
  const userId = await userFromRequest(req);
  const admin = getSupabaseAdmin();
  if (!userId || !admin) return NextResponse.json({ signedIn: false });

  const isPremium = await readPremium(admin, userId);
  const usage = await readUsage(admin, userId);
  const used = usage?.month === monthStr() ? usage.month_gens : 0;
  const limit = isPremium ? AVATAR_GEN_LIMITS.premiumPerMonth : AVATAR_GEN_LIMITS.freePerMonth;
  return NextResponse.json({
    signedIn: true,
    premium: isPremium,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  });
}
