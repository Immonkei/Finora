"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  BarChart3,
  PieChart,
  Target,
  ArrowLeftRight,
  Settings,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/week", label: "Week", icon: BarChart3 },
  { href: "/month", label: "Month", icon: PieChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/transactions", label: "Activity", icon: ArrowLeftRight },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNavBar() {
  const pathname = usePathname();

  // Show primary 4 tabs + More/Settings on mobile bottom bar
  const mobileItems = [
    { href: "/today", label: "Today", icon: CalendarDays },
    { href: "/week", label: "Week", icon: BarChart3 },
    { href: "/month", label: "Month", icon: PieChart },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/settings", label: "More", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 md:hidden safe-area-pb">
      <div className="flex h-16 items-center justify-around px-2">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-1 text-xs font-medium transition-colors",
                isActive
                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-1", isActive && "stroke-[2.5px]")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-950/50 min-h-screen">
      <div className="flex items-center gap-3 px-2 py-3 mb-6">
        <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          F
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
            Finora
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Personal Finance</p>
        </div>
      </div>

      <div className="space-y-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-emerald-600 text-white shadow-sm font-semibold"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Link
          href="/today?add=true"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 active:scale-[0.98] transition-all"
        >
          <Plus className="h-4 w-4" />
          Quick Add
        </Link>
      </div>
    </aside>
  );
}
