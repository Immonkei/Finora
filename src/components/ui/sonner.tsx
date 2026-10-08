"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-zinc-950 group-[.toaster]:border-zinc-200 group-[.toaster]:shadow-xl dark:group-[.toaster]:bg-zinc-900 dark:group-[.toaster]:text-zinc-50 dark:group-[.toaster]:border-zinc-800 rounded-2xl p-4 text-sm font-medium",
          description:
            "group-[.toast]:text-zinc-500 dark:group-[.toast]:text-zinc-400 text-xs",
          actionButton:
            "group-[.toast]:bg-brand-600 group-[.toast]:text-white font-semibold rounded-xl text-xs hover:group-[.toast]:bg-brand-700 transition-colors",
          cancelButton:
            "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-500 dark:group-[.toast]:bg-zinc-800 rounded-xl text-xs",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
