"use client";

import * as React from "react";
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
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddDialog } from "@/features/transactions/components/quick-add-dialog";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/week", label: "Week", icon: BarChart3 },
  { href: "/month", label: "Month", icon: PieChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/transactions", label: "Activity", icon: ArrowLeftRight },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNavBar() {
  const pathname = usePathname();
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 md:hidden safe-area-pb">
        <div className="flex h-16 items-center justify-around px-2 relative">
          <Link
            href="/today"
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-1 text-xs font-medium transition-colors",
              pathname === "/today"
                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
            )}
          >
            <CalendarDays className="h-5 w-5 mb-1" />
            <span>Today</span>
          </Link>

          <Link
            href="/week"
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-1 text-xs font-medium transition-colors",
              pathname === "/week"
                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
            )}
          >
            <BarChart3 className="h-5 w-5 mb-1" />
            <span>Week</span>
          </Link>

          {/* Quick-Add Center Action Button */}
          <div className="flex flex-1 items-center justify-center -mt-5">
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
              aria-label="Add transaction"
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </button>
          </div>

          <Link
            href="/month"
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-1 text-xs font-medium transition-colors",
              pathname === "/month"
                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
            )}
          >
            <PieChart className="h-5 w-5 mb-1" />
            <span>Month</span>
          </Link>

          <Link
            href="/settings"
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-1 text-xs font-medium transition-colors",
              pathname === "/settings"
                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
            )}
          >
            <Settings className="h-5 w-5 mb-1" />
            <span>Settings</span>
          </Link>
        </div>
      </nav>

      <QuickAddDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </>
  );
}

export function DesktopSidebar() {
  const pathname = usePathname();
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  return (
    <>
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
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" />
            Quick Add
          </button>
        </div>
      </aside>

      <QuickAddDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </>
  );
}
