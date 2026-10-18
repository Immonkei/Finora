import { DesktopSidebar, MobileNavBar } from "@/components/app-nav";
import { NotificationBell } from "@/components/notification-bell";
import { FinoraLogo } from "@/components/finora-logo";
import { AIChatDrawer } from "@/components/ai-chat-drawer";
import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-50/60 dark:bg-[#090E15] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-accent-500/20 selection:text-brand-900">
      <DesktopSidebar />
      <div className="flex flex-1 flex-col pb-20 md:pb-6">
        {/* Top App Header with Alerts */}
        <header className="h-16 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-[#0F1822]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
          <Link href="/today" className="flex items-center md:hidden">
            <FinoraLogo variant="full" size="sm" priority />
          </Link>
          <div className="hidden md:block">
            {/* Subtle branding anchor or breadcrumb */}
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
      <AIChatDrawer />
    </div>
  );
}
