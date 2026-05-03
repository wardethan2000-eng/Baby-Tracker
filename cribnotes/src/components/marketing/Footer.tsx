import Link from "next/link";
import { Moon } from "lucide-react";

const footerLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "/login", label: "Sign In" },
  { href: "/signup", label: "Create Account" },
];

export function Footer() {
  return (
    <footer className="bg-surface border-t border-border">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <Moon className="text-primary" size={20} />
            <span className="font-display text-lg font-bold text-primary">CribNotes</span>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} CribNotes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
