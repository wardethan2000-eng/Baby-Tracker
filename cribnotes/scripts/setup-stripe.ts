#!/usr/bin/env npx ts-node
/**
 * One-time script to create the CribNotes product and price in Stripe.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npx ts-node scripts/setup-stripe.ts
 *
 * After running, add the printed price_id to your .env as STRIPE_PRICE_ID.
 */

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil" as any,
});

async function main() {
  const product = await stripe.products.create({
    name: "CribNotes Lifetime",
    description: "One-time payment for lifetime access to CribNotes — all tracking types, unlimited children, caregiver sharing, analytics, and data export.",
  });

  console.log(`Created product: ${product.id}`);

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 1500,
    currency: "usd",
    metadata: { type: "lifetime" },
  });

  console.log(`
============================================
  Stripe setup complete!

  Add this to your .env:
  STRIPE_PRICE_ID=${price.id}

  Product ID: ${product.id}
  Price ID:   ${price.id}
  Amount:     $15.00 USD (one-time)
============================================
  `);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});