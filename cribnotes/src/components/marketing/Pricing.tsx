import Link from "next/link";
import { Check, Infinity } from "lucide-react";

const bulletPoints = [
  "All tracking types — wake, sleep, feed, diaper, nurse, pump",
  "Unlimited children on the same account",
  "Unlimited caregiver sharing and invites",
  "Interactive analytics with 7 chart types",
  "Care notes with audience targeting and push notifications",
  "PWA install on any phone — works offline",
  "Data export to Excel — perfect for pediatrician visits",
  "All future updates included — no upsells ever",
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-elevated">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-text-primary">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-text-secondary text-lg max-w-xl mx-auto">
            One payment. Lifetime access. No monthly fees, no tiers, no tricks.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-surface rounded-3xl border-2 border-primary p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-white text-xs font-semibold px-4 py-1 rounded-bl-2xl">
              Lifetime Deal
            </div>

            <Infinity className="text-primary mx-auto mb-4" size={32} />

            <div className="mb-6">
              <span className="text-5xl font-display font-bold text-text-primary">$15</span>
              <span className="text-text-muted text-lg ml-1">one-time</span>
            </div>

            <h3 className="font-display text-xl font-bold text-text-primary mb-2">
              Lifetime Access
            </h3>
            <p className="text-text-secondary mb-8">
              Pay once and use CribNotes forever. Includes a full 30-day free trial — no credit card
              required. Cancel anytime during the trial with zero charges.
            </p>

            <ul className="text-left space-y-3 mb-8">
              {bulletPoints.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="text-success shrink-0 mt-0.5" size={18} />
                  <span className="text-sm text-text-primary">{item}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-3">
              <Link
                href="/signup"
                className="block w-full py-3.5 text-base font-semibold bg-primary text-white rounded-full hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
              >
                Start 30-Day Free Trial
              </Link>
              <Link
                href="/signup"
                className="block w-full py-3.5 text-base font-medium text-primary border border-primary rounded-full hover:bg-primary/5 transition-colors"
              >
                Get Lifetime Access — $15
              </Link>
            </div>

            <p className="mt-6 text-xs text-text-muted">
              No monthly fees. No subscriptions. One payment, forever.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
