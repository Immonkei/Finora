"use client";

import * as React from "react";
import { Check, Sprout, Compass, TrendingUp, Flame, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MilestoneRingProps {
  percent: number; // 0 to 100+
  size?: number;
  strokeWidth?: number;
  className?: string;
  showMilestoneBadge?: boolean;
}

export function getMilestoneTier(percent: number): {
  label: string;
  badgeColor: string;
  ringGradientId: string;
  icon: LucideIcon;
} {
  if (percent >= 100) {
    return {
      label: "Goal Conquered",
      badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      ringGradientId: "grad-emerald",
      icon: Trophy,
    };
  }
  if (percent >= 75) {
    return {
      label: "Final Stretch",
      badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      ringGradientId: "grad-amber",
      icon: Flame,
    };
  }
  if (percent >= 50) {
    return {
      label: "Halfway There",
      badgeColor: "bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800",
      ringGradientId: "grad-blue",
      icon: TrendingUp,
    };
  }
  if (percent >= 25) {
    return {
      label: "Quarter Way",
      badgeColor: "bg-violet-50 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300 border-violet-200 dark:border-violet-800",
      ringGradientId: "grad-purple",
      icon: Compass,
    };
  }
  return {
    label: "Starting Out",
    badgeColor: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    ringGradientId: "grad-brand",
    icon: Sprout,
  };
}

export function MilestoneRing({
  percent,
  size = 104,
  strokeWidth = 9,
  className,
  showMilestoneBadge = true,
}: MilestoneRingProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const isCompleted = percent >= 100;

  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  const tier = getMilestoneTier(percent);

  // Milestone points on the perimeter (25%, 50%, 75%)
  const milestones = [
    { p: 25, label: "25%" },
    { p: 50, label: "50%" },
    { p: 75, label: "75%" },
  ];

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg] overflow-visible"
        >
          <defs>
            <linearGradient id="grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
            <linearGradient id="grad-brand" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1b4d72" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-100 dark:text-zinc-800"
          />

          {/* Progress Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={`url(#${tier.ringGradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />

          {/* Milestone Tick Marks */}
          {milestones.map((m) => {
            const angle = (m.p / 100) * 360 * (Math.PI / 180);
            const dotX = center + radius * Math.cos(angle);
            const dotY = center + radius * Math.sin(angle);
            const isPassed = percent >= m.p;

            return (
              <circle
                key={m.p}
                cx={dotX}
                cy={dotY}
                r={2}
                fill={isPassed ? "#ffffff" : "#9ca3af"}
                className={cn(
                  "transition-colors",
                  isPassed ? "opacity-90" : "opacity-40"
                )}
              />
            );
          })}
        </svg>

        {/* Center Percentage & Status */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
          {isCompleted ? (
            <div className="flex flex-col items-center animate-in zoom-in-75 duration-300">
              <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                <Check className="h-5 w-5 stroke-[2.5]" />
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-wider">
                Done
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
                {percent}%
              </span>
              <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Saved
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Milestone Badge */}
      {showMilestoneBadge && (
        <span
          className={cn(
            "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs transition-all inline-flex items-center gap-1.5",
            tier.badgeColor
          )}
        >
          {React.createElement(tier.icon, { className: "h-3 w-3 shrink-0" })}
          <span>{tier.label}</span>
        </span>
      )}
    </div>
  );
}
