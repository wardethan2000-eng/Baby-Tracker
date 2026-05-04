import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe, getOrCreateCustomerId, STRIPE_CONFIGURED } from "@/lib/stripe";

export async function POST() {
  if (!STRIPE_CONFIGURED) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "Payment configuration error" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const customerId = await getOrCreateCustomerId(session.user.id, session.user.email, session.user.name);

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?payment=success`,
      cancel_url: `${appUrl}/settings?payment=cancel`,
      metadata: { userId: session.user.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}