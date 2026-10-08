"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FinoraLogo } from "@/components/finora-logo";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password too short", {
        description: "Password must be at least 8 characters.",
      });
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error("Sign up failed", { description: error.message });
        setLoading(false);
        return;
      }

      if (data?.session) {
        toast.success("Account created successfully!");
        router.push("/today");
        router.refresh();
      } else {
        toast.success("Registration initiated!", {
          description: "Please check your email inbox to confirm your account.",
        });
        router.push("/login");
      }
    } catch (err) {
      toast.error("An unexpected error occurred", {
        description: err instanceof Error ? err.message : "Please try again",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50/70 dark:bg-[#090E15]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block transition-transform hover:scale-[1.02]">
            <FinoraLogo variant="full" size="lg" priority />
          </Link>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Start taking control of your daily spending
          </p>
        </div>

        <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white dark:bg-[#0F1822]">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Sign up for Finora</CardTitle>
            <CardDescription>
              We automatically set up your default Cash account &amp; categories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Password (min 8 chars)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="p-3 bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200/50 dark:border-brand-800/40 rounded-xl text-xs text-brand-800 dark:text-brand-200 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-accent-500" />
                <span>
                  Your financial data is private and secured with Row Level Security (RLS).
                </span>
              </div>

              <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-zinc-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-600 hover:text-brand-700 dark:text-accent-400"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
