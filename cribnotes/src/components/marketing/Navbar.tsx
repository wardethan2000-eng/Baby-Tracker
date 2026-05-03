"use client";

import { useState } from "react";
import Link from "next/link";
import { Moon, Menu, X } from "lucide-react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Moon className="text-primary" size={24} />
          <span className="font-display text-xl font-bold text-primary">CribNotes</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-text-primary hover:text-primary transition-colors px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium bg-primary text-white px-5 py-2 rounded-full hover:opacity-90 transition-opacity"
          >
            Start Free Trial
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-text-secondary"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-surface border-t border-border px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block text-sm text-text-secondary hover:text-text-primary transition-colors py-2"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-3 pt-3 border-t border-border">
            <Link
              href="/login"
              className="flex-1 text-center text-sm font-medium text-text-primary border border-border rounded-full py-2 hover:bg-elevated transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="flex-1 text-center text-sm font-medium bg-primary text-white rounded-full py-2 hover:opacity-90 transition-opacity"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
