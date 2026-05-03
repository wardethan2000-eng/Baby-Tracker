import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Features } from "@/components/marketing/Features";
import { Pricing } from "@/components/marketing/Pricing";
import { FAQ } from "@/components/marketing/FAQ";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <FAQ />
    </>
  );
}
