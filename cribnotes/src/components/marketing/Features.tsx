import {
  Sun, Moon, Baby, Droplets, Heart, Milk,
  BarChart3, MessageSquareText, Users, Smartphone,
  Bell, Shield, FileSpreadsheet,
} from "lucide-react";

const features = [
  {
    icon: Sun,
    title: "Wake Tracking",
    desc: "One tap to log when your baby wakes up. Combined with sleep logs, automatic sleep duration is calculated.",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    icon: Moon,
    title: "Sleep Tracking",
    desc: "Log sleep moments instantly. The gap between sleep and wake events gives you accurate sleep totals.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: Baby,
    title: "Feeding Log",
    desc: "Track breast, bottle, or both. Record precise amounts in ounces or milliliters with optional notes.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Droplets,
    title: "Diaper Tracking",
    desc: "Log pee, poop, or both. Spot patterns and ensure your baby is staying hydrated and regular.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: Heart,
    title: "Nursing Sessions",
    desc: "Track duration in minutes and which side. See averages and trends over time in analytics.",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    icon: Milk,
    title: "Pumping Log",
    desc: "Record volume per session in ounces or milliliters. Compare daily and weekly totals.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: BarChart3,
    title: "Analytics & Charts",
    desc: "Interactive charts for feeds, sleep, diapers, nursing, and pumping. Switch between day, week, and month views.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: MessageSquareText,
    title: "Care Notes",
    desc: "Create rich notes with purpose tags, audience targeting, and pinned priorities. Get notified when a note is specifically addressed to you.",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    icon: Users,
    title: "Multi-Child Support",
    desc: "Track multiple children with the same account. Quick child switcher with age display. One payment covers unlimited children.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Users,
    title: "Caregiver Sharing",
    desc: "Invite parents, caretakers, or babysitters with role-based permissions. Real-time shared log. Revoke access anytime.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: Smartphone,
    title: "PWA — Install Anywhere",
    desc: "Install on iOS and Android home screens. Full-screen, offline-capable. Feels like a native app without the App Store.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Bell,
    title: "Push Notifications",
    desc: "Get alerts when someone leaves you a care note. Configurable feeding reminders with custom intervals.",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    icon: FileSpreadsheet,
    title: "Data Export",
    desc: "Export your entire log as a styled Excel spreadsheet. Seven sheets with all your data — ready for your pediatrician.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Shield,
    title: "Your Data, Safe",
    desc: "Email + password authentication with bcrypt encryption. Soft delete with undo. CSP and HSTS security headers.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-text-primary">
            Everything You Need
          </h2>
          <p className="mt-4 text-text-secondary text-lg max-w-xl mx-auto">
            Six tracking types, powerful analytics, caregiver collaboration, and more — all in one app.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {features.map((feat) => (
            <div
              key={feat.title}
              className="bg-surface rounded-2xl p-6 border border-border hover:border-primary/20 hover:shadow-md transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl ${feat.bg} flex items-center justify-center mb-4`}>
                <feat.icon className={feat.color} size={20} />
              </div>
              <h3 className="font-display text-base font-semibold text-text-primary mb-2">
                {feat.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
