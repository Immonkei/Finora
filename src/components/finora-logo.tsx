import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface FinoraLogoProps {
  variant?: "full" | "icon" | "mark";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  priority?: boolean;
}

export function FinoraLogo({
  variant = "full",
  size = "md",
  className,
  priority = false,
}: FinoraLogoProps) {
  if (variant === "full") {
    const sizeMap = {
      xs: { width: 90, height: 24, className: "h-5 w-auto" },
      sm: { width: 110, height: 30, className: "h-6 w-auto" },
      md: { width: 130, height: 35, className: "h-8 w-auto" },
      lg: { width: 170, height: 46, className: "h-10 w-auto" },
      xl: { width: 220, height: 60, className: "h-14 w-auto" },
    };

    const s = sizeMap[size];

    return (
      <div className={cn("relative inline-flex items-center select-none", className)}>
        {/* Light mode full logo */}
        <Image
          src="/finora-full.png"
          alt="Finora"
          width={s.width}
          height={s.height}
          priority={priority}
          className={cn("dark:hidden object-contain", s.className)}
        />
        {/* Dark mode full logo with crisp light lettering */}
        <Image
          src="/finora-full-dark.png"
          alt="Finora"
          width={s.width}
          height={s.height}
          priority={priority}
          className={cn("hidden dark:block object-contain", s.className)}
        />
      </div>
    );
  }

  // Icon / Mark variant
  const iconSizeMap = {
    xs: { width: 20, height: 20, className: "h-5 w-5" },
    sm: { width: 28, height: 28, className: "h-7 w-7" },
    md: { width: 36, height: 36, className: "h-9 w-9" },
    lg: { width: 48, height: 48, className: "h-12 w-12" },
    xl: { width: 64, height: 64, className: "h-16 w-16" },
  };

  const s = iconSizeMap[size];

  if (variant === "mark") {
    return (
      <div
        className={cn(
          "relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-b from-brand-50 to-brand-100/60 p-2 border border-brand-200/50 shadow-sm dark:from-zinc-900 dark:to-zinc-950 dark:border-brand-900/50",
          className
        )}
      >
        <Image
          src="/finora-icon.png"
          alt="Finora Logo Mark"
          width={s.width}
          height={s.height}
          priority={priority}
          className={cn("dark:hidden object-contain", s.className)}
        />
        <Image
          src="/finora-icon-dark.png"
          alt="Finora Logo Mark"
          width={s.width}
          height={s.height}
          priority={priority}
          className={cn("hidden dark:block object-contain", s.className)}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center select-none", className)}>
      <Image
        src="/finora-icon.png"
        alt="Finora Icon"
        width={s.width}
        height={s.height}
        priority={priority}
        className={cn("dark:hidden object-contain", s.className)}
      />
      <Image
        src="/finora-icon-dark.png"
        alt="Finora Icon"
        width={s.width}
        height={s.height}
        priority={priority}
        className={cn("hidden dark:block object-contain", s.className)}
      />
    </div>
  );
}
