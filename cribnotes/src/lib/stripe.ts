import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export const STRIPE_CONFIGURED = !!process.env.STRIPE_SECRET_KEY;

export const TRIAL_DAYS = 30;

export async function getOrCreateCustomerId(userId: string, email: string, name?: string | null): Promise<string> {
  const { prisma } = await import("./prisma");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}