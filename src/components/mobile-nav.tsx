"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Utensils, ShoppingBasket, LayoutDashboard, Beef, BookOpen } from "lucide-react"

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/ingredients", label: "Foods", icon: Beef },
  { href: "/recipes", label: "Recipes", icon: Utensils },
  { href: "/plan", label: "Plan", icon: BookOpen },
  { href: "/shopping-list", label: "Shop", icon: ShoppingBasket },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full border-t bg-background md:hidden">
      <div className="grid h-16 grid-cols-5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors hover:text-primary",
              pathname === item.href
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
