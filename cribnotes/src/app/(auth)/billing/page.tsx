"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Moon, Check, Loader2 } from "lucide-react";
import { STRIPE_CONFIGURED } from "@/lib/stripe-client";

export default function BillingPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const trialEndsAt = session?.user?.trialEndsAt;
  const paidAt = session?.user?.paidAt;
  const isPaid = !!paidAt;
  const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to start checkout");
      }
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (isPaid) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <Check className="text-success" size={28} />
          </div>
          <h1 className="font-display text-2xl font-bold text-text-primary">You&apos;re all set!</h1>
          <p className="text-text-secondary">You have lifetime access to CribNotes. Enjoy!</p>
          <a href="/home" className="block text-primary font-medium">Go to dashboard &rarr;</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Moon className="text-primary" size={28} />
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">
            {daysLeft !== null && daysLeft > 0 ? "Free Trial Active" : "Trial Expired"}
          </h1>
          {daysLeft !== null && daysLeft > 0 && (
            <p className="text-text-secondary mt-1">{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining in your trial</p>
          )}
          {daysLeft !== null && daysLeft <= 0 && (
            <p className="text-text-secondary mt-1">Your 30-day free trial has ended</p>
          )}
        </div>

        <div className="bg-surface rounded-2xl border-2 border-primary p-6 space-y-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide">Lifetime Access</div>
          <div className="text-4xl font-display font-bold text-text-primary">$15</div>
          <div className="text-text-secondary text-sm">One-time payment &middot; No subscriptions</div>

          <ul className="text-left text-sm text-text-secondary space-y-2">
            <li className="flex items-start gap-2"><Check size={16} className="text-success shrink-0 mt-0.5" /> All tracking types — wake, sleep, feed, diaper, nurse, pump</li>
            <li className="flex items-start gap-2"><Check size={16} className="text-success shrink-0 mt-0.5" /> Unlimited children &amp; caregiver sharing</li>
            <li className="flex items-start gap-2"><Check size={16} className="text-success shrink-0 mt-0.5" /> Interactive analytics &amp; data export</li>
            <li className="flex items-start gap-2"><Check size={16} className="text-success shrink-0 mt-0.5" /> All future updates included</li>
          </ul>

          {STRIPE_CONFIGURED ? (
            <Button full onClick={handlePay} disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Pay $15 — Lifetime Access"}
            </Button>
          ) : (
            <p className="text-warning text-sm">Payments are not yet available. Please check back soon.</p>
          )}
        </div>

        <p className="text-xs text-text-muted">Secure payment via Stripe. Your data stays private.</p>
      </div>
    </div>
  );
}