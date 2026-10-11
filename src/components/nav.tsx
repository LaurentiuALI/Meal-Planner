"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChefHat, CookingPot, Settings2, ShoppingCart, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/retete", label: "Rețete", icon: ChefHat },
  { href: "/cumparaturi", label: "Listă", icon: ShoppingCart },
  { href: "/gatit", label: "Gătit", icon: CookingPot },
  { href: "/ingrediente", label: "Produse", icon: Wheat },
  { href: "/setari", label: "Setări", icon: Settings2 },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]",
        "md:sticky md:top-0 md:h-dvh md:w-48 md:shrink-0 md:border-t-0 md:border-r md:pb-0 md:pt-8",
      )}
    >
      <ul className="mx-auto flex max-w-3xl justify-around md:flex-col md:gap-1 md:px-3">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1 md:flex-none">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors",
                  "md:flex-row md:gap-3 md:rounded-md md:px-3 md:py-2 md:text-sm",
                  active ? "text-primary md:bg-primary/10" : "hover:text-foreground",
                )}
              >
                <Icon className="size-5 md:size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
