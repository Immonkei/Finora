import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Target,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {/* Top Navigation */}
      <header className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              F
            </div>
            <span className="font-bold text-lg tracking-tight">Finora</span>
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] ml-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              v1.0 MVP
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/today">
              <Button size="sm" className="shadow-sm shadow-emerald-500/20">
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
          className="mb-6 px-3 py-1 text-xs gap-1.5 border border-zinc-200 dark:border-zinc-800"
        >
          <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          Personal Finance Tracker & Daily Allowance
        </Badge>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 max-w-3xl leading-[1.15]">
          Master your spending before the{" "}
          <span className="text-emerald-600 dark:text-emerald-400">
            month ends.
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
          Log any expense in under 5 seconds. Get a real-time daily allowance that adapts instantly to keep you on budget across USD and KHR.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link href="/today" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto gap-2 shadow-lg shadow-emerald-600/20 px-8 text-base font-semibold">
              Get Started Now <ArrowRight className="h-4 w-4" />
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
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
              5-Second Quick Add
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Automatic keyboard focus, smart last-used categories, and one-tap logging designed for mobile thumb reach.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-2">
            <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
              Live Daily Allowance
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Always know exactly how much you can spend today without exceeding your monthly budget.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-2">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
              Private & Strict RLS
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              PostgreSQL Row Level Security ensures only you can access your transactions and accounts.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500">
        <p>Finora — Personal Finance Tracker &bull; Built with Next.js, TypeScript &amp; Supabase</p>
      </footer>
    </div>
  );
}
