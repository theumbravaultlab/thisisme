import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Lemon Squeezy calls this after a payment event. It verifies the HMAC
// signature against LEMONSQUEEZY_WEBHOOK_SECRET, then flips the user's
// entitlement using the service-role client (the only writer allowed by RLS).
//
// This is the security boundary for premium: a user only becomes premium via a
// real, signature-verified order event carrying their user_id.

interface LsWebhook {
  meta?: { event_name?: string; custom_data?: { user_id?: string } };
  data?: { id?: string | number; attributes?: { status?: string } };
}

function verify(raw: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  // Must read the RAW body for signature verification.
  const raw = await req.text();
  const signature = req.headers.get("x-signature") || "";
  if (!verify(raw, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let evt: LsWebhook;
  try {
    evt = JSON.parse(raw) as LsWebhook;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const eventName = evt.meta?.event_name;
  const userId = evt.meta?.custom_data?.user_id;
  const orderId = evt.data?.id != null ? String(evt.data.id) : null;

  // Nothing to do without a user_id (e.g. a test ping) — 200 so LS stops retrying.
  if (!userId) return NextResponse.json({ ok: true, note: "no user_id" });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "admin not configured" }, { status: 503 });

  // Grant on a completed order; revoke on refund. (One-time "lifetime" model.)
  const grant = eventName === "order_created";
  const revoke = eventName === "order_refunded";
  if (!grant && !revoke) return NextResponse.json({ ok: true, note: `ignored ${eventName}` });

  const { error } = await admin.from("entitlements").upsert(
    {
      user_id: userId,
      is_premium: grant,
      order_id: orderId,
      provider: "lemonsqueezy",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
