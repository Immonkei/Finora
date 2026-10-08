import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinoraLogo } from "@/components/finora-logo";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/70 dark:bg-[#090E15] text-zinc-900 dark:text-zinc-50 selection:bg-accent-500/20 selection:text-brand-900">
      {/* Top Navigation */}
      <header className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-[#0F1822]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <FinoraLogo variant="full" size="md" priority />
            </Link>
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] border-accent-500/30 text-accent-700 dark:text-accent-300">
              v1.1.0 Live Realtime &bull; PWA
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/today">
              <Button size="sm" className="shadow-xs shadow-brand-500/20">
                Open App <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-16 sm:py-24 max-w-4xl mx-auto">
        <Badge
          variant="secondary"
          className="mb-6 px-3 py-1 text-xs gap-1.5 border border-brand-200/50 bg-brand-50/70 text-brand-700 dark:bg-brand-950/40 dark:text-brand-200 dark:border-brand-800/40"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent-500" />
          Smart Financial Clarity &bull; Dynamic Daily Allowance
        </Badge>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 max-w-3xl leading-[1.12]">
          Master your spending before the{" "}
          <span className="text-brand-600 dark:text-accent-400">
            month ends.
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
          Log any expense in under 5 seconds. Get an adaptive daily allowance that calculates safe daily spend in real time across USD and KHR.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link href="/today" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto gap-2 shadow-lg shadow-brand-600/20 px-8 text-base font-semibold">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto px-6">
              Sign In to Account
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full text-left">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0F1822] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-2.5 transition-all hover:border-brand-200 dark:hover:border-brand-800/60">
            <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
              5-Second Quick Add
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Auto-focused numpad, frequent categories, and single-tap expense logging engineered for mobile thumb zone.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0F1822] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-2.5 transition-all hover:border-accent-200 dark:hover:border-accent-800/60">
            <div className="h-10 w-10 rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-950/50 dark:text-accent-300 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
              Live Daily Allowance
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Real-time arithmetic divides remaining monthly budget by remaining days so you never run dry mid-month.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0F1822] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-2.5 transition-all hover:border-brand-200 dark:hover:border-brand-800/60">
            <div className="h-10 w-10 rounded-xl bg-zinc-100 text-brand-700 dark:bg-zinc-800 dark:text-brand-200 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
              Private &amp; Strict RLS
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              PostgreSQL Row Level Security ensures total data isolation. Your transactions and budgets remain private.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-8 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <FinoraLogo variant="full" size="xs" />
          <p>&copy; 2026 Finora &bull; Intelligent Personal Finance</p>
        </div>
      </footer>
    </div>
  );
}
