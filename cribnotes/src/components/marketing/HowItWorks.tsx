import { Baby, Zap, BarChart3, Users } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: Baby,
    title: "Add Your Child",
    desc: "Create a profile for your baby with just a name and birth date. Add as many children as you need — all included.",
  },
  {
    number: 2,
    icon: Zap,
    title: "One-Tap Logging",
    desc: "Six large, thumb-friendly buttons let you log feedings, diaper changes, sleep, nursing, and pumping in a single tap — even at 2 AM.",
  },
  {
    number: 3,
    icon: BarChart3,
    title: "Daily Summaries",
    desc: "Get instant daily stats — total feed volume, diaper count, sleep duration, and more. Charts and trends over time reveal patterns.",
  },
  {
    number: 4,
    icon: Users,
    title: "Share With Caregivers",
    desc: "Invite your partner, a nanny, or grandparents. Everyone sees the same log in real time, so handoffs are seamless.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-elevated">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-text-primary">
            How It Works
          </h2>
          <p className="mt-4 text-text-secondary text-lg max-w-xl mx-auto">
            From setup to sleep-deprived logging — CribNotes is built for real parents.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative group"
            >
              <div className="bg-surface rounded-2xl p-6 border border-border text-center h-full transition-shadow hover:shadow-md">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="text-primary" size={24} />
                </div>
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold mx-auto mb-3">
                  {step.number}
                </div>
                <h3 className="font-display text-lg font-semibold text-text-primary mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
