import Link from "next/link";
import { DeviceMockup } from "./DeviceMockup";

export function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-4 pt-20 pb-24 md:pt-28 md:pb-32">
      <div className="grid md:grid-cols-2 gap-12 md:gap-8 items-center">
        <div className="text-center md:text-left">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary leading-tight">
            The Sleep Log
            <br />
            <span className="text-primary">You&apos;ll Actually Use</span>
            <br />
            at 3 AM
          </h1>
          <p className="mt-6 text-lg text-text-secondary max-w-md mx-auto md:mx-0 leading-relaxed">
            You wake up at 3 AM for a feeding and collapse back into bed. By morning, you can&apos;t
            remember when it happened, how much they ate, or which side you nursed on. CribNotes fixes
            that with one-tap logging designed for half-open eyes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold bg-primary text-white rounded-full hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
            >
              Start Your 30-Day Free Trial
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-text-primary border border-border rounded-full hover:bg-elevated transition-colors"
            >
              See Features
            </Link>
          </div>
        </div>

        <div className="flex justify-center">
          <DeviceMockup />
        </div>
      </div>
    </section>
  );
}
