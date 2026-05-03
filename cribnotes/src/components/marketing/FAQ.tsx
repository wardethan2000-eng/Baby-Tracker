"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Is it really $15 forever?",
    answer:
      "Yes. One payment of $15 gives you lifetime access to CribNotes with all features. No monthly subscriptions, no annual renewals, no in-app purchases. We offer a 30-day free trial so you can try everything before committing. If it's not for you, cancel anytime during the trial and you'll never be charged.",
  },
  {
    question: "Can I share CribNotes with my partner or nanny?",
    answer:
      "Absolutely. You can invite as many caregivers as you want — parents, caretakers, or babysitters — each with role-based permissions. Everyone sees the same log in real time, so handoffs between parents, nannies, and grandparents are seamless. No extra cost for additional users.",
  },
  {
    question: "Does it work on my phone? Without an internet connection?",
    answer:
      "Yes. CribNotes is a Progressive Web App (PWA), which means you can install it directly to your iPhone or Android home screen — no App Store needed. It works offline, so you can log feedings and changes even when you're in a dead zone or airplane mode. It syncs automatically when you're back online.",
  },
  {
    question: "Can I track more than one child?",
    answer:
      "Yes. You can add as many children as you need from the Settings page. Switch between them with a single tap from the quick selector at the top of the dashboard. Each child's data is kept completely separate. There's no extra charge for additional children.",
  },
  {
    question: "Can I export my data for my pediatrician?",
    answer:
      "Yes. Go to Settings, choose a child, and tap Export Data. You'll download a formatted Excel spreadsheet with seven sheets — summary, feeds, diapers, wake events, nursing, pumping, and sleep — organized and ready to share with your doctor.",
  },
  {
    question: "What happens after I sign up?",
    answer:
      "You'll create an account with your name, email, and password. After verifying your email, you'll go through a quick 5-step onboarding where you add your child and optionally invite other caregivers. Then you're on the dashboard, ready to start logging with one tap. Your 30-day free trial starts immediately.",
  },
];

export function FAQ() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-text-primary">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FAQItem key={i} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-5 flex items-center justify-between text-left"
      >
        <span className="font-display font-semibold text-text-primary pr-4">{question}</span>
        <ChevronDown
          className={`text-text-muted shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          size={20}
        />
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-text-secondary leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}
