import { DesktopSidebar, MobileNavBar } from "@/components/app-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <DesktopSidebar />
      <div className="flex flex-1 flex-col pb-20 md:pb-6">
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
      </div>
      <MobileNavBar />
    </div>
  );
}
