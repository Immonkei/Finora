import { DesktopSidebar, MobileNavBar } from "@/components/app-nav";
import { NotificationBell } from "@/components/notification-bell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <DesktopSidebar />
      <div className="flex flex-1 flex-col pb-20 md:pb-6">
        {/* Top App Header with Alerts */}
        <header className="h-16 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 md:hidden">
            <div className="h-8 w-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
              F
            </div>
            <span className="font-bold text-base tracking-tight">Finora</span>
          </div>
          <div className="hidden md:block">
            {/* Context breadcrumb or subtle space */}
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
      </div>
      <MobileNavBar />
    </div>
  );
}
