import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Creates a Lemon Squeezy hosted checkout for the signed-in user and returns
// its URL. The user's Supabase id is stamped into the checkout's custom data so
// the webhook (billing/webhook) knows whose account to upgrade after payment.
//
// Security note: the buyer is authenticated here from their Supabase access
// token, but the real entitlement gate is the webhook — you never become
// premium without a completed, signature-verified payment event.

interface CheckoutResponse {
  data?: { attributes?: { url?: string } };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!apiKey || !storeId || !variantId || !supaUrl || !anonKey) {
    return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });
  }

  // Authenticate the buyer from their Supabase access token.
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: "sign-in-required" }, { status: 401 });

  const supabase = createClient(supaUrl, anonKey, { auth: { persistSession: false } });
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "sign-in-required" }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: user.email,
            // Lemon Squeezy passes this straight through to the webhook as
            // meta.custom_data. Values must be strings.
            custom: { user_id: user.id },
          },
          product_options: {
            redirect_url: `${siteUrl}/?upgraded=1`,
            enabled_variants: [Number(variantId)],
          },
        },
        relationships: {
          store: { data: { type: "stores", id: String(storeId) } },
          variant: { data: { type: "variants", id: String(variantId) } },
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    return NextResponse.json({ error: "Could not start checkout.", detail }, { status: 502 });
  }

  const json = (await res.json()) as CheckoutResponse;
  const url = json?.data?.attributes?.url;
  if (!url) return NextResponse.json({ error: "No checkout URL returned." }, { status: 502 });

  return NextResponse.json({ url });
}
