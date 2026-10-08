"use client";

import * as React from "react";
import { Target, Plus, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";

export default function GoalsPage() {
  const goals = [
    {
      id: "1",
      name: "Emergency Fund",
      targetAmountMinor: BigInt(200000), // $2,000.00
      savedAmountMinor: BigInt(125000),  // $1,250.00
      deadline: "Dec 31, 2026",
      weeklyNeededMinor: BigInt(6250),   // $62.50 / week
    },
    {
      id: "2",
      name: "New Laptop",
      targetAmountMinor: BigInt(120000), // $1,200.00
      savedAmountMinor: BigInt(48000),   // $480.00
      deadline: "Nov 30, 2026",
      weeklyNeededMinor: BigInt(9000),   // $90.00 / week
    },
    {
      id: "3",
      name: "Vacation Trip (Siem Reap)",
      targetAmountMinor: BigInt(50000),  // $500.00
      savedAmountMinor: BigInt(35000),   // $350.00
      deadline: "Jan 15, 2027",
      weeklyNeededMinor: BigInt(1150),   // $11.50 / week
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
            Financial Targets
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Savings Goals
          </h1>
        </div>
        <Button size="lg" className="w-full sm:w-auto shadow-md shadow-emerald-500/10">
          <Plus className="h-5 w-5 mr-1" />
          Create Goal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((g) => {
          const percent = Math.min(
            100,
            Math.round(Number((g.savedAmountMinor * 100n) / g.targetAmountMinor))
          );
          return (
            <Card key={g.id} className="relative overflow-hidden flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                      <Target className="h-5 w-5" />
                    </span>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {percent}% Saved
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-bold mt-2">{g.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 text-xs">
                    <Calendar className="h-3.5 w-3.5 text-zinc-400" /> Target: {g.deadline}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
                        {formatMoney(g.savedAmountMinor, "USD")}
                      </span>
                      <span className="text-xs text-zinc-400">
                        of {formatMoney(g.targetAmountMinor, "USD")}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatMoney(g.weeklyNeededMinor, "USD")} / week
                    </span>{" "}
                    needed to reach deadline
                  </div>
                </CardContent>
              </div>

              <div className="p-5 pt-0">
                <Button variant="outline" size="sm" className="w-full">
                  Contribute
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
