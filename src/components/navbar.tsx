"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Utensils, ShoppingBasket, LayoutDashboard, Beef, BookOpen } from "lucide-react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ingredients", label: "Ingredients", icon: Beef },
  { href: "/recipes", label: "Recipes", icon: Utensils },
  { href: "/plan", label: "Meal Planner", icon: BookOpen },
  { href: "/shopping-list", label: "Shopping List", icon: ShoppingBasket },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center px-4">
        <div className="mr-8 flex items-center space-x-2">
          <Utensils className="h-6 w-6" />
          <span className="text-xl font-bold">MealPrep</span>
        </div>
        <div className="hidden md:flex space-x-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                pathname === item.href
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
