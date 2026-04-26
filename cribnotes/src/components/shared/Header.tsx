"use client";

import Link from "next/link";
import { Moon, Settings } from "lucide-react";

export function Header() {
  return (
    <header className="bg-surface py-4 px-4 border-b border-border sticky top-0 z-30">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Moon className="text-primary" size={20} />
          <h1 className="font-display text-xl font-bold text-primary">CribNotes</h1>
        </div>
        <Link href="/settings" className="p-2 text-text-secondary hover:text-primary transition-colors">
          <Settings size={20} />
        </Link>
      </div>
    </header>
  );
}