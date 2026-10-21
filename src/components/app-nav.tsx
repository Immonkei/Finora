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
  Sparkles,
  LayoutGrid,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickAddDialog } from "@/features/transactions/components/quick-add-dialog";
import { FinoraLogo } from "@/components/finora-logo";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/week", label: "Week", icon: BarChart3 },
  { href: "/month", label: "Month", icon: PieChart },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/transactions", label: "Activity", icon: ArrowLeftRight },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_PRIMARY_HREFS = ["/today", "/week", "/month"];
const MOBILE_MORE_ITEMS = NAV_ITEMS.filter(
  (item) => !MOBILE_PRIMARY_HREFS.includes(item.href)
);

function MobileTab({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium transition-colors",
        isActive
          ? "text-brand-600 dark:text-accent-400 font-semibold"
          : "text-zinc-500 active:text-zinc-800 dark:text-zinc-400"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}

export function MobileNavBar() {
  const pathname = usePathname();
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const isMoreActive = MOBILE_MORE_ITEMS.some((item) => item.href === pathname);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200/80 bg-white/90 backdrop-blur-lg dark:border-zinc-800/80 dark:bg-[#0c131c]/90 md:hidden safe-area-pb">
        <div className="flex h-16 items-center justify-around px-2 relative">
          <MobileTab href="/today" label="Today" icon={CalendarDays} isActive={pathname === "/today"} />
          <MobileTab href="/week" label="Week" icon={BarChart3} isActive={pathname === "/week"} />

          {/* Quick-Add Center Action Button */}
          <div className="flex flex-1 items-center justify-center -mt-5">
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/35 hover:bg-brand-700 active:scale-95 transition-all ring-4 ring-white dark:ring-[#0c131c]"
              aria-label="Add transaction"
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </button>
          </div>

          <MobileTab href="/month" label="Month" icon={PieChart} isActive={pathname === "/month"} />

          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isMoreOpen}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium transition-colors",
              isMoreActive || isMoreOpen
                ? "text-brand-600 dark:text-accent-400 font-semibold"
                : "text-zinc-500 active:text-zinc-800 dark:text-zinc-400"
            )}
          >
            <LayoutGrid className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* More Sheet: remaining destinations as an app-style launcher grid */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-150 md:hidden"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            role="dialog"
            aria-label="More pages"
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-[28px] border-t border-zinc-200/80 bg-white px-4 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 animate-in slide-in-from-bottom duration-200"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <div className="flex items-center justify-between px-1 pb-3">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">More</p>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="rounded-full p-1.5 text-zinc-500 active:bg-zinc-100 dark:active:bg-zinc-800"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {MOBILE_MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3.5 text-xs font-semibold transition-all active:scale-95",
                      isActive
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-zinc-200/80 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive ? "text-accent-300" : "text-brand-600 dark:text-accent-400")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
      <aside className="hidden md:flex w-64 flex-col border-r border-zinc-200/80 bg-white/75 p-5 dark:border-zinc-800/80 dark:bg-[#0c131c]/75 min-h-screen backdrop-blur-md">
        <Link href="/today" className="flex items-center px-2 py-3 mb-6 transition-opacity hover:opacity-90">
          <FinoraLogo variant="full" size="md" priority />
        </Link>

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
                    ? "bg-brand-600 text-white shadow-sm font-semibold"
                    : "text-zinc-600 hover:bg-brand-50/70 hover:text-brand-900 dark:text-zinc-400 dark:hover:bg-zinc-900/80 dark:hover:text-zinc-100"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-accent-300" : "text-zinc-500 dark:text-zinc-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Quick Add
          </button>
          <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
            <span>Finora App</span>
            <span className="font-mono text-[10px] font-semibold text-accent-600 dark:text-accent-400">v1.2.0</span>
          </div>
        </div>
      </aside>

      <QuickAddDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </>
  );
}
