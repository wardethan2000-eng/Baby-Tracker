"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Clock, BarChart3, Settings, MessageSquareText } from "lucide-react"

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/history", icon: Clock, label: "History" },
    { href: "/notes", icon: MessageSquareText, label: "Notes" },
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border pb-safe">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center px-3 py-1 ${isActive ? "text-primary" : "text-text-muted"}`}
            >
              <Icon size={24} />
              <span className="text-xs mt-1">{item.label}</span>
              {isActive && <div className="w-1 h-1 bg-primary rounded-full mt-1"></div>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
